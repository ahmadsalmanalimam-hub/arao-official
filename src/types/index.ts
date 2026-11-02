export type VideoCategory =
  | 'for_you'
  | 'trending'
  | 'following'
  | 'comedy'
  | 'music'
  | 'sports'
  | 'gaming'
  | 'education'
  | 'news'
  | 'fashion'
  | 'nollywood'
  | 'technology'
  | 'lifestyle'
  | 'food'
  | 'travel'
  | 'business'
  | 'science'
  | 'entertainment';

export type BadgeType = 'none' | 'creator_purple' | 'business_blue';
export type UserRole = 'user' | 'creator' | 'advertiser' | 'admin' | 'owner_admin';

export interface UserProfile {
  uid: string;
  email: string;
  phone?: string;
  username: string;
  usernameLowercase: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  videoCount: number;
  totalLikesCount?: number;
  isPrivate: boolean;
  isVerified?: boolean;
  isOfficial?: boolean;
  badgeType?: BadgeType;
  allowDownloadDefault?: boolean;
  // Monetization & Subscription fields
  isPremium?: boolean;
  premiumTier?: 'monthly' | 'yearly';
  premiumExpiresAt?: any;
  creatorMonetizationApproved?: boolean;
  creatorEarningsBalance?: number;
  totalLifetimeEarned?: number;
  role?: UserRole;
  isBanned?: boolean;
  lastLogin?: any;
  createdAt: any;
  updatedAt: any;
}

export type AdCtaType = 'Learn More' | 'Shop Now' | 'Visit Website' | 'Sign Up' | 'Download' | 'Book Now';

export type AdStatus = 'pending' | 'active' | 'paused' | 'rejected' | 'completed';

export interface AdCampaign {
  id: string;
  campaignId: string;
  advertiserId: string;
  advertiserName: string;
  advertiserAvatar?: string;
  advertiserVerified?: boolean;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'video' | 'image';
  thumbnailUrl?: string;
  ctaText: AdCtaType;
  targetUrl: string;
  category: VideoCategory | 'all';
  dailyBudget: number;
  totalBudget: number;
  spent: number;
  impressionsCount: number;
  clicksCount: number;
  status: AdStatus;
  rejectionReason?: string;
  startDate?: any;
  endDate?: any;
  createdAt: any;
}

export interface CreatorEarningsData {
  userId: string;
  balance: number;
  pendingBalance: number;
  lifetimeEarnings: number;
  eligibleViewsCount: number;
  currentRpm: number; // Revenue per 1000 views, e.g. 0.85
  monthlyBreakdown: {
    month: string;
    views: number;
    earnings: number;
  }[];
  isEligible: boolean;
  eligibilityChecks: {
    isAgeVerified: boolean;
    hasFollowerMin: boolean; // >= 1000
    hasViewMin: boolean; // >= 10000 in 30d
    isVerifiedCreator: boolean;
  };
}

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'rejected';

export interface CreatorPayoutRequest {
  id: string;
  payoutId: string;
  userId: string;
  username: string;
  email: string;
  amount: number;
  payoutMethod: 'bank_transfer' | 'paypal' | 'crypto_usdc' | 'wise';
  accountDetails: string;
  status: PayoutStatus;
  requestedAt: any;
  processedAt?: any;
  note?: string;
}

export interface AdReportRecord {
  id: string;
  reportId: string;
  campaignId: string;
  campaignTitle: string;
  advertiserId: string;
  reporterId: string;
  reason: 'misleading' | 'repetitive' | 'inappropriate' | 'scam' | 'other';
  comment?: string;
  createdAt: any;
}

export interface MonetizationTransaction {
  id: string;
  transactionId: string;
  userId: string;
  userEmail?: string;
  type: 'ad_spend' | 'creator_payout' | 'premium_subscription';
  amount: number;
  currency: 'USD';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  description: string;
  createdAt: any;
}


export type PostType = 'video' | 'photo_single' | 'photo_slideshow' | 'text';

export interface VideoItem {
  id: string;
  videoId: string;
  videoUrl: string;
  cloudinaryPublicId: string;
  thumbnailUrl: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  userAvatar?: string;
  caption: string;
  hashtags: string[];
  category?: VideoCategory | string;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  downloadCount?: number;
  allowDownload?: boolean; // Creator permission for downloads
  visibility: 'public' | 'private';
  createdAt: any;
  soundTitle?: string;
  duration?: number;
  isPinned?: boolean;
  isSponsored?: boolean;
  // Phase 2 rich post fields
  postType?: PostType;
  mediaType?: 'video' | 'photo' | 'slideshow' | 'text';
  photoUrls?: string[];
  slideDuration?: number; // 3, 5, 7, 10
  transitionType?: 'fade' | 'zoom' | 'slide' | 'flip';
  textPostData?: {
    content: string;
    text?: string;
    bgGradient: string;
    font: string;
    animation?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  repostCount?: number;
  isRepost?: boolean;
  originalPostId?: string;
  originalAuthor?: string;
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    totalVotes?: number;
    voterIds?: string[];
    voters?: Record<string, number>; // userId -> optionIndex
  };
}

export interface SystemSettings {
  isAppPaused: boolean;
  maintenanceMessage: string;
  allowUploads: boolean;
  allowSignups: boolean;
  coinsPricePer100: number; // e.g. 500 (₦500 per 100 coins)
  referralSystemEnabled: boolean;
  inviteRewardCoins: number; // e.g. 100
  boostedHashtag: string; // e.g. '#challenge'
  totalRevenueNaira: number;
}

