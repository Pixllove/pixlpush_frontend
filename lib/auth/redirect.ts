/**
 * Only same-origin, path-absolute destinations are allowed. This blocks
 * ?redirect=https://evil.example and protocol-relative //evil.example, both of
 * which a bare `router.push(param)` would happily follow.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  // "//host" and "/\host" are treated as protocol-relative by browsers.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

/**
 * Where to send someone who has just signed in.
 *
 * An unverified account goes to the verify screen rather than the app: the
 * session is real, so that screen can show the address and resend the link
 * without asking for the password again. Signing in through Google skips this,
 * because Google has already vouched for the address.
 */
export function postLoginPath(
  account: { email: string; emailVerified: boolean },
  redirect: string | null | undefined,
): string {
  if (!account.emailVerified) return `/verify-email?email=${encodeURIComponent(account.email)}`;
  return safeRedirect(redirect);
}
