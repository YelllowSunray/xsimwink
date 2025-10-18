"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { spotifyService, SpotifyPlaybackState, SpotifyTrack, SpotifyDevice } from '@/services/SpotifyService';

interface SpotifyContextType {
  isAuthenticated: boolean;
  isPlayerReady: boolean;
  playbackState: SpotifyPlaybackState | null;
  devices: SpotifyDevice[];
  selectedDevice: string | null;
  login: () => Promise<void>;
  logout: () => void;
  play: (uri?: string, sync?: boolean) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: (sync?: boolean) => Promise<void>;
  setVolume: (volumePercent: number) => Promise<void>;
  searchTracks: (query: string) => Promise<SpotifyTrack[]>;
  refreshDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  error: string | null;
  // Listen Together
  listenTogether: boolean;
  setListenTogether: (enabled: boolean) => void;
  onSyncMessage: (callback: (data: any) => void) => void;
  offSyncMessage: (callback: (data: any) => void) => void;
  currentController: string | null;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [selectedDevice, setSelectedDeviceState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  
  // Listen Together state
  const [listenTogether, setListenTogether] = useState(false);
  const [currentController, setCurrentController] = useState<string | null>(null);
  const [syncCallbacks, setSyncCallbacks] = useState<((data: any) => void)[]>([]);

  // Check for stored tokens on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('spotify_access_token');
    const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');

    if (storedAccessToken && storedRefreshToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      const now = Date.now();

      if (now < expiryTime) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setIsAuthenticated(true);
        initializePlayer(storedAccessToken);
      } else {
        refreshAccessToken(storedRefreshToken);
      }
    }
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('spotify_code');
    const errorParam = params.get('spotify_error');

