import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/contexts/AuthContext';

export class PresenceService {
  // Maximum age of a heartbeat before user is considered stale (in milliseconds)
  static readonly STALE_THRESHOLD_MS = 45000; // 45 seconds (3x heartbeat interval)

  static async upsertPerformer(userId: string, profile: UserProfile, isOnline: boolean = true): Promise<void> {
    const performerRef = doc(db, 'performers', userId);

    const performerDoc = {
      username: profile.username,
      displayName: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      isOnline: !!isOnline,
      lastSeen: serverTimestamp(),
      lastHeartbeat: isOnline ? serverTimestamp() : null,
      tags: profile.preferences?.categories || [],
      connectionFee: profile.connectionFee ?? 2.99,
      profilePicture: profile.profilePicture || null,
      bio: profile.bio || '',
      preferences: {
        categories: profile.preferences?.categories || [],
      },
      stats: {
        totalSessions: 0,
        totalMinutes: 0,
        totalEarnings: 0,
        favoriteCount: 0,
      },
      availability: {
        isAvailable: !!isOnline,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
    };

    await setDoc(performerRef, performerDoc, { merge: true });
  }

  static async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const performerRef = doc(db, 'performers', userId);
    await setDoc(
      performerRef,
      {
        isOnline,
        lastSeen: serverTimestamp(),
        lastHeartbeat: isOnline ? serverTimestamp() : null,
        'availability.isAvailable': isOnline,
      },
      { merge: true }
    );
  }

  // Set busy status (e.g., when in a call)
  static async setBusyStatus(userId: string, isBusy: boolean, busyUntil?: Date): Promise<void> {
    const performerRef = doc(db, 'performers', userId);
    await setDoc(
      performerRef,
      {
        'availability.isAvailable': !isBusy,
        'availability.busyUntil': isBusy && busyUntil ? busyUntil : null,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Heartbeat presence update – returns a stop function
  static startHeartbeat(userId: string, intervalMs: number = 15000): () => void {
    let stopped = false;
    let intervalId: NodeJS.Timeout | null = null;
    let isVisible = !document.hidden;
    
    const tick = async () => {
      if (stopped) return;
      try {
        await this.setOnlineStatus(userId, true);
        console.log("💓 Heartbeat sent for", userId);
      } catch (error) {
        console.error("❌ Heartbeat failed:", error);
      }
    };
    
    // Immediate tick then interval
    tick();
    intervalId = setInterval(tick, intervalMs);

    // Mark offline when page closes or goes to background
    const markOffline = () => {
      console.log("👋 Marking user offline:", userId);
      
      // Use sendBeacon for more reliable delivery on mobile
      // This works even when the page is being closed/backgrounded
      try {
        const data = JSON.stringify({
          userId,
          isOnline: false,
          timestamp: Date.now()
        });
        
        // Try sendBeacon first (more reliable on mobile)
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          const blob = new Blob([data], { type: 'application/json' });
          // Note: You would need a backend endpoint for this
          // For now, we'll still use the Firebase method below
          console.log("📡 Would use sendBeacon if endpoint was available");
        }
      } catch (error) {
        console.error("sendBeacon failed:", error);
      }
      
      // Fallback to regular Firebase update
      try {
        this.setOnlineStatus(userId, false).catch(() => {});
      } catch (error) {
        console.error("Failed to mark offline:", error);
      }
    };
    
    // Handle visibility changes (mobile app backgrounding)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - mark offline
        console.log("📱 App backgrounded, marking offline");
        isVisible = false;
        markOffline();
        if (intervalId) clearInterval(intervalId);
      } else {
        // App came to foreground - resume heartbeat
        console.log("📱 App foregrounded, resuming heartbeat");
        isVisible = true;
        tick(); // Immediate tick
        intervalId = setInterval(tick, intervalMs);
      }
    };
    
    // Attach event listeners
    // visibilitychange is more reliable on mobile than beforeunload
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', markOffline);
    window.addEventListener('beforeunload', markOffline);
    
    // iOS-specific: pause event for better Safari handling
    window.addEventListener('blur', markOffline);

    // Cleanup function
    return () => {
      console.log("⏹️ Stopping heartbeat for", userId);
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', markOffline);
      window.removeEventListener('beforeunload', markOffline);
      window.removeEventListener('blur', markOffline);
      // Best-effort offline when stopping
      this.setOnlineStatus(userId, false).catch(() => {});
    };
  }
}
