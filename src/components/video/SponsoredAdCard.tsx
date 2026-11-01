import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  ExternalLink,
  ShieldAlert,
  Info,
  CheckCircle,
  Flag,
  Sparkles,
  Eye,
  MousePointerClick
} from 'lucide-react';
import { AdCampaign } from '../../types';
import { recordAdImpression, recordAdClick, reportAd } from '../../services/monetizationService';

interface SponsoredAdCardProps {
  ad: AdCampaign;
  isActive: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onHideAd?: (adId: string) => void;
}

export const SponsoredAdCard: React.FC<SponsoredAdCardProps> = ({
  ad,
  isActive,
  soundEnabled,
  onToggleSound,
  onHideAd
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [reported, setReported] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<'misleading' | 'repetitive' | 'inappropriate' | 'scam' | 'other'>('inappropriate');
  const [showAdChoicesInfo, setShowAdChoicesInfo] = useState(false);
  const [impressionRecorded, setImpressionRecorded] = useState(false);

  // Auto-play / pause based on active feed index
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay with sound restricted, mute and retry
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
            }
          });
      }

      // Record impression once per session view
      if (!impressionRecorded) {
        recordAdImpression(ad.campaignId || ad.id);
        setImpressionRecorded(true);
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isActive, impressionRecorded, ad]);

  // Sync mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !soundEnabled;
    }
  }, [soundEnabled]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordAdClick(ad.campaignId || ad.id);
    if (ad.targetUrl) {
      window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    await reportAd({
      campaignId: ad.campaignId || ad.id,
      campaignTitle: ad.title,
      advertiserId: ad.advertiserId,
      reporterId: 'user_viewer',
      reason: reportReason
    });
    setReported(true);
    setReportModalOpen(false);
    if (onHideAd) {
      onHideAd(ad.campaignId || ad.id);
    }
  };

  if (reported) {
    return (
      <div className="relative w-full h-full bg-[#080810] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
          <CheckCircle className="w-7 h-7" />
        </div>
        <h4 className="text-white font-bold text-lg mb-1">Ad Hidden & Reported</h4>
        <p className="text-sm text-[#A5A5B5] max-w-xs">
          Thank you for keeping ARAO safe. We will review this sponsor and adjust your preferences.
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={togglePlayPause}
      className="relative w-full h-full bg-black select-none overflow-hidden cursor-pointer flex items-center justify-center"
    >
      {/* Video or Image Media */}
      {ad.mediaType === 'video' ? (
        <video
          ref={videoRef}
          src={ad.mediaUrl}
          poster={ad.thumbnailUrl}
          playsInline
          loop
          muted={!soundEnabled}
          className="w-full h-full object-cover"
        />
      ) : (
        <img
          src={ad.mediaUrl}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
      )}

      {/* Subtle Gradient Overlays for Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />

      {/* Top Left: SPONSORED Badge & Advertiser Pill */}
      <div className="absolute top-16 left-4 z-20 flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7000FF]/80 backdrop-blur-md border border-purple-400/40 text-white text-[11px] font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(112,0,255,0.4)]">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Sponsored</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowAdChoicesInfo(prev => !prev);
          }}
          className="p-1.5 rounded-full bg-black/50 hover:bg-black/80 text-gray-300 hover:text-white backdrop-blur-md border border-white/10 transition-colors"
          title="Why am I seeing this?"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Right Controls: Sound Toggle & Report Ad */}
      <div className="absolute top-16 right-4 z-20 flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSound();
          }}
          className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition-all active:scale-95"
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-[#D8B4FE]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setReportModalOpen(true);
          }}
          className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-gray-300 hover:text-rose-400 backdrop-blur-md border border-white/15 transition-all active:scale-95"
          title="Report Ad"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Play/Pause Center Indicator */}
      {!isPlaying && ad.mediaType === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </div>
        </div>
      )}

      {/* Ad Choices Info Tooltip */}
      {showAdChoicesInfo && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-28 left-4 right-4 z-30 p-4 rounded-2xl bg-[#12121C]/95 backdrop-blur-xl border border-purple-500/30 shadow-2xl animate-fade-in text-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#8B00FF]" /> About Sponsored Ads on ARAO
            </span>
            <button
              onClick={() => setShowAdChoicesInfo(false)}
              className="text-gray-400 hover:text-white text-xs font-semibold"
            >
              Close
            </button>
          </div>
          <p className="text-[#A5A5B5] leading-relaxed">
            You are seeing this advertisement because it matches trending interests on ARAO or general demographic relevance.
          </p>
          <p className="text-purple-300">
            ★ ARAO Premium members enjoy ad-free viewing! Upgrade anytime in your profile.
          </p>
        </div>
      )}

      {/* Bottom Content Area: Advertiser, Headline, Caption & Bold CTA */}
      <div className="absolute bottom-16 inset-x-0 p-5 z-20 flex flex-col gap-3 pointer-events-none">
        {/* Advertiser Profile Info */}
        <div className="flex items-center gap-3">
          <img
            src={ad.advertiserAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
            alt={ad.advertiserName}
            className="w-11 h-11 rounded-full object-cover border-2 border-[#8B00FF] shadow-lg shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-white font-bold text-base truncate tracking-tight">
                {ad.advertiserName}
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-[#D8B4FE] font-semibold border border-purple-500/40">
                Brand
              </span>
            </div>
            <p className="text-xs text-[#A5A5B5] truncate">
              {ad.title}
            </p>
          </div>
        </div>

        {/* Caption */}
        <p className="text-sm text-gray-200 line-clamp-2 leading-snug drop-shadow-md">
          {ad.caption}
        </p>

        {/* Interactive CTA Action Banner */}
        <div className="pointer-events-auto mt-1 flex items-center gap-2">
          <button
            onClick={handleCtaClick}
            className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#A855F7] text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(139,0,255,0.6)] cursor-pointer"
          >
            <span>{ad.ctaText || 'Learn More'}</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report Ad Modal */}
      {reportModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#12121C] border border-purple-500/30 p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h3 className="text-white font-bold text-base">Report Advertisement</h3>
            </div>
            <p className="text-xs text-[#A5A5B5] mb-4">
              Tell us why this sponsor should not be shown on ARAO:
            </p>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              {[
                { id: 'misleading', label: 'Misleading or False Claims' },
                { id: 'inappropriate', label: 'Inappropriate Content' },
                { id: 'repetitive', label: 'Seen Too Frequently' },
                { id: 'scam', label: 'Suspected Scam or Fraud' },
                { id: 'other', label: 'Other Issue' }
              ].map(opt => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-[#1A1926] border border-white/5 hover:border-purple-500/40 cursor-pointer text-xs text-gray-200 transition-colors"
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={opt.id}
                    checked={reportReason === opt.id}
                    onChange={() => setReportReason(opt.id as any)}
                    className="accent-[#8B00FF]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 font-semibold text-xs hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-rose-600/30"
                >
                  Submit & Hide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
