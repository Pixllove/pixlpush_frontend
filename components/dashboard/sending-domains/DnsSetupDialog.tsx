'use client';

import { formatUserDateTime } from '@/lib/timezone';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AccessTimeRounded, CloseRounded } from '@mui/icons-material';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { checkDns, checkMtaDns, getMtaDnsRecords, getSendingDomain, provisionMtaDnsRecords, refreshSesRecords, updateDeliveryProvider, updateSendingDomain } from '@/lib/sending-domains/api';
import { domainErrorMessage, isConnectionCode, messageForCode } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
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
  'Check the records and sending readiness',
];

interface Props {
  projectId: string;
  domainId: string;
  onClose: () => void;
  onChanged: () => void;
  onRetryAutomatic?: (domain: SendingDomain) => void;
  initialTab?: 'provider' | 'mta';
  canManage?: boolean;
}

/** Guided manual setup: records come from the backend, checks reload from it. */
export default function DnsSetupDialog({ projectId, domainId, onClose, onChanged, onRetryAutomatic, initialTab = 'provider', canManage = true }: Props) {
  const query = useQuery({
    queryKey: ['projects', 'sending-domains', projectId, domainId],
    queryFn: () => getSendingDomain(projectId, domainId),
  });
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [selector, setSelector] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'provider' | 'mta'>(initialTab);
  const [mtaBusy, setMtaBusy] = useState(false);
  const [mtaError, setMtaError] = useState<string | null>(null);
  const mtaQuery = useQuery({
    queryKey: ['projects', 'sending-domains', projectId, domainId, 'mta-dns'],
    queryFn: () => getMtaDnsRecords(projectId, domainId),
    enabled: activeTab === 'mta',
  });

  const domain = query.data;
  const records = domain?.dnsRecords ?? [];
  const sesDkimRecords = records.filter((record) => record.purpose === 'DKIM' && record.type === 'CNAME');
  const customerVisibleRecords = records.filter((record) => record.purpose !== 'SPF' && record.purpose !== 'DOMAIN_VERIFICATION');
  const needsSesRefresh = records.length > 0 && sesDkimRecords.length < 3;

  const refreshRecords = async () => {
    setChecking(true);
    setCheckError(null);
    try {
      await refreshSesRecords(projectId, domainId);
      await query.refetch();
    } catch (e) {
      setCheckError(domainErrorMessage(e));
    } finally {
      onChanged();
      setChecking(false);
    }
  };

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
  const displayRecords = needsSesRefresh ? [] : customerVisibleRecords;
  const automaticProvider = domain?.provider ?? (domain?.providerName?.toLowerCase() === 'ionos' ? 'ionos' : null);
  // The key belongs to the customer's email provider (TXT) and has not been found yet.
  const providerDkim = records.find((r) => r.purpose === 'DKIM' && r.type === 'TXT');
  const selectorValue = selector ?? domain?.dkimSelector ?? '';
  const selectorValid = /^[a-z0-9-]{0,63}$/i.test(selectorValue.trim());
  const statusMessage = domain && domain.status !== 'verified' ? messageForCode(domain.lastError) : null;
  const mtaRecords = mtaQuery.data?.records ?? [];
  const mtaReady = mtaRecords.some((record) => record.id === 'mta_spf')
    && mtaRecords.some((record) => record.id === 'mta_dkim')
    && mtaRecords.filter((record) => record.required).every((record) => record.verified);

  const prepareMta = async () => {
    setMtaBusy(true);
    setMtaError(null);
    try {
      await provisionMtaDnsRecords(projectId, domainId);
      await mtaQuery.refetch();
    } catch (error) {
      setMtaError(domainErrorMessage(error));
    } finally {
      setMtaBusy(false);
    }
  };

  const checkMta = async () => {
    setMtaBusy(true);
    setMtaError(null);
    try {
      await checkMtaDns(projectId, domainId);
      await mtaQuery.refetch();
    } catch (error) {
      setMtaError(domainErrorMessage(error));
    } finally {
      setMtaBusy(false);
    }
  };

  const selectMta = async () => {
    setMtaBusy(true);
    setMtaError(null);
    try {
      await updateDeliveryProvider(projectId, domainId, 'mta');
      await query.refetch();
      onChanged();
    } catch (error) {
      setMtaError(domainErrorMessage(error));
    } finally {
      setMtaBusy(false);
    }
  };

  return (
    <Dialog
      open
      onClose={checking || mtaBusy ? undefined : onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{ sx: { display: 'flex', flexDirection: 'column', maxHeight: 'calc(100dvh - 32px)' } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <span>DNS records for {domain?.domain ?? '…'}</span>
            {domain && <DomainStatusBadge status={domain.status} lastError={domain.lastError} />}
          </Stack>
          <IconButton aria-label="Close" onClick={onClose} disabled={checking || mtaBusy} size="small">
            <CloseRounded />
          </IconButton>
        </Stack>
      </DialogTitle>
      <Tabs
        value={activeTab}
        onChange={(_, value: 'provider' | 'mta') => setActiveTab(value)}
        aria-label="DNS setup provider"
        sx={{ px: 3, borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Tab value="provider" label="View DNS records" />
        <Tab value="mta" label="View MTA DNS records" />
      </Tabs>
      <DialogContent sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {query.isPending && (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }} role="status"><CircularProgress size={28} /></Stack>
        )}
        {query.isError && (
          <Stack gap={1.5}>
            <Alert severity="error">{domainErrorMessage(query.error)}</Alert>
            <Button variant="outlined" onClick={() => query.refetch()} sx={{ alignSelf: 'flex-start' }}>Retry</Button>
          </Stack>
        )}
        {domain && activeTab === 'provider' && (
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
              <Alert severity="success">{domain.domain}: Domain authenticated and ready to send. Send yourself a test email under Email.</Alert>
            )}
            {domain.status === 'verification_failed' && (isConnectionCode(domain.lastError)
              ? <Alert severity="warning">PixlPush email delivery is not ready yet. {statusMessage}</Alert>
              : <Alert severity="error">Verification failed. {statusMessage}</Alert>)}
            {domain.status === 'dns_check_failed' && <Alert severity="error">{messageForCode('DNS_LOOKUP_FAILED')}</Alert>}
            {domain.status === 'dns_pending' && domain.lastCheckedAt && <Alert severity="info">{messageForCode('DNS_RECORD_NOT_FOUND')}</Alert>}
            {needsSesRefresh && (
              <Alert severity="warning" action={<Button color="inherit" size="small" onClick={refreshRecords} disabled={checking}>Refresh email records</Button>}>
                This domain still has records from the previous provider-based setup. Refresh the setup to load the current DKIM records.
              </Alert>
            )}
            {checkError && (
              <Alert severity="error" action={<Button color="inherit" size="small" onClick={runCheck} disabled={checking}>Retry</Button>}>
                {checkError}
              </Alert>
            )}

            <Stack component="ul" gap={0.5} sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: "var(--fs-13)" }}>
              <li>DNS changes can take several hours to take effect.</li>
              <li><code>@</code> stands for the root domain ({domain.domain}). Some providers want the name left empty instead.</li>
              <li>Copy CNAME and TXT values exactly, without extra spaces or quotes.</li>
              <li>For DKIM, choose <code>CNAME</code> as the DNS record type. DKIM is the email authentication method, not a DNS record type.</li>
              <li>Copy each record name and target exactly as shown below.</li>
              <li>DMARC is optional and does not block authentication or sending.</li>
              <li>The domain stays unauthenticated while any required record is missing.</li>
            </Stack>

            {displayRecords.length === 0 ? (
              <Alert severity="info">No DNS records yet. Choose how to connect this domain first.</Alert>
            ) : (
              <Stack gap={1.5}>{displayRecords.map((record) => <DnsRecordCard key={record.id} record={record} />)}</Stack>
            )}

            {providerDkim && !providerDkim.verified && (
              <Stack gap={1}>
                <Typography fontSize="var(--fs-13)" color="text.secondary">
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
                    disabled={checking}
                  />
                  <Button variant="outlined" onClick={saveSelector} disabled={checking || !selectorValid || selector === null}>Save and check</Button>
                </Stack>
              </Stack>
            )}

            {domain.status !== 'verified' && displayRecords.length > 0 && (
              <Stack gap={0.75} sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography fontWeight={600}>Wait for the records to become active</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-13)">
                  It can take up to 24 hours, but usually takes only a couple of hours. We will let you know when your domain is ready.
                </Typography>
                <Stack direction="row" alignItems="center" gap={1} sx={{ bgcolor: '#eef0f3', color: 'text.secondary', px: 1.25, py: 0.85, borderRadius: 0.5, fontSize: "var(--fs-13)" }}>
                  <AccessTimeRounded sx={{ fontSize: 16 }} />
                  <Typography fontSize="var(--fs-13)">Your records haven’t been authenticated yet.</Typography>
                </Stack>
              </Stack>
            )}

            {domain.lastCheckedAt && (
              <Typography color="text.secondary" fontSize="var(--fs-12)">Last checked {formatUserDateTime(domain.lastCheckedAt)}</Typography>
            )}
          </Stack>
        )}
        {activeTab === 'mta' && (
          <Stack gap={2.5}>
            <Alert severity="info">
              Set up PixlPush MTA separately from your current email provider. Your current provider stays selected until you verify these records and choose MTA for this domain.
            </Alert>
            {mtaError && <Alert severity="error">{mtaError}</Alert>}
            {mtaQuery.isError && <Alert severity="error">{domainErrorMessage(mtaQuery.error)}</Alert>}
            {mtaQuery.isPending && <Stack alignItems="center" sx={{ py: 3 }} role="status"><CircularProgress size={24} /></Stack>}
            {mtaRecords.length === 0 && !mtaQuery.isPending && (
              <Stack gap={1.5}>
                <Typography color="text.secondary">PixlPush will create a DKIM key on the MTA and show the public DNS records here. The private key stays on the MTA.</Typography>
                {canManage && <Button variant="contained" onClick={prepareMta} disabled={mtaBusy}>{mtaBusy ? 'Preparing records…' : 'Prepare MTA DNS records'}</Button>}
              </Stack>
            )}
            {mtaRecords.length > 0 && (
              <>
                <Stack gap={0.5}>
                  <Typography fontWeight={600}>Add these records to your DNS provider</Typography>
                  <Typography color="text.secondary" fontSize="var(--fs-13)">The SPF value keeps existing mechanisms and adds the MTA address. Keep one SPF record on the domain.</Typography>
                </Stack>
                <Stack gap={1.5}>{mtaRecords.map((record) => <DnsRecordCard key={record.id} record={record} />)}</Stack>
                {mtaReady
                  ? <Alert severity="success">MTA DNS is verified. You can now select PixlPush MTA for this domain.</Alert>
                  : <Alert severity="info">After publishing the records, check DNS status. PixlPush will keep using {domain?.deliveryProvider === 'mta' ? 'MTA' : 'your current provider'} until MTA DNS is verified and selected.</Alert>}
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  {canManage && <Button variant="outlined" onClick={checkMta} disabled={mtaBusy}>{mtaBusy ? 'Checking…' : 'Check MTA DNS status'}</Button>}
                  {canManage && mtaReady && domain?.deliveryProvider !== 'mta' && <Button variant="contained" onClick={selectMta} disabled={mtaBusy}>Use MTA for this domain</Button>}
                  {domain?.deliveryProvider === 'mta' && <Alert severity="success" sx={{ flex: 1 }}>PixlPush MTA is selected for this domain.</Alert>}
                </Stack>
              </>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ position: 'sticky', bottom: 0, zIndex: 1, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
        {activeTab === 'provider' && automaticProvider && domain?.status !== 'verified' && (
          <Button onClick={() => onRetryAutomatic?.({ ...domain!, provider: automaticProvider! })} disabled={checking}>
            Try automatic connection
          </Button>
        )}
        {activeTab === 'provider' && domain && displayRecords.length > 0 && (
          <Button variant="outlined" onClick={runCheck} disabled={checking}>
            {checking ? 'Checking DNS…' : 'Check status'}
          </Button>
        )}
        <Button variant="contained" onClick={onClose} disabled={checking || mtaBusy}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
