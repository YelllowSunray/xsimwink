"use client";

import { useState } from "react";

export default function GenerateTokenPage() {
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [roomName, setRoomName] = useState("test-room");
  const [identity, setIdentity] = useState("test-user");
  const [generatedToken, setGeneratedToken] = useState("");

  const generateToken = async () => {
    if (!serverUrl || !apiKey || !apiSecret) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Simple JWT token generation (for testing only)
      const header = {
        alg: "HS256",
        typ: "JWT"
      };

      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: apiKey,
        sub: identity,
        iat: now,
        exp: now + 3600, // 1 hour
        room: roomName,
        video: {
          room: roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        }
      };

      // Encode header and payload
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
      // Create signature (simplified - for real use, use proper JWT library)
      const signature = await createSignature(encodedHeader + '.' + encodedPayload, apiSecret);
      
      const token = encodedHeader + '.' + encodedPayload + '.' + signature;
      setGeneratedToken(token);
    } catch (error) {
      alert("Error generating token: " + error);
    }
  };

  const createSignature = async (data: string, secret: string): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    return signatureBase64;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedToken);
    alert("Token copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-black/50 backdrop-blur-lg rounded-2xl border border-pink-500/30 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">🔑 LiveKit Token Generator</h1>
        <p className="text-gray-300 mb-6">
          Generate a test token for your LiveKit room
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
              placeholder="wss://your-project.livekit.cloud"
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              API Key
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your LiveKit API Key"
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              API Secret
            </label>
            <input
              type="password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="Your LiveKit API Secret"
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

          {/* Identity */}
          <div>
            <label className="block text-pink-300 text-sm font-semibold mb-2">
              User Identity
            </label>
            <input
              type="text"
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="test-user"
              className="w-full px-4 py-3 bg-black/30 border border-pink-500/30 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={generateToken}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-4 rounded-lg transition shadow-lg hover:shadow-pink-500/50"
          >
            Generate Token
          </button>

          {/* Generated Token */}
          {generatedToken && (
            <div className="mt-6 p-4 bg-green-900/30 rounded-lg border border-green-500/30">
              <h3 className="text-white font-semibold mb-2">✅ Generated Token:</h3>
              <div className="bg-black/50 p-3 rounded text-xs font-mono text-green-400 break-all mb-3">
                {generatedToken}
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded transition"
              >
                Copy Token
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
          <h3 className="text-white font-semibold mb-2">📋 How to Use:</h3>
          <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
            <li>Get your credentials from LiveKit Cloud dashboard</li>
            <li>Fill in the form above</li>
            <li>Click "Generate Token"</li>
            <li>Copy the token</li>
            <li>Use it in <code className="bg-black/50 px-1 rounded">/test-eye-contact</code></li>
          </ol>
        </div>

        {/* Quick Links */}
        <div className="mt-4 flex gap-4">
          <a
            href="/test-eye-contact"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition text-center"
          >
            🎥 Go to Video Test
          </a>
          <a
            href="/test-wink-visual"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition text-center"
          >
            😉 Test Visuals Only
          </a>
        </div>
      </div>
    </div>
  );
}

