"use client";

import { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FixOnlineStatusPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<{total: number, updated: number}>({total: 0, updated: 0});

  const fixOnlineStatus = async () => {
    setIsRunning(true);
    setMessage('Starting cleanup...');
    
    try {
      // Get all performers
      const performersRef = collection(db, 'performers');
      const snapshot = await getDocs(performersRef);
      
      setMessage(`Found ${snapshot.docs.length} performers. Marking all as offline...`);
      
      let updated = 0;
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Mark everyone as offline and unavailable
        await updateDoc(doc(db, 'performers', docSnap.id), {
          isOnline: false,
          'availability.isAvailable': false,
        });
        
        updated++;
        setMessage(`Updated ${updated}/${snapshot.docs.length}...`);
      }
      
      setResults({ total: snapshot.docs.length, updated });
      setMessage('✅ Cleanup complete! All performers marked as offline. They will show online when they log in and start their heartbeat.');
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-black/60 backdrop-blur-lg rounded-2xl border border-pink-500/30 p-8">
        <h1 className="text-3xl font-bold text-white mb-4">🔧 Fix Online Status</h1>
        
        <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6">
          <p className="text-yellow-200 text-sm">
            <strong>⚠️ Important:</strong> This tool will mark ALL performers as offline. 
            They will automatically appear online again when they log in and their heartbeat activates.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <h2 className="text-white font-semibold mb-2">What this does:</h2>
            <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
              <li>Marks all performers as offline</li>
              <li>Sets availability.isAvailable to false for all</li>
              <li>Fixes the issue where everyone appears online</li>
              <li>Users will show online only when actively logged in with heartbeat</li>
            </ul>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.startsWith('✅') 
              ? 'bg-green-500/20 border border-green-500/50 text-green-200'
              : message.startsWith('❌')
              ? 'bg-red-500/20 border border-red-500/50 text-red-200'
              : 'bg-blue-500/20 border border-blue-500/50 text-blue-200'
          }`}>
            {message}
          </div>
        )}

        {results.total > 0 && (
          <div className="bg-white/5 rounded-lg p-4 mb-6">
            <p className="text-white">
              <strong>Results:</strong>
            </p>
            <p className="text-gray-300 text-sm">
              Total performers: {results.total}<br />
              Updated: {results.updated}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={fixOnlineStatus}
            disabled={isRunning}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running...' : 'Fix Online Status'}
          </button>
          
          <a
            href="/"
            className="px-6 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold text-center"
          >
            Back to Home
          </a>
        </div>

        <div className="mt-6 text-xs text-gray-400">
          <p>💡 <strong>After running this:</strong></p>
          <ul className="ml-4 mt-2 space-y-1 list-disc list-inside">
            <li>Go back to the home page and refresh</li>
            <li>Only users who are ACTUALLY logged in and on the main page will show as online</li>
            <li>The heartbeat system (every 15s) manages online status automatically</li>
            <li>You can delete this page after running it: <code className="bg-black/50 px-1 rounded">rm src/app/fix-online-status/page.tsx</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}



