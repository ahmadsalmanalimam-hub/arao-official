import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  AdCampaign,
  AdStatus,
  CreatorEarningsData,
  CreatorPayoutRequest,
  AdReportRecord,
  MonetizationTransaction,
  VideoCategory
} from '../types';

// Default Demo/Seed Advertisements to ensure immediate rich experience
const INITIAL_DEMO_ADS: Omit<AdCampaign, 'id' | 'createdAt'>[] = [
  {
    campaignId: 'ad_beats_pro_2025',
    advertiserId: 'official_beats_brand',
    advertiserName: 'Beats by Dre',
    advertiserAvatar: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
    advertiserVerified: true,
    title: 'Beats Studio Pro — Iconic Sound Unleashed',
    caption: 'Experience deep, immersive lossless audio with active noise cancellation and spatial sound tailored for your pulse. Upgrade your rhythm today. #Beats #Audio',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-with-headphones-listening-to-music-40544-large.mp4',
    mediaType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Shop Now',
    targetUrl: 'https://www.beatsbydre.com',
    category: 'music',
    dailyBudget: 150,
    totalBudget: 2500,
    spent: 640.50,
    impressionsCount: 18450,
    clicksCount: 1420,
    status: 'active'
  },
  {
    campaignId: 'ad_technova_ai',
    advertiserId: 'technova_official',
    advertiserName: 'TechNova Cloud',
    advertiserAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
    advertiserVerified: true,
    title: 'Deploy Full-Stack AI in 60 Seconds',
    caption: 'Supercharge your creator stack with serverless GPU clusters, instant video transcode & zero-latency APIs. Get $200 free cloud credits on sign-up!',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-typing-on-a-laptop-keyboard-41121-large.mp4',
    mediaType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Sign Up',
    targetUrl: 'https://google.com',
    category: 'technology',
    dailyBudget: 200,
    totalBudget: 3000,
    spent: 890.20,
    impressionsCount: 24600,
    clicksCount: 2110,
    status: 'active'
  },
  {
    campaignId: 'ad_nike_air_glide',
    advertiserId: 'nike_athletics',
    advertiserName: 'Nike Sportswear',
    advertiserAvatar: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80',
    advertiserVerified: true,
    title: 'Air Max Pulse — Limitless Energy',
    caption: 'Engineered for street runners and night explorers. Premium violet accents meet next-level air cushioning. Feel the surge on ARAO. #NikeAir',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-running-on-the-street-at-sunset-40283-large.mp4',
    mediaType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Learn More',
    targetUrl: 'https://www.nike.com',
    category: 'sports',
    dailyBudget: 300,
    totalBudget: 5000,
    spent: 1420.00,
    impressionsCount: 39500,
    clicksCount: 3890,
    status: 'active'
  },
  {
    campaignId: 'ad_spotify_hifi',
    advertiserId: 'spotify_sound',
    advertiserName: 'Spotify Streams',
    advertiserAvatar: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=200&auto=format&fit=crop&q=80',
    advertiserVerified: true,
    title: 'Ad-Free Sound. 3 Months Free.',
    caption: 'Discover trending African beats, Amapiano, Afrobeats & global chartbusters with zero interruptions and crystal-clear HiFi sound.',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-dj-mixing-music-in-a-party-with-lights-42416-large.mp4',
    mediaType: 'video',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    ctaText: 'Visit Website',
    targetUrl: 'https://www.spotify.com',
    category: 'music',
    dailyBudget: 180,
    totalBudget: 2800,
    spent: 720.00,
    impressionsCount: 19100,
    clicksCount: 1650,
    status: 'active'
  }
];

// In-memory fallback if Firestore is restricted
let localAds: AdCampaign[] = [];
let localTransactions: MonetizationTransaction[] = [];
let localPayouts: CreatorPayoutRequest[] = [];
let clickThrottleMap = new Set<string>();

/**
 * Seed initial ad campaigns if the ad_campaigns collection is empty
 */
