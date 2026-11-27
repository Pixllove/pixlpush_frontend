/**
 * Webhook feed page settings shown in the docs, the AI prompt and the setup guide.
 * Change them here and every page follows. Keep equal to FEED_PAGE_SIZE / FEED_MAX_MB /
 * FEED_TIMEOUT_MS in the backend (src/modules/integrations/providers/webhook.ts).
 * Production: 2500 / 5 / 15. TESTING now: 50000 / 60 / 60.
 */
/** Events PixlPush reads ahead of applying (one import cycle), in several requests. */
export const FEED_PAGE_SIZE = 50000;
/** Events per request (the limit query parameter). Keep equal to FEED_FETCH_SIZE in the backend (1,000 on Supabase Edge). */
export const FEED_FETCH_SIZE = 1000;
export const FEED_MAX_MB = 60;
export const FEED_TIMEOUT_SECONDS = 60;

/** "50,000" — for prose. FEED_PAGE_SIZE is the raw value for URLs and code. */
export const FEED_PAGE = FEED_PAGE_SIZE.toLocaleString("en-US");
export const FEED_FETCH = FEED_FETCH_SIZE.toLocaleString("en-US");
