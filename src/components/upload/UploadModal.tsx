import React, { useState, useRef } from 'react';
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
  Music,
  Trash2,
  DownloadCloud,
  MessageSquare,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  uploadVideoToCloudinary,
  validateVideoFile,
  formatBytes,
  formatSpeed,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
  MAX_VIDEO_SIZE_BYTES
} from '../../lib/cloudinary';
import { publishVideo } from '../../services/videoService';
import { CATEGORIES_LIST } from '../feed/CategoryPanel';

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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [soundTitle, setSoundTitle] = useState('');
  const [category, setCategory] = useState('entertainment');
  const [allowDownload, setAllowDownload] = useState(true);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortHandleRef = useRef<(() => void) | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      console.log('CloudName:', import.meta.env.VITE_CLOUDINARY_CLOUD_NAME, 'Preset:', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Requirement: Check file size <= 50MB before upload
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
      setErrorMessage(validation.error || 'Invalid video file.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelUpload = () => {
    if (abortHandleRef.current) {
      abortHandleRef.current();
    }
    setIsUploading(false);
    setUploadPercent(0);
    setErrorMessage('Upload cancelled.');
  };

  const handlePublish = async () => {
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }

    if (!selectedFile) {
      setErrorMessage('Please choose a video to upload.');
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
    setIsUploading(true);
    setUploadPercent(0);
    setLoadedBytes(0);
    setTotalBytes(selectedFile.size);
    setUploadSpeed(0);

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

      await publishVideo({
        videoUrl: cloudinaryResult.secure_url,
        cloudinaryPublicId: cloudinaryResult.public_id,
        userId: user.uid,
        username: profile.username,
        userDisplayName: profile.displayName,
        userAvatar: profile.avatar,
        caption: caption.trim() || 'Check out my new video on ARAO! ✨',
        category,
        allowDownload,
        visibility,
        soundTitle: soundTitle.trim() || `Original Sound - @${profile.username}`
      });

      // Requirement: After successful upload, close modal automatically
      setSuccess(true);
      handleClearSelected();
      setCaption('');
      setSoundTitle('');
      onClose();
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      console.error('Publishing error:', err);
      setErrorMessage(err.message || 'Upload failed, try smaller video or better network');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#12121C] border border-purple-500/25 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(112,0,255,0.25)] text-white my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isUploading}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7000FF] to-[#8B00FF] flex items-center justify-center text-white shadow-md">
            <Film className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Create on ARAO</h2>
            <p className="text-[11px] text-[#A5A5B5]">Publish high-definition short videos globally</p>
          </div>
        </div>

        {/* Errors / Success notifications */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/50 rounded-2xl flex flex-col gap-2 text-xs text-red-100 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block mb-0.5">Upload Notice</span>
                <span>{errorMessage}</span>
              </div>
            </div>
            {selectedFile && !isUploading && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handlePublish}
                  className="py-1.5 px-3 bg-gradient-to-r from-[#7000FF] to-[#8B00FF] hover:from-[#8B00FF] hover:to-[#FF1744] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Upload</span>
                </button>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Video published to ARAO successfully!</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
          {/* Video Picker / Preview */}
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-52 rounded-2xl border-2 border-dashed border-purple-500/30 hover:border-[#8B00FF] bg-[#1A1926]/50 flex flex-col items-center justify-center cursor-pointer group transition-all p-4 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#12121C] border border-purple-500/30 group-hover:bg-[#8B00FF]/20 flex items-center justify-center text-purple-300 group-hover:text-white transition-colors mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white group-hover:text-[#D8B4FE] transition-colors">
                Select video from device
              </p>
              <p className="text-xs text-[#A5A5B5] mt-1">MP4, MOV, or WebM • Max 50MB</p>
              <span className="mt-3 py-1 px-4 rounded-full bg-[#8B00FF]/15 border border-[#8B00FF]/40 text-[11px] text-[#D8B4FE] font-medium">
                Browse Files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/3gpp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative w-full h-52 rounded-2xl overflow-hidden bg-black border border-purple-500/20 mb-3 flex items-center justify-center">
              {previewUrl && (
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
              {!isUploading && (
                <button
                  onClick={handleClearSelected}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-red-400 hover:text-red-300 border border-white/10"
                  title="Change video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="p-3.5 bg-[#1A1926] border border-purple-500/40 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#D8B4FE] font-semibold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B00FF]" />
                  Uploading video to ARAO...
                </span>
                <span className="font-mono text-white font-bold">{uploadPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#FF1744] transition-all duration-150"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#A5A5B5] pt-0.5">
                <span>
                  {formatBytes(loadedBytes)} / {formatBytes(totalBytes || selectedFile?.size || 0)}
                </span>
                <div className="flex items-center gap-3">
                  {uploadSpeed > 0 && (
                    <span className="text-purple-300 font-mono">{formatSpeed(uploadSpeed)}</span>
                  )}
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="text-gray-400 hover:text-red-400 transition-colors cursor-pointer font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Caption & Hashtags */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Caption & Hashtags
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's your story? Use #hashtags to increase discovery..."
              rows={2}
              disabled={isUploading}
              maxLength={300}
              className="w-full bg-[#1A1926] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors resize-none"
            />
            <div className="flex justify-between items-center px-1 mt-1 text-[10px] text-gray-500">
              <div className="flex gap-1.5">
                {['#arao', '#viral', '#music', '#nollywood', '#fashion'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    disabled={isUploading}
                    onClick={() => setCaption((prev) => (prev ? `${prev} ${tag}` : tag))}
                    className="text-purple-300/80 hover:text-purple-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <span>{caption.length}/300</span>
            </div>
          </div>

          {/* Video Category Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isUploading}
              className="w-full bg-[#1A1926] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B00FF] transition-colors"
            >
              {CATEGORIES_LIST.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-[#12121C] text-white">
                  {cat.label} — {cat.description}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Title */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Audio / Sound Title
            </label>
            <div className="relative">
              <Music className="absolute left-3 top-2.5 w-4 h-4 text-purple-400" />
              <input
                type="text"
                value={soundTitle}
                onChange={(e) => setSoundTitle(e.target.value)}
                placeholder={`Original Sound - @${profile?.username || 'creator'}`}
                disabled={isUploading}
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
              />
            </div>
          </div>

          {/* Video Permissions: Allow Downloads Toggle */}
          <div className="p-3 bg-[#1A1926] border border-white/5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DownloadCloud className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-xs font-medium text-white block">Allow Video Downloads</span>
                <span className="text-[10px] text-[#A5A5B5]">Allow other users to save this video to device</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              disabled={isUploading}
              className="accent-[#8B00FF] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Visibility Options */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Audience Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                disabled={isUploading}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  visibility === 'public'
                    ? 'bg-[#8B00FF]/20 border-[#8B00FF] text-white'
                    : 'bg-[#1A1926] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public (Everyone)</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={isUploading}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                  visibility === 'private'
                    ? 'bg-[#8B00FF]/20 border-[#8B00FF] text-white'
                    : 'bg-[#1A1926] border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private (Only you)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Publish Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={!selectedFile || isUploading}
            className="flex-2 py-2.5 px-4 bg-gradient-to-r from-[#7000FF] via-[#8B00FF] to-[#FF1744] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,0,255,0.4)] hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Uploading ({uploadPercent}%)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Publish Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
