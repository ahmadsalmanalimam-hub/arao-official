import React, { useState } from 'react';
import {
  X,
  Wallet,
  Activity,
  Download,
  QrCode,
  Sliders,
  Settings,
  Shield,
  CreditCard,
  History,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Copy,
  Check,
  TrendingUp,
  BarChart3,
  Users,
  Eye,
  ArrowRight,
  ExternalLink,
  Crown
} from 'lucide-react';
import { UserProfile, VideoItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface ProfileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onOpenSettings: () => void;
  onOpenStore?: () => void;
  onOpenMonetization?: (tab?: 'earnings' | 'ads' | 'premium' | 'admin') => void;
  onSelectVideo?: (video: VideoItem) => void;
}

export const ProfileMenuDrawer: React.FC<ProfileMenuDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  onOpenSettings,
  onOpenStore,
  onOpenMonetization,
  onSelectVideo
}) => {
  const { user } = useAuth();
  const [activeSubView, setActiveSubView] = useState<
    'main' | 'wallet' | 'activity' | 'offline' | 'qrcode' | 'studio'
  >('main');

  const [copiedLink, setCopiedLink] = useState(false);
  const [offlinePlayingVideo, setOfflinePlayingVideo] = useState<VideoItem | null>(null);

  // Mock cached offline videos from localStorage
  const [offlineVideos] = useState<VideoItem[]>(() => {
    try {
      const stored = localStorage.getItem('arao_offline_downloads');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'off_1',
        videoId: 'off_1',
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/sp_auto/dog.mp4',
        cloudinaryPublicId: 'dog',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
        userId: 'arao',
        username: 'arao',
        caption: 'ARAO Offline Mode: Enjoy high-energy African beats on 2GB RAM phones without mobile data! ⚡ #Offline #ARAO',
        hashtags: ['offline', 'arao'],
        likesCount: 14200,
        commentsCount: 630,
        viewsCount: 95000,
        visibility: 'public',
        createdAt: new Date().toISOString()
      }
    ];
  });

  if (!isOpen) return null;

  const profileUrl = `${window.location.origin}?profile=${profile.username}`;

  const handleCopyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="flex-1" onClick={onClose} />

      <div className="relative w-full max-w-sm h-full bg-[#0F0E17] border-l border-purple-500/25 flex flex-col text-white shadow-[-10px_0_50px_rgba(138,43,226,0.3)] animate-slide-left overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#151422]">
          <div className="flex items-center gap-2">
            {activeSubView !== 'main' ? (
              <button
                onClick={() => setActiveSubView('main')}
                className="text-xs text-purple-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                ← Back
              </button>
            ) : (
              <h3 className="font-display font-black text-sm tracking-wide text-white flex items-center gap-2">
                <span>ARAO Menu</span>
                <span className="text-[10px] font-mono text-[#D8B4FE] bg-purple-950 px-2 py-0.5 rounded-full border border-purple-500/30">
                  @{profile.username}
                </span>
              </h3>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-view: Main Menu */}
        {activeSubView === 'main' && (
          <div className="p-4 space-y-4">
            {/* Quick Profile Summary Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-[#181728] to-purple-900/50 border border-purple-500/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#7000FF] to-[#FF1744]">
                  <img
                    src={profile.avatar}
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover bg-black"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">
                      {profile.displayName}
                    </span>
                    <VerifiedBadge badgeType={profile.badgeType} size="xs" />
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">@{profile.username}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveSubView('qrcode')}
                className="p-2 rounded-xl bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/30 text-purple-300 transition-colors cursor-pointer"
                title="My Profile QR Code"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="space-y-1.5">
              {/* 1. Wallet */}
              <button
                onClick={() => setActiveSubView('wallet')}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      Wallet & Coins
                    </span>
                    <span className="text-[10px] text-gray-400">Balance, Coins & Creator Earnings</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* 2. Activity Centre */}
              <button
                onClick={() => setActiveSubView('activity')}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      Activity Centre
                    </span>
                    <span className="text-[10px] text-gray-400">Watch history, likes & interactions</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* 3. Offline Videos */}
              <button
                onClick={() => setActiveSubView('offline')}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      Offline Videos
                    </span>
                    <span className="text-[10px] text-gray-400">Watch without mobile internet data</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  {offlineVideos.length} saved
                </span>
              </button>

              {/* 4. QR Code */}
              <button
                onClick={() => setActiveSubView('qrcode')}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      My QR Code
                    </span>
                    <span className="text-[10px] text-gray-400">Share your profile instantly</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>

              {/* 5. ARAO Studio Entry */}
              <button
                onClick={() => setActiveSubView('studio')}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      ARAO Studio
                    </span>
                    <span className="text-[10px] text-gray-400">Creator analytics & reach metrics</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/30 font-bold">
                  PRO
                </span>
              </button>

              {/* 6. Settings and Privacy */}
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full p-3 rounded-2xl bg-[#171626]/70 hover:bg-purple-950/40 border border-purple-500/15 flex items-center justify-between text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-500/10 border border-gray-500/30 text-gray-300 flex items-center justify-center">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block group-hover:text-purple-300 transition-colors">
                      Settings and Privacy
                    </span>
                    <span className="text-[10px] text-gray-400">Account, security & notifications</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* ARAO Store Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950 via-[#7000FF]/40 to-indigo-950 border border-purple-500/40 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white">ARAO Engagement Store</span>
              </div>
              <p className="text-[11px] text-purple-200 mb-2.5">
                Boost your account, promote videos with real Nigerian & global viewers.
              </p>
              <button
                onClick={() => {
                  onClose();
                  if (onOpenStore) onOpenStore();
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-md transition-all cursor-pointer text-center block"
              >
                Visit Store (/store)
              </button>
            </div>
          </div>
        )}

        {/* Sub-view: Wallet */}
        {activeSubView === 'wallet' && (
          <div className="p-4 space-y-4">
            <h4 className="text-sm font-bold text-white">ARAO Wallet</h4>

            {/* Coins Balance Card */}
            <div className="p-4 rounded-2xl bg-[#171626] border border-purple-500/30 text-center">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">Coins Balance</span>
              <div className="text-2xl font-black text-amber-400 mt-1 flex items-center justify-center gap-1.5">
                <span>🪙 500 Coins</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Approx. ₦2,500 value</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenMonetization?.('ads');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-bold text-xs shadow-md"
                >
                  Buy Coins
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenMonetization?.('earnings');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
                >
                  Withdraw
                </button>
              </div>
            </div>

            {/* Creator Earnings Breakdown */}
            <div className="p-4 rounded-2xl bg-[#171626] border border-white/5 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Creator Earnings:</span>
                <span className="font-bold text-emerald-400">$0.00 / ₦0</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Monetization Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-yellow-950 text-yellow-300 border border-yellow-500/30 text-[10px] font-semibold">
                  {profile.creatorMonetizationApproved ? 'Approved' : 'In Review'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Eligible Views:</span>
                <span className="font-mono text-white">0 / 10,000</span>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Activity Centre */}
        {activeSubView === 'activity' && (
          <div className="p-4 space-y-4">
            <h4 className="text-sm font-bold text-white">Activity Centre</h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#171626] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span>Liked Posts</span>
                </div>
                <span className="font-mono text-gray-400">{profile.totalLikesCount || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#171626] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Watched Videos</span>
                </div>
                <span className="font-mono text-gray-400">Recently active</span>
              </div>
              <div className="p-3 rounded-xl bg-[#171626] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span>Comments Posted</span>
                </div>
                <span className="font-mono text-gray-400">Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Sub-view: Offline Videos */}
        {activeSubView === 'offline' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Offline Videos</h4>
              <span className="text-[10px] text-cyan-300 font-mono">2GB RAM Optimized</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Videos saved to device storage can be played instantly anytime without using mobile internet data.
            </p>

            <div className="space-y-2">
              {offlineVideos.map((vid) => (
                <div
                  key={vid.videoId}
                  onClick={() => setOfflinePlayingVideo(vid)}
                  className="p-2.5 rounded-xl bg-[#171626] hover:bg-purple-950/40 border border-purple-500/20 flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden bg-black shrink-0">
                    <img src={vid.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-white truncate block">@{vid.username}</span>
                    <p className="text-[11px] text-gray-400 line-clamp-1">{vid.caption}</p>
                    <span className="text-[9px] text-cyan-400 font-mono mt-0.5 block">Saved offline (HD)</span>
                  </div>
                </div>
              ))}
            </div>

            {offlinePlayingVideo && (
              <div className="mt-4 p-3 rounded-2xl bg-black border border-purple-500/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#D8B4FE]">Now Playing Offline</span>
                  <button
                    onClick={() => setOfflinePlayingVideo(null)}
                    className="text-[11px] text-gray-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <video
                  src={offlinePlayingVideo.videoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full rounded-xl bg-black max-h-48"
                />
              </div>
            )}
          </div>
        )}

        {/* Sub-view: QR Code */}
        {activeSubView === 'qrcode' && (
          <div className="p-4 flex flex-col items-center text-center space-y-4">
            <h4 className="text-sm font-bold text-white">Profile QR Code</h4>
            <p className="text-xs text-gray-400">Scan with any phone camera to visit your profile</p>

            <div className="p-5 rounded-3xl bg-white text-black shadow-2xl flex flex-col items-center max-w-[220px]">
              {/* Profile Avatar inside QR badge */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-600 mb-3 shadow-md">
                <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
              </div>
              <div className="w-36 h-36 bg-[#0F0E17] p-2 rounded-2xl flex items-center justify-center text-white font-mono text-center">
                <div className="grid grid-cols-5 gap-1.5 w-full h-full p-2 bg-white rounded-xl">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-xs ${
                        (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 4 || i === 20 || i === 24
                          ? 'bg-purple-900'
                          : 'bg-black'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs font-black text-black mt-3">@{profile.username}</span>
              <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">ARAO Social</span>
            </div>

            <div className="w-full space-y-2">
              <button
                onClick={handleCopyProfileLink}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Profile Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-view: ARAO Studio */}
        {activeSubView === 'studio' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">ARAO Creator Studio</h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-500/30 font-bold">
                Analytics
              </span>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-xl bg-[#171626] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Total Video Views</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  {profile.videoCount ? `${profile.videoCount * 280}` : '0'}
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold">+18.4% this week</span>
              </div>
              <div className="p-3 rounded-xl bg-[#171626] border border-white/5">
                <span className="text-[10px] text-gray-400 block">Audience Reach</span>
                <span className="text-lg font-black text-[#D8B4FE] mt-0.5 block">
                  {profile.followersCount ? `${profile.followersCount * 12}` : '450'}
                </span>
                <span className="text-[9px] text-emerald-400 font-semibold">Nigeria 🇳🇬 (78%)</span>
              </div>
            </div>

            {/* Audience Demographics */}
            <div className="p-3.5 rounded-2xl bg-[#171626] border border-white/5 space-y-2">
              <span className="text-xs font-bold text-white block">Top Geographic Locations</span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">1. Lagos, Nigeria 🇳🇬</span>
                  <span className="font-mono text-purple-300">54%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">2. Abuja, Nigeria 🇳🇬</span>
                  <span className="font-mono text-purple-300">22%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">3. London, UK 🇬🇧</span>
                  <span className="font-mono text-purple-300">14%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">4. Ghana & Others 🌍</span>
                  <span className="font-mono text-purple-300">10%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
