"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RecordedSession } from "@/contexts/AuthContext";
import { VideoStorageService } from "@/utils/videoStorage";

export default function RecordingsPage() {
  const { user, userProfile, loading, deleteRecording } = useAuth();
  const router = useRouter();
  const [selectedRecording, setSelectedRecording] = useState<RecordedSession | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
  }, [user, loading, router]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: any) => {
    try {
      // Handle Firestore Timestamp, Date object, string, or number
      let d: Date;
      
      if (date?.toDate && typeof date.toDate === 'function') {
        // Firestore Timestamp
        d = date.toDate();
      } else if (date?.seconds) {
        // Firestore Timestamp format { seconds, nanoseconds }
        d = new Date(date.seconds * 1000);
      } else if (date instanceof Date) {
        d = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        d = new Date(date);
      } else {
        return 'Recent';
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        return 'Recent';
      }
      
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Recent';
    }
  };

  const handleDownloadRecording = async (recording: RecordedSession) => {
    if (!recording.videoUrl) {
      alert('❌ No video URL available for this recording');
      return;
    }

    try {
      console.log('⬇️ Starting download:', recording.title);
      
      // Create a temporary anchor element
      const link = document.createElement('a');
      link.href = recording.videoUrl;
      link.download = `${recording.title.replace(/[^a-z0-9]/gi, '_')}_${recording.id}.webm`;
      link.target = '_blank'; // Open in new tab if download fails
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Download initiated');
    } catch (error) {
      console.error('❌ Download error:', error);
      alert('❌ Failed to download recording. You can try right-clicking the video and selecting "Save video as..."');
    }
  };

  const handleDeleteRecording = async (recordingId: string) => {
    if (!user) {
      alert('You must be logged in to delete recordings');
      return;
    }
    
    setIsDeleting(true);
    console.log('🗑️ Starting delete for recording:', recordingId);
    
    try {
      // First, update user profile to remove the recording from the list
      console.log('📝 Removing from user profile...');
      await deleteRecording(recordingId);
      console.log('✅ Removed from user profile');
      
      // Then try to delete from Firebase Storage (but don't fail if files don't exist)
      try {
        console.log('📁 Deleting from Firebase Storage...');
        await VideoStorageService.deleteRecording(recordingId, user.uid);
        console.log('✅ Deleted from Firebase Storage');
      } catch (storageError) {
        console.warn('⚠️ Could not delete from storage (files may not exist):', storageError);
        // Continue anyway - the recording is removed from the user's list
      }
      
      // Close modal if this recording was selected
      if (selectedRecording?.id === recordingId) {
        setSelectedRecording(null);
      }
      
      setDeleteConfirm(null);
      console.log('✅ Recording deleted successfully');
      alert('✅ Recording deleted successfully!');
    } catch (error) {
      console.error('❌ Failed to delete recording:', error);
      alert(`❌ Failed to delete recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

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
                <a href="/recordings" className="text-white hover:text-pink-400 transition font-medium">
                  My Recordings
                </a>
                <a href="/earnings" className="text-gray-300 hover:text-pink-400 transition">
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">My Recordings 🎥</h2>
          <div className="bg-black/40 backdrop-blur-sm border border-pink-500/20 rounded-lg px-4 py-2">
            <span className="text-gray-400 text-sm">Total Recordings: </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-lg">
              {userProfile.recordings.length}
            </span>
          </div>
        </div>

        {userProfile.recordings.length === 0 ? (
          <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 p-12 text-center">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No recordings yet</h3>
            <p className="text-gray-400 mb-6">Start recording your video calls to save and share memorable moments!</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold"
            >
              Start Connecting
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userProfile.recordings.map((recording) => (
              <div
                key={recording.id}
                className="bg-black/40 backdrop-blur-sm rounded-xl border border-pink-500/20 overflow-hidden hover:border-pink-500/50 transition group cursor-pointer"
                onClick={() => {
                  setVideoError(null);
                  setSelectedRecording(recording);
                }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center">
                  {recording.thumbnail ? (
                    <img
                      src={recording.thumbnail}
                      alt={recording.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-pink-500/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                  
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(recording.duration)}
                  </div>

                  {recording.isPublic && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                      PUBLIC
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 z-10">
                    {/* Download Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadRecording(recording);
                      }}
                      className="w-8 h-8 bg-blue-500/80 hover:bg-blue-600 rounded-full flex items-center justify-center transition"
                      title="Download recording"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(recording.id);
                      }}
                      className="w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center transition"
                      title="Delete recording"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1 truncate">{recording.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">with {recording.partnerUsername}</p>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-pink-500/20">
                    <span className="text-gray-400">{formatDate(recording.timestamp)}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      <span>{recording.views} views</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recording Modal (simplified preview) */}
        {selectedRecording && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setVideoError(null);
              setSelectedRecording(null);
            }}
          >
            <div
              className="bg-black/90 border border-pink-500/30 rounded-2xl max-w-4xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video bg-black">
                {videoError ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 to-pink-900/30 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                      <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="text-xl font-bold text-white mb-2">Cannot Play Video</h3>
                      <p className="text-gray-300 text-sm mb-4">{videoError}</p>
                      <button 
                        onClick={() => {
                          setVideoError(null);
                          console.log('🔄 Retrying video load...');
                        }}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : selectedRecording.videoUrl ? (
                  <video
                    key={selectedRecording.id}
                    src={selectedRecording.videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full"
                    controlsList="nodownload"
                    onError={(e) => {
                      console.error('❌ Video playback error:', e);
                      console.error('Video URL:', selectedRecording.videoUrl);
                      const videoElement = e.target as HTMLVideoElement;
                      const errorCode = videoElement.error?.code;
                      const errorMessage = videoElement.error?.message;
                      console.error('Error code:', errorCode);
                      console.error('Error message:', errorMessage);
                      
                      // Set user-friendly error message
                      let friendlyError = 'The video file could not be loaded.';
                      if (errorCode === 4) {
                        friendlyError = 'Video file not found or access denied. The recording may have been deleted or you may not have permission to view it.';
                      } else if (errorCode === 3) {
                        friendlyError = 'Video format not supported by your browser.';
                      } else if (errorCode === 2) {
                        friendlyError = 'Network error while loading video. Check your connection and try again.';
                      }
                      
                      setVideoError(friendlyError);
                    }}
                    onLoadedMetadata={() => {
                      console.log('✅ Video loaded successfully');
                      setVideoError(null);
                    }}
                  >
                    <p className="text-white p-4">Your browser doesn't support video playback.</p>
                  </video>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-900/30 to-purple-900/30 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-24 h-24 text-pink-500/50 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <p className="text-gray-400">Video not available</p>
                      <p className="text-gray-500 text-sm mt-2">This recording was created before video storage was enabled</p>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    setVideoError(null);
                    setSelectedRecording(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition z-10"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <h2 className="text-2xl font-bold text-white mb-2">{selectedRecording.title}</h2>
                <p className="text-gray-400 mb-4">with {selectedRecording.partnerUsername}</p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-pink-500/10 rounded-lg p-3">
                    <div className="text-pink-400 text-sm mb-1">Views</div>
                    <div className="text-white font-semibold">{selectedRecording.views}</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3">
                    <div className="text-blue-400 text-sm mb-1">Duration</div>
                    <div className="text-white font-semibold">{formatDuration(selectedRecording.duration)}</div>
                  </div>
                  <div className="bg-purple-500/10 rounded-lg p-3">
                    <div className="text-purple-400 text-sm mb-1">Recorded</div>
                    <div className="text-white font-semibold">{formatDate(selectedRecording.timestamp)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => handleDownloadRecording(selectedRecording)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                  <button className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition font-semibold">
                    Share Link
                  </button>
                  <button className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold">
                    {selectedRecording.isPublic ? 'Make Private' : 'Make Public'}
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(selectedRecording.id)}
                    className="px-4 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition font-semibold flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <div
              className="bg-black/90 border border-red-500/30 rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Delete Recording?</h3>
                  <p className="text-gray-400 text-sm">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this recording? The video file and all data will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteRecording(deleteConfirm)}
                  disabled={isDeleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

