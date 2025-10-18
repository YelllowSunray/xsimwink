"use client";

import React, { useState } from "react";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  partnerName: string;
  connectionFee?: number; // Optional for backward compatibility
  userBalance?: number; // Optional for backward compatibility
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onConfirm,
  partnerName,
}: ConnectionModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsConnecting(true);
    await onConfirm();
    setIsConnecting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-black/90 to-gray-900/90 border border-pink-500/30 rounded-2xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect with {partnerName}?</h2>
          <p className="text-gray-300 text-sm">Start a free video chat session</p>
        </div>

        {/* Benefits */}
        <div className="mb-6">
          <h3 className="text-white font-semibold mb-3">What you get:</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-300">Private video chat session</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-300">Option to record and earn together</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-300">50/50 split on recording sales</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isConnecting}
            className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConnecting}
            className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold disabled:opacity-50"
          >
            {isConnecting ? "Connecting..." : "Connect Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
