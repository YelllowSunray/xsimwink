/**
 * Spotify Service - Simplified Connect API Only
 * Both Desktop and Mobile act as remote controls for a shared Spotify device
 */

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  albumArt: string;
  duration: number;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  position: number;
  duration: number;
  track: SpotifyTrack | null;
  volume: number;
  deviceId: string | null;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export class SpotifyService {
  private accessToken: string | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private selectedDeviceId: string | null = null;
  private statePollingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize Spotify Connect API (works for all devices)
   */
  async initialize(accessToken: string): Promise<boolean> {
    this.accessToken = accessToken;
    console.log('🎵 Initializing Spotify Connect API - Universal Remote Control Mode');
    
    // Start polling playback state for real-time updates
    this.startStatePolling();
    
    this.emit('ready', 'connect-api');
    return true;
  }

  /**
   * Start polling for playback state updates
   */
  private startStatePolling(): void {
    if (this.statePollingInterval) {
      clearInterval(this.statePollingInterval);
    }

    this.statePollingInterval = setInterval(async () => {
      try {
        const state = await this.getState();
        if (state) {
          this.emit('state_changed', state);
        }
      } catch (error) {
        // Silently fail - user may not be playing anything
      }
    }, 1000); // Poll every second
  }

  /**
   * Stop state polling
   */
  private stopStatePolling(): void {
    if (this.statePollingInterval) {
      clearInterval(this.statePollingInterval);
      this.statePollingInterval = null;
    }
  }

  /**
   * Play a track by URI via Connect API
   */
  async play(uri?: string, deviceId?: string): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Spotify not initialized');
    }

    const targetDevice = deviceId || this.selectedDeviceId;
    const body: any = {};
    
    if (uri) {
      body.uris = [uri];
    }

    const url = targetDevice 
      ? `https://api.spotify.com/v1/me/player/play?device_id=${targetDevice}`
      : 'https://api.spotify.com/v1/me/player/play';

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to play: ${response.statusText}`);
    }
  }

  /**
   * Pause playback via Connect API
   */
  async pause(): Promise<void> {
    if (!this.accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to pause: ${response.statusText}`);
    }
  }

  /**
   * Resume playback via Connect API
   */
  async resume(): Promise<void> {
    if (!this.accessToken) return;

    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to resume: ${response.statusText}`);
    }
  }

  /**
   * Toggle play/pause via Connect API
   */
  async togglePlay(): Promise<void> {
    const state = await this.getCurrentPlaybackState();
    if (state?.is_playing) {
      await this.pause();
    } else {
      await this.resume();
    }
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    if (!this.accessToken) return [];

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.devices || [];
  }

  /**
   * Get current playback state via API
   */
  async getCurrentPlaybackState(): Promise<any> {
    if (!this.accessToken) return null;

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 204 || !response.ok) return null;
    return response.json();
  }

  /**
   * Search for tracks
   */
  async searchTracks(query: string): Promise<SpotifyTrack[]> {
    if (!this.accessToken) {
      throw new Error('Spotify not initialized');
    }

    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: '20',
    });

    const response = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search tracks');
    }

    const data = await response.json();
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      uri: track.uri,
      name: track.name,
      artists: track.artists.map((a: any) => a.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      duration: track.duration_ms,
    }));
  }

  /**
   * Transfer playback to a specific device
   */
  async transferPlayback(deviceId: string): Promise<void> {
    if (!this.accessToken) return;

    this.selectedDeviceId = deviceId;

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false,
      }),
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to transfer playback: ${response.statusText}`);
    }
  }

  /**
   * Set volume via Connect API (0-100)
   */
  async setVolume(volumePercent: number): Promise<void> {
    if (!this.accessToken) return;

    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volumePercent}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to set volume: ${response.statusText}`);
    }
  }

  /**
   * Get current playback state via Connect API
   */
  async getState(): Promise<SpotifyPlaybackState | null> {
    const apiState = await this.getCurrentPlaybackState();
    if (!apiState || !apiState.item) return null;

    return {
      isPlaying: apiState.is_playing,
      isPaused: !apiState.is_playing,
      position: apiState.progress_ms,
      duration: apiState.item.duration_ms,
      track: {
        id: apiState.item.id,
        uri: apiState.item.uri,
        name: apiState.item.name,
        artists: apiState.item.artists.map((a: any) => a.name),
        album: apiState.item.album.name,
        albumArt: apiState.item.album.images[0]?.url || '',
        duration: apiState.item.duration_ms,
      },
      volume: apiState.device?.volume_percent || 50,
      deviceId: apiState.device?.id || null,
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stopStatePolling();
    this.selectedDeviceId = null;
    this.accessToken = null;
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, ...args: any[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get selected device ID
   */
  getDeviceId(): string | null {
    return this.selectedDeviceId;
  }

  /**
   * Set selected device ID
   */
  setDeviceId(deviceId: string): void {
    this.selectedDeviceId = deviceId;
  }
}

// Singleton instance
export const spotifyService = new SpotifyService();

