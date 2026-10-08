'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AutoAwesomeRounded,
  CheckCircleRounded,
  CloseRounded,
  ExpandMoreRounded,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Tab,
  Tabs,
} from '@mui/material';
import { SiteShell } from './SiteShell';
import { ProviderComparison } from './ProviderComparison';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { BillingInterval, PaidPlan } from '@/types/project';

type Currency = 'usd' | 'eur' | 'aed' | 'pkr';
type PlanKey = 'free' | PaidPlan | 'enterprise';
type FeatureValue = 'Included' | 'Limited' | 'Not included' | 'Custom' | 'Upgrade' | 'Basic' | 'Advanced' | 'Partial' | 'Priority' | 'Optional' | 'Unlimited' | 'Multiple' | '1' | '3' | '5' | '10' | '20' | '2,000' | '5,000' | '10,000' | '20,000' | '25,000' | '50,000' | '250,000' | '1,000,000' | '100' | '500' | '$0.01' | '$0.008' | '20,000\n+ $1 / 1,000 additional emails' | '50,000\n+ $1 / 1,000 additional emails' | '250,000\n+ $1 / 1,000 additional emails' | 'Talk to Sales';

const currencyMeta: Record<Currency, { label: string; symbol: string }> = {
  usd: { label: 'USD', symbol: '$' },
  eur: { label: 'EUR', symbol: '€' },
  aed: { label: 'AED', symbol: 'AED' },
  pkr: { label: 'PKR', symbol: 'PKR' },
};

const euroRegions = new Set(['AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK']);

function detectLocalCurrency(): Currency | null {
  if (typeof window === 'undefined') return null;
  const locale = window.navigator.language || '';
  const region = (() => {
    try {
      return new Intl.Locale(locale).region?.toUpperCase();
    } catch {
      return undefined;
    }
  })();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (region === 'AE' || timezone === 'Asia/Dubai') return 'aed';
  if (region === 'PK' || timezone === 'Asia/Karachi') return 'pkr';
  if (region && euroRegions.has(region)) return 'eur';
  return null;
}

const prices: Record<Currency, Record<PaidPlan, { month: number; year: number }>> = {
  usd: { starter: { month: 2900, year: 29000 }, pro: { month: 7900, year: 79000 } },
  eur: { starter: { month: 2700, year: 27000 }, pro: { month: 7300, year: 73000 } },
  aed: { starter: { month: 10700, year: 107000 }, pro: { month: 29000, year: 290000 } },
  // Localized display estimates for Pakistan; configure matching server-side Stripe prices before enabling PKR checkout.
  pkr: { starter: { month: 807200, year: 8072000 }, pro: { month: 2187760, year: 21877600 } },
};

// Smallest currency unit per 1,000 Starter email overage sends.
const starterEmailOverageUnitAmount: Record<Currency, number> = { usd: 100, eur: 100, aed: 400, pkr: 27800 };

// Reachable-user overage rates per user. Starter starts at 5k users; Pro starts at 10k.
// The backend uses the same currency-specific rates for dynamic invoices.
const reachableUserOverageRate: Record<Currency, Record<'starter' | 'pro', number>> = {
  usd: { starter: 0.01, pro: 0.008 },
  eur: { starter: 0.008, pro: 0.007 },
  aed: { starter: 0.037, pro: 0.029 },
  pkr: { starter: 2.8, pro: 2.2 },
};

const planDetails: Record<PlanKey, { label: string; summary: string; features: string[] }> = {
  free: { label: 'Free', summary: 'For teams starting with retention', features: ['2,000 reachable users', '10,000 emails incl.', 'Unlimited push notifications', '1 active Journey', '5 lifecycle segments', '5 audience groups', '100 AI Credits / month'] },
  starter: { label: 'Starter', summary: 'For small teams optimizing growth', features: ['5,000 reachable users', '20,000 emails incl.', 'Unlimited push notifications', '5 active Journeys', 'Journey Conditions & Branching', '10 lifecycle segments', '10 audience groups', '500 AI Credits / month'] },
  pro: { label: 'Pro', summary: 'For fast growing products', features: ['10,000 reachable users', 'Unlimited emails', 'Unlimited push notifications', '20 active Journeys', 'Advanced Journey Automation', '20 lifecycle segments', '20 audience groups', '2,000 AI Credits / month', 'Webhook'] },
  enterprise: { label: 'Enterprise', summary: 'For teams with 120k+ users.', features: ['Custom reachable users', 'Custom journey limits', 'Custom integrations', 'Advanced permissions', 'SSO / SAML', 'SLA & priority support', 'Custom onboarding', 'Talk to Sales'] },
};

