import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { billingApi } from '@/lib/projects/api';
import { PUBLIC_PRICES } from '@/lib/billing';
import BillingCheckout from '@/components/dashboard/BillingCheckout';

// Read when the checkout module loads, so it is set before the imports run.
vi.hoisted(() => { process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'; });

// Stripe.js is replaced by stand-ins: the address element reports a complete address, the payment element is ready.
const { stripe, elements } = vi.hoisted(() => ({ stripe: { confirmPayment: vi.fn() }, elements: { submit: vi.fn(), update: vi.fn() } }));
vi.mock('@stripe/stripe-js', () => ({ loadStripe: vi.fn(() => Promise.resolve(stripe)) }));
vi.mock('@stripe/react-stripe-js', async () => {
  const React = await import('react');
  return {
    Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useStripe: () => stripe,
    useElements: () => elements,
    PaymentElement: ({ onReady }: { onReady: () => void }) => { React.useEffect(() => onReady(), []); return <div>card form</div>; }, // eslint-disable-line react-hooks/exhaustive-deps
  };
});
vi.mock('@/lib/projects/api', () => ({
  billingApi: { prices: vi.fn(), subscription: vi.fn(), previewCheckout: vi.fn(), createCheckoutSubscription: vi.fn() },
}));
let role = 'owner';
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'p1', role } }) }));
const replace = vi.fn();
let search = 'plan=pro&interval=month';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace, push: replace }) }));

const api = vi.mocked(billingApi);

async function renderCheckout() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BillingCheckout /></QueryClientProvider>);
  await screen.findByText('card form');
}
async function fillAddress() {
  fireEvent.change(screen.getByPlaceholderText('e.g. Acme Trading LLC'), { target: { value: 'Acme GmbH' } });
  fireEvent.change(screen.getByPlaceholderText('Street address, building'), { target: { value: 'Main St 1' } });
  fireEvent.change(screen.getByPlaceholderText('e.g. 10115'), { target: { value: '10115' } });
  fireEvent.mouseDown(screen.getByRole('combobox'));
  await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Germany' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  role = 'owner';
  search = 'plan=pro&interval=month';
  api.prices.mockResolvedValue(PUBLIC_PRICES);
  api.subscription.mockResolvedValue({ subscription: null, billingContact: null });
  api.previewCheckout.mockResolvedValue({ currency: 'aed', subtotal: 29000, tax: 5510, discount: 0, total: 34510 });
  api.createCheckoutSubscription.mockResolvedValue({ subscriptionId: 'sub_1', clientSecret: 'pi_secret', currency: 'aed', subtotal: 29000, tax: 5510, discount: 0, total: 34510 });
  elements.submit.mockResolvedValue({});
  stripe.confirmPayment.mockResolvedValue({ paymentIntent: { status: 'succeeded' } });
});

describe('in-app checkout', () => {
  it('shows the plan, then Stripe\'s tax for the address, and pays only after the backend created the subscription', async () => {
    await renderCheckout();
    expect(screen.getByText('PixlPush Pro')).toBeInTheDocument();
    expect(screen.getByText('Added after you enter your address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay securely' })).toBeDisabled();

    await fillAddress();
    expect(await screen.findByText('AED 55.10')).toBeInTheDocument();
    expect(api.previewCheckout).toHaveBeenCalledWith('p1', { plan: 'pro', interval: 'month', address: expect.objectContaining({ country: 'DE', postalCode: '10115' }) });
    const pay = await screen.findByRole('button', { name: 'Pay AED 345.10' });

    await userEvent.click(pay);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/billing?checkout=success'));
    expect(api.createCheckoutSubscription).toHaveBeenCalledTimes(1);
    expect(api.createCheckoutSubscription.mock.calls[0]![1]).not.toHaveProperty('price');
    expect(stripe.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'pi_secret', redirect: 'if_required' }));
  });

  it('a declined card shows Stripe\'s message and can be retried', async () => {
    stripe.confirmPayment.mockResolvedValueOnce({ error: { type: 'card_error', message: 'Your card was declined.' } });
    await renderCheckout();
    await fillAddress();
    await userEvent.click(await screen.findByRole('button', { name: 'Pay AED 345.10' }));
    expect(await screen.findByText('Your card was declined.')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Pay AED 345.10' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/billing?checkout=success'));
  });

  it('an incomplete card form never reaches the backend', async () => {
    elements.submit.mockResolvedValue({ error: { message: 'Your card number is incomplete.' } });
    await renderCheckout();
    await fillAddress();
    await userEvent.click(await screen.findByRole('button', { name: 'Pay AED 345.10' }));
    expect(await screen.findByText('Your card number is incomplete.')).toBeInTheDocument();
    expect(api.createCheckoutSubscription).not.toHaveBeenCalled();
  });

  it('an address Stripe Tax cannot place blocks payment with a clear message', async () => {
    api.previewCheckout.mockRejectedValue({ status: 422, code: 'BILLING_ADDRESS_REQUIRED', message: 'raw' });
    await renderCheckout();
    await fillAddress();
    expect(await screen.findByText('Stripe needs a complete billing address before tax can be calculated.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay securely' })).toBeDisabled();
  });

  it('is closed to roles that cannot buy, and to a project that already pays', async () => {
    role = 'developer';
    const view = render(<QueryClientProvider client={new QueryClient()}><BillingCheckout /></QueryClientProvider>);
    expect(screen.getByText(/Only owners, admins and billing members/)).toBeInTheDocument();
    view.unmount();
    role = 'owner';
    api.subscription.mockResolvedValue({ subscription: { plan: 'pro', status: 'active' } as never, billingContact: null });
    render(<QueryClientProvider client={new QueryClient()}><BillingCheckout /></QueryClientProvider>);
    expect(await screen.findByText(/already has a subscription/)).toBeInTheDocument();
  });
});
