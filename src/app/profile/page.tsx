"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { useEffect as useEffectAlias } from "react";
import { ConfigService } from "@/services/ConfigService";
import { CATEGORIES } from "@/constants/categories";

export default function ProfilePage() {
  const { user, userProfile, loading, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [performerCategories, setPerformerCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [isPerformer, setIsPerformer] = useState(false);
  const [selfieAvailable, setSelfieAvailable] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/signin");
    }
    if (userProfile) {
      setDisplayName(userProfile.displayName);
      setInterestedIn(userProfile.preferences.interestedIn);
      setCategories(userProfile.preferences.categories);
      setPerformerCategories((userProfile as any).categories || []);
      setBio(userProfile.bio || "");
      setIsPerformer(userProfile.isPerformer || false);
      setSelfieAvailable(!!userProfile.selfieAvailable);
    }
  }, [user, userProfile, loading, router]);

  // Load dynamic config for interests/categories (fallbacks inside service)
  useEffect(() => {
    (async () => {
      const cfg = await ConfigService.getConfig();
      if (!userProfile) {
        setInterestedIn(cfg.interests);
        setCategories(cfg.categories);
      }
    })();
  }, [userProfile]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = {
        displayName,
        bio,
        isPerformer,
        selfieAvailable,
        preferences: {
          ...userProfile.preferences,
          interestedIn,
          categories,
        },
      };

      if (isPerformer) {
        updates.categories = performerCategories;
      }

      await updateProfile(updates);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    if (interestedIn.includes(interest)) {
      setInterestedIn(interestedIn.filter(i => i !== interest));
    } else {
      setInterestedIn([...interestedIn, interest]);
    }
  };

  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const togglePerformerCategory = (categoryId: string) => {
    if (performerCategories.includes(categoryId)) {
      setPerformerCategories(performerCategories.filter(c => c !== categoryId));
    } else {
      setPerformerCategories([...performerCategories, categoryId]);
    }
  };

  const availableInterests = ["Male", "Female", "Non-binary", "Couples"];
  const availableCategories = [
    "Interactive", "Roleplay", "JOI", "Dominant", "Submissive", 
    "Fetish", "BDSM", "GFE", "Romantic", "Playful", "Sensual", 
    "Energetic", "Intimate", "Experienced", "New", "Fit", "Muscle"
  ];

  const totalSessionTime = userProfile.sessionHistory.reduce((acc, session) => acc + session.duration, 0);
  const totalMinutes = Math.floor(totalSessionTime / 60);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-pink-500/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
              <a href="/">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                  Thumb
                </h1>
              </a>
            </div>
            <button
              onClick={logout}
              className="text-gray-300 hover:text-white transition text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-pink-500/20 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-pink-600/30 to-purple-600/30 p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ProfilePictureUpload
                currentImage={userProfile.profilePicture}
                onUpload={(imageUrl) => updateProfile({ profilePicture: imageUrl })}
                displayName={userProfile.displayName}
              />
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-white mb-1">
                  {userProfile.displayName}
                </h2>
                <p className="text-gray-300">@{userProfile.username}</p>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                  <span className="text-gray-300 text-sm">
                    {userProfile.age} • {userProfile.gender}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-b border-pink-500/20">
            <div className="p-6 border-r border-pink-500/20 text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {userProfile.sessionHistory.length}
              </div>
              <div className="text-gray-400 text-sm mt-1">Sessions</div>
            </div>
            <div className="p-6 border-r border-pink-500/20 text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {totalMinutes}
              </div>
              <div className="text-gray-400 text-sm mt-1">Minutes</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                {userProfile.favorites.length}
              </div>
              <div className="text-gray-400 text-sm mt-1">Favorites</div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-pink-300 text-sm font-medium mb-2">
                Selfie Availability
              </label>
              {isEditing ? (
                <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={selfieAvailable}
                    onChange={(e) => setSelfieAvailable(e.target.checked)}
                    className="w-4 h-4 rounded border-pink-500/30 bg-black/40 text-pink-600 focus:ring-pink-500"
                  />
                  I’m open to sharing a selfie privately with matches
                </label>
              ) : (
                <p className="text-white">{selfieAvailable ? 'Available' : 'Not available'}</p>
              )}
            </div>

            {/* Performer Settings */}
            <div className="pt-4 border-t border-pink-500/20">
              <label className="block text-pink-300 text-sm font-medium mb-2">
                Performer
              </label>
              {isEditing ? (
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={isPerformer}
                      onChange={(e) => setIsPerformer(e.target.checked)}
                      className="w-4 h-4 rounded border-pink-500/30 bg-black/40 text-pink-600 focus:ring-pink-500"
                    />
                    Enable performer mode (be discoverable and connect live)
                  </label>
                  {isPerformer && (
                    <div className="space-y-4">
                      {/* Performer Categories */}
                      <div>
                        <label className="block text-pink-300 text-xs font-medium mb-2">
                          Categories You Offer ({performerCategories.length} selected)
                        </label>
                        <div className="max-h-96 overflow-y-auto p-3 bg-black/20 rounded-lg border border-pink-500/20">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {CATEGORIES.map((category) => {
                              const isSelected = performerCategories.includes(category.id);
                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => togglePerformerCategory(category.id)}
                                  className={`text-left px-4 py-3 rounded-lg text-sm transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border border-purple-400/60 text-white'
                                      : 'bg-black/40 border border-pink-500/20 text-gray-300 hover:border-pink-500/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{category.icon}</span>
                                    <span className="font-semibold">{category.name}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 ml-7">
                                    {category.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-white text-sm space-y-2">
                  <div>Performer: {isPerformer ? 'Enabled' : 'Disabled'}</div>
                  {isPerformer && (
                    <>
                      {performerCategories.length > 0 && (
                        <div className="text-gray-300">
                          <div className="mb-1">Categories: {performerCategories.length}</div>
                          <div className="flex flex-wrap gap-1">
                            {performerCategories.slice(0, 3).map((catId) => {
                              const category = CATEGORIES.find(c => c.id === catId);
                              return category ? (
                                <span
                                  key={catId}
                                  className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 text-xs px-2 py-1 rounded-full border border-purple-500/30"
                                >
                                  {category.icon} {category.name}
                                </span>
                              ) : null;
                            })}
                            {performerCategories.length > 3 && (
                              <span className="text-gray-400 text-xs px-2 py-1">
                                +{performerCategories.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Profile Details</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-pink-400 hover:text-pink-300 transition text-sm font-medium"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="text-gray-400 hover:text-white transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-1 rounded-lg hover:from-pink-700 hover:to-purple-700 transition text-sm font-semibold"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-pink-300 text-sm font-medium mb-2">
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition text-white"
                />
              ) : (
                <p className="text-white">{userProfile.displayName}</p>
              )}
            </div>

            <div>
              <label className="block text-pink-300 text-sm font-medium mb-2">
                Interested In
              </label>
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {["Female", "Male", "Non-binary", "Everyone"].map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleInterest(option)}
                      className={`px-4 py-2 rounded-lg transition ${
                        interestedIn.includes(option)
                          ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                          : "bg-black/30 border border-pink-500/30 text-gray-300 hover:border-pink-500/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userProfile.preferences.interestedIn.length > 0 ? (
                    userProfile.preferences.interestedIn.map((interest, index) => (
                      <span
                        key={index}
                        className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">Not specified</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-pink-500/20">
              <h4 className="text-white font-semibold mb-2">Account Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Username:</span>
                  <span className="text-white">@{userProfile.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Member since:</span>
                  <span className="text-white">
                    {new Date(userProfile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

