import React, { useState } from 'react';
import { X, Flag, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitReport } from '../../services/userService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId?: string;
  commentId?: string;
  reportedUserId?: string;
}

const REPORT_REASONS = [
  'Inappropriate or adult content',
  'Hate speech or harassment',
  'Spam or misleading information',
  'Dangerous or harmful behavior',
  'Copyright or intellectual property infringement',
  'Impersonation or fake account',
  'Other community guidelines violation'
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  videoId,
  commentId,
  reportedUserId
}) => {
  const { user, openAuthModal } = useAuth();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmitting(true);
    try {
      await submitReport({
        reporterId: user.uid,
        reportedUserId,
        videoId,
        commentId,
        reason: `${selectedReason}${details ? `: ${details}` : ''}`
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#12121C] border border-purple-500/25 rounded-3xl p-6 shadow-[0_0_40px_rgba(112,0,255,0.25)] text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white">Report Content</h2>
            <p className="text-[11px] text-[#A5A5B5]">Keep ARAO safe and authentic for everyone</p>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Report Received</h3>
            <p className="text-xs text-[#A5A5B5]">Thank you. Our moderation team will investigate this content.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Select a reason
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                {REPORT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'bg-[#8B00FF]/20 border-[#8B00FF] text-white'
                        : 'bg-[#1A1926] border-white/5 text-[#A5A5B5] hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="accent-[#8B00FF]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe why this content violates community guidelines..."
                rows={2}
                maxLength={200}
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-[#FF1744] hover:opacity-90 text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-40 shadow-md cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
