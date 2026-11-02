import { NextResponse } from 'next/server';
import { callBackend } from '@/lib/auth/server';
import { currencyForCountry } from '@/lib/currency';

const PRIVATE_IP = /^(::1|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:127\.|fc|fd|fe80)/i;

/**
 * Visitor currency without the backend: country by IP (ipinfo.io, as the
 * backend does), USD rate from open.er-api.com. Used when the backend is down
 * or not migrated, so the local-currency tab still shows. Plans stay empty:
 * the page uses its USD defaults.
 */
async function localFallback(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  // On localhost the request IP is private; ipinfo then reports the network's own public IP.
  const path = ip && !PRIVATE_IP.test(ip) ? `${encodeURIComponent(ip)}/json` : 'json';
  let country = request.headers.get('x-vercel-ip-country');
  try {
    country ??= ((await (await fetch(`https://ipinfo.io/${path}`, { signal: AbortSignal.timeout(2500), next: { revalidate: 3600 } })).json()) as { country?: string }).country ?? null;
  } catch { /* unknown country: USD */ }
  const currency = currencyForCountry(country);
  let usdRate: number | null = currency === 'usd' ? 1 : null;
  try {
    if (!usdRate) usdRate = ((await (await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(2500), next: { revalidate: 43200 } })).json()) as { rates?: Record<string, number> }).rates?.[currency.toUpperCase()] ?? null;
  } catch { /* no rate: USD */ }
  return { country: country ?? null, currency: usdRate ? currency : 'usd', usdRate: usdRate ?? 1, plans: [] };
}

/** Public plan catalog. The visitor's country (CDN header or IP) picks the display currency upstream. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  const currency = query.get('currency');
  const interval = query.get('interval');
  if (currency && /^(auto|[a-z]{3})$/i.test(currency)) params.set('currency', currency.toLowerCase());
  if (interval === 'month' || interval === 'year') params.set('interval', interval);
  const country = request.headers.get('x-vercel-ip-country');
  const result = await callBackend<{ data: { currency: string; usdRate: number | null } }>(`/plans${params.size ? `?${params}` : ''}`, {
    headers: country ? { 'x-vercel-ip-country': country } : {},
  });
  // A backend that answers without a usable rate (older deploy, no FX) is treated like no backend.
  const body = result.body as { data?: { currency?: string; usdRate?: number | null } };
  if (result.ok && body.data?.usdRate) return NextResponse.json(result.body);
  return NextResponse.json({ data: await localFallback(request) });
}
