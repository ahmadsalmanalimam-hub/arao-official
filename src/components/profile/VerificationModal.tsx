import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  Sparkles,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitVerificationRequest } from '../../services/supabaseService';
import { VerifiedBadge } from '../common/VerifiedBadge';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const { user, profile } = useAuth();

  const [badgeType, setBadgeType] = useState<'creator_purple' | 'business_blue'>('creator_purple');
  const [legalName, setLegalName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Content Creator');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!legalName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }

    if (badgeType === 'business_blue' && !businessName.trim()) {
      setErrorMessage('Please enter your registered business or brand name.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please attach an official identity or registration proof document.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await submitVerificationRequest({
        userId: user.uid,
        username: profile.username,
        email: user.email || profile.email,
        requestedBadge: badgeType,
        category,
        fullLegalName: legalName.trim(),
        businessName: badgeType === 'business_blue' ? businessName.trim() : undefined,
        documentFile: selectedFile,
        websiteUrl: websiteUrl.trim() || undefined,
        socialLinks: socialLinks.trim() || undefined,
        notes: notes.trim() || undefined
      });

      setSuccess(true);
      onSubmitted?.();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Verification submit error:', err);
      setErrorMessage(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0F0E17] border border-purple-500/25 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(138,43,226,0.35)] text-white my-auto max-h-[94vh] flex flex-col">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7000FF] via-[#8A2BE2] to-[#1D9BF0] flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>ARAO Account Verification</span>
            </h2>
            <p className="text-[11px] text-[#A5A5B5]">Apply for official Creator or Business verified status</p>
          </div>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Application Submitted!</h3>
            <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
              Your verification documents have been securely stored in our private vault. ARAO administrators will review your credentials within 24-48 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
            {errorMessage && (
              <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Badge Type Selector: Creator Purple vs Business Blue */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setBadgeType('creator_purple')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  badgeType === 'creator_purple'
                    ? 'bg-[#8A2BE2]/20 border-[#8A2BE2] shadow-[0_0_15px_rgba(138,43,226,0.3)]'
                    : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <VerifiedBadge badgeType="creator_purple" size="sm" />
                    <span>Creator</span>
                  </span>
                  <span className="text-[9px] font-mono uppercase text-purple-300">#8A2BE2</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                  For notable influencers, artists, musicians, filmmakers, and content creators.
                </p>
              </div>

              <div
                onClick={() => setBadgeType('business_blue')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                  badgeType === 'business_blue'
                    ? 'bg-[#1D9BF0]/20 border-[#1D9BF0] shadow-[0_0_15px_rgba(29,155,240,0.3)]'
                    : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <VerifiedBadge badgeType="business_blue" size="sm" />
                    <span>Business</span>
                  </span>
                  <span className="text-[9px] font-mono uppercase text-cyan-300">#1D9BF0</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                  For registered companies, official brands, record labels, and agencies.
                </p>
              </div>
            </div>

            {/* Legal Name */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                Full Legal Name <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="e.g. Nasir Ahmad"
                className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                required
              />
            </div>

            {/* Business Name (if Business Blue) */}
            {badgeType === 'business_blue' && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Registered Business Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. ARAO Global Media Ltd"
                  className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#1D9BF0]"
                  required
                />
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-[#8A2BE2]"
              >
                <option value="Content Creator">Content Creator</option>
                <option value="Musician / Artist">Musician / Artist</option>
                <option value="Actor / Nollywood">Actor / Nollywood</option>
                <option value="Fashion & Model">Fashion & Model</option>
                <option value="Media Brand / News">Media Brand / News</option>
                <option value="Tech & Startup">Tech & Startup</option>
                <option value="Sports & Athletics">Sports & Athletics</option>
                <option value="E-Commerce / Business">E-Commerce / Business</option>
              </select>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                {badgeType === 'creator_purple' ? 'Government Issued ID' : 'Business Registration / CAC Proof'} <span className="text-purple-400">*</span>
              </label>
              <div
                onClick={() => document.getElementById('verif_file_input')?.click()}
                className="w-full py-4 px-3 rounded-2xl border border-dashed border-purple-500/30 hover:border-[#8A2BE2] bg-black/40 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                    <FileText className="w-5 h-5" />
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-purple-400 mb-1" />
                    <span className="text-xs text-gray-300">Upload ID Document (PDF, PNG, JPG)</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Stored in encrypted private vault</span>
                  </>
                )}
                <input
                  id="verif_file_input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Social Links or Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Official Website</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">Other Social Handles</label>
                <input
                  type="text"
                  value={socialLinks}
                  onChange={(e) => setSocialLinks(e.target.value)}
                  placeholder="e.g. @instagram / @tiktok"
                  className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-300 mb-1">Additional Verification Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Mention press features, news mentions, or verification context..."
                rows={2}
                className="w-full py-2 px-3 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8A2BE2] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7000FF] via-[#8A2BE2] to-[#1D9BF0] hover:opacity-95 text-white font-bold text-xs shadow-[0_0_20px_rgba(138,43,226,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Submitting to Vault...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Submit Application for Review</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
