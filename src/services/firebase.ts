/**
 * AbroadPath AI - Firebase Client SDK Initialization
 * File: src/services/firebase.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R4) & PROJECT.md
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDTl3Qmg-SZr0RvfwKSbnMQ826ThSCnnCk',
  authDomain: 'careergoals-296e4.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'careergoals-296e4',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'careergoals-296e4.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '486856283911',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:486856283911:web:4a1cdcb9ee4fd1f69d17a2',
};

// Singleton initialization pattern to prevent duplicate app initialization
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
if (appCheckSiteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Local Emulator configuration if requested
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.info('[Firebase] Connected to local Firebase Emulators (Auth:9099, Firestore:8080)');
  } catch (err) {
    console.warn('[Firebase] Emulator connection warning:', err);
  }
}
