import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  writeBatch,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VideoItem, WatchHistoryItem } from '../types';
import { createNotification } from './notificationService';
import { getOptimizedVideoUrl, getCloudinaryThumbnailUrl } from '../lib/cloudinary';
import { recordRealPostView } from './supabaseService';

export interface PublishVideoInput {
  videoUrl: string;
  cloudinaryPublicId: string;
  thumbnailUrl?: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  userAvatar?: string;
  caption: string;
  hashtags?: string[];
  category?: string;
  allowDownload?: boolean;
  visibility: 'public' | 'private';
  soundTitle?: string;
  postType?: 'video' | 'photo_single' | 'photo_slideshow' | 'text';
  mediaType?: 'video' | 'photo' | 'slideshow' | 'text';
  photoUrls?: string[];
  photoTransition?: 'fade' | 'zoom' | 'slide' | 'flip';
  photoDuration?: number;
  textPostData?: {
    content: string;
    text?: string;
    bgGradient: string;
    font: string;
    animation?: string;
    alignment?: 'left' | 'center' | 'right';
  };
  poll?: {
    question: string;
    options: { text: string; votes: number }[];
    totalVotes?: number;
    voterIds?: string[];
    voters?: Record<string, number>;
  };
}

export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[a-zA-Z0-9_]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map(tag => tag.slice(1).toLowerCase())));
}

/**
 * Publish a new video, photo, slideshow, or text post
 */
export async function publishVideo(input: PublishVideoInput): Promise<VideoItem> {
  const videosRef = collection(db, 'videos');
  const videoDoc = doc(videosRef);
  const tags = input.hashtags && input.hashtags.length > 0 
    ? input.hashtags 
    : extractHashtags(input.caption);

  const thumbUrl = input.thumbnailUrl || (input.photoUrls?.[0] || getCloudinaryThumbnailUrl(input.videoUrl));

  const effectivePostType = input.postType || (
    input.mediaType === 'text' ? 'text' :
    input.photoUrls && input.photoUrls.length > 1 ? 'photo_slideshow' :
    input.photoUrls && input.photoUrls.length === 1 ? 'photo_single' : 'video'
  );

  const newVideo: any = {
    videoId: videoDoc.id,
    videoUrl: input.mediaType === 'photo' || input.mediaType === 'slideshow' ? (input.photoUrls?.[0] || input.videoUrl) : getOptimizedVideoUrl(input.videoUrl),
    cloudinaryPublicId: input.cloudinaryPublicId || 'media',
    thumbnailUrl: thumbUrl,
    userId: input.userId,
    username: input.username,
    userDisplayName: input.userDisplayName || input.username,
    userAvatar: input.userAvatar || '',
    caption: input.caption,
    hashtags: tags,
    category: input.category || 'entertainment',
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    downloadCount: 0,
    allowDownload: input.allowDownload !== false,
    visibility: input.visibility,
    soundTitle: input.soundTitle || `Original Sound - ${input.username}`,
    postType: effectivePostType,
    mediaType: input.mediaType || (effectivePostType.startsWith('photo') ? 'photo' : effectivePostType === 'text' ? 'text' : 'video'),
    photoUrls: input.photoUrls || [],
    photoTransition: input.photoTransition || 'fade',
    photoDuration: input.photoDuration || 5,
    textPostData: input.textPostData || undefined,
    poll: input.poll || undefined,
    repostCount: 0,
    createdAt: serverTimestamp()
  };

  try {
    const batch = writeBatch(db);
    batch.set(videoDoc, newVideo);
    batch.update(doc(db, 'users', input.userId), {
      videoCount: increment(1)
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore publish fallback to local persistence:', err);
    try {
      const stored = localStorage.getItem('arao_local_posts') || '[]';
      const parsed = JSON.parse(stored);
      parsed.unshift(newVideo);
      localStorage.setItem('arao_local_posts', JSON.stringify(parsed));
    } catch {}
  }

  return {
    id: videoDoc.id,
    ...newVideo
  };
}

/**
 * Toggle Pin video to top of Creator profile
 */
export async function togglePinUserVideo(userId: string, videoId: string): Promise<boolean> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const snap = await getDoc(videoRef);
    if (!snap.exists()) return false;
    const current = snap.data()?.isPinned || false;
    await setDoc(videoRef, { isPinned: !current }, { merge: true });
    return !current;
  } catch (err) {
    console.error('togglePinUserVideo error:', err);
    return false;
  }
}

/**
 * Cast a vote on a post poll
 */
