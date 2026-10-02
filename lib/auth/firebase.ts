'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, getRedirectResult, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

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

/** Where Google sends the user back to. Sign-in is finished there, never on the page it started from. */
export const GOOGLE_CALLBACK_PATH = '/auth/google';

/**
 * Sends this tab to Google's account chooser. The page is left behind, so this
 * never resolves; getGoogleRedirectIdToken() picks the result up on the
 * callback page when Google sends the user back.
 *
 * @param next where to go once signed in (checked again before it is used)
 * @param from the page the button was on, to return to if sign-in is abandoned
 */
export async function startGoogleRedirect(next: string | null, from: string): Promise<void> {
  const provider = new GoogleAuthProvider();
  // Always show the chooser, even when the browser has a single Google session.
  provider.setCustomParameters({ prompt: 'select_account' });
  // Firebase returns to whatever the address bar holds when the redirect starts. Pointing it at the
  // callback page first means the user comes back there, not to the login form.
  const callback = `${GOOGLE_CALLBACK_PATH}?from=${encodeURIComponent(from)}${next ? `&redirect=${encodeURIComponent(next)}` : ''}`;
  const here = window.location.pathname + window.location.search;
  window.history.replaceState(null, '', callback);
  try {
    await signInWithRedirect(getAuth(firebaseApp()), provider);
  } catch (error) {
    window.history.replaceState(null, '', here); // nothing happened: this is still the page the user is on
    throw error;
  }
}

/**
 * The Google ID token after a redirect back from Google, or null when this page
 * load is not one. It is the only value the backend can verify: not the uid,
 * and not the OAuth access token.
 */
export async function getGoogleRedirectIdToken(): Promise<string | null> {
  const result = await getRedirectResult(getAuth(firebaseApp()));
  return result ? result.user.getIdToken() : null;
}
