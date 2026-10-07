import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JourneyBuilder from '@/components/dashboard/JourneyBuilder';
import JourneyWorkspace from '@/components/dashboard/JourneyWorkspace';
import { audienceGroupsApi, emailApi, journeysApi, lifecycleSegmentsApi, pushApi } from '@/lib/projects/api';
import { ENTRANCE, EXIT, fromJourney, toJourneyInput, type BuilderState } from '@/lib/journeys';
import type { Journey, JourneyListItem } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  journeysApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), action: vi.fn() },
  lifecycleSegmentsApi: { list: vi.fn() },
  audienceGroupsApi: { list: vi.fn() },
  emailApi: { templates: { list: vi.fn() } },
  pushApi: { templates: { list: vi.fn() } },
}));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'p1', role: 'owner' } }) }));
const router = { push: vi.fn(), replace: vi.fn() };
let search = '';
vi.mock('next/navigation', () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams(search) }));

const api = vi.mocked(journeysApi);
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const block = (id: string, type: BuilderState['blocks'][number]['type']) => ({ id, type, title: type, description: '' });

const state = (): BuilderState => ({
  name: 'Onboarding',
  entranceConfig: { lifecycle: 'seg1', audience: '', allUsers: false },
  blocks: [ENTRANCE, block('push1', 'notification'), block('cond1', 'condition'), block('wait1', 'wait'), block('rep1', 'repeat_journey'), EXIT],
  branches: { cond1: { yes: [block('mail1', 'email')], no: [] } },
  settings: { push1: { template: 'tplPush' }, mail1: { template: 'tplMail' }, wait1: { amount: '2', unit: 'hours' }, exit: { 'Segment change': 'yes' } },
  conditionValues: { cond1: ['Push notification was not clicked'] },
});

beforeEach(() => {
  vi.clearAllMocks();
  search = '';
  vi.mocked(lifecycleSegmentsApi.list).mockResolvedValue([{ id: 'seg1', name: 'New users' }] as never);
  vi.mocked(audienceGroupsApi.list).mockResolvedValue([{ id: 'grp1', name: 'At-risk customers' }] as never);
  vi.mocked(emailApi.templates.list).mockResolvedValue({ items: [{ id: 'tplMail', name: 'Welcome email', subject: 'Welcome aboard' }] } as never);
  vi.mocked(pushApi.templates.list).mockResolvedValue({ items: [{ id: 'tplPush', name: 'Welcome push', title: 'Hi there', body: 'Come back today' }] } as never);
});

