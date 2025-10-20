# LiveKit iOS Black Screen Fix

## Problem Fixed
When calling from iPhone to laptop using LiveKit, the screen stays black due to iOS Safari autoplay restrictions and video constraint issues.

## Root Causes Identified & Fixed

### 1. LiveKitRoom Configuration Issue
**Problem**: `LiveKitRoom` was configured with `video={false}` and `audio={false}`, preventing automatic media publishing.

**Fix**: Changed to `video={true}` and `audio={true}` with iOS-optimized options:
```tsx
<LiveKitRoom
  video={true}
  audio={true}
  token={token}
  serverUrl={serverUrl}
  connect={true}
  onDisconnected={handleDisconnect}
  style={{ height: "100vh" }}
  options={{
    // iOS-specific options
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
      videoSimulcastLayers: [
        { resolution: VideoPresets.h90, encoding: { maxBitrate: 100_000 } },
        { resolution: VideoPresets.h180, encoding: { maxBitrate: 300_000 } },
        { resolution: VideoPresets.h360, encoding: { maxBitrate: 500_000 } }
      ],
      videoCodec: 'h264', // Better iOS compatibility
    },
    // iOS Safari compatibility
    webRtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }}
>
```

### 2. Video Constraints Too Restrictive
**Problem**: Fixed `{ width: 1280, height: 720 }` constraints don't work on all iOS devices.

**Fix**: iOS-compatible constraints with flexible dimensions:
```tsx
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const videoConstraints = isIOS 
  ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
  : { width: 1280, height: 720 };
```

### 3. Missing iOS-Specific VideoTrack Attributes
**Problem**: VideoTrack components lacked iOS-specific attributes for autoplay handling.

**Fix**: Added proper iOS attributes to VideoTrack:
```tsx
<VideoTrack
  trackRef={videoTrack}
  style={{ 
    width: "100%", 
    height: "100%", 
    objectFit: isMainFeed ? "contain" : "contain",
    transform: isSelf ? (visualEffect === 'mirror' ? "scaleX(-1) scaleY(-1)" : "scaleX(-1)") : undefined,
    filter: isSelf ? getVisualEffectCSS(visualEffect) : 'none'
  }}
  // iOS-specific attributes
  autoPlay={true}
  playsInline={true}
  muted={isSelf}
  controls={false}
  onPlay={() => {
    console.log('✅ VideoTrack started playing');
  }}
  onError={(e) => {
    console.error('❌ VideoTrack error:', e);
  }}
  onLoadedMetadata={() => {
    console.log('✅ VideoTrack metadata loaded');
  }}
/>
```

### 4. iOS Safari Autoplay Restrictions
**Problem**: iOS Safari blocks video autoplay without user gesture.

**Fix**: Added user gesture detection and "Tap to Start Video" button:
```tsx
// iOS-specific state for user gesture handling
const [needsUserGesture, setNeedsUserGesture] = useState(false);
const [isIOS, setIsIOS] = useState(false);

// Monitor video elements for iOS autoplay issues
React.useEffect(() => {
  if (!isIOS) return;

  const checkVideoPlayback = () => {
    const videos = document.querySelectorAll('video');
    let hasPausedVideos = false;
    
    videos.forEach((video, index) => {
      console.log(`Video ${index}: paused=${video.paused}, readyState=${video.readyState}, srcObject=${!!video.srcObject}`);
      
      if (video.srcObject && video.paused && video.readyState >= 2) {
        hasPausedVideos = true;
      }
    });
    
    if (hasPausedVideos && !needsUserGesture) {
      console.log('⚠️ iOS: Detected paused videos, showing user gesture button');
      setNeedsUserGesture(true);
    }
  };

  // Check immediately and then periodically
  checkVideoPlayback();
  const interval = setInterval(checkVideoPlayback, 2000);

  return () => clearInterval(interval);
}, [isIOS, needsUserGesture]);
```

