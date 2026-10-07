import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingSection } from '@/components/dashboard/BillingSection';
import PricingExperience from '@/components/website/PricingExperience';
import { billingApi } from '@/lib/projects/api';
import { billingErrorMessage, billingState, canManageBilling, formatMoney, priceOf, yearlySaving, PUBLIC_PRICES } from '@/lib/billing';
import type { BillingSubscription, SubscriptionState } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  projectKeys: { list: () => ['projects', 'list'], detail: (id: string) => ['projects', 'detail', id] },
  billingApi: {
    subscription: vi.fn(), usage: vi.fn(), prices: vi.fn(), plans: vi.fn(), invoices: vi.fn(), updateContact: vi.fn(),
    createCheckoutSubscription: vi.fn(), previewCheckout: vi.fn(), paymentMethod: vi.fn(), setupPaymentMethod: vi.fn(), paymentMethods: vi.fn(), updatePaymentMethod: vi.fn(), removePaymentMethod: vi.fn(), savePaymentMethod: vi.fn(), confirmOpenPayment: vi.fn(), changeSubscription: vi.fn(), cancelSubscription: vi.fn(), resumeSubscription: vi.fn(),
  },
}));

let project = { id: 'p1', name: 'One', role: 'owner' };
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: project }) }));
let search = '';
const push = vi.fn();
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ push, replace: push }) }));
vi.mock('@/components/website/SiteShell', () => ({ SiteShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>, PageHero: () => null }));

const api = vi.mocked(billingApi);
const { handleNextAction } = vi.hoisted(() => ({ handleNextAction: vi.fn(async () => ({})) }));
vi.mock('@/lib/stripe', () => ({ stripePromise: Promise.resolve({ handleNextAction }), stripeAppearance: {} }));
const assign = vi.fn();

const sub = (over: Partial<SubscriptionState> = {}): SubscriptionState => ({
  plan: 'pro', status: 'active', stripeStatus: 'active', billingInterval: 'month', currency: 'aed', unitAmount: 29000, taxExclusive: true,
  currentPeriodStart: '2026-10-05T10:00:00.000Z', currentPeriodEnd: '2026-11-05T10:00:00.000Z', cancelAtPeriodEnd: false, canceledAt: null,
  pendingPlan: null, pendingInterval: null, billingProblem: null, ...over,
});
const serve = (subscription: SubscriptionState | null, contact: BillingSubscription['billingContact'] = null) =>
  api.subscription.mockResolvedValue({ subscription, billingContact: contact });

const wrap = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><BillingSection /></QueryClientProvider>) };
};

beforeEach(() => {
  project = { id: 'p1', name: 'One', role: 'owner' };
  search = '';
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('location', { ...window.location, assign });
  serve(null);
  api.usage.mockResolvedValue({
    plan: 'free', periodStart: '2026-10-01T00:00:00.000Z',
    usage: { reachable_users: 1200, email_sends: 10, push_sends: 0, event_ingestion: 0, active_journeys: 1, ai_credits: 0 },
    limits: { reachableUsers: 1000, emailSendsPerMonth: 5000, pushSendsPerMonth: 30000, activeJourneys: 1, aiCreditsPerMonth: 100, eventsPerMonth: null },
    overLimit: { reachableUsers: true, emailSends: false, pushSends: false, activeJourneys: false },
  });
  api.prices.mockResolvedValue(PUBLIC_PRICES);
  api.plans.mockResolvedValue({} as never);
  api.invoices.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('prices', () => {
  it('shows AED, before tax, for each plan and interval; yearly is ten monthly payments', () => {
    expect(formatMoney(priceOf([], 'starter', 'month').unitAmount)).toBe('AED 107');
    expect(formatMoney(priceOf([], 'starter', 'year').unitAmount)).toBe('AED 1,070');
    expect(formatMoney(priceOf([], 'pro', 'month').unitAmount)).toBe('AED 290');
    expect(formatMoney(priceOf([], 'pro', 'year').unitAmount)).toBe('AED 2,900');
    expect(formatMoney(30450)).toBe('AED 304.50');
    expect(yearlySaving([], 'pro')).toBe(58000); // two monthly payments
    expect(PUBLIC_PRICES.every((price) => price.taxExclusive && price.currency === 'aed')).toBe(true);
  });

  it('the public pricing page switches interval and sends a visitor through the billing page, not straight to Stripe', async () => {
    render(<PricingExperience />);
    expect(screen.getByText('AED 290')).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /yearly/i }));
    expect(screen.getByText('AED 2,900')).toBeInTheDocument();
    expect(screen.getByText(/Save AED 580/)).toBeInTheDocument();
    // /dashboard is behind the login redirect, which keeps this query string
    const links = screen.getAllByRole('link', { name: 'Start this plan' }).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/dashboard/billing/checkout?plan=starter&interval=year', '/dashboard/billing/checkout?plan=pro&interval=year']);
    expect(screen.getByRole('button', { name: 'Contact sales' })).toBeInTheDocument();
  });
});

