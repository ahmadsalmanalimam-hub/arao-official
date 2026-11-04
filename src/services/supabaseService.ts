import { supabase, SUPABASE_URL } from '../lib/supabase';
import {
  UserProfile,
  VerificationRequest,
  EngagementOrder,
  PaymentSettings,
  PremiumSubscription,
  AdminLog,
  BadgeType,
  UserRole,
  AdminReportRecord,
  BanAppeal
} from '../types';

export const ADMIN_AUTHORIZED_EMAILS = [
  'ahmadsalmanalimam@gmail.com',
  'nasirandco001@gmail.com'
];

export const OWNER_EMAIL = 'ahmadsalmanalimam@gmail.com';
export const SECONDARY_OWNER_EMAIL = 'nasirandco001@gmail.com';
export const OWNER_USERNAME = 'arao';
export const OWNER_DISPLAY_NAME = 'Araoofficial';

// Default initial payment settings matching prompt instructions
export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  isActive: true,
  nigerianMethod: {
    enabled: true,
    name: 'OPay',
    bank: 'OPay',
    accountName: 'Ahmad Salman Al-imam',
    accountNumber: '9136375132'
  },
  internationalMethod: {
    enabled: true,
    name: 'TapTap Send',
    recipientName: 'Ahmad Salman Al-imam',
    bank: 'OPay',
    accountNumber: '9136375132',
    instructions: 'Transfer to OPay account above.'
  },
  whatsappSupportLink: 'https://wa.me/2348034663205',
  paypalEmail: 'payments@arao.app',
  bankName: 'Zenith Bank',
  accountNumber: '1012345678',
  accountName: 'ARAO Digital Media Limited',
  bankCode: '057',
  exchangeRateUsdToNgn: 1200,
  accountPromoPriceUsd: 5,
  accountPromoPriceNgn: 6000,
  postPromoPriceUsd: 2,
  postPromoPriceNgn: 3000,
  commentPromoPriceUsd: 5,
  commentPromoPriceNgn: 6000,
  monthlyPremiumPriceUsd: 3,
  monthlyPremiumPriceNgn: 4000,
  yearlyPremiumPriceUsd: 25,
  yearlyPremiumPriceNgn: 30000,
  instructions: 'Transfer the exact amount to our bank or PayPal, then copy the transaction reference and upload proof.',
  updatedBy: OWNER_EMAIL,
  updatedAt: new Date().toISOString()
};

// ==============================================================================
// 1. ADMIN LOGGING SYSTEM
// ==============================================================================

export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetId?: string,
  targetType?: string,
  details?: Record<string, any>
): Promise<void> {
  const logEntry: AdminLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    adminId,
    adminEmail,
    action,
    targetId,
    targetType,
    details: details || {},
    ipAddress: 'client_app',
    createdAt: new Date().toISOString()
  };

  try {
    await supabase.from('admin_logs').insert([
      {
        admin_id: adminId,
        admin_email: adminEmail,
        action,
        target_id: targetId,
        target_type: targetType,
        details: details || {},
        created_at: new Date().toISOString()
      }
    ]);
  } catch (err) {
    console.warn('[Supabase Admin Log fallback]:', err);
  }

  // Backup to localStorage for high availability
  try {
    const existing = JSON.parse(localStorage.getItem('arao_admin_logs') || '[]');
    const updated = [logEntry, ...existing].slice(0, 200);
    localStorage.setItem('arao_admin_logs', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
}

export async function getAdminLogs(): Promise<AdminLog[]> {
  try {
    const { data, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        adminId: d.admin_id,
        adminEmail: d.admin_email,
        action: d.action,
        targetId: d.target_id,
        targetType: d.target_type,
        details: d.details,
        ipAddress: d.ip_address || 'client',
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local admin logs:', err);
  }

  try {
    return JSON.parse(localStorage.getItem('arao_admin_logs') || '[]');
  } catch {
    return [];
  }
}

// ==============================================================================
// 2. USERS MANAGEMENT & PERMISSIONS (Owner-Enforced)
// ==============================================================================

export async function fetchAllUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((u: any) => {
        const badgeType: BadgeType = u.badge_type || (u.is_verified ? 'creator_purple' : 'none');
        const role = u.role || 'user';
        const accountType: 'normal' | 'creator' | 'business' =
          badgeType === 'business_blue' || role === 'advertiser'
            ? 'business'
            : badgeType === 'creator_purple' || role === 'creator'
            ? 'creator'
            : 'normal';

        return {
          uid: u.uid,
          email: u.email,
          phone: u.phone,
          username: u.username,
          usernameLowercase: u.username_lowercase || u.username.toLowerCase(),
          displayName: u.display_name || u.username,
          avatar: u.avatar,
          coverImage: u.cover_image,
          bio: u.bio || '',
          followersCount: u.followers_count || 0,
          followingCount: u.following_count || 0,
          videoCount: u.posts_count || 0,
          totalLikesCount: u.total_likes_count || 0,
          totalRealViews: u.total_real_views || (u.views_count || 0),
          accountType,
          isPrivate: u.is_private || false,
          isVerified: u.is_verified || false,
          isOfficial: u.is_official || false,
          badgeType,
          role,
          isPremium: u.is_premium || false,
          isBanned: u.is_banned || false,
          banReason: u.ban_reason,
          bannedUntil: u.banned_until,
          isShadowBanned: u.is_shadow_banned || false,
          isFrozen: u.is_frozen || false,
          freezeUntil: u.freeze_until,
          isShadowFreeze: u.is_shadow_freeze || false,
          shadowFreezeUntil: u.shadow_freeze_until,
          lastLogin: u.last_login || u.created_at,
          createdAt: u.created_at,
          updatedAt: u.updated_at
        };
      });
    }
  } catch (err) {
    console.warn('Supabase fetchAllUsers failed:', err);
  }
  return [];
}

