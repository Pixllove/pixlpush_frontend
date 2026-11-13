import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeCommandCenter, { detectCreationFlow, persistedMessageToChatMessage } from '@/components/dashboard/HomeCommandCenter';
import { aiApi } from '@/lib/projects/ai';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ projects: [], active: { id: 'p1', name: 'Acme' }, isPending: false }) }));
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account: { name: 'Kamran Ahsan' } }) }));
vi.mock('@/lib/projects/ai', () => ({ aiApi: { catalog: vi.fn(), context: vi.fn(), businessContext: vi.fn(), updateBusinessContext: vi.fn(), analyzeBusinessContext: vi.fn(), conversations: vi.fn(), collaborations: vi.fn(), approveCollaboration: vi.fn(), rejectCollaboration: vi.fn(), cancelCollaboration: vi.fn(), deleteConversation: vi.fn(), chat: vi.fn(), regenerate: vi.fn(), flowDraft: vi.fn(), flowCreate: vi.fn(), createConversation: vi.fn(), cancelConversation: vi.fn(), conversation: vi.fn(), submitInteraction: vi.fn(), cancelInteraction: vi.fn(), retryInteraction: vi.fn(), reloadInteraction: vi.fn() } }));

const api = vi.mocked(aiApi);
const reply = (message: string) => ({ conversationId: 'c1', assistant: 'Max', provider: 'rules', message, nextActions: [], evidence: [], context: { generatedAt: '' } }) as never;
const interaction = (type: string, fields = [{ key: 'goal', label: 'Goal', type: 'choice', required: true, options: ['Improve engagement'] }]) => ({ interactionId: `i-${type}`, type, flowId: type, status: 'awaiting_input', step: 1, totalSteps: 2, title: type === 'onboarding' ? 'Complete onboarding' : 'Choose a growth goal', description: 'Continue in chat.', fields, data: {}, actions: ['next', 'submit', 'cancel', 'retry'], requestKey: `request-${type}-123` });

describe('creation command matching', () => {
  it('recognises natural phrasing and common typos for every creation type', () => {
    expect(detectCreationFlow('create a journey')).toBe('journey');
    expect(detectCreationFlow('please make a compaign')).toBe('campaigns');
    expect(detectCreationFlow('can you create an audience grpup')).toBe('audience-group');
    expect(detectCreationFlow('I need a lifecycle segement')).toBe('segment');
    expect(detectCreationFlow('create a push notification')).toBe('campaigns');
    expect(detectCreationFlow('how many users are active')).toBeNull();
  });

  it('keeps normalized onboarding actions readable after reload', () => {
    const message = persistedMessageToChatMessage({
      id: 'm3', role: 'assistant', content: 'Here are the onboarding steps still needed.',
      metadata: {
        nextActions: ['continue_onboarding'],
        onboarding: {
          status: 'in_progress', currentStep: 2, completedCount: 2, totalSteps: 6, completionPercentage: 33,
          platforms: ['web'], channels: ['email'], steps: [], completedSteps: [], missingSteps: [], nextStep: null,
          firebaseConnected: false, pushReady: false, sdkReady: { mobile: false, web: false }, emailReady: false, emailBlockers: [],
        },
      },
      createdAt: '2026-10-14T10:00:01.000Z',
    });
    expect(message.nextActions).toEqual(['continue_onboarding']);
    expect(message.onboarding?.completionPercentage).toBe(33);
  });

  it('normalizes older persisted guided-flow JSON into readable messages and resource cards', () => {
    const userMessage = persistedMessageToChatMessage({
      id: 'm1',
      role: 'user',
      content: JSON.stringify({ flowId: 'campaigns', answers: { '0': 'Something else?', '1': 'Push notification', '2': 'All reachable users' } }),
      metadata: { kind: 'flow_create', flowId: 'campaigns' },
      createdAt: '2026-10-14T10:00:00.000Z',
    });
    const assistantMessage = persistedMessageToChatMessage({
      id: 'm2',
      role: 'assistant',
      content: JSON.stringify({ type: 'campaign', objective: 'Something else?', channel: 'Push notification', audience: 'All reachable users', status: 'draft' }),
      metadata: {
        kind: 'flow_created',
        flowId: 'campaigns',
        warnings: ['Created as an editable draft. Nothing has been sent or activated.'],
        createdResources: [{ type: 'campaign', id: 'campaign-1', name: 'New campaign', channel: 'push', status: 'draft', href: '/dashboard/push?tab=drafts&highlight=campaign-1' }],
      },
      createdAt: '2026-10-14T10:00:01.000Z',
    });

    expect(userMessage.text).toContain('Campaign details');
    expect(userMessage.text).toContain('Which channel should we use?: Push notification');
    expect(userMessage.text).not.toContain('{"flowId"');
    expect(assistantMessage.text).toContain('Campaign draft prepared for All reachable users.');
    expect(assistantMessage.text).not.toContain('{"type"');
    expect(assistantMessage.createdResources).toHaveLength(1);
  });
});

