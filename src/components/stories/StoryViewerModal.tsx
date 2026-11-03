import React, { useState, useEffect } from 'react';
import { X, Heart, Send, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { StoryItem, SAMPLE_STORIES } from './StoriesBar';
import { useAuth } from '../../context/AuthContext';

interface StoryViewerModalProps {
  initialStoryIndex: number;
  stories?: StoryItem[];
  onClose: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  initialStoryIndex,
  stories,
  onClose,
  onOpenProfile
}) => {
  const { user } = useAuth();
  const storyList = stories && stories.length > 0 ? stories : SAMPLE_STORIES;
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [reactionToast, setReactionToast] = useState<string | null>(null);

  const currentStory = storyList[currentIndex] || storyList[0];

  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  useEffect(() => {
    if (isPaused) return;

    if (progress >= 100) {
      if (currentIndex < storyList.length - 1) {
        setCurrentIndex((c) => c + 1);
        setProgress(0);
      } else {
        onClose();
      }
      return;
    }

    const timer = setTimeout(() => {
      setProgress((prev) => Math.min(100, prev + 2));
    }, 100);

    return () => clearTimeout(timer);
  }, [currentIndex, isPaused, progress, onClose]);

  const handleNext = () => {
    if (currentIndex < SAMPLE_STORIES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSendReaction = (emoji: string) => {
    setReactionToast(`Sent ${emoji} to @${currentStory.username}!`);
    setTimeout(() => setReactionToast(null), 2000);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReactionToast(`Message sent to @${currentStory.username}! 💬`);
    setReplyText('');
    setTimeout(() => setReactionToast(null), 2500);
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in select-none">
      <div className="relative w-full max-w-md h-full max-h-[100dvh] flex flex-col justify-between overflow-hidden bg-[#0A0912]">
        {/* Top Story Header & Segmented Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 pt-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Segmented Progress Bars */}
          <div className="flex gap-1.5 mb-3">
            {SAMPLE_STORIES.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-75"
                  style={{
                    width:
                      idx === currentIndex
                        ? `${progress}%`
                        : idx < currentIndex
                        ? '100%'
                        : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Creator Profile Info */}
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => {
                if (onOpenProfile) onOpenProfile(currentStory.userId);
                onClose();
              }}
            >
              <img
                src={currentStory.userAvatar}
                alt={currentStory.username}
                className="w-9 h-9 rounded-full object-cover border border-purple-500/50"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">@{currentStory.username}</span>
                  <span className="text-[10px] text-purple-300 font-mono">• {currentStory.timestamp}</span>
                </div>
                <span className="text-[10px] text-gray-300 block">24h Ephemeral Story</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-1.5 rounded-full text-white/80 hover:text-white bg-black/40"
              >
                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-white/80 hover:text-white bg-black/40 hover:bg-black/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Background Media */}
        <div
          className="relative flex-1 w-full h-full flex items-center justify-center cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
        >
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption}
            className="w-full h-full object-cover"
          />

          {/* Left / Right touch navigation zones */}
          <div
            className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />
          <div
            className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-20"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />

          {/* Caption Overlay */}
          {currentStory.caption && (
            <div className="absolute bottom-24 inset-x-4 z-20 p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs leading-relaxed shadow-lg">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Reaction Toast */}
        {reactionToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 py-1.5 px-3 rounded-full bg-purple-900/90 border border-purple-400 text-xs font-semibold text-white shadow-2xl animate-fade-in">
            {reactionToast}
          </div>
        )}

        {/* Bottom Interactive Bar: Quick Emoji Reactions & Direct Reply */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-3 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2">
          {/* Quick Reaction Emojis */}
          <div className="flex items-center justify-around px-2">
            {['🔥', '❤️', '👏', '⚡', '😂', '👑'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="text-xl hover:scale-125 active:scale-95 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message Reply Input */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2 mt-1">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Send message to @${currentStory.username}...`}
              className="flex-1 bg-white/15 border border-white/20 rounded-full px-4 py-2 text-xs text-white placeholder-gray-300 focus:outline-none focus:border-[#8B00FF]"
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="p-2 rounded-full bg-[#8B00FF] text-white disabled:opacity-40 hover:bg-[#7000FF] cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
