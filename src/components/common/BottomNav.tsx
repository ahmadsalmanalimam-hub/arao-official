import React from 'react';
import { Home, Compass, Plus, MessageCircle, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType = 'home' | 'explore' | 'upload' | 'inbox' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  unreadCount = 0
}) => {
  const { profile } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080810]/95 backdrop-blur-lg border-t border-purple-500/15 px-3 py-1.5 max-w-lg mx-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 group ${
            currentTab === 'home' ? 'text-[#8B00FF]' : 'text-gray-400 hover:text-white'
          }`}
          aria-label="Home Feed"
        >
          <Home className={`w-6 h-6 transition-transform duration-200 ${currentTab === 'home' ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-medium tracking-wide mt-1">Home</span>
        </button>

        {/* Explore */}
        <button
          onClick={() => onTabChange('explore')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 group ${
            currentTab === 'explore' ? 'text-[#8B00FF]' : 'text-gray-400 hover:text-white'
          }`}
          aria-label="Explore and Search"
        >
          <Compass className={`w-6 h-6 transition-transform duration-200 ${currentTab === 'explore' ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-medium tracking-wide mt-1">Explore</span>
        </button>

        {/* Purple-to-Red Gradient Create (+) Button */}
        <button
          onClick={() => onTabChange('upload')}
          className="relative flex items-center justify-center group -mt-4 cursor-pointer"
          aria-label="Create Video"
        >
          <div className="w-12 h-11 rounded-xl bg-gradient-to-tr from-[#7000FF] via-[#8B00FF] to-[#FF1744] p-[1.5px] shadow-[0_0_20px_rgba(139,0,255,0.45)] transition-all duration-200 group-hover:scale-105 group-active:scale-95">
            <div className="w-full h-full bg-[#080810] rounded-[10px] flex items-center justify-center">
              <Plus className="w-6 h-6 text-white stroke-[2.8]" />
            </div>
          </div>
        </button>

        {/* Inbox with notification badge */}
        <button
          onClick={() => onTabChange('inbox')}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 group ${
            currentTab === 'inbox' ? 'text-[#8B00FF]' : 'text-gray-400 hover:text-white'
          }`}
          aria-label="Inbox & Notifications"
        >
          <div className="relative">
            <MessageCircle className={`w-6 h-6 transition-transform duration-200 ${currentTab === 'inbox' ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 bg-[#FF1744] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border border-black animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-wide mt-1">Inbox</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 transition-all duration-200 group ${
            currentTab === 'profile' ? 'text-[#8B00FF]' : 'text-gray-400 hover:text-white'
          }`}
          aria-label="User Profile"
        >
          {profile?.avatar ? (
            <div className={`w-6 h-6 rounded-full overflow-hidden border ${currentTab === 'profile' ? 'border-[#8B00FF] ring-2 ring-[#8B00FF]/50' : 'border-white/20'}`}>
              <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
            </div>
          ) : (
            <UserIcon className={`w-6 h-6 transition-transform duration-200 ${currentTab === 'profile' ? 'scale-110 stroke-[2.5]' : 'stroke-2'}`} />
          )}
          <span className="text-[10px] font-medium tracking-wide mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
};
