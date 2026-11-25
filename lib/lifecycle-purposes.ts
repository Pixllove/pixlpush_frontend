export type SegmentSource = 'sdk' | 'webhook';

/** Server events that add users to a segment and remove them from it. */
export type ServerCondition = { enter: string[]; exit: string[]; /** The exit list in plain words. */ leaves: string };

export type SegmentPurpose = {
  key: string;
  label: string;
  /** Null: ask what the segment should identify, then let the customer pick. */
  source: SegmentSource | null;
  why: string;
  suggestedName: string;
  /** Webhook purposes: the standard event names that drive membership. */
  server?: ServerCondition;
};

// An event adds users to at most one segment, so trial and paid-subscription events stay separate.
const ACTIVE = ['trial_converted', 'subscription_started', 'subscription_renewed', 'subscription_upgraded', 'subscription_product_changed', 'subscription_renew_restored'];
const CANCELLED = ['subscription_canceled'];
const ENDED = ['subscription_expired', 'subscription_refunded', 'subscription_revoked'];
const TRIAL_ACTIVE = ['trial_started'];
const TRIAL_CANCELLED = ['trial_canceled'];
const TRIAL_OVER = ['trial_converted', 'trial_expired'];
const TRIAL_WHY = 'Trial status is managed by your billing system, so PixlPush recommends syncing it from your server.';

export const SEGMENT_PURPOSES: SegmentPurpose[] = [
  { key: 'registration_started', label: 'Registration started', source: 'sdk', why: 'The app or website can track when someone starts registration.', suggestedName: 'Registration started' },
  { key: 'account_created', label: 'Account created', source: 'sdk', why: 'Track when the account creation flow succeeds in the app or website.', suggestedName: 'Account created' },
  { key: 'paywall_drop_off', label: 'Paywall drop-off', source: 'sdk', why: 'Track the paywall interaction and the user leaving without purchasing.', suggestedName: 'Paywall drop-off' },
  { key: 'subscription_active', label: 'Uncancelled active subscription', source: 'webhook', why: 'The billing backend can confirm the current subscription status.', suggestedName: 'Active subscription', server: { enter: ACTIVE, exit: [...CANCELLED, ...ENDED], leaves: 'when they cancel, or the subscription ends' } },
  { key: 'subscription_cancelled', label: 'Cancelled active subscription', source: 'webhook', why: 'The billing backend can report cancellation while access remains active.', suggestedName: 'Cancelled, still active', server: { enter: CANCELLED, exit: [...ENDED, ...ACTIVE], leaves: 'when the subscription ends or they renew' } },
  { key: 'subscription_expired', label: 'Expired subscription', source: 'webhook', why: 'The billing backend can confirm that the subscription has expired.', suggestedName: 'Expired subscription', server: { enter: ENDED, exit: ACTIVE, leaves: 'when they subscribe again' } },
  { key: 'trial_active', label: 'Uncancelled trial user', source: 'webhook', why: TRIAL_WHY, suggestedName: 'Trial, not cancelled', server: { enter: TRIAL_ACTIVE, exit: [...TRIAL_CANCELLED, ...TRIAL_OVER], leaves: 'when they cancel the trial, or the trial ends or turns into a subscription' } },
  { key: 'trial_cancelled', label: 'Cancelled trial user', source: 'webhook', why: TRIAL_WHY, suggestedName: 'Trial cancelled', server: { enter: TRIAL_CANCELLED, exit: [...TRIAL_ACTIVE, ...TRIAL_OVER], leaves: 'when the trial ends, turns into a subscription or starts again' } },
  { key: 'account_paused', label: 'Paused account', source: 'sdk', why: 'The app can track when a user pauses or reactivates their account.', suggestedName: 'Paused account' },
  { key: 'first_app_open', label: 'First app open', source: 'sdk', why: 'The app can track its first launch for a user.', suggestedName: 'First app open' },
  { key: 'other', label: 'Something else', source: null, why: '', suggestedName: '' },
];

export const SOURCE_COPY: Record<SegmentSource, { title: string; detail: string }> = {
  sdk: { title: 'SDK', detail: 'This is an app action. Track the event in your app so PixlPush can add users to the segment when it happens.' },
  webhook: { title: 'Webhook/API', detail: 'This status is managed by your billing system or backend. Connect that system so PixlPush can receive status changes and keep this segment current.' },
};
