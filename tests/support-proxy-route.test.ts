import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  callBackend: vi.fn(),
  callBackendWithRefresh: vi.fn(),
  callBackendSupportStream: vi.fn(),
  getRefreshToken: vi.fn(),
  getSessionToken: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: () => ({ get: mocks.cookieGet }) }));
vi.mock('@/lib/auth/server', () => ({
  callBackend: mocks.callBackend,
  callBackendWithRefresh: mocks.callBackendWithRefresh,
  callBackendSupportStream: mocks.callBackendSupportStream,
  getRefreshToken: mocks.getRefreshToken,
  getSessionToken: mocks.getSessionToken,
}));

import { GET, POST } from '@/app/api/support/[[...path]]/route';
import { SUPPORT_GUEST_COOKIE } from '@/lib/support/cookies';

const guestToken = 'captured-guest-capability';
const request = (url: string, method = 'GET', body?: unknown) => new Request(`http://localhost${url}`, {
  method,
  headers: { origin: 'http://localhost', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe('PixlPush support proxy guest recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookieGet.mockReturnValue({ value: guestToken });
    mocks.getSessionToken.mockReturnValue('stale-session');
    mocks.getRefreshToken.mockReturnValue('stale-refresh');
  });

  it('stores a new guest ticket capability in an HttpOnly cookie without returning it to JavaScript', async () => {
    mocks.getSessionToken.mockReturnValue(undefined);
    mocks.getRefreshToken.mockReturnValue(undefined);
    mocks.callBackend.mockResolvedValue({
      ok: true,
      status: 201,
      body: { data: { ticket: { id: 'guest-ticket-1' }, guestToken: 'new-guest-capability' } },
    });

    const response = await POST(request('/api/support/tickets', 'POST', { email: 'guest@example.com', topic: 'general', subject: 'Talk to support', message: 'Please help', source: 'website' }), { params: { path: ['tickets'] } });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.guestToken).toBeUndefined();
    expect(response.cookies.get(SUPPORT_GUEST_COOKIE)?.value).toBe('new-guest-capability');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('retries a guest reply after stale account auth and preserves the capability cookie', async () => {
    mocks.callBackendWithRefresh.mockResolvedValue({ ok: false, status: 401, body: { error: { code: 'SUPPORT_ACCESS_REQUIRED', message: 'Support access is required.' } } });
    mocks.callBackend.mockResolvedValue({ ok: true, status: 200, body: { data: { id: 'ticket-1', messages: [] } } });

    const response = await POST(request('/api/support/tickets/ticket-1/messages', 'POST', { message: 'A test reply' }), { params: { path: ['tickets', 'ticket-1', 'messages'] } });

    expect(response.status).toBe(200);
    expect(mocks.callBackend).toHaveBeenCalledWith('/support/tickets/ticket-1/messages', {
      method: 'POST', body: { message: 'A test reply' }, headers: { 'x-pixlpush-support-token': guestToken },
    });
    expect(response.cookies.get(SUPPORT_GUEST_COOKIE)?.value).toBe(guestToken);
  });

  it('uses the guest capability when a valid account session does not own the ticket', async () => {
    mocks.callBackendWithRefresh.mockResolvedValue({ ok: false, status: 404, body: { error: { code: 'SUPPORT_TICKET_NOT_FOUND', message: 'Not found.' } } });
    mocks.callBackend.mockResolvedValue({ ok: true, status: 200, body: { data: { id: 'guest-ticket-1', messages: [] } } });

    const response = await POST(request('/api/support/tickets/guest-ticket-1/messages', 'POST', { message: 'A test reply' }), { params: { path: ['tickets', 'guest-ticket-1', 'messages'] } });

    expect(response.status).toBe(200);
    expect(mocks.callBackend).toHaveBeenCalledWith('/support/tickets/guest-ticket-1/messages', {
      method: 'POST', body: { message: 'A test reply' }, headers: { 'x-pixlpush-support-token': guestToken },
    });
    expect(response.cookies.get(SUPPORT_GUEST_COOKIE)?.value).toBe(guestToken);
  });

  it('does not use the guest capability to bypass a forbidden account response', async () => {
    mocks.callBackendWithRefresh.mockResolvedValue({ ok: false, status: 403, body: { error: { code: 'FORBIDDEN', message: 'Forbidden.' } } });

    const response = await POST(request('/api/support/tickets/ticket-1/messages', 'POST', { message: 'A test reply' }), { params: { path: ['tickets', 'ticket-1', 'messages'] } });

    expect(response.status).toBe(403);
    expect(mocks.callBackend).not.toHaveBeenCalled();
  });

  it('retries an authenticated support stream with the captured guest capability', async () => {
    mocks.callBackendSupportStream
      .mockResolvedValueOnce({ status: 401, response: new Response('unauthorized', { status: 401 }) })
      .mockResolvedValueOnce({ status: 200, response: new Response('event: ready\ndata: {}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }) });

    const response = await GET(request('/api/support/tickets/ticket-1/stream'), { params: { path: ['tickets', 'ticket-1', 'stream'] } });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(mocks.callBackendSupportStream).toHaveBeenNthCalledWith(2, '/support/tickets/ticket-1/stream', { authenticated: false, guestToken });
    expect(response.cookies.get(SUPPORT_GUEST_COOKIE)?.value).toBe(guestToken);
  });
});
