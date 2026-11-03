import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  Eye,
  AlertTriangle,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  ArrowLeft,
  Ban,
  Check,
  X,
  Clock,
  ExternalLink,
  MessageSquare,
  FileText,
  BadgeCheck,
  Ghost,
  Lock,
  Loader2,
  DollarSign,
  AlertCircle,
  UserX,
  CreditCard,
  Download,
  Filter,
  Film,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  UserProfile,
  VerificationRequest,
  AdminReportRecord,
  AdminLog,
  VideoItem,
  BanAppeal
} from '../types';
import {
  ADMIN_AUTHORIZED_EMAILS,
  fetchAllUsersForAdmin,
  getVerificationRequests,
  reviewVerificationRequest,
  banUserWithDuration,
  unbanUser,
  toggleShadowBan,
  verifyUserAsCreator,
  verifyUserAsBusiness,
  removeUserVerification,
  getAdminReports,
  resolveAdminReport,
  getBannedUsers,
  getAdminLogs,
  getBanAppeals,
  reviewBanAppeal,
  exportUsersToCSV
} from '../services/supabaseService';
import { getAllVideosForAdmin, deleteVideoByAdmin } from '../services/adminService';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { PaymentSettingsAdmin } from '../components/admin/PaymentSettings';

interface AdminPageProps {
  onNavigateHome?: () => void;
  onOpenProfile?: (userId: string) => void;
}

