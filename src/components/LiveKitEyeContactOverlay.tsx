"use client";

import React, { useRef, useEffect, useState } from "react";
import { useLiveKitEyeContact } from "@/hooks/useLiveKitEyeContact";

interface LiveKitEyeContactOverlayProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  enabled?: boolean;
  showDebugInfo?: boolean;
  manualLocalWink?: boolean;
  manualRemoteWink?: boolean;
}

interface GestureAnimation {
  id: string;
  type: 'wink' | 'tongue';
  side?: 'left' | 'right';
  timestamp: number;
  emoji: string;
}

export default function LiveKitEyeContactOverlay({
  localVideoRef,
  remoteVideoRef,
  enabled = true,
  showDebugInfo = false,
  manualLocalWink = false,
  manualRemoteWink = false,
}: LiveKitEyeContactOverlayProps) {
  const eyeContactState = useLiveKitEyeContact(
    localVideoRef.current,
    remoteVideoRef.current,
    enabled
  );

  const { 
    localGaze, 
    remoteGaze, 
    isMutualEyeContact, 
    eyeContactDuration,
    localWinking,
    remoteWinking,
    localWinkEye,
    remoteWinkEye,
    localTongueOut,
    remoteTongueOut,
  } = eyeContactState;

  const [localGestureAnimations, setLocalGestureAnimations] = useState<GestureAnimation[]>([]);
  const [remoteGestureAnimations, setRemoteGestureAnimations] = useState<GestureAnimation[]>([]);
  const lastLocalGesturesRef = useRef<{[key: string]: number}>({});
  const lastRemoteGesturesRef = useRef<{[key: string]: number}>({});

  // Detect all gestures and trigger animations
  useEffect(() => {
    const now = Date.now();
    const COOLDOWN = 500;
    
    // Helper function to add gesture animation
    const addGestureAnimation = (
      isLocal: boolean,
      type: GestureAnimation['type'],
      emoji: string,
      side?: 'left' | 'right'
    ) => {
      const refKey = `${isLocal ? 'local' : 'remote'}-${type}`;
      const lastTimeRef = isLocal ? lastLocalGesturesRef : lastRemoteGesturesRef;
      
      if (now - (lastTimeRef.current[refKey] || 0) < COOLDOWN) return;
      
      lastTimeRef.current[refKey] = now;
      console.log(`${emoji} ${isLocal ? 'Local' : 'Remote'} ${type} detected!`);
      
      const newGesture: GestureAnimation = {
        id: `${refKey}-${now}`,
        type,
        side,
        timestamp: now,
        emoji,
      };
      
      if (isLocal) {
        setLocalGestureAnimations(prev => [...prev, newGesture]);
      } else {
        setRemoteGestureAnimations(prev => [...prev, newGesture]);
      }
      
      // Remove animation after 2 seconds
      const duration = 2000;
      setTimeout(() => {
        if (isLocal) {
          setLocalGestureAnimations(prev => prev.filter(g => g.id !== newGesture.id));
        } else {
          setRemoteGestureAnimations(prev => prev.filter(g => g.id !== newGesture.id));
        }
      }, duration);
    };
    
    // Local gestures
    if (localWinking && localWinkEye) {
      addGestureAnimation(true, 'wink', '😉', localWinkEye);
    }
    
    if (localTongueOut) {
      addGestureAnimation(true, 'tongue', '👅');
    }
    
    // Remote gestures
    if (remoteWinking && remoteWinkEye) {
      addGestureAnimation(false, 'wink', '😉', remoteWinkEye);
    }
    
    if (remoteTongueOut) {
      addGestureAnimation(false, 'tongue', '👅');
    }
  }, [localWinking, localWinkEye, localTongueOut, remoteWinking, remoteWinkEye, remoteTongueOut]);

  // Manual testing (kept for backward compatibility)
  useEffect(() => {
    if (manualLocalWink) {
      console.log('🧪 Manual local wink triggered!');
      const now = Date.now();
      const newGesture: GestureAnimation = {
        id: `manual-local-${now}`,
        type: 'wink',
        side: 'left',
        timestamp: now,
        emoji: '😉',
      };
      setLocalGestureAnimations(prev => [...prev, newGesture]);
      setTimeout(() => {
        setLocalGestureAnimations(prev => prev.filter(g => g.id !== newGesture.id));
      }, 2000);
    }
  }, [manualLocalWink]);

  useEffect(() => {
    if (manualRemoteWink) {
      console.log('🧪 Manual remote wink triggered!');
      const now = Date.now();
      const newGesture: GestureAnimation = {
        id: `manual-remote-${now}`,
        type: 'wink',
        side: 'right',
        timestamp: now,
        emoji: '😉',
      };
      setRemoteGestureAnimations(prev => [...prev, newGesture]);
      setTimeout(() => {
        setRemoteGestureAnimations(prev => prev.filter(g => g.id !== newGesture.id));
      }, 2000);
    }
  }, [manualRemoteWink]);

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    if (seconds < 1) return "0.0s";
    return `${seconds.toFixed(1)}s`;
  };

  // Calculate animation intensity based on duration
  const getAnimationScale = (): number => {
    if (eyeContactDuration < 1) return 1;
    if (eyeContactDuration < 3) return 1 + eyeContactDuration * 0.1;
    return 1.3;
  };

  // Get animation name
  const getAnimationName = (): string => {
    return 'gestureFloat';
  };

  const getAnimationDuration = (): string => {
    return '2s';
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Local Gesture Animations (bottom-right where local video is) */}
      {localGestureAnimations.map((gesture) => (
        <div
          key={gesture.id}
          className="absolute bottom-28 right-20 z-30"
          style={{
            animation: `${getAnimationName()} ${getAnimationDuration()} ease-out forwards`,
          }}
        >
          <div className="text-6xl animate-pulse drop-shadow-lg">
            {gesture.emoji}
          </div>
        </div>
      ))}

      {/* Remote Gesture Animations (center of screen where remote video is) */}
      {remoteGestureAnimations.map((gesture, index) => (
        <div
          key={gesture.id}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
          style={{
            animation: `${getAnimationName()} ${getAnimationDuration()} ease-out forwards`,
            marginLeft: `${(index % 3 - 1) * 100}px`,
            marginTop: `${(Math.floor(index / 3) - 1) * 100}px`,
          }}
        >
          <div className="text-8xl animate-pulse drop-shadow-2xl">
            {gesture.emoji}
          </div>
        </div>
      ))}

      {/* Mutual Eye Contact Indicator */}
      {isMutualEyeContact && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div
            className="flex flex-col items-center transition-transform duration-300"
            style={{
              transform: `scale(${getAnimationScale()})`,
            }}
          >
            {/* Animated glow effect */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  background:
                    "radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(168, 85, 247, 0.2) 50%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              ></div>

              {/* Main eye contact icon */}
              <div className="relative bg-gradient-to-br from-pink-500 via-purple-500 to-pink-600 rounded-full p-8 shadow-2xl animate-pulse">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                  <svg
                    className="w-8 h-8 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <svg
                    className="w-12 h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Text message */}
            <div className="mt-6 text-center">
              <p className="text-white text-2xl font-bold drop-shadow-2xl animate-pulse">
                👁️ Eye Contact Achieved!
              </p>

              {/* Duration display - gets more prominent over time */}
              {eyeContactDuration > 1 && (
                <div className="mt-3 bg-black/50 backdrop-blur-sm rounded-full px-6 py-2 border-2 border-pink-400">
                  <p className="text-pink-200 text-xl font-mono font-bold">
                    {formatDuration(eyeContactDuration)}
                  </p>
                </div>
              )}

              {/* Milestone celebrations */}
              {eyeContactDuration >= 3 && eyeContactDuration < 3.2 && (
                <p className="text-yellow-300 text-lg font-semibold mt-2 animate-bounce">
                  ⭐ 3 seconds!
                </p>
              )}
              {eyeContactDuration >= 5 && eyeContactDuration < 5.2 && (
                <p className="text-yellow-300 text-lg font-semibold mt-2 animate-bounce">
                  🌟 5 seconds!
                </p>
              )}
              {eyeContactDuration >= 10 && eyeContactDuration < 10.2 && (
                <p className="text-yellow-300 text-xl font-bold mt-2 animate-bounce">
                  🔥 10 seconds! Amazing!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators (Top Bar) - ALWAYS VISIBLE */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
        <div className="flex justify-between items-start">
        {/* Local gaze indicator */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300">You:</span>
            <div
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                localGaze?.isLooking ? "bg-green-400 shadow-green-glow" : "bg-gray-500"
              }`}
            />
            {localGaze?.isLooking ? (
              <span className="text-xs text-green-400 font-semibold">👁️ Looking</span>
            ) : (
              <span className="text-xs text-gray-400">Away</span>
            )}
          </div>
        </div>

        {/* Remote gaze indicator */}
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-300">Them:</span>
            <div
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                remoteGaze?.isLooking ? "bg-green-400 shadow-green-glow" : "bg-gray-500"
              }`}
            />
            {remoteGaze?.isLooking ? (
              <span className="text-xs text-green-400 font-semibold">👁️ Looking</span>
            ) : (
              <span className="text-xs text-gray-400">Away</span>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Debug Info Panel */}
      {showDebugInfo && (localGaze || remoteGaze) && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-xs font-mono max-w-sm border border-white/20">
          <h3 className="text-white font-bold mb-2">🔍 Debug Info</h3>

          {/* Local gaze */}
          {localGaze && (
            <div className="mb-3">
              <p className="text-green-400 font-semibold">Local:</p>
              <p className="text-gray-300">
                Gaze: ({localGaze.gazeX.toFixed(2)}, {localGaze.gazeY.toFixed(2)})
              </p>
              <p className="text-gray-300">
                Confidence: {(localGaze.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-gray-300">
                Looking: {localGaze.isLooking ? "✅" : "❌"}
              </p>
              <p className={`text-gray-300 font-bold ${localWinking ? 'text-yellow-400' : ''}`}>
                Winking: {localWinking ? `😉 ${localWinkEye}` : "❌"}
              </p>
            </div>
          )}

          {/* Remote gaze */}
          {remoteGaze && (
            <div className="mb-3">
              <p className="text-blue-400 font-semibold">Remote:</p>
              <p className="text-gray-300">
                Gaze: ({remoteGaze.gazeX.toFixed(2)}, {remoteGaze.gazeY.toFixed(2)})
              </p>
              <p className="text-gray-300">
                Confidence: {(remoteGaze.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-gray-300">
                Looking: {remoteGaze.isLooking ? "✅" : "❌"}
              </p>
              <p className={`text-gray-300 font-bold ${remoteWinking ? 'text-yellow-400' : ''}`}>
                Winking: {remoteWinking ? `😉 ${remoteWinkEye}` : "❌"}
              </p>
              <p className="text-gray-300 text-xs">
                Age: {Date.now() - remoteGaze.timestamp}ms
              </p>
            </div>
          )}

          {/* Mutual eye contact */}
          <div className="pt-2 border-t border-white/20">
            <p className="text-white font-semibold">
              Mutual: {isMutualEyeContact ? "✅" : "❌"}
            </p>
            <p className="text-white">
              Duration: {formatDuration(eyeContactDuration)}
            </p>
          </div>
        </div>
      )}

      {/* CSS for glow effects and animations */}
      <style jsx>{`
        .shadow-green-glow {
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.8),
            0 0 20px rgba(74, 222, 128, 0.4);
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes gestureFloat {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0) rotate(0deg);
          }
          50% {
            transform: scale(1.3) translateY(-30px) rotate(10deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-80px) rotate(-10deg);
          }
        }
      `}</style>
    </div>
  );
}

