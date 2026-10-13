'use client';

import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { useCurrentUser } from '@/hooks/auth/use-current-user';

export default function TwoFactorSettings() {
  const { account, isLoading } = useCurrentUser();
  const enabled = account?.twoFactorEnabled;
  const status = isLoading ? 'Checking…' : enabled === undefined ? 'Not reported' : enabled ? 'Enabled' : 'Not enabled';

  return (
    <section className="pp-profile-section">
      <div>
        <Typography variant="h3">Two-factor authentication</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Add an extra verification step to help protect your PixlPush account.
        </Typography>
      </div>
      <Stack alignItems="flex-start" gap={1.25}>
        <Chip size="small" label={`2FA: ${status}`} color={enabled ? 'success' : 'default'} />
        <Button variant="outlined" disabled>
          Set up an authenticator
        </Button>
        <Alert severity="info" sx={{ maxWidth: 560 }}>
          Two-factor setup is not available yet. The account service does not currently provide enrollment or status endpoints.
        </Alert>
      </Stack>
    </section>
  );
}
