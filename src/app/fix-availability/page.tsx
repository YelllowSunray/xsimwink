"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function FixAvailabilityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<string>("");

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 flex items-center justify-center">
      <div className="text-white text-xl">Loading...</div>
    </div>;
  }

  if (!user) {
    router.push('/signin');
    return null;
  }

  const fixAvailability = async () => {
    setFixing(true);
    setResult("Starting...");

    try {
      // Get all online performers
      const performersRef = collection(db, 'performers');
      const q = query(performersRef, where('isOnline', '==', true));
      const snapshot = await getDocs(q);

      let fixed = 0;
      let errors = 0;

      setResult(`Found ${snapshot.docs.length} online performers. Fixing availability...`);

      for (const docSnap of snapshot.docs) {
        try {
          const data = docSnap.data();
          const performerRef = doc(db, 'performers', docSnap.id);

          // Reset availability to true and clear busyUntil
          await updateDoc(performerRef, {
            'availability.isAvailable': true,
            'availability.busyUntil': null,
          });

          console.log(`✅ Fixed ${data.displayName || docSnap.id}`);
          fixed++;
        } catch (err) {
          console.error(`❌ Failed to fix ${docSnap.id}:`, err);
          errors++;
        }
      }

      setResult(`✅ Complete!\nFixed: ${fixed}\nErrors: ${errors}`);
    } catch (error) {
      console.error('Error fixing availability:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-4">
      <div className="max-w-2xl mx-auto mt-20">
        <div className="bg-black/60 backdrop-blur-lg rounded-xl p-8 border border-pink-500/30">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-4">
            Fix Availability Status
          </h1>
          
          <div className="mb-6 text-gray-300 space-y-2">
            <p>This tool fixes performers who are stuck showing as "busy" when they're not in a call.</p>
            <p className="text-sm text-gray-400">
              It resets <code className="bg-black/40 px-2 py-1 rounded">availability.isAvailable</code> to true for all online performers.
            </p>
          </div>

          {result && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <pre className="text-white whitespace-pre-wrap font-mono text-sm">
                {result}
              </pre>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={fixAvailability}
              disabled={fixing}
              className="w-full px-6 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition text-lg"
            >
              {fixing ? '⏳ Fixing...' : '🔧 Fix Availability for All Online Performers'}
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
            >
              ← Back to Home
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300 text-sm font-semibold mb-2">📝 Note:</p>
            <p className="text-gray-300 text-sm">
              After running this, all online performers will be marked as available. 
              The system will automatically manage busy status during active calls going forward.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

