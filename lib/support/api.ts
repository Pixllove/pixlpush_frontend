
export type SupportTopic = 'campaigns' | 'integrations' | 'billing' | 'account_access' | 'technical' | 'general';
export type SupportStatus = 'open' | 'in_progress' | 'waiting_on_customer' | 'resolved' | 'closed';
export type SupportPriority = 'normal' | 'high' | 'urgent';

export type SupportMessage = {
  id: string;
  senderType: 'customer' | 'admin' | 'system';
  body: string;
  createdAt: string;
  sender: { name: string | null; email: string } | null;
};

export type SupportTicket = {
  id: string;
  reference: string;
  topic: SupportTopic;
  subject: string | null;
  status: SupportStatus;
  priority: SupportPriority;
  source: 'website' | 'dashboard';
  guestEmail?: string | null;
  project: { id: string; name: string; slug: string } | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
};

export type SupportChatMessage = { role: 'user' | 'assistant'; content: string };
export type SupportConversationMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  body: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
export type SupportConversation = {
  id: string;
  accountId: string | null;
  projectId: string | null;
  guestEmail: string | null;
  title: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; slug: string } | null;
  messageCount?: number;
  lastMessage?: SupportConversationMessage | null;
  messages?: SupportConversationMessage[];
};
export type SupportChatAnswer = {
  reply: string;
  conversationId?: string;
  guestToken?: string;
  intent: 'greeting' | 'conversation' | 'pricing' | 'sales' | 'product' | 'technical' | 'billing' | 'account' | 'human' | 'unknown';
  topic: SupportTopic;
  confidence: number;
  handoff: boolean;
  salesForm: boolean;
  links: Array<{ label: string; href: string }>;
};

async function supportRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/support/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error((payload as { error?: { message?: string } })?.error?.message ?? 'Support request failed.');
  return (payload as { data: T }).data;
}

export const supportApi = {
  chat: (message: string, transcript?: SupportChatMessage[], options?: { conversationId?: string; projectId?: string; idempotencyKey?: string }) =>
    supportRequest<SupportChatAnswer>('chat', { method: 'POST', body: JSON.stringify({ message, transcript, ...options }) }),
  listConversations: () => supportRequest<{ items: SupportConversation[]; nextCursor: string | null }>('conversations'),
  getConversation: (conversationId: string) => supportRequest<SupportConversation>(`conversations/${encodeURIComponent(conversationId)}`),
  create: (input: { email?: string; topic: SupportTopic; subject?: string; message: string; projectId?: string; source: 'website' | 'dashboard'; }) =>
    supportRequest<{ ticket: SupportTicket; created: boolean }>('tickets', { method: 'POST', body: JSON.stringify({ ...input, pageUrl: typeof window === 'undefined' ? undefined : window.location.href, idempotencyKey: crypto.randomUUID() }) }),
  list: () => supportRequest<{ items: SupportTicket[]; nextCursor: string | null }>('tickets'),
  get: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}`),
  send: (ticketId: string, message: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/messages`, { method: 'POST', body: JSON.stringify({ message, idempotencyKey: crypto.randomUUID() }) }),
  stream: (ticketId: string, onMessage: () => void) => {
    const stream = new EventSource(`/api/support/tickets/${encodeURIComponent(ticketId)}/stream`);
    stream.addEventListener('support.message.created', onMessage);
    stream.onerror = () => stream.close();
    return () => stream.close();
  },
  close: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/close`, { method: 'POST', body: '{}' }),
  reopen: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/reopen`, { method: 'POST', body: '{}' }),
};

export const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
};

