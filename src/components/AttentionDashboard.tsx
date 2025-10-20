'use client';

import React from 'react';

interface AttentionMetrics {
  localAttentionScore: number; // 0-100
  remoteAttentionScore: number; // 0-100
  mutualAttentionTime: number; // seconds
  totalCallTime: number; // seconds
  interestLevel: 'low' | 'medium' | 'high';
}

interface AttentionDashboardProps {
  attentionMetrics: AttentionMetrics;
  isMutualEyeContact: boolean;
  eyeContactDuration: number;
}

export default function AttentionDashboard({
  attentionMetrics,
  isMutualEyeContact,
  eyeContactDuration,
}: AttentionDashboardProps) {
  const { localAttentionScore, remoteAttentionScore, mutualAttentionTime, totalCallTime, interestLevel } = attentionMetrics;
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [position, setPosition] = React.useState({ 
    x: window.innerWidth - 320, // Start near right edge
    y: window.innerHeight - 400  // Start near bottom
  });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const dashboardRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInterestEmoji = () => {
    switch (interestLevel) {
      case 'high':
        return '🔥';
      case 'medium':
        return '😊';
      default:
        return '😐';
    }
  };

  const getInterestColor = () => {
    switch (interestLevel) {
      case 'high':
        return 'from-red-500 to-pink-500';
      case 'medium':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const mutualAttentionPercentage = totalCallTime > 0 
    ? Math.round((mutualAttentionTime / totalCallTime) * 100)
    : 0;

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    
    setIsDragging(true);
    const rect = dashboardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep within screen bounds
    const maxX = window.innerWidth - (dashboardRef.current?.offsetWidth || 0);
    const maxY = window.innerHeight - (dashboardRef.current?.offsetHeight || 0);
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div 
      className="fixed z-40 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div 
        ref={dashboardRef}
        className={`bg-black/80 backdrop-blur-lg rounded-2xl shadow-2xl border-2 border-white/20 pointer-events-auto transition-all duration-300 ${
          isMinimized ? 'p-3 max-w-fit' : 'p-5 max-w-xs'
        } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        style={{
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-white font-bold flex items-center gap-2 ${isMinimized ? 'text-sm' : 'text-lg'}`}>
            <span>👁️</span>
            {!isMinimized && <span>Attention Tracker</span>}
          </h3>
          <div className="flex items-center gap-2">
            {!isMinimized && <span className="text-4xl animate-pulse">{getInterestEmoji()}</span>}
            
            {/* Drag Handle */}
            <div 
              className="text-white/50 hover:text-white/70 transition-colors cursor-grab active:cursor-grabbing p-1"
              title="Drag to move"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
            
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded cursor-pointer"
              title={isMinimized ? "Expand attention tracker" : "Minimize attention tracker"}
            >
              {isMinimized ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {isMinimized && (
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getInterestEmoji()}</span>
            <div className="text-white text-sm">
              <div className="font-bold">{interestLevel.toUpperCase()}</div>
              <div className="text-xs text-white/70">{mutualAttentionPercentage}% mutual</div>
            </div>
          </div>
        )}

        {/* Full View */}
        {!isMinimized && (
          <>

          {/* Interest Level */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm font-medium">Interest Level</span>
              <span className={`text-white font-bold uppercase text-sm px-3 py-1 rounded-full bg-gradient-to-r ${getInterestColor()}`}>
                {interestLevel}
              </span>
            </div>
          </div>

          {/* Mutual Eye Contact Indicator */}
          {isMutualEyeContact && (
            <div className="mb-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg p-3 border border-pink-500/30 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👀</span>
                  <span className="text-white font-bold">Eye Contact!</span>
                </div>
                <span className="text-white/90 text-sm">{eyeContactDuration.toFixed(1)}s</span>
              </div>
            </div>
          )}

          {/* Attention Scores */}
          <div className="space-y-3 mb-4">
            {/* Your Attention */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/70 text-xs">Your Attention</span>
                <span className="text-white font-bold text-sm">{localAttentionScore}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  style={{ width: `${localAttentionScore}%` }}
                ></div>
              </div>
            </div>

            {/* Their Attention */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/70 text-xs">Their Attention</span>
                <span className="text-white font-bold text-sm">{remoteAttentionScore}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${remoteAttentionScore}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
            <div className="text-center">
              <div className="text-white/60 text-xs mb-1">Mutual Gaze</div>
              <div className="text-white font-bold text-lg">{mutualAttentionPercentage}%</div>
              <div className="text-white/50 text-xs">{formatTime(mutualAttentionTime)}</div>
            </div>
            <div className="text-center">
              <div className="text-white/60 text-xs mb-1">Call Time</div>
              <div className="text-white font-bold text-lg">{formatTime(totalCallTime)}</div>
              <div className="text-white/50 text-xs">total</div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

