import React, { useState, useEffect } from 'react';
import { Search, X, TrendingUp, Sparkles, User, Play, Clock } from 'lucide-react';
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

      const creators = await getSuggestedUsers(user?.uid, 8);
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
    const updated = [clean, ...searchHistory.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
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

  const filteredVideos = popularVideos.filter(v => {
    if (selectedTag) {
      const tagMatch = v.hashtags?.some(h => h.toLowerCase() === selectedTag.toLowerCase().replace('#', '')) ||
        v.caption?.toLowerCase().includes(selectedTag.toLowerCase());
      if (!tagMatch) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const match = v.caption?.toLowerCase().includes(term) ||
        v.hashtags?.some(h => h.toLowerCase().includes(term.replace('#', ''))) ||
        v.category?.toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#080810] text-white pb-24 pt-4 px-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-black tracking-wider purple-gradient-text uppercase">
          Explore
        </h1>
        <div className="flex items-center gap-1.5 text-xs text-[#D8B4FE] bg-[#1A1926] border border-purple-500/30 px-3 py-1 rounded-full shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#8B00FF]" />
          <span>Global Discovery</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
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
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
        <button
          onClick={() => setSelectedTag(null)}
          className={`py-1.5 px-3 rounded-full text-xs font-semibold shrink-0 transition-colors ${
            !selectedTag ? 'bg-[#8B00FF] text-white shadow-md' : 'bg-[#12121C] text-[#A5A5B5] border border-white/5 hover:text-white'
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

      {/* Search History Chips if not searching */}
      {!searchTerm && searchHistory.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-[#A5A5B5] mb-2.5">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              Recent Searches
            </span>
            <button
              onClick={clearHistory}
              className="text-[11px] text-[#D8B4FE] hover:underline"
            >
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

      {/* Featured Human Creators Carousel */}
      {!searchTerm && suggestedUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#A5A5B5] mb-3 flex items-center gap-1.5">
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
                  className="mt-2 w-full py-1 text-[10px] font-bold rounded-lg bg-[#8B00FF]/15 border border-[#8B00FF]/40 text-[#D8B4FE] hover:bg-[#8B00FF] hover:text-white transition-colors"
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
        <div className="mb-6">
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
                      <span className="w-3.5 h-3.5 rounded-full bg-[#8B00FF] text-white text-[8px] font-bold inline-flex items-center justify-center">✓</span>
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
  );
};
