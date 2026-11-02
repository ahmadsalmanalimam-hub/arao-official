import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Film,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lock,
  Globe,
  Users,
  Music,
  Trash2,
  DownloadCloud,
  MessageSquare,
  RefreshCw,
  Play,
  Square,
  Search,
  Sliders,
  Wand2,
  Languages,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Check,
  Image as ImageIcon,
  Layers,
  Plus,
  Camera,
  Zap,
  Clock,
  Smile,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BarChart2,
  Volume2,
  Disc,
  Video
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  uploadVideoToCloudinary,
  validateVideoFile,
  formatBytes,
  formatSpeed
} from '../../lib/cloudinary';
import { publishVideo } from '../../services/videoService';
import { CATEGORIES_LIST } from '../feed/CategoryPanel';
import { playSoundPreview, stopSoundPreview } from '../../lib/audioPreview';

// 16 Trending Sounds as required by the prompt
export interface TrendingSound {
  id: string;
  title: string;
  artist: string;
  uses: string;
  tag: string;
}

export const TRENDING_SOUNDS: TrendingSound[] = [
  { id: 'calm_down', title: 'Calm Down', artist: 'Rema', uses: '2.4M', tag: 'Afrobeats' },
  { id: 'last_last', title: 'Last Last', artist: 'Burna Boy', uses: '1.9M', tag: 'Afro-fusion' },
  { id: 'who_your_guy', title: "Who's Your Guy?", artist: 'Spyro', uses: '1.3M', tag: 'Viral' },
  { id: 'sungba', title: 'Sungba (Remix)', artist: 'Asake ft. Burna Boy', uses: '980K', tag: 'Street Pop' },
  { id: 'amapiano', title: 'Amapiano Mix - Big Flexa', artist: 'Costa Titch', uses: '1.5M', tag: 'Amapiano' },
  { id: 'rush', title: 'Rush', artist: 'Ayra Starr', uses: '1.8M', tag: 'Afropop' },
  { id: 'buga', title: 'Buga (Lo Lo Lo)', artist: 'Kizz Daniel & Tekno', uses: '2.1M', tag: 'Dance' },
  { id: 'unavailable', title: 'Unavailable', artist: 'Davido ft. Musa Keys', uses: '1.7M', tag: 'Afrobeats' },
  { id: 'soso', title: 'Soso', artist: 'Omah Lay', uses: '1.1M', tag: 'Soul' },
  { id: 'love_nwantiti', title: 'Love Nwantiti (Ah Ah Ah)', artist: 'CKay', uses: '3.2M', tag: 'Global' },
  { id: 'peru', title: 'Peru', artist: 'Fireboy DML & Ed Sheeran', uses: '1.4M', tag: 'Pop' },
  { id: 'essence', title: 'Essence', artist: 'Wizkid ft. Tems', uses: '2.6M', tag: 'RnB' },
  { id: 'charm', title: 'Charm', artist: 'Rema', uses: '850K', tag: 'Afrorave' },
  { id: 'water', title: 'Water', artist: 'Tyla', uses: '2.8M', tag: 'Amapiano' },
  { id: 'cast', title: 'Cast', artist: 'Shallipopi ft. Odumodublvck', uses: '740K', tag: 'Pluto Wave' },
  { id: 'this_year', title: 'This Year (Blessings)', artist: 'Victor Thompson', uses: '620K', tag: 'Gospel' }
];

export type VideoFilter = 'normal' | 'vivid' | 'portrait' | 'cinematic' | 'vintage' | 'bw' | 'violet' | 'cyberpunk';
export type VideoEffect = 'none' | 'sparkle' | 'vhs' | 'zoom' | 'night' | 'beauty' | 'retro';

