import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailPanel from '@/components/dashboard/EmailPanel';
import { ImportConsentConfirmation } from '@/components/dashboard/UserImportDialog';
import { userImportApi } from '@/lib/projects/api';
import type { EmailSettings } from '@/types/project';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/client', async (original) => ({ ...(await original<object>()), authRequest: request }));
vi.mock('@/hooks/projects/use-active-project', () => ({
  useActiveProject: () => ({ active: { id: 'p1', role: 'owner', name: 'Acme' } }),
}));

const settings = (over: Partial<EmailSettings> = {}): EmailSettings => ({
  sendingDomain: 'shop.example.com',
  senderEmail: 'news@shop.example.com',
  senderName: 'Shop',
  dnsRecords: [],
  status: 'pending_verification',
  lastError: null,
  lastCheckedAt: null,
  productionSendingEnabled: false,
  sending: {
    ready: false,
    blockers: [
      { code: 'SMTP_NOT_CONFIGURED', message: 'Connect the email provider (SMTP relay) this project sends through.' },
      { code: 'FEEDBACK_NOT_CONFIGURED', message: 'Bounces and spam complaints cannot be received yet.' },
    ],
  },
  smtp: null,
  webhook: { url: 'https://api.test/email/v1/webhooks/p1', secretSet: false },
  ...over,
});
const readySettings = settings({
  productionSendingEnabled: true,
  sending: { ready: true, blockers: [] },
  smtp: { host: 'smtp.ionos.com', port: 587, secure: false, username: 'news', passwordSet: true },
  webhook: { url: 'https://api.test/email/v1/webhooks/p1', secretSet: true },
});

/** Every call goes through authRequest(path, body, base, method); answer by path. */
const serve = (current: EmailSettings) =>
  request.mockImplementation(async (path: string) => {
    if (path.endsWith('/email-settings')) return current;
    if (path.endsWith('/webhook-secret')) return { secret: 'whsec_once', url: current.webhook!.url, signing: 'x-pixlpush-signature: hex HMAC-SHA256' };
    if (path.endsWith('/test')) return { sent: true, to: 'me@example.com' };
    return {};
  });
const calls = (suffix: string) => request.mock.calls.filter(([path]) => (path as string).endsWith(suffix));

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <EmailPanel />
    </QueryClientProvider>,
  );

beforeEach(() => {
  request.mockReset();
});

describe('Email sending setup', () => {
  it('shows an incomplete provider connection instead of a finished setup', async () => {
    serve(settings());
    renderPanel();
    expect(await screen.findByText('Provider connection incomplete')).toBeInTheDocument();
    expect(screen.getByText('Connect the email provider (SMTP relay) this project sends through.')).toBeInTheDocument();
    expect(screen.getByText('Bounces and spam complaints cannot be received yet.')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test email' })).toBeDisabled();
    expect(screen.queryByText('Ready to send')).not.toBeInTheDocument();
    expect(screen.queryByText(/sending connection ready/)).not.toBeInTheDocument();
  });

  it('saves the sending connection the backend requires', async () => {
    serve(settings());
    renderPanel();
    await userEvent.type(await screen.findByLabelText(/SMTP host/), 'smtp.ionos.com');
    await userEvent.type(screen.getByLabelText(/Username/), 'news@shop.example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'relay-pass');
    await userEvent.click(screen.getByRole('button', { name: 'Save sending connection' }));

    await waitFor(() => expect(calls('/email-settings/smtp')).toHaveLength(1));
    expect(calls('/email-settings/smtp')[0]).toEqual([
      '/p1/email-settings/smtp',
      { host: 'smtp.ionos.com', port: 587, username: 'news@shop.example.com', password: 'relay-pass' },
      '/api/projects',
      'PUT',
    ]);
    // Saving is not verifying: the panel still does not claim the project can send.
    expect(await screen.findByText(/Sending connection saved/)).toBeInTheDocument();
    expect(screen.queryByText('Ready to send')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toHaveValue('');
  });

  it('creates the bounce and complaint webhook secret and shows it once', async () => {
    serve(settings());
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Create webhook secret' }));
    expect(await screen.findByText('whsec_once')).toBeInTheDocument();
    expect(screen.getByText('https://api.test/email/v1/webhooks/p1')).toBeInTheDocument();
  });

  it('says ready and offers a test email only when the backend reports every check passed', async () => {
    serve(readySettings);
    renderPanel();
    expect(await screen.findByText('Ready to send')).toBeInTheDocument();
    expect(screen.getByText('Domain authenticated and sending connection ready.')).toBeInTheDocument();
    expect(screen.queryByText('Provider connection incomplete')).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Send to/), 'me@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send test email' }));
    expect(await screen.findByText('Test email sent to me@example.com. Check that it arrived.')).toBeInTheDocument();
    expect(calls('/email-settings/test')[0][1]).toEqual({ to: 'me@example.com' });
  });
});

describe('Import consent confirmation', () => {
  it('asks for an explicit confirmation and explains what it covers', async () => {
    const onChange = vi.fn();
    render(<ImportConsentConfirmation checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'I confirm that all imported contacts have consented to receive email communication.' });
    expect(box).not.toBeChecked();
    expect(screen.getByText(/applies to every contact in this import/)).toBeInTheDocument();
    expect(screen.getByText(/unsubscribed or complained will not be contacted/)).toBeInTheDocument();
    expect(screen.getByText(/You are responsible for holding valid consent/)).toBeInTheDocument();
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('sends the confirmation to the backend with the commit', async () => {
    request.mockResolvedValue({});
    await userImportApi.commit('p1', 'i1', undefined, true);
    expect(request.mock.lastCall).toEqual(['/p1/user-imports/i1/commit', { emailConsentConfirmed: true }, '/api/projects']);
    await userImportApi.commit('p1', 'i1', 'VIPs');
    expect(request.mock.lastCall![1]).toEqual({ audienceGroupName: 'VIPs' });
  });
});
