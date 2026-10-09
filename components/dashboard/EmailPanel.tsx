'use client';

import { useState } from 'react';
import { EmailRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useEmailSettings } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];
const EMPTY_SMTP = { host: '', port: '587', username: '', password: '' };

/**
 * Second half of the email setup. The domain itself is added and authenticated under Sending domains;
 * here the Project gets what DNS cannot give it: the provider's sending connection, bounce and complaint
 * handling, and a test email. "Ready to send" is the backend's answer, never derived here.
 */
export default function EmailPanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { active } = useActiveProject();
  const { query, configureSmtp, createWebhookSecret, sendTest } = useEmailSettings(active?.id);
  const config = query.data;
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const ready = config?.productionSendingEnabled === true;
  const blockers = config?.sending?.blockers ?? [];

  const [smtp, setSmtp] = useState(EMPTY_SMTP);
  const [testTo, setTestTo] = useState('');
  const [secret, setSecret] = useState<{ secret: string; signing: string }>();
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<string | void>) => {
    setError(undefined);
    setNotice(undefined);
    try { setNotice((await action()) || undefined); } catch (cause) { setError((cause as ApiError).message ?? 'Something went wrong. Please try again.'); }
  };

  const saveSmtp = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      await configureSmtp.mutateAsync({ ...smtp, port: Number(smtp.port) });
      setSmtp(EMPTY_SMTP);
      return 'Sending connection saved. Run "Check status" on your domain under Sending domains to verify the login.';
    });
  };

  const createSecret = () => run(async () => { setSecret(await createWebhookSecret.mutateAsync()); });

  const sendTestEmail = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const { to } = await sendTest.mutateAsync(testTo);
      return `Test email sent to ${to}. Check that it arrived.`;
    });
  };

  const smtpField = (key: keyof typeof smtp) => ({
    value: smtp[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSmtp({ ...smtp, [key]: e.target.value }),
    disabled: !canEdit,
    fullWidth: true,
    required: true,
  });

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Email sending</Typography>
        <Typography color="text.secondary" fontSize={12}>Connect the email provider this project sends through. Email is enabled once every check below passes.</Typography>
      </Box>

      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <Card className="settings-hero-card">
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ sm: 'center' }}>
          <Box className="settings-large-icon email"><EmailRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={600}>{config?.sendingDomain ?? 'No sending domain yet'}</Typography>
              {config && <SettingsStatus tone={ready ? 'success' : 'warning'}>{ready ? 'Ready to send' : 'Provider connection incomplete'}</SettingsStatus>}
            </Stack>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: .6 }}>
              {config?.senderEmail ? `Sender: ${config.senderName ?? ''} <${config.senderEmail}>` : 'The sender is taken from your first authenticated sending domain.'}
            </Typography>
          </Box>
          {onNavigate && <Button variant="outlined" onClick={() => onNavigate('Sending domains')}>Sending domains</Button>}
        </Stack>
      </Card>

      {config && ready && <Alert severity="success">Domain authenticated and sending connection ready.</Alert>}
      {config && !ready && (
        <Alert severity="warning">
          Email cannot be sent from this project yet. Still missing:
          <Box component="ul" sx={{ m: 0, mt: .5, pl: 2.5 }}>
            {blockers.map((b) => <li key={b.code}>{b.message}</li>)}
          </Box>
        </Alert>
      )}

      <Card className="saas-card" component="form" onSubmit={saveSmtp} aria-label="Sending connection">
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="h3">Sending connection (SMTP)</Typography>
          {config && <SettingsStatus tone={config.smtp ? 'success' : 'neutral'}>{config.smtp ? `${config.smtp.host}:${config.smtp.port}` : 'Not connected'}</SettingsStatus>}
        </Stack>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
          Providers such as IONOS can publish your DNS records for us, but they do not hand out sending access to other apps. Enter the SMTP details of your email provider once. The password is stored encrypted and is never shown again.
        </Typography>
        <Stack gap={1.5} sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField label="SMTP host" placeholder="smtp.ionos.com" {...smtpField('host')} />
            <TextField label="Port" type="number" sx={{ maxWidth: { sm: 120 } }} {...smtpField('port')} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField label="Username" autoComplete="off" {...smtpField('username')} />
            <TextField label="Password" type="password" autoComplete="new-password" {...smtpField('password')} />
          </Stack>
        </Stack>
        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={!canEdit || configureSmtp.isPending}>
          {configureSmtp.isPending ? 'Saving…' : config?.smtp ? 'Replace sending connection' : 'Save sending connection'}
        </Button>
      </Card>

      <Card className="saas-card" aria-label="Bounce and complaint handling">
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="h3">Bounce and complaint handling</Typography>
          {config && <SettingsStatus tone={config.webhook?.secretSet ? 'success' : 'neutral'}>{config.webhook?.secretSet ? 'Active' : 'Not set up'}</SettingsStatus>}
        </Stack>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
          Your email provider reports bounces and spam complaints to this address, so those contacts are never emailed again. Add it as a webhook at your provider, signed with the secret.
        </Typography>
        {config?.webhook?.url && <Typography sx={{ mt: 1.5, fontFamily: 'var(--pp-mono)', wordBreak: 'break-all' }} fontSize={12}>{config.webhook.url}</Typography>}
        {secret && (
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Store this secret now. It cannot be shown again.
            <Typography sx={{ fontFamily: 'var(--pp-mono)', wordBreak: 'break-all' }} fontSize={12}>{secret.secret}</Typography>
            <Typography fontSize={12}>{secret.signing}</Typography>
          </Alert>
        )}
        <Button variant="outlined" sx={{ mt: 2 }} disabled={!canEdit || createWebhookSecret.isPending} onClick={createSecret}>
          {config?.webhook?.secretSet ? 'Rotate webhook secret' : 'Create webhook secret'}
        </Button>
      </Card>

      <Card className="saas-card" component="form" onSubmit={sendTestEmail} aria-label="Test email">
        <Typography variant="h3">Send a test email</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
          {ready ? 'Send one message through your sending connection to see it arrive.' : 'Available once every check above passes.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
          <TextField label="Send to" type="email" required fullWidth value={testTo} onChange={(e) => setTestTo(e.target.value)} disabled={!canEdit || !ready} />
          <Button type="submit" variant="contained" disabled={!canEdit || !ready || sendTest.isPending} sx={{ flexShrink: 0 }}>
            {sendTest.isPending ? 'Sending…' : 'Send test email'}
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
