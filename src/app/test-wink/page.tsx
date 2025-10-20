"use client";

import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function TestWinkPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Click Start to begin...");
  const [blinkValues, setBlinkValues] = useState({ left: 0, right: 0 });
  const [earValues, setEARValues] = useState({ left: 0, right: 0 });
  const [winkDetected, setWinkDetected] = useState<string | null>(null);
  const [hasBlendshapes, setHasBlendshapes] = useState<boolean | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  const startCamera = async () => {
    try {
      setStatus("Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("Camera started! Initializing MediaPipe...");
        initMediaPipe();
      }
    } catch (error) {
      setStatus(`Camera error: ${error}`);
    }
  };

  const initMediaPipe = async () => {
    try {
      setStatus("Loading MediaPipe...");
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
        outputFaceBlendshapes: true,
      });

      faceLandmarkerRef.current = faceLandmarker;
      setStatus("MediaPipe ready! Detecting...");
      detect();
    } catch (error) {
      setStatus(`MediaPipe error: ${error}`);
    }
  };

  // Calculate Eye Aspect Ratio
  const calculateEAR = (eyeLandmarks: any[]) => {
    // Vertical distances
    const v1 = Math.sqrt(
      Math.pow(eyeLandmarks[1].x - eyeLandmarks[5].x, 2) +
      Math.pow(eyeLandmarks[1].y - eyeLandmarks[5].y, 2)
    );
    const v2 = Math.sqrt(
      Math.pow(eyeLandmarks[2].x - eyeLandmarks[4].x, 2) +
      Math.pow(eyeLandmarks[2].y - eyeLandmarks[4].y, 2)
    );
    
    // Horizontal distance
    const h = Math.sqrt(
      Math.pow(eyeLandmarks[0].x - eyeLandmarks[3].x, 2) +
      Math.pow(eyeLandmarks[0].y - eyeLandmarks[3].y, 2)
    );
    
    return (v1 + v2) / (2.0 * h);
  };

  const detect = () => {
    if (!faceLandmarkerRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      requestAnimationFrame(detect);
      return;
    }

    try {
      const result = faceLandmarkerRef.current.detectForVideo(
        videoRef.current,
        performance.now()
      );

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        // Extract eye landmarks
        // Left eye: 33, 160, 158, 133, 153, 144
        const leftEye = [
          landmarks[33],  // outer
          landmarks[160], // top
          landmarks[158], // top
          landmarks[133], // inner
          landmarks[153], // bottom
          landmarks[144], // bottom
        ];
        
        // Right eye: 362, 385, 387, 263, 373, 380
        const rightEye = [
          landmarks[362], // outer
          landmarks[385], // top
          landmarks[387], // top
          landmarks[263], // inner
          landmarks[373], // bottom
          landmarks[380], // bottom
        ];

        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        
        setEARValues({ left: leftEAR, right: rightEAR });

        // EAR-based wink detection
        const earDiff = Math.abs(leftEAR - rightEAR);
        const avgEAR = (leftEAR + rightEAR) / 2;
        
        if (earDiff > 0.08 && avgEAR > 0.12) {
          if (leftEAR < 0.18 && rightEAR > 0.22) {
            setWinkDetected("LEFT 😉");
          } else if (rightEAR < 0.18 && leftEAR > 0.22) {
            setWinkDetected("RIGHT 😉");
          } else {
            setWinkDetected(null);
          }
        } else {
          setWinkDetected(null);
        }

        // Check blendshapes
        if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
          setHasBlendshapes(true);
          const blendshapes = result.faceBlendshapes[0];
          const leftBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkLeft")?.score || 0;
          const rightBlink = blendshapes.categories?.find((c: any) => c.categoryName === "eyeBlinkRight")?.score || 0;
          setBlinkValues({ left: leftBlink, right: rightBlink });
        } else {
          setHasBlendshapes(false);
        }

        // Draw on canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (ctx && videoRef.current) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw eye landmarks
            ctx.fillStyle = "lime";
            leftEye.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            });
            
            ctx.fillStyle = "cyan";
            rightEye.forEach(point => {
              ctx.beginPath();
              ctx.arc(point.x * canvas.width, point.y * canvas.height, 3, 0, 2 * Math.PI);
              ctx.fill();
            });
          }
        }
      }
    } catch (error) {
      console.error("Detection error:", error);
    }

    requestAnimationFrame(detect);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">🧪 Wink Detection Test</h1>
        <p className="text-gray-400 mb-6">{status}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Video */}
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg border-2 border-pink-500"
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>

          {/* Stats */}
          <div className="space-y-4">
            <button
              onClick={startCamera}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg"
            >
              Start Camera & Detection
            </button>

            {/* Blendshapes Status */}
            <div className={`p-4 rounded-lg ${hasBlendshapes === true ? 'bg-green-900/30 border border-green-500' : hasBlendshapes === false ? 'bg-red-900/30 border border-red-500' : 'bg-gray-900/30 border border-gray-500'}`}>
              <h3 className="font-bold mb-2">Blendshapes Available:</h3>
              <p className="text-2xl">
                {hasBlendshapes === true ? '✅ YES' : hasBlendshapes === false ? '❌ NO' : '⏳ Waiting...'}
              </p>
              {hasBlendshapes === false && (
                <p className="text-sm text-red-400 mt-2">
                  Blendshapes not available! Using EAR method instead.
                </p>
              )}
            </div>

            {/* Blendshape Values */}
            {hasBlendshapes && (
              <div className="p-4 rounded-lg bg-blue-900/30 border border-blue-500">
                <h3 className="font-bold mb-2">Blendshape Blink Values:</h3>
                <div className="space-y-2 font-mono">
                  <div>Left: {blinkValues.left.toFixed(3)}</div>
                  <div>Right: {blinkValues.right.toFixed(3)}</div>
                  <div className="text-sm text-gray-400">
                    (Closed &gt; 0.60, Open &lt; 0.45)
                  </div>
                </div>
              </div>
            )}

            {/* EAR Values */}
            <div className="p-4 rounded-lg bg-purple-900/30 border border-purple-500">
              <h3 className="font-bold mb-2">Eye Aspect Ratio (EAR):</h3>
              <div className="space-y-2 font-mono">
                <div>Left: {earValues.left.toFixed(3)}</div>
                <div>Right: {earValues.right.toFixed(3)}</div>
                <div>Diff: {Math.abs(earValues.left - earValues.right).toFixed(3)}</div>
                <div className="text-sm text-gray-400">
                  (Closed &lt; 0.18, Open &gt; 0.22, Diff &gt; 0.08)
                </div>
              </div>
            </div>

            {/* Wink Status */}
            <div className={`p-6 rounded-lg text-center text-3xl font-bold ${winkDetected ? 'bg-yellow-900/50 border-2 border-yellow-500 animate-pulse' : 'bg-gray-900/30 border border-gray-500'}`}>
              {winkDetected || '👀 No Wink'}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-xl font-bold mb-3">📋 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Click "Start Camera & Detection"</li>
            <li>Allow camera access</li>
            <li>Wait for "MediaPipe ready!"</li>
            <li>Check if blendshapes are available</li>
            <li>Try winking - close ONE eye fully</li>
            <li>Watch the values change in real-time</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
            <p className="text-yellow-200 text-sm">
              <strong>Note:</strong> This test uses BOTH blendshapes and EAR. 
              If blendshapes don't work, EAR will be used as fallback.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


