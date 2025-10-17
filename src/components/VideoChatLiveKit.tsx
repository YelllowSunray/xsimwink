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
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { VideoStorageService } from "@/utils/videoStorage";

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
  const [recordingPrice, setRecordingPrice] = useState(9.99);
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const startTimeRef = useRef<number>(Date.now());
  const localStreamRef = useRef<MediaStream | null>(null);
  const { user, addSessionHistory, addRecording } = useAuth();

  // Recording functions
  const startRecording = () => {
    if (!localStreamRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const recorder = new MediaRecorder(localStreamRef.current, options);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev: Blob[]) => [...prev, event.data]);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        try {
          // Upload video to storage
          const uploadResult = await VideoStorageService.uploadRecording(blob, {
            title: recordingTitle || `Session with ${partnerName}`,
            ownerId: user?.uid || '',
            ownerName: user?.displayName || 'User',
            partnerId: partnerId,
            partnerName: partnerName,
            price: recordingPrice,
            isPublic: false,
          });
          
          // Add to user's recordings
          await addRecording({
            id: uploadResult.recordingId || Date.now().toString(),
            partnerId: partnerId,
            partnerUsername: partnerName,
            title: recordingTitle || `Session with ${partnerName}`,
            duration: callDuration,
            timestamp: new Date(),
            views: 0,
            earnings: 0,
            price: recordingPrice,
            isPublic: false,
            thumbnail: uploadResult.thumbnailUrl,
          });
          
          console.log("Recording saved successfully");
        } catch (error) {
          console.error("Failed to save recording:", error);
        }
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
      setShowRecordingSettings(false);
    }
  };

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

  const handleDisconnect = async () => {
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

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
        video={true}
        audio={true}
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
          recordingPrice={recordingPrice}
          setRecordingPrice={setRecordingPrice}
          setShowRecordingSettings={setShowRecordingSettings}
          startRecording={startRecording}
          stopRecording={stopRecording}
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
  recordingPrice,
  setRecordingPrice,
  setShowRecordingSettings,
  startRecording,
  stopRecording,
}: {
  partnerName: string;
  callDuration: number;
  formatDuration: (s: number) => string;
  onEndCall: () => void;
  isRecording: boolean;
  showRecordingSettings: boolean;
  recordingTitle: string;
  setRecordingTitle: (title: string) => void;
  recordingPrice: number;
  setRecordingPrice: (price: number) => void;
  setShowRecordingSettings: (show: boolean) => void;
  startRecording: () => void;
  stopRecording: () => void;
}) {
  const participants = useParticipants();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.Microphone, withPlaceholder: false },
  ]);
  
  // Group call if there are 3+ people total (including you)
  const isGroupCall = participants.length >= 3;
  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const localParticipant = participants.find((p) => p.isLocal);
  const totalPeople = participants.length;

  // Calculate grid layout based on participant count
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
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
  const renderParticipantTile = (participant: typeof participants[0], isSelf: boolean = false) => {
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
      <div key={participant.identity} className="relative bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center aspect-video">
        {videoTrack ? (
          <>
            <VideoTrack
              trackRef={videoTrack}
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain",
                transform: isSelf ? "scaleX(-1)" : undefined
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
              {renderParticipantTile(remoteParticipants[0], false)}
              {/* Local Video (Picture-in-Picture) */}
              {localParticipant && localParticipant.identity && (
                <div className="absolute top-4 right-4 w-36 h-28 md:w-48 md:h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-2xl">
                  {renderParticipantTile(localParticipant, true)}
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

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 md:p-4 bg-gradient-to-b from-black/80 to-transparent z-20">
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
          {/* Recording Button - Made more prominent on mobile */}
          {!isRecording ? (
            <button
              onClick={() => setShowRecordingSettings(true)}
              className="p-4 md:p-4 rounded-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 transition-all duration-200 touch-target min-w-[56px] min-h-[56px] flex items-center justify-center"
              title="Start recording"
            >
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="p-4 md:p-4 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all duration-200 animate-pulse touch-target min-w-[56px] min-h-[56px] flex items-center justify-center"
              title="Stop recording"
            >
              <svg className="w-6 h-6 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            </button>
          )}

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
                  Recording Title
                </label>
                <input
                  type="text"
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder={`Session with ${partnerName}`}
                  className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              
              <div>
                <label className="block text-pink-300 text-sm font-medium mb-2">
                  Price (for future sales)
                </label>
                <input
                  type="number"
                  value={recordingPrice}
                  onChange={(e) => setRecordingPrice(parseFloat(e.target.value))}
                  min="0.99"
                  step="0.01"
                  className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
                />
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
