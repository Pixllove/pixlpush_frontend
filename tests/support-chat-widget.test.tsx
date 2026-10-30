import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SupportChatWidget from '@/components/website/SupportChatWidget';
import { supportApi, type SupportChatAnswer } from '@/lib/support/api';

vi.mock('@/lib/support/api', () => ({
  supportApi: {
    chat: vi.fn(), create: vi.fn(), list: vi.fn(), get: vi.fn(), listConversations: vi.fn(), getConversation: vi.fn(), send: vi.fn(), stream: vi.fn(() => () => undefined), seen: vi.fn(async () => ({ seen: true })),
  },
}));

const api = vi.mocked(supportApi);

describe('support chatbot widget', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listConversations.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('shows approved pricing links from the assistant', async () => {
    api.chat.mockResolvedValue({ reply: 'See pricing.', intent: 'pricing', topic: 'billing', confidence: 0.96, handoff: false, salesForm: false, links: [{ label: 'See pricing', href: 'http://localhost:5173/pricing#plans' }] });
    const user = userEvent.setup();
    render(<SupportChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    expect(screen.queryByRole('button', { name: 'Talk to support' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'How much does it cost?');
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('See pricing.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See pricing' })).toHaveAttribute('href', '/pricing#plans');
  });

  it('opens the sales qualification form for a special offer request', async () => {
    api.chat.mockResolvedValue({ reply: 'I can collect details for sales.', intent: 'sales', topic: 'general', confidence: 0.97, handoff: true, salesForm: true, links: [] });
    const user = userEvent.setup();
    render(<SupportChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'I need a special offer');
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Prepare a special offer')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'How many users?' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Industry' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Channels you want to use' })).toBeInTheDocument();
  });

  it('shows a complete ticket form when the assistant cannot answer', async () => {
    api.chat.mockResolvedValue({ reply: 'I can connect you with support.', intent: 'unknown', topic: 'general', confidence: 0.2, handoff: true, salesForm: false, links: [] });
    const user = userEvent.setup();
    render(<SupportChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'My integration is broken');
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Create a support ticket')).toBeInTheDocument();
    const ticketForm = screen.getByText('Create a support ticket').closest('form');
    expect(ticketForm).not.toBeNull();
    const form = within(ticketForm as HTMLFormElement);
    expect(form.getByRole('textbox', { name: 'Your work email' })).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Campaigns' })).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Integrations' })).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Billing' })).toBeInTheDocument();
    expect(form.getByRole('button', { name: 'Other help' })).toBeInTheDocument();
    expect(form.getByRole('textbox', { name: 'Subject' })).toBeInTheDocument();
    expect(form.getByRole('textbox', { name: 'Describe the issue' })).toHaveValue('My integration is broken');
    await user.click(form.getByRole('button', { name: 'Billing' }));
    expect(form.getByRole('button', { name: 'Billing' })).toHaveAttribute('aria-pressed', 'true');
    expect(form.getByRole('button', { name: 'Other help' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('closes and clears the conversation when authentication changes', async () => {
    api.list.mockResolvedValue({ items: [], nextCursor: null });
    api.chat.mockResolvedValue({ reply: 'Private account answer', intent: 'account', topic: 'account_access', confidence: 0.9, handoff: true, salesForm: false, links: [] });
    const user = userEvent.setup();
    const view = render(<SupportChatWidget authenticated />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'Why is my account locked?');
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Private account answer')).toBeInTheDocument();

    view.rerender(<SupportChatWidget authenticated={false} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open PixlPush support chat' })).toBeInTheDocument());
    expect(screen.queryByText('Private account answer')).not.toBeInTheDocument();
  });

  it('keeps the open conversation while the initial auth state resolves', async () => {
    api.list.mockResolvedValue({ items: [], nextCursor: null });
    api.chat.mockResolvedValue({ reply: 'Here is the next step.', intent: 'conversation', topic: 'general', confidence: 0.9, handoff: false, salesForm: false, links: [] });
    const user = userEvent.setup();
    const view = render(<SupportChatWidget authenticated={false} />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'I need help getting started');
    await user.click(screen.getByRole('button', { name: 'Send question' }));
    expect(await screen.findByText('Here is the next step.')).toBeInTheDocument();

    view.rerender(<SupportChatWidget authenticated />);
    expect(screen.getByText('I need help getting started')).toBeInTheDocument();
    expect(screen.getByText('Here is the next step.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close support chat' })).toBeInTheDocument();
  });

  it('restores the latest persisted conversation when the guest reopens support', async () => {
    api.listConversations.mockResolvedValue({ items: [{ id: 'conversation-1' } as never], nextCursor: null });
    api.getConversation.mockResolvedValue({
      id: 'conversation-1', accountId: null, projectId: null, guestEmail: null, title: 'Pricing',
      lastMessageAt: '2026-10-26T10:00:00.000Z', createdAt: '2026-10-26T09:59:00.000Z', updatedAt: '2026-10-26T10:00:00.000Z', project: null,
      messages: [
        { id: 'm1', role: 'user', body: 'How much does it cost?', metadata: {}, createdAt: '2026-10-26T09:59:00.000Z' },
        { id: 'm2', role: 'assistant', body: 'Here is our pricing.', metadata: { links: [{ label: 'See pricing', href: '/pricing' }] }, createdAt: '2026-10-26T10:00:00.000Z' },
      ],
    });
    const user = userEvent.setup();
    render(<SupportChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    expect(await screen.findByText('Here is our pricing.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See pricing' })).toHaveAttribute('href', '/pricing');
  });

  it('loads an admin reply and lets a signed-out guest continue the same ticket', async () => {
    const ticket = {
      id: 'guest-ticket-1', reference: 'PP-SUP-TEST0001', topic: 'general', subject: 'Talk to support',
      status: 'open', priority: 'normal', source: 'website', guestEmail: 'guest@example.com', project: null,
      lastMessageAt: '2026-10-27T10:00:00.000Z', createdAt: '2026-10-27T09:00:00.000Z', updatedAt: '2026-10-27T10:00:00.000Z',
      messages: [
        { id: 'customer-1', senderType: 'customer', body: 'Can I talk to support?', createdAt: '2026-10-27T09:00:00.000Z', sender: null },
        { id: 'admin-1', senderType: 'admin', body: 'Hello, how can I help you?', createdAt: '2026-10-27T10:00:00.000Z', sender: null },
      ],
    };
    const followUp = { ...ticket, messages: [...ticket.messages, { id: 'customer-2', senderType: 'customer', body: 'Thanks, I need help.', createdAt: '2026-10-27T10:01:00.000Z', sender: null }] };
    api.list.mockResolvedValue({ items: [ticket as never], nextCursor: null });
    api.get.mockResolvedValue(ticket as never);
    api.send.mockResolvedValue(followUp as never);
    const user = userEvent.setup();
    render(<SupportChatWidget authenticated={false} />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));

    expect(await screen.findByText('Hello, how can I help you?')).toBeInTheDocument();
    const composer = screen.getByRole('textbox', { name: 'Type your message' });
    expect(composer).toBeEnabled();
    await user.type(composer, 'Thanks, I need help.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Thanks, I need help.')).toBeInTheDocument();
    expect(api.send).toHaveBeenCalledWith('guest-ticket-1', 'Thanks, I need help.', expect.any(String));
  });

  it('shows all chats as a standalone list without back navigation controls', async () => {
    const ticket = {
      id: 'ticket-1', reference: 'PP-SUP-TEST0002', topic: 'general', subject: 'Project help',
      status: 'closed', priority: 'normal', source: 'dashboard', project: null,
      lastMessageAt: '2026-10-27T10:00:00.000Z', createdAt: '2026-10-27T09:00:00.000Z', updatedAt: '2026-10-27T10:00:00.000Z',
      messages: [{ id: 'message-1', senderType: 'customer', body: 'I need help.', createdAt: '2026-10-27T09:00:00.000Z', sender: null }],
    };
    api.list.mockResolvedValue({ items: [ticket as never], nextCursor: null });
    api.get.mockResolvedValue(ticket as never);
    const user = userEvent.setup();
    render(<SupportChatWidget authenticated />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    expect(await screen.findByText('I need help.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to chats' }));
    expect(await screen.findByText('Your chats')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to chats' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View all chats/ })).not.toBeInTheDocument();
    expect(screen.getByText('Project help')).toBeInTheDocument();
  });

  it('shows an unread badge when a closed chat receives the assistant response', async () => {
    let finishResponse!: (answer: SupportChatAnswer) => void;
    api.chat.mockReturnValue(new Promise<SupportChatAnswer>((resolve) => { finishResponse = resolve; }));
    const user = userEvent.setup();
    render(<SupportChatWidget />);
    await user.click(screen.getByRole('button', { name: 'Open PixlPush support chat' }));
    await user.type(screen.getByRole('textbox', { name: 'Ask support assistant' }), 'Can you help me?');
    const sending = user.click(screen.getByRole('button', { name: 'Send question' }));
    await waitFor(() => expect(screen.getByRole('status', { name: 'PixlPush assistant is typing' })).toBeInTheDocument());
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close support chat' }));
    finishResponse({ reply: 'Of course. Tell me what you need.', intent: 'conversation', topic: 'general', confidence: 0.9, handoff: false, salesForm: false, links: [] });
    await sending;
    await waitFor(() => expect(screen.getByRole('button', { name: 'Open support chat, 1 new message' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Open support chat, 1 new message' }));
    expect(await screen.findByText('Of course. Tell me what you need.')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close support chat' })).toBeInTheDocument();
  });
});
