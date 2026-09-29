/**
 * Provider redirects: only non-secret ids are remembered (sessionStorage,
 * this tab only) so the callback page knows which domain to finish. Codes,
 * states and tokens are never stored client-side.
 */
const KEY = 'pixlpush.sendingDomainConnection';

export interface PendingConnection {
  projectId: string;
  domainId: string;
  provider: string;
}

export function rememberConnection(pending: PendingConnection) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    /* Storage blocked: the callback reports an invalid link instead. */
  }
}

export function takeConnection(): PendingConnection | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return raw ? (JSON.parse(raw) as PendingConnection) : null;
  } catch {
    return null;
  }
}

/** Only https provider pages; anything else is refused. */
export function redirectToProvider(authorizationUrl: string) {
  const url = new URL(authorizationUrl);
  if (url.protocol !== 'https:') throw { status: 0, code: 'PROVIDER_CONNECTION_FAILED', message: '' };
  window.location.assign(url.toString());
}

/**
 * Reads the provider's result from the URL and immediately removes it from the
 * address bar and history, so the one-time code is never left visible.
 */
export function consumeCallbackParams(): { code?: string; state?: string; error?: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('state') && !params.has('code') && !params.has('error')) return null;
  const result = {
    code: params.get('code') ?? undefined,
    state: params.get('state') ?? undefined,
    error: params.get('error') ?? undefined,
  };
  window.history.replaceState(null, '', window.location.pathname);
  return result;
}