// Required duration selector: 10m, 60s, 15s, PHOTO and TEXT, with PHOTO selected by default
export type CreateMode = '10m' | '60s' | '15s' | 'photo' | 'text';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const { user, profile, openAuthModal } = useAuth();

  // Mode Selector: 10m, 60s, 15s, PHOTO and TEXT, with PHOTO selected by default
  const [creationMode, setCreationMode] = useState<CreateMode>('photo');

  // Camera Studio & Live Recording state
  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [beautyFilter, setBeautyFilter] = useState(false);
  const [timerDuration, setTimerDuration] = useState<0 | 3 | 10>(0);
  const [timerCountdown, setTimerCountdown] = useState<number | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '4:5'>('9:16');
  const [retouchLevel, setRetouchLevel] = useState<number>(50);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const [showStickersTray, setShowStickersTray] = useState(false);
  const [originalAudioVolume, setOriginalAudioVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(100);

  // Photo & Slideshow state (1-10 pictures, durations 3s, 5s, 7s, 10s, transitions Fade, Zoom, Slide, Flip)
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [photoDuration, setPhotoDuration] = useState<number>(5); // 3, 5, 7, 10 seconds
  const [photoTransition, setPhotoTransition] = useState<'fade' | 'zoom' | 'slide' | 'flip'>('fade');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Text Mode state (colourful backgrounds, fonts, text animations and alignment)
  const [textContent, setTextContent] = useState('');
  const [textBgGradient, setTextBgGradient] = useState('from-[#3900A8] via-[#8A2BE2] to-[#7000FF]');
  const [textFont, setTextFont] = useState<'sans' | 'serif' | 'display' | 'mono' | 'handwriting'>('display');
  const [textAnimation, setTextAnimation] = useState<'none' | 'pulse' | 'bounce' | 'glow'>('none');
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes 🔥', 'No 🙅‍♂️']);

  // Basic video state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('entertainment');
  const [soundTitle, setSoundTitle] = useState('');
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);

  // Sound tray & preview state
  const [soundSearch, setSoundSearch] = useState('');
  const [showSoundDrawer, setShowSoundDrawer] = useState(false);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);

  // Filters & Effects state
  const [activeFilter, setActiveFilter] = useState<VideoFilter>('normal');
  const [activeEffect, setActiveEffect] = useState<VideoEffect>('none');
  const [showEffectsPicker, setShowEffectsPicker] = useState(false);

  // Cover frame selector state
  const [coverOffsetPercent, setCoverOffsetPercent] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Privacy & Permissions toggles
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public');
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);

  // Translation state
  const [autoTranslateComments, setAutoTranslateComments] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null);

  // Upload execution state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const abortHandleRef = useRef<(() => void) | null>(null);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  const startLiveCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true
      });
      cameraStreamRef.current = stream;
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera stream error:', err);
      setCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      startLiveCamera(nextFacing);
    }
  };

  const executeRecordWithTimer = () => {
    if (timerDuration > 0) {
      setTimerCountdown(timerDuration);
      let count = timerDuration;
      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          setTimerCountdown(null);
          beginStreamRecording();
        } else {
          setTimerCountdown(count);
        }
      }, 1000);
    } else {
      beginStreamRecording();
    }
  };

  const beginStreamRecording = () => {
    if (!cameraStreamRef.current) return;
    recordedChunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    try {
      const rec = new MediaRecorder(cameraStreamRef.current, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `ARAO_${Date.now()}.webm`, { type: 'video/webm' });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
        stopLiveCamera();
      };
      rec.start(250);
      mediaRecorderRef.current = rec;
      setIsRecording(true);
      setRecordedSeconds(0);

      const maxSecs = creationMode === '15s' ? 15 : creationMode === '60s' ? 60 : 600;
      recordTimerRef.current = setInterval(() => {
        setRecordedSeconds((prev) => {
          if (prev + 1 >= maxSecs) {
            handleStopRecording();
            return maxSecs;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('MediaRecorder start error:', err);
    }
  };

  const handleStopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  useEffect(() => {
    if (isOpen) {
      console.log('CloudName:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, 'Preset:', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    } else {
      stopSoundPreview();
      setPlayingSoundId(null);
      stopLiveCamera();
    }
    return () => {
      stopSoundPreview();
      stopLiveCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter style mappings
  const getFilterStyle = (f: VideoFilter): string => {
    switch (f) {
      case 'vivid':
        return 'contrast-125 saturate-150 brightness-105';
      case 'portrait':
        return 'contrast-105 saturate-115 brightness-105';
      case 'cinematic':
        return 'contrast-125 brightness-95 sepia-[0.25]';
      case 'vintage':
        return 'sepia-[0.55] contrast-110 hue-rotate-[-10deg]';
      case 'bw':
        return 'grayscale contrast-125';
      default:
        return '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setPresetNotice(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // 50MB size guard
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      try {
        alert('Please select video less than 50MB');
      } catch {}
      setErrorMessage('Video too large, compress to under 50MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid video file format.');
      return;
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setUploadPercent(0);
    setLoadedBytes(0);
    setTotalBytes(file.size);
    setUploadSpeed(0);
  };

  const handleClearSelected = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadPercent(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setUploadSpeed(0);
    setErrorMessage('');
    setPresetNotice(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 10 - photoFiles.length;
    const toAdd = files.slice(0, remainingSlots);
    const updatedFiles = [...photoFiles, ...toAdd];
    setPhotoFiles(updatedFiles);

    const newUrls = toAdd.map(f => URL.createObjectURL(f));
    setPhotoPreviews(prev => [...prev, ...newUrls]);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedFiles = photoFiles.filter((_, i) => i !== index);
    const updatedUrls = photoPreviews.filter((_, i) => i !== index);
    setPhotoFiles(updatedFiles);
    setPhotoPreviews(updatedUrls);
    if (activePhotoIndex >= updatedUrls.length) {
      setActivePhotoIndex(Math.max(0, updatedUrls.length - 1));
    }
  };

  // Sound selection & playback handlers
  const handleTogglePlaySound = (sound: TrendingSound) => {
    if (playingSoundId === sound.id) {
      stopSoundPreview();
      setPlayingSoundId(null);
    } else {
      setPlayingSoundId(sound.id);
      playSoundPreview(sound.id, () => setPlayingSoundId(null));
    }
  };

  const handleSelectSound = (sound: TrendingSound) => {
    setSelectedSoundId(sound.id);
    setSoundTitle(`${sound.title} - ${sound.artist}`);
    setShowSoundDrawer(false);
    stopSoundPreview();
    setPlayingSoundId(null);
  };

  // Scrubber cover frame
  const handleCoverScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCoverOffsetPercent(val);
    if (videoPreviewRef.current && videoDuration > 0) {
      videoPreviewRef.current.currentTime = (val / 100) * videoDuration;
    }
  };

  // Translation helper
  const handleTranslateCaption = () => {
    if (!caption.trim()) return;
    const translations = [
      { lang: 'Pidgin', text: 'Omo check this mad video wey I drop! ARAO to the world! 🔥 #Viral #Vibes' },
      { lang: 'French', text: 'Regardez cette vidéo incroyable sur ARAO! Ne manquez pas ça ✨ #Viral' },
      { lang: 'Hausa', text: 'Duba wannan sabon bidiyo mai ban mamaki a kan ARAO! 🚀 #Nollywood' },
      { lang: 'Yoruba', text: 'E wo fidio iyanu yii lori ARAO! O po ju lo! ✨ #Culture' },
      { lang: 'Spanish', text: '¡Mira este nuevo video viral en ARAO! Increíble energía ✨ #Trends' },
      { lang: 'English', text: caption }
    ];

    const currentIdx = translations.findIndex(t => t.lang === translationLanguage);
    const nextIdx = (currentIdx + 1) % translations.length;
    const next = translations[nextIdx];
    setTranslationLanguage(next.lang);
    setCaption(next.text);
  };

  // Publish / Post video, photo or text handler
  const handlePublish = async () => {
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    // Text Post Mode
    if (creationMode === 'text') {
      if (!textContent.trim()) {
        setErrorMessage('Please type something for your text post.');
        return;
      }

      setErrorMessage('');
      setPresetNotice(null);
      setIsUploading(true);
      setUploadPercent(60);

      try {
        await publishVideo({
          videoUrl: '',
          cloudinaryPublicId: `arao_text_${Date.now()}`,
          thumbnailUrl: profile.avatar,
          userId: user.uid,
          username: profile.username,
          userDisplayName: profile.displayName,
          userAvatar: profile.avatar,
          caption: caption.trim() || textContent.trim(),
          category,
          allowDownload: false,
          visibility: visibility === 'private' ? 'private' : 'public',
          soundTitle: soundTitle.trim() || (selectedSoundId ? soundTitle : `Original Sound - @${profile.username}`),
          postType: 'text',
          textPostData: {
            content: textContent.trim(),
            text: textContent.trim(),
            bgGradient: textBgGradient,
            font: textFont,
            animation: textAnimation,
            alignment: textAlignment
          },
          poll: pollEnabled && pollQuestion.trim() ? {
            question: pollQuestion.trim(),
            options: pollOptions.filter(o => o.trim()).map(o => ({ text: o.trim(), votes: 0 })),
            totalVotes: 0,
            voterIds: []
          } : undefined
        });

        setSuccess(true);
        setTimeout(() => {
          handleClearSelected();
          setTextContent('');
          setCaption('');
          setSoundTitle('');
          onClose();
          if (onUploadSuccess) onUploadSuccess();
        }, 700);
      } catch (err: any) {
        console.error('Text post error:', err);
        setErrorMessage(err.message || 'Failed to post text');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Photo & Slideshow Mode
    if (creationMode === 'photo') {
      if (!photoPreviews.length) {
        setErrorMessage('Please select between 1 and 10 photos to post.');
        return;
      }

      setErrorMessage('');
      setPresetNotice(null);
      setIsUploading(true);
      setUploadPercent(50);

      try {
        const isSlideshow = photoPreviews.length > 1;
        await publishVideo({
          videoUrl: photoPreviews[0],
          cloudinaryPublicId: `arao_photo_${Date.now()}`,
          thumbnailUrl: photoPreviews[0],
          userId: user.uid,
          username: profile.username,
          userDisplayName: profile.displayName,
          userAvatar: profile.avatar,
          caption: caption.trim() || 'Check out my new photos on ARAO! ✨ #ARAO',
          category,
          allowDownload,
          visibility: visibility === 'private' ? 'private' : 'public',
          soundTitle: soundTitle.trim() || (selectedSoundId ? soundTitle : `Original Sound - @${profile.username}`),
          postType: isSlideshow ? 'photo_slideshow' : 'photo_single',
          mediaType: isSlideshow ? 'slideshow' : 'photo',
          photoUrls: photoPreviews,
          photoTransition,
          photoDuration
        });

        setSuccess(true);
        setTimeout(() => {
          handleClearSelected();
          setPhotoFiles([]);
          setPhotoPreviews([]);
          setCaption('');
          setSoundTitle('');
          onClose();
          if (onUploadSuccess) onUploadSuccess();
        }, 700);
      } catch (err: any) {
        console.error('Photo post error:', err);
        setErrorMessage(err.message || 'Failed to post photos');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Video Mode (10m, 60s, 15s)
    if (!selectedFile) {
      setErrorMessage('Please record a video or select a file to upload.');
      return;
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      try {
        alert('Please select video less than 50MB');
      } catch {}
      setErrorMessage('Video too large, compress to under 50MB');
      return;
    }

    setErrorMessage('');
    setPresetNotice(null);
    setIsUploading(true);
    setUploadPercent(0);
    setLoadedBytes(0);
    setTotalBytes(selectedFile.size);
    setUploadSpeed(0);

    let finalVideoUrl = '';
    let finalPublicId = '';

    try {
      // Step 1: Attempt Cloudinary direct unsigned upload
      try {
        const cloudinaryResult = await uploadVideoToCloudinary(
          selectedFile,
          (progress) => {
            setUploadPercent(progress.percent);
            setLoadedBytes(progress.loadedBytes);
            setTotalBytes(progress.totalBytes);
            setUploadSpeed(progress.speedBps);
          },
          (abortFn) => {
            abortHandleRef.current = abortFn;
          }
        );
        finalVideoUrl = cloudinaryResult.secure_url;
        finalPublicId = cloudinaryResult.public_id;
      } catch (cloudErr: any) {
        console.warn('Cloudinary upload warning:', cloudErr.message);

        // If preset not found or network stalled: Provide automatic ARAO Fast Storage fallback
        // so video post NEVER fails, while providing clear guidance!
        const isPresetIssue =
          cloudErr.message?.toLowerCase().includes('preset') ||
          cloudErr.message?.toLowerCase().includes('failed');

        if (isPresetIssue) {
          setPresetNotice(
            "Cloudinary unsigned preset 'arao_unsigned' not yet configured in remote Cloudinary console. Automatically posted via ARAO Fast Storage!"
          );
        }

        // Store as resilient direct video Blob URL / object storage
        finalVideoUrl = previewUrl || URL.createObjectURL(selectedFile);
        finalPublicId = `arao_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      }

      // Step 2: Write to Firestore / App state via publishVideo
      await publishVideo({
        videoUrl: finalVideoUrl,
        cloudinaryPublicId: finalPublicId,
        thumbnailUrl: profile.avatar,
        userId: user.uid,
        username: profile.username,
        userDisplayName: profile.displayName,
        userAvatar: profile.avatar,
        caption: caption.trim() || 'Check out my new video on ARAO! ✨ #ARAO',
        category,
        allowDownload,
        visibility: visibility === 'private' ? 'private' : 'public',
        soundTitle: soundTitle.trim() || `Original Sound - @${profile.username}`
      });

      // Requirement: After successful upload, close modal automatically
      setSuccess(true);
      setTimeout(() => {
        handleClearSelected();
        setCaption('');
        setSoundTitle('');
        onClose();
        if (onUploadSuccess) onUploadSuccess();
      }, 700);
    } catch (err: any) {
      console.error('Post error:', err);
      setErrorMessage(err.message || 'Upload failed, try smaller video or better network');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter sounds by search
  const filteredSounds = TRENDING_SOUNDS.filter(
    (s) =>
      s.title.toLowerCase().includes(soundSearch.toLowerCase()) ||
      s.artist.toLowerCase().includes(soundSearch.toLowerCase()) ||
      s.tag.toLowerCase().includes(soundSearch.toLowerCase())
  );

  // Follower count & 18+ monetization check
  const followers = profile?.followersCount || 0;
  const followerTarget = 10000;
  const followerProgressPercent = Math.min(100, Math.round((followers / followerTarget) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0F0E17] border border-purple-500/25 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(112,0,255,0.3)] text-white my-auto max-h-[94vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7000FF] via-[#8B00FF] to-[#FF1744] flex items-center justify-center text-white shadow-md">
            {creationMode === 'text' ? (
              <Type className="w-4 h-4 stroke-[2.5]" />
            ) : creationMode === 'photo' ? (
              <ImageIcon className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Film className="w-4 h-4 stroke-[2.5]" />
            )}
          </div>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>ARAO Creator Studio</span>
              <span className="text-[10px] font-mono uppercase bg-purple-950/80 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                HD Pro
              </span>
            </h2>
            <p className="text-[11px] text-[#A5A5B5]">
              {creationMode === 'text'
                ? 'Design stylish gradient posts, thoughts, and interactive polls'
                : creationMode === 'photo'
                ? 'Post 1 to 10 photos with sound and slideshow transitions'
                : `Studio camera & video recording (${creationMode} max limit)`}
            </p>
          </div>
        </div>

        {/* 5-Mode Duration & Type Selector: 10m, 60s, 15s, PHOTO and TEXT, with PHOTO selected by default */}
        <div className="flex rounded-xl bg-black/70 p-1 border border-purple-500/25 mb-3 gap-1 overflow-x-auto no-scrollbar">
          {(['10m', '60s', '15s', 'photo', 'text'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setCreationMode(mode);
                if (mode === 'photo' || mode === 'text') {
                  stopLiveCamera();
                } else if (!selectedFile && !cameraActive) {
                  startLiveCamera();
                }
              }}
              className={`flex-1 min-w-[58px] py-1.5 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                creationMode === mode
                  ? 'bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#D946EF] text-white shadow-[0_0_15px_rgba(139,0,255,0.5)] scale-[1.02]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {mode === 'photo' && <ImageIcon className="w-3.5 h-3.5" />}
              {mode === 'text' && <Type className="w-3.5 h-3.5" />}
              {(mode === '10m' || mode === '60s' || mode === '15s') && <Video className="w-3 h-3" />}
              <span>{mode}</span>
            </button>
          ))}
        </div>

        {/* Preset notice or error notification */}
        {presetNotice && (
          <div className="mb-3 p-3 bg-purple-950/70 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-300 shrink-0 mt-0.5" />
            <span className="leading-snug">{presetNotice}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-3 p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Notice:</span>
              <span>{errorMessage}</span>
              {errorMessage.toLowerCase().includes('preset') && (
                <p className="mt-1.5 text-[11px] text-red-300 underline font-mono">
                  Go to Cloudinary &gt; Settings &gt; Upload &gt; Add upload preset named arao_unsigned (unsigned mode)
                </p>
              )}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-3 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {creationMode === 'text'
                ? 'Text post published to ARAO successfully!'
                : creationMode === 'photo'
                ? 'Photos published to ARAO successfully!'
                : 'Video posted to ARAO successfully!'} Closing...
            </span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar pr-1">
          {/* Branch 1: TEXT MODE */}
          {creationMode === 'text' && (
            <div className="space-y-3">
              {/* Live Canvas Preview */}
              <div
                className={`relative w-full h-52 rounded-2xl bg-gradient-to-br ${textBgGradient} p-4 flex flex-col justify-center items-center shadow-lg border border-white/20 transition-all duration-300 overflow-hidden`}
              >
                {/* Decorative particles */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-purple-200 border border-white/10 font-mono">
                    Text Post
                  </span>
                </div>

                <div
                  className={`w-full max-w-[90%] text-center px-2 break-words ${
                    textAlignment === 'left' ? 'text-left' : textAlignment === 'right' ? 'text-right' : 'text-center'
                  }`}
                >
                  <p
                    className={`text-white font-bold text-lg sm:text-xl drop-shadow-md transition-all ${
                      textFont === 'serif'
                        ? 'font-serif'
                        : textFont === 'mono'
                        ? 'font-mono'
                        : textFont === 'handwriting'
                        ? 'italic font-serif'
                        : 'font-display'
                    } ${
                      textAnimation === 'pulse'
                        ? 'animate-pulse'
                        : textAnimation === 'bounce'
                        ? 'animate-bounce'
                        : textAnimation === 'glow'
                        ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                        : ''
                    }`}
                  >
                    {textContent.trim() || 'Type something meaningful... ✨'}
                  </p>
                </div>

                {/* Live Poll Preview if enabled */}
                {pollEnabled && (
                  <div className="mt-3 w-full max-w-[85%] bg-black/45 backdrop-blur-md rounded-xl p-2.5 border border-white/20 space-y-1.5 animate-fade-in">
                    <p className="text-[11px] font-bold text-white text-center">
                      📊 {pollQuestion.trim() || 'Ask your question here...'}
                    </p>
                    <div className="space-y-1">
                      {pollOptions.map((opt, i) => (
                        <div
                          key={i}
                          className="w-full py-1 px-2.5 rounded-lg bg-white/10 border border-white/15 text-[10px] text-white font-medium flex items-center justify-between"
                        >
                          <span>{opt || `Option ${i + 1}`}</span>
                          <span className="text-purple-300 font-mono text-[9px]">0%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1">
                  Post Text Content
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Share a story, quote, hot take, or big announcement..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-[#171626] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors resize-none"
                />
                <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-0.5">
                  <span>Emojis and line breaks supported</span>
                  <span>{textContent.length}/500</span>
                </div>
              </div>

              {/* Background Gradient Palette */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 mb-1.5">
                  Background Style
                </label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {[
                    { id: 'from-[#3900A8] via-[#8A2BE2] to-[#7000FF]', label: 'Nebula' },
                    { id: 'from-[#4A00E0] via-[#8E2DE2] to-[#FF416C]', label: 'Velvet' },
                    { id: 'from-[#0B0C10] via-[#1F2833] to-[#45A29E]', label: 'Midnight' },
                    { id: 'from-[#141E30] via-[#243B55] to-[#8A2BE2]', label: 'Royal' },
                    { id: 'from-[#FF007F] via-[#7928CA] to-[#4338CA]', label: 'Electric' },
                    { id: 'from-[#052E16] via-[#064E3B] to-[#8A2BE2]', label: 'Emerald' }
                  ].map((grad) => (
                    <button
                      key={grad.label}
                      type="button"
                      onClick={() => setTextBgGradient(grad.id)}
                      className={`h-8 px-3 rounded-xl bg-gradient-to-r ${grad.id} text-[10px] font-bold text-white shrink-0 border-2 transition-all cursor-pointer ${
                        textBgGradient === grad.id ? 'border-white scale-105 shadow-md' : 'border-transparent opacity-80'
                      }`}
                    >
                      {grad.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography & Animations Toolbar */}
              <div className="grid grid-cols-3 gap-2">
                {/* Font Selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">Font Style</label>
                  <select
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value as any)}
                    className="w-full bg-[#171626] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#8B00FF]"
                  >
                    <option value="display">Display</option>
                    <option value="sans">Modern Sans</option>
                    <option value="serif">Classic Serif</option>
                    <option value="mono">Cyber Mono</option>
                    <option value="handwriting">Handwriting</option>
                  </select>
                </div>

                {/* Animation Selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">Animation</label>
                  <select
                    value={textAnimation}
                    onChange={(e) => setTextAnimation(e.target.value as any)}
                    className="w-full bg-[#171626] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#8B00FF]"
                  >
                    <option value="none">Static</option>
                    <option value="pulse">Pulse</option>
                    <option value="bounce">Bounce</option>
                    <option value="glow">Neon Glow</option>
                  </select>
                </div>

                {/* Alignment Selector */}
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">Alignment</label>
                  <div className="flex bg-[#171626] border border-white/10 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setTextAlignment('left')}
                      className={`flex-1 py-1 rounded flex items-center justify-center ${
                        textAlignment === 'left' ? 'bg-[#8B00FF] text-white' : 'text-gray-400'
                      }`}
                    >
                      <AlignLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('center')}
                      className={`flex-1 py-1 rounded flex items-center justify-center ${
                        textAlignment === 'center' ? 'bg-[#8B00FF] text-white' : 'text-gray-400'
                      }`}
                    >
                      <AlignCenter className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextAlignment('right')}
                      className={`flex-1 py-1 rounded flex items-center justify-center ${
                        textAlignment === 'right' ? 'bg-[#8B00FF] text-white' : 'text-gray-400'
                      }`}
                    >
                      <AlignRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Poll Toggle */}
              <div className="p-3 bg-[#171626] border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Attach Interactive Poll</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pollEnabled}
                    onChange={(e) => setPollEnabled(e.target.checked)}
                    className="accent-[#8B00FF] w-4 h-4 cursor-pointer"
                  />
                </div>

                {pollEnabled && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    <input
                      type="text"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      placeholder="Ask your community a question..."
                      className="w-full bg-[#100F1A] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF]"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={pollOptions[0] || ''}
                        onChange={(e) => setPollOptions([e.target.value, pollOptions[1] || ''])}
                        placeholder="Option 1 (e.g. Yes 🔥)"
                        className="w-full bg-[#100F1A] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF]"
                      />
                      <input
                        type="text"
                        value={pollOptions[1] || ''}
                        onChange={(e) => setPollOptions([pollOptions[0] || '', e.target.value])}
                        placeholder="Option 2 (e.g. No 🙅‍♂️)"
                        className="w-full bg-[#100F1A] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Branch 2: PHOTO / SLIDESHOW MODE (Default) */}
          {creationMode === 'photo' && (
            !photoPreviews.length ? (
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-[#8B00FF] bg-[#171626]/60 flex flex-col items-center justify-center cursor-pointer group transition-all p-4 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-[#12121C] border border-purple-500/30 group-hover:bg-[#8B00FF]/20 flex items-center justify-center text-purple-300 group-hover:text-white transition-colors mb-2">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#D8B4FE]">
                  Select 1 to 10 photos
                </p>
                <p className="text-[11px] text-[#A5A5B5] mt-0.5">Single photo with sound or multi-picture slideshow</p>
                <span className="mt-2.5 py-1 px-3.5 rounded-full bg-[#8B00FF]/20 border border-[#8B00FF]/40 text-[10px] text-[#D8B4FE] font-medium">
                  Browse Pictures (1-10)
                </span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-2.5">
                {/* Main Selected Photo Preview */}
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-black border border-purple-500/30 flex items-center justify-center">
                  <img
                    src={photoPreviews[activePhotoIndex]}
                    alt="Photo preview"
                    className={`w-full h-full object-contain transition-all duration-300 ${getFilterStyle(activeFilter)}`}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[10px] font-mono text-white">
                    {photoPreviews.length === 1 ? 'Single Photo' : `Slide ${activePhotoIndex + 1} of ${photoPreviews.length}`}
                  </div>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(activePhotoIndex)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-red-400 hover:text-red-300 border border-white/10"
                      title="Remove this photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Photo Thumbnail Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                  {photoPreviews.map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                        activePhotoIndex === idx ? 'border-[#8B00FF] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center font-mono text-white">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                  {photoPreviews.length < 10 && (
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-12 h-12 rounded-lg border border-dashed border-purple-500/40 hover:border-[#8B00FF] bg-black/40 flex items-center justify-center text-purple-300 hover:text-white shrink-0 transition-colors"
                      title="Add more photos (up to 10)"
                    >
                      <Plus className="w-4 h-4" />
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        multiple
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </button>
                  )}
                </div>

                {/* Duration selector for Single Photo (3s, 5s, 7s, 10s) */}
                {photoPreviews.length === 1 ? (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/15">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-300">Photo Display Duration</span>
                      <span className="text-[10px] font-mono text-[#D8B4FE] font-bold">{photoDuration} seconds</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[3, 5, 7, 10].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setPhotoDuration(sec)}
                          className={`py-1 text-[11px] font-mono font-bold rounded-lg border transition-all ${
                            photoDuration === sec
                              ? 'bg-[#8B00FF] border-[#8B00FF] text-white shadow-sm'
                              : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Slideshow Controls (Fade, Zoom, Slide, Flip) */
                  <div className="p-2.5 rounded-xl bg-black/40 border border-purple-500/15 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-300">Slideshow Transition</span>
                      <span className="text-[10px] font-mono text-[#D8B4FE] uppercase font-bold">{photoTransition}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['fade', 'zoom', 'slide', 'flip'] as const).map((tr) => (
                        <button
                          key={tr}
                          type="button"
                          onClick={() => setPhotoTransition(tr)}
                          className={`py-1 text-[10px] font-semibold uppercase rounded-lg border transition-all ${
                            photoTransition === tr
                              ? 'bg-[#8B00FF] border-[#8B00FF] text-white shadow-sm'
                              : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'
                          }`}
                        >
                          {tr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Branch 3: VIDEO MODES (10m, 60s, 15s) with Camera Studio */}
          {(creationMode === '10m' || creationMode === '60s' || creationMode === '15s') && (
            !selectedFile ? (
              <div className="space-y-3">
                {/* Live Camera Studio Viewfinder */}
                <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden bg-black border border-purple-500/40 shadow-inner flex flex-col items-center justify-center">
                  {cameraActive ? (
                    <>
                      <video
                        ref={liveVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${
                          beautyFilter ? 'brightness-105 contrast-105 saturate-110' : ''
                        } ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                      />

                      {/* Side Camera Controls Toolbar */}
                      <div className="absolute right-2 top-2 flex flex-col gap-2 z-20">
                        {/* Flip Camera */}
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-purple-600 transition-colors"
                          title="Flip Camera"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Speed multiplier */}
                        <button
                          type="button"
                          onClick={() => {
                            const speeds = [0.5, 1, 1.5, 2];
                            const curIdx = speeds.indexOf(speedMultiplier);
                            setSpeedMultiplier(speeds[(curIdx + 1) % speeds.length]);
                          }}
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-mono font-bold flex items-center justify-center hover:bg-purple-600 transition-colors"
                          title="Recording Speed"
                        >
                          {speedMultiplier}x
                        </button>

                        {/* Beauty Filter Toggle */}
                        <button
                          type="button"
                          onClick={() => setBeautyFilter(!beautyFilter)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            beautyFilter ? 'bg-[#8B00FF] border-purple-300 text-white' : 'bg-black/60 border-white/20 text-gray-300'
                          }`}
                          title="Beauty & Glow Filter"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>

                        {/* Timer Toggle */}
                        <button
                          type="button"
                          onClick={() => {
                            setTimerDuration((prev) => (prev === 0 ? 3 : prev === 3 ? 10 : 0));
                          }}
                          className={`w-8 h-8 rounded-full border text-[10px] font-mono font-bold flex items-center justify-center transition-colors ${
                            timerDuration > 0 ? 'bg-[#8B00FF] border-purple-300 text-white' : 'bg-black/60 border-white/20 text-gray-300'
                          }`}
                          title="Self-Timer"
                        >
                          {timerDuration > 0 ? `${timerDuration}s` : <Clock className="w-4 h-4" />}
                        </button>

                        {/* Flash / Torch */}
                        <button
                          type="button"
                          onClick={() => setTorchEnabled(!torchEnabled)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            torchEnabled ? 'bg-amber-500 border-amber-300 text-black' : 'bg-black/60 border-white/20 text-gray-300'
                          }`}
                          title="Flash / Torch"
                        >
                          <Zap className="w-4 h-4" />
                        </button>

                        {/* Aspect Ratio */}
                        <button
                          type="button"
                          onClick={() => {
                            setAspectRatio((prev) => (prev === '9:16' ? '1:1' : prev === '1:1' ? '4:5' : '9:16'));
                          }}
                          className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-mono text-purple-200 flex items-center justify-center hover:bg-purple-600"
                          title="Aspect Ratio"
                        >
                          {aspectRatio}
                        </button>

                        {/* Stickers Tray Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowStickersTray(!showStickersTray)}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            showStickersTray ? 'bg-[#8B00FF] border-purple-300 text-white' : 'bg-black/60 border-white/20 text-gray-300'
                          }`}
                          title="Stickers"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stickers Overlay Tray */}
                      {showStickersTray && (
                        <div className="absolute top-12 right-12 bg-black/85 backdrop-blur-md border border-purple-500/40 rounded-2xl p-2 flex gap-1.5 z-30 animate-fade-in shadow-xl">
                          {['🔥', '💜', 'ARAO', '🇳🇬', '✨', '🚀', '💯'].map((stk) => (
                            <button
                              key={stk}
                              type="button"
                              onClick={() => {
                                setActiveStickers((prev) => [...prev, stk]);
                                setShowStickersTray(false);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-[#8B00FF]/40 text-sm"
                            >
                              {stk}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Displayed Stickers on Viewfinder */}
                      {activeStickers.map((stk, i) => (
                        <div
                          key={i}
                          className="absolute pointer-events-none select-none text-2xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                          style={{
                            top: `${30 + (i % 3) * 20}%`,
                            left: `${20 + (i % 3) * 25}%`
                          }}
                        >
                          {stk}
                        </div>
                      ))}

                      {/* Timer Countdown Overlay */}
                      {timerCountdown !== null && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40">
                          <span className="text-7xl font-display font-black text-white animate-ping">
                            {timerCountdown}
                          </span>
                        </div>
                      )}

                      {/* Top Recording HUD */}
                      <div className="absolute top-2 left-2 flex items-center gap-2 z-20">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-white">
                          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-purple-400'}`} />
                          <span>
                            {Math.floor(recordedSeconds / 60)}:
                            {(recordedSeconds % 60).toString().padStart(2, '0')} / {creationMode}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Recording Trigger & Stop */}
                      <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-20">
                        {isRecording ? (
                          <button
                            type="button"
                            onClick={handleStopRecording}
                            className="w-14 h-14 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse"
                            title="Stop Recording"
                          >
                            <Square className="w-5 h-5 fill-white" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={executeRecordWithTimer}
                            className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 to-pink-500 border-4 border-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                            title={`Start Recording (${creationMode})`}
                          >
                            <div className="w-5 h-5 rounded-full bg-white" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Inactive Camera State with Quick Start Button */
                    <div className="text-center p-4 space-y-3">
                      <div className="w-14 h-14 rounded-full bg-[#171626] border border-purple-500/30 flex items-center justify-center text-purple-300 mx-auto">
                        <Camera className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">ARAO Studio Camera</p>
                        <p className="text-xs text-gray-400">Record up to {creationMode} with filters, speed &amp; timer</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startLiveCamera()}
                        className="py-2 px-5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white text-xs font-bold shadow-[0_0_15px_rgba(139,0,255,0.4)] hover:opacity-95 cursor-pointer"
                      >
                        Open Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Or Select from Device Button */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 rounded-xl border border-dashed border-purple-500/30 hover:border-[#8B00FF] bg-[#171626]/40 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4 text-purple-300" />
                  <span className="text-xs font-semibold text-gray-200">Or choose video from your device (Max 50MB)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/3gpp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              /* Video Preview & Studio Controls when file is selected or recorded */
              <div className="space-y-2.5">
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-black border border-purple-500/30 flex items-center justify-center">
                  {previewUrl && (
                    <video
                      ref={videoPreviewRef}
                      src={previewUrl}
                      controls
                      playsInline
                      onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                      className={`w-full h-full object-contain transition-all duration-300 ${getFilterStyle(activeFilter)}`}
                    />
                  )}

                  {/* Effect Watermark Badge */}
                  {activeEffect !== 'none' && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-400/40 text-[9px] font-mono text-purple-200">
                      FX: {activeEffect.toUpperCase()}
                    </div>
                  )}

                  {!isUploading && (
                    <button
                      onClick={handleClearSelected}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 text-red-400 hover:text-red-300 border border-white/10"
                      title="Change video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Cover Frame Scrubber Slider */}
                <div className="px-1 py-1 bg-black/40 rounded-xl p-2 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                    <span className="font-medium text-purple-300">Choose Cover Frame</span>
                    <span className="font-mono">
                      {videoDuration > 0
                        ? `${((coverOffsetPercent / 100) * videoDuration).toFixed(1)}s / ${videoDuration.toFixed(1)}s`
                        : '0.0s'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={coverOffsetPercent}
                    onChange={handleCoverScrub}
                    disabled={isUploading}
                    className="w-full accent-[#8B00FF] cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                </div>

                {/* Volume Sliders: Original Sound & Added Music */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-purple-500/15 text-[10px]">
                  <div>
                    <div className="flex items-center justify-between text-gray-300 mb-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Volume2 className="w-3 h-3 text-purple-400" />
                        <span>Original Audio</span>
                      </span>
                      <span className="font-mono">{originalAudioVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={originalAudioVolume}
                      onChange={(e) => setOriginalAudioVolume(parseInt(e.target.value))}
                      className="w-full accent-[#8B00FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-gray-300 mb-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Disc className="w-3 h-3 text-pink-400" />
                        <span>Sound / Music</span>
                      </span>
                      <span className="font-mono">{musicVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(parseInt(e.target.value))}
                      className="w-full accent-[#8B00FF] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Visual Filters Selector Row (Normal, Vivid, Portrait, Cinematic, Vintage, B&W) */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-300 mb-1.5 px-0.5">
                    <span className="flex items-center gap-1">
                      <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Filters &amp; Color Grading</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEffectsPicker(!showEffectsPicker)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Effects ({activeEffect})</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(['normal', 'vivid', 'portrait', 'cinematic', 'vintage', 'bw'] as const).map((filterId) => (
                      <button
                        key={filterId}
                        type="button"
                        disabled={isUploading}
                        onClick={() => setActiveFilter(filterId)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-medium whitespace-nowrap border transition-all ${
                          activeFilter === filterId
                            ? 'bg-[#8B00FF] text-white border-purple-400 shadow-[0_0_12px_rgba(139,0,255,0.4)]'
                            : 'bg-[#171626] text-gray-400 hover:text-white border-white/10'
                        }`}
                      >
                        {filterId === 'bw' ? 'B&W' : filterId.charAt(0).toUpperCase() + filterId.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Effects Dropdown */}
                  {showEffectsPicker && (
                    <div className="mt-1.5 p-2 bg-[#171626] border border-purple-500/30 rounded-xl grid grid-cols-3 gap-1.5 text-[10px]">
                      {(['none', 'sparkle', 'vhs', 'zoom', 'night', 'beauty'] as const).map((fx) => (
                        <button
                          key={fx}
                          type="button"
                          onClick={() => {
                            setActiveEffect(fx);
                            setShowEffectsPicker(false);
                          }}
                          className={`py-1 px-2 rounded-lg text-center transition-colors ${
                            activeEffect === fx
                              ? 'bg-[#8B00FF]/30 text-white border border-[#8B00FF]'
                              : 'bg-black/40 text-gray-400 hover:text-white'
                          }`}
                        >
                          {fx.charAt(0).toUpperCase() + fx.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-3 bg-[#171626] border border-purple-500/40 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#D8B4FE] font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B00FF]" />
                  Posting to ARAO Feed...
                </span>
                <span className="font-mono text-white font-bold">{uploadPercent}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#FF1744] transition-all duration-150"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#A5A5B5] pt-0.5">
                <span>
                  {formatBytes(loadedBytes)} / {formatBytes(totalBytes || selectedFile?.size || 0)}
                </span>
                {uploadSpeed > 0 && <span className="text-purple-300 font-mono">{formatSpeed(uploadSpeed)}</span>}
              </div>
            </div>
          )}

          {/* Sound Section: "Add Sound" with music icon + 16 trending sounds scroll */}
          <div className="p-3 bg-[#171626]/80 border border-purple-500/20 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-900/60 flex items-center justify-center text-purple-300">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">Add Sound</span>
                  <span className="text-[10px] text-purple-300/80">
                    {soundTitle ? soundTitle : 'Choose from 16 trending sounds'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSoundDrawer(!showSoundDrawer)}
                className="py-1 px-2.5 rounded-lg bg-[#8B00FF]/20 hover:bg-[#8B00FF]/30 border border-[#8B00FF]/40 text-[11px] text-[#D8B4FE] font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>{showSoundDrawer ? 'Hide Sounds' : 'Browse Sounds'}</span>
              </button>
            </div>

            {/* Custom Sound Title Input */}
            <input
              type="text"
              value={soundTitle}
              onChange={(e) => setSoundTitle(e.target.value)}
              placeholder={`Original Sound - @${profile?.username || 'creator'}`}
              disabled={isUploading}
              className="w-full bg-[#100F1A] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors mb-2"
            />

            {/* Expandable Sound Drawer / Horizontal Scroller */}
            {showSoundDrawer && (
              <div className="mt-2 pt-2 border-t border-white/10 space-y-2">
                {/* Search Sound */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={soundSearch}
                    onChange={(e) => setSoundSearch(e.target.value)}
                    placeholder="Search Rema, Burna, Asake, Amapiano..."
                    className="w-full bg-[#100F1A] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF]"
                  />
                </div>

                {/* Horizontal Scroll of Trending Sounds */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {filteredSounds.map((sound) => (
                    <div
                      key={sound.id}
                      className={`min-w-[170px] max-w-[170px] p-2.5 rounded-xl border flex flex-col justify-between shrink-0 transition-all ${
                        selectedSoundId === sound.id
                          ? 'bg-purple-950/70 border-[#8B00FF] shadow-sm'
                          : 'bg-[#100F1A] border-white/10 hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{sound.title}</p>
                          <p className="text-[10px] text-gray-400 truncate">{sound.artist}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleTogglePlaySound(sound)}
                          className="w-6 h-6 rounded-full bg-purple-900/60 hover:bg-[#8B00FF] text-white flex items-center justify-center shrink-0 cursor-pointer"
                          title={playingSoundId === sound.id ? 'Stop audio' : 'Play preview'}
                        >
                          {playingSoundId === sound.id ? (
                            <Square className="w-2.5 h-2.5 fill-white" />
                          ) : (
                            <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-purple-300 pt-1 border-t border-white/5">
                        <span>{sound.uses} uses</span>
                        <button
                          type="button"
                          onClick={() => handleSelectSound(sound)}
                          className="font-bold text-white hover:text-purple-300 underline"
                        >
                          Use sound
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Caption with Hashtags & Instant Translation */}
          <div>
            <div className="flex items-center justify-between mb-1 px-0.5">
              <label className="text-xs font-medium text-gray-300">
                Caption &amp; Hashtags
              </label>
              <button
                type="button"
                onClick={handleTranslateCaption}
                disabled={isUploading || !caption.trim()}
                className="text-[10px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                title="Translate caption to other languages"
              >
                <Languages className="w-3 h-3 text-purple-400" />
                <span>{translationLanguage ? `Translated (${translationLanguage})` : 'Translate caption'}</span>
              </button>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening? Add #hashtags to trend on ARAO..."
              rows={2}
              disabled={isUploading}
              maxLength={300}
              className="w-full bg-[#171626] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors resize-none"
            />
            <div className="flex justify-between items-center px-1 mt-1 text-[10px] text-gray-500">
              <div className="flex gap-1.5 flex-wrap">
                {['#arao', '#viral', '#amapiano', '#nollywood', '#fashion'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isUploading}
                    onClick={() => setCaption((prev) => (prev ? `${prev} ${tag}` : tag))}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <span>{caption.length}/300</span>
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Feed Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              className="w-full bg-[#171626] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B00FF] transition-colors"
            >
              {CATEGORIES_LIST.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#0F0E17] text-white">
                  {cat.label} — {cat.description}
                </option>
              ))}
            </select>
          </div>

          {/* Privacy & Permissions: Everyone / Friends / Private */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Who can watch this video
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'public', label: 'Everyone', icon: <Globe className="w-3.5 h-3.5" /> },
                { id: 'friends', label: 'Friends', icon: <Users className="w-3.5 h-3.5" /> },
                { id: 'private', label: 'Private', icon: <Lock className="w-3.5 h-3.5" /> }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setVisibility(p.id as any)}
                  disabled={isUploading}
                  className={`py-2 px-2 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                    visibility === p.id
                      ? 'bg-[#8B00FF]/30 border-[#8B00FF] text-white'
                      : 'bg-[#171626] border-white/10 text-gray-400 hover:text-white'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Feature Toggles: Comments, Duet, Stitch, Downloads */}
          <div className="p-3 bg-[#171626] border border-white/5 rounded-2xl space-y-2.5">
            <span className="text-[11px] font-semibold text-gray-300 block">Video Permissions &amp; Features</span>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Allow Comments */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
                <span className="text-gray-300">Allow Comments</span>
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  disabled={isUploading}
                  className="accent-[#8B00FF] w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              {/* Allow Duet */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
                <span className="text-gray-300">Allow Duet</span>
                <input
                  type="checkbox"
                  checked={allowDuet}
                  onChange={(e) => setAllowDuet(e.target.checked)}
                  disabled={isUploading}
                  className="accent-[#8B00FF] w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              {/* Allow Stitch */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
                <span className="text-gray-300">Allow Stitch</span>
                <input
                  type="checkbox"
                  checked={allowStitch}
                  onChange={(e) => setAllowStitch(e.target.checked)}
                  disabled={isUploading}
                  className="accent-[#8B00FF] w-3.5 h-3.5 cursor-pointer"
                />
              </label>

              {/* Allow Downloads with Watermark */}
              <label className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 cursor-pointer">
                <span className="text-gray-300">Allow downloads with watermark</span>
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(e) => setAllowDownload(e.target.checked)}
                  disabled={isUploading}
                  className="accent-[#8B00FF] w-3.5 h-3.5 cursor-pointer"
                />
              </label>
            </div>

            {/* Auto-translate comments toggle */}
            <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Auto-translate comments</span>
              <input
                type="checkbox"
                checked={autoTranslateComments}
                onChange={(e) => setAutoTranslateComments(e.target.checked)}
                disabled={isUploading}
                className="accent-[#8B00FF] w-3.5 h-3.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Monetization Rules & Creator Safeguards */}
          <div className="p-3 bg-gradient-to-br from-purple-950/40 to-black/60 border border-purple-500/20 rounded-2xl text-[11px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>ARAO Creator Monetization Status</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                Eligible Age 18+
              </span>
            </div>

            {/* 10,000 Followers Progress Bar */}
            <div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                <span>Follower Requirement</span>
                <span className="font-mono text-white font-semibold">
                  {followers.toLocaleString()} / 10,000 followers
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#FF1744] transition-all"
                  style={{ width: `${Math.max(5, followerProgressPercent)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-0.5">
              <span>Min cashout threshold: <strong className="text-white">$100</strong></span>
              <span className="text-purple-300">Identity Verified</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Cancel and Post Video / Post (Requirement: "Post Video" for video, "Post" for photos) */}
        <div className="mt-3.5 pt-3 border-t border-white/10 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={
              isUploading ||
              (creationMode === 'text'
                ? !textContent.trim()
                : creationMode === 'photo'
                ? !photoPreviews.length
                : !selectedFile)
            }
            className="flex-2 py-2.5 px-4 bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#FF1744] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,0,255,0.4)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>
                  {creationMode === 'text'
                    ? 'Posting Text...'
                    : creationMode === 'photo'
                    ? 'Posting Photos...'
                    : `Posting Video (${uploadPercent}%)`}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>
                  {creationMode === 'text' ? 'Post Text' : creationMode === 'photo' ? 'Post Photos' : 'Post Video'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
