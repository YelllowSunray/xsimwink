"use client";

import React, { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Error Boundary to catch React errors on mobile
class VideoErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Video component error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="text-white text-xl mb-4">⚠️ Video Error</div>
            <p className="text-gray-300 mb-4">
              {this.state.error?.message || "Something went wrong with the video"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-pink-600 text-white px-6 py-3 rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import {
  LiveKitRoom,
  useParticipants,
  useTracks,
  VideoTrack,
  AudioTrack,
  TrackReference,
  useRoomContext,
  useDataChannel,
} from "@livekit/components-react";
import { Track, DataPacket_Kind } from "livekit-client";
import { BackgroundBlur } from "@livekit/track-processors";
import { VideoStorageService } from "@/utils/videoStorage";
import { radioStations, type RadioStation } from "@/constants/radioStations";
import RadioPlayer from "@/components/RadioPlayer";

interface VideoChatLiveKitProps {
  partnerId: string;
  partnerName: string;
  onEndCall: () => void;
  connectionFee: number;
}

function VideoChatLiveKitInner({
  partnerId,
  partnerName,
  onEndCall,
  connectionFee,
}: VideoChatLiveKitProps) {
  const [token, setToken] = useState<string>("");
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState("");
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  // Detect if device is mobile (disable effects on mobile)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Effects state (disabled on mobile)
  const [audioEffect, setAudioEffect] = useState<'none' | 'robot' | 'echo' | 'distortion' | 'deep' | 'reverb' | 'autotune'>('none');
  const [visualEffect, setVisualEffect] = useState<'none' | 'blur' | 'sepia' | 'grayscale' | 'vintage' | 'neon' | 'mirror'>('none');
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  
  console.log(`📱 Device detection: isMobile = ${isMobile}`);
  
  const startTimeRef = useRef<number>(Date.now());
  const localStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Audio effects refs
  const audioEffectContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const currentAudioEffectNodesRef = useRef<AudioNode[]>([]);
  
  // Video effects refs
  const videoEffectCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoEffectAnimationRef = useRef<number | null>(null);
  const processedVideoStreamRef = useRef<MediaStream | null>(null);
  const rawVideoStreamRef = useRef<MediaStream | null>(null);
  
  // Processed streams for LiveKit
  const [processedAudioTrack, setProcessedAudioTrack] = useState<MediaStreamTrack | null>(null);
  const [processedVideoTrack, setProcessedVideoTrack] = useState<MediaStreamTrack | null>(null);
  
  // Room reference for recording (will be set by CustomVideoUI)
  const roomRef = useRef<any>(null);
  
  const { user, addSessionHistory, addRecording } = useAuth();

  // Clean Multi-Participant Recording - Direct from LiveKit tracks
  const startRecording = async () => {
    try {
      console.log('🎬 Starting recording...');
      
      // Wait for all videos to be ready (important for mobile)
      const waitForVideos = async (maxWaitMs: number = 5000): Promise<HTMLVideoElement[]> => {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
          const allVideos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
          
          // Log detailed status of each video
          allVideos.forEach((v, i) => {
            console.log(`  Video ${i}: readyState=${v.readyState}, size=${v.videoWidth}x${v.videoHeight}, paused=${v.paused}, srcObject=${!!v.srcObject}, currentTime=${v.currentTime.toFixed(2)}s`);
          });
          
          // Get unique videos (remove duplicates by srcObject)
          const uniqueVideos: HTMLVideoElement[] = [];
          const seenStreams = new Set<MediaStream>();
          
          allVideos.forEach((video) => {
            if (video.srcObject && video.srcObject instanceof MediaStream) {
              if (!seenStreams.has(video.srcObject)) {
                seenStreams.add(video.srcObject);
                uniqueVideos.push(video);
              }
            }
          });
          
          const readyVideos = uniqueVideos.filter(v => 
            v.readyState >= v.HAVE_CURRENT_DATA && // At least readyState 2
            v.videoWidth > 0 && 
            v.videoHeight > 0 &&
            !v.paused
          );
          
          console.log(`⏳ Waiting for videos... Found ${allVideos.length} total, ${uniqueVideos.length} unique, ${readyVideos.length} ready`);
          
          // Need at least 2 unique ready videos for a recording (local + remote)
          if (readyVideos.length >= 2) {
            console.log('✅ All videos ready!');
            
            // Force play all videos to ensure they're running
            for (const video of readyVideos) {
              if (video.paused) {
                try {
                  await video.play();
                  console.log('▶️ Started paused video');
                } catch (e) {
                  console.warn('Could not play video:', e);
                }
              }
            }
            
            return readyVideos;
          }
          
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Return whatever unique ready videos we have after timeout
        const allVideos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
        const uniqueVideos: HTMLVideoElement[] = [];
        const seenStreams = new Set<MediaStream>();
        
        allVideos.forEach((video) => {
          if (video.srcObject && video.srcObject instanceof MediaStream) {
            if (!seenStreams.has(video.srcObject)) {
              seenStreams.add(video.srcObject);
              uniqueVideos.push(video);
            }
          }
        });
        
        console.warn(`⚠️ Timeout waiting for videos. Returning ${uniqueVideos.length} videos`);
        return uniqueVideos.filter(v => v.readyState >= 2 && v.videoWidth > 0);
      };
      
      // Get all ready video elements
      let videoElements = await waitForVideos(5000);
      console.log(`📹 Total ready video elements from DOM: ${videoElements.length}`);
      
      videoElements.forEach((v, i) => {
        console.log(`📹 Video ${i} final check: ${v.videoWidth}x${v.videoHeight}, readyState=${v.readyState}, playing=${!v.paused}`);
      });
      
      // If we don't have enough videos from DOM (common on mobile), create them from LiveKit tracks
      if (videoElements.length < 2) {
        console.log('⚠️ Not enough videos from DOM, trying to create from LiveKit tracks...');
        
        const room = roomRef.current;
        if (!room) {
          console.error('❌ Room not available for track access');
        } else {
          // Get all video tracks from LiveKit room
          const localVideoTrack = room?.localParticipant?.videoTracks?.values()?.next()?.value;
          const remoteVideoTracks = Array.from(room?.remoteParticipants?.values() || [])
            .flatMap((p: any) => Array.from(p.videoTracks?.values() || []));
          
          console.log(`🎥 LiveKit tracks: local=${!!localVideoTrack}, remote=${remoteVideoTracks.length}`);
        
        const createdVideos: HTMLVideoElement[] = [];
        
        // Create video element for local track
        if (localVideoTrack && (localVideoTrack as any).track) {
          const localVideo = document.createElement('video');
          localVideo.srcObject = new MediaStream([(localVideoTrack as any).track.mediaStreamTrack]);
          localVideo.autoplay = true;
          localVideo.muted = true;
          localVideo.playsInline = true;
          localVideo.style.position = 'fixed';
          localVideo.style.top = '-9999px'; // Hide off-screen
          document.body.appendChild(localVideo);
          
          // Wait for video to be ready
          await new Promise<void>((resolve) => {
            const checkReady = () => {
              if (localVideo.readyState >= 2 && localVideo.videoWidth > 0) {
                console.log(`✅ Created local video: ${localVideo.videoWidth}x${localVideo.videoHeight}`);
                createdVideos.push(localVideo);
                resolve();
              } else {
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
            setTimeout(() => resolve(), 2000); // Timeout after 2s
          });
        }
        
        // Create video elements for remote tracks
        for (const trackPub of remoteVideoTracks) {
          if (trackPub && (trackPub as any).track) {
            const remoteVideo = document.createElement('video');
            remoteVideo.srcObject = new MediaStream([(trackPub as any).track.mediaStreamTrack]);
            remoteVideo.autoplay = true;
            remoteVideo.playsInline = true;
            remoteVideo.style.position = 'fixed';
            remoteVideo.style.top = '-9999px'; // Hide off-screen
            document.body.appendChild(remoteVideo);
            
            // Wait for video to be ready
            await new Promise<void>((resolve) => {
              const checkReady = () => {
                if (remoteVideo.readyState >= 2 && remoteVideo.videoWidth > 0) {
                  console.log(`✅ Created remote video: ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
                  createdVideos.push(remoteVideo);
                  resolve();
                } else {
                  setTimeout(checkReady, 100);
                }
              };
              checkReady();
              setTimeout(() => resolve(), 2000); // Timeout after 2s
            });
          }
        }
        
        // Use created videos if we got more than what DOM had
        if (createdVideos.length > videoElements.length) {
          console.log(`✅ Using ${createdVideos.length} created videos instead of ${videoElements.length} DOM videos`);
          videoElements = createdVideos;
        } else if (createdVideos.length > 0) {
          // Combine both
          videoElements = [...videoElements, ...createdVideos];
          console.log(`✅ Combined: ${videoElements.length} total videos`);
        }
        } // close else block
      }
      
      if (videoElements.length === 0) {
        alert("⚠️ No video streams found. Please wait for participants to connect first.");
        setShowRecordingSettings(false);
        return;
      }
      
      console.log(`📹 Final video count: ${videoElements.length}`);
      videoElements.forEach((video, i) => {
        console.log(`  Video ${i}: size=${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}, paused=${video.paused}`);
      });

      // Check browser support
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      if (!mimeType) {
        alert("❌ Recording not supported in this browser. Please use Chrome, Edge, or Safari.");
        setShowRecordingSettings(false);
        return;
      }

      // Create canvas for composite recording
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d', { 
        willReadFrequently: true,
        alpha: false 
      });
      
      if (!ctx) {
        alert("❌ Failed to create recording canvas.");
        setShowRecordingSettings(false);
        return;
      }

      canvasRef.current = canvas;

      // Calculate grid layout based on number of videos
      const getGridLayout = (count: number) => {
        if (count === 1) return { cols: 1, rows: 1 };
        if (count === 2) return { cols: 2, rows: 1 };
        if (count <= 4) return { cols: 2, rows: 2 };
        if (count <= 6) return { cols: 3, rows: 2 };
        if (count <= 9) return { cols: 3, rows: 3 };
        if (count <= 12) return { cols: 4, rows: 3 };
        return { cols: 5, rows: 4 };
      };

      // Draw all videos to canvas at 30fps using requestAnimationFrame
      let lastFrameTime = 0;
      const fps = 30;
      const frameInterval = 1000 / fps;
      const recordingStartTime = Date.now();
      
      // Cache video elements to prevent flickering from re-querying DOM
      let cachedVideos: HTMLVideoElement[] = [];
      let lastVideoCheckTime = 0;
      const videoCheckInterval = 2000; // Only re-check videos every 2 seconds (to reduce flickering)
      let isVideoCacheLocked = false; // Lock cache after first successful capture

      const drawFrame = (timestamp: number) => {
        if (!canvasRef.current || !ctx) return;

        // Throttle to desired FPS
        if (timestamp - lastFrameTime < frameInterval) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          return;
        }
        lastFrameTime = timestamp;

        // Only re-query videos periodically to prevent flickering
        const now = Date.now();
        if (!isVideoCacheLocked && (cachedVideos.length === 0 || now - lastVideoCheckTime > videoCheckInterval)) {
          const allVideos = Array.from(document.querySelectorAll('video'));
          const readyVideos = allVideos.filter((v: HTMLVideoElement) => 
            v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0
          );
          
          // Remove duplicates - videos with the same srcObject
          const uniqueVideos: HTMLVideoElement[] = [];
          const seenStreams = new Set<MediaStream>();
          
          readyVideos.forEach((video) => {
            if (video.srcObject && video.srcObject instanceof MediaStream) {
              if (!seenStreams.has(video.srcObject)) {
                seenStreams.add(video.srcObject);
                uniqueVideos.push(video);
              }
            } else if (!video.srcObject) {
              // Include videos without srcObject (shouldn't happen but be safe)
              uniqueVideos.push(video);
            }
          });
          
          // Only update cache if we have videos or if cache is empty
          if (uniqueVideos.length > 0 || cachedVideos.length === 0) {
            // Sort by video size to maintain consistent order (larger first, then smaller)
            uniqueVideos.sort((a, b) => {
              const aSize = a.videoWidth * a.videoHeight;
              const bSize = b.videoWidth * b.videoHeight;
              return bSize - aSize; // Larger videos first
            });
            
            cachedVideos = uniqueVideos;
            lastVideoCheckTime = now;
            
            // Lock cache after first successful capture of 2+ videos to prevent flickering
            if (uniqueVideos.length >= 2 && !isVideoCacheLocked) {
              isVideoCacheLocked = true;
              console.log(`🔒 Locked video cache with ${uniqueVideos.length} videos to prevent flickering`);
            }
            
            // Debug logging for first few seconds
            const elapsedMs = now - recordingStartTime;
            if (elapsedMs < 5000) { // Log for first 5 seconds
              console.log(`🎥 Recording frame (${Math.floor(elapsedMs / 1000)}s): Found ${readyVideos.length} videos, ${uniqueVideos.length} unique`);
              cachedVideos.forEach((v, i) => {
                console.log(`    Video ${i}: ${v.videoWidth}x${v.videoHeight}`);
              });
            }
          }
        }

        const currentVideos = cachedVideos;

        if (currentVideos.length === 0) {
          animationFrameRef.current = requestAnimationFrame(drawFrame);
          return;
        }

        const layout = getGridLayout(currentVideos.length);
        const cellWidth = canvas.width / layout.cols;
        const cellHeight = canvas.height / layout.rows;

        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw each video in grid
        currentVideos.forEach((video: HTMLVideoElement, index) => {
          // Skip if video is no longer valid
          if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            const elapsedMs = Date.now() - recordingStartTime;
            if (elapsedMs < 5000) {
              console.warn(`⚠️ Skipping video ${index}: readyState=${video?.readyState}, size=${video?.videoWidth}x${video?.videoHeight}`);
            }
            return; // Skip this video
          }
          
          const row = Math.floor(index / layout.cols);
          const col = index % layout.cols;
          const x = col * cellWidth;
          const y = row * cellHeight;

          try {
            // Calculate aspect ratio to fit video in cell
            const videoAspect = video.videoWidth / video.videoHeight;
            const cellAspect = cellWidth / cellHeight;
            
            let drawWidth = cellWidth;
            let drawHeight = cellHeight;
            let drawX = x;
            let drawY = y;

            if (videoAspect > cellAspect) {
              // Video is wider than cell
              drawHeight = cellWidth / videoAspect;
              drawY = y + (cellHeight - drawHeight) / 2;
            } else {
              // Video is taller than cell
              drawWidth = cellHeight * videoAspect;
              drawX = x + (cellWidth - drawWidth) / 2;
            }
            
            // Debug log drawing (first few seconds only)
            const elapsedMs = Date.now() - recordingStartTime;
            if (elapsedMs < 3000 && Math.random() < 0.1) { // Log ~10% of frames
              console.log(`🎨 Drawing video ${index}: pos=(${Math.floor(drawX)},${Math.floor(drawY)}), size=${Math.floor(drawWidth)}x${Math.floor(drawHeight)}`);
            }

            // Apply visual effects to canvas context
            // Check if this is the local video by matching srcObject or element properties
            const isLocalVideo = index === 0; // Assuming first video is local
            
            if (isLocalVideo) {
              ctx.save(); // Save context state
              
              // Apply canvas filters based on current visual effect
              switch (visualEffect) {
                case 'blur':
                  ctx.filter = 'blur(4px)';
                  break;
                case 'sepia':
                  ctx.filter = 'sepia(80%)';
                  break;
                case 'grayscale':
                  ctx.filter = 'grayscale(100%)';
                  break;
                case 'vintage':
                  ctx.filter = 'sepia(50%) contrast(120%) brightness(90%)';
                  break;
                case 'neon':
                  ctx.filter = 'saturate(200%) contrast(150%) brightness(110%) hue-rotate(15deg)';
                  break;
                default:
                  ctx.filter = 'none';
              }
            }

            // Actually draw the video frame
            try {
              ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            } catch (drawError: any) {
              const elapsedMs = Date.now() - recordingStartTime;
              if (elapsedMs < 5000) {
                console.error(`❌ Failed to draw video ${index}:`, drawError?.message || drawError);
                console.log(`   Video details: ${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}, paused=${video.paused}, currentTime=${video.currentTime}`);
              }
              throw drawError; // Re-throw to be caught by outer try-catch
            }
            
            if (isLocalVideo) {
              ctx.restore(); // Restore context state
            }

            // Add subtle border between videos
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellWidth, cellHeight);
          } catch (e: any) {
            // Video might not be ready yet
            const elapsedMs = Date.now() - recordingStartTime;
            if (elapsedMs < 5000) {
              console.warn(`⚠️ Error drawing video ${index}:`, e?.message || e);
            }
          }
        });

        animationFrameRef.current = requestAnimationFrame(drawFrame);
      };

      // Start drawing frames
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      // Capture canvas as video stream
      const canvasStream = canvas.captureStream(fps);
      
      // Mix ALL audio tracks (local + remote) using Web Audio API
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext; // Store for cleanup
      const mixedAudioDestination = audioContext.createMediaStreamDestination();
      
      let audioSourcesAdded = 0;
      
      // Get all audio/video elements and extract their MediaStreamTracks
      const allMediaElements = [
        ...Array.from(document.querySelectorAll('audio')),
        ...Array.from(document.querySelectorAll('video'))
      ];
      
      console.log(`🎤 Found ${allMediaElements.length} media elements to check for audio`);
      
      // Extract audio tracks from each element's srcObject
      allMediaElements.forEach((element: HTMLMediaElement, index) => {
        try {
          const srcObject = element.srcObject;
          if (srcObject && srcObject instanceof MediaStream) {
            const audioTracks = srcObject.getAudioTracks();
            audioTracks.forEach((audioTrack) => {
              try {
                // Create a new MediaStream with just this audio track
                const trackStream = new MediaStream([audioTrack]);
                const source = audioContext.createMediaStreamSource(trackStream);
                source.connect(mixedAudioDestination);
                audioSourcesAdded++;
                console.log(`✅ Connected audio track ${audioSourcesAdded} from element ${index}`);
              } catch (err) {
                console.warn(`⚠️ Could not connect audio track:`, err);
              }
            });
          }
        } catch (error) {
          console.warn(`⚠️ Could not process media element ${index}:`, error);
        }
      });
      
      // Also add local microphone audio if not already captured
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const localAudioStream = new MediaStream([audioTracks[0]]);
            const localSource = audioContext.createMediaStreamSource(localAudioStream);
            localSource.connect(mixedAudioDestination);
            audioSourcesAdded++;
            console.log('✅ Added local microphone audio');
          } catch (error) {
            console.warn('⚠️ Could not add local audio (may already be connected):', error);
          }
        }
      }
      
      console.log(`🎙️ Total audio sources mixed: ${audioSourcesAdded}`);
      
      // Add mixed audio track to canvas stream
      const mixedAudioTracks = mixedAudioDestination.stream.getAudioTracks();
      if (mixedAudioTracks.length > 0) {
        canvasStream.addTrack(mixedAudioTracks[0]);
        console.log('✅ Mixed audio added to recording stream');
      } else {
        console.warn('⚠️ No audio tracks available for recording');
      }

      // Create MediaRecorder
      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000, // 128 Kbps for audio
      });

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = async () => {
        console.log('Recording stopped, processing...');
        
        // Stop drawing frames
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Clean up audio context
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close();
            audioContextRef.current = null;
            console.log('🔇 Audio context closed');
          } catch (error) {
            console.warn('Error closing audio context:', error);
          }
        }

        if (chunks.length === 0) {
          console.error('No recording data');
          alert('❌ Recording failed - no data captured');
          return;
        }

        const blob = new Blob(chunks, { type: mimeType });
        console.log(`Recording blob size: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        try {
          // Upload video to Firebase Storage
          console.log('Uploading recording to Firebase...');
          const uploadResult = await VideoStorageService.uploadRecording(blob, {
            title: recordingTitle || `Group Call Recording`,
            ownerId: user?.uid || '',
            ownerName: user?.displayName || 'User',
            partnerId: partnerId,
            partnerName: partnerName,
            price: 0, // Free recordings
            isPublic: false,
          });
          
          // Add to user's recordings
          await addRecording({
            id: uploadResult.recordingId || Date.now().toString(),
            partnerId: partnerId,
            partnerUsername: partnerName,
            title: recordingTitle || `Group Call Recording`,
            duration: callDuration,
            timestamp: new Date(),
            views: 0,
            earnings: 0,
            price: 0,
            isPublic: false,
            thumbnail: uploadResult.thumbnailUrl,
            videoUrl: uploadResult.url,
          });
          
          console.log('✅ Recording saved successfully!');
          alert('✅ Recording saved successfully! Check your Recordings page.');
        } catch (error) {
          console.error('Failed to save recording:', error);
          alert('❌ Failed to save recording. Please check your Firebase Storage settings.');
        }
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('❌ Recording error occurred');
      };

      // Start recording
      recorder.start(1000); // Collect data every second
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]); // Reset for new recording
      setShowRecordingSettings(false);

      console.log('🎥 Canvas recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('❌ Recording failed to start. Please try again.');
      setShowRecordingSettings(false);
    }
  };

  const stopRecording = async () => {
    console.log('🛑 Stopping recording...');
    
    // Stop canvas drawing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      setShowRecordingSettings(false);
    }
    
    // Clean up audio context
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
        audioContextRef.current = null;
        console.log('🔇 Audio context closed');
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
    }

    // Clean up canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      canvasRef.current = null;
    }
  };

  // Apply audio effect in real-time
  const applyAudioEffect = async (effectType: typeof audioEffect) => {
    console.log(`🎵 applyAudioEffect called with: ${effectType}`);
    
    // Initialize audio context if not already done
    if (!audioEffectContextRef.current) {
      try {
        console.log('🎵 Requesting microphone access for audio effects...');
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: false, // Disable to prevent conflicts with effects
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        console.log('✅ Microphone stream obtained');
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioEffectContextRef.current = audioContext;
        console.log(`✅ AudioContext created (state: ${audioContext.state})`);
        
        // Resume AudioContext if suspended (required on iOS/Safari)
        if (audioContext.state === 'suspended') {
          console.log('⏸️ AudioContext suspended, resuming...');
          await audioContext.resume();
          console.log(`✅ AudioContext resumed (state: ${audioContext.state})`);
        }
        
        const audioSource = audioContext.createMediaStreamSource(stream);
        audioSourceNodeRef.current = audioSource;
        console.log('✅ Audio source node created');
        
        const audioDestination = audioContext.createMediaStreamDestination();
        audioDestinationRef.current = audioDestination;
        console.log('✅ Audio destination created');
        
        console.log('🎵 Audio effects fully initialized');
      } catch (error: any) {
        console.error('❌ Failed to initialize audio effects:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        alert(`Audio effects initialization failed: ${error.message}`);
        return;
      }
    }
    
    if (!audioEffectContextRef.current || !audioSourceNodeRef.current || !audioDestinationRef.current) {
      console.warn('⚠️ Audio effect context not initialized');
      return;
    }
    
    console.log(`✅ Audio context ready, applying ${effectType} effect...`);

    const audioContext = audioEffectContextRef.current;
    const source = audioSourceNodeRef.current;
    const destination = audioDestinationRef.current;

    // Disconnect all existing nodes
    currentAudioEffectNodesRef.current.forEach(node => {
      try {
        node.disconnect();
      } catch (e) {
        // Already disconnected
      }
    });
    source.disconnect();

    const newNodes: AudioNode[] = [];
    let currentNode: AudioNode = source;

    switch (effectType) {
      case 'robot': {
        // Ring modulator effect for robot voice
        const oscillator = audioContext.createOscillator();
        oscillator.frequency.value = 30;
        oscillator.type = 'sine';
        oscillator.start();

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.5;

        const ringModulator = audioContext.createGain();
        
        currentNode.connect(ringModulator);
        oscillator.connect(ringModulator.gain);
        ringModulator.connect(gainNode);
        gainNode.connect(destination);

        newNodes.push(oscillator, ringModulator, gainNode);
        console.log('🤖 Robot effect applied');
        break;
      }

      case 'echo': {
        // Delay/echo effect
        const delay = audioContext.createDelay(5.0);
        delay.delayTime.value = 0.3; // 300ms delay

        const feedback = audioContext.createGain();
        feedback.gain.value = 0.4; // Echo decay

        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.7; // Original signal

        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.5; // Echo signal

        // Dry path
        currentNode.connect(dryGain);
        dryGain.connect(destination);

        // Wet path with feedback
        currentNode.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wetGain);
        wetGain.connect(destination);

        newNodes.push(delay, feedback, dryGain, wetGain);
        console.log('🔊 Echo effect applied');
        break;
      }

      case 'distortion': {
        // Waveshaper distortion
        const distortion = audioContext.createWaveShaper();
        
        const amount = 50;
        const samples = 44100;
        const curve = new Float32Array(samples);
        
        for (let i = 0; i < samples; i++) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((3 + amount) * x * 20) / (Math.PI + amount * Math.abs(x));
        }
        
        distortion.curve = curve;
        distortion.oversample = '4x';

        const preGain = audioContext.createGain();
        preGain.gain.value = 0.5;

        const postGain = audioContext.createGain();
        postGain.gain.value = 0.3;

        currentNode.connect(preGain);
        preGain.connect(distortion);
        distortion.connect(postGain);
        postGain.connect(destination);

        newNodes.push(distortion, preGain, postGain);
        console.log('🎸 Distortion effect applied');
        break;
      }

      case 'deep': {
        // Deep voice with low-pass filter
        const filter = audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 1;

        const gain = audioContext.createGain();
        gain.gain.value = 2.0;

        currentNode.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        newNodes.push(filter, gain);
        console.log('🎙️ Deep voice effect applied');
        break;
      }

      case 'reverb': {
        // Convolver reverb
        const convolver = audioContext.createConvolver();
        
        // Create impulse response for reverb
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * 2; // 2 seconds
        const impulse = audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
          const channelData = impulse.getChannelData(channel);
          for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
          }
        }
        
        convolver.buffer = impulse;

        const dryGain = audioContext.createGain();
        dryGain.gain.value = 0.6;

        const wetGain = audioContext.createGain();
        wetGain.gain.value = 0.4;

        currentNode.connect(dryGain);
        dryGain.connect(destination);

        currentNode.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(destination);

        newNodes.push(convolver, dryGain, wetGain);
        console.log('🏛️ Reverb effect applied');
        break;
      }

      case 'autotune': {
        // Autotune-style vocoder effect
        // Creates a harmonized, pitch-corrected sound using multiple oscillators
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const oscillator3 = audioContext.createOscillator();
        
        // Set frequencies to musical intervals (C major chord)
        oscillator1.frequency.value = 261.63; // C4
        oscillator2.frequency.value = 329.63; // E4
        oscillator3.frequency.value = 392.00; // G4
        
        oscillator1.type = 'sine';
        oscillator2.type = 'sine';
        oscillator3.type = 'sine';
        
        // Create gain nodes for mixing
        const inputGain = audioContext.createGain();
        inputGain.gain.value = 0.3; // Reduce input level
        
        const modulator1 = audioContext.createGain();
        const modulator2 = audioContext.createGain();
        const modulator3 = audioContext.createGain();
        
        // Create a compressor for smooth output
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        // Create filter for clarity
        const filter = audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1;
        
        const outputGain = audioContext.createGain();
        outputGain.gain.value = 3.0; // Boost output
        
        // Connect the vocoder chain
        currentNode.connect(inputGain);
        
        // Three parallel modulator paths
        inputGain.connect(modulator1);
        inputGain.connect(modulator2);
        inputGain.connect(modulator3);
        
        oscillator1.connect(modulator1.gain);
        oscillator2.connect(modulator2.gain);
        oscillator3.connect(modulator3.gain);
        
        modulator1.connect(compressor);
        modulator2.connect(compressor);
        modulator3.connect(compressor);
        
        compressor.connect(filter);
        filter.connect(outputGain);
        outputGain.connect(destination);
        
        // Start oscillators
        oscillator1.start();
        oscillator2.start();
        oscillator3.start();
        
        newNodes.push(oscillator1, oscillator2, oscillator3, inputGain, modulator1, modulator2, modulator3, compressor, filter, outputGain);
        console.log('🎵 Autotune effect applied');
        break;
      }

      case 'none':
      default:
        // No effect - direct connection
        currentNode.connect(destination);
        console.log('🎤 No audio effect');
        break;
    }

    currentAudioEffectNodesRef.current = newNodes;
    setAudioEffect(effectType); // Update state
    
    // Get the processed audio track
    if (audioDestinationRef.current) {
      const stream = audioDestinationRef.current.stream;
      const audioTracks = stream.getAudioTracks();
      console.log(`🎵 Audio destination stream has ${audioTracks.length} audio tracks`);
      
      if (audioTracks.length > 0) {
        const processedAudioTrack = audioTracks[0];
        console.log(`🎵 Audio track details:`, {
          id: processedAudioTrack.id,
          label: processedAudioTrack.label,
          enabled: processedAudioTrack.enabled,
          readyState: processedAudioTrack.readyState,
          muted: processedAudioTrack.muted
        });
        
        setProcessedAudioTrack(processedAudioTrack);
        console.log(`✅ Audio effect ${effectType} applied - will be transmitted to others`);
      } else {
        console.error('❌ No audio tracks in processed stream!');
      }
    } else {
      console.error('❌ Audio destination not available!');
    }
  };

  // Get CSS filter for visual effects
  const getVisualEffectCSS = (effectType: typeof visualEffect): string => {
    switch (effectType) {
      case 'blur':
        return 'blur(4px)';
      case 'sepia':
        return 'sepia(80%)';
      case 'grayscale':
        return 'grayscale(100%)';
      case 'vintage':
        return 'sepia(50%) contrast(120%) brightness(90%)';
      case 'neon':
        return 'saturate(200%) contrast(150%) brightness(110%) hue-rotate(15deg)';
      case 'mirror':
        return ''; // Handled by transform
      case 'none':
      default:
        return 'none';
    }
  };

  // Process video with visual effects for transmission to other participants
  const startVideoEffectProcessing = (rawVideoStream: MediaStream, currentEffect: typeof visualEffect) => {
    console.log(`🎨 Starting video processing with effect: ${currentEffect}`);
    
    // Create video element to read from
    const video = document.createElement('video');
    video.srcObject = rawVideoStream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    rawVideoStreamRef.current = rawVideoStream;
    
    // Flag to ensure canvas is only initialized once
    let canvasInitialized = false;
    
    // Function to initialize canvas once we have video dimensions
    const initializeCanvas = () => {
      if (canvasInitialized) {
        console.log('⚠️ Canvas already initialized, skipping');
        return;
      }
      canvasInitialized = true;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      
      console.log(`📹 Video dimensions: ${width}x${height}`);
      
      // Create canvas matching actual video dimensions (handles portrait/landscape)
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      videoEffectCanvasRef.current = canvas;
      
      console.log(`🎨 Canvas dimensions: ${canvas.width}x${canvas.height}`);
      console.log(`🎨 Aspect ratio: ${(width / height).toFixed(2)}`);
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      
      // Get the filter to apply
      const filterCSS = getVisualEffectCSS(currentEffect);
      console.log(`🎨 Applying filter: ${filterCSS}`);
      
      // Process video frames
      const processFrame = () => {
        if (!videoEffectCanvasRef.current || !ctx || !video) {
          console.warn('Canvas or video not available');
          return;
        }
        
        // Check if video is ready and has dimensions
        if (video.readyState < video.HAVE_CURRENT_DATA || video.videoWidth === 0) {
          videoEffectAnimationRef.current = requestAnimationFrame(processFrame);
          return;
        }
        
        try {
          // Clear canvas first
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Save context state
          ctx.save();
          
          // Apply visual effect filter
          if (filterCSS && filterCSS !== 'none') {
            ctx.filter = filterCSS;
          }
          
          // Mirror/flip for mirror effect
          if (currentEffect === 'mirror') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Restore context state
          ctx.restore();
          
        } catch (err) {
          console.error('Error drawing video frame:', err);
        }
        
        // Continue animation loop
        videoEffectAnimationRef.current = requestAnimationFrame(processFrame);
      };
      
      // Start processing when video loads and plays
      const startProcessing = () => {
        console.log('🎥 Starting frame processing');
        processFrame();
      };
      
      // Ensure video plays
      video.play().then(() => {
        console.log('🎥 Video playing, starting processing');
        startProcessing();
      }).catch(err => {
        console.error('Video play error:', err);
      });
      
      // Capture canvas stream
      const processedStream = canvas.captureStream(30); // 30 FPS
      processedVideoStreamRef.current = processedStream;
      
      const videoTrack = processedStream.getVideoTracks()[0];
      setProcessedVideoTrack(videoTrack);
      
      console.log('✅ Video effects processing started');
    };
    
    // Wait for video metadata (mobile-friendly approach)
    const checkVideoReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        console.log('✅ Video metadata ready');
        initializeCanvas();
      } else {
        console.log('⏳ Waiting for video dimensions...');
        setTimeout(checkVideoReady, 100); // Check every 100ms
      }
    };
    
    // Listen for metadata event (desktop)
    video.onloadedmetadata = () => {
      console.log('📹 onloadedmetadata fired');
      initializeCanvas();
    };
    
    // Start checking (mobile fallback)
    setTimeout(checkVideoReady, 100);
    
    return null;
  };

  const stopVideoEffectProcessing = () => {
    if (videoEffectAnimationRef.current) {
      cancelAnimationFrame(videoEffectAnimationRef.current);
      videoEffectAnimationRef.current = null;
    }
    if (processedVideoStreamRef.current) {
      processedVideoStreamRef.current.getTracks().forEach(track => track.stop());
      processedVideoStreamRef.current = null;
    }
    setProcessedVideoTrack(null);
  };

  // Update video effects when visualEffect changes
  useEffect(() => {
    if (rawVideoStreamRef.current && visualEffect !== 'none') {
      // Restart processing with new effect
      stopVideoEffectProcessing();
      startVideoEffectProcessing(rawVideoStreamRef.current, visualEffect);
    }
  }, [visualEffect]);

  const handleEndCall = async () => {
    // Stop recording if active
    if (isRecording) {
      await stopRecording();
    }

    // Save session to history
    await addSessionHistory({
      partnerId: partnerId,
      partnerUsername: partnerName,
      duration: callDuration,
      timestamp: new Date(),
      connectionFee: connectionFee,
      wasRecorded: isRecording,
    });

    // Clean up local stream to release camera/mic
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
        console.log("🛑 Stopped track:", track.kind);
      });
      localStreamRef.current = null;
    }

    onEndCall();
  };

  // LiveKit Cloud URL (or your self-hosted URL)
  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://xoxo-xxxxxxxx.livekit.cloud";

  useEffect(() => {
    let cancelled = false;
    
    const getToken = async () => {
      try {
        if (!user?.uid) return;
        if (cancelled) return;

        // Detect if this is a group call (partnerId starts with "group_")
        const isGroupCall = partnerId.startsWith("group_");
        const roomName = isGroupCall ? partnerId : [user.uid, partnerId].sort().join("_");

        console.log("🎯 Fetching LiveKit token for room:", roomName, isGroupCall ? "(group call)" : "(1-on-1)");

        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomName,
            participantIdentity: user.uid,
            participantName: user.displayName || user.uid,
          }),
        });

        if (cancelled) return;

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get token");
        }

        const data = await response.json();
        if (!cancelled) {
        setToken(data.token);
        console.log("✅ LiveKit token received");
        }
      } catch (error) {
        if (!cancelled) {
        console.error("❌ LiveKit token error:", error);
        alert("Failed to join video call. Please check your LiveKit credentials.");
        onEndCall();
        }
      }
    };

    getToken();

    // Duration timer
    const durationInterval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(durationInterval);
    };
  }, [partnerId, user?.uid]);

  // Initialize video processing when visual effects are used
  useEffect(() => {
    const initVideoProcessing = async () => {
      // Only process video if visual effect is active
      if (visualEffect === 'none') {
        // Clean up processing if effect is turned off
        stopVideoEffectProcessing();
        setProcessedVideoTrack(null);
        return;
      }
      
      // If already processing, restart with new effect
      if (rawVideoStreamRef.current) {
        stopVideoEffectProcessing();
        startVideoEffectProcessing(rawVideoStreamRef.current, visualEffect);
        return;
      }
      
      try {
        console.log('🎨 Initializing video effects - looking for existing camera...');
        
        // Try to get the existing camera stream from LiveKit first
        let stream: MediaStream | null = null;
        
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          if (videoTracks.length > 0) {
            console.log('✅ Using existing camera stream from LiveKit');
            stream = localStreamRef.current;
          }
        }
        
        // If no existing stream, request a new one
        if (!stream) {
          console.log('📹 Requesting new camera stream...');
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user'
              // Don't specify dimensions - let device use its native resolution
            }
          });
        }
        
        console.log(`📹 Stream video tracks: ${stream.getVideoTracks().length}`);
        if (stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          console.log(`📹 Video track settings:`, {
            width: settings.width,
            height: settings.height,
            aspectRatio: settings.aspectRatio,
            facingMode: settings.facingMode
          });
        }
        
        rawVideoStreamRef.current = stream;
        startVideoEffectProcessing(stream, visualEffect);
      } catch (error: any) {
        console.error('❌ Failed to initialize video effects:', error);
        alert(`Could not start video effects: ${error?.message || error}`);
      }
    };
    
    initVideoProcessing();
  }, [visualEffect]);
  
  // Initialize audio processing when audio effects are used
  useEffect(() => {
    const initAudioProcessing = async () => {
      // Only process audio if audio effect is active
      if (audioEffect === 'none') {
        return; // Cleanup is handled in the manageAudioTrack useEffect
      }
      
      try {
        console.log(`🎵 Initializing audio effect: ${audioEffect}`);
        await applyAudioEffect(audioEffect);
      } catch (error: any) {
        console.error('❌ Failed to initialize audio effects:', error);
        alert(`Could not start audio effects: ${error?.message || error}`);
      }
    };
    
    initAudioProcessing();
  }, [audioEffect]);

  const handleDisconnect = async () => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Stop recording if active
    if (isRecording) {
      await stopRecording();
    }

    // Clean up canvas drawing if still running
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clean up local stream to release camera/mic
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
        track.stop();
        console.log("🛑 Stopped track on disconnect:", track.kind);
      });
      localStreamRef.current = null;
    }

    // Save session to history
    await addSessionHistory({
      partnerId,
      partnerUsername: partnerName,
      duration,
      timestamp: new Date(),
      connectionFee,
      wasRecorded: false,
    });

    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Wait for token before connecting
  if (!token) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to {partnerName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={serverUrl}
        connect={true}
        onDisconnected={handleDisconnect}
        style={{ height: "100vh" }}
      >
        {/* Custom UI */}
        <CustomVideoUI
          partnerName={partnerName}
          callDuration={callDuration}
          formatDuration={formatDuration}
          onEndCall={handleEndCall}
          isRecording={isRecording}
          showRecordingSettings={showRecordingSettings}
          recordingTitle={recordingTitle}
          setRecordingTitle={setRecordingTitle}
          setShowRecordingSettings={setShowRecordingSettings}
          startRecording={startRecording}
          stopRecording={stopRecording}
          audioEffect={audioEffect}
          setAudioEffect={applyAudioEffect}
          visualEffect={visualEffect}
          setVisualEffect={setVisualEffect}
          getVisualEffectCSS={getVisualEffectCSS}
          showEffectsPanel={showEffectsPanel}
          setShowEffectsPanel={setShowEffectsPanel}
          processedVideoTrack={processedVideoTrack}
          processedAudioTrack={processedAudioTrack}
          stopVideoEffectProcessing={stopVideoEffectProcessing}
          setProcessedVideoTrack={setProcessedVideoTrack}
          setProcessedAudioTrack={setProcessedAudioTrack}
          currentAudioEffectNodesRef={currentAudioEffectNodesRef}
          audioEffectContextRef={audioEffectContextRef}
          isMobile={isMobile}
          roomRef={roomRef}
        />
      </LiveKitRoom>
    </div>
  );
}

