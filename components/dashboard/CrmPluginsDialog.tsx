'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowForwardRounded, CloseRounded } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import SettingsStatus from '@/components/dashboard/SettingsStatus';
import { INTEGRATIONS, integrationStatus } from '@/components/integrations/registry';
import { useIntegrations } from '@/hooks/projects/use-project-settings';
import { roadmapApi } from '@/lib/projects/api';

/** Every CRM plugin in one place. A new CRM in the registry appears here automatically. */
export default function CrmPluginsDialog({ open, projectId, onClose }: { open: boolean; projectId?: string; onClose: () => void }) {
  const settings = useIntegrations(projectId).data;
  const crms = INTEGRATIONS.filter((integration) => integration.category === 'CRM');
  const [requesting, setRequesting] = useState(false);
  const [plugin, setPlugin] = useState('');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    if (sending) return;
    setRequesting(false);
    setPlugin('');
    setDetails('');
    setSent('');
    setError('');
    onClose();
  };

  const submit = async () => {
    if (!projectId || !plugin.trim()) return;
    setSending(true);
    setError('');
    try {
      const name = plugin.trim();
      await roadmapApi.suggest(projectId, {
        title: `Plugin request: ${name}`,
        description: details.trim() || `Requested from Import users: connect ${name} to PixlPush.`,
        area: 'Integrations',
        tags: ['integration', 'crm'],
      });
      setSent(name);
      setPlugin('');
      setDetails('');
      setRequesting(false);
    } catch (cause) {
      setError((cause as { message?: string })?.message ?? 'Could not send your request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>
        <Typography variant="h3" component="span">Connect a CRM</Typography>
        <Typography variant="body2" color="text.secondary">Choose a plugin to import and sync your contacts.</Typography>
        <IconButton aria-label="Close" onClick={close} sx={{ position: 'absolute', right: 16, top: 16 }}><CloseRounded /></IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent>
        <Stack gap={2}>
          <Stack divider={<Divider />}>
            {crms.map(({ id, name, summary, href, Logo }) => {
              const status = integrationStatus(settings?.find((item) => item.provider === id));
              return (
                <Stack key={id} direction="row" alignItems="center" gap={1.5} sx={{ py: 1.5 }}>
                  <Logo size={36} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={600}>{name}</Typography>
                      {status && <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus>}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{summary}</Typography>
                  </Box>
                  <Button component={Link} href={href} size="small" variant={status ? 'outlined' : 'contained'} endIcon={<ArrowForwardRounded />} sx={{ flexShrink: 0 }}>
                    {status ? 'Manage' : 'Connect'}
                  </Button>
                </Stack>
              );
            })}
          </Stack>

          {sent && <Alert severity="success" onClose={() => setSent('')}>Thanks. We received your request for {sent}.</Alert>}
          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {requesting ? (
            <Stack gap={1.5}>
              <Typography variant="subtitle1">Request a plugin</Typography>
              <TextField autoFocus size="small" label="CRM or tool name" value={plugin} onChange={(event) => setPlugin(event.target.value)} inputProps={{ maxLength: 120 }} />
              <TextField size="small" multiline minRows={2} label="How would you use it? (optional)" value={details} onChange={(event) => setDetails(event.target.value)} inputProps={{ maxLength: 2000 }} />
              <Stack direction="row" justifyContent="flex-end" gap={1}>
                <Button disabled={sending} onClick={() => setRequesting(false)}>Cancel</Button>
                <Button variant="contained" disabled={!plugin.trim() || sending} onClick={() => void submit()}>{sending ? 'Sending…' : 'Send request'}</Button>
              </Stack>
            </Stack>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
              <Typography variant="body2" color="text.secondary">Don’t see your CRM?</Typography>
              <Button variant="outlined" onClick={() => setRequesting(true)}>Request more plugins</Button>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
