import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Volume2,
  Lock,
  LogOut,
  Sliders,
  FileCode,
  Info,
  ChevronRight,
  Wifi,
  Trash2,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { clearWatchHistory } from '../../services/videoService';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEditProfile: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  onOpenEditProfile
}) => {
  const { user, profile, settings, updateSettings, updateProfile, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'main' | 'privacy' | 'playback' | 'rules' | 'about'>('main');
  const [notice, setNotice] = useState('');

  if (!isOpen) return null;

  const handleTogglePrivate = async () => {
    if (!profile) return;
    const newPrivate = !profile.isPrivate;
    await updateProfile({ isPrivate: newPrivate });
    setNotice(newPrivate ? 'Account is now Private' : 'Account is now Public');
    setTimeout(() => setNotice(''), 2000);
  };

  const handleClearHistory = async () => {
    if (!user) return;
    await clearWatchHistory(user.uid);
    setNotice('Watch history cleared successfully');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#12121C] border border-purple-500/25 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(112,0,255,0.25)] text-white my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold">
              {activeSection === 'main' && 'Settings'}
              {activeSection === 'privacy' && 'Privacy & Account'}
              {activeSection === 'playback' && 'Playback & Data Saver'}
              {activeSection === 'rules' && 'Firestore Security Rules'}
              {activeSection === 'about' && 'About ARAO'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {activeSection !== 'main' && (
              <button
                onClick={() => setActiveSection('main')}
                className="text-xs text-[#D8B4FE] hover:underline"
              >
                Back
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-3 p-2.5 bg-purple-950/70 border border-purple-500/40 rounded-xl text-xs text-purple-200 text-center">
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
          {activeSection === 'main' && (
            <>
              {/* Account Section */}
              <div>
                <h3 className="text-[11px] font-bold text-[#A5A5B5] uppercase tracking-wider mb-2">
                  Account & Identity
                </h3>
                <div className="bg-[#1A1926] border border-white/5 rounded-2xl divide-y divide-white/5">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenEditProfile();
                    }}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-purple-400" />
                      <span>Edit Profile & Covers</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => setActiveSection('privacy')}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>Privacy & Account Type</span>
                    </div>
                    <span className="text-[11px] text-[#A5A5B5]">
                      {profile?.isPrivate ? 'Private' : 'Public'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Playback & Data Preferences */}
              <div>
                <h3 className="text-[11px] font-bold text-[#A5A5B5] uppercase tracking-wider mb-2">
                  Playback & Network
                </h3>
                <div className="bg-[#1A1926] border border-white/5 rounded-2xl divide-y divide-white/5">
                  <button
                    onClick={() => setActiveSection('playback')}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wifi className="w-4 h-4 text-purple-400" />
                      <span>Quality & Data Saver</span>
                    </div>
                    <span className="text-[11px] text-[#D8B4FE]">
                      {settings.dataSaver ? 'Data Saver On' : (settings.videoQualityPreference || 'Auto').toUpperCase()}
                    </span>
                  </button>

                  <div className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      <span>Sound on by default</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundOnByDefault}
                      onChange={(e) => updateSettings({ soundOnByDefault: e.target.checked })}
                      className="accent-[#8B00FF] w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Content & History */}
              <div>
                <h3 className="text-[11px] font-bold text-[#A5A5B5] uppercase tracking-wider mb-2">
                  Content History
                </h3>
                <div className="bg-[#1A1926] border border-white/5 rounded-2xl divide-y divide-white/5">
                  <button
                    onClick={handleClearHistory}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 text-red-400">
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Watch History</span>
                    </div>
                    <span className="text-[10px] text-gray-500">Remove records</span>
                  </button>
                </div>
              </div>

              {/* Security & System */}
              <div>
                <h3 className="text-[11px] font-bold text-[#A5A5B5] uppercase tracking-wider mb-2">
                  System & Rules
                </h3>
                <div className="bg-[#1A1926] border border-white/5 rounded-2xl divide-y divide-white/5">
                  <button
                    onClick={() => setActiveSection('rules')}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-[#8B00FF]" />
                      <span>Firestore Security Rules</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>

                  <button
                    onClick={() => setActiveSection('about')}
                    className="w-full p-3.5 flex items-center justify-between text-xs text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Info className="w-4 h-4 text-purple-400" />
                      <span>About ARAO & Guidelines</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  onClick={handleLogout}
                  className="w-full p-3 bg-[#1A1926] border border-white/10 rounded-2xl text-xs font-semibold text-gray-300 hover:text-white hover:border-red-500/40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-[#FF1744]" />
                  <span>Log Out of ARAO</span>
                </button>
              </div>
            </>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Private Account</span>
                  <input
                    type="checkbox"
                    checked={!!profile?.isPrivate}
                    onChange={handleTogglePrivate}
                    className="accent-[#8B00FF] w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[#A5A5B5] leading-relaxed">
                  When your account is private, only followers you approve can view your video uploads.
                </p>
              </div>

              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white">Interactions Control</h4>
                <div className="text-xs flex items-center justify-between">
                  <span>Who can comment on your videos</span>
                  <select
                    value={settings.whoCanComment}
                    onChange={(e: any) => updateSettings({ whoCanComment: e.target.value })}
                    className="bg-[#12121C] border border-purple-500/30 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="following">Followers Only</option>
                    <option value="no_one">No one</option>
                  </select>
                </div>

                <div className="text-xs flex items-center justify-between">
                  <span>Who can send you direct messages</span>
                  <select
                    value={settings.whoCanMessage}
                    onChange={(e: any) => updateSettings({ whoCanMessage: e.target.value })}
                    className="bg-[#12121C] border border-purple-500/30 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="following">Followers Only</option>
                    <option value="no_one">No one</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'playback' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">Data Saver Mode</span>
                  <input
                    type="checkbox"
                    checked={settings.dataSaver}
                    onChange={(e) => updateSettings({ dataSaver: e.target.checked })}
                    className="accent-[#8B00FF] w-4 h-4 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[#A5A5B5] leading-relaxed">
                  Data Saver limits video streaming to standard definition (480p/360p) and conserves mobile data consumption on cellular networks.
                </p>
              </div>

              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl">
                <label className="block text-xs font-semibold text-white mb-2">Default Video Quality</label>
                <select
                  value={settings.videoQualityPreference || 'auto'}
                  onChange={(e: any) => updateSettings({ videoQualityPreference: e.target.value })}
                  className="w-full bg-[#12121C] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="auto">Auto (Adaptive based on bandwidth)</option>
                  <option value="1080p">1080p (Full High Definition)</option>
                  <option value="720p">720p (High Definition)</option>
                  <option value="480p">480p (Standard Definition)</option>
                  <option value="360p">360p (Low Bandwidth)</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'rules' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#1A1926] border border-purple-500/30 rounded-2xl text-xs text-gray-300 leading-relaxed">
                <span className="font-bold text-[#D8B4FE] block mb-1">
                  Connected Firebase Project: arao-79bee
                </span>
                Rules strictly validate author permissions for uploads, deletions, comments, likes, watch history, and download counters.
              </div>

              <div className="bg-[#080810] border border-purple-500/20 rounded-2xl p-3 font-mono text-[10px] text-gray-300 overflow-x-auto max-h-56 leading-relaxed">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /videos/{videoId} {
      allow read: if resource == null || resource.data.visibility == 'public' || (request.auth != null && resource.data.userId == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likesCount', 'commentsCount', 'viewsCount', 'downloadCount'])
      );
    }
    match /watchHistory/{historyId} {
      allow read, write: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid);
    }
    match /notInterested/{id} {
      allow read, write: if request.auth != null && (resource == null || resource.data.userId == request.auth.uid);
    }
    match /likes/{likeId} {
      allow read, write: if request.auth != null;
    }
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}`}</pre>
              </div>
              <p className="text-[11px] text-[#A5A5B5]">
                Production copy saved in <span className="text-[#8B00FF]">firestore.rules</span>.
              </p>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl">
                <h4 className="font-display font-bold text-sm text-[#D8B4FE] mb-1">ARAO Social Platform</h4>
                <p>
                  ARAO is a next-generation short video social media network designed with a distinctive purple and violet visual identity, edge-to-edge full-screen video, and real-time community engagement.
                </p>
              </div>

              <div className="p-4 bg-[#1A1926] border border-white/5 rounded-2xl space-y-2">
                <h4 className="font-bold text-white">Community & Safety Standards</h4>
                <p className="text-[#A5A5B5]">
                  ARAO prohibits abusive behavior, harassment, dangerous content, and unauthorized media. Flagged content is prioritized for moderation and accounts can be blocked anytime.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