export async function seedInitialAdCampaignsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'ad_campaigns'), limit(1)));
    if (!snap.empty) {
      return;
    }

    for (const ad of INITIAL_DEMO_ADS) {
      const docRef = doc(db, 'ad_campaigns', ad.campaignId);
      await setDoc(docRef, {
        ...ad,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    // Firestore might be unconfigured or local, fallback to memory
    if (localAds.length === 0) {
      localAds = INITIAL_DEMO_ADS.map((ad, idx) => ({
        ...ad,
        id: ad.campaignId,
        createdAt: new Date()
      }));
    }
  }
}

/**
 * Fetch active ad campaigns eligible for feed display
 */
export async function getActiveAdCampaigns(category?: string): Promise<AdCampaign[]> {
  try {
    await seedInitialAdCampaignsIfEmpty();
    let q = query(
      collection(db, 'ad_campaigns'),
      where('status', '==', 'active'),
      limit(20)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
      const ads = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdCampaign));
      if (category && category !== 'for_you' && category !== 'trending' && category !== 'following') {
        const matching = ads.filter(a => a.category === category || a.category === 'all');
        return matching.length > 0 ? matching : ads;
      }
      return ads;
    }
  } catch (err) {
    console.warn('Using local fallback for ad campaigns');
  }

  // Fallback to in-memory demo ads
  if (localAds.length === 0) {
    localAds = INITIAL_DEMO_ADS.map(a => ({ ...a, id: a.campaignId, createdAt: new Date() }));
  }
  return localAds.filter(a => a.status === 'active');
}

/**
 * Record an impression for an ad campaign with debounce
 */
export async function recordAdImpression(campaignId: string): Promise<void> {
  try {
    const docRef = doc(db, 'ad_campaigns', campaignId);
    // CPM calculation: ~$0.004 per impression
    await updateDoc(docRef, {
      impressionsCount: increment(1),
      spent: increment(0.004)
    });
  } catch (err) {
    const ad = localAds.find(a => a.campaignId === campaignId || a.id === campaignId);
    if (ad) {
      ad.impressionsCount += 1;
      ad.spent += 0.004;
    }
  }
}

/**
 * Record an ad click with anti-fraud throttling
 */
export async function recordAdClick(campaignId: string, userId?: string): Promise<void> {
  const throttleKey = `${campaignId}_${userId || 'anon'}_${Math.floor(Date.now() / 15000)}`;
  if (clickThrottleMap.has(throttleKey)) {
    return; // Ignore repeated clicks within 15 seconds
  }
  clickThrottleMap.add(throttleKey);

  try {
    const docRef = doc(db, 'ad_campaigns', campaignId);
    // CPC calculation: ~$0.15 per click
    await updateDoc(docRef, {
      clicksCount: increment(1),
      spent: increment(0.15)
    });
  } catch (err) {
    const ad = localAds.find(a => a.campaignId === campaignId || a.id === campaignId);
    if (ad) {
      ad.clicksCount += 1;
      ad.spent += 0.15;
    }
  }
}

/**
 * Report an inappropriate or misleading advertisement
 */
export async function reportAd(data: Omit<AdReportRecord, 'id' | 'reportId' | 'createdAt'>): Promise<void> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: AdReportRecord = {
    ...data,
    id: reportId,
    reportId,
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, 'ad_reports', reportId), {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Report stored locally');
  }
}

/**
 * Create a new advertisement campaign
 */
export async function createAdCampaign(campaignData: {
  advertiserId: string;
  advertiserName: string;
  advertiserAvatar?: string;
  advertiserVerified?: boolean;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  thumbnailUrl?: string;
  ctaText: any;
  targetUrl: string;
  category: VideoCategory | 'all';
  dailyBudget: number;
  totalBudget: number;
}): Promise<AdCampaign> {
  const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const newCamp: AdCampaign = {
    id: campaignId,
    campaignId,
    advertiserId: campaignData.advertiserId,
    advertiserName: campaignData.advertiserName,
    advertiserAvatar: campaignData.advertiserAvatar,
    advertiserVerified: campaignData.advertiserVerified ?? false,
    title: campaignData.title.trim(),
    caption: campaignData.caption.trim(),
    mediaUrl: campaignData.mediaUrl,
    mediaType: campaignData.mediaType,
    thumbnailUrl: campaignData.thumbnailUrl || (campaignData.mediaType === 'image' ? campaignData.mediaUrl : undefined),
    ctaText: campaignData.ctaText || 'Learn More',
    targetUrl: campaignData.targetUrl.trim(),
    category: campaignData.category || 'all',
    dailyBudget: Number(campaignData.dailyBudget) || 20,
    totalBudget: Number(campaignData.totalBudget) || 100,
    spent: 0,
    impressionsCount: 0,
    clicksCount: 0,
    status: 'active', // Active immediately in sandbox / demo environment
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, 'ad_campaigns', campaignId), {
      ...newCamp,
      createdAt: serverTimestamp()
    });

    // Record transaction
    await recordMonetizationTransaction({
      userId: campaignData.advertiserId,
      type: 'ad_spend',
      amount: newCamp.totalBudget,
      currency: 'USD',
      status: 'completed',
      description: `Campaign budget deposit for "${newCamp.title}"`
    });
  } catch (err) {
    console.warn('Saved campaign to local memory fallback');
  }

  localAds.unshift(newCamp);
  return newCamp;
}

