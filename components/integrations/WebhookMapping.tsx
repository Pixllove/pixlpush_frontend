'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddRounded, CheckCircleRounded, ErrorOutlineRounded, ToggleOffRounded, ToggleOnRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, FormControlLabel, MenuItem, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { dataSyncApi, type SyncExternalSegment } from '@/lib/projects/api';

type FieldRule = { source: string; target: string; enabled?: boolean; [key: string]: unknown };
type EventRule = { source: string; target: string; enabled?: boolean; liveTrigger?: boolean; properties?: { source: string; target: string }[] };
type SegmentRule = { sourceName: string; namespace: string; key: string; displayName: string; enabled?: boolean; exclusive?: boolean; emitOnEnter?: string };
type DataCategories = {
  userAndSegments: { ongoingSync: boolean; historicalImport: boolean };
  activity: { ongoingSync: boolean; historicalEvents: boolean; historicalMessages: boolean };
  journeysCampaigns: { participantMigration: boolean; outboundUpdates: boolean };
};
type Config = {
  fields?: FieldRule[];
  consent?: { source: string; channel: string; optIn?: unknown[]; optOut?: unknown[] }[];
  entitlements?: { products: { source: string; entitlementKey: string; tier?: string }[]; states?: unknown[]; events?: unknown };
  events?: EventRule[];
  segments?: SegmentRule[];
  categories?: Partial<DataCategories>;
  autoMap?: boolean;
  [key: string]: unknown;
};

const TARGETS = [
  ['', 'Custom property'], ['email', 'Email'], ['name', 'Name'], ['preferredLanguage', 'Language'],
  ['timezone', 'Time zone'], ['country', 'Country'], ['region', 'Region'], ['accountStatus', 'Account status'], ['userType', 'User type'],
] as const;
const DEFAULT_CATEGORIES: DataCategories = {
  userAndSegments: { ongoingSync: true, historicalImport: true },
  activity: { ongoingSync: true, historicalEvents: false, historicalMessages: false },
  journeysCampaigns: { participantMigration: false, outboundUpdates: false },
};
const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const sourceKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'segment';
const matchLabel = (match: boolean, enabled: boolean) => !enabled ? 'Disabled' : match ? 'Matched' : 'Needs mapping';
export const webhookSwitchSx = {
  width: 30,
  height: 18,
  p: 0,
  m: 0,
  flexShrink: 0,
  '& .MuiSwitch-switchBase': {
    p: '2px',
    transform: 'translateX(0)',
    '&.Mui-checked': {
      transform: 'translateX(12px)',
      color: '#fff',
    },
    '&.Mui-checked + .MuiSwitch-track': {
      opacity: 1,
      backgroundColor: 'primary.main',
    },
  },
  '& .MuiSwitch-thumb': {
    width: 14,
    height: 14,
    boxShadow: '0 1px 2px rgba(30,20,41,.25)',
  },
  '& .MuiSwitch-track': {
    borderRadius: '999px',
    opacity: 1,
    backgroundColor: '#D8D2E1',
  },
} as const;
const mappingSwitchLabelSx = {
  m: 0,
  gap: 0.75,
  alignItems: 'center',
  '& .MuiSwitch-root': { m: 0, flexShrink: 0 },
  '& .MuiFormControlLabel-label': {
    fontSize: 'var(--fs-13)',
    lineHeight: 1.35,
    color: 'text.secondary',
  },
} as const;

function existingSegmentMatch(name: string, segments: SyncExternalSegment[]) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
  const key = normalize(name);
  return segments.find((segment) => segment.status === 'active' && (normalize(segment.displayName) === key || normalize(segment.key) === key));
}

