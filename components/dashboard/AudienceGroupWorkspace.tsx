'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddRounded, ArrowBackRounded, CloseRounded, EmailRounded, GroupsRounded, NotificationsActiveRounded, TimelineRounded } from '@mui/icons-material';
import { Box, Button, Card, Chip, CircularProgress, Divider, Grid, MenuItem, Select, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import EmptyState, { listEmpty } from './EmptyState';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { audienceGroupsApi } from '@/lib/projects/api';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import type { AudienceGroupSchema } from '@/types/project';
import SearchField from './SearchField';

type Rule = { id: number; filter: string; operator: string; value: string };
type Block = { id: number; rules: Rule[] };
const filters = ['Email', 'Email Action', 'Last Emailed', 'Push Notification', 'Push Notification Action', 'Last Push Notification', 'Current Lifecycle Segment', 'Historical Lifecycle Segment', 'Journey Automation', 'Audience Group', 'Country', 'Account Status', 'User Type', 'Created Date'];
const operators: Record<string, string[]> = { 'Email Action': ['Sent', 'Opened', 'Not opened', 'Clicked', 'Not clicked'], 'Push Notification Action': ['Sent', 'Clicked', 'Not clicked'], Country: ['Is', 'Is not'], 'User Type': ['Is', 'Is not'], 'Account Status': ['Is', 'Is not'], 'Current Lifecycle Segment': ['Is', 'Is not'], 'Historical Lifecycle Segment': ['Is', 'Is not'], 'Audience Group': ['Is', 'Is not'], 'Journey Automation': ['Is', 'Is not'], Email: ['Is available', 'Is not available'], 'Push Notification': ['Is available', 'Is not available'], 'Last Emailed': ['In the last', 'More than'], 'Last Push Notification': ['In the last', 'More than'], 'Created Date': ['Is', 'Before', 'After'] };
const values: Record<string, string[]> = { Country: ['Canada', 'United States', 'United Kingdom', 'Australia', 'Germany'], 'User Type': ['Premium', 'Free', 'Trial'], 'Account Status': ['Active', 'Unconfirmed', 'Deleted'], 'Current Lifecycle Segment': ['New users', 'Onboarding complete', 'Paid customers', 'At-risk / inactive'], 'Audience Group': ['At-risk customers', 'Premium subscribers', 'New users · 7 days'], 'Email Action': ['Sent', 'Opened', 'Not opened', 'Clicked', 'Not clicked'], 'Push Notification Action': ['Sent', 'Clicked', 'Not clicked'] };

const makeRule = (id: number): Rule => ({ id, filter: '', operator: '', value: '' });
const makeBlock = (id: number, ruleId: number): Block => ({ id, rules: [makeRule(ruleId)] });

const backendField: Record<string, string> = { Email: 'email', 'Current Lifecycle Segment': 'lifecycleSegmentId', Country: 'country', Region: 'region', 'Preferred Language': 'preferredLanguage', Platform: 'platform', 'Push Enabled': 'pushEnabled', 'Email Available': 'emailAvailable', 'Last Active': 'lastActiveAt' };
const backendOperator: Record<string, string> = { Is: 'equals', 'Is not': 'not_equals', Contains: 'contains', 'Is available': 'exists', 'Is not available': 'not_exists', 'In the last': 'within_days', More: 'greater_than', 'More than': 'not_within_days' };
const uiField: Record<string, string> = Object.fromEntries(Object.entries(backendField).map(([label, field]) => [field, label]));
const uiOperator: Record<string, string> = Object.fromEntries(Object.entries(backendOperator).map(([label, operator]) => [operator, label]));
function toBackendCondition(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  return { field: field?.key ?? backendField[rule.filter] ?? rule.filter, operator: condition?.key ?? backendOperator[rule.operator] ?? rule.operator, ...(rule.value.trim() ? { value: rule.value.trim() } : {}) };
}
function toBackendRules(blocks: Block[], schema?: AudienceGroupSchema) {
  const blockRules = (block: Block) => block.rules.filter(rule => rule.filter && rule.operator).map(rule => toBackendCondition(rule, schema));
  if (!blocks.length) return { operator: 'AND' as const, conditions: [] };
  return blocks.length > 1
    ? { operator: 'OR' as const, conditions: blocks.map(block => ({ operator: 'AND' as const, conditions: blockRules(block) })) }
    : { operator: 'AND' as const, conditions: blockRules(blocks[0]) };
}

export default function AudienceGroupWorkspace({ groupId }: { groupId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { active } = useActiveProject();
  const groupQuery = useQuery({ queryKey: ['projects', 'audience-groups', active?.id, groupId], queryFn: () => audienceGroupsApi.get(active!.id, groupId), enabled: Boolean(active?.id) });
  const membersQuery = useQuery({ queryKey: ['projects', 'audience-groups', active?.id, groupId, 'members'], queryFn: () => audienceGroupsApi.members(active!.id, groupId), enabled: Boolean(active?.id) });
  const schemaQuery = useQuery({ queryKey: ['projects', 'audience-groups', active?.id, 'schema'], queryFn: () => audienceGroupsApi.schema(active!.id), enabled: Boolean(active?.id) });
  const queryClient = useQueryClient();
  const saveConditions = useMutation({
    mutationFn: () => audienceGroupsApi.update(active!.id, groupId, {
      name: groupQuery.data?.name,
      description: groupQuery.data?.description ?? undefined,
      rules: blocks.some(block => block.rules.some(rule => rule.filter && rule.operator))
        ? toBackendRules(blocks, schemaQuery.data)
        : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'audience-groups', active?.id, groupId] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'audience-groups', active?.id, groupId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['projects', 'audience-groups', active?.id] });
    },
  });
  useEffect(() => {
    const rules = groupQuery.data?.rules as { operator?: 'AND' | 'OR'; conditions?: Array<{ field?: string; operator?: string; value?: string | string[]; conditions?: Array<{ field: string; operator: string; value?: string | string[] }> }> } | null | undefined;
    if (!rules?.conditions?.length) return;
    const sourceBlocks = rules.conditions[0]?.conditions
      ? rules.conditions.flatMap(condition => condition.conditions ? [condition.conditions] : [])
      : rules.operator === 'OR'
        ? rules.conditions.map(condition => [condition])
        : [rules.conditions];
    const mappedBlocks = sourceBlocks.map((conditions, blockIndex) => ({ id: blockIndex + 1, rules: conditions.map((condition, index) => ({ id: blockIndex * 100 + index + 1, filter: condition.field ?? '', operator: condition.operator ?? '', value: Array.isArray(condition.value) ? condition.value.join(',') : condition.value ?? '' })) }));
    setBlocks(mappedBlocks.length ? mappedBlocks : [makeBlock(1, 1)]);
    setNextId(rules.conditions.length + 1);
  }, [groupQuery.data]);
  const title = groupQuery.data?.name ?? decodeURIComponent(groupId).replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  const [blocks, setBlocks] = useState<Block[]>([makeBlock(1, 1)]);
  const [nextId, setNextId] = useState(2);
  const [query, setQuery] = useState('');
  const conditionCount = blocks.reduce((sum, block) => sum + block.rules.length, 0);
  const updateRule = (blockId: number, ruleId: number, field: keyof Rule, value: string) => setBlocks(current => current.map(block => block.id !== blockId ? block : { ...block, rules: block.rules.map(rule => rule.id !== ruleId ? rule : { ...rule, [field]: value, ...(field === 'filter' ? { operator: '', value: '' } : field === 'operator' ? { value: '' } : {}) }) }));
  const maxConditions = 10;
  const notifyConditionLimit = () => {
    if (typeof window !== 'undefined') window.alert('Maximum 10 conditions can be added.');
  };
  const addAnd = (blockId: number) => {
    if (conditionCount >= maxConditions) {
      notifyConditionLimit();
      return;
    }
    setBlocks(current => current.map(block => block.id === blockId ? { ...block, rules: [...block.rules, makeRule(nextId)] } : block));
    setNextId(value => value + 1);
  };
  const addOr = () => {
    if (conditionCount >= maxConditions) {
      notifyConditionLimit();
      return;
    }
    setBlocks(current => [...current, makeBlock(current.length + 1, nextId)]);
    setNextId(value => value + 1);
  };
  const removeRule = (blockId: number, ruleId: number) => setBlocks(current => current.map(block => block.id === blockId ? { ...block, rules: block.rules.filter(rule => rule.id !== ruleId) } : block).filter(block => block.rules.length));
  const users = membersQuery.data?.members ?? [];
  const filteredUsers = users.filter(user => `${user.externalUserId ?? ''} ${user.name ?? ''} ${user.email ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const openUser = (userId: string) => router.push(`/dashboard/users/${userId}?tab=groups`);
  return <Stack gap={2} className="audience-group-workspace">
    <Button startIcon={<ArrowBackRounded />} onClick={() => router.push(`/dashboard/users?tab=${searchParams.get('tab') || 'groups'}`)} className="group-back-button">Back to audience groups</Button>
    <Card className="group-title-card"><Typography color="text.secondary" fontSize={11}>Audience group</Typography><Typography variant="h3">{groupQuery.isLoading ? <Skeleton width={180} /> : title}</Typography></Card>
    <Card className="group-section-card"><Typography variant="h3">Group conditions</Typography><Typography color="text.secondary" fontSize={12}>Build the audience using filters for user data, lifecycle, and engagement.</Typography><Stack gap={1.5} sx={{ mt: 2 }}><Box className="condition-groups"><Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ px: 1, pb: 1 }}><Box><Typography fontWeight={600}>Match {blocks.length > 1 ? 'any' : 'all'} of these conditions</Typography><Typography color="text.secondary" fontSize={11}>Conditions joined with <strong>{blocks.length > 1 ? 'OR' : 'AND'}</strong></Typography></Box><Chip label={blocks.length > 1 ? 'OR' : 'AND'} className="condition-logic-chip" size="small" /></Stack>{blocks.map((block, index) => <Fragment key={block.id}><Box className="condition-block"><Stack gap={1.2} className="condition-block-inner">{block.rules.map(rule => <ConditionRow key={rule.id} rule={rule} schema={schemaQuery.data} onChange={(field, value) => updateRule(block.id, rule.id, field, value)} onRemove={() => removeRule(block.id, rule.id)} />)}<Button size="small" startIcon={<AddRounded />} onClick={() => addAnd(block.id)} className="condition-add-button">AND</Button></Stack></Box>{index < blocks.length - 1 && <Box className="condition-or-divider"><span>OR</span></Box>}</Fragment>)}<Button size="small" startIcon={<AddRounded />} onClick={addOr} className="condition-add-button condition-add-or">OR</Button></Box></Stack><Divider sx={{ my: 2 }} /><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography color="text.secondary" fontSize={12}>{conditionCount} / {maxConditions} conditions</Typography><Box textAlign="right"><Button variant="contained" disabled={saveConditions.isPending || groupQuery.isLoading} onClick={() => saveConditions.mutate()}>{saveConditions.isPending ? <CircularProgress size={18} color="inherit" /> : "Save conditions"}</Button>{saveConditions.isError && <Typography color="error" fontSize={11} sx={{ mt: 0.5 }}>Could not save conditions. Check that at least one valid condition is selected.</Typography>}</Box></Stack></Card>
    <EngagementCard />
    <Card className="group-section-card users-in-group"><Typography variant="h3">Users in this group</Typography><Divider sx={{ mx: -2.5, mt: 2 }} /><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1.2} sx={{ mt: 2 }}><SearchField value={query} onChange={setQuery} placeholder="Search users by name or email" /><Typography color="text.secondary" fontSize={11} sx={{ alignSelf: 'center' }}>{filteredUsers.length} users currently match these conditions.</Typography></Stack><Box sx={{ overflowX: 'auto', mt: 1.5 }}><Table size="small"><TableHead><TableRow>{['User', 'Email', 'Status', 'Last active', 'Entered'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{membersQuery.isLoading ? Array.from({ length: 4 }, (_, index) => <TableRow key={`member-skeleton-${index}`}><TableCell colSpan={5}><Skeleton variant="text" /></TableCell></TableRow>) : filteredUsers.map(user => <TableRow key={user.id} hover tabIndex={0} className="group-user-row" onClick={() => openUser(user.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') openUser(user.id); }}><TableCell><Typography fontSize={11} fontWeight={500}>{user.name || user.externalUserId || user.id}</Typography></TableCell><TableCell>{user.email || '—'}</TableCell><TableCell><Chip label="Member" size="small" className="active-chip" /></TableCell><TableCell>{user.lastActiveAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.lastActiveAt)) : 'Never'}</TableCell><TableCell>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(user.enteredAt))}</TableCell></TableRow>)}{!membersQuery.isLoading && filteredUsers.length === 0 && <TableRow><TableCell colSpan={5} sx={{ borderBottom: 0 }}><EmptyState size="compact" {...listEmpty({ icon: <PeopleAltOutlined />, noun: 'users', description: 'Users appear here once they match this group’s conditions.', search: query, onClear: () => setQuery(''), error: membersQuery.isError && 'Could not load users', onRetry: () => membersQuery.refetch() })} /></TableCell></TableRow>}</TableBody></Table></Box></Card>
  </Stack>;
}

/** Every ISO country, for the Country dropdown when the project has no stored countries yet. */
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
// Retired codes (UK, NH, YD…) canonicalize to another code, so skip them; the
// rest are pseudo-regions (EU, UN, XA…) that have no likely-subtags data.
const allCountries = Array.from({ length: 26 * 26 }, (_, i) => String.fromCharCode(65 + Math.floor(i / 26), 65 + (i % 26)))
  .filter(code => !['EU', 'EZ', 'UN', 'QO'].includes(code))
  .filter(code => {
    try {
      const locale = new Intl.Locale(`und-${code}`);
      return locale.region === code && locale.maximize().language !== 'und';
    } catch {
      return false;
    }
  })
  .map(code => ({ key: code.toLowerCase(), label: regionNames.of(code) ?? code }))
  .filter(option => option.label.toLowerCase() !== option.key)
  .sort((a, b) => a.label.localeCompare(b.label));

function ConditionRow({ rule, schema, onChange, onRemove }: { rule: Rule; schema?: AudienceGroupSchema; onChange: (field: keyof Rule, value: string) => void; onRemove: () => void }) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  const fallbackField = field?.label ?? rule.filter;
  const fallbackOperators = operators[fallbackField] ?? ['Is'];
  const valueConfig = condition?.value;
  const isCountry = rule.filter === 'country' || rule.filter === 'Country';
  const options = valueConfig?.options?.length ? valueConfig.options : isCountry ? allCountries : undefined;
  const noValue = valueConfig?.type === 'none';
  return <Stack direction={{ xs: 'column', md: 'row' }} gap={1} className="condition-row-card">
    <Select size="small" displayEmpty value={rule.filter} onChange={event => onChange('filter', event.target.value)}>
      <MenuItem value="">Choose a filter</MenuItem>
      {schema ? schema.fields.map(item => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>) : filters.map(item => <MenuItem key={item} value={backendField[item] ?? item}>{item}</MenuItem>)}
    </Select>
    {rule.filter && <Select size="small" displayEmpty value={rule.operator} onChange={event => onChange('operator', event.target.value)}>
      <MenuItem value="">Choose an operator</MenuItem>
      {schema ? (field?.conditions ?? []).map(item => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>) : fallbackOperators.map(item => <MenuItem key={item} value={backendOperator[item] ?? item}>{item}</MenuItem>)}
    </Select>}
    {rule.operator && !noValue && (options?.length ? <Select size="small" displayEmpty value={rule.value} onChange={event => onChange('value', event.target.value)}>
      <MenuItem value="">Choose a value</MenuItem>
      {options.map(option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
    </Select> : <TextField size="small" type={valueConfig?.type === 'integer' ? 'number' : valueConfig?.type === 'date' ? 'date' : 'text'} placeholder="Enter a value" value={rule.value} onChange={event => onChange('value', event.target.value)} />)}
    <Button aria-label="Remove condition" onClick={onRemove} className="condition-remove-button"><CloseRounded fontSize="small" /></Button>
  </Stack>;
}

function EngagementCard() { const metric = (Icon: typeof EmailRounded, label: string, value: string) => <Card className="group-metric"><Icon fontSize="small" /><Typography color="text.secondary" fontSize={11}>{label}</Typography><Typography fontSize={16} fontWeight={600}>{value}</Typography></Card>; return <Card className="group-section-card"><Typography variant="h3">Engagement</Typography><Typography color="text.secondary" fontSize={12}>Email and push notification performance for this audience group.</Typography><Grid container spacing={1.2} sx={{ mt: 1 }}>{metric(EmailRounded, 'Emails sent', '0')}{metric(EmailRounded, 'Emails opened', '0')}{metric(GroupsRounded, 'Pushes sent', '0')}{metric(NotificationsActiveRounded, 'Pushes clicked', '0')}</Grid><Grid container spacing={1.5} sx={{ mt: 1 }}><Grid item xs={12} md={6}><Box className="group-engagement-panel"><Typography fontWeight={600}>Email engagement</Typography>{['Open rate|0%', 'Click rate|0%', 'Delivery rate|0%', 'Bounce rate|0%', 'Unsubscribe rate|0%', 'Spam complaint rate|0%'].map(row => <MetricRow key={row} value={row} />)}</Box></Grid><Grid item xs={12} md={6}><Box className="group-engagement-panel"><Typography fontWeight={600}>Push engagement</Typography>{['Sent|0', 'Delivered|0', 'Failed|0', 'Click rate|0%', 'No token|0%'].map(row => <MetricRow key={row} value={row} />)}</Box></Grid></Grid></Card>; }
function MetricRow({ value }: { value: string }) { const [label, amount] = value.split('|'); return <Stack direction="row" justifyContent="space-between" className="group-metric-row"><Typography fontSize={11}>{label}</Typography><Typography fontSize={11} fontWeight={500}>{amount}</Typography></Stack>; }