export async function voteOnPostPoll(videoId: string, userId: string, optionIndex: number): Promise<any> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    const snap = await getDoc(videoRef);
    if (!snap.exists()) return null;
    const poll = snap.data()?.poll;
    if (!poll || !poll.options[optionIndex]) return null;

    const voters = poll.voters || {};
    const previousVote = voters[userId];
    if (previousVote !== undefined) {
      if (previousVote === optionIndex) return poll;
      poll.options[previousVote].votes = Math.max(0, poll.options[previousVote].votes - 1);
    }

    poll.options[optionIndex].votes += 1;
    voters[userId] = optionIndex;
    poll.voters = voters;

    await setDoc(videoRef, { poll }, { merge: true });
    return poll;
  } catch (err) {
    console.error('voteOnPostPoll error:', err);
    return null;
  }
}

/**
 * Repost a video to user profile
 */
export async function repostVideo(
  originalVideo: VideoItem,
  user: { uid: string; username: string; avatar?: string }
): Promise<VideoItem> {
  const videosRef = collection(db, 'videos');
  const videoDoc = doc(videosRef);

  const repostItem: any = {
    ...originalVideo,
    videoId: videoDoc.id,
    userId: user.uid,
    username: user.username,
    userAvatar: user.avatar || '',
    isRepost: true,
    originalPostId: originalVideo.videoId,
    originalAuthor: originalVideo.username,
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(videoDoc, repostItem);
    // Increment original video repost count
    const origRef = doc(db, 'videos', originalVideo.videoId);
    await setDoc(origRef, { repostCount: (originalVideo.repostCount || 0) + 1 }, { merge: true });

    // Send notification to original author
    if (originalVideo.userId !== user.uid) {
      await createNotification({
        recipientId: originalVideo.userId,
        senderId: user.uid,
        senderUsername: user.username,
        senderAvatar: user.avatar,
        type: 'repost',
        videoId: originalVideo.videoId,
        text: `@${user.username} reposted your post`
      });
    }
  } catch (err) {
    console.error('repostVideo error:', err);
  }

  return { id: videoDoc.id, ...repostItem };
}

/**
 * Fetch "For You" feed videos with Not-Interested exclusion and recommendation scoring
 */
export async function getForYouVideos(
  limitCount = 20,
  excludeVideoIds: string[] = []
): Promise<{ videos: VideoItem[]; lastDoc?: DocumentSnapshot }> {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('visibility', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(limitCount + excludeVideoIds.length)
    );

    const snapshot = await getDocs(q);
    const videos = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as VideoItem))
      .filter(v => !excludeVideoIds.includes(v.videoId));

    return {
      videos: videos.slice(0, limitCount),
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  } catch (err) {
    console.warn('For You fallback query:', err);
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, limit(limitCount * 2));
    const snapshot = await getDocs(q);
    const videos = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as VideoItem))
      .filter(v => v.visibility === 'public' && !excludeVideoIds.includes(v.videoId))
      .slice(0, limitCount);
    return { videos };
  }
}

/**
 * Fetch "Trending" feed videos based on views & likes engagement
 */
export async function getTrendingVideos(
  limitCount = 20,
  excludeVideoIds: string[] = []
): Promise<VideoItem[]> {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('visibility', '==', 'public'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const videos = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as VideoItem))
      .filter(v => !excludeVideoIds.includes(v.videoId));

    // Sort by popularity score (views + likes * 2)
    return videos.sort((a, b) => {
      const scoreA = (a.viewsCount || 0) + (a.likesCount || 0) * 2;
      const scoreB = (b.viewsCount || 0) + (b.likesCount || 0) * 2;
      return scoreB - scoreA;
    }).slice(0, limitCount);
  } catch (err) {
    console.error('Trending fetch error:', err);
    return [];
  }
}

/**
 * Fetch videos filtered by specific category (Comedy, Music, Nollywood, Tech, etc.)
 */
export async function getCategoryVideos(
  category: string,
  limitCount = 20,
  excludeVideoIds: string[] = []
): Promise<VideoItem[]> {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('visibility', '==', 'public'),
      where('category', '==', category.toLowerCase()),
      limit(limitCount + excludeVideoIds.length)
    );
    const snapshot = await getDocs(q);
    const videos = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as VideoItem))
      .filter(v => !excludeVideoIds.includes(v.videoId));

    if (videos.length > 0) return videos.slice(0, limitCount);

    // Fallback: search hashtags or captions if category tag isn't explicit
    const fallbackQ = query(videosRef, where('visibility', '==', 'public'), limit(50));
    const snap = await getDocs(fallbackQ);
    const matched = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as VideoItem))
      .filter(v => {
        if (excludeVideoIds.includes(v.videoId)) return false;
        const text = `${v.caption} ${v.hashtags?.join(' ')} ${v.category || ''}`.toLowerCase();
        return text.includes(category.toLowerCase());
      });

    return matched.slice(0, limitCount);
  } catch (err) {
    console.error(`Error fetching category ${category}:`, err);
    return [];
  }
}