describe('billing state', () => {
  it('names every state the backend can report', () => {
    expect(billingState(null).label).toBe('Free');
    expect(billingState(sub()).message).toBe('Your subscription is active.');
    expect(billingState(sub({ status: 'incomplete', plan: 'free' })).label).toBe('Payment pending');
    expect(billingState(sub({ status: 'billing_attention', billingProblem: 'payment_failed' })).label).toBe('Billing attention required');
    expect(billingState(sub({ status: 'billing_attention', billingProblem: 'payment_action_required' })).label).toBe('Payment action required');
    expect(billingState(sub({ status: 'past_due' })).label).toBe('Past due');
    expect(billingState(sub({ status: 'cancel_at_period_end', cancelAtPeriodEnd: true })).message).toContain('05 Nov 2026');
    expect(billingState(sub({ status: 'paused', plan: 'free' })).label).toBe('Paused');
    expect(billingState(sub({ status: 'unpaid', plan: 'free' })).label).toBe('Unpaid');
    expect(billingState(sub({ plan: 'free', stripeStatus: 'canceled' })).label).toBe('Canceled');
  });

  it('turns backend errors into friendly sentences and never passes raw text through', () => {
    expect(billingErrorMessage({ status: 422, code: 'BILLING_ADDRESS_REQUIRED', message: 'stripe: customer_tax_location_invalid' })).toBe('Stripe needs a complete billing address before tax can be calculated.');
    expect(billingErrorMessage({ status: 409, code: 'SUBSCRIPTION_EXISTS', message: 'x' })).toMatch(/already has a subscription/);
    expect(billingErrorMessage({ status: 500, code: 'INTERNAL', message: 'sk_live_secret leaked' })).not.toMatch(/sk_live/);
    expect(billingErrorMessage({ status: 401, code: 'UNAUTHORIZED', message: 'x' })).toMatch(/sign in/);
  });

  it('only owner, admin and billing manage billing', () => {
    expect(['owner', 'admin', 'billing'].every((role) => canManageBilling(role as never))).toBe(true);
    expect(['developer', 'analyst', 'read_only'].some((role) => canManageBilling(role as never))).toBe(false);
  });
});

