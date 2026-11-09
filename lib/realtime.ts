import type { RealtimeClient } from '@supabase/realtime-js';

/**
 * Live updates from the backend's `/realtime` endpoints. In production that is
 * a private Supabase Realtime channel (one topic per account or ticket, joined
 * with a short-lived token); without Supabase the caller's SSE stream is used.
 * The Supabase client (~17 KB gzipped) is loaded only when that mode is on.
 */
export type RealtimeAccess =
  | { mode: 'sse' }
  | { mode: 'supabase'; url: string; apiKey: string; topic: string; token: string; expiresAt: string };

type Options = {
  /** Fetches fresh access; called again before the token expires. */
  access: () => Promise<RealtimeAccess>;
  /** Broadcast events to listen for. */
  events: string[];
  onEvent: (event: string, payload: Record<string, unknown>) => void;
  /** live = subscribed; false = connecting or dropped (callers poll meanwhile). */
  onState?: (live: boolean) => void;
  /** Starts the SSE fallback and returns its cleanup. */
  sse: () => () => void;
};

export function listenLive({ access, events, onEvent, onState, sse }: Options): () => void {
  let stopped = false;
  let client: RealtimeClient | null = null;
  let stopSse: (() => void) | undefined;
  let refreshTimer: number | undefined;

  const scheduleRefresh = (expiresAt: string) => {
    const delay = Math.max(60_000, new Date(expiresAt).getTime() - Date.now() - 5 * 60_000);
    refreshTimer = window.setTimeout(async () => {
      try {
        const next = await access();
        if (stopped || !client || next.mode !== 'supabase') return;
        await client.setAuth(next.token);
        scheduleRefresh(next.expiresAt);
      } catch {
        scheduleRefresh(new Date().toISOString()); // retry in a minute
      }
    }, delay);
  };

  void access()
    .then(async (info) => {
      if (stopped) return;
      if (info.mode !== 'supabase') { stopSse = sse(); return; }
      const { RealtimeClient: Client } = await import('@supabase/realtime-js');
      if (stopped) return;
      client = new Client(`${info.url}/realtime/v1`, { params: { apikey: info.apiKey } });
      await client.setAuth(info.token);
      if (stopped) { void client.disconnect(); return; }
      const channel = client.channel(info.topic, { config: { private: true } });
      for (const event of events) channel.on('broadcast', { event }, ({ payload }) => onEvent(event, (payload ?? {}) as Record<string, unknown>));
      // The client rejoins by itself after errors; onState lets callers poll meanwhile.
      channel.subscribe((status) => { if (!stopped) onState?.(status === 'SUBSCRIBED'); });
      scheduleRefresh(info.expiresAt);
    })
    .catch(() => { if (!stopped) stopSse = sse(); });

  return () => {
    stopped = true;
    window.clearTimeout(refreshTimer);
    stopSse?.();
    if (client) { const c = client; void c.removeAllChannels().then(() => c.disconnect()); }
  };
}
