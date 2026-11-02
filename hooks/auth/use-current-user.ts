'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { canonicalZone, getDeviceTimezone, modernZone, setTimezoneOverride } from '@/lib/timezone';
import { authApi, authKeys } from '@/lib/auth/api';
import { isPermanentAuthError } from '@/lib/auth/client';
import type { CurrentUser } from '@/types/auth';

/**
 * The backend session is the source of truth for "am I signed in": this asks
 * the server rather than inspecting any client-side value.
 */
export function useCurrentUser() {
  const query = useQuery<CurrentUser>({
    queryKey: authKeys.currentUser(),
    queryFn: authApi.me,
    retry: (failureCount, error) => !isPermanentAuthError(error) && failureCount < 2,
    // Identity rarely changes, and whatever changes it invalidates this key.
    // Past this it is shown from cache and re-checked in the background.
    staleTime: 5 * 60_000,
  });

  // Dates follow the profile: a manual zone is applied everywhere; an automatic
  // one follows this device and is saved when the device's zone changes (travel).
  const account = query.data?.account;
  useEffect(() => {
    if (!account) return;
    const auto = account.timezoneAuto !== false;
    setTimezoneOverride(auto ? null : account.timezone ?? null);
    const device = getDeviceTimezone();
    if (auto && (!account.timezone || canonicalZone(account.timezone) !== canonicalZone(device))) authApi.updatePreferences({ timezone: modernZone(device) }).catch(() => undefined);
  }, [account]);

  return {
    ...query,
    account: query.data?.account,
    projects: query.data?.projects ?? [],
    isAuthenticated: query.isSuccess && Boolean(query.data?.account),
  };
}
