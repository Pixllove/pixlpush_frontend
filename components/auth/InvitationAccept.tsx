'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, Skeleton, Stack, TextField, Typography } from '@mui/material';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import EventBusyRounded from '@mui/icons-material/EventBusyRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import SwapHorizRounded from '@mui/icons-material/SwapHorizRounded';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { authApi } from '@/lib/auth/api';
import type { ApiError } from '@/types/auth';
import type { ProjectRole } from '@/types/project';
import PasswordField, { PasswordRule } from './PasswordField';
import SubmitButton from './SubmitButton';
import GoogleButton from './GoogleButton';
import { AuthStatus, FormError } from './AuthFeedback';

type State = 'pending' | 'expired' | 'revoked' | 'accepted' | 'invalid' | 'project_inactive';
interface Preview {
  state: State;
  email?: string;
  role?: ProjectRole;
  expiresAt?: string;
  project?: { name: string };
  invitedBy?: { name: string | null; email: string };
  accountExists?: boolean;
}

const ROLE: Record<ProjectRole, string> = { owner: 'Owner', admin: 'Admin', developer: 'Developer', analyst: 'Analyst', read_only: 'Read-only', billing: 'Billing' };

const MESSAGES: Record<string, string> = {
  INVALID_INVITATION: 'This invitation is invalid or has already been used.',
  INVITATION_EXPIRED: 'This invitation has expired. Ask the project owner to resend it.',
  INVITATION_EMAIL_MISMATCH: 'You are signed in with a different email address than the one invited.',
  PROJECT_INACTIVE: 'This project is deactivated.',
  VALIDATION_ERROR: 'Use a password with at least 12 characters.',
  RATE_LIMITED: 'Too many attempts. Wait a few minutes and try again.',
};
const message = (e: unknown) => MESSAGES[(e as ApiError)?.code] ?? 'Something went wrong. Please try again.';

/** Terminal states: the link can no longer be used as-is. */
const ENDED: Record<Exclude<State, 'pending'>, { icon: React.ReactNode; title: string; body: string }> = {
  invalid: { icon: <ErrorOutlineRounded />, title: 'This invitation link is not valid', body: 'The link may be incomplete or replaced by a newer invitation. Ask the person who invited you to send it again.' },
  expired: { icon: <EventBusyRounded />, title: 'This invitation has expired', body: 'For your security, invitations expire. Ask the project owner or an admin to resend it.' },
  revoked: { icon: <ErrorOutlineRounded />, title: 'This invitation was cancelled', body: 'It was withdrawn or replaced by a newer one. Check your inbox for the latest invitation.' },
  accepted: { icon: <CheckCircleRounded />, title: 'Invitation already accepted', body: 'This invitation has been used. Sign in to open the project.' },
  project_inactive: { icon: <ErrorOutlineRounded />, title: 'This project is deactivated', body: 'The project is not available right now. Contact the project owner.' },
};