const comparisonGroups: { group: string; rows: [string, Record<PlanKey, FeatureValue>][] }[] = [
  { group: 'Usage & Reachability', rows: [
    ['Reachable Users included', { free: '2,000', starter: '5,000', pro: '10,000', enterprise: 'Custom' }],
    ['Additional Reachable User', { free: 'Upgrade', starter: '$0.01', pro: '$0.008', enterprise: 'Custom' }],
    ['Custom App Events / month', { free: '50,000', starter: '250,000', pro: '1,000,000', enterprise: 'Custom' }],
    ['Emails / month', { free: '10,000', starter: '20,000\n+ $1 / 1,000 additional emails', pro: 'Unlimited', enterprise: 'Custom' }],
    ['Mobile Push Notifications', { free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Custom' }],
  ] },
  { group: 'Journeys & Automation', rows: [
    ['Active Journeys', { free: '1', starter: '5', pro: '20', enterprise: 'Unlimited' }],
    ['Journey Steps', { free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' }],
    ['Basic Automations', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Journey Conditions & Branching', { free: 'Not included', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['Advanced Journey Automation', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
  ] },
  { group: 'AI Features', rows: [
    ['AI Email Creator', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Translations', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Performance Analysis', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Campaign & Journey Optimizer', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Credits / month', { free: '100', starter: '500', pro: '2,000', enterprise: 'Custom' }],
  ] },
  { group: 'Audiences & Data', rows: [
    ['Lifecycle Segments', { free: '5', starter: '10', pro: '20', enterprise: 'Custom' }],
    ['Audience Groups', { free: '5', starter: '10', pro: '20', enterprise: 'Custom' }],
    ['Basic User Properties', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Custom User Properties', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['Custom Behavioral Event Targeting', { free: 'Not included', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['CSV Import', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
  ] },
  { group: 'Campaigns & Channels', rows: [
    ['SDK & Firebase', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Email Campaigns', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Push Campaigns', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Push Deep Links', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Sending Domains', { free: '1', starter: 'Multiple', pro: 'Multiple', enterprise: 'Custom' }],
  ] },
  { group: 'Analytics', rows: [
    ['Basic Analytics', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Advanced Analytics', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
    ['Conversion Tracking', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
    ['Revenue Tracking', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
    ['A/B Testing', { free: 'Not included', starter: 'Basic', pro: 'Advanced', enterprise: 'Custom' }],
  ] },
  { group: 'Integrations', rows: [
    ['Webhooks', { free: 'Not included', starter: 'Partial', pro: 'Included', enterprise: 'Custom' }],
    ['CRM Integrations', { free: 'Not included', starter: 'Partial', pro: 'Included', enterprise: 'Custom' }],
  ] },
  { group: 'Team & Security', rows: [
    ['Team Members', { free: '1', starter: '3', pro: '10', enterprise: 'Custom' }],
    ['Multiple Projects', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Included' }],
    ['Remove Branding', { free: 'Not included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['SSO / SAML', { free: 'Not included', starter: 'Not included', pro: 'Not included', enterprise: 'Included' }],
  ] },
  { group: 'Support & Enterprise', rows: [
    ['SLA & Priority Support', { free: 'Not included', starter: 'Not included', pro: 'Priority', enterprise: 'Included' }],
    ['Custom Onboarding / Migration', { free: 'Not included', starter: 'Not included', pro: 'Not included', enterprise: 'Included' }],
    ['Sales Option', { free: 'Not included', starter: 'Optional', pro: 'Optional', enterprise: 'Talk to Sales' }],
  ] },
];

const faq = [
  ['What counts as a Reachable User?', 'A person with at least one currently reachable supported channel: a valid email address or an active push token. Someone reachable through both channels counts once.'],
  ['Are email and push billed separately?', 'No. PixlPush charges primarily for the people you can reach, not for each message or channel. Email allowances and push availability are fair-use protections.'],
  ['What happens when I exceed my plan allowance?', 'Free shows upgrade warnings and does not create automatic overage charges. Starter and Pro can continue with transparent Reachable User overage.'],
  ['Are taxes included in the prices?', 'No. Prices are exclusive of applicable taxes. Stripe calculates tax at checkout using your billing country and billing address.'],
];

const money = (minor: number, currency: Currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(minor / 100);
const moneyExact = (minor: number, currency: Currency) => minor === 0 ? money(0, currency) : new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100);
const moneyPerUser = (rate: number, currency: Currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), minimumFractionDigits: rate < 0.01 ? 3 : 2, maximumFractionDigits: 3 }).format(rate);
const yearlySaving = (plan: PaidPlan, currency: Currency) => prices[currency][plan].month * 12 - prices[currency][plan].year;
const yearlySavingPercent = Math.round((1 - prices.usd.starter.year / (prices.usd.starter.month * 12)) * 100);
const number = (value: number) => value.toLocaleString('en-US');

function CostTooltip({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Tooltip
      title={title}
      arrow
      placement="top-start"
      enterTouchDelay={0}
      leaveTouchDelay={3000}
      componentsProps={{ tooltip: { sx: { maxWidth: 270, p: 1.15, borderRadius: 1, fontSize: 12, lineHeight: 1.45 } } }}
    >
      <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dashed #8b719e' }}>{children}</Box>
    </Tooltip>
  );
}

function planHref(plan: PaidPlan, interval: BillingInterval, currency: Currency, authenticated: boolean) {
  const query = `plan=${plan}&interval=${interval}&currency=${currency}`;
  return authenticated ? `/dashboard/billing/checkout?${query}` : `/get-started?${query}`;
}

function statusColor(value: FeatureValue) {
  if (value === 'Included' || value === 'Unlimited' || value === 'Priority') return '#16814d';
  if (value === 'Not included' || value === 'Upgrade') return '#9a90a7';
  if (value === 'Custom' || value === 'Talk to Sales') return '#6422c5';
  return '#4d4359';
}

const categoryDescriptions: Record<string, string> = {
  'Usage & Reachability': 'The audience size, events, email volume, and push capacity available to your workspace.',
  'Journeys & Automation': 'Tools for building automated customer journeys with triggers, steps, conditions, and branching.',
  'AI Features': 'AI-assisted tools for creating, translating, and analyzing customer communication and journeys.',
  'Audiences & Data': 'Ways to organize people, import data, and use customer properties for targeting.',
  'Campaigns & Channels': 'The channels and campaign tools available for sending messages to your audience.',
  Analytics: 'Reporting and experimentation tools for measuring campaign and journey performance.',
  Integrations: 'Connections that let PixlPush exchange data with other systems and services.',
  'Team & Security': 'Workspace access, collaboration, project management, and security controls.',
  'Support & Enterprise': 'Priority service, onboarding, migration, and custom sales options.',
};

const featureDescriptions: Record<string, string> = {
  'Reachable Users included': 'The number of people your plan can reach through supported channels such as mobile push.',
  'Additional Reachable User': 'The charge applied to each reachable person above the plan allowance.',
  'Custom App Events / month': 'The monthly number of custom app log events your app can send to PixlPush. These events can be used to build audiences, trigger journeys, personalize messages, and measure behavior.',
  'Emails / month': 'Free includes 10,000 emails, Starter includes 20,000 and charges $1 per additional 1,000 emails; Pro includes unlimited emails.',
  'Mobile Push Notifications': 'Mobile push messages are unlimited within your Reachable User allowance and subject to fair-use protections.',
  'Active Journeys': 'The number of automated journeys that can be active and running at the same time.',
  'Journey Steps': 'The actions, waits, messages, and decisions that can be placed inside an automated journey.',
  'Basic Automations': 'Core automation actions for sending messages and responding to customer activity.',
  'Journey Conditions & Branching': 'Rules that split people into different paths based on their properties or behavior.',
  'Advanced Journey Automation': 'More advanced orchestration controls for complex lifecycle and retention programs.',
  'AI Credits / month': 'The monthly allowance used by PixlPush AI tools. Different AI actions use different credit amounts.',
  'AI Email Creator': 'Generate email copy and campaign content with AI assistance.',
  'AI Translations': 'Translate message content into additional languages with AI assistance.',
  'AI Performance Analysis': 'Use AI to review campaign and journey performance and identify opportunities to improve it.',
  'AI Campaign & Journey Optimizer': 'Use AI to optimize campaigns and journeys for stronger customer engagement.',
  'Lifecycle Segments': 'Reusable groups based on where people are in their customer lifecycle.',
  'Audience Groups': 'Saved audiences used to target campaigns and journeys.',
  'Basic User Properties': 'Standard customer fields such as identity, contact details, and account information.',
  'Custom User Properties': 'Additional customer attributes that your team defines for your product and targeting needs.',
  'Custom Behavioral Event Targeting': 'Target people based on specific actions they have taken in your product.',
  'CSV Import': 'Bring customer or audience data into PixlPush from a CSV file.',
  'SDK & Firebase': 'Connect product events and mobile push delivery through the PixlPush SDK and Firebase.',
  'Email Campaigns': 'Create and send one-time or scheduled email campaigns.',
  'Push Campaigns': 'Create and send one-time or scheduled mobile push campaigns.',
  'Push Deep Links': 'Open a specific screen or destination in your app when someone taps a push message.',
  'Sending Domains': 'The domains authorized to send email messages for your organization.',
  'Basic Analytics': 'Core delivery, engagement, and campaign performance reporting.',
  'Advanced Analytics': 'Deeper performance analysis for understanding outcomes across journeys and campaigns.',
  'Conversion Tracking': 'Measure when messages lead to a defined conversion or business outcome.',
  'Revenue Tracking': 'Connect campaign and journey activity to revenue outcomes.',
  'A/B Testing': 'Compare message or journey variations to learn which performs better.',
  Webhooks: 'Send PixlPush events to another system in real time when something happens.',
  'CRM Integrations': 'Connect customer and engagement data with your CRM or customer-data systems.',
  'Team Members': 'The number of people who can access and work in the workspace.',
  'Multiple Projects': 'Manage more than one independent Project from the same workspace.',
  'Remove Branding': 'Remove PixlPush branding from supported customer-facing experiences.',
  'SSO / SAML': 'Let team members sign in through your organization’s identity provider.',
  'SLA & Priority Support': 'Faster support response and service commitments for larger or business-critical programs.',
  'Custom Onboarding / Migration': 'Hands-on help setting up PixlPush or moving data and workflows from another tool.',
  'Sales Option': 'A path to discuss custom limits, pricing, integrations, or enterprise requirements with the sales team.',
};

export default function PricingExperience() {
  const { isAuthenticated } = useCurrentUser();
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [localCurrency, setLocalCurrency] = useState<Currency | null>(null);
  const [sales, setSales] = useState(false);
  const [pushReachable, setPushReachable] = useState(2000);
  const [emailSends, setEmailSends] = useState(10000);
  const calculatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const detected = detectLocalCurrency();
    setLocalCurrency(detected);
    const stored = window.localStorage.getItem('pixlpush-pricing-currency');
    if (stored === 'usd' || (detected && stored === detected)) setCurrency(stored as Currency);
  }, []);

  const chooseCurrency = (value: Currency) => {
    setCurrency(value);
    window.localStorage.setItem('pixlpush-pricing-currency', value);
  };
  const displayCurrencies: Currency[] = localCurrency && localCurrency !== 'usd' ? ['usd', localCurrency] : ['usd'];
  const scrollToCalculator = () => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const calculator = useMemo(() => {
    const audience = Math.max(0, pushReachable);
    const eligible: PlanKey[] = audience <= 2000 && emailSends <= 10000
      ? ['free', 'starter', 'pro']
      : audience < 10000 ? ['starter', 'pro'] : ['pro'];
    const costs = eligible.map((plan) => {
      const included = plan === 'free' ? 2000 : plan === 'starter' ? 5000 : 10000;
      const rate = plan === 'starter' || plan === 'pro' ? reachableUserOverageRate[currency][plan] : 0;
      const additional = Math.max(0, audience - included);
      const overage = Math.round(additional * rate * 100);
      const includedEmails = plan === 'free' ? 10000 : plan === 'starter' ? 20000 : Number.POSITIVE_INFINITY;
      const emailOverage = plan === 'free' || plan === 'pro' ? 0 : Math.ceil(Math.max(0, emailSends - includedEmails) / 1000) * starterEmailOverageUnitAmount[currency];
      const baseMonthly = plan === 'free' || plan === 'enterprise' ? 0 : prices[currency][plan].month;
      const baseYearly = plan === 'free' || plan === 'enterprise' ? 0 : prices[currency][plan].year;
      const monthlyTotal = baseMonthly + overage + emailOverage;
      const fullAnnualTotal = monthlyTotal * 12;
      const annualTotal = baseYearly + (overage + emailOverage) * 12;
      const comparisonTotal = interval === 'year' ? annualTotal : monthlyTotal;
      return { plan, included, rate, additional, overage, includedEmails, emailOverage, baseMonthly, baseYearly, monthlyTotal, fullAnnualTotal, annualTotal, comparisonTotal, monthlyEquivalent: interval === 'year' ? annualTotal / 12 : monthlyTotal };
    });
    const best = costs.sort((first, second) => first.comparisonTotal - second.comparisonTotal)[0];
    return { audience, costs, best };
  }, [currency, emailSends, interval, pushReachable]);

  const recommendedPlan = calculator.best?.plan ?? 'free';
  const platformCost = calculator.best ? (interval === 'year' ? calculator.best.baseYearly / 12 : calculator.best.baseMonthly) : 0;
  const reachableOverageCost = calculator.best?.overage ?? 0;
  const emailOverageCost = calculator.best?.emailOverage ?? 0;
  const monthlyTotal = platformCost + reachableOverageCost + emailOverageCost;
  const showProductSpecialistCta = monthlyTotal > 100000;
  const annualDiscount = interval === 'year' && recommendedPlan !== 'free' && recommendedPlan !== 'enterprise'
    ? Math.max(0, (calculator.best?.baseMonthly ?? 0) * 12 - (calculator.best?.baseYearly ?? 0))
    : 0;
  const includedReachable = calculator.best?.included ?? 0;
  const additionalReachable = calculator.best?.additional ?? 0;
  const reachableRate = calculator.best?.rate ?? 0;
  const includedEmails = calculator.best?.includedEmails ?? 0;
  const additionalEmails = Number.isFinite(includedEmails) ? Math.max(0, emailSends - includedEmails) : 0;
  const platformTooltip = recommendedPlan === 'free'
    ? 'The Free plan has no platform charge and includes up to 2,000 reachable users and 10,000 email sends per month.'
    : interval === 'year'
      ? `${planDetails[recommendedPlan].label} annual platform fee: ${money(calculator.best?.baseYearly ?? 0, currency)} per year, shown here as ${money(platformCost, currency)} per month equivalent.`
      : `${planDetails[recommendedPlan].label} platform subscription: ${money(platformCost, currency)} per month.`;
  const reachableTooltip = `You entered ${number(pushReachable)} reachable users. Each person is counted only once, even if they can be reached by both email and push.`;
  const additionalReachableTooltip = additionalReachable > 0
    ? `${number(additionalReachable)} users are above the ${number(includedReachable)} included in ${planDetails[recommendedPlan].label}. The overage rate is ${moneyPerUser(reachableRate, currency)} per additional user, for an estimated ${moneyExact(reachableOverageCost, currency)}.`
    : `Your ${planDetails[recommendedPlan].label} plan includes up to ${number(includedReachable)} reachable users. There is no additional reachable-user charge at this usage.`;
  const pushTooltip = 'Push notifications are unlimited within your Reachable User allowance and subject to fair-use and abuse-prevention policies.';
  const emailTooltip = recommendedPlan === 'pro'
    ? 'Pro includes unlimited email sends per month at no additional charge.'
    : emailOverageCost > 0
    ? `${planDetails[recommendedPlan].label} includes ${number(includedEmails)} email sends per month. ${number(additionalEmails)} additional sends are charged at ${moneyExact(starterEmailOverageUnitAmount[currency], currency)} per 1,000 sends, for an estimated ${moneyExact(emailOverageCost, currency)}.`
    : `${planDetails[recommendedPlan].label} includes up to ${number(includedEmails)} email sends per month at no additional charge.`;
  const monthlyTotalTooltip = interval === 'year'
    ? `Monthly equivalent of the ${planDetails[recommendedPlan].label} annual plan, including any reachable-user and email overage charges.`
    : 'Estimated monthly total: platform cost plus any additional reachable-user and email-send charges.';

  return (
    <SiteShell>
      <Box sx={{ position: 'relative', overflow: 'hidden', color: '#2f1d3d', background: 'linear-gradient(116deg,#f3ecf8 0%,#f8eee9 100%)', borderBottom: '1px solid rgba(85,23,184,.1)', '&:after': { content: '""', position: 'absolute', width: 420, height: 420, right: '-8%', top: '-58%', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,.3)', border: '1px solid rgba(85,23,184,.1)' } }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={{ xs: 3, md: 6 }}>
            <Box sx={{ maxWidth: 720 }}>
              <Typography variant="h1" sx={{ fontSize: { xs: 30, md: 48 }, lineHeight: 1.02, letterSpacing: '-.04em', color: '#241536' }}>Plans that start free and grow with the people you can reach.</Typography>
              <Typography sx={{ mt: 1.7, maxWidth: 600, fontSize: { xs: 14, md: 16 }, lineHeight: 1.55, color: '#60385f' }}>Start with a focused Project, then upgrade as your audience and retention program become more valuable.</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Box sx={{ background: 'linear-gradient(180deg,#fcf9fc 0%,#faf6fb 48%,#f7f1fa 100%)' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 }, display: 'flex', flexDirection: 'column' }}>
        <Stack gap={2.5} sx={{ mb: 3, pb: 3, borderBottom: '1px solid #e9e2f0', order: 1 }}>
          <Box sx={{ position: 'relative', minHeight: 52, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, md: 2 } }}>
            <Tabs value={interval} onChange={(_, value) => setInterval(value)} aria-label="Billing interval" sx={{ mb: 0 }}>
              <Tab value="month" label="Monthly" />
              <Tab value="year" label={<>Yearly<Chip label={`Save ${yearlySavingPercent}%`} size="small" color="success" /></>} />
            </Tabs>
            <Box sx={{ alignSelf: { xs: 'flex-end', md: 'auto' } }}>
              <Tabs value={currency} onChange={(_, value) => chooseCurrency(value)} aria-label="Currency" sx={{ mb: 0 }}>
                {displayCurrencies.map((value) => <Tab key={value} value={value} label={currencyMeta[value].label} />)}
              </Tabs>
            </Box>
          </Box>
        </Stack>
        <Grid container spacing={2.25} alignItems="stretch" sx={{ order: 2 }}>
          <PricingCard plan="free" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="starter" interval={interval} currency={currency} authenticated={isAuthenticated} recommended onEstimate={scrollToCalculator} />
          <PricingCard plan="pro" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="enterprise" interval={interval} currency={currency} authenticated={isAuthenticated} onSales={() => setSales(true)} onEstimate={scrollToCalculator} />
        </Grid>
        <Box sx={{ order: 3 }}><ComparisonTable interval={interval} currency={currency} authenticated={isAuthenticated} onSales={() => setSales(true)} /></Box>

        <Box ref={calculatorRef} sx={{ mt: 6, scrollMarginTop: 28, order: 5 }}>
          <Box sx={{ position: 'relative', mb: 2.5 }}>
            <Stack alignItems="center" textAlign="center">
              <Typography variant="h2" sx={{ fontSize: { xs: 32, md: 48 }, mt: .8, letterSpacing: '-.045em' }}>Estimate your cost.</Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720, fontSize: { xs: 14, md: 16 } }}>Use your mobile audience and monthly email volume to find the right plan.</Typography>
            </Stack>
          </Box>
          <Box sx={{ p: { xs: 1, md: 2.25 }, borderRadius: 1.75, background: 'linear-gradient(135deg,#2a1852 0%,#5d3aa0 58%,#a66b86 100%)', boxShadow: '0 22px 48px rgba(65,35,110,.24)' }}>
            <Card sx={{ position: 'relative', overflow: 'hidden', borderRadius: 1.5, boxShadow: '0 14px 32px rgba(31,16,63,.17)', backgroundColor: '#fff' }}>
              <Box sx={{ position: 'absolute', top: { xs: 10, md: 14 }, right: { xs: 10, md: 18 }, zIndex: 2 }}>
                <Tabs value={interval} onChange={(_, value) => setInterval(value)} aria-label="Estimate billing interval">
                  <Tab value="month" label="Monthly" />
                  <Tab value="year" label={<Stack direction="row" alignItems="center" gap={.6}>Yearly<Chip label={`Save ${yearlySavingPercent}%`} size="small" color="success" /></Stack>} />
                </Tabs>
              </Box>
              <Grid container spacing={0}>
                <Grid item xs={12} md={5} sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f3f3f5', borderRight: { md: '1px solid #e5e3e8' } }}>
                  <Stack gap={1.5}>
                    <Typography fontSize={20} fontWeight={600} sx={{ color: '#102235' }}>Your audience</Typography>
                    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: '#e8e8ea' }}>
                      <Typography fontSize={16} fontWeight={600} sx={{ color: '#102235' }}>Reachable users</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1.4 }}>
                        <Typography fontSize={13} sx={{ color: '#27313d' }}>Reachable users for Email and Push</Typography>
                        <TextField aria-label="Reachable users for Email and Push" type="number" inputProps={{ min: 0 }} value={pushReachable} onChange={(event) => setPushReachable(Math.max(0, Number(event.target.value)))} sx={{ width: 132 }} />
                      </Stack>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: '#e8e8ea' }}>
                      <Typography fontSize={16} fontWeight={600} sx={{ color: '#102235' }}>Email</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1.4 }}>
                        <Typography fontSize={13} sx={{ color: '#27313d' }}>Number of email sends</Typography>
                        <TextField aria-label="Number of email sends" type="number" inputProps={{ min: 0 }} value={emailSends} onChange={(event) => setEmailSends(Math.max(0, Number(event.target.value)))} sx={{ width: 132 }} />
                      </Stack>
                    </Box>
                    {!showProductSpecialistCta && <Card sx={{ p: 1.7, borderRadius: 1.25, color: '#fff', background: 'linear-gradient(135deg,#2d145e 0%,#6422c5 100%)', boxShadow: '0 10px 20px rgba(100,34,197,.18)' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5}>
                        <Box>
                          <Typography fontSize={16} fontWeight={600}>Need more customize offer?</Typography>
                        </Box>
                        <Button variant="contained" onClick={() => setSales(true)} sx={{ flexShrink: 0, minHeight: 38, px: 2, borderRadius: 1, color: '#32114d', backgroundColor: '#fff', textTransform: 'none', '&:hover': { backgroundColor: '#f5edff' } }}>Talk to sales</Button>
                      </Stack>
                    </Card>}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={7} sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack gap={1.7}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                      <Typography fontSize={20} fontWeight={600} sx={{ color: '#102235' }}>Your cost breakdown</Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                      <Typography fontSize={13} fontWeight={600} fontStyle="italic" sx={{ color: '#253342' }}>{planDetails[recommendedPlan].label} plan</Typography>
                      {recommendedPlan === 'free' && <Typography fontSize={11} fontWeight={500} sx={{ color: '#16814d' }}>Includes 2,000 users · 10,000 emails / month</Typography>}
                    </Stack>
                    <Stack gap={1.15} sx={{ color: '#27313d' }}>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Platform cost</Typography>{showProductSpecialistCta ? <Typography fontSize={14} fontWeight={600}>Custom</Typography> : <Stack direction="row" alignItems="baseline" justifyContent="flex-end" gap={.7} sx={{ color: '#27313d', fontSize: 14, fontWeight: 600 }}>{interval === 'year' && <Typography component="span" color="text.disabled" fontSize={13} sx={{ textDecoration: 'line-through' }}>{money(calculator.best?.baseMonthly ?? platformCost, currency)}</Typography>}<CostTooltip title={platformTooltip}>{money(platformCost, currency)}</CostTooltip></Stack>}</Stack>
                      {annualDiscount > 0 && <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Annual discount</Typography><Typography fontSize={14} fontWeight={600} color="#16814d">−{money(annualDiscount, currency)} / year</Typography></Stack>}
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Reachable users</Typography><Stack direction="row" alignItems="baseline" gap={.7} sx={{ fontSize: 14, fontWeight: 600 }}><Typography component="span" fontSize={14} fontWeight={600}>{`${Math.round(includedReachable / 1000)}k`}</Typography><CostTooltip title={reachableTooltip}>Included with {planDetails[recommendedPlan].label}</CostTooltip></Stack></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Additional reachable users</Typography><Typography fontSize={14} fontWeight={600}>{showProductSpecialistCta ? 'Custom' : <CostTooltip title={additionalReachableTooltip}>{moneyExact(reachableOverageCost, currency)}</CostTooltip>}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Push notifications</Typography><Typography fontSize={14} fontWeight={600} sx={{ color: '#27313d' }}><CostTooltip title={pushTooltip}>Unlimited</CostTooltip></Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Email sends</Typography><Typography fontSize={14} fontWeight={600}>{recommendedPlan === 'pro' ? <CostTooltip title={emailTooltip}>Unlimited</CostTooltip> : emailOverageCost && showProductSpecialistCta ? 'Custom' : <CostTooltip title={emailTooltip}>{emailOverageCost ? moneyExact(emailOverageCost, currency) : `Included with ${planDetails[recommendedPlan].label}`}</CostTooltip>}</Typography></Stack>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}><Typography fontSize={14} fontWeight={600} sx={{ color: '#102235' }}>Estimated cost per month</Typography><Box textAlign="right">{showProductSpecialistCta ? <Typography fontSize={{ xs: 24, md: 32 }} fontWeight={600} sx={{ color: '#102235' }}>Custom</Typography> : <><Stack direction="row" alignItems="baseline" justifyContent="flex-end" gap={.7}>{interval === 'year' && annualDiscount > 0 && <Typography component="span" color="text.disabled" fontSize={{ xs: 18, md: 22 }} sx={{ textDecoration: 'line-through' }}>{moneyExact((calculator.best?.fullAnnualTotal ?? 0) / 12, currency)}</Typography>}<Typography component="span" fontSize={{ xs: 24, md: 32 }} fontWeight={600} sx={{ color: '#102235' }}><CostTooltip title={monthlyTotalTooltip}>{moneyExact(monthlyTotal, currency)}</CostTooltip></Typography><Typography component="span" color="text.secondary" fontSize={12}> / month</Typography></Stack></>}</Box></Stack>
                    {showProductSpecialistCta && <Box sx={{ position: 'relative', overflow: 'hidden', mt: .5, p: { xs: 2.1, md: 2.6 }, borderRadius: 1.75, color: '#fff', background: 'linear-gradient(135deg,#12133f 0%,#1c1d55 46%,#4b2094 100%)', border: '1px solid rgba(170,132,255,.42)', boxShadow: '0 18px 34px rgba(39,23,96,.26), inset 0 1px 0 rgba(255,255,255,.14)', '&:before': { content: '""', position: 'absolute', width: 230, height: 230, right: -92, top: -145, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.2) 0%,rgba(255,255,255,0) 68%)', pointerEvents: 'none' }, '&:after': { content: '""', position: 'absolute', left: 22, right: 22, bottom: 0, height: 1, background: 'linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.42),rgba(255,255,255,0))', pointerEvents: 'none' } }}>
                      <Stack position="relative" zIndex={1} alignItems="center" gap={1.5}>
                        <Stack direction="row" alignItems="center" gap={.8} sx={{ color: '#d8c5ff' }}>
                          <AutoAwesomeRounded sx={{ fontSize: 17 }} />
                          <Typography fontSize={11} fontWeight={500} letterSpacing=".12em">PREMIUM SUPPORT</Typography>
                        </Stack>
                        <Typography textAlign="center" fontSize={{ xs: 14, md: 16 }} fontWeight={600} lineHeight={1.45} sx={{ maxWidth: 660 }}>Talk to us for volume-based discounting, support package, custom contract, and more</Typography>
                        <Button component="a" href="https://calendly.com/" target="_blank" rel="noreferrer" fullWidth startIcon={<AutoAwesomeRounded sx={{ fontSize: 18 }} />} sx={{ minHeight: 50, mt: .2, px: 3, color: '#241536', background: 'linear-gradient(135deg,#fff 0%,#f0e6ff 100%)', border: '1px solid rgba(255,255,255,.72)', boxShadow: '0 10px 20px rgba(7,7,36,.28), inset 0 1px 0 rgba(255,255,255,.95)', textTransform: 'none', fontSize: { xs: 13, md: 14 }, letterSpacing: '.01em', borderRadius: 1, '& .MuiButton-startIcon': { color: '#6422c5' }, '&:hover': { color: '#241536', background: 'linear-gradient(135deg,#fff 0%,#e6d3ff 100%)', boxShadow: '0 13px 24px rgba(7,7,36,.34), inset 0 1px 0 rgba(255,255,255,.95)' } }}>Talk to a product specialist</Button>
                      </Stack>
                    </Box>}
                    <Typography color="text.secondary" fontSize={11}>Additional Reachable Users and email overages are billed monthly in arrears. Annual discounts apply to the base plan only.</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Card>
          </Box>
        </Box>

        <Box sx={{ order: 4 }}><ProviderComparison onScenarioChange={(users, emailSends) => { setPushReachable(users); setEmailSends(emailSends); }} /></Box>

        <Box sx={{ mt: 7, order: 7 }}><Typography fontSize={12} fontWeight={500} letterSpacing=".13em" color="primary.main">QUESTIONS, ANSWERED</Typography><Typography variant="h2" sx={{ fontSize: { xs: 32, md: 40 }, mt: 0.5, mb: 2.5 }}>Pricing without surprises.</Typography><Box sx={{ border: '1px solid #ded5e8', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 14px 32px rgba(69,30,91,.1)' }}>{faq.map(([question, answer]) => <Accordion key={question} disableGutters elevation={0} sx={{ border: 0, borderBottom: '1px solid #eee8f3', borderRadius: 0, '&:last-child': { borderBottom: 0 }, '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ minHeight: 52, '& .MuiAccordionSummary-content': { my: 1.4 } }}><Typography fontWeight={600}>{question}</Typography></AccordionSummary><AccordionDetails sx={{ pt: 0, pb: 2.2 }}><Typography color="text.secondary" fontSize={14} lineHeight={1.6}>{answer}</Typography></AccordionDetails></Accordion>)}</Box></Box>
      </Container>
      </Box>
      <Dialog open={sales} onClose={() => setSales(false)} maxWidth="sm" fullWidth><DialogTitle>Talk to Sales<IconButton onClick={() => setSales(false)} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle><DialogContent><Typography color="text.secondary" fontSize={13} lineHeight={1.6}>Enterprise plans are arranged with our team: custom limits, permissions, integrations, onboarding, and support. Tell us about your audience and we’ll shape the right Project setup.</Typography><Button variant="contained" size="large" href="/get-started?intent=enterprise" fullWidth sx={{ mt: 2, textTransform: 'none' }}>Continue to contact sales</Button></DialogContent></Dialog>
    </SiteShell>
  );
}

