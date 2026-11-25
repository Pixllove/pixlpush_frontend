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
export const appNotificationTokenFieldLabel = 'App Notification';

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
  const existing = schema.fields.find(field => field.key === appNotificationTokenFieldKey);
  if (existing) {
    // Older backend schemas expose the same combined predicate with the
    // implementation-oriented label "App Notification Token (FCM & APNs)".
    // Keep the key and operators unchanged, but use the product-facing label
    // in both audience-group surfaces.
    if (existing.label === appNotificationTokenFieldLabel && existing.topic === 'reachability') return schema;
    return {
      ...schema,
      fields: schema.fields.map(field => field.key === appNotificationTokenFieldKey
        ? { ...field, label: appNotificationTokenFieldLabel, topic: 'reachability' }
        : field),
    };
  }
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
  // Onboarding currently stores `mobile-push` and `web-push`, but older
  // progress rows and a few integrations used `mobile`, `web`, or snake-case
  // variants. Normalize them here so reactivation never loses a selected
  // channel and falls back to the wrong defaults.
  const selected = new Set<string>();
  for (const channel of channels) {
    const normalized = channel.trim().toLowerCase().replace(/_/g, '-');
    if (normalized === 'email') selected.add('email');
    else if (normalized === 'mobile' || normalized === 'mobile-push' || normalized === 'mobilepush') selected.add('mobile-push');
    else if (normalized === 'web' || normalized === 'web-push' || normalized === 'webpush') selected.add('web-push');
    else if (normalized === 'push') selected.add('push');
  }
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
  // Prefer the backend's canonical combined field when it is available. The
  // synthetic fallback below is only for older schemas that expose FCM/APNs
  // separately; filtering for `synthetic` here caused the real field to be
  // skipped and left the App Notification condition out of reactivation.
  const combined = schema.fields.find(field => field.key === appNotificationTokenFieldKey);
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
  const emailOnlySelected = uniqueChannels.length === 1 && uniqueChannels[0] === 'email';
  const mobileOnlySelected = uniqueChannels.length === 1 && uniqueChannels[0] === 'mobile-push';
  const webOnlySelected = uniqueChannels.length === 1 && uniqueChannels[0] === 'web-push';
  const emailAndMobileSelected = uniqueChannels.includes('email') && uniqueChannels.includes('mobile-push');
  const allDeliveryChannelsSelected = (['email', 'mobile-push', 'web-push'] as const).every(channel => uniqueChannels.includes(channel));
  // Keep the generated rows in the same order as the reactivation design:
  // Email, Web Push, then App Notification/Mobile Push.
  const channelOrder: ReactivationChannel[] = ['email', 'web-push', 'mobile-push'];
  const orderedChannels = channelOrder.filter(channel => uniqueChannels.includes(channel));
  // Only selected channels may seed conditions. In particular, Email + Web
  // Push must not silently add App Notification or mobile recency rows.
  const channelsToSeed = orderedChannels;
  const unavailable: string[] = [];
  const base: Rule[] = [];
  for (const channel of channelsToSeed) {
    const label = channel === 'email' ? 'Email' : channel === 'mobile-push' ? 'Mobile push' : 'Web push';
    const candidates = channelFields(schema, channel);
    const supported = candidates.flatMap(field => {
      const condition = conditionForAvailability(field, true);
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

  const blocks: Block[] = base.length
    ? [{ id: 1, rules: base.map((rule, index) => ({ ...rule, id: index + 1 })) }]
    : [];

  // For Email + Mobile Push, including the all-channel case, add the
  // re-entry branch from the correct reactivation design:
  // Email available AND App Notification not available.
  if (emailAndMobileSelected || allDeliveryChannelsSelected) {
    const emailField = channelFields(schema, 'email')[0];
    const emailAvailable = emailField ? conditionForAvailability(emailField, true) : undefined;
    const mobileField = channelFields(schema, 'mobile-push')[0];
    const mobileUnavailable = mobileField ? conditionForAvailability(mobileField, false) : undefined;
    if (emailField && emailAvailable && mobileField && mobileUnavailable) {
      blocks.push({
        id: 2,
        rules: [
          { id: 1, filter: emailField.key, operator: emailAvailable.key, value: '' },
          { id: 2, filter: mobileField.key, operator: mobileUnavailable.key, value: '' },
        ],
      });
    } else {
      unavailable.push('Mobile push unavailable condition');
    }
  }
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

const languageDisplayNames = new Intl.DisplayNames(['en'], { type: 'language', fallback: 'code' });

/** Display language values by name while preserving their backend key/code. */
export function audienceOptionLabel(field: AudienceGroupSchemaField | undefined, option: { key: string; label: string }) {
  if (!field || !['language', 'preferredLanguage'].includes(field.key)) return option.label;
  const code = option.key.trim().replace(/_/g, '-').toLowerCase();
  const display = languageDisplayNames.of(code);
  return display && display.toLowerCase() !== code ? display : option.label;
}

/** Fallback copy for older backends that do not yet return emptyReason. */
export function audienceEmptyOptionReason(field: AudienceGroupSchemaField | undefined) {
  switch (field?.key) {
    case 'country':
    case 'region':
    case 'language':
    case 'preferredLanguage':
    case 'accountStatus':
    case 'userType':
      return 'No active users have a value for this field yet.';
    case 'platform':
      return 'No active installations with platform information are available yet.';
    case 'currentLifecycleSegment':
    case 'historicalLifecycleSegment':
      return 'No lifecycle segments have been created in this project yet.';
    case 'journeyAutomation':
    case 'historicalJourneyAutomation':
      return 'No active journey automations are available in this project yet.';
    case 'emailCampaign':
      return 'No email campaigns are available in this project yet.';
    case 'mobilePushCampaign':
      return 'No mobile push campaigns are available in this project yet.';
    case 'webPushCampaign':
      return 'No web push campaigns are available in this project yet.';
    case 'mobileAppUserEvents':
      return 'No tracked iOS or Android events are available in this project yet.';
    case 'webUserEvents':
      return 'No tracked web events are available in this project yet.';
    case 'performedEvent':
      return 'No tracked product events are available in this project yet.';
    case 'audienceGroup':
      return 'No audience groups are available in this project yet.';
    default:
      return 'No project values are available yet.';
  }
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
  if (condition.value.options && !condition.value.freeText) {
    return condition.value.options.length > 0 && values.every(value => condition.value.options?.some(option => option.key === value));
  }
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
