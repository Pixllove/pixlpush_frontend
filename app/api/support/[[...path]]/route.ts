import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callBackend, callBackendSupportStream, callBackendWithRefresh, getRefreshToken, getSessionToken } from '@/lib/auth/server';
import { SUPPORT_GUEST_COOKIE } from '@/lib/support/cookies';

const guestCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 30 * 24 * 60 * 60,
};

type Params = { params: { path?: string[] } };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function proxy(request: Request, { params }: Params) {
  if (!params.path?.length || !sameOrigin(request)) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  const path = params.path.map(encodeURIComponent).join('/');
  const guestToken = cookies().get(SUPPORT_GUEST_COOKIE)?.value;
  // Never mix a guest support capability with an authenticated account request.
  // If only a refresh cookie remains, callBackendWithRefresh can restore the
  // session instead of silently treating the request as guest support.
  const authenticated = Boolean(getSessionToken() || getRefreshToken());
  // Signed-in requests also carry the guest token so the backend can move
  // this browser's guest tickets and chats into the account.
  const headers = guestToken ? { 'x-pixlpush-support-token': guestToken } : undefined;
  if (request.method === 'GET' && params.path.at(-1) === 'stream') {
    let upstream = await callBackendSupportStream('/support/' + path, { authenticated, guestToken: headers ? guestToken : undefined });
    let usedGuestFallback = false;
    if (authenticated && guestToken && [401, 404].includes(upstream.status)) {
      void upstream.response?.body?.cancel().catch(() => undefined);
      upstream = await callBackendSupportStream('/support/' + path, { authenticated: false, guestToken });
      usedGuestFallback = upstream.response?.ok === true;
    }
    if (!upstream.response) return NextResponse.json({ error: { code: 'BACKEND_UNAVAILABLE', message: 'Support updates are temporarily unavailable.' } }, { status: upstream.status });
    const response = new NextResponse(upstream.response.body, {
      status: upstream.response.status,
      headers: {
        'Content-Type': upstream.response.headers.get('content-type') ?? 'application/json',
        'Cache-Control': upstream.response.headers.get('cache-control') ?? 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
    if (usedGuestFallback && guestToken) response.cookies.set(SUPPORT_GUEST_COOKIE, guestToken, guestCookieOptions);
    return response;
  }
  const body = request.method === 'GET' ? undefined : await request.json().catch(() => ({}));
  const query = new URL(request.url).search;
  const backendPath = `/support/${path}${request.method === 'GET' ? query : ''}`;
  const init = request.method === 'GET' ? { headers } : { method: request.method, body, headers };
  let result = authenticated
    ? await callBackendWithRefresh(backendPath, init)
    : await callBackend(backendPath, init);
  let usedGuestFallback = false;
  if (authenticated && guestToken && [401, 404].includes(result.status)) {
    // A stale session or account-owned lookup must not strand a guest ticket.
    // The backend still verifies the captured capability; never fall back on 403s.
    const guestHeaders = { 'x-pixlpush-support-token': guestToken };
    const guestResult = await callBackend(backendPath, { ...init, headers: guestHeaders });
    result = guestResult;
    usedGuestFallback = guestResult.ok;
  }

  const payload = result.body as { data?: { guestToken?: string } } | null;
  const token = payload?.data?.guestToken;
  if (token && payload?.data) {
    const data = { ...payload.data };
    delete data.guestToken;
    const response = NextResponse.json({ ...payload, data }, { status: result.status });
    response.cookies.set(SUPPORT_GUEST_COOKIE, token, guestCookieOptions);
    return response;
  }
  const response = NextResponse.json(result.body, { status: result.status });
  if (usedGuestFallback && guestToken) response.cookies.set(SUPPORT_GUEST_COOKIE, guestToken, guestCookieOptions);
  return response;
}

export { proxy as GET, proxy as POST, proxy as PATCH };