// Custom UI component inside LiveKit room
function CustomVideoUI({
  partnerName,
  callDuration,
  formatDuration,
  onEndCall,
  isRecording,
  showRecordingSettings,
  recordingTitle,
  setRecordingTitle,
  setShowRecordingSettings,
  startRecording,
  stopRecording,
  audioEffect,
  setAudioEffect,
  visualEffect,
  setVisualEffect,
  getVisualEffectCSS,
  showEffectsPanel,
  setShowEffectsPanel,
  processedVideoTrack,
  processedAudioTrack,
  stopVideoEffectProcessing,
  setProcessedVideoTrack,
  setProcessedAudioTrack,
  currentAudioEffectNodesRef,
  audioEffectContextRef,
  isMobile,
  roomRef,
}: {
  partnerName: string;
  callDuration: number;
  formatDuration: (s: number) => string;
  onEndCall: () => void;
  isRecording: boolean;
  showRecordingSettings: boolean;
  recordingTitle: string;
  setRecordingTitle: (title: string) => void;
  setShowRecordingSettings: (show: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
  audioEffect: 'none' | 'robot' | 'echo' | 'distortion' | 'deep' | 'reverb' | 'autotune';
  setAudioEffect: (effect: 'none' | 'robot' | 'echo' | 'distortion' | 'deep' | 'reverb' | 'autotune') => void;
  visualEffect: 'none' | 'blur' | 'sepia' | 'grayscale' | 'vintage' | 'neon' | 'mirror';
  setVisualEffect: (effect: 'none' | 'blur' | 'sepia' | 'grayscale' | 'vintage' | 'neon' | 'mirror') => void;
  getVisualEffectCSS: (effect: 'none' | 'blur' | 'sepia' | 'grayscale' | 'vintage' | 'neon' | 'mirror') => string;
  showEffectsPanel: boolean;
  setShowEffectsPanel: (show: boolean) => void;
  processedVideoTrack: MediaStreamTrack | null;
  processedAudioTrack: MediaStreamTrack | null;
  stopVideoEffectProcessing: () => void;
  setProcessedVideoTrack: (track: MediaStreamTrack | null) => void;
  setProcessedAudioTrack: (track: MediaStreamTrack | null) => void;
  currentAudioEffectNodesRef: React.MutableRefObject<AudioNode[]>;
  audioEffectContextRef: React.MutableRefObject<AudioContext | null>;
  isMobile: boolean;
  roomRef: React.MutableRefObject<any>;
}) {
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.Microphone, withPlaceholder: false },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const room = useRoomContext();
  
  // Update roomRef for recording access
  React.useEffect(() => {
    if (room) {
      roomRef.current = room;
      console.log('✅ Room reference set for recording');
    }
  }, [room, roomRef]);
  
  // Radio player state (for syncing between users)
  const [remoteStationId, setRemoteStationId] = React.useState<string | null>(null);
  const [showRadioPanel, setShowRadioPanel] = React.useState(false);
  
  // Screen sharing state
  const [isSharingScreen, setIsSharingScreen] = React.useState(false);
  const screenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  
  // Chat state
  const [showChat, setShowChat] = React.useState(false);
  const [chatMessages, setChatMessages] = React.useState<Array<{sender: string, message: string, timestamp: number}>>([]);
  const [chatInput, setChatInput] = React.useState('');
  
  // Mute state
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);
  const [isVideoMuted, setIsVideoMuted] = React.useState(false);
  
  // Device selector state
  const [showDeviceSelector, setShowDeviceSelector] = React.useState(false);
  const [availableDevices, setAvailableDevices] = React.useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = React.useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = React.useState<string>('');
  
  // Transcription state
  const [showTranscription, setShowTranscription] = React.useState(false);
  const [transcriptionText, setTranscriptionText] = React.useState<string>('');
  const recognitionRef = React.useRef<any>(null);
  
  // Background blur state
  const [isBackgroundBlurred, setIsBackgroundBlurred] = React.useState(false);
  const backgroundProcessorRef = React.useRef<any>(null);
  
  // More options menu state
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);
  
  // Listen for radio control from other users
  // Radio is ALWAYS synced - both users listen to the same station
  useDataChannel('radio-sync', (message) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      console.log('📻 Radio sync received:', data);
      
      // Always sync - no option to disable
      if (data.stationId) {
        console.log('🎵 Syncing to station:', data.stationId);
        setRemoteStationId(data.stationId);
      }
    } catch (error) {
      console.error('Error parsing radio sync message:', error);
    }
  });
  
  // Handle station change from local RadioPlayer
  const handleStationChange = (stationId: string) => {
    console.log('📡 Broadcasting station change:', stationId);
    
    // Broadcast to other users
    const data = new TextEncoder().encode(JSON.stringify({
      stationId: stationId
    }));
    room?.localParticipant?.publishData(data, { 
      reliable: true,
      topic: 'radio-sync'
    });
  };
  
  // Listen for chat messages from other users
  useDataChannel('chat', (message) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      console.log('💬 Chat message received:', data);
      
      setChatMessages(prev => [...prev, {
        sender: data.sender || partnerName,
        message: data.message,
        timestamp: data.timestamp || Date.now()
      }]);
    } catch (error) {
      console.error('Error parsing chat message:', error);
    }
  });
  
  // Handler to apply audio effects (ensures it's called properly)
  const handleAudioEffectChange = (effect: typeof audioEffect) => {
    console.log(`🎵 Changing audio effect to: ${effect}`);
    setAudioEffect(effect); // This calls applyAudioEffect from parent
  };
  
  // Handler to apply visual effects
  const handleVisualEffectChange = (effect: typeof visualEffect) => {
    console.log(`🎨 Changing visual effect to: ${effect}`);
    setVisualEffect(effect); // This updates state which triggers useEffect
  };
  
  // Screen Share Handler
  const toggleScreenShare = async () => {
    if (!room || room.state !== 'connected') return;
    
    try {
      if (isSharingScreen) {
        // Stop screen sharing
        console.log('🛑 Stopping screen share...');
        
        const screenPublication = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (screenPublication && screenPublication.track) {
          await room.localParticipant.unpublishTrack(screenPublication.track);
        }
        
        if (screenTrackRef.current) {
          screenTrackRef.current.stop();
          screenTrackRef.current = null;
        }
        
        setIsSharingScreen(false);
        console.log('✅ Screen share stopped');
      } else {
        // Start screen sharing
        console.log('🖥️ Starting screen share...');
        
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        
        screenTrack.onended = () => {
          console.log('🛑 Screen share ended by user');
          setIsSharingScreen(false);
          screenTrackRef.current = null;
        };
        
        await room.localParticipant.publishTrack(screenTrack, {
          source: Track.Source.ScreenShare,
          simulcast: false,
        });
        
        setIsSharingScreen(true);
        console.log('✅ Screen share started');
      }
    } catch (error: any) {
      console.error('❌ Screen share error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied');
      }
    }
  };
  
  // Chat Handler
  const sendChatMessage = () => {
    if (!chatInput.trim() || !room) return;
    
    const messageData = {
      sender: 'You',
      message: chatInput,
      timestamp: Date.now()
    };
    
    // Add to local messages
    setChatMessages(prev => [...prev, messageData]);
    
    // Broadcast to other users
    const data = new TextEncoder().encode(JSON.stringify(messageData));
    room.localParticipant?.publishData(data, {
      reliable: true,
      topic: 'chat'
    });
    
    setChatInput('');
  };
  
  // Mute/Unmute Handlers
  const toggleAudioMute = async () => {
    if (!room) return;
    
    try {
      const audioPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (audioPublication) {
        if (isAudioMuted) {
          await audioPublication.track?.unmute();
        } else {
          await audioPublication.track?.mute();
        }
        setIsAudioMuted(!isAudioMuted);
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };
  
  const toggleVideoMute = async () => {
    if (!room) return;
    
    try {
      const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoPublication) {
        if (isVideoMuted) {
          await videoPublication.track?.unmute();
        } else {
          await videoPublication.track?.mute();
        }
        setIsVideoMuted(!isVideoMuted);
      }
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };
  
  // Device Selection Handler
  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices(devices);
      
      // Set current devices
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      setSelectedCamera(videoTrack.getSettings().deviceId || '');
      setSelectedMicrophone(audioTrack.getSettings().deviceId || '');
      
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };
  
  const switchCamera = async (deviceId: string) => {
    if (!room) return;
    
    try {
      const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoPublication && videoPublication.track) {
        await videoPublication.track.stop();
        await room.localParticipant.unpublishTrack(videoPublication.track);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: false
      });
      
      const newVideoTrack = stream.getVideoTracks()[0];
      await room.localParticipant.publishTrack(newVideoTrack, {
        source: Track.Source.Camera,
        simulcast: true,
      });
      
      setSelectedCamera(deviceId);
      console.log('✅ Camera switched');
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  };
  
  const switchMicrophone = async (deviceId: string) => {
    if (!room) return;
    
    try {
      const audioPublication = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (audioPublication && audioPublication.track) {
        await audioPublication.track.stop();
        await room.localParticipant.unpublishTrack(audioPublication.track);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { 
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      const newAudioTrack = stream.getAudioTracks()[0];
      await room.localParticipant.publishTrack(newAudioTrack, {
        source: Track.Source.Microphone,
      });
      
      setSelectedMicrophone(deviceId);
      console.log('✅ Microphone switched');
    } catch (error) {
      console.error('Error switching microphone:', error);
    }
  };
  
  // Transcription Handler
  const toggleTranscription = () => {
    if (showTranscription) {
      // Stop transcription
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setShowTranscription(false);
      setTranscriptionText('');
    } else {
      // Start transcription
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          alert('Speech recognition not supported in this browser');
          return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscriptionText(finalTranscript + interimTranscript);
        };
        
        recognition.start();
        recognitionRef.current = recognition;
        setShowTranscription(true);
        console.log('✅ Transcription started');
      } catch (error) {
        console.error('Error starting transcription:', error);
        alert('Failed to start transcription');
      }
    }
  };
  
  // Background Blur Handler
  const toggleBackgroundBlur = async () => {
    if (!room) return;
    
    try {
      const videoPublication = room.localParticipant.getTrackPublication(Track.Source.Camera);
      if (!videoPublication || !videoPublication.track) {
        console.error('No video track found');
        return;
      }
      
      if (isBackgroundBlurred) {
        // Disable background blur
        console.log('🚫 Disabling background blur...');
        
        if (backgroundProcessorRef.current) {
          await videoPublication.track.stopProcessor();
          backgroundProcessorRef.current = null;
        }
        
        setIsBackgroundBlurred(false);
        console.log('✅ Background blur disabled');
      } else {
        // Enable background blur
        console.log('🌫️ Enabling background blur...');
        
        const processor = BackgroundBlur(20); // 20px blur radius
        backgroundProcessorRef.current = processor;
        
        await videoPublication.track.setProcessor(processor);
        
        setIsBackgroundBlurred(true);
        console.log('✅ Background blur enabled');
      }
    } catch (error) {
      console.error('❌ Background blur error:', error);
      alert('Failed to apply background effect. Make sure you have a camera enabled.');
    }
  };
  
  // Publish camera and microphone when room connects
  React.useEffect(() => {
    const publishMediaTracks = async () => {
      if (!room || room.state !== 'connected') return;
      
      try {
        // Check if already published
        const existingVideo = room.localParticipant.getTrackPublication(Track.Source.Camera);
        const existingAudio = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        
        if (existingVideo && existingAudio) {
          console.log('📹 Tracks already published');
          return;
        }
        
        console.log('📹 Publishing camera and microphone...');
        
        // Get raw camera and mic with noise suppression enabled
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // Publish video
        const videoTrack = stream.getVideoTracks()[0];
        await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
          simulcast: true,
        });
        console.log('✅ Camera published');
        
        // Publish audio
        const audioTrack = stream.getAudioTracks()[0];
        await room.localParticipant.publishTrack(audioTrack, {
          source: Track.Source.Microphone,
        });
        console.log('✅ Microphone published');
        
      } catch (error) {
        console.error('Error publishing media tracks:', error);
      }
    };
    
    // Wait for room to be connected
    if (room?.state === 'connected') {
      publishMediaTracks();
    } else if (room) {
      room.once('connected', publishMediaTracks);
    }
    
    return () => {
      if (room) {
        room.off('connected', publishMediaTracks);
      }
    };
  }, [room]);
  
  // Replace video track based on visual effects
  React.useEffect(() => {
    const manageVideoTrack = async () => {
      if (!room || room.state !== 'connected') return;
      
      try {
        // Get existing video publication
        const existingTrack = room.localParticipant.getTrackPublication(Track.Source.Camera);
        
        if (visualEffect !== 'none' && processedVideoTrack) {
          // Apply effect: replace with processed track
          console.log(`🎨 Applying ${visualEffect} effect to video...`);
          
          if (existingTrack && existingTrack.track) {
            await room.localParticipant.unpublishTrack(existingTrack.track);
            console.log('📹 Unpublished old video track');
          }
          
          await room.localParticipant.publishTrack(processedVideoTrack, {
            source: Track.Source.Camera,
            simulcast: true,
          });
          console.log('✅ Video with effects published - others will see it!');
          
        } else if (visualEffect === 'none' && existingTrack) {
          // Remove effect: restore raw camera (regardless of processedVideoTrack state)
          console.log('🎨 Removing visual effect, restoring raw camera...');
          
          try {
            await room.localParticipant.unpublishTrack(existingTrack.track!);
            console.log('📹 Unpublished effect video track');
          } catch (err) {
            console.warn('Could not unpublish video track:', err);
          }
          
          // Get fresh raw camera
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 }
          });
          
          const videoTrack = stream.getVideoTracks()[0];
          await room.localParticipant.publishTrack(videoTrack, {
            source: Track.Source.Camera,
            simulcast: true,
          });
          console.log('✅ Raw camera restored - others see normal video');
          
          // Clean up processed video
          stopVideoEffectProcessing();
          setProcessedVideoTrack(null);
        }
        
      } catch (error) {
        console.error('Error managing video track:', error);
      }
    };
    
    // Delay to ensure room is ready
    const timeoutId = setTimeout(manageVideoTrack, 2000);
    return () => clearTimeout(timeoutId);
  }, [room, visualEffect, processedVideoTrack]);
  
  // Replace audio track based on audio effects
  React.useEffect(() => {
    const manageAudioTrack = async () => {
      console.log(`🎵 manageAudioTrack triggered - audioEffect: ${audioEffect}, processedAudioTrack: ${!!processedAudioTrack}, room: ${!!room}, room.state: ${room?.state}`);
      
      if (!room || room.state !== 'connected') {
        console.warn(`⚠️ Room not ready for audio track management`);
        return;
      }
      
      try {
        // Get existing audio publication
        const existingAudioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        console.log(`🎵 Existing audio track: ${!!existingAudioTrack}`);
        
        if (audioEffect !== 'none' && processedAudioTrack) {
          // Apply effect: replace with processed track
          console.log(`🎵 Replacing audio with ${audioEffect} effect...`);
          console.log(`🎵 Processed audio track state: ${processedAudioTrack.readyState}, enabled: ${processedAudioTrack.enabled}`);
          
          if (existingAudioTrack && existingAudioTrack.track) {
            await room.localParticipant.unpublishTrack(existingAudioTrack.track);
            console.log('🎤 Unpublished old audio track');
          }
          
          await room.localParticipant.publishTrack(processedAudioTrack, {
            source: Track.Source.Microphone,
          });
          console.log('✅ Audio with effects published - others will hear it!');
          
        } else if (audioEffect === 'none' && existingAudioTrack) {
          // Remove effect: restore raw microphone (regardless of processedAudioTrack state)
          console.log('🎵 Removing audio effect, restoring raw microphone...');
          
          try {
            await room.localParticipant.unpublishTrack(existingAudioTrack.track!);
            console.log('🎤 Unpublished effect audio track');
          } catch (err) {
            console.warn('Could not unpublish audio track:', err);
          }
          
          // Get fresh raw microphone
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });
          
          const audioTrack = stream.getAudioTracks()[0];
          await room.localParticipant.publishTrack(audioTrack, {
            source: Track.Source.Microphone,
          });
          console.log('✅ Raw microphone restored - others hear normal audio');
          
          // Clean up audio effect nodes
          if (currentAudioEffectNodesRef.current.length > 0) {
            currentAudioEffectNodesRef.current.forEach(node => {
              try {
                if ('stop' in node && typeof (node as any).stop === 'function') {
                  (node as any).stop();
                }
                node.disconnect();
              } catch (err) {
                console.warn('Error cleaning up audio node:', err);
              }
            });
            currentAudioEffectNodesRef.current = [];
          }
          
          if (audioEffectContextRef.current) {
            await audioEffectContextRef.current.close();
            audioEffectContextRef.current = null;
          }
          
          setProcessedAudioTrack(null);
        }
        
      } catch (error) {
        console.error('Error managing audio track:', error);
      }
    };
    
    // Delay to ensure room is ready
    const timeoutId = setTimeout(manageAudioTrack, 2000);
    return () => clearTimeout(timeoutId);
  }, [room, audioEffect, processedAudioTrack]);
  
  // Track who is recording (participantIdentity -> participantName)
  const [recordingParticipants, setRecordingParticipants] = React.useState<Map<string, string>>(new Map());
  
  // Listen for recording state messages from other participants
  useDataChannel('recording-state', (message) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(message.payload));
      const senderIdentity = message.from?.identity || 'Unknown';
      const senderName = message.from?.name || data.participantName || 'Someone';
      
      console.log('📹 Recording message received:', data, 'from', senderName);
      
      setRecordingParticipants(prev => {
        const updated = new Map(prev);
        if (data.isRecording) {
          updated.set(senderIdentity, senderName);
          console.log(`🔴 ${senderName} started recording`);
        } else {
          updated.delete(senderIdentity);
          console.log(`⏹️ ${senderName} stopped recording`);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error parsing recording message:', error);
    }
  });
  
  // Group call if there are 3+ people total (including you)
  const isGroupCall = participants.length >= 3;
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const localParticipant = participants.find((p) => p.isLocal);
  const totalPeople = participants.length;
  
  // Broadcast recording state when it changes
  React.useEffect(() => {
    let isMounted = true;
    
    // Guard: Check if room and participant exist and are connected
    if (!room || !localParticipant) {
      return;
    }
    
    // Check if the room is still connected
    if (room.state !== 'connected') {
      return;
    }
    
    // Small delay to ensure connection is stable
    const timeoutId = setTimeout(() => {
      if (!isMounted || room.state !== 'connected') return;
      
      try {
        const message = JSON.stringify({
          isRecording,
          participantName: localParticipant.name || 'Unknown'
        });
        
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // Send to all participants (with connection check)
        if (room.localParticipant && room.state === 'connected' && isMounted) {
          room.localParticipant.publishData(data, { 
            reliable: true,
            topic: 'recording-state'
          }).then(() => {
            if (isMounted) {
              console.log(`📡 Broadcast recording state: ${isRecording ? 'RECORDING' : 'STOPPED'}`);
            }
          }).catch((error) => {
            // Silently ignore all errors - they're usually from disconnections
            // which are expected and not critical for recording notifications
          });
        }
      } catch (error) {
        // Silently ignore - non-critical feature
      }
    }, 100); // Small delay to ensure stable connection
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isRecording, room, localParticipant]);

  // Calculate grid layout based on participant count
  // Mobile-first: larger feeds for smaller groups
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"; // Stack on mobile, 2 cols on tablet, 3 on desktop
    if (count === 4) return "grid-cols-1 md:grid-cols-2"; // Stack on mobile, 2x2 grid on larger
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    if (count <= 9) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
    if (count <= 12) return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    return "grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
  };

  const connectionStatus = remoteParticipants.length > 0 ? "connected" : "connecting";

  // Capture local stream for recording
  const localStreamRef = useRef<MediaStream | null>(null);
  
  React.useEffect(() => {
    const captureLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        localStreamRef.current = stream;
      } catch (error) {
        console.error("Failed to capture local stream for recording:", error);
      }
    };

    if (connectionStatus === "connected") {
      captureLocalStream();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [connectionStatus]);

  // Render function for a single participant tile
  const renderParticipantTile = (participant: typeof participants[0], isSelf: boolean = false, isMainFeed: boolean = false) => {
    // Safety check
    if (!participant || !participant.identity) {
      return null;
    }

    // Find tracks for this participant
    const videoTrack = tracks.find(
      (t) => t.participant?.identity === participant.identity && t.source === Track.Source.Camera
    ) as TrackReference | undefined;
    
    const audioTrack = tracks.find(
      (t) => t.participant?.identity === participant.identity && t.source === Track.Source.Microphone
    ) as TrackReference | undefined;

  return (
      <div key={participant.identity} className={`relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center ${isMainFeed ? 'w-full h-full' : 'aspect-video'}`}>
        {videoTrack ? (
          <>
          <VideoTrack
              trackRef={videoTrack}
            style={{ 
              width: "100%", 
              height: "100%", 
                objectFit: isMainFeed ? "contain" : "contain",
                transform: isSelf ? (visualEffect === 'mirror' ? "scaleX(-1) scaleY(-1)" : "scaleX(-1)") : undefined,
                filter: isSelf ? getVisualEffectCSS(visualEffect) : 'none'
              }}
            />
            {audioTrack && <AudioTrack trackRef={audioTrack} />}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-2">
              {participant.name?.[0]?.toUpperCase() || "?"}
            </div>
            <p className="text-gray-400 text-sm">{isSelf ? "Loading camera..." : "Connecting..."}</p>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">
          {isSelf ? "You" : participant.name || "Guest"}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black">
      {isGroupCall ? (
        /* Group Call Grid Layout */
        <div className="absolute inset-0 p-2 md:p-4 overflow-y-auto">
          <div className={`grid ${getGridClass(totalPeople)} gap-2 md:gap-3 auto-rows-fr`}>
            {/* Render all participants - local first, then remote */}
            {participants && participants.length > 0 && [...participants]
              .sort((a, b) => (a.isLocal ? -1 : 1))
              .filter(p => p && p.identity)
              .map(participant => (
                <React.Fragment key={participant.identity}>
                  {renderParticipantTile(participant, participant.isLocal)}
                </React.Fragment>
              ))
            }
          </div>
        </div>
      ) : (
        /* 1-on-1 Call Layout (Original PIP style) */
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {remoteParticipants && remoteParticipants.length > 0 && remoteParticipants[0] ? (
            <>
              {renderParticipantTile(remoteParticipants[0], false, true)}
              {/* Local Video (Picture-in-Picture) */}
              {localParticipant && localParticipant.identity && (
                <div className="absolute top-4 right-4 w-36 h-28 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-2xl">
                  {renderParticipantTile(localParticipant, true, false)}
                </div>
              )}
            </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Waiting for {partnerName}...</p>
            </div>
          </div>
        )}
          </div>
        )}

        {/* Recording Notification Banner */}
        {(isRecording || recordingParticipants.size > 0) && (
          <div className="absolute top-0 left-0 right-0 z-30">
            <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-semibold text-sm md:text-base">
                  {isRecording && recordingParticipants.size === 0 && "You are recording this call"}
                  {!isRecording && recordingParticipants.size === 1 && 
                    `${Array.from(recordingParticipants.values())[0]} is recording`}
                  {!isRecording && recordingParticipants.size > 1 && 
                    `${recordingParticipants.size} people are recording`}
                  {isRecording && recordingParticipants.size > 0 && 
                    `You and ${recordingParticipants.size} other${recordingParticipants.size > 1 ? 's are' : ' is'} recording`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top Bar */}
      <div className={`absolute left-0 right-0 p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent z-20 ${
        isRecording || recordingParticipants.size > 0 ? 'top-10' : 'top-0'
      }`}>
          <div className="flex items-center justify-between">
            <div>
            <h2 className="text-white text-xl font-semibold">
              {isGroupCall ? `Group Call (${totalPeople} people)` : partnerName}
            </h2>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected" ? "bg-green-500" : "bg-yellow-500"
                  }`}
                ></div>
              <span className="text-gray-300 text-sm capitalize">
                {connectionStatus}
                {isGroupCall && ` • ${remoteParticipants.length} others`}
              </span>
              </div>
            </div>
            <div className="text-white text-lg font-mono">{formatDuration(callDuration)}</div>
        </div>
      </div>

      {/* Controls - Overlayed at bottom with iPhone safe area */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 md:p-6 pb-safe min-h-[80px] md:min-h-[100px] z-10">
        {/* Debug indicator for mobile */}
        <div className="md:hidden text-center text-xs text-gray-500 mb-2">
          Recording Controls
        </div>
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 md:gap-4 h-full">
          {/* Mute/Unmute Audio Button */}
          <button
            onClick={toggleAudioMute}
            className={`p-4 md:p-4 rounded-full ${isAudioMuted ? 'bg-red-600' : 'bg-gray-700/90'} hover:bg-gray-600 active:bg-gray-800 transition-all duration-200 touch-target min-w-[56px] min-h-[56px] flex items-center justify-center shadow-lg`}
            title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isAudioMuted ? (
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Mute/Unmute Video Button */}
          <button
            onClick={toggleVideoMute}
            className={`p-4 md:p-4 rounded-full ${isVideoMuted ? 'bg-red-600' : 'bg-gray-700/90'} hover:bg-gray-600 active:bg-gray-800 transition-all duration-200 touch-target min-w-[56px] min-h-[56px] flex items-center justify-center shadow-lg`}
            title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
          >
            {isVideoMuted ? (
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            )}
          </button>

          {/* Chat Button */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-4 md:p-4 rounded-full ${showChat ? 'bg-green-600' : 'bg-gray-700/90'} hover:bg-green-700 active:bg-green-800 transition-all duration-200 touch-target min-w-[56px] min-h-[56px] flex items-center justify-center relative shadow-lg`}
            title="Chat"
          >
            <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            {chatMessages.length > 0 && !showChat && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* More Options Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`p-4 md:p-4 rounded-full ${showMoreMenu ? 'bg-purple-600' : 'bg-gray-700/90'} hover:bg-purple-700 active:bg-purple-800 transition-all duration-200 touch-target min-w-[56px] min-h-[56px] flex items-center justify-center shadow-lg relative`}
            title="More options"
          >
            <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
            {(isSharingScreen || isBackgroundBlurred || showTranscription || isRecording) && (
              <span className="absolute -top-1 -right-1 bg-blue-500 w-3 h-3 rounded-full"></span>
            )}
          </button>

          {/* End Call Button - Made more prominent on mobile */}
          <button
            onClick={onEndCall}
            className="p-4 md:p-4 md:px-8 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 flex items-center gap-2 touch-target min-w-[56px] min-h-[56px] md:min-w-auto md:min-h-auto"
          >
            <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <span className="text-white font-semibold hidden md:inline">End Call</span>
          </button>
        </div>
      </div>

      {/* Recording Settings Modal */}
      {showRecordingSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border border-pink-500/30 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Recording Settings</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-pink-300 text-sm font-medium mb-2">
                  Recording Title (Optional)
                </label>
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder={`Group Call Recording`}
                  className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              
              <div className="text-gray-400 text-sm">
                <p>💾 Recording will capture all participants in the call</p>
                <p>🎥 Video quality: 1080p @ 30fps</p>
                <p>📱 Works on all devices</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={startRecording}
                className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
              >
                Start Recording
              </button>
              <button
                onClick={() => setShowRecordingSettings(false)}
                className="px-4 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Effects Panel - Desktop Only */}
      {!isMobile && showEffectsPanel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border border-purple-500/30 rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
              </svg>
              Effects
            </h3>
            
            <div className="space-y-6 mb-6">
              {/* Audio Effects */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-3">
                  🎤 Audio Effects
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAudioEffectChange('none')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'none'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('robot')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'robot'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🤖 Robot
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('echo')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'echo'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🔊 Echo
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('reverb')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'reverb'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🏛️ Reverb
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('deep')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'deep'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🎙️ Deep
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('distortion')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'distortion'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🎸 Distortion
                  </button>
                  <button
                    onClick={() => handleAudioEffectChange('autotune')}
                    className={`px-4 py-2 rounded-lg transition ${
                      audioEffect === 'autotune'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🎵 Autotune
                  </button>
                </div>
              </div>

              {/* Visual Effects */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-3">
                  🎨 Visual Effects
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVisualEffectChange('none')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'none'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handleVisualEffectChange('blur')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'blur'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🌫️ Blur
                  </button>
                  <button
                    onClick={() => handleVisualEffectChange('sepia')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'sepia'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    📷 Sepia
                  </button>
                  <button
                    onClick={() => handleVisualEffectChange('grayscale')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'grayscale'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ⚫ B&W
                  </button>
                  <button
                    onClick={() => handleVisualEffectChange('vintage')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'vintage'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    📽️ Vintage
                  </button>
                  <button
                    onClick={() => handleVisualEffectChange('neon')}
                    className={`px-4 py-2 rounded-lg transition ${
                      visualEffect === 'neon'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    ✨ Neon
                  </button>
                </div>
              </div>

              <div className="text-gray-400 text-xs space-y-1">
                <p>✨ <strong>Effects applied in real-time</strong></p>
                <p>🎥 Other participants see & hear your effects</p>
                <p>📹 Effects captured in recordings</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowEffectsPanel(false)}
              className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Radio Player - Positioned above bottom controls on mobile */}
      {showRadioPanel && (
        <div className="fixed bottom-24 md:bottom-4 left-4 z-40 max-w-md w-[calc(100vw-2rem)] md:w-auto">
          <RadioPlayer 
            listenTogether={true}
            onStationChange={handleStationChange}
            remoteStation={remoteStationId}
          />
        </div>
      )}

      {/* More Options Menu */}
      {showMoreMenu && (
        <div className="fixed bottom-32 md:bottom-24 right-4 z-40 w-80 bg-gradient-to-br from-black/95 to-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl shadow-2xl">
          <div className="p-4 border-b border-purple-500/30">
            <h3 className="text-white font-bold text-lg">More Options</h3>
          </div>
          <div className="p-2 space-y-1">
            {/* Screen Share Option */}
            <button
              onClick={() => {
                toggleScreenShare();
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${isSharingScreen ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">{isSharingScreen ? 'Stop' : 'Share'} Screen</div>
                <div className="text-gray-400 text-xs">Share your screen or window</div>
              </div>
              {isSharingScreen && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span>}
            </button>

            {/* Recording Option */}
            {!isRecording ? (
              <button
                onClick={() => {
                  setShowRecordingSettings(true);
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Start Recording</div>
                  <div className="text-gray-400 text-xs">Record this call</div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  stopRecording();
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-600/20 border border-red-500/50 transition-all animate-pulse"
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Stop Recording</div>
                  <div className="text-gray-400 text-xs">End recording session</div>
                </div>
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">REC</span>
              </button>
            )}

            {/* Radio Option */}
            <button
              onClick={() => {
                setShowRadioPanel(!showRadioPanel);
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${showRadioPanel ? 'bg-pink-600/20 border border-pink-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Radio Player</div>
                <div className="text-gray-400 text-xs">Listen together</div>
              </div>
              {showRadioPanel && <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded">Open</span>}
            </button>

            {/* Effects Option - Desktop Only */}
            {!isMobile && (
              <button
                onClick={() => {
                  setShowEffectsPanel(!showEffectsPanel);
                  setShowMoreMenu(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg ${showEffectsPanel ? 'bg-purple-600/20 border border-purple-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">Effects</div>
                  <div className="text-gray-400 text-xs">Audio & visual effects</div>
                </div>
                {showEffectsPanel && <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">Open</span>}
              </button>
            )}

            {/* Background Blur Option */}
            <button
              onClick={() => {
                toggleBackgroundBlur();
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${isBackgroundBlurred ? 'bg-teal-600/20 border border-teal-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Background Blur</div>
                <div className="text-gray-400 text-xs">Blur your background</div>
              </div>
              {isBackgroundBlurred && <span className="text-xs bg-teal-500 text-white px-2 py-1 rounded">On</span>}
            </button>

            {/* Transcription Option */}
            <button
              onClick={() => {
                toggleTranscription();
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${showTranscription ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Live Captions</div>
                <div className="text-gray-400 text-xs">Real-time transcription</div>
              </div>
              {showTranscription && <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded">On</span>}
            </button>

            {/* Device Settings Option */}
            <button
              onClick={() => {
                setShowDeviceSelector(!showDeviceSelector);
                if (!showDeviceSelector) loadDevices();
                setShowMoreMenu(false);
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg ${showDeviceSelector ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-800/50 hover:bg-gray-700/50'} transition-all`}
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-left">
                <div className="text-white font-medium">Device Settings</div>
                <div className="text-gray-400 text-xs">Camera & microphone</div>
              </div>
              {showDeviceSelector && <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">Open</span>}
            </button>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="fixed bottom-24 md:bottom-4 right-4 z-40 w-80 max-h-96 bg-gradient-to-br from-black/95 to-gray-900/95 backdrop-blur-sm border border-green-500/30 rounded-xl shadow-2xl flex flex-col">
          <div className="p-4 border-b border-green-500/30 flex items-center justify-between">
            <h3 className="text-white font-bold">Chat</h3>
            <button
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`${msg.sender === 'You' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-3 py-2 rounded-lg ${msg.sender === 'You' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}`}>
                  <div className="text-xs opacity-75 mb-1">{msg.sender}</div>
                  <div>{msg.message}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-green-500/30 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={sendChatMessage}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Device Selector Panel */}
      {showDeviceSelector && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-gradient-to-br from-black/95 to-gray-900/95 backdrop-blur-sm border border-yellow-500/30 rounded-xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Device Settings</h3>
            <button
              onClick={() => setShowDeviceSelector(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">Camera</label>
              <select
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {availableDevices.filter(d => d.kind === 'videoinput').map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-white text-sm font-medium mb-2">Microphone</label>
              <select
                value={selectedMicrophone}
                onChange={(e) => switchMicrophone(e.target.value)}
                className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {availableDevices.filter(d => d.kind === 'audioinput').map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                ✅ Noise suppression enabled<br />
                ✅ Echo cancellation enabled<br />
                ✅ Auto gain control enabled
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcription Overlay */}
      {showTranscription && transcriptionText && (
        <div className="fixed bottom-32 md:bottom-24 left-1/2 transform -translate-x-1/2 z-40 max-w-2xl w-[calc(100vw-2rem)] bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl border border-indigo-500/30">
          <div className="text-center">
            <span className="text-indigo-400 text-xs font-bold mr-2">LIVE CAPTIONS</span>
            <span className="text-lg">{transcriptionText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapped export with Error Boundary
export default function VideoChatLiveKit(props: VideoChatLiveKitProps) {
  return (
    <VideoErrorBoundary>
      <VideoChatLiveKitInner {...props} />
    </VideoErrorBoundary>
  );
}
