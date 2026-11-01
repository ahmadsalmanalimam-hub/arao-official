import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CommentItem } from '../types';
import { createNotification } from './notificationService';

/**
 * Fetch comments for a specific video
 */
export async function getCommentsForVideo(videoId: string, limitCount = 50): Promise<CommentItem[]> {
  try {
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef,
      where('videoId', '==', videoId),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as CommentItem[];
  } catch (err) {
    console.warn('Comment query index fallback:', err);
    try {
      const commentsRef = collection(db, 'comments');
      const q = query(commentsRef, where('videoId', '==', videoId), limit(limitCount));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as CommentItem[];
      return items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB;
      });
    } catch {
      return [];
    }
  }
}

/**
 * Add a comment to a video
 */
export async function addComment(
  videoId: string,
  videoOwnerId: string,
  user: { uid: string; username: string; avatar?: string },
  text: string,
  parentCommentId?: string | null,
  parentCommentUserId?: string
): Promise<CommentItem> {
  const cleanText = text.trim();
  if (!cleanText) {
    throw new Error('Comment cannot be empty');
  }

  const commentsRef = collection(db, 'comments');
  const commentDoc = doc(commentsRef);

  const newComment: Omit<CommentItem, 'id'> = {
    commentId: commentDoc.id,
    videoId,
    userId: user.uid,
    username: user.username,
    userAvatar: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`,
    text: cleanText,
    parentCommentId: parentCommentId || null,
    likesCount: 0,
    createdAt: serverTimestamp()
  };

  const batch = writeBatch(db);
  batch.set(commentDoc, newComment);
  // Increment video comments count
  batch.update(doc(db, 'videos', videoId), {
    commentsCount: increment(1)
  });

  await batch.commit();

  // Send notification to recipient
  if (parentCommentId && parentCommentUserId) {
    // Reply notification
    await createNotification({
      recipientId: parentCommentUserId,
      senderId: user.uid,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      type: 'reply',
      videoId,
      commentId: commentDoc.id,
      text: cleanText
    });
  } else {
    // Video owner notification
    await createNotification({
      recipientId: videoOwnerId,
      senderId: user.uid,
      senderUsername: user.username,
      senderAvatar: user.avatar,
      type: 'comment',
      videoId,
      commentId: commentDoc.id,
      text: cleanText
    });
  }

  return {
    id: commentDoc.id,
    ...newComment
  };
}

/**
 * Delete a comment
 */
export async function deleteComment(
  commentId: string,
  videoId: string,
  userId: string
): Promise<void> {
  const commentRef = doc(db, 'comments', commentId);
  const snap = await getDoc(commentRef);
  if (!snap.exists()) return;

  const data = snap.data();
  if (data.userId !== userId) {
    throw new Error('You can only delete your own comments');
  }

  const batch = writeBatch(db);
  batch.delete(commentRef);
  batch.update(doc(db, 'videos', videoId), {
    commentsCount: increment(-1)
  });

  await batch.commit();
}

/**
 * Toggle like for a comment
 */
export async function toggleLikeComment(
  commentId: string,
  userId: string
): Promise<boolean> {
  const commentLikeRef = doc(db, 'commentLikes', `${commentId}_${userId}`);
  const snap = await getDoc(commentLikeRef);
  const batch = writeBatch(db);
  const commentRef = doc(db, 'comments', commentId);

  if (snap.exists()) {
    batch.delete(commentLikeRef);
    batch.update(commentRef, { likesCount: increment(-1) });
    await batch.commit();
    return false;
  } else {
    batch.set(commentLikeRef, {
      commentId,
      userId,
      createdAt: serverTimestamp()
    });
    batch.update(commentRef, { likesCount: increment(1) });
    await batch.commit();
    return true;
  }
}
