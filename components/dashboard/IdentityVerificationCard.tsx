'use client';

import { useEffect, useState } from 'react';
import { ContentCopyRounded, VerifiedUserRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { authRequest } from '@/lib/auth/client';
import type { ApiError } from '@/types/auth';

const SECRET_ROLES = ['owner', 'admin'];

const serverExample = `// On your server, never in the app:
import { createHmac } from 'node:crypto';
const userHash = createHmac('sha256', process.env.PIXLPUSH_IDENTITY_SECRET)
  .update(user.id)
  .digest('hex');
// Return userHash to the app with the login response, then:
// PixlPush.identify({ externalUserId: user.id, userHash })`;

/**
 * SDK identity verification (SA-005). The SDK key ships inside the app, so
 * without this anyone holding it could identify as any user. When on, the
 * customer's server signs each externalUserId and the SDK sends that hash.
 */
export default function IdentityVerificationCard({ projectId, role }: { projectId: string; role: string }) {
  const path = `/${encodeURIComponent(projectId)}/sdk-keys/identity-verification`;
  const canChange = SECRET_ROLES.includes(role);
  const [enabled, setEnabled] = useState<boolean>();
  const [secret, setSecret] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    authRequest<{ enabled: boolean }>(path, undefined, '/api/projects')
      .then((data) => setEnabled(data.enabled))
      .catch((cause: ApiError) => setError(cause.message));
  }, [path]);

  const run = async (method: 'POST' | 'DELETE', confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setError(undefined);
    try {
      const data = await authRequest<{ enabled: boolean; secret?: string }>(path, method === 'POST' ? {} : undefined, '/api/projects', method);
      setEnabled(data.enabled);
      setSecret(data.secret);
      setCopied(false);
    } catch (cause) {
      setError((cause as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
  };

  return (
    <Card className="saas-card">
      <Stack direction="row" alignItems="center" gap={1} justifyContent="space-between" flexWrap="wrap">
        <Stack direction="row" alignItems="center" gap={1}>
          <VerifiedUserRounded fontSize="small" />
          <Typography variant="h3">Identity verification</Typography>
        </Stack>
        {enabled !== undefined && <Chip size="small" color={enabled ? 'success' : 'default'} label={enabled ? 'On' : 'Off'} />}
      </Stack>
      <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.5 }}>
        Your SDK key is public: it ships inside your app. Turn this on so only your server can say which user a device belongs to.
        Without it, anyone with the key could identify as another user and receive their messages.
      </Typography>

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      {secret && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography fontWeight={600}>Store this secret on your server now. It is shown only once.</Typography>
          <Box component="code" sx={{ display: 'block', wordBreak: 'break-all', my: 1 }}>{secret}</Box>
          <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>{copied ? 'Copied' : 'Copy secret'}</Button>
        </Alert>
      )}

      <Box component="pre" sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: 'action.hover', overflowX: 'auto', fontSize: 'var(--fs-12)' }}>{serverExample}</Box>

      {canChange ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            disabled={busy || enabled === undefined}
            onClick={() => run('POST', enabled
              ? 'Rotate the secret? Apps sending hashes made with the old secret fail to identify until your server uses the new one.'
              : 'Turn on identity verification? Identify calls without a valid userHash will be rejected, so update your app and server first.')}
          >
            {enabled ? 'Rotate secret' : 'Turn on'}
          </Button>
          {enabled && (
            <Button color="error" disabled={busy} onClick={() => run('DELETE', 'Turn off identity verification? Anyone with the SDK key can then identify as any user.')}>
              Turn off
            </Button>
          )}
        </Stack>
      ) : (
        <Alert severity="info" sx={{ mt: 2 }}>Only owners and admins can change this setting.</Alert>
      )}
    </Card>
  );
}
