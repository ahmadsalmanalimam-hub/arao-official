import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Music,
  RefreshCw,
  Zap,
  Clock,
  Sparkles,
  Camera,
  Upload,
  Loader2,
  Plus,
  Radio,
  ArrowLeft,
  Send,
  Gift,
  Heart,
  Eye,
  Check,
  Share2,
  Smile,
  Volume2,
  VolumeX,
  Compass
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { publishVideo } from '../../services/videoService';
import { supabase } from '../../lib/supabase';
import {
  uploadStoryMedia,
  createStory,
  startLiveStream,
  endLiveStream,
  UserLiveRecord
} from '../../services/storyService';
import { VIRTUAL_GIFTS, sendVirtualGift, VirtualGift } from '../../services/giftingService';

interface CameraPageProps {
  onClose: () => void;
}

interface CapturedMedia {
  type: 'photo' | 'video';
  url: string;
  blob?: Blob;
  file?: File;
}

interface LiveChatMessage {
  id: string;
  username: string;
  text: string;
  isGift?: boolean;
  giftName?: string;
}

const TRENDING_SOUNDS = [
  { id: '1', title: 'ARAO Ultraviolet Vibe', artist: 'Elena Thorne', duration: '0:30' },
  { id: '2', title: 'Lagos Afrobeat Wave', artist: 'Burna Rhythm', duration: '0:45' },
  { id: '3', title: 'Tokyo Neon Midnight', artist: 'Marcus Vance', duration: '0:60' },
  { id: '4', title: 'Amapiano Groove 2026', artist: 'Kabza Beat', duration: '0:30' },
  { id: '5', title: 'Smooth Chill Hop Rhythms', artist: 'ARAO Lofi', duration: '0:45' }
];

