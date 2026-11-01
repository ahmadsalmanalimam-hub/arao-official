import React from 'react';
import {
  X,
  Sparkles,
  Laugh,
  Music,
  Trophy,
  Gamepad2,
  GraduationCap,
  Newspaper,
  Shirt,
  Clapperboard,
  Cpu,
  Compass,
  Utensils,
  Plane,
  Briefcase,
  Atom,
  Film,
  Check
} from 'lucide-react';
import { VideoCategory } from '../../types';

export interface CategoryOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const CATEGORIES_LIST: CategoryOption[] = [
  { id: 'comedy', label: 'Comedy', icon: <Laugh className="w-5 h-5 text-amber-400" />, description: 'Skits, stand-up & laughs' },
  { id: 'music', label: 'Music', icon: <Music className="w-5 h-5 text-rose-400" />, description: 'Tracks, beats & releases' },
  { id: 'nollywood', label: 'Nollywood', icon: <Clapperboard className="w-5 h-5 text-emerald-400" />, description: 'Cinema, drama & stars' },
  { id: 'fashion', label: 'Fashion', icon: <Shirt className="w-5 h-5 text-fuchsia-400" />, description: 'Style, streetwear & luxury' },
  { id: 'technology', label: 'Technology', icon: <Cpu className="w-5 h-5 text-cyan-400" />, description: 'Gadgets, AI & innovations' },
  { id: 'sports', label: 'Sports', icon: <Trophy className="w-5 h-5 text-yellow-400" />, description: 'Highlights, matches & goals' },
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 className="w-5 h-5 text-indigo-400" />, description: 'Clips, streams & esports' },
  { id: 'lifestyle', label: 'Lifestyle', icon: <Compass className="w-5 h-5 text-teal-400" />, description: 'Daily routines & wellness' },
  { id: 'food', label: 'Food', icon: <Utensils className="w-5 h-5 text-orange-400" />, description: 'Recipes & street cuisine' },
  { id: 'travel', label: 'Travel', icon: <Plane className="w-5 h-5 text-sky-400" />, description: 'Exploration & destinations' },
  { id: 'education', label: 'Education', icon: <GraduationCap className="w-5 h-5 text-blue-400" />, description: 'Quick facts, skills & tips' },
  { id: 'news', label: 'News', icon: <Newspaper className="w-5 h-5 text-red-400" />, description: 'Global updates & headlines' },
  { id: 'business', label: 'Business', icon: <Briefcase className="w-5 h-5 text-emerald-300" />, description: 'Finance, careers & startups' },
  { id: 'science', label: 'Science', icon: <Atom className="w-5 h-5 text-purple-400" />, description: 'Cosmos, physics & discoveries' },
  { id: 'entertainment', label: 'Entertainment', icon: <Film className="w-5 h-5 text-pink-400" />, description: 'Celebrity, trailers & shows' }
];

interface CategoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryPanel: React.FC<CategoryPanelProps> = ({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
      {/* Tap backdrop to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-up Container */}
      <div className="relative w-full max-w-lg mx-auto bg-[#12121C] border-t border-purple-500/20 rounded-t-3xl max-h-[80vh] flex flex-col text-white shadow-[0_-10px_40px_rgba(112,0,255,0.2)]">
        {/* Grab Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#8B00FF] animate-pulse" />
            <h3 className="font-display font-bold text-base text-white tracking-wide">
              Explore Video Categories
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          <p className="text-xs text-[#A5A5B5] mb-3 px-1">
            Choose a genre to stream dedicated community uploads:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {CATEGORIES_LIST.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#8B00FF]/25 to-[#7000FF]/10 border-[#8B00FF] shadow-[0_0_15px_rgba(139,0,255,0.3)] ring-1 ring-[#8B00FF]'
                      : 'bg-[#1A1926] border-white/5 hover:border-purple-500/30 hover:bg-[#201F30]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="p-2 rounded-xl bg-black/40 border border-white/10 group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#8B00FF] flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {cat.label}
                    </h4>
                    <p className="text-[10px] text-[#A5A5B5] line-clamp-1 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset to For You Footer */}
        <div className="p-3 border-t border-white/5 bg-[#0D0D15] flex justify-between items-center text-xs">
          <span className="text-[#A5A5B5]">Currently Viewing:</span>
          <button
            onClick={() => {
              onSelectCategory('for_you');
              onClose();
            }}
            className="text-[#8B00FF] font-semibold hover:underline"
          >
            Reset to For You Feed
          </button>
        </div>
      </div>
    </div>
  );
};
