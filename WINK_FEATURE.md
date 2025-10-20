# 😉 Wink Detection Feature

## Overview
The wink detection feature adds fun, interactive emoji animations when participants wink during video calls. When someone winks, a floating 😉 emoji appears with a smooth animation.

## How It Works

### Detection Method
- Uses **MediaPipe Face Landmarker** to track facial blendshapes
- Detects when one eye is closed (blink score > 0.7) while the other is open (blink score < 0.3)
- Identifies which eye is winking (left or right)
- Throttles detection to prevent spam (minimum 500ms between winks)

### Real-time Synchronization
- Wink data is shared between participants via **LiveKit data channels**
- Low-latency, unreliable transport for smooth real-time updates
- Both local and remote winks are detected and displayed

### Visual Feedback
- **Local winks**: Small 😉 emoji appears near your video (bottom-right)
- **Remote winks**: Large 😉 emoji appears center screen over partner's video
- Smooth floating animation (scales, rotates, fades out over 2 seconds)
- Multiple winks can be on screen simultaneously

## Implementation Details

### Files Modified/Created

1. **`src/hooks/useEyeContactDetection.ts`**
   - Added `isWinking` and `winkEye` to return values
   - Wink detection thresholds:
     - Closed eye: > 0.7 blink score
     - Open eye: < 0.3 blink score

2. **`src/hooks/useLiveKitEyeContact.ts`**
   - Extended `GazeData` interface to include wink information
   - Extended `EyeContactState` to track local and remote winks
   - Wink data automatically shared via existing eye-contact data channel

3. **`src/components/LiveKitEyeContactOverlay.tsx`**
   - Added wink animation state management
   - Renders floating 😉 emojis for both local and remote winks
   - CSS keyframe animation for smooth float effect
   - Automatic cleanup after 2 seconds

4. **`src/app/test-eye-contact/page.tsx`**
   - Updated UI to mention wink feature
   - Added wink emoji to feature highlights

## Usage

### For Users
1. Join a video call with eye contact detection enabled
2. Wink at your camera
3. Your partner will see a floating 😉 emoji appear on their screen
4. When they wink, you'll see their wink emoji

### For Developers

The wink feature is automatically enabled when eye contact detection is active:

```tsx
import LiveKitVideoWithEyeContact from "@/components/LiveKitVideoWithEyeContact";

<LiveKitVideoWithEyeContact
  token={livekitToken}
  serverUrl={livekitServerUrl}
  roomName={roomName}
  onDisconnected={handleDisconnect}
/>
```

## Technical Specifications

### Detection Accuracy
- **MediaPipe Face Landmarker** provides robust facial tracking
- Works in various lighting conditions
- Requires frontal face visibility
- ~10 FPS detection rate (throttled for performance)

### Performance
- Minimal overhead (uses existing face detection pipeline)
- Lightweight animation (CSS-based)
- Efficient data channel usage (shares channel with eye contact data)

### Browser Compatibility
- Requires WebRTC support
- Requires camera access
- Works on modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers supported

## Animation Details

### Wink Float Animation
```css
@keyframes winkFloat {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0deg);
  }
  50% {
    transform: scale(1.3) translateY(-30px) rotate(10deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(-80px) rotate(-10deg);
  }
}
```

- Duration: 2 seconds
- Scales up to 1.3x, then down to 0.8x
- Floats upward 80px
- Rotates from 0° to 10° to -10°
- Fades out gradually

## Future Enhancements

Potential improvements:
- [ ] Different emoji options (configurable)
- [ ] Sound effects for winks
- [ ] Wink counter/statistics
- [ ] Double wink detection (both eyes)
- [ ] Wink pattern recognition (e.g., morse code)
- [ ] Custom positioning options
- [ ] Wink history/replay

## Testing

To test the wink feature:
1. Navigate to `/test-eye-contact`
2. Enter LiveKit credentials
3. Join from two devices/browsers
4. Wink at the camera
5. Verify emoji appears on partner's screen

## Troubleshooting

**Wink not detected:**
- Ensure camera is working
- Check lighting conditions
- Make sure face is clearly visible
- Try a more pronounced wink
- Check browser console for errors

**Emoji not appearing:**
- Verify data channel connection
- Check if eye contact overlay is enabled
- Ensure both participants are in the same room

**Too many/few detections:**
- Adjust `WINK_CLOSED_THRESHOLD` (default: 0.7)
- Adjust `WINK_OPEN_THRESHOLD` (default: 0.3)
- Modify throttle delay (default: 500ms)

## Credits

Built using:
- **MediaPipe Face Landmarker** - Face tracking and blendshapes
- **LiveKit** - WebRTC and data channels
- **React** - UI framework
- **Tailwind CSS** - Styling and animations