export default function WebhookMapping({ projectId, sourceId, canEdit }: { projectId: string; sourceId: string; canEdit: boolean }) {
  const client = useQueryClient();
  const mappingKey = ['projects', projectId, 'data-sync', sourceId, 'mappings'];
  const mappings = useQuery({ queryKey: mappingKey, queryFn: () => dataSyncApi.mappings(projectId, sourceId) });
  const sample = useQuery({ queryKey: ['projects', projectId, 'webhook-sample'], queryFn: () => dataSyncApi.serverSample(projectId), staleTime: 5 * 60_000, retry: false });
  const knownSegments = useQuery({ queryKey: ['projects', projectId, 'data-sync', 'segments'], queryFn: () => dataSyncApi.segments(projectId) });
  const active = mappings.data?.find((item) => item.status === 'active');
  const config = (active?.config ?? {}) as Config;
  const [fields, setFields] = useState<Record<string, string>>({});
  const [fieldEnabled, setFieldEnabled] = useState<Record<string, boolean>>({});
  const [tiers, setTiers] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<Record<string, { target: string; enabled: boolean }>>({});
  const [extraEvent, setExtraEvent] = useState('');
  const [segments, setSegments] = useState<SegmentRule[]>([]);
  const [segmentSource, setSegmentSource] = useState('');
  const [categories, setCategories] = useState<DataCategories>(DEFAULT_CATEGORIES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const consent = useMemo(() => new Set((config.consent ?? []).map((rule) => rule.source)), [config.consent]);

  useEffect(() => {
    const current = active?.config as Config | undefined;
    if (!current) return;
    const nextFields: Record<string, string> = {};
    const nextEnabled: Record<string, boolean> = {};
    for (const name of sample.data?.fields ?? []) { nextFields[name] = current.autoMap ? `properties.${sourceKey(name)}` : ''; nextEnabled[name] = true; }
    for (const rule of current.fields ?? []) {
      nextFields[rule.source] = rule.target;
      nextEnabled[rule.source] = rule.enabled !== false;
    }
    const nextTiers: Record<string, string> = {};
    for (const product of sample.data?.products ?? []) nextTiers[product] = '';
    for (const rule of current.entitlements?.products ?? []) nextTiers[rule.source] = rule.tier ?? rule.source;
    const nextEvents: Record<string, { target: string; enabled: boolean }> = {};
    for (const source of new Set([...(sample.data?.events ?? []), ...(current.events ?? []).map((rule) => rule.source)])) {
      const rule = current.events?.find((item) => item.source === source);
      nextEvents[source] = { target: rule?.target ?? source, enabled: rule?.enabled !== false };
    }
    setFields(nextFields);
    setFieldEnabled(nextEnabled);
    setTiers(nextTiers);
    setEvents(nextEvents);
    setSegments(current.segments ?? []);
    setCategories({
      userAndSegments: { ...DEFAULT_CATEGORIES.userAndSegments, ...current.categories?.userAndSegments },
      activity: { ...DEFAULT_CATEGORIES.activity, ...current.categories?.activity },
      journeysCampaigns: { ...DEFAULT_CATEGORIES.journeysCampaigns, ...current.categories?.journeysCampaigns },
    });
  }, [active, sample.data]);

  const shown = sample.data?.fields.length ? sample.data.fields : Object.keys(fields);
  const eventNames = [...new Set([...(sample.data?.events ?? []), ...Object.keys(events)])].sort();
  const externalSegments = knownSegments.data?.filter((item) => item.sourceId === sourceId) ?? [];
  const fieldConflicts = useMemo(() => {
    const enabled = shown.filter((source) => fieldEnabled[source] !== false && fields[source]).map((source) => fields[source]!);
    return new Set(enabled.filter((target) => enabled.indexOf(target) !== enabled.lastIndexOf(target)));
  }, [shown, fieldEnabled, fields]);
  const needsAttention = shown.filter((source) => fieldEnabled[source] !== false && !fields[source]).length
    + eventNames.filter((source) => events[source]?.enabled && !events[source]?.target.trim()).length;
  const mappingStatuses = useMemo(() => ({
    matched: shown.filter((source) => fieldEnabled[source] !== false && Boolean(fields[source]) && !fieldConflicts.has(fields[source]!)).length + eventNames.filter((source) => events[source]?.enabled && Boolean(events[source]?.target.trim())).length + segments.filter((item) => item.enabled !== false).length,
    conflicts: fieldConflicts.size,
  }), [shown, fieldEnabled, fields, fieldConflicts, eventNames, events, segments]);

  const setCategory = <K extends keyof DataCategories, F extends keyof DataCategories[K]>(category: K, field: F, value: DataCategories[K][F]) => {
    setCategories((current) => ({ ...current, [category]: { ...current[category], [field]: value } }));
  };

  const addEvent = () => {
    const name = extraEvent.trim();
    if (!name || events[name]) return;
    setEvents((current) => ({ ...current, [name]: { target: name, enabled: true } }));
    setExtraEvent('');
  };

  const addSegment = () => {
    const sourceName = segmentSource.trim();
    if (!sourceName || segments.some((item) => item.sourceName.toLowerCase() === sourceName.toLowerCase())) return;
    const match = existingSegmentMatch(sourceName, externalSegments);
    setSegments((current) => [...current, {
      sourceName,
      namespace: match?.namespace ?? 'webhook',
      key: match?.key ?? sourceKey(sourceName),
      displayName: match?.displayName ?? sourceName,
      enabled: true,
      exclusive: false,
    }]);
    setSegmentSource('');
  };

  const updateSegment = (sourceName: string, patch: Partial<SegmentRule>) => setSegments((current) => current.map((item) => item.sourceName === sourceName ? { ...item, ...patch } : item));

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      if (fieldConflicts.size) throw new Error(`Resolve duplicate PixlPush field mappings: ${[...fieldConflicts].join(', ')}.`);
      const previous = new Map((config.fields ?? []).map((rule) => [rule.source, rule]));
      const chosen = shown.filter((source) => fields[source] && fieldEnabled[source] !== false && !consent.has(source)).map((source) => fields[source]!);
      const keep = (source: string, target: string) => shown.includes(source) || !chosen.includes(target);
      const next: Config = {
        ...config,
        fields: [
          ...(config.fields ?? []).filter((rule) => rule.target.startsWith('properties.') && !fields[rule.source]),
          ...Object.entries(fields).filter(([source, target]) => target && !consent.has(source) && keep(source, target)).map(([source, target]) => ({ ...(previous.get(source)?.target === target ? previous.get(source) : {}), source, target, enabled: fieldEnabled[source] !== false })),
        ],
        events: eventNames.map((source) => ({ source, target: events[source]?.target.trim() || source, enabled: events[source]?.enabled !== false, liveTrigger: true, ...(config.events?.find((rule) => rule.source === source)?.properties ? { properties: config.events.find((rule) => rule.source === source)!.properties } : {}) })),
        segments,
        categories,
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
      {sample.isError && <Alert severity="warning">Could not read a sample from your server: {errorText(sample.error)} You can still add mappings manually.</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {saved && <Alert severity="success" onClose={() => setSaved(false)}>Mapping published. The enabled ongoing sync choices apply to new records. Historical imports stay separate and must be started below.</Alert>}

      <Card className="saas-card"><Stack gap={1.5}>
        <Box><Typography variant="h4">Segments and user association</Typography><Typography variant="body2" color="text.secondary">The server feed must identify users with user_id (or custom_user_id) and name segment values in segment. User ids are the stable association key; this maps source segment names to PixlPush external segments, not lifecycle segments.</Typography></Box>
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.userAndSegments.ongoingSync} disabled={!canEdit || busy} onChange={(_, on) => setCategory('userAndSegments', 'ongoingSync', on)} />} label="Enable ongoing user and segment sync" />
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.userAndSegments.historicalImport} disabled={!canEdit || busy} onChange={(_, on) => setCategory('userAndSegments', 'historicalImport', on)} />} label="Allow one-time historical segment import" />
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <TextField size="small" label="Incoming source segment name" value={segmentSource} onChange={(event) => setSegmentSource(event.target.value)} disabled={!canEdit || busy} placeholder="e.g. cancel_at_period_end" />
          <Button startIcon={<AddRounded />} onClick={addSegment} disabled={!canEdit || busy || !segmentSource.trim()}>Add segment mapping</Button>
        </Stack>
        {segments.map((segment) => {
          const match = existingSegmentMatch(segment.sourceName, externalSegments);
          return <Stack key={segment.sourceName} direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{segment.sourceName}</Typography>
            <Typography variant="caption" color="text.secondary">{match ? `Existing: ${match.displayName}` : `New external segment: ${segment.displayName}`}</Typography>
            <Chip size="small" label={matchLabel(Boolean(match), segment.enabled !== false)} color={segment.enabled === false ? 'default' : match ? 'success' : 'warning'} />
            <TextField size="small" label="PixlPush segment name" value={segment.displayName} disabled={!canEdit || busy} onChange={(event) => updateSegment(segment.sourceName, { displayName: event.target.value, key: sourceKey(event.target.value) })} />
            <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={segment.enabled !== false} disabled={!canEdit || busy} onChange={(_, on) => updateSegment(segment.sourceName, { enabled: on })} />} label={segment.enabled === false ? 'Disabled' : 'Enabled'} />
          </Stack>;
        })}
        {!segments.length && <Typography variant="body2" color="text.secondary">No segment values have been mapped yet. Add source names from your server data; unknown values won’t be reported as matched.</Typography>}
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.journeysCampaigns.outboundUpdates} disabled={!canEdit || busy} onChange={(_, on) => setCategory('journeysCampaigns', 'outboundUpdates', on)} />} label="Allow outbound PixlPush journey and message status updates" />
      </Stack></Card>

      <Card className="saas-card"><Stack gap={1.5}>
        <Box><Typography variant="h4">Historical user activity</Typography><Typography variant="body2" color="text.secondary">Live events can trigger supported PixlPush journeys. Imported events and message outcomes are encrypted archive records; they do not become live message activity or alter analytics.</Typography></Box>
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.activity.ongoingSync} disabled={!canEdit || busy} onChange={(_, on) => setCategory('activity', 'ongoingSync', on)} />} label="Enable ongoing event sync" />
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.activity.historicalEvents} disabled={!canEdit || busy} onChange={(_, on) => setCategory('activity', 'historicalEvents', on)} />} label="Allow historical event archive imports" />
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.activity.historicalMessages} disabled={!canEdit || busy} onChange={(_, on) => setCategory('activity', 'historicalMessages', on)} />} label="Allow historical message outcome archive imports" />
        <Stack gap={1}>
          {eventNames.map((source) => {
            const value = events[source] ?? { target: source, enabled: true };
            const match = value.target.trim() === source.trim();
            return <Stack key={source} direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{source}</Typography>
              <TextField size="small" label="PixlPush event name" value={value.target} disabled={!canEdit || busy || !value.enabled} onChange={(event) => setEvents((current) => ({ ...current, [source]: { ...value, target: event.target.value } }))} />
              <Chip size="small" label={matchLabel(match, value.enabled)} color={!value.enabled ? 'default' : match ? 'success' : 'warning'} />
              <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={value.enabled} disabled={!canEdit || busy} onChange={(_, on) => setEvents((current) => ({ ...current, [source]: { ...value, enabled: on } }))} />} label={value.enabled ? 'Enabled' : 'Disabled'} />
            </Stack>;
          })}
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            <TextField size="small" label="Add source event" value={extraEvent} onChange={(event) => setExtraEvent(event.target.value)} disabled={!canEdit || busy} />
            <Button startIcon={<AddRounded />} onClick={addEvent} disabled={!canEdit || busy || !extraEvent.trim()}>Add event mapping</Button>
          </Stack>
        </Stack>
        {!eventNames.length && <Typography variant="body2" color="text.secondary">No source events were found in the sample. Add a source event name when you know what the feed sends.</Typography>}
      </Stack></Card>

      <Card className="saas-card"><Stack gap={1.5}>
        <Box><Typography variant="h4">Journeys and campaigns</Typography><Typography variant="body2" color="text.secondary">PixlPush can stage participants against existing PixlPush journeys and map source step keys to current PixlPush steps. Existing email subject/body and push title/body/image/deep-link templates can be reused when already present in this project; source template content and standalone campaign records are not imported. In-app steps are unsupported.</Typography></Box>
        <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={categories.journeysCampaigns.participantMigration} disabled={!canEdit || busy} onChange={(_, on) => setCategory('journeysCampaigns', 'participantMigration', on)} />} label="Allow staged journey participant imports" />
        <Alert severity="info">Participants map to an existing PixlPush user, target journey, and target step. Imported step outcomes keep their target participant/step relationship and optional source message ID. The import does not retain source journey or campaign IDs, source content, or source completion/pause/exit states. Existing email and push templates can be reused by PixlPush template ID; standalone campaigns and in-app steps are not imported. Participants remain staged; imports do not activate journeys or send messages.</Alert>
      </Stack></Card>

      <Card className="saas-card"><Stack gap={1.5}>
        <Box><Typography variant="h4">Profile fields</Typography><Typography variant="body2" color="text.secondary">Sample fields are suggested by name. Fields that are not mapped remain custom properties only when automatic mapping is enabled. Email requires an explicit consent mapping.</Typography></Box>
        {sample.isLoading ? <Skeleton height={80} /> : fieldNames.length ? fieldNames.map((name) => {
          const conflict = fields[name] && fieldConflicts.has(fields[name]!);
          const enabled = fieldEnabled[name] !== false;
          return <Stack key={name} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{name}</Typography>
            <TextField select size="small" sx={{ minWidth: 220 }} value={fields[name] ?? ''} disabled={!canEdit || busy || !enabled} onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))} SelectProps={{ displayEmpty: true }} inputProps={{ 'aria-label': `PixlPush field for ${name}` }}>
              {TARGETS.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              <MenuItem value={`properties.${sourceKey(name)}`}>Custom property · {sourceKey(name)}</MenuItem>
            </TextField>
            <Chip size="small" label={!enabled ? 'Disabled' : conflict ? 'Conflict' : fields[name] ? 'Matched' : 'Needs mapping'} color={!enabled ? 'default' : conflict ? 'error' : fields[name] ? 'success' : 'warning'} />
            <FormControlLabel sx={mappingSwitchLabelSx} control={<Switch size="small" sx={webhookSwitchSx} checked={enabled} disabled={!canEdit || busy} onChange={(_, on) => setFieldEnabled((current) => ({ ...current, [name]: on }))} />} label={enabled ? 'Enabled' : 'Disabled'} />
          </Stack>;
        }) : <Typography variant="body2" color="text.secondary">No profile fields found yet. They appear once your server sends a user object.</Typography>}
        {consent.size > 0 && <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Consent fields:</Typography>{[...consent].map((name) => <Chip key={name} size="small" label={name} sx={{ fontFamily: 'var(--pp-mono)' }} />)}</Stack>}
      </Stack></Card>

      <Card className="saas-card"><Stack gap={1.5}>
        <Box><Typography variant="h4">Subscription products</Typography><Typography variant="body2" color="text.secondary">Plans map to PixlPush entitlement tiers. A direct name match is suggested; unknown product ids need a chosen tier.</Typography></Box>
        {sample.isLoading ? <Skeleton height={60} /> : products.length ? products.map((product) => <Stack key={product} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }} sx={{ py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ flex: 1, fontFamily: 'var(--pp-mono)', overflowWrap: 'anywhere' }}>{product}</Typography>
          <TextField size="small" sx={{ minWidth: 220 }} label="PixlPush tier" placeholder={product} value={tiers[product] ?? ''} disabled={!canEdit || busy} onChange={(event) => setTiers((current) => ({ ...current, [product]: event.target.value }))} inputProps={{ maxLength: 60, 'aria-label': `Plan name for ${product}` }} />
          <Chip size="small" label={tiers[product]?.trim() ? 'Matched' : 'Needs mapping'} color={tiers[product]?.trim() ? 'success' : 'warning'} />
        </Stack>) : <Typography variant="body2" color="text.secondary">No products found yet. They appear when the server sends subscription events with product_id.</Typography>}
      </Stack></Card>

      <Card className="saas-card"><Stack gap={1.5}>
        <Typography variant="h4">Review mapping</Typography>
        <Typography variant="body2" color="text.secondary">Sample: {sample.data?.fields.length ?? 0} profile fields · {sample.data?.events.length ?? 0} event names · {sample.data?.products.length ?? 0} products. Disabled rows will not be synced. Unmapped optional values can remain custom properties.</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip icon={<CheckCircleRounded />} color="success" label={`${mappingStatuses.matched} matched`} />
          {needsAttention > 0 && <Chip icon={<ErrorOutlineRounded />} color="warning" label={`${needsAttention} need mapping`} />}
          {mappingStatuses.conflicts > 0 && <Chip color="error" label={`${mappingStatuses.conflicts} conflicts`} />}
          {eventNames.filter((source) => events[source]?.enabled === false).length > 0 && <Chip icon={<ToggleOffRounded />} label={`${eventNames.filter((source) => events[source]?.enabled === false).length} event types disabled`} />}
          {eventNames.some((source) => events[source]?.enabled) && <Chip icon={<ToggleOnRounded />} label="Ongoing events can start configured journeys" />}
        </Stack>
        {categories.activity.historicalMessages && <Alert severity="info">Historical message rows import to the archive only. PixlPush does not convert these records into live message jobs, campaign analytics, or journey activity.</Alert>}
        {canEdit && <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={busy || !active || mappingStatuses.conflicts > 0} onClick={() => void save()}>{busy ? 'Saving…' : 'Review and publish mapping'}</Button>}
      </Stack></Card>
    </Stack>
  );
}
