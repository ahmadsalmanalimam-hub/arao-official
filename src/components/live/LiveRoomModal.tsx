import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  Eye,
  Heart,
  Send,
  Gift,
  Sparkles,
  Volume2,
  VolumeX,
  Share2,
  Coins
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LiveMessage {
  id: string;
  username: string;
  avatar: string;
  text: string;
  isGift?: boolean;
  giftName?: string;
}

interface LiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveRoomModal: React.FC<LiveRoomModalProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth();

  const [viewerCount, setViewerCount] = useState(1420);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<LiveMessage[]>([
    { id: '1', username: 'amara_style', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&q=80', text: 'This mix is pure fire! 🔥🔥' },
    { id: '2', username: 'cyberpulse', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', text: 'Sound system check in Lagos! ⚡' },
    { id: '3', username: 'chidi_director', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80', text: 'Lighting is incredible tonight 👏' }
  ]);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [giftToast, setGiftToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Simulate fluctuating viewer count
    const viewerInterval = setInterval(() => {
      setViewerCount((prev) => prev + Math.floor(Math.random() * 7) - 3);
    }, 3000);

    // Auto-scroll messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    return () => clearInterval(viewerInterval);
  }, [isOpen, messages]);

  const handleSendHeart = () => {
    const id = Date.now();
    const left = 70 + Math.random() * 20;
    setFloatingHearts((prev) => [...prev, { id, left }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: LiveMessage = {
      id: Date.now().toString(),
      username: profile?.username || 'you',
      avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
      text: inputText.trim()
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
  };

  const handleSendGift = (giftName: string, coinCost: number) => {
    setGiftToast(`Sent ${giftName} (${coinCost} coins) to Creator! 🎁`);
    setShowGiftDrawer(false);

    const giftMsg: LiveMessage = {
      id: Date.now().toString(),
      username: profile?.username || 'you',
      avatar: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80',
      text: `sent ${giftName}! ✨`,
      isGift: true,
      giftName
    };

    setMessages((prev) => [...prev, giftMsg]);
    setTimeout(() => setGiftToast(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in select-none">
      <div className="relative w-full max-w-md h-full max-h-[100dvh] bg-[#0A0912] flex flex-col justify-between overflow-hidden">
        {/* Live Stream Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            src="https://assets.mixkit.co/videos/preview/mixkit-close-up-of-a-dj-mixing-music-at-a-party-42416-large.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
        </div>

        {/* Top Live Bar */}
        <div className="relative z-20 flex items-center justify-between p-4 pt-6">
          <div className="flex items-center gap-2 p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-purple-500/30">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"
              alt="dj_violet"
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="pr-2">
              <span className="text-xs font-bold text-white block">@dj_violet</span>
              <span className="text-[10px] text-purple-300 font-mono flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-red-500 animate-pulse" />
                <span>ARAO Live</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewer Count Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-mono">
              <Eye className="w-3.5 h-3.5 text-red-400" />
              <span>{viewerCount.toLocaleString()}</span>
            </div>

            {/* Mute toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gift Toast Banner */}
        {giftToast && (
          <div className="relative z-30 mx-4 p-2.5 rounded-xl bg-gradient-to-r from-purple-900 to-pink-900 border border-purple-400 text-xs font-bold text-white text-center shadow-xl animate-bounce">
            {giftToast}
          </div>
        )}

        {/* Floating Heart Animations */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            style={{ right: `${h.left}%` }}
            className="absolute bottom-24 z-30 pointer-events-none animate-float-up text-[#FF1744]"
          >
            <Heart className="w-7 h-7 fill-[#FF1744] drop-shadow-[0_0_10px_rgba(255,23,68,0.8)]" />
          </div>
        ))}

        {/* Live Comments Stream & Action Bar */}
        <div className="relative z-20 p-4 space-y-3">
          {/* Messages Container */}
          <div className="h-44 overflow-y-auto no-scrollbar space-y-2 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 p-1.5 rounded-xl text-xs backdrop-blur-xs max-w-[85%] ${
                  msg.isGift
                    ? 'bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-purple-500/40 text-purple-200'
                    : 'bg-black/50 text-white border border-white/5'
                }`}
              >
                <img src={msg.avatar} alt={msg.username} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-purple-300 mr-1.5">@{msg.username}:</span>
                  <span className="text-gray-200 break-words">{msg.text}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Interactive Controls */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSendMessage} className="flex-1 flex items-center bg-black/60 border border-white/15 rounded-full px-3 py-1.5 backdrop-blur-md">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Say something nice..."
                className="w-full bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none"
              />
              <button type="submit" disabled={!inputText.trim()} className="text-purple-400 hover:text-white disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Gift Button */}
            <button
              onClick={() => setShowGiftDrawer(!showGiftDrawer)}
              className="p-2.5 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] text-white hover:scale-105 active:scale-95 shadow-md"
              title="Send virtual gift"
            >
              <Gift className="w-5 h-5" />
            </button>

            {/* Like Heart Trigger */}
            <button
              onClick={handleSendHeart}
              className="p-2.5 rounded-full bg-black/60 border border-red-500/30 text-white hover:scale-110 active:scale-90"
              title="Send hearts"
            >
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            </button>
          </div>
        </div>

        {/* Virtual Gifts Sheet */}
        {showGiftDrawer && (
          <div className="relative z-40 p-4 bg-[#12121C] border-t border-purple-500/30 rounded-t-3xl animate-fade-in text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold flex items-center gap-1.5 text-purple-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Send Creator Gift</span>
              </span>
              <button onClick={() => setShowGiftDrawer(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { name: 'Rose', icon: '🌹', coins: 10 },
                { name: 'Crown', icon: '👑', coins: 100 },
                { name: 'Lion', icon: '🦁', coins: 500 },
                { name: 'Supercar', icon: '🏎️', coins: 1000 }
              ].map((g) => (
                <button
                  key={g.name}
                  onClick={() => handleSendGift(g.name, g.coins)}
                  className="p-2.5 rounded-2xl bg-[#1A1926] hover:bg-purple-950/60 border border-white/10 hover:border-purple-500 flex flex-col items-center gap-1 active:scale-95 transition-all cursor-pointer"
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span className="font-semibold text-white text-[11px]">{g.name}</span>
                  <span className="text-[10px] text-amber-400 font-mono">{g.coins} coins</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
