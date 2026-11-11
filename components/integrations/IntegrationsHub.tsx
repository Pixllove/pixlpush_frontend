'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AddRounded, ArrowForwardRounded, SearchRounded } from '@mui/icons-material';
import { Box, Button, Card, Chip, Grid, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import SettingsStatus from '@/components/dashboard/SettingsStatus';
import { INTEGRATIONS, type Integration } from './registry';

function IntegrationCard({ integration }: { integration: Integration }) {
  const { name, category, summary, href, Logo, useStatus } = integration;
  const status = useStatus();
  return (
    <Card className="integration-card" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
        <Logo />
        {status ? <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus> : <Chip size="small" variant="outlined" label="Not connected" />}
      </Stack>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography fontWeight={700} fontSize="var(--fs-14)">{name}</Typography>
          <Chip size="small" label={category} className="neutral-chip" />
        </Stack>
        <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 0.75 }}>{summary}</Typography>
      </Box>
      <Button component={Link} href={href} variant={status ? 'outlined' : 'contained'} endIcon={<ArrowForwardRounded />} sx={{ alignSelf: 'flex-start' }}>
        {status ? 'Manage' : 'Connect'}
      </Button>
    </Card>
  );
}

/** Integration directory, grouped by category like OneSignal's and MailerLite's. */
export default function IntegrationsHub() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const shown = INTEGRATIONS.filter((i) => !q || `${i.name} ${i.category} ${i.summary}`.toLowerCase().includes(q));
  const categories = [...new Set(shown.map((i) => i.category))];

  return (
    <Stack gap={3}>
      <TextField
        size="small"
        placeholder="Search integrations"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 360 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
      />
      {categories.map((category) => (
        <Box key={category}>
          <Typography fontWeight={700} fontSize="var(--fs-13)" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{category}</Typography>
          <Grid container spacing={2}>
            {shown.filter((i) => i.category === category).map((i) => (
              <Grid item xs={12} sm={6} lg={4} key={i.id}><IntegrationCard integration={i} /></Grid>
            ))}
          </Grid>
        </Box>
      ))}
      {!shown.length && <Typography color="text.secondary" fontSize="var(--fs-13)">No integration matches “{search}”.</Typography>}
      <Card className="saas-card" sx={{ borderStyle: 'dashed' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
          <Box className="integration-icon"><AddRounded /></Box>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={700} fontSize="var(--fs-14)">Missing an integration?</Typography>
            <Typography color="text.secondary" fontSize="var(--fs-12)">Tell us which tool you want PixlPush to connect to next.</Typography>
          </Box>
          <Button component={Link} href="/dashboard/roadmap" variant="outlined">Request an integration</Button>
        </Stack>
      </Card>
    </Stack>
  );
}