/**
 * Fetch "Following" feed videos
 */
export async function getFollowingVideos(
  currentUserId: string,
  limitCount = 20
): Promise<VideoItem[]> {
  if (!currentUserId) return [];

  try {
    const followsRef = collection(db, 'follows');
    const followsQuery = query(
      followsRef,
      where('followerId', '==', currentUserId),
      where('status', '==', 'active'),
      limit(40)
    );
    const followSnap = await getDocs(followsQuery);
    const followingIds = followSnap.docs.map(d => d.data().followingId);

    if (followingIds.length === 0) {
      return [];
    }

    const videosRef = collection(db, 'videos');
    const chunks = followingIds.slice(0, 10);
    const videosQuery = query(
      videosRef,
      where('userId', 'in', chunks),
      where('visibility', '==', 'public'),
      limit(limitCount)
    );
    const vidSnap = await getDocs(videosQuery);
    const videos = vidSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as VideoItem[];

    return videos.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error fetching following videos:', err);
    return [];
  }
}

/**
 * Fetch all videos by a specific user
 */
export async function getUserVideos(userId: string): Promise<VideoItem[]> {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(videosRef, where('userId', '==', userId), limit(60));
    const snap = await getDocs(q);
    const videos = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as VideoItem[];
    return videos;
  } catch (err) {
    console.error('Error fetching user videos:', err);
    return [];
  }
}

/**
 * Fetch a single video by ID
 */
