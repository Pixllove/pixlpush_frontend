'use client';

import { useCallback, useState } from 'react';
import { LanguageRounded } from '@mui/icons-material';
import { Alert, Avatar, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { analyzeSendingDomain, startManualConnection, startProviderConnection } from '@/lib/sending-domains/api';
import { domainErrorMessage } from '@/lib/sending-domains/errors';
import type { DomainAnalysis, SendingDomain } from '@/types/sending-domain';
import { redirectToProvider, rememberConnection } from './connection';

interface Props {
  projectId: string;
  domain: SendingDomain;
  onClose: () => void;
  /** Called after every status change so the list reloads from the backend. */
  onChanged: () => void;
  onManual: (domain: SendingDomain) => void;
}

type Phase = { kind: 'intro' } | { kind: 'analyzing' } | { kind: 'result'; analysis: DomainAnalysis } | { kind: 'error'; message: string } | { kind: 'redirecting' };

/** Only https links to a DNS host are ever rendered. */
export const safeDnsUrl = (url: string | null | undefined) => (url?.startsWith('https://') ? url : null);

/** Starts the setup, detects the domain's DNS host and offers automatic or manual connection. */
export default function DomainAnalysisDialog({ projectId, domain, onClose, onChanged, onManual }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const analyze = useCallback(async () => {
    setPhase({ kind: 'analyzing' });
    setActionError(null);
    try {
      const result = await analyzeSendingDomain(projectId, domain.id);
      setPhase({ kind: 'result', analysis: result.analysis });
    } catch (e) {
      setPhase({ kind: 'error', message: domainErrorMessage(e) });
    } finally {
      onChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, domain.id]);

  const connectAutomatically = async (provider: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const { authorizationUrl } = await startProviderConnection(projectId, domain.id, provider);
      rememberConnection({ projectId, domainId: domain.id, provider });
      setPhase({ kind: 'redirecting' });
      redirectToProvider(authorizationUrl);
    } catch (e) {
      setActionError(domainErrorMessage(e));
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const connectManually = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await startManualConnection(projectId, domain.id);
      onChanged();
      onManual(updated);
    } catch (e) {
      setActionError(domainErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const manualButton = (label = 'Authenticate manually') => (
    <Button variant="outlined" onClick={connectManually} disabled={busy}>{label}</Button>
  );
  const host = phase.kind === 'result' ? phase.analysis.providerName : null;

  return (
    <Dialog open onClose={busy || phase.kind === 'redirecting' ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ textAlign: 'center' }}>
        <Chip
          variant="outlined"
          label={domain.domain}
          avatar={host ? <Avatar>{host[0]}</Avatar> : undefined}
          icon={host ? undefined : <LanguageRounded fontSize="small" />}
          sx={{ display: 'flex', width: 'fit-content', mx: 'auto', mb: 1.5 }}
        />
        Connect your {host ? `${host} ` : ''}domain to PixlPush
      </DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          {actionError && <Alert severity="error">{actionError}</Alert>}

          {phase.kind === 'intro' && (
            <Stack gap={1.5}>
              <Typography color="text.secondary" textAlign="center">
                You’re a few steps away from setting up your domain. We look up where its DNS is hosted and connect it for you where we can.
              </Typography>
              <Button variant="contained" size="large" onClick={analyze}>Continue</Button>
              {manualButton()}
            </Stack>
          )}

          {phase.kind === 'analyzing' && (
            <Stack alignItems="center" gap={1.5} sx={{ py: 3 }} role="status">
              <CircularProgress size={28} />
              <Typography>Analyzing {domain.domain}…</Typography>
              <Typography color="text.secondary" fontSize={12}>Looking up where this domain’s DNS and email are hosted.</Typography>
            </Stack>
          )}

          {phase.kind === 'error' && (
            <Stack gap={1.5}>
              <Alert severity="error">{phase.message}</Alert>
              <Button variant="contained" onClick={analyze}>Retry</Button>
              {manualButton()}
            </Stack>
          )}

          {phase.kind === 'redirecting' && (
            <Stack alignItems="center" gap={1.5} sx={{ py: 3 }} role="status">
              <CircularProgress size={28} />
              <Typography>Automatic connection pending</Typography>
              <Typography color="text.secondary" fontSize={12}>Redirecting you to your provider to approve the DNS changes…</Typography>
            </Stack>
          )}

          {phase.kind === 'result' && (
            <Result analysis={phase.analysis} busy={busy} onAuto={connectAutomatically} onManual={connectManually} manualButton={manualButton} onRetry={analyze} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy || phase.kind === 'redirecting'}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function Result({
  analysis,
  busy,
  onAuto,
  onManual,
  manualButton,
  onRetry,
}: {
  analysis: DomainAnalysis;
  busy: boolean;
  onAuto: (provider: string) => void;
  onManual: () => void;
  manualButton: (label?: string) => JSX.Element;
  onRetry: () => void;
}) {
  const name = analysis.providerName;
  const dnsUrl = safeDnsUrl(analysis.dnsSetupUrl);
  if (name && analysis.automaticConnectionAvailable && analysis.provider) {
    return (
      <Stack gap={1.5}>
        <Typography color="text.secondary" textAlign="center">
          Automatic connection available. You approve the DNS changes at {name}; we never see your password.
        </Typography>
        <Button variant="contained" size="large" onClick={() => onAuto(analysis.provider!)} disabled={busy}>Continue with {name}</Button>
        {manualButton('Connect a different way')}
      </Stack>
    );
  }
  return (
    <Stack gap={1.5}>
      <Alert severity="info">
        {name
          ? `Your DNS is hosted at ${name}. Automatic connection is not available there yet, so add the records yourself.`
          : 'We could not detect where your DNS is hosted. Add the records yourself at your DNS provider.'}
      </Alert>
      <Button variant="contained" size="large" onClick={onManual} disabled={busy}>Authenticate manually</Button>
      {name && dnsUrl && <Button href={dnsUrl} target="_blank" rel="noopener noreferrer">Open {name} DNS settings</Button>}
      <Button onClick={onRetry} disabled={busy}>Retry</Button>
    </Stack>
  );
}
