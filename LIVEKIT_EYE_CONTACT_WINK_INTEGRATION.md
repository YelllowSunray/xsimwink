# LiveKit Eye Contact & Wink Detection Integration

## ✅ Integration Complete!

I've successfully integrated **eye contact detection** and **wink detection** into your main LiveKit video chat component (`VideoChatLiveKit.tsx`).

## What Was Added:

### 1. **Eye Contact & Wink Detection Overlay**
- Added `LiveKitEyeContactOverlay` component to the 1-on-1 video chat
- Detects when both users are looking at the camera (making eye contact)
- Shows animated heart effect when mutual eye contact occurs
- Detects winks from both local and remote participants
- Shows animated wink effects (😉) when someone winks

### 2. **Video Element References**
- Added `localVideoRef` and `remoteVideoRef` to track video elements
- Automatically attaches refs when video tracks start playing
- Uses `onVideoPlayingChange` callback to get actual video elements from LiveKit

### 3. **MediaPipe Face Detection**
- Uses `useLiveKitEyeContact` hook which leverages MediaPipe Face Landmarker
- Detects:
  - Gaze direction (where user is looking)
  - Eye openness (for wink detection)
  - Face landmarks for accurate tracking
- Runs at ~10 FPS for good performance
- Uses data channels to share eye contact/wink data between participants

### 4. **Wink Detection**
Two methods for wink detection:
- **Method 1**: MediaPipe Blendshapes (preferred)
  - Uses `eyeBlinkLeft` and `eyeBlinkRight` blend shapes
  - More accurate and reliable
- **Method 2**: Eye Aspect Ratio (EAR) fallback
  - Uses face landmarks to calculate eye openness
  - Backup method if blendshapes aren't available

### 5. **Temporal Wink Validation**
- Wink must last 150ms-800ms to be valid
- Prevents false positives from normal blinking
- Rate-limited to prevent spam (max 1 wink per 800ms)

## Files Modified:

### `src/components/VideoChatLiveKit.tsx`
- Added import for `LiveKitEyeContactOverlay`
- Added video refs: `localVideoRef`, `remoteVideoRef`
- Added `eyeContactEnabled` state (default: true)
- Attached refs to VideoTrack components via `onVideoPlayingChange`
- Added overlay component to render tree

### `src/hooks/useLiveKitEyeContact.ts`
- Added missing `calculateEAR` function for EAR-based wink detection
- Already had comprehensive eye contact and wink detection logic

## How It Works:

### Eye Contact Detection:
1. MediaPipe detects face landmarks in local video
2. Calculates gaze direction from iris/pupil position
3. Determines if user is looking at camera (center of screen)
4. Shares gaze data with remote participant via LiveKit data channel
5. When both users look at camera → **Mutual eye contact!** ❤️

### Wink Detection:
1. Detects eye closure using blendshapes or EAR
2. Tracks wink duration (must be 150ms-800ms)
3. Validates that only one eye is closed (not both = blink)
4. Shares wink events with remote participant
5. Shows animated wink effect on UI

## What You'll See:

### 1. **Mutual Eye Contact**
When both participants look at the camera:
- Animated pink/purple heart in center of screen
- "Eye Contact" text appears
- Pulsing glow effect
- Duration counter (how long you've been making eye contact)

### 2. **Wink Effects**
When someone winks:
- Animated wink emoji (😉) appears
- Shows which eye was winked (left or right)
- Particle effects
- Visible to both participants

### 3. **Console Logs**
You'll see detailed logs:
- `✅ Local video ref attached for eye contact`
- `✅ Remote video ref attached for eye contact`
- `🚀 Starting MediaPipe initialization...`
- `✅ MediaPipe FaceLandmarker initialized successfully!`
- `😉 LEFT WINK started!`
- `😉✅ CONFIRMED WINK!`
- `📤 Sending wink data`
- `📥 Received wink data`

## Testing:

1. **Start a video call** between two devices/browsers
2. **Look at the camera** on both devices
   - You should see the heart effect appear
3. **Try winking** (close one eye for ~300ms)
   - You should see the wink animation
   - Check console for wink detection logs

## Debug Mode:

To see debug info overlay, change:
```tsx
<LiveKitEyeContactOverlay
  localVideoRef={localVideoRef}
  remoteVideoRef={remoteVideoRef}
  enabled={true}
  showDebugInfo={true}  // Change to true
/>
```

This shows:
- Local gaze position
- Remote gaze position
- Eye contact status
- Wink detection values
- Raw blink scores

## Troubleshooting:

### "No video ref attached" in console
- Wait a few seconds for videos to load
- Check that video tracks are being published successfully

### "MediaPipe initialization failed"
- Check internet connection (loads from CDN)
- Check browser console for specific errors

### Winks not detecting
- Make sure you're closing one eye for at least 150ms
- Try closing eye more definitively
- Check console logs for blink values
- Enable debug mode to see raw scores

### Eye contact not working
- Both users must look directly at their camera
- Lighting should be good (face needs to be visible)
- Face should be clearly visible to camera

## Performance:

- Runs at ~10 FPS (good balance of accuracy and performance)
- Uses GPU acceleration for MediaPipe
- Data channels use unreliable transport for low latency
- Minimal impact on video call quality

## Features:

✅ Mutual eye contact detection
✅ Eye contact duration tracking
✅ Wink detection (left and right eye)
✅ Real-time synchronization between participants
✅ Beautiful animated effects
✅ Fallback detection methods
✅ Temporal validation (prevents false positives)
✅ Debug mode for troubleshooting
✅ Works with LiveKit's video architecture

## Next Steps:

The integration is complete! Now when you start a LiveKit call:
1. MediaPipe will automatically initialize
2. Eye contact detection will start
3. Wink detection will be active
4. Effects will appear when triggered

**Try it out and enjoy the interactive effects!** 😉❤️
