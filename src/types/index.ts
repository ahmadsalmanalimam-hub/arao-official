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

export interface UserProfile {
  uid: string;
  email: string;
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
  allowDownloadDefault?: boolean;
  // Monetization & Subscription fields
  isPremium?: boolean;
  premiumTier?: 'monthly' | 'yearly';
  premiumExpiresAt?: any;
  creatorMonetizationApproved?: boolean;
  creatorEarningsBalance?: number;
  totalLifetimeEarned?: number;
  role?: 'user' | 'creator' | 'advertiser' | 'admin';
  isBanned?: boolean;
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
  | 'follow_accept';

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
  createdAt: any;
}

export interface MessageItem {
  id: string;
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
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
