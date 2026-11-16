import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ApnsConnectDialog, { keyIdFromFileName } from '@/components/dashboard/ApnsConnectDialog';
import FirebasePanel from '@/components/dashboard/FirebasePanel';
import { isPushReady, pushReadyOf } from '@/lib/onboarding';
import { apnsApi, firebaseApi } from '@/lib/projects/api';
import type { FirebaseSettings } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  apnsApi: { get: vi.fn(), upload: vi.fn(), verify: vi.fn(), disconnect: vi.fn() },
  firebaseApi: { get: vi.fn(), upload: vi.fn(), verify: vi.fn(), disconnect: vi.fn() },
  onboardingApi: { update: vi.fn() },
  emailApi: {}, integrationsApi: {}, sdkKeyApi: {},
  projectKeys: { setting: (id: string, area: string) => ['projects', id, area], integrations: (id: string) => ['projects', id, 'integrations'] },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/dashboard/settings', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'p1', role: 'owner', name: 'Demo' } }) }));

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const P8 = '-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg\n-----END PRIVATE KEY-----\n';
const p8File = (name = 'AuthKey_ABC123DEF4.p8', text = P8) => new File([text], name, { type: 'application/octet-stream' });

const settings = (over: Partial<FirebaseSettings> = {}): FirebaseSettings => ({
  status: 'not_configured', platforms: ['mobile'], firebaseProjectId: null, clientEmail: null, activeTokens: 0,
  apns: { status: 'not_configured' }, ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('push ready (Firebase or APNs)', () => {
  it('mobile is ready with Firebase, with APNs, or both; never with neither', () => {
    expect(isPushReady(['mobile'], 'connected')).toBe(true);
    expect(isPushReady(['mobile'], 'not_configured', 'connected')).toBe(true);
    expect(isPushReady(['mobile'], 'connected', 'connected')).toBe(true);
    expect(isPushReady(['mobile'], 'not_configured', 'error')).toBe(false);
    expect(isPushReady(['web'], undefined)).toBe(true);
  });

  it('prefers the backend answer, and falls back to Firebase or APNs', () => {
    expect(pushReadyOf(settings({ pushReady: false, status: 'connected' }))).toBe(false);
    expect(pushReadyOf(settings({ apns: { status: 'connected' } }))).toBe(true);
    expect(pushReadyOf(settings())).toBe(false);
  });

  it('reads the Key ID from Apple’s file name', () => {
    expect(keyIdFromFileName('AuthKey_ABC123DEF4.p8')).toBe('ABC123DEF4');
    expect(keyIdFromFileName('authkey_abc123def4.P8')).toBe('ABC123DEF4');
    expect(keyIdFromFileName('my-key.p8')).toBeUndefined();
  });
});

describe('Connect Apple Push dialog', () => {
  it('fills the Key ID from the file, checks the ids, and sends the key with Apple’s ids', async () => {
    vi.mocked(apnsApi.upload).mockResolvedValue({ status: 'connected' });
    const onConnected = vi.fn();
    wrap(<ApnsConnectDialog open onClose={() => undefined} projectId="p1" onConnected={onConnected} />);
    const submit = screen.getByRole('button', { name: 'Validate and connect' });
    expect(submit).toBeDisabled();

    await userEvent.upload(screen.getByLabelText('APNs key file'), p8File());
    await waitFor(() => expect(screen.getByLabelText('Key ID')).toHaveValue('ABC123DEF4'));
    await userEvent.type(screen.getByLabelText('Team ID'), 'team');
    expect(screen.getByText('10 letters and digits')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Team ID'), '123456');
    await userEvent.type(screen.getByLabelText('Bundle ID'), 'com.example.app');
    expect(submit).toBeEnabled();

    await userEvent.click(submit);
    await waitFor(() => expect(apnsApi.upload).toHaveBeenCalledWith('p1', { teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app', privateKey: P8 }));
    expect(onConnected).toHaveBeenCalled();
  });

  it('refuses a file that is not a .p8 key', async () => {
    wrap(<ApnsConnectDialog open onClose={() => undefined} projectId="p1" />);
    await userEvent.upload(screen.getByLabelText('APNs key file'), p8File('AuthKey_ABC123DEF4.p8', '{"project_info":{}}'));
    expect(await screen.findByText(/not an APNs key/)).toBeInTheDocument();
  });

  it('shows Apple’s reason when the key is rejected', async () => {
    vi.mocked(apnsApi.upload).mockRejectedValue({ message: 'Apple rejected this key. Check that the Key ID and Team ID belong to this .p8 file.' });
    wrap(<ApnsConnectDialog open onClose={() => undefined} projectId="p1" existing={{ status: 'connected', teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Validate and connect' }));
    expect(await screen.findByText(/Apple rejected this key/)).toBeInTheDocument();
    // Replacing ids only keeps the stored key: no privateKey is sent.
    expect(apnsApi.upload).toHaveBeenCalledWith('p1', { teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app' });
  });

  it('needs the new bundle id typed to move push to another app', async () => {
    vi.mocked(apnsApi.upload).mockResolvedValue({ status: 'connected' });
    wrap(<ApnsConnectDialog open onClose={() => undefined} projectId="p1" existing={{ status: 'connected', teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app' }} />);
    const bundle = screen.getByLabelText('Bundle ID');
    await userEvent.clear(bundle);
    await userEvent.type(bundle, 'com.example.other');
    const submit = screen.getByRole('button', { name: 'Validate and connect' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Type "com.example.other" to confirm'), 'com.example.other');
    await userEvent.click(submit);
    await waitFor(() => expect(apnsApi.upload).toHaveBeenCalledWith('p1', expect.objectContaining({ bundleId: 'com.example.other', confirmBundleId: 'com.example.other' })));
  });
});

describe('Push setup panel', () => {
  it('an iOS app without Firebase: Apple Push connected, Android note, no Firebase checklist', async () => {
    vi.mocked(firebaseApi.get).mockResolvedValue(settings({
      pushReady: true,
      apns: { status: 'connected', teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app', activeDevices: 3 },
    }));
    wrap(<FirebasePanel />);
    expect(await screen.findByText('Apple Push (iOS without Firebase)')).toBeInTheDocument();
    expect(await screen.findByText(/com\.example\.app · Team TEAM123456 · Key ABC123DEF4 · 3 iOS devices/)).toBeInTheDocument();
    expect(screen.getByText(/Android apps still need Firebase/)).toBeInTheDocument();
    expect(screen.queryByText('Firebase checklist')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace key' })).toBeInTheDocument();
  });

  it('nothing connected yet: both options, Firebase checklist shown', async () => {
    vi.mocked(firebaseApi.get).mockResolvedValue(settings());
    wrap(<FirebasePanel />);
    expect(await screen.findByRole('button', { name: 'Connect APNs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Firebase' })).toBeInTheDocument();
    expect(screen.getByText('Firebase checklist')).toBeInTheDocument();
  });

  it('re-check and disconnect call the APNs API', async () => {
    vi.mocked(firebaseApi.get).mockResolvedValue(settings({ apns: { status: 'error', teamId: 'TEAM123456', keyId: 'ABC123DEF4', bundleId: 'com.example.app', lastError: 'Apple rejected the stored APNs key while sending.' } }));
    vi.mocked(apnsApi.verify).mockResolvedValue({ status: 'connected' });
    vi.mocked(apnsApi.disconnect).mockResolvedValue({ status: 'not_configured' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    wrap(<FirebasePanel />);
    expect(await screen.findByText('Apple rejected the stored APNs key while sending.')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Re-check' }).at(-1)!);
    await waitFor(() => expect(apnsApi.verify).toHaveBeenCalledWith('p1'));
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(apnsApi.disconnect).toHaveBeenCalledWith('p1'));
  });
});
