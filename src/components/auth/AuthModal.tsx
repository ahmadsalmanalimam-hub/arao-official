import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, AtSign, ArrowRight, Loader2, CheckCircle, AlertCircle, Ban, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { submitBanAppeal } from '../../services/supabaseService';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    authMode,
    closeAuthModal,
    openAuthModal,
    login,
    register,
    resetPassword
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Banned state & interactive appeal
  const [bannedInfo, setBannedInfo] = useState<{
    reason: string;
    untilDate: string;
    userId: string;
    username: string;
    email: string;
  } | null>(null);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState(false);

  if (!authModalOpen) return null;

  const handleAppealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealText.trim() || !bannedInfo) return;
    setSubmittingAppeal(true);
    try {
      await submitBanAppeal({
        userId: bannedInfo.userId,
        username: bannedInfo.username,
        email: bannedInfo.email,
        banReason: bannedInfo.reason,
        appealText: appealText.trim()
      });
      setAppealSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit appeal. Try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setBannedInfo(null);
    setShowAppealForm(false);
    setLoading(true);

    try {
      if (authMode === 'login') {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email, password);
      } else if (authMode === 'register') {
        const sysSettings = JSON.parse(localStorage.getItem('arao_system_settings') || '{}');
        if (sysSettings.allowSignups === false && email.toLowerCase() !== 'nasirandco001@gmail.com') {
          throw new Error('New account registrations are temporarily paused by administration.');
        }
        if (!email || !password || !username) {
          throw new Error('Please fill in all required fields.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await register(email, password, username, displayName || username);
        setSuccessMessage('Account created successfully! Check your inbox for verification.');
      } else if (authMode === 'forgot_password') {
        if (!email) {
          throw new Error('Please enter your account email address.');
        }
        await resetPassword(email);
        setSuccessMessage('Password reset link sent to your email.');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'An error occurred during authentication.';
      if (err.message && err.message.includes('You are banned')) {
        msg = err.message;
        setBannedInfo({
          reason: 'Community Guidelines Violation',
          untilDate: 'Forever',
          userId: 'user_banned',
          username: email.split('@')[0],
          email
        });
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleBannedAttempt = (e: any) => {
      if (e.detail) {
        setErrorMessage(e.detail.message || 'You are banned.');
        setBannedInfo({
          reason: e.detail.reason || 'Community Guidelines Violation',
          untilDate: e.detail.untilDate || 'Forever',
          userId: e.detail.userId || 'user_banned',
          username: e.detail.username || 'user',
          email: e.detail.email || ''
        });
      }
    };
    window.addEventListener('arao_user_banned_attempt', handleBannedAttempt);
    return () => window.removeEventListener('arao_user_banned_attempt', handleBannedAttempt);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#12121C] border border-purple-500/25 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(112,0,255,0.3)] text-white">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <h2 className="font-display text-3xl font-black tracking-wider purple-gradient-text uppercase">
            ARAO
          </h2>
          <p className="text-xs text-[#A5A5B5] mt-1 uppercase tracking-widest font-medium">
            {authMode === 'login' && 'Sign in to your account'}
            {authMode === 'register' && 'Join the next-gen creator realm'}
            {authMode === 'forgot_password' && 'Recover your account'}
          </p>
        </div>

        {/* Banned Screen with Interactive Appeal Modal */}
        {bannedInfo ? (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="p-4 bg-red-950/60 border border-red-500/50 rounded-2xl">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-1.5">
                <Ban className="w-5 h-5 shrink-0" />
                <span>Account Suspended</span>
              </div>
              <p className="text-xs text-red-200 leading-relaxed font-mono">
                You are banned. Reason: <span className="font-semibold text-white">{bannedInfo.reason}</span>. Until: <span className="font-semibold text-white">{bannedInfo.untilDate}</span>.
              </p>

              {!showAppealForm && !appealSuccess && (
                <button
                  type="button"
                  onClick={() => setShowAppealForm(true)}
                  className="mt-3.5 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-purple-600 to-[#8A2BE2] hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tap to Appeal</span>
                </button>
              )}
            </div>

            {/* Interactive Ban Appeal Form */}
            {showAppealForm && !appealSuccess && (
              <form onSubmit={handleAppealSubmit} className="p-4 bg-white/5 border border-purple-500/30 rounded-2xl space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">
                    Official Ban Appeal
                  </h4>
                  <span className="text-[10px] text-gray-400 font-mono">@{bannedInfo.username}</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-normal">
                  Provide context or explain why your account ban should be lifted by the ARAO moderation panel:
                </p>
                <textarea
                  rows={3}
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Explain why your ban should be reviewed..."
                  required
                  className="w-full bg-[#1A1926] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submittingAppeal || !appealText.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-[#8A2BE2] hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {submittingAppeal ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Official Appeal</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAppealForm(false)}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {appealSuccess && (
              <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-left flex items-start gap-2.5 animate-fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-300 mb-0.5">Appeal Received</h4>
                  <p className="text-[11px] text-emerald-200">
                    Your appeal has been recorded. The ARAO platform owner will review your submission in the Admin Dashboard.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setBannedInfo(null);
                setErrorMessage('');
                setShowAppealForm(false);
              }}
              className="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            {/* Notifications */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-200 text-left">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-start gap-2 text-xs text-emerald-200 text-left">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Elena Vance"
                        className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Username <span className="text-[#8B00FF]">*</span>
                    </label>
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="unique_handle"
                        className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-[#A5A5B5] mt-1">Letters, numbers, and underscores only</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Email Address <span className="text-[#8B00FF]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
                  />
                </div>
              </div>

              {authMode !== 'forgot_password' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-300">
                      Password <span className="text-[#8B00FF]">*</span>
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => openAuthModal('forgot_password')}
                        className="text-[11px] text-[#D8B4FE] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-purple-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#3900A8] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(139,0,255,0.4)]"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {authMode === 'login' && 'Sign In'}
                      {authMode === 'register' && 'Create Account'}
                      {authMode === 'forgot_password' && 'Send Reset Email'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-[#A5A5B5]">
              {authMode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    onClick={() => openAuthModal('register')}
                    className="text-[#D8B4FE] font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              ) : authMode === 'register' ? (
                <p>
                  Already registered?{' '}
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-[#D8B4FE] font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  Remember your password?{' '}
                  <button
                    onClick={() => openAuthModal('login')}
                    className="text-[#D8B4FE] font-semibold hover:underline"
                  >
                    Back to Sign in
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
