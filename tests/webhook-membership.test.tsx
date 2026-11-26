import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LifecyclePicker, MembershipEditor, membershipIssues, membershipStates, type Membership } from '@/components/integrations/SegmentMembership';

describe('webhook membership rules', () => {
  it('maps events and data to states, treating restore like active', () => {
    expect(membershipStates(['subscription_started', 'subscription_renewed']).sort()).toEqual(['active', 'restored']);
    expect(membershipStates(['subscription_canceled', 'billing_retry']).sort()).toEqual(['billing_retry', 'cancellation_scheduled']);
  });

  it('blocks rules without products or signals, or with unknown signals', () => {
    expect(membershipIssues({ products: [], signals: [], userTypes: [] })).toEqual([
      'Choose at least one product.',
      'Choose at least one event or state.',
    ]);
    expect(membershipIssues({ products: ['premium_monthly'], signals: ['made_up'], userTypes: [] })[0]).toMatch(/Unknown event/);
    expect(membershipIssues({ products: ['premium_monthly'], signals: ['subscription_renewed'], userTypes: ['premium'] })).toEqual([]);
  });

  it('edits a rule: adds product, event and user type, and explains entry and exit', async () => {
    const saved = vi.fn();
    function Harness() {
      const [membership, setMembership] = useState<Membership | undefined>(undefined);
      return (
        <MembershipEditor
          segmentName="Premium Cancelled"
          membership={membership}
          products={['premium_monthly', 'vip_monthly']}
          onChange={(next) => { setMembership(next); saved(next); }}
        />
      );
    }
    render(<Harness />);
    expect(screen.queryByText(/segment_entered/)).not.toBeInTheDocument();

    await userEvent.type(screen.getByRole('combobox', { name: 'Product' }), 'premium_monthly{Enter}');
    await userEvent.type(screen.getByRole('combobox', { name: 'Event / data' }), 'subscription_canceled{Enter}');
    await userEvent.type(screen.getByRole('combobox', { name: 'User type' }), 'premium{Enter}');

    expect(saved).toHaveBeenLastCalledWith({ products: ['premium_monthly'], signals: ['subscription_canceled'], userTypes: ['premium'] });
    await userEvent.hover(screen.getByRole('button', { name: 'How membership works' }));
    expect(await screen.findByText(/Enters and stays/)).toBeInTheDocument();
    expect(screen.getByText(/Other products never change this segment/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Clearing every field drops the rule.
    for (const name of ['Product', 'Event / data', 'User type']) {
      const box = screen.getByRole('combobox', { name });
      await userEvent.click(box);
      await userEvent.keyboard('{Backspace}{Backspace}{Backspace}');
    }
    expect(saved).toHaveBeenLastCalledWith(undefined);
  });

  it('prefills a sample suggestion and turns it into the customer rule on edit', async () => {
    const saved = vi.fn();
    function Harness() {
      const [membership, setMembership] = useState<Membership | undefined>(undefined);
      return (
        <MembershipEditor
          segmentName="VIP Cancelled"
          membership={membership}
          products={['vip_monthly', 'premium_monthly']}
          observedSignals={['subscription_canceled']}
          userTypes={['vip', 'premium']}
          suggestion={{ products: ['vip_monthly'], signals: ['subscription_canceled'], userTypes: ['vip'], note: 'Based on your webhook sample.' }}
          onChange={(next) => { setMembership(next); saved(next); }}
        />
      );
    }
    render(<Harness />);
    expect(screen.getByText('vip_monthly')).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled(); // shown, not stored until edited or published
    await userEvent.type(screen.getByRole('combobox', { name: 'Event / data' }), 'billing_retry{Enter}');
    expect(saved).toHaveBeenLastCalledWith({ products: ['vip_monthly'], signals: ['subscription_canceled', 'billing_retry'], userTypes: ['vip'] });
  });

  it('shows empty fields, without a warning, when the sample has nothing to suggest', () => {
    render(<MembershipEditor segmentName="Gold" membership={undefined} products={[]} suggestion={{ products: [], signals: [], userTypes: [], note: 'Not enough data to prefill.' }} onChange={() => {}} />);
    expect(screen.queryByText(/Not enough data/)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'User type' })).toHaveAttribute('placeholder', 'Any');
  });

  it('offers a predefined segment or a custom one renamed with the pencil', async () => {
    const changed = vi.fn();
    function Harness() {
      const [value, setValue] = useState<string | undefined>(undefined);
      return <LifecyclePicker value={value} predefined={['Subscription cancelled', 'Expired subscription']} defaultCustomName="VIP Cancelled" onChange={(next) => { setValue(next); changed(next); }} />;
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('combobox', { name: 'PixlPush lifecycle segment' }));
    expect(screen.getByRole('option', { name: 'Expired subscription' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: '+ Create custom lifecycle segment' }));
    expect(changed).toHaveBeenLastCalledWith('VIP Cancelled');
    const name = screen.getByRole('textbox', { name: 'Custom lifecycle segment' });
    await userEvent.clear(name);
    await userEvent.type(name, 'VIP Cancelled Monthly{Enter}');
    expect(changed).toHaveBeenLastCalledWith('VIP Cancelled Monthly');
    await userEvent.click(screen.getByRole('button', { name: 'Rename VIP Cancelled Monthly' }));
    expect(screen.getByRole('textbox', { name: 'Custom lifecycle segment' })).toHaveValue('VIP Cancelled Monthly');
  });

  it('labels products as subscriptions or one-time payments in the picker', async () => {
    render(<MembershipEditor segmentName="Coins" membership={undefined} products={['small_one_time', 'vip_weekly']} productPeriods={{ small_one_time: 'one_time', vip_weekly: 'weekly' }} onChange={() => {}} />);
    await userEvent.type(screen.getByRole('combobox', { name: 'Product' }), '_');
    expect(screen.getByRole('option', { name: /small_one_time\s*One-time payment/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /vip_weekly\s*Weekly subscription/ })).toBeInTheDocument();
  });
});
