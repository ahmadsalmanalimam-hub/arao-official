import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  TrendingUp,
  Sparkles,
  User,
  Play,
  Clock,
  Trophy,
  Flame,
  Crown,
  Heart,
  Share2,
  Music,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { VideoItem, UserProfile } from '../../types';
import { searchUsers, getSuggestedUsers, getDefaultHumanAvatar } from '../../services/userService';
import { getForYouVideos } from '../../services/videoService';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES_LIST } from '../feed/CategoryPanel';

interface ExplorePageProps {
  onSelectVideo: (video: VideoItem) => void;
  onOpenProfile: (userId: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  onSelectVideo,
  onOpenProfile,
  onSelectCategory
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'explore' | 'leaderboard' | 'moments'>('explore');
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [popularVideos, setPopularVideos] = useState<VideoItem[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arao_search_history');
      return saved ? JSON.parse(saved) : ['#viral', '#nollywood', '#fashion', '#music'];
    } catch {
      return ['#viral', '#music'];
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExploreData();
  }, [user]);

  const loadExploreData = async () => {
    setLoading(true);
    try {
      const { videos } = await getForYouVideos(30);
      setPopularVideos(videos);

      const creators = await getSuggestedUsers(user?.uid, 12);
      setSuggestedUsers(creators);
    } catch (err) {
      console.error('Explore load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = async (text: string) => {
    setSearchTerm(text);
    if (!text.trim()) {
      setUserResults([]);
      return;
    }

    try {
      const users = await searchUsers(text, 8);
      setUserResults(users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectHistory = (term: string) => {
    setSearchTerm(term);
    handleSearchChange(term);
  };

  const saveToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const updated = [clean, ...searchHistory.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    setSearchHistory(updated);
    try {
      localStorage.setItem('arao_search_history', JSON.stringify(updated));
    } catch {}
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('arao_search_history');
    } catch {}
  };

  const filteredVideos = popularVideos.filter((v) => {
    if (selectedTag) {
      const tagMatch =
        v.hashtags?.some((h) => h.toLowerCase() === selectedTag.toLowerCase().replace('#', '')) ||
        v.caption?.toLowerCase().includes(selectedTag.toLowerCase()) ||
        v.category?.toLowerCase() === selectedTag.toLowerCase();
      if (!tagMatch) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const match =
        v.caption?.toLowerCase().includes(term) ||
        v.hashtags?.some((h) => h.toLowerCase().includes(term.replace('#', ''))) ||
        v.category?.toLowerCase().includes(term) ||
        v.username?.toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  // Top Leaderboard data
  const trendingRankings = [
    { rank: 1, medal: '🥇', username: 'arao', name: 'ARAO Official', fans: '4.2M', growth: '+124k', category: 'Official' },
    { rank: 2, medal: '🥈', username: 'dj_violet', name: 'Elena Thorne', fans: '2.8M', growth: '+89k', category: 'Music' },
    { rank: 3, medal: '🥉', username: 'chidi_director', name: 'Chidi Okafor', fans: '1.9M', growth: '+56k', category: 'Nollywood' },
    { rank: 4, medal: '4', username: 'cyberpulse', name: 'Marcus Vance', fans: '1.4M', growth: '+42k', category: 'Tech' },
    { rank: 5, medal: '5', username: 'amara_style', name: 'Amara K', fans: '980k', growth: '+31k', category: 'Fashion' }
  ];

  const viralHashtags = [
    { tag: '#ARAO', posts: '1.4M posts', trend: '+45%' },
    { tag: '#AmapianoVibes', posts: '920K posts', trend: '+88%' },
    { tag: '#NollywoodCinema', posts: '780K posts', trend: '+34%' },
    { tag: '#AfrobeatChallenge', posts: '650K posts', trend: '+62%' },
    { tag: '#LagosStreetStyle', posts: '430K posts', trend: '+29%' }
  ];

  return (
    <div className="w-full min-h-screen bg-[#080810] text-white pb-24 pt-4 px-4 max-w-lg mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-2xl font-black tracking-wider purple-gradient-text uppercase">
          ARAO Hub
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-[#D8B4FE] bg-[#1A1926] border border-purple-500/30 px-3 py-1 rounded-full shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#8B00FF]" />
          <span>Global Discovery</span>
        </div>
      </div>

      {/* Segmented Top Navigation: Explore | Trending Leaderboard | Moments */}
      <div className="flex rounded-2xl bg-[#12121C] border border-purple-500/20 p-1 mb-4">
        {[
          { id: 'explore', label: 'Explore', icon: <Search className="w-3.5 h-3.5" /> },
          { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-3.5 h-3.5 text-amber-400" /> },
          { id: 'moments', label: 'Moments', icon: <Zap className="w-3.5 h-3.5 text-[#8B00FF]" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#8B00FF] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: EXPLORE */}
      {activeTab === 'explore' && (
        <div className="space-y-4 animate-fade-in">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveToHistory(searchTerm);
              }}
              placeholder="Search creators, hashtags, or genres..."
              className="w-full bg-[#12121C] border border-purple-500/25 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] focus:ring-1 focus:ring-[#8B00FF]/50 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setUserResults([]);
                }}
                className="absolute right-3.5 top-3 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Quick Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={`py-1.5 px-3 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                !selectedTag
                  ? 'bg-[#8B00FF] text-white shadow-md'
                  : 'bg-[#12121C] text-[#A5A5B5] border border-white/5 hover:text-white'
              }`}
            >
              All Genres
            </button>
            {CATEGORIES_LIST.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedTag(selectedTag === cat.id ? null : cat.id)}
                className={`py-1.5 px-3 rounded-full text-xs font-medium shrink-0 transition-colors ${
                  selectedTag === cat.id
                    ? 'bg-[#8B00FF] text-white shadow-md'
                    : 'bg-[#12121C] text-[#A5A5B5] border border-white/5 hover:text-white hover:border-purple-500/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search History Chips */}
          {!searchTerm && searchHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-[#A5A5B5] mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  Recent Searches
                </span>
                <button onClick={clearHistory} className="text-[11px] text-[#D8B4FE] hover:underline cursor-pointer">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSelectHistory(item)}
                    className="py-1 px-3 rounded-full bg-[#12121C] border border-purple-500/20 text-xs text-gray-300 hover:text-white hover:border-[#8B00FF] transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Featured Creators Carousel */}
          {!searchTerm && suggestedUsers.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B5] mb-2.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#8B00FF]" />
                Featured Creators
              </h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {suggestedUsers.map((creator) => (
                  <div
                    key={creator.uid}
                    className="shrink-0 w-28 bg-[#12121C] border border-purple-500/20 rounded-2xl p-3 flex flex-col items-center text-center group hover:border-[#8B00FF]/50 transition-colors shadow-sm"
                  >
                    <div
                      onClick={() => onOpenProfile(creator.uid)}
                      className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#8B00FF] mb-2 cursor-pointer group-hover:scale-105 transition-transform bg-[#1A1926]"
                    >
                      <img
                        src={creator.avatar || getDefaultHumanAvatar(creator.displayName || creator.username)}
                        alt={creator.username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-semibold text-white truncate max-w-full">
                      @{creator.username}
                    </span>
                    <span className="text-[10px] text-[#A5A5B5] mt-0.5">
                      {creator.followersCount || 0} fans
                    </span>
                    <button
                      onClick={() => onOpenProfile(creator.uid)}
                      className="mt-2 w-full py-1 text-[10px] font-bold rounded-lg bg-[#8B00FF]/15 border border-[#8B00FF]/40 text-[#D8B4FE] hover:bg-[#8B00FF] hover:text-white transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Creator Search Results if typed */}
          {searchTerm && userResults.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B5] mb-3">
                Creators ({userResults.length})
              </h2>
              <div className="space-y-2">
                {userResults.map((u) => (
                  <div
                    key={u.uid}
                    onClick={() => onOpenProfile(u.uid)}
                    className="p-3 bg-[#12121C] border border-purple-500/20 rounded-2xl flex items-center justify-between hover:border-[#8B00FF]/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar || getDefaultHumanAvatar(u.displayName || u.username)}
                        alt={u.username}
                        className="w-10 h-10 rounded-full border border-purple-500/30 object-cover"
                      />
                      <div>
                        <h3 className="text-xs font-bold text-white flex items-center gap-1">
                          {u.displayName}
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8B00FF]" />
                        </h3>
                        <p className="text-[11px] text-[#A5A5B5]">@{u.username}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8B00FF] font-medium">View Profile</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Discovery Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B5] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#8B00FF]" />
                {searchTerm || selectedTag ? 'Matching Videos' : 'Trending Now'}
              </span>
              <span className="text-[11px] text-gray-500 font-normal">
                {filteredVideos.length} videos
              </span>
            </h2>

            {filteredVideos.length === 0 ? (
              <div className="py-12 text-center text-[#A5A5B5] text-xs">
                No videos matching "{searchTerm || selectedTag}". Try another query!
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredVideos.map((video) => (
                  <div
                    key={video.videoId || video.id}
                    onClick={() => onSelectVideo(video)}
                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-[#12121C] border border-purple-500/15 group cursor-pointer hover:border-[#8B00FF]/50 transition-colors"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-white">
                        <Play className="w-2.5 h-2.5 fill-white" />
                        <span>{video.viewsCount > 999 ? `${(video.viewsCount / 1000).toFixed(1)}k` : video.viewsCount || 0}</span>
                      </div>
                      <p className="text-[9px] text-gray-300 truncate mt-0.5">
                        @{video.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TRENDING LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-5 animate-fade-in">
          {/* Top Creators Leaderboard */}
          <div className="p-4 rounded-2xl bg-[#12121C] border border-purple-500/30">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D8B4FE] flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Top Weekly Creators</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE METRICS
              </span>
            </div>

            <div className="space-y-2.5">
              {trendingRankings.map((c) => (
                <div
                  key={c.username}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#171626] border border-white/5 hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm w-5 text-center">{c.medal}</span>
                    <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500/30 flex items-center justify-center font-bold text-xs text-white">
                      {c.name.slice(0, 1)}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">@{c.username}</span>
                      <span className="text-[10px] text-gray-400">{c.category} • {c.fans} fans</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 block">{c.growth}</span>
                    <span className="text-[9px] text-gray-400">Weekly Gain</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Viral Hashtags */}
          <div className="p-4 rounded-2xl bg-[#12121C] border border-purple-500/30">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D8B4FE] flex items-center gap-1.5 mb-3">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Trending Viral Challenges &amp; Tags</span>
            </span>

            <div className="space-y-2">
              {viralHashtags.map((h, i) => (
                <div
                  key={h.tag}
                  onClick={() => {
                    setSelectedTag(h.tag);
                    setActiveTab('explore');
                  }}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#171626] border border-white/5 hover:border-purple-500/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-purple-400">#{i + 1}</span>
                    <div>
                      <span className="text-xs font-bold text-white block">{h.tag}</span>
                      <span className="text-[10px] text-gray-400">{h.posts}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {h.trend}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ARAO MOMENTS (Signature feature) */}
      {activeTab === 'moments' && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3.5 bg-gradient-to-r from-purple-950/60 via-purple-900/40 to-black rounded-2xl border border-purple-500/30 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>ARAO Moments</span>
              </h3>
              <p className="text-[10px] text-gray-300 mt-0.5">Instant ambient snapshots with real sound vibes</p>
            </div>
            <span className="text-[9px] font-mono font-bold bg-[#8B00FF] px-2 py-0.5 rounded-full text-white">
              NEW
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'm1',
                title: 'Midnight Lagos Neon Skyline',
                creator: 'chidi_director',
                time: '2h ago',
                img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
                likes: '1.2k',
                sound: 'Calm Down - Rema'
              },
              {
                id: 'm2',
                title: 'Backstage Afro-Fusion Jam',
                creator: 'dj_violet',
                time: '4h ago',
                img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
                likes: '2.4k',
                sound: 'Last Last - Burna Boy'
              },
              {
                id: 'm3',
                title: 'Runway Golden Hour Fitting',
                creator: 'amara_style',
                time: '6h ago',
                img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
                likes: '3.1k',
                sound: 'Rush - Ayra Starr'
              }
            ].map((moment) => (
              <div
                key={moment.id}
                className="relative rounded-2xl overflow-hidden border border-purple-500/30 bg-[#12121C] shadow-lg group"
              >
                <div className="h-44 w-full overflow-hidden">
                  <img
                    src={moment.img}
                    alt={moment.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 bg-gradient-to-t from-black via-black/90 to-transparent">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{moment.title}</span>
                    <span className="text-[10px] text-purple-300 font-mono">{moment.time}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-300">
                    <span className="text-purple-400 font-medium">@{moment.creator}</span>
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Music className="w-3 h-3 text-purple-300" />
                      <span>{moment.sound}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
