'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Chip, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { dataSyncApi } from '@/lib/projects/api';

type FieldRule = { source: string; target: string; [key: string]: unknown };
type Config = {
  fields?: FieldRule[];
  consent?: { source: string; channel: string }[];
  entitlements?: { products: { source: string; entitlementKey: string; tier?: string }[]; states?: unknown[]; events?: unknown };
  [key: string]: unknown;
};

/** PixlPush profile fields a customer field can fill. Anything else is kept as a custom property. */
const TARGETS = [
  ['', 'Custom property'],
  ['email', 'Email'],
  ['name', 'Name'],
  ['preferredLanguage', 'Language'],
  ['timezone', 'Time zone'],
  ['country', 'Country'],
  ['region', 'Region'],
  ['accountStatus', 'Account status'],
  ['userType', 'User type'],
] as const;
const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';

export default function WebhookMapping({ projectId, sourceId, canEdit }: { projectId: string; sourceId: string; canEdit: boolean }) {
  const client = useQueryClient();
  const mappingKey = ['projects', projectId, 'data-sync', sourceId, 'mappings'];
  const mappings = useQuery({ queryKey: mappingKey, queryFn: () => dataSyncApi.mappings(projectId, sourceId) });
  const sample = useQuery({ queryKey: ['projects', projectId, 'webhook-sample'], queryFn: () => dataSyncApi.serverSample(projectId), staleTime: 5 * 60_000, retry: false });
  const active = mappings.data?.find((item) => item.status === 'active');
  const config = (active?.config ?? {}) as Config;
  const [fields, setFields] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const consent = new Set((config.consent ?? []).map((rule) => rule.source));
  useEffect(() => {
    const current = active?.config as Config | undefined;
    if (!current) return;
    const nextFields: Record<string, string> = {};
    for (const name of sample.data?.fields ?? []) nextFields[name] = '';
    for (const rule of current.fields ?? []) if (!rule.target.startsWith('properties.')) nextFields[rule.source] = rule.target;
    const nextTiers: Record<string, string> = {};
    for (const product of sample.data?.products ?? []) nextTiers[product] = '';
    for (const product of current.entitlements?.products ?? []) nextTiers[product.source] = product.tier ?? '';
    setFields(nextFields);
    setTiers(nextTiers);
  }, [active, sample.data]);

  // Only what the customer actually sends; saved rules for other names stay as they are.
  const shown = sample.data?.fields.length ? sample.data.fields : Object.keys(fields);

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const previous = new Map((config.fields ?? []).map((rule) => [rule.source, rule]));
      const chosen = shown.filter((source) => fields[source] && !consent.has(source)).map((source) => fields[source]!);
      const twice = chosen.find((target, index) => chosen.indexOf(target) !== index);
      if (twice) throw new Error(`Two of your fields are set to ${TARGETS.find(([value]) => value === twice)?.[1]}. Pick one.`);
      // A field the customer sends wins over a hidden default rule for the same PixlPush field.
      const keep = (source: string, target: string) => shown.includes(source) || !chosen.includes(target);
      const next: Config = {
        ...config,
        // Keep each rule's existing options; only the target changes here.
        fields: [
          // Custom-property rules are not edited here and are kept as they are.
          ...(config.fields ?? []).filter((rule) => rule.target.startsWith('properties.') && !fields[rule.source]),
          ...Object.entries(fields).filter(([source, target]) => target && !consent.has(source) && keep(source, target)).map(([source, target]) => ({ ...(previous.get(source)?.target === target ? previous.get(source) : {}), source, target })),
        ],
        entitlements: {
          states: [],
          events: {},
          ...config.entitlements,
          products: Object.entries(tiers).filter(([, tier]) => tier.trim()).map(([source, tier]) => ({ source, entitlementKey: 'subscription', tier: tier.trim() })),
        },
      };
      const draft = await dataSyncApi.createMapping(projectId, sourceId, next);
      if (!draft.validation.valid) throw new Error(draft.validation.errors[0]?.message ?? 'This mapping is not valid.');
      await dataSyncApi.publishMapping(projectId, sourceId, draft.version);
      await client.invalidateQueries({ queryKey: mappingKey });
      setSaved(true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  if (mappings.isLoading) return <Skeleton height={200} />;
  const fieldNames = shown.filter((name) => !consent.has(name)).sort();
  const products = Object.keys(tiers).sort();

  return (
    <Stack gap={2.5}>
      {sample.isError && <Alert severity="warning">Could not read a sample from your server: {errorText(sample.error)} You can still edit what is saved.</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {saved && <Alert severity="success" onClose={() => setSaved(false)}>Saved. New data uses these settings from now on.</Alert>}

      <Card className="saas-card">
        <Stack gap={1.5}>
          <Box>
            <Typography variant="h4">Profile fields</Typography>
            <Typography variant="body2" color="text.secondary">Fields found in the <b>user</b> part of your events. Fields you leave as a custom property are still saved and can be used in audiences.</Typography>
          </Box>
          {sample.isLoading ? <Skeleton height={80} /> : fieldNames.length ? fieldNames.map((name) => (
            <Stack key={name} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{name}</Typography>
              <TextField select size="small" sx={{ minWidth: 220 }} value={fields[name] ?? ''} disabled={!canEdit || busy} onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': `PixlPush field for ${name}` }}>
                {TARGETS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
            </Stack>
          )) : <Typography variant="body2" color="text.secondary">No profile fields found yet. They appear once your server sends a <b>user</b> object.</Typography>}
          {consent.size > 0 && (
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">Turn email and push on or off:</Typography>
              {[...consent].map((name) => <Chip key={name} size="small" label={name} sx={{ fontFamily: 'var(--pp-mono)' }} />)}
            </Stack>
          )}
        </Stack>
      </Card>

      <Card className="saas-card">
        <Stack gap={1.5}>
          <Box>
            <Typography variant="h4">Plans</Typography>
            <Typography variant="body2" color="text.secondary">Give each product id a plan name your team understands, for example Premium or VIP. Leave it empty to use the id.</Typography>
          </Box>
          {sample.isLoading ? <Skeleton height={60} /> : products.length ? products.map((product) => (
            <Stack key={product} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{product}</Typography>
              <TextField size="small" sx={{ minWidth: 220 }} placeholder={product} value={tiers[product] ?? ''} disabled={!canEdit || busy} onChange={(event) => setTiers((current) => ({ ...current, [product]: event.target.value }))} inputProps={{ maxLength: 60, 'aria-label': `Plan name for ${product}` }} />
            </Stack>
          )) : <Typography variant="body2" color="text.secondary">No products found yet. They appear once your server sends subscription events with a <b>product_id</b>.</Typography>}
        </Stack>
      </Card>

      {canEdit && <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={busy || !active} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>}
    </Stack>
  );
}
