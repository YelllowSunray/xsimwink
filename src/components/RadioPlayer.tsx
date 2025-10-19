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

// Popular internet radio stations (free streaming URLs)
const RADIO_STATIONS: RadioStation[] = [
  { id: 'lofi', name: 'Lofi Girl Radio', url: 'http://stream.zeno.fm/f3wvbbqmdg8uv', genre: 'Lo-fi/Chill', country: '🎧' },
  { id: 'jazz', name: 'Smooth Jazz 24/7', url: 'http://smoothjazz.com.pl/mp3', genre: 'Jazz', country: '🎷' },
  { id: 'classical', name: 'Classical Music', url: 'http://listen.181fm.com/181-classical_128k.mp3', genre: 'Classical', country: '🎻' },
  { id: 'pop', name: 'Top 40 Hits', url: 'http://listen.181fm.com/181-star90s_128k.mp3', genre: 'Pop', country: '🎤' },
  { id: 'rock', name: 'Classic Rock', url: 'http://listen.181fm.com/181-greatoldies_128k.mp3', genre: 'Rock', country: '🎸' },
  { id: 'electronic', name: 'Electronic Dance', url: 'http://listen.181fm.com/181-beat_128k.mp3', genre: 'Electronic', country: '💥' },
  { id: 'hiphop', name: 'Hip Hop Beats', url: 'http://listen.181fm.com/181-beatport_128k.mp3', genre: 'Hip Hop', country: '🎵' },
  { id: 'ambient', name: 'Ambient Chill', url: 'http://listen.181fm.com/181-chill_128k.mp3', genre: 'Ambient', country: '☁️' },
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

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume / 100;
    audioRef.current = audio;
    
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
      console.error('Radio stream error:', e);
      setIsLoading(false);
      setIsPlaying(false);
    };
    
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('error', handleError);

    return () => {
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

  // Handle remote station changes (from other user)
  useEffect(() => {
    if (listenTogether && remoteStation) {
      const station = RADIO_STATIONS.find(s => s.id === remoteStation);
      if (station && station.id !== currentStation?.id) {
        console.log('🎵 Syncing to remote station:', station.name);
        
        if (!audioRef.current) {
          console.error('Audio element not initialized');
          return;
        }

        setIsLoading(true);
        setCurrentStation(station);
        
        try {
          audioRef.current.pause();
          audioRef.current.src = station.url;
          audioRef.current.play().catch(err => {
            console.error('Error playing remote station:', err);
            setIsLoading(false);
            setIsPlaying(false);
          });
        } catch (err) {
          console.error('Error setting up remote station:', err);
          setIsLoading(false);
          setIsPlaying(false);
        }
      }
    }
  }, [remoteStation, listenTogether, currentStation?.id]);

  const playStation = (station: RadioStation, broadcast = true) => {
    if (!audioRef.current) {
      console.error('Audio element not initialized');
      return;
    }

    setIsLoading(true);
    setCurrentStation(station);
    
    try {
      // Stop current stream
      audioRef.current.pause();
      audioRef.current.src = station.url;
      
      // Play new stream
      audioRef.current.play().catch(err => {
        console.error('Error playing radio:', err);
        setIsLoading(false);
        setIsPlaying(false);
      });
    } catch (err) {
      console.error('Error setting up radio station:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }

    // Broadcast to other user if Listen Together is enabled
    if (listenTogether && broadcast && onStationChange) {
      console.log('📡 Broadcasting station change:', station.name);
      onStationChange(station.id);
    }

    setShowStations(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentStation) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing:', err);
      });
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

