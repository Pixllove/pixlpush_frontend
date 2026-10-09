'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { checkDns, getSendingDomain, startProviderConnection, updateSendingDomain } from '@/lib/sending-domains/api';
import { domainErrorMessage, isConnectionCode, messageForCode } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
import { redirectToProvider, rememberConnection } from './connection';
import DnsRecordCard from './DnsRecordCard';
import { safeDnsUrl } from './DomainAnalysisDialog';
import DomainStatusBadge from './DomainStatusBadge';

/** After an automatic connection: how often and how long the records are re-checked on their own. */
const RECHECK_MS = 15_000;
const RECHECK_LIMIT = 20;

const STEPS = [
  'Go to your DNS provider',
  'Create the required records',
  'Copy the records exactly',
  'Return to PixlPush',
  'Check the records and the sending connection',
];

interface Props {
  projectId: string;
  domainId: string;
  onClose: () => void;
  onChanged: () => void;
}

/** Guided manual setup: records come from the backend, checks reload from it. */
export default function DnsSetupDialog({ projectId, domainId, onClose, onChanged }: Props) {
  const query = useQuery({
    queryKey: ['projects', 'sending-domains', projectId, domainId],
    queryFn: () => getSendingDomain(projectId, domainId),
  });
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [selector, setSelector] = useState<string | null>(null);

  const domain = query.data;

  const runCheck = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      await checkDns(projectId, domainId);
    } catch (e) {
      setCheckError(domainErrorMessage(e));
    } finally {
      // Always reload from the backend (this also refreshes the dialog's query).
      onChanged();
      setChecking(false);
    }
  };

  // Saving the selector resets the DKIM record, so it is checked again straight away.
  const saveSelector = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      await updateSendingDomain(projectId, domainId, { dkimSelector: selector?.trim().toLowerCase() || null });
      setSelector(null);
      await checkDns(projectId, domainId);
    } catch (e) {
      setCheckError(domainErrorMessage(e));
    } finally {
      onChanged();
      setChecking(false);
    }
  };

  const connectAutomatically = async (d: SendingDomain) => {
    setConnecting(true);
    setCheckError(null);
    try {
      const { authorizationUrl } = await startProviderConnection(projectId, d.id, d.provider!);
      rememberConnection({ projectId, domainId: d.id, provider: d.provider! });
      redirectToProvider(authorizationUrl);
    } catch (e) {
      setCheckError(domainErrorMessage(e));
      setConnecting(false);
      onChanged();
    }
  };

  // The DNS host publishes the records after an automatic connection, so nobody has to press "Check status".
  const waiting = domain?.connectionMethod === 'automatic' && (domain.status === 'dns_pending' || domain.status === 'partially_verified');
  const rechecks = useRef(0);
  useEffect(() => {
    if (!waiting) return;
    const tick = () => {
      if (rechecks.current++ < RECHECK_LIMIT) void runCheck();
    };
    tick();
    const timer = setInterval(tick, RECHECK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const dnsUrl = safeDnsUrl(domain?.dnsSetupUrl);
  const records = domain?.dnsRecords ?? [];
  const required = records.filter((r) => r.required);
  const verifiedCount = required.filter((r) => r.verified).length;
  // The key belongs to the customer's email provider (TXT) and has not been found yet.
  const providerDkim = records.find((r) => r.purpose === 'DKIM' && r.type === 'TXT');
  const selectorValue = selector ?? domain?.dkimSelector ?? '';
  const selectorValid = /^[a-z0-9-]{0,63}$/i.test(selectorValue.trim());
  const statusMessage = domain && domain.status !== 'verified' ? messageForCode(domain.lastError) : null;

  return (
    <Dialog open onClose={checking || connecting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <span>DNS records for {domain?.domain ?? '…'}</span>
          {domain && <DomainStatusBadge status={domain.status} lastError={domain.lastError} />}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {query.isPending && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }} role="status"><CircularProgress size={28} /></Stack>
        )}
        {query.isError && (
          <Stack gap={1.5}>
            <Alert severity="error">{domainErrorMessage(query.error)}</Alert>
            <Button variant="outlined" onClick={() => query.refetch()} sx={{ alignSelf: 'flex-start' }}>Retry</Button>
          </Stack>
        )}
        {domain && (
          <Stack gap={2.5}>
            <Stepper alternativeLabel activeStep={domain.status === 'verified' ? STEPS.length : domain.lastCheckedAt ? 4 : 1}>
              {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
            </Stepper>

            {waiting && (
              <Alert severity="info">
                {domain.providerName ?? 'Your DNS provider'} is publishing the records. We check again every few seconds; this can take a few minutes.
              </Alert>
            )}
            {!waiting && domain.status !== 'verified' && domain.providerName && dnsUrl && (
              <Alert severity="info" action={<Button color="inherit" size="small" href={dnsUrl} target="_blank" rel="noopener noreferrer">Open DNS settings</Button>}>
                Your DNS is hosted at {domain.providerName}. Add the records below there.
              </Alert>
            )}
            {domain.status === 'verified' && (
              <Alert severity="success">{domain.domain}: Domain authenticated and sending connection ready. Send yourself a test email under Email sending.</Alert>
            )}
            {domain.status === 'partially_verified' && (
              <Alert severity="warning">Partially verified: {verifiedCount} of {required.length} required records are correct. {statusMessage}</Alert>
            )}
            {domain.status === 'verification_failed' && (isConnectionCode(domain.lastError)
              ? <Alert severity="warning">Provider connection incomplete. {statusMessage} Email cannot be sent from this domain yet.</Alert>
              : <Alert severity="error">Verification failed. {statusMessage}</Alert>)}
            {domain.status === 'dns_check_failed' && <Alert severity="error">{messageForCode('DNS_LOOKUP_FAILED')}</Alert>}
            {domain.status === 'dns_pending' && domain.lastCheckedAt && <Alert severity="info">{messageForCode('DNS_RECORD_NOT_FOUND')}</Alert>}
            {checkError && (
              <Alert severity="error" action={<Button color="inherit" size="small" onClick={runCheck} disabled={checking}>Retry</Button>}>
                {checkError}
              </Alert>
            )}

            <Stack component="ul" gap={0.5} sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: 13 }}>
              <li>DNS changes can take several hours to take effect.</li>
              <li><code>@</code> stands for the root domain ({domain.domain}). Some providers want the name left empty instead.</li>
              <li>Copy CNAME and TXT values exactly, without extra spaces or quotes.</li>
              <li>Keep a single SPF record: if one already exists, add our include to it instead of creating a second one.</li>
              <li>The domain stays unauthenticated while any required record is missing.</li>
            </Stack>

            {records.length === 0 ? (
              <Alert severity="info">No DNS records yet. Choose how to connect this domain first.</Alert>
            ) : (
              <Stack gap={1.5}>{records.map((record) => <DnsRecordCard key={record.id} record={record} />)}</Stack>
            )}

            {providerDkim && !providerDkim.verified && (
              <Stack gap={1}>
                <Typography fontSize={13} color="text.secondary">
                  DKIM is enabled at your email provider, not here. We look for the key under the usual selectors. If your provider uses a different one, enter it.
                </Typography>
                <Stack direction="row" gap={1} alignItems="flex-start">
                  <TextField
                    size="small"
                    label="DKIM selector"
                    placeholder="s1"
                    value={selectorValue}
                    onChange={(e) => setSelector(e.target.value)}
                    error={!selectorValid}
                    helperText={selectorValid ? `Checked at ${selectorValue.trim() || 'selector'}._domainkey.${domain.domain}` : 'Letters, numbers and hyphens only.'}
                    disabled={checking || connecting}
                  />
                  <Button variant="outlined" onClick={saveSelector} disabled={checking || connecting || !selectorValid || selector === null}>Save and check</Button>
                </Stack>
              </Stack>
            )}

            {domain.lastCheckedAt && (
              <Typography color="text.secondary" fontSize={12}>Last checked {new Date(domain.lastCheckedAt).toLocaleString()}</Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {domain?.automaticConnectionAvailable && domain.provider && domain.status !== 'verified' && (
          <Button onClick={() => connectAutomatically(domain)} disabled={checking || connecting}>Connect automatically</Button>
        )}
        {domain && records.length > 0 && (
          <Button variant="outlined" onClick={runCheck} disabled={checking || connecting}>
            {checking ? 'Checking DNS…' : 'Check status'}
          </Button>
        )}
        <Button variant="contained" onClick={onClose} disabled={checking || connecting}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
