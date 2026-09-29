'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
} from 'firebase/auth';

/**
 * These are public by design: Firebase web config ships in every client bundle.
 * The security of Google sign-in comes from Google's signature on the ID token,
 * which the backend verifies - not from hiding these values.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // On HTTPS, our own host: /__/auth is proxied to Firebase (next.config.mjs),
  // keeping the redirect flow first-party. Firebase always opens the handler
  // over https, so plain-http localhost keeps the firebaseapp.com domain.
  authDomain:
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? window.location.host
      : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isGoogleSignInConfigured = Boolean(config.apiKey && config.projectId && config.appId);

function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config as Required<typeof config>);
}

/**
 * Sends the current tab to Google's account chooser; the page is left behind,
 * so this never resolves. The result is picked up by getGoogleRedirectIdToken()
 * when Google sends the user back.
 */
export async function startGoogleRedirect(): Promise<void> {
  await signInWithRedirect(getAuth(firebaseApp()), new GoogleAuthProvider());
}

/**
 * Returns the Google ID token after a redirect back from Google, or null when
 * this page load isn't one. This is the only value the backend can verify:
 * not the uid, and not the OAuth access token from credentialFromResult().
 */
export async function getGoogleRedirectIdToken(): Promise<string | null> {
  const result = await getRedirectResult(getAuth(firebaseApp()));
  return result ? result.user.getIdToken() : null;
}
