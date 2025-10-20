"use client";

import { useState, useEffect, useRef } from "react";

interface WinkAnimation {
  id: string;
  side: 'left' | 'right';
  timestamp: number;
}

export default function TestWinkVisualPage() {
  const [localWinkAnimations, setLocalWinkAnimations] = useState<WinkAnimation[]>([]);
  const [remoteWinkAnimations, setRemoteWinkAnimations] = useState<WinkAnimation[]>([]);

  const triggerLocalWink = () => {
    const now = Date.now();
    const newWink: WinkAnimation = {
      id: `local-${now}`,
      side: 'left',
      timestamp: now,
    };
    setLocalWinkAnimations(prev => [...prev, newWink]);
    console.log('😉 Local wink animation triggered!');
    
    setTimeout(() => {
      setLocalWinkAnimations(prev => prev.filter(w => w.id !== newWink.id));
    }, 2000);
  };

  const triggerRemoteWink = () => {
    const now = Date.now();
    const newWink: WinkAnimation = {
      id: `remote-${now}`,
      side: 'right',
      timestamp: now,
    };
    setRemoteWinkAnimations(prev => [...prev, newWink]);
    console.log('😉 Remote wink animation triggered!');
    
    setTimeout(() => {
      setRemoteWinkAnimations(prev => prev.filter(w => w.id !== newWink.id));
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Simulated Video Layout */}
      <div className="relative w-full h-screen">
        {/* Remote Video Area (Full Screen) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-2xl text-gray-400">Remote Person</p>
            <p className="text-gray-500 mt-2">(Center screen winks appear here)</p>
          </div>
        </div>

        {/* Local Video Area (Bottom Right PiP) */}
        <div className="absolute bottom-24 right-4 w-48 h-36 rounded-lg border-2 border-pink-500 bg-gradient-to-br from-purple-900 to-pink-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm text-gray-300">You</p>
            <p className="text-xs text-gray-500">(Small winks here)</p>
          </div>
        </div>

        {/* WINK ANIMATIONS OVERLAY */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Local Wink Animations (bottom-right where local video is) */}
          {localWinkAnimations.map((wink) => (
            <div
              key={wink.id}
              className="absolute bottom-28 right-20 z-30"
              style={{
                animation: 'winkFloat 2s ease-out forwards',
              }}
            >
              <div className="text-6xl animate-pulse">
                😉
              </div>
            </div>
          ))}

          {/* Remote Wink Animations (center of screen where remote video is) */}
          {remoteWinkAnimations.map((wink, index) => (
            <div
              key={wink.id}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
              style={{
                animation: 'winkFloat 2s ease-out forwards',
                marginLeft: `${(index % 3 - 1) * 100}px`,
                marginTop: `${(Math.floor(index / 3) - 1) * 100}px`,
              }}
            >
              <div className="text-8xl animate-pulse drop-shadow-2xl">
                😉
              </div>
            </div>
          ))}
        </div>

        {/* Control Bar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="bg-black/80 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
            <div className="flex items-center gap-4">
              <button
                onClick={triggerLocalWink}
                className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 transition shadow-lg"
              >
                <span className="text-white text-lg font-bold">😉 Test My Wink</span>
              </button>

              <button
                onClick={triggerRemoteWink}
                className="px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-700 transition shadow-lg"
              >
                <span className="text-white text-lg font-bold">😉 Test Their Wink</span>
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20 max-w-2xl">
          <div className="bg-black/80 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/30">
            <h1 className="text-3xl font-bold text-center mb-4">
              😉 Wink Visual Test
            </h1>
            <p className="text-gray-300 text-center mb-4">
              This tests the wink animations WITHOUT LiveKit
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>🔵 <strong>Test My Wink:</strong> Small emoji appears bottom-right (your video area)</p>
              <p>🟣 <strong>Test Their Wink:</strong> Large emoji appears center screen (their video area)</p>
              <p className="text-xs text-yellow-400 mt-3">
                ✅ If these work: Visual animations are perfect!<br/>
                ❌ Next step: Connect real wink detection
              </p>
            </div>
          </div>
        </div>

        {/* CSS for animations */}
        <style jsx>{`
          @keyframes winkFloat {
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
    </div>
  );
}


