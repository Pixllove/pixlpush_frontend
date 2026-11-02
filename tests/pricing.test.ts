import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPricing } from '@/components/website/PricingExperience';
import { currencyForCountry } from '@/lib/currency';
import { priceOf, PUBLIC_PRICES } from '@/lib/billing';
import type { LocalPricing } from '@/hooks/use-local-pricing';

const quote = (currency: string, interval: 'month' | 'year', amount: string, approximate: boolean) => ({ currency, interval, amount, approximate });
const plan = (code: 'free' | 'starter' | 'pro', usd: [string, string], pkr: [string, string]) => ({
  code, name: code, tagline: null, description: null, annualDiscountPercent: code === 'free' ? null : '17.00', features: {},
  display: {
    month: { usd: quote('usd', 'month', usd[0], false), local: quote('pkr', 'month', pkr[0], true) },
    year: { usd: quote('usd', 'year', usd[1], false), local: quote('pkr', 'year', pkr[1], true) },
  },
});
const api: LocalPricing = {
  country: 'PK', currency: 'pkr', usdRate: 276.73,
  plans: [plan('free', ['0.00', '0.00'], ['0.00', '0.00']), plan('starter', ['29.00', '290.00'], ['8025.00', '80253.00']), plan('pro', ['79.00', '790.00'], ['21862.00', '218619.00'])],
};

describe('currencyForCountry', () => {
  it('maps countries to their currency and falls back to USD', () => {
    expect(currencyForCountry('PK')).toBe('pkr');
    expect(currencyForCountry('pk')).toBe('pkr');
    expect(currencyForCountry('DE')).toBe('eur');
    expect(currencyForCountry('IN')).toBe('inr');
    expect(currencyForCountry('US')).toBe('usd');
    expect(currencyForCountry('ZZ')).toBe('usd');
    expect(currencyForCountry(null)).toBe('usd');
  });
});

describe('buildPricing', () => {
  it('uses USD defaults without API data', () => {
    const p = buildPricing('pkr', undefined);
    expect(p.currency).toBe('usd');
    expect(p.prices.starter).toEqual({ month: 2900, year: 29000 });
  });
  it('uses the API local amounts in the visitor currency', () => {
    const p = buildPricing('pkr', api);
    expect(p.prices.starter).toEqual({ month: 802500, year: 8025300 });
    expect(p.prices.pro.month).toBe(2186200);
    expect(p.approximate).toBe(true);
    expect(p.savePercent).toBe(17);
    expect(p.emailOverage).toBe(Math.round(100 * 276.73));
    expect(p.reachableRate.starter).toBeCloseTo(2.7673);
  });
  it('uses exact USD amounts on the USD tab', () => {
    const p = buildPricing('usd', api);
    expect(p.prices.pro).toEqual({ month: 7900, year: 79000 });
    expect(p.approximate).toBe(false);
  });
  it('converts USD defaults when the backend sent no plans (fallback)', () => {
    const p = buildPricing('pkr', { ...api, plans: [] });
    expect(p.prices.starter.month).toBe(Math.round(2900 * 276.73));
    expect(p.approximate).toBe(true);
  });
  it('falls back to USD when there is no rate', () => {
    expect(buildPricing('pkr', { ...api, usdRate: null }).currency).toBe('usd');
  });
});

describe('priceOf', () => {
  it('prefers the USD Stripe price even when AED is listed first', () => {
    const prices = [{ ...PUBLIC_PRICES[0], currency: 'aed' as const, unitAmount: 10700 }, ...PUBLIC_PRICES];
    expect(priceOf(prices, 'starter', 'month')).toMatchObject({ currency: 'usd', unitAmount: 2900 });
  });
});

describe('GET /api/plans fallback', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });
  it('detects the currency itself when the backend fails', async () => {
    vi.doMock('@/lib/auth/server', () => ({ callBackend: async () => ({ ok: false, status: 503, body: { error: { code: 'BACKEND_UNAVAILABLE' } } }) }));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      json: async () => (url.includes('ipinfo') ? { country: 'PK' } : { rates: { PKR: 280 } }),
    })));
    const { GET } = await import('@/app/api/plans/route');
    const res = await GET(new Request('http://localhost/api/plans?currency=auto', { headers: { 'x-forwarded-for': '203.0.113.9' } }));
    expect((await res.json()).data).toEqual({ country: 'PK', currency: 'pkr', usdRate: 280, plans: [] });
  });
  it('passes the backend answer through when it has a rate', async () => {
    const body = { data: { ...api } };
    vi.doMock('@/lib/auth/server', () => ({ callBackend: async () => ({ ok: true, status: 200, body }) }));
    const { GET } = await import('@/app/api/plans/route');
    expect((await (await GET(new Request('http://localhost/api/plans'))).json()).data.plans).toHaveLength(3);
  });
  it('uses USD when the IP lookup fails', async () => {
    vi.doMock('@/lib/auth/server', () => ({ callBackend: async () => ({ ok: false, status: 500, body: {} }) }));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { GET } = await import('@/app/api/plans/route');
    expect((await (await GET(new Request('http://localhost/api/plans'))).json()).data.currency).toBe('usd');
  });
});
