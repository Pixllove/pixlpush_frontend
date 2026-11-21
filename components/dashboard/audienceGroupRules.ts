import type { AudienceGroupSchema } from '@/types/project';
import type { AudienceGroupSchemaField } from '@/types/project';
import type { ProjectPlatform } from '@/types/project';

export type Rule = { id: number; filter: string; operator: string; value: string; property?: string };
export type Block = { id: number; rules: Rule[] };

/** Internal editor value for a journey rule scoped to every project journey. */
export const anyJourneyValue = '__any_journey__';

export const makeRule = (id: number): Rule => ({ id, filter: '', operator: '', value: '' });
export const makeBlock = (id: number, ruleId: number): Block => ({ id, rules: [makeRule(ruleId)] });

/** Fields that are no longer offered when creating a new audience condition. */
export const hiddenAudienceFieldKeys = new Set([
  'fcmToken',
  'apnsToken',
  'lastEmailed',
  'lastNotified',
  'lastPushNotification',
  'pushNotification',
  'pushNotificationAction',
  'customProperty',
]);

export const appNotificationTokenFieldKey = 'appNotificationToken';
export const appNotificationTokenFieldLabel = 'Mobile push';

export type NotificationRecencyChannel = 'email' | 'mobile-push' | 'web-push';

const notificationRecencyDefinitions: Record<NotificationRecencyChannel, { key: string; label: string; phrase: string }> = {
  email: { key: 'lastEmailNotification', label: 'Last Email Sent', phrase: 'Exclude users sent an email in the last' },
  'mobile-push': { key: 'lastMobilePushNotification', label: 'Last Mobile Push Sent', phrase: 'Exclude users sent a mobile push in the last' },
  'web-push': { key: 'lastWebPushNotification', label: 'Last Web Push Sent', phrase: 'Exclude users sent a web push in the last' },
};

function notificationRecencyText(fieldOrKey: AudienceGroupSchemaField | string | undefined) {
  if (!fieldOrKey) return '';
  return typeof fieldOrKey === 'string' ? fieldOrKey : `${fieldOrKey.key} ${fieldOrKey.label}`;
}

export function notificationRecencyChannel(fieldOrKey: AudienceGroupSchemaField | string | undefined): NotificationRecencyChannel | null {
  const text = notificationRecencyText(fieldOrKey);
  if (new RegExp(`${notificationRecencyDefinitions.email.key}|last email notification|last emailed`, 'i').test(text)) return 'email';
  if (new RegExp(`${notificationRecencyDefinitions['mobile-push'].key}|last mobile.?push notification`, 'i').test(text)) return 'mobile-push';
  if (new RegExp(`${notificationRecencyDefinitions['web-push'].key}|last web.?push notification`, 'i').test(text)) return 'web-push';
  return null;
}

export function isNotificationRecencyField(fieldOrKey: AudienceGroupSchemaField | string | undefined) {
  return Boolean(notificationRecencyChannel(fieldOrKey));
}

export function notificationRecencyLabel(channel: NotificationRecencyChannel) {
  return notificationRecencyDefinitions[channel].label;
}

export function notificationRecencyPhrase(fieldOrKey: AudienceGroupSchemaField | string | undefined) {
  const channel = notificationRecencyChannel(fieldOrKey);
  return channel ? notificationRecencyDefinitions[channel].phrase : 'Exclude users notified in the last';
}

export function notificationRecencyKey(channel: NotificationRecencyChannel) {
  return notificationRecencyDefinitions[channel].key;
}

export function isHiddenAudienceField(field: AudienceGroupSchemaField) {
  return Boolean(field.deprecated) || hiddenAudienceFieldKeys.has(field.key);
}

/**
 * Add the combined mobile-token field when the backend still exposes the
 * provider-specific FCM/APNs fields. The original fields remain in the schema
 * so existing saved rules can still be read and edited as legacy conditions.
 */
