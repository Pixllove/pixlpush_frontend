'use client';

import { useEffect } from 'react';
import type { UseFormReset, FieldValues } from 'react-hook-form';

/**
 * Clears a form when the page is restored from the back/forward cache.
 *
 * Navigating away unmounts the form, so defaultValues normally handle this.
 * A bfcache restore does not remount: the browser puts the old DOM back with
 * the values still in it, React state and all. persisted tells the two apart.
 */
export function useClearOnRestore<T extends FieldValues>(reset: UseFormReset<T>) {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [reset]);
}
