import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Download,
  Music,
  Volume2,
  VolumeX,
  Play,
  Plus,
  Check,
  Flag,
  Sliders,
  Loader2,
  Ban
} from 'lucide-react';
import { VideoItem } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  toggleLikeVideo,
  checkUserLiked,
  toggleBookmark,
  checkUserBookmarked,
  incrementVideoViews,
  incrementVideoDownloads,
  recordWatchHistory
} from '../../services/videoService';
import { followUser, checkFollowStatus } from '../../services/userService';
import { getVideoQualityUrl, downloadVideoFile } from '../../lib/cloudinary';

interface VideoCardProps {
  video: VideoItem;
  isActive: boolean;
  onOpenComments: (video: VideoItem) => void;
  onOpenShare: (video: VideoItem) => void;
  onOpenProfile: (userId: string) => void;
  onOpenReport?: (videoId: string, userId: string) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isActive,
  onOpenComments,
  onOpenShare,
  onOpenProfile,
  onOpenReport,
  soundEnabled,
  onToggleSound
}) => {
  const { user, profile, settings, updateSettings, openAuthModal } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  // User verification check requested
  const isVerified =
    user?.email === 'nasirandco001@gmail.com' ||
    (user as any)?.isVerified === true ||
    (user as any)?.username === 'arao' ||
    profile?.email?.toLowerCase() === 'nasirandco001@gmail.com' ||
    profile?.isVerified === true ||
    profile?.username?.toLowerCase() === 'arao';

  const isCreatorVerified =
    video.username?.toLowerCase() === 'arao' ||
    (user?.uid === video.userId && isVerified);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likesCount || 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [followStatus, setFollowStatus] = useState<'none' | 'active' | 'pending'>('none');
  const [showCenterHeart, setShowCenterHeart] = useState(false);
  const [lastTap, setLastTap] = useState(0);

  // Quality selector state
  const [selectedQuality, setSelectedQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p'>(
    settings.dataSaver ? '480p' : (settings.videoQualityPreference || 'auto')
  );
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Determine stream URL with quality applied
  const activeVideoUrl = getVideoQualityUrl(video.videoUrl, selectedQuality);

  // Sync like and bookmark status
  useEffect(() => {
    if (!user) {
      setLiked(false);
      setBookmarked(false);
      setFollowStatus('none');
      return;
    }

    checkUserLiked(video.videoId, user.uid).then(setLiked);
    checkUserBookmarked(video.videoId, user.uid).then(setBookmarked);

    if (video.userId !== user.uid) {
      checkFollowStatus(user.uid, video.userId).then(setFollowStatus);
    }
  }, [video.videoId, video.userId, user]);

  // Handle video autoplay, watch history, and pause
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActive) {
      vid.currentTime = 0;
      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            incrementVideoViews(video.videoId);
            if (user) {
              recordWatchHistory(user.uid, video);
            }
          })
          .catch(() => {
            setIsPlaying(false);
          });
      }
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isActive, video.videoId, user]);

  // Handle single tap (play/pause) vs double tap (like)
  const handleContainerClick = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      handleLikeDoubleTap();
      setLastTap(0);
    } else {
      setLastTap(now);
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_TAP_DELAY) {
          togglePlayPause();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleLikeDoubleTap = async () => {
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    setShowCenterHeart(true);
    setTimeout(() => setShowCenterHeart(false), 900);

    if (!liked) {
      setLiked(true);
      setLikesCount(prev => prev + 1);
      try {
        await toggleLikeVideo(video, {
          uid: user.uid,
          username: profile.username,
          avatar: profile.avatar
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLikeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikesCount(prev => optimisticLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await toggleLikeVideo(video, {
        uid: user.uid,
        username: profile.username,
        avatar: profile.avatar
      });
      setLiked(res.liked);
      setLikesCount(res.newLikesCount);
    } catch (err) {
      console.error('Like error:', err);
      setLiked(!optimisticLiked);
      setLikesCount(prev => optimisticLiked ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }

    const newSaved = !bookmarked;
    setBookmarked(newSaved);
    try {
      const saved = await toggleBookmark(video, user.uid);
      setBookmarked(saved);
    } catch (err) {
      console.error(err);
      setBookmarked(!newSaved);
    }
  };

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    try {
      const status = await followUser(
        { uid: user.uid, username: profile.username, avatar: profile.avatar },
        { uid: video.userId }
      );
      setFollowStatus(status);
    } catch (err) {
      console.error('Follow error:', err);
    }
  };

  // Real video download handler
  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.allowDownload === false) {
      setDownloadToast('Creator has disabled downloads for this video');
      setTimeout(() => setDownloadToast(null), 3000);
      return;
    }

    setDownloading(true);
    setDownloadPercent(0);
    setDownloadToast('Downloading video...');

    try {
      await downloadVideoFile(video.videoUrl, `arao_${video.username}_${video.videoId}`, (percent) => {
        setDownloadPercent(percent);
      });
      await incrementVideoDownloads(video.videoId);
      setDownloadToast('Video saved to device!');
      setTimeout(() => setDownloadToast(null), 3000);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadToast('Download failed. Please check network.');
      setTimeout(() => setDownloadToast(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  // Change video quality seamlessly preserving currentTime
  const handleSelectQuality = (q: 'auto' | '1080p' | '720p' | '480p' | '360p') => {
    const vid = videoRef.current;
    const currentTime = vid ? vid.currentTime : 0;
    setSelectedQuality(q);
    setShowQualityMenu(false);
    updateSettings({ videoQualityPreference: q });

    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        if (isPlaying) videoRef.current.play();
      }
    }, 50);
  };

  return (
    <div
      onClick={handleContainerClick}
      className="relative w-full h-full bg-[#080810] select-none overflow-hidden flex items-center justify-center cursor-pointer"
    >
      {/* 100% True Full-Screen Video presentation */}
      <video
        ref={videoRef}
        src={activeVideoUrl}
        poster={video.thumbnailUrl}
        playsInline
        loop
        muted={!soundEnabled}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        className="w-full h-full object-cover"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 pointer-events-none z-20">
          <div className="w-12 h-12 border-3 border-transparent border-t-[#8B00FF] border-r-[#7000FF] rounded-full animate-spin" />
        </div>
      )}

      {/* Paused Overlay icon */}
      {!isPlaying && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-purple-500/30 flex items-center justify-center text-white/90 scale-90 animate-pulse shadow-[0_0_20px_rgba(139,0,255,0.4)]">
            <Play className="w-8 h-8 fill-white/90 translate-x-0.5 text-white" />
          </div>
        </div>
      )}

      {/* Animated Electric Purple / Red Heart on Double Tap */}
      {showCenterHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <Heart className="w-28 h-28 text-[#FF1744] fill-[#FF1744] filter drop-shadow-[0_0_30px_rgba(255,23,68,0.9)] animate-float-heart" />
        </div>
      )}

      {/* Top Floating Controls */}
      <div className="absolute top-14 right-3 z-30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:text-[#8B00FF] transition-colors"
          aria-label={soundEnabled ? 'Mute audio' : 'Unmute audio'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
        </button>

        {/* Report video */}
        {onOpenReport && (
          <button
            onClick={() => onOpenReport(video.videoId, video.userId)}
            className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-red-400 transition-colors"
            title="Report video"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Floating Download Toast */}
      {downloadToast && (
        <div className="absolute top-24 inset-x-4 z-40 max-w-sm mx-auto p-3 rounded-2xl bg-[#12121C]/95 backdrop-blur-md border border-purple-500/30 shadow-2xl flex items-center justify-center gap-2 text-xs font-semibold text-white animate-fade-in">
          {downloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#8B00FF]" />
              <span>{downloadToast} ({downloadPercent}%)</span>
            </>
          ) : (
            <span>{downloadToast}</span>
          )}
        </div>
      )}

      {/* Subtle Bottom Gradient for readable captions */}
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-10" />

      {/* Compact Video Engagement Rail on the Right */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2.5 bottom-20 z-20 flex flex-col items-center gap-3 text-white"
      >
        {/* Creator Profile Picture & Follow Button */}
        <div className="relative mb-1">
          <button
            onClick={() => onOpenProfile(video.userId)}
            className="w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] shadow-lg cursor-pointer transform hover:scale-105 transition-transform"
          >
            <img
              src={video.userAvatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80`}
              alt={video.username}
              className="w-full h-full rounded-full object-cover bg-[#12121C]"
            />
          </button>

          {/* Follow '+' indicator */}
          {user?.uid !== video.userId && followStatus === 'none' && (
            <button
              onClick={handleFollowClick}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white rounded-full flex items-center justify-center font-bold shadow-md hover:scale-110 active:scale-95 transition-transform"
              title="Follow creator"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          )}
          {user?.uid !== video.userId && followStatus === 'active' && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLikeClick}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Like video"
          >
            <Heart
              className={`w-7 h-7 transition-colors ${
                liked
                  ? 'text-[#FF1744] fill-[#FF1744] filter drop-shadow-[0_0_12px_rgba(255,23,68,0.7)]'
                  : 'text-white'
              }`}
            />
          </button>
          <span className="text-[12px] font-semibold tracking-tight text-gray-200">
            {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onOpenComments(video)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Comments"
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </button>
          <span className="text-[12px] font-semibold tracking-tight text-gray-200">
            {video.commentsCount > 999 ? `${(video.commentsCount / 1000).toFixed(1)}k` : video.commentsCount || 0}
          </span>
        </div>

        {/* Bookmark / Save Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleBookmarkClick}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Bookmark"
          >
            <Bookmark
              className={`w-7 h-7 transition-colors ${
                bookmarked
                  ? 'text-[#8B00FF] fill-[#8B00FF] filter drop-shadow-[0_0_12px_rgba(139,0,255,0.8)]'
                  : 'text-white'
              }`}
            />
          </button>
          <span className="text-[11px] font-semibold tracking-tight text-gray-300">
            Save
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => onOpenShare(video)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Share"
          >
            <Share2 className="w-7 h-7 text-white" />
          </button>
          <span className="text-[11px] font-semibold tracking-tight text-gray-300">
            Share
          </span>
        </div>

        {/* Download Button (Real Video Download) */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleDownloadClick}
            disabled={downloading}
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer ${
              video.allowDownload === false ? 'opacity-40' : ''
            }`}
            title={video.allowDownload === false ? 'Downloads disabled by creator' : 'Download video'}
          >
            {downloading ? (
              <Loader2 className="w-6 h-6 animate-spin text-[#8B00FF]" />
            ) : video.allowDownload === false ? (
              <Ban className="w-6 h-6 text-gray-400" />
            ) : (
              <Download className="w-6 h-6 text-white" />
            )}
          </button>
          <span className="text-[11px] font-semibold tracking-tight text-gray-300">
            {downloading ? `${downloadPercent}%` : 'Save'}
          </span>
        </div>

        {/* Quality Selector Control */}
        <div className="relative flex flex-col items-center mt-0.5">
          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="px-2 py-0.5 rounded-full bg-black/60 border border-purple-500/40 text-[10px] font-mono text-purple-300 hover:text-white hover:border-[#8B00FF] transition-all cursor-pointer shadow-sm"
            title="Video quality settings"
          >
            {selectedQuality.toUpperCase()}
          </button>

          {/* Quality Popup Menu */}
          {showQualityMenu && (
            <div className="absolute right-12 bottom-0 w-28 bg-[#12121C] border border-purple-500/30 rounded-xl shadow-2xl py-1 z-40 text-xs">
              {(['auto', '1080p', '720p', '480p', '360p'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleSelectQuality(q)}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/5 transition-colors ${
                    selectedQuality === q ? 'text-[#8B00FF] font-bold' : 'text-gray-300'
                  }`}
                >
                  <span>{q.toUpperCase()}</span>
                  {selectedQuality === q && <Check className="w-3 h-3 text-[#8B00FF]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spinning Vinyl Audio Badge */}
        <div className="mt-1">
          <div className="w-10 h-10 rounded-full border border-purple-500/40 p-0.5 bg-black/80 animate-spin-slow shadow-[0_0_12px_rgba(112,0,255,0.4)]">
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-zinc-900 to-purple-950 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[#8B00FF]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info Overlay */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-4 bottom-16 z-20 max-w-[76%] text-left"
      >
        {/* Creator Handle */}
        <button
          onClick={() => onOpenProfile(video.userId)}
          className="flex items-center gap-1.5 group mb-1.5"
        >
          <span className="font-semibold text-base text-white group-hover:text-[#D8B4FE] transition-colors flex items-center gap-1.5 drop-shadow-md">
            @{video.username}
            {(isCreatorVerified || video.username === 'arao') && (
              <span
                className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] text-white text-[9px] font-bold inline-flex items-center justify-center shadow-[0_0_8px_rgba(139,0,255,0.7)]"
                title="Verified Official Creator"
              >
                ✓
              </span>
            )}
          </span>
          {video.category && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-purple-200 border border-white/10 uppercase tracking-wider font-medium">
              {video.category}
            </span>
          )}
        </button>

        {/* Caption with highlighted hashtags */}
        <p className="text-sm text-gray-100 line-clamp-2 drop-shadow leading-relaxed mb-2">
          {video.caption.split(' ').map((word, i) => {
            if (word.startsWith('#')) {
              return (
                <span key={i} className="text-[#D8B4FE] font-medium mr-1 hover:underline cursor-pointer">
                  {word}{' '}
                </span>
              );
            }
            return word + ' ';
          })}
        </p>

        {/* Sound Bar */}
        <div className="flex items-center gap-2 text-xs text-gray-300 drop-shadow">
          <Music className="w-3.5 h-3.5 text-[#8B00FF] shrink-0" />
          <span className="truncate max-w-[200px]">
            {video.soundTitle || `Original Sound - @${video.username}`}
          </span>
        </div>
      </div>
    </div>
  );
};
