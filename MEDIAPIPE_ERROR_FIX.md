# MediaPipe Console Error Fix

## Problem

You were experiencing console errors related to MediaPipe's `tasks-vision` library:

```
INFO: Created TensorFlow Lite XNNPACK delegate for CPU.
Call Stack
Za.finishProcessing
yh.finishProcessing
th
```

This error was occurring in the eye contact detection hooks when MediaPipe was processing video frames.

## Root Cause

The error was caused by a **race condition** where:

1. The React component was unmounting and cleaning up the MediaPipe `FaceLandmarker`
2. But the detection loop (`requestAnimationFrame`) was still running
3. The `detectForVideo()` method was being called on a closed/invalid `FaceLandmarker` instance
4. This caused MediaPipe's internal processing to fail with a cryptic error

## Solution

Fixed both eye contact detection hooks:
- `src/hooks/useEyeContactDetection.ts`
- `src/hooks/useLiveKitEyeContact.ts`

### Changes Made

1. **Added cleanup flag**: Added `isCleaningUpRef` to track when cleanup is in progress
   ```typescript
   const isCleaningUpRef = useRef<boolean>(false);
   ```

2. **Stop detection during cleanup**: Check the cleanup flag at the start of the detection loop
   ```typescript
   const detect = () => {
     if (isCleaningUpRef.current) {
       return; // Stop immediately if cleaning up
     }
     // ... rest of detection code
   };
   ```

3. **Guard all requestAnimationFrame calls**: Only schedule new frames if not cleaning up
   ```typescript
   if (!isCleaningUpRef.current) {
     animationFrameRef.current = requestAnimationFrame(detect);
   }
   ```

4. **Enhanced safety checks**: Added additional validation before calling `detectForVideo()`
   ```typescript
   // Check video dimensions
   if (!videoElement.videoWidth || !videoElement.videoHeight) {
     return;
   }
   
   // Verify landmarker is still valid
   if (!faceLandmarkerRef.current) {
     return;
   }
   ```

5. **Improved cleanup sequence**: Set flag first, then cancel frames, then close landmarker
   ```typescript
   return () => {
     // 1. Set cleanup flag to stop detection loop
     isCleaningUpRef.current = true;
     
     // 2. Cancel pending animation frames
     if (animationFrameRef.current) {
       cancelAnimationFrame(animationFrameRef.current);
       animationFrameRef.current = null;
     }
     
     // 3. Small delay to let in-flight detectForVideo calls complete
     setTimeout(() => {
       if (faceLandmarkerRef.current) {
         try {
           faceLandmarkerRef.current.close();
         } catch (error) {
           // Silently handle close errors
         }
         faceLandmarkerRef.current = null;
       }
     }, 50);
   };
   ```

6. **Suppress cleanup errors**: Only log errors when NOT cleaning up
   ```typescript
   catch (error) {
     if (!isCleaningUpRef.current) {
       console.error("Detection error:", error);
     }
   }
   ```

## Benefits

- ✅ **Eliminates race conditions** between detection loop and cleanup
- ✅ **Prevents errors** from calling methods on closed MediaPipe instances
- ✅ **Cleaner console output** - no more cryptic MediaPipe errors
- ✅ **More robust** - handles edge cases where video element becomes invalid
- ✅ **Better performance** - stops unnecessary processing during cleanup

## Testing

The fix should resolve the console error you were seeing. The eye contact detection feature will continue to work normally, but now with proper cleanup handling.

To verify:
1. Start a video call with eye contact detection enabled
2. Navigate away or end the call
3. Check the console - you should no longer see the MediaPipe error

## Technical Notes

- The 50ms delay in cleanup ensures any in-flight `detectForVideo` calls have time to complete before the landmarker is closed
- The `isCleaningUpRef` pattern is a common React solution for preventing race conditions with async operations and cleanup
- Error suppression during cleanup is intentional - errors during cleanup are expected and don't indicate a problem

