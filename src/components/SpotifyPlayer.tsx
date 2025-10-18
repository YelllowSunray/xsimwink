"use client";

import React, { useState, useEffect } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { SpotifyTrack } from '@/services/SpotifyService';

export default function SpotifyPlayer() {
  const {
    isAuthenticated,
    isPlayerReady,
    playbackState,
    devices,
    selectedDevice,
    login,
    logout,
    play,
    togglePlay,
    setVolume,
    searchTracks,
    refreshDevices,
    selectDevice,
    error,
    listenTogether,
    setListenTogether,
  } = useSpotify();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const [showVolume, setShowVolume] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (error) {
      console.error('Spotify error:', error);
    }
  }, [error]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await searchTracks(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlayTrack = async (track: SpotifyTrack) => {
    await play(track.uri, true); // sync=true for Listen Together
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolumeState(newVolume);
    setVolume(newVolume); // Now takes 0-100 directly
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeviceRefresh = async () => {
    await refreshDevices();
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-black/60 backdrop-blur-lg rounded-lg p-4 border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Connect Spotify</p>
              <p className="text-gray-400 text-xs">
                Control your Spotify from anywhere
              </p>
            </div>
          </div>
          <button
            onClick={login}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-semibold transition text-sm"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  if (!isPlayerReady) {
    return (
      <div className="bg-black/60 backdrop-blur-lg rounded-lg p-4 border border-green-500/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="flex-1">
            <p className="text-white">Connecting to Spotify...</p>
            {error && (
              <p className="text-red-400 text-xs mt-1">{error}</p>
            )}
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <p>💡 If this takes too long:</p>
          <p className="ml-2">• Ensure you have Spotify Premium</p>
          <p className="ml-2">• Try refreshing the page</p>
          <p className="ml-2">• Check browser console for errors</p>
        </div>
      </div>
    );
  }

  // Show device selector if no devices available
  if (devices.length === 0) {
    return (
      <div className="bg-black/60 backdrop-blur-lg rounded-lg p-4 border border-green-500/30">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">Open Spotify</p>
          <p className="text-gray-400 text-sm mb-3">
            Open Spotify on any device (phone, laptop, speaker) and start playing a song
          </p>
          <button
            onClick={handleDeviceRefresh}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition"
          >
            🔄 Check for Devices
          </button>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/60 backdrop-blur-lg rounded-lg border border-green-500/30 overflow-hidden">
      {/* Minimized View */}
      {!isExpanded && (
        <div className="p-3">
          <div className="flex items-center gap-3">
            {playbackState?.track?.albumArt && (
              <img
                src={playbackState.track.albumArt}
                alt="Album art"
                className="w-12 h-12 rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              {playbackState?.track ? (
                <>
                  <p className="text-white text-sm font-semibold truncate">
                    {playbackState.track.name}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {playbackState.track.artists.join(', ')}
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No track playing</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {listenTogether && (
                <div className="px-2 py-1 bg-green-600 rounded text-xs text-white">
                  👥 Together
                </div>
              )}
              <button
                onClick={() => togglePlay(true)}
                className="w-8 h-8 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition"
                aria-label={playbackState?.isPlaying ? 'Pause' : 'Play'}
              >
                {playbackState?.isPlaying ? (
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              <button
                onClick={() => setIsExpanded(true)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Expand player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <span className="text-white font-semibold">Spotify Remote</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={listenTogether}
                  onChange={(e) => setListenTogether(e.target.checked)}
                  className="w-4 h-4 rounded border-green-500 bg-black text-green-600 focus:ring-green-500"
                />
                <span className="text-xs text-white">Listen Together</span>
              </label>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Search tracks"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDevices(!showDevices)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Devices"
                title="Select Device"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-white transition text-xs"
              >
                Disconnect
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Minimize player"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Device Selector (For All Users) */}
          {showDevices && (
            <div className="mb-4 p-3 bg-black/40 rounded-lg border border-green-500/30">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white text-sm font-semibold">Control Device</p>
                <button
                  onClick={handleDeviceRefresh}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  🔄 Refresh
                </button>
              </div>
              <p className="text-gray-400 text-xs mb-3">
                Both users will control the same device for perfect sync!
              </p>
              <div className="space-y-2">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => {
                      selectDevice(device.id);
                      setShowDevices(false);
                    }}
                    className={`w-full text-left p-2 rounded transition ${
                      selectedDevice === device.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{device.name}</span>
                      {device.is_active && <span className="text-xs">▶️ Playing</span>}
                    </div>
                    <span className="text-xs opacity-75 capitalize">{device.type}</span>
                  </button>
                ))}
                {devices.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-2">
                    No devices found. Open Spotify and play a song.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          {showSearch && (
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for songs..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition text-left"
                    >
                      <img
                        src={track.albumArt}
                        alt={track.album}
                        className="w-10 h-10 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{track.name}</p>
                        <p className="text-gray-400 text-xs truncate">{track.artists.join(', ')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Now Playing */}
          {playbackState?.track && (
            <div className="mb-4">
              <div className="flex gap-3 mb-3">
                <img
                  src={playbackState.track.albumArt}
                  alt="Album art"
                  className="w-20 h-20 rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold truncate">{playbackState.track.name}</p>
                  <p className="text-gray-400 text-sm truncate">{playbackState.track.artists.join(', ')}</p>
                  <p className="text-gray-500 text-xs truncate mt-1">{playbackState.track.album}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{
                      width: `${(playbackState.position / playbackState.duration) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(playbackState.position)}</span>
                  <span>{formatTime(playbackState.duration)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => togglePlay(true)}
              className="w-12 h-12 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition"
              aria-label={playbackState?.isPlaying ? 'Pause' : 'Play'}
            >
              {playbackState?.isPlaying ? (
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVolume(!showVolume)}
              className="text-gray-400 hover:text-white transition"
              aria-label="Volume"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
            {showVolume && (
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                className="flex-1 accent-green-600"
              />
            )}
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

