import React, { useState, useEffect, useRef } from 'react';
import { VideoItem, AdCampaign } from '../../types';
import { VideoCard } from '../video/VideoCard';
import { SponsoredAdCard } from '../video/SponsoredAdCard';
import {
  getForYouVideos,
  getTrendingVideos,
  getFollowingVideos,
  getCategoryVideos,
  getNotInterestedIds,
  seedInitialVideosIfEmpty
} from '../../services/videoService';
import { getActiveAdCampaigns } from '../../services/monetizationService';
import { useAuth } from '../../context/AuthContext';
import { CategoryPanel, CATEGORIES_LIST } from './CategoryPanel';
import { StoriesBar, StoryItem } from '../stories/StoriesBar';
import { StoryViewerModal } from '../stories/StoryViewerModal';
import { LiveRoomModal } from '../live/LiveRoomModal';
import { RefreshCw, ChevronDown, Search, Sparkles, UserCheck, Flame, Crown, Radio, Zap } from 'lucide-react';

export type FeedItem =
  | { type: 'video'; data: VideoItem }
  | { type: 'ad'; data: AdCampaign };

interface VideoFeedProps {
  onOpenComments: (video: VideoItem) => void;
  onOpenShare: (video: VideoItem) => void;
  onOpenProfile: (userId: string) => void;
  onOpenReport: (videoId: string, userId: string) => void;
  onOpenSearch?: () => void;
  onOpenMonetization?: (tab?: 'earnings' | 'ads' | 'premium' | 'admin') => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onOpenReport,
  onOpenSearch,
  onOpenMonetization
}) => {
  const { user, profile, settings, updateSettings, openAuthModal } = useAuth();
  const isVerified =
    user?.email === 'nasirandco001@gmail.com' ||
    (user as any)?.isVerified === true ||
    (user as any)?.username === 'arao' ||
    profile?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
    profile?.isVerified === true ||
    profile?.username?.toLowerCase() === 'arao';

  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'following' | string>('foryou');
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [currentStories, setCurrentStories] = useState<any[] | null>(null);
  const [liveRoomOpen, setLiveRoomOpen] = useState(false);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [hiddenAdIds, setHiddenAdIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadFeed = async (categoryOrTab: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      await seedInitialVideosIfEmpty();
      const notInterested = await getNotInterestedIds(user?.uid);

      let feedVideos: VideoItem[] = [];

      if (categoryOrTab === 'foryou') {
        const res = await getForYouVideos(25, notInterested);
        feedVideos = res.videos;
      } else if (categoryOrTab === 'trending') {
        feedVideos = await getTrendingVideos(25, notInterested);
      } else if (categoryOrTab === 'following') {
        if (user) {
          feedVideos = await getFollowingVideos(user.uid, 25);
        } else {
          feedVideos = [];
        }
      } else {
        // Specific category (e.g. 'comedy', 'nollywood', 'music', 'fashion', etc.)
        feedVideos = await getCategoryVideos(categoryOrTab, 25, notInterested);
      }

      // Check if user is ARAO Premium VIP - if not, intersperse sponsored ad campaigns
      let combined: FeedItem[] = [];
      if (!profile?.isPremium) {
        const activeAds = await getActiveAdCampaigns(categoryOrTab);
        let adPointer = 0;

        feedVideos.forEach((v, index) => {
          combined.push({ type: 'video', data: v });
          // Intersperse 1 sponsored ad every 4-5 videos
          if (
            activeAds.length > 0 &&
            (index + 1) % 4 === 0 &&
            categoryOrTab !== 'following'
          ) {
            const adCandidate = activeAds[adPointer % activeAds.length];
            const adId = adCandidate.campaignId || adCandidate.id;
            if (!hiddenAdIds.includes(adId)) {
              combined.push({ type: 'ad', data: adCandidate });
              adPointer++;
            }
          }
        });
      } else {
        // Premium user: 100% ad-free stream
        combined = feedVideos.map(v => ({ type: 'video', data: v }));
      }

      setFeedItems(combined);
    } catch (err) {
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setActiveIndex(0);
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  };

  useEffect(() => {
    loadFeed(activeTab);
  }, [activeTab, user, profile?.isPremium]);

  const handleHideAd = (adId: string) => {
    setHiddenAdIds(prev => [...prev, adId]);
    setFeedItems(prev => prev.filter(item => {
      if (item.type === 'ad') {
        return (item.data.campaignId || item.data.id) !== adId;
      }
      return true;
    }));
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;

    const height = container.clientHeight;
    if (height === 0) return;

    const scrollPos = container.scrollTop;
    const index = Math.round(scrollPos / height);
    if (index !== activeIndex && index >= 0 && index < feedItems.length) {
      setActiveIndex(index);
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'following' && !user) {
      openAuthModal('login');
      return;
    }
    setActiveTab(tab);
  };

  const activeCategoryLabel = CATEGORIES_LIST.find(c => c.id === activeTab)?.label;

  return (
    <div className="relative w-full h-[100dvh] bg-[#080810] overflow-hidden select-none">
      {/* Top Header Floating Nav: ONLY 3 main categories + chevron button */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto">
        {/* Brand / Search & Live / Stories buttons on left */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenSearch}
            className="p-1.5 rounded-full text-gray-300 hover:text-white transition-colors"
            title="Search ARAO"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={() => setLiveRoomOpen(true)}
            className="flex items-center gap-1 py-1 px-2 rounded-full bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-[10px] font-bold text-red-400 tracking-wider transition-all cursor-pointer"
            title="Watch ARAO Live Stream"
          >
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span className="hidden sm:inline">LIVE</span>
          </button>

          <button
            onClick={() => setStoriesOpen(!storiesOpen)}
            className={`flex items-center gap-1 py-1 px-2 rounded-full border text-[10px] font-semibold transition-all cursor-pointer ${
              storiesOpen
                ? 'bg-[#8B00FF]/30 border-[#8B00FF] text-white shadow-[0_0_10px_rgba(139,0,255,0.4)]'
                : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
            }`}
            title="Toggle 24h Stories Tray"
          >
            <Zap className="w-2.5 h-2.5 text-purple-300" />
            <span className="hidden sm:inline">Stories</span>
          </button>
        </div>

        {/* 3 Main Header Tabs: For You | Trending | Following ▾ (Equal small size & weight, single horizontal row) */}
        <div className="flex items-center gap-2.5 sm:gap-4 whitespace-nowrap">
          {/* 1. For You */}
          <button
            onClick={() => handleTabChange('foryou')}
            className={`text-xs sm:text-sm font-semibold tracking-wide transition-colors pb-0.5 whitespace-nowrap inline-flex items-center ${
              activeTab === 'foryou'
                ? 'text-white border-b-2 border-[#8B00FF]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            For You
          </button>

          <span className="text-gray-700 text-xs select-none">|</span>

          {/* 2. Trending */}
          <button
            onClick={() => handleTabChange('trending')}
            className={`text-xs sm:text-sm font-semibold tracking-wide transition-colors pb-0.5 whitespace-nowrap inline-flex items-center ${
              activeTab === 'trending'
                ? 'text-white border-b-2 border-[#8B00FF]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Trending
          </button>

          <span className="text-gray-700 text-xs select-none">|</span>

          {/* 3. Following + Small downward chevron */}
          <div className="flex items-center whitespace-nowrap">
            <button
              onClick={() => handleTabChange('following')}
              className={`text-xs sm:text-sm font-semibold tracking-wide transition-colors pb-0.5 whitespace-nowrap inline-flex items-center ${
                activeTab === 'following'
                  ? 'text-white border-b-2 border-[#8B00FF]'
                : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Following
            </button>

            {/* Downward Chevron Button to open Expandable Category Panel */}
            <button
              onClick={() => setCategoryPanelOpen(true)}
              className="ml-0.5 p-1 text-gray-400 hover:text-[#8B00FF] transition-colors rounded-full"
              title="More Categories"
              aria-label="Expand category menu"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Action: Clean reload button (Crown moved to Profile page) */}
        <div className="flex items-center">
          <button
            onClick={() => loadFeed(activeTab, true)}
            disabled={refreshing}
            className="p-2 text-gray-300 hover:text-[#8B00FF] transition-colors rounded-full hover:bg-black/40"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#8B00FF]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 24-Hour Ephemeral Stories Tray */}
      {storiesOpen && (
        <div className="absolute top-14 inset-x-0 z-30 animate-fade-in shadow-2xl">
          <StoriesBar
            onSelectStory={(_story, idx, allStories) => {
              if (allStories) setCurrentStories(allStories);
              setActiveStoryIndex(idx);
            }}
            onOpenLive={() => setLiveRoomOpen(true)}
            onAddStory={() => {
              window.dispatchEvent(new CustomEvent('arao_open_camera_for_story'));
            }}
          />
        </div>
      )}

      {/* Selected Category Tag Banner (if user selected one from the expandable panel) */}
      {activeCategoryLabel && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-[#12121C]/90 backdrop-blur-md border border-purple-500/30 text-xs shadow-lg">
          <span className="text-[#A5A5B5]">Genre:</span>
          <span className="font-bold text-white text-[#D8B4FE]">{activeCategoryLabel}</span>
          <button
            onClick={() => handleTabChange('foryou')}
            className="text-[10px] text-gray-400 hover:text-white ml-1 underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#080810] gap-4 text-center p-6">
          <div className="w-14 h-14 rounded-full border-3 border-transparent border-t-[#8B00FF] border-r-[#7000FF] animate-spin" />
          <h3 className="font-display text-2xl font-black purple-gradient-text tracking-wider uppercase">
            ARAO
          </h3>
          <p className="text-xs text-[#A5A5B5] uppercase tracking-widest">
            Loading Next-Gen Stream...
          </p>
        </div>
      )}

      {/* Empty State for Following / Categories */}
      {!loading && feedItems.length === 0 && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#080810] text-center p-8 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1A1926] border border-purple-500/30 flex items-center justify-center text-[#8B00FF] shadow-[0_0_20px_rgba(139,0,255,0.2)]">
            {activeTab === 'following' ? <UserCheck className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
          </div>
          <h3 className="text-xl font-bold text-white">No videos yet</h3>
          <p className="text-sm text-[#A5A5B5] max-w-xs">
            {activeTab === 'following'
              ? 'Follow your favorite creators on ARAO to see their latest videos right here!'
              : `Be the first to upload a video in ${activeCategoryLabel || 'this category'}!`}
          </p>
          <button
            onClick={() => handleTabChange('foryou')}
            className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(139,0,255,0.4)]"
          >
            Explore For You Feed
          </button>
        </div>
      )}

      {/* Snap Scroll Feed (Regular Videos + Sponsored In-Feed Ads) */}
      {!loading && feedItems.length > 0 && (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="w-full h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
          {feedItems.map((item, idx) => (
            <div
              key={
                item.type === 'video'
                  ? (item.data.videoId || item.data.id)
                  : (item.data.campaignId || item.data.id || `ad_${idx}`)
              }
              ref={el => { videoRefs.current[idx] = el; }}
              className="w-full h-[100dvh] snap-start snap-always relative shrink-0"
            >
              {item.type === 'video' ? (
                <VideoCard
                  video={item.data}
                  isActive={activeIndex === idx}
                  onOpenComments={onOpenComments}
                  onOpenShare={onOpenShare}
                  onOpenProfile={onOpenProfile}
                  onOpenReport={onOpenReport}
                  soundEnabled={settings.soundOnByDefault}
                  onToggleSound={() => updateSettings({ soundOnByDefault: !settings.soundOnByDefault })}
                />
              ) : (
                <SponsoredAdCard
                  ad={item.data}
                  isActive={activeIndex === idx}
                  soundEnabled={settings.soundOnByDefault}
                  onToggleSound={() => updateSettings({ soundOnByDefault: !settings.soundOnByDefault })}
                  onHideAd={handleHideAd}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Expandable Category Panel */}
      <CategoryPanel
        isOpen={categoryPanelOpen}
        onClose={() => setCategoryPanelOpen(false)}
        selectedCategory={activeTab}
        onSelectCategory={(catId) => handleTabChange(catId)}
      />

      {/* 24h Story Viewer Modal */}
      {activeStoryIndex !== null && (
        <StoryViewerModal
          initialStoryIndex={activeStoryIndex}
          stories={currentStories || undefined}
          onClose={() => {
            setActiveStoryIndex(null);
            setCurrentStories(null);
          }}
          onOpenProfile={onOpenProfile}
        />
      )}

      {/* ARAO Live Stream Room Modal */}
      <LiveRoomModal
        isOpen={liveRoomOpen}
        onClose={() => setLiveRoomOpen(false)}
      />
    </div>
  );
};
