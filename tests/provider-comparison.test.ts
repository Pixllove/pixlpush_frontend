import { describe, expect, it } from 'vitest';
import { pixlEstimate, providerEstimate } from '../components/website/ProviderComparison';

describe('provider comparison pricing', () => {
  it('keeps Free with paid fractional email overage', () => {
    expect(pixlEstimate(2000, 10500)).toMatchObject({ plan: 'Free + usage', total: 0.5, allowance: 2000 });
  });

  it('uses linear Pro reach overage and the supplied Mailchimp tiers', () => {
    const pixl = pixlEstimate(38750, 10000);
    const mailchimp = providerEstimate('mailchimp', 38750, 10000, 38750, true, false);
    expect(pixl.total).toBe(309);
    expect(mailchimp.cost).toBe(410);
    expect(mailchimp.cost! - pixl.total).toBe(101);
  });

  it('uses the audience count for OneSignal push pricing', () => {
    const estimate = providerEstimate('onesignal', 1000, 20000, 5000, true, true);
    expect(estimate.cost).toBe(19);
  });

  it('applies provider email caps and leaves their prices unavailable', () => {
    expect(providerEstimate('mailerlite', 10000, 550001, 10000, true, false).cost).toBeNull();
    expect(providerEstimate('mailchimp', 10000, 1200001, 10000, true, false).cost).toBeNull();
    expect(providerEstimate('onesignal', 10000, 1200001, 10000, true, false).cost).toBeNull();
    expect(providerEstimate('brevo', 10000, 800001, 10000, true, true).cost).not.toBeNull();
  });

  it('keeps Starter reach pricing separate from the Pro threshold', () => {
    expect(pixlEstimate(6000, 20000).total).toBe(39);
    expect(pixlEstimate(6000, 21000).total).toBe(40);
    expect(pixlEstimate(10000, 100000).total).toBe(79);
    expect(pixlEstimate(15000, 150000).total).toBe(119);
  });

  it('calculates Brevo push subscribers by tier interpolation', () => {
    expect(providerEstimate('brevo', 25000, 150000, 30000, true, true).cost).toBe(553);
  });
});
