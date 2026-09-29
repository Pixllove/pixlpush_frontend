import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SendingDomainsPanel from '@/components/dashboard/sending-domains/SendingDomainsPanel';
import * as api from '@/lib/sending-domains/api';
import type { DnsRecord, SendingDomain } from '@/types/sending-domain';

vi.mock('@/lib/sending-domains/api', () => ({
  listSendingDomains: vi.fn(),
  createSendingDomain: vi.fn(),
  getSendingDomain: vi.fn(),
  deleteSendingDomain: vi.fn(),
  analyzeSendingDomain: vi.fn(),
  startProviderConnection: vi.fn(),
  completeProviderConnection: vi.fn(),
  startManualConnection: vi.fn(),
  getDnsRecords: vi.fn(),
  checkDns: vi.fn(),
  verifySendingDomain: vi.fn(),
}));

let role = 'owner';
vi.mock('@/hooks/projects/use-active-project', () => ({
  useActiveProject: () => ({ active: { id: 'p1', role } }),
}));

const m = vi.mocked(api);

const record = (over: Partial<DnsRecord> = {}): DnsRecord => ({
  id: 'dkim',
  type: 'CNAME',
  name: 'selector._domainkey',
  value: 'selector.provider.example',
  purpose: 'DKIM',
  required: true,
  verified: false,
  status: 'pending',
  errorMessage: null,
  ...over,
});

const domain = (over: Partial<SendingDomain> = {}): SendingDomain => ({
  id: 'd1',
  domain: 'example.com',
  senderEmail: 'sender@example.com',
  senderName: null,
  replyTo: null,
  provider: null,
  providerName: null,
  connectionMethod: 'manual',
  providerStatus: 'unknown',
  automaticConnectionAvailable: false,
  status: 'not_configured',
  dnsRecords: [],
  lastCheckedAt: null,
  lastError: null,
  verifiedAt: null,
  createdAt: '2026-09-29T10:00:00.000Z',
  updatedAt: '2026-09-29T10:00:00.000Z',
  ...over,
});

const withRecords = (over: Partial<SendingDomain> = {}) =>
  domain({
    status: 'dns_pending',
    dnsRecords: [
      record(),
      record({ id: 'spf', type: 'TXT', name: '@', value: 'v=spf1 include:relay.example ~all', purpose: 'SPF' }),
      record({ id: 'domain_verification', type: 'TXT', name: '_pixlpush', value: 'pixlpush-verification=abc', purpose: 'DOMAIN_VERIFICATION' }),
      record({ id: 'dmarc', type: 'TXT', name: '_dmarc', value: 'v=DMARC1; p=none;', purpose: 'DMARC' }),
    ],
    ...over,
  });

const analysis = (over = {}) => ({
  providerDetected: false,
  provider: null,
  providerName: null,
  automaticConnectionAvailable: false,
  manualConnectionRequired: true,
  ...over,
});

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SendingDomainsPanel />
    </QueryClientProvider>,
  );
}

const assign = vi.fn();
const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  role = 'owner';
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/dashboard/settings');
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign, search: '', pathname: '/dashboard/settings' } });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: globalThis.location });
});