async function accept(body: object): Promise<{ project: { id: string } }> {
  const res = await fetch('/api/invitations/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  const json = await res.json().catch(() => undefined);
  if (!res.ok) throw { status: res.status, code: json?.error?.code ?? 'UNKNOWN', message: '' } satisfies ApiError;
  return json.data;
}

async function loadPreview(token: string): Promise<Preview> {
  const res = await fetch(`/api/invitations/preview?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
  const json = await res.json().catch(() => undefined);
  if (!res.ok) throw { status: res.status, code: json?.error?.code ?? 'UNKNOWN', message: '' } satisfies ApiError;
  return json.data;
}

const open = (projectId: string) => window.location.assign(`/dashboard?project=${encodeURIComponent(projectId)}`);

/**
 * Invitation link target. The server decides everything (project, role,
 * email, state); the page only picks the next step for the visitor:
 * accept, sign in, switch account, or create an account.
 */
export default function InvitationAccept() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => setToken(new URLSearchParams(window.location.search).get('token') ?? ''), []);

  const preview = useQuery({ queryKey: ['invitation', token], queryFn: () => loadPreview(token!), enabled: Boolean(token), retry: false });
  const { account, isPending: meLoading } = useCurrentUser();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [form, setForm] = useState({ name: '', password: '' });

  const here = `/invitations/accept?token=${encodeURIComponent(token ?? '')}`;
  const loginHref = `/login?redirect=${encodeURIComponent(here)}`;

  const run = async (body: object) => {
    setBusy(true);
    setError(undefined);
    try {
      open((await accept({ token, ...body })).project.id);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  };

  const switchAccount = async () => {
    setBusy(true);
    await authApi.logout().catch(() => undefined);
    window.location.assign(loginHref);
  };

  const data: Preview | undefined = token === '' ? { state: 'invalid' } : preview.data;
  const loading = !data || (data.state === 'pending' && meLoading);

  return (
    <>
        {preview.isError && <Ended icon={<ErrorOutlineRounded />} title="We could not load this invitation" body={message(preview.error)} action={<Button variant="outlined" onClick={() => preview.refetch()}>Try again</Button>} />}

        {!preview.isError && loading && (
          <Stack className="auth-block" role="status" aria-label="Checking your invitation">
            <Skeleton variant="rounded" width={48} height={48} />
            <Skeleton height={32} width="70%" />
            <Skeleton height={24} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        )}

        {!loading && data && data.state !== 'pending' && (
          <Ended
            {...ENDED[data.state]}
            tone={data.state === 'accepted' ? 'success' : 'warning'}
            action={
              data.state === 'accepted'
                ? <Button variant="contained" href={account ? '/dashboard' : '/login'}>{account ? 'Go to dashboard' : 'Sign in'}</Button>
                : <Button variant="outlined" href={account ? '/dashboard' : '/'}>Go to PixlPush</Button>
            }
          />
        )}

        {!loading && data?.state === 'pending' && (
          <Stack className="auth-block">
            <Stack direction="row" gap={1.5} alignItems="center">
              <Box className="auth-tile accent" aria-hidden>
                {data.project!.name.charAt(0).toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h1" variant="h1" sx={{ overflowWrap: 'anywhere' }}>Join {data.project!.name}</Typography>
                <Typography color="text.secondary" variant="body2">
                  Invited by <strong>{data.invitedBy?.name ?? data.invitedBy?.email}</strong>
                  {data.invitedBy?.name && ` · ${data.invitedBy.email}`}
                </Typography>
              </Box>
            </Stack>

            <Box className="auth-facts">
              {[
                ['Role', ROLE[data.role!]],
                ['Expires', new Date(data.expiresAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })],
                ['Invited email', data.email!],
              ].map(([k, v], i) => (
                <Box key={k} sx={{ minWidth: 0, gridColumn: i === 2 ? '1 / -1' : undefined }}>
                  <Typography variant="caption" color="text.secondary">{k}</Typography>
                  <Typography fontWeight={500} sx={{ overflowWrap: 'anywhere' }}>{v}</Typography>
                </Box>
              ))}
            </Box>

            <FormError message={error} />

            {account && account.email.toLowerCase() === data.email!.toLowerCase() && (
              <Stack gap={1.5}>
                <SubmitButton variant="contained" size="large" fullWidth pending={busy} onClick={() => run({})}>Accept invitation</SubmitButton>
                <Typography variant="caption" color="text.secondary">Signed in as {account.email}</Typography>
              </Stack>
            )}

            {account && account.email.toLowerCase() !== data.email!.toLowerCase() && (
              <Stack gap={1.5}>
                <Alert severity="warning" icon={<SwapHorizRounded />}>
                  You are signed in as <strong>{account.email}</strong>, but this invitation is for <strong>{data.email}</strong>. Switch to the invited account to accept it.
                </Alert>
                <SubmitButton variant="contained" size="large" fullWidth pending={busy} onClick={switchAccount}>Sign out and switch account</SubmitButton>
                <Button href="/dashboard" disabled={busy}>Stay signed in as {account.email}</Button>
              </Stack>
            )}

            {!account && (
              <Stack gap={2}>
                <GoogleButton label={data.accountExists ? 'Sign in with Google' : 'Join with Google'} redirect={here} onError={setError} />
                <Divider>or</Divider>

                {data.accountExists ? (
                  <Button variant="contained" size="large" fullWidth href={loginHref}>Sign in to accept</Button>
                ) : (
                  <Box
                    component="form"
                    noValidate
                    sx={{ display: 'grid', gap: 2 }}
                    onSubmit={(e: React.FormEvent) => {
                      e.preventDefault();
                      if (form.password.length < 12) return setError(MESSAGES.VALIDATION_ERROR);
                      void run({ password: form.password, ...(form.name.trim() ? { name: form.name.trim() } : {}) });
                    }}
                  >
                    <TextField label="Your name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus disabled={busy} fullWidth />
                    <Box sx={{ display: 'grid', gap: 0.75 }}>
                      <PasswordField label="Password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} disabled={busy} fullWidth />
                      <PasswordRule value={form.password} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Your account uses <strong>{data.email}</strong>.
                    </Typography>
                    {/* Hidden username field so password managers save the invited email. */}
                    <input type="email" name="email" value={data.email} readOnly autoComplete="username" hidden />
                    <SubmitButton type="submit" variant="contained" size="large" fullWidth pending={busy}>Create account and join</SubmitButton>
                  </Box>
                )}
              </Stack>
            )}
          </Stack>
        )}
    </>
  );
}

function Ended({ icon, title, body, action, tone = 'warning' }: { icon: React.ReactNode; title: string; body: string; action: React.ReactNode; tone?: 'success' | 'warning' }) {
  return (
    <AuthStatus tone={tone} icon={icon} title={title}>
      <Typography color="text.secondary">{body}</Typography>
      {action}
    </AuthStatus>
  );
}
