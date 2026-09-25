'use client';

import { useState } from 'react';
import { ContentCopyRounded, KeyRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useSdkKeys } from '@/hooks/projects/use-project-settings';
import SettingsStatus from './SettingsStatus';
import type { ApiError } from '@/types/auth';
import type { CreatedSdkKey } from '@/types/project';

const KEY_ROLES = ['owner', 'admin', 'developer'];
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Public SDK / ingestion keys of the active Project. */
export default function SdkKeysPanel() {
  const { active } = useActiveProject();
  const canManage = Boolean(active && KEY_ROLES.includes(active.role));
  // The backend refuses the whole list to other roles, so do not ask.
  const { query, create, revoke } = useSdkKeys(canManage ? active?.id : undefined);

  const [name, setName] = useState('');
  const [fresh, setFresh] = useState<CreatedSdkKey>();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    try {
      setFresh(await create.mutateAsync(name.trim()));
      setCopied(false);
      setName('');
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not create the key.');
    }
  };

  const revokeKey = async (id: string, keyName: string) => {
    if (!window.confirm(`Revoke "${keyName}"? App versions using it stop sending events immediately.`)) return;
    setError(undefined);
    try { await revoke.mutateAsync(id); } catch (cause) { setError((cause as ApiError).message); }
  };

  const copy = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh.key);
    setCopied(true);
  };

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">SDK / ingestion keys</Typography>
        <Typography color="text.secondary" fontSize={12}>Public keys belong to this Project. Keep old keys active while rolling a new key into production.</Typography>
      </Box>

      {!canManage && active && <Alert severity="info">Only owners, admins and developers can view and manage SDK keys.</Alert>}
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {fresh && (
        <Alert severity="warning" onClose={() => setFresh(undefined)}>
          <Typography fontWeight={800} fontSize={13}>Copy &quot;{fresh.name}&quot; now. It is shown only once.</Typography>
          <Box className="key-field" sx={{ mt: 1 }}>
            <KeyRounded /><Typography sx={{ wordBreak: 'break-all' }}>{fresh.key}</Typography>
            <Button size="small" startIcon={<ContentCopyRounded />} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
          </Box>
          <Typography fontSize={12} sx={{ mt: 1 }}>Project ID for the SDK: <b>{active?.id}</b></Typography>
        </Alert>
      )}

      {canManage && query.data?.length === 0 && <Card className="saas-card"><Typography color="text.secondary" fontSize={13}>No SDK keys yet. Create one below to connect your app.</Typography></Card>}

      {query.data?.map((key) => (
        <Card className="saas-card" key={key.id}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography fontWeight={900}>{key.name}</Typography>
              <Typography color="text.secondary" fontSize={12}>
                Created {date(key.createdAt)} · {key.status === 'revoked' ? `Revoked ${date(key.revokedAt!)}` : key.lastUsedAt ? `Last used ${date(key.lastUsedAt)}` : 'Never used'}
              </Typography>
            </Box>
            <SettingsStatus tone={key.status === 'active' ? 'success' : 'neutral'}>{key.status === 'active' ? 'Active' : 'Revoked'}</SettingsStatus>
          </Stack>
          <Box className="key-field">
            <KeyRounded /><Typography>{key.keyPrefix}••••••••••••••••</Typography>
            {key.status === 'active' && <Button size="small" color="error" disabled={revoke.isPending} onClick={() => revokeKey(key.id, key.name)}>Revoke</Button>}
          </Box>
        </Card>
      ))}

      {canManage && (
        <Card className="saas-card" component="form" onSubmit={submit}>
          <Typography variant="h3">Create a new key</Typography>
          <Typography color="text.secondary" fontSize={12}>Use a separate key for staging or safe production rotation.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 2 }}>
            <TextField label="Key name" placeholder="Production mobile" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} fullWidth />
            <Button type="submit" variant="contained" startIcon={<KeyRounded />} disabled={!name.trim() || create.isPending} sx={{ minWidth: 150 }}>
              {create.isPending ? 'Creating…' : 'Create key'}
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