export async function updateUserRoleAndBadge(
  uid: string,
  updates: {
    role?: UserRole;
    badgeType?: BadgeType;
    isVerified?: boolean;
    isOfficial?: boolean;
    isPremium?: boolean;
    isBanned?: boolean;
  },
  adminEmail: string
): Promise<void> {
  // Prevent removing owner_admin role from nasirandco001@gmail.com
  const isTargetOwner = uid === 'arao_owner_nasir' || updates.role === 'owner_admin';
  if (isTargetOwner && adminEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    throw new Error('Only the owner can manage owner permissions.');
  }

  try {
    await supabase
      .from('users')
      .update({
        role: updates.role,
        badge_type: updates.badgeType,
        is_verified: updates.isVerified,
        is_official: updates.isOfficial,
        is_premium: updates.isPremium,
        is_banned: updates.isBanned,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase update user failed, syncing locally:', err);
  }

  // Update local registry
  try {
    const currentUsers = await fetchAllUsersForAdmin();
    const updated = currentUsers.map((u) => (u.uid === uid ? { ...u, ...updates } : u));
    localStorage.setItem('arao_admin_users_cache', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(adminEmail, adminEmail, 'UPDATE_USER_PERMISSIONS', uid, 'user', updates);
}

/**
 * Ban User with selected duration (24h, 7d, forever) and custom reason
 */
export async function banUserWithDuration(
  uid: string,
  username: string,
  duration: '24h' | '7d' | 'forever',
  reason: string,
  adminEmail: string
): Promise<void> {
  let bannedUntil: string = 'forever';
  if (duration === '24h') {
    bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (duration === '7d') {
    bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  try {
    await supabase
      .from('users')
      .update({
        is_banned: true,
        banned_until: bannedUntil,
        ban_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase ban update fallback:', err);
  }

  // Update local user cache
  try {
    const users = await fetchAllUsersForAdmin();
    const updated = users.map((u) =>
      u.uid === uid
        ? {
            ...u,
            isBanned: true,
            bannedUntil,
            banReason: reason
          }
        : u
    );
    localStorage.setItem('arao_admin_users_cache', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(adminEmail, adminEmail, 'BAN_USER', uid, 'user', {
    username,
    duration,
    bannedUntil,
    reason
  });
}

/**
 * Unban User
 */
export async function unbanUser(uid: string, username: string, adminEmail: string): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        is_banned: false,
        banned_until: null,
        ban_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase unban update fallback:', err);
  }

  // Update local cache
  try {
    const users = await fetchAllUsersForAdmin();
    const updated = users.map((u) =>
      u.uid === uid
        ? {
            ...u,
            isBanned: false,
            bannedUntil: undefined,
            banReason: undefined
          }
        : u
    );
    localStorage.setItem('arao_admin_users_cache', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(adminEmail, adminEmail, 'UNBAN_USER', uid, 'user', { username });
}

/**
 * Toggle Shadow Ban
 */
export async function toggleShadowBan(
  uid: string,
  username: string,
  isShadowBanned: boolean,
  adminEmail: string
): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        is_shadow_banned: isShadowBanned,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase shadow ban update fallback:', err);
  }

  // Update local cache
  try {
    const users = await fetchAllUsersForAdmin();
    const updated = users.map((u) =>
      u.uid === uid ? { ...u, isShadowBanned } : u
    );
    localStorage.setItem('arao_admin_users_cache', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(
    adminEmail,
    adminEmail,
    isShadowBanned ? 'SHADOW_BAN_USER' : 'UNSHADOW_BAN_USER',
    uid,
    'user',
    { username, isShadowBanned }
  );
}

/**
 * Verify User as Creator with PURPLE tick (#8A2BE2)
 */
export async function verifyUserAsCreator(
  uid: string,
  username: string,
  adminEmail: string
): Promise<void> {
  await updateUserRoleAndBadge(
    uid,
    {
      role: 'creator',
      isVerified: true,
      isOfficial: false,
      badgeType: 'creator_purple'
    },
    adminEmail
  );

  await logAdminAction(adminEmail, adminEmail, 'VERIFY_CREATOR_PURPLE_TICK', uid, 'user', { username });
}

/**
 * Verify User as Business with BLUE tick (#1D9BF0)
 */
export async function verifyUserAsBusiness(
  uid: string,
  username: string,
  adminEmail: string
): Promise<void> {
  await updateUserRoleAndBadge(
    uid,
    {
      role: 'advertiser',
      isVerified: true,
      isOfficial: true,
      badgeType: 'business_blue'
    },
    adminEmail
  );

  await logAdminAction(adminEmail, adminEmail, 'VERIFY_BUSINESS_BLUE_TICK', uid, 'user', { username });
}

/**
 * Legacy alias for verifyUserAsBusiness
 */
export async function verifyUserWithBlueTick(
  uid: string,
  username: string,
  adminEmail: string
): Promise<void> {
  return verifyUserAsBusiness(uid, username, adminEmail);
}

/**
 * Remove verification from user
 */
export async function removeUserVerification(
  uid: string,
  username: string,
  adminEmail: string
): Promise<void> {
  await updateUserRoleAndBadge(
    uid,
    {
      role: 'user',
      isVerified: false,
      isOfficial: false,
      badgeType: 'none'
    },
    adminEmail
  );

  await logAdminAction(adminEmail, adminEmail, 'REMOVE_VERIFICATION', uid, 'user', { username });
}

/**
 * Freeze User for 48 hours
 */
export async function toggleFreezeUser(
  uid: string,
  username: string,
  isFrozen: boolean,
  adminEmail: string
): Promise<void> {
  const freezeUntil = isFrozen ? new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() : null;
  try {
    await supabase
      .from('users')
      .update({
        is_frozen: isFrozen,
        freeze_until: freezeUntil,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase freeze update fallback:', err);
  }

  await logAdminAction(adminEmail, adminEmail, isFrozen ? 'FREEZE_USER' : 'UNFREEZE_USER', uid, 'user', { username, isFrozen });
}

/**
 * Toggle Shadow Freeze (user posts, nobody sees)
 */
export async function toggleShadowFreezeUser(
  uid: string,
  username: string,
  isShadowFreeze: boolean,
  adminEmail: string
): Promise<void> {
  try {
    await supabase
      .from('users')
      .update({
        is_shadow_freeze: isShadowFreeze,
        shadow_freeze_until: isShadowFreeze ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null, // Default 1 week
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid);
  } catch (err) {
    console.warn('Supabase shadow freeze update fallback:', err);
  }

  await logAdminAction(adminEmail, adminEmail, isShadowFreeze ? 'SHADOW_FREEZE_USER' : 'UNSHADOW_FREEZE_USER', uid, 'user', { username, isShadowFreeze });
}

// Initial sample reports matching user prompt:
// @ScammerBoy reported by 5 people - Reason: Scam, Post: "Send me 5k I go double am"
const INITIAL_ADMIN_REPORTS: AdminReportRecord[] = [
  {
    id: 'rep_scammerboy_001',
    reportedUserId: 'u_scammer_01',
    reportedUsername: 'ScammerBoy',
    reportedDisplayName: 'Scammer Boy 💸',
    reportedAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80',
    postId: 'post_fake_double',
    postCaption: 'Send me 5k I go double am sharp sharp 🚀 Guaranteed 100% payout inside 10 mins DM me!',
    reporterCount: 5,
    reporters: ['tunde_lagos', 'amara_vibes', 'cyber_naira', 'dj_violet', 'zainab_k'],
    reason: 'Scam',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'rep_adult_002',
    reportedUserId: 'u_badboy_02',
    reportedUsername: 'BadBoy',
    reportedDisplayName: 'Bad Boy Official',
    reportedAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
    postId: 'post_inappropriate_vid',
    postCaption: 'Watch full uncensored link in bio 🔞 #exclusive',
    reporterCount: 8,
    reporters: ['user_alpha', 'kemi_brand', 'bolaji_beats', 'grace_lagos', 'david_tech', 'chioma_f', 'dan_abuja', 'sam_sound'],
    reason: 'Porn',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'rep_impersonate_003',
    reportedUserId: 'u_fake_arao',
    reportedUsername: 'arao_support_help',
    reportedDisplayName: 'ARAO Official Help Desk',
    reportedAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    postId: 'post_fake_support',
    postCaption: 'Urgent: Verify your ARAO wallet password here to avoid account deletion.',
    reporterCount: 4,
    reporters: ['tunde_lagos', 'amara_vibes', 'beatsaudio', 'dj_lagos'],
    reason: 'Impersonation & Phishing',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  }
];

/**
 * Fetch all admin reports
 */
export async function getAdminReports(): Promise<AdminReportRecord[]> {
  try {
    const { data, error } = await supabase
      .from('admin_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        reportedUserId: d.reported_user_id,
        reportedUsername: d.reported_username,
        reportedDisplayName: d.reported_display_name,
        reportedAvatar: d.reported_avatar,
        postId: d.post_id,
        postCaption: d.post_caption,
        postMediaUrl: d.post_media_url,
        reporterCount: d.reporter_count || 1,
        reporters: d.reporters || [],
        reason: d.reason,
        status: d.status,
        actionTaken: d.action_taken,
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local admin reports:', err);
  }

  try {
    const local = localStorage.getItem('arao_admin_reports');
    if (local) {
      return JSON.parse(local);
    }
    localStorage.setItem('arao_admin_reports', JSON.stringify(INITIAL_ADMIN_REPORTS));
    return INITIAL_ADMIN_REPORTS;
  } catch {
    return INITIAL_ADMIN_REPORTS;
  }
}

/**
 * Resolve report with actions: Delete Post, Warn, Ban 7 Days, Ban Forever, Dismiss
 */
export async function resolveAdminReport(
  reportId: string,
  action: 'deleted_post' | 'warned' | 'banned_7_days' | 'banned_forever' | 'dismissed',
  adminEmail: string
): Promise<void> {
  const reports = await getAdminReports();
  const targetReport = reports.find((r) => r.id === reportId);

  if (targetReport) {
    if (action === 'banned_7_days') {
      await banUserWithDuration(
        targetReport.reportedUserId,
        targetReport.reportedUsername,
        '7d',
        targetReport.reason,
        adminEmail
      );
    } else if (action === 'banned_forever') {
      await banUserWithDuration(
        targetReport.reportedUserId,
        targetReport.reportedUsername,
        'forever',
        targetReport.reason,
        adminEmail
      );
    } else if (action === 'deleted_post') {
      // Remove video if present
      try {
        if (targetReport.postId) {
          await supabase.from('videos').delete().eq('id', targetReport.postId);
        }
      } catch {}
    }

    try {
      await supabase
        .from('admin_reports')
        .update({
          status: action === 'dismissed' ? 'dismissed' : 'resolved',
          action_taken: action
        })
        .eq('id', reportId);
    } catch {}

    const updated = reports.map((r) =>
      r.id === reportId
        ? {
            ...r,
            status: (action === 'dismissed' ? 'dismissed' : 'resolved') as 'resolved' | 'dismissed',
            actionTaken: action
          }
        : r
    );
    localStorage.setItem('arao_admin_reports', JSON.stringify(updated));

    await logAdminAction(adminEmail, adminEmail, `REPORT_${action.toUpperCase()}`, reportId, 'report', {
      targetUser: targetReport.reportedUsername,
      action
    });
  }
}

/**
 * Get all banned users
 */
export async function getBannedUsers(): Promise<UserProfile[]> {
  const allUsers = await fetchAllUsersForAdmin();
  let banned = allUsers.filter((u) => u.isBanned === true);

  if (banned.length === 0) {
    // Include initial sample matching prompt: @BadBoy - Banned Forever - Reason: Porn
    const sampleBanned: UserProfile = {
      uid: 'u_badboy_02',
      email: 'badboy@arao.net',
      username: 'BadBoy',
      usernameLowercase: 'badboy',
      displayName: 'Bad Boy ⚠️',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&q=80',
      bio: 'Account currently suspended.',
      followersCount: 420,
      followingCount: 12,
      videoCount: 1,
      isPrivate: false,
      isVerified: false,
      isBanned: true,
      banReason: 'Porn',
      bannedUntil: 'forever',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      updatedAt: new Date().toISOString()
    };
    banned = [sampleBanned];
    // Sync to cache
    const existing = JSON.parse(localStorage.getItem('arao_admin_users_cache') || '[]');
    if (!existing.some((u: UserProfile) => u.uid === sampleBanned.uid)) {
      localStorage.setItem('arao_admin_users_cache', JSON.stringify([...existing, sampleBanned]));
    }
  }

  return banned;
}


// ==============================================================================
// 3. VERIFICATION SYSTEM (Purple #8A2BE2 & Blue #1D9BF0)
// ==============================================================================

export async function submitVerificationRequest(data: {
  userId: string;
  username: string;
  email: string;
  requestedBadge: 'creator_purple' | 'business_blue';
  category: string;
  fullLegalName: string;
  businessName?: string;
  documentFile?: File;
  documentUrl?: string;
  websiteUrl?: string;
  socialLinks?: string;
  notes?: string;
}): Promise<VerificationRequest> {
  let docUrl = data.documentUrl || '';

  if (data.documentFile) {
    docUrl = await uploadToPrivateBucket(data.documentFile, 'verification_docs', data.userId);
  }

  const reqItem: VerificationRequest = {
    id: `verif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: data.userId,
    username: data.username,
    email: data.email,
    requestedBadge: data.requestedBadge,
    category: data.category,
    fullLegalName: data.fullLegalName,
    businessName: data.businessName,
    documentUrl: docUrl,
    websiteUrl: data.websiteUrl,
    socialLinks: data.socialLinks,
    notes: data.notes,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    await supabase.from('verification_requests').insert([
      {
        user_id: reqItem.userId,
        username: reqItem.username,
        email: reqItem.email,
        requested_badge: reqItem.requestedBadge,
        category: reqItem.category,
        full_legal_name: reqItem.fullLegalName,
        business_name: reqItem.businessName,
        document_url: reqItem.documentUrl,
        website_url: reqItem.websiteUrl,
        social_links: reqItem.socialLinks,
        notes: reqItem.notes,
        status: 'pending',
        created_at: reqItem.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase verification insert error, saving locally:', err);
  }

  // Backup locally
  try {
    const list = JSON.parse(localStorage.getItem('arao_verification_requests') || '[]');
    localStorage.setItem('arao_verification_requests', JSON.stringify([reqItem, ...list]));
  } catch (e) {
    console.error(e);
  }

  return reqItem;
}

export async function getVerificationRequests(): Promise<VerificationRequest[]> {
  try {
    const { data, error } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        username: d.username,
        email: d.email,
        requestedBadge: d.requested_badge,
        category: d.category,
        fullLegalName: d.full_legal_name,
        businessName: d.business_name,
        documentUrl: d.document_url,
        websiteUrl: d.website_url,
        socialLinks: d.social_links,
        notes: d.notes,
        status: d.status,
        reviewedBy: d.reviewed_by,
        rejectionReason: d.rejection_reason,
        createdAt: d.created_at,
        reviewedAt: d.reviewed_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local verification requests:', err);
  }

  try {
    const local = localStorage.getItem('arao_verification_requests');
    if (local && JSON.parse(local).length > 0) {
      return JSON.parse(local);
    }
  } catch {}

  const initialRequests: VerificationRequest[] = [
    {
      id: 'verif_tunde_lagos_01',
      userId: 'u_tunde_01',
      username: 'Tunde_Lagos',
      email: 'tunde@afrobeats.ng',
      requestedBadge: 'business_blue',
      category: 'Music Artist',
      fullLegalName: 'Babatunde Olumide Adeleke',
      documentUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&q=80',
      socialLinks: 'https://instagram.com/tunde_lagos (12.4k followers)',
      notes: 'Afrobeats artist with over 1.2M streams across Spotify & Apple Music.',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'verif_amara_02',
      username: 'amara_official',
      userId: 'u_amara_02',
      email: 'amara@style.ng',
      requestedBadge: 'business_blue',
      category: 'Fashion Influencer',
      fullLegalName: 'Amara Chisom Okonkwo',
      documentUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
      socialLinks: 'https://tiktok.com/@amara_style (35k followers)',
      notes: 'Leading fashion creator in West Africa.',
      status: 'pending',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ];

  try {
    localStorage.setItem('arao_verification_requests', JSON.stringify(initialRequests));
  } catch {}

  return initialRequests;
}

export async function reviewVerificationRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  adminEmail: string,
  rejectionReason?: string
): Promise<void> {
  const reqList = await getVerificationRequests();
  const targetReq = reqList.find((r) => r.id === requestId);

  try {
    await supabase
      .from('verification_requests')
      .update({
        status,
        reviewed_by: adminEmail,
        rejection_reason: rejectionReason || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);
  } catch (err) {
    console.warn('Supabase update verification error:', err);
  }

  if (targetReq && status === 'approved') {
    // Automatically apply badge and verified status to user
    await updateUserRoleAndBadge(
      targetReq.userId,
      {
        badgeType: targetReq.requestedBadge,
        isVerified: true,
        isOfficial: targetReq.requestedBadge === 'business_blue'
      },
      adminEmail
    );
  }

  // Update local storage
  try {
    const updated = reqList.map((r) =>
      r.id === requestId
        ? {
            ...r,
            status,
            reviewedBy: adminEmail,
            rejectionReason: rejectionReason || undefined,
            reviewedAt: new Date().toISOString()
          }
        : r
    );
    localStorage.setItem('arao_verification_requests', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(adminEmail, adminEmail, `VERIFICATION_${status.toUpperCase()}`, requestId, 'verification', {
    targetUser: targetReq?.username,
    requestedBadge: targetReq?.requestedBadge,
    reason: rejectionReason
  });
}

// ==============================================================================
// 4. ENGAGEMENT STORE & ORDERS (/store)
// ==============================================================================

export async function createEngagementOrder(orderData: {
  userId: string;
  customerEmail: string;
  productType: EngagementOrder['productType'];
  productTitle: string;
  targetUrl?: string;
  amountUsd: number;
  amountNaira: number;
  paymentMethod: 'paypal' | 'bank_transfer';
  paymentReference: string;
  proofFile?: File;
  proofFileUrl?: string;
}): Promise<EngagementOrder> {
  let proofUrl = orderData.proofFileUrl || '';

  if (orderData.proofFile) {
    proofUrl = await uploadToPrivateBucket(orderData.proofFile, 'payment_proofs', orderData.userId);
  }

  const orderId = `ORD-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const newOrder: EngagementOrder = {
    id: `ord_${Date.now()}`,
    orderId,
    userId: orderData.userId,
    customerEmail: orderData.customerEmail,
    productType: orderData.productType,
    productTitle: orderData.productTitle,
    targetUrl: orderData.targetUrl,
    amountUsd: orderData.amountUsd,
    amountNaira: orderData.amountNaira,
    paymentMethod: orderData.paymentMethod,
    paymentReference: orderData.paymentReference,
    proofFileUrl: proofUrl,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    await supabase.from('engagement_orders').insert([
      {
        order_id: newOrder.orderId,
        user_id: newOrder.userId,
        customer_email: newOrder.customerEmail,
        product_type: newOrder.productType,
        product_title: newOrder.productTitle,
        target_url: newOrder.targetUrl,
        amount_usd: newOrder.amountUsd,
        amount_naira: newOrder.amountNaira,
        payment_method: newOrder.paymentMethod,
        payment_reference: newOrder.paymentReference,
        proof_file_url: newOrder.proofFileUrl,
        status: 'pending',
        created_at: newOrder.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase order insert error, saving locally:', err);
  }

  try {
    const list = JSON.parse(localStorage.getItem('arao_engagement_orders') || '[]');
    localStorage.setItem('arao_engagement_orders', JSON.stringify([newOrder, ...list]));
  } catch (e) {
    console.error(e);
  }

  return newOrder;
}

export async function getEngagementOrders(): Promise<EngagementOrder[]> {
  try {
    const { data, error } = await supabase
      .from('engagement_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        orderId: d.order_id,
        userId: d.user_id,
        customerEmail: d.customer_email,
        productType: d.product_type,
        productTitle: d.product_title,
        targetUrl: d.target_url,
        amountUsd: Number(d.amount_usd),
        amountNaira: Number(d.amount_naira),
        paymentMethod: d.payment_method,
        paymentReference: d.payment_reference,
        proofFileUrl: d.proof_file_url,
        status: d.status,
        verifiedBy: d.verified_by,
        adminNotes: d.admin_notes,
        createdAt: d.created_at,
        completedAt: d.completed_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local engagement orders:', err);
  }

  try {
    return JSON.parse(localStorage.getItem('arao_engagement_orders') || '[]');
  } catch {
    return [];
  }
}

export async function verifyAndCompleteOrder(
  orderId: string,
  adminEmail: string,
  notes?: string
): Promise<void> {
  const orders = await getEngagementOrders();
  const target = orders.find((o) => o.orderId === orderId || o.id === orderId);

  try {
    await supabase
      .from('engagement_orders')
      .update({
        status: 'completed',
        verified_by: adminEmail,
        admin_notes: notes || 'Payment verified by administrator',
        completed_at: new Date().toISOString()
      })
      .eq('order_id', orderId);
  } catch (err) {
    console.warn('Supabase update order error:', err);
  }

  // If order was for Premium subscription, automatically activate Premium with accurate expiration date!
  if (target && (target.productType === 'monthly_premium' || target.productType === 'yearly_premium')) {
    const tier = target.productType === 'yearly_premium' ? 'yearly' : 'monthly';
    await activatePremiumSubscription(
      target.userId,
      target.customerEmail,
      tier,
      target.amountUsd,
      target.orderId,
      adminEmail
    );
  }

  // Update local storage
  try {
    const updated = orders.map((o) =>
      o.orderId === orderId || o.id === orderId
        ? {
            ...o,
            status: 'completed' as const,
            verifiedBy: adminEmail,
            adminNotes: notes || 'Payment verified by administrator',
            completedAt: new Date().toISOString()
          }
        : o
    );
    localStorage.setItem('arao_engagement_orders', JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(adminEmail, adminEmail, 'VERIFY_ORDER_COMPLETED', orderId, 'order', {
    customerEmail: target?.customerEmail,
    product: target?.productTitle,
    amount: target?.amountUsd
  });
}

// ==============================================================================
// 5. PAYMENT SETTINGS (Owner-Only Access)
// ==============================================================================

export async function getPaymentSettings(): Promise<PaymentSettings> {
  try {
    const { data, error } = await supabase.from('payment_settings').select('*').limit(1).single();

    if (!error && data) {
      return {
        id: data.id,
        isActive: data.is_active,
        nigerianMethod: data.nigerian_method || {
            enabled: true,
            name: 'OPay',
            bank: 'OPay',
            accountName: data.account_name || 'Ahmad Salman Al-imam',
            accountNumber: data.account_number || '9136375132'
        },
        internationalMethod: data.international_method || {
            enabled: true,
            name: 'TapTap Send',
            recipientName: 'Ahmad Salman Al-imam',
            bank: 'OPay',
            accountNumber: data.account_number || '9136375132',
            instructions: 'Transfer to OPay account above.'
        },
        whatsappSupportLink: data.whatsapp_support_link || 'https://wa.me/2348034663205',
        paypalEmail: data.paypal_email,
        bankName: data.bank_name,
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankCode: data.bank_code,
        exchangeRateUsdToNgn: Number(data.exchange_rate_usd_to_ngn || 1200),
        accountPromoPriceUsd: Number(data.account_promo_price_usd || 5),
        accountPromoPriceNgn: Number(data.account_promo_price_ngn || 6000),
        postPromoPriceUsd: Number(data.post_promo_price_usd || 2),
        postPromoPriceNgn: Number(data.post_promo_price_ngn || 3000),
        commentPromoPriceUsd: Number(data.comment_promo_price_usd || 5),
        commentPromoPriceNgn: Number(data.comment_promo_price_ngn || 6000),
        monthlyPremiumPriceUsd: Number(data.monthly_premium_price_usd || 3),
        monthlyPremiumPriceNgn: Number(data.monthly_premium_price_ngn || 4000),
        yearlyPremiumPriceUsd: Number(data.yearly_premium_price_usd || 25),
        yearlyPremiumPriceNgn: Number(data.yearly_premium_price_ngn || 30000),
        instructions: data.instructions,
        updatedBy: data.updated_by,
        updatedAt: data.updated_at
      };
    }
  } catch (err) {
    console.warn('Falling back to local payment settings:', err);
  }

  try {
    const saved = localStorage.getItem('arao_payment_settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_PAYMENT_SETTINGS, ...parsed };
    }
  } catch {}

  return DEFAULT_PAYMENT_SETTINGS;
}

export async function updatePaymentSettings(
  settings: Partial<PaymentSettings>,
  adminEmail: string
): Promise<PaymentSettings> {
  if (adminEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    throw new Error('Unauthorized: Only the owner (nasirandco001@gmail.com) can update payment settings.');
  }

  const current = await getPaymentSettings();
  const updated: PaymentSettings = {
    ...current,
    ...settings,
    updatedBy: adminEmail,
    updatedAt: new Date().toISOString()
  };

  try {
    await supabase.from('payment_settings').upsert({
      is_active: updated.isActive,
      nigerian_method: updated.nigerianMethod,
      international_method: updated.internationalMethod,
      whatsapp_support_link: updated.whatsappSupportLink,
      paypal_email: updated.paypalEmail,
      bank_name: updated.bankName,
      account_number: updated.accountNumber,
      account_name: updated.accountName,
      bank_code: updated.bankCode,
      exchange_rate_usd_to_ngn: updated.exchangeRateUsdToNgn,
      account_promo_price_usd: updated.accountPromoPriceUsd,
      account_promo_price_ngn: updated.accountPromoPriceNgn,
      post_promo_price_usd: updated.postPromoPriceUsd,
      post_promo_price_ngn: updated.postPromoPriceNgn,
      comment_promo_price_usd: updated.commentPromoPriceUsd,
      comment_promo_price_ngn: updated.commentPromoPriceNgn,
      monthly_premium_price_usd: updated.monthlyPremiumPriceUsd,
      monthly_premium_price_ngn: updated.monthlyPremiumPriceNgn,
      yearly_premium_price_usd: updated.yearlyPremiumPriceUsd,
      yearly_premium_price_ngn: updated.yearlyPremiumPriceNgn,
      instructions: updated.instructions,
      updated_by: adminEmail,
      updated_at: updated.updatedAt
    });
  } catch (err) {
    console.warn('Supabase update payment settings failed, saving locally:', err);
  }

  localStorage.setItem('arao_payment_settings', JSON.stringify(updated));

  await logAdminAction(adminEmail, adminEmail, 'UPDATE_PAYMENT_SETTINGS', 'settings', 'payment', {
    paypalEmail: updated.paypalEmail,
    bankName: updated.bankName,
    accountNumber: updated.accountNumber
  });

  return updated;
}

// ==============================================================================
// 6. PREMIUM SUBSCRIPTIONS WITH EXPIRATION DATES
// ==============================================================================

export async function activatePremiumSubscription(
  userId: string,
  userEmail: string,
  tier: 'monthly' | 'yearly',
  pricePaid: number,
  orderReference: string,
  verifiedBy: string
): Promise<PremiumSubscription> {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  if (tier === 'yearly') {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }

  const sub: PremiumSubscription = {
    id: `sub_${Date.now()}`,
    subscriptionId: `SUB-${Date.now().toString().slice(-6)}`,
    userId,
    userEmail,
    tier,
    pricePaid,
    currency: 'USD',
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
    verifiedBy,
    orderReference,
    createdAt: startsAt.toISOString()
  };

  try {
    await supabase.from('premium_subscriptions').insert([
      {
        subscription_id: sub.subscriptionId,
        user_id: sub.userId,
        user_email: sub.userEmail,
        tier: sub.tier,
        price_paid: sub.pricePaid,
        starts_at: sub.startsAt,
        expires_at: sub.expiresAt,
        is_active: true,
        verified_by: verifiedBy,
        order_reference: orderReference,
        created_at: sub.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase insert subscription error, saving locally:', err);
  }

  // Update user's isPremium flag in database
  await updateUserRoleAndBadge(userId, { isPremium: true }, verifiedBy);

  try {
    const list = JSON.parse(localStorage.getItem('arao_premium_subscriptions') || '[]');
    localStorage.setItem('arao_premium_subscriptions', JSON.stringify([sub, ...list]));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(verifiedBy, verifiedBy, 'ACTIVATE_PREMIUM_SUBSCRIPTION', userId, 'subscription', {
    tier,
    expiresAt: sub.expiresAt,
    orderReference
  });

  return sub;
}

export async function getPremiumSubscriptions(): Promise<PremiumSubscription[]> {
  try {
    const { data, error } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        subscriptionId: d.subscription_id,
        userId: d.user_id,
        userEmail: d.user_email,
        tier: d.tier,
        pricePaid: Number(d.price_paid),
        currency: d.currency || 'USD',
        startsAt: d.starts_at,
        expiresAt: d.expires_at,
        isActive: d.is_active && new Date(d.expires_at) > new Date(),
        verifiedBy: d.verified_by,
        orderReference: d.order_reference,
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local subscriptions:', err);
  }

  try {
    return JSON.parse(localStorage.getItem('arao_premium_subscriptions') || '[]');
  } catch {
    return [];
  }
}

// ==============================================================================
// 7. PRIVATE STORAGE BUCKET UPLOADS (verification_docs & payment_proofs)
// ==============================================================================

export async function uploadToPrivateBucket(
  file: File,
  bucketName: 'verification_docs' | 'payment_proofs',
  userId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (!error && data) {
      // For private buckets, get signed URL or private storage path
      const { data: signedData } = await supabase.storage.from(bucketName).createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days
      if (signedData?.signedUrl) {
        return signedData.signedUrl;
      }
      return `${SUPABASE_URL}/storage/v1/object/${bucketName}/${filePath}`;
    }
  } catch (err) {
    console.warn(`Supabase private storage (${bucketName}) upload fallback:`, err);
  }

  // Resilient fallback: convert File to base64 DataURL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  });
}
// 8. MANUAL PAYMENT FULFILMENT & ENGAGEMENT BOOST ENGINE
// ==============================================================================

import { ManualPromotionBoost } from '../types';
import { createNotification } from './notificationService';

export async function manualActivatePremium(
  adminEmail: string,
  userId: string,
  tier: 'monthly' | 'yearly',
  durationMonths: number,
  paymentReference: string
): Promise<PremiumSubscription> {
  if (adminEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    throw new Error('Unauthorized: Only the platform owner can perform manual premium activation.');
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  const subId = `SUB-MANUAL-${Date.now().toString().slice(-6)}`;
  const sub: PremiumSubscription = {
    id: `sub_${Date.now()}`,
    subscriptionId: subId,
    userId,
    userEmail: userId, // updated or fetched
    tier,
    pricePaid: tier === 'yearly' ? 25 : 3,
    currency: 'USD',
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
    verifiedBy: adminEmail,
    orderReference: paymentReference.trim() || `MANUAL-${Date.now()}`,
    createdAt: startsAt.toISOString()
  };

  // 1. Update user isPremium status in Supabase & local
  await updateUserRoleAndBadge(userId, { isPremium: true }, adminEmail);

  // 2. Save subscription record
  try {
    await supabase.from('premium_subscriptions').insert([
      {
        subscription_id: sub.subscriptionId,
        user_id: sub.userId,
        user_email: sub.userEmail,
        tier: sub.tier,
        price_paid: sub.pricePaid,
        starts_at: sub.startsAt,
        expires_at: sub.expiresAt,
        is_active: true,
        verified_by: adminEmail,
        order_reference: sub.orderReference,
        created_at: sub.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase insert manual subscription failed, saved locally:', err);
  }

  try {
    const list = JSON.parse(localStorage.getItem('arao_premium_subscriptions') || '[]');
    localStorage.setItem('arao_premium_subscriptions', JSON.stringify([sub, ...list]));
  } catch {}

  // 3. Send in-app notification to customer
  await createNotification({
    recipientId: userId,
    senderId: 'arao_system',
    senderUsername: 'arao_admin',
    type: 'like',
    text: 'Your ARAO Premium subscription is now active. Enjoy your Premium benefits! 🎉'
  });

  // 4. Immutable audit log
  await logAdminAction(adminEmail, adminEmail, 'MANUAL_ACTIVATE_PREMIUM', userId, 'subscription', {
    tier,
    durationMonths,
    paymentReference: sub.orderReference,
    expiresAt: sub.expiresAt
  });

  return sub;
}

// ==============================================================================
// 8. REAL ENGAGEMENT ENGINE (1 Person = 1 View, Real Likes, Real Followers)
// ==============================================================================

/**
 * Record a real unique post view.
 * If user has viewed before, DO NOT count again even if user views 100 times daily.
 * Post view count = COUNT(DISTINCT viewer_user_id) from post_views.
 */
export async function recordRealPostView(
  postId: string,
  viewerUserId: string
): Promise<{ isNewView: boolean; viewCount: number }> {
  if (!postId || !viewerUserId) {
    return { isNewView: false, viewCount: 0 };
  }

  // 1. Check local unique storage cache
  const cacheKey = 'arao_real_post_views';
  let localViewsMap: Record<string, string[]> = {};
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) localViewsMap = JSON.parse(raw);
  } catch {}

  const postViewerSet = new Set(localViewsMap[postId] || []);
  const alreadyViewedLocally = postViewerSet.has(viewerUserId);

  let isNewView = false;

  // 2. Query Supabase post_views table
  try {
    const { data, error } = await supabase
      .from('post_views')
      .select('viewer_user_id')
      .eq('post_id', postId)
      .eq('viewer_user_id', viewerUserId)
      .maybeSingle();

    if (!error && !data && !alreadyViewedLocally) {
      // First time viewing! Insert unique row
      const { error: insertErr } = await supabase.from('post_views').insert([
        {
          post_id: postId,
          viewer_user_id: viewerUserId,
          viewed_at: new Date().toISOString()
        }
      ]);

      if (!insertErr) {
        isNewView = true;
      }
    }
  } catch (err) {
    // If table not yet migrated, fallback smoothly to local uniqueness logic
    if (!alreadyViewedLocally) {
      isNewView = true;
    }
  }

  if (isNewView) {
    postViewerSet.add(viewerUserId);
    localViewsMap[postId] = Array.from(postViewerSet);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(localViewsMap));
    } catch {}
  }

  const viewCount = await getRealPostViewCount(postId);

  // Update post's viewsCount in local cache/supabase
  try {
    await supabase
      .from('videos')
      .update({ views_count: viewCount, updated_at: new Date().toISOString() })
      .eq('id', postId);
  } catch {}

  return { isNewView, viewCount };
}

/**
 * Get accurate count of distinct viewers for a post
 */
export async function getRealPostViewCount(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_views')
      .select('viewer_user_id', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (!error && typeof count === 'number') {
      return count;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('arao_real_post_views');
    if (raw) {
      const map = JSON.parse(raw);
      if (Array.isArray(map[postId])) {
        return map[postId].length;
      }
    }
  } catch {}

  return 0;
}

/**
 * Get total real views accumulated across all posts by a specific user
 */
export async function getUserTotalRealViews(userId: string): Promise<number> {
  let total = 0;
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('id, views_count')
      .eq('user_id', userId);

    if (!error && data) {
      data.forEach((p: any) => {
        total += Number(p.views_count || 0);
      });
      return total;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('arao_real_post_views');
    if (raw) {
      const map = JSON.parse(raw);
      Object.keys(map).forEach((k) => {
        if (k.startsWith(userId)) {
          total += map[k].length;
        }
      });
    }
  } catch {}

  return total;
}

/**
 * Toggle real post like (enforces UNIQUE post_id + user_id)
 */
export async function recordRealPostLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean; count: number }> {
  let isLiked = false;

  try {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      // Unlike
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
      isLiked = false;
    } else {
      // Like
      await supabase.from('post_likes').insert([
        {
          post_id: postId,
          user_id: userId,
          created_at: new Date().toISOString()
        }
      ]);
      isLiked = true;
    }

    const { count } = await supabase
      .from('post_likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    return { liked: isLiked, count: count || 0 };
  } catch {
    // Local fallback
    const key = 'arao_real_post_likes';
    const raw = localStorage.getItem(key) || '{}';
    const map = JSON.parse(raw);
    const likers = new Set(map[postId] || []);
    if (likers.has(userId)) {
      likers.delete(userId);
      isLiked = false;
    } else {
      likers.add(userId);
      isLiked = true;
    }
    map[postId] = Array.from(likers);
    localStorage.setItem(key, JSON.stringify(map));
    return { liked: isLiked, count: likers.size };
  }
}

/**
 * Toggle real follow (enforces UNIQUE follower_id + following_id)
 */
export async function recordRealFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; count: number }> {
  let isFollowing = false;

  try {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (data) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);
      isFollowing = false;
    } else {
      await supabase.from('follows').insert([
        {
          follower_id: followerId,
          following_id: followingId,
          created_at: new Date().toISOString()
        }
      ]);
      isFollowing = true;
    }

    const { count } = await supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', followingId);

    return { following: isFollowing, count: count || 0 };
  } catch {
    // Local fallback
    const key = 'arao_real_user_followers';
    const raw = localStorage.getItem(key) || '{}';
    const map = JSON.parse(raw);
    const followers = new Set(map[followingId] || []);
    if (followers.has(followerId)) {
      followers.delete(followerId);
      isFollowing = false;
    } else {
      followers.add(followerId);
      isFollowing = true;
    }
    map[followingId] = Array.from(followers);
    localStorage.setItem(key, JSON.stringify(map));
    return { following: isFollowing, count: followers.size };
  }
}

// ==============================================================================
// 9. BAN APPEALS SYSTEM
// ==============================================================================

const INITIAL_BAN_APPEALS: BanAppeal[] = [
  {
    id: 'appeal_badboy_001',
    userId: 'u_badboy_02',
    username: 'BadBoy',
    email: 'badboy@arao.net',
    banReason: 'Porn / Inappropriate content',
    appealText:
      'I apologize sincerely for the accidental post. My account was compromised and I have since enabled 2FA and changed my credentials. Please give me another chance to contribute responsibly to the ARAO community.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export async function submitBanAppeal(data: {
  userId: string;
  username: string;
  email: string;
  banReason: string;
  appealText: string;
}): Promise<BanAppeal> {
  const appeal: BanAppeal = {
    id: `appeal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: data.userId,
    username: data.username,
    email: data.email,
    banReason: data.banReason,
    appealText: data.appealText,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    await supabase.from('ban_appeals').insert([
      {
        id: appeal.id,
        user_id: appeal.userId,
        username: appeal.username,
        email: appeal.email,
        ban_reason: appeal.banReason,
        appeal_text: appeal.appealText,
        status: 'pending',
        created_at: appeal.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase ban appeal insert fallback:', err);
  }

  try {
    const list = JSON.parse(localStorage.getItem('arao_ban_appeals') || '[]');
    localStorage.setItem('arao_ban_appeals', JSON.stringify([appeal, ...list]));
  } catch (e) {
    console.error(e);
  }

  await logAdminAction(
    data.email,
    data.email,
    'SUBMIT_BAN_APPEAL',
    appeal.id,
    'ban_appeal',
    { username: data.username, reason: data.banReason }
  );

  return appeal;
}

export async function getBanAppeals(): Promise<BanAppeal[]> {
  try {
    const { data, error } = await supabase
      .from('ban_appeals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        userId: d.user_id,
        username: d.username,
        email: d.email,
        banReason: d.ban_reason,
        appealText: d.appeal_text,
        status: d.status,
        createdAt: d.created_at,
        reviewedAt: d.reviewed_at,
        reviewedBy: d.reviewed_by,
        adminNotes: d.admin_notes
      }));
    }
  } catch (err) {
    console.warn('Falling back to local ban appeals:', err);
  }

  try {
    const local = localStorage.getItem('arao_ban_appeals');
    if (local && JSON.parse(local).length > 0) {
      return JSON.parse(local);
    }
  } catch {}

  return INITIAL_BAN_APPEALS;
}

export async function reviewBanAppeal(
  appealId: string,
  status: 'approved' | 'rejected',
  adminEmail: string,
  adminNotes?: string
): Promise<void> {
  const appeals = await getBanAppeals();
  const target = appeals.find((a) => a.id === appealId);

  try {
    await supabase
      .from('ban_appeals')
      .update({
        status,
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null
      })
      .eq('id', appealId);
  } catch (err) {}

  if (target && status === 'approved') {
    // Automatically unban the user
    await unbanUser(target.userId, target.username, adminEmail);
  }

  const updated = appeals.map((a) =>
    a.id === appealId
      ? {
          ...a,
          status,
          reviewedBy: adminEmail,
          reviewedAt: new Date().toISOString(),
          adminNotes
        }
      : a
  );
  localStorage.setItem('arao_ban_appeals', JSON.stringify(updated));

  await logAdminAction(
    adminEmail,
    adminEmail,
    `BAN_APPEAL_${status.toUpperCase()}`,
    appealId,
    'ban_appeal',
    {
      targetUsername: target?.username,
      decision: status,
      notes: adminNotes
    }
  );
}

// ==============================================================================
// 10. EXPORT USERS TO CSV
// ==============================================================================

export function exportUsersToCSV(users: UserProfile[]): void {
  const headers = [
    'Username',
    'Email',
    'Display Name',
    'Account Type',
    'Followers (Real)',
    'Total Real Views',
    'Is Verified',
    'Badge Type',
    'Is Banned',
    'Ban Reason',
    'Banned Until',
    'Joined Date'
  ];

  const rows = users.map((u) => {
    const accountType =
      u.badgeType === 'business_blue' || u.role === 'advertiser'
        ? 'Business'
        : u.badgeType === 'creator_purple' || u.role === 'creator'
        ? 'Creator'
        : 'Normal';

    return [
      `"${(u.username || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.displayName || '').replace(/"/g, '""')}"`,
      `"${accountType}"`,
      u.followersCount || 0,
      u.totalRealViews || 0,
      u.isVerified ? 'YES' : 'NO',
      `"${u.badgeType || 'none'}"`,
      u.isBanned ? 'YES' : 'NO',
      `"${(u.banReason || '').replace(/"/g, '""')}"`,
      `"${(u.bannedUntil || '').replace(/"/g, '""')}"`,
      `"${new Date(u.createdAt || Date.now()).toLocaleDateString()}"`
    ].join(',');
  });

  const csvContent =
    'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `arao_users_export_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


