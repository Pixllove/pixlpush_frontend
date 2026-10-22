'use client';

import { useState } from 'react';
import { Alert, Box, Skeleton, Switch, Typography } from '@mui/material';
import { EmailOutlined, NotificationsNoneOutlined } from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { Toast } from '@/components/auth/AuthFeedback';
import { notificationKeys, useNotificationPreferences, useUpdateNotificationPreference } from '@/hooks/notifications/use-notifications';
import type { NotificationCategory, NotificationPreference } from '@/types/notifications';

const rows: Array<{ category: NotificationCategory; title: string; description: string }> = [
  { category: 'account', title: 'Account activity', description: 'Welcome messages, profile changes and account lifecycle updates.' },
  { category: 'security', title: 'Security alerts', description: 'Sign-in, verification and access changes that need your attention.' },
  { category: 'project', title: 'Project activity', description: 'Project creation, status changes and important workspace health updates.' },
  { category: 'onboarding', title: 'Onboarding guidance', description: 'Helpful setup milestones and suggestions for your workspace.' },
  { category: 'team', title: 'Team & access', description: 'Invitations, role changes and membership updates across your Projects.' },
  { category: 'billing', title: 'Billing & usage', description: 'Plan, payment, usage and subscription updates.' },
  { category: 'messaging', title: 'Messaging activity', description: 'Campaign, journey and delivery updates from your Projects.' },
  { category: 'integration', title: 'Integrations', description: 'SDK, Firebase and connected-service status changes.' },
  { category: 'announcement', title: 'PixlPush announcements', description: 'Product updates and important notices from the PixlPush team.' },
];

type NotificationChannel = 'inAppEnabled' | 'emailEnabled';
type PreferenceToast = { severity: 'success' | 'error'; message: string };

