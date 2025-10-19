"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Debug Page - See what's actually in the database
 */
export default function DebugOnlinePage() {
  const { user } = useAuth();
  const [performers, setPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPerformers();
  }, []);

  const loadPerformers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Fetching all performers from database...");
      
      const performersRef = collection(db, "performers");
      const snapshot = await getDocs(performersRef);
      
      console.log(`📊 Found ${snapshot.size} performers`);
      
      const performersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastSeenDate: doc.data().lastSeen?.toDate?.() || doc.data().lastSeen
      }));
      
      setPerformers(performersList);
      
      // Check online performers
      const onlineQuery = query(performersRef, where('isOnline', '==', true));
      const onlineSnapshot = await getDocs(onlineQuery);
      console.log(`🟢 ${onlineSnapshot.size} performers marked as online`);
      
    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  const markAllOffline = async () => {
    if (!confirm("Mark all performers as offline?")) return;
    
    setLoading(true);
    try {
      const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      
      for (const performer of performers) {
        if (performer.isOnline === true) {
          await updateDoc(doc(db, "performers", performer.id), {
            isOnline: false,
            "availability.isAvailable": false,
            lastSeen: serverTimestamp()
          });
          console.log(`✅ Marked ${performer.displayName} as offline`);
        }
      }
      
      alert("All performers marked as offline!");
      await loadPerformers();
    } catch (err: any) {
      console.error("Error:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onlinePerformers = performers.filter(p => p.isOnline === true);
  const offlinePerformers = performers.filter(p => p.isOnline !== true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-pink-500/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">
              🔍 Online Status Debug
            </h1>
            <div className="flex gap-4">
              <button
                onClick={loadPerformers}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
              <a
                href="/"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Back to Main
              </a>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <h2 className="text-red-300 font-semibold mb-2">❌ Error</h2>
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-4">
              <div className="text-purple-300 text-sm mb-1">Total Performers</div>
              <div className="text-white text-3xl font-bold">{performers.length}</div>
            </div>
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <div className="text-green-300 text-sm mb-1">Online Now</div>
              <div className="text-white text-3xl font-bold">{onlinePerformers.length}</div>
            </div>
            <div className="bg-gray-500/20 border border-gray-500/50 rounded-lg p-4">
              <div className="text-gray-300 text-sm mb-1">Offline</div>
              <div className="text-white text-3xl font-bold">{offlinePerformers.length}</div>
            </div>
          </div>

          {user && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
              <h2 className="text-blue-300 font-semibold mb-2">👤 Your Account</h2>
              <p className="text-blue-100 text-sm">User ID: {user.uid}</p>
              <p className="text-blue-100 text-sm">Email: {user.email}</p>
            </div>
          )}

          {onlinePerformers.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-300">
                  🟢 Online Performers ({onlinePerformers.length})
                </h2>
                <button
                  onClick={markAllOffline}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Mark All Offline
                </button>
              </div>
              <div className="space-y-2">
                {onlinePerformers.map((performer) => (
                  <div
                    key={performer.id}
                    className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-semibold">
                          {performer.displayName || performer.username}
                        </div>
                        <div className="text-gray-400 text-sm">ID: {performer.id}</div>
                        <div className="text-gray-400 text-sm">
                          Last seen: {performer.lastSeenDate ? 
                            new Date(performer.lastSeenDate).toLocaleString() : 
                            'Never'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-green-400 text-sm font-semibold">ONLINE</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {offlinePerformers.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-400 mb-4">
                ⚫ Offline Performers ({offlinePerformers.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {offlinePerformers.map((performer) => (
                  <div
                    key={performer.id}
                    className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-gray-300 font-medium">
                          {performer.displayName || performer.username}
                        </div>
                        <div className="text-gray-500 text-xs">ID: {performer.id}</div>
                        <div className="text-gray-500 text-xs">
                          Last seen: {performer.lastSeenDate ? 
                            new Date(performer.lastSeenDate).toLocaleString() : 
                            'Never'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-gray-500 text-sm">OFFLINE</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {performers.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No performers found in database</p>
              <p className="text-gray-500 text-sm mt-2">
                This is normal if you haven't created any performer accounts yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



