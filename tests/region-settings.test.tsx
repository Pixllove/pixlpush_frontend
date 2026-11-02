import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegionSettings from '@/components/auth/RegionSettings';
import { getDeviceTimezone, getViewerTimezone, setTimezoneOverride } from '@/lib/timezone';

// This device is in Pakistan for every test.
vi.mock('@/lib/timezone', async (load) => ({ ...(await load<typeof import('@/lib/timezone')>()), getDeviceTimezone: () => 'Asia/Karachi' }));
import type { Account } from '@/types/auth';

let account: Account;
let detected: string | null = 'PK';
const updatePreferences = vi.fn();
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account, isLoading: false }) }));
vi.mock('@/hooks/use-local-pricing', () => ({ useLocalPricing: () => ({ data: detected ? { country: detected } : undefined }) }));
vi.mock('@/lib/auth/api', () => ({ authKeys: { currentUser: () => ['auth', 'me'] }, authApi: { updatePreferences: (input: unknown) => updatePreferences(input) } }));

const base: Account = { id: 'a1', email: 'k@example.com', name: 'K', emailVerified: true, createdAt: '2026-10-22T00:00:00Z', country: null, timezone: null, timezoneAuto: true };
/** The country option whose code column shows `code`. */
const countryOption = async (code: string) => (await screen.findAllByRole('option')).find((o) => o.textContent?.trim().endsWith(code))!;
const renderIt = () => render(<QueryClientProvider client={new QueryClient()}><RegionSettings /></QueryClientProvider>);

beforeEach(() => {
  account = { ...base };
  detected = 'PK';
  updatePreferences.mockReset();
  updatePreferences.mockImplementation(async (input: Partial<Account>) => ({ account: { ...account, ...input } }));
  setTimezoneOverride(null);
});

describe('RegionSettings', () => {
  it('suggests the country detected from the IP and saves it only on confirm', async () => {
    renderIt();
    expect(screen.getByRole('combobox', { name: 'Country or region' })).toHaveValue('Pakistan');
    expect(screen.getByText('Detected from your location. Save to confirm.')).toBeInTheDocument();
    expect(updatePreferences).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ country: 'PK', timezoneAuto: true, timezone: getDeviceTimezone() }));
    expect(await screen.findByText('Country and time zone saved.')).toBeInTheDocument();
  });

  it('nothing to save when the saved values are shown', () => {
    account = { ...base, country: 'PK', timezone: getDeviceTimezone() };
    renderIt();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.queryByText(/Detected from your location/)).toBeNull();
  });

  it('changes the country through the searchable list', async () => {
    account = { ...base, country: 'PK', timezone: getDeviceTimezone() };
    renderIt();
    const input = screen.getByRole('combobox', { name: 'Country or region' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Germa');
    await userEvent.click(await screen.findByRole('option', { name: /Germany/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith(expect.objectContaining({ country: 'DE' })));
  });

  it('automatic zone: the list is locked to this device', () => {
    account = { ...base, country: 'PK', timezone: getDeviceTimezone() };
    renderIt();
    expect(screen.getByRole('checkbox', { name: 'Set time zone automatically' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toBeDisabled();
    expect(screen.getByTestId('local-time')).toHaveTextContent('Your local time:');
  });

  it('manual zone: picks one, saves it, and dates use it everywhere', async () => {
    account = { ...base, country: 'PK', timezone: getDeviceTimezone() };
    renderIt();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Set time zone automatically' }));
    const input = screen.getByRole('combobox', { name: 'Time zone' });
    expect(input).toBeEnabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'Tokyo');
    await userEvent.click(await screen.findByRole('option', { name: /Tokyo/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ country: 'PK', timezoneAuto: false, timezone: 'Asia/Tokyo' }));
    await waitFor(() => expect(getViewerTimezone()).toBe('Asia/Tokyo'));
  });

  it('shows the server error', async () => {
    updatePreferences.mockImplementation(async () => { throw Object.assign(new Error('Use an IANA time zone such as Asia/Karachi'), {}); });
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Use an IANA time zone such as Asia/Karachi')).toBeInTheDocument();
  });
});

describe('country drives the time zone', () => {
  it('picking a country in another time zone switches to that country and says so', async () => {
    account = { ...base, country: 'PK', timezone: 'Asia/Karachi' };
    renderIt();
    const input = screen.getByRole('combobox', { name: 'Country or region' });
    await userEvent.clear(input);
    await userEvent.type(input, 'India');
    await userEvent.click(await countryOption('IN'));
    expect(screen.getByRole('checkbox', { name: 'Set time zone automatically' })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('(UTC+05:30) Kolkata');
    expect(screen.getByTestId('zone-notice')).toHaveTextContent('Time zone set to India');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updatePreferences).toHaveBeenCalledWith({ country: 'IN', timezoneAuto: false, timezone: 'Asia/Kolkata' }));
  });

  it('a multi-zone country picks its main zone and lists its zones first', async () => {
    account = { ...base, country: 'PK', timezone: 'Asia/Karachi' };
    renderIt();
    const input = screen.getByRole('combobox', { name: 'Country or region' });
    await userEvent.clear(input);
    await userEvent.type(input, 'United States');
    await userEvent.click(await countryOption('US'));
    expect((screen.getByRole('combobox', { name: 'Time zone' }) as HTMLInputElement).value).toMatch(/\) New York$/);
    expect(screen.getByTestId('zone-notice')).toHaveTextContent('several time zones');
    await userEvent.click(screen.getByRole('combobox', { name: 'Time zone' }));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Time zones in United States');
  });

  it('a country that matches the device keeps the automatic zone', async () => {
    account = { ...base, country: 'IN', timezone: 'Asia/Karachi' };
    renderIt();
    const input = screen.getByRole('combobox', { name: 'Country or region' });
    await userEvent.clear(input);
    await userEvent.type(input, 'Pakistan');
    await userEvent.click(await screen.findByRole('option', { name: /Pakistan/ }));
    expect(screen.getByRole('checkbox', { name: 'Set time zone automatically' })).toBeChecked();
    expect(screen.queryByTestId('zone-notice')).toBeNull();
  });

  it('saved country with an automatic zone elsewhere: warns and offers the country time', async () => {
    account = { ...base, country: 'IN', timezone: 'Asia/Karachi', timezoneAuto: true };
    renderIt();
    expect(screen.getByTestId('zone-mismatch')).toHaveTextContent('This device is in Karachi (UTC+05:00), which is not in India.');
    await userEvent.click(screen.getByRole('button', { name: 'Use India time' }));
    expect(screen.queryByTestId('zone-mismatch')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('(UTC+05:30) Kolkata');
  });
});

describe('saved Kolkata', () => {
  it('shows a saved modern name as the same zone, with nothing to save', () => {
    account = { ...base, country: 'IN', timezone: 'Asia/Kolkata', timezoneAuto: false };
    renderIt();
    expect(screen.getByRole('combobox', { name: 'Time zone' })).toHaveValue('(UTC+05:30) Kolkata');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });
});

describe('viewer time zone', () => {
  it('uses the manual choice, falls back to the device, ignores invalid zones', () => {
    setTimezoneOverride('Asia/Tokyo');
    expect(getViewerTimezone()).toBe('Asia/Tokyo');
    setTimezoneOverride(null);
    expect(getViewerTimezone()).toBe(getDeviceTimezone());
    setTimezoneOverride('Mars/Base');
    expect(getViewerTimezone()).toBe(getDeviceTimezone());
  });
});