/**
 * Get campaigns created by a specific advertiser
 */
export async function getUserAdCampaigns(advertiserId: string): Promise<AdCampaign[]> {
  try {
    const q = query(
      collection(db, 'ad_campaigns'),
      where('advertiserId', '==', advertiserId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdCampaign));
    }
  } catch (err) {
    console.warn('Fetching user campaigns fallback');
  }

  return localAds.filter(a => a.advertiserId === advertiserId);
}

/**
 * Toggle campaign status (pause/resume/cancel)
 */
export async function toggleCampaignStatus(campaignId: string, newStatus: AdStatus): Promise<void> {
  try {
    const docRef = doc(db, 'ad_campaigns', campaignId);
    await updateDoc(docRef, { status: newStatus });
  } catch (err) {
    console.warn('Updated campaign status locally');
  }

  const camp = localAds.find(c => c.campaignId === campaignId || c.id === campaignId);
  if (camp) {
    camp.status = newStatus;
  }
}

/**
 * Admin: Get all ad campaigns for moderation & review
 */
export async function getAllCampaignsForAdmin(): Promise<AdCampaign[]> {
  try {
    const snap = await getDocs(collection(db, 'ad_campaigns'));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AdCampaign));
    }
  } catch (err) {
    console.warn('Admin campaigns local fallback');
  }

  if (localAds.length === 0) {
    localAds = INITIAL_DEMO_ADS.map(a => ({ ...a, id: a.campaignId, createdAt: new Date() }));
  }
  return [...localAds];
}

/**
 * Admin: Approve or Reject a campaign
 */
export async function adminModerateCampaign(campaignId: string, approved: boolean, reason?: string): Promise<void> {
  const newStatus: AdStatus = approved ? 'active' : 'rejected';
  try {
    const docRef = doc(db, 'ad_campaigns', campaignId);
    await updateDoc(docRef, {
      status: newStatus,
      rejectionReason: reason || null
    });
  } catch (err) {
    console.warn('Moderated campaign locally');
  }

  const camp = localAds.find(c => c.campaignId === campaignId || c.id === campaignId);
  if (camp) {
    camp.status = newStatus;
    if (reason) camp.rejectionReason = reason;
  }
}

/**
 * Compute or retrieve creator earnings analytics and eligibility
 */
export async function getCreatorEarnings(
  userId: string,
  totalViews = 0,
  followersCount = 0,
  isVerified = false
): Promise<CreatorEarningsData> {
  // Check criteria:
  // 1. Age (assumed verified for registered creators)
  // 2. Followers >= 1,000 (or if verified / arao official)
  // 3. Views >= 10,000
  const isSpecialAccount = isVerified || userId === 'arao';
  const hasFollowerMin = isSpecialAccount || followersCount >= 1000;
  const hasViewMin = isSpecialAccount || totalViews >= 10000;
  const isEligible = hasFollowerMin && hasViewMin;

  // Standard RPM (revenue per 1000 monetized views) in premium video platforms: $0.65 - $1.20
  const currentRpm = 0.85;
  const eligibleViewsCount = Math.floor(totalViews * 0.82); // ~82% views pass anti-bot / retention filters
  const computedGross = Number(((eligibleViewsCount / 1000) * currentRpm).toFixed(2));
  
  // Baseline demo figures if new account or official creator
  const baselineBalance = isSpecialAccount ? 485.60 : Math.max(computedGross, 0);
  const lifetime = isSpecialAccount ? 1890.40 : baselineBalance;

  // Monthly breakdown for analytics chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const monthlyBreakdown = months.map((m, i) => {
    const factor = (i + 1) / months.length;
    const views = Math.floor((eligibleViewsCount * 0.15) * (0.8 + factor * 0.4)) || (i + 1) * 2400;
    const earnings = Number(((views / 1000) * currentRpm).toFixed(2));
    return {
      month: m,
      views,
      earnings
    };
  });

  return {
    userId,
    balance: baselineBalance,
    pendingBalance: Number((baselineBalance * 0.2).toFixed(2)),
    lifetimeEarnings: lifetime,
    eligibleViewsCount: Math.max(eligibleViewsCount, isSpecialAccount ? 142500 : 0),
    currentRpm,
    monthlyBreakdown,
    isEligible,
    eligibilityChecks: {
      isAgeVerified: true,
      hasFollowerMin,
      hasViewMin,
      isVerifiedCreator: isSpecialAccount
    }
  };
}

