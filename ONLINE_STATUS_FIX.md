# Online Status Fix - Summary

## Problem
All users were appearing as "online" even when only one person was logged in.

## Root Cause
The issue was in `src/contexts/AuthContext.tsx`:

1. **Default performer status**: When users signed up or when default profiles were created, `isPerformer` was set to `true` by default
2. **Automatic online status**: When ANY user logged in and had `isPerformer: true`, their presence was automatically set to online via `PresenceService.upsertPerformer()`
3. **No cleanup on logout**: Users weren't being marked as offline when they logged out or closed the browser

This meant that every user who had ever logged into the system was marked as a performer and set to online status, causing everyone to appear online.

## Changes Made

### 1. AuthContext.tsx Fixes

#### Changed default performer status (Lines 130, 249)
```typescript
// BEFORE
isPerformer: true,  // Everyone was a performer by default

// AFTER
isPerformer: false,  // Users must explicitly opt-in to be performers
```

#### Removed automatic online status on login (Lines 196-210)
```typescript
// BEFORE
if (user) {
  await fetchUserProfile(user.uid);
  if (userProfile?.isPerformer) {
    await PresenceService.upsertPerformer(user.uid, userProfile, true);
  }
}

// AFTER
if (user) {
  await fetchUserProfile(user.uid);
  // Note: We don't automatically set performers online on login
  // The heartbeat in page.tsx handles online status for active performers
}
```

#### Removed automatic presence sync (Lines 212-224)
```typescript
// BEFORE
useEffect(() => {
  const syncPresence = async () => {
    if (user && userProfile?.isPerformer) {
      await PresenceService.upsertPerformer(user.uid, userProfile, true);
    }
  };
  syncPresence();
}, [user, userProfile?.isPerformer]);

// AFTER
// Removed - performers must explicitly opt-in via main page heartbeat
```

#### Added offline status on logout (Lines 297-308)
```typescript
const logout = async () => {
  // Mark user as offline before logging out
  if (user && userProfile?.isPerformer) {
    try {
      await PresenceService.setOnlineStatus(user.uid, false);
    } catch (e) {
      console.error("Error setting offline status on logout:", e);
    }
  }
  await signOut(auth);
  setUserProfile(null);
};
```

#### Fixed signup to not set online immediately (Lines 263-269)
```typescript
// BEFORE
if (profile.isPerformer) {
  await PresenceService.upsertPerformer(userCredential.user.uid, profile, true);
}

// AFTER
if (profile.isPerformer) {
  await PresenceService.upsertPerformer(userCredential.user.uid, profile, false);
}
```

### 2. Created Cleanup Tools

#### Browser-based cleanup page: `src/app/cleanup-online/page.tsx`
A simple web page you can visit to mark all existing performers as offline.

#### Node.js cleanup script: `cleanup-online-status.js`
Alternative server-side cleanup script (requires Firebase Admin SDK).

## How It Works Now

### For Regular Users (Browsers)
- By default, users are **NOT** marked as performers
- They can browse and see other performers without appearing online themselves
- They will never show up in the performer list

### For Performers
- Must explicitly set `isPerformer: true` in their profile
- Only show as "online" when:
  - They are logged in
  - They are on the main page (where the heartbeat runs)
  - The heartbeat is actively updating their presence every 15 seconds
- Automatically marked offline when:
  - They log out
  - They close the browser/tab (via `beforeunload` event)
  - Their heartbeat stops (e.g., navigate away from main page)
  - After 2 minutes of no heartbeat (grace period)

## Steps to Fix Your Current Database

### Option 1: Use the Browser Cleanup Page (Easiest)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/cleanup-online`

3. Click "Run Cleanup" button

4. Wait for completion message

5. Go back to main page and refresh

6. **Delete the cleanup page** after you're done:
   ```bash
   rm src/app/cleanup-online/page.tsx
   ```

### Option 2: Use the Node.js Script

1. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in project root

2. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

3. Run the cleanup script:
   ```bash
   node cleanup-online-status.js
   ```

4. Delete the script and service account key when done:
   ```bash
   rm cleanup-online-status.js serviceAccountKey.json
   ```

### Option 3: Manual Firestore Cleanup

1. Go to Firebase Console → Firestore Database
2. Navigate to the `performers` collection
3. For each document:
   - Set `isOnline` to `false`
   - Set `availability.isAvailable` to `false`

## Testing the Fix

After running cleanup:

1. **Test with multiple accounts**:
   - Log out
   - Create a new account (should have `isPerformer: false`)
   - Log in and check main page
   - You should NOT appear in the performer list

2. **Test performer status**:
   - Update your profile to set `isPerformer: true`
   - Stay on the main page
   - Open an incognito window and check if you appear online
   - You should appear online ✅

3. **Test offline status**:
   - Log out
   - In incognito window, refresh the page
   - You should no longer appear online ✅

## Future Considerations

### Making Users into Performers
If you want to allow users to become performers, create a profile page toggle:

```typescript
// In profile page
<button onClick={() => updateProfile({ isPerformer: true })}>
  Become a Performer
</button>
```

### Automatic Offline Detection
The system currently uses:
- Heartbeat every 15 seconds (page.tsx line 126)
- Browser close detection (beforeunload event)
- 2-minute grace period (PerformerService.ts line 146)

You might want to adjust these timings based on your needs.

## Files Modified
- ✅ `src/contexts/AuthContext.tsx` - Fixed automatic online status issues
- ✅ `src/app/cleanup-online/page.tsx` - Created cleanup tool
- ✅ `cleanup-online-status.js` - Created Node.js cleanup script
- ✅ `ONLINE_STATUS_FIX.md` - This documentation

## Cleanup
After fixing the issue, you can delete these temporary files:
- `src/app/cleanup-online/page.tsx`
- `cleanup-online-status.js`
- `serviceAccountKey.json` (if created)
- `ONLINE_STATUS_FIX.md` (optional - keep for reference)

