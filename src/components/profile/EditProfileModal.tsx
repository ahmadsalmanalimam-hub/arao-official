import React, { useState } from 'react';
import { X, User, AtSign, FileText, Image as ImageIcon, Loader2, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  checkUsernameAvailable,
  PRESET_HUMAN_AVATARS,
  PRESET_COVER_IMAGES,
  getDefaultHumanAvatar
} from '../../services/userService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { profile, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState(profile?.avatar || '');
  const [coverImage, setCoverImage] = useState(profile?.coverImage || PRESET_COVER_IMAGES[0]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !profile) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername.length < 3) {
        throw new Error('Username must be at least 3 characters.');
      }

      if (cleanUsername !== profile.username.toLowerCase()) {
        const available = await checkUsernameAvailable(cleanUsername, profile.uid);
        if (!available) {
          throw new Error(`Username @${cleanUsername} is already taken.`);
        }
      }

      await updateProfile({
        displayName: displayName.trim() || cleanUsername,
        username: cleanUsername,
        bio: bio.trim(),
        avatar: avatar || getDefaultHumanAvatar(displayName),
        coverImage
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#12121C] border border-purple-500/25 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(112,0,255,0.2)] text-white my-auto max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-display text-xl font-bold mb-1 text-white">Edit Creator Profile</h2>
        <p className="text-xs text-[#A5A5B5] mb-4">Customize your public presence and branding</p>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-1">
          {/* Profile Picture Upload & Presets */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Profile Picture</label>
            <div className="flex items-center gap-4 mb-3">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#8B00FF] shrink-0 bg-zinc-900">
                <img src={avatar || getDefaultHumanAvatar(displayName)} alt="Avatar Preview" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                  <Camera className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                </label>
              </div>

              <div>
                <label className="py-1.5 px-3 rounded-xl bg-purple-600/20 border border-purple-500/40 text-xs font-semibold text-purple-200 hover:bg-purple-600/30 cursor-pointer inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                </label>
                <p className="text-[10px] text-[#A5A5B5] mt-1">Or choose a professional portrait:</p>
              </div>
            </div>

            {/* Presets */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {PRESET_HUMAN_AVATARS.map((presetUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setAvatar(presetUrl)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                    avatar === presetUrl ? 'border-[#8B00FF] ring-2 ring-[#8B00FF]/50' : 'border-white/20'
                  }`}
                >
                  <img src={presetUrl} alt="Preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Profile Cover Image Presets */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Profile Cover Banner</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COVER_IMAGES.map((cUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCoverImage(cUrl)}
                  className={`h-12 rounded-xl overflow-hidden border-2 transition-transform cursor-pointer ${
                    coverImage === cUrl ? 'border-[#8B00FF] ring-2 ring-[#8B00FF]/50' : 'border-white/10'
                  }`}
                >
                  <img src={cUrl} alt="Cover" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Username <span className="text-[#8B00FF]">*</span>
            </label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Biography</label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={160}
                rows={3}
                placeholder="Share your style, story, or link..."
                className="w-full bg-[#1A1926] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8B00FF] transition-colors resize-none"
              />
            </div>
            <p className="text-[10px] text-gray-500 text-right mt-0.5">{bio.length}/160</p>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#8B00FF] text-white font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-40 shadow-[0_0_15px_rgba(139,0,255,0.4)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