describe('Sending domains list', () => {
  it('shows a loading state, then every domain with its details and actions', async () => {
    let resolve!: (d: SendingDomain[]) => void;
    m.listSendingDomains.mockReturnValue(new Promise((r) => (resolve = r)));
    renderPanel();
    expect(screen.getByLabelText('Loading sending domains')).toBeInTheDocument();

    resolve([
      withRecords({ provider: 'ionos', providerName: 'IONOS', lastCheckedAt: '2026-09-29T11:00:00.000Z' }),
      domain({ id: 'd2', domain: 'other.org', senderEmail: 'hi@other.org' }),
    ]);
    const row = await screen.findByTestId('domain-row-example.com');
    expect(within(row).getByText('sender@example.com')).toBeInTheDocument();
    expect(within(row).getByText('IONOS')).toBeInTheDocument();
    expect(within(row).getByText('Authentication pending')).toBeInTheDocument();
    for (const action of ['Check status', 'Resolve', 'View DNS records', 'Remove']) expect(within(row).getByRole('button', { name: action })).toBeInTheDocument();

    const other = screen.getByTestId('domain-row-other.org');
    expect(within(other).getByText('Not configured')).toBeInTheDocument();
    expect(within(other).getByText('Never')).toBeInTheDocument();
    expect(within(other).queryByRole('button', { name: 'View DNS records' })).not.toBeInTheDocument();
    expect(m.listSendingDomains).toHaveBeenCalledWith('p1');
  });

  it('shows an empty state', async () => {
    m.listSendingDomains.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('No sending domains yet')).toBeInTheDocument();
  });

  it('shows friendly API and authorization errors, with retry', async () => {
    m.listSendingDomains.mockRejectedValueOnce({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'stack trace at foo.ts:12' });
    renderPanel();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/stack trace/)).not.toBeInTheDocument();

    m.listSendingDomains.mockRejectedValueOnce({ status: 403, code: 'DOMAIN_ACCESS_DENIED', message: 'x' });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Only project owners and admins can manage sending domains.')).toBeInTheDocument();
  });

  it('hides management actions from roles that cannot manage', async () => {
    role = 'analyst';
    m.listSendingDomains.mockResolvedValue([withRecords()]);
    renderPanel();
    const row = await screen.findByTestId('domain-row-example.com');
    expect(within(row).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'View DNS records' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add domain' })).not.toBeInTheDocument();
  });
});

