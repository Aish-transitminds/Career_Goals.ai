/**
 * AbroadPath AI - Authentication Context & Provider
 * File: src/context/AuthContext.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  getUserProfile,
  saveUserProfile,
  deleteUserProfileAndData,
} from '../services/firestoreService';
import { UserProfile } from '../types';

export interface MockUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  isMock: true;
}

export type AuthUser = (User | MockUser) & { isMock?: boolean };

export type MockPreset = 'standard' | 'no-exams' | 'low-budget';

export interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isMockAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMock: (preset?: MockPreset) => Promise<void>;
  signOutUser: () => Promise<void>;
  deleteMyData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const MOCK_STORAGE_KEY = 'abroadpath_mock_user';
const MOCK_PROFILE_STORAGE_KEY = 'abroadpath_mock_profile';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if mock mode is requested or fallback is needed
  const isMockAuthEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const forceMock = urlParams.get('mock_auth') === 'true';
    const envMock = import.meta.env.VITE_USE_MOCK_AUTH === 'true';
    const placeholderApiKey =
      !import.meta.env.VITE_FIREBASE_API_KEY ||
      import.meta.env.VITE_FIREBASE_API_KEY.includes('placeholder');
    return forceMock || envMock || placeholderApiKey;
  }, []);

  // Fetch or refresh profile
  const fetchProfileForUser = async (u: AuthUser) => {
    try {
      if (u.isMock) {
        const storedMockProfile = localStorage.getItem(MOCK_PROFILE_STORAGE_KEY);
        if (storedMockProfile) {
          setProfile(JSON.parse(storedMockProfile));
          return;
        }
      }
      const p = await getUserProfile(u.uid);
      setProfile(p);
    } catch (err: any) {
      console.warn('[Auth] Failed to fetch user profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileForUser(user);
    }
  };

  // Initialize listener & redirect result
  useEffect(() => {
    // Check local storage for persistent mock session
    const savedMock = localStorage.getItem(MOCK_STORAGE_KEY);
    if (savedMock) {
      try {
        const parsedUser = JSON.parse(savedMock);
        setUser(parsedUser);
        const savedProfile = localStorage.getItem(MOCK_PROFILE_STORAGE_KEY);
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        localStorage.removeItem(MOCK_PROFILE_STORAGE_KEY);
      }
    }

    // Check redirect sign-in result
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          setUser(result.user);
          await fetchProfileForUser(result.user);
        }
      })
      .catch((err) => {
        console.warn('[Auth] Redirect sign-in result error:', err);
      });

    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          await fetchProfileForUser(firebaseUser);
        } else if (!localStorage.getItem(MOCK_STORAGE_KEY)) {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[Auth] Auth state changed error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isMockAuthEnabled]);

  // Google Sign-In via full redirect (100% reliable, zero blank popups)
  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);

    if (
      isMockAuthEnabled &&
      (!import.meta.env.VITE_FIREBASE_API_KEY ||
        import.meta.env.VITE_FIREBASE_API_KEY.includes('placeholder'))
    ) {
      await signInWithMock('standard');
      return;
    }

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (redirectError: any) {
      console.warn('[Auth] Redirect sign-in failed, trying popup fallback:', redirectError);
      try {
        const result = await signInWithPopup(auth, googleProvider);
        setUser(result.user);
        localStorage.removeItem(MOCK_STORAGE_KEY);
        localStorage.removeItem(MOCK_PROFILE_STORAGE_KEY);
        await fetchProfileForUser(result.user);
      } catch (popupError: any) {
        setError(popupError.message || 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    }
  };

  // Mock Sign-In for Headless Testing / CI
  const signInWithMock = async (preset: MockPreset = 'standard') => {
    setLoading(true);
    let mockUser: MockUser;
    let mockProfile: UserProfile;

    const now = new Date().toISOString();

    switch (preset) {
      case 'no-exams':
        mockUser = {
          uid: 'mock_student_no_exams',
          displayName: 'Jordan Lee (No Exams)',
          email: 'jordan.lee@demo.org',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
          isMock: true,
        };
        mockProfile = {
          uid: mockUser.uid,
          name: mockUser.displayName,
          email: mockUser.email,
          examsTaken: false,
          exams: { gre: null, gmat: null, toefl: null, ielts: null },
          targetCountries: ['germany', 'ireland'],
          budget: 10000,
          createdAt: now,
          updatedAt: now,
        };
        break;

      case 'low-budget':
        mockUser = {
          uid: 'mock_student_low_budget',
          displayName: 'Maria Santos (Low Budget)',
          email: 'maria.santos@demo.org',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
          isMock: true,
        };
        mockProfile = {
          uid: mockUser.uid,
          name: mockUser.displayName,
          email: mockUser.email,
          examsTaken: true,
          exams: { gre: null, gmat: null, toefl: null, ielts: 6.5 },
          targetCountries: ['germany'],
          budget: 3000,
          createdAt: now,
          updatedAt: now,
        };
        break;

      case 'standard':
      default:
        mockUser = {
          uid: 'mock_student_standard',
          displayName: 'Alex Chen (Demo Student)',
          email: 'alex.chen@demo.org',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
          isMock: true,
        };
        mockProfile = {
          uid: mockUser.uid,
          name: mockUser.displayName,
          email: mockUser.email,
          examsTaken: true,
          exams: { gre: 320, gmat: null, toefl: 105, ielts: 7.5 },
          targetCountries: ['germany'],
          budget: 15000,
          createdAt: now,
          updatedAt: now,
        };
        break;
    }

    setUser(mockUser);
    setProfile(mockProfile);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mockUser));
    localStorage.setItem(MOCK_PROFILE_STORAGE_KEY, JSON.stringify(mockProfile));

    // Try saving mock profile in Firestore if emulator/backend is connected
    try {
      await saveUserProfile(mockProfile);
    } catch {
      // Offline / CI mock fallback
    }

    setLoading(false);
  };

  // Sign Out
  const signOutUser = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(MOCK_STORAGE_KEY);
      localStorage.removeItem(MOCK_PROFILE_STORAGE_KEY);
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // R4 Cascading Data Deletion ("Delete my data")
  const deleteMyData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const uid = user.uid;

    try {
      // 1. Delete Firestore user document and all subcollections
      try {
        await deleteUserProfileAndData(uid);
      } catch (firestoreErr) {
        console.warn('[Auth] Firestore delete warning:', firestoreErr);
      }

      // 2. Delete Auth account or sign out
      if (!user.isMock && auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (authDeleteErr) {
          console.warn('[Auth] Auth account delete requires recent login; signing out:', authDeleteErr);
          await signOut(auth);
        }
      }

      localStorage.removeItem(MOCK_STORAGE_KEY);
      localStorage.removeItem(MOCK_PROFILE_STORAGE_KEY);
      setUser(null);
      setProfile(null);
    } catch (err: any) {
      console.error('[Auth] Failed to delete user data:', err);
      setError(err.message || 'Failed to complete cascading data deletion');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isMockAuth: isMockAuthEnabled || Boolean(user?.isMock),
        signInWithGoogle,
        signInWithMock,
        signOutUser,
        deleteMyData,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
