import { NextResponse } from 'next/server';
import { callBackendWithRefresh, clearMfaEnrollmentCookie, getMfaEnrollmentToken, setSessionCookies } from '@/lib/auth/server';

interface EnrollmentResult {
  recoveryCodes: string[];
  accessToken: string;
  refreshToken: string;
}

export async function POST(request: Request) {
  const enrollmentToken = getMfaEnrollmentToken();
  if (!enrollmentToken) return NextResponse.json({ error: { code: 'MFA_ENROLLMENT_INVALID', message: 'This authenticator setup has expired. Start again.' } }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const result = await callBackendWithRefresh('/auth/mfa/enrollment/confirm', { method: 'POST', body: { ...body, enrollmentToken } });
  if (result.ok) {
    const data = (result.body as { data: EnrollmentResult }).data;
    setSessionCookies(data.accessToken, data.refreshToken);
    clearMfaEnrollmentCookie();
    return NextResponse.json({ data: { recoveryCodes: data.recoveryCodes } });
  }
  return NextResponse.json(result.body, { status: result.status });
}
