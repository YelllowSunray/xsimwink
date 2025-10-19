# 📻 Radio Feature Implementation

## Overview
A synchronized radio player for video calls where all participants can control which station is playing.

## Features
✅ **8 Radio Stations** - One per genre (Electronic, Lofi, Jazz, Pop, Hip Hop, Rock, Classical, Latin)  
✅ **Synchronized Playback** - All callers hear the same station  
✅ **Anyone Can Control** - Any participant can change stations  
✅ **Volume Control** - Each user controls their own volume  
✅ **Works on All Devices** - iPhone, laptop, desktop, mobile  

## How It Works

### Technical Implementation
1. **Radio Stations** defined in `src/constants/radioStations.ts`
2. **State Management** in `CustomVideoUI` component
3. **Synchronization** via LiveKit data channels
4. **Audio Playback** via HTML5 `<audio>` element

### Data Flow
```
User A clicks station → 
Broadcasts via LiveKit data channel → 
User B receives message → 
User B's audio element plays same station
```

## Usage

### For Users
1. During a video call, click the **📻 Radio** button
2. Select any station from the list
3. Music plays for all participants
4. Anyone can change the station or stop playback

### Station Categories
- **💥 Electronic** - EDM Hits
- **🎧 Lofi** - Chill Lofi Beats
- **🎷 Jazz** - Smooth Jazz
- **🎤 Pop** - Top 40 Hits
- **🎤 Hip Hop** - Hip Hop Beats
- **🎸 Rock** - Classic Rock
- **🎻 Classical** - Classical Music
- **💃 Latin** - Latin Hits

## Code Structure

### Files Modified
- `src/constants/radioStations.ts` - Radio station definitions
- `src/components/VideoChatLiveKit.tsx` - UI and logic

### Key Functions
- `playRadioStation(url)` - Play a station and broadcast to others
- `stopRadio()` - Stop playback and notify others
- `changeRadioVolume(volume)` - Adjust volume and sync

### Data Channel
- **Topic**: `radio-control`
- **Message Format**: 
  ```json
  {
    "station": "https://stream.url",
    "playing": true,
    "volume": 0.5
  }
  ```

## UI Components

### Radio Button
- Located in video call controls
- Shows green pulse indicator when playing
- Opens radio panel on click

### Radio Panel
- Modal overlay with station list
- Current playing indicator
- Volume slider
- Stop button
- Info section

## Browser Compatibility
✅ Chrome / Edge / Brave  
✅ Safari (desktop & mobile)  
✅ Firefox  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  

## Notes
- Radio streams are HTTP/HTTPS audio streams
- No authentication required
- Free to use
- Direct audio playback (not through microphone)
- Low latency synchronization

