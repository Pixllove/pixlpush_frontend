import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { callBackend, callBackendWithRefresh, getRefreshToken, getSessionToken } from '@/lib/auth/server';
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
  const headers = !authenticated && guestToken ? { 'x-pixlpush-support-token': guestToken } : undefined;
  const body = request.method === 'GET' ? undefined : await request.json().catch(() => ({}));
  const result = request.method === 'GET'
    ? authenticated
      ? await callBackendWithRefresh(`/support/${path}${new URL(request.url).search}`, { headers })
      : await callBackend(`/support/${path}${new URL(request.url).search}`, { headers })
    : authenticated
      ? await callBackendWithRefresh(`/support/${path}`, { method: request.method, body, headers })
      : await callBackend(`/support/${path}`, { method: request.method, body, headers });

  const payload = result.body as { data?: { guestToken?: string } } | null;
  const token = payload?.data?.guestToken;
  if (token && payload?.data) {
    const data = { ...payload.data };
    delete data.guestToken;
    const response = NextResponse.json({ ...payload, data }, { status: result.status });
    response.cookies.set(SUPPORT_GUEST_COOKIE, token, guestCookieOptions);
    return response;
  }
  return NextResponse.json(result.body, { status: result.status });
}

export { proxy as GET, proxy as POST, proxy as PATCH };
