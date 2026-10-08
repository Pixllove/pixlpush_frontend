import { describe, expect, it } from 'vitest';
import { pixlEstimate, providerEstimate } from '../components/website/ProviderComparison';

describe('provider comparison pricing', () => {
  it('keeps Free with paid fractional email overage', () => {
    expect(pixlEstimate(2000, 10500)).toMatchObject({ plan: 'Free + usage', total: 0.5, allowance: 2000 });
  });

  it('uses linear Pro reach overage and the supplied Mailchimp tiers', () => {
    const pixl = pixlEstimate(38750, 10000);
    const mailchimp = providerEstimate('mailchimp', 38750, 10000, 38750, true, false);
    expect(pixl.total).toBe(189);
    expect(mailchimp.cost).toBe(410);
    expect(mailchimp.cost! - pixl.total).toBe(221);
  });

  it('uses the audience count for OneSignal push pricing', () => {
    const estimate = providerEstimate('onesignal', 1000, 20000, 5000, true, true);
    expect(estimate.cost).toBe(31);
  });

  it('applies provider email caps and leaves their prices unavailable', () => {
    expect(providerEstimate('mailerlite', 10000, 250001, 10000, true, false).cost).toBeNull();
    expect(providerEstimate('brevo', 10000, 800001, 10000, true, true).cost).toBeNull();
  });

  it('calculates Brevo push subscribers by tier interpolation', () => {
    expect(providerEstimate('brevo', 25000, 150000, 30000, true, true).cost).toBe(553);
  });
});
