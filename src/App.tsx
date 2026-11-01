/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav, TabType } from './components/common/BottomNav';
import { VideoFeed } from './components/feed/VideoFeed';
import { ExplorePage } from './components/explore/ExplorePage';
import { InboxPage } from './components/inbox/InboxPage';
import { ProfilePage } from './components/profile/ProfilePage';
import { UploadModal } from './components/upload/UploadModal';
import { CommentSheet } from './components/comments/CommentSheet';
import { ShareSheet } from './components/share/ShareSheet';
import { AuthModal } from './components/auth/AuthModal';
import { ReportModal } from './components/common/ReportModal';
import { MonetizationModal } from './components/monetization/MonetizationModal';
import { AdminPage } from './pages/Admin';
import { getSystemSettings, SUPER_ADMIN_EMAIL } from './services/adminService';
import { VideoItem, SystemSettings } from './types';
import { getVideoById } from './services/videoService';
import { getUserNotifications } from './services/notificationService';
import { VideoCard } from './components/video/VideoCard';
import { X, AlertTriangle } from 'lucide-react';

function AraoMain() {
  const { user, openAuthModal, settings, updateSettings } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [viewingProfileUid, setViewingProfileUid] = useState<string | null>(null);

  // Modal states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [monetizationOpen, setMonetizationOpen] = useState(false);
  const [monetizationTab, setMonetizationTab] = useState<'earnings' | 'ads' | 'premium' | 'admin'>('earnings');
  const [activeCommentVideo, setActiveCommentVideo] = useState<VideoItem | null>(null);
  const [activeShareVideo, setActiveShareVideo] = useState<VideoItem | null>(null);
  const [reportState, setReportState] = useState<{
    open: boolean;
    videoId?: string;
    commentId?: string;
    reportedUserId?: string;
  }>({ open: false });

  // Single shared video modal viewer (for shared URL or grid clicks)
  const [focusedVideo, setFocusedVideo] = useState<VideoItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Super Admin /admin route state
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === '/admin' ||
      window.location.pathname.startsWith('/admin') ||
      window.location.search.includes('admin') ||
      window.location.hash === '#/admin'
    );
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const checkRoute = () => {
      setIsAdminRoute(
        window.location.pathname === '/admin' ||
        window.location.pathname.startsWith('/admin') ||
        window.location.search.includes('admin') ||
        window.location.hash === '#/admin'
      );
    };
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  useEffect(() => {
    getSystemSettings().then(setSystemSettings);
    const handleSettingsChange = (e: any) => {
      if (e.detail) setSystemSettings(e.detail);
    };
    window.addEventListener('arao_system_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('arao_system_settings_changed', handleSettingsChange);
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
  };

  // Check URL query parameters for deep links, e.g. ?video=ID or ?profile=USERNAME
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoParam = urlParams.get('video');
    if (videoParam) {
      getVideoById(videoParam).then((v) => {
        if (v) setFocusedVideo(v);
      });
    }
  }, []);

  // Poll unread notifications periodically if logged in
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const checkUnread = async () => {
      try {
        const notifs = await getUserNotifications(user.uid, 20);
        const unread = notifs.filter((n) => !n.read).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error(err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleTabChange = (tab: TabType) => {
    if (tab === 'upload') {
      if (!user) {
        openAuthModal('login');
        return;
      }
      if (
        systemSettings &&
        !systemSettings.allowUploads &&
        user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
      ) {
        alert('Video uploads are temporarily paused for maintenance.');
        return;
      }
      setUploadOpen(true);
      return;
    }

    if (tab === 'profile') {
      setViewingProfileUid(null);
    }

    setFocusedVideo(null);
    setCurrentTab(tab);
  };

  const handleOpenProfile = (userId: string) => {
    setFocusedVideo(null);
    setActiveCommentVideo(null);
    setActiveShareVideo(null);
    setViewingProfileUid(userId);
    setCurrentTab('profile');
  };

  const handleOpenVideo = async (videoId: string) => {
    const v = await getVideoById(videoId);
    if (v) {
      setFocusedVideo(v);
    }
  };

  const handleOpenReport = (videoId?: string, reportedUserId?: string, commentId?: string) => {
    setReportState({
      open: true,
      videoId,
      reportedUserId,
      commentId
    });
  };

  // Render Admin Dashboard on /admin route
  if (isAdminRoute) {
    return <AdminPage onNavigateHome={navigateToHome} />;
  }

  // Full-Screen Maintenance Screen if App Paused by Owner
  if (
    systemSettings?.isAppPaused &&
    user?.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()
  ) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#080810] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 mb-4 animate-pulse">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white tracking-wide">ARAO IS UPGRADING</h2>
        <p className="text-sm text-[#A5A5B5] max-w-sm mt-2 leading-relaxed">
          {systemSettings.maintenanceMessage || 'ARAO is upgrading... back soon'}
        </p>
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="py-2.5 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs"
          >
            Check Again
          </button>
          <button
            onClick={navigateToAdmin}
            className="py-2.5 px-6 rounded-xl bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/40 text-[#C4B5FD] font-semibold text-xs"
          >
            Owner Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#080810] text-white font-sans overflow-x-hidden">
      {/* Main View Area */}
      <main className="w-full h-full">
        {currentTab === 'home' && (
          <VideoFeed
            onOpenComments={(v) => setActiveCommentVideo(v)}
            onOpenShare={(v) => setActiveShareVideo(v)}
            onOpenProfile={handleOpenProfile}
            onOpenReport={(vId, uId) => handleOpenReport(vId, uId)}
            onOpenSearch={() => setCurrentTab('explore')}
            onOpenMonetization={(tab) => {
              setMonetizationTab(tab || 'earnings');
              setMonetizationOpen(true);
            }}
          />
        )}

        {currentTab === 'explore' && (
          <ExplorePage
            onSelectVideo={(v) => setFocusedVideo(v)}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {currentTab === 'inbox' && (
          <InboxPage
            onOpenVideo={handleOpenVideo}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage
            viewUserId={viewingProfileUid || undefined}
            onSelectVideo={(v) => setFocusedVideo(v)}
            onOpenMonetization={(tab) => {
              setMonetizationTab(tab || 'earnings');
              setMonetizationOpen(true);
            }}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
      />

      {/* Dedicated Video Player Modal (for clicking video in Explore/Profile or shared links) */}
      {focusedVideo && (
        <div className="fixed inset-0 z-50 bg-[#080810] flex items-center justify-center animate-fade-in">
          <button
            onClick={() => setFocusedVideo(null)}
            className="absolute top-4 left-4 z-40 p-2.5 rounded-full bg-black/60 text-white hover:text-[#8B00FF] border border-white/10 backdrop-blur-md cursor-pointer"
            aria-label="Close video"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-full h-full max-w-md mx-auto">
            <VideoCard
              video={focusedVideo}
              isActive={true}
              onOpenComments={(v) => setActiveCommentVideo(v)}
              onOpenShare={(v) => setActiveShareVideo(v)}
              onOpenProfile={handleOpenProfile}
              onOpenReport={(vId, uId) => handleOpenReport(vId, uId)}
              soundEnabled={settings.soundOnByDefault}
              onToggleSound={() => updateSettings({ soundOnByDefault: !settings.soundOnByDefault })}
            />
          </div>
        </div>
      )}

      {/* Upload Video Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={() => {
          setCurrentTab('home');
        }}
      />

      {/* Comments Bottom Sheet */}
      <CommentSheet
        video={activeCommentVideo}
        onClose={() => setActiveCommentVideo(null)}
        onOpenProfile={handleOpenProfile}
        onOpenReport={(cId) => handleOpenReport(undefined, undefined, cId)}
      />

      {/* Share Sheet */}
      <ShareSheet
        video={activeShareVideo}
        onClose={() => setActiveShareVideo(null)}
        onOpenReport={(vId, uId) => handleOpenReport(vId, uId)}
      />

      {/* Content Reporting Modal */}
      <ReportModal
        isOpen={reportState.open}
        onClose={() => setReportState({ open: false })}
        videoId={reportState.videoId}
        commentId={reportState.commentId}
        reportedUserId={reportState.reportedUserId}
      />

      {/* Monetization & Advertising Hub Modal */}
      <MonetizationModal
        isOpen={monetizationOpen}
        defaultTab={monetizationTab}
        onClose={() => setMonetizationOpen(false)}
      />

      {/* Auth Modal (Login / Register / Forgot Password) */}
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AraoMain />
    </AuthProvider>
  );
}
