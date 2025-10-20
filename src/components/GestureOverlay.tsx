'use client';

import React, { useRef, useEffect, useState } from "react";
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface GestureAnimation {
  id: string;
  type: 'wink' | 'tongue' | 'kiss' | 'vTongue' | 'peace' | 'thumbsUp' | 'okSign' | 'rockOn';
  side?: 'left' | 'right' | undefined;
  timestamp: number;
  emoji: string;
}

interface GestureOverlayProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  gesturesEnabled?: boolean;
}

export default function GestureOverlay({
  localVideoRef,
  enabled = true,
  gesturesEnabled = true,
}: GestureOverlayProps) {
  const [localGestureAnimations, setLocalGestureAnimations] = useState<GestureAnimation[]>([]);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  const isCleaningUpRef = useRef<boolean>(false);
  const lastGesturesRef = useRef<{[key: string]: number}>({});
  const lastGestureTime = useRef<number>(0); // Global 10-second cooldown for all gestures

  // Wink temporal detection
  const winkStateRef = useRef<{
    isWinking: boolean;
    winkEye: 'left' | 'right' | null;
    startTime: number;
    lastSentWink: number;
  }>({
    isWinking: false,
    winkEye: null,
    startTime: 0,
    lastSentWink: 0,
  });

  // Tongue and kiss state refs
  const tongueStateRef = useRef<{ isTongueOut: boolean; startTime: number }>({
    isTongueOut: false,
    startTime: 0,
  });

  const kissStateRef = useRef<{ isKissing: boolean; startTime: number }>({
    isKissing: false,
    startTime: 0,
  });

  useEffect(() => {
    if (!enabled || !localVideoRef.current) return;

    let isInitializing = false;
    isCleaningUpRef.current = false;

    const initializeMediaPipe = async () => {
      if (isInitializing || faceLandmarkerRef.current) return;
      isInitializing = true;

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // Initialize face landmarker
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
        });

        faceLandmarkerRef.current = faceLandmarker;

        // Initialize hand landmarker
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handLandmarkerRef.current = handLandmarker;

        startDetection();
      } catch (error) {
        console.error("Failed to initialize MediaPipe:", error);
      } finally {
        isInitializing = false;
      }
    };

    // Detect Thumbs Up gesture
    const detectThumbsUp = (landmarks: any[]): boolean => {
      if (!landmarks || landmarks.length < 21) return false;
      
      const thumbTip = landmarks[4];
      const thumbBase = landmarks[2];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      const wrist = landmarks[0];
      
      // Thumb should be extended upward
      const thumbExtended = thumbTip.y < thumbBase.y - 0.1;
      
      // Other fingers should be curled
      const indexCurled = indexTip.y > wrist.y;
      const middleCurled = middleTip.y > wrist.y;
      const ringCurled = ringTip.y > wrist.y;
      const pinkyCurled = pinkyTip.y > wrist.y;
      
      return thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled;
    };
    
    // Detect OK Sign gesture (thumb + index forming circle)
    const detectOKSign = (landmarks: any[]): boolean => {
      if (!landmarks || landmarks.length < 21) return false;
      
      const thumbTip = landmarks[4];
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      const middleBase = landmarks[9];
      const ringBase = landmarks[13];
      const pinkyBase = landmarks[17];
      
      // Distance between thumb and index tip (should be small for circle)
      const distance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
      );
      
      const circleFormed = distance < 0.05;
      
      // Other fingers should be extended
      const middleExtended = middleTip.y < middleBase.y - 0.05;
      const ringExtended = ringTip.y < ringBase.y - 0.05;
      const pinkyExtended = pinkyTip.y < pinkyBase.y - 0.05;
      
      return circleFormed && middleExtended && ringExtended && pinkyExtended;
    };
    
    // Detect Rock On gesture (index + pinky extended)
    const detectRockOn = (landmarks: any[]): boolean => {
      if (!landmarks || landmarks.length < 21) return false;
      
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      const indexBase = landmarks[5];
      const middleBase = landmarks[9];
      const ringBase = landmarks[13];
      const pinkyBase = landmarks[17];
      
      // Index and pinky extended
      const indexExtended = indexTip.y < indexBase.y - 0.05;
      const pinkyExtended = pinkyTip.y < pinkyBase.y - 0.05;
      
      // Middle and ring curled
      const middleCurled = Math.abs(middleTip.y - middleBase.y) < 0.08;
      const ringCurled = Math.abs(ringTip.y - ringBase.y) < 0.08;
      
      return indexExtended && pinkyExtended && middleCurled && ringCurled;
    };
    
    // Detect V-sign (peace sign) from hand landmarks
    const detectVSign = (landmarks: any[]): boolean => {
      if (!landmarks || landmarks.length < 21) return false;
      
      // Thumb tip, index tip, middle tip, ring tip, pinky tip
      const indexTip = landmarks[8];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      
      // Finger bases
      const indexBase = landmarks[5];
      const middleBase = landmarks[9];
      const ringBase = landmarks[13];
      const pinkyBase = landmarks[17];
      
      // Check if index and middle fingers are extended (tip higher than base in camera view)
      const indexExtended = indexTip.y < indexBase.y - 0.05;
      const middleExtended = middleTip.y < middleBase.y - 0.05;
      
      // Check if ring and pinky are closed (tip close to base)
      const ringClosed = Math.abs(ringTip.y - ringBase.y) < 0.08;
      const pinkyClosed = Math.abs(pinkyTip.y - pinkyBase.y) < 0.08;
      
      // Check separation between index and middle (V shape)
      const fingerSeparation = Math.abs(indexTip.x - middleTip.x);
      const hasVShape = fingerSeparation > 0.03;
      
      return indexExtended && middleExtended && ringClosed && pinkyClosed && hasVShape;
    };

    const addGestureAnimation = (type: GestureAnimation['type'], emoji: string, side?: 'left' | 'right' | undefined) => {
      const now = Date.now();
      const lastTime = lastGesturesRef.current[type] || 0;
      
      // Prevent spam - only allow one gesture per second
      if (now - lastTime < 1000) return;
      
      const animation: GestureAnimation = {
        id: `${type}-${now}`,
        type,
        side,
        timestamp: now,
        emoji,
      };
      
      setLocalGestureAnimations(prev => [...prev, animation]);
      lastGesturesRef.current[type] = now;
      
      // Remove after animation
      setTimeout(() => {
        setLocalGestureAnimations(prev => prev.filter(a => a.id !== animation.id));
      }, 2000);
    };

    const detect = () => {
      if (isCleaningUpRef.current) return;

      const targetVideo = localVideoRef.current;
      if (!targetVideo || !faceLandmarkerRef.current || targetVideo.readyState < 2) {
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      const now = performance.now();
      if (now - lastDetectionTime.current < 100) {
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      lastDetectionTime.current = now;

      try {
        // Face detection
        const faceResult = faceLandmarkerRef.current.detectForVideo(targetVideo, now);
        
        if (faceResult && faceResult.faceBlendshapes && faceResult.faceBlendshapes.length > 0) {
          const blendshapes = faceResult.faceBlendshapes[0];
          
          // Wink detection
          const leftBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkLeft")?.score || 0;
          const rightBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkRight")?.score || 0;
          
          const WINK_THRESHOLD = 0.35; // Reduced from 0.45 to make it easier
          const currentTime = Date.now();
          
          // Check for left wink
          if (leftBlink > WINK_THRESHOLD && rightBlink < WINK_THRESHOLD) {
            if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'left') {
              winkStateRef.current = {
                isWinking: true,
                winkEye: 'left',
                startTime: currentTime,
                lastSentWink: winkStateRef.current.lastSentWink,
              };
            }
          } 
          // Check for right wink
          else if (rightBlink > WINK_THRESHOLD && leftBlink < WINK_THRESHOLD) {
            if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'right') {
              winkStateRef.current = {
                isWinking: true,
                winkEye: 'right',
                startTime: currentTime,
                lastSentWink: winkStateRef.current.lastSentWink,
              };
            }
          } 
          // Eyes are open - check if wink just ended
          else if (winkStateRef.current.isWinking) {
            const winkDuration = currentTime - winkStateRef.current.startTime;
            const timeSinceLastSent = currentTime - winkStateRef.current.lastSentWink;
            
            // Add global 10-second cooldown
            const timeSinceLastGesture = currentTime - lastGestureTime.current;
            if (winkDuration >= 150 && winkDuration <= 800 && timeSinceLastSent > 800 && timeSinceLastGesture > 10000) {
              addGestureAnimation('wink', '😉', winkStateRef.current.winkEye || undefined);
              winkStateRef.current.lastSentWink = currentTime;
              lastGestureTime.current = currentTime; // Update global cooldown
            }
            
            winkStateRef.current = {
              isWinking: false,
              winkEye: null,
              startTime: 0,
              lastSentWink: winkStateRef.current.lastSentWink,
            };
          }
          
          // Tongue detection
          const tongueOutScore = blendshapes.categories?.find((c: any) => c.categoryName === "tongueOut")?.score || 0;
          const TONGUE_THRESHOLD = 0.35;
          
          if (tongueOutScore > TONGUE_THRESHOLD) {
            if (!tongueStateRef.current.isTongueOut) {
              tongueStateRef.current = { isTongueOut: true, startTime: currentTime };
            }
          } else if (tongueStateRef.current.isTongueOut) {
            const tongueDuration = currentTime - tongueStateRef.current.startTime;
            if (tongueDuration >= 200 && tongueDuration <= 1000) {
              addGestureAnimation('tongue', '👅');
            }
            tongueStateRef.current = { isTongueOut: false, startTime: 0 };
          }
          
          // Kiss detection removed - was causing overload
        }

        // Hand detection
        if (handLandmarkerRef.current && targetVideo) {
          try {
            const handResult = handLandmarkerRef.current.detectForVideo(targetVideo, now);
            
            if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
              const handLandmarks = handResult.landmarks[0];
              
              // Detect all hand gestures
              const isPeaceSign = detectVSign(handLandmarks);
              const isThumbsUp = detectThumbsUp(handLandmarks);
              const isOKSign = detectOKSign(handLandmarks);
              const isRockOn = detectRockOn(handLandmarks);
              
              if (isPeaceSign) {
                addGestureAnimation('peace', '✌️');
              }
              if (isThumbsUp) {
                addGestureAnimation('thumbsUp', '👍');
              }
              if (isOKSign) {
                addGestureAnimation('okSign', '👌');
              }
              if (isRockOn) {
                addGestureAnimation('rockOn', '🤟');
              }
            }
          } catch (handError) {
            // Silently fail hand detection
          }
        }

      } catch (error) {
        console.error("Detection error:", error);
      }

      if (!isCleaningUpRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };

    const startDetection = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    initializeMediaPipe();

    return () => {
      isCleaningUpRef.current = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [enabled, localVideoRef.current]);

  if (!gesturesEnabled) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Local Gesture Animations (bottom-right where local video is) */}
      {localGestureAnimations.map((gesture) => (
        <div
          key={gesture.id}
          className="absolute bottom-28 right-20 z-30"
          style={{
            animation: 'gestureFloat 2s ease-out forwards',
          }}
        >
          <div className="text-9xl animate-bounce drop-shadow-2xl filter brightness-110 contrast-125" 
               style={{
                 textShadow: '0 0 30px rgba(255,255,255,0.9), 0 0 60px rgba(255,255,255,0.7)',
                 transform: 'scale(1.3)',
               }}>
            {gesture.emoji}
          </div>
        </div>
      ))}

      {/* CSS for gesture animations */}
      <style jsx>{`
        @keyframes gestureFloat {
          0% {
            opacity: 1;
            transform: scale(1.2) translateY(0) rotate(0deg);
          }
          25% {
            transform: scale(1.6) translateY(-20px) rotate(5deg);
          }
          50% {
            transform: scale(1.8) translateY(-40px) rotate(-5deg);
          }
          75% {
            transform: scale(1.5) translateY(-50px) rotate(3deg);
          }
          100% {
            opacity: 0;
            transform: scale(1.0) translateY(-80px) rotate(0deg);
          }
        }
      `}</style>
    </div>
  );
}
