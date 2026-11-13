import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JourneyBuilder from '@/components/dashboard/JourneyBuilder';
import JourneyWorkspace from '@/components/dashboard/JourneyWorkspace';
import { audienceGroupsApi, emailApi, eventsApi, journeysApi, lifecycleSegmentsApi, pushApi } from '@/lib/projects/api';
import { abResults, conditionOptions, ENTRANCE, EXIT, fromJourney, mergeJourneyEventOptions, toJourneyInput, type BuilderState } from '@/lib/journeys';
import type { Journey, JourneyListItem } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  journeysApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), action: vi.fn(), applyAbWinner: vi.fn() },
  lifecycleSegmentsApi: { list: vi.fn() },
  audienceGroupsApi: { list: vi.fn() },
  eventsApi: { listCatalog: vi.fn() },
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
  vi.mocked(eventsApi.listCatalog).mockImplementation(async (_projectId, platform) => ({ events: [{ name: platform === 'web' ? 'page_viewed' : 'app_opened', firstSeenAt: null, lastSeenAt: null, eventCount: 1, active: true, assignedSegment: null }] }) as never);
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
    expect(condition.condition).toEqual({ kind: 'engagement', stepKey: 'push1', action: 'push_opened', channel: 'mobile', waitHours: 0, negate: true });
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
    expect(toJourneyInput(s).steps[0]!.condition).toEqual({ kind: 'audience', rules: { operator: 'AND', conditions: [{ field: 'email', operator: 'exists' }, { field: 'fcmToken', operator: 'not_available' }] } });
  });

  it('offers channel-specific clicked and not-clicked checks for both push blocks', () => {
    expect(conditionOptions('notification')).toEqual(['Mobile push notification was clicked', 'Mobile push notification was not clicked']);
    expect(conditionOptions('web_notification')).toEqual(['Web push notification was clicked', 'Web push notification was not clicked']);
    const s = state();
    s.blocks = [ENTRANCE, block('webPush', 'web_notification'), block('cond', 'condition'), EXIT];
    s.branches = {};
    s.settings = { webPush: { template: 'tplPush' } };
    s.conditionValues = { cond: ['Web push notification was not clicked'] };
    expect(toJourneyInput(s).steps[1]!.condition).toEqual({ kind: 'engagement', stepKey: 'webPush', action: 'push_opened', channel: 'web', waitHours: 0, negate: true });
  });

  it('merges all SDK event names and shows the SDK sources for each event', () => {
    expect(mergeJourneyEventOptions(
      [{ name: 'purchase_completed' }, { name: 'web_viewed' }],
      [{ name: 'purchase_completed' }, { name: 'app_opened' }],
    )).toEqual([
      { id: 'app_opened', name: 'app_opened', sources: ['Mobile SDK'] },
      { id: 'purchase_completed', name: 'purchase_completed', sources: ['Web SDK', 'Mobile SDK'] },
      { id: 'web_viewed', name: 'web_viewed', sources: ['Web SDK'] },
    ]);
  });

  it('serializes and restores a tracked-event entrance trigger', () => {
    const s = state();
    s.entranceConfig = { lifecycle: '', audience: '', allUsers: false, event: 'signup' };
    const input = toJourneyInput(s);
    expect(input).toMatchObject({ trigger: 'event', entryEvent: 'signup', audience: {} });
    const back = fromJourney({ ...input, id: 'event-journey', status: 'draft', displayStatus: 'draft', messageType: 'push', createdAt: '', activatedAt: null, steps: input.steps.map((step) => ({ ...step, stats: {} })) } as Journey);
    expect(back.entranceConfig).toEqual({ lifecycle: '', audience: '', allUsers: false, event: 'signup' });
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
    expect(back.conditionValues.cond1).toEqual(['Mobile push notification was not clicked']);
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
    // The delete endpoint archives live journeys and cancels queued work atomically.
    expect(api.action).not.toHaveBeenCalledWith('p1', 'j1', 'archive');
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
    expect(screen.getByText(/Subject: Welcome aboard/)).toBeInTheDocument();
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

describe('A/B test block', () => {
  /** entrance -> A/B (3 push variants) -> wait -> exit */
  const abState = (): BuilderState => ({
    ...state(),
    blocks: [ENTRANCE, block('ab', 'ab_test'), block('wait1', 'wait'), EXIT],
    branches: { ab: { yes: [], no: [], variants: [block('va', 'notification'), block('vb', 'notification'), block('vc', 'notification')] } },
    settings: { ab: { maxVariants: '3' }, va: { template: 'tplPush' }, vb: { template: 'tplPush' }, vc: { template: 'tplPush' }, wait1: { amount: '1', unit: 'days' } },
    conditionValues: {},
  });
  const saved = (s: BuilderState, stats: Record<string, object> = {}, status: Journey['status'] = 'active') => {
    const input = toJourneyInput(s);
    return { ...input, id: 'j1', status, displayStatus: 'running', messageType: 'push', createdAt: '', activatedAt: '', steps: input.steps.map((step) => ({ ...step, stats: stats[step.key] })) } as Journey;
  };

  it('saves the test and its variants, every variant continuing to the step after the test', () => {
    const steps = toJourneyInput(abState()).steps;
    expect(steps.map((s) => [s.key, s.type])).toEqual([['ab', 'abtest'], ['va', 'push'], ['vb', 'push'], ['vc', 'push'], ['wait1', 'delay'], ['exit', 'exit']]);
    expect(steps[0]).toMatchObject({ variants: ['va', 'vb', 'vc'], meta: { block: 'ab_test' } });
    for (const variant of steps.slice(1, 4)) expect(variant).toMatchObject({ next: 'wait1', templateId: 'tplPush', channel: 'mobile', meta: { variantOf: 'ab' } });
  });

  it('refuses a test with too few or mixed variants, or a variant without a template', () => {
    const one = abState(); one.branches.ab!.variants = [block('va', 'notification')];
    expect(() => toJourneyInput(one)).toThrow(/2 to 5 variants/);
    const six = abState(); six.branches.ab!.variants = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => block(id, 'notification'));
    expect(() => toJourneyInput(six)).toThrow(/2 to 5 variants/);
    const mixed = abState(); mixed.branches.ab!.variants = [block('va', 'notification'), block('m', 'email')]; mixed.settings.m = { template: 'tplMail' };
    expect(() => toJourneyInput(mixed)).toThrow(/same kind of message/);
    const noTemplate = abState(); noTemplate.settings.vb = {};
    expect(() => toJourneyInput(noTemplate)).toThrow(/Select a template/);
  });

  it('comes back as the same canvas, and a kept winner comes back as a plain block', () => {
    const back = fromJourney(saved(abState(), { va: { sent: 10 } }));
    expect(back.blocks.map((b) => b.id)).toEqual(['entrance', 'ab', 'wait1', 'exit']);
    expect(back.blocks[1]!.type).toBe('ab_test');
    expect(back.branches.ab!.variants!.map((b) => [b.id, b.type])).toEqual([['va', 'notification'], ['vb', 'notification'], ['vc', 'notification']]);
    expect(back.branches.ab!.variants![0]!.stats).toEqual({ sent: 10 });

    // after Apply the test is gone; the winner keeps its meta but is drawn in the test's place
    const journey = saved(abState());
    journey.steps = journey.steps.filter((s) => !['ab', 'va', 'vc'].includes(s.key));
    const applied = fromJourney(journey);
    expect(applied.blocks.map((b) => [b.id, b.type])).toEqual([['entrance', 'entrance'], ['vb', 'notification'], ['wait1', 'wait'], ['exit', 'exit']]);
  });

  it('the builder chooses how many variants the test has: 2 by default, up to 5', async () => {
    const tooMany = abState(); tooMany.settings.ab = {}; // default 2, but 3 were added
    expect(() => toJourneyInput(tooMany)).toThrow(/has 3 variants but is set to 2/);
    const raised = abState(); raised.settings.ab = { maxVariants: '5' };
    expect(toJourneyInput(raised).steps[0]!.variants).toHaveLength(3);

    // at the chosen number "Add variant" is replaced by a count
    search = 'id=j1';
    const full = abState(); full.branches.ab!.variants = full.branches.ab!.variants!.slice(0, 2); full.settings.ab = {};
    api.get.mockResolvedValue(saved(full, {}, 'paused'));
    wrap(<JourneyBuilder />);
    expect(await screen.findByText('2 of 2 variants')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add variant' })).not.toBeInTheDocument();
  });

  it('lowering the number of variants removes the extra variant blocks from the end', async () => {
    search = 'id=j1';
    api.get.mockResolvedValue(saved(abState(), {}, 'paused')); // 3 variants, set to 3
    api.update.mockResolvedValue({ id: 'j1' } as Journey);
    wrap(<JourneyBuilder />);
    expect(await screen.findByText('3 of 3 variants')).toBeInTheDocument();
    await userEvent.click(screen.getByText('ab_test'));
    await userEvent.click(screen.getByRole('combobox', { name: 'Number of variants' }));
    await userEvent.click(await screen.findByRole('option', { name: '2 variants (A, B)' }));
    expect(await screen.findByText('2 of 2 variants')).toBeInTheDocument();
    expect(screen.queryByText('Variant C')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.update).toHaveBeenCalled());
    const steps = api.update.mock.calls.at(-1)![2].steps!;
    expect(steps.find((s) => s.key === 'ab')!.variants).toEqual(['va', 'vb']);
    expect(steps.some((s) => s.key === 'vc')).toBe(false);
  });

  it('names the winner by click rate (push taps, email clicks), and none without clicks', () => {
    const v = (id: string, type: 'notification' | 'email', stats: object) => ({ ...block(id, type), stats });
    const push = abResults([v('a', 'notification', { sent: 100, opened: 5 }), v('b', 'notification', { sent: 50, opened: 10 }), v('c', 'notification', { sent: 0 })]);
    expect(push.rows.map((r) => [r.letter, r.sent, r.clicks, r.rate])).toEqual([['A', 100, 5, 5], ['B', 50, 10, 20], ['C', 0, 0, 0]]);
    expect(push.winner).toBe('b');
    // email counts link clicks, not opens
    expect(abResults([v('a', 'email', { sent: 10, opened: 9, clicked: 1 }), v('b', 'email', { sent: 10, opened: 1, clicked: 3 })]).winner).toBe('b');
    // a tie on rate goes to the variant with more clicks, then to the first
    expect(abResults([v('a', 'notification', { sent: 10, opened: 1 }), v('b', 'notification', { sent: 20, opened: 2 })]).winner).toBe('b');
    expect(abResults([v('a', 'notification', { sent: 10, opened: 1 }), v('b', 'notification', { sent: 10, opened: 1 })]).winner).toBe('a');
    expect(abResults([v('a', 'notification', { sent: 10 }), v('b', 'notification', { sent: 10 })]).winner).toBeNull();
    expect(abResults([v('a', 'notification', {}), v('b', 'notification', {})]).winner).toBeNull();
  });

  it('shows each variant\'s results, applies the best one and reloads the canvas', async () => {
    search = 'id=j1';
    const stats = { va: { sent: 40, opened: 4 }, vb: { sent: 40, opened: 12 }, vc: { sent: 40, opened: 8 } };
    api.get.mockResolvedValueOnce(saved(abState(), stats));
    const after = saved(abState()); after.steps = after.steps.filter((s) => !['ab', 'va', 'vc'].includes(s.key));
    api.get.mockResolvedValue(after);
    api.applyAbWinner.mockResolvedValue({} as Journey);
    wrap(<JourneyBuilder />);

    await userEvent.click(await screen.findByText('ab_test'));
    const panel = screen.getByText('Results').closest('.journey-settings-panel') as HTMLElement;
    expect(within(panel).getByText('30%')).toBeInTheDocument(); // B: 12 of 40
    // only the leader can be applied, and only after confirming
    const apply = within(panel).getAllByRole('button', { name: /Apply/ });
    expect(apply).toHaveLength(1);
    await userEvent.click(apply[0]!);
    await userEvent.click(await screen.findByRole('button', { name: 'Keep B' }));
    await waitFor(() => expect(api.applyAbWinner).toHaveBeenCalledWith('p1', 'j1', 'ab', 'vb'));
    await waitFor(() => expect(screen.queryByText('ab_test')).not.toBeInTheDocument());
    expect(screen.getByText(/Winner kept/)).toBeInTheDocument();
  });

  it('shows the results from a variant card too, and Apply is hidden until something was clicked', async () => {
    search = 'id=j1';
    api.get.mockResolvedValue(saved(abState(), { va: { sent: 5 }, vb: { sent: 5 }, vc: { sent: 5 } }));
    wrap(<JourneyBuilder />);
    const variants = await screen.findAllByText('notification');
    await userEvent.click(variants[1]!);
    const panel = screen.getByText('Results').closest('.journey-settings-panel') as HTMLElement;
    expect(within(panel).getAllByText('0%')).toHaveLength(3);
    expect(within(panel).queryByRole('button', { name: /Apply/ })).not.toBeInTheDocument();
  });

  it('a new variant can only be the same kind of message as the first one', async () => {
    search = 'id=j1';
    const s = abState(); s.branches.ab!.variants = s.branches.ab!.variants!.slice(0, 2); s.settings.ab = { maxVariants: '3' };
    api.get.mockResolvedValue(saved(s, {}, 'paused'));
    wrap(<JourneyBuilder />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add variant' }));
    const menu = await screen.findByRole('dialog', { name: 'Add a step' });
    expect(within(menu).getAllByRole('button').map((b) => b.textContent).filter((t) => t && !t.includes('×'))).toEqual([expect.stringContaining('Push notification')]);
    expect(within(menu).queryByText('Email template')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Web push notification')).not.toBeInTheDocument();
    expect(within(menu).queryByText('ACTIONS')).not.toBeInTheDocument();
  });

  it('a fresh A/B test offers the three message kinds, and is only offered on the main path', async () => {
    wrap(<JourneyBuilder />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Add journey step' })[0]!);
    await userEvent.click(within(await screen.findByRole('dialog', { name: 'Add a step' })).getByText('A/B test'));
    await userEvent.click(await screen.findByRole('button', { name: 'Add variant' }));
    const menu = await screen.findByRole('dialog', { name: 'Add a step' });
    expect(['Email template', 'Push notification', 'Web push notification'].every((t) => within(menu).queryByText(t))).toBe(true);
    expect(within(menu).queryByText('Wait')).not.toBeInTheDocument();
  });
});
