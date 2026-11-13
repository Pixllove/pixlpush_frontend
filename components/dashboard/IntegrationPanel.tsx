'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { ArrowBackRounded, CallMadeRounded, CallReceivedRounded, CheckCircleRounded, LockRounded, PauseCircleRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, CircularProgress, FormControlLabel, Grid, Link, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { integrationById, integrationStatus } from '@/components/integrations/registry';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useIntegration } from '@/hooks/projects/use-project-settings';
import { integrationsApi } from '@/lib/projects/api';
import SettingsStatus from './SettingsStatus';
import SidePanel from './SidePanel';
import type { ApiError } from '@/types/auth';
import type { IntegrationProvider } from '@/types/project';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];

/** "just now", "3 minutes ago", "2 hours ago". */
function timeAgo(date: string | Date) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 24 * 60) return rtf.format(-Math.round(minutes / 60), 'hour');
  return new Date(date).toLocaleString();
}

/**
 * The page of every integration (HubSpot, Salesforce, Pipedrive, ...): connect
 * (sign-in or manual credentials) and two-way sync status for the active Project.
 * What differs per integration comes from components/integrations/registry.tsx.
 */
export default function IntegrationPanel({ provider }: { provider: IntegrationProvider }) {
  const crm = integrationById(provider);
  const { active } = useActiveProject();
  const { query, connect, setSyncEnabled, syncNow, disconnect, oauthCallback } = useIntegration(active?.id, provider);
  const settings = query.data;
  const oauthAvailable = Boolean(settings?.oauthAvailable);
  /** Chosen tab; until the user picks one, sign-in when it is available, manual otherwise. */
  const [tab, setTab] = useState<'oauth' | 'manual'>();
  const manual = (tab ?? (oauthAvailable ? 'oauth' : 'manual')) === 'manual';
  const [redirecting, setRedirecting] = useState(false);
  /** Code from an install started in the CRM's marketplace, waiting for the user to pick the Project. */
  const [marketplaceCode, setMarketplaceCode] = useState<string>();
  const [form, setForm] = useState<Record<string, string>>({});
  const [replacing, setReplacing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [error, setError] = useState<string>();
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const syncing = Boolean(settings?.connected && settings.syncing && settings.syncEnabled);

  // The worker runs the sync; refresh while it is in progress.
  const { refetch } = query;
  useEffect(() => {
    if (!syncing) return;
    const timer = setInterval(() => void refetch(), 5000);
    return () => clearInterval(timer);
  }, [syncing, refetch]);

  const run = async (action: () => Promise<unknown>) => {
    setError(undefined);
    try { await action(); } catch (cause) { setError((cause as ApiError).message); }
  };

  // Back from the CRM's consent page: ?code&state (approved) or ?error (cancelled). Handled once.
  const handledReturn = useRef(false);
  const { mutateAsync: finishOauth } = oauthCallback;
  useEffect(() => {
    if (!active?.id || handledReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const denied = params.get('error');
    if (!code && !denied) return;
    handledReturn.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (denied) {
      setError(`${crm.name} was not connected: access was not approved.`);
      return;
    }
    if (code && state) void run(async () => { await finishOauth({ code, state }); setReplacing(false); });
    else if (code) setMarketplaceCode(code);
  }, [active?.id, finishOauth, crm.name]);

  // Opens the consent page in a new tab. The tab must open synchronously on click (before the await)
  // or popup blockers stop it. The callback lands in that tab; this tab refreshes status on focus.
  const startOauth = () => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    return run(async () => {
      setRedirecting(true);
      try {
        const { url } = await integrationsApi.oauthStart(active!.id, provider);
        if (tab) tab.location.href = url;
        else window.location.assign(url); // popup blocked: fall back to same tab
      } catch (cause) {
        tab?.close();
        throw cause;
      } finally {
        setRedirecting(false);
      }
    });
  };
  const reset = () => { setForm({}); setReplacing(false); };
  const { fields } = crm.manual;
  const submit = () => run(async () => {
    await connect.mutateAsync(Object.fromEntries(fields.map((f) => [f.key, (form[f.key] ?? '').trim()])));
    reset();
  });
  const confirmDisconnect = () => run(async () => {
    await disconnect.mutateAsync();
    setDisconnectOpen(false);
  });

  const busy = !canEdit || connect.isPending;
  const ready = fields.every((f) => (form[f.key] ?? '').trim().length >= f.minLength);
  const submitButton = (
    <Button type="submit" variant="contained" disabled={busy || !ready} sx={{ whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
      {connect.isPending ? 'Checking…' : 'Connect'}
    </Button>
  );
  const inputs = fields.map((f) => (
    <TextField
      key={f.key}
      size="small"
      fullWidth
      type={f.secret ? 'password' : 'text'}
      label={f.label}
      placeholder={f.placeholder}
      value={form[f.key] ?? ''}
      onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
      disabled={busy}
      autoComplete="off"
    />
  ));
  const { Guide, help } = crm.manual;
  const manualForm = (
    <Guide pasteStep={(
      <Stack gap={1.25} component="form" onSubmit={(e) => { e.preventDefault(); if (ready) void submit(); }}>
        {fields.length === 1
          ? <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>{inputs}{submitButton}</Stack>
          : <>{inputs}{submitButton}</>}
        <Typography color="text.secondary" fontSize="var(--fs-12)">
          PixlPush checks {fields.length > 1 ? 'these' : 'it'} with {crm.name}, encrypts {fields.length > 1 ? 'them' : 'it'} and never shows {fields.length > 1 ? 'them' : 'it'} again.
          {help && <>{' '}<Link href={help.href} target="_blank" rel="noopener noreferrer">{help.label}</Link></>}
        </Typography>
      </Stack>
    )} />
  );

  const connectCard = (
    <Card className="saas-card">
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography fontWeight={700} fontSize="var(--fs-14)">{settings?.connected ? `Reconnect ${crm.name}` : `Connect ${crm.name}`}</Typography>
        {replacing && <Button onClick={reset}>Cancel</Button>}
      </Stack>
      {/* Both ways to connect, for every integration. */}
      <Tabs value={manual ? 'manual' : 'oauth'} onChange={(_, v) => setTab(v)} sx={{ mt: 1, mb: 2, borderBottom: '1px solid #eeeaf3' }}>
        <Tab value="oauth" label={`Sign in with ${crm.name}`} />
        <Tab value="manual" label={crm.manual.tab} />
      </Tabs>
      {!manual ? (
        <Stack gap={1.5} alignItems="flex-start">
          {!oauthAvailable && (
            <Alert severity="info" sx={{ width: '100%' }} action={<Button color="inherit" size="small" onClick={() => setTab('manual')}>Connect manually</Button>}>
              Signing in with {crm.name} isn&apos;t switched on yet. Use the manual connection for now; it syncs the same way.
            </Alert>
          )}
          {settings?.oauthSetupUrl && crm.signIn.setup && (
            <Alert severity="info" sx={{ width: '100%' }} action={<Button color="inherit" size="small" href={settings.oauthSetupUrl} target="_blank" rel="noopener noreferrer">Install</Button>}>
              {crm.signIn.setup}
            </Alert>
          )}
          <Typography color="text.secondary" fontSize="var(--fs-12)">{crm.signIn.text}</Typography>
          <Button variant="contained" disabled={!oauthAvailable || !canEdit || redirecting || oauthCallback.isPending} onClick={startOauth}>
            {oauthCallback.isPending ? 'Connecting…' : redirecting ? `Opening ${crm.name}…` : `Connect with ${crm.name}`}
          </Button>
        </Stack>
      ) : (
        <>
          <Typography color="text.secondary" fontSize="var(--fs-12)">
            {crm.manual.intro}
          </Typography>
          {manualForm}
        </>
      )}
    </Card>
  );

  const statusCard = settings?.connected && (
    <Card className="saas-card">
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} gap={1.5}>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700} fontSize="var(--fs-14)">Connected to {crm.name}</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.25 }}>
            {crm.account(settings.accountLabel)} · {crm.authLabel[settings.authType] ?? 'Connected'}
          </Typography>
        </Box>
        <Button variant="outlined" disabled={!canEdit || !settings.syncEnabled || syncing || syncNow.isPending} onClick={() => run(() => syncNow.mutateAsync())}>Sync now</Button>
      </Stack>

      <Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: syncing ? '#f4effc' : settings.syncEnabled ? '#eefaf3' : '#f5f4f7' }}>
        {syncing ? <CircularProgress size={18} thickness={5} /> : settings.syncEnabled ? <CheckCircleRounded sx={{ color: '#15965e', fontSize: 20 }} /> : <PauseCircleRounded sx={{ color: 'text.secondary', fontSize: 20 }} />}
        <Box>
          <Typography fontWeight={600} fontSize="var(--fs-13)">
            {syncing ? (settings.lastSyncedAt ? 'Checking for changes…' : `Bringing in your ${crm.name} ${crm.people}…`) : settings.syncEnabled ? 'Everything is up to date' : 'Automatic sync is paused'}
          </Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)">
            {syncing
              ? (settings.lastSyncedAt ? 'This usually takes a few seconds.' : 'The first sync can take a few minutes for large accounts. You can leave this page.')
              : settings.syncEnabled
                ? `Last checked ${settings.lastSyncedAt ? timeAgo(settings.lastSyncedAt) : 'just now'}. PixlPush checks again every 2 minutes.`
                : `Turn on automatic sync to keep ${crm.name} and PixlPush in step.`}
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {[
          [crm.counts.imported, `${crm.name} ${crm.people} added to PixlPush`, settings.counts.created],
          [crm.counts.sent, crm.counts.sentHelp, settings.counts.pushed],
          ['Profiles completed', `Empty details filled in from ${crm.name}`, settings.counts.updated],
          ['Not imported', 'No email, or matches more than one user', settings.counts.skipped],
        ].map(([label, help, value]) => (
          <Grid item xs={6} md={3} key={label as string}>
            <Box sx={{ p: 1.5, height: '100%', border: '1px solid #eeeaf3', borderRadius: 2 }}>
              <Typography fontWeight={700} fontSize="var(--fs-18)">{Number(value).toLocaleString()}</Typography>
              <Typography fontWeight={600} fontSize="var(--fs-12)">{label}</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-11)">{help}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      <Typography color="text.secondary" fontSize="var(--fs-11)" sx={{ mt: 1 }}>Totals since you connected {crm.name}.</Typography>
      {settings.lastError && <Alert severity="warning" sx={{ mt: 2 }}>{settings.lastError}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mt: 2, pt: 2, borderTop: '1px solid #eeeaf3' }}>
        <FormControlLabel
          sx={{ ml: 0, gap: 1 }}
          control={<Switch checked={settings.syncEnabled} disabled={!canEdit || setSyncEnabled.isPending} onChange={(_, on) => run(() => setSyncEnabled.mutateAsync(on))} />}
          label={(
            <Box>
              <Typography fontSize="var(--fs-13)" fontWeight={600}>Automatic sync</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-11)">{settings.syncEnabled ? 'On · checks every 2 minutes' : 'Off · nothing syncs until you turn it on'}</Typography>
            </Box>
          )}
        />
        <Stack direction="row" gap={1}>
          {!replacing && <Button variant="outlined" disabled={!canEdit} onClick={() => setReplacing(true)}>{oauthAvailable ? 'Change account' : 'Replace credentials'}</Button>}
          <Button variant="outlined" color="error" disabled={!canEdit || disconnect.isPending} aria-haspopup="dialog" onClick={() => { setError(undefined); setDisconnectOpen(true); }}>Disconnect</Button>
        </Stack>
      </Stack>
    </Card>
  );

  const status = integrationStatus(settings);

  return (
    <Stack gap={2.5}>
      <Link component={NextLink} href="/dashboard/integrations" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 'var(--fs-13)', alignSelf: 'flex-start' }}>
        <ArrowBackRounded sx={{ fontSize: 16 }} /> All integrations
      </Link>

      <Card className="saas-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <crm.Logo size={48} />
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={700} fontSize="var(--fs-16)">{crm.name}</Typography>
              <Chip size="small" label={crm.category} className="neutral-chip" />
              {status ? <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus> : <Chip size="small" variant="outlined" label="Not connected" />}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.5 }}>{crm.intro}</Typography>
          </Box>
        </Stack>
      </Card>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(undefined)}>{error}</Alert>}
      {marketplaceCode && (
        <Alert
          severity="info"
          action={(
            <Stack direction="row" gap={1}>
              <Button color="inherit" onClick={() => setMarketplaceCode(undefined)} disabled={oauthCallback.isPending}>Cancel</Button>
              <Button
                variant="contained"
                disabled={!canEdit || oauthCallback.isPending}
                onClick={() => run(async () => { await finishOauth({ code: marketplaceCode }); setMarketplaceCode(undefined); setReplacing(false); })}
              >
                {oauthCallback.isPending ? 'Connecting…' : 'Connect'}
              </Button>
            </Stack>
          )}
        >
          Finish installing PixlPush from {crm.name}: connect it to the project <strong>{active?.name}</strong>? To use another project, switch projects first.
        </Alert>
      )}
      {!canEdit && active && <Alert severity="info">Only owners, admins and developers can change the {crm.name} connection.</Alert>}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Stack gap={2.5}>
            {query.isLoading && <Card className="saas-card"><Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack></Card>}
            {statusCard}
            {settings && (!settings.connected || replacing) && connectCard}
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack gap={2.5}>
            <Card className="saas-card">
              <Typography fontWeight={700} fontSize="var(--fs-14)">How the sync works</Typography>
              <Stack gap={1.5} sx={{ mt: 1.5 }}>
                <Stack direction="row" gap={1.25}>
                  <Box className="integration-icon" sx={{ width: 32, height: 32, flexShrink: 0 }}><CallReceivedRounded fontSize="small" /></Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)"><strong>{crm.name} → PixlPush.</strong> {crm.inText}</Typography>
                </Stack>
                <Stack direction="row" gap={1.25}>
                  <Box className="integration-icon" sx={{ width: 32, height: 32, flexShrink: 0 }}><CallMadeRounded fontSize="small" /></Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)"><strong>PixlPush → {crm.name}.</strong> {crm.outText}</Typography>
                </Stack>
              </Stack>
            </Card>
            <Card className="saas-card">
              <Typography fontWeight={700} fontSize="var(--fs-14)">Good to know</Typography>
              <Box component="ul" sx={{ pl: 2.5, mb: 0, mt: 1, color: 'text.secondary', fontSize: 'var(--fs-12)', '& li': { mb: 0.5 } }}>
                {crm.notes.map((note) => <li key={note}>{note}</li>)}
                <li>New {crm.name} records count toward your plan&apos;s user limit.</li>
                <li>Nothing is ever deleted on either side.</li>
              </Box>
            </Card>
            <Alert severity="info" icon={<LockRounded />}>{crm.security}</Alert>
          </Stack>
        </Grid>
      </Grid>

      <SidePanel
        open={disconnectOpen}
        onClose={() => { if (!disconnect.isPending) setDisconnectOpen(false); }}
        eyebrow={`${crm.name} integration`}
        title={`Disconnect ${crm.name}?`}
        label={`Confirm ${crm.name} disconnect`}
        closeLabel="Close disconnect confirmation"
        footer={(
          <>
            <Button onClick={() => setDisconnectOpen(false)} disabled={disconnect.isPending}>Cancel</Button>
            <Button color="error" variant="contained" onClick={confirmDisconnect} disabled={disconnect.isPending}>
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </>
        )}
      >
        <Typography color="text.secondary" fontSize="var(--fs-13)">
          Disconnecting stops future {crm.name} syncs. Users already synced stay in PixlPush, and records stay in {crm.name}.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </SidePanel>
    </Stack>
  );
}
