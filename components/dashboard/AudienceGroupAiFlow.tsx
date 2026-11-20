'use client';

import { AddRounded, ArrowBackRounded, ArrowForwardRounded, CloseRounded, ReplayRounded } from '@mui/icons-material';
import { Alert, Box, Button, ButtonBase, Card, CircularProgress, Divider, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { audienceGroupsApi } from '@/lib/projects/api';
import type { AudienceGroup, AudienceGroupSchema, AudienceGroupSchemaField } from '@/types/project';
import AudienceConditionFieldPicker from './AudienceConditionFieldPicker';
import { appNotificationTokenFieldKey, audiencePickerFields, incompleteRuleCount, isRuleComplete, makeBlock, makeRule, readableRule, ruleHasInput, toBackendRules, validRuleCount, withAppNotificationTokenField, type Block, type Rule } from './audienceGroupRules';

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
  if (field.key === 'lastNotified' || field.key === 'lastPushNotification') return field.conditions.some(condition => condition.value.type === 'integer');
  return field.conditions.some(condition => condition.value.type === 'none' || Boolean(condition.value.options?.length) || condition.value.freeText === true);
}

function optionHas(field: AudienceGroupSchemaField | undefined, pattern: RegExp) {
  return Boolean(field?.conditions.some(condition => condition.value.options?.some(option => pattern.test(`${option.key} ${option.label}`))));
}

function fieldsForCategory(schema: AudienceGroupSchema, category: ProfileCategory) {
  const categories: Record<Exclude<ProfileCategory, 'other'>, string[]> = {
    reachability: ['email', 'emailAction', 'lastNotified', appNotificationTokenFieldKey, 'webPush', 'pushNotification', 'pushNotificationAction', 'lastPushNotification'],
    product: ['currentLifecycleSegment', 'historicalLifecycleSegment', 'journeyAutomation', 'audienceGroup', 'performedEvent'],
    profile: ['country', 'region', 'language', 'platform'],
    account: ['userImport', 'accountStatus', 'userType', 'createdDate'],
  };
  return audiencePickerFields(schema.fields).filter(field => !field.deprecated && categories[category as Exclude<ProfileCategory, 'other'>]?.includes(field.key));
}

function ruleFields(schema: AudienceGroupSchema, goal: Goal, branch: string, profileCategory: ProfileCategory | null) {
  const fields = audiencePickerFields(schema.fields).filter(field => !field.deprecated && fieldHasData(field));
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
  if (goal === 'profile' && profileCategory && profileCategory !== 'other') return fieldsForCategory(schema, profileCategory).filter(fieldHasData);
  if (goal === 'reactivation') {
    const keys = ['email', 'emailAction', 'lastNotified', appNotificationTokenFieldKey, 'webPush', 'pushNotification', 'pushNotificationAction', 'lastPushNotification', 'performedEvent', 'accountStatus'];
    const consent = fields.filter(field => /consent|opt.?in/i.test(`${field.key} ${field.label}`));
    return fields.filter(field => keys.includes(field.key) || consent.includes(field));
  }
  return fields;
}

function campaignSpecificField(schema: AudienceGroupSchema) {
  return schema.fields.find(field => /campaign/i.test(`${field.key} ${field.label}`) && optionHas(field, /campaign/i));
}

function fieldsForOther(schema: AudienceGroupSchema, description: string) {
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
  const candidates = audiencePickerFields(schema.fields).filter(field => !field.deprecated && fieldHasData(field));
  return keys.size ? candidates.filter(field => keys.has(field.key)) : candidates;
}

