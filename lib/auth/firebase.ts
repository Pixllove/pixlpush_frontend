'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  type AuthError,
  type UserCredential,
} from 'firebase/auth';

/**
 * These are public by design: Firebase web config ships in every client bundle.
 * The security of Google sign-in comes from Google's signature on the ID token,
 * which the backend verifies - not from hiding these values.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isGoogleSignInConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config as Required<typeof config>);
}

const popupClosed = () =>
  Object.assign(new Error('Popup closed by user.'), { code: 'auth/popup-closed-by-user' }) as AuthError;

/**
 * Returns the Google ID token. This is the only value the backend can verify:
 * not the uid, and not the OAuth access token from credentialFromResult().
 *
 * signInWithPopup only notices a closed window on its own ~2s poll, and when
 * the window is dismissed before an account is picked it can stall past that,
 * leaving the caller awaiting a promise that never settles. Racing the sign-in
 * against our own poll means a cancel rejects promptly however Firebase behaves.
 */
export async function getGoogleIdToken(): Promise<string> {
  const auth = getAuth(firebaseApp());
  let popup: Window | null = null;

  // Firebase reuses whatever window.open returns during signInWithPopup, so
  // wrapping it is how we get a handle on the popup to watch.
  const open = window.open;
  window.open = ((...args: Parameters<typeof window.open>) => {
    popup = open.apply(window, args);
    return popup;
  }) as typeof window.open;

  let timer: ReturnType<typeof setInterval> | undefined;

  try {
    const credential = await Promise.race([
      signInWithPopup(auth, new GoogleAuthProvider()),
      new Promise<never>((_, reject) => {
        timer = setInterval(() => {
          if (popup?.closed) reject(popupClosed());
        }, 300);
      }),
    ]);

    return (credential as UserCredential).user.getIdToken();
  } finally {
    clearInterval(timer);
    window.open = open;
  }
}
