"use client";

import React, { useRef, useEffect, useState } from "react";
import { useLiveKitEyeContact } from "@/hooks/useLiveKitEyeContact";

interface LiveKitEyeContactOverlayProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  showDebugInfo?: boolean;
  manualLocalWink?: boolean;
  manualRemoteWink?: boolean;
}

interface GestureAnimation {
  id: string;
  type: 'wink';
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
    localWinking,
    remoteWinking,
    localWinkEye,
    remoteWinkEye,
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
    
    // Remote gestures
    if (remoteWinking && remoteWinkEye) {
      addGestureAnimation(false, 'wink', '😉', remoteWinkEye);
    }
  }, [localWinking, localWinkEye, remoteWinking, remoteWinkEye]);

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


  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Local Wink Animations (bottom-right where local video is) */}
      {localGestureAnimations.map((gesture) => (
        <div
          key={gesture.id}
          className="absolute bottom-28 right-20 z-30"
          style={{
            animation: 'gestureFloat 2s ease-out forwards',
          }}
        >
          <div className="text-6xl animate-pulse drop-shadow-lg">
            {gesture.emoji}
          </div>
        </div>
      ))}

      {/* Remote Wink Animations (center of screen where remote video is) */}
      {remoteGestureAnimations.map((gesture, index) => (
        <div
          key={gesture.id}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
          style={{
            animation: 'gestureFloat 2s ease-out forwards',
            marginLeft: `${(index % 3 - 1) * 100}px`,
            marginTop: `${(Math.floor(index / 3) - 1) * 100}px`,
          }}
        >
          <div className="text-8xl animate-pulse drop-shadow-2xl">
            {gesture.emoji}
          </div>
        </div>
      ))}

      {/* CSS for wink animations */}
      <style jsx>{`
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

