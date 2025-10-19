# Stale Presence Detection Fix

## Problem
Accounts (especially on iPhone) were staying online even when they couldn't be called. This happened because:

1. **Unreliable browser events on mobile**: `beforeunload` and `pagehide` events don't fire reliably on mobile devices, especially iPhone Safari
2. **No heartbeat validation**: The system had no way to detect if an "online" status was fresh or stale
3. **App backgrounding**: When mobile apps go to background, the connection might stay open but the user is effectively offline

## Solution

### 1. Heartbeat Timestamp Tracking
**File: `src/services/PresenceService.ts`**

Added `lastHeartbeat` timestamp to track when users last sent a heartbeat:
- Every heartbeat now updates both `isOnline` and `lastHeartbeat` fields
- Threshold set to 45 seconds (3x the 15-second heartbeat interval)
- If `lastHeartbeat` is older than 45 seconds, user is considered offline

```typescript
static readonly STALE_THRESHOLD_MS = 45000; // 45 seconds
```

### 2. Mobile-Friendly Event Handling
**File: `src/services/PresenceService.ts`**

Enhanced event listeners for better mobile support:

- **`visibilitychange`**: Detects when app goes to background (more reliable on mobile)
- **`blur`**: Additional iOS Safari handling
- **Pauses heartbeat** when app is backgrounded
- **Resumes heartbeat** when app returns to foreground
- **Immediately marks offline** when app is backgrounded

```typescript
// Handle visibility changes (mobile app backgrounding)
const handleVisibilityChange = () => {
  if (document.hidden) {
    console.log("📱 App backgrounded, marking offline");
    markOffline();
    if (intervalId) clearInterval(intervalId);
  } else {
    console.log("📱 App foregrounded, resuming heartbeat");
    tick(); // Immediate tick
    intervalId = setInterval(tick, intervalMs);
  }
};
```

### 3. Client-Side Stale Detection
**File: `src/services/PerformerService.ts`**

Added validation in `mapDocToPerformer()` to filter out stale heartbeats:

```typescript
// Check if heartbeat is stale (older than threshold)
let isActuallyOnline = !!data?.isOnline;
if (isActuallyOnline && lastHeartbeat) {
  const heartbeatAge = Date.now() - lastHeartbeat.getTime();
  if (heartbeatAge > PresenceService.STALE_THRESHOLD_MS) {
    console.log(`⚠️ Stale heartbeat detected for ${data?.displayName}`);
    isActuallyOnline = false; // Mark as offline if heartbeat is stale
  }
}
```

### 4. Database Schema Updates
**File: `firestore.rules`**

Updated Firestore rules to allow `lastHeartbeat` field updates. The rules already permitted these updates, but added documentation for clarity.

## How It Works

### Normal Flow
1. User opens app → heartbeat starts
2. Every 15 seconds → updates `isOnline=true` and `lastHeartbeat=now`
3. Other users see them as online (heartbeat is fresh)
4. User closes app → `visibilitychange` event fires → marks offline

### Mobile Background Flow (iPhone)
1. User switches away from app → `visibilitychange` event fires
2. Heartbeat stops, user marked offline immediately
3. **Even if offline marking fails**, the stale heartbeat detection catches it
4. After 45 seconds, client-side filter marks them as offline

### Network Disconnect Flow
1. User loses connection → heartbeat updates start failing
2. Last successful heartbeat timestamp becomes stale
3. After 45 seconds → client-side filter marks them as offline
4. They won't appear in "online" lists anymore

## Testing

To test the fix:

1. **iPhone Background Test**:
   - Open app on iPhone
   - Switch to another app
   - User should be marked offline immediately

2. **Stale Heartbeat Test**:
   - Open app
   - Force-close browser/app without triggering events
   - Wait 45+ seconds
   - User should no longer appear online to others

3. **Network Disconnect Test**:
   - Open app
   - Disable network connection
   - Wait 45+ seconds
   - User should be filtered out of online list

## Benefits

1. **No server-side infrastructure needed**: Pure client-side solution
2. **Works on all platforms**: iPhone, Android, desktop browsers
3. **Graceful degradation**: Even if events don't fire, stale detection catches it
4. **Fast**: Users appear offline within 45 seconds of disconnection
5. **Prevents bad UX**: Users can't attempt to call someone who's actually offline

## Future Improvements

For even more robust presence detection, consider:

1. **Cloud Function cleanup**: Scheduled function to clean up stale online statuses
2. **sendBeacon endpoint**: Backend endpoint to handle `sendBeacon()` offline notifications
3. **WebSocket-based presence**: Real-time connection tracking
4. **Firebase Realtime Database**: Use `.onDisconnect()` for automatic offline marking

## Files Changed

1. `src/services/PresenceService.ts` - Added heartbeat timestamp and mobile event handling
2. `src/services/PerformerService.ts` - Added stale heartbeat detection in client-side filtering
3. `firestore.rules` - Documented heartbeat field permissions

