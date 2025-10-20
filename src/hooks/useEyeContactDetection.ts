"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export interface EyeContactStatus {
  isLookingAtCamera: boolean;
  confidence: number;
  isWinking: boolean;
  winkEye: 'left' | 'right' | null;
}

export function useEyeContactDetection(
  videoElement: HTMLVideoElement | null,
  enabled: boolean = true
) {
  const [isLookingAtCamera, setIsLookingAtCamera] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [isWinking, setIsWinking] = useState(false);
  const [winkEye, setWinkEye] = useState<'left' | 'right' | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  
  // Wink temporal detection
  const winkStateRef = useRef<{
    isWinking: boolean;
    winkEye: 'left' | 'right' | null;
    startTime: number;
  }>({
    isWinking: false,
    winkEye: null,
    startTime: 0,
  });

  useEffect(() => {
    if (!enabled || !videoElement) return;

    let isInitializing = false;

    const initializeFaceLandmarker = async () => {
      if (isInitializing || faceLandmarkerRef.current) return;
      isInitializing = true;

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
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
        startDetection();
      } catch (error) {
        console.error("Failed to initialize face landmarker:", error);
      } finally {
        isInitializing = false;
      }
    };

    const calculateEyeContactFromLandmarks = (result: any): { 
      isLooking: boolean; 
      confidence: number; 
      isWinking: boolean; 
      winkEye: 'left' | 'right' | null;
    } => {
      if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
        return { isLooking: false, confidence: 0, isWinking: false, winkEye: null };
      }

      const landmarks = result.faceLandmarks[0];

      // MediaPipe Face Landmarks:
      // Left eye: outer corner: 33, inner corner: 133
      // Right eye: outer corner: 362, inner corner: 263
      // Left iris center: 468
      // Right iris center: 473
      // Face center (between eyes): 168

      // Get eye corner landmarks
      const leftEyeOuter = landmarks[33];
      const leftEyeInner = landmarks[133];
      const rightEyeOuter = landmarks[362];
      const rightEyeInner = landmarks[263];

      // Get iris/pupil centers
      const leftIrisCenter = landmarks[468];
      const rightIrisCenter = landmarks[473];

      // Calculate eye width (distance between corners)
      const leftEyeWidth = Math.sqrt(
        Math.pow(leftEyeInner.x - leftEyeOuter.x, 2) +
        Math.pow(leftEyeInner.y - leftEyeOuter.y, 2)
      );
      const rightEyeWidth = Math.sqrt(
        Math.pow(rightEyeInner.x - rightEyeOuter.x, 2) +
        Math.pow(rightEyeInner.y - rightEyeOuter.y, 2)
      );

      // Calculate eye centers (midpoint between corners)
      const leftEyeCenter = {
        x: (leftEyeOuter.x + leftEyeInner.x) / 2,
        y: (leftEyeOuter.y + leftEyeInner.y) / 2,
      };
      const rightEyeCenter = {
        x: (rightEyeOuter.x + rightEyeInner.x) / 2,
        y: (rightEyeOuter.y + rightEyeInner.y) / 2,
      };

      // Calculate pupil offset from eye center (normalized by eye width)
      const leftPupilOffset = {
        x: (leftIrisCenter.x - leftEyeCenter.x) / leftEyeWidth,
        y: (leftIrisCenter.y - leftEyeCenter.y) / leftEyeWidth,
      };
      const rightPupilOffset = {
        x: (rightIrisCenter.x - rightEyeCenter.x) / rightEyeWidth,
        y: (rightIrisCenter.y - rightEyeCenter.y) / rightEyeWidth,
      };

      // Calculate average gaze offset
      const avgGazeOffsetX = (leftPupilOffset.x + rightPupilOffset.x) / 2;
      const avgGazeOffsetY = (leftPupilOffset.y + rightPupilOffset.y) / 2;

      // Calculate distance from center (magnitude of gaze vector)
      const gazeDistance = Math.sqrt(
        avgGazeOffsetX * avgGazeOffsetX +
        avgGazeOffsetY * avgGazeOffsetY
      );

      // When looking at camera, pupils should be centered (low offset)
      // Typical centered gaze: distance < 0.15
      // Looking away: distance > 0.25
      const gazeCenterConfidence = Math.max(0, 1 - (gazeDistance / 0.2));

      // Check head orientation (face should be relatively frontal)
      const eyeLineAngle = Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
      );
      const headTiltConfidence = Math.max(0, 1 - Math.abs(eyeLineAngle) * 5);

      // Check eye openness using blendshapes with temporal validation
      let eyeOpennessConfidence = 0.85; // default assumption: eyes open
      let leftEyeBlink = 0;
      let rightEyeBlink = 0;
      let isWinking = false;
      let winkEye: 'left' | 'right' | null = null;
      
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const blendshapes = result.faceBlendshapes[0];
        
        leftEyeBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkLeft")?.score || 0;
        rightEyeBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkRight")?.score || 0;

        // IMPROVED: Multi-factor wink detection
        const WINK_CLOSED_THRESHOLD = 0.60;
        const WINK_OPEN_THRESHOLD = 0.45;
        const difference = Math.abs(leftEyeBlink - rightEyeBlink);
        const hasSignificantDifference = difference > 0.35;
        const notBlinking = (leftEyeBlink + rightEyeBlink) / 2 < 0.75;
        
        // Check for winks with better criteria
        if (leftEyeBlink > WINK_CLOSED_THRESHOLD && 
            rightEyeBlink < WINK_OPEN_THRESHOLD && 
            hasSignificantDifference && 
            notBlinking) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'left') {
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'left',
              startTime: Date.now(),
            };
          }
        } else if (rightEyeBlink > WINK_CLOSED_THRESHOLD && 
                   leftEyeBlink < WINK_OPEN_THRESHOLD && 
                   hasSignificantDifference && 
                   notBlinking) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'right') {
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'right',
              startTime: Date.now(),
            };
          }
        } else if (winkStateRef.current.isWinking) {
          // Wink ended - validate duration
          const winkDuration = Date.now() - winkStateRef.current.startTime;
          
          if (winkDuration >= 150 && winkDuration <= 800) {
            isWinking = true;
            winkEye = winkStateRef.current.winkEye;
          }
          
          winkStateRef.current = {
            isWinking: false,
            winkEye: null,
            startTime: 0,
          };
        }

        // Eyes should be open (low blink score) for eye contact
        eyeOpennessConfidence = 1 - ((leftEyeBlink + rightEyeBlink) / 2);
      }

      // Combine all factors:
      // - Gaze must be centered (most important): 60%
      // - Eyes must be open: 25%
      // - Head must be frontal: 15%
      const overallConfidence = (
        gazeCenterConfidence * 0.60 +
        eyeOpennessConfidence * 0.25 +
        headTiltConfidence * 0.15
      );

      // Threshold for "making eye contact"
      const isLooking = overallConfidence > 0.60;

      // Debug logging (can be removed in production)
      if (Math.random() < 0.05) { // Log occasionally to avoid spam
        console.log('👁️ Gaze:', {
          gazeDistance: gazeDistance.toFixed(3),
          gazeCenterConf: gazeCenterConfidence.toFixed(2),
          eyeOpenConf: eyeOpennessConfidence.toFixed(2),
          headTiltConf: headTiltConfidence.toFixed(2),
          overall: overallConfidence.toFixed(2),
          isLooking,
          isWinking,
          winkEye,
          leftBlink: leftEyeBlink.toFixed(2),
          rightBlink: rightEyeBlink.toFixed(2)
        });
      }

      return { isLooking, confidence: overallConfidence, isWinking, winkEye };
    };

    const detect = () => {
      if (!faceLandmarkerRef.current || !videoElement || videoElement.readyState < 2) {
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
        const result = faceLandmarkerRef.current.detectForVideo(videoElement, now);
        const { 
          isLooking, 
          confidence, 
          isWinking: winking, 
          winkEye: eye
        } = calculateEyeContactFromLandmarks(result);
        
        setIsLookingAtCamera(isLooking);
        setConfidence(confidence);
        setIsWinking(winking);
        setWinkEye(eye);
      } catch (error) {
        console.error("Detection error:", error);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    const startDetection = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      detect();
    };

    initializeFaceLandmarker();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
        faceLandmarkerRef.current = null;
      }
    };
  }, [videoElement, enabled]);

  return { isLookingAtCamera, confidence, isWinking, winkEye };
}

