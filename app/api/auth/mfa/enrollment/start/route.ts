import { NextResponse } from 'next/server';
import { callBackendWithRefresh, setMfaEnrollmentCookie } from '@/lib/auth/server';

export async function POST() {
  const result = await callBackendWithRefresh<{ data: { enrollmentToken: string; secret: string; otpauthUri: string; qrCodeDataUrl: string } }>('/auth/mfa/enrollment/start', { method: 'POST', body: {} });
  if (!result.ok) return NextResponse.json(result.body, { status: result.status });
  const data = (result.body as { data: { enrollmentToken: string; secret: string; otpauthUri: string; qrCodeDataUrl: string } }).data;
  setMfaEnrollmentCookie(data.enrollmentToken);
  return NextResponse.json({ data: { secret: data.secret, otpauthUri: data.otpauthUri, qrCodeDataUrl: data.qrCodeDataUrl } });
}
