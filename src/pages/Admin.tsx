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
  Gift,
  FileCheck,
  ShoppingBag,
  CreditCard,
  Building,
  Calendar,
  Lock,
  Clock,
  Check,
  X,
  FileText,
  BadgeCheck,
  History,
  TrendingUp,
  AlertCircle,
  Phone,
  Mail,
  Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  VideoItem,
  SystemSettings,
  VerificationRequest,
  EngagementOrder,
  PaymentSettings,
  PremiumSubscription,
  AdminLog,
  BadgeType,
  UserRole
} from '../types';
import {
  SUPER_ADMIN_EMAIL,
  getSystemSettings,
  updateSystemSettings,
  getAdminTopStats,
  getAllVideosForAdmin,
  deleteVideoByAdmin,
  togglePinVideo,
  toggleSponsoredVideo,
  sendNotificationBlast
} from '../services/adminService';
import {
  OWNER_EMAIL,
  fetchAllUsersForAdmin,
  updateUserRoleAndBadge,
  getVerificationRequests,
  reviewVerificationRequest,
  getEngagementOrders,
  verifyAndCompleteOrder,
  getPaymentSettings,
  updatePaymentSettings,
  getPremiumSubscriptions,
  activatePremiumSubscription,
  getAdminLogs,
  logAdminAction,
  DEFAULT_PAYMENT_SETTINGS,
  manualActivatePremium,
  manualActivateEngagementBoost,
  getManualBoosts,
  updateBoostStatus
} from '../services/supabaseService';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { ManualPromotionBoost } from '../types';
import { Loader2 } from 'lucide-react';
import { PaymentSettingsAdmin } from '../components/admin/PaymentSettings';

interface AdminPageProps {
  onNavigateHome?: () => void;
}

