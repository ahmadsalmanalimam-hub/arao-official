import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  Eye,
  Coins,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  CheckCircle,
  XCircle,
  Crown,
  Search,
  Sparkles,
  Send,
  Radio,
  Settings,
  RefreshCw,
  Pin,
  ExternalLink,
  Flame,
  ArrowLeft,
  DollarSign,
  Ban,
  UserCheck,
  Tag,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile, VideoItem, SystemSettings } from '../types';
import {
  SUPER_ADMIN_EMAIL,
  getSystemSettings,
  updateSystemSettings,
  getAdminTopStats,
  getAllUsersForAdmin,
  toggleUserVerified,
  toggleUserBanned,
  setUserRole,
  getAllVideosForAdmin,
  deleteVideoByAdmin,
  togglePinVideo,
  toggleSponsoredVideo,
  sendNotificationBlast
} from '../services/adminService';

interface AdminPageProps {
  onNavigateHome?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome }) => {
  const { user, profile } = useAuth();

  // 1. Security Check: verify localStorage or current user email
  const storedUserEmail = localStorage.getItem('arao_user_email') || '';
  const currentUserEmail = user?.email || profile?.email || storedUserEmail;
  const isAuthorizedOwner = currentUserEmail?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    revenueNaira: 0,
    isAppPaused: false
  });

  // Settings state
  const [settings, setSettings] = useState<SystemSettings>({
    isAppPaused: false,
    maintenanceMessage: 'ARAO is upgrading... back soon',
    allowUploads: true,
    allowSignups: true,
    coinsPricePer100: 500,
    referralSystemEnabled: true,
    inviteRewardCoins: 100,
    boostedHashtag: '#challenge',
    totalRevenueNaira: 0
  });

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Videos state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Viral controls state
  const [boostTagInput, setBoostTagInput] = useState('#challenge');
  const [blastMessage, setBlastMessage] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for app settings
  const [maintenanceInput, setMaintenanceInput] = useState('');
  const [coinsPriceInput, setCoinsPriceInput] = useState('500');
  const [inviteRewardInput, setInviteRewardInput] = useState('100');

  useEffect(() => {
    if (isAuthorizedOwner) {
      loadInitialData();
    }
  }, [isAuthorizedOwner]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadInitialData = async () => {
    try {
      const [sData, topStats, userList, videoList] = await Promise.all([
        getSystemSettings(),
        getAdminTopStats(),
        getAllUsersForAdmin(),
        getAllVideosForAdmin()
      ]);

      setSettings(sData);
      setMaintenanceInput(sData.maintenanceMessage);
      setCoinsPriceInput(String(sData.coinsPricePer100 || 500));
      setInviteRewardInput(String(sData.inviteRewardCoins || 100));
      setBoostTagInput(sData.boostedHashtag || '#challenge');

      setStats(topStats);
      setUsers(userList);
      setVideos(videoList);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  // Toggle App Pause
  const handleToggleAppPause = async () => {
    const nextState = !settings.isAppPaused;
    const updated = await updateSystemSettings({ isAppPaused: nextState });
    setSettings(updated);
    setStats(prev => ({ ...prev, isAppPaused: nextState }));
    showToast(
      nextState
        ? '🚨 APP PAUSED! Uploads and feed are locked with maintenance screen.'
        : '✅ APP RESUMED! ARAO is live again.'
    );
  };

  // Save App Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateSystemSettings({
      maintenanceMessage: maintenanceInput.trim() || 'ARAO is upgrading... back soon',
      coinsPricePer100: Number(coinsPriceInput) || 500,
      inviteRewardCoins: Number(inviteRewardInput) || 100,
      boostedHashtag: boostTagInput.trim() || '#challenge'
    });
    setSettings(updated);
    showToast('Platform settings saved successfully.');
  };

  // User Actions
  const handleToggleVerified = async (u: UserProfile) => {
    const nextVal = !u.isVerified;
    await toggleUserVerified(u.uid, nextVal);
    setUsers(prev => prev.map(item => (item.uid === u.uid ? { ...item, isVerified: nextVal } : item)));
    showToast(`User @${u.username} verified status set to ${nextVal}`);
  };

  const handleToggleBanned = async (u: UserProfile) => {
    const nextVal = !u.isBanned;
    await toggleUserBanned(u.uid, nextVal);
    setUsers(prev => prev.map(item => (item.uid === u.uid ? { ...item, isBanned: nextVal } : item)));
    showToast(nextVal ? `User @${u.username} has been BANNED` : `User @${u.username} UNBANNED`);
  };

  const handleMakeAdmin = async (u: UserProfile) => {
    await setUserRole(u.uid, 'admin');
    setUsers(prev => prev.map(item => (item.uid === u.uid ? { ...item, role: 'admin' } : item)));
    showToast(`User @${u.username} is now an Admin`);
  };

  // Video Actions
  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Are you sure you want to delete this video permanently?')) return;
    await deleteVideoByAdmin(videoId);
    setVideos(prev => prev.filter(v => (v.videoId || v.id) !== videoId));
    setStats(prev => ({ ...prev, totalVideos: Math.max(0, prev.totalVideos - 1) }));
    showToast('Video deleted permanently.');
  };

  const handleTogglePin = async (v: VideoItem) => {
    const nextVal = !v.isPinned;
    await togglePinVideo(v.videoId || v.id, nextVal);
    setVideos(prev =>
      prev.map(item => ((item.videoId || item.id) === (v.videoId || v.id) ? { ...item, isPinned: nextVal } : item))
    );
    showToast(nextVal ? 'Video pinned to top of For You!' : 'Video unpinned.');
  };

  const handleToggleSponsored = async (v: VideoItem) => {
    const nextVal = !v.isSponsored;
    await toggleSponsoredVideo(v.videoId || v.id, nextVal);
    setVideos(prev =>
      prev.map(item => ((item.videoId || item.id) === (v.videoId || v.id) ? { ...item, isSponsored: nextVal } : item))
    );
    showToast(nextVal ? 'Video marked as Sponsored Ad' : 'Video unmarked from Sponsored.');
  };

  // Viral Controls
  const handleBoostHashtag = async () => {
    const tag = boostTagInput.startsWith('#') ? boostTagInput.trim() : `#${boostTagInput.trim()}`;
    await updateSystemSettings({ boostedHashtag: tag });
    setSettings(prev => ({ ...prev, boostedHashtag: tag }));
    showToast(`Hashtag ${tag} boosted to #1 Trending!`);
  };

  const handleSendNotificationBlast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blastMessage.trim()) return;
    setBlastSending(true);
    try {
      const reached = await sendNotificationBlast(blastMessage.trim(), user?.uid || 'arao');
      setBlastMessage('');
      showToast(`🚀 Push Notification blasted to ${reached} users successfully!`);
    } catch (err) {
      console.error(err);
      showToast('Failed to dispatch notification blast.');
    } finally {
      setBlastSending(false);
    }
  };

  // Security Access Denied Screen
  if (!isAuthorizedOwner) {
    return (
      <div className="min-h-screen w-full bg-[#080810] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ACCESS DENIED
        </h1>
        <p className="text-sm text-[#A5A5B5] max-w-md mt-2 leading-relaxed">
          The Super Admin Owner Dashboard is strictly restricted to authorized owner email{' '}
          <strong className="text-white font-mono">{SUPER_ADMIN_EMAIL}</strong>.
        </p>
        <p className="text-xs text-rose-400 mt-2 font-mono">
          Current session: {currentUserEmail || 'Anonymous'}
        </p>

        <button
          onClick={() => {
            if (onNavigateHome) onNavigateHome();
            else window.location.href = '/';
          }}
          className="mt-8 py-3 px-8 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)]"
        >
          Return to ARAO Stream
        </button>
      </div>
    );
  }

  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen w-full bg-[#080810] text-white font-sans pb-24 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 py-2.5 px-5 rounded-2xl bg-[#1A1926] border border-[#8B5CF6] text-xs font-bold text-white shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0F0E17]/90 backdrop-blur-xl border-b border-[#8B5CF6]/30 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              else window.location.href = '/';
            }}
            className="p-2 rounded-xl bg-[#1A1926] hover:bg-[#8B5CF6]/20 text-gray-300 hover:text-white border border-white/10 transition-colors"
            title="Return to App"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-wide">
                ARAO SUPER ADMIN
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#C4B5FD] text-[10px] font-black uppercase">
                Owner Center
              </span>
            </div>
            <p className="text-[11px] text-[#A5A5B5] font-mono">
              Authorized: {SUPER_ADMIN_EMAIL}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadInitialData}
            className="p-2 rounded-xl bg-[#1A1926] hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
        {/* TOP STATS & BIG RED PAUSE BUTTON */}
        <section className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Users */}
            <div className="p-5 rounded-3xl bg-[#12121C] border border-[#8B5CF6]/25 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Total Users</span>
                <Users className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-3xl font-black text-white mt-3">
                {stats.totalUsers.toLocaleString()}
              </div>
              <span className="text-[10px] text-emerald-400 mt-1">Live accounts</span>
            </div>

            {/* 2. Total Videos */}
            <div className="p-5 rounded-3xl bg-[#12121C] border border-white/10 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Total Videos</span>
                <Video className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-black text-white mt-3">
                {stats.totalVideos.toLocaleString()}
              </div>
              <span className="text-[10px] text-purple-300 mt-1">Uploaded clips</span>
            </div>

            {/* 3. Total Views */}
            <div className="p-5 rounded-3xl bg-[#12121C] border border-white/10 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Total Views</span>
                <Eye className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-3xl font-black text-white mt-3">
                {stats.totalViews.toLocaleString()}
              </div>
              <span className="text-[10px] text-sky-300 mt-1">Global impressions</span>
            </div>

            {/* 4. Revenue (₦ coins) */}
            <div className="p-5 rounded-3xl bg-[#12121C] border border-amber-500/20 flex flex-col justify-between shadow-lg">
              <div className="flex items-center justify-between text-gray-400 text-xs font-semibold">
                <span>Total Revenue</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-300 mt-3">
                ₦{stats.revenueNaira.toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-400 mt-1">Coins & subscriptions</span>
            </div>

            {/* 5. [BIG RED BUTTON] PAUSE APP */}
            <div className="col-span-2 lg:col-span-1 p-3 rounded-3xl bg-[#12121C] border border-white/10 flex flex-col justify-center">
              <button
                onClick={handleToggleAppPause}
                className={`w-full h-full min-h-[90px] rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 p-3 transition-all active:scale-95 shadow-xl cursor-pointer ${
                  settings.isAppPaused
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/30'
                    : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-600/40 animate-pulse'
                }`}
              >
                {settings.isAppPaused ? (
                  <>
                    <Play className="w-6 h-6 fill-white" />
                    <span>RESUME APP</span>
                    <span className="text-[9px] font-normal opacity-80 lowercase">currently paused</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-6 h-6" />
                    <span>PAUSE APP</span>
                    <span className="text-[9px] font-normal opacity-80 lowercase">locks uploads & feed</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Active Maintenance Alert Banner */}
          {settings.isAppPaused && (
            <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>
                  <strong>MAINTENANCE ACTIVE:</strong> Regular users see: &quot;{settings.maintenanceMessage}&quot;
                </span>
              </div>
              <button
                onClick={handleToggleAppPause}
                className="py-1 px-3 rounded-lg bg-emerald-500 text-white font-bold text-xs"
              >
                Resume
              </button>
            </div>
          )}
        </section>

        {/* SECTION A: USER MANAGEMENT TABLE */}
        <section className="p-6 rounded-3xl bg-[#12121C] border border-[#8B5CF6]/20 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8B5CF6]" /> USER MANAGEMENT
              </h2>
              <p className="text-xs text-[#A5A5B5]">
                Verify creators, ban abusive accounts, or assign admin privileges
              </p>
            </div>

            {/* Search by email or username */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by email or @username..."
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-xs focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0A0914]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1A1926] text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Verified</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No users found matching query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                            alt={u.username}
                            className="w-8 h-8 rounded-full object-cover border border-[#8B5CF6]"
                          />
                          <div>
                            <span className="font-bold text-white block truncate max-w-[120px]">
                              {u.displayName || u.username}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-mono">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-gray-300">
                        {u.email}
                      </td>

                      <td className="py-3 px-4">
                        {u.isVerified || u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-[10px]">
                            Standard
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.isBanned ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Banned
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 uppercase text-[10px] font-bold">
                        <span
                          className={
                            u.role === 'admin'
                              ? 'text-amber-300'
                              : u.role === 'creator'
                              ? 'text-[#C4B5FD]'
                              : 'text-gray-400'
                          }
                        >
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Verified */}
                          <button
                            onClick={() => handleToggleVerified(u)}
                            className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              u.isVerified
                                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                            title={u.isVerified ? 'Remove Verified' : 'Give Verified'}
                          >
                            {u.isVerified ? '❌ Unverify' : '✅ Verify'}
                          </button>

                          {/* Toggle Ban */}
                          <button
                            onClick={() => handleToggleBanned(u)}
                            disabled={u.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()}
                            className={`p-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              u.isBanned
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            }`}
                            title={u.isBanned ? 'Unban User' : 'Ban User'}
                          >
                            {u.isBanned ? 'Unban' : '🚫 Ban'}
                          </button>

                          {/* Make Admin */}
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleMakeAdmin(u)}
                              className="p-1.5 rounded-lg bg-[#8B5CF6]/20 text-[#C4B5FD] hover:bg-[#8B5CF6]/40 text-[11px] font-bold flex items-center gap-1"
                              title="Make Admin"
                            >
                              <Crown className="w-3 h-3" />
                              <span>Admin</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION B: VIDEO MANAGEMENT */}
        <section className="p-6 rounded-3xl bg-[#12121C] border border-[#8B5CF6]/20 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-400" /> VIDEO MANAGEMENT
              </h2>
              <p className="text-xs text-[#A5A5B5]">
                Feature top videos to For You, mark as Sponsored Ads, or delete inappropriate content
              </p>
            </div>
            <span className="text-xs text-gray-400">{videos.length} videos</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-500">
                No videos uploaded yet.
              </div>
            ) : (
              videos.map(v => (
                <div
                  key={v.videoId || v.id}
                  className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-20 rounded-xl bg-black overflow-hidden relative shrink-0 border border-white/10">
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt={v.caption} className="w-full h-full object-cover" />
                      ) : (
                        <video src={v.videoUrl} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs truncate">@{v.username}</span>
                        {v.isPinned && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-black text-[9px] font-black uppercase">
                            Pinned
                          </span>
                        )}
                        {v.isSponsored && (
                          <span className="px-1.5 py-0.2 rounded bg-[#8B5CF6] text-white text-[9px] font-black uppercase">
                            Ad
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-300 line-clamp-2 mt-1">{v.caption}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2">
                        <span>👁 {v.viewsCount || 0}</span>
                        <span>❤️ {v.likesCount || 0}</span>
                        <span>💬 {v.commentsCount || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleTogglePin(v)}
                        className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                          v.isPinned
                            ? 'bg-amber-400 text-black'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                        title="Pin to top of For You"
                      >
                        <Pin className="w-3 h-3" />
                        <span>{v.isPinned ? 'Unpin' : 'Feature / Pin'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleSponsored(v)}
                        className={`py-1.5 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                          v.isSponsored
                            ? 'bg-[#8B5CF6] text-white'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                        title="Mark as sponsored ad"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{v.isSponsored ? 'Sponsored ✓' : 'Mark as Ad'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteVideo(v.videoId || v.id)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 transition-colors"
                      title="Delete Video Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* SECTION C & D: VIRAL CHEAT CODE + APP SETTINGS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* C) VIRAL CHEAT CODE - BLOW CONTROLS */}
          <section className="p-6 rounded-3xl bg-[#12121C] border border-[#8B5CF6]/30 space-y-5 shadow-xl">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> VIRAL CHEAT CODE — BLOW CONTROLS
              </h2>
              <p className="text-xs text-[#A5A5B5]">
                Supercharge organic platform engagement, invite rewards & push blasts
              </p>
            </div>

            {/* 1. Referral System Toggle */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white block">Referral Growth System</span>
                <span className="text-[11px] text-gray-400">
                  Allow users to invite friends and earn ARAO coins
                </span>
              </div>
              <button
                onClick={async () => {
                  const nextVal = !settings.referralSystemEnabled;
                  const res = await updateSystemSettings({ referralSystemEnabled: nextVal });
                  setSettings(res);
                  showToast(nextVal ? 'Referral System ENABLED' : 'Referral System DISABLED');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  settings.referralSystemEnabled
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {settings.referralSystemEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 2. Invite Reward Coins */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-400" /> Invite Reward (Coins per referral)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={inviteRewardInput}
                  onChange={e => setInviteRewardInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0A0914] border border-white/10 text-white text-xs font-mono focus:border-[#8B5CF6] focus:outline-none"
                  placeholder="100"
                />
                <button
                  onClick={async () => {
                    const amt = Number(inviteRewardInput) || 100;
                    await updateSystemSettings({ inviteRewardCoins: amt });
                    setSettings(prev => ({ ...prev, inviteRewardCoins: amt }));
                    showToast(`Reward set to ${amt} coins per friend invited`);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#7000FF] text-white font-bold text-xs"
                >
                  Save Reward
                </button>
              </div>
              <p className="text-[10px] text-gray-400">Default: Give 100 coins for each friend invited</p>
            </div>

            {/* 3. Trending Boost Hashtag */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-400" /> Trending Boost (Push Hashtag to #1)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={boostTagInput}
                  onChange={e => setBoostTagInput(e.target.value)}
                  placeholder="e.g. #challenge or #ARAOViral"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0A0914] border border-white/10 text-white text-xs font-mono focus:border-[#8B5CF6] focus:outline-none"
                />
                <button
                  onClick={handleBoostHashtag}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Boost Tag
                </button>
              </div>
              <p className="text-[10px] text-amber-300">Active boosted tag: {settings.boostedHashtag}</p>
            </div>

            {/* 4. Notification Blast */}
            <form onSubmit={handleSendNotificationBlast} className="p-4 rounded-2xl bg-[#1A1926] border border-[#8B5CF6]/30 space-y-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-rose-400 animate-pulse" /> Notification Blast (Send to ALL Users)
              </label>
              <textarea
                rows={2}
                value={blastMessage}
                onChange={e => setBlastMessage(e.target.value)}
                placeholder="Type urgent announcement or viral alert to all users..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0914] border border-white/10 text-white text-xs focus:border-[#8B5CF6] focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={blastSending || !blastMessage.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{blastSending ? 'Blasting to All Users...' : 'Send Broadcast Blast'}</span>
              </button>
            </form>
          </section>

          {/* D) APP SETTINGS */}
          <section className="p-6 rounded-3xl bg-[#12121C] border border-[#8B5CF6]/20 space-y-5 shadow-xl">
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-300" /> APP PLATFORM SETTINGS
              </h2>
              <p className="text-xs text-[#A5A5B5]">
                Configure upload availability, registration gating, coins rate & maintenance copy
              </p>
            </div>

            {/* Toggle: Allow Uploads ON/OFF */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white block">Allow Uploads</span>
                <span className="text-[11px] text-gray-400">
                  Enable or disable creator video publishing
                </span>
              </div>
              <button
                onClick={async () => {
                  const nextVal = !settings.allowUploads;
                  const res = await updateSystemSettings({ allowUploads: nextVal });
                  setSettings(res);
                  showToast(nextVal ? 'Uploads are now ENABLED' : 'Uploads are now PAUSED');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  settings.allowUploads
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {settings.allowUploads ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Toggle: Allow Signups ON/OFF */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-white block">Allow New Signups</span>
                <span className="text-[11px] text-gray-400">
                  Allow or lock new user account registrations
                </span>
              </div>
              <button
                onClick={async () => {
                  const nextVal = !settings.allowSignups;
                  const res = await updateSystemSettings({ allowSignups: nextVal });
                  setSettings(res);
                  showToast(nextVal ? 'New Signups ENABLED' : 'New Signups LOCKED');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  settings.allowSignups
                    ? 'bg-emerald-500 text-white'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {settings.allowSignups ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Maintenance Message */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white block">
                Maintenance Message (Shown when app paused)
              </label>
              <input
                type="text"
                value={maintenanceInput}
                onChange={e => setMaintenanceInput(e.target.value)}
                placeholder="ARAO is upgrading... back soon"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0914] border border-white/10 text-white text-xs focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            {/* Coins Price Editor */}
            <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 space-y-2">
              <label className="text-xs font-bold text-white block">
                Coins Price Editor (₦ Naira per 100 coins)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-amber-400">₦</span>
                <input
                  type="number"
                  value={coinsPriceInput}
                  onChange={e => setCoinsPriceInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0A0914] border border-white/10 text-white text-xs font-mono focus:border-[#8B5CF6] focus:outline-none"
                  placeholder="500"
                />
                <span className="text-xs text-gray-400">per 100 coins</span>
              </div>
            </div>

            {/* Save All Settings Button */}
            <button
              onClick={handleSaveSettings}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7000FF] hover:opacity-90 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30"
            >
              Save Platform Configuration
            </button>
          </section>
        </div>
      </main>
    </div>
  );
};
export default AdminPage;
