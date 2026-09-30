import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InvitationAccept from '@/components/auth/InvitationAccept';

let account: { email: string } | undefined;
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account, isPending: false }) }));
const logout = vi.fn(async () => ({ message: 'ok' }));
vi.mock('@/lib/auth/api', () => ({ authApi: { logout: () => logout() } }));

vi.mock('@/components/auth/GoogleButton', () => ({
  default: ({ label, redirect }: { label: string; redirect?: string }) => <button data-redirect={redirect}>{label}</button>,
}));

const assign = vi.fn();
const pending = {
  state: 'pending',
  email: 'dimi@example.com',
  role: 'developer',
  expiresAt: '2026-10-07T10:00:00.000Z',
  project: { name: 'test' },
  invitedBy: { name: 'Kamran Ahsan', email: 'kamran@example.com' },
  accountExists: false,
};

/** Routes the page's two fetches: preview (GET) and accept (POST). */
const backend = (preview: object, acceptResult: { status: number; body: object } = { status: 200, body: { data: { project: { id: 'p1' } } } }) =>
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    const hit = String(url).startsWith('/api/invitations/preview') ? { status: 200, body: { data: preview } } : acceptResult;
    void init;
    return new Response(JSON.stringify(hit.body), { status: hit.status });
  }));

const show = () => render(<QueryClientProvider client={new QueryClient()}><InvitationAccept /></QueryClientProvider>);
const accepts = () => (vi.mocked(fetch).mock.calls.filter(([u]) => u === '/api/invitations/accept')).map(([, i]) => JSON.parse(String(i!.body)));

beforeEach(() => {
  account = undefined;
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { configurable: true, value: { search: '?token=tok_123456789', assign } });
});

describe('Invitation accept page', () => {
  it('new user: invited email shown, signup accepts and opens the project', async () => {
    backend(pending);
    show();
    expect(await screen.findByText('Join test')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getAllByText('dimi@example.com').length).toBeGreaterThan(0);
    // Google returns to this same invitation.
    expect(screen.getByRole('button', { name: 'Join with Google' })).toHaveAttribute('data-redirect', '/invitations/accept?token=tok_123456789');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Dimi' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account and join' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/dashboard?project=p1'));
    // Only the token and the new password leave the browser: never project, role or email.
    expect(accepts()).toEqual([{ token: 'tok_123456789', password: 'a-long-password', name: 'Dimi' }]);
  });

  it('existing user, signed out: sign in and come back to this invitation', async () => {
    backend({ ...pending, accountExists: true });
    show();
    const link = await screen.findByRole('link', { name: 'Sign in to accept' });
    expect(link).toHaveAttribute('href', `/login?redirect=${encodeURIComponent('/invitations/accept?token=tok_123456789')}`);
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('signed in as the invited account: one click accepts', async () => {
    account = { email: 'Dimi@example.com' };
    backend({ ...pending, accountExists: true });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/dashboard?project=p1'));
    expect(accepts()).toEqual([{ token: 'tok_123456789' }]);
  });

  it('signed in as someone else: asks to switch, never accepts', async () => {
    account = { email: 'other@example.com' };
    backend({ ...pending, accountExists: true });
    show();
    expect(await screen.findByText(/but this invitation is for/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out and switch account' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?redirect=/)));
    expect(logout).toHaveBeenCalled();
    expect(accepts()).toEqual([]);
  });

  it.each([
    ['expired', 'This invitation has expired'],
    ['revoked', 'This invitation was cancelled'],
    ['accepted', 'Invitation already accepted'],
    ['invalid', 'This invitation link is not valid'],
  ])('shows the %s state without a form', async (state, title) => {
    backend({ state });
    show();
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('shows a server refusal on accept (e.g. already used meanwhile)', async () => {
    account = { email: 'dimi@example.com' };
    backend({ ...pending, accountExists: true }, { status: 400, body: { error: { code: 'INVALID_INVITATION' } } });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByText('This invitation is invalid or has already been used.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});
