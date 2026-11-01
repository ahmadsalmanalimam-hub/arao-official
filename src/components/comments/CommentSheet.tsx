import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, Trash2, CornerDownRight, Flag, Loader2 } from 'lucide-react';
import { VideoItem, CommentItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getCommentsForVideo, addComment, deleteComment, toggleLikeComment } from '../../services/commentService';
import { getDefaultHumanAvatar } from '../../services/userService';

interface CommentSheetProps {
  video: VideoItem | null;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
  onOpenReport?: (commentId: string) => void;
}

export const CommentSheet: React.FC<CommentSheetProps> = ({
  video,
  onClose,
  onOpenProfile,
  onOpenReport
}) => {
  const { user, profile, openAuthModal } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!video) return;
    loadComments();
  }, [video]);

  const loadComments = async () => {
    if (!video) return;
    setLoading(true);
    try {
      const list = await getCommentsForVideo(video.videoId);
      setComments(list);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    if (!commentText.trim() || submitting || !video) return;

    setSubmitting(true);
    try {
      const newComment = await addComment(
        video.videoId,
        video.userId,
        {
          uid: user.uid,
          username: profile.username,
          avatar: profile.avatar || getDefaultHumanAvatar(profile.displayName || profile.username)
        },
        commentText.trim(),
        replyingTo ? replyingTo.commentId : null,
        replyingTo ? replyingTo.userId : undefined
      );

      setComments(prev => [...prev, newComment]);
      setCommentText('');
      setReplyingTo(null);

      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!user || !video) return;
    try {
      await deleteComment(commentId, video.videoId, user.uid);
      setComments(prev => prev.filter(c => c.commentId !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    try {
      const liked = await toggleLikeComment(commentId, user.uid);
      setComments(prev =>
        prev.map(c => {
          if (c.commentId === commentId) {
            return {
              ...c,
              likesCount: liked ? (c.likesCount || 0) + 1 : Math.max(0, (c.likesCount || 0) - 1)
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Error liking comment:', err);
    }
  };

  const formatTimestamp = (createdAt: any) => {
    if (!createdAt) return 'now';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt.seconds ? createdAt.seconds * 1000 : createdAt);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="flex-1" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-auto bg-[#12121C] border-t border-purple-500/20 rounded-t-3xl max-h-[75vh] flex flex-col text-white shadow-[0_-10px_40px_rgba(112,0,255,0.2)]">
        {/* Grab Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">
              Comments <span className="text-[#D8B4FE] text-xs">({comments.length})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#8B00FF]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-[#A5A5B5]">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs text-gray-500 mt-1">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.commentId || comment.id} className="flex gap-3 items-start group">
                <button
                  onClick={() => onOpenProfile(comment.userId)}
                  className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-purple-500/30"
                >
                  <img
                    src={comment.userAvatar || getDefaultHumanAvatar(comment.username)}
                    alt={comment.username}
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenProfile(comment.userId)}
                      className="text-xs font-semibold text-gray-200 hover:text-[#D8B4FE] transition-colors flex items-center gap-1"
                    >
                      <span>@{comment.username}</span>
                      {(comment.username?.toLowerCase() === 'arao' ||
                        (user?.uid === comment.userId &&
                          (user?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
                            profile?.isVerified === true ||
                            profile?.username?.toLowerCase() === 'arao'))) && (
                        <span
                          className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] text-white text-[8px] font-bold inline-flex items-center justify-center shadow-sm"
                          title="Verified Official Account"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                    {video.userId === comment.userId && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#8B00FF]/20 text-[#D8B4FE] border border-[#8B00FF]/30 font-medium">
                        Creator
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500">
                      {formatTimestamp(comment.createdAt)}
                    </span>
                  </div>

                  {comment.parentCommentId && (
                    <span className="text-[10px] text-purple-400 block mt-0.5">
                      Replying to thread
                    </span>
                  )}

                  <p className="text-xs text-gray-200 mt-1 leading-relaxed break-words">
                    {comment.text}
                  </p>

                  <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-400">
                    <button
                      onClick={() => {
                        setReplyingTo(comment);
                        inputRef.current?.focus();
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Reply
                    </button>

                    {user?.uid === comment.userId && (
                      <button
                        onClick={() => handleDelete(comment.commentId)}
                        className="text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    )}

                    {onOpenReport && user?.uid !== comment.userId && (
                      <button
                        onClick={() => onOpenReport(comment.commentId)}
                        className="hover:text-red-400 transition-colors text-gray-500"
                        title="Report comment"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Like Button */}
                <button
                  onClick={() => handleLike(comment.commentId)}
                  className="flex flex-col items-center justify-center p-1 text-gray-400 hover:text-[#FF1744] transition-colors shrink-0"
                >
                  <Heart className={`w-3.5 h-3.5 ${comment.likesCount > 0 ? 'text-[#FF1744] fill-[#FF1744]' : ''}`} />
                  {comment.likesCount > 0 && (
                    <span className="text-[9px] mt-0.5 text-gray-400">{comment.likesCount}</span>
                  )}
                </button>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Replying Banner */}
        {replyingTo && (
          <div className="px-4 py-1.5 bg-[#1A1926] border-t border-white/5 flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-1.5 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-[#8B00FF]" />
              <span>Replying to <span className="text-[#D8B4FE]">@{replyingTo.username}</span></span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Emoji Quick Bar */}
        <div className="px-4 py-1 border-t border-white/5 flex items-center gap-3 overflow-x-auto no-scrollbar text-base">
          {['❤️', '🔥', '👏', '✨', '👑', '💯', '😂', '😍'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setCommentText(prev => prev + emoji)}
              className="hover:scale-125 active:scale-95 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendComment} className="p-3 border-t border-white/10 flex items-center gap-2">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.username}
              className="w-8 h-8 rounded-full border border-purple-500/30 shrink-0 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 shrink-0" />
          )}

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? (replyingTo ? `Reply to @${replyingTo.username}...` : 'Add comment...') : 'Sign in to comment...'}
              disabled={submitting}
              className="w-full bg-[#1A1926] border border-white/10 rounded-full py-2 pl-4 pr-10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white disabled:opacity-30 disabled:bg-gray-600 cursor-pointer transition-opacity"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
