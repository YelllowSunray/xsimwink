"use client";

import { useEffect, useState, useRef } from "react";
import { useDataChannel, useRoomContext } from "@livekit/components-react";
import { DataPacket_Kind } from "livekit-client";
import { FaceLandmarker, HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface GazeData {
  gazeX: number; // -1 to 1, where 0 is center
  gazeY: number; // -1 to 1, where 0 is center
  isLooking: boolean;
  confidence: number;
  timestamp: number;
  isWinking: boolean;
  winkEye: 'left' | 'right' | null;
  isTongueOut: boolean;
  isVTongue: boolean; // V-sign + tongue out combo
  isPeaceSign: boolean; // V-sign alone
  isThumbsUp: boolean;
  isOKSign: boolean;
  isRockOn: boolean;
  leftBlink?: number; // Debug: raw blink value
  rightBlink?: number; // Debug: raw blink value
}

interface AttentionMetrics {
  localAttentionScore: number; // 0-100
  remoteAttentionScore: number; // 0-100
  mutualAttentionTime: number; // seconds
  totalCallTime: number; // seconds
  interestLevel: 'low' | 'medium' | 'high';
}

interface EyeContactState {
  localWinking: boolean;
  remoteWinking: boolean;
  localWinkEye: 'left' | 'right' | null;
  remoteWinkEye: 'left' | 'right' | null;
  localTongueOut: boolean;
  remoteTongueOut: boolean;
  localVTongue: boolean;
  remoteVTongue: boolean;
  localPeaceSign: boolean;
  remotePeaceSign: boolean;
  localThumbsUp: boolean;
  remoteThumbsUp: boolean;
  localOKSign: boolean;
  remoteOKSign: boolean;
  localRockOn: boolean;
  remoteRockOn: boolean;
  comeCloserRequest: boolean;
  sendComeCloserRequest: () => void;
  // Attention/Interest tracking
  localGaze: GazeData | null;
  remoteGaze: GazeData | null;
  isMutualEyeContact: boolean;
  eyeContactDuration: number;
  attentionMetrics: AttentionMetrics;
}

export function useLiveKitEyeContact(
  localVideoElement: HTMLVideoElement | null,
  remoteVideoElement: HTMLVideoElement | null,
  enabled: boolean = true
) {
  const room = useRoomContext();
  const [eyeContactState, setEyeContactState] = useState<Omit<EyeContactState, 'sendComeCloserRequest'>>({
    localWinking: false,
    remoteWinking: false,
    localWinkEye: null,
    remoteWinkEye: null,
    localTongueOut: false,
    remoteTongueOut: false,
    localVTongue: false,
    remoteVTongue: false,
    localPeaceSign: false,
    remotePeaceSign: false,
    localThumbsUp: false,
    remoteThumbsUp: false,
    localOKSign: false,
    remoteOKSign: false,
    localRockOn: false,
    remoteRockOn: false,
    comeCloserRequest: false,
    localGaze: null,
    remoteGaze: null,
    isMutualEyeContact: false,
    eyeContactDuration: 0,
    attentionMetrics: {
      localAttentionScore: 0,
      remoteAttentionScore: 0,
      mutualAttentionTime: 0,
      totalCallTime: 0,
      interestLevel: 'low',
    },
  });

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  const isCleaningUpRef = useRef<boolean>(false);
  const lastHandDetection = useRef<{ isPeaceSign: boolean; handY: number; handX: number } | null>(null);
  
  // Attention tracking refs
  const callStartTime = useRef<number>(Date.now());
  const mutualEyeContactStartTime = useRef<number | null>(null);
  const totalMutualEyeContactTime = useRef<number>(0);
  const localLookingHistory = useRef<boolean[]>([]);
  const remoteLookingHistory = useRef<boolean[]>([]);
  
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

  const tongueStateRef = useRef({ isTongueOut: false, startTime: 0 });
  const lastGestureTime = useRef<number>(0); // Global cooldown for all gestures

  // Receive data from remote participant
  useDataChannel("eye-contact", (message) => {
    try {
      const remoteData = JSON.parse(
        new TextDecoder().decode(message.payload)
      );
      
      // Handle wink, tongue, gesture data, and gaze data
      if (remoteData.isWinking !== undefined || remoteData.isLooking !== undefined) {
        // Debug log remote gaze data reception
        if (remoteData.isLooking !== undefined) {
          console.log('📡 Received remote gaze data:', {
            isLooking: remoteData.isLooking,
            gazeX: remoteData.gazeX,
            gazeY: remoteData.gazeY,
            confidence: remoteData.confidence,
            timestamp: remoteData.timestamp
          });
        }
        
        setEyeContactState((prev) => ({
          ...prev,
          remoteWinking: remoteData.isWinking,
          remoteWinkEye: remoteData.winkEye,
          remoteTongueOut: remoteData.isTongueOut || false,
          remoteVTongue: remoteData.isVTongue || false,
          remotePeaceSign: remoteData.isPeaceSign || false,
          remoteThumbsUp: remoteData.isThumbsUp || false,
          remoteOKSign: remoteData.isOKSign || false,
          remoteRockOn: remoteData.isRockOn || false,
          remoteGaze: remoteData as GazeData,
        }));
        
        // Track remote attention
        if (remoteData.isLooking) {
          remoteLookingHistory.current.push(true);
        } else {
          remoteLookingHistory.current.push(false);
        }
        // Keep last 100 frames (about 3 seconds at 30fps)
        if (remoteLookingHistory.current.length > 100) {
          remoteLookingHistory.current.shift();
        }
      }
      
      // Handle come closer request
      if (remoteData.comeCloser) {
        console.log('📢 Received come closer request');
        setEyeContactState((prev) => ({
          ...prev,
          comeCloserRequest: true,
        }));
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setEyeContactState((prev) => ({
          ...prev,
            comeCloserRequest: false,
          }));
        }, 5000);
      }
    } catch (error) {
      console.error("Error parsing data:", error);
    }
  });

  // Send local wink data to remote participant
  const sendWinkData = (winkData: { 
    isWinking: boolean; 
    winkEye: 'left' | 'right' | null; 
    isTongueOut: boolean; 
    isVTongue: boolean;
    isPeaceSign: boolean;
    isThumbsUp: boolean;
    isOKSign: boolean;
    isRockOn: boolean;
    // Add attention tracking data
    isLooking: boolean;
    gazeX: number;
    gazeY: number;
    confidence: number;
    timestamp: number;
  }) => {
    if (!room?.localParticipant) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(winkData));

      room.localParticipant.publishData(data, {
        reliable: false,
        topic: "eye-contact",
      });
    } catch (error) {
      console.error("Error sending wink data:", error);
    }
  };

  // Send "come closer" request to remote participant
  const sendComeCloserRequest = () => {
    if (!room?.localParticipant) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ comeCloser: true }));

      room.localParticipant.publishData(data, {
        reliable: true,
        topic: "eye-contact",
      });
      
      console.log('📢 Sent come closer request');
    } catch (error) {
      console.error("Error sending come closer request:", error);
    }
  };

  // Initialize MediaPipe FaceMesh
  useEffect(() => {
    console.log('🔧 useLiveKitEyeContact effect running', { enabled, hasLocalVideo: !!localVideoElement });
    
    if (!enabled) {
      console.log('❌ Eye contact detection disabled');
      return;
    }

    let isInitializing = false;
    isCleaningUpRef.current = false;

    const initializeHandLandmarker = async () => {
      if (handLandmarkerRef.current) {
        return;
      }
      
      try {
        console.log('🤚 Initializing Hand Landmarker...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 2, // Allow detecting both hands
          minHandDetectionConfidence: 0.3, // Lower threshold for better detection
          minHandPresenceConfidence: 0.3,
          minTrackingConfidence: 0.3,
        });

        handLandmarkerRef.current = handLandmarker;
        console.log('✅ Hand Landmarker initialized');
      } catch (error) {
        console.error("❌ Error initializing Hand Landmarker:", error);
      }
    };
    
    const initializeFaceLandmarker = async (videoEl?: HTMLVideoElement) => {
      const targetVideo = videoEl || localVideoElement;
      
      if (!targetVideo) {
        console.log('❌ No video element available for face detection');
        return;
      }
      
      if (isInitializing || faceLandmarkerRef.current) {
        console.log('⏭️ Already initializing or initialized');
        return;
      }
      
      isInitializing = true;
      console.log('🚀 Starting MediaPipe initialization...');

      try {
        console.log('📦 Loading MediaPipe vision tasks...');
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        console.log('📥 Creating FaceLandmarker...');
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
        console.log('✅ MediaPipe FaceLandmarker initialized successfully!');
        
        // Initialize hand landmarker in parallel
        initializeHandLandmarker();
        
        startDetection(targetVideo);
      } catch (error) {
        console.error("❌ Failed to initialize face landmarker:", error);
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
    const detectVSign = (landmarks: any[]): { isPeaceSign: boolean; handY: number; handX: number } => {
      if (!landmarks || landmarks.length < 21) {
        return { isPeaceSign: false, handY: 0, handX: 0 };
      }
      
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
      
      // Palm center for position
      const palmCenter = landmarks[9];
      
      // Check if index and middle fingers are extended (tip higher than base in camera view)
      const indexExtended = indexTip.y < indexBase.y - 0.05;
      const middleExtended = middleTip.y < middleBase.y - 0.05;
      
      // Check if ring and pinky are closed (tip close to base)
      const ringClosed = Math.abs(ringTip.y - ringBase.y) < 0.08;
      const pinkyClosed = Math.abs(pinkyTip.y - pinkyBase.y) < 0.08;
      
      // Check separation between index and middle (V shape)
      const fingerSeparation = Math.abs(indexTip.x - middleTip.x);
      const hasVShape = fingerSeparation > 0.03;
      
      const isPeaceSign = indexExtended && middleExtended && ringClosed && pinkyClosed && hasVShape;
      
      return {
        isPeaceSign,
        handY: palmCenter.y,
        handX: palmCenter.x,
      };
    };
    
    // Calculate Eye Aspect Ratio (EAR) for wink detection
    const calculateEAR = (eyeLandmarks: any[]): number => {
      // Calculate vertical distances
      const vertical1 = Math.hypot(
        eyeLandmarks[1].x - eyeLandmarks[5].x,
        eyeLandmarks[1].y - eyeLandmarks[5].y
      );
      const vertical2 = Math.hypot(
        eyeLandmarks[2].x - eyeLandmarks[4].x,
        eyeLandmarks[2].y - eyeLandmarks[4].y
      );
      
      // Calculate horizontal distance
      const horizontal = Math.hypot(
        eyeLandmarks[0].x - eyeLandmarks[3].x,
        eyeLandmarks[0].y - eyeLandmarks[3].y
      );
      
      // EAR formula
      return (vertical1 + vertical2) / (2.0 * horizontal);
    };

    const calculateWink = (result: any): { isWinking: boolean; winkEye: 'left' | 'right' | null; isTongueOut: boolean; isKissing: boolean; isVTongue: boolean; leftBlink: number; rightBlink: number } => {
      if (!result || !result.faceLandmarks || result.faceLandmarks.length === 0) {
        return {
          isWinking: false,
          winkEye: null,
          isTongueOut: false,
          isKissing: false,
          isVTongue: false,
          leftBlink: 0,
          rightBlink: 0,
        };
      }

      const landmarks = result.faceLandmarks[0];

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

      // Calculate average gaze offset (normalized -1 to 1 range)
      const gazeX = (leftPupilOffset.x + rightPupilOffset.x) / 2;
      const gazeY = (leftPupilOffset.y + rightPupilOffset.y) / 2;

      // Calculate distance from center (magnitude of gaze vector)
      const gazeDistance = Math.sqrt(gazeX * gazeX + gazeY * gazeY);

      // When looking at camera, pupils should be centered (low offset)
      const gazeCenterConfidence = Math.max(0, 1 - gazeDistance / 0.2);

      // Check head orientation
      const eyeLineAngle = Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
      );
      const headTiltConfidence = Math.max(0, 1 - Math.abs(eyeLineAngle) * 5);

      // Check eye openness and wink detection with temporal validation
      let eyeOpennessConfidence = 0.85;
      let leftEyeBlink = 0;
      let rightEyeBlink = 0;
      let isWinking = false;
      let winkEye: 'left' | 'right' | null = null;
      let isTongueOut = false;
      let isKissing = false;
      let usingEARFallback = false;
      
      // METHOD 1: Try blendshapes first (preferred)
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const blendshapes = result.faceBlendshapes[0];
        leftEyeBlink =
          blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkLeft")
            ?.score || 0;
        rightEyeBlink =
          blendshapes.categories?.find(
            (c: any) => c.categoryName === "eyeBlinkRight"
          )?.score || 0;

        // Wink detection with harder threshold
        const WINK_THRESHOLD = 0.35; // Reduced from 0.45 to make it easier
        
        const now = Date.now();
        
        // Always log current values to help debug
        if (leftEyeBlink > 0.1 || rightEyeBlink > 0.1) {
          console.log('👁️ Eye values - Left:', leftEyeBlink.toFixed(2), 'Right:', rightEyeBlink.toFixed(2));
        }
        
        // Check for left wink: left > 0.3 AND right < 0.3
        if (leftEyeBlink > WINK_THRESHOLD && rightEyeBlink < WINK_THRESHOLD) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'left') {
            // New wink started
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'left',
              startTime: now,
              lastSentWink: winkStateRef.current.lastSentWink,
            };
            console.log('😉 LEFT WINK started! Left:', leftEyeBlink.toFixed(2), 'Right:', rightEyeBlink.toFixed(2));
          }
        } 
        // Check for right wink: right > 0.3 AND left < 0.3
        else if (rightEyeBlink > WINK_THRESHOLD && leftEyeBlink < WINK_THRESHOLD) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'right') {
            // New wink started
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'right',
              startTime: now,
              lastSentWink: winkStateRef.current.lastSentWink,
            };
            console.log('😉 RIGHT WINK started! Left:', leftEyeBlink.toFixed(2), 'Right:', rightEyeBlink.toFixed(2));
          }
        } 
        // Eyes are open - check if wink just ended
        else if (winkStateRef.current.isWinking) {
          const winkDuration = now - winkStateRef.current.startTime;
          const timeSinceLastSent = now - winkStateRef.current.lastSentWink;
          
          // Valid wink: 150ms-800ms duration, and haven't sent one in last 800ms
          // PLUS global 10-second cooldown for all gestures
          const timeSinceLastGesture = now - lastGestureTime.current;
          if (winkDuration >= 150 && winkDuration <= 800 && timeSinceLastSent > 800 && timeSinceLastGesture > 10000) {
            isWinking = true;
            winkEye = winkStateRef.current.winkEye;
            winkStateRef.current.lastSentWink = now;
            lastGestureTime.current = now; // Update global cooldown
            console.log('😉✅ CONFIRMED WINK!', winkEye, 'eye - Duration:', winkDuration + 'ms');
          } else if (timeSinceLastGesture <= 10000) {
            console.log('😉⏳ Wink blocked by global 10s cooldown');
          }
          
          // Reset wink state
          winkStateRef.current = {
            isWinking: false,
            winkEye: null,
            startTime: 0,
            lastSentWink: winkStateRef.current.lastSentWink,
          };
        }
        
        // TONGUE OUT DETECTION - SHOW ALL SCORES
        const tongueOutScore = blendshapes.categories?.find((c: any) => c.categoryName === "tongueOut")?.score || 0;
        
        // Debug logging - ALWAYS show tongue score (every frame)
        console.log('👅 Tongue score:', tongueOutScore.toFixed(3), '(threshold: 0.35)');
        
        // Harder threshold - must really stick tongue out
        // Add global 10-second cooldown for tongue detection
        const timeSinceLastGesture = now - lastGestureTime.current;
        if (tongueOutScore > 0.35 && timeSinceLastGesture > 10000) {
          isTongueOut = true;
          lastGestureTime.current = now; // Update global cooldown
          console.log('👅✅ TONGUE OUT TRIGGERED! Score:', tongueOutScore.toFixed(2));
        } else if (tongueOutScore > 0.35 && timeSinceLastGesture <= 10000) {
          console.log('👅⏳ Tongue blocked by global 10s cooldown');
        }
        
        // KISS DETECTION REMOVED - was causing overload
        
        eyeOpennessConfidence = 1 - (leftEyeBlink + rightEyeBlink) / 2;
      } else {
        // METHOD 2: FALLBACK - Use Eye Aspect Ratio (EAR) with landmarks only
        console.log('⚠️ Blendshapes not available! Using EAR fallback method...');
        usingEARFallback = true;
        
        // Extract eye landmarks
        // Left eye: 33, 160, 158, 133, 153, 144
        const leftEye = [
          landmarks[33],  landmarks[160], landmarks[158],
          landmarks[133], landmarks[153], landmarks[144],
        ];
        // Right eye: 362, 385, 387, 263, 373, 380
        const rightEye = [
          landmarks[362], landmarks[385], landmarks[387],
          landmarks[263], landmarks[373], landmarks[380],
        ];

        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        
        // Convert EAR to blink-like values (inverted: low EAR = closed)
        // Normal open eye: EAR ~0.25-0.35
        // Closed eye: EAR ~0.10-0.15
        leftEyeBlink = Math.max(0, Math.min(1, (0.35 - leftEAR) / 0.25));
        rightEyeBlink = Math.max(0, Math.min(1, (0.35 - rightEAR) / 0.25));
        
        const now = Date.now();
        const WINK_THRESHOLD = 0.3;
        
        // Log EAR values for debugging
        if (leftEyeBlink > 0.1 || rightEyeBlink > 0.1) {
          console.log('👁️ [EAR] Eye values - Left:', leftEyeBlink.toFixed(2), 'Right:', rightEyeBlink.toFixed(2));
        }
        
        // Simple wink detection: left > 0.3 AND right < 0.3
        if (leftEyeBlink > WINK_THRESHOLD && rightEyeBlink < WINK_THRESHOLD) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'left') {
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'left',
              startTime: now,
              lastSentWink: winkStateRef.current.lastSentWink,
            };
            console.log('😉 [EAR] LEFT WINK started! LeftEAR:', leftEAR.toFixed(3), 'RightEAR:', rightEAR.toFixed(3));
          }
        } else if (rightEyeBlink > WINK_THRESHOLD && leftEyeBlink < WINK_THRESHOLD) {
          
          if (!winkStateRef.current.isWinking || winkStateRef.current.winkEye !== 'right') {
            winkStateRef.current = {
              isWinking: true,
              winkEye: 'right',
              startTime: now,
              lastSentWink: winkStateRef.current.lastSentWink,
            };
            console.log('😉 [EAR] RIGHT WINK started! LeftEAR:', leftEAR.toFixed(3), 'RightEAR:', rightEAR.toFixed(3));
          }
        } else if (winkStateRef.current.isWinking) {
          const winkDuration = now - winkStateRef.current.startTime;
          const timeSinceLastSent = now - winkStateRef.current.lastSentWink;
          
          if (winkDuration >= 150 && winkDuration <= 800 && timeSinceLastSent > 800) {
            isWinking = true;
            winkEye = winkStateRef.current.winkEye;
            winkStateRef.current.lastSentWink = now;
            console.log('😉✅ [EAR] CONFIRMED WINK!', winkEye, 'eye - Duration:', winkDuration + 'ms');
          }
          
          winkStateRef.current = {
            isWinking: false,
            winkEye: null,
            startTime: 0,
            lastSentWink: winkStateRef.current.lastSentWink,
          };
        }
        
        eyeOpennessConfidence = 1 - (leftEyeBlink + rightEyeBlink) / 2;
      }

      // Combined confidence
      const confidence =
        gazeCenterConfidence * 0.6 +
        eyeOpennessConfidence * 0.25 +
        headTiltConfidence * 0.15;

      const isLooking = confidence > 0.6;

      return {
        gazeX: Math.max(-1, Math.min(1, gazeX * 5)), // Scale to -1 to 1 range
        gazeY: Math.max(-1, Math.min(1, gazeY * 5)),
        isLooking,
        confidence,
        timestamp: Date.now(),
        isWinking,
        winkEye,
        isTongueOut,
        isKissing,
        isVTongue: false, // Will be combined with hand detection separately
        // Add raw blink values for debugging
        leftBlink: leftEyeBlink,
        rightBlink: rightEyeBlink,
      } as any;
    };

    const detect = (videoEl?: HTMLVideoElement) => {
      // Stop detection if cleaning up
      if (isCleaningUpRef.current) {
        return;
      }

      // Get the target video (passed in or from element ref or from DOM)
      let targetVideo = videoEl || localVideoElement;
      
      // AGGRESSIVE FALLBACK: If still no video, try DOM
      if (!targetVideo) {
        const videos = document.querySelectorAll('video');
        if (videos.length > 0) {
          targetVideo = videos[0] as HTMLVideoElement;
        }
      }
      
      if (!faceLandmarkerRef.current) {
        // Only log occasionally to avoid spam
        if (Math.random() < 0.01) {
          console.log('⚠️ Face landmarker not initialized');
        }
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
        }
        return;
      }
      
      if (!targetVideo) {
        if (Math.random() < 0.01) {
          console.log('⚠️ No video element available');
        }
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
        }
        return;
      }
      
      if (targetVideo.readyState < 2) {
        if (Math.random() < 0.01) {
          console.log('⚠️ Video not ready, readyState:', targetVideo.readyState);
        }
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
        }
        return;
      }

      const now = performance.now();

      // Throttle to ~10 FPS
      if (now - lastDetectionTime.current < 100) {
        if (!isCleaningUpRef.current) {
          animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
        }
        return;
      }

      lastDetectionTime.current = now;

      try {
        // Additional safety checks
        if (!targetVideo.videoWidth || !targetVideo.videoHeight) {
          if (Math.random() < 0.01) {
            console.log('⚠️ Video has no dimensions yet:', targetVideo.videoWidth, 'x', targetVideo.videoHeight);
          }
          if (!isCleaningUpRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
          }
          return;
        }

        // Check if landmarker is still valid (not closed)
        if (!faceLandmarkerRef.current) {
          return;
        }

        const result = faceLandmarkerRef.current.detectForVideo(
          targetVideo,
          now
        );
        
        if (!result) {
          if (Math.random() < 0.01) {
            console.log('⚠️ No result from face detection');
          }
          if (!isCleaningUpRef.current) {
            animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
          }
          return;
        }
        
        const faceData = calculateWink(result);
        let { isWinking, winkEye, isTongueOut, isKissing, isVTongue, leftBlink, rightBlink } = faceData;

        // HAND DETECTION - Run in parallel
        let isPeaceSign = false;
        let isThumbsUp = false;
        let isOKSign = false;
        let isRockOn = false;
        
        if (handLandmarkerRef.current && targetVideo) {
          try {
            const handResult = handLandmarkerRef.current.detectForVideo(
              targetVideo,
              performance.now()
            );
            
            // Debug: Log hand detection attempts
            if (Math.random() < 0.01) { // Log occasionally to avoid spam
              console.log('🤚 Hand detection attempt:', {
                hasHandLandmarker: !!handLandmarkerRef.current,
                hasResult: !!handResult,
                hasLandmarks: !!(handResult?.landmarks),
                landmarkCount: handResult?.landmarks?.length || 0
              });
            }
            
            if (handResult && handResult.landmarks && handResult.landmarks.length > 0) {
              const handLandmarks = handResult.landmarks[0];
              
              // Detect all hand gestures
              const vSignData = detectVSign(handLandmarks);
              isPeaceSign = vSignData.isPeaceSign;
              isThumbsUp = detectThumbsUp(handLandmarks);
              isOKSign = detectOKSign(handLandmarks);
              isRockOn = detectRockOn(handLandmarks);
              
              // Store hand detection for combination with face data
              lastHandDetection.current = vSignData;
              
              // COMBO GESTURE: V-sign near mouth + tongue out
              if (vSignData.isPeaceSign && isTongueOut) {
                // Check if hand is near mouth region (upper half of face, center)
                const nearMouth = 
                  vSignData.handY > 0.3 && vSignData.handY < 0.7 && // Vertical: mouth region
                  vSignData.handX > 0.3 && vSignData.handX < 0.7;    // Horizontal: center
                
                // Add global 10-second cooldown for V-Tongue combo
                const vTongueTimeSinceLastGesture = Date.now() - lastGestureTime.current;
                if (nearMouth && vTongueTimeSinceLastGesture > 10000) {
                  isVTongue = true;
                  lastGestureTime.current = Date.now(); // Update global cooldown
                  console.log('✌️👅 V-TONGUE COMBO DETECTED! Hand:', vSignData.handY.toFixed(2), 'Tongue: yes');
                } else if (nearMouth && vTongueTimeSinceLastGesture <= 10000) {
                  console.log('✌️👅⏳ V-Tongue blocked by global 10s cooldown');
                }
              }
              
              // Debug hand gesture detection
              if (isPeaceSign) {
                console.log('✌️ Peace sign detected at Y:', vSignData.handY.toFixed(2), 'X:', vSignData.handX.toFixed(2));
              }
              if (isThumbsUp) {
                console.log('👍 Thumbs up detected!');
              }
              if (isOKSign) {
                console.log('👌 OK sign detected!');
              }
              if (isRockOn) {
                console.log('🤟 Rock on detected!');
              }
            } else {
              lastHandDetection.current = null;
              // Debug: Log when no hands detected
              if (Math.random() < 0.005) { // Very occasional logging
                console.log('🤚 No hands detected in frame');
              }
            }
          } catch (handError) {
            console.error('🤚❌ Hand detection error:', handError);
          }
        } else {
          // Debug: Log when hand landmarker not available
          if (Math.random() < 0.005) { // Very occasional logging
            console.log('🤚❌ Hand landmarker not available:', {
              hasHandLandmarker: !!handLandmarkerRef.current,
              hasVideo: !!targetVideo
            });
          }
        }

        // Debug: Log gesture states
        if (isTongueOut || isKissing || isVTongue) {
          console.log('🎯 Gestures detected:', { 
            wink: isWinking, 
            tongue: isTongueOut, 
            kiss: isKissing,
            vTongue: isVTongue
          });
        }

        // Device-specific eye contact detection for better accuracy
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // Calculate more accurate gaze data using device-specific thresholds
        let gazeConfidence = 0.0;
        let isLookingAtCamera = false;
        
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          // Use simplified but consistent detection logic
          const landmarks = result.faceLandmarks[0];
          
          // Estimate gaze confidence based on face detection quality
          const faceDetectionConfidence = Math.min(1.0, landmarks.length / 468); // MediaPipe has 468 landmarks
          
          // Device-specific base confidence adjustment
          const deviceMultiplier = isMobile ? 0.85 : 1.0; // Slightly lower base for mobile
          gazeConfidence = faceDetectionConfidence * deviceMultiplier;
          
          // Device-specific confidence threshold
          const confidenceThreshold = isMobile ? 0.55 : 0.60;
          isLookingAtCamera = gazeConfidence > confidenceThreshold;
          
          console.log(`📱 LiveKit - Device: ${isMobile ? 'Mobile' : 'Desktop'}, Gaze Confidence: ${gazeConfidence.toFixed(3)}, Looking: ${isLookingAtCamera}`);
        }
        
        // Create local gaze data with device-calibrated detection
        const localGazeData: GazeData = {
          gazeX: 0,
          gazeY: 0,
          isLooking: isLookingAtCamera,
          confidence: gazeConfidence,
          timestamp: Date.now(),
          isWinking,
          winkEye,
          isTongueOut,
          isVTongue,
          isPeaceSign,
          isThumbsUp,
          isOKSign,
          isRockOn,
          leftBlink: leftBlink,
          rightBlink: rightBlink,
        };
        
        // Track local attention
        localLookingHistory.current.push(localGazeData.isLooking);
        if (localLookingHistory.current.length > 100) {
          localLookingHistory.current.shift();
        }
        
        // Calculate attention metrics
        const calculateAttentionMetrics = (): AttentionMetrics => {
          const totalCallTime = (Date.now() - callStartTime.current) / 1000; // seconds
          
          // Calculate attention scores (percentage of time looking)
          const localLooks = localLookingHistory.current.filter(Boolean).length;
          const localAttentionScore = localLookingHistory.current.length > 0
            ? Math.round((localLooks / localLookingHistory.current.length) * 100)
            : 0;
            
          const remoteLooks = remoteLookingHistory.current.filter(Boolean).length;
          const remoteAttentionScore = remoteLookingHistory.current.length > 0
            ? Math.round((remoteLooks / remoteLookingHistory.current.length) * 100)
            : 0;
          
          // Calculate mutual attention time - now based on both having 100% attention
          const isBothLooking = localAttentionScore === 100 && remoteAttentionScore === 100;
          
          // Debug logging for mutual gaze
          if (localAttentionScore > 80 || remoteAttentionScore > 80) {
            console.log('👁️ Mutual Gaze Debug (100% Attention Mode):', {
              localAttentionScore,
              remoteAttentionScore,
              isBothLooking,
              totalMutualTime: totalMutualEyeContactTime.current,
              currentMutualTime: mutualEyeContactStartTime.current !== null ? (Date.now() - mutualEyeContactStartTime.current) / 1000 : 0
            });
          }
          
          if (isBothLooking && mutualEyeContactStartTime.current === null) {
            mutualEyeContactStartTime.current = Date.now();
            console.log('🎯 Mutual gaze started! (Both at 100% attention)');
          } else if (!isBothLooking && mutualEyeContactStartTime.current !== null) {
            const sessionTime = (Date.now() - mutualEyeContactStartTime.current) / 1000;
            totalMutualEyeContactTime.current += sessionTime;
            mutualEyeContactStartTime.current = null;
            console.log(`⏹️ Mutual gaze ended. Session: ${sessionTime.toFixed(2)}s, Total: ${totalMutualEyeContactTime.current.toFixed(2)}s (100% attention mode)`);
          }
          
          const currentMutualTime = mutualEyeContactStartTime.current !== null
            ? (Date.now() - mutualEyeContactStartTime.current) / 1000
            : 0;
          const mutualAttentionTime = totalMutualEyeContactTime.current + currentMutualTime;
          
          // Determine interest level based on mutual attention percentage
          const mutualAttentionPercentage = totalCallTime > 0 
            ? (mutualAttentionTime / totalCallTime) * 100
            : 0;
          
          let interestLevel: 'low' | 'medium' | 'high' = 'low';
          if (mutualAttentionPercentage > 50) {
            interestLevel = 'high';
          } else if (mutualAttentionPercentage > 25) {
            interestLevel = 'medium';
          }
          
          return {
            localAttentionScore,
            remoteAttentionScore,
            mutualAttentionTime,
            totalCallTime,
            interestLevel,
          };
        };
        
        const attentionMetrics = calculateAttentionMetrics();
        const isMutualEyeContact = attentionMetrics.localAttentionScore === 100 && attentionMetrics.remoteAttentionScore === 100;
        const eyeContactDuration = mutualEyeContactStartTime.current !== null
          ? (Date.now() - mutualEyeContactStartTime.current) / 1000
          : 0;

        // Update local state
        setEyeContactState((prev) => ({
            ...prev,
          localWinking: isWinking,
          localWinkEye: winkEye,
        localTongueOut: isTongueOut,
        localVTongue: isVTongue,
          localPeaceSign: isPeaceSign,
          localThumbsUp: isThumbsUp,
          localOKSign: isOKSign,
          localRockOn: isRockOn,
          localGaze: localGazeData,
          isMutualEyeContact,
          eyeContactDuration,
          attentionMetrics,
        }));

        // Send to remote participant (include attention data)
        sendWinkData({ 
          isWinking, 
          winkEye,
          isTongueOut,
          isVTongue,
          isPeaceSign,
          isThumbsUp,
          isOKSign,
          isRockOn,
          // Add attention tracking data
          isLooking: localGazeData.isLooking,
          gazeX: localGazeData.gazeX,
          gazeY: localGazeData.gazeY,
          confidence: localGazeData.confidence,
          timestamp: localGazeData.timestamp,
        });
        
        // Confirm data sent
        if (isTongueOut || isKissing || isVTongue) {
          console.log('📤 Sent gesture data:', { isTongueOut, isKissing, isVTongue });
        }
      } catch (error) {
        // Only log errors if we're not cleaning up
        if (!isCleaningUpRef.current) {
          console.error("❌ Detection error:", error);
          console.error("Error details:", {
            hasLandmarker: !!faceLandmarkerRef.current,
            hasVideo: !!targetVideo,
            videoReady: targetVideo?.readyState,
            videoDimensions: `${targetVideo?.videoWidth}x${targetVideo?.videoHeight}`
          });
        }
      }

      if (!isCleaningUpRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => detect(videoEl));
      }
    };

    const startDetection = (videoEl?: HTMLVideoElement) => {
      console.log('▶️ Starting detection loop...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      detect(videoEl);
    };

    // Try immediate initialization if video is available
    if (localVideoElement) {
      console.log('✅ Local video element available, initializing immediately');
    initializeFaceLandmarker();
    }

    return () => {
      // Set cleanup flag first to stop detection loop
      isCleaningUpRef.current = true;
      
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Small delay to ensure any in-flight detectForVideo calls complete
      setTimeout(() => {
      if (faceLandmarkerRef.current) {
          try {
        faceLandmarkerRef.current.close();
          } catch (error) {
            // Silently handle close errors
          }
        faceLandmarkerRef.current = null;
      }
        
        if (handLandmarkerRef.current) {
          try {
            handLandmarkerRef.current.close();
          } catch (error) {
            // Silently handle close errors
          }
          handLandmarkerRef.current = null;
        }
      }, 50);
    };
  }, [localVideoElement, enabled]);

  return {
    ...eyeContactState,
    sendComeCloserRequest,
  };
}

