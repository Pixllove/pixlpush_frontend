import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supportApi } from '@/lib/support/api';

describe('support api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('crypto', { randomUUID: () => '00000000-0000-4000-8000-000000000000' });
  });

  it('sends a chatbot message through the support proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { reply: 'Answer', intent: 'pricing', topic: 'billing', confidence: 0.9, handoff: false, salesForm: false, links: [] } }), { status: 200 }));
    const answer = await supportApi.chat('What is pricing?', [], { conversationId: 'conversation-1', projectId: 'project-1', idempotencyKey: 'chat-message-idempotency-1' });
    expect(answer.intent).toBe('pricing');
    expect(fetchMock).toHaveBeenCalledWith('/api/support/chat', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))).toEqual(expect.objectContaining({ conversationId: 'conversation-1', projectId: 'project-1', idempotencyKey: 'chat-message-idempotency-1' }));
  });

  it('loads persisted support conversations through the proxy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ data: { id: 'conversation-1', messages: [] } }), { status: 200 }));
    await supportApi.listConversations();
    await supportApi.getConversation('conversation/1');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/support/conversations');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/support/conversations/conversation%2F1');
  });

  it('adds an idempotency key when creating a ticket', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { ticket: { id: 't1' }, created: true } }), { status: 201 }));
    await supportApi.create({ email: 'user@example.com', topic: 'general', message: 'Need help', source: 'website' });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).idempotencyKey).toBe('00000000-0000-4000-8000-000000000000');
  });
});
