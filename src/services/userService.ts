import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, FollowItem, ReportItem } from '../types';
import { createNotification } from './notificationService';

/**
 * Generate an elegant human monogram avatar SVG data URL (NO robot avatars)
 */
export function getDefaultHumanAvatar(name: string): string {
  const initial = (name || 'A').trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8B00FF"/>
        <stop offset="50%" stop-color="#7000FF"/>
        <stop offset="100%" stop-color="#3900A8"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="60" fill="url(#grad)"/>
    <text x="50%" y="54%" font-family="Plus Jakarta Sans, sans-serif" font-size="52" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initial}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_HUMAN_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&q=80'
];

export const PRESET_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80'
];

/**
 * Check if a username is available (case-insensitive)
 */
export async function checkUsernameAvailable(username: string, excludeUid?: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) return false;

  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('usernameLowercase', '==', cleanUsername), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return true;
  if (excludeUid && snapshot.docs[0].id === excludeUid) return true;
  return false;
}

/**
 * Retrieve cached user profile from local storage if present
 */
export function getStoredUserProfile(uid?: string): UserProfile | null {
  try {
    const raw = localStorage.getItem('arao_verified_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!uid || parsed.uid === uid) {
      return parsed;
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

/**
 * Fetch a user profile by UID with offline-first resilience
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const localCached = getStoredUserProfile(uid);

  try {
    const docRef = doc(db, 'users', uid);
    let snap;

    try {
      snap = await getDoc(docRef);
    } catch (docErr: any) {
      const errMsg = docErr?.message?.toLowerCase() || '';
      // If client is offline, attempt to load from Firestore IndexedDB cache or local storage
      if (errMsg.includes('offline') || errMsg.includes('unavailable') || docErr?.code === 'unavailable') {
        try {
          snap = await getDocFromCache(docRef);
        } catch {
          if (localCached) return localCached;
        }
      } else {
        throw docErr;
      }
    }

    if (!snap || !snap.exists()) {
      return localCached;
    }

    const data = snap.data() as UserProfile;
    if (data.email?.toLowerCase() === 'nasirandco001@gmail.com') {
      data.isVerified = true;
      data.isOfficial = true;
    }

    // Update local storage cache with latest data
    try {
      localStorage.setItem('arao_verified_user', JSON.stringify(data));
    } catch {}

    return data;
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    if (errMsg.toLowerCase().includes('offline')) {
      console.warn('Network offline, served cached user profile.');
    } else {
      console.warn('Note while fetching user profile:', errMsg);
    }
    return localCached;
  }
}

/**
 * Fetch a user profile by username with local cache fallback
 */
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const clean = username.trim().toLowerCase();
  const localCached = getStoredUserProfile();
  if (localCached && (localCached.usernameLowercase === clean || localCached.username?.toLowerCase() === clean)) {
    return localCached;
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('usernameLowercase', '==', clean), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data() as UserProfile;
    if (data.email?.toLowerCase() === 'nasirandco001@gmail.com' || data.usernameLowercase === 'arao') {
      data.isVerified = true;
      data.isOfficial = true;
    }
    return data;
  } catch (err: any) {
    console.warn('Note while fetching user by username:', err?.message || err);
    if (localCached && (localCached.usernameLowercase === clean || localCached.username?.toLowerCase() === clean)) {
      return localCached;
    }
    return null;
  }
}

/**
 * Create or initialize human user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  email: string,
  username: string,
  displayName: string,
  avatar?: string
): Promise<UserProfile> {
  const cleanUsername = username.trim();
  const isMyAccount = email.toLowerCase() === 'nasirandco001@gmail.com';
  const humanAvatar = avatar && !avatar.includes('dicebear.com/7.x/bottts')
    ? avatar
    : getDefaultHumanAvatar(displayName || cleanUsername);

  const profile: UserProfile = {
    uid,
    email,
    username: cleanUsername,
    usernameLowercase: cleanUsername.toLowerCase(),
    displayName: displayName.trim() || cleanUsername,
    avatar: humanAvatar,
    coverImage: PRESET_COVER_IMAGES[0],
    bio: isMyAccount
      ? 'Official ARAO Creator & Platform Lead ⚡ Welcome to the next generation of social video.'
      : 'Creator on ARAO ⚡ Exploring and inspiring with video.',
    followersCount: isMyAccount ? 1500 : 0,
    followingCount: 0,
    videoCount: 0,
    totalLikesCount: isMyAccount ? 8400 : 0,
    isPrivate: false,
    isVerified: isMyAccount,
    isOfficial: isMyAccount,
    allowDownloadDefault: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, profile, { merge: true });
  } catch (writeErr) {
    console.warn('Offline state: profile stored locally while network connects:', writeErr);
  }

  try {
    localStorage.setItem('arao_verified_user', JSON.stringify(profile));
    localStorage.setItem('arao_user_email', email);
  } catch {}

  return profile;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const data: Record<string, any> = {
    ...updates,
    updatedAt: serverTimestamp()
  };
  if (updates.username) {
    data.usernameLowercase = updates.username.trim().toLowerCase();
  }

  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, data);
  } catch (err) {
    console.warn('Offline state: profile update applied locally:', err);
  }

  // Always keep localStorage updated
  const local = getStoredUserProfile(uid);
  if (local) {
    try {
      localStorage.setItem('arao_verified_user', JSON.stringify({ ...local, ...updates }));
    } catch {}
  }
}

/**
 * Check follow status between two users
 */
export async function checkFollowStatus(followerId: string, followingId: string): Promise<'none' | 'active' | 'pending'> {
  if (!followerId || !followingId || followerId === followingId) return 'none';
  try {
    const followDocRef = doc(db, 'follows', `${followerId}_${followingId}`);
    const snap = await getDoc(followDocRef);
    if (!snap.exists()) return 'none';
    const data = snap.data();
    return data.status || 'active';
  } catch {
    return 'none';
  }
}

/**
 * Follow a user with transaction/batch and follower count update
 */
export async function followUser(
  follower: { uid: string; username: string; avatar?: string },
  targetUser: { uid: string; isPrivate?: boolean }
): Promise<'active' | 'pending'> {
  if (follower.uid === targetUser.uid) {
    throw new Error('You cannot follow yourself');
  }

  const followId = `${follower.uid}_${targetUser.uid}`;
  const followDocRef = doc(db, 'follows', followId);
  const status: 'active' | 'pending' = targetUser.isPrivate ? 'pending' : 'active';

  const batch = writeBatch(db);
  batch.set(followDocRef, {
    followerId: follower.uid,
    followingId: targetUser.uid,
    status,
    createdAt: serverTimestamp()
  });

  if (status === 'active') {
    batch.update(doc(db, 'users', targetUser.uid), {
      followersCount: increment(1)
    });
    batch.update(doc(db, 'users', follower.uid), {
      followingCount: increment(1)
    });
  }

  await batch.commit();

  await createNotification({
    recipientId: targetUser.uid,
    senderId: follower.uid,
    senderUsername: follower.username,
    senderAvatar: follower.avatar,
    type: targetUser.isPrivate ? 'follow_request' : 'follow'
  });

  return status;
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, targetUserId: string): Promise<void> {
  const followId = `${followerId}_${targetUserId}`;
  const followDocRef = doc(db, 'follows', followId);
  const snap = await getDoc(followDocRef);
  if (!snap.exists()) return;

  const prevStatus = snap.data().status;
  const batch = writeBatch(db);
  batch.delete(followDocRef);

  if (prevStatus === 'active') {
    batch.update(doc(db, 'users', targetUserId), {
      followersCount: increment(-1)
    });
    batch.update(doc(db, 'users', followerId), {
      followingCount: increment(-1)
    });
  }

  await batch.commit();
}

/**
 * Search users by username or display name
 */
export async function searchUsers(searchTerm: string, limitCount = 10): Promise<UserProfile[]> {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return [];

  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('usernameLowercase', '>=', term),
    where('usernameLowercase', '<=', term + '\uf8ff'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as UserProfile);
}

/**
 * Get popular/suggested creators
 */
export async function getSuggestedUsers(currentUserId?: string, limitCount = 8): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(20));
    const snapshot = await getDocs(q);
    const users = snapshot.docs
      .map(d => d.data() as UserProfile)
      .filter(u => u.uid !== currentUserId);
    return users.slice(0, limitCount);
  } catch (err) {
    console.error('Error fetching suggested users:', err);
    return [];
  }
}

/**
 * Block a user
 */
export async function blockUser(blockerId: string, blockedUserId: string): Promise<void> {
  const docRef = doc(db, 'blocks', `${blockerId}_${blockedUserId}`);
  await setDoc(docRef, {
    blockerId,
    blockedUserId,
    createdAt: serverTimestamp()
  });
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
  const docRef = doc(db, 'blocks', `${blockerId}_${blockedUserId}`);
  await deleteDoc(docRef);
}

/**
 * Check if a user is blocked
 */
export async function checkIsBlocked(blockerId: string, targetUserId: string): Promise<boolean> {
  if (!blockerId || !targetUserId) return false;
  try {
    const docRef = doc(db, 'blocks', `${blockerId}_${targetUserId}`);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Report content
 */
export async function submitReport(report: {
  reporterId: string;
  reportedUserId?: string;
  videoId?: string;
  commentId?: string;
  reason: string;
}): Promise<void> {
  const reportsRef = collection(db, 'reports');
  const reportDoc = doc(reportsRef);
  await setDoc(reportDoc, {
    reportId: reportDoc.id,
    ...report,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}
