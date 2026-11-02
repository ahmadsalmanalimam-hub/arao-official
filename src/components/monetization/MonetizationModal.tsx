import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  Award,
  Wallet,
  Megaphone,
  PlusCircle,
  Play,
  Pause,
  ExternalLink,
  Crown,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ChevronRight,
  Send,
  Loader2,
  Lock,
  ArrowUpRight,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  AdCampaign,
  AdCtaType,
  CreatorEarningsData,
  CreatorPayoutRequest,
  MonetizationTransaction,
  VideoCategory
} from '../../types';
import {
  getCreatorEarnings,
  requestCreatorPayout,
  getUserAdCampaigns,
  createAdCampaign,
  toggleCampaignStatus,
  getAllCampaignsForAdmin,
  adminModerateCampaign,
  getAllPayoutRequests,
  adminProcessPayout,
  getMonetizationTransactions,
  recordMonetizationTransaction,
  getPlatformMonetizationStats
} from '../../services/monetizationService';
import { updateUserProfile } from '../../services/userService';
import { getPaymentSettings } from '../../services/supabaseService';

interface MonetizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'earnings' | 'ads' | 'premium' | 'admin';
}

export const MonetizationModal: React.FC<MonetizationModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'earnings'
}) => {
  const { user, profile, refreshProfile, openAuthModal } = useAuth();

  const isAdmin =
    user?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
    profile?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
    profile?.username?.toLowerCase() === 'arao' ||
    profile?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'earnings' | 'ads' | 'premium' | 'admin'>(defaultTab);

  // Earnings state
  const [earningsData, setEarningsData] = useState<CreatorEarningsData | null>(null);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('50.00');
  const [payoutMethod, setPayoutMethod] = useState<'bank_transfer' | 'paypal' | 'crypto_usdc' | 'wise'>('paypal');
  const [payoutDetails, setPayoutDetails] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);

  // Ads state
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [createAdOpen, setCreateAdOpen] = useState(false);
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdBrand, setNewAdBrand] = useState(profile?.displayName || 'My Brand');
  const [newAdCaption, setNewAdCaption] = useState('');
  const [newAdMediaUrl, setNewAdMediaUrl] = useState('');
  const [newAdMediaType, setNewAdMediaType] = useState<'video' | 'image'>('video');
  const [newAdCta, setNewAdCta] = useState<AdCtaType>('Learn More');
  const [newAdTargetUrl, setNewAdTargetUrl] = useState('https://');
  const [newAdCategory, setNewAdCategory] = useState<VideoCategory | 'all'>('all');
  const [newAdDailyBudget, setNewAdDailyBudget] = useState('25');
  const [newAdTotalBudget, setNewAdTotalBudget] = useState('100');
  const [submittingAd, setSubmittingAd] = useState(false);

  // Premium state
  const [subscribing, setSubscribing] = useState(false);
  const [premiumSuccess, setPremiumSuccess] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  // Admin state
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminCampaigns, setAdminCampaigns] = useState<AdCampaign[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<CreatorPayoutRequest[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    getPaymentSettings().then(setPaymentSettings);
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'earnings') {
      loadEarnings();
    } else if (activeTab === 'ads') {
      loadCampaigns();
    } else if (activeTab === 'admin' && isAdmin) {
      loadAdminData();
    }
  }, [isOpen, activeTab, user, profile, isAdmin]);

  const loadEarnings = async () => {
    if (!user) return;
    setLoadingEarnings(true);
    try {
      const isVerified =
        user.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
        profile?.isVerified === true ||
        profile?.username === 'arao';
      const data = await getCreatorEarnings(
        user.uid,
        profile?.totalLikesCount ? profile.totalLikesCount * 12 : 18500,
        profile?.followersCount || 1200,
        isVerified
      );
      setEarningsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEarnings(false);
    }
  };

  const loadCampaigns = async () => {
    if (!user) return;
    setLoadingCampaigns(true);
    try {
      const camps = await getUserAdCampaigns(user.uid);
      setCampaigns(camps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      const [stats, allCamps, allPays] = await Promise.all([
        getPlatformMonetizationStats(),
        getAllCampaignsForAdmin(),
        getAllPayoutRequests()
      ]);
      setAdminStats(stats);
      setAdminCampaigns(allCamps);
      setAdminPayouts(allPays);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (!newAdTitle.trim() || !newAdMediaUrl.trim() || !newAdTargetUrl.trim()) {
      alert('Please fill in all required campaign fields.');
      return;
    }

    setSubmittingAd(true);
    try {
      await createAdCampaign({
        advertiserId: user.uid,
        advertiserName: newAdBrand.trim(),
        advertiserAvatar: profile?.avatar,
        advertiserVerified: profile?.isVerified,
        title: newAdTitle.trim(),
        caption: newAdCaption.trim(),
        mediaUrl: newAdMediaUrl.trim(),
        mediaType: newAdMediaType,
        ctaText: newAdCta,
        targetUrl: newAdTargetUrl.trim(),
        category: newAdCategory,
        dailyBudget: Number(newAdDailyBudget) || 20,
        totalBudget: Number(newAdTotalBudget) || 100
      });

      setCreateAdOpen(false);
      // Reset form
      setNewAdTitle('');
      setNewAdCaption('');
      setNewAdMediaUrl('');
      await loadCampaigns();
    } catch (err) {
      console.error(err);
      alert('Failed to launch ad campaign.');
    } finally {
      setSubmittingAd(false);
    }
  };

  const handleToggleAdStatus = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    await toggleCampaignStatus(campaignId, nextStatus);
    setCampaigns(prev =>
      prev.map(c => (c.campaignId === campaignId || c.id === campaignId ? { ...c, status: nextStatus } : c))
    );
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !earningsData) return;

    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 50) {
      alert('Minimum payout threshold is $50.00 USD.');
      return;
    }
    if (amt > earningsData.balance) {
      alert(`Requested amount exceeds available balance of $${earningsData.balance.toFixed(2)}.`);
      return;
    }
    if (!payoutDetails.trim()) {
      alert('Please provide your payout account destination details.');
      return;
    }

    setPayoutSubmitting(true);
    try {
      await requestCreatorPayout(
        user.uid,
        profile?.username || 'creator',
        user.email || '',
        amt,
        payoutMethod,
        payoutDetails.trim()
      );
      setPayoutSuccessMsg(`Payout request for $${amt.toFixed(2)} has been submitted for automated processing.`);
      setPayoutModalOpen(false);
      await loadEarnings();
    } catch (err) {
      console.error(err);
      alert('Failed to request payout.');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const handleTogglePremium = async (tier: 'monthly' | 'yearly') => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubscribing(true);
    try {
      const isCurrentlyPremium = profile?.isPremium === true;
      const nextState = !isCurrentlyPremium;

      await updateUserProfile(user.uid, {
        isPremium: nextState,
        premiumTier: nextState ? tier : undefined
      });

      if (nextState) {
        await recordMonetizationTransaction({
          userId: user.uid,
          userEmail: user.email || '',
          type: 'premium_subscription',
          amount: tier === 'monthly' ? 4.99 : 49.99,
          currency: 'USD',
          status: 'completed',
          description: `ARAO Premium VIP (${tier}) subscription`
        });
      }

      await refreshProfile();
      setPremiumSuccess(true);
      setTimeout(() => setPremiumSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Could not update membership.');
    } finally {
      setSubscribing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-[#0F0E17] border border-purple-500/25 sm:rounded-3xl rounded-t-3xl max-h-[92dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-purple-500/20 bg-gradient-to-r from-[#1A1926] via-[#141221] to-[#1A1926] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,0,255,0.5)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2">
                ARAO Monetization & Ads
              </h2>
              <p className="text-xs text-[#A5A5B5]">
                Creator revenue, campaign marketplace & VIP membership
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 border-b border-white/5 bg-[#12121C] gap-1 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('earnings')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'earnings'
                ? 'border-[#8B00FF] text-white text-[#D8B4FE]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Creator Earnings</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'ads'
                ? 'border-[#8B00FF] text-white text-[#D8B4FE]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>Ad Marketplace</span>
          </button>

          <button
            onClick={() => setActiveTab('premium')}
            className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'premium'
                ? 'border-[#8B00FF] text-white text-[#D8B4FE]'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>ARAO Premium</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Hub</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: CREATOR EARNINGS */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              {!user ? (
                <div className="p-8 text-center bg-[#1A1926] rounded-2xl border border-white/5 space-y-3">
                  <Wallet className="w-12 h-12 text-[#8B00FF] mx-auto" />
                  <h3 className="text-white font-bold text-lg">Log in to view Creator Earnings</h3>
                  <p className="text-xs text-[#A5A5B5] max-w-sm mx-auto">
                    Sign in to track your video monetization, eligible RPM views, and request instant payouts.
                  </p>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-bold text-xs"
                  >
                    Log In / Sign Up
                  </button>
                </div>
              ) : loadingEarnings ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#8B00FF] animate-spin" />
                  <p className="text-xs text-gray-400">Loading your revenue analytics...</p>
                </div>
              ) : (
                <>
                  {/* Payout Notification banner if any */}
                  {payoutSuccessMsg && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{payoutSuccessMsg}</span>
                      </div>
                      <button onClick={() => setPayoutSuccessMsg(null)} className="text-emerald-400 font-bold ml-2">
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-purple-500/20 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-[#A5A5B5] flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Available Balance
                      </span>
                      <div className="mt-2 text-2xl font-black text-white">
                        ${earningsData?.balance.toFixed(2) || '0.00'}
                      </div>
                      <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" /> Ready for withdrawal
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-[#A5A5B5] flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5 text-[#8B00FF]" /> Lifetime Earnings
                      </span>
                      <div className="mt-2 text-2xl font-black text-white">
                        ${earningsData?.lifetimeEarnings.toFixed(2) || '0.00'}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        All-time video revenue
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-[#A5A5B5] flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-sky-400" /> Eligible Views
                      </span>
                      <div className="mt-2 text-2xl font-black text-white">
                        {(earningsData?.eligibleViewsCount || 0).toLocaleString()}
                      </div>
                      <span className="text-[10px] text-sky-400 mt-1">
                        82% qualified view rate
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold text-[#A5A5B5] flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-400" /> Active RPM
                      </span>
                      <div className="mt-2 text-2xl font-black text-amber-300">
                        ${earningsData?.currentRpm.toFixed(2) || '0.85'}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        Per 1,000 views
                      </span>
                    </div>
                  </div>

                  {/* Revenue Growth Trend (Interactive Bar chart visual) */}
                  <div className="p-5 rounded-2xl bg-[#141221] border border-purple-500/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-bold text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-[#8B00FF]" /> Monthly Revenue & View Performance
                      </h4>
                      <span className="text-[11px] text-gray-400">Past 6 Months</span>
                    </div>

                    <div className="grid grid-cols-6 gap-2 items-end h-32 pt-4 px-2 border-b border-white/10">
                      {earningsData?.monthlyBreakdown.map((item, idx) => {
                        const maxE = Math.max(...earningsData.monthlyBreakdown.map(i => i.earnings), 50);
                        const heightPct = Math.max(15, Math.round((item.earnings / maxE) * 100));
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1 group relative">
                            <div className="text-[9px] font-bold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                              ${item.earnings}
                            </div>
                            <div
                              style={{ height: `${heightPct}%` }}
                              className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-[#7000FF] to-[#8B00FF] group-hover:from-[#8B00FF] group-hover:to-pink-500 transition-all shadow-[0_0_10px_rgba(139,0,255,0.3)]"
                            />
                            <span className="text-[10px] text-gray-400 mt-1">{item.month}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#A5A5B5] pt-1">
                      <span>Monetization formula: (Eligible Views / 1000) × Current Creator RPM</span>
                      <span className="text-emerald-400 font-semibold">+18.4% month-over-month</span>
                    </div>
                  </div>

                  {/* Monetization Eligibility Status Checklist */}
                  <div className="p-5 rounded-2xl bg-[#1A1926] border border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-bold text-sm">Monetization Program Eligibility</h4>
                        <p className="text-xs text-[#A5A5B5]">Criteria required to withdraw creator earnings</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        earningsData?.isEligible
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {earningsData?.isEligible ? 'Program Active' : 'Progressing'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-300">18+ Creator Age Requirement</span>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-300">1,000+ Followers</span>
                        {earningsData?.eligibilityChecks.hasFollowerMin ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="text-xs text-amber-400 font-bold">{profile?.followersCount || 0} / 1k</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-300">10,000+ Video Views (30d)</span>
                        {earningsData?.eligibilityChecks.hasViewMin ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <span className="text-xs text-amber-400 font-bold">Needs more views</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-300">Community Safety & Originality</span>
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    </div>

                    {/* Payout Action Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
                      <div className="text-xs text-gray-400">
                        Minimum withdrawal amount: <strong className="text-white">$50.00 USD</strong>
                      </div>

                      <button
                        onClick={() => setPayoutModalOpen(true)}
                        disabled={!earningsData?.isEligible || (earningsData?.balance || 0) < 50}
                        className={`w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          earningsData?.isEligible && (earningsData?.balance || 0) >= 50
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Request Payout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: AD MARKETPLACE */}
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-[#1A1926] to-[#12121C] border border-purple-500/30">
                <div>
                  <h3 className="text-white font-bold text-base flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-[#8B00FF]" /> Self-Serve Ad Campaign Manager
                  </h3>
                  <p className="text-xs text-[#A5A5B5] max-w-md mt-1">
                    Reach hundreds of thousands of active viewers in the For You & Trending feeds with native sponsored video ads.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!user) openAuthModal('login');
                    else setCreateAdOpen(true);
                  }}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(139,0,255,0.4)]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Launch Campaign</span>
                </button>
              </div>

              {/* Campaign list */}
              <div>
                <h4 className="text-white font-bold text-sm mb-3">Your Ad Campaigns</h4>

                {loadingCampaigns ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-[#8B00FF] animate-spin" />
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="p-8 text-center bg-[#1A1926] rounded-2xl border border-white/5 space-y-3">
                    <Megaphone className="w-10 h-10 text-gray-500 mx-auto" />
                    <h5 className="text-white font-bold text-sm">No active campaigns yet</h5>
                    <p className="text-xs text-[#A5A5B5] max-w-xs mx-auto">
                      Promote your brand, music release, products or website directly in ARAO streams.
                    </p>
                    <button
                      onClick={() => setCreateAdOpen(true)}
                      className="py-2 px-4 rounded-xl bg-purple-600/40 hover:bg-purple-600/60 text-[#D8B4FE] text-xs font-semibold"
                    >
                      Create First Campaign
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map(camp => (
                      <div
                        key={camp.campaignId || camp.id}
                        className="p-4 rounded-2xl bg-[#1A1926] border border-white/5 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-black overflow-hidden relative border border-white/10 shrink-0">
                            {camp.mediaType === 'image' ? (
                              <img src={camp.mediaUrl} alt={camp.title} className="w-full h-full object-cover" />
                            ) : (
                              <video src={camp.mediaUrl} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-white font-bold text-sm truncate">{camp.title}</h5>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                camp.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : camp.status === 'paused'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {camp.status}
                              </span>
                            </div>
                            <p className="text-xs text-[#A5A5B5] truncate mt-0.5">
                              {camp.advertiserName} • CTA: {camp.ctaText} • Category: {camp.category}
                            </p>
                          </div>
                        </div>

                        {/* Performance metrics & toggle */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                          <div className="text-left sm:text-right">
                            <div className="text-xs font-bold text-white flex items-center gap-1 sm:justify-end">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                              <span>{camp.impressionsCount.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {camp.clicksCount} clicks (${camp.spent.toFixed(2)} spent)
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleAdStatus(camp.campaignId || camp.id, camp.status)}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title={camp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                          >
                            {camp.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ARAO PREMIUM */}
          {activeTab === 'premium' && (
            <div className="space-y-6">
              {/* Premium Status Banner */}
              {profile?.isPremium ? (
                <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/60 via-violet-800/40 to-black border border-purple-500/50 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-black font-black shadow-lg">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-extrabold text-lg">ARAO Premium VIP Active</h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold text-[10px] border border-amber-400/40">
                          Active Tier
                        </span>
                      </div>
                      <p className="text-xs text-purple-200 mt-0.5">
                        You have uninterrupted ad-free stream viewing, VIP badges and priority media delivery.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-gray-300">Auto-renews next cycle</span>
                    <button
                      onClick={() => handleTogglePremium('monthly')}
                      disabled={subscribing}
                      className="text-xs text-rose-400 hover:text-rose-300 underline font-semibold"
                    >
                      {subscribing ? 'Updating...' : 'Cancel Subscription'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1F143B] via-[#141221] to-[#0A0914] border border-purple-500/40 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-black flex items-center justify-center shadow-lg">
                      <Crown className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-white font-black text-xl tracking-tight">Upgrade to ARAO Premium</h3>
                      <p className="text-xs text-purple-300">Unlock the ultimate, distraction-free video social network.</p>
                    </div>
                  </div>

                  {premiumSuccess && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Welcome to ARAO Premium! Your perks are active immediately.</span>
                    </div>
                  )}

                  {/* Payment Methods Section */}
                  {paymentSettings && (
                  <div className="mb-6 p-4 bg-black/40 rounded-2xl border border-purple-500/20">
                    <h4 className="text-white font-bold text-sm mb-3">Official Payment Instructions</h4>
                    <div className="text-xs text-gray-300 space-y-4">
                      {paymentSettings.nigerianMethod.enabled && (
                        <div className="p-3 bg-[#1A1926] rounded-xl border border-white/5">
                            <p className="font-bold text-white mb-1">Nigerian Customers 🇳🇬</p>
                            <p>Bank: {paymentSettings.nigerianMethod.bank} | Name: {paymentSettings.nigerianMethod.accountName} | Number: <span className="font-mono bg-black/50 px-1 py-0.5 rounded">{paymentSettings.nigerianMethod.accountNumber}</span></p>
                        </div>
                      )}
                      {paymentSettings.internationalMethod.enabled && (
                        <div className="p-3 bg-[#1A1926] rounded-xl border border-white/5">
                            <p className="font-bold text-white mb-1">International Customers 🌍</p>
                            <p>Method: {paymentSettings.internationalMethod.name} to {paymentSettings.internationalMethod.bank} Account: <span className="font-mono bg-black/50 px-1 py-0.5 rounded">{paymentSettings.internationalMethod.accountNumber}</span></p>
                            <p className="text-[10px] mt-1 text-gray-400">{paymentSettings.internationalMethod.instructions}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(paymentSettings.nigerianMethod.accountNumber)} className="text-[10px] bg-white/10 px-2 py-1 rounded">Copy Account Number</button>
                        <button onClick={() => navigator.clipboard.writeText(paymentSettings.nigerianMethod.accountName)} className="text-[10px] bg-white/10 px-2 py-1 rounded">Copy Name</button>
                        <a href={paymentSettings.whatsappSupportLink} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-emerald-600 px-2 py-1 rounded">Contact Admin</a>
                      </div>
                    </div>
                  </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>100% Ad-Free Feeds</span>
                      </div>
                      <p className="text-[11px] text-[#A5A5B5]">Zero commercial interruptions in For You & Trending streams.</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <Crown className="w-4 h-4 text-purple-400" />
                        <span>Glowing VIP Badge</span>
                      </div>
                      <p className="text-[11px] text-[#A5A5B5]">Stand out in comments and creator profiles with a gold VIP aura.</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>4K Priority Streaming</span>
                      </div>
                      <p className="text-[11px] text-[#A5A5B5]">Highest fidelity video transcode and buffer-free preloading.</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="flex items-center gap-2 text-white font-bold text-xs">
                        <ShieldCheck className="w-4 h-4 text-sky-400" />
                        <span>Instant Upload Processing</span>
                      </div>
                      <p className="text-[11px] text-[#A5A5B5]">Skip the queue with accelerated CDN publishing.</p>
                    </div>
                  </div>

                  {/* Pricing Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/10 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-xs text-gray-400 font-semibold uppercase">Monthly</span>
                        <div className="text-2xl font-black text-white mt-1">
                          $4.99 <span className="text-xs text-gray-400 font-normal">/ month</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Cancel anytime without penalty</p>
                      </div>

                      <button
                        onClick={() => handleTogglePremium('monthly')}
                        disabled={subscribing}
                        className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
                      >
                        {subscribing ? 'Processing...' : 'Subscribe Monthly'}
                      </button>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#7000FF]/30 to-[#8B00FF]/40 border border-[#8B00FF] flex flex-col justify-between space-y-3 relative">
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[9px] font-black uppercase">
                        Save 17%
                      </span>
                      <div>
                        <span className="text-xs text-purple-300 font-semibold uppercase">Annual VIP</span>
                        <div className="text-2xl font-black text-white mt-1">
                          $49.99 <span className="text-xs text-gray-400 font-normal">/ year</span>
                        </div>
                        <p className="text-[11px] text-purple-200 mt-1">Equals $4.16/mo billed yearly</p>
                      </div>

                      <button
                        onClick={() => handleTogglePremium('yearly')}
                        disabled={subscribing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
                      >
                        {subscribing ? 'Processing...' : 'Subscribe Annual VIP'}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 text-center mt-4">
                    Sandbox test mode active. No actual credit card charge will occur.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN HUB (Exclusive to nasirandco001@gmail.com / arao) */}
          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6">
              {adminLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Super Admin Control Center Quick Launch Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#7000FF]/30 via-[#8B5CF6]/30 to-purple-900/30 border border-[#8B5CF6]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                    <div>
                      <h4 className="text-white font-black text-sm flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Owner Super Admin Dashboard (/admin)</span>
                      </h4>
                      <p className="text-[11px] text-[#C4B5FD] mt-0.5">
                        Owner Control Center: Pause App, User bans/verifications, Video pinning, Viral cheat codes & Push blasts.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        window.history.pushState({}, '', '/admin');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7000FF] hover:opacity-90 text-white font-bold text-xs whitespace-nowrap shadow-md cursor-pointer shrink-0"
                    >
                      Launch /admin →
                    </button>
                  </div>

                  {/* Platform Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-emerald-500/30">
                      <span className="text-[11px] text-gray-400">Total Ad Revenue</span>
                      <div className="text-xl font-black text-white mt-1">
                        ${adminStats?.totalAdRevenue.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5">
                      <span className="text-[11px] text-gray-400">Creator Payouts</span>
                      <div className="text-xl font-black text-white mt-1">
                        ${adminStats?.totalPayoutsApproved.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5">
                      <span className="text-[11px] text-gray-400">Platform Margin</span>
                      <div className="text-xl font-black text-emerald-400 mt-1">
                        ${adminStats?.netPlatformProfit.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#1A1926] border border-white/5">
                      <span className="text-[11px] text-gray-400">Pending Payouts</span>
                      <div className="text-xl font-black text-amber-300 mt-1">
                        ${adminStats?.pendingPayoutsTotal.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>

                  {/* Campaign Moderation Queue */}
                  <div className="p-5 rounded-2xl bg-[#1A1926] border border-white/5 space-y-4">
                    <h4 className="text-white font-bold text-sm flex items-center justify-between">
                      <span>Ad Campaigns Moderation & Oversight</span>
                      <span className="text-xs text-gray-400">{adminCampaigns.length} campaigns</span>
                    </h4>

                    {adminCampaigns.length === 0 ? (
                      <p className="text-xs text-gray-400">No campaigns found.</p>
                    ) : (
                      <div className="space-y-3">
                        {adminCampaigns.map(camp => (
                          <div
                            key={camp.campaignId || camp.id}
                            className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{camp.title}</span>
                                <span className="text-gray-400">by {camp.advertiserName}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {camp.status}
                                </span>
                              </div>
                              <p className="text-gray-400 text-[11px] mt-0.5">
                                Spent: ${camp.spent.toFixed(2)} / Budget: ${camp.totalBudget} • Views: {camp.impressionsCount} • Clicks: {camp.clicksCount}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {camp.status !== 'active' && (
                                <button
                                  onClick={async () => {
                                    await adminModerateCampaign(camp.campaignId || camp.id, true);
                                    await loadAdminData();
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Approve
                                </button>
                              )}
                              {camp.status !== 'rejected' && (
                                <button
                                  onClick={async () => {
                                    await adminModerateCampaign(camp.campaignId || camp.id, false, 'Manual admin review rejection');
                                    await loadAdminData();
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Creator Payouts Processing Queue */}
                  <div className="p-5 rounded-2xl bg-[#1A1926] border border-white/5 space-y-4">
                    <h4 className="text-white font-bold text-sm">Creator Payout Withdrawal Requests</h4>

                    {adminPayouts.length === 0 ? (
                      <p className="text-xs text-gray-400">No payout requests queued.</p>
                    ) : (
                      <div className="space-y-3">
                        {adminPayouts.map(pay => (
                          <div
                            key={pay.payoutId || pay.id}
                            className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">${pay.amount.toFixed(2)}</span>
                                <span className="text-gray-300">to {pay.username} ({pay.email})</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                  pay.status === 'completed'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : pay.status === 'rejected'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                  {pay.status}
                                </span>
                              </div>
                              <p className="text-gray-400 text-[11px] mt-0.5">
                                Method: {pay.payoutMethod} • Destination: {pay.accountDetails}
                              </p>
                            </div>

                            {pay.status === 'pending' && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    await adminProcessPayout(pay.payoutId || pay.id, 'completed');
                                    await loadAdminData();
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                                >
                                  Disburse & Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    await adminProcessPayout(pay.payoutId || pay.id, 'rejected');
                                    await loadAdminData();
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal: Request Payout Form */}
        {payoutModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12121C] border border-purple-500/30 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Request Creator Payout
                </h3>
                <button onClick={() => setPayoutModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRequestPayout} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Withdrawal Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="50"
                    max={earningsData?.balance || 50}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Available: ${earningsData?.balance.toFixed(2) || '0.00'} (Min $50.00)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Payout Method
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="bank_transfer">Direct Bank Wire / ACH</option>
                    <option value="crypto_usdc">Crypto USDC (Solana / Polygon)</option>
                    <option value="wise">Wise International Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Destination Details (Email, IBAN, or Wallet)
                  </label>
                  <input
                    type="text"
                    value={payoutDetails}
                    onChange={(e) => setPayoutDetails(e.target.value)}
                    placeholder="e.g. payouts@yourdomain.com or IBAN"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPayoutModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={payoutSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-colors"
                  >
                    {payoutSubmitting ? 'Submitting...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Ad Campaign Drawer/Form */}
        {createAdOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#12121C] border border-purple-500/30 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#8B00FF]" /> Create New Ad Campaign
                </h3>
                <button onClick={() => setCreateAdOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Campaign Headline *</label>
                  <input
                    type="text"
                    placeholder="e.g. Beats Studio Pro — Pure Sound"
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Advertiser / Brand Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Beats by Dre"
                    value={newAdBrand}
                    onChange={(e) => setNewAdBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Caption Pitch</label>
                  <textarea
                    rows={2}
                    placeholder="Write a catchy 1-2 sentence hook for viewers..."
                    value={newAdCaption}
                    onChange={(e) => setNewAdCaption(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Media Type</label>
                    <select
                      value={newAdMediaType}
                      onChange={(e) => setNewAdMediaType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    >
                      <option value="video">Vertical Video (MP4)</option>
                      <option value="image">Image Banner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Call To Action Button</label>
                    <select
                      value={newAdCta}
                      onChange={(e) => setNewAdCta(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    >
                      <option value="Learn More">Learn More</option>
                      <option value="Shop Now">Shop Now</option>
                      <option value="Visit Website">Visit Website</option>
                      <option value="Sign Up">Sign Up</option>
                      <option value="Download">Download</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Direct Media URL (MP4 / Image) *</label>
                  <input
                    type="url"
                    placeholder="https://... or uploaded Cloudinary media link"
                    value={newAdMediaUrl}
                    onChange={(e) => setNewAdMediaUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">Destination Website URL *</label>
                  <input
                    type="url"
                    placeholder="https://yourstore.com/promo"
                    value={newAdTargetUrl}
                    onChange={(e) => setNewAdTargetUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Daily Budget ($ USD)</label>
                    <input
                      type="number"
                      min="10"
                      value={newAdDailyBudget}
                      onChange={(e) => setNewAdDailyBudget(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-300 mb-1">Total Budget ($ USD)</label>
                    <input
                      type="number"
                      min="50"
                      value={newAdTotalBudget}
                      onChange={(e) => setNewAdTotalBudget(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#1A1926] border border-white/10 text-white text-sm focus:border-[#8B00FF] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateAdOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAd}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-bold shadow-lg shadow-purple-600/30"
                  >
                    {submittingAd ? 'Launching...' : 'Activate Campaign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
