/**
 * Mirrors the backend's `toPublicAccount` in
 * pixlpush/src/modules/auth/auth.service.ts. Never contains passwordHash.
 */
export interface Account {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  /** False for Google-only accounts: they can set a first password without a current one. */
  hasPassword?: boolean;
  googleLinked?: boolean;
  /** Google profile photo; null or absent for accounts that never signed in with Google. */
  avatarUrl?: string | null;
  createdAt: string;
}

/** Project membership as returned by GET /auth/me. Enum values are lowercase. */
export interface AccountProject {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'deactivated';
  role: 'owner' | 'admin' | 'developer' | 'analyst' | 'read_only' | 'billing';
}

export interface CurrentUser {
  account: Account;
  projects: AccountProject[];
}

/** Every backend success response is `{ data: ... }`. */
export interface ApiEnvelope<T> {
  data: T;
}

/** Every backend error is `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Array<{ path: string; message: string }>;
  };
}

/** Normalized error every auth hook rejects with. */
export interface ApiError {
  status: number;
  code: string;
  message: string;
  /** Field-level messages keyed by form field, from a 422 VALIDATION_ERROR. */
  fieldErrors?: Record<string, string>;
}