### 5. User Gesture UI
**Fix**: Added iOS-specific user gesture overlay:
```tsx
{/* iOS User Gesture Overlay */}
{isIOS && needsUserGesture && (
  <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
    <div className="text-center">
      <div className="text-white text-xl mb-4">📱 iOS Video Playback</div>
      <p className="text-gray-300 mb-6">Tap to start the video stream</p>
      <button
        onClick={async () => {
          try {
            // Try to play all video elements
            const videos = document.querySelectorAll('video');
            for (const video of videos) {
              if (video.paused) {
                await video.play();
              }
            }
            setNeedsUserGesture(false);
            console.log('✅ Video started after user gesture');
          } catch (error) {
            console.error('❌ Failed to play video:', error);
          }
        }}
        className="px-8 py-4 bg-pink-600 text-white rounded-lg font-semibold shadow-lg hover:bg-pink-700 transition"
      >
        ▶️ Tap to Start Video
      </button>
    </div>
  </div>
)}
```

## Files Modified

- `src/components/VideoChatLiveKit.tsx` - Main LiveKit component with iOS fixes

## Testing Instructions

### On iPhone:
1. **Use Safari** (not Chrome) - iOS Safari has better WebRTC support
2. Navigate to your app
3. Start a call to laptop
4. **Look for "Tap to Start Video" button** - This is normal iOS behavior
5. Tap the button to start video playback
6. Check browser console for debug logs

### On Laptop:
1. Open Chrome/Firefox
2. Check browser console for LiveKit connection logs
3. Look for video track publishing/playing messages
4. Verify you can see iPhone's video

## Debug Information

The fixes include comprehensive logging:
- `📱 Device detection: iOS = true/false`
- `VideoTrack started playing`
- `VideoTrack metadata loaded`
- `VideoTrack error:` (if any)
- `⚠️ iOS: Detected paused videos, showing user gesture button`

## Common Issues & Solutions

### Issue: "Tap to Start Video" button appears
**Solution**: This is expected on iOS Safari. Tap the button to start video playback.

### Issue: Local video shows but remote is black
**Solution**: Check if remote device (iPhone) has granted camera permissions and is using Safari.

### Issue: Both videos are black
**Solution**: Check camera permissions on both devices. iOS requires explicit permission.

### Issue: Connection shows "connected" but no video
**Solution**: Check LiveKit token generation and room setup. Look for errors in browser console.

## Browser Console Logs to Check

Look for these log messages:
- `📱 Device detection: iOS = true`
- `✅ LiveKit token received`
- `📹 Publishing camera and microphone...`
- `✅ Camera published`
- `✅ Microphone published`
- `VideoTrack started playing`
- `⚠️ iOS: Detected paused videos, showing user gesture button`

## Additional Troubleshooting

### If still having issues:

1. **Check HTTPS**: iOS requires HTTPS for camera access
2. **Clear Safari Cache**: Settings > Safari > Clear History and Website Data
3. **Restart Safari**: Close and reopen Safari
4. **Check Permissions**: Settings > Safari > Camera (should be "Allow")
5. **Try Different Network**: Switch between WiFi and cellular

### For Developers:

1. **Check LiveKit Credentials**: Verify `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL`
2. **Monitor Console Logs**: Look for LiveKit connection and video track errors
3. **Test Token Generation**: Verify `/api/livekit-token` endpoint works
4. **Check Room Creation**: Ensure rooms are created properly

## Key Differences from WebRTC Fix

This LiveKit fix is different from the basic WebRTC fix because:

1. **LiveKit handles signaling** - No need for custom WebRTC signaling
2. **Automatic media publishing** - LiveKitRoom handles track publishing
3. **Built-in TURN servers** - LiveKit provides TURN infrastructure
4. **VideoTrack components** - Uses LiveKit's VideoTrack instead of raw video elements
5. **Room-based architecture** - Participants join rooms instead of direct peer connections

## Next Steps

1. Test the fixes on iPhone Safari
2. Check if "Tap to Start Video" appears
3. Verify video plays after tapping
4. Check debug logs for any remaining issues
5. Report any persistent problems with specific error messages

The most likely solution is that iOS Safari will now show a "Tap to Start Video" button when autoplay is blocked. This is normal iOS behavior and the user just needs to tap it to start the video stream.

