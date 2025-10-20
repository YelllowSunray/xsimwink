"use client";

import { useState } from "react";
import LiveKitVideoWithEyeContact from "@/components/LiveKitVideoWithEyeContact";

export default function TestEyeContactPage() {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("wss://");
  const [roomName, setRoomName] = useState("test-room");
  const [inCall, setInCall] = useState(false);

  const handleJoinCall = () => {
    if (!token || !serverUrl || !roomName) {
      alert("Please fill in all fields");
      return;
    }
    setInCall(true);
  };

  const handleLeaveCall = () => {
    setInCall(false);
  };

  if (inCall && token) {
    return (
      <LiveKitVideoWithEyeContact
        token={token}
        serverUrl={serverUrl}
        roomName={roomName}
        onDisconnected={handleLeaveCall}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-black/50 backdrop-blur-lg rounded-2xl border border-pink-500/30 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">👁️😉 Eye Contact & Wink Test</h1>
        <p className="text-gray-300 mb-6">
          Test eye contact detection and wink emoji features
        </p>

        <div className="space-y-4">
          {/* Server URL */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              LiveKit Server URL
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="wss://your-server.livekit.cloud"
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Room Name */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="test-room"
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Token */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              Access Token
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your LiveKit access token here"
              rows={4}
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500 resize-none font-mono text-xs"
            />
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinCall}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg transition shadow-lg hover:shadow-pink-500/50"
          >
            Join Call with Eye Contact Detection
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-purple-900/30 rounded-lg border border-purple-500/30">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            How to Test
          </h3>
          <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
            <li>Get a LiveKit token from your server or dashboard</li>
            <li>Enter your LiveKit server URL (wss://...)</li>
            <li>Join the room from two different devices/browsers</li>
            <li>Look directly at your camera for eye contact: 👁️❤️👁️</li>
            <li>Wink at the camera to send a wink emoji: 😉</li>
          </ol>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-4 p-4 bg-pink-900/30 rounded-lg border border-pink-500/30">
          <h3 className="text-white font-semibold mb-2">🚀 Quick Start</h3>
          <p className="text-gray-300 text-xs mb-2">
            Need a LiveKit token? Generate one with:
          </p>
          <code className="block bg-black/50 p-2 rounded text-xs text-green-400 font-mono overflow-x-auto">
            npm install livekit-server-sdk
          </code>
          <p className="text-gray-400 text-xs mt-2">
            Or use the LiveKit dashboard to generate test tokens
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 p-3 rounded-lg border border-pink-500/30">
            <div className="text-2xl mb-1">👁️</div>
            <p className="text-white text-xs font-semibold">Eye Contact</p>
            <p className="text-gray-400 text-xs">Mutual detection</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-3 rounded-lg border border-purple-500/30">
            <div className="text-2xl mb-1">😉</div>
            <p className="text-white text-xs font-semibold">Wink Detection</p>
            <p className="text-gray-400 text-xs">Animated emojis</p>
          </div>
          <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 p-3 rounded-lg border border-pink-500/30">
            <div className="text-2xl mb-1">🎯</div>
            <p className="text-white text-xs font-semibold">Accurate</p>
            <p className="text-gray-400 text-xs">MediaPipe AI</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-3 rounded-lg border border-purple-500/30">
            <div className="text-2xl mb-1">⚡</div>
            <p className="text-white text-xs font-semibold">Real-time</p>
            <p className="text-gray-400 text-xs">Low latency sync</p>
          </div>
        </div>
      </div>
    </div>
  );
}

