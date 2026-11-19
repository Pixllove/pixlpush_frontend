import { isIP } from 'node:net';
import { resolve4, resolve6, resolveCname } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { getSessionToken } from '@/lib/auth/server';

export const runtime = 'nodejs';

type CheckStatus = 'valid' | 'not_found' | 'unknown';

export async function POST(request: Request) {
  if (!getSessionToken()) {
    return NextResponse.json({ status: 'unknown' satisfies CheckStatus, message: 'Sign in to check this website.' }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  if (typeof body?.url !== 'string' || body.url.length > 2048) {
    return NextResponse.json({ status: 'unknown' satisfies CheckStatus, message: 'Enter a valid website URL.' }, { status: 400 });
  }

  let hostname: string;
  try {
    const parsed = new URL(body.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
    hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (!hostname.includes('.') || hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal') || isIP(hostname)) {
      throw new Error('Not a public domain');
    }
  } catch {
    return NextResponse.json({ status: 'not_found' satisfies CheckStatus, message: 'Enter a public website domain.' });
  }

  const queries = await Promise.allSettled([
    resolve4(hostname),
    resolve6(hostname),
    resolveCname(hostname),
  ]);
  if (queries.some((query) => query.status === 'fulfilled' && query.value.length > 0)) {
    return NextResponse.json({ status: 'valid' satisfies CheckStatus });
  }

  const errors = queries.flatMap((query) => query.status === 'rejected' ? [(query.reason as NodeJS.ErrnoException).code] : []);
  const definitiveDnsMiss = errors.length === queries.length && errors.every((code) => code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENODEV');
  return NextResponse.json({
    status: definitiveDnsMiss ? 'not_found' satisfies CheckStatus : 'unknown' satisfies CheckStatus,
    message: definitiveDnsMiss ? 'We could not find this domain.' : 'We could not verify the domain right now.',
  });
}