function PricingCard({ plan, interval, currency, authenticated, recommended, onSales, onEstimate }: { plan: PlanKey; interval: BillingInterval; currency: Currency; authenticated: boolean; recommended?: boolean; onSales?: () => void; onEstimate: () => void }) {
  const detail = planDetails[plan];
  const isPaid = plan === 'starter' || plan === 'pro';
  const monthly = isPaid ? prices[currency][plan].month : 0;
  const annual = isPaid ? prices[currency][plan].year : 0;
  const annualMonthly = isPaid ? Math.round(annual / 12) : 0;
  const href = isPaid ? planHref(plan, interval, currency, authenticated) : '/get-started?plan=free';
  const accent = plan === 'enterprise' ? '#e27b4f' : recommended ? '#6422c5' : '#7e5bb7';
  const tag = plan === 'free' ? 'Start simple' : plan === 'starter' ? 'For growing teams' : plan === 'pro' ? 'For scaling teams' : 'Tailored partnership';
  const surface = '#fff';
  const priceSurface = recommended ? '#f1eaff' : '#faf9fc';
  return (
    <Grid item xs={12} sm={6} lg={3} sx={{ display: 'flex' }}>
      <Card sx={{ position: 'relative', mt: 0, width: '100%', height: '100%', display: 'flex', overflow: 'visible', borderRadius: 2, border: recommended ? '2px solid #6422c5' : '1px solid #ded5e8', borderTop: `4px solid ${accent}`, boxShadow: recommended ? '0 18px 36px rgba(100,34,197,.22)' : '0 12px 28px rgba(69,30,91,.12)', background: surface, transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: recommended ? '0 22px 42px rgba(100,34,197,.29)' : '0 18px 34px rgba(69,30,91,.18)' } }}>
        {recommended && <Chip label="RECOMMENDED" size="small" sx={{ position: 'absolute', zIndex: 2, top: -16, left: '50%', transform: 'translateX(-50%)', height: 24, px: .8, borderRadius: .5, color: '#fff', backgroundColor: '#6422c5', fontSize: 11, fontWeight: 500, letterSpacing: '.08em', boxShadow: '0 5px 12px rgba(100,34,197,.22)' }} />}
        <Stack sx={{ p: { xs: 2.1, md: 2.2 }, pt: 2.1, height: '100%', width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
                <Typography fontSize={20} fontWeight={600} sx={{ color: '#241536', flexShrink: 0 }}>{detail.label}</Typography>
                <Chip label={tag} size="small" sx={{ height: 23, maxWidth: 132, color: accent, backgroundColor: recommended ? '#eee6ff' : '#f6f2fa', fontSize: 11, fontWeight: 500, flexShrink: 0, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
              </Stack>
            </Box>
          </Stack>
          <Box sx={{ mt: 1.5, p: 1.4, minHeight: interval === 'year' && isPaid ? 124 : 108, borderRadius: 2, backgroundColor: priceSurface, border: '1px solid', borderColor: recommended ? '#dcc8ff' : 'rgba(100,34,197,.1)' }}>
            <Stack gap={.35}>
              {interval === 'year' && isPaid && <Stack direction="row" alignItems="center" gap={.7} flexWrap="wrap"><Typography component="span" color="text.disabled" sx={{ textDecoration: 'line-through', fontSize: 13, whiteSpace: 'nowrap' }}>{money(monthly, currency)}</Typography><Chip label={`Save ${yearlySavingPercent}%`} size="small" sx={{ height: 22, color: '#16764a', backgroundColor: '#e7f8ed', fontWeight: 500, fontSize: 11 }} /></Stack>}
              <Stack direction="row" alignItems="baseline" gap={.6} flexWrap="wrap">
                <Typography fontSize={{ xs: 32, md: 32 }} fontWeight={600} sx={{ color: '#241536', whiteSpace: 'nowrap' }}>{isPaid ? money(interval === 'year' ? annualMonthly : monthly, currency) : plan === 'free' ? money(0, currency) : 'Custom'}</Typography>
                {(isPaid || plan === 'free') && <Typography color="text.secondary" fontSize={12} sx={{ whiteSpace: 'nowrap' }}>/ month</Typography>}
              </Stack>
              {detail.summary && <Typography color="text.secondary" fontSize={12} lineHeight={1.35} sx={{ mt: .45, minHeight: 32, whiteSpace: 'pre-line' }}>{detail.summary}</Typography>}
            </Stack>
          </Box>
          <Button variant={recommended ? 'contained' : 'outlined'} fullWidth href={plan === 'enterprise' ? undefined : href} onClick={plan === 'enterprise' ? onSales : undefined} sx={{ mt: 1.7, textTransform: 'none', borderRadius: 1.5, minHeight: 42 }}>{plan === 'enterprise' ? 'Talk to Sales' : authenticated ? 'Choose plan' : 'Start for free'}</Button>
          {plan !== 'enterprise' && <Typography color="text.secondary" fontSize={11} textAlign="center" sx={{ mt: .8 }}>No credit card required</Typography>}
          {plan === 'enterprise' && <Button variant="text" size="small" onClick={onEstimate} sx={{ mt: .4, textTransform: 'none', color: '#6422c5', textDecoration: 'underline', '&:hover': { textDecoration: 'underline' } }}>Estimate your cost</Button>}
          <Divider sx={{ my: 1.75 }} />
          <Typography fontSize={12} fontWeight={500} letterSpacing='.08em' color='#8b719e' sx={{ mb: .9, textTransform: 'uppercase' }}>What’s included</Typography>
          <Stack gap={1.05}>{detail.features.map((feature) => <Stack direction="row" gap={.8} alignItems="flex-start" key={feature}><CheckCircleRounded sx={{ color: '#22a064', fontSize: 17, mt: .1 }} /><Typography fontSize={13} lineHeight={1.35}>{feature}</Typography></Stack>)}</Stack>
        </Stack>
      </Card>
    </Grid>
  );
}

function ComparisonTable({ interval, currency, authenticated, onSales }: { interval: BillingInterval; currency: Currency; authenticated: boolean; onSales: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const visibleGroups = expanded ? comparisonGroups : comparisonGroups.slice(0, 3);
  const rows = visibleGroups.flatMap((category) => [
    <TableRow key={`${category.group}-header`}>
      <TableCell colSpan={5} sx={{ py: 1.6, px: 2, color: '#241536', backgroundColor: '#f1e8ff', fontSize: 14, fontWeight: 500, letterSpacing: '.02em' }}>
        <Tooltip title={categoryDescriptions[category.group] ?? ''} arrow placement="top" enterTouchDelay={0}>
          <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dashed #8b719e' }}>{category.group}</Box>
        </Tooltip>
      </TableCell>
    </TableRow>,
    ...category.rows.map(([label, values], rowIndex) => (
      <TableRow key={`${category.group}-${label}`} sx={{ backgroundColor: rowIndex % 2 ? '#f3f3f3' : '#fff', '&:hover': { backgroundColor: '#eee9f6' } }}>
        <TableCell sx={{ px: 2, py: 1.35, fontSize: 13, fontWeight: 500, color: '#233247', verticalAlign: 'top' }}>
          <Tooltip title={featureDescriptions[label]} arrow placement="top-start" enterTouchDelay={0}>
            <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dashed #8b719e' }}>{label}</Box>
          </Tooltip>
        </TableCell>
        {(['free', 'starter', 'pro', 'enterprise'] as PlanKey[]).map((key) => (
          <TableCell align="center" key={key} sx={{ px: 1.2, py: 1.35, color: statusColor(values[key]), fontSize: 13, fontWeight: 500, verticalAlign: 'middle' }}>
            {values[key] === 'Included' ? <CheckCircleRounded aria-label="Included" sx={{ color: '#2b9862', fontSize: 19, verticalAlign: 'middle' }} /> : <Typography component="span" sx={{ whiteSpace: 'pre-line', fontSize: 'inherit', fontWeight: 'inherit' }}>{values[key]}</Typography>}
          </TableCell>
        ))}
      </TableRow>
    )),
  ]);
  const planActions: Record<PlanKey, { label: string; href?: string; onClick?: () => void }> = {
    free: { label: authenticated ? 'Choose plan' : 'Start for free', href: '/get-started?plan=free' },
    starter: { label: authenticated ? 'Choose plan' : 'Start for free', href: planHref('starter', interval, currency, authenticated) },
    pro: { label: authenticated ? 'Choose plan' : 'Start for free', href: planHref('pro', interval, currency, authenticated) },
    enterprise: { label: 'Talk to sales', onClick: onSales },
  };
  const planPrice = (plan: PlanKey) => {
    if (plan === 'free') return `${money(0, currency)}/mo`;
    if (plan === 'enterprise') return 'Custom';
    return interval === 'year' ? `${money(prices[currency][plan].year, currency)}/yr` : `${money(prices[currency][plan].month, currency)}/mo`;
  };
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography fontSize={{ xs: 24, md: 32 }} fontWeight={600} sx={{ mt: .7, letterSpacing: '-.035em', color: '#241536' }}>Comprehensive feature breakdown</Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: .7 }}>Compare the features and benefits of each PixlPush plan.</Typography>
      </Box>
      <TableContainer component={Card} sx={{ borderRadius: 1.5, border: '1px solid #ded5e8', boxShadow: '0 16px 38px rgba(69,30,91,.12)', backgroundColor: '#fff', overflowX: 'auto' }}>
        <Table size="medium" sx={{ minWidth: 1080 }}>
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: '#fff', color: '#102235', borderBottom: '1px solid #ded5e8', position: 'sticky', top: 0, zIndex: 2 } }}>
              <TableCell sx={{ minWidth: 320, verticalAlign: 'bottom', pb: 2.2, px: 2 }}><Typography fontSize={14} fontWeight={600}>Feature</Typography></TableCell>
              {(['free', 'starter', 'pro', 'enterprise'] as PlanKey[]).map((plan) => {
                const action = planActions[plan];
                return <TableCell key={plan} align="center" sx={{ minWidth: 175, py: 1.8, px: 1.2, backgroundColor: plan === 'starter' ? '#faf6ff' : '#fff', borderLeft: '1px solid #f0ebf4' }}>
                  <Typography fontSize={16} fontWeight={600} sx={{ color: '#241536' }}>{planDetails[plan].label}</Typography>
                  <Typography color="text.secondary" fontSize={11} sx={{ mt: .4, mb: 1.2 }}>{planPrice(plan)}</Typography>
                  <Button variant={plan === 'starter' ? 'contained' : 'outlined'} size="small" href={action.href} onClick={action.onClick} sx={{ minWidth: 140, minHeight: 36, px: 1.2, borderRadius: .7, textTransform: 'none', fontSize: 11, whiteSpace: 'nowrap' }}>{action.label}</Button>
                </TableCell>;
              })}
            </TableRow>
          </TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
        <Button variant="outlined" onClick={() => setExpanded((value) => !value)} sx={{ px: 3, borderRadius: 99, borderColor: '#6422c5', color: '#6422c5', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#4d179d', backgroundColor: '#f5efff' } }}>
          {expanded ? 'Show fewer features' : 'Show all features'}
        </Button>
      </Box>
    </Box>
  );
}
