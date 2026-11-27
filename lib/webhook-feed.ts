/**
 * Webhook feed page settings shown in the docs, the AI prompt and the setup guide.
 * Change them here and every page follows. Keep equal to FEED_PAGE_SIZE / FEED_MAX_MB /
 * FEED_TIMEOUT_MS in the backend (src/modules/integrations/providers/webhook.ts).
 * Production: 2500 / 5 / 15. TESTING now: 50000 / 60 / 60.
 */
/** Events PixlPush reads per 2-minute cycle, in several requests. */
export const FEED_PAGE_SIZE = 50000;
/** Events per request (the limit query parameter). Keep equal to FEED_FETCH_SIZE in the backend. */
export const FEED_FETCH_SIZE = 5000;
export const FEED_MAX_MB = 60;
export const FEED_TIMEOUT_SECONDS = 60;

/** "50,000" — for prose. FEED_PAGE_SIZE is the raw value for URLs and code. */
export const FEED_PAGE = FEED_PAGE_SIZE.toLocaleString("en-US");
export const FEED_FETCH = FEED_FETCH_SIZE.toLocaleString("en-US");
/** First import of 1,000,000 events, one page every 2 minutes. */
export const FEED_MILLION_MINUTES = Math.ceil(1_000_000 / FEED_PAGE_SIZE) * 2;
