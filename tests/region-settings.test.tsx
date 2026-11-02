import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegionSettings from '@/components/auth/RegionSettings';
import { getDeviceTimezone, getViewerTimezone, setTimezoneOverride } from '@/lib/timezone';
import type { Account } from '@/types/auth';

let account: Account;
let detected: string | null = 'PK';
const updatePreferences = vi.fn();
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account, isLoading: false }) }));
vi.mock('@/hooks/use-local-pricing', () => ({ useLocalPricing: () => ({ data: detected ? { country: detected } : undefined }) }));
vi.mock('@/lib/auth/api', () => ({ authKeys: { currentUser: () => ['auth', 'me'] }, authApi: { updatePreferences: (input: unknown) => updatePreferences(input) } }));

const base: Account = { id: 'a1', email: 'k@example.com', name: 'K', emailVerified: true, createdAt: '2026-10-22T00:00:00Z', country: null, timezone: null, timezoneAuto: true };
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
