import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
      { code: 'PLATFORM_PROVIDER_NOT_CONFIGURED', message: 'PixlPush email delivery is not ready yet.' },
      { code: 'PLATFORM_FEEDBACK_NOT_CONFIGURED', message: 'PixlPush deliverability protection is not ready yet.' },
    ],
  },
  ...over,
});
/** Every call goes through authRequest(path, body, base, method); answer by path. */
const serve = (current: EmailSettings) =>
  request.mockImplementation(async (path: string) => {
    if (path.endsWith('/email-settings')) return current;
    if (path.endsWith('/test')) return { sent: true, to: 'me@example.com' };
    return {};
  });
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
  it('shows platform-managed delivery instead of project connection controls', async () => {
    serve(settings());
    renderPanel();
    expect(await screen.findByText('PixlPush email delivery')).toBeInTheDocument();
    expect(screen.getByText(/PixlPush manages the delivery infrastructure, bounce protection/)).toBeInTheDocument();
    expect(screen.queryByText(/SMTP host/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Create webhook secret/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send test email' })).toBeDisabled();
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
