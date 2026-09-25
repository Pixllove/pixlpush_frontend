import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';
import type { ApiError } from '@/types/auth';

/**
 * Pushes a 422's per-field messages onto the matching inputs and returns the
 * message that belongs above the form (if any).
 */
export function applyApiError<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
): string | undefined {
  if (error.fieldErrors) {
    let matched = false;
    for (const [field, message] of Object.entries(error.fieldErrors)) {
      setError(field as Path<T>, { type: 'server', message });
      matched = true;
    }
    if (matched) return undefined;
  }
  return error.message;
}