describe('builder ↔ API mapping', () => {
  it('flattens branches into forward jumps and saves every block, including repeat', () => {
    const input = toJourneyInput(state());
    expect(input).toMatchObject({ name: 'Onboarding', trigger: 'audience', audience: { lifecycleSegmentIds: ['seg1'] }, exitOnAudienceLeave: true, exitRules: [] });
    expect(input.steps.map((step) => [step.key, step.type])).toEqual([['push1', 'push'], ['cond1', 'condition'], ['mail1', 'email'], ['wait1', 'delay'], ['rep1', 'repeat'], ['exit', 'exit']]);
    const condition = input.steps[1]!;
    // "was not clicked" is the same check turned round, so Yes stays Yes
    expect(condition.condition).toEqual({ kind: 'engagement', stepKey: 'push1', action: 'push_opened', waitHours: 0, negate: true });
    expect([condition.onTrue, condition.onFalse]).toEqual(['mail1', 'wait1']);
    expect(input.steps[2]).toMatchObject({ templateId: 'tplMail', next: 'wait1', meta: { branchOf: 'cond1', branch: 'yes' } });
    expect(input.steps[3]).toMatchObject({ amount: 2, unit: 'hours' });
    expect(input.steps[4]).toMatchObject({ count: 5, amount: 1, unit: 'days' });
  });

  it('sends several rules as one group, a send time per user, exit rules and the email\'s own subject', () => {
    const s = state();
    s.blocks = [ENTRANCE, block('mail0', 'email'), block('cond1', 'condition'), block('at9', 'specific_time'), EXIT];
    s.branches = {};
    s.conditionValues = { cond1: ['Email was opened', 'Link in email was not clicked'] };
    s.settings = { mail0: { template: 'tplMail', subject: ' Hello {{firstName}} ', fromName: 'Team' }, cond1: { match: 'all' }, at9: { time: '18:30' }, exit: { 'Opened email': 'yes', 'Email opt out': 'yes', 'Disabled special email offers': 'yes', 'Paused account': 'no' } };
    const input = toJourneyInput(s);
    expect(input.steps[0]).toMatchObject({ type: 'email', subject: 'Hello {{firstName}}', fromName: 'Team' });
    expect(input.steps[1]!.condition).toEqual({ kind: 'group', operator: 'AND', conditions: [
      { kind: 'engagement', stepKey: 'mail0', action: 'email_opened', waitHours: 0 },
      { kind: 'engagement', stepKey: 'mail0', action: 'email_clicked', waitHours: 0, negate: true },
    ] });
    expect(input.steps[2]).toMatchObject({ type: 'delay', time: '18:30', utcOffset: -new Date().getTimezoneOffset() });
    expect(input.steps[2]).not.toHaveProperty('until');
    expect(input.exitRules).toEqual(['email_opened', 'email_unsubscribed']);
    expect(input.exitOnAudienceLeave).toBe(false);
  });

  it('asks a reachability question when no message comes before the condition', () => {
    const s = state();
    s.blocks = [ENTRANCE, block('cond1', 'condition'), block('push1', 'notification'), EXIT];
    s.branches = {};
    s.conditionValues = { cond1: ['Email available', 'FCM token not available'] };
    s.settings.cond1 = { match: 'all' };
    expect(toJourneyInput(s).steps[0]!.condition).toEqual({ kind: 'audience', rules: { operator: 'AND', conditions: [{ field: 'email', operator: 'exists' }, { field: 'pushEnabled', operator: 'equals', value: false }] } });
  });

  it('refuses to save an incomplete journey with a sentence for the user', () => {
    const noAudience = state(); noAudience.entranceConfig.lifecycle = '';
    expect(() => toJourneyInput(noAudience)).toThrow(/who enters/);
    const noTemplate = state(); noTemplate.settings.push1 = {};
    expect(() => toJourneyInput(noTemplate)).toThrow(/Select a template/);
  });

  it('a saved journey comes back as the same canvas', () => {
    const input = toJourneyInput(state());
    const back = fromJourney({ ...input, id: 'j1', status: 'paused', displayStatus: 'paused', messageType: 'mixed', createdAt: '', activatedAt: null, steps: input.steps.map((step) => ({ ...step, stats: { sent: 4 } })) } as Journey);
    expect(back.status).toBe('Paused');
    expect(back.entranceConfig).toEqual({ lifecycle: 'seg1', audience: '', allUsers: false });
    expect(back.blocks.map((b) => [b.id, b.type])).toEqual([['entrance', 'entrance'], ['push1', 'notification'], ['cond1', 'condition'], ['wait1', 'wait'], ['rep1', 'repeat_journey'], ['exit', 'exit']]);
    expect(back.settings.rep1).toMatchObject({ count: '5', interval: '1', unit: 'days' });
    expect(back.branches.cond1!.yes.map((b) => b.id)).toEqual(['mail1']);
    expect(back.settings.push1).toMatchObject({ template: 'tplPush' });
    expect(back.conditionValues.cond1).toEqual(['Push notification was not clicked']);
    expect(back.blocks[1]!.stats).toEqual({ sent: 4 });
  });
});

const item = (over: Partial<JourneyListItem>): JourneyListItem => ({
  id: 'j1', name: 'Onboarding', status: 'active', displayStatus: 'running', messageType: 'push', trigger: 'audience', audience: {},
  createdAt: '2026-10-01T10:00:00.000Z', activatedAt: '2026-10-02T10:00:00.000Z', started: 1200, active: 3, completed: 900, exited: 2, ...over,
});

describe('journey list', () => {
  beforeEach(() => {
    api.list.mockResolvedValue({ items: [item({}), item({ id: 'j2', name: 'Winback', status: 'draft', displayStatus: 'draft', messageType: 'email', activatedAt: null, started: 0, completed: 0 })], total: 2, page: 1, limit: 25, counts: { all: 2, running: 1, draft: 1, paused: 0, scheduled: 0 } });
    api.action.mockResolvedValue({} as never);
    api.remove.mockResolvedValue(undefined);
  });

  it('shows real journeys and tab counts, and filters on the server', async () => {
    wrap(<JourneyWorkspace />);
    const row = (await screen.findByText('Onboarding')).closest('tr')!;
    expect(within(row).getByText('Running')).toBeInTheDocument();
    expect(within(row).getByText('1,200')).toBeInTheDocument();
    expect(screen.queryByText('Hot journey paywall drop')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: /^Draft/ }));
    await waitFor(() => expect(api.list).toHaveBeenLastCalledWith('p1', expect.objectContaining({ status: 'draft', page: 1 })));
  });

  it('pauses, duplicates, opens and deletes through the API', async () => {
    wrap(<JourneyWorkspace />);
    const row = (await screen.findByText('Onboarding')).closest('tr')!;
    await userEvent.click(within(row).getByRole('checkbox'));
    await waitFor(() => expect(api.action).toHaveBeenCalledWith('p1', 'j1', 'pause'));
    await userEvent.click(await screen.findByRole('button', { name: 'Duplicate Onboarding' }));
    await waitFor(() => expect(api.action).toHaveBeenCalledWith('p1', 'j1', 'duplicate'));
    await userEvent.click(screen.getByRole('button', { name: 'Edit Onboarding' }));
    expect(router.push).toHaveBeenCalledWith('/dashboard/journeys/builder?id=j1');

    // a running journey is stopped first, then deleted; nothing happens before the confirmation
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Onboarding' }));
    expect(api.remove).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getAllByRole('button').at(-1)!);
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('p1', 'j1'));
    expect(api.action).toHaveBeenCalledWith('p1', 'j1', 'archive');
  });
});

