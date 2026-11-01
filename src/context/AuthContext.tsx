import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfile, UserSettings } from '../types';
import {
  getUserProfile,
  createUserProfile,
  checkUsernameAvailable,
  updateUserProfile as updateProfileDoc,
  getDefaultHumanAvatar
} from '../services/userService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authModalOpen: boolean;
  authMode: 'login' | 'register' | 'forgot_password';
  settings: UserSettings;
  openAuthModal: (mode?: 'login' | 'register' | 'forgot_password') => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, username: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  refreshProfile: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  soundOnByDefault: true,
  autoplay: true,
  dataSaver: false,
  videoQualityPreference: 'auto',
  whoCanComment: 'everyone',
  whoCanMessage: 'everyone',
  notificationsLike: true,
  notificationsComment: true,
  notificationsFollow: true,
  notificationsMessage: true
};

export const MY_EMAIL = 'nasirandco001@gmail.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('arao_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('arao_settings', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const openAuthModal = (mode: 'login' | 'register' | 'forgot_password' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const p = await getUserProfile(auth.currentUser.uid);
      const userEmail = auth.currentUser.email?.toLowerCase();
      const isMyAccount = userEmail === MY_EMAIL.toLowerCase();
      if (p) {
        const userData: UserProfile = {
          ...p,
          username: isMyAccount ? 'arao' : p.username,
          email: userEmail || p.email,
          isVerified: isMyAccount || p.isVerified === true,
          isOfficial: isMyAccount || p.isOfficial === true
        };
        console.log('Verified user:', userData.email, 'isVerified:', isMyAccount);
        setProfile(userData);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userEmail = currentUser.email?.toLowerCase();
          const isMyAccount = userEmail === MY_EMAIL.toLowerCase();

          let p = await getUserProfile(currentUser.uid);
          if (!p) {
            const defaultUser = isMyAccount
              ? 'arao'
              : (currentUser.displayName || userEmail?.split('@')[0] || 'arao_creator')
                  .replace(/[^a-zA-Z0-9_]/g, '_')
                  .slice(0, 15);

            p = await createUserProfile(
              currentUser.uid,
              currentUser.email || '',
              defaultUser,
              isMyAccount ? 'ARAO Official' : (currentUser.displayName || defaultUser),
              currentUser.photoURL || getDefaultHumanAvatar(defaultUser)
            );
          } else if (p.avatar && p.avatar.includes('dicebear.com/7.x/bottts')) {
            // Automatically upgrade legacy robot avatar to elegant human avatar
            const newAvatar = getDefaultHumanAvatar(p.displayName || p.username);
            await updateProfileDoc(p.uid, { avatar: newAvatar });
            p.avatar = newAvatar;
          }

          const userData: UserProfile = {
            ...p,
            username: isMyAccount ? 'arao' : p.username,
            email: userEmail || p.email,
            isVerified: isMyAccount || p.isVerified === true,
            isOfficial: isMyAccount || p.isOfficial === true,
            role: isMyAccount ? 'admin' : (p.role || 'user'),
            isPremium: isMyAccount ? true : (p.isPremium ?? false)
          };

          if (isMyAccount && (!p.isVerified || !p.isOfficial || p.username !== 'arao')) {
            await updateProfileDoc(currentUser.uid, {
              isVerified: true,
              isOfficial: true,
              username: 'arao',
              usernameLowercase: 'arao',
              role: 'admin',
              isPremium: true
            });
          }

          try {
            localStorage.setItem('arao_verified_user', JSON.stringify(userData));
            localStorage.setItem('arao_user_email', userEmail || '');
          } catch (e) {
            console.error(e);
          }

          console.log('Verified user:', userData.email, 'isVerified:', isMyAccount);

          setProfile(userData);
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const userEmail = cred.user.email?.toLowerCase();
    const isMyAccount = userEmail === MY_EMAIL.toLowerCase();

    let p = await getUserProfile(cred.user.uid);
    if (!p) {
      const defaultUser = isMyAccount
        ? 'arao'
        : (cred.user.displayName || userEmail?.split('@')[0] || 'arao_creator')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .slice(0, 15);

      p = await createUserProfile(
        cred.user.uid,
        userEmail || '',
        defaultUser,
        isMyAccount ? 'ARAO Official' : (cred.user.displayName || defaultUser),
        cred.user.photoURL || getDefaultHumanAvatar(defaultUser)
      );
    }

    const userData: UserProfile = {
      ...p,
      username: isMyAccount ? 'arao' : p.username,
      email: userEmail || p.email,
      isVerified: isMyAccount || p.isVerified === true,
      isOfficial: isMyAccount || p.isOfficial === true
    };

    if (isMyAccount) {
      await updateProfileDoc(cred.user.uid, {
        isVerified: true,
        isOfficial: true,
        username: 'arao',
        usernameLowercase: 'arao',
        email: userEmail
      });
    }

    try {
      localStorage.setItem('arao_verified_user', JSON.stringify(userData));
      localStorage.setItem('arao_user_email', userEmail || '');
    } catch (e) {
      console.error(e);
    }

    console.log('Verified user:', userData.email, 'isVerified:', isMyAccount);

    setProfile(userData);
    setAuthModalOpen(false);
  };

  const register = async (email: string, pass: string, username: string, displayName: string) => {
    const userEmail = email.trim().toLowerCase();
    const isMyAccount = userEmail === MY_EMAIL.toLowerCase();

    const targetUsername = isMyAccount ? 'arao' : username.trim().toLowerCase();
    const targetDisplayName = isMyAccount ? (displayName.trim() || 'ARAO Official') : (displayName.trim() || targetUsername);

    if (!isMyAccount) {
      if (targetUsername.length < 3) {
        throw new Error('Username must be at least 3 characters.');
      }
      if (!/^[a-z0-9_]+$/.test(targetUsername)) {
        throw new Error('Username can only contain letters, numbers, and underscores.');
      }

      const available = await checkUsernameAvailable(targetUsername);
      if (!available) {
        throw new Error(`Username @${targetUsername} is already taken. Please choose another.`);
      }
    }

    const humanAvatar = getDefaultHumanAvatar(targetDisplayName);
    const cred = await createUserWithEmailAndPassword(auth, userEmail, pass);
    await updateAuthProfile(cred.user, {
      displayName: targetDisplayName,
      photoURL: humanAvatar
    });

    const newProfile = await createUserProfile(
      cred.user.uid,
      userEmail,
      targetUsername,
      targetDisplayName,
      humanAvatar
    );

    const userData: UserProfile = {
      ...newProfile,
      username: isMyAccount ? 'arao' : targetUsername,
      email: userEmail,
      isVerified: isMyAccount,
      isOfficial: isMyAccount
    };

    if (isMyAccount) {
      await updateProfileDoc(cred.user.uid, {
        isVerified: true,
        isOfficial: true,
        username: 'arao',
        usernameLowercase: 'arao',
        email: userEmail
      });
    }

    try {
      localStorage.setItem('arao_verified_user', JSON.stringify(userData));
      localStorage.setItem('arao_user_email', userEmail);
    } catch (e) {
      console.error(e);
    }

    console.log('Verified user:', userData.email, 'isVerified:', isMyAccount);

    setProfile(userData);
    setAuthModalOpen(false);

    try {
      await sendEmailVerification(cred.user);
    } catch (e) {
      console.warn('Verification email error:', e);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
    try {
      localStorage.removeItem('arao_verified_user');
      localStorage.removeItem('arao_user_email');
    } catch (e) {
      console.error(e);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userEmail = (profile.email || user.email || '').toLowerCase();
    const isMyAccount = userEmail === MY_EMAIL.toLowerCase();

    // Requirement 3: Ensure even if username changes later, once email is nasirandco001@gmail.com, remain verified
    const finalUpdates: Partial<UserProfile> = {
      ...updates,
      ...(isMyAccount ? { isVerified: true, isOfficial: true } : {})
    };

    await updateProfileDoc(user.uid, finalUpdates);
    setProfile(prev => {
      if (!prev) return null;
      const updated: UserProfile = {
        ...prev,
        ...finalUpdates,
        ...(isMyAccount ? { isVerified: true, isOfficial: true } : {})
      };
      try {
        localStorage.setItem('arao_verified_user', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authModalOpen,
        authMode,
        settings,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        resetPassword,
        resendVerificationEmail,
        updateProfile,
        updateSettings,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
