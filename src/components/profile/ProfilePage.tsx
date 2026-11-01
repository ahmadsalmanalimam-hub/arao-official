import React, { useState, useEffect } from 'react';
import {
  Grid,
  Bookmark,
  Heart,
  Settings,
  Edit3,
  MessageSquare,
  Lock,
  Play,
  Share2,
  Calendar,
  Trash2,
  Loader2,
  UserPlus,
  UserCheck,
  History,
  X,
  Crown,
  Wallet,
  Sparkles
} from 'lucide-react';
import { UserProfile, VideoItem, WatchHistoryItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getUserProfile,
  checkFollowStatus,
  followUser,
  unfollowUser,
  getDefaultHumanAvatar
} from '../../services/userService';
import {
  getUserVideos,
  getSavedVideos,
  deleteVideo,
  getWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory
} from '../../services/videoService';
import { EditProfileModal } from './EditProfileModal';
import { SettingsPage } from '../settings/SettingsPage';
import { ChatModal } from '../inbox/ChatModal';

interface ProfilePageProps {
  viewUserId?: string;
  onSelectVideo: (video: VideoItem) => void;
  onOpenSelf?: () => void;
  onOpenMonetization?: (tab?: 'earnings' | 'ads' | 'premium' | 'admin') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  viewUserId,
  onSelectVideo,
  onOpenMonetization
}) => {
  const { user, profile: myProfile, openAuthModal } = useAuth();

  const isOwnProfile = !viewUserId || (user && user.uid === viewUserId);
  const targetUid = viewUserId || user?.uid;

  const [profileData, setProfileData] = useState<UserProfile | null>(isOwnProfile ? myProfile : null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'saved' | 'history'>('videos');
  const [loading, setLoading] = useState(true);

  const [followStatus, setFollowStatus] = useState<'none' | 'active' | 'pending'>('none');
  const [followLoading, setFollowLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }
    loadProfileAndContent();
  }, [targetUid, isOwnProfile, myProfile]);

  const loadProfileAndContent = async () => {
    if (!targetUid) return;
    setLoading(true);

    try {
      if (isOwnProfile && myProfile) {
        setProfileData(myProfile);
      } else {
        const fetched = await getUserProfile(targetUid);
        setProfileData(fetched);
      }

      if (user && !isOwnProfile) {
        const status = await checkFollowStatus(user.uid, targetUid);
        setFollowStatus(status);
      }

      const vids = await getUserVideos(targetUid);
      setVideos(vids);

      if (isOwnProfile && user) {
        const saved = await getSavedVideos(user.uid);
        setSavedVideos(saved);

        const history = await getWatchHistory(user.uid, 30);
        setHistoryItems(history);
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || !myProfile) {
      openAuthModal('login');
      return;
    }
    if (!profileData) return;

    setFollowLoading(true);
    try {
      if (followStatus === 'active' || followStatus === 'pending') {
        await unfollowUser(user.uid, profileData.uid);
        setFollowStatus('none');
        setProfileData(prev => prev ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1) } : null);
      } else {
        const status = await followUser(
          { uid: user.uid, username: myProfile.username, avatar: myProfile.avatar },
          { uid: profileData.uid, isPrivate: profileData.isPrivate }
        );
        setFollowStatus(status);
        if (status === 'active') {
          setProfileData(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !window.confirm('Delete this video permanently?')) return;

    try {
      await deleteVideo(videoId, user.uid);
      setVideos(prev => prev.filter(v => v.videoId !== videoId));
      setProfileData(prev => prev ? { ...prev, videoCount: Math.max(0, prev.videoCount - 1) } : null);
      showToast('Video deleted');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveHistoryItem = async (historyId: string, videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await removeWatchHistoryItem(user.uid, videoId);
      setHistoryItems(prev => prev.filter(h => h.historyId !== historyId));
      showToast('Removed from watch history');
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllHistory = async () => {
    if (!user || !window.confirm('Clear your entire watch history?')) return;
    try {
      await clearWatchHistory(user.uid);
      setHistoryItems([]);
      showToast('Watch history cleared');
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}?profile=${profileData?.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profileData?.displayName} on ARAO`,
          url
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Profile link copied to clipboard!');
    }
  };

  const formatJoinDate = (createdAt: any) => {
    if (!createdAt) return 'Recently';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (isOwnProfile && !user) {
    return (
      <div className="w-full min-h-screen bg-[#080810] text-white flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#1A1926] border border-purple-500/30 flex items-center justify-center text-[#8B00FF] mb-4 shadow-[0_0_20px_rgba(139,0,255,0.3)]">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display">Creator Profile</h2>
        <p className="text-xs text-[#A5A5B5] mt-2 max-w-xs mb-6">
          Sign in or register on ARAO to upload short videos, build your community, and customize your profile.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-semibold text-xs shadow-lg hover:opacity-95"
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  if (loading && !profileData) {
    return (
      <div className="w-full min-h-screen bg-[#080810] text-white flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-[#8B00FF]" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="w-full min-h-screen bg-[#080810] text-white flex flex-col items-center justify-center text-center p-6">
        <p className="text-sm text-gray-400">User profile not found.</p>
      </div>
    );
  }

  const isLockedPrivate = !isOwnProfile && profileData.isPrivate && followStatus !== 'active';
  const totalLikes = profileData.totalLikesCount || videos.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  return (
    <div className="w-full min-h-screen bg-[#080810] text-white pb-24 max-w-lg mx-auto relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 py-2 px-4 rounded-xl bg-[#12121C] border border-purple-500/40 text-xs font-semibold text-white shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Cover Banner */}
      <div className="relative w-full h-36 sm:h-44 bg-[#12121C] overflow-hidden">
        {profileData.coverImage ? (
          <img src={profileData.coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#3900A8] via-[#7000FF] to-[#12121C]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-transparent to-black/30" />

        {/* Top Header Actions */}
        <div className="absolute top-3 inset-x-4 flex items-center justify-between z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-white/90 drop-shadow">
            @{profileData.username}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareProfile}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-[#8B00FF] border border-white/10"
              title="Share profile"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:text-[#8B00FF] border border-white/10"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Details Container */}
      <div className="px-4 -mt-14 relative z-10 flex flex-col items-center text-center mb-6">
        {/* Large Human Avatar with Purple Ring */}
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full p-[2.5px] bg-gradient-to-tr from-[#7000FF] via-[#8B00FF] to-[#FF1744] shadow-[0_0_25px_rgba(139,0,255,0.4)]">
            <img
              src={profileData.avatar || getDefaultHumanAvatar(profileData.displayName || profileData.username)}
              alt={profileData.username}
              className="w-full h-full rounded-full object-cover bg-[#12121C]"
            />
          </div>
          {profileData.isPrivate && (
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#12121C] border border-[#8B00FF] text-[#8B00FF]">
              <Lock className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Name and Verified Badge */}
        {(() => {
          const isVerified =
            profileData.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
            profileData.isVerified === true ||
            profileData.username?.toLowerCase() === 'arao' ||
            (isOwnProfile && (
              user?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
              myProfile?.isVerified === true ||
              myProfile?.username?.toLowerCase() === 'arao'
            ));

          const isVIP =
            profileData.isPremium ||
            profileData.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
            (isOwnProfile && (user?.email?.toLowerCase() === 'nasirandco001@gmail.com' || myProfile?.isPremium));

          return (
            <>
              <h1 className="text-lg font-bold flex items-center gap-1.5 text-white">
                {profileData.displayName}
                {isVerified && (
                  <span
                    className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] text-white font-bold text-[9px] inline-flex items-center justify-center shadow-[0_0_8px_rgba(139,0,255,0.7)]"
                    title="Verified Official Account"
                  >
                    ✓
                  </span>
                )}
                {isVIP && (
                  <span
                    className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 text-black font-black text-[9px] inline-flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                    title="ARAO VIP Member"
                  >
                    ★
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-[#A5A5B5] font-mono">@{profileData.username}</p>
                {isVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B00FF]/25 text-[#D8B4FE] border border-[#8B00FF]/40 font-semibold tracking-wide">
                    Official
                  </span>
                )}
                {isVIP && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold tracking-wide flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5" /> VIP
                  </span>
                )}
              </div>
            </>
          );
        })()}

        {/* Bio */}
        {profileData.bio && (
          <p className="text-xs text-gray-200 mt-2 max-w-sm leading-relaxed">
            {profileData.bio}
          </p>
        )}

        {/* Join Date */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#A5A5B5] mt-2">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Joined {formatJoinDate(profileData.createdAt)}</span>
        </div>

        {/* 4 Professional Statistics: Posts, Followers, Following, Total Likes */}
        <div className="grid grid-cols-4 gap-2 mt-4 py-2.5 px-3 bg-[#12121C] border border-purple-500/15 rounded-2xl w-full max-w-sm">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white">
              {videos.length || profileData.videoCount || 0}
            </span>
            <span className="text-[10px] text-[#A5A5B5]">Posts</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white">
              {profileData.followersCount || 0}
            </span>
            <span className="text-[10px] text-[#A5A5B5]">Followers</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-white">
              {profileData.followingCount || 0}
            </span>
            <span className="text-[10px] text-[#A5A5B5]">Following</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-[#FF1744]">
              {totalLikes > 999 ? `${(totalLikes / 1000).toFixed(1)}k` : totalLikes}
            </span>
            <span className="text-[10px] text-[#A5A5B5]">Likes</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-4 w-full max-w-sm">
          {isOwnProfile ? (
            <div className="flex flex-col w-full">
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex-1 py-2 px-3 bg-[#1A1926] hover:bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#8B00FF]" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => onOpenMonetization?.('earnings')}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-950/70 to-[#7000FF]/40 hover:from-purple-900/80 hover:to-[#7000FF]/60 border border-purple-500/40 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(139,0,255,0.25)] cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Monetization & Ads</span>
                </button>
              </div>
              {user?.email?.toLowerCase() === 'nasirandco001@gmail.com' && (
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="w-full mt-2 py-2 px-3 bg-gradient-to-r from-amber-500/20 via-[#8B5CF6]/30 to-purple-900/30 hover:opacity-90 border border-[#8B5CF6]/50 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Owner Admin Dashboard (/admin)</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleToggleFollow}
                disabled={followLoading}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  followStatus === 'active'
                    ? 'bg-[#1A1926] text-white border border-white/20'
                    : followStatus === 'pending'
                    ? 'bg-[#12121C] text-yellow-300 border border-yellow-500/40'
                    : 'bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white shadow-[0_0_15px_rgba(139,0,255,0.4)]'
                }`}
              >
                {followLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : followStatus === 'active' ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Following</span>
                  </>
                ) : followStatus === 'pending' ? (
                  <span>Requested</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    openAuthModal('login');
                    return;
                  }
                  setChatOpen(true);
                }}
                className="py-2 px-4 bg-[#1A1926] hover:bg-zinc-800 border border-white/10 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex border-b border-purple-500/15 mb-4 px-4">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'videos'
              ? 'text-white border-b-2 border-[#8B00FF]'
              : 'text-[#A5A5B5] hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Videos</span>
        </button>

        {isOwnProfile && (
          <>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'saved'
                  ? 'text-white border-b-2 border-[#8B00FF]'
                  : 'text-[#A5A5B5] hover:text-white'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'history'
                  ? 'text-white border-b-2 border-[#8B00FF]'
                  : 'text-[#A5A5B5] hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>
          </>
        )}
      </div>

      {/* Content Area */}
      <div className="px-4">
        {isLockedPrivate ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#12121C] border border-purple-500/30 flex items-center justify-center mx-auto text-[#8B00FF]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">This Account is Private</h3>
            <p className="text-xs text-[#A5A5B5] max-w-xs mx-auto">
              Follow this creator to unlock their full video stream and updates.
            </p>
          </div>
        ) : activeTab === 'videos' ? (
          videos.length === 0 ? (
            <div className="py-16 text-center text-[#A5A5B5]">
              <p className="text-xs">No videos published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {videos.map((video) => (
                <div
                  key={video.videoId || video.id}
                  onClick={() => onSelectVideo(video)}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#12121C] border border-purple-500/15 group cursor-pointer hover:border-[#8B00FF]/50 transition-colors"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5">
                    <div className="flex items-center justify-between text-[10px] text-white font-semibold">
                      <span className="flex items-center gap-0.5">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        {video.viewsCount || 0}
                      </span>
                      {isOwnProfile && (
                        <button
                          onClick={(e) => handleDeleteVideo(video.videoId, e)}
                          className="p-1 rounded-md bg-black/60 text-red-400 hover:text-red-300 transition-colors"
                          title="Delete video"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'saved' ? (
          savedVideos.length === 0 ? (
            <div className="py-16 text-center text-[#A5A5B5]">
              <Bookmark className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
              <p className="text-xs">No saved videos yet.</p>
              <p className="text-[11px] text-[#A5A5B5] mt-1">
                Tap the bookmark icon on any video to save it here privately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {savedVideos.map((video) => (
                <div
                  key={video.videoId || video.id}
                  onClick={() => onSelectVideo(video)}
                  className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#12121C] border border-purple-500/15 group cursor-pointer hover:border-[#8B00FF]/50 transition-colors"
                >
                  <img
                    src={video.thumbnailUrl}
                    alt={video.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5">
                    <span className="text-[10px] text-white font-semibold flex items-center gap-0.5">
                      <Play className="w-2.5 h-2.5 fill-white" />
                      {video.viewsCount || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Watch History Tab */
          <div>
            <div className="flex items-center justify-between mb-3 text-xs text-[#A5A5B5]">
              <span>Recently watched videos ({historyItems.length})</span>
              {historyItems.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="text-red-400 hover:underline text-[11px]"
                >
                  Clear All History
                </button>
              )}
            </div>

            {historyItems.length === 0 ? (
              <div className="py-16 text-center text-[#A5A5B5]">
                <History className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
                <p className="text-xs">No watch history yet.</p>
                <p className="text-[11px] text-[#A5A5B5] mt-1">
                  Videos you stream on ARAO will appear here so you can re-watch them anytime.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {historyItems.map((item) => (
                  <div
                    key={item.historyId || item.id}
                    onClick={() => onSelectVideo(item.videoData)}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#12121C] border border-purple-500/15 group cursor-pointer hover:border-[#8B00FF]/50 transition-colors"
                  >
                    <img
                      src={item.videoData?.thumbnailUrl}
                      alt={item.videoData?.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      onClick={(e) => handleRemoveHistoryItem(item.historyId, item.videoId, e)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-gray-300 hover:text-red-400 transition-colors"
                      title="Remove from history"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5 pointer-events-none">
                      <p className="text-[9px] text-gray-200 truncate">
                        @{item.videoData?.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {editModalOpen && (
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSuccess={loadProfileAndContent}
        />
      )}

      {/* Settings Modal */}
      {settingsModalOpen && (
        <SettingsPage
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          onOpenEditProfile={() => setEditModalOpen(true)}
        />
      )}

      {/* Direct Chat Modal */}
      {chatOpen && profileData && (
        <ChatModal
          targetUser={profileData}
          onClose={() => setChatOpen(false)}
          onOpenProfile={() => {}}
        />
      )}
    </div>
  );
};