export function withAppNotificationTokenField(schema: AudienceGroupSchema): AudienceGroupSchema {
  if (schema.fields.some(field => field.key === appNotificationTokenFieldKey)) return schema;
  const fcm = schema.fields.find(field => field.key === 'fcmToken');
  const apns = schema.fields.find(field => field.key === 'apnsToken');
  if (!fcm || !apns) return schema;
  const insertAt = schema.fields.findIndex(field => field.key === 'fcmToken');
  const combined: AudienceGroupSchemaField = {
    key: appNotificationTokenFieldKey,
    label: appNotificationTokenFieldLabel,
    category: 'push',
    topic: 'reachability',
    synthetic: true,
    operators: fcm.operators,
    conditions: fcm.conditions,
  };
  const fields = [...schema.fields];
  fields.splice(insertAt < 0 ? fields.length : insertAt, 0, combined);
  return { ...schema, fields };
}

/** Fields shown in a new condition picker; optionally retain the current legacy field. */
export function audiencePickerFields(fields: AudienceGroupSchemaField[], currentFieldKey?: string) {
  return fields.filter(field => !isHiddenAudienceField(field) || field.key === currentFieldKey);
}

export type ReactivationChannel = 'email' | 'mobile-push' | 'web-push';
export type ReactivationSeed = { blocks: Block[]; unavailable: string[] };

export function reactivationChannelsForProject(platforms: ProjectPlatform[], channels: string[]): ReactivationChannel[] {
  const selected = new Set(channels);
  if (selected.has('push')) {
    if (platforms.includes('mobile')) selected.add('mobile-push');
    if (platforms.includes('web')) selected.add('web-push');
  }
  return (['email', 'mobile-push', 'web-push'] as const).filter(channel =>
    selected.has(channel)
      && (channel === 'email' || (channel === 'mobile-push' && platforms.includes('mobile')) || (channel === 'web-push' && platforms.includes('web'))),
  );
}

function conditionForAvailability(field: AudienceGroupSchemaField, available = true) {
  return field.conditions.find(condition => {
    const name = `${condition.key} ${condition.label}`.toLowerCase();
    const isUnavailable = /not.?available|unavailable|not.?exists|not.?enabled/.test(name);
    const isAvailable = /available|exists|enabled/.test(name) && !isUnavailable;
    return available ? isAvailable : isUnavailable;
  });
}

function channelFields(schema: AudienceGroupSchema, channel: ReactivationChannel) {
  if (channel === 'email') {
    return schema.fields.filter(field => !field.deprecated && (['email', 'emailAvailable'].includes(field.key) || /^email(?: available)?$/i.test(field.label)));
  }
  if (channel === 'web-push') {
    return schema.fields.filter(field => !field.deprecated && !isNotificationRecencyField(field) && (field.key === 'webPush' || /(?:web|browser).*(?:push|notification)|(?:push|notification).*(?:web|browser)/i.test(`${field.key} ${field.label}`)));
  }
  const combined = schema.fields.find(field => field.key === appNotificationTokenFieldKey && field.synthetic);
  if (combined) return [combined];
  const explicit = schema.fields.filter(field => !field.deprecated
    && !isNotificationRecencyField(field)
    && !['fcmToken', 'apnsToken'].includes(field.key)
    && /mobile.*(?:push|token|notification)|(?:push|token|notification).*mobile/i.test(`${field.key} ${field.label}`));
  if (explicit.length) return [...new Map(explicit.map(field => [field.key, field])).values()];
  const generic = schema.fields.filter(field => !field.deprecated
    && !isNotificationRecencyField(field)
    && field.category === 'push'
    && !['fcmToken', 'apnsToken'].includes(field.key)
    && !/web|browser|action|activity|last.?notification/i.test(`${field.key} ${field.label}`)
    && field.conditions.some(condition => /available|exists|enabled/i.test(`${condition.key} ${condition.label}`)));
  if (generic.length === 1) return generic;
  // Provider-specific fields are not selectable as separate mobile channels.
  return [];
}

