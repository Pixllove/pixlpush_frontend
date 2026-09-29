import type { ApiError } from '@/types/auth';

/** Friendly copy per backend code. Backend text is never shown raw. */
const MESSAGES: Record<string, string> = {
  DOMAIN_INVALID: 'Enter a valid email address on your own domain, for example hello@example.com.',
  DOMAIN_ALREADY_EXISTS: 'This domain is already added to this project.',
  DOMAIN_NOT_FOUND: 'This sending domain no longer exists. Refresh the list.',
  DOMAIN_ACCESS_DENIED: 'Only project owners and admins can manage sending domains.',
  PROVIDER_NOT_SUPPORTED: 'Automatic connection is not available for this provider. Connect the domain manually.',
  PROVIDER_CONNECTION_FAILED: 'The provider connection failed. Try again or connect manually.',
  PROVIDER_CONNECTION_CANCELLED: 'The connection was cancelled. You can try again or connect manually.',
  PROVIDER_STATE_INVALID: 'This connection link is invalid or has expired. Start the connection again.',
  DNS_RECORD_NOT_FOUND: 'Some DNS records were not found yet. DNS changes can take several hours.',
  DNS_RECORD_MISMATCH: 'Some DNS records have a different value. Copy the values exactly.',
  DNS_LOOKUP_FAILED: 'We could not look up your DNS records right now. Try again in a few minutes.',
  DOMAIN_NOT_VERIFIED: 'Some required DNS records are missing or incorrect.',
  SMTP_NOT_CONFIGURED: 'Your DNS records are correct. Set up the SMTP relay under Email sending to finish.',
  SMTP_VERIFICATION_FAILED: 'Your DNS records are correct, but the SMTP relay login failed. Check it under Email sending.',
  PROJECT_NOT_FOUND: 'This project is not available.',
  INSUFFICIENT_ROLE: 'Your project role does not allow this action.',
  NETWORK_ERROR: 'Cannot reach the server. Check your connection.',
};

const FALLBACK = 'Something went wrong. Please try again.';

export const messageForCode = (code: string | null | undefined) => (code && MESSAGES[code]) || null;

/** Normalizes anything thrown by the API layer into a safe, short message. */
export function domainErrorMessage(error: unknown): string {
  const e = error as Partial<ApiError> | undefined;
  if (e?.status === 401) return 'Your session has expired. Sign in again.';
  if (e?.status === 403 && !messageForCode(e.code)) return MESSAGES.DOMAIN_ACCESS_DENIED;
  return messageForCode(e?.code) ?? FALLBACK;
}

export const errorCode = (error: unknown) => (error as Partial<ApiError> | undefined)?.code ?? 'UNKNOWN';
