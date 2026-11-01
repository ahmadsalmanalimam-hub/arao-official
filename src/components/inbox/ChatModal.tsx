import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MoreVertical, ShieldAlert, Flag, Loader2 } from 'lucide-react';
import { UserProfile, MessageItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  getConversationId
} from '../../services/chatService';
import { blockUser, submitReport, getDefaultHumanAvatar } from '../../services/userService';

interface ChatModalProps {
  targetUser: UserProfile | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  targetUser,
  onClose,
  onOpenProfile
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [actionNotice, setActionNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !profile || !targetUser) return;
    loadChat();
  }, [user, targetUser]);

  const loadChat = async () => {
    if (!user || !profile || !targetUser) return;
    setLoading(true);
    try {
      const conv = await getOrCreateConversation(profile, targetUser);
      const msgs = await getConversationMessages(conv.conversationId, 60);
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView();
      }, 100);
    } catch (err) {
      console.error('Chat load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUser || !inputText.trim() || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const convId = getConversationId(user.uid, targetUser.uid);
      const newMsg = await sendMessage(convId, user.uid, targetUser.uid, textToSend);
      setMessages(prev => [...prev, newMsg]);

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user || !targetUser) return;
    try {
      await blockUser(user.uid, targetUser.uid);
      setActionNotice(`Blocked @${targetUser.username}`);
      setShowMenu(false);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportUser = async () => {
    if (!user || !targetUser) return;
    try {
      await submitReport({
        reporterId: user.uid,
        reportedUserId: targetUser.uid,
        reason: 'Reported conversation for harassment/spam'
      });
      setActionNotice(`Report submitted for review.`);
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const formatMsgTime = (createdAt: any) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!targetUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full h-full sm:h-[85vh] max-w-lg bg-[#12121C] sm:border sm:border-purple-500/25 sm:rounded-3xl flex flex-col text-white overflow-hidden shadow-[0_0_50px_rgba(112,0,255,0.25)]">
        {/* Header */}
        <div className="p-4 bg-[#1A1926]/90 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenProfile(targetUser.uid)}
              className="relative w-10 h-10 rounded-full overflow-hidden border border-[#8B00FF]/60"
            >
              <img
                src={targetUser.avatar || getDefaultHumanAvatar(targetUser.displayName || targetUser.username)}
                alt={targetUser.username}
                className="w-full h-full object-cover"
              />
            </button>
            <div>
              <button
                onClick={() => onOpenProfile(targetUser.uid)}
                className="text-xs font-bold text-white hover:text-[#D8B4FE] transition-colors flex items-center gap-1.5"
              >
                {targetUser.displayName}
                <span className="w-3.5 h-3.5 rounded-full bg-[#8B00FF] text-white text-[8px] font-bold inline-flex items-center justify-center">✓</span>
              </button>
              <p className="text-[11px] text-[#A5A5B5]">@{targetUser.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-10 w-44 bg-[#1A1926] border border-purple-500/30 rounded-xl shadow-xl py-1 z-30 text-xs">
                  <button
                    onClick={handleReportUser}
                    className="w-full px-3 py-2 text-left text-red-400 hover:bg-white/5 flex items-center gap-2"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report User</span>
                  </button>
                  <button
                    onClick={handleBlockUser}
                    className="w-full px-3 py-2 text-left text-red-400 hover:bg-white/5 flex items-center gap-2"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Block @{targetUser.username}</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notice */}
        {actionNotice && (
          <div className="p-2.5 bg-purple-950/60 border-b border-purple-500/40 text-center text-xs text-purple-200">
            {actionNotice}
          </div>
        )}

        {/* Chat message stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B00FF]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-6">
              <div className="w-16 h-16 rounded-full bg-[#1A1926] border border-purple-500/30 flex items-center justify-center mb-3">
                <img
                  src={targetUser.avatar || getDefaultHumanAvatar(targetUser.displayName || targetUser.username)}
                  alt={targetUser.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              </div>
              <h3 className="text-sm font-bold text-white">Direct Message with @{targetUser.username}</h3>
              <p className="text-xs text-[#A5A5B5] mt-1 max-w-xs">
                Private and direct messaging on ARAO. Keep interactions kind, creative, and respectful.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.uid;
              return (
                <div
                  key={msg.messageId || msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs break-words leading-relaxed ${
                      isMine
                        ? 'bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-medium rounded-br-none shadow-[0_2px_12px_rgba(139,0,255,0.3)]'
                        : 'bg-[#1A1926] text-gray-100 rounded-bl-none border border-white/5'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-[#A5A5B5] mt-1 px-1">
                    {formatMsgTime(msg.createdAt)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#1A1926]/90 border-t border-white/5 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message @${targetUser.username}...`}
            className="flex-1 bg-[#12121C] border border-purple-500/25 rounded-full px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-full bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white disabled:opacity-30 disabled:bg-gray-700 cursor-pointer transition-transform active:scale-95 shadow-md"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
