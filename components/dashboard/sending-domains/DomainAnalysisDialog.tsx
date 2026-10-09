'use client';

import { useCallback, useState } from 'react';
import { ArrowForwardRounded, CloseRounded, LanguageRounded } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
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
    <Dialog className="domain-connect-dialog" open onClose={busy || phase.kind === 'redirecting' ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle className="domain-connect-dialog-title">
        <IconButton className="domain-connect-close" aria-label="Close" onClick={onClose} disabled={busy || phase.kind === 'redirecting'}>
          <CloseRounded />
        </IconButton>
        {phase.kind !== 'analyzing' && <>
          <Stack className="domain-connect-domain-pill" direction="row" alignItems="center" gap={1}>
            <Avatar className={host?.toLowerCase() === 'ionos' ? 'domain-connect-provider-avatar ionos' : 'domain-connect-provider-avatar'}>
              {host?.toLowerCase() === 'ionos' ? 'IONOS' : host ? host.slice(0, 4).toUpperCase() : <LanguageRounded fontSize="small" />}
            </Avatar>
            <Typography component="span">{domain.domain}</Typography>
          </Stack>
          <Typography component="div" className="domain-connect-heading">
            Connect your {host ? <><span className="domain-connect-brand">{host}</span> </> : ''}domain to PixlPush
          </Typography>
        </>}
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
            <Stack alignItems="center" gap={1.25} sx={{ py: 2.5 }} role="status">
              <AnalysisPulse />
              <Typography fontSize={25} fontWeight={500} sx={{ mt: 1 }}>Analyzing…</Typography>
              <Typography fontSize={23} fontWeight={500}>{domain.domain}</Typography>
              <Typography color="text.secondary" fontSize={13}>This usually takes a few seconds</Typography>
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
    </Dialog>
  );
}

function AnalysisPulse() {
  const ringSx = (delay: string) => ({
    position: 'absolute' as const,
    inset: 0,
    border: '4px solid',
    borderColor: 'success.light',
    borderRadius: '50%',
    boxShadow: '0 0 14px rgba(50, 205, 130, .45)',
    animation: 'domainPulse 2.4s ease-out infinite',
    animationDelay: delay,
    '@keyframes domainPulse': {
      '0%': { transform: 'scale(.25)', opacity: .95 },
      '70%': { opacity: .32 },
      '100%': { transform: 'scale(1)', opacity: 0 },
    },
  });

  return (
    <Stack alignItems="center" justifyContent="center" sx={{ position: 'relative', width: 178, height: 178 }} aria-hidden="true">
      <Box sx={ringSx('0s')} />
      <Box sx={ringSx('.45s')} />
      <Box sx={ringSx('.9s')} />
      <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: 'background.paper', border: '4px solid', borderColor: 'success.light', boxShadow: '0 0 14px rgba(50, 205, 130, .45)', zIndex: 1 }} />
    </Stack>
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
  if (name && analysis.automaticConnectionAvailable && analysis.provider) {
    return (
      <Stack gap={1.5}>
        <Typography color="text.secondary" textAlign="center">
          Automatic connection available. You approve the DNS changes at {name}; we never see your password.
        </Typography>
        <Button fullWidth variant="contained" size="large" onClick={() => onAuto(analysis.provider!)} disabled={busy}>Continue with {name}</Button>
        <Button fullWidth variant="text" className="domain-connect-secondary" endIcon={<ArrowForwardRounded fontSize="small" />} onClick={onManual} disabled={busy}>Connect a different way</Button>
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
      {manualButton('Connect a different way')}
      <Button onClick={onRetry} disabled={busy}>Retry</Button>
    </Stack>
  );
}
