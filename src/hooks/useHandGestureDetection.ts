"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface HandGestureStatus {
  isPeaceSign: boolean;
  peaceSignNearMouth: boolean;
  handPosition: { x: number; y: number } | null;
}

export function useHandGestureDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean = true
) {
  const [isPeaceSign, setIsPeaceSign] = useState(false);
  const [peaceSignNearMouth, setPeaceSignNearMouth] = useState(false);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);

  // Initialize MediaPipe Hand Landmarker
  useEffect(() => {
    let isMounted = true;

    const initializeHandLandmarker = async () => {
      try {
        console.log('🤚 Initializing MediaPipe Hand Landmarker...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1, // Only detect one hand for performance
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (isMounted) {
          handLandmarkerRef.current = handLandmarker;
          console.log('✅ MediaPipe Hand Landmarker initialized successfully!');
        }
      } catch (error) {
        console.error("Error initializing Hand Landmarker:", error);
      }
    };

    if (enabled) {
      initializeHandLandmarker();
    }

    return () => {
      isMounted = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Detection logic
  useEffect(() => {
    if (!videoElement || !enabled || !handLandmarkerRef.current) {
      return;
    }

    const detect = () => {
      if (!handLandmarkerRef.current || !videoElement) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      
      // Throttle to ~30fps
      if (now - lastDetectionTime.current < 33) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      
      lastDetectionTime.current = now;

      try {
        // Check if video is ready
        if (videoElement.readyState < 2 || !videoElement.videoWidth) {
          animationFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        const result = handLandmarkerRef.current.detectForVideo(
          videoElement,
          performance.now()
        );

        if (result && result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0]; // First hand
          
          // Detect Peace Sign (V-sign)
          const isPeace = detectPeaceSign(landmarks);
          setIsPeaceSign(isPeace);
          
          // Get hand position (center of palm)
          const palmCenter = {
            x: landmarks[9].x, // Middle finger base
            y: landmarks[9].y,
          };
          setHandPosition(palmCenter);
          
          // Check if peace sign is near mouth (y < 0.6 = upper half of frame)
          const nearMouth = isPeace && palmCenter.y < 0.6 && palmCenter.y > 0.3;
          setPeaceSignNearMouth(nearMouth);
          
          if (nearMouth) {
            console.log('✌️👅 Peace sign near mouth detected!');
          }
        } else {
          setIsPeaceSign(false);
          setPeaceSignNearMouth(false);
          setHandPosition(null);
        }
      } catch (error) {
        console.error("Hand detection error:", error);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    animationFrameRef.current = requestAnimationFrame(detect);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [videoElement, enabled]);

  return { isPeaceSign, peaceSignNearMouth, handPosition };
}

// Detect peace sign (index and middle fingers extended, others closed)
function detectPeaceSign(landmarks: any[]): boolean {
  // Thumb tip, index tip, middle tip, ring tip, pinky tip
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  // Finger bases
  const indexBase = landmarks[5];
  const middleBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];
  
  // Check if index and middle fingers are extended (tip higher than base)
  const indexExtended = indexTip.y < indexBase.y - 0.05;
  const middleExtended = middleTip.y < middleBase.y - 0.05;
  
  // Check if ring and pinky are closed (tip close to base)
  const ringClosed = Math.abs(ringTip.y - ringBase.y) < 0.08;
  const pinkyClosed = Math.abs(pinkyTip.y - pinkyBase.y) < 0.08;
  
  // Check separation between index and middle (V shape)
  const fingerSeparation = Math.abs(indexTip.x - middleTip.x);
  const hasVShape = fingerSeparation > 0.03;
  
  return indexExtended && middleExtended && ringClosed && pinkyClosed && hasVShape;
}
