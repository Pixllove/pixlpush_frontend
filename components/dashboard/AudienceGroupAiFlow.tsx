'use client';

import { AddRounded, ArrowBackRounded, ArrowForwardRounded, CloseRounded, ReplayRounded } from '@mui/icons-material';
import { Alert, Box, Button, ButtonBase, Card, CircularProgress, Divider, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { audienceGroupsApi, onboardingApi } from '@/lib/projects/api';
import type { AudienceGroup, AudienceGroupSchema, AudienceGroupSchemaField } from '@/types/project';
import AudienceConditionFieldPicker from './AudienceConditionFieldPicker';
import { anyJourneyValue, appNotificationTokenFieldKey, audiencePickerFields, incompleteRuleCount, isRuleComplete, makeBlock, makeRule, readableRule, reactivationChannelsForProject, ruleHasInput, seedReactivationRules, toBackendRules, validRuleCount, withAppNotificationTokenField, type Block, type Rule } from './audienceGroupRules';

type Goal = 'behavior' | 'campaign' | 'event' | 'profile' | 'reactivation' | 'other';
type ProfileCategory = 'reachability' | 'product' | 'profile' | 'account' | 'other';

type Props = {
  projectId: string;
  sdkIntegrated: boolean;
  trackedEvents: string[];
  onCancel: () => void;
  onCreated: (group: AudienceGroup) => void;
};

const goals: Array<{ id: Goal; label: string; description: string }> = [
  { id: 'behavior', label: 'Target users based on their behavior', description: 'Use product events, lifecycle status, or journey activity. For example, users who completed onboarding or entered a journey.' },
  { id: 'campaign', label: 'Follow up with users from a campaign', description: 'Use supported email or push activity. For example, users who opened but did not click.' },
  { id: 'event', label: 'Find users who took a specific event action', description: 'Use tracked product events from your SDK, such as users who completed a purchase in the last 30 days.' },
  { id: 'profile', label: 'Group users by profile details', description: 'Use reachability, lifecycle, location, account, or device fields.' },
  { id: 'reactivation', label: 'Reactivate users', description: 'Find inactive users using supported activity, event, time-window, and reachability conditions.' },
  { id: 'other', label: 'Something else', description: 'Describe the audience you have in mind, then choose and review the supported rules.' },
];

const profileCategories: Array<{ id: ProfileCategory; label: string }> = [
  { id: 'reachability', label: 'Reachability & engagement' },
  { id: 'product', label: 'Product & lifecycle' },
  { id: 'profile', label: 'Profile & location' },
  { id: 'account', label: 'Account & history' },
  { id: 'other', label: 'Something else' },
];

function fieldHasData(field: AudienceGroupSchemaField | undefined) {
  if (!field) return false;
  if (field.key === 'customProperty') return Boolean(field.property?.options?.length && field.conditions.length);
  if (field.key === 'lastNotified' || field.key === 'lastPushNotification' || /last.?notified/i.test(`${field.key} ${field.label}`)) return field.conditions.some(condition => condition.value.type === 'integer' && (field.key === 'lastPushNotification' ? (condition.value.min ?? 0) >= 0 : (condition.value.min ?? 1) >= 1));
  return field.conditions.some(condition => condition.value.type === 'none' || Boolean(condition.value.options?.length) || condition.value.freeText === true);
}

function optionHas(field: AudienceGroupSchemaField | undefined, pattern: RegExp) {
  return Boolean(field?.conditions.some(condition => condition.value.options?.some(option => pattern.test(`${option.key} ${option.label}`))));
}

function isLifecycleField(field: AudienceGroupSchemaField) {
  return ['currentLifecycleSegment', 'historicalLifecycleSegment'].includes(field.key)
    || /lifecycle.?segment/i.test(`${field.key} ${field.label}`);
}

function fieldsForCategory(schema: AudienceGroupSchema, category: ProfileCategory, sdkIntegrated = true) {
  const categories: Record<Exclude<ProfileCategory, 'other'>, string[]> = {
    reachability: ['email', 'emailAction', 'lastNotified', appNotificationTokenFieldKey, 'webPush', 'pushNotification', 'pushNotificationAction', 'lastPushNotification'],
    product: ['currentLifecycleSegment', 'historicalLifecycleSegment', 'journeyAutomation', 'audienceGroup', 'performedEvent'],
    profile: ['country', 'region', 'language', 'platform'],
    account: ['userImport', 'accountStatus', 'userType', 'createdDate'],
  };
  return audiencePickerFields(schema.fields).filter(field => !field.deprecated
    && (categories[category as Exclude<ProfileCategory, 'other'>]?.includes(field.key) || (category === 'reachability' && field.category === 'consent'))
    && (sdkIntegrated || !isLifecycleField(field)));
}

function availableFieldsForCategory(schema: AudienceGroupSchema, category: ProfileCategory, sdkIntegrated: boolean) {
  return fieldsForCategory(schema, category, sdkIntegrated).filter(fieldHasData);
}

function ruleFields(schema: AudienceGroupSchema, goal: Goal, branch: string, profileCategory: ProfileCategory | null, sdkIntegrated = true) {
  const fields = audiencePickerFields(schema.fields).filter(field => !field.deprecated && fieldHasData(field) && (sdkIntegrated || !isLifecycleField(field)));
  if (goal === 'event') return fields.filter(field => field.key === 'performedEvent');
  if (goal === 'behavior') {
    const keys = branch === 'events' ? ['performedEvent'] : branch === 'lifecycle' ? ['currentLifecycleSegment', 'historicalLifecycleSegment'] : ['journeyAutomation'];
    return fields.filter(field => keys.includes(field.key));
  }
  if (goal === 'campaign') {
    const activity = ['emailAction', 'lastNotified', 'pushNotificationAction', 'lastPushNotification'];
    if (branch === 'specific') return fields.filter(field => /campaign/i.test(`${field.key} ${field.label}`) && optionHas(field, /campaign/i));
    return fields.filter(field => activity.includes(field.key));
  }
  if (goal === 'profile' && profileCategory && profileCategory !== 'other') return fieldsForCategory(schema, profileCategory, sdkIntegrated).filter(fieldHasData);
  if (goal === 'reactivation') {
    const keys = ['email', 'emailAvailable', 'emailAction', 'lastEmailed', 'lastNotified', appNotificationTokenFieldKey, 'fcmToken', 'apnsToken', 'webPush', 'pushNotification', 'pushNotificationAction', 'lastPushNotification', 'performedEvent', 'accountStatus'];
    const consent = fields.filter(field => /consent|opt.?in/i.test(`${field.key} ${field.label}`));
    return fields.filter(field => keys.includes(field.key) || ['email', 'push'].includes(field.category ?? '') || /(?:email|web.?push|mobile.?push|last.?notified)/i.test(`${field.key} ${field.label}`) || consent.includes(field));
  }
  return fields;
}

function campaignSpecificField(schema: AudienceGroupSchema) {
  return schema.fields.find(field => /campaign/i.test(`${field.key} ${field.label}`) && optionHas(field, /campaign/i));
}

function fieldsForOther(schema: AudienceGroupSchema, description: string, sdkIntegrated = true) {
  const text = description.toLowerCase();
  const hints = [
    { words: ['event', 'action', 'purchase', 'checkout'], keys: ['performedEvent'] },
    { words: ['email', 'opened', 'clicked', 'campaign'], keys: ['email', 'emailAction', 'lastNotified'] },
    { words: ['push', 'notification'], keys: [appNotificationTokenFieldKey, 'webPush', 'pushNotification', 'pushNotificationAction', 'lastPushNotification', 'lastNotified'] },
    { words: ['country', 'location', 'language', 'platform'], keys: ['country', 'region', 'language', 'platform'] },
    { words: ['journey'], keys: ['journeyAutomation'] },
    { words: ['segment', 'lifecycle'], keys: ['currentLifecycleSegment', 'historicalLifecycleSegment'] },
  ];
  const keys = new Set(hints.filter(hint => hint.words.some(word => text.includes(word))).flatMap(hint => hint.keys));
  const candidates = audiencePickerFields(schema.fields).filter(field => !field.deprecated && fieldHasData(field) && (sdkIntegrated || !isLifecycleField(field)));
  return keys.size ? candidates.filter(field => keys.has(field.key)) : candidates;
}

function audienceSuggestions(goal: Goal, blocks: Block[], schema: AudienceGroupSchema, otherDescription: string) {
  const name = ({
    behavior: 'Behavior-based audience',
    campaign: 'Campaign follow-up audience',
    event: 'Event-based audience',
    profile: 'Profile-based audience',
    reactivation: 'Reactivation audience',
    other: 'Custom audience',
  } satisfies Record<Goal, string>)[goal];
  const ruleSummary = blocks
    .map(block => block.rules.filter(rule => isRuleComplete(rule, schema)).map(rule => readableRule(rule, schema)).join(' and '))
    .filter(Boolean)
    .join(' or ');
  const description = goal === 'other' && otherDescription.trim()
    ? `Audience for ${otherDescription.trim()}. Selected rules: ${ruleSummary}.`
    : `Users matching these conditions: ${ruleSummary}.`;
  return { name, description };
}

function RuleEditor({ schema, fields, allFields, journeyScope, blocks, onChange }: { schema: AudienceGroupSchema; fields: AudienceGroupSchemaField[]; allFields: AudienceGroupSchemaField[]; journeyScope: 'any' | 'specific' | null; blocks: Block[]; onChange: (blocks: Block[]) => void }) {
  const maxConditions = schema.limits.maxConditions || 10;
  const conditionCount = validRuleCount(blocks, schema);
  const updateRule = (blockId: number, ruleId: number, key: keyof Rule, value: string) => onChange(blocks.map(block => block.id !== blockId ? block : {
    ...block,
    rules: block.rules.map(rule => {
      if (rule.id !== ruleId) return rule;
      if (key !== 'filter') {
        const isAnyJourney = journeyScope === 'any' && rule.filter === 'journeyAutomation';
        return { ...rule, [key]: value, ...(key === 'operator' ? { value: isAnyJourney ? anyJourneyValue : '' } : {}) };
      }
      const selectedField = schema.fields.find(field => field.key === value);
      const isLastNotified = /last.?notified/i.test(`${selectedField?.key ?? ''} ${selectedField?.label ?? ''}`);
      const defaultOperator = selectedField?.conditions.find(condition => /exclude.*last.*day|exclude_in_last_days|not.*within.*day/i.test(`${condition.key} ${condition.label}`))?.key ?? '';
      const isAnyJourney = journeyScope === 'any' && selectedField?.key === 'journeyAutomation';
      return { ...rule, filter: value, operator: isLastNotified ? defaultOperator : '', value: isAnyJourney ? anyJourneyValue : '', property: '' };
    }),
  }));
  const addAnd = (blockId: number) => {
    if (conditionCount >= maxConditions) return;
    const nextId = Math.max(0, ...blocks.flatMap(block => block.rules.map(rule => rule.id))) + 1;
    onChange(blocks.map(block => block.id === blockId ? { ...block, rules: [...block.rules, makeRule(nextId)] } : block));
  };
  const addOr = () => {
    if (conditionCount >= maxConditions) return;
    const nextId = Math.max(0, ...blocks.flatMap(block => block.rules.map(rule => rule.id))) + 1;
    onChange([...blocks, makeBlock(blocks.length + 1, nextId)]);
  };
  const remove = (blockId: number, ruleId: number) => onChange(blocks.map(block => block.id === blockId ? { ...block, rules: block.rules.filter(rule => rule.id !== ruleId) } : block).filter(block => block.rules.length));
  return <Stack gap={1.5}>
    {!blocks.length && <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}><Typography fontWeight={600}>No conditions selected yet</Typography><Typography color="text.secondary" fontSize="0.85rem">Add a condition to define which users belong to this group.</Typography><Button type="button" variant="outlined" startIcon={<AddRounded />} onClick={() => onChange([makeBlock(1, 1)])} sx={{ mt: 1.2 }}>Add condition</Button></Box>}
    {blocks.map((block, blockIndex) => <Box key={block.id} sx={{ p: { xs: 1.25, sm: 1.5 }, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Stack gap={1.2}>
        {block.rules.map(rule => <RuleRow key={rule.id} rule={rule} schema={schema} fields={fields} allFields={allFields} journeyScope={journeyScope} onChange={(key, value) => updateRule(block.id, rule.id, key, value)} onRemove={() => remove(block.id, rule.id)} />)}
        <Button type="button" size="small" startIcon={<AddRounded />} onClick={() => addAnd(block.id)} disabled={conditionCount >= maxConditions}>AND condition</Button>
      </Stack>
      {blockIndex < blocks.length - 1 && <Typography align="center" color="text.secondary" sx={{ mt: 1 }}>OR</Typography>}
    </Box>)}
    <Button type="button" size="small" startIcon={<AddRounded />} onClick={addOr} disabled={!blocks.length || conditionCount >= maxConditions}>OR group</Button>
  </Stack>;
}

function RuleRow({ rule, schema, fields, allFields, journeyScope, onChange, onRemove }: { rule: Rule; schema: AudienceGroupSchema; fields: AudienceGroupSchemaField[]; allFields: AudienceGroupSchemaField[]; journeyScope: 'any' | 'specific' | null; onChange: (key: keyof Rule, value: string) => void; onRemove: () => void }) {
  const ruleFields = allFields.length ? allFields : fields;
  const field = ruleFields.find(item => item.key === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator);
  const options = condition?.value.options ?? [];
  const valueType = condition?.value.type;
  const selected = condition?.value.multiple ? rule.value.split(',').map(value => value.trim()).filter(Boolean) : rule.value;
  const hasCustomProperty = field?.key === 'customProperty';
  const isAnyJourney = journeyScope === 'any' && field?.key === 'journeyAutomation';
  const isLastNotified = /last.?notified/i.test(`${field?.key ?? ''} ${field?.label ?? ''}`);
  const complete = isRuleComplete(rule, schema);
  const incomplete = !complete;
  const incompleteMessage = !ruleHasInput(rule)
    ? 'Choose a field, or remove this incomplete condition.'
    : isLastNotified
      ? 'Enter a positive whole number of days for Last Notified.'
      : 'Choose an operator and a required value, or remove this incomplete condition.';
  return <Stack direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} sx={{ width: '100%', flexWrap: { md: 'wrap' } }}>
    <AudienceConditionFieldPicker fields={fields} moreFields={allFields} value={rule.filter} onChange={value => onChange('filter', value)} compact />
    {hasCustomProperty && <Select size="small" displayEmpty value={rule.property ?? ''} inputProps={{ 'aria-label': 'Custom property' }} onChange={event => onChange('property', String(event.target.value))} sx={{ minWidth: { md: 180 }, flex: 1 }}>
      <MenuItem value="">Choose a property</MenuItem>
      {(field?.property?.options ?? []).map(option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
    </Select>}
    {field && !isLastNotified && <Select size="small" displayEmpty value={rule.operator} inputProps={{ 'aria-label': 'Condition operator' }} onChange={event => onChange('operator', String(event.target.value))} disabled={hasCustomProperty && !rule.property} sx={{ minWidth: { md: 180 }, flex: 1 }}>
      <MenuItem value="">Choose an operator</MenuItem>
      {field.conditions.map(item => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
    </Select>}
    {isLastNotified ? <Stack direction="row" alignItems="center" gap={0.7} sx={{ flex: 1, minWidth: 0, flexWrap: { xs: 'wrap', md: 'nowrap' } }}><Typography component="span" whiteSpace="nowrap">Exclude users notified in the last</Typography><TextField size="small" type="number" inputProps={{ min: 1, step: 1, inputMode: 'numeric', 'aria-label': 'Last Notified days' }} value={rule.value} onChange={event => onChange('value', event.target.value)} error={Boolean(rule.value) && !/^[1-9]\d*$/.test(rule.value.trim())} sx={{ width: 82, flex: '0 0 82px' }} /><Typography component="span" whiteSpace="nowrap">days</Typography></Stack> : isAnyJourney ? <Box sx={{ flex: 1, minWidth: { md: 190 }, px: 1.4, py: .85, border: '1px solid', borderColor: 'divider', borderRadius: 1, color: 'text.secondary' }}>Any journey</Box> : condition && valueType !== 'none' && (options.length ? <Select size="small" displayEmpty multiple={Boolean(condition.value.multiple)} value={selected} inputProps={{ 'aria-label': 'Condition value' }} onChange={event => {
      const value = Array.isArray(event.target.value) ? event.target.value : [event.target.value];
      onChange('value', value.map(String).join(','));
    }} renderValue={value => (Array.isArray(value) ? value : [value]).map(item => options.find(option => option.key === item)?.label ?? item).join(', ')} sx={{ minWidth: { md: 190 }, flex: 1 }}>
      <MenuItem value="">Choose a value</MenuItem>
      {options.map(option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
    </Select> : <TextField size="small" type={valueType === 'integer' || valueType === 'number' ? 'number' : valueType === 'date' ? 'date' : 'text'} value={rule.value} placeholder={condition.value.unit ? `Enter ${condition.value.unit}` : 'Enter a value'} onChange={event => onChange('value', event.target.value)} sx={{ flex: 1 }} />)}
    <Button type="button" aria-label="Remove condition" onClick={onRemove} sx={{ minWidth: 40 }}><CloseRounded fontSize="small" /></Button>
    {incomplete && <Typography color="error" fontSize="0.78rem" sx={{ width: '100%' }}>{incompleteMessage}</Typography>}
  </Stack>;
}

export default function AudienceGroupAiFlow({ projectId, sdkIntegrated, trackedEvents, onCancel, onCreated }: Props) {
  const schemaQuery = useQuery({ queryKey: ['projects', projectId, 'audience-groups', 'schema', 'users-audience-groups'], queryFn: () => audienceGroupsApi.schema(projectId, { surface: 'users-audience-groups' }), staleTime: 30_000 });
  const onboardingQuery = useQuery({ queryKey: ['projects', projectId, 'onboarding'], queryFn: () => onboardingApi.get(projectId), staleTime: 30_000 });
  const [goal, setGoal] = useState<Goal | null>(null);
  const [branch, setBranch] = useState('');
  const [journeyScope, setJourneyScope] = useState<'any' | 'specific' | null>(null);
  const [profileCategory, setProfileCategory] = useState<ProfileCategory | null>(null);
  const [otherDescription, setOtherDescription] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [reactivationUnavailable, setReactivationUnavailable] = useState<string[]>([]);
  const lastGoalRef = useRef<Goal | null>(null);
  const reactivationSeededRef = useRef(false);
  const reviewSuggestionsAppliedRef = useRef(false);
  const schema = schemaQuery.data ? withAppNotificationTokenField(schemaQuery.data) : undefined;
  const eventField = schema?.fields.find(field => field.key === 'performedEvent');
  const trackedSchemaEvents = trackedEvents.filter(event => eventField?.conditions.some(condition => condition.value.options?.some(option => option.key === event)));
  const goalOptions = useMemo(() => goals.map(item => {
    if (item.id !== 'event') return { ...item, available: true, unavailableReason: '' };
    const available = sdkIntegrated && trackedSchemaEvents.length > 0;
    return {
      ...item,
      available,
      unavailableReason: sdkIntegrated ? 'No tracked product events yet.' : 'Requires SDK integration and tracked product events.',
    };
  }), [sdkIntegrated, trackedSchemaEvents.length]);
  useEffect(() => {
    if (goal !== 'reactivation' || reactivationSeededRef.current || !schema || onboardingQuery.isPending || !onboardingQuery.data) return;
    reactivationSeededRef.current = true;
    const progress = onboardingQuery.data;
    const selected = reactivationChannelsForProject(progress.platforms, progress.channels ?? []);
    const seeded = seedReactivationRules(schema, selected);
    setReactivationUnavailable(seeded.unavailable);
    setBlocks(current => current.length ? current : seeded.blocks);
  }, [goal, onboardingQuery.data, onboardingQuery.isPending, schema]);
  useEffect(() => {
    if (sdkIntegrated || branch !== 'lifecycle') return;
    setBranch('');
    setBlocks([]);
    setReviewing(false);
  }, [branch, sdkIntegrated]);
  const campaignSpecific = schema ? campaignSpecificField(schema) : undefined;
  const campaignActivityAvailable = Boolean(schema && ruleFields(schema, 'campaign', 'any', null).length > 0);
  const specificCampaignAvailable = Boolean(schema && campaignSpecific);
  const fields = schema && goal ? goal === 'other' ? fieldsForOther(schema, otherDescription, sdkIntegrated) : ruleFields(schema, goal, branch, profileCategory, sdkIntegrated) : [];
  const allPickerFields = schema ? audiencePickerFields(schema.fields).filter(field => !field.deprecated && fieldHasData(field) && (sdkIntegrated || !isLifecycleField(field))) : [];
  const hasRules = validRuleCount(blocks, schema) > 0;
  const incompleteRules = incompleteRuleCount(blocks, schema);
  const createMutation = useMutation({
    mutationFn: () => {
      if (!schema || !goal || !groupName.trim() || !hasRules || incompleteRules > 0) throw new Error('Add a group name and complete or remove every condition.');
      return audienceGroupsApi.create(projectId, {
        name: groupName.trim(),
        description: description.trim() || (goal === 'other' ? otherDescription.trim() : undefined),
        rules: toBackendRules(blocks, schema),
      });
    },
    onSuccess: group => { setError(null); setReviewing(false); onCreated(group); },
    onError: cause => setError(cause instanceof Error ? cause.message : 'The audience group could not be created. Please try again.'),
  });

  if (schemaQuery.isLoading) return <Card sx={{ p: 2.5 }}><Stack gap={1.5}><Stack direction="row" gap={1.2} alignItems="center"><CircularProgress size={20} /><Typography>Loading the conditions available in this project…</Typography></Stack><Button type="button" onClick={onCancel}>Cancel</Button></Stack></Card>;
  if (schemaQuery.isError || !schema) return <Card sx={{ p: 2.5 }}><Stack gap={1.5}><Alert severity="error">I couldn’t load this project’s audience conditions.</Alert><Stack direction="row" gap={1}><Button type="button" startIcon={<ReplayRounded />} onClick={() => schemaQuery.refetch()}>Try again</Button><Button type="button" onClick={onCancel}>Cancel</Button></Stack></Stack></Card>;
  if (createMutation.data) return <Card sx={{ p: 2.5 }}><Stack gap={1.2}><Typography variant="h3">Audience group created</Typography><Typography><strong>{createMutation.data.name}</strong> is ready with {createMutation.data.memberCount ?? 0} matching users.</Typography><Button type="button" variant="contained" href={`/dashboard/users?tab=groups&groupId=${encodeURIComponent(createMutation.data.id)}`}>Open audience group</Button><Button type="button" onClick={onCancel}>Done</Button></Stack></Card>;

  const chooseGoal = (next: Goal) => {
    if (lastGoalRef.current !== next) {
      setBlocks([]);
      reactivationSeededRef.current = false;
      setReactivationUnavailable([]);
    }
    lastGoalRef.current = next;
    setGoal(next);
    setBranch('');
    setJourneyScope(null);
    setProfileCategory(null);
    setReviewing(false);
    setError(null);
  };
  const chooseBranch = (next: string) => { setBranch(next); setJourneyScope(null); setBlocks([]); setReviewing(false); };
  const chooseJourneyActivity = () => { setBranch('journey-scope'); setJourneyScope(null); setBlocks([]); setReviewing(false); };
  const chooseJourneyScope = (next: 'any' | 'specific') => { setJourneyScope(next); setBranch(`journey-${next}`); setBlocks([]); setReviewing(false); };
  const chooseProfileCategory = (next: ProfileCategory) => { setProfileCategory(next); setBranch(''); setBlocks([]); setReviewing(false); };
  const conditionContext = goal === 'behavior'
    ? ({ events: 'Product events', lifecycle: 'Lifecycle segment status', journey: 'Journey activity', 'journey-any': 'Journey activity', 'journey-specific': 'Journey activity' } as Record<string, string>)[branch] ?? 'Behavior'
    : goal === 'profile'
      ? profileCategories.find(item => item.id === profileCategory)?.label ?? 'Profile details'
      : goals.find(item => item.id === goal)?.label ?? 'Audience rules';
  const ruleStepReady = goal === 'other' ? Boolean(otherDescription.trim()) : Boolean(fields.length);
  const backFromRuleEditor = () => {
    setReviewing(false);
    if (goal === 'behavior' && branch.startsWith('journey-')) setBranch('journey-scope');
    else if (goal === 'behavior' || goal === 'campaign') setBranch('');
    else if (goal === 'profile') setProfileCategory(null);
    else if (goal === 'other') setBranch('');
    else setGoal(null);
  };
  const startOtherRules = () => {
    if (!otherDescription.trim()) return;
    setBranch('other');
    setBlocks([]);
    setReviewing(false);
    setError(null);
  };
  const openReview = () => {
    if (!reviewSuggestionsAppliedRef.current && goal) {
      const suggestions = audienceSuggestions(goal, blocks, schema, otherDescription);
      setGroupName(current => current.trim() ? current : suggestions.name);
      setDescription(current => current.trim() ? current : suggestions.description);
      reviewSuggestionsAppliedRef.current = true;
    }
    setReviewing(true);
  };
  const journeyField = schema.fields.find(field => field.key === 'journeyAutomation');
  const journeyActivityAvailable = Boolean(ruleFields(schema, 'behavior', 'journey', null, sdkIntegrated).length);
  const specificJourneyAvailable = Boolean(journeyField?.conditions.some(condition => condition.value.options?.length));
  const showRuleEditor: boolean = Boolean(goal && (goal === 'event' || goal === 'reactivation' || (goal === 'other' && branch === 'other' && Boolean(otherDescription.trim())) || (goal === 'profile' && profileCategory && profileCategory !== 'other') || (goal === 'behavior' && ['events', 'lifecycle', 'journey-any', 'journey-specific'].includes(branch)) || (goal === 'campaign' && branch)));
  return <Card sx={{ p: 2.5, width: '100%' }} data-testid="audience-group-ai-flow">
    <Stack gap={2}>
      <Box><Typography variant="h3">Build an audience group</Typography><Typography color="text.secondary">Choose a goal, select conditions from this project, review the exact rules, and create the group.</Typography></Box>
      {!goal && <Stack gap={1}><Typography fontWeight={600}>What do you want to group these users for?</Typography>{goalOptions.map(item => <ButtonBase key={item.id} disabled={!item.available} onClick={() => item.available && chooseGoal(item.id)} sx={{ textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: item.available ? 'divider' : 'action.disabledBackground', borderRadius: 2, opacity: item.available ? 1 : 0.5, filter: item.available ? 'none' : 'blur(0.5px)', cursor: item.available ? 'pointer' : 'not-allowed', '&:hover:not(:disabled)': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{item.label}</Typography><Typography color="text.secondary" fontSize="0.85rem">{item.available ? item.description : item.unavailableReason}</Typography></ButtonBase>)}<Button type="button" onClick={onCancel}>Cancel</Button></Stack>}
      {goal && !showRuleEditor && !reviewing && <Stack gap={1.5}><Button type="button" startIcon={<ArrowBackRounded />} onClick={() => branch === 'journey-scope' ? setBranch('') : setGoal(null)}>Back to goals</Button>
        {goal === 'behavior' && branch !== 'journey-scope' && <><Typography fontWeight={600}>Which behavior should we use?</Typography><Stack gap={1}>{[['events', 'Product events', 'Use events tracked by this project.', 'No tracked events yet'], ...(sdkIntegrated ? [['lifecycle', 'Lifecycle segment status', 'Use a current or historical lifecycle segment.', 'No lifecycle segments available'] as const] : []), ['journey', 'Journey activity', 'Use activity from a project journey.', 'No journeys available']].map(([id, label, text, reason]) => { const available = ruleFields(schema, goal, id, null, sdkIntegrated).length > 0; const unavailableReason = id === 'events' && !sdkIntegrated ? 'Requires SDK integration and tracked product events.' : reason; return <ButtonBase key={id} disabled={!available} onClick={() => id === 'journey' ? chooseJourneyActivity() : chooseBranch(id)} sx={{ width: '100%', textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: available ? 'divider' : 'action.disabledBackground', borderRadius: 2, opacity: available ? 1 : 0.5, filter: available ? 'none' : 'blur(0.5px)', cursor: available ? 'pointer' : 'not-allowed', '&:hover:not(:disabled)': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{label}</Typography><Typography color="text.secondary" fontSize="0.82rem">{available ? text : unavailableReason}</Typography></ButtonBase>; })}</Stack></>}
        {goal === 'behavior' && branch === 'journey-scope' && <><Typography fontWeight={600}>Which journey scope should we use?</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button type="button" disabled={!journeyActivityAvailable} variant={journeyScope === 'any' ? 'contained' : 'outlined'} onClick={() => chooseJourneyScope('any')} sx={{ opacity: journeyActivityAvailable ? 1 : 0.5, filter: journeyActivityAvailable ? 'none' : 'blur(0.5px)', cursor: journeyActivityAvailable ? 'pointer' : 'not-allowed' }}>Any journey</Button><Button type="button" disabled={!specificJourneyAvailable} variant={journeyScope === 'specific' ? 'contained' : 'outlined'} onClick={() => chooseJourneyScope('specific')} sx={{ opacity: specificJourneyAvailable ? 1 : 0.5, filter: specificJourneyAvailable ? 'none' : 'blur(0.5px)', cursor: specificJourneyAvailable ? 'pointer' : 'not-allowed' }}>Specific journey</Button></Stack>{!journeyActivityAvailable && <Alert severity="info">No journeys are available for this project yet.</Alert>}{!specificJourneyAvailable && <Typography color="text.secondary" fontSize="0.82rem">No specific journeys are available yet.</Typography>}</>}
        {goal === 'campaign' && <><Typography fontWeight={600}>Which campaign scope should we use?</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button type="button" disabled={!campaignActivityAvailable} variant={branch === 'any' ? 'contained' : 'outlined'} onClick={() => chooseBranch('any')} sx={{ opacity: campaignActivityAvailable ? 1 : 0.5, filter: campaignActivityAvailable ? 'none' : 'blur(0.5px)', cursor: campaignActivityAvailable ? 'pointer' : 'not-allowed' }}>Any campaign</Button><Button type="button" disabled={!specificCampaignAvailable} variant={branch === 'specific' ? 'contained' : 'outlined'} onClick={() => chooseBranch('specific')} sx={{ opacity: specificCampaignAvailable ? 1 : 0.5, filter: specificCampaignAvailable ? 'none' : 'blur(0.5px)', cursor: specificCampaignAvailable ? 'pointer' : 'not-allowed' }}>Specific campaign</Button></Stack>{!campaignActivityAvailable && <Alert severity="info">No campaigns are available for this project yet.</Alert>}{!specificCampaignAvailable && <Typography color="text.secondary" fontSize="0.82rem">No specific campaigns are available yet. This option will become available when campaign-scoped activity is provided.</Typography>}</>}
        {goal === 'profile' && <><Typography fontWeight={600}>Which profile details matter?</Typography><Stack gap={1}>{profileCategories.map(item => { const availableFields = item.id === 'other' ? [] : availableFieldsForCategory(schema, item.id, sdkIntegrated); const available = item.id === 'other' || availableFields.length > 0; const summary = item.id === 'other' ? 'Describe your audience, then choose from the supported project fields.' : available ? `Available: ${availableFields.map(field => field.label).join(', ')}` : 'No supported project data available'; return <ButtonBase key={item.id} disabled={!available} onClick={() => item.id === 'other' ? chooseGoal('other') : chooseProfileCategory(item.id)} sx={{ width: '100%', textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: available ? 'divider' : 'action.disabledBackground', borderRadius: 2, opacity: available ? 1 : 0.5, filter: available ? 'none' : 'blur(0.5px)', cursor: available ? 'pointer' : 'not-allowed', '&:hover:not(:disabled)': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{item.label}</Typography><Typography color="text.secondary" fontSize="0.82rem">{summary}</Typography></ButtonBase>; })}</Stack></>}
        {goal === 'reactivation' && <><Typography fontWeight={600}>Choose supported reactivation conditions</Typography><Typography color="text.secondary">Only activity, reachability, product events, and fields exposed by this project are available.</Typography>{!fields.length && <Alert severity="info">There are no supported reactivation conditions in this project yet. Choose another goal.</Alert>}{fields.some(field => field.key === 'accountStatus' && optionHas(field, /deleted/i)) && <Typography color="text.secondary" fontSize="0.85rem">Deleted-account targeting is available because the backend exposed it for this project.</Typography>}</>}
        {goal === 'reactivation' && reactivationUnavailable.length > 0 && <Alert severity="info">I couldn’t preselect supported conditions for: {reactivationUnavailable.join(', ')}. Add or adjust the available conditions manually.</Alert>}
        {goal === 'reactivation' && onboardingQuery.isError && <Alert severity="info">I couldn’t load the saved product and channel selections. Add or adjust the available conditions manually.</Alert>}
        {goal === 'other' && <><Typography fontWeight={600}>What audience do you have in mind?</Typography><TextField multiline minRows={2} value={otherDescription} onChange={event => setOtherDescription(event.target.value)} placeholder="For example, users who started checkout but did not finish." helperText="Max will use this only to help you choose supported conditions; you will review the actual rules before creation." /><Button type="button" variant="contained" onClick={startOtherRules} disabled={!otherDescription.trim()}>Find supported conditions</Button></>}
        <Button type="button" onClick={onCancel}>Cancel</Button>
      </Stack>}
      {showRuleEditor && !reviewing && <Stack gap={1.5}>
        <Box>
          <Typography fontWeight={600}>Conditions for {conditionContext}</Typography>
          <Typography color="text.secondary" fontSize="0.82rem">Selected goal: {goals.find(item => item.id === goal)?.label}</Typography>
        </Box>
        {goal === 'other' && <Typography color="text.secondary" fontSize="0.85rem">These are schema-supported conditions relevant to “{otherDescription}”. Select the actual rules you want to create.</Typography>}
        {goal === 'reactivation' && fields.some(field => field.key === 'accountStatus' && optionHas(field, /deleted/i)) && <Typography color="text.secondary" fontSize="0.85rem">Deleted-account targeting is available because the backend exposed it for this project.</Typography>}
        {!fields.length ? <Alert severity="info">No matching schema-supported options are available for this goal. Choose another goal.</Alert> : <>
          <RuleEditor schema={schema} fields={fields} allFields={allPickerFields} journeyScope={journeyScope} blocks={blocks} onChange={setBlocks} />
          {incompleteRules > 0 && <Alert severity="warning">Complete or remove the incomplete condition before reviewing these rules.</Alert>}
          <Button type="button" variant="contained" endIcon={<ArrowForwardRounded />} onClick={openReview} disabled={!ruleStepReady || !hasRules || incompleteRules > 0}>Review rules</Button>
        </>}
        <Stack direction="row" justifyContent="space-between" sx={{ pt: .5 }}>
          <Button type="button" startIcon={<ArrowBackRounded />} onClick={backFromRuleEditor}>Back</Button>
          <Button type="button" onClick={onCancel}>Cancel</Button>
        </Stack>
      </Stack>}
      {reviewing && <Stack gap={1.5}><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={600}>Review rules for {conditionContext}</Typography><Typography color="text.secondary" fontSize="0.82rem">Selected goal: {goals.find(item => item.id === goal)?.label}</Typography></Box><Button type="button" startIcon={<ArrowBackRounded />} onClick={() => setReviewing(false)}>Edit rules</Button></Stack><Stack gap={.7}>{blocks.flatMap(block => block.rules.filter(rule => isRuleComplete(rule, schema))).map(rule => <Typography key={rule.id}>• {readableRule(rule, schema)}</Typography>)}</Stack><Divider /><TextField required label="Group name" value={groupName} onChange={event => setGroupName(event.target.value)} error={reviewing && !groupName.trim()} helperText={!groupName.trim() ? 'Enter a name for this audience group.' : ' '} /><TextField label="Description (optional)" value={description} onChange={event => setDescription(event.target.value)} multiline minRows={2} /><Button type="button" variant="contained" onClick={() => { if (!groupName.trim()) { setError('Enter a group name before creating the audience group.'); return; } setError(null); createMutation.mutate(); }} disabled={!groupName.trim() || !hasRules || incompleteRules > 0 || createMutation.isPending}>{createMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Create audience group'}</Button>{error && <Alert severity="error">{error}</Alert>}<Button type="button" onClick={onCancel}>Cancel</Button></Stack>}
    </Stack>
  </Card>;
}