describe('Adding and analyzing a domain', () => {
  beforeEach(() => m.listSendingDomains.mockResolvedValue([]));

  const openAdd = async () => {
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Add domain' }));
    return screen.getByRole('dialog');
  };

  it('validates the email and shows the extracted domain', async () => {
    const dialog = await openAdd();
    const input = within(dialog).getByLabelText(/Sender email/);
    await userEvent.type(input, 'not-an-email');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add domain' }));
    expect(within(dialog).getByText('Enter a valid email address, for example sender@example.com.')).toBeInTheDocument();
    expect(m.createSendingDomain).not.toHaveBeenCalled();

    await userEvent.clear(input);
    await userEvent.type(input, 'Sender@Example.com');
    expect(within(dialog).getByText('Domain: example.com')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Reply-To/), 'bad');
    expect(within(dialog).getByText('Enter a valid Reply-To address.')).toBeInTheDocument();
  });

  it('shows duplicate-domain errors from the backend', async () => {
    m.createSendingDomain.mockRejectedValue({ status: 409, code: 'DOMAIN_ALREADY_EXISTS', message: 'raw' });
    const dialog = await openAdd();
    await userEvent.type(within(dialog).getByLabelText(/Sender email/), 'sender@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add domain' }));
    expect(await within(dialog).findByText('This domain is already added to this project.')).toBeInTheDocument();
  });

  it('creates the domain, shows the analysis loading state and offers IONOS', async () => {
    m.createSendingDomain.mockResolvedValue(domain());
    let finish!: (v: Awaited<ReturnType<typeof api.analyzeSendingDomain>>) => void;
    m.analyzeSendingDomain.mockReturnValue(new Promise((r) => (finish = r)));
    const dialog = await openAdd();
    await userEvent.type(within(dialog).getByLabelText(/Sender email/), 'sender@example.com');
    await userEvent.type(within(dialog).getByLabelText(/Sender name/), 'Example Team');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add domain' }));
    expect(m.createSendingDomain).toHaveBeenCalledWith('p1', { senderEmail: 'sender@example.com', senderName: 'Example Team' });

    expect(await screen.findByText('Analyzing example.com…')).toBeInTheDocument();
    finish({ ...domain({ status: 'provider_selection', provider: 'ionos' }), analysis: analysis({ providerDetected: true, provider: 'ionos', providerName: 'IONOS', automaticConnectionAvailable: true, manualConnectionRequired: false }) });
    expect(await screen.findByText(/Automatic connection available/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect a different way' })).toBeInTheDocument();

    // IONOS redirect: backend URL, only ids remembered.
    m.startProviderConnection.mockResolvedValue({ authorizationUrl: 'https://domainconnect.ionos.com/async/x?state=s', domain: domain() });
    await userEvent.click(screen.getByRole('button', { name: 'Continue with IONOS' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://domainconnect.ionos.com/async/x?state=s'));
    expect(m.startProviderConnection).toHaveBeenCalledWith('p1', 'd1', 'ionos');
    expect(JSON.parse(sessionStorage.getItem('pixlpush.sendingDomainConnection')!)).toEqual({ projectId: 'p1', domainId: 'd1', provider: 'ionos' });
    expect(screen.getByText('Automatic connection pending')).toBeInTheDocument();
  });

  it('explains when automatic connection is not configured or no provider is found', async () => {
    m.listSendingDomains.mockResolvedValue([domain()]);
    m.analyzeSendingDomain.mockResolvedValueOnce({ ...domain(), analysis: analysis({ providerDetected: true, provider: 'ionos', providerName: 'IONOS' }) });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    expect(await screen.findByText(/automatic connection is not configured. Manual connection required/)).toBeInTheDocument();

    m.analyzeSendingDomain.mockResolvedValueOnce({ ...domain(), analysis: analysis() });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No supported automatic provider found/)).toBeInTheDocument();
  });

  it('retries a failed analysis and falls back to manual connection', async () => {
    m.listSendingDomains.mockResolvedValue([domain()]);
    m.analyzeSendingDomain.mockRejectedValueOnce({ status: 0, code: 'NETWORK_ERROR', message: '' });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    expect(await screen.findByText('Cannot reach the server. Check your connection.')).toBeInTheDocument();

    m.analyzeSendingDomain.mockResolvedValueOnce({ ...domain(), analysis: analysis() });
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(/No supported automatic provider found/)).toBeInTheDocument();

    m.startManualConnection.mockResolvedValue(withRecords());
    m.getSendingDomain.mockResolvedValue(withRecords());
    await userEvent.click(screen.getByRole('button', { name: 'Connect manually' }));
    expect(await screen.findByText('Go to your DNS provider')).toBeInTheDocument();
    expect(m.startManualConnection).toHaveBeenCalledWith('p1', 'd1');
  });

  it('refuses a non-https authorization URL', async () => {
    m.listSendingDomains.mockResolvedValue([domain()]);
    m.analyzeSendingDomain.mockResolvedValue({ ...domain(), analysis: analysis({ providerDetected: true, provider: 'ionos', providerName: 'IONOS', automaticConnectionAvailable: true }) });
    m.startProviderConnection.mockResolvedValue({ authorizationUrl: 'javascript:alert(1)', domain: domain() });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with IONOS' }));
    expect(await screen.findByText('The provider connection failed. Try again or connect manually.')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe('Manual DNS setup', () => {
  const openDns = async (d: SendingDomain) => {
    m.listSendingDomains.mockResolvedValue([d]);
    m.getSendingDomain.mockResolvedValue(d);
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'View DNS records' }));
    return screen.findByRole('dialog');
  };

  it('shows each record in its own card with copy buttons and the guidance', async () => {
    const dialog = await openDns(withRecords());
    const card = await within(dialog).findByTestId('dns-record-dkim');
    expect(within(card).getByText('CNAME')).toBeInTheDocument();
    expect(within(card).getByText('DKIM')).toBeInTheDocument();
    expect(within(card).getByText('selector._domainkey')).toBeInTheDocument();
    expect(within(card).getByText('selector.provider.example')).toBeInTheDocument();
    expect(within(card).getByText('Not checked yet')).toBeInTheDocument();
    expect(within(dialog).getByTestId('dns-record-spf')).toHaveTextContent('SPF/SenderID');
    expect(within(dialog).getByTestId('dns-record-domain_verification')).toHaveTextContent('Domain verification');

    await userEvent.click(within(card).getByRole('button', { name: 'Copy name' }));
    expect(writeText).toHaveBeenCalledWith('selector._domainkey');
    await userEvent.click(within(card).getByRole('button', { name: 'Copy value' }));
    expect(writeText).toHaveBeenCalledWith('selector.provider.example');

    for (const text of [/several hours/, /stands for the root domain/, /Copy CNAME and TXT values exactly/, /single SPF record/, /stays unauthenticated/]) {
      expect(within(dialog).getByText(text)).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('checks status, reloads from the backend and shows per-record errors', async () => {
    const dialog = await openDns(withRecords());
    const checked = withRecords({
      status: 'partially_verified',
      lastError: 'DOMAIN_NOT_VERIFIED',
      lastCheckedAt: '2026-09-29T12:00:00.000Z',
      dnsRecords: [
        record({ status: 'not_found', errorCode: 'DNS_RECORD_NOT_FOUND', errorMessage: 'DKIM record not found.' }),
        record({ id: 'spf', type: 'TXT', name: '@', value: 'v=spf1 ~all', purpose: 'SPF', status: 'mismatch', errorMessage: 'Several SPF records found. Merge them into a single v=spf1 record.' }),
        record({ id: 'domain_verification', type: 'TXT', name: '_pixlpush', value: 'x', purpose: 'DOMAIN_VERIFICATION', status: 'propagating', errorMessage: 'Waiting.' }),
        record({ id: 'dmarc', type: 'TXT', name: '_dmarc', value: 'v=DMARC1;', purpose: 'DMARC', status: 'verified', verified: true }),
      ],
    });
    m.checkDns.mockResolvedValue(checked);
    m.getSendingDomain.mockResolvedValue(checked);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check status' }));

    expect(await within(dialog).findByText(/Partially verified: 1 of 4 required records are correct/)).toBeInTheDocument();
    expect(m.checkDns).toHaveBeenCalledWith('p1', 'd1');
    expect(m.getSendingDomain).toHaveBeenCalledTimes(2);
    expect(within(dialog).getByTestId('dns-record-dkim')).toHaveTextContent('Not found');
    expect(within(dialog).getByText('DKIM record not found.')).toBeInTheDocument();
    expect(within(dialog).getByTestId('dns-record-spf')).toHaveTextContent('Value mismatch');
    expect(within(dialog).getByTestId('dns-record-domain_verification')).toHaveTextContent('Waiting for propagation');
    expect(within(dialog).getByTestId('dns-record-dmarc')).toHaveTextContent('Verified');
  });

  it('offers a retry when a check fails', async () => {
    const dialog = await openDns(withRecords());
    m.checkDns.mockRejectedValueOnce({ status: 0, code: 'NETWORK_ERROR', message: '' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check status' }));
    expect(await within(dialog).findByText('Cannot reach the server. Check your connection.')).toBeInTheDocument();
    m.checkDns.mockResolvedValueOnce(withRecords());
    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(m.checkDns).toHaveBeenCalledTimes(2));
  });

  it('shows a verification failure', async () => {
    const dialog = await openDns(withRecords({ status: 'verification_failed', lastError: 'SMTP_NOT_CONFIGURED' }));
    expect(await within(dialog).findByText(/Set up the SMTP relay under Email sending/)).toBeInTheDocument();
  });

  it('shows a fully authenticated domain', async () => {
    const verified = withRecords({ status: 'verified', verifiedAt: '2026-09-29T12:00:00.000Z', dnsRecords: withRecords().dnsRecords.map((r) => ({ ...r, verified: true, status: 'verified' as const })) });
    const dialog = await openDns(verified);
    expect(await within(dialog).findByText('example.com is authenticated. You can send email from it.')).toBeInTheDocument();
    const row = screen.getByTestId('domain-row-example.com');
    expect(within(row).getByText('Authenticated')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });

  it('checks status from the list row', async () => {
    m.listSendingDomains.mockResolvedValue([withRecords()]);
    m.checkDns.mockResolvedValue(withRecords({ status: 'verified' }));
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Check status' }));
    expect(await screen.findByText('example.com is authenticated.')).toBeInTheDocument();
    expect(m.listSendingDomains).toHaveBeenCalledTimes(2);
  });
});

describe('Provider callback', () => {
  const returnFrom = (search: string) => {
    sessionStorage.setItem('pixlpush.sendingDomainConnection', JSON.stringify({ projectId: 'p1', domainId: 'd1', provider: 'ionos' }));
    window.history.replaceState(null, '', `/dashboard/settings/sending-domains/callback${search}`);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...globalThis.location, assign, search, pathname: '/dashboard/settings/sending-domains/callback' } });
  };

  it('finishes a successful connection and removes the code from the URL', async () => {
    returnFrom('?code=secret-code&state=s1');
    m.listSendingDomains.mockResolvedValue([withRecords()]);
    m.completeProviderConnection.mockResolvedValue(withRecords());
    m.getSendingDomain.mockResolvedValue(withRecords());
    renderPanel();
    expect(await screen.findByText('example.com is connected. We are checking the DNS records now.')).toBeInTheDocument();
    expect(m.completeProviderConnection).toHaveBeenCalledWith('p1', 'd1', 'ionos', { code: 'secret-code', state: 's1', error: undefined });
    expect(document.URL).not.toContain('secret-code');
    expect(document.URL).not.toContain('state=');
    expect(sessionStorage.getItem('pixlpush.sendingDomainConnection')).toBeNull();
  });

  it('reports a cancelled connection', async () => {
    returnFrom('?error=access_denied&state=s1');
    m.listSendingDomains.mockResolvedValue([domain({ status: 'provider_selection' })]);
    m.completeProviderConnection.mockRejectedValue({ status: 400, code: 'PROVIDER_CONNECTION_CANCELLED', message: 'raw' });
    renderPanel();
    expect(await screen.findByText('The connection was cancelled. You can try again or connect manually.')).toBeInTheDocument();
  });

  it('rejects a callback that does not belong to this project', async () => {
    returnFrom('?code=c&state=s1');
    sessionStorage.setItem('pixlpush.sendingDomainConnection', JSON.stringify({ projectId: 'other', domainId: 'd1', provider: 'ionos' }));
    m.listSendingDomains.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('This connection link is invalid or has expired. Start the connection again.')).toBeInTheDocument();
    expect(m.completeProviderConnection).not.toHaveBeenCalled();
  });
});

describe('Removing a domain', () => {
  it('asks for confirmation, deletes and reloads', async () => {
    m.listSendingDomains.mockResolvedValue([withRecords()]);
    m.deleteSendingDomain.mockResolvedValue(null);
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Remove example.com?')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove domain' }));
    expect(m.deleteSendingDomain).toHaveBeenCalledWith('p1', 'd1');
    expect(await screen.findByText('example.com was removed.')).toBeInTheDocument();
    expect(m.listSendingDomains).toHaveBeenCalledTimes(2);
  });

  it('shows a delete error inside the confirmation', async () => {
    m.listSendingDomains.mockResolvedValue([withRecords()]);
    m.deleteSendingDomain.mockRejectedValue({ status: 404, code: 'DOMAIN_NOT_FOUND', message: 'raw' });
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove domain' }));
    expect(await screen.findByText('This sending domain no longer exists. Refresh the list.')).toBeInTheDocument();
  });
});