type AdminTab =
  | 'overview'
  | 'users'
  | 'verifications'
  | 'orders'
  | 'fulfilment'
  | 'subscriptions'
  | 'payments'
  | 'admins'
  | 'reports'
  | 'logs';

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome }) => {
  const { user, profile } = useAuth();

  // 1. Security Check: verify owner/admin authorization
  const storedUserEmail = localStorage.getItem('arao_user_email') || '';
  const currentUserEmail = user?.email || profile?.email || storedUserEmail;
  const isOwner = currentUserEmail?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isAdmin = isOwner || profile?.role === 'admin' || profile?.role === 'owner_admin';

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    revenueNaira: 0,
    isAppPaused: false
  });

  // System settings state
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

  // Tab Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [verifFilter, setVerifFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loadingVerifs, setLoadingVerifs] = useState(false);

  const [orders, setOrders] = useState<EngagementOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'rejected'>('all');
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [subscriptions, setSubscriptions] = useState<PremiumSubscription[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [savingPayments, setSavingPayments] = useState(false);

  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [videos, setVideos] = useState<VideoItem[]>([]);

  // Viral controls
  const [boostTagInput, setBoostTagInput] = useState('#challenge');
  const [blastMessage, setBlastMessage] = useState('');
  const [blastSending, setBlastSending] = useState(false);

  // App Pause Modal / confirmation
  const [maintenanceInput, setMaintenanceInput] = useState('');

  const [manualBoosts, setManualBoosts] = useState<ManualPromotionBoost[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [fulfilmentMode, setFulfilmentMode] = useState<'premium' | 'boost'>('premium');
  
  // Premium activation form state
  const [subTier, setSubTier] = useState<'monthly' | 'yearly'>('monthly');
  const [subMonths, setSubMonths] = useState<number>(1);
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');

  // Boost form state
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [boostAmountInput, setBoostAmountInput] = useState<number>(500);
  const [boostTypeInput, setBoostTypeInput] = useState<'video' | 'post' | 'profile'>('video');
  const [boostDurationDays, setBoostDurationDays] = useState<number>(7);
  const [fulfilmentBusy, setFulfilmentBusy] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllAdminData = async () => {
    try {
      const [sData, topStats, userList, videoList, verifList, orderList, subList, pSettings, logList, boostList] =
        await Promise.all([
          getSystemSettings(),
          getAdminTopStats(),
          fetchAllUsersForAdmin(),
          getAllVideosForAdmin(),
          getVerificationRequests(),
          getEngagementOrders(),
          getPremiumSubscriptions(),
          getPaymentSettings(),
          getAdminLogs(),
          getManualBoosts()
        ]);

      setSettings(sData);
      setMaintenanceInput(sData.maintenanceMessage);
      setBoostTagInput(sData.boostedHashtag || '#challenge');
      setStats(topStats);
      setUsers(userList);
      setVideos(videoList);
      setVerifications(verifList);
      setOrders(orderList);
      setSubscriptions(subList);
      setPaymentSettings(pSettings);
      setAdminLogs(logList);
      setManualBoosts(boostList);
    } catch (err) {
      console.error('Error loading admin data:', err);
    }
  };

  // 1. App Pause / Maintenance Toggle
  const handleTogglePauseApp = async () => {
    const nextPaused = !settings.isAppPaused;
    const msg = maintenanceInput.trim() || 'ARAO is upgrading... back soon';
    await updateSystemSettings({ isAppPaused: nextPaused, maintenanceMessage: msg });
    setSettings(prev => ({ ...prev, isAppPaused: nextPaused, maintenanceMessage: msg }));
    setStats(prev => ({ ...prev, isAppPaused: nextPaused }));
    showToast(nextPaused ? '⚠️ ARAO APP PAUSED — Maintenance active.' : '✅ ARAO APP RESUMED — Live for all users.');
    await logAdminAction(currentUserEmail, currentUserEmail, 'TOGGLE_APP_PAUSE', 'system', 'app', { isPaused: nextPaused, message: msg });
  };

  // 2. User Permission Updates
  const handleUpdateUserBadge = async (uid: string, badgeType: BadgeType) => {
    const isVerified = badgeType !== 'none';
    const isOfficial = badgeType === 'business_blue';
    await updateUserRoleAndBadge(uid, { badgeType, isVerified, isOfficial }, currentUserEmail);
    setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, badgeType, isVerified, isOfficial } : u)));
    showToast(`Badge updated to ${badgeType} for user.`);
  };

  const handleUpdateUserRole = async (uid: string, role: UserRole) => {
    try {
      await updateUserRoleAndBadge(uid, { role }, currentUserEmail);
      setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, role } : u)));
      showToast(`User role updated to ${role}.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update role.');
    }
  };

  const handleToggleUserBan = async (u: UserProfile) => {
    const nextBanned = !u.isBanned;
    await updateUserRoleAndBadge(u.uid, { isBanned: nextBanned }, currentUserEmail);
    setUsers(prev => prev.map(item => (item.uid === u.uid ? { ...item, isBanned: nextBanned } : item)));
    showToast(nextBanned ? `User @${u.username} has been BANNED.` : `User @${u.username} unbanned.`);
  };

  // 3. Verification Reviews
  const handleReviewVerification = async (requestId: string, status: 'approved' | 'rejected') => {
    await reviewVerificationRequest(requestId, status, currentUserEmail);
    const updated = await getVerificationRequests();
    setVerifications(updated);
    const userList = await fetchAllUsersForAdmin();
    setUsers(userList);
    showToast(`Verification request ${status.toUpperCase()} successfully!`);
  };

  // 4. Order Verification
  const handleVerifyOrder = async (orderId: string) => {
    await verifyAndCompleteOrder(orderId, currentUserEmail);
    const updated = await getEngagementOrders();
    setOrders(updated);
    const subs = await getPremiumSubscriptions();
    setSubscriptions(subs);
    showToast(`Order ${orderId} verified and activated!`);
  };

  // 5. Payment Settings Update (Owner only)
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayments(true);
    try {
      const saved = await updatePaymentSettings(paymentSettings, currentUserEmail);
      setPaymentSettings(saved);
      showToast('Payment settings and pricing updated successfully! 💳');
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment settings.');
    } finally {
      setSavingPayments(false);
    }
  };

  // 6. Notification Blast
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
  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full bg-[#080810] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ACCESS DENIED
        </h1>
        <p className="text-sm text-[#A5A5B5] max-w-md mt-2 leading-relaxed">
          The ARAO Super Admin Dashboard is restricted to authorized platform administrators and the owner{' '}
          <strong className="text-white font-mono">{OWNER_EMAIL}</strong>.
        </p>
        <p className="text-xs text-rose-400 mt-2 font-mono">
          Current session: {currentUserEmail || 'Anonymous'}
        </p>

        <button
          onClick={() => {
            if (onNavigateHome) onNavigateHome();
            else window.location.href = '/';
          }}
          className="mt-8 py-3 px-8 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-white font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-md cursor-pointer"
        >
          Return to ARAO Feed
        </button>
      </div>
    );
  }

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const q = userSearchQuery.toLowerCase();
    const matchesQuery =
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q));

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesQuery && matchesRole;
  });

  const filteredVerifications = verifications.filter(v =>
    verifFilter === 'all' ? true : v.status === verifFilter
  );

  const filteredOrders = orders.filter(o =>
    orderFilter === 'all' ? true : o.status === orderFilter
  );

  // Verified revenue calculations
  const totalVerifiedRevenueNgn = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + (o.amountNaira || 0), 0);

  const totalVerifiedRevenueUsd = orders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + (o.amountUsd || 0), 0);

  return (
    <div className="min-h-screen w-full bg-[#080810] text-white font-sans pb-24 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 py-2.5 px-5 rounded-2xl bg-[#1A1926] border border-[#8A2BE2] text-xs font-bold text-white shadow-2xl animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8A2BE2]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0F0E17]/95 backdrop-blur-md border-b border-purple-500/20 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              else window.location.href = '/';
            }}
            className="p-2 rounded-xl bg-[#171626] border border-white/10 hover:border-[#8A2BE2] text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Return to ARAO Feed"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>ARAO SUPER ADMIN</span>
              </h1>
              <span className="text-[10px] font-mono uppercase bg-[#8A2BE2]/20 border border-[#8A2BE2]/40 text-[#D8B4FE] px-2 py-0.5 rounded-full font-bold">
                {isOwner ? 'Owner Center' : 'Admin Panel'}
              </span>
            </div>
            <p className="text-[11px] text-[#A5A5B5] flex items-center gap-2 mt-0.5">
              <span>Logged in as: <strong className="text-purple-300">{currentUserEmail}</strong></span>
              {isOwner && <span className="text-amber-400 font-bold">• Owner Authority Active</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllAdminData}
            className="p-2 rounded-xl bg-[#171626] border border-white/10 hover:border-[#8A2BE2] text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-purple-500/15">
          {[
            { id: 'overview', label: 'Overview', icon: <Eye className="w-3.5 h-3.5" /> },
            { id: 'users', label: `All Users (${users.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'verifications', label: `Verification Requests (${verifications.filter(v => v.status === 'pending').length})`, icon: <BadgeCheck className="w-3.5 h-3.5" /> },
            { id: 'orders', label: `Store Orders (${orders.filter(o => o.status === 'pending').length})`, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            { id: 'fulfilment', label: 'Manual Fulfilment', icon: <Gift className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> },
            { id: 'subscriptions', label: `Subscriptions (${subscriptions.length})`, icon: <Crown className="w-3.5 h-3.5 text-amber-400" /> },
            { id: 'payments', label: 'Payment Settings', icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'admins', label: 'Manage Admins', icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> },
            { id: 'logs', label: 'Admin Logs', icon: <History className="w-3.5 h-3.5" /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-white shadow-[0_0_15px_rgba(138,43,226,0.4)]'
                  : 'bg-[#12121C] text-gray-400 hover:text-white border border-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW & TOP STATS
           ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20 shadow-md">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-semibold">Total Users</span>
                  <Users className="w-4 h-4 text-[#8A2BE2]" />
                </div>
                <div className="text-2xl font-black text-white">{users.length || stats.totalUsers}</div>
                <span className="text-[10px] text-purple-300 font-mono">Real accounts registered</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20 shadow-md">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-semibold">Total Videos / Posts</span>
                  <Video className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white">{videos.length || stats.totalVideos}</div>
                <span className="text-[10px] text-cyan-300 font-mono">Stream & photo posts</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20 shadow-md">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-semibold">Verified Store Revenue</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₦{totalVerifiedRevenueNgn.toLocaleString()}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">${totalVerifiedRevenueUsd} USD</span>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20 shadow-md">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-semibold">Pending Actions</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">
                  {verifications.filter(v => v.status === 'pending').length + orders.filter(o => o.status === 'pending').length}
                </div>
                <span className="text-[10px] text-amber-300 font-mono">Orders & Verifications</span>
              </div>
            </div>

            {/* BIG RED PAUSE APP BUTTON SECTION */}
            <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#171626] to-black border border-rose-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white uppercase tracking-wide">
                    Emergency App Circuit Breaker
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      settings.isAppPaused
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {settings.isAppPaused ? 'APP PAUSED' : 'SYSTEM OPERATIONAL'}
                  </span>
                </div>
                <p className="text-xs text-gray-300 max-w-xl leading-relaxed">
                  Stops all user video feeds and uploads. Displays full-screen maintenance upgrade banner to all visitors.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={maintenanceInput}
                    onChange={(e) => setMaintenanceInput(e.target.value)}
                    placeholder="ARAO is upgrading... back soon"
                    className="py-1 px-3 rounded-lg bg-black/60 border border-white/10 text-xs text-white w-64 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[10px] text-gray-400">Maintenance broadcast message</span>
                </div>
              </div>

              <button
                onClick={handleTogglePauseApp}
                className={`py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider shadow-2xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  settings.isAppPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)] animate-pulse'
                }`}
              >
                {settings.isAppPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
                <span>{settings.isAppPaused ? 'RESUME ARAO LIVE' : '[BIG RED BUTTON] PAUSE APP'}</span>
              </button>
            </div>

            {/* Quick Viral Controls & Push Notifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/20">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-[#8A2BE2]" />
                  <span>Trending Algorithmic Boost</span>
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Instantly pin a viral hashtag to #1 on the Explore and Trending pages across ARAO.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={boostTagInput}
                    onChange={(e) => setBoostTagInput(e.target.value)}
                    placeholder="#challenge"
                    className="flex-1 py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                  />
                  <button
                    onClick={async () => {
                      const tag = boostTagInput.startsWith('#') ? boostTagInput.trim() : `#${boostTagInput.trim()}`;
                      await updateSystemSettings({ boostedHashtag: tag });
                      setSettings(prev => ({ ...prev, boostedHashtag: tag }));
                      showToast(`Hashtag ${tag} boosted to #1 Trending!`);
                      await logAdminAction(currentUserEmail, currentUserEmail, 'BOOST_HASHTAG', tag, 'hashtag');
                    }}
                    className="py-2 px-4 rounded-xl bg-[#8A2BE2] hover:bg-[#7000FF] text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Boost
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/20">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Universal Notification Blast</span>
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Broadcast high-priority push notification and inbox message to all active users.
                </p>
                <form onSubmit={handleSendNotificationBlast} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={blastMessage}
                    onChange={(e) => setBlastMessage(e.target.value)}
                    placeholder="Exclusive drop: Rema live in Lagos studio..."
                    className="flex-1 py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                  />
                  <button
                    type="submit"
                    disabled={blastSending || !blastMessage.trim()}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] hover:opacity-95 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Blast</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ALL USERS DATA (With Email, Phone, Role, Badges, RLS-Enforced)
           ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by username, full email, display name, or phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 whitespace-nowrap">Role Filter:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                >
                  <option value="all">All Roles</option>
                  <option value="owner_admin">Owner Admin</option>
                  <option value="admin">Admin</option>
                  <option value="creator">Creator</option>
                  <option value="advertiser">Advertiser</option>
                  <option value="user">Standard User</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-3xl bg-[#0F0E17] border border-purple-500/20 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#12121C] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Full Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Followers</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Badge</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Login</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredUsers.map((u) => {
                      const isTargetOwner = u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

                      return (
                        <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                          {/* User avatar & name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={u.avatar}
                                alt={u.username}
                                className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
                              />
                              <div>
                                <div className="font-bold text-white flex items-center gap-1">
                                  <span>{u.displayName || u.username}</span>
                                  <VerifiedBadge badgeType={u.badgeType} isVerified={u.isVerified} size="xs" />
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono">@{u.username}</span>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4 font-mono text-[11px] text-purple-200">{u.email}</td>

                          {/* Phone */}
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-400">
                            {u.phone || '—'}
                          </td>

                          {/* Followers */}
                          <td className="py-3 px-4 font-mono text-white">
                            {(u.followersCount || 0).toLocaleString()}
                          </td>

                          {/* Role selector */}
                          <td className="py-3 px-4">
                            {isTargetOwner ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                OWNER ADMIN
                              </span>
                            ) : (
                              <select
                                value={u.role || 'user'}
                                onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as UserRole)}
                                className="py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-[10px] text-white focus:outline-none focus:border-[#8A2BE2]"
                              >
                                <option value="user">User</option>
                                <option value="creator">Creator</option>
                                <option value="advertiser">Advertiser</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </td>

                          {/* Badge selector */}
                          <td className="py-3 px-4">
                            <select
                              value={u.badgeType || (u.isVerified ? 'creator_purple' : 'none')}
                              onChange={(e) => handleUpdateUserBadge(u.uid, e.target.value as BadgeType)}
                              disabled={isTargetOwner}
                              className="py-1 px-2 rounded-lg bg-black/60 border border-white/10 text-[10px] text-white focus:outline-none focus:border-[#8A2BE2]"
                            >
                              <option value="none">None</option>
                              <option value="creator_purple">Creator (Purple #8A2BE2)</option>
                              <option value="business_blue">Business (Blue #1D9BF0)</option>
                            </select>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                u.isBanned
                                  ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                  : u.isPremium
                                  ? 'bg-amber-950 text-amber-300 border border-amber-400/40'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {u.isBanned ? 'BANNED' : u.isPremium ? 'VIP MEMBER' : 'ACTIVE'}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td className="py-3 px-4 font-mono text-[10px] text-gray-400">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Recent'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {!isTargetOwner && (
                              <button
                                onClick={() => handleToggleUserBan(u)}
                                className={`py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.isBanned
                                    ? 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800'
                                    : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-500/30'
                                }`}
                              >
                                {u.isBanned ? 'Unban' : 'Ban'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: VERIFICATION REQUESTS (Creator Purple vs Business Blue)
           ========================================================================= */}
        {activeTab === 'verifications' && (
          <div className="space-y-4 animate-fade-in">
            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setVerifFilter(f)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    verifFilter === f
                      ? 'bg-[#8A2BE2] text-white shadow-md'
                      : 'bg-[#12121C] text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Applications List */}
            {filteredVerifications.length === 0 ? (
              <div className="p-12 text-center text-gray-500 rounded-3xl bg-[#0F0E17] border border-purple-500/20">
                No verification requests found matching this filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVerifications.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/25 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">@{req.username}</span>
                        <VerifiedBadge badgeType={req.requestedBadge} size="sm" />
                        <span className="text-[10px] font-mono text-purple-300">({req.category})</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          req.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : req.status === 'rejected'
                            ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-300 space-y-1 font-sans">
                      <div>
                        Legal Name: <strong className="text-white">{req.fullLegalName}</strong>
                      </div>
                      {req.businessName && (
                        <div>
                          Business: <strong className="text-cyan-300">{req.businessName}</strong>
                        </div>
                      )}
                      <div>
                        Email: <span className="font-mono text-purple-200">{req.email}</span>
                      </div>
                      {req.socialLinks && <div>Handles: <span className="text-gray-400">{req.socialLinks}</span></div>}
                      {req.notes && <div className="text-[11px] text-gray-400 italic">"{req.notes}"</div>}
                    </div>

                    {/* Document Link */}
                    {req.documentUrl && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <a
                          href={req.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#8A2BE2] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Submitted ID / Proof Document</span>
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}

                    {/* Action buttons */}
                    {req.status === 'pending' && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleReviewVerification(req.id, 'approved')}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Badge</span>
                        </button>
                        <button
                          onClick={() => handleReviewVerification(req.id, 'rejected')}
                          className="py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-semibold text-xs border border-rose-500/30 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: ENGAGEMENT STORE ORDERS
           ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'completed', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setOrderFilter(f)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    orderFilter === f ? 'bg-[#8A2BE2] text-white shadow-md' : 'bg-[#12121C] text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="rounded-3xl bg-[#0F0E17] border border-purple-500/20 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#12121C] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Order ID & Date</th>
                      <th className="py-3 px-4">Customer Email</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method & Ref</th>
                      <th className="py-3 px-4">Receipt Proof</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <div className="text-white font-bold">{ord.orderId}</div>
                          <span className="text-[10px] text-gray-500">{new Date(ord.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-purple-200">{ord.customerEmail}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">{ord.productTitle}</span>
                          {ord.targetUrl && <span className="block text-[10px] text-gray-400 truncate max-w-xs">{ord.targetUrl}</span>}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          ${ord.amountUsd} / ₦{ord.amountNaira.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          <span className="capitalize">{ord.paymentMethod.replace('_', ' ')}</span>
                          <span className="block text-gray-400">{ord.paymentReference}</span>
                        </td>
                        <td className="py-3 px-4">
                          {ord.proofFileUrl ? (
                            <a
                              href={ord.proofFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#8A2BE2] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </a>
                          ) : (
                            <span className="text-gray-500 text-[10px]">No upload</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              ord.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : ord.status === 'rejected'
                                ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-950 text-amber-400 border border-amber-500/30 animate-pulse'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {ord.status === 'pending' && (
                            <button
                              onClick={() => handleVerifyOrder(ord.orderId)}
                              className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow-sm cursor-pointer"
                            >
                              Verify & Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PREMIUM SUBSCRIPTIONS (Accurate Expiration & Activation)
           ========================================================================= */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-3xl bg-[#0F0E17] border border-purple-500/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Active VIP Subscribers</span>
                </h3>
                <p className="text-xs text-gray-400">Server-verified expiration dates with automated perks activation</p>
              </div>
              <span className="text-sm font-bold font-mono text-amber-300">
                {subscriptions.filter(s => s.isActive).length} active memberships
              </span>
            </div>

            <div className="rounded-3xl bg-[#0F0E17] border border-purple-500/20 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#12121C] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Subscription ID</th>
                      <th className="py-3 px-4">Subscriber</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Price Paid</th>
                      <th className="py-3 px-4">Starts At</th>
                      <th className="py-3 px-4">Expires At</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-bold text-white">{sub.subscriptionId}</td>
                        <td className="py-3 px-4 font-mono text-purple-200">{sub.userEmail}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-bold text-amber-400">{sub.tier} VIP</span>
                        </td>
                        <td className="py-3 px-4 font-mono">${sub.pricePaid}</td>
                        <td className="py-3 px-4 font-mono text-gray-400">{new Date(sub.startsAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono text-amber-300 font-bold">{new Date(sub.expiresAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              sub.isActive
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {sub.isActive ? 'Active' : 'Expired'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: PAYMENT SETTINGS (Fully Visible ONLY to Owner)
           ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-4 animate-fade-in">
            {!isOwner ? (
              <div className="p-8 text-center rounded-3xl bg-[#0F0E17] border border-rose-500/30 text-rose-300 text-xs">
                Restricted Area: Sensitive Nigerian bank account and PayPal payment credentials can only be viewed and modified by the Owner account ({OWNER_EMAIL}).
              </div>
            ) : (
              <form onSubmit={handleSavePaymentSettings} className="p-6 rounded-3xl bg-[#0F0E17] border border-purple-500/25 space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Platform Payment Gateway & Store Pricing</span>
                    </h3>
                    <p className="text-xs text-gray-400">Configure bank transfer destinations and editable pricing</p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingPayments}
                    className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-md cursor-pointer disabled:opacity-40"
                  >
                    {savingPayments ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bank Details */}
                  <div className="p-4 rounded-2xl bg-[#12121C] border border-white/5 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Nigerian Bank Transfer Details
                    </h4>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={paymentSettings.bankName}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, bankName: e.target.value })}
                        className="w-full py-1.5 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={paymentSettings.accountNumber}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, accountNumber: e.target.value })}
                        className="w-full py-1.5 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-amber-400 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Account Name</label>
                      <input
                        type="text"
                        value={paymentSettings.accountName}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, accountName: e.target.value })}
                        className="w-full py-1.5 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* PayPal & Instructions */}
                  <div className="p-4 rounded-2xl bg-[#12121C] border border-white/5 space-y-3">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wide">PayPal & Exchange</h4>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">PayPal Email</label>
                      <input
                        type="email"
                        value={paymentSettings.paypalEmail}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, paypalEmail: e.target.value })}
                        className="w-full py-1.5 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-cyan-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Exchange Rate (USD to NGN)</label>
                      <input
                        type="number"
                        value={paymentSettings.exchangeRateUsdToNgn}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, exchangeRateUsdToNgn: Number(e.target.value) })}
                        className="w-full py-1.5 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Checkout Instructions</label>
                      <textarea
                        value={paymentSettings.instructions}
                        onChange={(e) => setPaymentSettings({ ...paymentSettings, instructions: e.target.value })}
                        rows={2}
                        className="w-full py-1 px-3 rounded-lg bg-black/50 border border-white/10 text-xs text-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Promo Product Prices Editor */}
                <div className="p-4 rounded-2xl bg-[#12121C] border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                    Store Product Pricing
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Account Promo ($ / ₦)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={paymentSettings.accountPromoPriceUsd}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, accountPromoPriceUsd: Number(e.target.value) })}
                          className="w-16 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={paymentSettings.accountPromoPriceNgn}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, accountPromoPriceNgn: Number(e.target.value) })}
                          className="flex-1 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Post Engagement ($ / ₦)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={paymentSettings.postPromoPriceUsd}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, postPromoPriceUsd: Number(e.target.value) })}
                          className="w-16 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={paymentSettings.postPromoPriceNgn}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, postPromoPriceNgn: Number(e.target.value) })}
                          className="flex-1 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Comment Promo ($ / ₦)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={paymentSettings.commentPromoPriceUsd}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, commentPromoPriceUsd: Number(e.target.value) })}
                          className="w-16 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={paymentSettings.commentPromoPriceNgn}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, commentPromoPriceNgn: Number(e.target.value) })}
                          className="flex-1 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Monthly VIP ($ / ₦)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={paymentSettings.monthlyPremiumPriceUsd}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, monthlyPremiumPriceUsd: Number(e.target.value) })}
                          className="w-16 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={paymentSettings.monthlyPremiumPriceNgn}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, monthlyPremiumPriceNgn: Number(e.target.value) })}
                          className="flex-1 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Yearly VIP ($ / ₦)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          value={paymentSettings.yearlyPremiumPriceUsd}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, yearlyPremiumPriceUsd: Number(e.target.value) })}
                          className="w-16 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                        <input
                          type="number"
                          value={paymentSettings.yearlyPremiumPriceNgn}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, yearlyPremiumPriceNgn: Number(e.target.value) })}
                          className="flex-1 py-1 px-2 rounded bg-black border border-white/10 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 7: MANAGE ADMINS
           ========================================================================= */}
        {activeTab === 'admins' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-3xl bg-[#0F0E17] border border-purple-500/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Authorized Administrators</span>
              </h3>
              <p className="text-xs text-gray-400">
                Only the platform owner ({OWNER_EMAIL}) has authority to add or revoke administrators.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users
                .filter(u => u.role === 'admin' || u.role === 'owner_admin' || u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase())
                .map((adminUser) => (
                  <div
                    key={adminUser.uid}
                    className="p-4 rounded-2xl bg-[#0F0E17] border border-purple-500/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={adminUser.avatar}
                        alt={adminUser.username}
                        className="w-10 h-10 rounded-full object-cover border border-purple-500/40"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{adminUser.displayName || adminUser.username}</span>
                          {adminUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase() ? (
                            <span className="text-[9px] px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              OWNER
                            </span>
                          ) : (
                            <span className="text-[9px] px-2 py-0.2 rounded bg-[#8A2BE2]/20 text-[#D8B4FE] font-bold border border-[#8A2BE2]/40">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-purple-200">{adminUser.email}</span>
                      </div>
                    </div>

                    {isOwner && adminUser.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase() && (
                      <button
                        onClick={() => handleUpdateUserRole(adminUser.uid, 'user')}
                        className="py-1 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-500/30 cursor-pointer"
                      >
                        Revoke Admin
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: MANUAL PAYMENT FULFILMENT CENTRE (Owner Control Center)
           ========================================================================= */}
        {activeTab === 'fulfilment' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#0F0E17] to-black border border-purple-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-400" />
                  <span>Manual Payment Fulfilment Centre</span>
                </h3>
                <p className="text-xs text-gray-300 mt-1">
                  Owner-exclusive control center to verify payments and instantly activate Premium or Engagement Boosts without editing database records manually.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                  Owner: {currentUserEmail}
                </span>
              </div>
            </div>

            {/* Step 1: Customer Search & Selection */}
            <div className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/20 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#8A2BE2]" />
                  <span>Step 1: Search &amp; Select Customer</span>
                </h4>
                {selectedCustomerId && (
                  <button
                    onClick={() => setSelectedCustomerId('')}
                    className="text-xs text-purple-300 hover:text-white underline cursor-pointer"
                  >
                    Change Customer
                  </button>
                )}
              </div>

              {!selectedCustomerId ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search by Username, User ID, or Email address..."
                      className="w-full bg-black/60 border border-purple-500/30 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1.5 no-scrollbar">
                    {users
                      .filter(u => {
                        const q = customerSearchQuery.toLowerCase().trim();
                        if (!q) return true;
                        return (
                          u.username?.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q) ||
                          u.uid?.toLowerCase().includes(q) ||
                          u.displayName?.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 15)
                      .map((u) => (
                        <div
                          key={u.uid}
                          onClick={() => setSelectedCustomerId(u.uid)}
                          className="p-3 rounded-2xl bg-[#12121C] hover:bg-purple-950/40 border border-white/5 flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img src={u.avatar} alt={u.username} className="w-9 h-9 rounded-full object-cover border border-purple-500/30" />
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>{u.displayName || u.username}</span>
                                <span className="text-[10px] text-gray-400 font-mono">@{u.username}</span>
                              </div>
                              <span className="text-[10px] text-purple-300 font-mono">{u.email} • ID: {u.uid.substring(0, 8)}...</span>
                            </div>
                          </div>
                          <button className="py-1.5 px-3 rounded-xl bg-[#8A2BE2] hover:bg-[#7000FF] text-white text-xs font-bold">
                            Select
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                /* Selected Customer Details Card */
                (() => {
                  const cust = users.find(u => u.uid === selectedCustomerId);
                  if (!cust) return null;
                  return (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#171626] to-black border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <img src={cust.avatar} alt={cust.username} className="w-12 h-12 rounded-full object-cover border-2 border-[#8A2BE2]" />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{cust.displayName || cust.username}</span>
                            {cust.isVerified && <VerifiedBadge isOfficial={cust.isOfficial} badgeType={cust.badgeType} />}
                          </div>
                          <p className="text-xs text-purple-300 font-mono">@{cust.username} • {cust.email}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            UID: <span className="font-mono text-gray-300">{cust.uid}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${cust.isPremium ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-800 text-gray-400'}`}>
                          {cust.isPremium ? '👑 VIP Premium Active' : 'Standard Free User'}
                        </div>
                        <div className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${cust.isBanned ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {cust.isBanned ? 'Banned' : 'Account Active'}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Step 2: Choose Fulfilment Action (Premium vs Engagement Boost) */}
            {selectedCustomerId && (
              <div className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/20 space-y-4 shadow-xl animate-fade-in">
                <div className="flex rounded-2xl bg-black/60 p-1 border border-purple-500/25">
                  <button
                    onClick={() => setFulfilmentMode('premium')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      fulfilmentMode === 'premium'
                        ? 'bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-white shadow-[0_0_15px_rgba(138,43,226,0.4)]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>Activate Premium Subscription</span>
                  </button>
                  <button
                    onClick={() => setFulfilmentMode('boost')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      fulfilmentMode === 'boost'
                        ? 'bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-white shadow-[0_0_15px_rgba(138,43,226,0.4)]'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Engagement Boost &amp; Promotion</span>
                  </button>
                </div>

                {/* PREMIUM ACTIVATION FORM */}
                {fulfilmentMode === 'premium' ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Subscription Tier</label>
                        <select
                          value={subTier}
                          onChange={(e) => setSubTier(e.target.value as any)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                        >
                          <option value="monthly">Monthly VIP ($3 / ₦4,000)</option>
                          <option value="yearly">Yearly VIP ($25 / ₦30,000)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Duration (Months)</label>
                        <input
                          type="number"
                          min="1"
                          max="36"
                          value={subMonths}
                          onChange={(e) => setSubMonths(Number(e.target.value))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Verified Payment Reference <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentRefInput}
                        onChange={(e) => setPaymentRefInput(e.target.value)}
                        placeholder="e.g. TRF-NG-2026-98124 or PayPal TX-89214"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">
                        Required: Confirm you have independently verified receipt of funds before activation.
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        if (!paymentRefInput.trim()) {
                          showToast('Please enter a verified payment reference.');
                          return;
                        }
                        const cust = users.find(u => u.uid === selectedCustomerId);
                        if (!cust) return;

                        setFulfilmentBusy(true);
                        try {
                          await manualActivatePremium(
                            currentUserEmail,
                            cust.uid,
                            subTier,
                            subMonths,
                            paymentRefInput.trim()
                          );
                          showToast(`✅ Premium successfully activated for @${cust.username}!`);
                          setPaymentRefInput('');
                          await loadAllAdminData();
                        } catch (err: any) {
                          showToast(err.message || 'Activation failed.');
                        } finally {
                          setFulfilmentBusy(false);
                        }
                      }}
                      disabled={fulfilmentBusy || !paymentRefInput.trim()}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {fulfilmentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 fill-black" />}
                      <span>Confirm &amp; Activate Premium Now</span>
                    </button>
                  </div>
                ) : (
                  /* ENGAGEMENT BOOST FORM */
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Select Promoted Post / Video</label>
                      <select
                        value={selectedVideoId}
                        onChange={(e) => setSelectedVideoId(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                      >
                        <option value="">Select user's video or post...</option>
                        {videos
                          .filter(v => v.userId === selectedCustomerId)
                          .map(v => (
                            <option key={v.id || v.videoId} value={v.id || v.videoId}>
                              {v.caption ? v.caption.substring(0, 50) + '...' : `Post ID: ${v.videoId}`}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Boost Amount (Units)</label>
                        <input
                          type="number"
                          min="50"
                          max="100000"
                          value={boostAmountInput}
                          onChange={(e) => setBoostAmountInput(Number(e.target.value))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Boost Type</label>
                        <select
                          value={boostTypeInput}
                          onChange={(e) => setBoostTypeInput(e.target.value as any)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                        >
                          <option value="video">Video Promotion</option>
                          <option value="post">Post Promotion</option>
                          <option value="profile">Profile Promotion</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Duration</label>
                        <select
                          value={boostDurationDays}
                          onChange={(e) => setBoostDurationDays(Number(e.target.value))}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
                        >
                          <option value={1}>24 Hours</option>
                          <option value={3}>3 Days</option>
                          <option value={7}>7 Days</option>
                          <option value={14}>14 Days</option>
                          <option value={30}>30 Days (Custom)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Verified Payment Reference <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={paymentRefInput}
                        onChange={(e) => setPaymentRefInput(e.target.value)}
                        placeholder="e.g. TRF-NG-2026-PROMO"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                      />
                    </div>

                    <button
                      onClick={async () => {
                        if (!paymentRefInput.trim()) {
                          showToast('Please enter a verified payment reference.');
                          return;
                        }
                        const cust = users.find(u => u.uid === selectedCustomerId);
                        if (!cust) return;
                        const vItem = videos.find(v => (v.id || v.videoId) === selectedVideoId);

                        setFulfilmentBusy(true);
                        try {
                          await manualActivateEngagementBoost(
                            currentUserEmail,
                            cust.uid,
                            cust.username,
                            selectedVideoId || undefined,
                            vItem?.caption ? vItem.caption.substring(0, 40) : undefined,
                            boostAmountInput,
                            boostTypeInput,
                            boostDurationDays,
                            paymentRefInput.trim()
                          );
                          showToast(`🚀 Engagement Boost activated for @${cust.username} (${boostAmountInput} units)!`);
                          setPaymentRefInput('');
                          await loadAllAdminData();
                        } catch (err: any) {
                          showToast(err.message || 'Boost activation failed.');
                        } finally {
                          setFulfilmentBusy(false);
                        }
                      }}
                      disabled={fulfilmentBusy || !paymentRefInput.trim()}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] hover:opacity-95 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(138,43,226,0.4)] transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {fulfilmentBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 fill-white" />}
                      <span>BOOST NOW — Instant Activation</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Active Boosts Management Table */}
            <div className="p-5 rounded-3xl bg-[#0F0E17] border border-purple-500/25 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#8A2BE2]" />
                <span>Active Promotion &amp; Boost Records ({manualBoosts.length})</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-black/60 text-gray-400 border-b border-white/10 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Content</th>
                      <th className="p-3">Units</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Ref</th>
                      <th className="p-3">Expires</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {manualBoosts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-gray-500">
                          No active manual promotion boosts found. Use the form above to fulfil an order.
                        </td>
                      </tr>
                    ) : (
                      manualBoosts.map((b) => (
                        <tr key={b.id || b.boostId} className="hover:bg-white/[0.02]">
                          <td className="p-3 font-bold text-white">@{b.customerUsername}</td>
                          <td className="p-3 text-purple-300 max-w-xs truncate">{b.promotedPostTitle}</td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">{b.boostAmount}</td>
                          <td className="p-3 uppercase font-mono text-[10px] text-gray-300">{b.boostType}</td>
                          <td className="p-3 font-mono text-gray-400 text-[11px]">{b.paymentReference}</td>
                          <td className="p-3 text-gray-300">{new Date(b.expiresAt).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              b.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              b.status === 'paused' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                              'bg-zinc-800 text-gray-400'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            {b.status === 'active' ? (
                              <button
                                onClick={async () => {
                                  await updateBoostStatus(b.boostId, 'paused', currentUserEmail);
                                  showToast(`Boost ${b.boostId} paused.`);
                                  setManualBoosts(prev => prev.map(item => item.boostId === b.boostId ? { ...item, status: 'paused' } : item));
                                }}
                                className="py-1 px-2.5 rounded bg-amber-950/60 text-amber-300 hover:bg-amber-900 font-bold text-[10px]"
                              >
                                Pause
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  await updateBoostStatus(b.boostId, 'active', currentUserEmail);
                                  showToast(`Boost ${b.boostId} resumed.`);
                                  setManualBoosts(prev => prev.map(item => item.boostId === b.boostId ? { ...item, status: 'active' } : item));
                                }}
                                className="py-1 px-2.5 rounded bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 font-bold text-[10px]"
                              >
                                Resume
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (confirm(`Cancel boost ${b.boostId}?`)) {
                                  await updateBoostStatus(b.boostId, 'cancelled', currentUserEmail);
                                  showToast(`Boost ${b.boostId} cancelled.`);
                                  setManualBoosts(prev => prev.map(item => item.boostId === b.boostId ? { ...item, status: 'cancelled' } : item));
                                }
                              }}
                              className="py-1 px-2.5 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900 font-bold text-[10px]"
                            >
                              Cancel
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: PAYMENT SETTINGS (Owner-Only)
           ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="animate-fade-in">
            <PaymentSettingsAdmin />
          </div>
        )}

        {/* =========================================================================
            TAB 8: ADMIN LOGS (Security Audit Trail)
           ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-3xl bg-[#0F0E17] border border-purple-500/20">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#8A2BE2]" />
                <span>Security Audit Trail & Administrative Actions</span>
              </h3>
              <p className="text-xs text-gray-400">Chronological records of all administrative events</p>
            </div>

            <div className="rounded-3xl bg-[#0F0E17] border border-purple-500/20 overflow-hidden shadow-xl">
              <div className="divide-y divide-white/5 font-sans">
                {adminLogs.map((log) => (
                  <div key={log.id} className="p-3.5 hover:bg-white/[0.02] flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{log.action}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({log.targetType}: {log.targetId})</span>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Admin: <span className="font-mono text-purple-200">{log.adminEmail}</span>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-[10px] font-mono text-gray-500 truncate max-w-xl">
                          {JSON.stringify(log.details)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