function RuleEditor({ schema, fields, blocks, onChange }: { schema: AudienceGroupSchema; fields: AudienceGroupSchemaField[]; blocks: Block[]; onChange: (blocks: Block[]) => void }) {
  const conditionCount = validRuleCount(blocks, schema);
  const maxConditions = schema.limits.maxConditions || 10;
  const updateRule = (blockId: number, ruleId: number, key: keyof Rule, value: string) => onChange(blocks.map(block => block.id !== blockId ? block : {
    ...block,
    rules: block.rules.map(rule => rule.id !== ruleId ? rule : { ...rule, [key]: value, ...(key === 'filter' ? { operator: value === 'lastNotified' ? 'exclude_in_last_days' : '', value: '', property: '' } : key === 'operator' ? { value: '' } : {}) }),
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
        {block.rules.map(rule => <RuleRow key={rule.id} rule={rule} schema={schema} fields={fields} onChange={(key, value) => updateRule(block.id, rule.id, key, value)} onRemove={() => remove(block.id, rule.id)} />)}
        <Button type="button" size="small" startIcon={<AddRounded />} onClick={() => addAnd(block.id)} disabled={conditionCount >= maxConditions}>AND condition</Button>
      </Stack>
      {blockIndex < blocks.length - 1 && <Typography align="center" color="text.secondary" sx={{ mt: 1 }}>OR</Typography>}
    </Box>)}
    <Button type="button" size="small" startIcon={<AddRounded />} onClick={addOr} disabled={!blocks.length || conditionCount >= maxConditions}>OR group</Button>
    <Typography color="text.secondary" fontSize="0.8rem">{conditionCount} / {maxConditions} valid conditions. Conditions inside a group use AND; groups use OR.</Typography>
  </Stack>;
}

function RuleRow({ rule, schema, fields, onChange, onRemove }: { rule: Rule; schema: AudienceGroupSchema; fields: AudienceGroupSchemaField[]; onChange: (key: keyof Rule, value: string) => void; onRemove: () => void }) {
  const field = fields.find(item => item.key === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator);
  const options = condition?.value.options ?? [];
  const valueType = condition?.value.type;
  const selected = condition?.value.multiple ? rule.value.split(',').map(value => value.trim()).filter(Boolean) : rule.value;
  const hasCustomProperty = field?.key === 'customProperty';
  const isLastNotified = field?.key === 'lastNotified';
  const complete = isRuleComplete(rule, schema);
  const incomplete = !complete;
  const incompleteMessage = !ruleHasInput(rule)
    ? 'Choose a field, or remove this incomplete condition.'
    : isLastNotified
      ? 'Enter a positive whole number of days for Last Notified.'
      : 'Choose an operator and a required value, or remove this incomplete condition.';
  return <Stack direction={{ xs: 'column', md: 'row' }} gap={1} alignItems={{ md: 'center' }} sx={{ width: '100%', flexWrap: { md: 'wrap' } }}>
    <AudienceConditionFieldPicker fields={fields} value={rule.filter} onChange={value => onChange('filter', value)} />
    {hasCustomProperty && <Select size="small" displayEmpty value={rule.property ?? ''} inputProps={{ 'aria-label': 'Custom property' }} onChange={event => onChange('property', String(event.target.value))} sx={{ minWidth: { md: 180 }, flex: 1 }}>
      <MenuItem value="">Choose a property</MenuItem>
      {(field?.property?.options ?? []).map(option => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
    </Select>}
    {field && !isLastNotified && <Select size="small" displayEmpty value={rule.operator} inputProps={{ 'aria-label': 'Condition operator' }} onChange={event => onChange('operator', String(event.target.value))} disabled={hasCustomProperty && !rule.property} sx={{ minWidth: { md: 180 }, flex: 1 }}>
      <MenuItem value="">Choose an operator</MenuItem>
      {field.conditions.map(item => <MenuItem key={item.key} value={item.key}>{item.label}</MenuItem>)}
    </Select>}
    {isLastNotified ? <Stack direction="row" alignItems="center" gap={0.7} sx={{ flex: 1, minWidth: 0, flexWrap: 'wrap' }}><Typography component="span" whiteSpace="nowrap">Exclude users notified in the last</Typography><TextField size="small" type="number" inputProps={{ min: 1, step: 1, inputMode: 'numeric', 'aria-label': 'Last Notified days' }} value={rule.value} onChange={event => onChange('value', event.target.value)} error={Boolean(rule.value) && !/^[1-9]\d*$/.test(rule.value.trim())} /><Typography component="span">days</Typography></Stack> : condition && valueType !== 'none' && (options.length ? <Select size="small" displayEmpty multiple={Boolean(condition.value.multiple)} value={selected} inputProps={{ 'aria-label': 'Condition value' }} onChange={event => {
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
  const [goal, setGoal] = useState<Goal | null>(null);
  const [branch, setBranch] = useState('');
  const [profileCategory, setProfileCategory] = useState<ProfileCategory | null>(null);
  const [otherDescription, setOtherDescription] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const schema = schemaQuery.data ? withAppNotificationTokenField(schemaQuery.data) : undefined;
  const eventField = schema?.fields.find(field => field.key === 'performedEvent');
  const trackedSchemaEvents = trackedEvents.filter(event => eventField?.conditions.some(condition => condition.value.options?.some(option => option.key === event)));
  const availableGoals = useMemo(() => goals.filter(item => item.id !== 'event' || (sdkIntegrated && trackedSchemaEvents.length > 0)), [sdkIntegrated, trackedSchemaEvents.length]);
  const campaignSpecific = schema ? campaignSpecificField(schema) : undefined;
  const fields = schema && goal ? goal === 'other' ? fieldsForOther(schema, otherDescription) : ruleFields(schema, goal, branch, profileCategory) : [];
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

  const chooseGoal = (next: Goal) => { setGoal(next); setBranch(''); setProfileCategory(null); setBlocks([]); setReviewing(false); setError(null); };
  const chooseBranch = (next: string) => { setBranch(next); setBlocks([]); setReviewing(false); };
  const chooseProfileCategory = (next: ProfileCategory) => { setProfileCategory(next); setBranch(''); setBlocks([]); setReviewing(false); };
  const conditionContext = goal === 'behavior'
    ? ({ events: 'Product events', lifecycle: 'Lifecycle segment status', journey: 'Journey activity' } as Record<string, string>)[branch] ?? 'Behavior'
    : goal === 'profile'
      ? profileCategories.find(item => item.id === profileCategory)?.label ?? 'Profile details'
      : goals.find(item => item.id === goal)?.label ?? 'Audience rules';
  const ruleStepReady = goal === 'other' ? Boolean(otherDescription.trim()) : Boolean(fields.length);
  const backFromRuleEditor = () => {
    setReviewing(false);
    if (goal === 'behavior' || goal === 'campaign') setBranch('');
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
  const showRuleEditor: boolean = Boolean(goal && (goal === 'event' || goal === 'reactivation' || (goal === 'other' && branch === 'other' && Boolean(otherDescription.trim())) || (goal === 'profile' && profileCategory && profileCategory !== 'other') || (goal === 'behavior' && branch) || (goal === 'campaign' && branch)));
  return <Card sx={{ p: 2.5, width: '100%' }} data-testid="audience-group-ai-flow">
    <Stack gap={2}>
      <Box><Typography variant="h3">Build an audience group</Typography><Typography color="text.secondary">Choose a goal, select conditions from this project, review the exact rules, and create the group.</Typography></Box>
      {!goal && <Stack gap={1}><Typography fontWeight={600}>What do you want to group these users for?</Typography>{availableGoals.map(item => <ButtonBase key={item.id} onClick={() => chooseGoal(item.id)} sx={{ textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{item.label}</Typography><Typography color="text.secondary" fontSize="0.85rem">{item.description}</Typography></ButtonBase>)}{!sdkIntegrated && <Alert severity="info">The event goal will appear after an SDK is integrated and the project has tracked events.</Alert>}{sdkIntegrated && !trackedSchemaEvents.length && <Alert severity="info">The event goal will appear after this project has tracked an event supported by the audience schema.</Alert>}<Button type="button" onClick={onCancel}>Cancel</Button></Stack>}
      {goal && !showRuleEditor && !reviewing && <Stack gap={1.5}><Button type="button" startIcon={<ArrowBackRounded />} onClick={() => setGoal(null)}>Back to goals</Button>
        {goal === 'behavior' && <><Typography fontWeight={600}>Which behavior should we use?</Typography><Stack gap={1}>{[['events', 'Product events', 'Use events tracked by this project.', 'No tracked events yet'], ['lifecycle', 'Lifecycle segment status', 'Use a current or historical lifecycle segment.', 'No lifecycle segments available'], ['journey', 'Journey activity', 'Use activity from a project journey.', 'No journeys available']].map(([id, label, text, reason]) => { const available = ruleFields(schema, goal, id, null).length > 0; return <ButtonBase key={id} disabled={!available} onClick={() => chooseBranch(id)} sx={{ width: '100%', textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: available ? 'divider' : 'action.disabledBackground', borderRadius: 2, opacity: available ? 1 : 0.65, '&:hover:not(:disabled)': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{label}</Typography><Typography color="text.secondary" fontSize="0.82rem">{available ? text : reason}</Typography></ButtonBase>; })}</Stack></>}
        {goal === 'campaign' && <><Typography fontWeight={600}>Which campaign scope should we use?</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>{ruleFields(schema, goal, 'any', null).length > 0 && <Button type="button" variant={branch === 'any' ? 'contained' : 'outlined'} onClick={() => chooseBranch('any')}>Any campaign</Button>}{campaignSpecific && <Button type="button" variant={branch === 'specific' ? 'contained' : 'outlined'} onClick={() => chooseBranch('specific')}>Specific campaign</Button>}</Stack>{!ruleFields(schema, goal, 'any', null).length && <Alert severity="info">This project has no supported campaign activity yet. Choose another goal and try again after activity is available.</Alert>}{!campaignSpecific && <Typography color="text.secondary" fontSize="0.82rem">Specific campaign filtering is unavailable because the backend did not provide campaign-scoped activity and campaign options.</Typography>}</>}
        {goal === 'profile' && <><Typography fontWeight={600}>Which profile details matter?</Typography><Stack gap={1}>{profileCategories.map(item => { const available = item.id === 'other' || fieldsForCategory(schema, item.id).some(fieldHasData); return <ButtonBase key={item.id} disabled={!available} onClick={() => item.id === 'other' ? chooseGoal('other') : chooseProfileCategory(item.id)} sx={{ width: '100%', textAlign: 'left', display: 'block', p: { xs: 1.4, sm: 1.7 }, border: '1px solid', borderColor: available ? 'divider' : 'action.disabledBackground', borderRadius: 2, opacity: available ? 1 : 0.65, '&:hover:not(:disabled)': { borderColor: 'primary.main', backgroundColor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><Typography fontWeight={600}>{item.label}</Typography><Typography color="text.secondary" fontSize="0.82rem">{available ? 'Use the project fields available for this category.' : 'No supported project data available'}</Typography></ButtonBase>; })}</Stack></>}
        {goal === 'reactivation' && <><Typography fontWeight={600}>Choose supported reactivation conditions</Typography><Typography color="text.secondary">Only activity, reachability, product events, and fields exposed by this project are available.</Typography>{!fields.length && <Alert severity="info">There are no supported reactivation conditions in this project yet. Choose another goal.</Alert>}{fields.some(field => field.key === 'accountStatus' && optionHas(field, /deleted/i)) && <Typography color="text.secondary" fontSize="0.85rem">Deleted-account targeting is available because the backend exposed it for this project.</Typography>}{!fields.some(field => /consent|opt.?in/i.test(`${field.key} ${field.label}`)) && <Typography color="text.secondary" fontSize="0.85rem">Consent or opt-in targeting is not shown because this project has no consent field in its schema.</Typography>}</>}
        {goal === 'other' && <><Typography fontWeight={600}>What audience do you have in mind?</Typography><TextField multiline minRows={2} value={otherDescription} onChange={event => setOtherDescription(event.target.value)} placeholder="For example, users who started checkout but did not finish." helperText="Max will use this only to help you choose supported conditions; you will review the actual rules before creation." /><Button type="button" variant="contained" onClick={startOtherRules} disabled={!otherDescription.trim()}>Find supported conditions</Button></>}
        <Button type="button" onClick={onCancel}>Cancel</Button>
      </Stack>}
      {showRuleEditor && !reviewing && <Stack gap={1.5}><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography fontWeight={600}>Conditions for {conditionContext}</Typography><Typography color="text.secondary" fontSize="0.82rem">Selected goal: {goals.find(item => item.id === goal)?.label}</Typography></Box><Button type="button" startIcon={<ArrowBackRounded />} onClick={backFromRuleEditor}>Back</Button></Stack>{goal === 'other' && <Typography color="text.secondary" fontSize="0.85rem">These are schema-supported conditions relevant to “{otherDescription}”. Select the actual rules you want to create.</Typography>}{goal === 'reactivation' && !fields.some(field => /consent|opt.?in/i.test(`${field.key} ${field.label}`)) && <Typography color="text.secondary" fontSize="0.85rem">Consent or opt-in targeting is not shown because this project has no consent field in its schema.</Typography>}{goal === 'reactivation' && fields.some(field => field.key === 'accountStatus' && optionHas(field, /deleted/i)) && <Typography color="text.secondary" fontSize="0.85rem">Deleted-account targeting is available because the backend exposed it for this project.</Typography>}{!fields.length ? <Alert severity="info">No matching schema-supported options are available for this goal. Choose another goal.</Alert> : <><RuleEditor schema={schema} fields={fields} blocks={blocks} onChange={setBlocks} />{incompleteRules > 0 && <Alert severity="warning">Complete or remove the incomplete condition before reviewing these rules.</Alert>}<Button type="button" variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => setReviewing(true)} disabled={!ruleStepReady || !hasRules || incompleteRules > 0}>Review rules</Button></>}<Button type="button" onClick={onCancel}>Cancel</Button></Stack>}
      {reviewing && <Stack gap={1.5}><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={600}>Review rules for {conditionContext}</Typography><Typography color="text.secondary" fontSize="0.82rem">Selected goal: {goals.find(item => item.id === goal)?.label}</Typography></Box><Button type="button" startIcon={<ArrowBackRounded />} onClick={() => setReviewing(false)}>Edit rules</Button></Stack><Stack gap={.7}>{blocks.flatMap(block => block.rules.filter(rule => isRuleComplete(rule, schema))).map(rule => <Typography key={rule.id}>• {readableRule(rule, schema)}</Typography>)}</Stack><Divider /><TextField required label="Group name" value={groupName} onChange={event => setGroupName(event.target.value)} error={reviewing && !groupName.trim()} helperText={!groupName.trim() ? 'Enter a name for this audience group.' : ' '} /><TextField label="Description (optional)" value={description} onChange={event => setDescription(event.target.value)} multiline minRows={2} /><Button type="button" variant="contained" onClick={() => { if (!groupName.trim()) { setError('Enter a group name before creating the audience group.'); return; } setError(null); createMutation.mutate(); }} disabled={!groupName.trim() || !hasRules || incompleteRules > 0 || createMutation.isPending}>{createMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Create audience group'}</Button>{error && <Alert severity="error">{error}</Alert>}<Button type="button" onClick={onCancel}>Cancel</Button></Stack>}
    </Stack>
  </Card>;
}
