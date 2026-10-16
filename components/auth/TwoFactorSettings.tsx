'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import SecurityRounded from '@mui/icons-material/SecurityRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { authApi, authKeys } from '@/lib/auth/api';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { ApiError } from '@/types/auth';

type DialogMode = 'enroll' | 'recovery' | 'disable' | 'regenerate' | null;
type LoadingAction = 'start' | 'confirm' | 'disable' | 'regenerate' | null;

const errorMessage = (error: unknown) => (error as ApiError)?.message ?? 'Something went wrong. Please try again.';

export default function TwoFactorSettings() {
  const { account } = useCurrentUser();
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: [...authKeys.all, 'mfa-status'], queryFn: authApi.mfaStatus, enabled: Boolean(account), staleTime: 60_000 });
  const start = useMutation({ mutationFn: authApi.startMfaEnrollment });
  const confirm = useMutation({ mutationFn: authApi.confirmMfaEnrollment });
  const regenerate = useMutation({ mutationFn: authApi.regenerateMfaRecoveryCodes });
  const disable = useMutation({ mutationFn: authApi.disableMfa });
  const [mode, setMode] = useState<DialogMode>(null);
  const [enrollment, setEnrollment] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const enabled = status.data?.enabled ?? account?.twoFactorEnabled;
  const pending = Boolean(loadingAction) || start.isPending || confirm.isPending || regenerate.isPending || disable.isPending;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: authKeys.all });
    await queryClient.invalidateQueries({ queryKey: [...authKeys.all, 'mfa-status'] });
  };

  const openEnrollment = async () => {
    setError(undefined);
    setMode('enroll');
    setLoadingAction('start');
    try {
      const data = await start.mutateAsync();
      setEnrollment({ secret: data.secret, qrCodeDataUrl: data.qrCodeDataUrl });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingAction(null);
    }
  };

  const close = () => {
    if (pending) return;
    setMode(null);
    setEnrollment(null);
    setRecoveryCodes([]);
    setCode('');
    setCurrentPassword('');
    setError(undefined);
    setCopied(false);
  };

  const confirmEnrollment = async () => {
    setError(undefined);
    setLoadingAction('confirm');
    try {
      const result = await confirm.mutateAsync(code.trim());
      setRecoveryCodes(result.recoveryCodes);
      setMode('recovery');
      setCode('');
      await invalidate();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingAction(null);
    }
  };

  const copyRecoveryCodes = async () => {
    await navigator.clipboard?.writeText(recoveryCodes.join('\n'));
    setCopied(true);
  };

  const regenerateCodes = async () => {
    setError(undefined);
    setLoadingAction('regenerate');
    try {
      const result = await regenerate.mutateAsync(account?.hasPassword ? currentPassword : undefined);
      setRecoveryCodes(result.recoveryCodes);
      setMode('recovery');
      setCurrentPassword('');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoadingAction(null);
    }
  };

  const disableMfa = async () => {
    setError(undefined);
    setLoadingAction('disable');
    try {
      await disable.mutateAsync(account?.hasPassword ? currentPassword : undefined);
      await invalidate();
      setLoadingAction(null);
      close();
    } catch (reason) {
      setError(errorMessage(reason));
      setLoadingAction(null);
    }
  };

  const actionNeedsPassword = Boolean(account?.hasPassword);
  const actionBlocked = actionNeedsPassword && currentPassword.length === 0;
  const statusLabel = status.isPending ? 'Checking…' : enabled ? 'Enabled' : 'Not enabled';

  return (
    <section className="pp-profile-section">
      <div>
        <Typography variant="h3">Two-factor authentication</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add an authenticator app as an extra verification step for your PixlPush account.
        </Typography>
      </div>
      <Stack alignItems="flex-start" gap={1.25}>
        <Chip size="small" label={`2FA: ${statusLabel}`} color={enabled ? 'success' : 'default'} />
        {!enabled ? (
          <Button variant="outlined" startIcon={loadingAction === 'start' ? <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} /> : <SecurityRounded />} onClick={openEnrollment} disabled={pending || status.isPending}>
            {loadingAction === 'start' ? 'Preparing…' : 'Set up an authenticator'}
          </Button>
        ) : (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            <Button variant="outlined" onClick={() => { setError(undefined); setMode('regenerate'); }} disabled={pending}>
              Regenerate recovery codes
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => { setError(undefined); setMode('disable'); }}
              disabled={pending}
              sx={{ color: '#fff', fontWeight: 700, boxShadow: 'none', '&:hover': { color: '#fff', boxShadow: 'none' } }}
            >
              Turn off 2FA
            </Button>
          </Stack>
        )}
        {!enabled && <Typography variant="caption" color="text.secondary">Use Google Authenticator, 1Password, Authy, or another TOTP app.</Typography>}
        {status.isError && <Alert severity="error">Could not load 2FA status. Refresh and try again.</Alert>}
      </Stack>

      <Dialog open={mode !== null} onClose={close} fullWidth maxWidth="sm" aria-labelledby="mfa-dialog-title">
        {mode === 'enroll' && (
          <>
            <DialogTitle id="mfa-dialog-title">Set up your authenticator</DialogTitle>
            <DialogContent dividers>
              <Stack gap={2}>
                <Typography color="text.secondary">Scan this QR code with your authenticator app, or enter the setup key manually.</Typography>
                {start.isPending && <Typography role="status">Preparing a secure setup…</Typography>}
                {enrollment && (
                  <>
                    <Box sx={{ alignSelf: 'center', p: 1, border: 1, borderColor: 'divider', borderRadius: 1, lineHeight: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={enrollment.qrCodeDataUrl} alt="QR code for PixlPush authenticator setup" width={240} height={240} />
                    </Box>
                    <TextField label="Setup key" value={enrollment.secret} InputProps={{ readOnly: true }} fullWidth helperText="Keep this key private. It can configure another authenticator app." />
                    <Divider />
                    <TextField label="Authenticator code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="one-time-code" inputMode="numeric" autoFocus fullWidth helperText="Enter the current 6-digit code to finish setup." disabled={pending} />
                  </>
                )}
                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={close} disabled={pending}>Cancel</Button>
              <Button variant="contained" onClick={confirmEnrollment} disabled={!enrollment || code.trim().length < 6 || pending} startIcon={loadingAction === 'confirm' ? <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} /> : undefined}>
                {loadingAction === 'confirm' ? 'Confirming…' : 'Confirm setup'}
              </Button>
            </DialogActions>
          </>
        )}

        {mode === 'recovery' && (
          <>
            <DialogTitle id="mfa-dialog-title">Save your recovery codes</DialogTitle>
            <DialogContent dividers>
              <Stack gap={2}>
                <Alert severity="warning" icon={<WarningAmberRounded />}>These codes are shown once. Store them in a password manager or another secure location.</Alert>
                <Box component="pre" sx={{ m: 0, p: 2, bgcolor: 'action.hover', borderRadius: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap', letterSpacing: 1 }}>{recoveryCodes.join('\n')}</Box>
                <Button variant="outlined" startIcon={<ContentCopyRounded />} onClick={copyRecoveryCodes}>{copied ? 'Copied' : 'Copy codes'}</Button>
              </Stack>
            </DialogContent>
            <DialogActions><Button variant="contained" onClick={close}>I saved these codes</Button></DialogActions>
          </>
        )}

        {(mode === 'disable' || mode === 'regenerate') && (
          <>
            <DialogTitle id="mfa-dialog-title">{mode === 'disable' ? 'Turn off two-factor authentication?' : 'Regenerate recovery codes'}</DialogTitle>
            <DialogContent dividers>
              <Stack gap={2}>
                <Typography color="text.secondary">{mode === 'disable' ? 'Turning off 2FA removes the authenticator requirement and invalidates your existing recovery codes.' : 'Your current recovery codes will stop working immediately.'}</Typography>
                {actionNeedsPassword && <TextField label="Current password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" fullWidth autoFocus disabled={pending} />}
                {!actionNeedsPassword && <Alert severity="info">Your Google sign-in is the recent authentication required for this change.</Alert>}
                {error && <Alert severity="error">{error}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={close} disabled={pending}>Cancel</Button>
              {mode === 'disable' ? (
                <Button color="error" variant="contained" onClick={disableMfa} disabled={actionBlocked || pending} startIcon={loadingAction === 'disable' ? <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} /> : undefined}>
                  {loadingAction === 'disable' ? 'Turning off…' : 'Turn off 2FA'}
                </Button>
              ) : (
                <Button variant="contained" onClick={regenerateCodes} disabled={actionBlocked || pending} startIcon={loadingAction === 'regenerate' ? <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} /> : undefined}>
                  {loadingAction === 'regenerate' ? 'Generating…' : 'Generate new codes'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </section>
  );
}
