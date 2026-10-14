import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeCommandCenter, { detectCreationFlow } from '@/components/dashboard/HomeCommandCenter';
import { aiApi } from '@/lib/projects/ai';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ projects: [], active: { id: 'p1', name: 'Acme' }, isPending: false }) }));
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account: { name: 'Kamran Ahsan' } }) }));
vi.mock('@/lib/projects/ai', () => ({ aiApi: { catalog: vi.fn(), context: vi.fn(), conversations: vi.fn(), deleteConversation: vi.fn(), chat: vi.fn(), regenerate: vi.fn(), flowDraft: vi.fn(), flowCreate: vi.fn(), createConversation: vi.fn(), cancelConversation: vi.fn(), conversation: vi.fn() } }));

const api = vi.mocked(aiApi);
const reply = (message: string) => ({ conversationId: 'c1', assistant: 'Max', provider: 'rules', message, nextActions: [], evidence: [], context: { generatedAt: '' } }) as never;

describe('creation command matching', () => {
  it('recognises natural phrasing and common typos for every creation type', () => {
    expect(detectCreationFlow('create a journey')).toBe('journey');
    expect(detectCreationFlow('please make a compaign')).toBe('campaigns');
    expect(detectCreationFlow('can you create an audience grpup')).toBe('audience-group');
    expect(detectCreationFlow('I need a lifecycle segement')).toBe('segment');
    expect(detectCreationFlow('how many users are active')).toBeNull();
  });
});

describe('Home chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.catalog.mockReturnValue(new Promise(() => {}));
    api.context.mockReturnValue(new Promise(() => {}));
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
    expect(await screen.findByText('You have 12 users.')).toBeInTheDocument();
    expect(api.chat).toHaveBeenLastCalledWith('p1', { assistant: 'Max', prompt: 'how many users do I have', conversationId: 'c1' }, expect.any(AbortSignal));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The answer is stored now: Retry replaces that turn on the server.
    api.regenerate.mockResolvedValueOnce(reply('12 users, 9 reachable.'));
    await user.click(screen.getByRole('button', { name: 'Retry answer' }));
    expect(await screen.findByText('12 users, 9 reachable.')).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', { assistant: 'Max', prompt: 'how many users do I have' }, expect.any(AbortSignal));
    expect(screen.queryByText('You have 12 users.')).not.toBeInTheDocument();

    // Edit rewrites the same message; an older backend without the route falls back to a plain turn.
    api.regenerate.mockRejectedValueOnce({ status: 404, code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
    api.chat.mockResolvedValueOnce(reply('3 users are inactive.'));
    await user.click(screen.getByRole('button', { name: 'Edit message' }));
    const editor = screen.getByRole('textbox', { name: 'Edit message' });
    await user.clear(editor);
    await user.type(editor, 'how many are inactive{Enter}');
    expect(await screen.findByText('3 users are inactive.')).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', { assistant: 'Max', prompt: 'how many are inactive' }, expect.any(AbortSignal));
    expect(api.chat).toHaveBeenLastCalledWith('p1', { assistant: 'Max', prompt: 'how many are inactive', conversationId: 'c1' }, expect.any(AbortSignal));
    expect(screen.queryByText('how many users do I have')).not.toBeInTheDocument();

    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getAllByRole('button', { name: 'Copy message' }).at(-1)!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('3 users are inactive.'));
  });

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
    expect(screen.getByRole('heading', { name: 'Are you sure you want to delete?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(api.deleteConversation).toHaveBeenCalledWith('p1', 'c11');
    await waitFor(() => expect(screen.queryByText('Delete me')).not.toBeInTheDocument());
  });
});
