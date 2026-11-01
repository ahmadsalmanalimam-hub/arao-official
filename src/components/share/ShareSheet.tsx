import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Flag,
  Download,
  EyeOff,
  Loader2
} from 'lucide-react';
import { VideoItem } from '../../types';
import { downloadVideoFile } from '../../lib/cloudinary';
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
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!video) return null;

  const currentUrl = window.location.origin + `?video=${video.videoId}`;
  const shareText = `Check out this video by @${video.username} on ARAO! ⚡ ${currentUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ARAO Video by @${video.username}`,
          text: video.caption || 'Watch this video on ARAO!',
          url: currentUrl
        });
        onClose();
      } catch (err) {
        console.warn('Share cancelled or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleDownload = async () => {
    if (video.allowDownload === false) {
      setStatusMsg('Downloads are disabled by this creator');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    setDownloading(true);
    setStatusMsg('Downloading video file...');
    try {
      await downloadVideoFile(video.videoUrl, `arao_${video.username}_${video.videoId}`);
      await incrementVideoDownloads(video.videoId);
      setStatusMsg('Video saved successfully!');
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 1500);
    } catch {
      setStatusMsg('Download failed');
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const handleNotInterestedClick = async () => {
    if (user) {
      await markNotInterested(user.uid, video.videoId, video.category);
    }
    if (onNotInterested) {
      onNotInterested(video.videoId);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="flex-1" onClick={onClose} />

      <div className="relative w-full max-w-lg mx-auto bg-[#12121C] border-t border-purple-500/20 rounded-t-3xl p-5 text-white shadow-[0_-10px_40px_rgba(112,0,255,0.2)]">
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
          <h3 className="font-semibold text-sm">Share video</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMsg && (
          <div className="mb-3 p-2.5 bg-[#1A1926] border border-purple-500/40 rounded-xl text-xs text-center text-purple-200">
            {statusMsg}
          </div>
        )}

        {/* Primary Share Action Grid */}
        <div className="grid grid-cols-4 gap-4 text-center py-2">
          {/* Native Share */}
          <button
            onClick={handleNativeShare}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] text-white flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform shadow-[0_0_15px_rgba(139,0,255,0.4)]">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs text-[#A5A5B5]">Share via...</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#1A1926] border border-white/10 text-white flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </div>
            <span className="text-xs text-[#A5A5B5]">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[#25D366] text-white flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform shadow-md">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <span className="text-xs text-[#A5A5B5]">WhatsApp</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={handleTwitter}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/20 text-white flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs text-[#A5A5B5]">X / Post</span>
          </button>
        </div>

        {/* Secondary Actions: Download, Not Interested, Report */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
          {/* Real Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-2.5 px-3 rounded-xl bg-[#1A1926] hover:bg-purple-950/40 border border-purple-500/20 text-xs text-white font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              video.allowDownload === false ? 'opacity-40' : ''
            }`}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#8B00FF]" />
            ) : (
              <Download className="w-4 h-4 text-[#8B00FF]" />
            )}
            <span>
              {video.allowDownload === false
                ? 'Downloads disabled for this video'
                : 'Download Video to Device'}
            </span>
          </button>

          {/* Not Interested */}
          <button
            onClick={handleNotInterestedClick}
            className="w-full py-2 px-3 rounded-xl bg-[#1A1926] hover:bg-zinc-800 text-xs text-gray-300 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <EyeOff className="w-4 h-4 text-gray-400" />
            <span>Not Interested in this video</span>
          </button>

          {/* Report Video Option */}
          {onOpenReport && (
            <button
              onClick={() => {
                onClose();
                onOpenReport(video.videoId, video.userId);
              }}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-xs text-red-400 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Flag className="w-4 h-4" />
              <span>Report this video</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