export const CameraPage: React.FC<CameraPageProps> = ({ onClose }) => {
  const { user, profile } = useAuth();

  // Mode and Camera states
  const [creationMode, setCreationMode] = useState<'10m' | '60s' | '15s' | 'photo' | 'text' | 'story'>('photo');
  const [permissionState, setPermissionState] = useState<'initial' | 'prompt' | 'granted' | 'denied'>('initial');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashOn, setFlashOn] = useState(false);
  const [filter, setFilter] = useState('none');
  const [timerDuration, setTimerDuration] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sound Picker State
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [selectedSound, setSelectedSound] = useState<string | null>(null);

  // Review / Captured Media State
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const [postCaption, setPostCaption] = useState('');

  // Go LIVE State
  const [isLiveStudioOpen, setIsLiveStudioOpen] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [currentLiveSession, setCurrentLiveSession] = useState<UserLiveRecord | null>(null);
  const [liveMessages, setLiveMessages] = useState<LiveChatMessage[]>([]);
  const [liveChatInput, setLiveChatInput] = useState('');
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; left: number }[]>([]);
  const [showGiftSheet, setShowGiftSheet] = useState(false);
  const [liveEarnedCoins, setLiveEarnedCoins] = useState(0);
  const [liveEarnedNaira, setLiveEarnedNaira] = useState(0);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<{
    icon: string;
    name: string;
    coins: number;
    naira: number;
    sender: string;
  } | null>(null);
  const [liveSummary, setLiveSummary] = useState<{ viewers: number; seconds: number; coins: number; naira: number } | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const liveTimerRef = useRef<any>(null);
  const viewerIntervalRef = useRef<any>(null);
  const chatIntervalRef = useRef<any>(null);
  const giftIntervalRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Camera Initialization
  const initCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setPermissionState('prompt');
      setDiagnosticError(null);

      // Check permission API if supported
      if (navigator.permissions && (navigator.permissions as any).query) {
        try {
          const result = await (navigator.permissions as any).query({ name: 'camera' });
          if (result.state === 'denied') {
            setPermissionState('denied');
            return;
          }
        } catch (e) {
          console.warn('Permission API check failed, proceeding to getUserMedia');
        }
      }

      // Cleanup existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (err) {
        console.warn('Video+Audio failed, trying Video-only:', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      setPermissionState('granted');
      setFacingMode(mode);
    } catch (err) {
      console.error('Camera error:', err);
      setPermissionState('denied');
      if (window.self !== window.top) {
        setDiagnosticError('iframe-restriction');
      }
    }
  };

  useEffect(() => {
    if (navigator.permissions && (navigator.permissions as any).query) {
      (navigator.permissions as any).query({ name: 'camera' }).then((result: any) => {
        if (result.state === 'granted') {
          initCamera();
        }
      });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      clearInterval(recordingTimerRef.current);
      clearInterval(liveTimerRef.current);
      clearInterval(viewerIntervalRef.current);
      clearInterval(chatIntervalRef.current);
    };
  }, []);

  // Update live stream video ref if stream changes
  useEffect(() => {
    if (isLiveStudioOpen && streamRef.current && liveVideoRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
    }
  }, [isLiveStudioOpen]);

  // Flip Camera
  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    initCamera(nextMode);
  };

  // Toggle Flash
  const toggleFlash = async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      try {
        // @ts-ignore
        await videoTrack.applyConstraints({ advanced: [{ torch: !flashOn }] });
        setFlashOn(!flashOn);
      } catch (e) {
        showToast('Flash/Torch not supported on this device');
      }
    }
  };

  // Photo Capture
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 720;
    canvas.height = videoRef.current.videoHeight || 1280;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (filter && filter !== 'none') {
      ctx.filter = filter;
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const previewUrl = URL.createObjectURL(blob);
        setCapturedMedia({
          type: 'photo',
          url: previewUrl,
          blob
        });
      }
    }, 'image/jpeg', 0.95);
  };

  // Start Video Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    setIsRecording(true);
    setRecordingSeconds(0);

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm')) {
      mimeType = 'video/webm';
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(blob);
        setCapturedMedia({
          type: 'video',
          url: previewUrl,
          blob
        });
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;

      // Recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      showToast('Could not record video on this browser');
      setIsRecording(false);
    }
  };

  // Stop Video Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  // Handle Shutter Trigger with Countdown Timer
  const handleCaptureClick = () => {
    if (countdown !== null) return;

    if (timerDuration > 0) {
      let timeLeft = timerDuration;
      setCountdown(timeLeft);
      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft <= 0) {
          clearInterval(interval);
          setCountdown(null);
          executeCaptureAction();
        } else {
          setCountdown(timeLeft);
        }
      }, 1000);
    } else {
      executeCaptureAction();
    }
  };

  const executeCaptureAction = () => {
    if (creationMode === 'photo' || creationMode === 'story') {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  // Handle File Pick from Gallery (Videos & Photos)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    const previewUrl = URL.createObjectURL(file);
    setCapturedMedia({
      type: isVideo ? 'video' : 'photo',
      url: previewUrl,
      file,
      blob: file
    });
  };

  // Discard captured media
  const handleDiscardMedia = () => {
    if (capturedMedia) {
      URL.revokeObjectURL(capturedMedia.url);
      setCapturedMedia(null);
    }
  };

  // 1. Post to Feed
  const handlePostToFeed = async () => {
    if (!capturedMedia || !user) {
      showToast('Please log in to post');
      return;
    }

    setUploading(true);
    setUploadProgressText('Publishing to ARAO Feed...');

    try {
      const isVideo = capturedMedia.type === 'video';
      const bucket = isVideo ? 'reels' : 'photos';
      const ext = isVideo ? 'mp4' : 'jpg';
      const filePath = `${user.uid}/${Date.now()}_feed.${ext}`;

      let mediaUrl = capturedMedia.url;

      // Upload to Supabase Storage if blob exists
      if (capturedMedia.blob) {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, capturedMedia.blob, { upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
          if (publicData?.publicUrl) mediaUrl = publicData.publicUrl;
        }
      }

      await publishVideo({
        videoUrl: mediaUrl,
        cloudinaryPublicId: filePath,
        userId: user.uid,
        username: profile?.username || 'user',
        userDisplayName: profile?.displayName,
        userAvatar: profile?.avatar,
        caption: postCaption.trim() || 'Created with ARAO Camera ✨ #arao',
        visibility: 'public',
        soundTitle: selectedSound || undefined,
        postType: isVideo ? 'video' : 'photo_single',
        mediaType: isVideo ? 'video' : 'photo'
      });

      showToast('🎉 Posted to ARAO Feed!');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Post to feed error:', err);
      showToast('Failed to post: ' + (err.message || 'Error'));
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  // 2. Post to 24h Story
  const handlePostToStory = async () => {
    if (!capturedMedia || !user) {
      showToast('Please log in to post a story');
      return;
    }

    setUploading(true);
    setUploadProgressText('Uploading to 24h Story...');

    try {
      const mediaType = capturedMedia.type === 'video' ? 'video' : 'image';
      let uploadedUrl = capturedMedia.url;

      if (capturedMedia.blob) {
        uploadedUrl = await uploadStoryMedia(capturedMedia.blob, user.uid, mediaType);
      }

      await createStory({
        userId: user.uid,
        username: profile?.username || 'user',
        userAvatar: profile?.avatar,
        displayName: profile?.displayName,
        mediaUrl: uploadedUrl,
        mediaType,
        caption: postCaption.trim() || '24h Story'
      });

      showToast('✨ Added to Story! (Active for 24h)');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Post to story error:', err);
      showToast('Story error: ' + (err.message || 'Error'));
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  };

  // 3. Switch to Go LIVE Studio
  const handleOpenLiveStudio = () => {
    if (!user) {
      showToast('Please sign in to Go LIVE');
      return;
    }
    handleDiscardMedia();
    setIsLiveStudioOpen(true);
    setIsLiveActive(false);
    setLiveViewerCount(0);
    setLiveSeconds(0);
    setLiveSummary(null);
  };

  // Start Live Session
  const handleStartLive = async () => {
    if (!user) return;
    setUploading(true);
    try {
      const liveSession = await startLiveStream({
        userId: user.uid,
        username: profile?.username || 'user',
        userAvatar: profile?.avatar,
        title: liveTitle.trim() || `${profile?.username || 'User'}'s Live Studio`
      });

      setCurrentLiveSession(liveSession);
      setIsLiveActive(true);
      setLiveViewerCount(1);
      setLiveSeconds(0);

      // Start duration timer
      liveTimerRef.current = setInterval(() => {
        setLiveSeconds((prev) => prev + 1);
      }, 1000);

      // Viewer simulation: gradually increases
      viewerIntervalRef.current = setInterval(() => {
        setLiveViewerCount((prev) => prev + Math.floor(Math.random() * 4) + 1);
      }, 4000);

      // Community chat simulation
      const sampleNames = ['amara_style', 'cyberpulse', 'chidi_director', 'dj_violet', 'zainab_k', 'eko_beats'];
      const sampleTexts = [
        'Pure energy in Lagos tonight! 🔥',
        'Sound and camera quality is crisp! ⚡',
        'What track is that playing?',
        'Big love from Abuja! 💜',
        'Shared to my friends!',
        'Let’s go!! ✨'
      ];

      chatIntervalRef.current = setInterval(() => {
        const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        setLiveMessages((prev) => [
          ...prev.slice(-12),
          { id: Date.now().toString(), username: randomName, text: randomText }
        ]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 3500);

      // Automated viewer virtual gifting simulation every 7 seconds
      giftIntervalRef.current = setInterval(() => {
        const giftList = VIRTUAL_GIFTS.slice(0, 4);
        const randomGift = giftList[Math.floor(Math.random() * giftList.length)];
        const randomSender = sampleNames[Math.floor(Math.random() * sampleNames.length)];

        setLiveEarnedCoins((prev) => prev + randomGift.coins);
        setLiveEarnedNaira((prev) => prev + randomGift.nairaValue);

        setLiveMessages((prev) => [
          ...prev.slice(-12),
          {
            id: Date.now().toString(),
            username: randomSender,
            text: `sent ${randomGift.name} ${randomGift.icon}! (+${randomGift.coins} coins / ₦${randomGift.nairaValue})`,
            isGift: true,
            giftName: randomGift.name
          }
        ]);

        setActiveGiftAnimation({
          icon: randomGift.icon,
          name: randomGift.name,
          coins: randomGift.coins,
          naira: randomGift.nairaValue,
          sender: randomSender
        });
        setTimeout(() => setActiveGiftAnimation(null), 2400);

        for (let i = 0; i < 3; i++) {
          setTimeout(handleSendHeart, i * 150);
        }
      }, 7000);

      showToast('🔴 You are now LIVE on ARAO!');
    } catch (err: any) {
      console.error('Start live error:', err);
      showToast('Could not start live: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // End Live Session
  const handleEndLive = async () => {
    if (currentLiveSession && user) {
      await endLiveStream(currentLiveSession.id, user.uid);
    }

    clearInterval(liveTimerRef.current);
    clearInterval(viewerIntervalRef.current);
    clearInterval(chatIntervalRef.current);
    clearInterval(giftIntervalRef.current);

    setLiveSummary({
      viewers: Math.max(liveViewerCount, 12),
      seconds: liveSeconds,
      coins: liveEarnedCoins,
      naira: liveEarnedNaira
    });
    setIsLiveActive(false);
  };

  // Send Chat message during Live
  const handleSendLiveMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveChatInput.trim()) return;

    setLiveMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        username: profile?.username || 'You',
        text: liveChatInput.trim()
      }
    ]);
    setLiveChatInput('');
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send Floating Heart Reaction
  const handleSendHeart = () => {
    const id = Date.now();
    const left = 60 + Math.random() * 30;
    setFloatingHearts((prev) => [...prev, { id, left }]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 1800);
  };

  // Send Gift during live - increments creator balance and triggers interactive animation
  const handleSendGift = async (gift: VirtualGift) => {
    setShowGiftSheet(false);
    showToast(`Sent ${gift.name} ${gift.icon} (+${gift.coins} coins / ₦${gift.nairaValue}) 🎁`);

    setLiveEarnedCoins((prev) => prev + gift.coins);
    setLiveEarnedNaira((prev) => prev + gift.nairaValue);

    setActiveGiftAnimation({
      icon: gift.icon,
      name: gift.name,
      coins: gift.coins,
      naira: gift.nairaValue,
      sender: profile?.username || 'You'
    });
    setTimeout(() => setActiveGiftAnimation(null), 2500);

    setLiveMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        username: profile?.username || 'You',
        text: `sent ${gift.name} ${gift.icon}! (+${gift.coins} coins / ₦${gift.nairaValue})`,
        isGift: true,
        giftName: gift.name
      }
    ]);

    if (user) {
      await sendVirtualGift({
        senderId: user.uid,
        senderUsername: profile?.username || 'You',
        senderAvatar: profile?.avatar,
        recipientId: user.uid,
        recipientUsername: profile?.username || 'creator',
        gift,
        liveSessionId: currentLiveSession?.id
      });
    }

    for (let i = 0; i < 4; i++) {
      setTimeout(handleSendHeart, i * 140);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Diagnostic / Permission Screens
  if (diagnosticError === 'iframe-restriction') {
    return (
      <div className="fixed inset-0 z-[70] bg-[#080810] flex flex-col items-center justify-center text-white p-6 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#8B5CF6] mb-4">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Camera in Preview Window</h2>
        <p className="text-gray-400 text-xs max-w-sm mb-6 leading-relaxed">
          Browser security prohibits camera streaming within certain iframe contexts. Open full standalone site to activate device camera.
        </p>
        <button
          onClick={() => window.open(window.location.href, '_blank')}
          className="bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] py-3 px-8 rounded-full font-bold text-sm shadow-lg shadow-purple-900/40 cursor-pointer"
        >
          Open Full Website
        </button>
        <button onClick={onClose} className="mt-4 text-xs text-gray-500 hover:text-white cursor-pointer">
          Close
        </button>
      </div>
    );
  }

  if (permissionState === 'initial') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#080810] flex flex-col items-center justify-center text-white p-6 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#7000FF] to-[#8B5CF6] flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(139,92,246,0.4)]">
          <Camera className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black mb-2 tracking-tight">Enable Camera</h2>
        <p className="text-gray-400 text-xs max-w-xs mb-8 leading-relaxed">
          Allow camera and audio access to record high-definition videos, take photos, and go live on ARAO.
        </p>
        <button
          onClick={() => initCamera()}
          className="w-full max-w-xs bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] hover:opacity-95 py-3.5 px-8 rounded-2xl font-extrabold text-sm shadow-xl shadow-purple-900/50 cursor-pointer active:scale-95 transition-all"
        >
          Enable Camera
        </button>
        <button onClick={onClose} className="mt-4 text-xs text-gray-500 hover:text-white cursor-pointer">
          Not Now
        </button>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="fixed inset-0 z-[60] bg-[#080810] flex flex-col items-center justify-center text-white p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-4">
          <Camera className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-2">Camera Access Blocked</h3>
        <p className="text-gray-400 text-xs max-w-sm mb-6 leading-relaxed">
          Camera permission was denied. Tap the lock/tune icon in your browser address bar and set Camera to "Allow".
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={() => initCamera()}
            className="bg-gradient-to-r from-[#7000FF] to-[#8B5CF6] py-3 px-6 rounded-xl font-bold text-xs cursor-pointer shadow-lg"
          >
            Retry Camera Access
          </button>
          <button onClick={onClose} className="py-2.5 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-400 cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW A: CAPTURED MEDIA PREVIEW & 3 OPTIONS BOTTOM SHEET
  // =========================================================================
  if (capturedMedia) {
    return (
      <div className="fixed inset-0 z-[70] bg-black flex flex-col justify-between select-none">
        {/* Fullscreen Media Element */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
          {capturedMedia.type === 'video' ? (
            <video
              ref={previewVideoRef}
              src={capturedMedia.url}
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={capturedMedia.url} alt="Captured" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Top Controls: Discard and Sound Tag */}
        <div className="relative z-10 p-4 pt-safe flex items-center justify-between bg-gradient-to-b from-black/80 via-black/20 to-transparent">
          <button
            onClick={handleDiscardMedia}
            className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md cursor-pointer border border-white/10"
            title="Retake"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {selectedSound && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-purple-500/30 text-xs text-white">
              <Music className="w-3.5 h-3.5 text-purple-300 animate-spin" />
              <span className="truncate max-w-[150px]">{selectedSound}</span>
            </div>
          )}

          <div className="w-9 h-9" />
        </div>

        {/* Bottom Options Sheet */}
        <div className="relative z-10 p-4 pb-safe bg-gradient-to-t from-black via-black/90 to-transparent space-y-4">
          {/* Caption Input */}
          <div className="relative">
            <input
              type="text"
              value={postCaption}
              onChange={(e) => setPostCaption(e.target.value)}
              placeholder="Add caption, hashtags (#arao)..."
              className="w-full py-2.5 px-4 rounded-xl bg-white/15 border border-white/20 text-white placeholder-gray-400 text-xs backdrop-blur-md focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>

          {/* 3 Clear Options Requested */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Option 1: Post to Feed */}
            <button
              onClick={handlePostToFeed}
              disabled={uploading}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
              <span>Post to Feed</span>
            </button>

            {/* Option 2: Post to Story (24hr) */}
            <button
              onClick={handlePostToStory}
              disabled={uploading}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-500 to-[#8A2BE2] hover:opacity-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-900/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              <span>Post to Story (24h)</span>
            </button>

            {/* Option 3: Go Live */}
            <button
              onClick={handleOpenLiveStudio}
              disabled={uploading}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF1744] to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Radio className="w-4 h-4" />
              <span>Go LIVE</span>
            </button>
          </div>

          {uploadProgressText && (
            <p className="text-center text-[11px] text-purple-300 font-medium animate-pulse">
              {uploadProgressText}
            </p>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: GO LIVE BROADCAST STUDIO
  // =========================================================================
  if (isLiveStudioOpen) {
    return (
      <div className="fixed inset-0 z-[75] bg-black flex flex-col justify-between select-none">
        {/* Fullscreen Camera Stream for Live */}
        <video
          ref={liveVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Live Top Bar */}
        <div className="relative z-10 p-3 pt-safe flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
          <div className="flex items-center gap-2">
            {/* Red Live Pill Badge */}
            <div className="px-3 py-1 rounded-full bg-[#FF1744] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,23,68,0.7)] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </div>

            {/* Viewer Count */}
            <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-gray-300" />
              <span>{liveViewerCount}</span>
            </div>

            {/* Live Earned Balance */}
            <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-600/70 to-yellow-600/70 backdrop-blur-md border border-amber-400/50 text-amber-200 text-xs font-black flex items-center gap-1 shadow-sm">
              <span>🪙</span>
              <span>{liveEarnedCoins}</span>
              <span className="text-[10px] text-amber-300 font-mono">(₦{liveEarnedNaira})</span>
            </div>

            {/* Live Duration */}
            {isLiveActive && (
              <span className="text-xs font-mono text-gray-300 bg-black/40 px-2 py-0.5 rounded-md">
                {formatTime(liveSeconds)}
              </span>
            )}
          </div>

          {/* Top Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleCamera}
              className="p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 cursor-pointer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                if (isLiveActive) {
                  if (confirm('Are you sure you want to end your LIVE broadcast?')) {
                    handleEndLive();
                  }
                } else {
                  setIsLiveStudioOpen(false);
                }
              }}
              className="p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Heart Animations */}
        {floatingHearts.map((h) => (
          <div
            key={h.id}
            style={{ left: `${h.left}%` }}
            className="absolute bottom-28 pointer-events-none text-rose-500 animate-float-heart z-30"
          >
            <Heart className="w-7 h-7 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </div>
        ))}

        {/* Interactive Virtual Gift Banner & Animation */}
        {activeGiftAnimation && (
          <div className="absolute inset-x-0 top-24 z-40 flex flex-col items-center justify-center pointer-events-none animate-bounce">
            <div className="py-3 px-6 rounded-3xl bg-black/85 border-2 border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.9)] backdrop-blur-md flex items-center gap-3.5">
              <span className="text-4xl drop-shadow-[0_0_15px_rgba(251,191,36,1)]">
                {activeGiftAnimation.icon}
              </span>
              <div className="text-left">
                <div className="text-xs font-black text-amber-300">
                  @{activeGiftAnimation.sender} sent {activeGiftAnimation.name}!
                </div>
                <div className="text-[12px] text-white font-mono font-bold flex items-center gap-1">
                  <span>+{activeGiftAnimation.coins} Coins</span>
                  <span className="text-amber-400 font-semibold">(₦{activeGiftAnimation.naira})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Center Setup: Before Start Live */}
        {!isLiveActive && !liveSummary && (
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#FF1744]/20 border border-[#FF1744]/40 flex items-center justify-center text-[#FF1744] shadow-[0_0_25px_rgba(255,23,68,0.5)]">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div className="w-full max-w-sm space-y-2">
              <h3 className="text-xl font-black text-white">Go LIVE to Your Audience</h3>
              <p className="text-xs text-gray-300">
                Broadcast live to your followers and trending feed with real-time video, chat, and gifts.
              </p>
              <input
                type="text"
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Add a topic: e.g. Studio Session / Q&A..."
                className="w-full py-3 px-4 rounded-xl bg-black/60 border border-white/20 text-white placeholder-gray-400 text-xs backdrop-blur-md focus:outline-none focus:border-[#FF1744] text-center font-medium"
              />
            </div>

            <button
              onClick={handleStartLive}
              disabled={uploading}
              className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-[#FF1744] to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(255,23,68,0.7)] active:scale-95 transition-all cursor-pointer"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
              <span>Start Live Broadcast</span>
            </button>
          </div>
        )}

        {/* Live Center: During Live Stream Chat Overlay */}
        {isLiveActive && (
          <div className="relative z-10 flex-1 flex flex-col justify-end p-4 pointer-events-none">
            <div className="w-full max-w-xs space-y-1.5 max-h-56 overflow-y-auto no-scrollbar pointer-events-auto">
              {liveMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-1.5 px-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white flex items-start gap-1.5 animate-fade-in shadow-md"
                >
                  <span className="font-bold text-[#D8B4FE]">@{msg.username}:</span>
                  <span className={msg.isGift ? 'text-amber-300 font-semibold' : 'text-gray-100'}>{msg.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Live Bottom Bar: During Live Stream */}
        {isLiveActive && (
          <div className="relative z-10 p-3 pb-safe bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between gap-2">
            <form onSubmit={handleSendLiveMessage} className="flex-1 flex items-center gap-1.5">
              <input
                type="text"
                value={liveChatInput}
                onChange={(e) => setLiveChatInput(e.target.value)}
                placeholder="Say something nice..."
                className="flex-1 py-2 px-3 rounded-full bg-white/15 border border-white/20 text-white placeholder-gray-400 text-xs backdrop-blur-md focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                className="p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Gift Button */}
            <button
              onClick={() => setShowGiftSheet(true)}
              className="p-2.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30 cursor-pointer hover:scale-105 transition-transform"
              title="Send Gift"
            >
              <Gift className="w-5 h-5" />
            </button>

            {/* Heart Reaction Button */}
            <button
              onClick={handleSendHeart}
              className="p-2.5 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 cursor-pointer hover:scale-105 active:scale-90 transition-transform"
              title="Send Heart"
            >
              <Heart className="w-5 h-5 fill-white" />
            </button>

            {/* End Live Button */}
            <button
              onClick={handleEndLive}
              className="py-2 px-3 rounded-full bg-white/20 hover:bg-rose-600/80 text-white text-xs font-bold border border-white/20 cursor-pointer transition-colors"
            >
              End
            </button>
          </div>
        )}

        {/* Live Summary Screen after broadcast finishes */}
        {liveSummary && (
          <div className="absolute inset-0 z-50 bg-[#080810]/95 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-900/30">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">LIVE Broadcast Finished</h3>
              <p className="text-xs text-gray-400 mt-1">Great job! Here is your stream performance overview.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Viewers</span>
                <div className="text-xl font-black text-white mt-0.5">{liveSummary.viewers}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Duration</span>
                <div className="text-xl font-black text-white mt-0.5">{formatTime(liveSummary.seconds)}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <span className="text-[10px] text-amber-300 font-mono uppercase">Gifts Received</span>
                <div className="text-xl font-black text-amber-400 mt-0.5">{liveSummary.coins} 🪙</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-300 font-mono uppercase">Earned Balance</span>
                <div className="text-xl font-black text-emerald-400 mt-0.5">₦{liveSummary.naira}</div>
              </div>
            </div>

            <button
              onClick={() => {
                setLiveSummary(null);
                setIsLiveStudioOpen(false);
                onClose();
              }}
              className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-[#7000FF] to-[#8A2BE2] text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Close & Return to Feed
            </button>
          </div>
        )}

        {/* Gift Sheet Drawer */}
        {showGiftSheet && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in">
            <div className="w-full max-w-md bg-[#12121C] border-t border-purple-500/30 rounded-t-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  <span>Send Creator Gift</span>
                </h4>
                <button
                  onClick={() => setShowGiftSheet(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-h-[45vh] overflow-y-auto">
                {VIRTUAL_GIFTS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleSendGift(g)}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-purple-600/30 border border-white/10 hover:border-amber-400/50 flex flex-col items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-3xl">{g.icon}</span>
                    <span className="text-[11px] font-bold text-white">{g.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">{g.coins} {g.coins === 1 ? 'coin' : 'coins'}</span>
                    <span className="text-[9px] text-gray-400 font-mono">₦{g.nairaValue}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW C: MAIN TIKTOK-STYLE CAMERA INTERFACE
  // =========================================================================
  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center select-none">
      {/* Live Video Camera Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 py-2 px-4 rounded-full bg-black/80 backdrop-blur-md border border-purple-500/50 text-white text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <span className="text-8xl font-black text-white animate-ping drop-shadow-[0_0_30px_rgba(139,92,246,0.9)]">
            {countdown}
          </span>
        </div>
      )}

      {/* Recording Duration Indicator Banner */}
      {isRecording && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>REC {formatTime(recordingSeconds)}</span>
        </div>
      )}

      {/* 1. TOP BAR: [Close] | [Story] [Sound] [Go LIVE] | [Flip] */}
      <div className="absolute top-0 left-0 right-0 p-3 pt-safe flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/20 to-transparent">
        {/* Left: Close Button */}
        <button
          onClick={onClose}
          className="p-2 text-white/90 hover:text-white rounded-full bg-black/40 backdrop-blur-md cursor-pointer border border-white/10"
          title="Close Camera"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Center: TikTok Pill Navigation (Story | Sound | Go LIVE) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Story Pill Button */}
          <button
            onClick={() => {
              setCreationMode('story');
              showToast('Story Mode: Take a photo/video to post a 24h story!');
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer ${
              creationMode === 'story'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)] border border-white/20'
                : 'bg-black/50 text-white/90 hover:bg-black/70 border border-white/10'
            }`}
            title="Create Story"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Story</span>
          </button>

          {/* Sound Pill Button */}
          <button
            onClick={() => setSoundPickerOpen(true)}
            className="px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Add Music Sound"
          >
            <Music className="w-3.5 h-3.5 text-purple-300" />
            <span className="truncate max-w-[80px] sm:max-w-[120px]">
              {selectedSound ? selectedSound.split(' - ')[0] : 'Sound'}
            </span>
          </button>

          {/* Go LIVE Pill Button */}
          <button
            onClick={handleOpenLiveStudio}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#FF1744] to-red-600 hover:from-red-600 hover:to-red-700 text-xs font-black text-white flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,23,68,0.6)] active:scale-95 transition-all cursor-pointer border border-red-400/30"
            title="Go Live on ARAO"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>Go LIVE</span>
          </button>
        </div>

        {/* Right: Camera Flip Button */}
        <button
          onClick={toggleCamera}
          className="p-2 text-white/90 hover:text-white rounded-full bg-black/40 backdrop-blur-md cursor-pointer border border-white/10"
          title="Flip Camera"
        >
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>

      {/* 2. RIGHT SIDE VERTICAL TOOLBAR */}
      <div className="absolute right-3.5 top-20 flex flex-col gap-5 z-20">
        {/* Flip */}
        <button
          onClick={toggleCamera}
          className="flex flex-col items-center text-white/90 hover:text-white gap-0.5"
          title="Flip Camera"
        >
          <div className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <RefreshCw className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-md">Flip</span>
        </button>

        {/* Flash */}
        <button
          onClick={toggleFlash}
          className="flex flex-col items-center text-white/90 hover:text-white gap-0.5"
          title="Toggle Flash"
        >
          <div className={`p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 ${flashOn ? 'text-yellow-400 border-yellow-400' : ''}`}>
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-md">Flash</span>
        </button>

        {/* Timer Countdown (3s / 10s / Off) */}
        <button
          onClick={() => {
            const next = timerDuration === 0 ? 3 : timerDuration === 3 ? 10 : 0;
            setTimerDuration(next);
            showToast(next === 0 ? 'Timer off' : `Timer: ${next}s countdown`);
          }}
          className="flex flex-col items-center text-white/90 hover:text-white gap-0.5"
          title="Countdown Timer"
        >
          <div className={`p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 ${timerDuration > 0 ? 'text-[#8B5CF6] border-[#8B5CF6]' : ''}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-md">
            {timerDuration > 0 ? `${timerDuration}s` : 'Timer'}
          </span>
        </button>

        {/* Filters */}
        <button
          onClick={() => {
            const filters = [
              'none',
              'contrast(1.2) saturate(1.2)', // Vivid
              'sepia(0.3) saturate(1.3)', // Warm
              'grayscale(1)', // Black & White
              'hue-rotate(30deg) saturate(1.3)' // Cyber Violet
            ];
            const nextIdx = (filters.indexOf(filter) + 1) % filters.length;
            setFilter(filters[nextIdx]);
            showToast(nextIdx === 0 ? 'Normal Filter' : `Filter Preset #${nextIdx}`);
          }}
          className="flex flex-col items-center text-white/90 hover:text-white gap-0.5"
          title="Filters"
        >
          <div className={`p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 ${filter !== 'none' ? 'text-pink-400 border-pink-400' : ''}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium drop-shadow-md">Filter</span>
        </button>
      </div>

      {/* 3. BOTTOM CONTROLS: Mode Selector + Shutter + Upload */}
      <div className="absolute bottom-6 inset-x-0 z-20 flex flex-col items-center gap-5 bg-gradient-to-t from-black via-black/50 to-transparent pt-8 pb-safe">
        {/* Horizontal Mode Selector (10m, 60s, 15s, photo, text, story) */}
        <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-wider overflow-x-auto no-scrollbar px-6 max-w-full">
          {(['10m', '60s', '15s', 'photo', 'story', 'text'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                if (isRecording) stopRecording();
                setCreationMode(m);
              }}
              className={`pb-1 transition-all whitespace-nowrap cursor-pointer ${
                creationMode === m
                  ? 'text-white border-b-2 border-white scale-105 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {m === 'story' ? 'Story (24h)' : m}
            </button>
          ))}
        </div>

        {/* Capture Controls Row */}
        <div className="flex items-center justify-between w-full px-10 max-w-md">
          {/* Left: Selected Sound thumbnail or Effects badge */}
          <div className="w-12 h-12 flex items-center justify-center">
            {selectedSound ? (
              <button
                onClick={() => setSoundPickerOpen(true)}
                className="w-11 h-11 rounded-xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300"
                title="Current Sound"
              >
                <Music className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setCreationMode('story')}
                className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex flex-col items-center justify-center text-[10px] text-gray-300 hover:text-white"
                title="Story Mode"
              >
                <Plus className="w-4 h-4 text-pink-400" />
                <span className="text-[8px]">Story</span>
              </button>
            )}
          </div>

          {/* Center: Main Shutter Trigger Button */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={handleCaptureClick}
              className={`rounded-full transition-all active:scale-90 cursor-pointer flex items-center justify-center ${
                creationMode === 'photo' || creationMode === 'story'
                  ? 'w-20 h-20 p-1.5 border-4 border-white'
                  : isRecording
                  ? 'w-20 h-20 p-2 border-4 border-red-500 animate-pulse'
                  : 'w-20 h-20 p-1.5 border-4 border-white'
              }`}
            >
              <div
                className={`w-full h-full rounded-full transition-all ${
                  creationMode === 'story'
                    ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-[#8A2BE2]'
                    : creationMode === 'photo'
                    ? 'bg-white hover:bg-gray-100'
                    : isRecording
                    ? 'w-8 h-8 rounded-md bg-red-600'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              />
            </button>
          </div>

          {/* Right: Gallery Upload Button (Supports Photos and Videos to Supabase Storage) */}
          <div className="w-12 h-12 flex items-center justify-center">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-11 h-11 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 border border-white/20 backdrop-blur-md flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
              title="Upload from Gallery"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[8px] text-gray-300">Upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SOUND PICKER BOTTOM SHEET */}
      {soundPickerOpen && (
        <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end justify-center animate-fade-in">
          <div className="w-full max-w-lg bg-[#12121C] border-t border-purple-500/30 rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                <span>Trending ARAO Sounds</span>
              </h4>
              <button
                onClick={() => setSoundPickerOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {TRENDING_SOUNDS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedSound(`${s.title} - ${s.artist}`);
                    setSoundPickerOpen(false);
                    showToast(`Selected: ${s.title}`);
                  }}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                    selectedSound?.includes(s.title)
                      ? 'bg-purple-900/40 border-purple-500/60'
                      : 'bg-white/5 border-white/5 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/30 flex items-center justify-center text-purple-300">
                      <Music className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{s.title}</div>
                      <div className="text-[10px] text-gray-400">{s.artist} • {s.duration}</div>
                    </div>
                  </div>

                  <button className="px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold">
                    Use
                  </button>
                </div>
              ))}

              {selectedSound && (
                <button
                  onClick={() => {
                    setSelectedSound(null);
                    setSoundPickerOpen(false);
                    showToast('Sound removed');
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Remove Selected Sound
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