describe('BillingSection', () => {
  it('Choose plan goes straight to the in-app checkout, creating nothing in Stripe', async () => {
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Yearly' }));
    await userEvent.click((await screen.findAllByRole('button', { name: 'Choose plan' }))[0]);
    expect(push).toHaveBeenCalledWith('/dashboard/billing/checkout?plan=starter&interval=year');
    expect(screen.queryByText(/Redirecting/)).not.toBeInTheDocument();
    expect(api.createCheckoutSubscription).not.toHaveBeenCalled();
    expect(JSON.stringify({ ...localStorage })).toBe('{}'); // nothing about payment is kept in the browser
  });

  it('hides every billing control from a developer but still shows usage', async () => {
    project.role = 'developer';
    wrap();
    expect(await screen.findByText('Reachable users')).toBeInTheDocument();
    expect(screen.getByText('Over limit')).toBeInTheDocument();
    expect(api.subscription).not.toHaveBeenCalled();
    for (const name of ['Choose plan', 'Manage subscription', 'Cancel subscription', 'View plan options']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Billing details' }));
    expect(screen.getByText(/Only owners, admins and billing members/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Billing email/)).not.toBeInTheDocument();
  });

  it('after the Stripe return, shows processing until the backend confirms the plan', async () => {
    search = 'checkout=success';
    wrap();
    expect(await screen.findByText(/Payment processing/)).toBeInTheDocument();
    expect(screen.queryByText(/Payment confirmed/)).not.toBeInTheDocument();
  });

  it('after the Stripe return, confirms only what the backend reports', async () => {
    search = 'checkout=success';
    serve(sub());
    wrap();
    expect(await screen.findByText('Payment confirmed. Your Pro plan is active.')).toBeInTheDocument();
    expect(screen.getByText('MONTHLY INVESTMENT').nextElementSibling).toHaveTextContent('AED 290 / month');
    expect(screen.getByText(/Excluding tax/)).toBeInTheDocument();
  });

  it('after the Stripe return with a failed payment, shows the billing problem instead of success', async () => {
    search = 'checkout=success';
    serve(sub({ status: 'billing_attention', billingProblem: 'payment_action_required' }));
    wrap();
    expect(await screen.findByText(/Additional payment verification is required/)).toBeInTheDocument();
    expect(screen.queryByText(/Payment confirmed/)).not.toBeInTheDocument();
  });

  it('a failed payment offers an in-app card update, never a Stripe page', async () => {
    serve(sub({ status: 'past_due' }));
    api.setupPaymentMethod.mockResolvedValue({ clientSecret: 'seti_secret' });
    wrap();
    expect(await screen.findByText(/We could not collect your latest payment/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Update payment method' }));
    expect(api.setupPaymentMethod).toHaveBeenCalledWith('p1');
    expect(await screen.findByRole('dialog', { name: 'Add a card' })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it('a payment the bank wants authenticated is completed in the app with Stripe 3D Secure', async () => {
    serve(sub({ status: 'billing_attention', billingProblem: 'payment_action_required' }));
    api.confirmOpenPayment.mockResolvedValue({ clientSecret: 'pi_3ds' });
    wrap();
    await userEvent.click(await screen.findByRole('button', { name: 'Complete payment' }));
    await waitFor(() => expect(handleNextAction).toHaveBeenCalledWith({ clientSecret: 'pi_3ds' }));
    expect(await screen.findByText(/Payment completed/)).toBeInTheDocument();
  });

  it('shows plan, card and billing address together, with in-app actions', async () => {
    serve(sub(), { email: 'f@acme.de', company: 'ACME GmbH', addressLine1: 'Main St 1', city: 'Berlin', postalCode: '10115', country: 'DE' });
    api.paymentMethod.mockResolvedValue({ type: 'card', brand: 'visa', last4: '4242', expMonth: 1, expYear: 2028 });
    wrap();
    expect(await screen.findByText('visa •••• 4242')).toBeInTheDocument();
    expect(screen.getByText('Main St 1, Berlin, 10115, DE')).toBeInTheDocument();
    expect(screen.getByText(/Active · renews 05 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change plan or interval' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByLabelText(/State \/ province/)).toBeInTheDocument();
  });

  it('cancels behind a confirmation and re-reads the subscription', async () => {
    serve(sub());
    api.cancelSubscription.mockResolvedValue({ status: 'cancel_at_period_end', currentPeriodEnd: '2026-11-05T10:00:00.000Z' });
    const { client } = wrap();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel subscription' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/stays active until 05 Nov 2026/)).toBeInTheDocument();
    expect(api.cancelSubscription).not.toHaveBeenCalled();
    serve(sub({ status: 'cancel_at_period_end', cancelAtPeriodEnd: true }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel subscription' }));
    expect(await screen.findByText(/will remain active until 05 Nov 2026/)).toBeInTheDocument();
    expect(screen.getByText('CURRENT PLAN').nextElementSibling).toHaveTextContent('Pro'); // still the paid plan, not Free
    expect(invalidate.mock.calls.map(([filter]) => filter?.queryKey)).toEqual(expect.arrayContaining([
      ['projects', 'billing', 'p1', 'subscription'], ['projects', 'billing', 'p1', 'invoices'], ['projects', 'p1'], ['projects', 'p1', 'usage'],
    ]));
  });

  it('resumes a subscription that is set to cancel', async () => {
    serve(sub({ status: 'cancel_at_period_end', cancelAtPeriodEnd: true }));
    api.resumeSubscription.mockResolvedValue({ status: 'active', currentPeriodEnd: '2026-11-05T10:00:00.000Z' });
    wrap();
    const resume = await screen.findByRole('button', { name: 'Resume subscription' });
    serve(sub());
    await userEvent.click(resume);
    expect(await screen.findByText('Your subscription has been resumed.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Cancel subscription' })).toBeInTheDocument();
  });

  it('changes plan on the existing subscription after a confirmation, never through a new checkout', async () => {
    serve(sub());
    api.changeSubscription.mockResolvedValue({ plan: 'pro', pendingPlan: 'starter' });
    wrap();
    expect(await screen.findByRole('button', { name: 'Current plan' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Downgrade' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Your plan will change on 05 Nov 2026. Your current plan remains active until then/)).toBeInTheDocument();
    serve(sub({ pendingPlan: 'starter', pendingInterval: 'month' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm change' }));
    await waitFor(() => expect(api.changeSubscription).toHaveBeenCalledWith('p1', { plan: 'starter', interval: 'month' }));
    expect(api.createCheckoutSubscription).not.toHaveBeenCalled();
    expect(await screen.findByText(/Your plan will change to Starter \(monthly\) on 05 Nov 2026/)).toBeInTheDocument();
  });

  it('lists invoices with tax on its own, and says so when there are none', async () => {
    serve(sub());
    wrap();
    await userEvent.click(await screen.findByRole('tab', { name: 'Billing history' }));
    expect(await screen.findByText('Your invoices will appear here after your first successful payment.')).toBeInTheDocument();
  });

  it('renders real invoices in AED', async () => {
    serve(sub());
    api.invoices.mockResolvedValue([{ id: 'in_1', number: 'PIXL-0001', status: 'paid', currency: 'aed', subtotalExcludingTax: 29000, tax: 1450, total: 30450, amountPaid: 30450, createdAt: '2026-10-05T10:00:00.000Z', hostedInvoiceUrl: 'https://invoice.stripe.com/i/1', invoicePdf: 'https://pay.stripe.com/i/1.pdf' }]);
    wrap();
    await userEvent.click(await screen.findByRole('tab', { name: 'Billing history' }));
    const row = (await screen.findByText('PIXL-0001')).closest('tr')!;
    expect(within(row).getByText('AED 290')).toBeInTheDocument();
    expect(within(row).getByText('AED 14.50')).toBeInTheDocument();
    expect(within(row).getByText('AED 304.50')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'PDF' })).toHaveAttribute('href', 'https://pay.stripe.com/i/1.pdf');
  });

  it('validates billing details and saves them with the VAT id, without assuming a country', async () => {
    serve(null, { email: 'finance@acme.de', country: 'DE', vatId: 'DE123456789' });
    api.updateContact.mockResolvedValue({ email: 'finance@acme.de' });
    wrap();
    await userEvent.click(await screen.findByRole('tab', { name: 'Billing details' }));
    const country = await screen.findByLabelText(/Country code/);
    await waitFor(() => expect(country).toHaveValue('DE'));
    expect(screen.getByLabelText(/VAT/)).toHaveValue('DE123456789');
    await userEvent.clear(country);
    await userEvent.type(country, 'g');
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    expect(await screen.findByText(/two-letter country code/)).toBeInTheDocument();
    expect(api.updateContact).not.toHaveBeenCalled();
    await userEvent.type(country, 'b');
    await userEvent.click(screen.getByRole('button', { name: 'Save billing details' }));
    await waitFor(() => expect(api.updateContact).toHaveBeenCalledWith('p1', expect.objectContaining({ email: 'finance@acme.de', country: 'GB', vatId: 'DE123456789' })));
  });

  it('never shows one project\'s billing inside another', async () => {
    api.subscription.mockImplementation(async (id) => ({ subscription: id === 'p1' ? sub() : null, billingContact: null }));
    const view = wrap();
    expect(await screen.findByText(/Excluding tax/)).toBeInTheDocument();
    project = { id: 'p2', name: 'Two', role: 'owner' };
    view.rerender(<QueryClientProvider client={view.client}><BillingSection /></QueryClientProvider>);
    await waitFor(() => expect(api.subscription).toHaveBeenCalledWith('p2'));
    await waitFor(() => expect(screen.queryByText(/Excluding tax/)).not.toBeInTheDocument());
    expect(screen.getByText('CURRENT PLAN').nextElementSibling).toHaveTextContent('Free');
  });

  it('the payment methods tab lists saved cards and edits, defaults and removes them in the app', async () => {
    serve(sub());
    api.paymentMethods.mockResolvedValue([
      { id: 'pm_4242', type: 'card', brand: 'visa', last4: '4242', expMonth: 1, expYear: 2028, name: 'Kamran', isDefault: true },
      { id: 'pm_1881', type: 'card', brand: 'mastercard', last4: '1881', expMonth: 3, expYear: 2030, name: null, isDefault: false },
    ]);
    api.updatePaymentMethod.mockResolvedValue({} as never);
    api.savePaymentMethod.mockResolvedValue({ retriedInvoice: null, paymentMethod: null });
    api.removePaymentMethod.mockResolvedValue({ removed: true });
    wrap();
    await userEvent.click(await screen.findByRole('tab', { name: 'Payment methods' }));
    expect(await screen.findByText('**** **** **** 4242')).toBeInTheDocument();
    expect(screen.getByText('01/28')).toBeInTheDocument();
    for (const label of [/card number/i, /cvc/i]) expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    // the default card cannot be removed here
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);

    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: /Edit card/ });
    await userEvent.clear(within(dialog).getByLabelText('Cardholder name'));
    await userEvent.type(within(dialog).getByLabelText('Cardholder name'), 'K Ahsan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.updatePaymentMethod).toHaveBeenCalledWith('p1', 'pm_4242', { expMonth: 1, expYear: 2028, name: 'K Ahsan' }));

    await userEvent.click(await screen.findByRole('button', { name: 'Make default' }));
    await waitFor(() => expect(api.savePaymentMethod).toHaveBeenCalledWith('p1', 'pm_1881'));

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await userEvent.click(within(await screen.findByRole('dialog', { name: /Remove card/ })).getByRole('button', { name: 'Remove card' }));
    await waitFor(() => expect(api.removePaymentMethod).toHaveBeenCalledWith('p1', 'pm_1881'));
  });

});
