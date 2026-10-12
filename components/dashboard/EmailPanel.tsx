'use client';

import { useState } from 'react';
import { Alert, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useEmailSettings } from '@/hooks/projects/use-project-settings';
import SendingDomainsPanel from './sending-domains/SendingDomainsPanel';
import type { ApiError } from '@/types/auth';

const CONFIG_ROLES = ['owner', 'admin', 'developer'];
/**
 * Complete email setup for the Project. PixlPush owns the transport and
 * feedback pipeline; Projects only choose and authenticate a sending domain.
 */
export default function EmailPanel() {
  const { active } = useActiveProject();
  const { query, sendTest } = useEmailSettings(active?.id);
  const config = query.data;
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const ready = config?.productionSendingEnabled === true;

  const [testTo, setTestTo] = useState('');
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<string | void>) => {
    setError(undefined);
    setNotice(undefined);
    try { setNotice((await action()) || undefined); } catch (cause) { setError((cause as ApiError).message ?? 'Something went wrong. Please try again.'); }
  };

  const sendTestEmail = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const { to } = await sendTest.mutateAsync(testTo);
      return `Test email sent to ${to}. Check that it arrived.`;
    });
  };

  return (
    <Stack gap={2.5}>
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <SendingDomainsPanel />

      <Card className="saas-card">
        <Typography variant="h3">PixlPush email delivery</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
          PixlPush manages the delivery infrastructure, bounce protection, and spam-complaint suppression for every Project. Authenticate a sending domain above and we handle the rest automatically.
        </Typography>
      </Card>

      <Card className="saas-card" component="form" onSubmit={sendTestEmail} aria-label="Test email">
        <Typography variant="h3">Send a test email</Typography>
        <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
          {ready ? 'Send one message through PixlPush to see it arrive.' : 'Available once your domain and PixlPush delivery checks pass.'}
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
