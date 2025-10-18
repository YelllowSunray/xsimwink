"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { spotifyService, SpotifyPlaybackState, SpotifyTrack } from '@/services/SpotifyService';

interface SpotifyContextType {
  isAuthenticated: boolean;
  isPlayerReady: boolean;
  playbackState: SpotifyPlaybackState | null;
  login: () => Promise<void>;
  logout: () => void;
  play: (uri?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  searchTracks: (query: string) => Promise<SpotifyTrack[]>;
  error: string | null;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<SpotifyPlaybackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Check for stored tokens on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('spotify_access_token');
    const storedRefreshToken = localStorage.getItem('spotify_refresh_token');
    const tokenExpiry = localStorage.getItem('spotify_token_expiry');

    if (storedAccessToken && storedRefreshToken && tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      const now = Date.now();

      if (now < expiryTime) {
        // Token still valid
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setIsAuthenticated(true);
        initializePlayer(storedAccessToken);
      } else {
        // Token expired, try to refresh
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
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      exchangeCodeForToken(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Setup player event listeners
  useEffect(() => {
    const handleReady = () => {
      setIsPlayerReady(true);
      setError(null);
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
      // Transfer playback to this device
      await spotifyService.transferPlayback();
    } catch (err) {
      console.error('Failed to initialize Spotify player:', err);
      setError('Failed to initialize Spotify player');
    }
  };

  const exchangeCodeForToken = async (code: string) => {
    try {
      const response = await fetch('/api/spotify-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange_code', code }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();
      const { access_token, refresh_token, expires_in } = data;

      // Store tokens
      localStorage.setItem('spotify_access_token', access_token);
      localStorage.setItem('spotify_refresh_token', refresh_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + expires_in * 1000));

      setAccessToken(access_token);
      setRefreshToken(refresh_token);
      setIsAuthenticated(true);

      // Initialize player
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

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      const { access_token, expires_in } = data;

      // Store new access token
      localStorage.setItem('spotify_access_token', access_token);
      localStorage.setItem('spotify_token_expiry', String(Date.now() + expires_in * 1000));

      setAccessToken(access_token);
      setIsAuthenticated(true);

      // Initialize player with new token
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

  const play = async (uri?: string) => {
    try {
      await spotifyService.play(uri);
      setError(null);
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

  const togglePlay = async () => {
    try {
      await spotifyService.togglePlay();
      setError(null);
    } catch (err) {
      console.error('Failed to toggle play:', err);
      setError('Failed to toggle playback');
    }
  };

  const nextTrack = async () => {
    try {
      await spotifyService.nextTrack();
      setError(null);
    } catch (err) {
      console.error('Failed to skip track:', err);
      setError('Failed to skip to next track');
    }
  };

  const previousTrack = async () => {
    try {
      await spotifyService.previousTrack();
      setError(null);
    } catch (err) {
      console.error('Failed to go back:', err);
      setError('Failed to go to previous track');
    }
  };

  const seek = async (position: number) => {
    try {
      await spotifyService.seek(position);
      setError(null);
    } catch (err) {
      console.error('Failed to seek:', err);
      setError('Failed to seek');
    }
  };

  const setVolume = async (volume: number) => {
    try {
      await spotifyService.setVolume(volume);
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

  return (
    <SpotifyContext.Provider
      value={{
        isAuthenticated,
        isPlayerReady,
        playbackState,
        login,
        logout,
        play,
        pause,
        resume,
        togglePlay,
        nextTrack,
        previousTrack,
        seek,
        setVolume,
        searchTracks,
        error,
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

