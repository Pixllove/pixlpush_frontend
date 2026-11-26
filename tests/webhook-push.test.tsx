import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WebhookPush from '@/components/integrations/WebhookPush';

const api = vi.hoisted(() => ({ keys: vi.fn(), createKey: vi.fn(), revokeKey: vi.fn() }));
vi.mock('@/lib/projects/api', () => ({ dataSyncApi: api }));

const renderPush = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <WebhookPush projectId="p1" sourceId="s1" pushUrl="https://api.pixlpush.test/server/v1/webhook/events" canEdit />
    </QueryClientProvider>,
  );

describe('Webhook real-time push card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.keys.mockResolvedValue([]);
  });

  it('shows the push URL and how to authenticate', async () => {
    renderPush();
    expect(screen.getByLabelText('Push URL')).toHaveTextContent('https://api.pixlpush.test/server/v1/webhook/events');
    expect(await screen.findByText(/No push keys yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/Authorization: Bearer/).length).toBeGreaterThan(0);
  });

  it('creates named keys, shows the secret once, and confirms revocation', async () => {
    api.createKey.mockResolvedValue({ id: 'k1', name: 'Production billing', keyPrefix: 'pp_srv_live_abcd1234', key: 'pp_srv_live_abcd1234SECRET', scopes: ['records:write'], lastUsedAt: null, expiresAt: null, revokedAt: null, createdAt: '2026-11-26T00:00:00Z' });
    renderPush();
    await screen.findByText(/No push keys yet/);
    api.keys.mockResolvedValue([{ id: 'k1', name: 'Production billing', keyPrefix: 'pp_srv_live_abcd1234', scopes: ['records:write'], lastUsedAt: null, expiresAt: null, revokedAt: null, createdAt: '2026-11-26T00:00:00Z' }]);

    await userEvent.click(screen.getByRole('button', { name: 'Create push key' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Key name' }), 'Production billing');
    await userEvent.click(screen.getByRole('button', { name: 'Create key' }));
    expect(api.createKey).toHaveBeenCalledWith('p1', 's1', 'Production billing');
    expect(await screen.findByLabelText('Push key')).toHaveTextContent('pp_srv_live_abcd1234SECRET');
    expect(screen.getByText(/won’t be shown again/)).toBeInTheDocument();
    expect(await screen.findByLabelText('Masked push key')).toHaveTextContent('pp_srv_live_abcd1234');

    api.revokeKey.mockResolvedValue({ revoked: true });
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await userEvent.click(screen.getByRole('button', { name: 'Revoke key' }));
    await waitFor(() => expect(api.revokeKey).toHaveBeenCalledWith('p1', 's1', 'k1'));
  });
});
