# Recording System Fixes

## Issues Resolved

### 1. **Invalid Storage URLs (ERR_NAME_NOT_RESOLVED)**
**Problem:** Videos and thumbnails were trying to load from `storage.example.com` which doesn't exist.

**Root Cause:** The `videoStorage.ts` fallback was returning mock URLs when uploads failed.

**Solution:** 
- Removed the fallback mock data in `uploadRecording()`
- Now throws a proper error when upload fails instead of returning fake URLs
- Fixed storage path to include `userId` to match Firebase Storage rules: `recordings/{userId}/{recordingId}/video.webm`

### 2. **Firestore Permission Errors When Deleting**
**Problem:** "Missing or insufficient permissions" error when deleting recordings.

**Root Cause:** 
- Storage path mismatch between code and rules
- Missing `ownerId` parameter in delete operations

**Solution:**
- Updated `VideoStorageService.deleteRecording()` to accept `ownerId` parameter
- Fixed storage path to include userId: `recordings/{ownerId}/{recordingId}/`
- Updated storage.rules to match the new path pattern with `/{allFiles=**}`
- Updated `recordings/page.tsx` to pass `user.uid` when deleting

### 3. **Storage Rules Path Mismatch**
**Problem:** Storage rules expected path `recordings/{userId}/{recordingId}` but code was using `recordings/{recordingId}`

**Solution:**
- Updated all recording paths to include userId
- Updated storage.rules to use `{allFiles=**}` pattern to match all files within recording directory

## Files Modified

1. **src/utils/videoStorage.ts**
   - `uploadRecording()`: Fixed storage path to include `metadata.ownerId`
   - `deleteRecording()`: Added `ownerId` parameter and fixed delete paths
   - Removed mock URL fallback that was causing invalid URLs

2. **src/app/recordings/page.tsx**
   - Updated `handleDeleteRecording()` to pass `user.uid` to `VideoStorageService.deleteRecording()`
   - Added user null check

3. **storage.rules**
   - Updated recordings rule to use `{allFiles=**}` pattern
   - Now matches: `recordings/{userId}/{recordingId}/{allFiles=**}`

## Next Steps

### Deploy Firebase Rules
You need to deploy the updated Firestore and Storage rules to Firebase:

```bash
# Deploy storage rules
firebase deploy --only storage

# Also deploy firestore rules if needed
firebase deploy --only firestore
```

### Clean Up Old Mock Recordings
Any recordings created with the old mock system will have invalid URLs. Users should delete these old recordings using the recordings page, which will now work properly.

### Test the Fix
1. Create a new recording in a video call
2. Verify it uploads to Firebase Storage successfully
3. Go to the recordings page
4. Verify the video plays properly
5. Try deleting a recording - it should work without permission errors

## Technical Details

### New Storage Path Structure
```
recordings/
  {userId}/
    {recordingId}/
      video.webm
      thumbnail.jpg
```

### Storage Rules
```
match /recordings/{userId}/{recordingId}/{allFiles=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

This ensures:
- Only the owner can upload/delete their recordings
- All authenticated users can view recordings (you may want to add public/private checks later)
- Files within the recording directory are properly matched

