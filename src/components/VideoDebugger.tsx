"use client";

import React, { useEffect, useState } from "react";

interface VideoDebuggerProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  connectionStatus: string;
}

export default function VideoDebugger({ 
  localVideoRef, 
  remoteVideoRef, 
  connectionStatus 
}: VideoDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState({
    userAgent: '',
    isIOS: false,
    isSafari: false,
    localVideoReady: false,
    remoteVideoReady: false,
    localVideoDimensions: { width: 0, height: 0 },
    remoteVideoDimensions: { width: 0, height: 0 },
    localVideoState: '',
    remoteVideoState: '',
    iceConnectionState: '',
    connectionState: ''
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);

      setDebugInfo(prev => ({
        ...prev,
        userAgent,
        isIOS,
        isSafari,
        localVideoReady: localVideoRef.current?.readyState >= 2,
        remoteVideoReady: remoteVideoRef.current?.readyState >= 2,
        localVideoDimensions: {
          width: localVideoRef.current?.videoWidth || 0,
          height: localVideoRef.current?.videoHeight || 0
        },
        remoteVideoDimensions: {
          width: remoteVideoRef.current?.videoWidth || 0,
          height: remoteVideoRef.current?.videoHeight || 0
        },
        localVideoState: localVideoRef.current?.readyState?.toString() || '0',
        remoteVideoState: remoteVideoRef.current?.readyState?.toString() || '0'
      }));
    };

    // Update debug info every second
    const interval = setInterval(updateDebugInfo, 1000);
    updateDebugInfo(); // Initial update

    return () => clearInterval(interval);
  }, [localVideoRef, remoteVideoRef]);

  // Only show debugger in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white text-xs p-3 rounded-lg max-w-sm z-50">
      <div className="font-bold mb-2">🔍 Video Debug Info</div>
      
      <div className="space-y-1">
        <div><strong>Device:</strong> {debugInfo.isIOS ? '📱 iOS' : '💻 Desktop'}</div>
        <div><strong>Browser:</strong> {debugInfo.isSafari ? 'Safari' : 'Other'}</div>
        <div><strong>Connection:</strong> {connectionStatus}</div>
        
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div><strong>Local Video:</strong></div>
          <div className="ml-2">
            <div>Ready: {debugInfo.localVideoReady ? '✅' : '❌'}</div>
            <div>Size: {debugInfo.localVideoDimensions.width}x{debugInfo.localVideoDimensions.height}</div>
            <div>State: {debugInfo.localVideoState}</div>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div><strong>Remote Video:</strong></div>
          <div className="ml-2">
            <div>Ready: {debugInfo.remoteVideoReady ? '✅' : '❌'}</div>
            <div>Size: {debugInfo.remoteVideoDimensions.width}x{debugInfo.remoteVideoDimensions.height}</div>
            <div>State: {debugInfo.remoteVideoState}</div>
          </div>
        </div>
        
        {debugInfo.isIOS && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-yellow-300">
            <div>⚠️ iOS detected - check autoplay restrictions</div>
          </div>
        )}
      </div>
    </div>
  );
}

