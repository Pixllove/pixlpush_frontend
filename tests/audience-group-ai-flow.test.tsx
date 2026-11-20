import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AudienceGroupAiFlow from '@/components/dashboard/AudienceGroupAiFlow';
import { audienceGroupsApi } from '@/lib/projects/api';
import type { AudienceGroupSchema } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  audienceGroupsApi: { schema: vi.fn(), create: vi.fn() },
}));

const api = vi.mocked(audienceGroupsApi);

const schema: AudienceGroupSchema = {
  levels: [],
  fields: [
    { key: 'email', label: 'Email', category: 'email', operators: ['available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }] },
    { key: 'performedEvent', label: 'Performed Event', category: 'event', operators: ['has_performed', 'performed_in_last_30'], conditions: [
      { key: 'has_performed', label: 'Has performed', value: { type: 'text', options: [{ key: 'checkout_started', label: 'Checkout started' }] } },
      { key: 'performed_in_last_30', label: 'Performed in the last 30 days', value: { type: 'text', options: [{ key: 'checkout_started', label: 'Checkout started' }] } },
    ] },
    { key: 'emailAction', label: 'Email Action', category: 'email', operators: ['opened'], conditions: [{ key: 'opened', label: 'Opened', value: { type: 'text', options: [{ key: 'campaign_a', label: 'Campaign A' }] } }] },
    { key: 'fcmToken', label: 'FCM Token', category: 'push', operators: ['available', 'not_available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }, { key: 'not_available', label: 'Is not available', value: { type: 'none' } }] },
    { key: 'apnsToken', label: 'APNs Token (iOS without Firebase)', category: 'push', operators: ['available', 'not_available'], conditions: [{ key: 'available', label: 'Is available', value: { type: 'none' } }, { key: 'not_available', label: 'Is not available', value: { type: 'none' } }] },
    { key: 'lastPushNotification', label: 'Last Push Notification', category: 'push', operators: ['exclude_in_last_days'], conditions: [{ key: 'exclude_in_last_days', label: 'Exclude users sent a push in the last X days', value: { type: 'integer', required: true, min: 0, unit: 'days' } }] },
    { key: 'lastNotified', label: 'Last Notified', category: 'account', operators: ['exclude_in_last_days'], conditions: [{ key: 'exclude_in_last_days', label: 'Exclude users notified in the last X days', value: { type: 'integer', required: true, min: 1, unit: 'days' } }] },
    { key: 'country', label: 'Country', category: 'location', operators: ['equals'], conditions: [{ key: 'equals', label: 'Is', value: { type: 'text', options: [{ key: 'pk', label: 'Pakistan' }] } }] },
    { key: 'customProperty', label: 'Custom property', category: 'custom', operators: ['equals'], property: { required: true, options: [{ key: 'plan', label: 'Plan' }] }, conditions: [{ key: 'equals', label: 'Is', value: { type: 'text', options: [{ key: 'pro', label: 'Pro' }] } }] },
    { key: 'optIn', label: 'Email opt-in', category: 'consent', operators: ['is'], conditions: [{ key: 'is', label: 'Is', value: { type: 'text', options: [{ key: 'true', label: 'Yes' }] } }] },
  ],
  fieldKeys: ['email', 'performedEvent', 'emailAction', 'country', 'customProperty', 'optIn'],
  logicalOperators: ['AND', 'OR'],
  limits: { maxConditions: 10, maxDepth: 2 },
};

function renderFlow(overrides: { sdkIntegrated?: boolean; trackedEvents?: string[]; withoutConsent?: boolean; emptyProjectData?: boolean } = {}) {
  let responseSchema = overrides.withoutConsent ? { ...schema, fields: schema.fields.filter(field => field.key !== 'optIn') } : schema;
  if (overrides.emptyProjectData) {
    responseSchema = {
      ...responseSchema,
      fields: responseSchema.fields.map(field => ['performedEvent', 'emailAction', 'country', 'customProperty'].includes(field.key)
        ? { ...field, property: field.property ? { ...field.property, options: [] } : field.property, conditions: field.conditions.map(condition => ({ ...condition, value: { ...condition.value, options: [] } })) }
        : field),
    };
  }
  api.schema.mockResolvedValue(responseSchema as never);
  const onCreated = vi.fn();
  return { ...render(<QueryClientProvider client={new QueryClient()}><AudienceGroupAiFlow projectId="p1" sdkIntegrated={overrides.sdkIntegrated ?? true} trackedEvents={overrides.trackedEvents ?? ['checkout_started']} onCancel={vi.fn()} onCreated={onCreated} /></QueryClientProvider>), onCreated };
}

describe('project-aware audience group chat flow', () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it('shows the goal branches and hides event targeting without SDK events', async () => {
    renderFlow({ sdkIntegrated: false, trackedEvents: [] });
    expect(await screen.findByText('What do you want to group these users for?')).toBeInTheDocument();
    expect(screen.queryByText('Find users who took a specific event action')).not.toBeInTheDocument();
    expect(screen.getByText('Target users based on their behavior')).toBeInTheDocument();
    expect(screen.getByText('Something else')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByText('Target users based on their behavior'));
    expect(screen.getByText('Product events')).toBeInTheDocument();
    expect(screen.getByText('No lifecycle segments available')).toBeInTheDocument();
    expect(screen.getByText('No journeys available')).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByDisplayValue('Users who started checkout but did not finish')).toBeInTheDocument();
  });

  it('does not treat required metadata as project data when backed options are empty', async () => {
    const user = userEvent.setup();
    renderFlow({ emptyProjectData: true });
    expect(screen.queryByText('Find users who took a specific event action')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /Reachability & engagement/ }));
    expect(screen.getByText('Conditions for Reachability & engagement')).toBeInTheDocument();
    expect(screen.getByText('Selected goal: Group users by profile details')).toBeInTheDocument();
    expect(screen.getByText('No conditions selected yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Email' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is available' }));
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    expect(screen.getAllByRole('combobox')[0]).toHaveAttribute('aria-label', 'Condition field');
    await user.click(screen.getByRole('button', { name: 'AND condition' }));
    expect(screen.getByText('Choose a field, or remove this incomplete condition.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();
    await user.click(screen.getAllByRole('button', { name: 'Remove condition' })[1]);
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Email-ready users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', expect.objectContaining({ rules: { operator: 'AND', conditions: [{ field: 'email', operator: 'available' }] } })));
  });

  it('renders Last Notified as a fixed sentence with positive whole-number validation', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    await user.click(screen.getByRole('button', { name: /Reachability & engagement/ }));
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Last Notified' }));

    expect(screen.getByText('Exclude users notified in the last')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Condition operator' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();

    const days = screen.getByRole('spinbutton', { name: 'Last Notified days' });
    await user.type(days, '0');
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeDisabled();
    await user.clear(days);
    await user.type(days, '7');
    expect(screen.getByRole('button', { name: 'Review rules' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    expect(screen.getByText(/Exclude users notified in the last 7 days/)).toBeInTheDocument();
  });

  it('does not expose custom properties and combines mobile notification tokens', async () => {
    const user = userEvent.setup();
    renderFlow();
    await user.click(await screen.findByText('Group users by profile details'));
    expect(screen.queryByRole('button', { name: /Custom properties/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reachability & engagement/ }));
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.click(screen.getAllByRole('combobox')[0]);
    expect(screen.getByRole('option', { name: 'App Notification Token (FCM & APNs)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'FCM Token' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'APNs Token (iOS without Firebase)' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Last Emailed' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Last Push Notification' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Custom property' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'App Notification Token (FCM & APNs)' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is available' }));
    api.create.mockResolvedValue({ id: 'mobile-group', name: 'Mobile users', description: null, rules: {}, memberCount: 1, createdAt: '', updatedAt: '' });
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
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
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.click(screen.getAllByRole('combobox')[0]);
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
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    const selects = screen.getAllByRole('combobox');
    await user.click(selects[0]);
    await user.click(screen.getByRole('option', { name: 'Performed Event' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Has performed' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(screen.getByRole('option', { name: 'Checkout started' }));
    await user.click(screen.getByRole('button', { name: 'AND condition' }));
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(3);
    await user.click(screen.getAllByRole('button', { name: 'Remove condition' })[1]);
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
    await user.type(screen.getByRole('textbox', { name: 'Group name' }), 'Checkout users');
    await user.click(screen.getByRole('button', { name: 'Create audience group' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', {
      name: 'Checkout users',
      description: undefined,
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
    await user.click(screen.getByRole('button', { name: /Profile & location/ }));
    await user.click(screen.getByRole('button', { name: 'Add condition' }));
    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: 'Country' }));
    await user.click(screen.getAllByRole('combobox')[1]);
    await user.click(screen.getByRole('option', { name: 'Is' }));
    await user.click(screen.getAllByRole('combobox')[2]);
    await user.click(screen.getByRole('option', { name: 'Pakistan' }));
    await user.click(screen.getByRole('button', { name: 'OR group' }));
    await user.click(screen.getAllByRole('combobox')[3]);
    await user.click(screen.getByRole('option', { name: 'Country' }));
    await user.click(screen.getAllByRole('combobox')[4]);
    await user.click(screen.getByRole('option', { name: 'Is' }));
    await user.click(screen.getAllByRole('combobox')[5]);
    await user.click(screen.getByRole('option', { name: 'Pakistan' }));
    await user.click(screen.getByRole('button', { name: 'Review rules' }));
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
    expect(screen.getByText(/Specific campaign filtering is unavailable/)).toBeInTheDocument();
    first.unmount();
    renderFlow({ withoutConsent: true });
    await user.click(await screen.findByText('Reactivate users'));
    expect(screen.getByText(/Consent or opt-in targeting is not shown/)).toBeInTheDocument();
    expect(screen.queryByText(/Deleted-account targeting is available/)).not.toBeInTheDocument();
  });
});