function notificationRecencyCondition(schema: AudienceGroupSchema, channel: NotificationRecencyChannel) {
  const field = schema.fields.find(item => notificationRecencyChannel(item) === channel);
  const condition = field?.conditions.find(item => /exclude.*last.*day|exclude_in_last_days|not.*within.*day/i.test(`${item.key} ${item.label}`));
  return field && condition ? { field, condition } : null;
}

/** Build one editable AND group of schema-backed default reactivation rules. */
export function seedReactivationRules(schema: AudienceGroupSchema, selectedChannels: ReactivationChannel[]): ReactivationSeed {
  const uniqueChannels = [...new Set(selectedChannels)];
  const emailFallback = uniqueChannels.includes('email') && (uniqueChannels.includes('mobile-push') || uniqueChannels.includes('web-push'));
  const channelsToSeed = emailFallback && !uniqueChannels.includes('mobile-push')
    ? [...uniqueChannels, 'mobile-push' as const]
    : uniqueChannels;
  const unavailable: string[] = [];
  const base: Rule[] = [];
  for (const channel of channelsToSeed) {
    const label = channel === 'email' ? 'Email' : channel === 'mobile-push' ? 'Mobile push' : 'Web push';
    const candidates = channelFields(schema, channel);
    const supported = candidates.flatMap(field => {
      const condition = conditionForAvailability(field, channel !== 'mobile-push' || !emailFallback);
      return condition ? [{ field, condition }] : [];
    });
    if (!supported.length || (channel === 'mobile-push' && (candidates.length !== 1 || supported.length !== 1))) {
      unavailable.push(label);
      continue;
    }
    const rules = supported.map(({ field, condition }, index) => ({
      id: index + 1,
      filter: field.key,
      operator: condition.key,
      value: condition.value.type === 'none' ? '' : condition.value.options?.[0]?.key ?? '',
    }));
    if (rules.some((rule, index) => !rule.value && supported[index].condition.value.type !== 'none')) {
      unavailable.push(label);
      continue;
    }
    if (rules[0]) base.push(rules[0]);

    const recency = notificationRecencyCondition(schema, channel);
    if (recency && recency.condition.value.type === 'integer' && (recency.condition.value.min ?? 1) <= 30) {
      base.push({ id: 0, filter: recency.field.key, operator: recency.condition.key, value: '30' });
    } else {
      unavailable.push(notificationRecencyLabel(channel));
    }
  }
  if (!uniqueChannels.length) unavailable.unshift('No delivery channels are selected');

  const blocks = base.length ? [{ id: 1, rules: base.map((rule, index) => ({ ...rule, id: index + 1 })) }] : [];
  return { blocks, unavailable };
}

export const audienceFieldCategoryOrder = [
  'Reachability',
  'Engagement',
  'Groups & Segments',
  'Automation & Campaigns',
  'Account Details',
] as const;

const topicLabels: Record<string, typeof audienceFieldCategoryOrder[number]> = {
  reachability: 'Reachability',
  engagement: 'Engagement',
  groups_segments: 'Groups & Segments',
  automation_campaigns: 'Automation & Campaigns',
  account_details: 'Account Details',
};

export function audienceFieldTopic(field: AudienceGroupSchemaField) {
  if (field.topic && topicLabels[field.topic]) return topicLabels[field.topic];
  if (isNotificationRecencyField(field) || field.category === 'consent' || field.category === 'email' || field.category === 'push') return 'Reachability';
  if (field.key === 'emailAction' || field.key === 'mobilePushAction' || field.key === 'webPushAction' || field.category === 'event') return 'Engagement';
  if (field.category === 'lifecycle' || field.category === 'group') return 'Groups & Segments';
  if (field.category === 'journey') return 'Automation & Campaigns';
  return 'Account Details';
}

function isNotificationRecencyRule(field: AudienceGroupSchemaField | undefined, rule?: Rule) {
  return isNotificationRecencyField(field ?? rule?.filter);
}