export async function getVideoById(videoId: string): Promise<VideoItem | null> {
  try {
    const docRef = doc(db, 'videos', videoId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as VideoItem;
  } catch {
    return null;
  }
}

/**
 * Real View System: 1 Person = 1 View
 * Inserts into post_views with unique (post_id, viewer_user_id) constraint.
 * If user has viewed before, DO NOT count again even if viewed 100 times daily.
 */
export async function incrementVideoViews(videoId: string, viewerUserId?: string): Promise<void> {
  try {
    let viewerId = viewerUserId;
    if (!viewerId) {
      viewerId = localStorage.getItem('arao_viewer_session_id') || '';
      if (!viewerId) {
        viewerId = `guest_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('arao_viewer_session_id', viewerId);
      }
    }

    const res = await recordRealPostView(videoId, viewerId);
    if (res.isNewView) {
      try {
        const videoRef = doc(db, 'videos', videoId);
        await setDoc(videoRef, { viewsCount: res.viewCount }, { merge: true });
      } catch {}
    }
  } catch (err) {
    console.error('Error recording real view count:', err);
  }
}

/**
 * Increment video downloads count
 */
export async function incrementVideoDownloads(videoId: string): Promise<void> {
  try {
    const videoRef = doc(db, 'videos', videoId);
    await setDoc(videoRef, { downloadCount: increment(1) }, { merge: true });
  } catch (err) {
    console.error('Error incrementing downloads:', err);
  }
}

/**
 * Record video watch history
 */
export async function recordWatchHistory(userId: string, video: VideoItem): Promise<void> {
  if (!userId || !video?.videoId) return;
  try {
    const historyDocId = `${userId}_${video.videoId}`;
    const historyRef = doc(db, 'watchHistory', historyDocId);
    await setDoc(historyRef, {
      historyId: historyDocId,
      userId,
      videoId: video.videoId,
      videoData: {
        videoId: video.videoId,
        thumbnailUrl: video.thumbnailUrl,
        videoUrl: video.videoUrl,
        caption: video.caption,
        username: video.username,
        userDisplayName: video.userDisplayName || video.username,
        userAvatar: video.userAvatar,
        viewsCount: video.viewsCount || 0,
        likesCount: video.likesCount || 0
      },
      watchedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error('Error recording watch history:', err);
  }
}

/**
 * Get user's watch history
 */
export async function getWatchHistory(userId: string, limitCount = 40): Promise<WatchHistoryItem[]> {
  try {
    const historyRef = collection(db, 'watchHistory');
    const q = query(
      historyRef,
      where('userId', '==', userId),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as WatchHistoryItem[];

    return items.sort((a, b) => {
      const timeA = a.watchedAt?.toMillis ? a.watchedAt.toMillis() : 0;
      const timeB = b.watchedAt?.toMillis ? b.watchedAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error fetching watch history:', err);
    return [];
  }
}

/**
 * Remove single item from watch history
 */
export async function removeWatchHistoryItem(userId: string, videoId: string): Promise<void> {
  try {
    const historyDocId = `${userId}_${videoId}`;
    await deleteDoc(doc(db, 'watchHistory', historyDocId));
  } catch (err) {
    console.error('Error removing history item:', err);
  }
}

/**
 * Clear all watch history for user
 */
export async function clearWatchHistory(userId: string): Promise<void> {
  try {
    const historyRef = collection(db, 'watchHistory');
    const q = query(historyRef, where('userId', '==', userId), limit(100));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.error('Error clearing watch history:', err);
  }
}

/**
 * Mark video as Not Interested
 */
export async function markNotInterested(
  userId: string,
  videoId: string,
  category?: string
): Promise<void> {
  try {
    const notIntRef = doc(db, 'notInterested', `${userId}_${videoId}`);
    await setDoc(notIntRef, {
      userId,
      videoId,
      category: category || '',
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Error marking not interested:', err);
  }
}

/**
 * Get list of Not Interested video IDs
 */
export async function getNotInterestedIds(userId?: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const notIntRef = collection(db, 'notInterested');
    const q = query(notIntRef, where('userId', '==', userId), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().videoId);
  } catch {
    return [];
  }
}

/**
 * Toggle like for a video
 */
export async function toggleLikeVideo(
  video: VideoItem,
  user: { uid: string; username: string; avatar?: string }
): Promise<{ liked: boolean; newLikesCount: number }> {
  const likeDocRef = doc(db, 'likes', `${video.videoId}_${user.uid}`);
  const snap = await getDoc(likeDocRef);
  const isCurrentlyLiked = snap.exists();

  const batch = writeBatch(db);
  const videoRef = doc(db, 'videos', video.videoId);

  if (isCurrentlyLiked) {
    batch.delete(likeDocRef);
    batch.update(videoRef, { likesCount: increment(-1) });
    if (video.userId) {
      batch.update(doc(db, 'users', video.userId), {
        totalLikesCount: increment(-1)
      });
    }
    await batch.commit();
    return { liked: false, newLikesCount: Math.max(0, video.likesCount - 1) };
  } else {
    batch.set(likeDocRef, {
      videoId: video.videoId,
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    batch.update(videoRef, { likesCount: increment(1) });
    if (video.userId) {
      batch.update(doc(db, 'users', video.userId), {
        totalLikesCount: increment(1)
      });
    }
    await batch.commit();

    await createNotification({
      recipientId: video.userId,
      senderId: user.uid,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      type: 'like',
      videoId: video.videoId,
      videoThumbnail: video.thumbnailUrl
    });

    return { liked: true, newLikesCount: video.likesCount + 1 };
  }
}

export async function checkUserLiked(videoId: string, userId: string): Promise<boolean> {
  if (!userId || !videoId) return false;
  try {
    const docRef = doc(db, 'likes', `${videoId}_${userId}`);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function toggleBookmark(
  video: VideoItem,
  userId: string,
  collectionId = 'all'
): Promise<boolean> {
  const bookmarkRef = doc(db, 'bookmarks', `${userId}_${video.videoId}`);
  const snap = await getDoc(bookmarkRef);

  if (snap.exists()) {
    await deleteDoc(bookmarkRef);
    return false;
  } else {
    await setDoc(bookmarkRef, {
      userId,
      videoId: video.videoId,
      collectionId,
      createdAt: serverTimestamp()
    });
    return true;
  }
}

export async function checkUserBookmarked(videoId: string, userId: string): Promise<boolean> {
  if (!userId || !videoId) return false;
  try {
    const docRef = doc(db, 'bookmarks', `${userId}_${videoId}`);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getSavedVideos(userId: string): Promise<VideoItem[]> {
  try {
    const bookmarksRef = collection(db, 'bookmarks');
    const q = query(bookmarksRef, where('userId', '==', userId), limit(50));
    const snap = await getDocs(q);
    const videoIds = snap.docs.map(d => d.data().videoId);

    if (videoIds.length === 0) return [];

    const videos: VideoItem[] = [];
    for (const vid of videoIds) {
      const v = await getVideoById(vid);
      if (v) videos.push(v);
    }
    return videos;
  } catch (err) {
    console.error('Error fetching saved videos:', err);
    return [];
  }
}

export async function deleteVideo(videoId: string, userId: string): Promise<void> {
  const videoRef = doc(db, 'videos', videoId);
  const snap = await getDoc(videoRef);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized to delete this video');
  }

  const batch = writeBatch(db);
  batch.delete(videoRef);
  batch.update(doc(db, 'users', userId), {
    videoCount: increment(-1)
  });
  await batch.commit();
}

/**
 * Seed high quality initial showcase videos with real human creator aesthetics & diverse categories
 */
export async function seedInitialVideosIfEmpty(): Promise<void> {
  try {
    const videosRef = collection(db, 'videos');
    const snap = await getDocs(query(videosRef, limit(1)));
    if (!snap.empty) {
      return;
    }

    const initialShowcases = [
      {
        videoId: 'arao_luxury_showcase_1',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-golden-dress-41477-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
        cloudinaryPublicId: 'showcase_fashion_1',
        userId: 'arao_official',
        username: 'arao',
        userDisplayName: 'ARAO Official ✨',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
        caption: 'Welcome to the new era of ARAO. Next-generation purple aesthetics with pure high-definition playback. #ARAO #Fashion #Luxury #Aesthetic',
        hashtags: ['arao', 'fashion', 'luxury', 'aesthetic'],
        category: 'fashion',
        likesCount: 3840,
        commentsCount: 124,
        viewsCount: 18940,
        downloadCount: 310,
        allowDownload: true,
        visibility: 'public' as const,
        soundTitle: 'ARAO Original - Electric Violet Vibe',
        createdAt: serverTimestamp()
      },
      {
        videoId: 'arao_luxury_showcase_2',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-walking-down-a-night-street-in-the-city-42630-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80',
        cloudinaryPublicId: 'showcase_night_2',
        userId: 'neon_vibes',
        username: 'cyberpulse',
        userDisplayName: 'Marcus Vance ⚡',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
        caption: 'Tokyo nocturnal drift under violet neon signs. Tag someone who loves night photography! #Tokyo #Technology #Nightlife #Vibes',
        hashtags: ['tokyo', 'technology', 'nightlife', 'vibes'],
        category: 'technology',
        likesCount: 1920,
        commentsCount: 48,
        viewsCount: 8210,
        downloadCount: 145,
        allowDownload: true,
        visibility: 'public' as const,
        soundTitle: 'Cyber Pulse - Tokyo Nights Beat',
        createdAt: serverTimestamp()
      },
      {
        videoId: 'arao_luxury_showcase_3',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-dj-mixing-music-at-a-party-42416-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80',
        cloudinaryPublicId: 'showcase_dj_3',
        userId: 'soundmaster',
        username: 'dj_violet',
        userDisplayName: 'Elena Thorne 🎧',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
        caption: 'Late night studio sessions dropping the summer bass drop. Hit save and follow for more! #Music #DJ #Festival #Producer',
        hashtags: ['music', 'dj', 'festival', 'producer'],
        category: 'music',
        likesCount: 4215,
        commentsCount: 204,
        viewsCount: 24500,
        downloadCount: 520,
        allowDownload: true,
        visibility: 'public' as const,
        soundTitle: 'Elena Thorne - Ultraviolet Anthem',
        createdAt: serverTimestamp()
      },
      {
        videoId: 'arao_luxury_showcase_4',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-people-in-traditional-clothing-dancing-in-a-parade-42263-large.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80',
        cloudinaryPublicId: 'showcase_nollywood_4',
        userId: 'lagos_arts',
        username: 'chidi_director',
        userDisplayName: 'Chidi Okafor 🎬',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
        caption: 'Behind the scenes on our new Nollywood production in Lagos! The energy is unmatched. #Nollywood #Film #Culture #Lagos',
        hashtags: ['nollywood', 'film', 'culture', 'lagos'],
        category: 'nollywood',
        likesCount: 5630,
        commentsCount: 312,
        viewsCount: 38900,
        downloadCount: 880,
        allowDownload: true,
        visibility: 'public' as const,
        soundTitle: 'Afrobeats Live Percussion Mix',
        createdAt: serverTimestamp()
      }
    ];

    const batch = writeBatch(db);
    for (const v of initialShowcases) {
      const vRef = doc(db, 'videos', v.videoId);
      batch.set(vRef, v);
    }
    await batch.commit();
  } catch (err) {
    console.warn('Seeding note:', err);
  }
}
