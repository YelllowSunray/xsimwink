/**
 * Spotify Service
 * Handles Spotify Web Playback SDK integration and music control
 */

export interface SpotifyTrack {
  id: string;
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
}

export class SpotifyService {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private accessToken: string | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize Spotify Web Playback SDK
   */
  async initialize(accessToken: string): Promise<boolean> {
    this.accessToken = accessToken;

    return new Promise((resolve, reject) => {
      // Load Spotify Web Playback SDK script
      if (!window.Spotify) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
          this.setupPlayer(accessToken).then(resolve).catch(reject);
        };
      } else {
        this.setupPlayer(accessToken).then(resolve).catch(reject);
      }
    });
  }

  /**
   * Setup Spotify Player
   */
  private async setupPlayer(accessToken: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const player = new window.Spotify.Player({
        name: 'Video Call Music Player',
        getOAuthToken: (cb) => {
          cb(accessToken);
        },
        volume: 0.5,
      });

      // Ready
      player.addListener('ready', ({ device_id }) => {
        console.log('✅ Spotify Player Ready with Device ID:', device_id);
        this.deviceId = device_id;
        this.emit('ready', device_id);
        resolve(true);
      });

      // Not Ready
      player.addListener('not_ready', ({ device_id }) => {
        console.log('❌ Spotify Player Not Ready:', device_id);
        this.emit('not_ready', device_id);
        reject(new Error('Player not ready'));
      });

      // Player state changed
      player.addListener('player_state_changed', (state) => {
        if (!state) return;

        const playbackState = this.parsePlaybackState(state);
        this.emit('state_changed', playbackState);
      });

      // Errors
      player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify initialization error:', message);
        this.emit('error', message);
        reject(new Error(message));
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify authentication error:', message);
        this.emit('error', message);
        this.emit('auth_error', message);
      });

      player.addListener('account_error', ({ message }) => {
        console.error('Spotify account error:', message);
        this.emit('error', message);
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
        this.emit('error', message);
      });

      // Connect to the player
      player.connect();

      this.player = player;
    });
  }

  /**
   * Parse Spotify playback state
   */
  private parsePlaybackState(state: Spotify.PlaybackState): SpotifyPlaybackState {
    const track = state.track_window.current_track;
    
    return {
      isPlaying: !state.paused,
      isPaused: state.paused,
      position: state.position,
      duration: state.duration,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map((a) => a.name),
        album: track.album.name,
        albumArt: track.album.images[0]?.url || '',
        duration: state.duration,
      },
      volume: 0.5, // Volume not available in state, track separately
    };
  }

  /**
   * Play a track or album by URI
   */
  async play(uri?: string): Promise<void> {
    if (!this.accessToken || !this.deviceId) {
      throw new Error('Spotify not initialized');
    }

    const body = uri
      ? {
          device_id: this.deviceId,
          uris: uri.startsWith('spotify:track:') ? [uri] : undefined,
          context_uri: uri.startsWith('spotify:album:') || uri.startsWith('spotify:playlist:') ? uri : undefined,
        }
      : { device_id: this.deviceId };

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (!this.player) return;
    await this.player.pause();
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (!this.player) return;
    await this.player.resume();
  }

  /**
   * Toggle play/pause
   */
  async togglePlay(): Promise<void> {
    if (!this.player) return;
    await this.player.togglePlay();
  }

  /**
   * Skip to next track
   */
  async nextTrack(): Promise<void> {
    if (!this.player) return;
    await this.player.nextTrack();
  }

  /**
   * Skip to previous track
   */
  async previousTrack(): Promise<void> {
    if (!this.player) return;
    await this.player.previousTrack();
  }

  /**
   * Seek to position in milliseconds
   */
  async seek(position: number): Promise<void> {
    if (!this.player) return;
    await this.player.seek(position);
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    if (!this.player) return;
    await this.player.setVolume(volume);
  }

  /**
   * Get current playback state
   */
  async getState(): Promise<SpotifyPlaybackState | null> {
    if (!this.player) return null;
    const state = await this.player.getCurrentState();
    if (!state) return null;
    return this.parsePlaybackState(state);
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
      name: track.name,
      artists: track.artists.map((a: any) => a.name),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      duration: track.duration_ms,
    }));
  }

  /**
   * Transfer playback to this device
   */
  async transferPlayback(): Promise<void> {
    if (!this.accessToken || !this.deviceId) {
      throw new Error('Spotify not initialized');
    }

    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        device_ids: [this.deviceId],
        play: false,
      }),
    });
  }

  /**
   * Disconnect player
   */
  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.accessToken = null;
    }
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
   * Check if player is ready
   */
  isReady(): boolean {
    return this.player !== null && this.deviceId !== null;
  }

  /**
   * Get device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }
}

// Singleton instance
export const spotifyService = new SpotifyService();