type AdminTab = 'users' | 'reports' | 'verification' | 'banned' | 'appeals' | 'payments' | 'logs';
type UserFilter = 'all' | 'verified' | 'banned' | 'creator' | 'business' | 'reported';

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigateHome, onOpenProfile }) => {
  const { user, profile, login } = useAuth();

  // 1. Authorization check
  const storedUserEmail = localStorage.getItem('arao_user_email') || '';
  const currentUserEmail = (user?.email || profile?.email || storedUserEmail).toLowerCase().trim();
  const isAuthorizedEmail = ADMIN_AUTHORIZED_EMAILS.some(
    (adm) => adm.toLowerCase() === currentUserEmail
  );
  const isAdmin = isAuthorizedEmail || profile?.role === 'admin' || profile?.role === 'owner_admin';

  // Navigation tab: Primary tabs matching prompt: [Users] [Reports] [Verification] [Banned] [Appeals] [Payment Settings] [Logs]
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Login Gate State (for unauthenticated or unauthorized visits)
  const [gateEmail, setGateEmail] = useState('ahmadsalmanalimam@gmail.com');
  const [gatePassword, setGatePassword] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // Tab Data States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [verifications, setVerifications] = useState<VerificationRequest[]>([]);
  const [selectedVerifProfile, setSelectedVerifProfile] = useState<VerificationRequest | null>(null);
  const [loadingVerifs, setLoadingVerifs] = useState(false);

  const [reports, setReports] = useState<AdminReportRecord[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const [bannedUsers, setBannedUsers] = useState<UserProfile[]>([]);
  const [loadingBanned, setLoadingBanned] = useState(false);

  const [appeals, setAppeals] = useState<BanAppeal[]>([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);

  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);

  // Ban User Modal State
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banDuration, setBanDuration] = useState<'24h' | '7d' | 'forever'>('7d');
  const [banReason, setBanReason] = useState('Violation of community guidelines');
  const [banningAction, setBanningAction] = useState(false);

  // User Posts Modal State
  const [postsModalUser, setPostsModalUser] = useState<UserProfile | null>(null);

  // User Profile Quick Modal State
  const [viewProfileUser, setViewProfileUser] = useState<UserProfile | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadAllData = async () => {
    setLoadingUsers(true);
    setLoadingVerifs(true);
    setLoadingReports(true);
    setLoadingBanned(true);
    setLoadingAppeals(true);

    try {
      const [uList, vList, rList, bList, vidList, logList, appealList] = await Promise.all([
        fetchAllUsersForAdmin(),
        getVerificationRequests(),
        getAdminReports(),
        getBannedUsers(),
        getAllVideosForAdmin(),
        getAdminLogs(),
        getBanAppeals()
      ]);

      setUsers(uList);
      setVerifications(vList);
      setReports(rList);
      setBannedUsers(bList);
      setVideos(vidList);
      setAdminLogs(logList);
      setAppeals(appealList);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingUsers(false);
      setLoadingVerifs(false);
      setLoadingReports(false);
      setLoadingBanned(false);
      setLoadingAppeals(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  // Handle Admin Gate Login
  const handleGateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateLoading(true);
    setGateError(null);
    try {
      await login(gateEmail.trim(), gatePassword);
      showToast('Logged in as Administrator');
    } catch (err: any) {
      setGateError(err.message || 'Invalid administrator credentials');
    } finally {
      setGateLoading(false);
    }
  };

  // 1. USER ACTIONS
  const handleVerifyAsCreator = async (u: UserProfile) => {
    try {
      await verifyUserAsCreator(u.uid, u.username, currentUserEmail);
      showToast(`Verified @${u.username} as Creator (PURPLE tick) 🟣`);
      setUsers((prev) =>
        prev.map((item) =>
          item.uid === u.uid
            ? { ...item, isVerified: true, badgeType: 'creator_purple', role: 'creator', accountType: 'creator' }
            : item
        )
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleVerifyAsBusiness = async (u: UserProfile) => {
    try {
      await verifyUserAsBusiness(u.uid, u.username, currentUserEmail);
      showToast(`Verified @${u.username} as Business (BLUE tick) 🔵`);
      setUsers((prev) =>
        prev.map((item) =>
          item.uid === u.uid
            ? { ...item, isVerified: true, isOfficial: true, badgeType: 'business_blue', role: 'advertiser', accountType: 'business' }
            : item
        )
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleRemoveVerification = async (u: UserProfile) => {
    try {
      await removeUserVerification(u.uid, u.username, currentUserEmail);
      showToast(`Removed verification from @${u.username}`);
      setUsers((prev) =>
        prev.map((item) =>
          item.uid === u.uid
            ? { ...item, isVerified: false, isOfficial: false, badgeType: 'none', accountType: 'normal' }
            : item
        )
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleOpenBanModal = (u: UserProfile) => {
    setBanModalUser(u);
    setBanDuration('7d');
    setBanReason('Violation of community guidelines');
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    setBanningAction(true);
    try {
      await banUserWithDuration(
        banModalUser.uid,
        banModalUser.username,
        banDuration,
        banReason.trim() || 'Community Guidelines Violation',
        currentUserEmail
      );
      showToast(`Banned @${banModalUser.username} (${banDuration})`);
      setBanModalUser(null);
      await loadAllData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setBanningAction(false);
    }
  };

  const handleUnbanUser = async (uid: string, username: string) => {
    try {
      await unbanUser(uid, username, currentUserEmail);
      showToast(`Unbanned @${username} 🔓`);
      await loadAllData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleToggleShadowBan = async (u: UserProfile) => {
    const nextState = !u.isShadowBanned;
    try {
      await toggleShadowBan(u.uid, u.username, nextState, currentUserEmail);
      showToast(
        nextState ? `Shadow banned @${u.username} 👻` : `Removed shadow ban for @${u.username}`
      );
      setUsers((prev) =>
        prev.map((item) => (item.uid === u.uid ? { ...item, isShadowBanned: nextState } : item))
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // 2. VERIFICATION REQUEST ACTIONS
  const handleApproveVerification = async (req: VerificationRequest) => {
    try {
      await reviewVerificationRequest(req.id, 'approved', currentUserEmail);
      const isCreator = req.requestedBadge === 'creator_purple';
      showToast(
        `Approved verification for @${req.username} (${isCreator ? 'Purple' : 'Blue'} tick) ✅`
      );
      setVerifications((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' } : r))
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.username.toLowerCase() === req.username.toLowerCase() || u.uid === req.userId
            ? {
                ...u,
                isVerified: true,
                badgeType: req.requestedBadge,
                isOfficial: req.requestedBadge === 'business_blue',
                accountType: isCreator ? 'creator' : 'business'
              }
            : u
        )
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleRejectVerification = async (req: VerificationRequest) => {
    const reason = prompt('Reason for rejection:', 'Does not meet verification criteria');
    if (reason === null) return;
    try {
      await reviewVerificationRequest(req.id, 'rejected', currentUserEmail, reason);
      showToast(`Rejected verification for @${req.username}`);
      setVerifications((prev) =>
        prev.map((r) =>
          r.id === req.id ? { ...r, status: 'rejected', rejectionReason: reason } : r
        )
      );
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // 3. REPORT ACTIONS
  const handleReportAction = async (
    report: AdminReportRecord,
    action: 'deleted_post' | 'warned' | 'banned_7_days' | 'banned_forever' | 'dismissed'
  ) => {
    try {
      await resolveAdminReport(report.id, action, currentUserEmail);
      if (action === 'deleted_post') showToast(`Post deleted and report resolved`);
      if (action === 'warned') showToast(`Warning dispatched to @${report.reportedUsername}`);
      if (action === 'banned_7_days') showToast(`Banned @${report.reportedUsername} for 7 days`);
      if (action === 'banned_forever') showToast(`Permanently banned @${report.reportedUsername}`);
      if (action === 'dismissed') showToast(`Report dismissed`);

      await loadAllData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // 4. BAN APPEAL ACTIONS
  const handleReviewAppeal = async (appealId: string, decision: 'approved' | 'rejected') => {
    try {
      await reviewBanAppeal(appealId, decision, currentUserEmail);
      showToast(decision === 'approved' ? 'Appeal Approved! User Unbanned 🔓' : 'Appeal Rejected');
      await loadAllData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // 5. POST DELETION IN "VIEW ALL POSTS"
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to permanently delete this post?')) return;
    try {
      await deleteVideoByAdmin(postId);
      showToast('Post removed by administrator');
      setVideos((prev) => prev.filter((v) => v.id !== postId && v.videoId !== postId));
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  // Filtered and Searched Users Table
  const filteredUsers = useMemo(() => {
    const reportedUserIds = new Set(reports.map((r) => r.reportedUserId));

    return users.filter((u) => {
      // Search filter (Username OR Email)
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase().replace('@', '');
        const matchName = u.username?.toLowerCase().includes(q);
        const matchDisplayName = u.displayName?.toLowerCase().includes(q);
        const matchEmail = u.email?.toLowerCase().includes(q);
        if (!matchName && !matchDisplayName && !matchEmail) return false;
      }

      // Category filter
      if (userFilter === 'verified') return u.isVerified === true;
      if (userFilter === 'banned') return u.isBanned === true;
      if (userFilter === 'creator') return u.accountType === 'creator' || u.badgeType === 'creator_purple';
      if (userFilter === 'business') return u.accountType === 'business' || u.badgeType === 'business_blue';
      if (userFilter === 'reported') return reportedUserIds.has(u.uid);

      return true;
    });
  }, [users, userSearchQuery, userFilter, reports]);

  // If not admin, show dedicated Admin Access Gateway
  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full bg-[#080810] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#12121C] border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(138,43,226,0.25)] text-center">
          <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto mb-4 shadow-[0_0_20px_rgba(138,43,226,0.4)]">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black tracking-wide text-white font-display">
            ARAO ADMIN TERMINAL
          </h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Restricted access. Only authorized platform administrators{' '}
            <span className="text-purple-300 font-mono">(@araoofficial)</span> can access this dashboard.
          </p>

          {gateError && (
            <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleGateLogin} className="mt-6 space-y-3.5 text-left">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider font-mono">
                Admin Email
              </label>
              <input
                type="email"
                value={gateEmail}
                onChange={(e) => setGateEmail(e.target.value)}
                placeholder="ahmadsalmanalimam@gmail.com"
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1 uppercase tracking-wider font-mono">
                Password
              </label>
              <input
                type="password"
                value={gatePassword}
                onChange={(e) => setGatePassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="w-full py-2.5 px-3.5 rounded-xl bg-white/5 border border-purple-500/30 text-white text-xs focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={gateLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-[#8A2BE2] hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 cursor-pointer active:scale-98 transition-all"
            >
              {gateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Authenticate Administrator</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center">
            <button
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                else window.location.href = '/';
              }}
              className="text-xs text-purple-300 hover:text-white flex items-center gap-1.5 font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to ARAO Feed</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;
  const pendingVerifsCount = verifications.filter((v) => v.status === 'pending').length;
  const pendingAppealsCount = appeals.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen w-full bg-[#080810] text-white flex flex-col font-sans pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] py-2.5 px-5 rounded-2xl bg-[#1A1926] border border-purple-500/50 text-white text-xs font-bold shadow-[0_0_30px_rgba(138,43,226,0.6)] animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0E0E18]/90 backdrop-blur-md border-b border-purple-500/20 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-[#8A2BE2] flex items-center justify-center text-white shadow-[0_0_15px_rgba(138,43,226,0.5)]">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase font-display">
                  ADMIN DASHBOARD - ARAO
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                  OWNER
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Logged in: <span className="text-purple-300">{currentUserEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                else window.location.href = '/';
              }}
              className="py-1.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-xs font-bold text-purple-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 mt-6 space-y-6">
        {/* Top Aggregate Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider font-mono">Total Users</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {users.length.toLocaleString()}
            </div>
            <p className="text-[10px] text-purple-300 font-mono mt-1">Real authenticated accounts</p>
          </div>

          <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider font-mono">Total Posts</span>
              <Film className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {videos.length.toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-400 font-mono mt-1">100% Real organic media</p>
          </div>

          <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider font-mono">Reports Pending</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {pendingReportsCount}
            </div>
            <p className="text-[10px] text-amber-300 font-mono mt-1">Awaiting review</p>
          </div>

          <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider font-mono">Banned Users</span>
              <Ban className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-white font-display">
              {bannedUsers.length}
            </div>
            <p className="text-[10px] text-red-300 font-mono mt-1">Suspended accounts</p>
          </div>
        </section>

        {/* Navigation Tabs Bar */}
        <section className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/5">
          {[
            { id: 'users', label: 'Users', icon: Users, badge: users.length },
            { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: pendingReportsCount },
            { id: 'verification', label: 'Verification', icon: BadgeCheck, badge: pendingVerifsCount },
            { id: 'banned', label: 'Banned', icon: Ban, badge: bannedUsers.length },
            { id: 'appeals', label: 'Appeals', icon: FileText, badge: pendingAppealsCount },
            { id: 'payments', label: 'Payment Settings', icon: CreditCard },
            { id: 'logs', label: 'Admin Logs', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-[#8A2BE2] text-white shadow-[0_0_15px_rgba(138,43,226,0.5)]'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-purple-600/30 text-purple-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {/* ============================================================== */}
        {/* TAB 1: USERS MANAGEMENT TABLE WITH REAL ENGAGEMENT            */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <section className="space-y-4">
            {/* Filter, Search & Export Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#12121C] border border-purple-500/20 p-3.5 rounded-2xl">
              {/* Search by username OR email */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by username or email..."
                  className="w-full py-2 pl-10 pr-4 rounded-xl bg-white/5 border border-purple-500/30 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(['all', 'verified', 'banned', 'creator', 'business', 'reported'] as UserFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUserFilter(filter)}
                    className={`py-1.5 px-3 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                      userFilter === filter
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Export to CSV */}
              <button
                onClick={() => exportUsersToCSV(filteredUsers)}
                className="py-2 px-3.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Users to CSV</span>
              </button>
            </div>

            {/* Users Data Table */}
            <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1A1926] text-gray-400 uppercase font-mono tracking-wider text-[10px] border-b border-purple-500/20">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Account Type</th>
                      <th className="py-3 px-4">Followers (Real)</th>
                      <th className="py-3 px-4">Total Real Views</th>
                      <th className="py-3 px-4">Verified</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                          <span>Loading users registry...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-gray-400">
                          No users matched your query or filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isCreator = u.accountType === 'creator' || u.badgeType === 'creator_purple';
                        const isBusiness = u.accountType === 'business' || u.badgeType === 'business_blue';
                        const joinedStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Recent';

                        return (
                          <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                            {/* User details */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                                  alt={u.username}
                                  className="w-8 h-8 rounded-full object-cover border border-purple-500/30 shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-1 font-bold text-white">
                                    <span>@{u.username}</span>
                                    <VerifiedBadge badgeType={u.badgeType} isVerified={u.isVerified} size="xs" />
                                  </div>
                                  <span className="text-[10px] text-gray-400 truncate max-w-[120px] block">
                                    {u.displayName}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3 px-4 text-gray-300 font-mono text-[11px]">
                              {u.email}
                            </td>

                            {/* Account Type */}
                            <td className="py-3 px-4">
                              {isCreator ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8A2BE2]/20 text-[#D8B4FE] border border-[#8A2BE2]/40">
                                  <span>Creator</span>
                                </span>
                              ) : isBusiness ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D9BF0]/20 text-[#60A5FA] border border-[#1D9BF0]/40">
                                  <span>Business</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-400">
                                  Normal
                                </span>
                              )}
                            </td>

                            {/* Followers (real) */}
                            <td className="py-3 px-4 font-mono font-bold text-purple-300">
                              {(u.followersCount || 0).toLocaleString()}
                            </td>

                            {/* Total Real Views */}
                            <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                              {(u.totalRealViews || (u as any).viewsCount || 0).toLocaleString()}
                            </td>

                            {/* Is Verified */}
                            <td className="py-3 px-4">
                              {u.isVerified ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="capitalize">{u.badgeType === 'creator_purple' ? 'Purple' : 'Blue'}</span>
                                </span>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4">
                              {u.isBanned ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-500/40">
                                  Banned
                                </span>
                              ) : u.isShadowBanned ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                  Shadow
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                                  Active
                                </span>
                              )}
                            </td>

                            {/* Joined Date */}
                            <td className="py-3 px-4 text-gray-400 font-mono text-[11px]">
                              {joinedStr}
                            </td>

                            {/* Actions per user */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* Verify as Creator (PURPLE tick) */}
                                {u.badgeType !== 'creator_purple' && (
                                  <button
                                    onClick={() => handleVerifyAsCreator(u)}
                                    className="p-1.5 rounded-lg bg-[#8A2BE2]/20 hover:bg-[#8A2BE2]/40 text-[#D8B4FE] border border-[#8A2BE2]/40 transition-colors"
                                    title="Verify as Creator (PURPLE tick)"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Verify as Business (BLUE tick) */}
                                {u.badgeType !== 'business_blue' && (
                                  <button
                                    onClick={() => handleVerifyAsBusiness(u)}
                                    className="p-1.5 rounded-lg bg-[#1D9BF0]/20 hover:bg-[#1D9BF0]/40 text-[#60A5FA] border border-[#1D9BF0]/40 transition-colors"
                                    title="Verify as Business (BLUE tick)"
                                  >
                                    <BadgeCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Remove verification if verified */}
                                {u.isVerified && (
                                  <button
                                    onClick={() => handleRemoveVerification(u)}
                                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                                    title="Remove Verification"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Ban or Unban */}
                                {u.isBanned ? (
                                  <button
                                    onClick={() => handleUnbanUser(u.uid, u.username)}
                                    className="py-1 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold"
                                  >
                                    Unban
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleOpenBanModal(u)}
                                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors"
                                    title="Ban User"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Shadow Ban toggle */}
                                <button
                                  onClick={() => handleToggleShadowBan(u)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    u.isShadowBanned
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-white/5 hover:bg-white/10 text-gray-400'
                                  }`}
                                  title={u.isShadowBanned ? 'Remove Shadow Ban' : 'Shadow Ban User'}
                                >
                                  <Ghost className="w-3.5 h-3.5" />
                                </button>

                                {/* View All Posts */}
                                <button
                                  onClick={() => setPostsModalUser(u)}
                                  className="py-1 px-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold"
                                  title="View All Posts by user"
                                >
                                  Posts
                                </button>

                                {/* View Profile */}
                                <button
                                  onClick={() => {
                                    if (onOpenProfile) onOpenProfile(u.uid);
                                    else setViewProfileUser(u);
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
                                  title="View Profile Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 2: REPORTS MANAGEMENT                                      */}
        {/* ============================================================== */}
        {activeTab === 'reports' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Platform Reports & Community Moderation
              </h3>
              <span className="text-xs text-gray-400">Total Reports: {reports.length}</span>
            </div>

            <div className="grid gap-3.5">
              {reports.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#12121C] border border-white/5 rounded-2xl">
                  No pending community reports.
                </div>
              ) : (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 rounded-2xl bg-[#12121C] border border-purple-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">@{rep.reportedUsername}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-500/40">
                          Reason: {rep.reason}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Reported by <strong className="text-purple-300">{rep.reporterCount}</strong> users
                        </span>
                      </div>

                      {rep.postCaption && (
                        <p className="text-xs text-gray-300 bg-white/5 p-2 rounded-xl font-mono">
                          "{rep.postCaption}"
                        </p>
                      )}

                      <div className="text-[10px] text-gray-500">
                        Report ID: {rep.id} • Filed: {new Date(rep.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Report action buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        onClick={() => handleReportAction(rep, 'deleted_post')}
                        className="py-1.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 text-xs font-bold"
                      >
                        Delete Post
                      </button>
                      <button
                        onClick={() => handleReportAction(rep, 'warned')}
                        className="py-1.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 text-xs font-bold"
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => handleReportAction(rep, 'banned_7_days')}
                        className="py-1.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 text-xs font-bold"
                      >
                        Ban 7 Days
                      </button>
                      <button
                        onClick={() => handleReportAction(rep, 'banned_forever')}
                        className="py-1.5 px-3 rounded-xl bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-200 text-xs font-bold"
                      >
                        Ban Forever
                      </button>
                      <button
                        onClick={() => handleReportAction(rep, 'dismissed')}
                        className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 3: VERIFICATION REQUESTS                                   */}
        {/* ============================================================== */}
        {activeTab === 'verification' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Verification Queue (Creator Purple & Business Blue)
              </h3>
              <span className="text-xs text-gray-400">Pending: {pendingVerifsCount}</span>
            </div>

            <div className="grid gap-3.5">
              {verifications.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#12121C] border border-white/5 rounded-2xl">
                  No verification applications currently awaiting review.
                </div>
              ) : (
                verifications.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl bg-[#12121C] border border-purple-500/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">@{v.username}</span>
                        {v.requestedBadge === 'creator_purple' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8A2BE2]/20 text-[#D8B4FE] border border-[#8A2BE2]/40">
                            Creator Purple
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1D9BF0]/20 text-[#60A5FA] border border-[#1D9BF0]/40">
                            Business Blue
                          </span>
                        )}
                        <span className="text-xs text-gray-400 font-mono">({v.category})</span>
                      </div>
                      <p className="text-xs text-gray-300 font-mono">Legal Name: {v.fullLegalName}</p>
                      {v.notes && <p className="text-xs text-gray-400">"{v.notes}"</p>}
                      {v.documentUrl && (
                        <a
                          href={v.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline mt-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Proof Document</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {v.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveVerification(v)}
                            className="py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#8A2BE2] hover:opacity-95 text-white text-xs font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectVerification(v)}
                            className="py-1.5 px-3.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs font-bold"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold uppercase font-mono bg-white/5 text-gray-400">
                          {v.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 4: BANNED USERS                                            */}
        {/* ============================================================== */}
        {activeTab === 'banned' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Suspended Accounts
              </h3>
              <span className="text-xs text-gray-400">Total Banned: {bannedUsers.length}</span>
            </div>

            <div className="grid gap-3.5">
              {bannedUsers.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#12121C] border border-white/5 rounded-2xl">
                  No accounts are currently banned.
                </div>
              ) : (
                bannedUsers.map((b) => (
                  <div
                    key={b.uid}
                    className="p-4 rounded-2xl bg-[#12121C] border border-red-500/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">@{b.username}</span>
                        <span className="text-xs text-gray-400 font-mono">({b.email})</span>
                      </div>
                      <p className="text-xs text-red-300">
                        Reason: <strong className="text-white">{b.banReason || 'Community Guidelines'}</strong>
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Banned Until: <span className="text-amber-300">{b.bannedUntil || 'Forever'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleUnbanUser(b.uid, b.username)}
                      className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-98 shrink-0"
                    >
                      Unban Account
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 5: BAN APPEALS                                             */}
        {/* ============================================================== */}
        {activeTab === 'appeals' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                User Ban Appeals
              </h3>
              <span className="text-xs text-gray-400">Pending: {pendingAppealsCount}</span>
            </div>

            <div className="grid gap-3.5">
              {appeals.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#12121C] border border-white/5 rounded-2xl">
                  No ban appeals currently submitted.
                </div>
              ) : (
                appeals.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl bg-[#12121C] border border-purple-500/20 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">@{app.username}</span>
                        <span className="text-xs text-gray-400 font-mono">({app.email})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'pending'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : app.status === 'approved'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-950 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(app.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-200">
                      <p className="text-[11px] text-gray-400 mb-1 font-semibold">
                        Original Ban Reason: <span className="text-red-300">{app.banReason}</span>
                      </p>
                      <p className="italic">"{app.appealText}"</p>
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleReviewAppeal(app.id, 'approved')}
                          className="py-1.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Unban & Approve</span>
                        </button>
                        <button
                          onClick={() => handleReviewAppeal(app.id, 'rejected')}
                          className="py-1.5 px-4 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Keep Banned</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 6: PAYMENT SETTINGS (Owner Admin Payment Configuration)    */}
        {/* ============================================================== */}
        {activeTab === 'payments' && (
          <section className="space-y-4">
            <PaymentSettingsAdmin />
          </section>
        )}

        {/* ============================================================== */}
        {/* TAB 7: ADMIN ACTIVITY LOGS                                     */}
        {/* ============================================================== */}
        {activeTab === 'logs' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Audit Trail & Activity Logs
              </h3>
              <span className="text-xs text-gray-400">Total Entries: {adminLogs.length}</span>
            </div>

            <div className="bg-[#12121C] border border-purple-500/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#1A1926] text-gray-400 uppercase text-[10px] border-b border-purple-500/20">
                    <tr>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Admin Actor</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                    {adminLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 font-sans">
                          No admin actions logged yet.
                        </td>
                      </tr>
                    ) : (
                      adminLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 text-purple-300 font-bold">{log.action}</td>
                          <td className="py-2.5 px-4 text-gray-300">{log.adminEmail || log.adminId}</td>
                          <td className="py-2.5 px-4 text-gray-400">{log.targetId || '-'}</td>
                          <td className="py-2.5 px-4 text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: BAN USER CONFIGURATION                                 */}
      {/* ============================================================== */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#12121C] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <Ban className="w-5 h-5" />
                <span>Ban User @{banModalUser.username}</span>
              </div>
              <button
                onClick={() => setBanModalUser(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider font-mono">
                Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '24h', label: '24 Hours' },
                  { id: '7d', label: '7 Days' },
                  { id: 'forever', label: 'Forever' }
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setBanDuration(d.id as any)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      banDuration === d.id
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider font-mono">
                Ban Reason
              </label>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Specify violation..."
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleConfirmBan}
                disabled={banningAction}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-900/30 transition-all active:scale-98"
              >
                {banningAction ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Ban</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setBanModalUser(null)}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW ALL POSTS BY USER                                 */}
      {/* ============================================================== */}
      {postsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-[#12121C] border border-purple-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                  <span>Posts by @{postsModalUser.username}</span>
                  <VerifiedBadge badgeType={postsModalUser.badgeType} isVerified={postsModalUser.isVerified} size="xs" />
                </h3>
                <p className="text-xs text-gray-400">Review media and manage content</p>
              </div>
              <button
                onClick={() => setPostsModalUser(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none">
              {videos.filter((v) => v.userId === postsModalUser.uid || v.username === postsModalUser.username).length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  No posts published by @{postsModalUser.username} yet.
                </div>
              ) : (
                videos
                  .filter((v) => v.userId === postsModalUser.uid || v.username === postsModalUser.username)
                  .map((post) => (
                    <div
                      key={post.id || post.videoId}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={post.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80'}
                          alt={post.caption}
                          className="w-12 h-16 rounded-xl object-cover border border-purple-500/20 shrink-0"
                        />
                        <div>
                          <p className="text-xs text-white font-medium line-clamp-1">
                            {post.caption || 'No caption'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1 font-mono">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Eye className="w-3 h-3" />
                              <span>{post.viewsCount || 0} real views</span>
                            </span>
                            <span>{post.likesCount || 0} likes</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeletePost(post.id || post.videoId)}
                        className="py-1.5 px-3 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: QUICK VIEW USER PROFILE                                */}
      {/* ============================================================== */}
      {viewProfileUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#12121C] border border-purple-500/30 rounded-3xl p-6 shadow-2xl text-white space-y-4 text-center">
            <img
              src={viewProfileUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'}
              alt={viewProfileUser.username}
              className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50 mx-auto"
            />
            <div>
              <div className="flex items-center justify-center gap-1 font-black text-lg">
                <span>@{viewProfileUser.username}</span>
                <VerifiedBadge badgeType={viewProfileUser.badgeType} isVerified={viewProfileUser.isVerified} size="sm" />
              </div>
              <p className="text-xs text-gray-400 font-mono">{viewProfileUser.email}</p>
            </div>

            <p className="text-xs text-gray-300 italic">{viewProfileUser.bio || 'No bio provided.'}</p>

            <div className="grid grid-cols-3 gap-2 bg-white/5 p-3 rounded-2xl font-mono text-xs">
              <div>
                <span className="block text-gray-400 text-[10px]">Followers</span>
                <strong className="text-purple-300">{(viewProfileUser.followersCount || 0).toLocaleString()}</strong>
              </div>
              <div>
                <span className="block text-gray-400 text-[10px]">Views</span>
                <strong className="text-emerald-400">{(viewProfileUser.totalRealViews || 0).toLocaleString()}</strong>
              </div>
              <div>
                <span className="block text-gray-400 text-[10px]">Likes</span>
                <strong className="text-white">{(viewProfileUser.totalLikesCount || 0).toLocaleString()}</strong>
              </div>
            </div>

            <button
              onClick={() => setViewProfileUser(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
