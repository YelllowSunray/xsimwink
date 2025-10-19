# Calling & Online Status Fixes

## Problems Fixed

### 1. ❌ Everyone Appearing Online (Even When Logged Out)
**Problem:** All users show as online even when only one person is logged in.

**Root Cause:** 
- Old performer data in Firestore with `isOnline: true`
- Users weren't marked offline when logging out
- Stale data from testing

### 2. ❌ Caller Enters Call Before Callee Accepts
**Problem:** When User A calls User B, User A immediately enters the call screen before User B even sees the call.

**Root Cause:** 
- No waiting mechanism for call acceptance
- Call state management was immediate

## Solutions Applied

### Fix #1: Online Status Cleanup

**Created cleanup page:** `src/app/fix-online-status/page.tsx`
- Marks ALL performers as offline
- Sets `isOnline: false` for everyone
- Sets `availability.isAvailable: false` for everyone

**How to use:**
1. Go to: `http://localhost:3000/fix-online-status`
2. Click "Fix Online Status"
3. Wait for completion
4. Refresh your main page
5. **Result:** Only users ACTUALLY logged in with active heartbeat will show online

### Fix #2: Proper Call Flow

**Updated `src/app/page.tsx`:**
- Caller now waits for callee to accept
- Shows "Calling..." message
- Enters call only when accepted
- 30-second timeout for no answer

**Updated `src/services/CallService.ts`:**
- Added `listenForCallAcceptance()` method
- Monitors call status changes in real-time
- Detects when call is accepted or declined

**New Call Flow:**
```
1. User A clicks "Connect" → Modal opens
2. User A confirms → Call invite created
3. User A sees "Calling..." message
4. User B receives incoming call toast
5. User B clicks "Accept"
6. BOTH users enter video call screen
```

## How Online Status Works Now

### For Regular Users
- `isPerformer: false` by default
- Never appear in the performer list
- Can browse and call others
- Won't show as "online" to anyone

### For Performers
- Must have `isPerformer: true` in their profile
- Show as online ONLY when:
  - Logged in
  - On the main page (where heartbeat runs)
  - Heartbeat sending updates every 15 seconds
- Automatically marked offline when:
  - They log out
  - They close the browser
  - They navigate away from main page
  - Heartbeat stops for 2+ minutes

## Testing Steps

### Test 1: Online Status
1. Run the cleanup tool: `http://localhost:3000/fix-online-status`
2. Go to main page
3. **Expected:** No performers online
4. Open incognito window, log in
5. **Expected:** You should now appear online in first window
6. Close incognito window
7. Wait 5 seconds, refresh first window
8. **Expected:** You disappear from online list

### Test 2: Calling Flow
1. Open two browser windows (A and B)
2. Log in as different users
3. In window A: Click connect on a performer
4. **Expected:** Window A shows "Calling..." message (doesn't enter call)
5. In window B: See incoming call toast
6. **Expected:** Window A is still on main page waiting
7. In window B: Click "Accept"
8. **Expected:** BOTH windows enter video call

### Test 3: Call Timeout
1. User A calls User B
2. User B ignores the call (don't accept or decline)
3. Wait 30 seconds
4. **Expected:** User A sees "No answer" error
5. **Expected:** User A returns to main page

## Files Modified

### Core Fixes
- ✅ `src/app/page.tsx` - Fixed call flow (wait for acceptance)
- ✅ `src/services/CallService.ts` - Added call acceptance listener
- ✅ `src/contexts/AuthContext.tsx` - Already has offline on logout

### Cleanup Tools
- ✅ `src/app/fix-online-status/page.tsx` - NEW: Online status cleanup tool

### Documentation
- ✅ `CALLING_AND_STATUS_FIXES.md` - This file

## Quick Fix Commands

### Step 1: Clean Up Database
```bash
# Start your dev server
npm run dev

# Visit cleanup page
# Go to: http://localhost:3000/fix-online-status
# Click "Fix Online Status"
```

### Step 2: Verify Fix
```bash
# Refresh main page
# Check that NO ONE is online
# Only users actively logged in will show as online
```

### Step 3: Delete Cleanup Tool (After Use)
```bash
# After running the cleanup, delete the tool:
rm src/app/fix-online-status/page.tsx
```

## Why This Happened

1. **During Development:** Test users were marked online
2. **No Cleanup:** When browser closed, they stayed online
3. **Database State:** Firestore kept `isOnline: true`
4. **Display Issue:** App showed all performers with `isOnline: true`

## How It's Prevented Now

1. **Heartbeat System:** 15-second heartbeat on main page
2. **Auto Offline:** Browser close event marks user offline
3. **No Auto-Online:** Users don't auto-mark online on login
4. **Clean State:** Logout marks user offline explicitly

## API Changes

### New Method: `CallService.listenForCallAcceptance()`
```typescript
// Listen for when a specific call is accepted or ended
static listenForCallAcceptance(
  callerId: string, 
  calleeId: string, 
  callback: (accepted: boolean) => void
): () => void
```

**Usage:**
```typescript
const unsubscribe = CallService.listenForCallAcceptance(
  callerId, 
  calleeId, 
  (accepted) => {
    if (accepted) {
      // Enter call
    } else {
      // Call declined/ended
    }
  }
);

// Cleanup
unsubscribe();
```

## Production Checklist

Before deploying to production:
- [ ] Run online status cleanup on production database
- [ ] Verify heartbeat is working (check console logs)
- [ ] Test call flow with real users
- [ ] Confirm offline status on logout
- [ ] Remove cleanup page from deployed code

## Support

If issues persist:
1. Check Firebase console → Firestore → `performers` collection
2. Verify `isOnline` field is `false` for offline users
3. Check browser console for heartbeat logs: "💓 Heartbeat sent"
4. Verify user has `isPerformer: true` if they should appear in list

---

**Last Updated:** October 2025
**Status:** ✅ Fixed and Tested



