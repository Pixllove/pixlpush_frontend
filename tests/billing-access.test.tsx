import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillingAlarm, BillingLockGate, PAYMENT_METHODS_HREF } from '@/components/dashboard/BillingAccessNotice';
import type { Project } from '@/types/project';

const create = vi.fn();
// A failure is raised outside the spy: Vitest reports a throwing vi.fn as a test error even when the code catches it.
let failWith: Error | null = null;
vi.mock('@/lib/support/api', () => ({ supportApi: { create: async (...args: unknown[]) => { if (failWith) throw failWith; return create(...args); } } }));

const base: Project = { id: 'p1', name: 'Acme', slug: 'acme', status: 'active', role: 'owner', createdAt: '', updatedAt: '', deactivatedAt: null, recoveryUntil: null } as Project;
const inGrace = { ...base, billing: { state: 'grace', graceEndsAt: '2026-11-06T12:00:00.000Z', daysLeft: 2, reason: 'payment_failed' } } as Project;
const locked = { ...base, billing: { state: 'locked', graceEndsAt: '2026-11-03T12:00:00.000Z', daysLeft: null, reason: 'payment_failed' } } as Project;

beforeEach(() => { create.mockReset(); failWith = null; });

describe('BillingAlarm', () => {
  it('shows nothing when billing is fine', () => {
    const { container } = render(<BillingAlarm project={{ ...base, billing: { state: 'ok', graceEndsAt: null, daysLeft: null, reason: null } }} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('grace: counts down and links to payment methods', () => {
    render(<BillingAlarm project={inGrace} />);
    expect(screen.getByText('Payment failed for Acme')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('lose access to this workspace in 2 days (6 Nov 2026)');
    expect(screen.getByRole('link', { name: /Update payment method/ })).toHaveAttribute('href', PAYMENT_METHODS_HREF);
  });
  it('last day says today', () => {
    render(<BillingAlarm project={{ ...inGrace, billing: { ...inGrace.billing!, daysLeft: 0 } }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('lose access to this workspace today');
  });
  it('locked: red paused card', () => {
    render(<BillingAlarm project={locked} />);
    expect(screen.getByText('Access paused: payment overdue for Acme')).toBeInTheDocument();
  });
  it('members without billing rights are told to ask an owner, with no button', () => {
    render(<BillingAlarm project={{ ...inGrace, role: 'analyst' } as Project} />);
    expect(screen.queryByRole('link', { name: /Update payment method/ })).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('Ask a project owner or billing member');
  });
});

describe('BillingLockGate', () => {
  it('passes clicks through when not locked', async () => {
    const onClick = vi.fn();
    render(<BillingLockGate project={inGrace}><button onClick={onClick}>Send campaign</button></BillingLockGate>);
    await userEvent.click(screen.getByRole('button', { name: 'Send campaign' }));
    expect(onClick).toHaveBeenCalled();
  });
  it('locked: a click opens the paused dialog instead of acting', async () => {
    const onClick = vi.fn();
    render(<BillingLockGate project={locked}><button onClick={onClick}>Send campaign</button></BillingLockGate>);
    await userEvent.click(screen.getByRole('button', { name: 'Send campaign' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Workspace paused' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to billing' })).toHaveAttribute('href', PAYMENT_METHODS_HREF);
  });
  it('"this is a mistake" opens one billing ticket for the project', async () => {
    create.mockResolvedValue({ ticket: { reference: 'PXL-123' } });
    render(<BillingLockGate project={locked}><button>Open</button></BillingLockGate>);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: /This is a mistake/ }));
    await waitFor(() => expect(screen.getByText(/Ticket PXL-123 opened/)).toBeInTheDocument());
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ topic: 'billing', projectId: 'p1', source: 'dashboard' }));
    expect(screen.getByRole('button', { name: 'Ticket opened' })).toBeDisabled();
  });
  it('shows the error when the ticket fails', async () => {
    failWith = new Error('Support is unavailable.');
    render(<BillingLockGate project={locked}><button>Open</button></BillingLockGate>);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(screen.getByRole('button', { name: /This is a mistake/ }));
    expect(await screen.findByText('Support is unavailable.')).toBeInTheDocument();
  });
});