describe('Home chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    api.catalog.mockReturnValue(new Promise(() => {}));
    api.context.mockReturnValue(new Promise(() => {}));
    api.businessContext.mockResolvedValue({} as never);
    api.collaborations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue({ id: 'c1' } as never);
  });

  it('retries a failed message as a new turn, then retries and edits a stored one in place', async () => {
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    // Nothing was stored for a failed request, so "Try again" sends it as a normal turn.
    api.chat.mockRejectedValueOnce({ status: 502, code: 'AI_REQUEST_FAILED', message: 'The AI assistant is unavailable right now. Please try again.' });
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'how many users do I have{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable right now');
    api.chat.mockResolvedValueOnce(reply('You have 12 users.'));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('You have 12 users.', {}, { timeout: 3500 })).toBeInTheDocument();
    expect(api.chat).toHaveBeenLastCalledWith('p1', expect.objectContaining({ assistant: 'Max', prompt: 'how many users do I have', conversationId: 'c1', mode: 'direct', requestKey: expect.any(String) }), expect.any(AbortSignal));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The answer is stored now: Retry replaces that turn on the server.
    api.regenerate.mockResolvedValueOnce(reply('12 users, 9 reachable.'));
    await user.click(screen.getByRole('button', { name: 'Retry answer' }));
    expect(await screen.findByText('12 users, 9 reachable.', {}, { timeout: 3500 })).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', expect.objectContaining({ assistant: 'Max', prompt: 'how many users do I have', mode: 'direct', requestKey: expect.any(String) }), expect.any(AbortSignal));
    expect(screen.queryByText('You have 12 users.')).not.toBeInTheDocument();

    // Edit rewrites the same message; an older backend without the route falls back to a plain turn.
    api.regenerate.mockRejectedValueOnce({ status: 404, code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
    api.chat.mockResolvedValueOnce(reply('3 users are inactive.'));
    await user.click(screen.getByRole('button', { name: 'Edit message' }));
    const editor = screen.getByRole('textbox', { name: 'Edit message' });
    await user.clear(editor);
    await user.type(editor, 'how many are inactive{Enter}');
    expect(await screen.findByText('3 users are inactive.', {}, { timeout: 3500 })).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', expect.objectContaining({ assistant: 'Max', prompt: 'how many are inactive', mode: 'direct', requestKey: expect.any(String) }), expect.any(AbortSignal));
    expect(api.chat).toHaveBeenLastCalledWith('p1', expect.objectContaining({ assistant: 'Max', prompt: 'how many are inactive', conversationId: 'c1', mode: 'direct', requestKey: expect.any(String) }), expect.any(AbortSignal));
    expect(screen.queryByText('how many users do I have')).not.toBeInTheDocument();

    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getAllByRole('button', { name: 'Copy message' }).at(-1)!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('3 users are inactive.'));
  }, 45_000);

  it('shows backend onboarding progress in an in-chat review card', async () => {
    const user = userEvent.setup();
    api.context.mockResolvedValue({
      catalog: { assistants: [], nextActions: [{ id: 'continue_onboarding', label: 'Continue onboarding', href: '/dashboard/onboarding' }] },
      onboarding: {
        status: 'in_progress', currentStep: 2, completedCount: 2, totalSteps: 6, completionPercentage: 33,
        platforms: ['web'], channels: ['email'], steps: [], completedSteps: [],
        missingSteps: [{ number: 3, kind: 'channels', title: 'Configure channels', status: 'missing', reason: 'Choose a messaging channel.', action: 'Open onboarding', href: '/onboarding' }],
        nextStep: { number: 3, kind: 'channels', title: 'Configure channels', status: 'missing', reason: 'Choose a messaging channel.', action: 'Open onboarding', href: '/onboarding' },
        firebaseConnected: false, pushReady: false, sdkReady: { mobile: false, web: false }, emailReady: false, emailBlockers: [],
      },
    } as never);
    api.chat.mockResolvedValueOnce({ ...(reply('I found the onboarding steps that still need attention.') as object), interaction: interaction('onboarding', [{ key: 'projectName', label: 'Project name', type: 'text', required: true, options: [] }]) } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Which onboarding steps are missing?{Enter}');
    expect(await screen.findByTestId('interaction-onboarding', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByText('Complete onboarding')).toBeInTheDocument();
  }, 10_000);

  it('renders the backend goal interaction for Max', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValueOnce({ ...(reply('Let’s choose a goal first.') as object), interaction: interaction('goal_selection') } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'What goal should we focus on?{Enter}');
    expect(await screen.findByTestId('interaction-goal-selection', {}, { timeout: 5_000 })).toBeInTheDocument();
    expect(screen.getByText('Improve engagement')).toBeInTheDocument();
  }, 10_000);

  it('submits a backend interaction once and updates the current card', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValueOnce({ ...(reply('Let’s choose a goal first.') as object), interaction: interaction('goal_selection') } as never);
    api.submitInteraction.mockResolvedValueOnce({
      interaction: { ...interaction('goal_selection'), step: 2, status: 'awaiting_confirmation', fields: [], actions: ['approve', 'cancel'] },
      message: 'I have prepared the recommendation for your review.',
    } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'What goal should we focus on?{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Improve engagement' }, { timeout: 5_000 }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.submitInteraction).toHaveBeenCalledWith('p1', expect.objectContaining({
      interactionId: 'i-goal_selection', requestKey: expect.any(String), step: 1,
      values: { goal: 'Improve engagement' }, action: 'next',
    }), expect.any(AbortSignal)));
    expect(await screen.findByText('I have prepared the recommendation for your review.')).toBeInTheDocument();
  }, 10_000);

  it('uses a unique request key for each interaction step and advances the flow', async () => {
    const user = userEvent.setup();
    const first = { ...interaction('push_creation', [{ key: 'goal', label: 'Goal', type: 'text', required: true, options: [] }]), step: 1, totalSteps: 4, actions: ['next'] };
    api.chat.mockResolvedValueOnce({ ...(reply('Lets prepare a push campaign.') as object), interaction: first } as never);
    api.submitInteraction
      .mockResolvedValueOnce({ interaction: { ...first, step: 2, fields: [{ key: 'title', label: 'Title', type: 'text', required: true, options: [] }], actions: ['next'] } } as never)
      .mockResolvedValueOnce({ interaction: { ...first, step: 3, fields: [{ key: 'body', label: 'Body', type: 'text', required: true, options: [] }], actions: ['next'] } } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Create a push campaign{Enter}');
    await user.type(await screen.findByRole('textbox', { name: 'Goal' }, { timeout: 5_000 }), 'Retention');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(api.submitInteraction).toHaveBeenCalledTimes(1));
    const firstRequest = api.submitInteraction.mock.calls[0]?.[1] as { requestKey: string; step: number; action?: string };
    expect(firstRequest).toMatchObject({ step: 1, action: 'next' });
    expect(firstRequest.requestKey).not.toBe(first.requestKey);
    await user.type(await screen.findByRole('textbox', { name: 'Title' }, { timeout: 5_000 }), 'Welcome back');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(api.submitInteraction).toHaveBeenCalledTimes(2));
    const secondRequest = api.submitInteraction.mock.calls[1]?.[1] as { requestKey: string; step: number; action?: string };
    expect(secondRequest).toMatchObject({ step: 2, action: 'next' });
    expect(secondRequest.requestKey).not.toBe(firstRequest.requestKey);
    expect(await screen.findByRole('textbox', { name: 'Body' })).toBeInTheDocument();
  }, 10_000);

  it('sends save_draft to the backend and renders the confirmed draft resource', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValueOnce({ ...(reply('Prepare this push as a draft.') as object), interaction: { ...interaction('push_creation', [{ key: 'title', label: 'Title', type: 'text', required: true, options: [] }]), actions: ['next', 'save_draft', 'cancel'] } } as never);
    api.submitInteraction.mockResolvedValueOnce({
      interaction: { ...interaction('push_creation', [{ key: 'title', label: 'Title', type: 'text', required: true, options: [] }]), status: 'completed', step: 4, data: { submittedValues: { title: 'Welcome back' }, createdResources: [{ type: 'campaign', id: 'draft-1', name: 'Welcome back', channel: 'push', status: 'draft', href: '/dashboard/push?tab=drafts' }] }, actions: ['retry'] },
      message: 'The push draft was saved.',
      createdResources: [{ type: 'campaign', id: 'draft-1', name: 'Welcome back', channel: 'push', status: 'draft', href: '/dashboard/push?tab=drafts' }],
      savedAsDraft: true,
    } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Create a push draft{Enter}');
    await user.type(await screen.findByRole('textbox', { name: 'Title' }, { timeout: 5_000 }), 'Welcome back');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(api.submitInteraction).toHaveBeenCalledWith('p1', expect.objectContaining({
      interactionId: 'i-push_creation',
      action: 'save_draft',
      values: { title: 'Welcome back' },
    }), expect.any(AbortSignal)));
    expect(await screen.findByRole('link', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Welcome back' })).toHaveLength(1);
    expect(await screen.findByText('Nothing was sent, scheduled, or activated.')).toBeInTheDocument();
  }, 10_000);

  it('retries an expired interaction and replaces it with the fresh backend interaction', async () => {
    const user = userEvent.setup();
    const expired = { ...interaction('onboarding', [{ key: 'oldStep', label: 'Old step', type: 'text', required: true, options: [] }]), status: 'expired', actions: ['retry'] };
    api.chat.mockResolvedValueOnce({ ...(reply('This interaction expired.') as object), interaction: expired } as never);
    api.retryInteraction.mockResolvedValueOnce({ interaction: { ...expired, interactionId: 'fresh-onboarding', status: 'awaiting_input', requestKey: 'fresh-request-123', fields: [{ key: 'nextStep', label: 'Next step', type: 'text', required: true, options: [] }] } } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Continue onboarding{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Start again' }, { timeout: 5_000 }));
    await waitFor(() => expect(api.retryInteraction).toHaveBeenCalledWith('p1', expect.objectContaining({ interactionId: 'i-onboarding', requestKey: expect.any(String) }), expect.any(AbortSignal)));
    expect(await screen.findByRole('textbox', { name: 'Next step' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Old step' })).not.toBeInTheDocument();
  }, 10_000);

  it('automatically transfers a request to the owning specialist', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValueOnce({
      conversationId: 'c1',
      assistant: 'Max',
      provider: 'rules',
      message: 'This is Nova’s area. I’m connecting you to Nova for a more complete answer.',
      nextActions: [],
      evidence: [],
      handoff: { assistant: 'Nova', name: 'Nova', role: 'Campaign & Journey Creator', reason: 'Creates journeys.' },
      context: { generatedAt: '' },
    } as never);
    api.regenerate.mockResolvedValueOnce(reply('Nova has prepared the next journey step.'));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'How should I improve this journey?{Enter}');
    expect(await screen.findByText('This is Nova’s area. I’m connecting you to Nova for a more complete answer.', {}, { timeout: 3500 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review switch to Nova' })).not.toBeInTheDocument();

    expect(await screen.findByText('Nova has prepared the next journey step.', {}, { timeout: 7000 })).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenCalledWith('p1', 'c1', expect.objectContaining({ assistant: 'Nova', prompt: 'How should I improve this journey?', mode: 'handoff', requestKey: expect.any(String) }), expect.any(AbortSignal));
  }, 12_000);

  it('shows a deliberate thinking state before a manual agent switch', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValueOnce(reply('Max has reviewed the project context.'));
    api.regenerate.mockResolvedValueOnce(reply('Nova has reviewed the project context.'));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'What should I do next?{Enter}');
    expect(await screen.findByText('Max has reviewed the project context.', {}, { timeout: 3500 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Assistant: Max. Change assistant' }));
    await user.click(screen.getByRole('menuitem', { name: /Nova Campaign & Journey Creator/ }));

    expect(screen.getByRole('status')).toHaveTextContent('Reviewing this conversation for Nova');
    expect(screen.queryByRole('alertdialog', { name: 'Switch to Nova' })).not.toBeInTheDocument();
    expect(await screen.findByText('Nova has reviewed the project context.', {}, { timeout: 7000 })).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenCalledWith('p1', 'c1', expect.objectContaining({ assistant: 'Nova', prompt: 'What should I do next?', mode: 'direct', requestKey: expect.any(String) }), expect.any(AbortSignal));
  }, 12_000);

  it('searches recent conversations and resumes the selected thread', async () => {
    const user = userEvent.setup();
    api.context.mockResolvedValue({
      recentConversations: [{
        id: 'c9',
        assistant: 'Max',
        title: 'Create a retention journey',
        flowId: 'journey',
        createdAt: '2026-10-13T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z',
        _count: { messages: 2 },
        lastMessage: { role: 'assistant', content: 'Earlier answer', createdAt: '2026-10-14T10:00:00.000Z' },
      }],
      latestInsight: { title: 'Insight', message: 'Message', metric: { key: 'users', value: 1 }, actions: [] },
      handoffHistory: [],
    } as never);
    api.conversations.mockResolvedValue({
      items: [{
        id: 'c9',
        assistant: 'Max',
        title: 'Create a retention journey',
        flowId: 'journey',
        createdAt: '2026-10-13T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z',
        _count: { messages: 2 },
        lastMessage: { role: 'assistant', content: 'Earlier answer', createdAt: '2026-10-14T10:00:00.000Z' },
      }],
      hasMore: false,
      search: 'retention',
    } as never);
    api.conversation.mockResolvedValue({
      id: 'c9',
      messages: [
        { id: 'm1', role: 'user', content: 'Create a retention journey', createdAt: '2026-10-13T10:00:00.000Z' },
        { id: 'm2', role: 'assistant', content: 'Earlier answer', createdAt: '2026-10-14T10:00:00.000Z' },
      ],
    } as never);
    render(<QueryClientProvider client={new QueryClient()}><HomeCommandCenter /></QueryClientProvider>);

    await user.click(screen.getByRole('button', { name: 'Recent conversations' }));
    const search = await screen.findByRole('textbox', { name: 'Search conversations' });
    await user.type(search, 'retention');
    await user.click(screen.getByRole('button', { name: 'Open conversation Create a retention journey' }));

    expect(api.conversation).toHaveBeenCalledWith('p1', 'c9');
    expect(await screen.findByText('Earlier answer')).toBeInTheDocument();
  });

  it('keeps recent conversations searchable when the remote search is unavailable', async () => {
    const user = userEvent.setup();
    api.context.mockResolvedValue({
      recentConversations: [{
        id: 'c10',
        assistant: 'Max',
        title: 'New journey',
        flowId: 'journey',
        createdAt: '2026-10-14T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z',
        _count: { messages: 2 },
        lastMessage: { role: 'assistant', content: 'Earlier answer', createdAt: '2026-10-14T10:00:00.000Z' },
      }],
      latestInsight: { title: 'Insight', message: 'Message', metric: { key: 'users', value: 1 }, actions: [] },
      handoffHistory: [],
    } as never);
    api.conversations.mockRejectedValue({ status: 500, message: 'Search service unavailable.' });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.click(screen.getByRole('button', { name: 'Recent conversations' }));
    const search = await screen.findByRole('textbox', { name: 'Search conversations' });
    await user.type(search, 'New Journey');

    expect(await screen.findByRole('button', { name: 'Open conversation New journey' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Search service unavailable.');
    expect(screen.queryByText('No matching conversations.')).not.toBeInTheDocument();
  });

  it('deletes a conversation after confirmation', async () => {
    const user = userEvent.setup();
    api.context.mockResolvedValue({
      recentConversations: [{
        id: 'c11',
        assistant: 'Max',
        title: 'Delete me',
        flowId: null,
        createdAt: '2026-10-14T10:00:00.000Z',
        updatedAt: '2026-10-14T10:00:00.000Z',
        _count: { messages: 1 },
        lastMessage: { role: 'user', content: 'Delete me', createdAt: '2026-10-14T10:00:00.000Z' },
      }],
      latestInsight: { title: 'Insight', message: 'Message', metric: { key: 'users', value: 1 }, actions: [] },
      handoffHistory: [],
    } as never);
    api.deleteConversation.mockResolvedValue({ conversationId: 'c11', deleted: true } as never);
    render(<QueryClientProvider client={new QueryClient()}><HomeCommandCenter /></QueryClientProvider>);

    await user.click(screen.getByRole('button', { name: 'Recent conversations' }));
    await user.click(await screen.findByRole('button', { name: 'Delete conversation Delete me' }));
    expect(screen.getByRole('heading', { name: 'Are you sure you want to delete this conversation?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(api.deleteConversation).toHaveBeenCalledWith('p1', 'c11');
    await waitFor(() => expect(screen.queryByText('Delete me')).not.toBeInTheDocument());
  });

  it('collects business context before showing the journey questions', async () => {
    const user = userEvent.setup();
    api.context.mockResolvedValue({
      project: { id: 'p1', name: 'Acme', description: null, audience: { totalUsers: 0, reachableByEmail: 0, reachableByPush: 0, reachableByBoth: 0, reachableByEither: 0, reachableByNeither: 0, inactive14Days: 0, active30Days: 0 }, activity: { knownEvents: [] }, lifecycle: [], campaigns: { email: 0, push: 0, total: 0 }, journeys: { total: 0 }, activitySummary: { total: 0, last30Days: 0 }, generatedAt: '' },
      businessContext: { businessDescription: null, websiteUrl: null, websiteTitle: null, websiteSummary: null, websiteAnalyzedAt: null, hasMobileApp: null, appStoreUrl: null, googlePlayUrl: null, appName: null, appSummary: null, appAnalyzedAt: null, updatedAt: null },
      recentConversations: [],
      latestInsight: { title: 'Insight', message: 'Message', metric: { key: 'users', value: 0 }, actions: [] },
      handoffHistory: [],
    } as never);
    api.updateBusinessContext.mockImplementation(async (_projectId, input) => ({
      businessDescription: typeof input.businessDescription === 'string' ? input.businessDescription : null,
      websiteUrl: null, websiteTitle: null, websiteSummary: null, websiteAnalyzedAt: null,
      hasMobileApp: input.hasMobileApp ?? null, appStoreUrl: null, googlePlayUrl: null, appName: null, appSummary: null, appAnalyzedAt: null, updatedAt: null,
    } as never));
    api.analyzeBusinessContext.mockRejectedValueOnce({ status: 422, message: 'The public page could not be reached.' });
    api.createConversation.mockResolvedValue({ id: 'c1' } as never);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);

    await user.click(await screen.findByRole('button', { name: /Create journey/ }));
    expect(await screen.findByRole('heading', { name: 'Tell me about your business' }, { timeout: 6000 })).toBeInTheDocument();
    expect(await screen.findByLabelText('Website URL')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Message Max' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Website URL'), 'www.example.com');
    await user.click(screen.getByRole('button', { name: 'Analyze & continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The public page could not be reached.');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Additional business information'), 'A subscription app for teams.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText(/Do you have an iOS or Android app/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /No app yet/ }));
    expect(await screen.findByText('Review your business context')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue to journey' }));

    expect(await screen.findByText(/Thanks — I now understand your business, product and audience context\./)).toBeInTheDocument();
    expect(await screen.findByText('What is the purpose of this journey?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Engagement Bring users back/ })).toBeInTheDocument();
  });
});
