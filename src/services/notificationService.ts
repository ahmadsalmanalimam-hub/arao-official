import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationItem, NotificationType } from '../types';

export interface CreateNotificationParams {
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  type: NotificationType;
  videoId?: string;
  videoThumbnail?: string;
  commentId?: string;
  text?: string;
}

/**
 * Creates an in-app notification unless the sender is notifying themselves
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Prevent users from generating notifications for their own actions
  if (params.recipientId === params.senderId) {
    return;
  }

  try {
    const notifsRef = collection(db, 'notifications');
    const newDoc = doc(notifsRef);
    await setDoc(newDoc, {
      notificationId: newDoc.id,
      recipientId: params.recipientId,
      senderId: params.senderId,
      senderUsername: params.senderUsername,
      senderAvatar: params.senderAvatar || '',
      type: params.type,
      videoId: params.videoId || null,
      videoThumbnail: params.videoThumbnail || null,
      commentId: params.commentId || null,
      text: params.text || null,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error('Error creating notification:', err);
  }
}

/**
 * Fetch latest notifications for a user
 */
export async function getUserNotifications(userId: string, limitCount = 30): Promise<NotificationItem[]> {
  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NotificationItem[];
  } catch (err) {
    console.warn('Index may be building or falling back for notifications:', err);
    // Fallback query if compound index is still pending
    try {
      const fallbackQ = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        limit(limitCount)
      );
      const snapshot = await getDocs(fallbackQ);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationItem[];
      return items.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });
    } catch {
      return [];
    }
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(d => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking all notifications read:', err);
  }
}
