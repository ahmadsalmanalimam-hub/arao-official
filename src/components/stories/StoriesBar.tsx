import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getActiveStories } from '../../services/storyService';

export interface StoryItem {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  displayName: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  timestamp: string;
  isLive?: boolean;
}

export const SAMPLE_STORIES: StoryItem[] = [
  {
    id: 'story_live_1',
    userId: 'arao_live',
    username: 'dj_violet',
    displayName: 'Elena Thorne',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1080&q=80',
    mediaType: 'image',
    caption: 'LIVE in the studio mixing ultraviolet frequencies! Drop your tracks in chat 🎧',
    timestamp: 'LIVE NOW',
    isLive: true
  },
  {
    id: 'story_2',
    userId: 'chidi_director',
    username: 'chidi_director',
    displayName: 'Chidi Okafor',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1080&q=80',
    mediaType: 'image',
    caption: 'Lagos golden hour behind the camera lens 🎬 New cinema piece dropping Friday!',
    timestamp: '2h ago'
  },
  {
    id: 'story_3',
    userId: 'cyberpulse',
    username: 'cyberpulse',
    displayName: 'Marcus Vance',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1080&q=80',
    mediaType: 'image',
    caption: 'Midnight Tokyo neon street drift ⚡ Never sleep on the future',
    timestamp: '4h ago'
  },
  {
    id: 'story_4',
    userId: 'arao_official',
    username: 'arao',
    displayName: 'ARAO Official',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1080&q=80',
    mediaType: 'image',
    caption: 'Welcome to the Next-Gen ARAO Experience. Fast, vibrant, electric violet 💜',
    timestamp: '7h ago'
  },
  {
    id: 'story_5',
    userId: 'fashion_queen',
    username: 'amara_style',
    displayName: 'Amara K',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
    mediaUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1080&q=80',
    mediaType: 'image',
    caption: 'Lagos Fashion Week runway fitting ✨ Which look should I wear tomorrow?',
    timestamp: '11h ago'
  }
];

