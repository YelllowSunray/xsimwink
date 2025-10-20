"use client";

import React, { useRef, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  AudioTrack,
  useParticipants,
  useTracks,
  TrackReference,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import LiveKitEyeContactOverlay from "./LiveKitEyeContactOverlay";

interface LiveKitVideoWithEyeContactProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnected?: () => void;
}

/**
 * Inner component that has access to LiveKit room context
 */
function RoomContent() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localTrackRef = useRef<HTMLVideoElement>(null);
  const remoteTrackRef = useRef<HTMLVideoElement>(null);
  const [eyeContactEnabled, setEyeContactEnabled] = useState(true);
  const [gesturesEnabled, setGesturesEnabled] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [manualLocalWink, setManualLocalWink] = useState(false);
  const [manualRemoteWink, setManualRemoteWink] = useState(false);

  // Get all participants
  const participants = useParticipants();

  // Get video tracks
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  // Separate local and remote tracks
  // Filter out placeholders by checking for publication and explicitly type as TrackReference
  const localVideoTrack = tracks.find(
    (track) => track.participant.isLocal && track.source === Track.Source.Camera && track.publication
  ) as TrackReference | undefined;
  
  const remoteVideoTrack = tracks.find(
    (track) => !track.participant.isLocal && track.source === Track.Source.Camera && track.publication
  ) as TrackReference | undefined;

  const localAudioTrack = tracks.find(
    (track) => track.participant.isLocal && track.source === Track.Source.Microphone && track.publication
  ) as TrackReference | undefined;
  
  const remoteAudioTrack = tracks.find(
    (track) => !track.participant.isLocal && track.source === Track.Source.Microphone && track.publication
  ) as TrackReference | undefined;

  // Capture video elements from VideoTrack refs
  React.useEffect(() => {
    if (localTrackRef.current) {
      localVideoRef.current = localTrackRef.current;
      console.log('✅ Local video element attached');
    }
  }, [localVideoTrack]);

  React.useEffect(() => {
    if (remoteTrackRef.current) {
      remoteVideoRef.current = remoteTrackRef.current;
      console.log('✅ Remote video element attached');
    }
  }, [remoteVideoTrack]);

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0">
        {remoteVideoTrack ? (
          <VideoTrack
            ref={remoteTrackRef}
            trackRef={remoteVideoTrack}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center mb-4 mx-auto">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-white text-lg">Waiting for partner...</p>
            </div>
          </div>
        )}
      </div>

      {/* Remote Audio */}
      {remoteAudioTrack && <AudioTrack trackRef={remoteAudioTrack} />}

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute bottom-24 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-pink-500 shadow-2xl z-20">
        {localVideoTrack ? (
          <VideoTrack
            ref={localTrackRef}
            trackRef={localVideoTrack}
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
        )}
      </div>

      {/* Eye Contact Overlay */}
      {eyeContactEnabled && (
        <LiveKitEyeContactOverlay
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          enabled={true}
          showDebugInfo={showDebug}
          manualLocalWink={manualLocalWink}
          manualRemoteWink={manualRemoteWink}
          gesturesEnabled={gesturesEnabled}
        />
      )}

      {/* Control Bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-black/80 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
          <div className="flex items-center gap-4">
            {/* Toggle Eye Contact Detection */}
            <button
              onClick={() => setEyeContactEnabled(!eyeContactEnabled)}
              className={`p-3 rounded-full transition ${
                eyeContactEnabled
                  ? "bg-pink-600 hover:bg-pink-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              title={
                eyeContactEnabled
                  ? "Disable wink detection"
                  : "Enable wink detection"
              }
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            </button>

            {/* Toggle Gesture Animations */}
            <button
              onClick={() => setGesturesEnabled(!gesturesEnabled)}
              className={`p-3 rounded-full transition ${
                gesturesEnabled
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
              title={
                gesturesEnabled
                  ? "Hide gesture animations"
                  : "Show gesture animations"
              }
            >
              <span className="text-2xl">{gesturesEnabled ? "😉" : "🚫"}</span>
            </button>

            {/* Toggle Debug Info */}
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title="Toggle debug info"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Instructions Note */}
            <div className="px-4 py-2 bg-yellow-800/80 rounded-full">
              <span className="text-yellow-100 text-xs font-semibold">
                📺 Check console (F12) for blink values!
              </span>
            </div>

            {/* Manual Test Buttons */}
            <button
              onClick={() => {
                setManualLocalWink(true);
                setTimeout(() => setManualLocalWink(false), 2000);
              }}
              className="p-3 rounded-full bg-blue-600 hover:bg-blue-700 transition"
              title="Test local wink animation"
            >
              <span className="text-white text-sm font-bold">😉 Me</span>
            </button>

            <button
              onClick={() => {
                setManualRemoteWink(true);
                setTimeout(() => setManualRemoteWink(false), 2000);
              }}
              className="p-3 rounded-full bg-purple-600 hover:bg-purple-700 transition"
              title="Test remote wink animation"
            >
              <span className="text-white text-sm font-bold">😉 Them</span>
            </button>

            {/* Participant Count */}
            <div className="px-4 py-2 bg-gray-800 rounded-full">
              <span className="text-white text-sm font-semibold">
                {participants.length} {participants.length === 1 ? "person" : "people"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Come Closer Button - Separate from overlay */}
      {eyeContactEnabled && (
        <div className="absolute bottom-24 left-4 z-40">
          <button
            onClick={() => {
              // Send come closer request via overlay's hook
              const event = new CustomEvent('sendComeCloser');
              window.dispatchEvent(event);
            }}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-full shadow-2xl transition-all hover:scale-110 flex items-center gap-2 border-2 border-white"
            title="Ask them to come closer to camera"
          >
            <span className="text-2xl">👋</span>
            <span className="text-sm md:text-base">Come Closer</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Main component with LiveKit room connection
 */
export default function LiveKitVideoWithEyeContact({
  token,
  serverUrl,
  roomName,
  onDisconnected,
}: LiveKitVideoWithEyeContactProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={true}
      onDisconnected={onDisconnected}
      className="h-screen w-full"
    >
      <RoomContent />
    </LiveKitRoom>
  );
}

