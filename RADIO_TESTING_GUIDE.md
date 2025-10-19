# 📻 Radio Feature Testing Guide

## Quick Test Checklist

### Setup (2 devices needed)
1. Open the app on **Device A** (laptop)
2. Open the app on **Device B** (iPhone or another laptop)
3. Start a video call between them

### Test 1: Basic Playback
1. On **Device A**, click the **📻 Radio** button
2. Select any station (e.g., "Chill Lofi Beats")
3. ✅ **Expected**: Music should play on Device A
4. ✅ **Expected**: Device B should also start playing the same station
5. ✅ **Expected**: Green pulse indicator shows on radio button

### Test 2: Station Control from Other Device
1. On **Device B**, click the **📻 Radio** button
2. Select a different station (e.g., "Smooth Jazz")
3. ✅ **Expected**: Both devices switch to the new station
4. ✅ **Expected**: "Now Playing" section updates on both devices

### Test 3: Volume Control
1. On **Device A**, adjust the volume slider
2. ✅ **Expected**: Volume changes only on Device A
3. On **Device B**, adjust the volume slider
4. ✅ **Expected**: Volume changes only on Device B
5. ✅ **Expected**: Both still hear the same station

### Test 4: Stop Playback
1. On either device, click "⏹️ Stop Radio"
2. ✅ **Expected**: Music stops on both devices
3. ✅ **Expected**: Green indicator disappears
4. ✅ **Expected**: "Now Playing" section disappears

### Test 5: Multiple Station Changes
1. Device A: Play "Electronic"
2. Device B: Play "Jazz"
3. Device A: Play "Pop"
4. ✅ **Expected**: Each change immediately affects both devices
5. ✅ **Expected**: Last action wins (no conflicts)

### Test 6: Panel UI
1. Open radio panel
2. ✅ **Expected**: See 8 stations listed
3. ✅ **Expected**: Each has emoji, name, and genre
4. ✅ **Expected**: Active station is highlighted
5. ✅ **Expected**: Close button works

### Test 7: Connection Resilience
1. Play a station
2. Temporarily lose internet (airplane mode for 5 seconds)
3. Reconnect
4. ✅ **Expected**: Radio continues playing
5. ✅ **Expected**: Sync resumes when reconnected

## Troubleshooting

### Issue: No sound on one device
**Solution**: Check device volume, unmute, check browser audio permissions

### Issue: Stations not syncing
**Solution**: Refresh both pages, ensure both are in the same call

### Issue: Stream won't load
**Solution**: Try a different station (some streams may be temporarily down)

### Issue: Linter errors about publishData
**Solution**: These are false positives. The code uses the correct format:
```typescript
room?.localParticipant?.publishData(data, { 
  reliable: true,
  topic: 'radio-control'
});
```

## Browser Console Logs

Look for these messages:
- `📻 Radio control received:` - Sync message received
- `Radio stream error:` - Stream loading issue
- `Radio playback error:` - Playback issue

## Performance Notes
- Radio streams use ~128kbps bandwidth
- Does not affect video call quality
- Audio plays directly (not through microphone)
- No additional server costs

## Success Criteria
✅ Both devices can play stations  
✅ Changes sync within 1-2 seconds  
✅ Volume is independent per device  
✅ Works on iPhone and laptop  
✅ UI is responsive and clear  
✅ No audio feedback loops  