export default function NotificationPreferences({ embedded = false }: { embedded?: boolean }) {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreference();
  const queryClient = useQueryClient();
  const stored = new Map(preferences.data?.map((preference) => [preference.category, preference]));
  const [optimisticValues, setOptimisticValues] = useState<Record<string, boolean>>({});
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<PreferenceToast | null>(null);

  const togglePreference = (category: NotificationCategory, channel: NotificationChannel, checked: boolean) => {
    const key = `${category}:${channel}`;
    setOptimisticValues((current) => ({ ...current, [key]: checked }));
    setPendingKeys((current) => ({ ...current, [key]: true }));
    void update.mutateAsync({ category, [channel]: checked })
      .then((saved) => {
        queryClient.setQueryData<NotificationPreference[]>(notificationKeys.preferences(), (current) => {
          if (!current) return [saved];
          const existing = current.findIndex((preference) => preference.category === saved.category);
          return existing === -1
            ? [...current, saved]
            : current.map((preference, index) => index === existing ? saved : preference);
        });
        setOptimisticValues((current) => removeOptimisticValue(current, key));
        setToast({
          severity: 'success',
          message: checked
            ? `You’ll now receive these updates in ${channel === 'inAppEnabled' ? 'PixlPush' : 'your email'}.`
            : `You won’t receive these updates in ${channel === 'inAppEnabled' ? 'PixlPush' : 'your email'}.`,
        });
      })
      .catch(() => {
        setOptimisticValues((current) => removeOptimisticValue(current, key));
        setToast({ severity: 'error', message: 'We couldn’t save that setting. Please try again.' });
      })
      .finally(() => {
        setPendingKeys((current) => removeOptimisticValue(current, key));
      });
  };

  const valueFor = (category: NotificationCategory, channel: NotificationChannel) => {
    const key = `${category}:${channel}`;
    return optimisticValues[key] ?? stored.get(category)?.[channel] ?? true;
  };

  return (
    <Box className={`notification-preferences${embedded ? ' is-embedded' : ''}`}>
      <Box className="notification-preferences-header">
        <Box>
          <Typography variant="h3">Choose how PixlPush contacts you</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
            Choose where each type of update should go. Your changes save automatically.
          </Typography>
        </Box>
        <Box className="notification-preferences-status" role="status">
          <span className="notification-preferences-status-dot" aria-hidden="true" />
          Saved automatically
        </Box>
      </Box>
      <Box className="notification-preferences-explainer">
        <Box className="notification-preferences-explainer-item">
          <span className="notification-preferences-explainer-icon"><NotificationsNoneOutlined fontSize="small" /></span>
          <span><strong>Inside PixlPush</strong><small>View updates in your notification inbox.</small></span>
        </Box>
        <Box className="notification-preferences-explainer-item">
          <span className="notification-preferences-explainer-icon"><EmailOutlined fontSize="small" /></span>
          <span><strong>By email</strong><small>Get updates at your account email.</small></span>
        </Box>
      </Box>
      <Box className="notification-preferences-instruction">
        <strong>How it works</strong>
        <span>Use the switches to choose where each update appears. Security alerts stay on to help protect your account.</span>
      </Box>
      {preferences.isError && <Alert severity="error" className="notification-preferences-error">Could not load notification preferences.</Alert>}
      <Box className="notification-preferences-table" role="table" aria-label="Notification preferences">
        <Box className="notification-preferences-columns" role="row">
          <Typography component="span" role="columnheader">Update type</Typography>
          <Box component="span" role="columnheader"><strong>Inside PixlPush</strong><small>Notification inbox</small></Box>
          <Box component="span" role="columnheader"><strong>Email</strong><small>Your account email</small></Box>
        </Box>
        {preferences.isPending ? [1, 2, 3].map((item) => (
          <Box className="notification-preference-row notification-preference-row-skeleton" key={item} role="row" aria-hidden="true">
            <Box className="notification-preference-copy">
              <Skeleton width="34%" />
              <Skeleton width="78%" />
            </Box>
            <Box className="notification-preference-control"><Skeleton variant="rounded" width={42} height={22} /></Box>
            <Box className="notification-preference-control"><Skeleton variant="rounded" width={42} height={22} /></Box>
          </Box>
        )) : rows.map((row) => {
          const preference = stored.get(row.category);
          const protectedCategory = preference?.locked ?? row.category === 'security';
          return (
            <Box className={`notification-preference-row${protectedCategory ? ' is-protected' : ''}`} key={row.category} role="row">
              <Box className="notification-preference-copy" role="cell">
                <Box className="notification-preference-title">
                  <Typography component="h4" fontWeight={650} fontSize="var(--fs-14)">{row.title}</Typography>
                  {protectedCategory && <span className="notification-preference-badge">Always on</span>}
                </Box>
                <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: .35 }}>{row.description}</Typography>
                {protectedCategory && <Typography className="notification-preference-note" color="text.secondary" fontSize="var(--fs-12)">Security alerts are always delivered for your protection.</Typography>}
              </Box>
              <PreferenceSwitch
                checked={valueFor(row.category, 'inAppEnabled')}
                disabled={protectedCategory || Boolean(pendingKeys[`${row.category}:inAppEnabled`])}
                onChange={(checked) => togglePreference(row.category, 'inAppEnabled', checked)}
                label={`${row.title}: ${protectedCategory ? 'always enabled' : 'show inside PixlPush'}`}
                channelLabel="In PixlPush"
                stateLabel={protectedCategory ? 'Always on' : undefined}
              />
              <PreferenceSwitch
                checked={valueFor(row.category, 'emailEnabled')}
                disabled={protectedCategory || Boolean(pendingKeys[`${row.category}:emailEnabled`])}
                onChange={(checked) => togglePreference(row.category, 'emailEnabled', checked)}
                label={`${row.title}: ${protectedCategory ? 'always enabled' : 'send by email'}`}
                channelLabel="By email"
                stateLabel={protectedCategory ? 'Always on' : undefined}
              />
            </Box>
          );
        })}
      </Box>
      <Toast
        message={toast?.message ?? null}
        severity={toast?.severity}
        onClose={() => setToast(null)}
      />
    </Box>
  );
}

function PreferenceSwitch({ checked, disabled, onChange, label, channelLabel, stateLabel }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void; label: string; channelLabel: string; stateLabel?: string }) {
  return (
    <Box className={`notification-preference-control${disabled ? ' is-disabled' : ''}`} role="cell">
      <span className="notification-preference-channel">{channelLabel}</span>
      <Switch
        className="notification-preference-switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        inputProps={{ 'aria-label': label }}
      />
      <span className="notification-preference-state" aria-hidden="true">{stateLabel ?? (checked ? 'On' : 'Off')}</span>
    </Box>
  );
}

function removeOptimisticValue(values: Record<string, boolean>, key: string): Record<string, boolean> {
  const next = { ...values };
  delete next[key];
  return next;
}