    if (errorParam) {
      setError(`Spotify authentication error: ${errorParam}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Setup player event listeners
  useEffect(() => {
    const handleReady = () => {
      setIsPlayerReady(true);
      setError(null);
      refreshDevices(); // Load available devices
    };

    const handleNotReady = () => {
      setIsPlayerReady(false);
    };

    const handleStateChange = (state: SpotifyPlaybackState) => {
      setPlaybackState(state);
    };

    const handleError = (errorMessage: string) => {
      setError(errorMessage);
    };

    const handleAuthError = () => {
      if (refreshToken) {
        refreshAccessToken(refreshToken);
      } else {
        logout();
      }
    };

    spotifyService.on('ready', handleReady);
    spotifyService.on('not_ready', handleNotReady);
    spotifyService.on('state_changed', handleStateChange);
    spotifyService.on('error', handleError);
    spotifyService.on('auth_error', handleAuthError);

    return () => {
      spotifyService.off('ready', handleReady);
      spotifyService.off('not_ready', handleNotReady);
      spotifyService.off('state_changed', handleStateChange);
      spotifyService.off('error', handleError);
      spotifyService.off('auth_error', handleAuthError);
    };
  }, [refreshToken]);

  const initializePlayer = async (token: string) => {
    try {
      await spotifyService.initialize(token);
      // Automatically load available devices
      await refreshDevices();
    } catch (err) {
      console.error('Failed to initialize Spotify:', err);
      setError('Failed to initialize Spotify');
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('/api/spotify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_code', code }),
      });

      if (!response.ok) throw new Error('Failed to exchange code for token');

      const data = await response.json();
      const { access_token, refresh_token, expires_in } = data;

      localStorage.setItem('spotify_access_token', access_token);
      localStorage.setItem('spotify_refresh_token', refresh_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + expires_in * 1000));

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setIsAuthenticated(true);

      await initializePlayer(access_token);
    } catch (err) {
      console.error('Failed to exchange code:', err);
      setError('Failed to authenticate with Spotify');
    }
  };

  const refreshAccessToken = async (token: string) => {
    try {
      const response = await fetch('/api/spotify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_token', refresh_token: token }),
      });

      if (!response.ok) throw new Error('Failed to refresh token');

      const data = await response.json();
      const { access_token, expires_in } = data;

      localStorage.setItem('spotify_access_token', access_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + expires_in * 1000));

      setAccessToken(access_token);
      setIsAuthenticated(true);

      await initializePlayer(access_token);
    } catch (err) {
      console.error('Failed to refresh token:', err);
      setError('Failed to refresh Spotify authentication');
      logout();
    }
  };

  const login = async () => {
    try {
      const response = await fetch('/api/spotify-auth?action=login');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error('Failed to initiate Spotify login:', err);
      setError('Failed to initiate Spotify login');
    }
  };

  const logout = () => {
    spotifyService.disconnect();
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expiry');
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    setIsPlayerReady(false);
    setPlaybackState(null);
    setError(null);
  };

  const play = async (uri?: string, sync: boolean = true) => {
    try {
      await spotifyService.play(uri, selectedDevice || undefined);
      setError(null);
      
      // Broadcast to others if Listen Together is enabled
      if (listenTogether && sync && uri) {
        broadcastSync({
          action: 'play_track',
          uri: uri,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Failed to play:', err);
      setError('Failed to play track');
    }
  };

  const pause = async () => {
    try {
      await spotifyService.pause();
      setError(null);
    } catch (err) {
      console.error('Failed to pause:', err);
      setError('Failed to pause playback');
    }
  };

  const resume = async () => {
    try {
      await spotifyService.resume();
      setError(null);
    } catch (err) {
      console.error('Failed to resume:', err);
      setError('Failed to resume playback');
    }
  };

  const togglePlay = async (sync: boolean = true) => {
    try {
      await spotifyService.togglePlay();
      setError(null);
      
      if (listenTogether && sync) {
        const state = await spotifyService.getState();
        broadcastSync({
          action: 'toggle_play',
          isPlaying: state?.isPlaying,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Failed to toggle play:', err);
      setError('Failed to toggle playback');
    }
  };

  const setVolume = async (volumePercent: number) => {
    try {
      await spotifyService.setVolume(volumePercent);
      setError(null);
    } catch (err) {
      console.error('Failed to set volume:', err);
      setError('Failed to set volume');
    }
  };

  const searchTracks = async (query: string): Promise<SpotifyTrack[]> => {
    try {
      const tracks = await spotifyService.searchTracks(query);
      setError(null);
      return tracks;
    } catch (err) {
      console.error('Failed to search tracks:', err);
      setError('Failed to search tracks');
      return [];
    }
  };

  const refreshDevices = async () => {
    try {
      const deviceList = await spotifyService.getDevices();
      setDevices(deviceList);
      
      // Auto-select active device or first available
      const activeDevice = deviceList.find(d => d.is_active);
      if (activeDevice) {
        setSelectedDeviceState(activeDevice.id);
      } else if (deviceList.length > 0) {
        setSelectedDeviceState(deviceList[0].id);
      }
    } catch (err) {
      console.error('Failed to refresh devices:', err);
    }
  };

  const selectDevice = async (deviceId: string) => {
    try {
      await spotifyService.transferPlayback(deviceId);
      setSelectedDeviceState(deviceId);
    } catch (err) {
      console.error('Failed to select device:', err);
      setError('Failed to switch device');
    }
  };

  // Broadcast sync message to other users
  const broadcastSync = (data: any) => {
    syncCallbacks.forEach(cb => cb(data));
  };

  // Listen for sync messages from other users
  const onSyncMessage = (callback: (data: any) => void) => {
    setSyncCallbacks(prev => [...prev, callback]);
  };

  const offSyncMessage = (callback: (data: any) => void) => {
    setSyncCallbacks(prev => prev.filter(cb => cb !== callback));
  };

  return (
    <SpotifyContext.Provider
      value={{
        isAuthenticated,
        isPlayerReady,
        playbackState,
        devices,
        selectedDevice,
        login,
        logout,
        play,
        pause,
        resume,
        togglePlay,
        setVolume,
        searchTracks,
        refreshDevices,
        selectDevice,
        error,
        listenTogether,
        setListenTogether,
        onSyncMessage,
        offSyncMessage,
        currentController,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
}

