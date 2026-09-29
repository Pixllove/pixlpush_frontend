'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
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

type Phase = { kind: 'analyzing' } | { kind: 'result'; analysis: DomainAnalysis } | { kind: 'error'; message: string } | { kind: 'redirecting' };

/** Detects the domain's provider and offers automatic or manual connection. */
export default function DomainAnalysisDialog({ projectId, domain, onClose, onChanged, onManual }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'analyzing' });
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

  useEffect(() => {
    void analyze();
  }, [analyze]);

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

  const manualButton = (label = 'Connect manually') => (
    <Button variant="outlined" onClick={connectManually} disabled={busy}>{label}</Button>
  );

  return (
    <Dialog open onClose={busy || phase.kind === 'redirecting' ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Connect {domain.domain}</DialogTitle>
      <DialogContent>
        <Stack gap={2} sx={{ pt: 1 }}>
          {actionError && <Alert severity="error">{actionError}</Alert>}

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
              <Stack direction="row" gap={1}>
                <Button variant="contained" onClick={analyze}>Retry</Button>
                {manualButton()}
              </Stack>
            </Stack>
          )}

          {phase.kind === 'redirecting' && (
            <Stack alignItems="center" gap={1.5} sx={{ py: 3 }} role="status">
              <CircularProgress size={28} />
              <Typography>Automatic connection pending</Typography>
              <Typography color="text.secondary" fontSize={12}>Redirecting you to your provider to approve the DNS changes…</Typography>
            </Stack>
          )}

          {phase.kind === 'result' && <Result analysis={phase.analysis} busy={busy} onAuto={connectAutomatically} manualButton={manualButton} onRetry={analyze} />}
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
  manualButton,
  onRetry,
}: {
  analysis: DomainAnalysis;
  busy: boolean;
  onAuto: (provider: string) => void;
  manualButton: (label?: string) => JSX.Element;
  onRetry: () => void;
}) {
  if (analysis.providerDetected && analysis.automaticConnectionAvailable && analysis.provider) {
    return (
      <Stack gap={1.5}>
        <Alert severity="success">Provider detected: {analysis.providerName}. Automatic connection available.</Alert>
        <Box>
          <Typography fontWeight={800}>{analysis.providerName}</Typography>
          <Typography color="text.secondary" fontSize={12}>You approve the DNS changes at {analysis.providerName}; we never see your password.</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Button variant="contained" onClick={() => onAuto(analysis.provider!)} disabled={busy}>Continue with {analysis.providerName}</Button>
          {manualButton('Connect a different way')}
        </Stack>
      </Stack>
    );
  }
  if (analysis.providerDetected) {
    return (
      <Stack gap={1.5}>
        <Alert severity="info">
          Provider detected: {analysis.providerName}, but automatic connection is not configured. Manual connection required.
        </Alert>
        <Stack direction="row" gap={1}>{manualButton()}<Button onClick={onRetry} disabled={busy}>Retry</Button></Stack>
      </Stack>
    );
  }
  return (
    <Stack gap={1.5}>
      <Alert severity="info">No supported automatic provider found. Manual connection required.</Alert>
      <Stack direction="row" gap={1}>{manualButton()}<Button onClick={onRetry} disabled={busy}>Retry</Button></Stack>
    </Stack>
  );
}
