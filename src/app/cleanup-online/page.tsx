"use client";

import { useState } from "react";
import { collection, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Cleanup Page - Mark all performers as offline
 * 
 * Visit this page once to fix the issue where everyone appears online.
 * After cleanup, you can delete this page.
 */
export default function CleanupOnlinePage() {
  const [status, setStatus] = useState<string>("Ready to clean up online status");
  const [log, setLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, message]);
  };

  const cleanupOnlineStatus = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setLog([]);
    setStatus("Running cleanup...");
    
    try {
      addLog("🔍 Fetching all performers from database...");
      
      const performersRef = collection(db, "performers");
      const snapshot = await getDocs(performersRef);
      
      addLog(`📊 Found ${snapshot.size} performers in the database`);
      
      if (snapshot.empty) {
        addLog("✅ No performers found to update");
        setStatus("No performers found");
        setIsRunning(false);
        return;
      }
      
      let updatedCount = 0;
      let alreadyOfflineCount = 0;
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const displayName = data.displayName || data.username || docSnap.id;
        
        if (data.isOnline === true) {
          addLog(`  🔄 Marking ${displayName} as offline...`);
          
          await updateDoc(doc(db, "performers", docSnap.id), {
            isOnline: false,
            "availability.isAvailable": false,
            lastSeen: serverTimestamp()
          });
          
          updatedCount++;
        } else {
          alreadyOfflineCount++;
        }
      }
      
      addLog(`\n✅ Cleanup complete!`);
      addLog(`   - Updated: ${updatedCount} performers`);
      addLog(`   - Already offline: ${alreadyOfflineCount} performers`);
      addLog(`\n🎉 All performers are now marked as offline!`);
      addLog(`\n💡 Refresh your main page to see the changes.`);
      
      setStatus("Cleanup completed successfully!");
      setCompleted(true);
      
    } catch (error: any) {
      console.error("Error during cleanup:", error);
      addLog(`\n❌ Error: ${error.message || error}`);
      setStatus("Error occurred during cleanup");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-pink-500/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔧 Online Status Cleanup
          </h1>
          
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
            <h2 className="text-yellow-300 font-semibold mb-2">⚠️ What this does:</h2>
            <p className="text-yellow-100 text-sm">
              This tool will mark ALL performers in your database as offline. 
              Run this once to fix the issue where everyone appears online even when they're not.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Status: <span className="text-pink-400 font-semibold">{status}</span>
            </p>
            
            <button
              onClick={cleanupOnlineStatus}
              disabled={isRunning || completed}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              {isRunning ? "Running cleanup..." : completed ? "Cleanup completed!" : "Run Cleanup"}
            </button>
          </div>
          
          {log.length > 0 && (
            <div className="bg-black/60 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-96">
              {log.map((line, index) => (
                <div key={index} className="text-gray-300 mb-1">
                  {line}
                </div>
              ))}
            </div>
          )}
          
          {completed && (
            <div className="mt-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-300 font-semibold mb-2">✅ All done!</p>
              <p className="text-green-100 text-sm mb-2">
                The cleanup is complete. Now:
              </p>
              <ol className="text-green-100 text-sm list-decimal ml-5 space-y-1">
                <li>Go back to the main page and refresh</li>
                <li>Only currently logged-in performers with active heartbeats will show as online</li>
                <li>You can delete this cleanup page (src/app/cleanup-online/page.tsx)</li>
              </ol>
              <a
                href="/"
                className="inline-block mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                Go to Main Page
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



