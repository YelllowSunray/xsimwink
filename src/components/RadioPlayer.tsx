"use client";

import React, { useState, useRef, useEffect } from 'react';

interface RadioStation {
  id: string;
  name: string;
  url: string;
  genre: string;
  country: string;
  icon?: string;
}

// Popular internet radio stations (HTTPS streaming URLs)
const RADIO_STATIONS: RadioStation[] = [
  { id: 'lofi', name: 'Chill Lofi Beats', url: 'https://stream.zeno.fm/fhz1bm0d44zuv', genre: 'Lo-fi/Chill', country: '🎧' },
  { id: 'electronic', name: 'Electronic Dance', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv', genre: 'Electronic', country: '💥' },
  { id: 'jazz', name: 'Smooth Jazz', url: 'https://stream.zeno.fm/0r0xa792kwzuv', genre: 'Jazz', country: '🎷' },
  { id: 'pop', name: 'Top 40 Hits', url: 'https://stream.zeno.fm/d1rc9z5qg18uv', genre: 'Pop', country: '🎤' },
  { id: 'hiphop', name: 'Hip Hop Beats', url: 'https://stream.zeno.fm/9a1agybrgg8uv', genre: 'Hip Hop', country: '🎵' },
  { id: 'rock', name: 'Classic Rock', url: 'https://stream.zeno.fm/nkqd62ap5hhvv', genre: 'Rock', country: '🎸' },
  { id: 'classical', name: 'Classical Music', url: 'https://stream.zeno.fm/f3ndepithhvvv', genre: 'Classical', country: '🎻' },
  { id: 'ambient', name: 'Ambient Chill', url: 'https://stream.zeno.fm/cpyf0cnb5hhvv', genre: 'Ambient', country: '☁️' },
];

interface RadioPlayerProps {
  listenTogether?: boolean;
  onStationChange?: (stationId: string) => void;
  remoteStation?: string | null;
}

export default function RadioPlayer({ 
  listenTogether = false, 
  onStationChange,
  remoteStation 
}: RadioPlayerProps) {
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [showStations, setShowStations] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isChangingStationRef = useRef(false); // Prevent race conditions
  const hasUserInteractedRef = useRef(false); // Track if user has interacted with audio

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;
    
    // Prime the audio element for autoplay by attempting to play silence
    // This helps bypass browser autoplay restrictions
    const primeAudio = async () => {
      if (!hasUserInteractedRef.current) {
        try {
          // Try to play and immediately pause to prime the element
          audio.src = '';
          await audio.play().catch(() => {});
          audio.pause();
          hasUserInteractedRef.current = true;
          console.log('✅ Audio element primed for autoplay');
        } catch (e) {
          console.log('ℹ️ Could not prime audio element');
        }
      }
    };
    
    // Prime on first user interaction with the document
    const handleFirstInteraction = () => {
      primeAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    
    // Try to prime immediately (may fail, but worth trying)
    primeAudio();
    
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleWaiting = () => {
      setIsLoading(true);
    };
    
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      const error = target.error;
      
      console.error('Radio stream error:', {
        event: e,
        error: error,
        code: error?.code,
        message: error?.message,
        currentSrc: target.currentSrc,
      });
      
      // Log user-friendly error messages
      if (error) {
        switch (error.code) {
          case 1: // MEDIA_ERR_ABORTED
            console.warn('⚠️ Stream loading aborted');
            break;
          case 2: // MEDIA_ERR_NETWORK
            console.error('❌ Network error loading stream');
            break;
          case 3: // MEDIA_ERR_DECODE
            console.error('❌ Stream decode error (format not supported)');
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            console.error('❌ Stream URL not supported or unavailable');
            break;
          default:
            console.error('❌ Unknown stream error');
        }
      }
      
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('error', handleError);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Internal function to change stations (handles the audio element properly)
  const playStationInternal = React.useCallback(async (station: RadioStation, broadcast: boolean) => {
    if (!audioRef.current || isChangingStationRef.current) {
      console.log('⏸️ Station change already in progress, skipping');
      return;
    }

    isChangingStationRef.current = true;
    setIsLoading(true);
    setCurrentStation(station);
    
    try {
      const audio = audioRef.current;
      
      // Stop and reset the audio element properly
      audio.pause();
      
      // Wait a bit for pause to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Set new source and load it
      audio.src = station.url;
      audio.load(); // Important: reset the media element
      
      // Try to play - this will auto-play for synced stations
      await audio.play();
      
      console.log('✅ Station playing:', station.name);
      hasUserInteractedRef.current = true; // Mark that audio has played successfully
      setIsLoading(false);
      setIsPlaying(true);
    } catch (err: any) {
      console.error('❌ Error playing radio:', err);
      
      // Handle autoplay restrictions
      if (err.name === 'NotAllowedError') {
        console.warn('⚠️ Autoplay blocked by browser. Station loaded but not playing.');
        // Set state to show station is ready but not playing
        setIsLoading(false);
        setIsPlaying(false);
        // Station is loaded, user can click play
      } else if (err.name === 'AbortError') {
        // Expected when changing stations quickly
        console.log('⏸️ Play aborted (station changed)');
      } else {
        // Other errors
        setIsLoading(false);
        setIsPlaying(false);
      }
    } finally {
      isChangingStationRef.current = false;
    }

    // Broadcast to other user if Listen Together is enabled
    if (listenTogether && broadcast && onStationChange) {
      console.log('📡 Broadcasting station change:', station.name);
      onStationChange(station.id);
    }

    setShowStations(false);
  }, [listenTogether, onStationChange]);

  // Handle remote station changes (from other user)
  useEffect(() => {
    if (listenTogether && remoteStation) {
      const station = RADIO_STATIONS.find(s => s.id === remoteStation);
      if (station && station.id !== currentStation?.id) {
        console.log('🎵 Syncing to remote station:', station.name);
        console.log('🔄 Remote station change detected - auto-playing for sync');
        
        if (!audioRef.current || isChangingStationRef.current) {
          console.log('⏸️ Skipping - station change already in progress');
          return;
        }

        // Auto-play the synced station
        playStationInternal(station, false);
      }
    }
  }, [remoteStation, listenTogether, currentStation?.id, playStationInternal]);

  const playStation = (station: RadioStation, broadcast = true) => {
    playStationInternal(station, broadcast);
  };

  const togglePlay = async () => {
    if (!audioRef.current || !currentStation || isChangingStationRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Error toggling play:', err);
    }
  };

  const handleStationSelect = (station: RadioStation) => {
    playStation(station, true);
  };

  if (!isExpanded) {
    return (
      <div className="bg-black/60 backdrop-blur-lg rounded-lg border border-purple-500/30 overflow-hidden">
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-.83-.51-1.57-1.24-1.85l-7.76-3.1a2 2 0 0 0-1.52 0L3.24 6.15zM12 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-4 8a1 1 0 0 1 1-1h6a1 1 0 0 1 0 2H9a1 1 0 0 1-1-1z"/>
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {currentStation ? (
                <>
                  <p className="text-white text-sm font-semibold truncate">
                    {currentStation.name}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {currentStation.genre}
                  </p>
                </>
              ) : (
                <p className="text-gray-400 text-sm">Select a radio station</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {listenTogether && (
                <div className="px-2 py-1 bg-purple-600 rounded text-xs text-white">
                  👥 Synced
                </div>
              )}
              {currentStation && (
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>
              )}
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
      </div>
    );
  }

  return (
    <div className="bg-black/60 backdrop-blur-lg rounded-lg border border-purple-500/30 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-.83-.51-1.57-1.24-1.85l-7.76-3.1a2 2 0 0 0-1.52 0L3.24 6.15z"/>
              </svg>
            </div>
            <span className="text-white font-semibold">Internet Radio</span>
            {listenTogether && (
              <span className="text-xs text-purple-300">• Synced</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStations(!showStations)}
              className="text-gray-400 hover:text-white transition text-sm"
            >
              {showStations ? 'Hide' : 'Stations'}
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

        {/* Station List */}
        {showStations && (
          <div className="mb-4 max-h-64 overflow-y-auto space-y-2">
            {RADIO_STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => handleStationSelect(station)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  currentStation?.id === station.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{station.name}</p>
                    <p className="text-xs opacity-75">{station.genre}</p>
                  </div>
                  <span className="text-lg ml-2">{station.country}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Now Playing */}
        {currentStation && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isPlaying ? (
                  <div className="flex gap-1 items-end h-6">
                    <div className="w-1 bg-white animate-pulse" style={{ height: '40%', animationDelay: '0ms' }}></div>
                    <div className="w-1 bg-white animate-pulse" style={{ height: '80%', animationDelay: '150ms' }}></div>
                    <div className="w-1 bg-white animate-pulse" style={{ height: '60%', animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-.83-.51-1.57-1.24-1.85l-7.76-3.1a2 2 0 0 0-1.52 0L3.24 6.15z"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">{currentStation.name}</p>
                <p className="text-gray-400 text-sm">{currentStation.genre}</p>
                {isPlaying && (
                  <p className="text-green-400 text-xs mt-1">🔴 Live</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            disabled={!currentStation}
            className="w-12 h-12 bg-white hover:bg-gray-200 rounded-full flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
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
          <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="flex-1 accent-purple-600"
          />
          <span className="text-gray-400 text-sm w-10 text-right">{volume}%</span>
        </div>

        {!currentStation && (
          <div className="mt-4 text-center">
            <p className="text-gray-400 text-sm">Choose a station to start listening</p>
          </div>
        )}
      </div>
    </div>
  );
}

