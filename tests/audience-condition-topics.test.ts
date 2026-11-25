import { describe, expect, it } from 'vitest';
import type { AudienceGroupSchemaField } from '@/types/project';
import { audienceFieldTopic, audienceOptionLabel, audiencePickerFields, groupAudienceFields, isRuleComplete, toBackendRules, withAppNotificationTokenField } from '@/components/dashboard/audienceGroupRules';

const field = (key: string, label: string, category: string, topic?: string, options: string[] = []): AudienceGroupSchemaField => ({
  key,
  label,
  category,
  topic,
  operators: ['is_any_of'],
  conditions: [{ key: 'is_any_of', label: 'Is any of', value: { type: 'reference', required: true, multiple: true, options: options.map(value => ({ key: value, label: value })) } }],
});

describe('audience condition topics and serialization', () => {
  it('uses the backend topic and keeps the requested picker order', () => {
    const fields = [
      field('emailCampaign', 'Email Campaign', 'email', 'automation_campaigns', ['email-1']),
      field('mobileAppUserEvents', 'Mobile App User Events', 'event', 'engagement', ['purchase']),
      field('country', 'Country', 'location', 'account_details', ['PK']),
      field('email', 'Email', 'email', 'reachability'),
      field('audienceGroup', 'Audience Group', 'group', 'groups_segments', ['group-1']),
    ];

    expect(audienceFieldTopic(fields[0])).toBe('Automation & Campaigns');
    expect(groupAudienceFields(fields).map(group => group.label)).toEqual([
      'Reachability',
      'Engagement',
      'Groups & Segments',
      'Automation & Campaigns',
      'Account Details',
    ]);
  });

  it('hides deprecated fields from new pickers but preserves a selected legacy field', () => {
    const fields = [field('email', 'Email', 'email'), { ...field('lastNotified', 'Last Notified', 'account'), deprecated: true }];
    expect(audiencePickerFields(fields).map(item => item.key)).toEqual(['email']);
    expect(audiencePickerFields(fields, 'lastNotified').map(item => item.key)).toEqual(['email', 'lastNotified']);
  });

  it('serializes multi-select event and campaign values as arrays', () => {
    const schema = {
      levels: [],
      fields: [
        field('mobileAppUserEvents', 'Mobile App User Events', 'event', 'engagement', ['purchase', 'signup']),
        field('emailCampaign', 'Email Campaign', 'email', 'automation_campaigns', ['campaign-1', 'campaign-2']),
      ],
      fieldKeys: ['mobileAppUserEvents', 'emailCampaign'],
      logicalOperators: ['AND', 'OR'] as Array<'AND' | 'OR'>,
      limits: { maxConditions: 30, maxDepth: 3 },
    };
    expect(toBackendRules([{ id: 1, rules: [{ id: 1, filter: 'mobileAppUserEvents', operator: 'is_any_of', value: 'purchase,signup' }] }], schema)).toEqual({
      operator: 'AND',
      conditions: [{ field: 'mobileAppUserEvents', operator: 'is_any_of', value: ['purchase', 'signup'] }],
    });
  });

  it('normalizes the legacy combined app-token label for the picker', () => {
    const schema = {
      levels: [],
      fields: [field('appNotificationToken', 'App Notification Token (FCM & APNs)', 'push', 'reachability')],
      fieldKeys: ['appNotificationToken'],
      logicalOperators: ['AND', 'OR'] as Array<'AND' | 'OR'>,
      limits: { maxConditions: 30, maxDepth: 3 },
    };

    expect(withAppNotificationTokenField(schema).fields[0]).toMatchObject({
      key: 'appNotificationToken',
      label: 'App Notification',
      topic: 'reachability',
    });
  });

  it('does not treat an event value as valid when the project has no matching event options', () => {
    const schema = {
      levels: [],
      fields: [field('mobileAppUserEvents', 'Mobile App User Events', 'event', 'engagement')],
      fieldKeys: ['mobileAppUserEvents'],
      logicalOperators: ['AND', 'OR'] as Array<'AND' | 'OR'>,
      limits: { maxConditions: 30, maxDepth: 3 },
    };

    expect(isRuleComplete({ id: 1, filter: 'mobileAppUserEvents', operator: 'is', value: 'checkout' }, schema)).toBe(false);
  });

  it('renders language option names while preserving their stored codes', () => {
    expect(audienceOptionLabel(field('language', 'App Language', 'device'), { key: 'en', label: 'en' })).toBe('English');
    expect(audienceOptionLabel(field('language', 'App Language', 'device'), { key: 'ur', label: 'ur' })).toBe('Urdu');
  });
});
