"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PerformerCard from "@/components/PerformerCard";
import VideoChat from "@/components/VideoChat";
import ConnectionModal from "@/components/ConnectionModal";
import RatingModal from "@/components/RatingModal";
import SearchBar from "@/components/SearchBar";
import { ToastContainer } from "@/components/NotificationToast";
import { useToast } from "@/hooks/useToast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import LoadingScreen from "@/components/LoadingScreen";
import { PerformerService, type Performer } from "@/services/PerformerService";
import { CallService } from "@/services/CallService";
import IncomingCallToast from "@/components/IncomingCallToast";
import { PresenceService } from "@/services/PresenceService";
import { CATEGORIES } from "@/constants/categories";

// (Removed local mockPerformers; live data comes from Firestore)

export default function Home() {
  const { user, userProfile, loading, logout, addFavorite } = useAuth();
  const router = useRouter();
  const { toasts, removeToast, success, error, info } = useToast();
  const { isUserOnline } = useOnlineStatus();
  const [activeCall, setActiveCall] = useState<{ id: string; name: string; fee: number } | null>(null);
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loadingPerformers, setLoadingPerformers] = useState(true);
  const [connectionModal, setConnectionModal] = useState<{
    isOpen: boolean;
    performer?: Performer;
  }>({ isOpen: false });
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    partnerId?: string;
    partnerName?: string;
    sessionDuration?: number;
  }>({ isOpen: false });
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    roomId: string;
    callerId: string;
    callerName: string;
    isGroupCall?: boolean;
    participants?: Array<{ id: string; name: string }>;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Group call selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPerformers, setSelectedPerformers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

  // Load performers
  useEffect(() => {
    const loadPerformers = async () => {
      if (!user) return;
      
      setLoadingPerformers(true);
      try {
        console.log("🔍 Loading performers with filters:", { filterGender, filterCategory, showOnlineOnly, searchQuery });
        
        const filters = {
          gender: filterGender,
          categories: filterCategory && filterCategory !== 'all' ? [filterCategory] : undefined,
          onlineOnly: showOnlineOnly,
          searchQuery: searchQuery || undefined,
        };
        
        const performerList = await PerformerService.getPerformers(filters);
        console.log(`✅ Loaded ${performerList.length} performers`);
        console.log("Performers:", performerList.map(p => ({ id: p.id, name: p.displayName, isOnline: p.isOnline })));
        
        // Hide current user's own performer card
        const withoutSelf = performerList.filter(p => p.id !== user.uid);
        console.log(`📋 Showing ${withoutSelf.length} performers (excluded self: ${user.uid})`);
        
        setPerformers(withoutSelf);
      } catch (err) {
        console.error('❌ Error loading performers:', err);
        error('Failed to load performers', 'Please try again');
      } finally {
        setLoadingPerformers(false);
      }
    };

    loadPerformers();
  }, [user, filterGender, filterCategory, showOnlineOnly, searchQuery]);

  // Listen for incoming calls for this user
  useEffect(() => {
    if (!user) return;
    const stop = CallService.listenIncoming(user.uid, (invite) => {
      setIncomingCall({
        callId: invite.id,
        roomId: invite.roomId,
        callerId: invite.callerId,
        callerName: invite.callerName,
        isGroupCall: invite.isGroupCall,
        participants: invite.participants,
      });
    });
    return () => stop();
  }, [user]);

  // Subscribe to real-time online status updates
  useEffect(() => {
    if (!user) return;

    // Start presence heartbeat for current user if performer
    let stopHeartbeat: (() => void) | undefined;
    if (userProfile?.isPerformer) {
      console.log("💓 Starting presence heartbeat for performer:", user.uid);
      // Heartbeat every 15 seconds (faster updates)
      stopHeartbeat = PresenceService.startHeartbeat(user.uid, 15000);
    }

    console.log("👂 Subscribing to real-time online status updates");
    const unsubscribe = PerformerService.subscribeToOnlineStatus((onlinePerformers) => {
      console.log(`🔔 Real-time update: ${onlinePerformers.length} online performers`);
      console.log("📋 Online performers:", onlinePerformers.map(p => ({ id: p.id, name: p.displayName, isOnline: p.isOnline })));
      
      // Exclude current user
      let onlineOthers = onlinePerformers.filter(op => op.id !== user.uid);
      console.log(`👥 After excluding self (${user.uid}): ${onlineOthers.length} performers`);

      // Apply simple client-side filters to realtime snapshot
      if (filterGender && filterGender !== 'all') {
        onlineOthers = onlineOthers.filter(op => (op.gender || '').toLowerCase() === filterGender);
        console.log(`🔍 After gender filter (${filterGender}): ${onlineOthers.length} performers`);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        onlineOthers = onlineOthers.filter(op => (
          (op.displayName || '').toLowerCase().includes(q) ||
          (op.username || '').toLowerCase().includes(q) ||
          (op.tags || []).some((t: string) => (t || '').toLowerCase().includes(q)) ||
          (op.bio || '').toLowerCase().includes(q)
        ));
        console.log(`🔍 After search filter (${searchQuery}): ${onlineOthers.length} performers`);
      }

      setPerformers(prev => {
        console.log(`📊 Previous performers count: ${prev.length}`);
        
        // If showing online only, replace list entirely with the snapshot (live list)
        if (showOnlineOnly) {
          console.log("✅ Showing online only - replacing entire list");
          // Ensure all performers have required fields
          return onlineOthers.map(op => ({
            ...op,
            stats: op.stats || { totalSessions: 0, totalMinutes: 0, totalEarnings: 0, favoriteCount: 0 },
            availability: op.availability || { isAvailable: true, timezone: 'UTC' }
          }));
        }

        // Otherwise, merge in any new online performers and update status for existing
        const map = new Map(prev.map(p => [p.id, p]));
        onlineOthers.forEach(op => {
          const existing = map.get(op.id);
          if (existing) {
            console.log(`♻️ Updating existing performer: ${op.displayName}`);
            // Merge carefully to preserve all required fields
            map.set(op.id, { 
              ...existing, 
              ...op, 
              isOnline: true,
              // Ensure required fields are present
              stats: op.stats || existing.stats || { totalSessions: 0, totalMinutes: 0, totalEarnings: 0, favoriteCount: 0 },
              availability: op.availability || existing.availability || { isAvailable: true, timezone: 'UTC' }
            });
          } else {
            console.log(`➕ Adding new online performer: ${op.displayName}`);
            // Ensure new performers have all required fields
            map.set(op.id, {
              ...op,
              stats: op.stats || { totalSessions: 0, totalMinutes: 0, totalEarnings: 0, favoriteCount: 0 },
              availability: op.availability || { isAvailable: true, timezone: 'UTC' }
            });
          }
        });
        // Always exclude current user
        map.delete(user.uid);
        const result = Array.from(map.values());
        console.log(`✅ Final performers count: ${result.length}, online: ${result.filter(p => p.isOnline).length}`);
        return result;
      });
    });

    return () => {
      if (stopHeartbeat) {
        console.log("⏹️ Stopping presence heartbeat");
        stopHeartbeat();
      }
      if (unsubscribe) {
        console.log("🔇 Unsubscribing from online status updates");
        unsubscribe();
      }
    };
  }, [user, userProfile?.isPerformer, filterGender, searchQuery, showOnlineOnly]);

  if (loading) {
    return <LoadingScreen message="Loading your connections..." />;
  }

  if (!user) {
    return null;
  }

  if (!userProfile) {
    return <LoadingScreen message="Setting up your profile..." />;
  }

  const handleConnect = (performerId: string) => {
    const performer = performers.find(p => p.id === performerId);
    if (performer && performer.isOnline && performer.availability.isAvailable) {
      setConnectionModal({ isOpen: true, performer });
    } else if (performer && !performer.isOnline) {
      error('Performer Offline', `${performer.displayName} is currently offline`);
    } else if (performer && !performer.availability.isAvailable) {
      error('Performer Busy', `${performer.displayName} is currently in another session`);
    }
  };

  const confirmConnection = async () => {
    const { performer } = connectionModal;
    if (!performer) return;

    try {
      // Create call invite for the callee
      const { roomId } = await CallService.createCall({
        callerId: user!.uid,
        callerName: userProfile.displayName,
        calleeId: performer.id,
        calleeName: performer.displayName,
      });

      // Don't enter the call yet - wait for callee to accept
      // Listen for the call to be accepted
      info("Calling...", `Calling ${performer.displayName}...`);
      setConnectionModal({ isOpen: false });

      // Listen for call acceptance
      const unsubscribe = CallService.listenForCallAcceptance(user!.uid, performer.id, (accepted) => {
        if (accepted) {
          setActiveCall({ 
            id: performer.id, 
            name: performer.displayName,
            fee: 0 
          });
          success("Connected!", `${performer.displayName} accepted your call`);
        } else {
          error("Call ended", `${performer.displayName} didn't answer`);
        }
        unsubscribe();
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        unsubscribe();
        error("No answer", `${performer.displayName} didn't answer`);
      }, 30000);

    } catch (err) {
      console.error('Error creating call:', err);
      error("Connection failed", "Please try again");
    }
  };

  const acceptIncoming = async () => {
    if (!incomingCall) return;
    await CallService.acceptCall(incomingCall.callId);
    
    if (incomingCall.isGroupCall) {
      // For group calls, use the roomId as the identifier
      // participants array already includes everyone (caller + invitees)
      const participantCount = incomingCall.participants?.length || 2;
      setActiveCall({ 
        id: incomingCall.roomId, 
        name: `Group Call (${participantCount} people)`, 
        fee: 0 
      });
    } else {
      // For 1-on-1 calls
      setActiveCall({ id: incomingCall.callerId, name: incomingCall.callerName, fee: 0 });
    }
    setIncomingCall(null);
  };

  const declineIncoming = async () => {
    if (!incomingCall) return;
    await CallService.endCall(incomingCall.callId);
    setIncomingCall(null);
  };

  const handleEndCall = () => {
    if (activeCall) {
      // Show rating modal after call ends
      setRatingModal({
        isOpen: true,
        partnerId: activeCall.id,
        partnerName: activeCall.name,
        sessionDuration: 0, // This would come from VideoChat component
      });
    }
    setActiveCall(null);
  };

  const handleRating = async (rating: number, comment?: string, addToFavorites?: boolean) => {
    if (ratingModal.partnerId) {
      try {
        // Add to favorites if requested
        if (addToFavorites) {
          await addFavorite(ratingModal.partnerId);
          success("Added to favorites!", `${ratingModal.partnerName} has been added to your favorites`);
        }
        
        // Here you would save the rating to the database
        success("Rating submitted", "Thank you for your feedback!");
      } catch (err) {
        console.error('Error handling rating:', err);
        error("Error", "Failed to process rating");
      } finally {
        setRatingModal({ isOpen: false });
      }
    }
  };

  // Group call handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedPerformers(new Set()); // Clear selection when toggling
  };

  const togglePerformerSelection = (performerId: string) => {
    setSelectedPerformers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(performerId)) {
        newSet.delete(performerId);
      } else {
        if (newSet.size >= 19) { // Max 19 + caller = 20 total
          error("Maximum reached", "You can select up to 19 people for a group call");
          return prev;
        }
        newSet.add(performerId);
      }
      return newSet;
    });
  };

  const startGroupCall = async () => {
    if (selectedPerformers.size === 0) {
      error("No one selected", "Please select at least one person to call");
      return;
    }

    if (selectedPerformers.size === 1) {
      // Just do a normal 1-on-1 call
      const performerId = Array.from(selectedPerformers)[0];
      handleConnect(performerId);
      setSelectionMode(false);
      setSelectedPerformers(new Set());
      return;
    }

    try {
      // Get selected performers
      const selectedPerformersList = performers.filter(p => selectedPerformers.has(p.id));

      // Create group call with all participants
      const participants = [
        { id: user!.uid, name: userProfile!.displayName },
        ...selectedPerformersList.map(p => ({ id: p.id, name: p.displayName }))
      ];

      const { roomId } = await CallService.createGroupCall({
        callerId: user!.uid,
        callerName: userProfile!.displayName,
        participants,
      });

      // Start the group call (total participants = selected + yourself)
      const totalParticipants = selectedPerformers.size + 1;
      setActiveCall({
        id: roomId, // Use roomId as the "partnerId" for group calls
        name: `Group Call (${totalParticipants} people)`,
        fee: 0,
      });

      setSelectionMode(false);
      setSelectedPerformers(new Set());
      success("Group call started!", `Connecting with ${selectedPerformers.size} people`);
    } catch (err) {
      console.error('Error starting group call:', err);
      error("Connection failed", "Please try again");
    }
  };

  // Performers are already filtered by the service
  const filteredPerformers = performers;

  if (activeCall) {
    // Choose video provider based on env var
    const provider = process.env.NEXT_PUBLIC_VC_PROVIDER;
    
    if (provider === 'livekit') {
      const VideoChatLiveKit = require('@/components/VideoChatLiveKit').default;
      return (
        <VideoChatLiveKit
          partnerId={activeCall.id} 
          partnerName={activeCall.name} 
          connectionFee={activeCall.fee} 
          onEndCall={handleEndCall} 
        />
      );
    }
    
    if (provider === '100ms') {
      const VideoChat100msWrapper = require('@/components/VideoChat100msWrapper').default;
      return (
        <VideoChat100msWrapper
          partnerId={activeCall.id} 
          partnerName={activeCall.name} 
          connectionFee={activeCall.fee} 
          onEndCall={handleEndCall} 
        />
      );
    }
    
    // Default: DIY WebRTC P2P
    return <VideoChat partnerId={activeCall.id} partnerName={activeCall.name} connectionFee={activeCall.fee} onEndCall={handleEndCall} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-pink-500/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 md:gap-8">
              <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                Thumb
              </h1>
              
              {/* Desktop Navigation */}
              <nav className="hidden md:flex gap-6">
                <a href="/" className="text-white hover:text-pink-400 transition font-medium">
                  Explore
                </a>
                <a href="/favorites" className="text-gray-300 hover:text-pink-400 transition">
                  Favorites
                </a>
                <a href="/history" className="text-gray-300 hover:text-pink-400 transition">
                  History
                </a>
                <a href="/recordings" className="text-gray-300 hover:text-pink-400 transition">
                  Recordings
                </a>
                <a href="/earnings" className="text-gray-300 hover:text-pink-400 transition">
                  Earnings
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <a
                href="/profile"
                className="flex items-center gap-2 text-white hover:text-pink-400 transition"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {userProfile.displayName[0].toUpperCase()}
                </div>
                <span className="hidden md:block">{userProfile.displayName}</span>
              </a>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-white hover:text-pink-400 transition"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              
              {/* Desktop Logout */}
              <button
                onClick={logout}
                className="hidden md:block text-gray-300 hover:text-white transition text-sm"
              >
                Logout
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-pink-500/20 pt-4">
              <nav className="flex flex-col space-y-3">
                <a href="/" className="text-white hover:text-pink-400 transition font-medium py-2" onClick={() => setMobileMenuOpen(false)}>
                  Explore
                </a>
                <a href="/favorites" className="text-gray-300 hover:text-pink-400 transition py-2" onClick={() => setMobileMenuOpen(false)}>
                  Favorites
                </a>
                <a href="/history" className="text-gray-300 hover:text-pink-400 transition py-2" onClick={() => setMobileMenuOpen(false)}>
                  History
                </a>
                <a href="/recordings" className="text-gray-300 hover:text-pink-400 transition py-2" onClick={() => setMobileMenuOpen(false)}>
                  Recordings
                </a>
                <a href="/earnings" className="text-gray-300 hover:text-pink-400 transition py-2" onClick={() => setMobileMenuOpen(false)}>
                  Earnings
                </a>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="text-left text-gray-300 hover:text-white transition py-2"
                >
                  Logout
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl border border-pink-500/30 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">
                Welcome back, {userProfile.displayName}! 🔥
              </h2>
              <p className="text-sm md:text-base text-gray-300">
                {loadingPerformers ? 'Loading...' : `${filteredPerformers.filter(p => p.isOnline).length} people are live right now`}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 md:space-y-4 mb-6">
          <div className="w-full md:max-w-md">
            <SearchBar onSearch={setSearchQuery} placeholder="Search by name or interests..." />
          </div>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <label className="text-white text-sm font-medium whitespace-nowrap">Filter:</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="flex-1 sm:flex-initial bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-white text-sm md:text-base focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none min-h-[44px]"
              >
                <option value="all">All Genders</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-binary</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <label className="text-white text-sm font-medium whitespace-nowrap">Category:</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="flex-1 sm:flex-initial bg-black/40 backdrop-blur-sm border border-pink-500/30 rounded-lg px-3 md:px-4 py-2 md:py-2.5 text-white text-sm md:text-base focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none min-h-[44px]"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-white cursor-pointer min-h-[44px] px-3 sm:px-0">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="w-5 h-5 md:w-4 md:h-4 rounded border-pink-500/30 bg-black/40 text-pink-600 focus:ring-pink-500"
              />
              <span className="text-sm md:text-base">Online only</span>
            </label>

            <div className="sm:ml-auto text-gray-300 text-sm px-3 sm:px-0 py-2 sm:py-0">
              {filteredPerformers.length} {filteredPerformers.length === 1 ? 'person' : 'people'} found
            </div>
          </div>

          {/* Group Call Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              onClick={toggleSelectionMode}
              className={`px-4 py-2.5 rounded-lg font-semibold transition min-h-[44px] ${
                selectionMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white'
              }`}
            >
              {selectionMode ? '✕ Cancel Selection' : '👥 Start Group Call'}
            </button>

            {selectionMode && (
              <>
                <div className="text-white text-sm px-3 py-2 bg-black/40 rounded-lg border border-pink-500/30 min-h-[44px] flex items-center">
                  <span className="font-semibold text-green-400">{selectedPerformers.size}</span>
                  <span className="mx-1">/</span>
                  <span>19 selected</span>
                </div>
                
                <button
                  onClick={startGroupCall}
                  disabled={selectedPerformers.size === 0}
                  className="px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {selectedPerformers.size === 0 
                    ? 'Select people to call' 
                    : selectedPerformers.size === 1
                    ? 'Call 1 person'
                    : `Call ${selectedPerformers.size} people`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Performers Grid */}
        {loadingPerformers ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-black/40 backdrop-blur-sm rounded-xl overflow-hidden border border-pink-500/20 animate-pulse">
                <div className="aspect-[3/4] bg-gray-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3 mb-3"></div>
                  <div className="flex gap-1">
                    <div className="h-6 bg-gray-700 rounded-full w-16"></div>
                    <div className="h-6 bg-gray-700 rounded-full w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPerformers.map((performer) => (
                <PerformerCard
                  key={performer.id}
                  performer={performer}
                  onConnect={handleConnect}
                  selectionMode={selectionMode}
                  isSelected={selectedPerformers.has(performer.id)}
                  onToggleSelection={togglePerformerSelection}
                />
              ))}
            </div>

            {filteredPerformers.length === 0 && (
              <div className="text-center py-16">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-400 text-lg mb-2">No one matches your search</p>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={connectionModal.isOpen}
        onClose={() => setConnectionModal({ isOpen: false })}
        onConfirm={confirmConnection}
        partnerName={connectionModal.performer?.displayName || ""}
        connectionFee={connectionModal.performer?.connectionFee || 0}
        userBalance={userProfile?.wallet.balance || 0}
      />

      {/* Rating Modal */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false })}
        onSubmit={handleRating}
        partnerName={ratingModal.partnerName || ""}
        partnerId={ratingModal.partnerId || ""}
        sessionDuration={ratingModal.sessionDuration || 0}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {incomingCall && (
        <IncomingCallToast
          callerName={incomingCall.callerName}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
          isGroupCall={incomingCall.isGroupCall}
          participantCount={incomingCall.participants?.length || 2}
        />)
      }
    </div>
  );
}
