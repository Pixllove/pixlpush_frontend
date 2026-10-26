
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
  create: (input: { email?: string; topic: SupportTopic; subject?: string; message: string; projectId?: string; source: 'website' | 'dashboard'; }) =>
    supportRequest<{ ticket: SupportTicket; created: boolean }>('tickets', { method: 'POST', body: JSON.stringify(input) }),
  list: () => supportRequest<{ items: SupportTicket[]; nextCursor: string | null }>('tickets'),
  get: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}`),
  send: (ticketId: string, message: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/messages`, { method: 'POST', body: JSON.stringify({ message, idempotencyKey: crypto.randomUUID() }) }),
  close: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/close`, { method: 'POST', body: '{}' }),
  reopen: (ticketId: string) => supportRequest<SupportTicket>(`tickets/${encodeURIComponent(ticketId)}/reopen`, { method: 'POST', body: '{}' }),
};

export const supportKeys = {
  all: ['support'] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
  ticket: (id: string) => [...supportKeys.all, 'ticket', id] as const,
};

