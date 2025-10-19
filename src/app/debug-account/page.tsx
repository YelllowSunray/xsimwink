"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Debug Page - Check your account status
 */
export default function DebugAccountPage() {
  const { user, userProfile } = useAuth();
  const [performerDoc, setPerformerDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Check if user has a performer document
        const performerRef = doc(db, "performers", user.uid);
        const performerSnap = await getDoc(performerRef);
        
        if (performerSnap.exists()) {
          setPerformerDoc({
            exists: true,
            data: performerSnap.data()
          });
        } else {
          setPerformerDoc({
            exists: false
          });
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center p-8">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <a href="/signin" className="text-pink-400 hover:underline">Go to Sign In</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const isPerformerInProfile = userProfile?.isPerformer ?? false;
  const hasPerformerDoc = performerDoc?.exists ?? false;
  const isOnlineInPerformerDoc = performerDoc?.data?.isOnline ?? false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-pink-500/20 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">🔍 Account Debug</h1>
            <a
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              Back to Main
            </a>
          </div>

          {/* Account Status */}
          <div className="space-y-4">
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <h2 className="text-blue-300 font-semibold mb-2">👤 Your Account</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">User ID:</span>
                  <span className="text-white font-mono">{user.uid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Email:</span>
                  <span className="text-white">{user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Display Name:</span>
                  <span className="text-white">{userProfile?.displayName || "Not set"}</span>
                </div>
              </div>
            </div>

            {/* Performer Status */}
            <div className={`border rounded-lg p-4 ${
              isPerformerInProfile
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-red-500/20 border-red-500/50'
            }`}>
              <h2 className={`font-semibold mb-2 ${
                isPerformerInProfile ? 'text-green-300' : 'text-red-300'
              }`}>
                🎭 Performer Status in User Profile
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">isPerformer:</span>
                  <span className={`font-bold ${
                    isPerformerInProfile ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isPerformerInProfile ? '✅ TRUE' : '❌ FALSE'}
                  </span>
                </div>
                {!isPerformerInProfile && (
                  <div className="mt-3 bg-yellow-500/20 border border-yellow-500/50 rounded p-3">
                    <p className="text-yellow-200 text-xs">
                      ⚠️ <strong>This is why you're not visible!</strong>
                      <br />You need to enable performer mode in your profile.
                    </p>
                    <a
                      href="/profile"
                      className="inline-block mt-2 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs font-semibold transition"
                    >
                      Go to Profile & Enable Performer
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Performer Document */}
            <div className={`border rounded-lg p-4 ${
              hasPerformerDoc
                ? 'bg-purple-500/20 border-purple-500/50'
                : 'bg-gray-500/20 border-gray-500/50'
            }`}>
              <h2 className={`font-semibold mb-2 ${
                hasPerformerDoc ? 'text-purple-300' : 'text-gray-300'
              }`}>
                📄 Performer Document in Database
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Document exists:</span>
                  <span className={`font-bold ${
                    hasPerformerDoc ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {hasPerformerDoc ? '✅ YES' : '⚪ NO'}
                  </span>
                </div>
                {hasPerformerDoc && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">isOnline:</span>
                      <span className={`font-bold ${
                        isOnlineInPerformerDoc ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {isOnlineInPerformerDoc ? '🟢 ONLINE' : '⚫ OFFLINE'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Last Seen:</span>
                      <span className="text-white">
                        {performerDoc?.data?.lastSeen?.toDate?.()
                          ? new Date(performerDoc.data.lastSeen.toDate()).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-white/10 rounded-lg p-4">
              <h2 className="text-white font-semibold mb-3">🔬 Diagnosis</h2>
              <div className="space-y-3 text-sm">
                {!isPerformerInProfile && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-400">❌</span>
                    <div className="flex-1">
                      <p className="text-red-300 font-semibold">Not a Performer</p>
                      <p className="text-gray-300">You won't appear in the performer list because isPerformer is false</p>
                    </div>
                  </div>
                )}
                
                {isPerformerInProfile && !hasPerformerDoc && (
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <div className="flex-1">
                      <p className="text-yellow-300 font-semibold">No Performer Document</p>
                      <p className="text-gray-300">Go to the main page - the heartbeat will create your performer document automatically</p>
                    </div>
                  </div>
                )}
                
                {isPerformerInProfile && hasPerformerDoc && !isOnlineInPerformerDoc && (
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-400">⚠️</span>
                    <div className="flex-1">
                      <p className="text-yellow-300 font-semibold">Marked as Offline</p>
                      <p className="text-gray-300">Stay on the main page - the heartbeat will set you online within 15 seconds</p>
                    </div>
                  </div>
                )}
                
                {isPerformerInProfile && hasPerformerDoc && isOnlineInPerformerDoc && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-400">✅</span>
                    <div className="flex-1">
                      <p className="text-green-300 font-semibold">All Good!</p>
                      <p className="text-gray-300">You should be visible to other users</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <a
                href="/profile"
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Edit Profile
              </a>
              <a
                href="/debug-online"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                View All Online Users
              </a>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

