import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeCommandCenter from '@/components/dashboard/HomeCommandCenter';
import { aiApi } from '@/lib/projects/ai';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ projects: [], active: { id: 'p1', name: 'Acme' }, isPending: false }) }));
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account: { name: 'Kamran Ahsan' } }) }));
vi.mock('@/lib/projects/ai', () => ({ aiApi: { catalog: vi.fn(), context: vi.fn(), chat: vi.fn(), regenerate: vi.fn(), flowDraft: vi.fn(), conversation: vi.fn() } }));

const api = vi.mocked(aiApi);
const reply = (message: string) => ({ conversationId: 'c1', assistant: 'Max', provider: 'rules', message, nextActions: [], evidence: [], context: { generatedAt: '' } }) as never;

describe('Home chat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.catalog.mockReturnValue(new Promise(() => {}));
    api.context.mockReturnValue(new Promise(() => {}));
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
    expect(api.chat).toHaveBeenLastCalledWith('p1', { assistant: 'Max', prompt: 'how many users do I have', conversationId: undefined });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // The answer is stored now: Retry replaces that turn on the server.
    api.regenerate.mockResolvedValueOnce(reply('12 users, 9 reachable.'));
    await user.click(screen.getByRole('button', { name: 'Retry answer' }));
    expect(await screen.findByText('12 users, 9 reachable.')).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', { assistant: 'Max', prompt: 'how many users do I have' });
    expect(screen.queryByText('You have 12 users.')).not.toBeInTheDocument();

    // Edit rewrites the same message; an older backend without the route falls back to a plain turn.
    api.regenerate.mockRejectedValueOnce({ status: 404, code: 'ROUTE_NOT_FOUND', message: 'Route not found.' });
    api.chat.mockResolvedValueOnce(reply('3 users are inactive.'));
    await user.click(screen.getByRole('button', { name: 'Edit message' }));
    const editor = screen.getByRole('textbox', { name: 'Edit message' });
    await user.clear(editor);
    await user.type(editor, 'how many are inactive{Enter}');
    expect(await screen.findByText('3 users are inactive.')).toBeInTheDocument();
    expect(api.regenerate).toHaveBeenLastCalledWith('p1', 'c1', { assistant: 'Max', prompt: 'how many are inactive' });
    expect(api.chat).toHaveBeenLastCalledWith('p1', { assistant: 'Max', prompt: 'how many are inactive', conversationId: 'c1' });
    expect(screen.queryByText('how many users do I have')).not.toBeInTheDocument();

    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    await user.click(screen.getAllByRole('button', { name: 'Copy message' }).at(-1)!);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('3 users are inactive.'));
  });
});
