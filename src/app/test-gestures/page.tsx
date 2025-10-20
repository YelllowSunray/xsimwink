"use client";

import { useState, useRef, useEffect } from "react";
import { useEyeContactDetection } from "@/hooks/useEyeContactDetection";

export default function TestGesturesPage() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [faceDetectionEnabled, setFaceDetectionEnabled] = useState(true);
  const [handDetectionEnabled, setHandDetectionEnabled] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Face gestures
  const { 
    isLookingAtCamera, 
    confidence, 
    isWinking, 
    winkEye
  } = useEyeContactDetection(videoRef.current, faceDetectionEnabled);
  
  // Tongue detection not yet implemented
  const isTongueOut = false;
  
  // Hand gestures - TODO: Not implemented yet
  const isPeaceSign = false;
  const isThumbsUp = false;
  const isRockOn = false;
  const isOkSign = false;
  const handedness = null;
  
  // Gesture history
  const [gestureHistory, setGestureHistory] = useState<Array<{
    id: number;
    emoji: string;
    name: string;
    timestamp: Date;
  }>>([]);
  
  const [gestureCount, setGestureCount] = useState({
    wink: 0,
    tongue: 0,
    peace: 0,
    thumbsUp: 0,
    rock: 0,
    ok: 0,
  });

  // Track gestures
  useEffect(() => {
    if (isWinking && winkEye) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '😉',
        name: `Wink (${winkEye})`,
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, wink: prev.wink + 1 }));
    }
  }, [isWinking, winkEye]);

  useEffect(() => {
    if (isTongueOut) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '👅',
        name: 'Tongue Out',
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, tongue: prev.tongue + 1 }));
    }
  }, [isTongueOut]);


  useEffect(() => {
    if (isPeaceSign) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '✌️',
        name: 'Peace Sign',
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, peace: prev.peace + 1 }));
    }
  }, [isPeaceSign]);

  useEffect(() => {
    if (isThumbsUp) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '👍',
        name: 'Thumbs Up',
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, thumbsUp: prev.thumbsUp + 1 }));
    }
  }, [isThumbsUp]);

  useEffect(() => {
    if (isRockOn) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '🤘',
        name: 'Rock On',
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, rock: prev.rock + 1 }));
    }
  }, [isRockOn]);

  useEffect(() => {
    if (isOkSign) {
      setGestureHistory(prev => [...prev, {
        id: Date.now(),
        emoji: '👌',
        name: 'OK Sign',
        timestamp: new Date(),
      }].slice(-10));
      setGestureCount(prev => ({ ...prev, ok: prev.ok + 1 }));
    }
  }, [isOkSign]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraEnabled(true);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraEnabled(false);
    }
  };

  const resetStats = () => {
    setGestureCount({
      wink: 0,
      tongue: 0,
      peace: 0,
      thumbsUp: 0,
      rock: 0,
      ok: 0,
    });
    setGestureHistory([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">🎭 Gesture Detection Test Lab</h1>
        <p className="text-pink-200 mb-8">Test facial gestures in real-time! (Winks 😉 and Tongue 👅)</p>
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm">
            ⚠️ <strong>Note:</strong> Hand gesture detection is not yet implemented. Only face gestures (winks and tongue out) work currently.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-6">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                
                {!cameraEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <p className="text-white text-xl mb-4">📹 Camera Off</p>
                      <button
                        onClick={startCamera}
                        className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-lg font-semibold"
                      >
                        Start Camera
                      </button>
                    </div>
                  </div>
                )}

                {/* Live Detection Overlay */}
                {cameraEnabled && (
                  <div className="absolute top-4 left-4 right-4 space-y-2">
                    {/* Face Gestures */}
                    {faceDetectionEnabled && (
                      <div className="bg-purple-900/80 backdrop-blur-sm rounded-lg p-3 border border-purple-500/50">
                        <div className="text-white text-sm font-semibold mb-2">👤 Face Gestures</div>
                        <div className="flex gap-4">
                          <div className={`flex items-center gap-2 ${isWinking ? 'text-yellow-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">😉</span>
                            <span className="text-xs">{isWinking ? winkEye : 'No'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isTongueOut ? 'text-pink-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">👅</span>
                            <span className="text-xs">{isTongueOut ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-300">
                          Eye Contact: {isLookingAtCamera ? '✅' : '❌'} ({(confidence * 100).toFixed(0)}%)
                        </div>
                      </div>
                    )}

                    {/* Hand Gestures */}
                    {handDetectionEnabled && (
                      <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/50">
                        <div className="text-white text-sm font-semibold mb-2">🤚 Hand Gestures{handedness && ` (${handedness})`}</div>
                        <div className="flex gap-4">
                          <div className={`flex items-center gap-2 ${isPeaceSign ? 'text-yellow-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">✌️</span>
                            <span className="text-xs">{isPeaceSign ? 'Yes' : 'No'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isThumbsUp ? 'text-green-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">👍</span>
                            <span className="text-xs">{isThumbsUp ? 'Yes' : 'No'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isRockOn ? 'text-purple-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">🤘</span>
                            <span className="text-xs">{isRockOn ? 'Yes' : 'No'}</span>
                          </div>
                          <div className={`flex items-center gap-2 ${isOkSign ? 'text-blue-300 animate-pulse' : 'text-gray-400'}`}>
                            <span className="text-2xl">👌</span>
                            <span className="text-xs">{isOkSign ? 'Yes' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex gap-4">
                {cameraEnabled ? (
                  <button
                    onClick={stopCamera}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Stop Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
                  >
                    Start Camera
                  </button>
                )}
                <button
                  onClick={() => setFaceDetectionEnabled(!faceDetectionEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    faceDetectionEnabled 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  Face: {faceDetectionEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setHandDetectionEnabled(!handDetectionEnabled)}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    handDetectionEnabled 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  Hands: {handDetectionEnabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={resetStats}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Reset Stats
                </button>
              </div>
            </div>
          </div>

          {/* Stats and History */}
          <div className="space-y-6">
            {/* Gesture Counter */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">📊 Gesture Counter</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-white">
                  <span>😉 Winks:</span>
                  <span className="font-bold">{gestureCount.wink}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>👅 Tongue Out:</span>
                  <span className="font-bold">{gestureCount.tongue}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>✌️ Peace Signs:</span>
                  <span className="font-bold">{gestureCount.peace}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>👍 Thumbs Up:</span>
                  <span className="font-bold">{gestureCount.thumbsUp}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>🤘 Rock On:</span>
                  <span className="font-bold">{gestureCount.rock}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span>👌 OK Signs:</span>
                  <span className="font-bold">{gestureCount.ok}</span>
                </div>
              </div>
            </div>

            {/* Gesture History */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">📜 Recent Gestures</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {gestureHistory.length === 0 ? (
                  <p className="text-gray-400 text-sm">No gestures detected yet. Try making some!</p>
                ) : (
                  gestureHistory.slice().reverse().map((gesture) => (
                    <div key={gesture.id} className="bg-white/5 rounded p-2 flex items-center gap-2">
                      <span className="text-2xl">{gesture.emoji}</span>
                      <div className="flex-1">
                        <div className="text-white text-sm font-semibold">{gesture.name}</div>
                        <div className="text-gray-400 text-xs">
                          {gesture.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 backdrop-blur-sm rounded-lg p-6 border border-yellow-500/30">
              <h2 className="text-xl font-bold text-yellow-300 mb-3">💡 Try These Gestures</h2>
              <div className="space-y-2 text-sm text-yellow-100">
                <p>👁️ <strong>Eye Contact:</strong> Look directly at camera</p>
                <p>😉 <strong>Wink:</strong> Close one eye briefly</p>
                <p>👅 <strong>Tongue Out:</strong> Stick your tongue out</p>
                <p>✌️ <strong>Peace:</strong> Two fingers up</p>
                <p>👍 <strong>Thumbs Up:</strong> Thumb pointing up</p>
                <p>🤘 <strong>Rock On:</strong> Index + pinky up</p>
                <p>👌 <strong>OK Sign:</strong> Thumb touching index</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

