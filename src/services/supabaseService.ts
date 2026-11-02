import { supabase, SUPABASE_URL } from '../lib/supabase';
import {
  UserProfile,
  VerificationRequest,
  EngagementOrder,
  PaymentSettings,
  PremiumSubscription,
  AdminLog,
  BadgeType,
  UserRole
} from '../types';

export const OWNER_EMAIL = 'nasirandco001@gmail.com';
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
      return data.map((u: any) => ({
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
        isPrivate: u.is_private || false,
        isVerified: u.is_verified || false,
        isOfficial: u.is_official || false,
        badgeType: u.badge_type || (u.is_verified ? 'creator_purple' : 'none'),
        role: u.role || 'user',
        isPremium: u.is_premium || false,
        isBanned: u.is_banned || false,
        lastLogin: u.last_login || u.created_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at
      }));
    }
  } catch (err) {
    console.warn('Supabase fetchAllUsers failed, falling back to local registry:', err);
  }

  // Fallback to local stored registry with owner seed
  const stored = localStorage.getItem('arao_admin_users_cache');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }

  // Default initial owner account
  const ownerUser: UserProfile = {
    uid: 'arao_owner_nasir',
    email: OWNER_EMAIL,
    phone: '+2348000000000',
    username: OWNER_USERNAME,
    usernameLowercase: OWNER_USERNAME,
    displayName: OWNER_DISPLAY_NAME,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    bio: 'Official ARAO Platform Owner & Founder. Building the next generation of African and global creator media.',
    followersCount: 52400,
    followingCount: 14,
    videoCount: 18,
    totalLikesCount: 182300,
    isPrivate: false,
    isVerified: true,
    isOfficial: true,
    badgeType: 'creator_purple',
    role: 'owner_admin',
    isPremium: true,
    isBanned: false,
    lastLogin: new Date().toISOString(),
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date().toISOString()
  };

  return [ownerUser];
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
    return JSON.parse(localStorage.getItem('arao_verification_requests') || '[]');
  } catch {
    return [];
  }
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

export async function manualActivateEngagementBoost(
  adminEmail: string,
  userId: string,
  customerUsername: string,
  postId: string | undefined,
  promotedPostTitle: string | undefined,
  boostAmount: number,
  boostType: 'video' | 'post' | 'profile',
  durationDays: number,
  paymentReference: string
): Promise<ManualPromotionBoost> {
  if (adminEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    throw new Error('Unauthorized: Only the platform owner can perform manual engagement boost activation.');
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  const boost: ManualPromotionBoost = {
    id: `boost_${Date.now()}`,
    boostId: `BOOST-${Date.now().toString().slice(-6)}`,
    userId,
    customerUsername,
    postId,
    promotedPostTitle: promotedPostTitle || 'ARAO Creator Promotion',
    boostAmount,
    boostType,
    paymentReference: paymentReference.trim() || `REF-${Date.now()}`,
    durationDays,
    startsAt: startsAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    remainingCredits: boostAmount,
    adminEmail,
    createdAt: startsAt.toISOString()
  };

  try {
    await supabase.from('manual_promotion_boosts').insert([
      {
        boost_id: boost.boostId,
        user_id: boost.userId,
        customer_username: boost.customerUsername,
        post_id: boost.postId,
        promoted_post_title: boost.promotedPostTitle,
        boost_amount: boost.boostAmount,
        boost_type: boost.boostType,
        payment_reference: boost.paymentReference,
        duration_days: boost.durationDays,
        starts_at: boost.startsAt,
        expires_at: boost.expiresAt,
        status: 'active',
        remaining_credits: boost.remainingCredits,
        admin_email: adminEmail,
        created_at: boost.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase insert boost failed, saved locally:', err);
  }

  try {
    const list = JSON.parse(localStorage.getItem('arao_manual_boosts') || '[]');
    localStorage.setItem('arao_manual_boosts', JSON.stringify([boost, ...list]));
  } catch {}

  // Send in-app notification to customer
  await createNotification({
    recipientId: userId,
    senderId: 'arao_system',
    senderUsername: 'arao_admin',
    type: 'like',
    text: `Your ARAO promotion is now active. Your selected content has entered the promotion system with ${boostAmount} units! 🚀`
  });

  await logAdminAction(adminEmail, adminEmail, 'MANUAL_ACTIVATE_BOOST', userId, 'promotion', {
    boostAmount,
    boostType,
    durationDays,
    paymentReference: boost.paymentReference
  });

  return boost;
}

export async function getManualBoosts(): Promise<ManualPromotionBoost[]> {
  try {
    const { data, error } = await supabase
      .from('manual_promotion_boosts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((d: any) => ({
        id: d.id,
        boostId: d.boost_id,
        userId: d.user_id,
        customerUsername: d.customer_username,
        postId: d.post_id,
        promotedPostTitle: d.promoted_post_title,
        boostAmount: Number(d.boost_amount),
        boostType: d.boost_type,
        paymentReference: d.payment_reference,
        durationDays: Number(d.duration_days),
        startsAt: d.starts_at,
        expiresAt: d.expires_at,
        status: d.status,
        remainingCredits: Number(d.remaining_credits || d.boost_amount),
        adminEmail: d.admin_email,
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local boosts:', err);
  }

  try {
    return JSON.parse(localStorage.getItem('arao_manual_boosts') || '[]');
  } catch {
    return [];
  }
}

export async function updateBoostStatus(
  boostId: string,
  newStatus: 'active' | 'paused' | 'completed' | 'cancelled',
  adminEmail: string
): Promise<void> {
  if (adminEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    throw new Error('Unauthorized action.');
  }

  try {
    await supabase
      .from('manual_promotion_boosts')
      .update({ status: newStatus })
      .eq('boost_id', boostId);
  } catch (err) {}

  try {
    const list = JSON.parse(localStorage.getItem('arao_manual_boosts') || '[]');
    const updated = list.map((b: ManualPromotionBoost) => b.boostId === boostId ? { ...b, status: newStatus } : b);
    localStorage.setItem('arao_manual_boosts', JSON.stringify(updated));
  } catch {}

  await logAdminAction(adminEmail, adminEmail, 'UPDATE_BOOST_STATUS', boostId, 'promotion', { status: newStatus });
}

