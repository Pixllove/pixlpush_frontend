/**
 * Legacy deterministic fixture retained for chart-helper tests and local visual references.
 * Production Analytics renders the backend analytics APIs and does not read this fixture.
 */
export type RangeDays = 7 | 30 | 90;
export type Kpi = { label: string; value: string; delta: string; direction: 'up' | 'down' | 'flat'; spark: number[] };
export type Channel = { name: string; sent: number; rates: Array<{ label: string; value: number }> };
export type Campaign = { id: string; name: string; channel: 'Email' | 'Push'; sent: number; rate: number };

const DAYS = 180; // two 90-day windows, so every range has a previous period to compare with

function seeded(seed: number) {
  // mulberry32
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** One value a day, oldest first: a trend from `base`, a weekly rhythm and some noise. */
function daily(seed: number, base: number, growth: number, noise: number, weekly: number) {
  const rand = seeded(seed);
  return Array.from({ length: DAYS }, (_, i) => base * (1 + (growth * i) / DAYS) * (1 + weekly * Math.sin((i * 2 * Math.PI) / 7)) * (1 + noise * (rand() - 0.5)));
}

const series = {
  reachable: daily(1, 36000, 0.175, 0.004, 0),
  emailSends: daily(2, 480, 0.45, 0.18, 0.12),
  pushSends: daily(3, 760, 0.35, 0.18, 0.12),
  openRate: daily(4, 39, 0.11, 0.06, 0.03),
  clickRate: daily(5, 10.4, -0.08, 0.08, 0.03),
  events: daily(6, 30000, 0.45, 0.14, 0.1),
};

const campaigns: Array<Omit<Campaign, 'sent'> & { per30: number }> = [
  { id: 'cart', name: 'Cart reminder', channel: 'Push', per30: 6870, rate: 12.4 },
  { id: 'digest', name: 'Weekly digest', channel: 'Push', per30: 5220, rate: 8.9 },
  { id: 'back', name: 'Back in Action', channel: 'Email', per30: 5140, rate: 42.8 },
  { id: 'welcome', name: 'Welcome Series', channel: 'Email', per30: 4320, rate: 38.1 },
  { id: 'loyalty', name: 'Loyalty Rewards', channel: 'Email', per30: 3010, rate: 28.4 },
];

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const avg = (values: number[]) => sum(values) / values.length;
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function kpi(label: string, values: number[], range: RangeDays, kind: 'total' | 'level' | 'rate'): Kpi {
  const now = values.slice(-range);
  const before = values.slice(-2 * range, -range);
  const measure = kind === 'total' ? sum : kind === 'level' ? (v: number[]) => v[v.length - 1] : avg;
  const current = measure(now);
  // A rate moves in points; a count moves in percent.
  const change = kind === 'rate' ? current - measure(before) : (current / measure(before) - 1) * 100;
  const rounded = Math.round(Math.abs(change) * 10) / 10;
  return {
    label,
    value: kind === 'rate' ? `${current.toFixed(1)}%` : current >= 1e6 ? short.format(current) : whole.format(current),
    delta: kind === 'rate' ? `${rounded.toFixed(1)} pts` : `${rounded.toFixed(1)}%`,
    direction: rounded === 0 ? 'flat' : change > 0 ? 'up' : 'down',
    spark: now,
  };
}

export function getDemoAnalytics(range: RangeDays, today = new Date()) {
  const last = <K extends keyof typeof series>(key: K) => series[key].slice(-range);
  const email = last('emailSends');
  const push = last('pushSends');
  return {
    labels: Array.from({ length: range }, (_, i) => day.format(new Date(today.getTime() - (range - 1 - i) * 86_400_000))),
    kpis: [
      kpi('Reachable users', series.reachable, range, 'level'),
      kpi('Email sends', series.emailSends, range, 'total'),
      kpi('Push sends', series.pushSends, range, 'total'),
      kpi('Email open rate', series.openRate, range, 'rate'),
      kpi('Push click rate', series.clickRate, range, 'rate'),
      kpi('Events received', series.events, range, 'total'),
    ],
    sends: { email, push },
    engagement: { email: last('openRate'), push: last('clickRate') },
    channels: [
      { name: 'Email', sent: Math.round(sum(email)), rates: [{ label: 'Delivered', value: 98.2 }, { label: 'Open rate', value: avg(last('openRate')) }] },
      { name: 'Push', sent: Math.round(sum(push)), rates: [{ label: 'Delivered', value: 96.4 }, { label: 'Click rate', value: avg(last('clickRate')) }] },
    ] as Channel[],
    campaigns: campaigns.map(({ per30, ...campaign }) => ({ ...campaign, sent: Math.round((per30 * range) / 30) })) as Campaign[],
  };
}