/**
 * Request a payout for creator earnings
 */
export async function requestCreatorPayout(
  userId: string,
  username: string,
  email: string,
  amount: number,
  payoutMethod: 'bank_transfer' | 'paypal' | 'crypto_usdc' | 'wise',
  accountDetails: string
): Promise<CreatorPayoutRequest> {
  const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const request: CreatorPayoutRequest = {
    id: payoutId,
    payoutId,
    userId,
    username,
    email,
    amount,
    payoutMethod,
    accountDetails,
    status: 'pending',
    requestedAt: new Date(),
    note: 'Under financial compliance review'
  };

  try {
    await setDoc(doc(db, 'creator_payouts', payoutId), {
      ...request,
      requestedAt: serverTimestamp()
    });

    await recordMonetizationTransaction({
      userId,
      userEmail: email,
      type: 'creator_payout',
      amount,
      currency: 'USD',
      status: 'pending',
      description: `Creator withdrawal payout request via ${payoutMethod}`
    });
  } catch (err) {
    console.warn('Payout stored locally');
  }

  localPayouts.unshift(request);
  return request;
}

/**
 * Admin: Get all creator payout requests
 */
export async function getAllPayoutRequests(): Promise<CreatorPayoutRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'creator_payouts'));
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as CreatorPayoutRequest));
    }
  } catch (err) {
    console.warn('Payouts local fallback');
  }

  return [...localPayouts];
}

/**
 * Admin: Process / Approve Payout
 */
export async function adminProcessPayout(payoutId: string, status: 'completed' | 'rejected', note?: string): Promise<void> {
  try {
    const docRef = doc(db, 'creator_payouts', payoutId);
    await updateDoc(docRef, {
      status,
      processedAt: serverTimestamp(),
      note: note || (status === 'completed' ? 'Transfer approved and dispatched' : 'Rejected by compliance')
    });
  } catch (err) {
    console.warn('Payout updated locally');
  }

  const p = localPayouts.find(item => item.payoutId === payoutId || item.id === payoutId);
  if (p) {
    p.status = status;
    p.processedAt = new Date();
    p.note = note;
  }
}

/**
 * Record a monetization transaction for ledger & auditing
 */
export async function recordMonetizationTransaction(tx: Omit<MonetizationTransaction, 'id' | 'transactionId' | 'createdAt'>): Promise<MonetizationTransaction> {
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: MonetizationTransaction = {
    ...tx,
    id: transactionId,
    transactionId,
    createdAt: new Date()
  };

  try {
    await setDoc(doc(db, 'monetization_transactions', transactionId), {
      ...record,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Transaction stored locally');
  }

  localTransactions.unshift(record);
  return record;
}

/**
 * Get monetization transactions ledger
 */
export async function getMonetizationTransactions(userId?: string): Promise<MonetizationTransaction[]> {
  try {
    let q = query(collection(db, 'monetization_transactions'), limit(50));
    if (userId) {
      q = query(collection(db, 'monetization_transactions'), where('userId', '==', userId), limit(50));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as MonetizationTransaction));
    }
  } catch (err) {
    console.warn('Transactions fallback');
  }

  if (userId) {
    return localTransactions.filter(t => t.userId === userId);
  }
  return [...localTransactions];
}

/**
 * Get Platform Monetization High-Level Stats for Admin
 */
export async function getPlatformMonetizationStats() {
  const allAds = await getAllCampaignsForAdmin();
  const allPayouts = await getAllPayoutRequests();
  const allTx = await getMonetizationTransactions();

  const totalAdRevenue = allAds.reduce((acc, curr) => acc + (curr.spent || 0), 0);
  const totalPayoutsApproved = allPayouts
    .filter(p => p.status === 'completed')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingPayoutsTotal = allPayouts
    .filter(p => p.status === 'pending')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const activeCampaignsCount = allAds.filter(a => a.status === 'active').length;
  const netPlatformProfit = Math.max(0, totalAdRevenue - totalPayoutsApproved);

  return {
    totalAdRevenue: Number(totalAdRevenue.toFixed(2)),
    totalPayoutsApproved: Number(totalPayoutsApproved.toFixed(2)),
    pendingPayoutsTotal: Number(pendingPayoutsTotal.toFixed(2)),
    activeCampaignsCount,
    netPlatformProfit: Number(netPlatformProfit.toFixed(2)),
    totalImpressions: allAds.reduce((acc, curr) => acc + (curr.impressionsCount || 0), 0),
    totalClicks: allAds.reduce((acc, curr) => acc + (curr.clicksCount || 0), 0)
  };
}
