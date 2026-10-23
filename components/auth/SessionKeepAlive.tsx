'use client';

import { useEffect } from 'react';

/** Under the 15-minute access token, so an open tab never meets an expired one. */
const REFRESH_EVERY_MS = 10 * 60 * 1000;

/**
 * Keeps a signed-in dashboard signed in: renews the session in the background
 * while the tab is visible, and as soon as the user returns to a tab that sat
 * idle. Only a 401 from /api/auth/refresh means the session is over.
 */
export default function SessionKeepAlive() {
  useEffect(() => {
    let last = Date.now();

    const refresh = async () => {
      last = Date.now();
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
        if (res.status === 401) window.location.assign(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`);
      } catch {
        // Offline or backend busy: try again on the next tick.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last >= REFRESH_EVERY_MS) void refresh();
    };

    const timer = setInterval(onVisible, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
