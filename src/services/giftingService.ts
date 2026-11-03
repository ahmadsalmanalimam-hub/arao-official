import { supabase } from '../lib/supabase';
import { VirtualGift, GiftTransaction, UserProfile } from '../types';
import { updateUserProfile } from './userService';

export type { VirtualGift, GiftTransaction };

export const VIRTUAL_GIFTS: VirtualGift[] = [
  {
    id: 'gift_rose',
    name: 'Rose',
    icon: '🌹',
    coins: 1,
    nairaValue: 10,
    animationType: 'sparkle',
    description: 'A classic symbol of appreciation'
  },
  {
    id: 'gift_flame',
    name: 'Flame',
    icon: '🔥',
    coins: 5,
    nairaValue: 50,
    animationType: 'flame',
    description: 'Set the live stream on fire'
  },
  {
    id: 'gift_diamond',
    name: 'Diamond',
    icon: '💎',
    coins: 20,
    nairaValue: 200,
    animationType: 'sparkle',
    description: 'Sparkling diamond prestige'
  },
  {
    id: 'gift_crown',
    name: 'Royal Crown',
    icon: '👑',
    coins: 100,
    nairaValue: 1000,
    animationType: 'royal',
    description: 'Crown the king or queen of the stream'
  },
  {
    id: 'gift_rocket',
    name: 'Rocket',
    icon: '🚀',
    coins: 250,
    nairaValue: 2500,
    animationType: 'cosmic',
    description: 'Blast the broadcast to the moon'
  },
  {
    id: 'gift_lion',
    name: 'Golden Lion',
    icon: '🦁',
    coins: 500,
    nairaValue: 5000,
    animationType: 'roar',
    description: 'Ultimate king of the savannah roar'
  }
];

export function getAvailableGifts(): VirtualGift[] {
  return VIRTUAL_GIFTS;
}

/**
 * Send a virtual gift to a creator during live stream or post
 * Increments creator's earned currency balance in real time
 */
export async function sendVirtualGift(params: {
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  recipientId: string;
  recipientUsername: string;
  gift: VirtualGift;
  liveSessionId?: string;
}): Promise<GiftTransaction> {
  const transaction: GiftTransaction = {
    id: `gift_tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    senderId: params.senderId,
    senderUsername: params.senderUsername,
    senderAvatar: params.senderAvatar,
    recipientId: params.recipientId,
    recipientUsername: params.recipientUsername,
    giftId: params.gift.id,
    giftName: params.gift.name,
    giftIcon: params.gift.icon,
    coins: params.gift.coins,
    nairaValue: params.gift.nairaValue,
    liveSessionId: params.liveSessionId,
    createdAt: new Date().toISOString()
  };

  // 1. Persist transaction to Supabase table 'gift_transactions'
  try {
    await supabase.from('gift_transactions').insert([
      {
        id: transaction.id,
        sender_id: transaction.senderId,
        sender_username: transaction.senderUsername,
        sender_avatar: transaction.senderAvatar,
        recipient_id: transaction.recipientId,
        recipient_username: transaction.recipientUsername,
        gift_id: transaction.giftId,
        gift_name: transaction.giftName,
        gift_icon: transaction.giftIcon,
        coins: transaction.coins,
        naira_value: transaction.nairaValue,
        live_session_id: transaction.liveSessionId,
        created_at: transaction.createdAt
      }
    ]);
  } catch (err) {
    console.warn('Supabase gift transaction save fallback:', err);
  }

  // 2. Backup to localStorage for high availability
  try {
    const list = JSON.parse(localStorage.getItem('arao_gift_transactions') || '[]');
    localStorage.setItem('arao_gift_transactions', JSON.stringify([transaction, ...list].slice(0, 300)));
  } catch (e) {
    console.error(e);
  }

  // 3. Increment creator's earned currency balance in creator profile / cache
  try {
    const cachedUsers: UserProfile[] = JSON.parse(localStorage.getItem('arao_admin_users_cache') || '[]');
    const targetUser = cachedUsers.find((u) => u.uid === params.recipientId);

    const prevCoins = targetUser?.giftEarningsCoins || targetUser?.coinsBalance || 0;
    const prevNaira = targetUser?.giftEarningsNaira || targetUser?.creatorEarningsBalance || 0;

    const newCoins = prevCoins + params.gift.coins;
    const newNaira = prevNaira + params.gift.nairaValue;

    // Update locally
    const updatedUsers = cachedUsers.map((u) =>
      u.uid === params.recipientId
        ? {
            ...u,
            coinsBalance: (u.coinsBalance || 0) + params.gift.coins,
            giftEarningsCoins: newCoins,
            giftEarningsNaira: newNaira,
            creatorEarningsBalance: newNaira
          }
        : u
    );
    localStorage.setItem('arao_admin_users_cache', JSON.stringify(updatedUsers));

    // Also update if currently logged in user is the recipient
    const currentUser = JSON.parse(localStorage.getItem('arao_verified_user') || 'null');
    if (currentUser && currentUser.uid === params.recipientId) {
      currentUser.coinsBalance = (currentUser.coinsBalance || 0) + params.gift.coins;
      currentUser.giftEarningsCoins = newCoins;
      currentUser.giftEarningsNaira = newNaira;
      currentUser.creatorEarningsBalance = newNaira;
      localStorage.setItem('arao_verified_user', JSON.stringify(currentUser));
    }

    // Try Supabase RPC or direct user update
    try {
      await supabase
        .from('users')
        .update({
          gift_earnings_coins: newCoins,
          gift_earnings_naira: newNaira,
          creator_earnings_balance: newNaira
        })
        .eq('uid', params.recipientId);
    } catch {}
  } catch (e) {
    console.warn('Failed to increment creator balance:', e);
  }

  // 4. Dispatch interactive animation event for the active stream UI
  window.dispatchEvent(
    new CustomEvent('arao_gift_received', {
      detail: {
        ...transaction,
        animationType: params.gift.animationType
      }
    })
  );

  return transaction;
}

/**
 * Fetch total gifts received by creator
 */
export async function getCreatorEarnedGifts(creatorId: string): Promise<{
  totalCoins: number;
  totalNaira: number;
  recentGifts: GiftTransaction[];
}> {
  let list: GiftTransaction[] = [];
  try {
    const { data, error } = await supabase
      .from('gift_transactions')
      .select('*')
      .eq('recipient_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      list = data.map((d: any) => ({
        id: d.id,
        senderId: d.sender_id,
        senderUsername: d.sender_username,
        senderAvatar: d.sender_avatar,
        recipientId: d.recipient_id,
        recipientUsername: d.recipient_username,
        giftId: d.gift_id,
        giftName: d.gift_name,
        giftIcon: d.gift_icon,
        coins: Number(d.coins) || 0,
        nairaValue: Number(d.naira_value) || 0,
        liveSessionId: d.live_session_id,
        createdAt: d.created_at
      }));
    }
  } catch (err) {
    console.warn('Falling back to local gifts:', err);
  }

  if (list.length === 0) {
    try {
      const all: GiftTransaction[] = JSON.parse(localStorage.getItem('arao_gift_transactions') || '[]');
      list = all.filter((g) => g.recipientId === creatorId);
    } catch {}
  }

  const totalCoins = list.reduce((acc, g) => acc + g.coins, 0);
  const totalNaira = list.reduce((acc, g) => acc + g.nairaValue, 0);

  return { totalCoins, totalNaira, recentGifts: list };
}
