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
  Ban,
  Repeat
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
  recordWatchHistory,
  voteOnPostPoll,
  repostVideo
} from '../../services/videoService';
import { followUser, checkFollowStatus } from '../../services/userService';
import { getVideoQualityUrl, downloadVideoFile } from '../../lib/cloudinary';
import { VerifiedBadge } from '../common/VerifiedBadge';

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

  // Photo / Slideshow support
  const isPhotoPost = (video as any).mediaType === 'photo' || (video as any).mediaType === 'slideshow' || Boolean((video as any).photoUrls?.length);
  const photoUrls: string[] = (video as any).photoUrls && (video as any).photoUrls.length > 0
    ? (video as any).photoUrls
    : (isPhotoPost ? [video.thumbnailUrl || video.videoUrl] : []);
  const isSlideshow = photoUrls.length > 1;
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Text post & Poll support
  const isTextPost = video.postType === 'text' || (video as any).mediaType === 'text' || Boolean(video.textPostData);
  const [currentPoll, setCurrentPoll] = useState<any>(video.poll);
  const [hasReposted, setHasReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(video.repostCount || 0);

  // Auto-advance slideshow slides
  useEffect(() => {
    if (!isActive || !isSlideshow) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % photoUrls.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [isActive, isSlideshow, photoUrls.length]);

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
            incrementVideoViews(video.videoId, user?.uid);
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

  const handleVote = async (optionIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal('login');
      return;
    }
    const updated = await voteOnPostPoll(video.videoId, user.uid, optionIdx);
    if (updated) setCurrentPoll(updated);
  };

  const handleRepost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }
    if (hasReposted) return;
    setHasReposted(true);
    setRepostCount((c) => c + 1);
    await repostVideo(video, { uid: user.uid, username: profile.username, avatar: profile.avatar });
    setDownloadToast('Reposted to your ARAO feed! ⚡');
    setTimeout(() => setDownloadToast(null), 2500);
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
      {/* 100% True Full-Screen Video, Photo, or Colorful Text presentation */}
      {isTextPost ? (
        <div
          className={`relative w-full h-full bg-gradient-to-br ${
            video.textPostData?.bgGradient || 'from-[#3900A8] via-[#8A2BE2] to-[#7000FF]'
          } flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden`}
        >
          <div className="max-w-xs space-y-4 relative z-20">
            <p
              className={`text-2xl sm:text-3xl font-black text-white drop-shadow-xl leading-relaxed ${
                video.textPostData?.font === 'serif' ? 'font-serif' :
                video.textPostData?.font === 'mono' ? 'font-mono' : 'font-display'
              } ${
                video.textPostData?.animation === 'pulse' ? 'animate-pulse' :
                video.textPostData?.animation === 'bounce' ? 'animate-bounce' : ''
              }`}
            >
              {video.textPostData?.text || video.caption}
            </p>

            {/* Interactive Poll widget if present */}
            {currentPoll && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-6 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/20 text-left space-y-2.5 shadow-2xl"
              >
                <span className="text-xs font-bold text-purple-200 block">📊 {currentPoll.question}</span>
                <div className="space-y-1.5">
                  {currentPoll.options?.map((opt: any, oIdx: number) => {
                    const totalVotes = currentPoll.options.reduce((acc: number, o: any) => acc + (o.votes || 0), 0);
                    const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                    const isMyVote = user && currentPoll.voters?.[user.uid] === oIdx;
                    return (
                      <button
                        key={oIdx}
                        onClick={(e) => handleVote(oIdx, e)}
                        className={`relative w-full p-2.5 rounded-xl border text-left overflow-hidden flex items-center justify-between text-xs transition-all cursor-pointer ${
                          isMyVote
                            ? 'border-amber-400 bg-amber-400/20 text-amber-200 font-bold'
                            : 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-white/15 pointer-events-none transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="relative z-10">{opt.text}</span>
                        <span className="relative z-10 font-mono text-[11px] font-bold">{pct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
        </div>
      ) : isPhotoPost ? (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
          <img
            src={photoUrls[currentSlideIndex] || video.thumbnailUrl || video.videoUrl}
            alt="ARAO Post"
            className="w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

          {/* Slideshow pagination pill */}
          {isSlideshow && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono text-white flex items-center gap-1.5 shadow-lg">
              <span className="font-bold text-[#D8B4FE]">{currentSlideIndex + 1}</span>
              <span className="text-gray-400">/</span>
              <span>{photoUrls.length}</span>
            </div>
          )}
        </div>
      ) : (
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
      )}

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

      {/* Compact Video Engagement Rail on the Right - shifted down to fill gap */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2.5 bottom-16 sm:bottom-18 z-20 flex flex-col items-center gap-3.5 text-white"
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

        {/* Favorite Button (Bookmark Outline, labeled Favorite) */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleBookmarkClick}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
            aria-label="Favorite"
          >
            <Bookmark
              className={`w-7 h-7 transition-colors ${
                bookmarked
                  ? 'text-[#8B00FF] fill-[#8B00FF] filter drop-shadow-[0_0_12px_rgba(139,0,255,0.85)]'
                  : 'text-white'
              }`}
            />
          </button>
          <span className="text-[11px] font-semibold tracking-tight text-gray-300">
            Favorite
          </span>
        </div>

        {/* Share Button (Opens Premium Share Sheet) */}
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

        {/* Repost Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleRepost}
            className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer ${
              hasReposted ? 'text-emerald-400' : 'text-white'
            }`}
            aria-label="Repost"
          >
            <Repeat className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-semibold tracking-tight text-gray-300">
            {repostCount > 0 ? (repostCount > 999 ? `${(repostCount / 1000).toFixed(1)}k` : repostCount) : 'Repost'}
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
            <VerifiedBadge
              badgeType={(video as any).badgeType || ((isCreatorVerified || video.username === 'arao') ? 'creator_purple' : 'none')}
              isVerified={isCreatorVerified || video.username === 'arao'}
              size="sm"
            />
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
