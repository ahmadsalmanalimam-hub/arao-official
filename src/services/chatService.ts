import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ConversationItem, MessageItem, UserProfile } from '../types';

/**
 * Generate a consistent conversation ID for two users
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Fetch all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<ConversationItem[]> {
  try {
    const convsRef = collection(db, 'conversations');
    const q = query(
      convsRef,
      where('participants', 'array-contains', userId),
      limit(40)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as ConversationItem[];

    return list.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    return [];
  }
}

/**
 * Get or start a conversation between two users
 */
export async function getOrCreateConversation(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<ConversationItem> {
  const conversationId = getConversationId(currentUser.uid, targetUser.uid);
  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as ConversationItem;
  }

  const newConv: ConversationItem = {
    id: conversationId,
    conversationId,
    participants: [currentUser.uid, targetUser.uid],
    participantDetails: {
      [currentUser.uid]: {
        username: currentUser.username,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar
      },
      [targetUser.uid]: {
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar
      }
    },
    lastMessage: 'Conversation started',
    lastSenderId: currentUser.uid,
    updatedAt: serverTimestamp()
  };

  await setDoc(convRef, newConv);
  return newConv;
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  text: string,
  options?: {
    mediaUrl?: string;
    mediaType?: 'image' | 'text' | 'voice';
    voiceDuration?: number;
    status?: 'sending' | 'sent' | 'delivered' | 'read';
  }
): Promise<MessageItem> {
  const cleanText =
    text.trim() ||
    (options?.mediaType === 'voice'
      ? '🎤 Voice note'
      : options?.mediaType === 'image'
      ? '📷 Photo'
      : 'Message');

  const messagesRef = collection(db, 'messages');
  const msgDoc = doc(messagesRef);

  const newMsg: MessageItem = {
    id: msgDoc.id,
    messageId: msgDoc.id,
    conversationId,
    senderId,
    receiverId,
    text: cleanText,
    read: false,
    status: options?.status || 'delivered',
    mediaUrl: options?.mediaUrl,
    mediaType: options?.mediaType,
    voiceDuration: options?.voiceDuration,
    createdAt: serverTimestamp()
  };

  try {
    await setDoc(msgDoc, newMsg);

    // Update conversation lastMessage
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessage: cleanText,
      lastSenderId: senderId,
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.warn('Firestore write warning:', e);
  }

  return newMsg;
}

/**
 * Fetch messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limitCount = 60
): Promise<MessageItem[]> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationId', '==', conversationId),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    })) as MessageItem[];

    return list.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeA - timeB;
    });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return [];
  }
}
