"use client";

import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface HandGestureStatus {
  isPeaceSign: boolean;
  isThumbsUp: boolean;
  isHeartHand: boolean;
  isRockOn: boolean;
  isOkSign: boolean;
  handedness: 'left' | 'right' | null;
}

export function useHandGestureDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean = true
) {
  const [isPeaceSign, setIsPeaceSign] = useState(false);
  const [isThumbsUp, setIsThumbsUp] = useState(false);
  const [isHeartHand, setIsHeartHand] = useState(false);
  const [isRockOn, setIsRockOn] = useState(false);
  const [isOkSign, setIsOkSign] = useState(false);
  const [handedness, setHandedness] = useState<'left' | 'right' | null>(null);
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  
  // Temporal detection for gestures to prevent spam
  const peaceSignStateRef = useRef<{
    isActive: boolean;
    startTime: number;
    lastSent: number;
  }>({
    isActive: false,
    startTime: 0,
    lastSent: 0,
  });

  const thumbsUpStateRef = useRef<{
    isActive: boolean;
    startTime: number;
    lastSent: number;
  }>({
    isActive: false,
    startTime: 0,
    lastSent: 0,
  });

  const heartHandStateRef = useRef<{
    isActive: boolean;
    startTime: number;
    lastSent: number;
  }>({
    isActive: false,
    startTime: 0,
    lastSent: 0,
  });

  const rockOnStateRef = useRef<{
    isActive: boolean;
    startTime: number;
    lastSent: number;
  }>({
    isActive: false,
    startTime: 0,
    lastSent: 0,
  });

  const okSignStateRef = useRef<{
    isActive: boolean;
    startTime: number;
    lastSent: number;
  }>({
    isActive: false,
    startTime: 0,
    lastSent: 0,
  });

  useEffect(() => {
    if (!enabled || !videoElement) return;

    let isInitializing = false;

    const initializeHandLandmarker = async () => {
      if (isInitializing || handLandmarkerRef.current) return;
      isInitializing = true;

      try {
        console.log('🤚 Initializing MediaPipe Hand Landmarker...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

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
        console.log('✅ Hand Landmarker initialized!');
        startDetection();
      } catch (error) {
        console.error("Failed to initialize hand landmarker:", error);
      } finally {
        isInitializing = false;
      }
    };

    // Helper: Check if finger is extended
    const isFingerExtended = (landmarks: any[], fingerTip: number, fingerMCP: number, wrist: number): boolean => {
      const tipY = landmarks[fingerTip].y;
      const mcpY = landmarks[fingerMCP].y;
      const wristY = landmarks[wrist].y;
      
      // Finger is extended if tip is significantly above the MCP joint
      return tipY < mcpY - 0.05;
    };

    // Helper: Calculate angle between three points
    const calculateAngle = (p1: any, p2: any, p3: any): number => {
      const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
      let angle = Math.abs(radians * 180 / Math.PI);
      if (angle > 180) angle = 360 - angle;
      return angle;
    };

    const detectGesturesFromHands = (result: any): {
      isPeaceSign: boolean;
      isThumbsUp: boolean;
      isHeartHand: boolean;
      isRockOn: boolean;
      isOkSign: boolean;
      handedness: 'left' | 'right' | null;
    } => {
      if (!result || !result.landmarks || result.landmarks.length === 0) {
        return {
          isPeaceSign: false,
          isThumbsUp: false,
          isHeartHand: false,
          isRockOn: false,
          isOkSign: false,
          handedness: null,
        };
      }

      const landmarks = result.landmarks[0];
      const handednessInfo = result.handednesses?.[0]?.[0]?.categoryName?.toLowerCase() || null;
      
      // MediaPipe Hand Landmarks indices:
      // 0: Wrist
      // 1-4: Thumb (1=CMC, 2=MCP, 3=IP, 4=TIP)
      // 5-8: Index finger (5=MCP, 6=PIP, 7=DIP, 8=TIP)
      // 9-12: Middle finger (9=MCP, 10=PIP, 11=DIP, 12=TIP)
      // 13-16: Ring finger (13=MCP, 14=PIP, 15=DIP, 16=TIP)
      // 17-20: Pinky (17=MCP, 18=PIP, 19=DIP, 20=TIP)

      const wrist = 0;
      const thumbTip = 4, thumbMCP = 2;
      const indexTip = 8, indexMCP = 5;
      const middleTip = 12, middleMCP = 9;
      const ringTip = 16, ringMCP = 13;
      const pinkyTip = 20, pinkyMCP = 17;

      // Check which fingers are extended
      const thumbExtended = isFingerExtended(landmarks, thumbTip, thumbMCP, wrist);
      const indexExtended = isFingerExtended(landmarks, indexTip, indexMCP, wrist);
      const middleExtended = isFingerExtended(landmarks, middleTip, middleMCP, wrist);
      const ringExtended = isFingerExtended(landmarks, ringTip, ringMCP, wrist);
      const pinkyExtended = isFingerExtended(landmarks, pinkyTip, pinkyMCP, wrist);

      const now = Date.now();
      let detectedPeaceSign = false;
      let detectedThumbsUp = false;
      let detectedHeartHand = false;
      let detectedRockOn = false;
      let detectedOkSign = false;

      // PEACE SIGN: Index and middle extended, others folded
      if (indexExtended && middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
        if (!peaceSignStateRef.current.isActive) {
          peaceSignStateRef.current = {
            isActive: true,
            startTime: now,
            lastSent: peaceSignStateRef.current.lastSent,
          };
          console.log('✌️ PEACE SIGN started!');
        }
      } else if (peaceSignStateRef.current.isActive) {
        const duration = now - peaceSignStateRef.current.startTime;
        const timeSinceLastSent = now - peaceSignStateRef.current.lastSent;
        
        if (duration >= 300 && duration <= 1500 && timeSinceLastSent > 1200) {
          detectedPeaceSign = true;
          peaceSignStateRef.current.lastSent = now;
          console.log('✌️✅ CONFIRMED PEACE SIGN! Duration:', duration + 'ms');
        }
        
        peaceSignStateRef.current = {
          isActive: false,
          startTime: 0,
          lastSent: peaceSignStateRef.current.lastSent,
        };
      }

      // THUMBS UP: Only thumb extended, all others folded
      if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        if (!thumbsUpStateRef.current.isActive) {
          thumbsUpStateRef.current = {
            isActive: true,
            startTime: now,
            lastSent: thumbsUpStateRef.current.lastSent,
          };
          console.log('👍 THUMBS UP started!');
        }
      } else if (thumbsUpStateRef.current.isActive) {
        const duration = now - thumbsUpStateRef.current.startTime;
        const timeSinceLastSent = now - thumbsUpStateRef.current.lastSent;
        
        if (duration >= 300 && duration <= 1500 && timeSinceLastSent > 1200) {
          detectedThumbsUp = true;
          thumbsUpStateRef.current.lastSent = now;
          console.log('👍✅ CONFIRMED THUMBS UP! Duration:', duration + 'ms');
        }
        
        thumbsUpStateRef.current = {
          isActive: false,
          startTime: 0,
          lastSent: thumbsUpStateRef.current.lastSent,
        };
      }

      // ROCK ON: Index and pinky extended, thumb extended, middle and ring folded
      if (thumbExtended && indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
        if (!rockOnStateRef.current.isActive) {
          rockOnStateRef.current = {
            isActive: true,
            startTime: now,
            lastSent: rockOnStateRef.current.lastSent,
          };
          console.log('🤘 ROCK ON started!');
        }
      } else if (rockOnStateRef.current.isActive) {
        const duration = now - rockOnStateRef.current.startTime;
        const timeSinceLastSent = now - rockOnStateRef.current.lastSent;
        
        if (duration >= 300 && duration <= 1500 && timeSinceLastSent > 1200) {
          detectedRockOn = true;
          rockOnStateRef.current.lastSent = now;
          console.log('🤘✅ CONFIRMED ROCK ON! Duration:', duration + 'ms');
        }
        
        rockOnStateRef.current = {
          isActive: false,
          startTime: 0,
          lastSent: rockOnStateRef.current.lastSent,
        };
      }

      // OK SIGN: Thumb tip touching index tip, other fingers extended
      const thumbIndexDistance = Math.sqrt(
        Math.pow(landmarks[thumbTip].x - landmarks[indexTip].x, 2) +
        Math.pow(landmarks[thumbTip].y - landmarks[indexTip].y, 2)
      );
      
      if (thumbIndexDistance < 0.05 && middleExtended && ringExtended && pinkyExtended) {
        if (!okSignStateRef.current.isActive) {
          okSignStateRef.current = {
            isActive: true,
            startTime: now,
            lastSent: okSignStateRef.current.lastSent,
          };
          console.log('👌 OK SIGN started!');
        }
      } else if (okSignStateRef.current.isActive) {
        const duration = now - okSignStateRef.current.startTime;
        const timeSinceLastSent = now - okSignStateRef.current.lastSent;
        
        if (duration >= 300 && duration <= 1500 && timeSinceLastSent > 1200) {
          detectedOkSign = true;
          okSignStateRef.current.lastSent = now;
          console.log('👌✅ CONFIRMED OK SIGN! Duration:', duration + 'ms');
        }
        
        okSignStateRef.current = {
          isActive: false,
          startTime: 0,
          lastSent: okSignStateRef.current.lastSent,
        };
      }

      return {
        isPeaceSign: detectedPeaceSign,
        isThumbsUp: detectedThumbsUp,
        isHeartHand: detectedHeartHand, // TODO: Implement heart detection with two hands
        isRockOn: detectedRockOn,
        isOkSign: detectedOkSign,
        handedness: handednessInfo as 'left' | 'right' | null,
      };
    };

    const detect = () => {
      if (!handLandmarkerRef.current || !videoElement || videoElement.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      
      // Throttle detection to ~10 FPS for performance
      if (now - lastDetectionTime.current < 100) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      lastDetectionTime.current = now;

      try {
        const result = handLandmarkerRef.current.detectForVideo(videoElement, now);
        const gestures = detectGesturesFromHands(result);
        
        setIsPeaceSign(gestures.isPeaceSign);
        setIsThumbsUp(gestures.isThumbsUp);
        setIsHeartHand(gestures.isHeartHand);
        setIsRockOn(gestures.isRockOn);
        setIsOkSign(gestures.isOkSign);
        setHandedness(gestures.handedness);
      } catch (error) {
        console.error("Hand detection error:", error);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    const startDetection = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      detect();
    };

    initializeHandLandmarker();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [videoElement, enabled]);

  return { isPeaceSign, isThumbsUp, isHeartHand, isRockOn, isOkSign, handedness };
}