export function groupAudienceFields(fields: AudienceGroupSchemaField[]) {
  return audienceFieldCategoryOrder
    .map(label => ({ label, fields: fields.filter(field => audienceFieldTopic(field) === label) }))
    .filter(group => group.fields.length > 0);
}

const legacyField: Record<string, string> = {
  Email: 'email',
  'Current Lifecycle Segment': 'lifecycleSegmentId',
  Country: 'country',
  Region: 'region',
  'Preferred Language': 'preferredLanguage',
  Platform: 'platform',
  'Push Enabled': 'pushEnabled',
  'Email Available': 'emailAvailable',
  'Last Active': 'lastActiveAt',
  'Last Email Notification': 'lastEmailNotification',
  'Last Mobile Push Notification': 'lastMobilePushNotification',
  'Last Web Push Notification': 'lastWebPushNotification',
};
const legacyOperator: Record<string, string> = {
  Is: 'equals',
  'Is not': 'not_equals',
  Contains: 'contains',
  'Is available': 'exists',
  'Is not available': 'not_exists',
  'In the last': 'within_days',
  More: 'greater_than',
  'More than': 'not_within_days',
  'Exclude users emailed in the last X days': 'exclude_in_last_days',
  'Exclude users sent a mobile push in the last X days': 'exclude_in_last_days',
  'Exclude users sent a web push in the last X days': 'exclude_in_last_days',
};

export function toBackendCondition(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  const value = rule.value.trim();
  const parsedValue = condition?.value.multiple ? value.split(',').map(item => item.trim()).filter(Boolean) : value;
  const fieldKey = field?.key ?? rule.filter;
  const operator = condition?.key ?? legacyOperator[rule.operator] ?? rule.operator;
  if (fieldKey === appNotificationTokenFieldKey && field?.synthetic) {
    const tokenCondition = (tokenField: 'fcmToken' | 'apnsToken') => ({ field: tokenField, operator: operator === 'not_available' || operator === 'not_exists' ? 'not_available' : 'available' });
    return {
      operator: operator === 'not_available' || operator === 'not_exists' ? 'AND' as const : 'OR' as const,
      conditions: [tokenCondition('fcmToken'), tokenCondition('apnsToken')],
    };
  }
  return {
    field: fieldKey === rule.filter ? (legacyField[rule.filter] ?? rule.filter) : fieldKey,
    operator,
    ...(rule.property?.trim() ? { property: rule.property.trim() } : {}),
    ...(value ? { value: parsedValue } : {}),
  };
}

function schemaCondition(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  return field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
}

function schemaField(rule: Rule, schema?: AudienceGroupSchema) {
  return schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
}

function valueIsValid(rule: Rule, condition: NonNullable<ReturnType<typeof schemaCondition>>) {
  if (condition.value.type === 'none' || condition.value.required === false) return true;
  const values = rule.value.split(',').map(item => item.trim()).filter(Boolean);
  if (!values.length) return false;
  if (condition.value.options?.length) return values.every(value => condition.value.options?.some(option => option.key === value));
  if (condition.value.type === 'integer') {
    return values.every(value => {
      if (!/^[+-]?\d+$/.test(value)) return false;
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= (condition.value.min ?? 0);
    });
  }
  if (condition.value.type === 'number') return values.every(value => Number.isFinite(Number(value)));
  if (condition.value.type === 'date') return values.every(value => !Number.isNaN(Date.parse(value)));
  return true;
}

export function ruleHasInput(rule: Rule) {
  return Boolean(rule.filter.trim() || rule.operator.trim() || rule.value.trim() || rule.property?.trim());
}

