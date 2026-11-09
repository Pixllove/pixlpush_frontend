import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SdkKeysPanel from '@/components/dashboard/SdkKeysPanel';
import type { SdkKey } from '@/types/project';

const api = { list: vi.fn(), create: vi.fn(), revoke: vi.fn(), reveal: vi.fn(), remove: vi.fn() };
vi.mock('@/lib/projects/api', () => ({
  projectKeys: { setting: (id: string, area: string) => ['projects', id, 'settings', area] },
  sdkKeyApi: {
    list: (...a: unknown[]) => api.list(...a),
    create: (...a: unknown[]) => api.create(...a),
    revoke: (...a: unknown[]) => api.revoke(...a),
    reveal: (...a: unknown[]) => api.reveal(...a),
    remove: (...a: unknown[]) => api.remove(...a),
  },
  emailApi: {}, firebaseApi: {}, hubspotApi: {}, onboardingApi: {},
}));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'p1', slug: 'demo', role: 'owner', name: 'Demo' } }) }));
vi.mock('@/components/dashboard/IdentityVerificationCard', () => ({ default: () => null }));

const key = (over: Partial<SdkKey>): SdkKey => ({
  id: 'k1', name: 'Production', keyPrefix: 'pp_sk_abcdefghij', status: 'active', lastUsedAt: null,
  createdAt: '2026-10-22T00:00:00Z', revokedAt: null, revealable: true, ...over,
});
let keys: SdkKey[];
const renderIt = () => render(<QueryClientProvider client={new QueryClient()}><SdkKeysPanel /></QueryClientProvider>);

beforeEach(() => {
  Object.values(api).forEach((fn) => fn.mockReset());
  api.list.mockImplementation(async () => keys);
  api.reveal.mockResolvedValue({ id: 'k1', name: 'Production', key: 'pp_sk_abcdefghij_FULLSECRET' });
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

describe('SDK keys', () => {
  it('reveals from the backend, hides, and copies an active key', async () => {
    keys = [key({}), key({ id: 'k2', name: 'Staging' })];
    renderIt();
    expect(await screen.findByText('Production')).toBeInTheDocument();
    expect(screen.queryByText('pp_sk_abcdefghij_FULLSECRET')).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Reveal' })[0]!);
    expect(await screen.findByText('pp_sk_abcdefghij_FULLSECRET')).toBeInTheDocument();
    expect(api.reveal).toHaveBeenCalledWith('p1', 'k1');

    // Hide forgets the key; the next copy asks the backend again.
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('pp_sk_abcdefghij_FULLSECRET')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Copy key' })[0]!);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pp_sk_abcdefghij_FULLSECRET'));
    expect(api.reveal).toHaveBeenCalledTimes(2);
  });

  it('asks for the key name before revoking the last active key', async () => {
    keys = [key({})];
    api.revoke.mockImplementation(async () => { keys = [key({ status: 'revoked', revokedAt: '2026-11-09T00:00:00Z' })]; return keys[0]; });
    renderIt();
    await userEvent.click(await screen.findByRole('button', { name: 'Actions for Production' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Revoke key' }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Revoke key' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Key name'), 'Production');
    await userEvent.click(confirm);
    await waitFor(() => expect(api.revoke).toHaveBeenCalledWith('p1', 'k1'));
    expect(await screen.findByText('Revoked keys (1)')).toBeInTheDocument();
    expect(screen.getByText('No active SDK keys')).toBeInTheDocument();
  });

  it('offers a one-click replacement for an older key that cannot be shown', async () => {
    keys = [key({ revealable: false })];
    api.create.mockResolvedValue({ ...key({ id: 'k3', name: 'Production (replacement)' }), key: 'pp_sk_NEWKEY_VALUE' });
    renderIt();
    expect(await screen.findByText('Production')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Replace key' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('p1', 'Production (replacement)'));
    expect(await screen.findByText('pp_sk_NEWKEY_VALUE')).toBeInTheDocument();
    expect(api.reveal).not.toHaveBeenCalled();
  });
});
