"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PaymentService, type Transaction, type WalletBalance } from "@/services/PaymentService";

export default function EarningsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load wallet data
  useEffect(() => {
    const loadWalletData = async () => {
      if (!user) return;
      
      setLoadingTransactions(true);
      try {
        const [balance, userTransactions] = await Promise.all([
          PaymentService.getWalletBalance(user.uid),
          PaymentService.getUserTransactions(user.uid)
        ]);
        
        setWalletBalance(balance);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    loadWalletData();
  }, [user]);

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const recordingEarnings = userProfile.recordings.reduce((acc, rec) => acc + rec.earnings, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-pink-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="/">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Thumb
                </h1>
              </a>
              <nav className="hidden md:flex gap-6">
                <a href="/" className="text-gray-300 hover:text-pink-400 transition">
                  Explore
                </a>
                <a href="/favorites" className="text-gray-300 hover:text-pink-400 transition">
                  Favorites
                </a>
                <a href="/history" className="text-gray-300 hover:text-pink-400 transition">
                  History
                </a>
                <a href="/recordings" className="text-gray-300 hover:text-pink-400 transition">
                  My Recordings
                </a>
                <a href="/earnings" className="text-white hover:text-pink-400 transition font-medium">
                  Earnings
                </a>
              </nav>
            </div>
            <a href="/profile" className="text-white hover:text-pink-400 transition">
              Profile
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <h2 className="text-3xl font-bold text-white mb-8">Earnings 💰</h2>

        {/* Earnings Breakdown */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-6">
          <h3 className="text-xl font-semibold text-white mb-6">Earnings Breakdown</h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-green-400 text-sm">Recording Sales</p>
                  <p className="text-white text-2xl font-bold">${recordingEarnings.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">{userProfile.recordings.length} recordings</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-blue-400 text-sm">Sessions</p>
                  <p className="text-white text-2xl font-bold">{userProfile.sessionHistory.length}</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">Total free connections made</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