describe('journey builder', () => {
  it('will not save without an audience, and says why', async () => {
    wrap(<JourneyBuilder />);
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText(/Choose who enters this journey/)).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('loads a saved journey, saves changes and goes through pause and resume', async () => {
    search = 'id=j1';
    const input = toJourneyInput(state());
    const stats: Record<string, object> = { push1: { sent: 40, opened: 10, paused: 3, deleted: 1, completed: 40, exitedEarly: 2 }, wait1: { waiting: 7, completed: 21, exitedEarly: 4 } };
    api.get.mockResolvedValue({ ...input, id: 'j1', status: 'active', displayStatus: 'running', messageType: 'mixed', createdAt: '', activatedAt: '', entrance: { entered: 52, unreachable: 6 }, steps: input.steps.map((step) => ({ ...step, stats: stats[step.key] })) } as Journey);
    api.update.mockResolvedValue({ id: 'j1' } as Journey);
    api.action.mockResolvedValue({} as never);
    wrap(<JourneyBuilder />);
    expect(await screen.findByDisplayValue('Onboarding')).toBeInTheDocument();
    expect(await screen.findByText('Lifecycle segment: New users')).toBeInTheDocument();
    // cards say what is sent and carry the backend's counts
    expect(await screen.findByText(/Title: Hi there\s+Body: Come back today/)).toBeInTheDocument();
    expect(screen.getByText('Subject: Welcome aboard')).toBeInTheDocument();
    const counter = (card: string, label: string) => within(screen.getByText(card).closest('.journey-flow-block') as HTMLElement).getByText(label).querySelector('b')!.textContent;
    expect([counter('Entrance Trigger', 'Users entered'), counter('Entrance Trigger', 'Unreachable users')]).toEqual(['52', '6']);
    expect([counter('wait', 'Waiting'), counter('wait', 'Completed'), counter('wait', 'Exited early')]).toEqual(['7', '21', '4']);
    expect([counter('notification', 'Sent'), counter('notification', 'Clicks'), counter('notification', 'Click rate'), counter('notification', 'Paused'), counter('notification', 'Deleted'), counter('notification', 'Exited early')]).toEqual(['40', '10', '25%', '3', '1', '2']);

    // running: only the name can change
    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('p1', 'j1', { name: 'Onboarding' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    await waitFor(() => expect(api.action).toHaveBeenCalledWith('p1', 'j1', 'pause'));

    // paused: the whole journey is saved again
    await userEvent.click(await screen.findByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.update).toHaveBeenLastCalledWith('p1', 'j1', expect.objectContaining({ trigger: 'audience', steps: expect.any(Array) })));
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(api.action).toHaveBeenCalledWith('p1', 'j1', 'resume'));
  });

  it('shows the backend\'s reason when going live is refused', async () => {
    search = 'id=j1';
    const input = toJourneyInput(state());
    api.get.mockResolvedValue({ ...input, id: 'j1', status: 'draft', displayStatus: 'draft', messageType: 'mixed', createdAt: '', activatedAt: null } as Journey);
    api.update.mockResolvedValue({ id: 'j1' } as Journey);
    api.action.mockRejectedValue({ status: 409, code: 'PLAN_LIMIT_ACTIVE_JOURNEYS', message: 'Your plan allows 1 active journey(s).' });
    wrap(<JourneyBuilder />);
    await screen.findByText('Lifecycle segment: New users');
    await userEvent.click(screen.getByRole('button', { name: 'Save & set live' }));
    expect(await screen.findByText('Your plan allows 1 active journey(s).')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
