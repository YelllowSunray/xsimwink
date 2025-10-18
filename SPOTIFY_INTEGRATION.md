# Spotify Premium Integration

This guide explains how to set up and use Spotify Premium integration in your video calling app.

## Features

✨ **What you can do:**
- 🎵 Play Spotify music during video calls
- 🎮 Full playback controls (play, pause, skip, volume)
- 🔍 Search and play any song from Spotify's catalog
- 🎨 Beautiful player UI with album art
- 💻 **Works on desktop browsers only** (Chrome, Firefox, Edge, Safari)
- 🔄 Automatic token refresh
- 👥 Personal music experience during calls

⚠️ **Desktop Only**: Spotify Web Playback SDK is not supported on mobile browsers (iPhone, iPad, Android). The player will automatically hide on mobile devices.

## Prerequisites

1. **Spotify Premium Account** - Required for Web Playback SDK
2. **Spotify Developer Account** - To create an app and get credentials

## Setup Instructions

### Step 1: Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **"Create App"**
4. Fill in the details:
   - **App Name:** Your app name (e.g., "XOXO Video Chat")
   - **App Description:** Brief description
   - **Redirect URIs:** Add these URLs:
     - `http://localhost:3000/api/spotify-callback` (for local development)
     - `https://yourdomain.com/api/spotify-callback` (for production)
   - **APIs used:** Select "Web Playback SDK"
5. Click **"Save"**
6. Go to **Settings** to get your credentials

### Step 2: Get Your Credentials

From your Spotify app settings:
- **Client ID** - Copy this
- **Client Secret** - Click "View client secret" and copy it

### Step 3: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Spotify Integration
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify-callback
```

For production, update `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI` to your production URL.

### Step 4: Restart Your Development Server

```bash
npm run dev
```

## How to Use

### During a Video Call

1. **Connect Spotify**
   - Join a video call
   - Look for the Spotify player in the top-right corner
   - Click **"Connect"** button
   - Log in with your Spotify Premium account
   - Authorize the app

2. **Play Music**
   - Once connected, you can:
     - Search for songs using the search button (🔍)
     - Play/pause music
     - Skip to next/previous track
     - Adjust volume
     - See current playing track with album art

3. **Minimize Player**
   - Click the down arrow to minimize the player
   - Click up arrow to expand it again
   - Music continues playing even when minimized

4. **Disconnect**
   - Click "Disconnect" to log out of Spotify
   - Your session will be saved and auto-reconnect on next call

## Technical Details

### Architecture

- **SpotifyService** (`src/services/SpotifyService.ts`) - Handles Spotify Web Playback SDK
- **SpotifyContext** (`src/contexts/SpotifyContext.tsx`) - Manages authentication and state
- **SpotifyPlayer** (`src/components/SpotifyPlayer.tsx`) - UI component
- **API Routes**:
  - `/api/spotify-auth` - OAuth token exchange and refresh
  - `/api/spotify-callback` - OAuth callback handler

### Permissions Required

The app requests these Spotify scopes:
- `streaming` - Play music through Web Playback SDK
- `user-read-email` - Read user email
- `user-read-private` - Read user profile
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Read current track

### Token Management

- **Access Token:** Valid for 1 hour, stored in localStorage
- **Refresh Token:** Used to get new access tokens automatically
- **Auto-refresh:** Tokens refresh automatically when expired

## Troubleshooting

### "Spotify authentication error"
- Make sure you're using a **Spotify Premium** account
- Check that redirect URIs in Spotify Dashboard match exactly
- Verify environment variables are set correctly

### "Player not ready"
- Refresh the page and try connecting again
- Check browser console for errors
- Make sure you have a stable internet connection

### "Failed to play track"
- Ensure you have Spotify Premium (not Free)
- Try playing from Spotify desktop/mobile app first
- Check if Spotify service is down

### Music not playing during call
- Spotify playback is local to your device only
- Other call participants won't hear your music
- Use screen share with audio if you want to share music

## Privacy & Security

- 🔒 All authentication happens through Spotify OAuth
- 🔑 Client secret is only used server-side (API routes)
- 💾 Tokens are stored locally in your browser
- 🎵 Music playback is personal - only you hear it
- 🔐 No music data is stored on our servers

## Limitations

- **Spotify Premium required** - Web Playback SDK only works with Premium
- **Browser compatibility** - Works best in Chrome, Firefox, Edge, Safari
- **Personal playback** - Only you hear the music, not other participants
- **Rate limits** - Spotify API has rate limits for searches/requests

## Advanced Features

### Sharing Music During Calls

If you want other participants to hear your music:
1. Use your browser's screen/tab sharing feature
2. Enable "Share audio" option when sharing
3. Share the Spotify tab

Note: This may affect call audio quality.

### Custom Playlists

You can modify the code to:
- Show user's playlists
- Save favorite tracks during calls
- Create call-specific playlists

See `SpotifyService.ts` for available API methods.

## Support

For issues related to:
- **Spotify API:** [Spotify Developer Forum](https://community.spotify.com/t5/Spotify-for-Developers/bd-p/Spotify_Developer)
- **This integration:** Open an issue in the project repository

## License

This integration uses Spotify Web Playback SDK which is subject to [Spotify's Developer Terms](https://developer.spotify.com/terms).

---

**Note:** Spotify Premium is required to use this feature. The free tier does not support Web Playback SDK.