export function isRuleComplete(rule: Rule, schema?: AudienceGroupSchema) {
  if (!rule.filter.trim() || !rule.operator.trim()) return false;
  if (!schema && isNotificationRecencyField(rule.filter)) return rule.operator === 'exclude_in_last_days' && /^[1-9]\d*$/.test(rule.value.trim());
  if (!schema) return Boolean(rule.value.trim() || /available|exists|not_exists|never|no_|none/i.test(rule.operator));
  const condition = schemaCondition(rule, schema);
  if (!condition) return false;
  const field = schemaField(rule, schema);
  if (['journeyAutomation', 'historicalJourneyAutomation'].includes(field?.key ?? '') && rule.value === anyJourneyValue) {
    return Boolean(condition.value.options?.length);
  }
  if (isNotificationRecencyRule(field, rule)) {
    return /exclude.*last.*day|exclude_in_last_days|not.*within.*day/i.test(`${condition.key} ${condition.label}`)
      && condition.value.type === 'integer'
      && /^[1-9]\d*$/.test(rule.value.trim())
      && Number(rule.value) >= (condition.value.min ?? 1);
  }
  if (field?.key === 'customProperty') {
    const propertyOptions = field.property?.options ?? [];
    if (!rule.property?.trim() || !propertyOptions.some(option => option.key === rule.property)) return false;
  }
  return valueIsValid(rule, condition);
}

export function toBackendRules(blocks: Block[], schema?: AudienceGroupSchema) {
  if (blocks.some(block => block.rules.some(rule => !isRuleComplete(rule, schema)))) {
    throw new Error('Complete or remove every audience condition before creating the group.');
  }
  const blockRules = (block: Block) => {
    const conditions: Array<Record<string, unknown>> = [];
    for (const rule of block.rules) {
      const field = schemaField(rule, schema);
      const condition = schemaCondition(rule, schema);
      if (['journeyAutomation', 'historicalJourneyAutomation'].includes(field?.key ?? '') && rule.value === anyJourneyValue && condition?.value.options?.length) {
        const journeyConditions = condition.value.options.map(option => toBackendCondition({ ...rule, value: option.key }, schema));
        const negative = /^(?:is_not_currently_in|has_never_entered|has_not_completed|has_not_been_in|has_not_been_in_any_of)$/.test(condition.key);
        conditions.push({ operator: negative ? 'AND' : 'OR', conditions: journeyConditions });
      } else {
        conditions.push(toBackendCondition(rule, schema));
      }
    }
    return conditions;
  };
  const populatedBlocks = blocks.map(blockRules).filter(conditions => conditions.length);
  if (!populatedBlocks.length) return { operator: 'AND' as const, conditions: [] };
  return populatedBlocks.length > 1
    ? { operator: 'OR' as const, conditions: populatedBlocks.map(conditions => ({ operator: 'AND' as const, conditions })) }
    : { operator: 'AND' as const, conditions: populatedBlocks[0] };
}

export function validRuleCount(blocks: Block[], schema?: AudienceGroupSchema) {
  return blocks.reduce((count, block) => count + block.rules.filter(rule => isRuleComplete(rule, schema)).length, 0);
}

export function incompleteRuleCount(blocks: Block[], schema?: AudienceGroupSchema) {
  return blocks.reduce((count, block) => count + block.rules.filter(rule => !isRuleComplete(rule, schema)).length, 0);
}

export function readableRule(rule: Rule, schema?: AudienceGroupSchema) {
  const field = schema?.fields.find(item => item.key === rule.filter || item.label === rule.filter);
  const condition = field?.conditions.find(item => item.key === rule.operator || item.label === rule.operator);
  if (isNotificationRecencyRule(field, rule)) return `${notificationRecencyPhrase(field ?? rule.filter)} ${rule.value.trim()} days`;
  if (['journeyAutomation', 'historicalJourneyAutomation'].includes(field?.key ?? '') && rule.value === anyJourneyValue) return `${field?.label ?? rule.filter} ${condition?.label ?? rule.operator} any journey`;
  const optionLabel = (value: string) => condition?.value.options?.find(option => option.key === value)?.label ?? value;
  const values = rule.value.split(',').map(item => item.trim()).filter(Boolean).map(optionLabel).join(', ');
  return `${field?.label ?? rule.filter} ${condition?.label ?? rule.operator}${values ? ` ${values}` : ''}${rule.property ? ` (${rule.property})` : ''}`;
}
