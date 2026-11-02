import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, CheckCheck, Heart, UserPlus, CornerDownRight, MessageCircle, Loader2, AtSign } from 'lucide-react';
import { NotificationItem, ConversationItem, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/notificationService';
import { getUserConversations } from '../../services/chatService';
import { getUserProfile, getDefaultHumanAvatar } from '../../services/userService';
import { ChatModal } from './ChatModal';

interface InboxPageProps {
  onOpenVideo: (videoId: string) => void;
  onOpenProfile: (userId: string) => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  onOpenVideo,
  onOpenProfile
}) => {
  const { user, profile, openAuthModal } = useAuth();
  const [tab, setTab] = useState<'activity' | 'messages'>('activity');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatTarget, setActiveChatTarget] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadInbox();
  }, [user, tab]);

  const loadInbox = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (tab === 'activity') {
        const notifs = await getUserNotifications(user.uid, 40);
        setNotifications(notifs);
      } else {
        const convs = await getUserConversations(user.uid);
        setConversations(convs);
      }
    } catch (err) {
      console.error('Error loading inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.uid);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.notificationId);
      setNotifications(prev =>
        prev.map(n => n.notificationId === notif.notificationId ? { ...n, read: true } : n)
      );
    }

    if (notif.videoId) {
      onOpenVideo(notif.videoId);
    } else if (notif.senderId) {
      onOpenProfile(notif.senderId);
    }
  };

  const handleOpenConversation = async (conv: ConversationItem) => {
    if (!user) return;
    const otherUserId = conv.participants.find(p => p !== user.uid);
    if (!otherUserId) return;

    const otherProfile = await getUserProfile(otherUserId);
    if (otherProfile) {
      setActiveChatTarget(otherProfile);
    }
  };

  const formatTimestamp = (createdAt: any) => {
    if (!createdAt) return 'recently';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-[#080810] text-white flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#1A1926] border border-purple-500/30 flex items-center justify-center text-[#8B00FF] mb-4 shadow-[0_0_20px_rgba(139,0,255,0.3)]">
          <Bell className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display">Activity & Messages</h2>
        <p className="text-xs text-[#A5A5B5] mt-2 max-w-xs mb-6">
          Sign in to your ARAO account to see your likes, comments, mentions, and private creator chats.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-semibold text-xs shadow-lg hover:opacity-95"
        >
          Sign In to Continue
        </button>
      </div>
    );
  }

  const unreadNotifs = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full min-h-screen bg-[#080810] text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Header Tabs */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-purple-500/15">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setTab('activity')}
            className={`flex items-center gap-2 pb-1 text-sm font-bold tracking-wide transition-all ${
              tab === 'activity'
                ? 'text-white border-b-2 border-[#8B00FF]'
                : 'text-[#A5A5B5] hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Activity</span>
            {unreadNotifs > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#FF1744] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('messages')}
            className={`flex items-center gap-2 pb-1 text-sm font-bold tracking-wide transition-all ${
              tab === 'messages'
                ? 'text-white border-b-2 border-[#8B00FF]'
                : 'text-[#A5A5B5] hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Direct Messages</span>
          </button>
        </div>

        {tab === 'activity' && unreadNotifs > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-[#D8B4FE] hover:underline flex items-center gap-1"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#8B00FF]" />
        </div>
      ) : tab === 'activity' ? (
        /* Notifications List */
        notifications.length === 0 ? (
          <div className="py-24 text-center text-[#A5A5B5]">
            <Bell className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
            <p className="text-xs">No notifications yet.</p>
            <p className="text-[11px] text-gray-500 mt-1">Interactions with your videos will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((notif) => {
              const iconMap: Record<string, any> = {
                like: <Heart className="w-3.5 h-3.5 text-[#FF1744] fill-[#FF1744]" />,
                comment: <MessageCircle className="w-3.5 h-3.5 text-[#8B00FF]" />,
                reply: <CornerDownRight className="w-3.5 h-3.5 text-[#8B00FF]" />,
                follow: <UserPlus className="w-3.5 h-3.5 text-blue-400" />,
                follow_request: <UserPlus className="w-3.5 h-3.5 text-purple-400" />,
                follow_accept: <UserPlus className="w-3.5 h-3.5 text-emerald-400" />,
                mention: <AtSign className="w-3.5 h-3.5 text-pink-400" />,
                message: <MessageCircle className="w-3.5 h-3.5 text-purple-400" />,
                story_reply: <Heart className="w-3.5 h-3.5 text-pink-400" />
              };

              return (
                <div
                  key={notif.notificationId || notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    notif.read
                      ? 'bg-[#12121C] border-white/5 opacity-80'
                      : 'bg-[#1A1926] border-purple-500/35 shadow-[0_0_15px_rgba(112,0,255,0.1)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={notif.senderAvatar || getDefaultHumanAvatar(notif.senderUsername)}
                        alt={notif.senderUsername}
                        className="w-10 h-10 rounded-full border border-purple-500/30 object-cover"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#12121C] border border-white/10 flex items-center justify-center">
                        {iconMap[notif.type] || <Bell className="w-3 h-3 text-[#8B00FF]" />}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-200 leading-snug">
                        <span className="font-semibold text-white">@{notif.senderUsername}</span>{' '}
                        {notif.type === 'like' && 'liked your video.'}
                        {notif.type === 'comment' && 'commented on your video.'}
                        {notif.type === 'reply' && 'replied to your comment.'}
                        {notif.type === 'follow' && 'started following you.'}
                        {notif.type === 'follow_request' && 'requested to follow you.'}
                        {notif.type === 'follow_accept' && 'accepted your follow request.'}
                      </p>
                      {notif.text && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 italic">
                          "{notif.text}"
                        </p>
                      )}
                      <span className="text-[10px] text-[#A5A5B5] block mt-1">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {notif.videoThumbnail && (
                    <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 ml-3 border border-purple-500/20">
                      <img
                        src={notif.videoThumbnail}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Conversations List */
        conversations.length === 0 ? (
          <div className="py-24 text-center text-[#A5A5B5]">
            <MessageSquare className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
            <p className="text-xs">No direct conversations yet.</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Visit a creator's profile and tap "Message" to start a direct private conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const otherUserId = conv.participants.find(p => p !== user.uid);
              const otherDetails = otherUserId && conv.participantDetails ? conv.participantDetails[otherUserId] : null;

              return (
                <div
                  key={conv.conversationId || conv.id}
                  onClick={() => handleOpenConversation(conv)}
                  className="p-3 bg-[#12121C] border border-purple-500/20 rounded-2xl flex items-center justify-between hover:border-[#8B00FF]/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={otherDetails?.avatar || getDefaultHumanAvatar(otherDetails?.displayName || otherDetails?.username || 'User')}
                      alt={otherDetails?.username || 'user'}
                      className="w-11 h-11 rounded-full border border-purple-500/30 object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-white truncate">
                        {otherDetails?.displayName || otherDetails?.username || 'User'}
                      </h3>
                      <p className="text-[11px] text-[#A5A5B5] truncate mt-0.5">
                        {conv.lastMessage || 'Sent a message'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0 ml-2">
                    {formatTimestamp(conv.updatedAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Direct Chat Modal */}
      {activeChatTarget && (
        <ChatModal
          targetUser={activeChatTarget}
          onClose={() => {
            setActiveChatTarget(null);
            loadInbox();
          }}
          onOpenProfile={onOpenProfile}
        />
      )}
    </div>
  );
};
