# Eye Contact Detection - Troubleshooting Guide

## 🐛 Fixed Issue

**Bug Found:** The `GazeData` return type was missing `isWinking` and `winkEye` properties when no face was detected. This has been fixed!

---

## ✅ Quick Checklist

### 1. Is the Dev Server Running?

```bash
# The server should be running on:
http://localhost:3000
```

Check your terminal for:
```
✓ Ready in [X]ms
○ Local:   http://localhost:3000
```

### 2. Can You Access the Test Page?

Navigate to:
```
http://localhost:3000/test-eye-contact
```

You should see a purple/pink gradient page with a form.

### 3. Do You Have LiveKit Credentials?

You need:
- ✅ LiveKit server URL (e.g., `wss://your-project.livekit.cloud`)
- ✅ Valid access token

**Don't have credentials?** Get them from:
- [LiveKit Cloud Dashboard](https://cloud.livekit.io/)
- Or set up a local LiveKit server

---

## 🔍 Common Issues & Solutions

### Issue 1: "Eye contact not detecting"

**Symptoms:** Green indicators never appear, no heart animation

**Solutions:**

1. **Check Camera Permissions**
   - Browser should ask for camera access
   - Check browser's site settings (🔒 icon in address bar)
   - Allow camera access for localhost

2. **Check Lighting**
   - Face must be well-lit and clearly visible
   - Avoid backlighting or very dark rooms
   - MediaPipe needs to see your face clearly

3. **Check Console for Errors**
   - Press F12 to open DevTools
   - Look in Console tab for red errors
   - Common errors:
     - `Failed to initialize face landmarker` → MediaPipe loading issue
     - `Camera not accessible` → Permission issue
     - `Room connection failed` → LiveKit connection issue

4. **Look at the Camera, Not the Screen!**
   - This is crucial! Look directly at your camera
   - The camera is usually at the top of your screen
   - Don't look at where the other person's face appears

5. **Enable Debug Mode**
   - In the LiveKit component, there's a debug button (ℹ️ icon)
   - Or modify the code to show debug info by default
   - Check the gaze coordinates in the debug panel

### Issue 2: "Can't join the call"

**Symptoms:** Stuck on form, doesn't enter call

**Solutions:**

1. **Check All Fields Are Filled**
   - Server URL must start with `wss://`
   - Room name can be anything
   - Token must be valid (not expired)

2. **Verify LiveKit Token**
   ```bash
   # Token should be a long JWT string
   # It should NOT be expired
   ```

3. **Check Network Connection**
   - LiveKit requires internet connection
   - Check firewall isn't blocking WebSocket connections
   - Try a different network if issues persist

### Issue 3: "MediaPipe not loading"

**Symptoms:** Console error: "Failed to initialize face landmarker"

**Solutions:**

1. **Check Internet Connection**
   - MediaPipe downloads models from CDN (~50MB)
   - Requires stable connection for first load
   - Models are cached after first load

2. **Try Different Browser**
   - Chrome/Edge: Best support ✅
   - Firefox: Good support ✅
   - Safari: Limited support (iOS 15+ required) ⚠️

3. **Clear Cache and Reload**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

### Issue 4: "Remote person's status not updating"

**Symptoms:** Can see your own status, but not theirs

**Solutions:**

1. **Check LiveKit Connection**
   - Both users must be in the same room
   - Check participant count in UI (should show "2 people")
   - Verify DataChannel is open (check console logs)

2. **Look for Console Messages**
   ```
   📤 Sending wink data: [eye]
   📥 Received wink data: [eye]
   ```
   - If you see 📤 but not 📥, connection issue
   - If you see neither, face detection not working

3. **Try Refreshing Both Browsers**
   - Sometimes WebRTC connection needs reset
   - Both users should refresh and rejoin

### Issue 5: "Wink detection not working"

**Symptoms:** Eye contact works, but winks not detected

**Solutions:**

1. **Make Exaggerated Winks**
   - Close one eye COMPLETELY
   - Keep other eye WIDE OPEN
   - Hold for 0.5-1 second
   - The thresholds are: closed > 0.65, open < 0.4

2. **Check Debug Panel**
   ```
   👁️ Blink values - Left: 0.05, Right: 0.03  (both eyes open)
   👁️ Blink values - Left: 0.85, Right: 0.03  (left eye closed = wink!)
   ```

3. **Adjust Thresholds** (if needed)
   In `useLiveKitEyeContact.ts`, around line 254:
   ```typescript
   const WINK_CLOSED_THRESHOLD = 0.65; // Lower = easier to trigger
   const WINK_OPEN_THRESHOLD = 0.4;    // Higher = easier to trigger
   ```

---

## 🧪 Step-by-Step Testing

### Test 1: Basic Face Detection

1. Open browser DevTools (F12)
2. Go to `/test-eye-contact`
3. Join a call (with or without partner)
4. Look for console messages:
   ```
   📷 MediaPipe initialized
   👁️ Gaze: {gazeDistance: 0.123, ...}
   ```
5. ✅ If you see these, face detection is working!

### Test 2: Eye Contact Detection

1. Enable debug mode (click ℹ️ button in call)
2. Look directly at your camera
3. Check debug panel:
   ```
   Local:
     Gaze: (0.05, -0.12)  ← Should be close to (0, 0)
     Looking: ✅           ← Should be checkmark
   ```
4. ✅ If "Looking: ✅" appears, detection works!

### Test 3: Mutual Eye Contact

1. Join from 2 devices/browsers
2. Both people look at their cameras
3. You should see:
   - Both status indicators green
   - Heart animation appears: 👁️❤️👁️
   - Duration counter starts
4. ✅ If heart appears, mutual detection works!

### Test 4: Wink Detection

1. Join a call with debug mode enabled
2. Wink your left eye
3. Check console for:
   ```
   😉 LEFT WINK detected! Left: 0.87, Right: 0.03
   📤 Sending wink data: left eye
   ```
4. Check screen for floating 😉 emoji
5. ✅ If emoji appears, wink detection works!

---

## 🔧 Debug Mode

To enable permanent debug mode, edit `LiveKitVideoWithEyeContact.tsx`:

```typescript
<LiveKitEyeContactOverlay
  localVideoRef={localRef}
  remoteVideoRef={remoteRef}
  enabled={true}
  showDebugInfo={true}  // Change this to true
/>
```

Debug panel shows:
- Exact gaze coordinates
- Confidence percentages
- Eye openness values
- Wink detection values
- Data freshness (age in ms)

---

## 📊 What the Numbers Mean

### Gaze Coordinates
- `gazeX, gazeY`: Range from -1 to 1
- `(0, 0)`: Looking at center (camera)
- `(-1, 0)`: Looking left
- `(1, 0)`: Looking right
- `(0, -1)`: Looking up
- `(0, 1)`: Looking down

### Eye Contact Threshold
- Looking at center: `abs(gazeX) < 0.3 && abs(gazeY) < 0.3`
- Example: `(0.05, -0.12)` ✅ Eye contact
- Example: `(0.45, 0.20)` ❌ Not eye contact

### Confidence
- 0.0 - 0.6: Not looking ❌
- 0.6 - 1.0: Looking ✅
- Combines: gaze direction (60%), eye openness (25%), head tilt (15%)

### Wink Values
- Eye open: 0.0 - 0.3
- Partially closed: 0.3 - 0.6
- Fully closed: 0.6 - 1.0
- Wink detected when: one eye > 0.65, other < 0.4

---

## 🚑 Emergency Reset

If nothing works:

```bash
# 1. Kill the server
# Press Ctrl+C in the terminal running npm run dev

# 2. Clear Next.js cache
rm -rf .next

# 3. Reinstall dependencies (if needed)
npm install

# 4. Restart dev server
npm run dev

# 5. Hard refresh browser
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)

# 6. Clear browser cache and reload
```

---

## 📞 Still Not Working?

### Check Console Logs

Look for these specific messages:

**✅ Good Signs:**
```
📷 MediaPipe initialized
👁️ Gaze: {gazeDistance: 0.123}
📡 Data channel opened
✅ Room connected
```

**❌ Bad Signs:**
```
❌ Failed to initialize face landmarker
❌ Camera not accessible
❌ Room connection failed
❌ Data channel error
```

### Common Console Errors

1. **`getUserMedia` failed**
   - Camera permission denied
   - Camera in use by another app
   - No camera connected

2. **`WebSocket connection failed`**
   - Invalid LiveKit server URL
   - Network/firewall blocking connection
   - LiveKit server down

3. **`Failed to load MediaPipe model`**
   - Internet connection issue
   - CDN blocked by network
   - Browser incompatibility

---

## 🎯 Expected Behavior

### When Working Correctly:

1. **Joining Call:**
   - Camera permission prompt
   - See your own video (mirrored)
   - Status shows "You: 👁️ Looking" or "Away"

2. **With Partner:**
   - See both video feeds
   - Status shows both participants
   - Looking at camera → green indicator
   - Looking away → gray indicator

3. **Eye Contact:**
   - Both look at camera
   - Heart animation appears: 👁️❤️👁️
   - Duration counter increments
   - Milestone badges at 3s, 5s, 10s

4. **Winking:**
   - Wink at camera
   - See 😉 emoji float up
   - Partner sees emoji on their screen
   - Console logs wink detection

---

## 💡 Pro Tips

1. **Best Lighting:** Face the light source (window/lamp)
2. **Camera Position:** Eye level, 1-2 feet away
3. **Look at Camera:** Top center of screen, not at their face
4. **Wink Clearly:** Close one eye completely, keep other wide open
5. **Be Patient:** MediaPipe model takes 2-5 seconds to load first time

---

## 🔗 Resources

- LiveKit Docs: https://docs.livekit.io/
- MediaPipe FaceMesh: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
- Project Docs: See `LIVEKIT_EYE_CONTACT_GUIDE.md`

---

**Last Updated:** After fixing missing wink properties bug

**Server Status:** Check `http://localhost:3000` to confirm it's running!

