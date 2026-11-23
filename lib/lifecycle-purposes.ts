export type SegmentSource = 'sdk' | 'webhook';
export type SegmentPurpose = {
  key: string;
  label: string;
  /** Null: ask what the segment should identify, then let the customer pick. */
  source: SegmentSource | null;
  why: string;
  suggestedName: string;
};

export const SEGMENT_PURPOSES: SegmentPurpose[] = [
  { key: 'registration_started', label: 'Registration started', source: 'sdk', why: 'The app or website can track when someone starts registration.', suggestedName: 'Registration started' },
  { key: 'account_created', label: 'Account created', source: 'sdk', why: 'Track when the account creation flow succeeds in the app or website.', suggestedName: 'Account created' },
  { key: 'paywall_drop_off', label: 'Paywall drop-off', source: 'sdk', why: 'Track the paywall interaction and the user leaving without purchasing.', suggestedName: 'Paywall drop-off' },
  { key: 'subscription_active', label: 'Uncancelled active subscription', source: 'webhook', why: 'Your billing backend can confirm the current subscription status.', suggestedName: 'Active subscription' },
  { key: 'subscription_cancelled', label: 'Cancelled active subscription', source: 'webhook', why: 'Your billing backend can report a cancellation while access remains active.', suggestedName: 'Cancelled, still active' },
  { key: 'subscription_expired', label: 'Expired subscription', source: 'webhook', why: 'Your billing backend can confirm that the subscription has expired.', suggestedName: 'Expired subscription' },
  { key: 'account_paused', label: 'Paused account', source: 'webhook', why: 'Your backend can report when an account is paused or reactivated.', suggestedName: 'Paused account' },
  { key: 'first_app_open', label: 'First app open', source: 'sdk', why: 'The app can track its first launch for a user.', suggestedName: 'First app open' },
  { key: 'other', label: 'Something else', source: null, why: 'Describe what this segment should identify, then choose where that data is recorded.', suggestedName: '' },
];

export const SOURCE_COPY: Record<SegmentSource, { title: string; detail: string }> = {
  sdk: { title: 'SDK', detail: 'This is an app action. Track the event in your app so PixlPush can add users to the segment when it happens.' },
  webhook: { title: 'Server Sync', detail: 'This status is managed by your backend. Connect that system so PixlPush can receive changes and keep this segment current.' },
};