interface StoriesBarProps {
  onSelectStory: (story: StoryItem, index: number, allStories?: StoryItem[]) => void;
  onOpenLive?: () => void;
  onAddStory?: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  onSelectStory,
  onOpenLive,
  onAddStory
}) => {
  const { user, profile, openAuthModal } = useAuth();
  const [allStories, setAllStories] = useState<StoryItem[]>(SAMPLE_STORIES);
  const [hasMyStory, setHasMyStory] = useState(false);
  const [isMyLive, setIsMyLive] = useState(false);

  const refreshStories = async () => {
    try {
      const active = await getActiveStories();
      if (active.length > 0) {
        // Merge active stories with sample stories, placing active stories first
        const sampleFiltered = SAMPLE_STORIES.filter(s => !active.some(a => a.userId === s.userId));
        setAllStories([...active, ...sampleFiltered]);
      } else {
        setAllStories(SAMPLE_STORIES);
      }

      // Check if user has active story
      if (user?.uid) {
        const local = JSON.parse(localStorage.getItem('arao_user_stories') || '[]');
        const userHasValid = local.some((s: any) => s.user_id === user.uid && new Date(s.expires_at) > new Date());
        setHasMyStory(userHasValid);
      }

      // Check if user is live
      const currentLive = localStorage.getItem('arao_current_live');
      setIsMyLive(!!currentLive);
    } catch (err) {
      console.warn('StoriesBar refresh err:', err);
    }
  };

  useEffect(() => {
    refreshStories();

    const handleStoryAdded = () => refreshStories();
    const handleLiveChanged = (e: any) => {
      setIsMyLive(!!e.detail?.isLive);
      refreshStories();
    };

    window.addEventListener('arao_story_added', handleStoryAdded);
    window.addEventListener('arao_live_status_changed', handleLiveChanged);

    return () => {
      window.removeEventListener('arao_story_added', handleStoryAdded);
      window.removeEventListener('arao_live_status_changed', handleLiveChanged);
    };
  }, [user]);

  const handleMyStoryClick = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (isMyLive && onOpenLive) {
      onOpenLive();
      return;
    }

    if (hasMyStory) {
      // Find my story in allStories
      const myStoryIdx = allStories.findIndex(s => s.userId === user.uid);
      if (myStoryIdx !== -1) {
        onSelectStory(allStories[myStoryIdx], myStoryIdx, allStories);
        return;
      }
    }

    if (onAddStory) onAddStory();
  };

  return (
    <div className="w-full px-3 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar select-none bg-black/40 backdrop-blur-md border-b border-white/5">
      {/* 1. Add Story / My Story Bubble with Active Glow Ring */}
      <div className="flex flex-col items-center shrink-0 cursor-pointer group" onClick={handleMyStoryClick}>
        <div
          className={`relative w-14 h-14 rounded-full p-[2.5px] transition-all duration-300 group-hover:scale-105 ${
            isMyLive
              ? 'bg-gradient-to-tr from-[#FF1744] via-rose-500 to-[#8B00FF] animate-pulse shadow-[0_0_18px_rgba(255,23,68,0.7)]'
              : hasMyStory
              ? 'bg-gradient-to-tr from-[#7000FF] via-[#8B00FF] to-[#FF1744] shadow-[0_0_15px_rgba(139,0,255,0.6)] ring-2 ring-purple-500/50'
              : 'bg-gradient-to-tr from-zinc-700 to-zinc-900'
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-[#080810] p-[2px] flex items-center justify-center">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="My story" className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-full h-full bg-[#171626] rounded-full flex items-center justify-center text-purple-300 font-bold text-sm">
                You
              </div>
            )}
          </div>

          {/* Plus icon if no active story, or Live indicator if live */}
          {isMyLive ? (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#FF1744] text-white text-[8px] font-black px-1.5 py-0.2 rounded-full border border-black uppercase tracking-wider flex items-center gap-0.5 shadow-md">
              <Radio className="w-2 h-2 animate-ping" />
              <span>LIVE</span>
            </span>
          ) : (
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#080810] flex items-center justify-center text-white shadow-md ${
              hasMyStory ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-[#7000FF] to-[#8B00FF]'
            }`}>
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-300 mt-1 truncate max-w-[62px] font-medium">
          {isMyLive ? 'Live Now' : hasMyStory ? 'Your Story' : 'Add Story'}
        </span>
      </div>

      {/* 2. Stories List with 24h Glowing Gradient Rings */}
      {allStories.map((story, idx) => {
        // Skip user's own story in list since it's already shown in "Your Story" bubble
        if (user && story.userId === user.uid) return null;

        return (
          <div
            key={story.id}
            className="flex flex-col items-center shrink-0 cursor-pointer group"
            onClick={() => {
              if (story.isLive && onOpenLive) {
                onOpenLive();
              } else {
                onSelectStory(story, idx, allStories);
              }
            }}
          >
            <div
              className={`relative w-14 h-14 rounded-full p-[2.5px] transition-transform duration-200 group-hover:scale-105 ${
                story.isLive
                  ? 'bg-gradient-to-tr from-[#FF1744] via-rose-500 to-[#8B00FF] animate-pulse shadow-[0_0_15px_rgba(255,23,68,0.5)]'
                  : 'bg-gradient-to-tr from-[#7000FF] via-[#8B00FF] to-[#FF1744] shadow-[0_0_12px_rgba(139,0,255,0.4)]'
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-[#080810] p-[2px]">
                <img
                  src={story.userAvatar}
                  alt={story.username}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              {story.isLive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#FF1744] text-white text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-black uppercase tracking-wider flex items-center gap-0.5">
                  <Radio className="w-2 h-2 animate-ping" />
                  <span>Live</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-300 mt-1 truncate max-w-[62px] group-hover:text-white">
              @{story.username}
            </span>
          </div>
        );
      })}
    </div>
  );
};

