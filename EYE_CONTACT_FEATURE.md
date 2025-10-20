# Eye Contact Detection Feature

## Overview

This feature adds real-time eye contact detection to video calls using MediaPipe FaceMesh and gaze estimation. When both participants are looking at their cameras simultaneously, a beautiful heart animation appears on screen.

## How It Works

### 1. Gaze Vector Estimation

The system uses **pupil landmark-based gaze estimation**:

```
1. Detect iris/pupil centers (MediaPipe landmarks 468, 473)
2. Detect eye corners (landmarks 33, 133, 362, 263)
3. Calculate eye center (midpoint between corners)
4. Calculate pupil offset from eye center
5. Normalize offset by eye width
6. Calculate gaze vector magnitude
```

**Algorithm:**
```typescript
pupilOffset = (irisCenter - eyeCenter) / eyeWidth
gazeVector = (leftPupilOffset + rightPupilOffset) / 2
gazeDistance = sqrt(gazeVector.x² + gazeVector.y²)
```

**Thresholds:**
- Looking at camera: gazeDistance < 0.15
- Looking away: gazeDistance > 0.25
- Confidence drops linearly in between

### 2. Multi-Factor Detection

The system combines three factors for robust detection:

| Factor | Weight | Purpose |
|--------|--------|---------|
| **Gaze Direction** | 60% | Primary indicator - are pupils centered? |
| **Eye Openness** | 25% | Must have eyes open to make eye contact |
| **Head Orientation** | 15% | Face should be relatively frontal |

**Final Confidence Score:**
```
confidence = (gazeCenterConfidence × 0.60) + 
             (eyeOpennessConfidence × 0.25) + 
             (headTiltConfidence × 0.15)

isLookingAtCamera = confidence > 0.60
```

### 3. Peer-to-Peer Synchronization

Eye contact status is shared via WebRTC Data Channel:

```
Local Detection → WebRTC Data Channel → Remote Peer
     ↓                                      ↓
Your Status ←────── Combined Logic ──────→ Partner Status
                           ↓
                  Both Looking? → Show Heart ❤️
```

## Technical Implementation

### Files Modified/Created

1. **`src/hooks/useEyeContactDetection.ts`** - Core detection hook
   - Face landmark detection using MediaPipe
   - Gaze vector calculation
   - Confidence scoring

2. **`src/services/WebRTCService.ts`** - Data channel communication
   - Added `sendEyeContactStatus()` method
   - Added `onEyeContactData` callback
   - Real-time status synchronization

3. **`src/components/VideoChat.tsx`** - UI integration
   - Visual indicators in top bar (👁️ You/Them)
   - Center screen heart animation when both looking
   - Status tracking and state management

### Performance Optimizations

- **Detection Rate:** 10 FPS (100ms intervals) - balance between accuracy and CPU usage
- **GPU Acceleration:** MediaPipe uses GPU when available
- **Data Channel:** Unreliable transmission (no retransmits) for low latency
- **Throttled Updates:** Only send status changes, not continuous stream

### MediaPipe Face Landmarks Used

```
Landmark Index | Description
---------------|-------------
33             | Left eye outer corner
133            | Left eye inner corner
362            | Right eye outer corner
263            | Right eye inner corner
468            | Left iris center (pupil)
473            | Right iris center (pupil)
168            | Face center (between eyes)
```

## Visual Indicators

### 1. Top Bar Status
```
Connected: 👁️ You / Them
            ↓       ↓
          Green  Green  = Both making eye contact
          Green  Gray   = Only you looking
          Gray   Green  = Only they're looking
          Gray   Gray   = Neither looking
```

### 2. Center Heart Animation
- **Trigger:** Both participants looking at camera
- **Animation:** Pulsing pink/purple gradient heart with glow effect
- **Text:** "Eye Contact" label below heart
- **Duration:** Continuous while both maintain eye contact

## Configuration Options

### Sensitivity Tuning

You can adjust detection sensitivity in `useEyeContactDetection.ts`:

```typescript
// Line 124: Gaze distance threshold
const gazeCenterConfidence = Math.max(0, 1 - (gazeDistance / 0.2));
// Increase 0.2 → more lenient (easier to trigger)
// Decrease 0.2 → more strict (harder to trigger)

// Line 156: Overall confidence threshold
const isLooking = overallConfidence > 0.60;
// Lower 0.60 → easier to detect eye contact
// Higher 0.60 → more precise detection required
```

### Detection Rate

```typescript
// Line 177: Detection throttle
if (now - lastDetectionTime.current < 100) {
// Increase 100ms → slower detection, better performance
// Decrease 100ms → faster detection, more CPU usage
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge | ✅ Full | Best performance with GPU acceleration |
| Firefox | ✅ Full | Good performance |
| Safari | ✅ Full | iOS 15+ required for MediaPipe |
| Opera | ✅ Full | Chromium-based, full support |

## Privacy & Security

- ✅ **No data sent to external servers** - All processing happens locally
- ✅ **No recording of gaze data** - Only real-time detection
- ✅ **Peer-to-peer only** - Status shared directly between participants
- ✅ **No storage** - Eye contact data is not saved or logged

## Troubleshooting

### Eye contact not detecting

1. **Ensure good lighting** - Face must be clearly visible
2. **Look directly at camera** - Not at the screen where partner's face appears
3. **Keep face frontal** - Avoid extreme head tilts
4. **Open eyes** - System won't detect if eyes are closed or squinting

### False positives

- Increase confidence threshold (line 156)
- Decrease gaze distance divisor (line 124)
- Add minimum duration requirement before triggering

### Performance issues

- Increase detection throttle from 100ms to 200ms
- Disable detection on lower-end devices
- Check GPU acceleration is enabled

## Future Enhancements

Possible improvements:

1. **Eye contact duration tracking** - Show total time making eye contact
2. **Eye contact quality score** - Rate the overall connection quality
3. **Calibration mode** - Let users calibrate for their setup
4. **3D gaze estimation** - More accurate using depth information
5. **Multiple face support** - For group calls (requires changes)
6. **Eye contact history graph** - Visualize patterns over time

## Dependencies

```json
{
  "@mediapipe/tasks-vision": "^latest" // Face mesh detection
}
```

**CDN Resources:**
- WASM files: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm`
- Model: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`

## Credits

- **MediaPipe** by Google - Face landmark detection
- **WebRTC Data Channels** - Real-time peer communication
- **Face Mesh Iris Model** - High-precision iris tracking

## License

Part of the XOXO video chat application.

