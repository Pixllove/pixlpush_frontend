import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AudienceGroupAiFlow from '@/components/dashboard/AudienceGroupAiFlow';
import { audienceGroupsApi, onboardingApi } from '@/lib/projects/api';
import { reactivationChannelsForProject, seedReactivationRules, toBackendRules, withAppNotificationTokenField } from '@/components/dashboard/audienceGroupRules';
import type { AudienceGroupSchema } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  audienceGroupsApi: { schema: vi.fn(), create: vi.fn() },
  onboardingApi: { get: vi.fn() },
}));

const api = vi.mocked(audienceGroupsApi);
const onboarding = vi.mocked(onboardingApi);

const schema: AudienceGroupSchema = {
  levels: [],
  fields: [
    { key: 'email', label: 'Email', category: 'email', operators: ['available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }] },
    { key: 'fcmToken', label: 'Mobile push token (Android)', category: 'push', operators: ['available', 'not_available'], conditions: [
      { key: 'available', label: 'Is available', value: { type: 'none' } },
      { key: 'not_available', label: 'Is not available', value: { type: 'none' } },
    ] },
    { key: 'apnsToken', label: 'Mobile push token (iOS)', category: 'push', operators: ['available', 'not_available'], conditions: [
      { key: 'available', label: 'Is available', value: { type: 'none' } },
      { key: 'not_available', label: 'Is not available', value: { type: 'none' } },
    ] },
    { key: 'webPush', label: 'Web push', category: 'push', operators: ['available', 'not_available'], conditions: [
      { key: 'available', label: 'Is available', value: { type: 'none' } },
      { key: 'not_available', label: 'Is not available', value: { type: 'none' } },
    ] },
    { key: 'performedEvent', label: 'Performed Event', category: 'event', operators: ['has_performed', 'performed_in_last_30'], conditions: [
      { key: 'has_performed', label: 'Has performed', value: { type: 'text', options: [{ key: 'checkout_started', label: 'Checkout started' }] } },
      { key: 'performed_in_last_30', label: 'Performed in the last 30 days', value: { type: 'text', options: [{ key: 'checkout_started', label: 'Checkout started' }] } },
    ] },
    { key: 'mobileAppUserEvents', label: 'Mobile App User Events', category: 'event', topic: 'engagement', operators: ['is', 'is_not', 'is_any_of', 'is_none_of'], conditions: [
      { key: 'is', label: 'Is', value: { type: 'text', options: [{ key: 'app_opened', label: 'App opened' }] } },
      { key: 'is_not', label: 'Is not', value: { type: 'text', options: [{ key: 'app_opened', label: 'App opened' }] } },
      { key: 'is_any_of', label: 'Is any of', value: { type: 'text', multiple: true, options: [{ key: 'app_opened', label: 'App opened' }, { key: 'purchase', label: 'Purchase' }] } },
      { key: 'is_none_of', label: 'Is none of', value: { type: 'text', multiple: true, options: [{ key: 'app_opened', label: 'App opened' }, { key: 'purchase', label: 'Purchase' }] } },
    ] },
    { key: 'webUserEvents', label: 'Web User Events', category: 'event', topic: 'engagement', operators: ['is', 'is_not', 'is_any_of', 'is_none_of'], conditions: [
      { key: 'is', label: 'Is', value: { type: 'text', options: [{ key: 'page_viewed', label: 'Page viewed' }] } },
      { key: 'is_not', label: 'Is not', value: { type: 'text', options: [{ key: 'page_viewed', label: 'Page viewed' }] } },
      { key: 'is_any_of', label: 'Is any of', value: { type: 'text', multiple: true, options: [{ key: 'page_viewed', label: 'Page viewed' }, { key: 'checkout_started', label: 'Checkout started' }] } },
      { key: 'is_none_of', label: 'Is none of', value: { type: 'text', multiple: true, options: [{ key: 'page_viewed', label: 'Page viewed' }, { key: 'checkout_started', label: 'Checkout started' }] } },
    ] },
    { key: 'emailAction', label: 'Email Action', category: 'email', operators: ['opened'], conditions: [{ key: 'opened', label: 'Opened', value: { type: 'text', options: [{ key: 'campaign_a', label: 'Campaign A' }] } }] },
    { key: 'fcmToken', label: 'FCM Token', category: 'push', operators: ['available', 'not_available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }, { key: 'not_available', label: 'Is not available', value: { type: 'none' } }] },
    { key: 'apnsToken', label: 'APNs Token (iOS without Firebase)', category: 'push', operators: ['available', 'not_available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }, { key: 'not_available', label: 'Is not available', value: { type: 'none' } }] },
    { key: 'lastEmailNotification', label: 'Last Email Sent', category: 'email', operators: ['exclude_in_last_days'], conditions: [{ key: 'exclude_in_last_days', label: 'Exclude users sent an email in the last X days', value: { type: 'integer', required: true, min: 1, unit: 'days' } }] },
    { key: 'lastMobilePushNotification', label: 'Last Mobile Push Sent', category: 'push', operators: ['exclude_in_last_days'], conditions: [{ key: 'exclude_in_last_days', label: 'Exclude users sent a mobile push in the last X days', value: { type: 'integer', required: true, min: 1, unit: 'days' } }] },
    { key: 'lastWebPushNotification', label: 'Last Web Push Sent', category: 'push', operators: ['exclude_in_last_days'], conditions: [{ key: 'exclude_in_last_days', label: 'Exclude users sent a web push in the last X days', value: { type: 'integer', required: true, min: 1, unit: 'days' } }] },
    { key: 'country', label: 'Country', category: 'location', operators: ['equals'], conditions: [{ key: 'equals', label: 'Is', value: { type: 'text', options: [{ key: 'pk', label: 'Pakistan' }] } }] },
    { key: 'region', label: 'Region', category: 'location', topic: 'account_details', operators: ['is'], conditions: [{ key: 'is', label: 'Is', value: { type: 'enum', required: true, options: [] } }] },
    { key: 'customProperty', label: 'Custom property', category: 'custom', operators: ['equals'], property: { required: true, options: [{ key: 'plan', label: 'Plan' }] }, conditions: [{ key: 'equals', label: 'Is', value: { type: 'text', options: [{ key: 'pro', label: 'Pro' }] } }] },
    { key: 'optIn', label: 'Email opt-in', category: 'consent', operators: ['is'], conditions: [{ key: 'is', label: 'Is', value: { type: 'text', options: [{ key: 'true', label: 'Yes' }] } }] },
  ],
  fieldKeys: ['email', 'performedEvent', 'mobileAppUserEvents', 'webUserEvents', 'emailAction', 'country', 'customProperty', 'optIn'],
  logicalOperators: ['AND', 'OR'],
  limits: { maxConditions: 10, maxDepth: 2 },
};

function renderFlow(overrides: { sdkIntegrated?: boolean; trackedEvents?: string[]; withoutConsent?: boolean; emptyProjectData?: boolean; channels?: string[]; platforms?: Array<'mobile' | 'web'>; journeys?: boolean } = {}) {
  let responseSchema = overrides.withoutConsent ? { ...schema, fields: schema.fields.filter(field => field.key !== 'optIn') } : schema;
  if (overrides.journeys) {
    responseSchema = {
      ...responseSchema,
      fields: [...responseSchema.fields, {
        key: 'journeyAutomation', label: 'Journey Automation', category: 'journey', operators: ['is_currently_in', 'has_entered', 'has_never_entered'], conditions: [
          { key: 'is_currently_in', label: 'Is currently in', value: { type: 'reference', options: [{ key: 'journey-a', label: 'Welcome journey' }, { key: 'journey-b', label: 'Retention journey' }] } },
          { key: 'has_entered', label: 'Has entered', value: { type: 'reference', options: [{ key: 'journey-a', label: 'Welcome journey' }, { key: 'journey-b', label: 'Retention journey' }] } },
          { key: 'has_never_entered', label: 'Has never entered', value: { type: 'reference', options: [{ key: 'journey-a', label: 'Welcome journey' }, { key: 'journey-b', label: 'Retention journey' }] } },
        ],
      }],
    } as AudienceGroupSchema;
  }
  if (overrides.emptyProjectData) {
    responseSchema = {
      ...responseSchema,
      fields: responseSchema.fields.map(field => ['performedEvent', 'mobileAppUserEvents', 'webUserEvents', 'emailAction', 'country', 'customProperty'].includes(field.key)
        ? { ...field, property: field.property ? { ...field.property, options: [] } : field.property, conditions: field.conditions.map(condition => ({ ...condition, value: { ...condition.value, options: [] } })) }
        : field),
    };
  }
  api.schema.mockResolvedValue(responseSchema as never);
  onboarding.get.mockResolvedValue({
    projectName: 'Project', platforms: overrides.platforms ?? ['mobile'], websiteUrl: '', androidAppUrl: '', iosAppUrl: '', channels: overrides.channels ?? [], senderEmail: '', domain: '', firebaseChecklist: [], deferredSteps: [], currentStep: 1, completed: [], skipped: false,
  });
  const onCreated = vi.fn();
  return { ...render(<QueryClientProvider client={new QueryClient()}><AudienceGroupAiFlow projectId="p1" sdkIntegrated={overrides.sdkIntegrated ?? true} trackedEvents={overrides.trackedEvents ?? ['checkout_started']} onCancel={vi.fn()} onCreated={onCreated} /></QueryClientProvider>), onCreated };
}

describe('project-aware audience group chat flow', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('shows SDK-dependent goal branches as disabled without SDK events', async () => {
    renderFlow({ sdkIntegrated: false, trackedEvents: [] });
    expect(await screen.findByText('What do you want to group these users for?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Find users who took a specific event action.*Requires SDK integration and tracked product events/ })).toBeDisabled();
    expect(screen.getByText('Target users based on their behavior')).toBeInTheDocument();
    expect(screen.getByText('Something else')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText('Target users based on their behavior'));
    expect(screen.getByText('Product events')).toBeInTheDocument();
    expect(screen.queryByText('Lifecycle segment status')).not.toBeInTheDocument();
    expect(screen.getByText('No journeys available')).toBeInTheDocument();
  });

  it('supports any journey and specific journey scopes before editing journey activity rules', async () => {
    const user = userEvent.setup();
    renderFlow({ journeys: true });
    await user.click(await screen.findByText('Target users based on their behavior'));
    await user.click(screen.getByRole('button', { name: /Journey activity/ }));

    expect(screen.getByText('Which journey scope should we use?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Any journey' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Specific journey' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Any journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Condition field' }));
    await user.click(screen.getByRole('option', { name: 'Journey Automation' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Has entered' }));
    expect(screen.getByText('Any journey')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Which journey scope should we use?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Specific journey' }));
    await user.click(screen.getByRole('combobox', { name: 'Condition field' }));
    await user.click(screen.getByRole('option', { name: 'Journey Automation' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Has entered' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    expect(screen.getByRole('option', { name: 'Welcome journey' })).toBeInTheDocument();
  });

  it('shows lifecycle segment status only after SDK integration', async () => {
    const user = userEvent.setup();
    const integrated = renderFlow({ sdkIntegrated: true, emptyProjectData: true });
    await user.click(await screen.findByText('Target users based on their behavior'));
    expect(screen.getByRole('button', { name: /Lifecycle segment status.*No lifecycle segments available/ })).toBeInTheDocument();

    integrated.unmount();
    renderFlow({ sdkIntegrated: false, emptyProjectData: false });
    await user.click(await screen.findByText('Target users based on their behavior'));
    expect(screen.queryByText('Lifecycle segment status')).not.toBeInTheDocument();
  });

  it('shows mobile and web user events under Engagement with channel event operators', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    await user.click(screen.getByRole('button', { name: /Engagement/ }));
    await user.click(screen.getByRole('option', { name: 'Mobile App User Events' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    expect(screen.getByRole('option', { name: 'Is any of' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Is any of' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    expect(screen.getByRole('option', { name: 'Purchase' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'App opened' })).toBeInTheDocument();
  });

  it('asks for the Something else description before showing relevant rules and preserves it on Back', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Something else'));
    const description = screen.getByPlaceholderText('For example, users who started checkout but did not finish.');
    expect(screen.queryByText(/Conditions for/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Find supported conditions' })).toBeDisabled();
    await user.type(description, 'Users who started checkout but did not finish');
    await user.click(screen.getByRole('button', { name: 'Find supported conditions' }));
    expect(screen.getByText('Conditions for Something else')).toBeInTheDocument();
    expect(screen.getByText(/started checkout but did not finish/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByDisplayValue('Users who started checkout but did not finish')).toBeInTheDocument();
  });

  it('does not treat required metadata as project data when backed options are empty', async () => {
    const user = userEvent.setup();
    renderFlow({ emptyProjectData: true });
    expect(await screen.findByRole('button', { name: /Find users who took a specific event action.*No tracked product events yet/ })).toBeDisabled();
    await user.click(await screen.findByText('Target users based on their behavior'));
    expect(screen.getByRole('button', { name: /Product events.*No tracked events yet/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Lifecycle segment status.*No lifecycle segments available/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Journey activity.*No journeys available/ })).toBeDisabled();
  });

  it('starts with no seeded conditions and lets a none-valued operator review immediately', async () => {
    const user = userEvent.setup();
    api.create.mockResolvedValue({ id: 'none-group', name: 'Email-ready users', description: null, rules: {}, memberCount: 1, createdAt: '', updatedAt: '' });
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    expect(screen.getByRole('button', { name: /Reachability.*Email opt-in/ })).toBeInTheDocument();
    expect(screen.queryByText('Use the project fields available for this category.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reachability/ }));
    expect(screen.getByText('Conditions for Reachability')).toBeInTheDocument();
    expect(screen.getByText('Selected goal: Group users by profile details')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Email' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is available' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    expect(screen.getAllByRole('combobox')[0]).toHaveAttribute('aria-label', 'Condition field');
    await user.click(screen.getByRole('button', { name: 'AND condition' }));
    await user.keyboard('{Escape}');
    expect(screen.getByText('Choose a field, or remove this incomplete condition.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Remove condition' })[1]);
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.clear(screen.getByRole('textbox', { name: 'Group name' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Email-ready users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', expect.objectContaining({ rules: { operator: 'AND', conditions: [{ field: 'email', operator: 'available' }] } })));
  });

  it('shows Home AI more options in a right-side picker and keeps selected fields functional', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    await user.click(screen.getByRole('button', { name: /Engagement/ }));
    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(screen.getByPlaceholderText('Search all properties...')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Region' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Email' }));
    expect(screen.getByRole('combobox', { name: 'Condition field' })).toHaveTextContent('Email');
    expect(screen.getByRole('combobox', { name: 'Condition operator' })).toBeInTheDocument();
  });

  it('renders each channel notification recency as a fixed sentence with positive whole-number validation', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    await user.click(screen.getByRole('button', { name: /Reachability/ }));
    await user.click(screen.getByRole('option', { name: 'Last Email Sent' }));

    expect(screen.getByText('Exclude users sent an email in the last')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Condition operator' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();

    const days = screen.getByRole('spinbutton', { name: 'Last Email Sent days' });
    await user.type(days, '0');
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();
    await user.clear(days);
    await user.type(days, '7');
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    expect(screen.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue('Users matching these conditions: Exclude users sent an email in the last 7 days.');
  });

  it('does not expose custom properties and combines mobile notification tokens', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    expect(screen.queryByRole('button', { name: /Custom properties/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reachability/ }));
    expect(screen.getByRole('option', { name: 'Mobile push' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'FCM Token' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'APNs Token (iOS without Firebase)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Last Emailed' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Email Sent' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Mobile Push Sent' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Web Push Sent' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Last Notified' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Custom property' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Mobile push' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is available' }));
    api.create.mockResolvedValue({ id: 'mobile-group', name: 'Mobile users', description: null, rules: {}, memberCount: 1, createdAt: '', updatedAt: '' });
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.clear(screen.getByRole('textbox', { name: 'Group name' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Mobile users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', expect.objectContaining({
      rules: {
        operator: 'AND',
        conditions: [{
          operator: 'OR',
          conditions: [
            { field: 'fcmToken', operator: 'available' },
            { field: 'apnsToken', operator: 'available' },
          ],
        }],
      },
    })));
  });

  it('keeps review disabled and explains an incomplete required-value row', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Find users who took a specific event action'));
    await user.click(screen.getByRole('combobox', { name: 'Condition field' }));
    await user.click(screen.getByRole('option', { name: 'Performed Event' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Has performed' }));
    expect(screen.getByText(/Choose an operator and a required value/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();
  });

  it('uses only schema fields and values, supports AND conditions, and creates the exact rules payload', async () => {
    const user = userEvent.setup();
    api.create.mockResolvedValue({ id: 'g1', name: 'Checkout users', description: null, rules: {}, memberCount: 4, createdAt: '', updatedAt: '' });
    const view = renderFlow({ withoutConsent: true });
    await user.click(await screen.findByText('Find users who took a specific event action'));
    expect(screen.queryByText('Email Action')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Condition field' }));
    await user.click(screen.getByRole('option', { name: 'Performed Event' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Has performed' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(screen.getByRole('option', { name: 'Checkout started' }));
    await user.click(screen.getByRole('button', { name: 'AND condition' }));
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(3);
    await user.click(screen.getAllByRole('button', { name: 'Remove condition' })[1]);
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.clear(screen.getByRole('textbox', { name: 'Group name' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Checkout users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', {
      name: 'Checkout users',
      description: 'Users matching these conditions: Performed Event Has performed Checkout started.',
      rules: { operator: 'AND', conditions: [{ field: 'performedEvent', operator: 'has_performed', value: 'checkout_started' }] },
    }));
    expect(await screen.findByText('Audience group created')).toBeInTheDocument();
    expect(screen.getByText(/4 matching users/)).toBeInTheDocument();
    expect(view.onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1', memberCount: 4 }));
  });

  it('requires a group name before creation and preserves OR serialization', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    await user.click(screen.getByRole('button', { name: /Account Details/ }));
    await user.click(screen.getByRole('option', { name: 'Country' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(screen.getByRole('option', { name: 'Pakistan' }));
    await user.click(screen.getByRole('button', { name: 'OR group' }));
    await user.click(screen.getByRole('option', { name: 'Country' }));
    await user.click(screen.getAllByRole('combobox')[4]);
    await user.click(screen.getByRole('option', { name: 'Is' }));
    await user.click(screen.getAllByRole('combobox')[5]);
    await user.click(screen.getByRole('option', { name: 'Pakistan' }));
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.clear(screen.getByRole('textbox', { name: 'Group name' }));
    expect(screen.getByRole('button', { name: 'Create audience group' })).toBeDisabled();
    expect(api.create).not.toHaveBeenCalled();
    api.create.mockResolvedValue({ id: 'g2', name: 'Pakistan users', description: null, rules: {}, memberCount: 2, createdAt: '', updatedAt: '' });
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Pakistan users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', expect.objectContaining({ rules: { operator: 'OR', conditions: [
      { operator: 'AND', conditions: [{ field: 'country', operator: 'equals', value: 'pk' }] },
      { operator: 'AND', conditions: [{ field: 'country', operator: 'equals', value: 'pk' }] },
    ] } })));
  });

  it('gates campaign scope and consent targeting on schema capabilities', async () => {
    const user = userEvent.setup();
    const first = renderFlow();
    await user.click(await screen.findByText('Follow up with users from a campaign'));
    expect(screen.getByText('Any campaign')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Specific campaign' })).toBeDisabled();
    expect(screen.getByText(/No specific campaigns are available yet/)).toBeInTheDocument();
    first.unmount();
    const second = renderFlow({ emptyProjectData: true });
    await user.click(await screen.findByText('Follow up with users from a campaign'));
    expect(screen.getByRole('button', { name: 'Specific campaign' })).toBeDisabled();
    expect(screen.getByText(/No specific campaigns are available yet/)).toBeInTheDocument();
    second.unmount();
    renderFlow({ withoutConsent: true });
    await user.click(await screen.findByText('Reactivate users'));
    expect(screen.queryByText(/Consent or opt-in targeting is not shown/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Deleted-account targeting is available/)).not.toBeInTheDocument();
  });

  it.each([
    { label: 'email only', channels: ['email'], expected: [{ operator: 'AND', conditions: [{ field: 'email', operator: 'available' }, { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' }] }] },
    { label: 'email and mobile push', channels: ['email', 'mobile-push'], expected: [{ operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' },
      { operator: 'OR', conditions: [{ field: 'fcmToken', operator: 'available' }, { field: 'apnsToken', operator: 'available' }] },
      { field: 'lastMobilePushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] }] },
    { label: 'email, mobile push, and web push', channels: ['email', 'mobile-push', 'web-push'], expected: [{ operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' },
      { operator: 'OR', conditions: [{ field: 'fcmToken', operator: 'available' }, { field: 'apnsToken', operator: 'available' }] },
      { field: 'lastMobilePushNotification', operator: 'exclude_in_last_days', value: '30' },
      { field: 'webPush', operator: 'available' },
      { field: 'lastWebPushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] }] },
    { label: 'email and web push', channels: ['email', 'web-push'], expected: [{ operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' },
      { field: 'webPush', operator: 'available' },
      { field: 'lastWebPushNotification', operator: 'exclude_in_last_days', value: '30' },
      { operator: 'AND', conditions: [{ field: 'fcmToken', operator: 'not_available' }, { field: 'apnsToken', operator: 'not_available' }] },
      { field: 'lastMobilePushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] }] },
    { label: 'mobile push only', channels: ['mobile-push'], expected: [{ operator: 'AND', conditions: [
      { operator: 'OR', conditions: [{ field: 'fcmToken', operator: 'available' }, { field: 'apnsToken', operator: 'available' }] },
      { field: 'lastMobilePushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] }] },
    { label: 'web push only', channels: ['web-push'], expected: [{ operator: 'AND', conditions: [{ field: 'webPush', operator: 'available' }, { field: 'lastWebPushNotification', operator: 'exclude_in_last_days', value: '30' }] }] },
  ])('seeds schema-backed reactivation rules for $label', ({ channels, expected }) => {
    const combinedSchema = withAppNotificationTokenField(schema);
    const schemaForChannels = channels.includes('email') && channels.includes('mobile-push')
      ? {
        ...combinedSchema,
        fields: [...combinedSchema.fields, {
          key: 'emailCampaign', label: 'Email Campaign', category: 'email', topic: 'automation_campaigns', operators: ['never_belonged_to_campaign'],
          conditions: [{ key: 'never_belonged_to_campaign', label: 'Never Belonged to Campaign', value: { type: 'reference' as const, required: true, options: [{ key: 'campaign-1', label: 'Welcome email' }] } }],
        }],
      }
      : combinedSchema;
    const result = seedReactivationRules(schemaForChannels as never, channels as never);
    expect(result.unavailable).toEqual([]);
    const backendRules = toBackendRules(result.blocks, schemaForChannels as never);
    if (channels.includes('email') && channels.includes('mobile-push')) {
      expect(result.blocks).toHaveLength(2);
      expect(backendRules).toMatchObject({
        operator: 'OR',
        conditions: [
          expected[0],
          {
            operator: 'AND',
            conditions: [
              { field: 'email', operator: 'available' },
              { field: 'emailCampaign', operator: 'never_belonged_to_campaign', value: 'campaign-1' },
            ],
          },
        ],
      });
    } else {
      expect(backendRules).toEqual(expected.length === 1 ? expected[0] : { operator: 'OR', conditions: expected });
    }
  });

  it('adds the email re-entry OR branch when all three delivery channels are selected', () => {
    const emailCampaign = {
      key: 'emailCampaign', label: 'Email Campaign', category: 'email', topic: 'automation_campaigns', operators: ['never_belonged_to_campaign'],
      conditions: [{ key: 'never_belonged_to_campaign', label: 'Never Belonged to Campaign', value: { type: 'reference' as const, required: true, options: [{ key: 'campaign-1', label: 'Welcome email' }] } }],
    };
    const combinedSchema = withAppNotificationTokenField({ ...schema, fields: [...schema.fields, emailCampaign] });
    const result = seedReactivationRules(combinedSchema, ['email', 'mobile-push', 'web-push']);

    expect(result.unavailable).toEqual([]);
    expect(result.blocks).toHaveLength(2);
    expect(toBackendRules(result.blocks, combinedSchema)).toMatchObject({
      operator: 'OR',
      conditions: [
        expect.objectContaining({ operator: 'AND' }),
        {
          operator: 'AND',
          conditions: [
            { field: 'email', operator: 'available' },
            { field: 'emailCampaign', operator: 'never_belonged_to_campaign', value: 'campaign-1' },
          ],
        },
      ],
    });
  });

  it('uses one combined mobile-push rule and selects availability without blank rows', () => {
    const result = seedReactivationRules(withAppNotificationTokenField(schema), ['email', 'mobile-push']);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].rules.every(rule => rule.filter && rule.operator)).toBe(true);
    expect(result.blocks[0].rules.map(rule => rule.filter)).toEqual(['email', 'lastEmailNotification', 'appNotificationToken', 'lastMobilePushNotification']);
  });

  it('does not seed separate provider token fields when a combined mobile-push rule is unavailable', () => {
    const splitProviderSchema = { ...schema, fields: schema.fields.filter(field => !['fcmToken', 'apnsToken'].includes(field.key)) };
    const result = seedReactivationRules(splitProviderSchema, ['mobile-push']);
    expect(result.unavailable).toContain('Mobile push');
    expect(result.blocks).toHaveLength(0);
  });

  it('reports missing channel schema support without adding invalid conditions', () => {
    const withoutPush = { ...schema, fields: schema.fields.filter(field => !['fcmToken', 'apnsToken', 'webPush'].includes(field.key)) };
    const result = seedReactivationRules(withoutPush as never, ['email', 'mobile-push', 'web-push']);
    expect(result.unavailable).toEqual(['Mobile push', 'Web push', 'Email campaign re-entry condition']);
    expect(toBackendRules(result.blocks, withoutPush as never)).toEqual({ operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' },
    ] });
  });

  it('uses saved product types to expand legacy push and ignores channels for unselected products', () => {
    expect(reactivationChannelsForProject(['mobile', 'web'], ['email', 'push'])).toEqual(['email', 'mobile-push', 'web-push']);
    expect(reactivationChannelsForProject(['mobile'], ['web-push'])).toEqual([]);
    expect(reactivationChannelsForProject(['web'], ['push'])).toEqual(['web-push']);
  });

  it('preserves edited reactivation defaults after Back and re-entry, and saves the reviewed rules', async () => {
    const user = userEvent.setup();
    api.create.mockResolvedValue({ id: 'reactivation-group', name: 'Inactive email users', description: null, rules: {}, memberCount: 3, createdAt: '', updatedAt: '' });
    renderFlow({ channels: ['email'] });
    await user.click(await screen.findByText('Reactivate users'));
    const days = await screen.findByRole('spinbutton', { name: 'Last Email Sent days' });
    expect(days).toHaveValue(30);
    await user.clear(days);
    await user.type(days, '45');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    await user.click(screen.getByText('Reactivate users'));
    expect(await screen.findByRole('spinbutton', { name: 'Last Email Sent days' })).toHaveValue(45);
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    expect(screen.getByRole('textbox', { name: 'Group name' })).toHaveValue('Reactivation audience');
    expect(screen.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue('Users matching these conditions: Email Is available and Exclude users sent an email in the last 45 days.');
    await user.clear(screen.getByRole('textbox', { name: 'Group name' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Inactive email users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', expect.objectContaining({ rules: { operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '45' },
    ] } })));
  });

  it('does not auto-open the condition picker for Reactivation when channel settings are unavailable or empty', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Reactivate users'));

    const picker = document.querySelector<HTMLButtonElement>('button[aria-label="Condition field"]');
    expect(picker).not.toBeNull();
    expect(picker).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('option', { name: 'Email' })).not.toBeInTheDocument();
  });

  it('seeds only email availability and email recency when Email is the only selected channel', () => {
    const emailCampaign = {
      key: 'emailCampaign', label: 'Email Campaign', category: 'email', topic: 'automation_campaigns', operators: ['never_belonged_to_campaign'],
      conditions: [{ key: 'never_belonged_to_campaign', label: 'Never Belonged to Campaign', value: { type: 'reference' as const, options: [{ key: 'campaign-1', label: 'Welcome email' }] } }],
    };
    const emailOnlySchema = { ...schema, fields: [...schema.fields, emailCampaign] };
    const result = seedReactivationRules(emailOnlySchema, ['email']);

    expect(result.unavailable).toEqual([]);
    expect(result.blocks).toHaveLength(1);
    expect(toBackendRules(result.blocks, emailOnlySchema)).toEqual({ operator: 'AND', conditions: [
      { field: 'email', operator: 'available' },
      { field: 'lastEmailNotification', operator: 'exclude_in_last_days', value: '30' },
    ] });
    expect(result.blocks.flatMap(block => block.rules).some(rule => rule.filter === 'emailCampaign')).toBe(false);
    expect(result.blocks.flatMap(block => block.rules).some(rule => rule.filter === 'appNotificationToken' || rule.filter === 'webPush')).toBe(false);
  });

  it('seeds only mobile push availability and mobile push recency when Mobile push is the only selected channel', () => {
    const result = seedReactivationRules(withAppNotificationTokenField(schema), ['mobile-push']);

    expect(result.unavailable).toEqual([]);
    expect(result.blocks).toHaveLength(1);
    expect(toBackendRules(result.blocks, withAppNotificationTokenField(schema))).toEqual({ operator: 'AND', conditions: [
      { operator: 'OR', conditions: [
        { field: 'fcmToken', operator: 'available' },
        { field: 'apnsToken', operator: 'available' },
      ] },
      { field: 'lastMobilePushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] });
    expect(result.blocks.flatMap(block => block.rules).some(rule => ['email', 'lastEmailNotification', 'webPush', 'emailCampaign'].includes(rule.filter))).toBe(false);
  });

  it('seeds only web push availability and web push recency when Web push is the only selected channel', () => {
    const result = seedReactivationRules(withAppNotificationTokenField(schema), ['web-push']);

    expect(result.unavailable).toEqual([]);
    expect(result.blocks).toHaveLength(1);
    expect(toBackendRules(result.blocks, withAppNotificationTokenField(schema))).toEqual({ operator: 'AND', conditions: [
      { field: 'webPush', operator: 'available' },
      { field: 'lastWebPushNotification', operator: 'exclude_in_last_days', value: '30' },
    ] });
    expect(result.blocks.flatMap(block => block.rules).some(rule => ['email', 'lastEmailNotification', 'appNotificationToken', 'lastMobilePushNotification', 'emailCampaign'].includes(rule.filter))).toBe(false);
  });

  it('shows Mobile push available when Email and Mobile push are both selected', async () => {
    const user = userEvent.setup();
    renderFlow({ channels: ['email', 'mobile-push'] });
    await user.click(await screen.findByText('Reactivate users'));
    await user.keyboard('{Escape}');

    expect(screen.getAllByRole('combobox', { name: 'Condition field' })).toHaveLength(4);
    expect(screen.getByText('Mobile push')).toBeInTheDocument();
    expect(screen.getAllByText('Is available')).toHaveLength(2);
  });

  it('uses the schema’s combined Mobile push field and selects its availability operator', () => {
    const mobilePush = {
      key: 'mobilePush', label: 'Mobile push', category: 'push', operators: ['available', 'not_available'],
      conditions: [
        { key: 'available', label: 'Is available', value: { type: 'none' as const } },
        { key: 'not_available', label: 'Is not available', value: { type: 'none' as const } },
      ],
    };
    const combinedSchema = { ...schema, fields: [...schema.fields.filter(field => !['fcmToken', 'apnsToken'].includes(field.key)), mobilePush] };
    const result = seedReactivationRules(combinedSchema, ['email', 'mobile-push']);

    expect(result.unavailable).toEqual(['Email campaign re-entry condition']);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].rules.map(rule => [rule.filter, rule.operator])).toEqual([
      ['email', 'available'],
      ['lastEmailNotification', 'exclude_in_last_days'],
      ['mobilePush', 'available'],
      ['lastMobilePushNotification', 'exclude_in_last_days'],
    ]);
  });
});
