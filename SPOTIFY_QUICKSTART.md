# Spotify Integration - Quick Start Guide

## 🎵 What's New

Your video calling app now supports Spotify Premium integration! Users can play music during video calls with full playback controls.

## ⚡ Quick Setup (5 minutes)

### 1. Get Spotify Credentials

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/spotify-callback`
4. Copy your **Client ID** and **Client Secret**

### 2. Add Environment Variables

Create `.env.local` in your project root:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify-callback
```

### 3. Restart Dev Server

```bash
npm run dev
```

## 🎮 How to Use

1. **Start a video call** with any user
2. **Look for the Spotify player** in the top-right corner
3. **Click "Connect"** and log in with Spotify Premium
4. **Search and play** your favorite music!

## 📦 What Was Added

### New Files Created:
- ✅ `src/services/SpotifyService.ts` - Spotify SDK integration
- ✅ `src/contexts/SpotifyContext.tsx` - Authentication & state management
- ✅ `src/components/SpotifyPlayer.tsx` - Player UI component
- ✅ `src/app/api/spotify-auth/route.ts` - OAuth token handling
- ✅ `src/app/api/spotify-callback/route.ts` - OAuth callback
- ✅ `src/types/spotify.d.ts` - TypeScript definitions
- ✅ `SPOTIFY_INTEGRATION.md` - Full documentation

### Files Modified:
- ✅ `src/app/layout.tsx` - Added SpotifyProvider
- ✅ `src/components/VideoChatLiveKit.tsx` - Integrated player UI
- ✅ `package.json` - Added Spotify SDK types

## ✨ Features

- 🎵 Play any song from Spotify's catalog
- 🎮 Full playback controls (play, pause, skip, volume)
- 🔍 Search for songs
- 🎨 Beautiful UI with album art
- 📱 Works on desktop and mobile
- 🔄 Automatic token refresh
- 💾 Session persistence

## 🚀 Production Deployment

When deploying to production:

1. Add production redirect URI in Spotify Dashboard:
   ```
   https://yourdomain.com/api/spotify-callback
   ```

2. Update environment variable:
   ```env
   NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://yourdomain.com/api/spotify-callback
   ```

## 📝 Important Notes

- ⚠️ **Spotify Premium required** - Free accounts won't work
- 🎧 Music is personal - only you hear it (not other call participants)
- 🔒 All authentication is secure via Spotify OAuth
- 💾 Tokens stored locally in browser

## 🔧 Troubleshooting

**"Player not ready"**
- Refresh the page and reconnect
- Check browser console for errors

**"Authentication error"**
- Verify you're using Spotify Premium
- Check redirect URIs match exactly
- Verify environment variables are correct

**Music not playing**
- Ensure Spotify Premium is active
- Try playing from Spotify app first
- Check internet connection

## 📖 Full Documentation

See `SPOTIFY_INTEGRATION.md` for complete documentation including:
- Detailed setup instructions
- Technical architecture
- API reference
- Advanced features
- Security details

## 🎉 That's It!

You're all set! Start a video call and enjoy music while chatting!

---

**Questions?** Check `SPOTIFY_INTEGRATION.md` or open an issue.

