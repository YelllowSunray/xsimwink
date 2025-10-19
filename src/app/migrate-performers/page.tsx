"use client";

import { useState } from "react";
import { collection, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * One-Time Migration: Set all users to isPerformer: true
 * 
 * Run this once to update all existing users.
 */
export default function MigratePerformersPage() {
  const [status, setStatus] = useState<string>("Ready to migrate users");
  const [log, setLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLog(prev => [...prev, message]);
  };

  const migrateUsers = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setLog([]);
    setStatus("Running migration...");
    
    try {
      addLog("🔍 Fetching all users from database...");
      
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      
      addLog(`📊 Found ${snapshot.size} users in the database`);
      
      if (snapshot.empty) {
        addLog("✅ No users found");
        setStatus("No users found");
        setIsRunning(false);
        return;
      }
      
      const batch = writeBatch(db);
      let updateCount = 0;
      let alreadyPerformerCount = 0;
      
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const displayName = data.displayName || data.username || docSnap.id;
        
        if (data.isPerformer !== true) {
          addLog(`  🔄 Setting ${displayName} as performer...`);
          batch.update(doc(db, "users", docSnap.id), {
            isPerformer: true
          });
          updateCount++;
        } else {
          alreadyPerformerCount++;
        }
      });
      
      if (updateCount > 0) {
        addLog(`\n🔄 Updating ${updateCount} users...`);
        await batch.commit();
        addLog(`✅ Updated ${updateCount} users to performers!`);
      }
      
      addLog(`\n✅ Migration complete!`);
      addLog(`   - Updated: ${updateCount} users`);
      addLog(`   - Already performers: ${alreadyPerformerCount} users`);
      addLog(`\n💡 Now all users are performers by default!`);
      addLog(`\n📝 Next steps:`);
      addLog(`   1. Log in with any account`);
      addLog(`   2. Go to the main page`);
      addLog(`   3. The heartbeat will create performer documents automatically`);
      
      setStatus("Migration completed successfully!");
      setCompleted(true);
      
    } catch (error: any) {
      console.error("Error during migration:", error);
      addLog(`\n❌ Error: ${error.message || error}`);
      setStatus("Error occurred during migration");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-black/40 backdrop-blur-lg rounded-xl border border-pink-500/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🔧 Performer Migration
          </h1>
          
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4 mb-6">
            <h2 className="text-blue-300 font-semibold mb-2">ℹ️ What this does:</h2>
            <p className="text-blue-100 text-sm mb-2">
              This tool will set ALL users in your database to <code className="bg-black/30 px-1 rounded">isPerformer: true</code>.
            </p>
            <p className="text-blue-100 text-sm">
              Run this once to make all existing users visible as performers.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              Status: <span className="text-pink-400 font-semibold">{status}</span>
            </p>
            
            <button
              onClick={migrateUsers}
              disabled={isRunning || completed}
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              {isRunning ? "Running migration..." : completed ? "Migration completed!" : "Run Migration"}
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
                All users are now performers. Next:
              </p>
              <ol className="text-green-100 text-sm list-decimal ml-5 space-y-1">
                <li>Log in with Account A and Account B</li>
                <li>Stay on the main page for 15-30 seconds</li>
                <li>Both accounts should now be visible to each other</li>
                <li>You can delete this migration page after confirming it works</li>
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

