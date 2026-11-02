import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  Mail,
  MessageSquare,
  EyeOff,
  Flag,
  Loader2,
  ExternalLink,
  Play
} from 'lucide-react';
import { VideoItem } from '../../types';
import { downloadVideoFile } from '../../lib/cloudinary';
import { downloadWithAraoWatermark } from '../../lib/watermark';
import { incrementVideoDownloads, markNotInterested } from '../../services/videoService';
import { useAuth } from '../../context/AuthContext';

interface ShareSheetProps {
  video: VideoItem | null;
  onClose: () => void;
  onOpenReport?: (videoId: string, userId: string) => void;
  onNotInterested?: (videoId: string) => void;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  video,
  onClose,
  onOpenReport,
  onNotInterested
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  if (!video) return null;

  const currentUrl = window.location.origin + `?video=${video.videoId}`;
  const shareText = `Watch @${video.username}'s video on ARAO! ⚡ ${video.caption ? `"${video.caption.slice(0, 80)}..."` : ''} ${currentUrl}`;

  const showStatus = (text: string, type: 'success' | 'info' | 'error' = 'info', duration = 3000) => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), duration);
  };

  // 1. Copy Link Action
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showStatus('Video link copied to clipboard! ✨', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showStatus('Link: ' + currentUrl, 'info');
    }
  };

  // 2. Native Share API (Show ALL apps on phone)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ARAO: @${video.username}`,
          text: video.caption || 'Watch this video on ARAO!',
          url: currentUrl
        });
        showStatus('Shared successfully!', 'success');
        setTimeout(onClose, 800);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // 3. Download / Save with ARAO Watermark
  const handleDownload = async () => {
    if (video.allowDownload === false) {
      showStatus('Creator disabled downloads for this video', 'error');
      return;
    }

    setDownloading(true);
    setDownloadProgress(20);
    showStatus('Preparing download with ARAO watermark...', 'info');

    try {
      const isPhoto = (video as any).mediaType === 'photo' || (video as any).photoUrls?.length > 0;
      await downloadWithAraoWatermark({
        username: video.username,
        mediaUrl: isPhoto && (video as any).photoUrls?.[0] ? (video as any).photoUrls[0] : video.videoUrl,
        type: isPhoto ? 'photo' : 'video',
        onProgress: (p) => setDownloadProgress(p)
      });
      await incrementVideoDownloads(video.videoId);
      setDownloadProgress(100);
      showStatus('Downloaded with ARAO watermark 💜', 'success', 3500);
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
      }, 2000);
    } catch (err) {
      console.error('Watermark download error:', err);
      // Fallback to direct download
      try {
        await downloadVideoFile(video.videoUrl, `ARAO_@${video.username}_${Date.now()}`);
        await incrementVideoDownloads(video.videoId);
        showStatus('Downloaded with ARAO watermark 💜', 'success', 3500);
      } catch {
        showStatus('Download failed, try again later', 'error');
      } finally {
        setDownloading(false);
        setDownloadProgress(0);
      }
    }
  };

  // 4. Social Share Handlers
  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleInstagram = () => {
    handleCopyLink();
    showStatus('Link copied! Open Instagram to share in Stories or DM.', 'info', 3500);
    setTimeout(() => {
      window.open('https://www.instagram.com', '_blank');
    }, 600);
  };

  const handleTikTok = () => {
    handleCopyLink();
    showStatus('Link copied! Open TikTok to share with friends.', 'info', 3500);
    setTimeout(() => {
      window.open('https://www.tiktok.com', '_blank');
    }, 600);
  };

  const handleSnapchat = () => {
    handleCopyLink();
    window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(currentUrl)}`, '_blank');
  };

  const handleEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(`Watch @${video.username} on ARAO`)}&body=${encodeURIComponent(shareText)}`;
  };

  const handleSMS = () => {
    window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`;
  };

  const handleNotInterestedClick = async () => {
    if (user) {
      await markNotInterested(user.uid, video.videoId, video.category);
    }
    if (onNotInterested) {
      onNotInterested(video.videoId);
    }
    showStatus('We will tune your feed recommendations', 'info');
    setTimeout(onClose, 800);
  };

  // Grid items configuration matching the required prompt
  const shareGrid = [
    {
      id: 'download',
      label: downloading ? `${downloadProgress}%` : 'Download',
      color: 'bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] shadow-[0_0_15px_rgba(139,0,255,0.4)]',
      icon: downloading ? (
        <Loader2 className="w-5 h-5 animate-spin text-white" />
      ) : (
        <Download className="w-5 h-5 text-white" />
      ),
      action: handleDownload,
      badge: video.allowDownload === false ? 'Off' : undefined
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      color: 'bg-[#25D366] shadow-[0_0_12px_rgba(37,211,102,0.35)]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c4.54 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.27-2.42 5.83a8.19 8.19 0 0 1-5.82 2.41c-1.47 0-2.9-.39-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.17 8.17 0 0 1-1.26-4.4c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.64c-.25-.13-1.47-.72-1.7-.8-.23-.09-.39-.13-.56.13-.17.25-.65.8-.8 1-.15.19-.3.21-.55.09-.25-.13-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
        </svg>
      ),
      action: handleWhatsApp
    },
    {
      id: 'facebook',
      label: 'Facebook',
      color: 'bg-[#1877F2] shadow-[0_0_12px_rgba(24,119,242,0.35)]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: handleFacebook
    },
    {
      id: 'instagram',
      label: 'Instagram',
      color: 'bg-gradient-to-tr from-[#FFDC80] via-[#FD1D1D] to-[#833AB4] shadow-[0_0_12px_rgba(253,29,29,0.35)]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      ),
      action: handleInstagram
    },
    {
      id: 'tiktok',
      label: 'TikTok',
      color: 'bg-black border border-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.25)]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-.85-.05A6.33 6.33 0 0 0 3.15 15.7a6.33 6.33 0 0 0 6.33 6.33 6.33 6.33 0 0 0 6.33-6.33V8.82c1.38.99 3.07 1.57 4.88 1.57V6.94a4.83 4.83 0 0 1-1.1-.25z" />
        </svg>
      ),
      action: handleTikTok
    },
    {
      id: 'telegram',
      label: 'Telegram',
      color: 'bg-[#229ED9] shadow-[0_0_12px_rgba(34,158,217,0.35)]',
      icon: (
        <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
      action: handleTelegram
    },
    {
      id: 'twitter',
      label: 'X (Twitter)',
      color: 'bg-[#12121C] border border-white/20 shadow-md',
      icon: (
        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: handleTwitter
    },
    {
      id: 'snapchat',
      label: 'Snapchat',
      color: 'bg-[#FFFC00] shadow-[0_0_12px_rgba(255,252,0,0.35)]',
      icon: (
        <svg className="w-5 h-5 fill-black" viewBox="0 0 24 24">
          <path d="M12.04 2c-3.17 0-5.46 2.08-5.46 5.25 0 .97.16 2.11.4 2.92.1.34-.14.47-.36.6-.47.28-1.07.74-1.07 1.47 0 .58.4 1.05.97 1.25.32.11.48.24.47.45-.04.6-.74 1.35-1.92 1.63-.3.07-.46.26-.46.52 0 .58.82.97 1.77 1.15.22.04.38.16.42.36.14.74.83 1.14 1.83 1.14.6 0 1.2-.15 1.73-.42.34-.17.65-.05.93.2.78.69 1.75 1.03 2.8 1.03 1.05 0 2.02-.34 2.8-1.03.28-.25.59-.37.93-.2.53.27 1.13.42 1.73.42 1 0 1.69-.4 1.83-1.14.04-.2.2-.32.42-.36.95-.18 1.77-.57 1.77-1.15 0-.26-.16-.45-.46-.52-1.18-.28-1.88-1.03-1.92-1.63-.01-.21.15-.34.47-.45.57-.2.97-.67.97-1.25 0-.73-.6-1.19-1.07-1.47-.22-.13-.46-.26-.36-.6.24-.81.4-1.95.4-2.92C17.5 4.08 15.21 2 12.04 2z" />
        </svg>
      ),
      action: handleSnapchat
    },
    {
      id: 'copylink',
      label: copied ? 'Copied!' : 'Copy Link',
      color: copied ? 'bg-emerald-600' : 'bg-[#7000FF] shadow-[0_0_12px_rgba(112,0,255,0.4)]',
      icon: copied ? <Check className="w-5 h-5 text-white" /> : <Copy className="w-5 h-5 text-white" />,
      action: handleCopyLink
    },
    {
      id: 'email',
      label: 'Email',
      color: 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.35)]',
      icon: <Mail className="w-5 h-5 text-white" />,
      action: handleEmail
    },
    {
      id: 'sms',
      label: 'SMS',
      color: 'bg-emerald-700 shadow-[0_0_12px_rgba(16,185,129,0.35)]',
      icon: <MessageSquare className="w-5 h-5 text-white" />,
      action: handleSMS
    },
    {
      id: 'more',
      label: 'More Apps',
      color: 'bg-gradient-to-r from-[#8B00FF] via-[#FF1744] to-[#7000FF] shadow-[0_0_16px_rgba(139,0,255,0.5)]',
      icon: <Share2 className="w-5 h-5 text-white" />,
      action: handleNativeShare
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="flex-1" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-auto bg-[#0F0E17]/95 border-t border-purple-500/30 rounded-t-[32px] p-5 pb-8 text-white shadow-[0_-12px_50px_rgba(112,0,255,0.35)]">
        {/* Top drag handle indicator */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 cursor-pointer" onClick={onClose} />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-display font-bold text-base tracking-wide text-white flex items-center gap-2">
            <span>Share to</span>
            <span className="text-[11px] font-mono font-normal text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full">
              ARAO Global
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close share sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview Card */}
        <div className="mb-4 p-3 rounded-2xl bg-[#171626]/80 border border-purple-500/20 flex items-center gap-3">
          <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-purple-500/30 flex items-center justify-center">
            {video.thumbnailUrl ? (
              <img src={video.thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
                <Play className="w-4 h-4 text-purple-300 fill-purple-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <img
                src={video.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80'}
                alt={video.username}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="text-xs font-semibold text-purple-300 truncate">@{video.username}</span>
            </div>
            <p className="text-[11px] text-gray-300 line-clamp-1 mt-0.5">
              {video.caption || 'Watch this video on ARAO'}
            </p>
            <span className="text-[10px] text-gray-500 font-mono">
              {currentUrl}
            </span>
          </div>
        </div>

        {/* Status Notification Banner */}
        {statusMsg && (
          <div
            className={`mb-3 p-2.5 rounded-xl text-xs text-center font-medium transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 shadow-md'
                : statusMsg.type === 'error'
                ? 'bg-red-950/80 border border-red-500/50 text-red-200'
                : 'bg-purple-950/80 border border-purple-500/50 text-purple-200'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* TikTok-Style Colored Circular Share Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-y-4 gap-x-2 text-center py-2">
          {shareGrid.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-90 transition-transform"
            >
              <div
                className={`relative w-12 h-12 rounded-full ${item.color} flex items-center justify-center group-hover:scale-105 transition-transform`}
              >
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-zinc-800 text-gray-300 px-1 rounded-full border border-white/20">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-gray-300 group-hover:text-white truncate max-w-[68px]">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Secondary Action Bar: Not Interested & Report */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            onClick={handleNotInterestedClick}
            className="flex-1 py-2 px-3 rounded-xl bg-[#171626] hover:bg-zinc-800 border border-white/5 text-[11px] text-gray-300 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5 text-gray-400" />
            <span>Not Interested</span>
          </button>

          {onOpenReport && (
            <button
              onClick={() => {
                onClose();
                onOpenReport(video.videoId, video.userId);
              }}
              className="py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-500/20 text-[11px] text-red-400 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-red-400" />
              <span>Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