export interface CommentItem {
  id: string;
  commentId: string;
  videoId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  text: string;
  parentCommentId?: string | null;
  likesCount: number;
  isPinned?: boolean;
  translatedText?: string;
  translatedLang?: string;
  replyCount?: number;
  createdAt: any;
}

export interface LikeItem {
  videoId: string;
  userId: string;
  createdAt: any;
}

export interface FollowItem {
  followerId: string;
  followingId: string;
  createdAt: any;
  status: 'active' | 'pending';
}

export type NotificationType = 
  | 'like' 
  | 'comment' 
  | 'reply' 
  | 'follow' 
  | 'follow_request' 
  | 'follow_accept'
  | 'repost'
  | 'mention'
  | 'message'
  | 'story_reply';

export interface NotificationItem {
  id: string;
  notificationId: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  type: NotificationType;
  videoId?: string;
  videoThumbnail?: string;
  commentId?: string;
  text?: string;
  read: boolean;
  createdAt: any;
}

export interface BookmarkItem {
  userId: string;
  videoId: string;
  collectionId: string;
  createdAt: any;
}

export interface WatchHistoryItem {
  id: string;
  historyId: string;
  userId: string;
  videoId: string;
  videoData: VideoItem;
  watchedAt: any;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  userId: string;
  name: string;
  coverUrl?: string;
  count?: number;
  createdAt: any;
}

export interface MessageItem {
  id: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'voice';
  voiceDuration?: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  isGroup?: boolean;
  read: boolean;
  createdAt: any;
}

export interface ConversationItem {
  id: string;
  conversationId: string;
  participants: string[];
  participantDetails?: Record<string, {
    username: string;
    displayName: string;
    avatar: string;
  }>;
  isGroup?: boolean;
  groupName?: string;
  groupAvatar?: string;
  lastMessage: string;
  lastSenderId: string;
  updatedAt: any;
  unreadCount?: number;
}

export interface ReportItem {
  reporterId: string;
  reportedUserId?: string;
  videoId?: string;
  commentId?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: any;
}

export interface UserSettings {
  soundOnByDefault: boolean;
  autoplay: boolean;
  dataSaver: boolean;
  videoQualityPreference: 'auto' | '1080p' | '720p' | '480p' | '360p';
  whoCanComment: 'everyone' | 'following' | 'no_one';
  whoCanMessage: 'everyone' | 'following' | 'no_one';
  notificationsLike: boolean;
  notificationsComment: boolean;
  notificationsFollow: boolean;
  notificationsMessage: boolean;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  requestedBadge: 'creator_purple' | 'business_blue';
  category: string;
  fullLegalName: string;
  businessName?: string;
  documentUrl: string; // Stored in private verification_docs
  websiteUrl?: string;
  socialLinks?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: any;
  reviewedAt?: any;
}

export type StoreProductType =
  | 'account_promotion'
  | 'post_promotion'
  | 'comment_promotion'
  | 'monthly_premium'
  | 'yearly_premium';

export interface EngagementOrder {
  id: string;
  orderId: string;
  userId: string;
  customerEmail: string;
  productType: StoreProductType;
  productTitle: string;
  targetUrl?: string;
  amountUsd: number;
  amountNaira: number;
  paymentMethod: 'paypal' | 'bank_transfer';
  paymentReference: string;
  proofFileUrl?: string; // Stored in private payment_proofs
  status: 'pending' | 'verified' | 'completed' | 'rejected';
  verifiedBy?: string;
  adminNotes?: string;
  createdAt: any;
  completedAt?: any;
}

export interface PaymentSettings {
  id?: string;
  isActive: boolean;
  // Nigerian
  nigerianMethod: {
    enabled: boolean;
    name: string;
    bank: string;
    accountName: string;
    accountNumber: string;
  };
  // International
  internationalMethod: {
    enabled: boolean;
    name: string;
    recipientName: string;
    bank: string;
    accountNumber: string;
    instructions: string;
  };
  whatsappSupportLink: string;
  // Legacy fields kept for compatibility if needed
  paypalEmail: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  bankCode?: string;
  exchangeRateUsdToNgn: number;
  accountPromoPriceUsd: number;
  accountPromoPriceNgn: number;
  postPromoPriceUsd: number;
  postPromoPriceNgn: number;
  commentPromoPriceUsd: number;
  commentPromoPriceNgn: number;
  monthlyPremiumPriceUsd: number;
  monthlyPremiumPriceNgn: number;
  yearlyPremiumPriceUsd: number;
  yearlyPremiumPriceNgn: number;
  instructions: string;
  updatedBy: string;
  updatedAt: any;
}

export interface PremiumSubscription {
  id: string;
  subscriptionId: string;
  userId: string;
  userEmail: string;
  tier: 'monthly' | 'yearly';
  pricePaid: number;
  currency: 'USD' | 'NGN';
  startsAt: any;
  expiresAt: any;
  isActive: boolean;
  verifiedBy?: string;
  orderReference?: string;
  createdAt: any;
}

export interface ManualPromotionBoost {
  id: string;
  boostId: string;
  userId: string;
  customerUsername: string;
  postId?: string;
  promotedPostTitle?: string;
  boostAmount: number;
  boostType: 'video' | 'post' | 'profile';
  paymentReference: string;
  durationDays: number;
  startsAt: any;
  expiresAt: any;
  status: 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
  remainingCredits: number;
  adminEmail: string;
  createdAt: any;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: any;
}


