# Availability Status Fix

## Problem
Performers were showing as "Performer Busy - is currently in another session" even when they weren't in a call.

## Root Causes

1. **Old Database Data**: Performers had `availability.isAvailable: false` from previous sessions
2. **No Cleanup on Call End**: When calls ended, availability wasn't reset to true
3. **Overly Strict Logic**: The stale heartbeat detection was requiring BOTH fresh heartbeat AND database `availability.isAvailable` to be true

## Solutions Applied

### 1. Fixed Availability Logic (`PerformerService.ts`)

**Before:**
```typescript
isAvailable: data?.availability?.isAvailable && isActuallyOnline
```

**After:**
```typescript
// If heartbeat is fresh, user is available (unless explicitly marked as busy with busyUntil)
isAvailable: isActuallyOnline && (busyUntil ? new Date() > busyUntil : true)
```

**Why this works:**
- Fresh heartbeat = performer is online and available
- Only exception: if `busyUntil` is set to a future date (they're in a call)
- Old database values for `availability.isAvailable` are ignored

### 2. Added Busy Status Management (`PresenceService.ts`)

New method to manage busy state:
```typescript
static async setBusyStatus(userId: string, isBusy: boolean, busyUntil?: Date)
```

This allows proper tracking of when users are in calls.

### 3. Integrated Busy Status in Call Flow (`page.tsx`)

**When call is accepted (caller side):**
```typescript
PresenceService.setBusyStatus(user!.uid, true)
```

**When call is accepted (callee side):**
```typescript
PresenceService.setBusyStatus(user.uid, true)
```

**When call ends:**
```typescript
PresenceService.setBusyStatus(user.uid, false)
```

### 4. Created Cleanup Utility

New page: `/fix-availability`
- Resets `availability.isAvailable` to true for all online performers
- Clears any stale `busyUntil` timestamps
- One-time cleanup for existing data issues

## How It Works Now

### Online & Available
```
✅ Fresh heartbeat (< 45 seconds old)
✅ No busyUntil or busyUntil is in the past
→ Shows as available, can be called
```

### Online & Busy
```
✅ Fresh heartbeat (< 45 seconds old)
❌ busyUntil is set to future date
→ Shows as "currently in another session"
```

### Offline
```
❌ No fresh heartbeat (> 45 seconds old)
→ Doesn't appear in online list at all
```

## Usage

### For Immediate Fix
1. Navigate to: `http://localhost:3000/fix-availability`
2. Click "Fix Availability for All Online Performers"
3. Wait for completion
4. Refresh main page

### Going Forward
- System automatically manages busy status during calls
- No manual intervention needed
- Performers appear available when online and not in a call

## Files Changed

1. `src/services/PresenceService.ts` - Added `setBusyStatus()` method
2. `src/services/PerformerService.ts` - Fixed availability logic
3. `src/app/page.tsx` - Integrated busy status management in call flow
4. `src/app/fix-availability/page.tsx` - Created cleanup utility

## Testing

To test the fix:

1. **Start a call**: Both users should show as "busy"
2. **End the call**: Both users should immediately show as available again
3. **Old data**: Run `/fix-availability` to clean up stuck performers
4. **Verify**: Online performers should be callable unless actively in a call

