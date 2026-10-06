'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AutoAwesomeRounded,
  ArrowForwardRounded,
  CalculateRounded,
  CheckCircleRounded,
  CloseRounded,
  CompareArrowsRounded,
  ExpandMoreRounded,
  InfoOutlined,
  ShieldRounded,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
  Typography,
} from '@mui/material';
import { SiteShell } from './SiteShell';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { BillingInterval, PaidPlan } from '@/types/project';

type Currency = 'usd' | 'eur' | 'aed' | 'pkr';
type PlanKey = 'free' | PaidPlan | 'enterprise';
type FeatureValue = 'Included' | 'Limited' | 'Not included' | 'Custom' | 'Upgrade' | 'Basic' | 'Advanced' | 'Partial' | 'Priority' | 'Optional' | 'Unlimited' | 'Multiple' | '1' | '3' | '5' | '10' | '20' | '2,000' | '5,000' | '25,000' | '50,000' | '10,000' | '250,000' | '1,000,000' | '100' | '500' | '$0.01' | '$0.008' | 'Talk to Sales';

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

const planDetails: Record<PlanKey, { label: string; description: string; audience: string; features: string[] }> = {
  free: { label: 'Free', description: 'Explore the core retention workflow.', audience: 'For teams starting their first retention loop.', features: ['2,000 reachable users', '1 active Journey', 'Basic automations', '5 lifecycle segments', '5 audience groups', '100 AI Credits / month', 'Unlimited Journey Steps', 'Unlimited push within allowance'] },
  starter: { label: 'Starter', description: 'More powerful automations for growing teams.', audience: 'For early teams building their first lifecycle engine.', features: ['5,000 reachable users', '5 active Journeys', 'Journey Conditions & Branching', '10 lifecycle segments', '10 audience groups', '500 AI Credits / month', 'Unlimited Journey Steps', 'Unlimited push within allowance'] },
  pro: { label: 'Pro', description: 'Advanced Journey orchestration at scale.', audience: 'For products running serious retention programs.', features: ['25,000 reachable users', '20 active Journeys', 'Advanced Journey Automation', '20 lifecycle segments', '20 audience groups', '2,000 AI Credits / month', 'Unlimited Journey Steps', 'Unlimited push within allowance'] },
  enterprise: { label: 'Enterprise', description: 'Custom automation, limits, and support.', audience: 'For advanced teams with custom scale and controls.', features: ['Custom reachable users', 'Custom journey limits', 'Custom integrations', 'Advanced permissions', 'SSO / SAML', 'SLA & priority support', 'Custom onboarding', 'Talk to Sales'] },
};

const comparisonGroups: { group: string; rows: [string, Record<PlanKey, FeatureValue>][] }[] = [
  { group: 'Usage & Reachability', rows: [
    ['Reachable Users included', { free: '2,000', starter: '5,000', pro: '25,000', enterprise: 'Custom' }],
    ['Additional Reachable User', { free: 'Upgrade', starter: '$0.01', pro: '$0.008', enterprise: 'Custom' }],
    ['Custom Behavioral Events / month', { free: '50,000', starter: '250,000', pro: '1,000,000', enterprise: 'Custom' }],
    ['Emails / month', { free: '10,000', starter: '50,000', pro: '250,000', enterprise: 'Custom' }],
    ['Push Notifications', { free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Custom' }],
  ] },
  { group: 'Journeys & Automation', rows: [
    ['Active Journeys', { free: '1', starter: '5', pro: '20', enterprise: 'Unlimited' }],
    ['Journey Steps', { free: 'Unlimited', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' }],
    ['Basic Automations', { free: 'Included', starter: 'Included', pro: 'Included', enterprise: 'Included' }],
    ['Journey Conditions & Branching', { free: 'Not included', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['Advanced Journey Automation', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
  ] },
  { group: 'AI Features', rows: [
    ['AI Credits / month', { free: '100', starter: '500', pro: '2,000', enterprise: 'Custom' }],
    ['AI Email Creator', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Translations', { free: 'Limited', starter: 'Included', pro: 'Included', enterprise: 'Custom' }],
    ['AI Journey Analysis', { free: 'Not included', starter: 'Not included', pro: 'Included', enterprise: 'Custom' }],
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
const yearlySaving = (plan: PaidPlan, currency: Currency) => prices[currency][plan].month * 12 - prices[currency][plan].year;
const yearlySavingPercent = Math.round((1 - prices.usd.starter.year / (prices.usd.starter.month * 12)) * 100);
const number = (value: number) => value.toLocaleString('en-US');

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

export default function PricingExperience() {
  const { isAuthenticated } = useCurrentUser();
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [currency, setCurrency] = useState<Currency>('usd');
  const [localCurrency, setLocalCurrency] = useState<Currency | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [sales, setSales] = useState(false);
  const [emailReachable, setEmailReachable] = useState(3500);
  const [pushReachable, setPushReachable] = useState(1800);
  const [uniqueReachable, setUniqueReachable] = useState(3500);
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
    const audience = Math.max(0, uniqueReachable || Math.max(emailReachable, pushReachable));
    const eligible: PlanKey[] = audience <= 2000 ? ['free', 'starter', 'pro'] : ['starter', 'pro'];
    const costs = eligible.map((plan) => {
      const included = plan === 'free' ? 2000 : plan === 'starter' ? 5000 : 25000;
      const rate = plan === 'starter' ? 0.01 : plan === 'pro' ? 0.008 : 0;
      const additional = Math.max(0, audience - included);
      const overage = Math.round(additional * rate * 100);
      const baseMonthly = plan === 'free' || plan === 'enterprise' ? 0 : prices[currency][plan].month;
      const baseYearly = plan === 'free' || plan === 'enterprise' ? 0 : prices[currency][plan].year;
      const base = interval === 'year' ? baseYearly : baseMonthly;
      const annualTotal = base + overage * 12;
      return { plan, included, rate, additional, overage, base, baseMonthly, baseYearly, annualTotal, monthlyEquivalent: annualTotal / 12 };
    });
    const best = costs.sort((first, second) => first.annualTotal - second.annualTotal)[0];
    return { audience, costs, best, freeOverLimit: audience > 2000 };
  }, [currency, emailReachable, interval, pushReachable, uniqueReachable]);

  const recommendedPlan = calculator.best?.plan ?? 'free';
  const platformCost = calculator.best ? (interval === 'year' ? calculator.best.baseYearly / 12 : calculator.best.baseMonthly) : 0;
  const overageCost = calculator.best?.overage ?? 0;
  const monthlyTotal = platformCost + overageCost;

  return (
    <SiteShell>
      <Box sx={{ position: 'relative', overflow: 'hidden', color: '#32114d', background: 'linear-gradient(116deg,#ffd1e9 0%,#ffbd87 40%,#ff6d2d 100%)', borderBottom: '1px solid rgba(100,34,197,.16)', '&:after': { content: '""', position: 'absolute', width: 420, height: 420, right: '-8%', top: '-58%', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.28)' } }}>
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 5.5 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={{ xs: 3, md: 6 }}>
            <Box sx={{ maxWidth: 720 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.2 }}>
                <Box sx={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 1.2, color: '#fff', backgroundColor: 'rgba(100,34,197,.78)' }}><AutoAwesomeRounded sx={{ fontSize: 16 }} /></Box>
                <Typography fontSize={12} fontWeight={900} letterSpacing=".14em" color="#6422c5">PIXLPUSH PRICING</Typography>
              </Stack>
              <Typography variant="h1" sx={{ fontSize: { xs: 36, md: 54 }, lineHeight: .98, letterSpacing: '-.045em', color: '#241536' }}>Plans that grow with the people you can reach.</Typography>
              <Typography sx={{ mt: 1.7, maxWidth: 600, fontSize: { xs: 15, md: 17 }, lineHeight: 1.55, color: '#60385f' }}>Start with a focused Project, then upgrade as your audience and retention program become more valuable.</Typography>
            </Box>
            <Box sx={{ position: 'relative', zIndex: 1, minWidth: { md: 270 }, p: 2, border: '1px solid rgba(100,34,197,.2)', borderRadius: 2, backgroundColor: 'rgba(255,255,255,.74)', boxShadow: '0 10px 22px rgba(77,39,126,.1)' }}>
              <Typography fontSize={11} fontWeight={900} letterSpacing=".1em" color="#8b719e">ONE PROJECT. CLEAR LIMITS.</Typography>
              <Typography fontSize={15} fontWeight={900} sx={{ mt: .8, color: '#241536' }}>Pay for reach, not message volume.</Typography>
              <Typography fontSize={12} lineHeight={1.5} color="text.secondary" sx={{ mt: .5 }}>Every plan includes the core PixlPush workflow.</Typography>
            </Box>
          </Stack>
        </Container>
      </Box>
      <Box sx={{ background: 'linear-gradient(180deg,#fff8f4 0%,#f8f1ff 30%,#fffafc 64%,#f6f0ff 100%)' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack gap={2.5} sx={{ mb: 3, pb: 3, borderBottom: '1px solid #e9e2f0' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography fontSize={12} fontWeight={900} letterSpacing=".13em" color="#6422c5">SIMPLE, TRANSPARENT PRICING</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 30, md: 40 }, mt: .6, letterSpacing: '-.035em' }}>Choose the right room to grow.</Typography>
            <Typography color="text.secondary" sx={{ mt: .7 }}>Every Project starts independently. Change plans as your audience changes.</Typography>
          </Box>
          <Box sx={{ position: 'relative', minHeight: 52, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between', gap: { xs: 1.5, md: 2 } }}>
            <Box className="workspace-tabs" sx={{ width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }} aria-label="Billing interval">
              <Button onClick={() => setInterval('month')} className={interval === 'month' ? 'workspace-tab active' : 'workspace-tab'}>Monthly</Button>
              <Button onClick={() => setInterval('year')} className={interval === 'year' ? 'workspace-tab active' : 'workspace-tab'}>Yearly<Chip label={`Save ${yearlySavingPercent}%`} size="small" /></Button>
            </Box>
            <Box sx={{ alignSelf: { xs: 'flex-end', md: 'auto' } }}>
              <Box className="workspace-tabs" sx={{ p: .5 }} aria-label="Currency">
                {displayCurrencies.map((value) => <Button key={value} onClick={() => chooseCurrency(value)} className={currency === value ? 'workspace-tab active' : 'workspace-tab'} sx={{ minWidth: 54 }}>{currencyMeta[value].label}</Button>)}
              </Box>
            </Box>
          </Box>
        </Stack>
        <Alert icon={<ShieldRounded />} severity="info" sx={{ mb: 3, borderRadius: 2, color: '#245c7b', backgroundColor: '#e8f7ff', '& .MuiAlert-icon': { color: '#258fca' } }}>Prices are exclusive of applicable taxes. Taxes are calculated at checkout based on your billing country.</Alert>
        <Grid container spacing={2.5} alignItems="stretch">
          <PricingCard plan="free" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="starter" interval={interval} currency={currency} authenticated={isAuthenticated} recommended onEstimate={scrollToCalculator} />
          <PricingCard plan="pro" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="enterprise" interval={interval} currency={currency} authenticated={isAuthenticated} onSales={() => setSales(true)} onEstimate={scrollToCalculator} />
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} sx={{ mt: 3, p: 1.8, borderRadius: 2, border: '1px solid #ded5e8', backgroundColor: '#fff' }}><Stack direction="row" gap={1.25} alignItems="center"><Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 1.2, color: '#6422c5', backgroundColor: '#eee6ff' }}><CompareArrowsRounded fontSize="small" /></Box><Box><Typography fontWeight={900}>Need every detail before you decide?</Typography><Typography color="text.secondary" fontSize={12}>Compare the complete approved plan matrix by category.</Typography></Box></Stack><Button variant="outlined" onClick={() => setComparisonOpen((open) => !open)} endIcon={<ArrowForwardRounded />} sx={{ textTransform: 'none', fontWeight: 900, whiteSpace: 'nowrap', borderRadius: 1.5 }}>{comparisonOpen ? 'Hide full comparison' : 'Compare all features'}</Button></Stack>
        {comparisonOpen && <ComparisonTable interval={interval} currency={currency} authenticated={isAuthenticated} onSales={() => setSales(true)} />}

        <Box ref={calculatorRef} sx={{ mt: 6, scrollMarginTop: 28 }}>
          <Box sx={{ p: { xs: 1, md: 2.25 }, borderRadius: 1.75, background: 'linear-gradient(135deg,#241452 0%,#5926b9 56%,#f27c68 100%)', boxShadow: '0 18px 40px rgba(82,38,150,.18)' }}>
            <Card sx={{ overflow: 'hidden', borderRadius: 1.5, boxShadow: '0 10px 22px rgba(31,16,63,.1)', backgroundColor: '#fff' }}>
              <Stack alignItems="center" textAlign="center" sx={{ px: { xs: 2, md: 4 }, pt: { xs: 3.5, md: 5 }, pb: { xs: 3, md: 4 } }}>
                <Typography fontSize={12} fontWeight={950} letterSpacing=".14em" color="#6422c5">PLAN FIT CALCULATOR</Typography>
                <Typography variant="h2" sx={{ fontSize: { xs: 31, md: 48 }, mt: .8, letterSpacing: '-.045em' }}>Estimate your cost.</Typography>
                <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720, fontSize: { xs: 14, md: 17 } }}>Email and push are channel breakdowns. People reachable through both count once.</Typography>
              </Stack>
              <Grid container spacing={0}>
                <Grid item xs={12} md={5} sx={{ p: { xs: 2, md: 3 }, backgroundColor: '#f3f3f5', borderRight: { md: '1px solid #e5e3e8' } }}>
                  <Stack gap={1.5}>
                    <Typography fontSize={20} fontWeight={950} sx={{ color: '#102235' }}>Your audience</Typography>
                    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: '#e8e8ea' }}>
                      <Typography fontSize={16} fontWeight={900} sx={{ color: '#102235' }}>Reachable users</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1.4 }}>
                        <Typography fontSize={13} sx={{ color: '#27313d' }}>Via email</Typography>
                        <TextField aria-label="Reachable Users via Email" type="number" inputProps={{ min: 0 }} value={emailReachable} onChange={(event) => { const value = Math.max(0, Number(event.target.value)); setEmailReachable(value); if (uniqueReachable < value) setUniqueReachable(value); }} sx={{ width: 132, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: .75, height: 42 } }} />
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1 }}>
                        <Typography fontSize={13} sx={{ color: '#27313d' }}>Via push</Typography>
                        <TextField aria-label="Reachable Users via Push" type="number" inputProps={{ min: 0 }} value={pushReachable} onChange={(event) => setPushReachable(Math.max(0, Number(event.target.value)))} sx={{ width: 132, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: .75, height: 42 } }} />
                      </Stack>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 1, backgroundColor: '#e8e8ea' }}>
                      <Typography fontSize={16} fontWeight={900} sx={{ color: '#102235' }}>Unique audience</Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1.4 }}>
                        <Typography fontSize={13} sx={{ color: '#27313d' }}>Total reachable users</Typography>
                        <TextField aria-label="Estimated Total Unique Reachable Users" type="number" inputProps={{ min: 0 }} value={uniqueReachable} onChange={(event) => setUniqueReachable(Math.max(0, Number(event.target.value)))} sx={{ width: 132, '& .MuiOutlinedInput-root': { backgroundColor: '#fff', borderRadius: .75, height: 42 } }} />
                      </Stack>
                      <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>People in both channels count once.</Typography>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                      <Box sx={{ minHeight: 92, p: 1.4, borderRadius: 1, backgroundColor: '#e8e8ea', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}><Typography fontSize={16} fontWeight={950} sx={{ color: '#102235' }}>In-app messaging</Typography><Typography color="text.secondary" fontSize={12}>Included with PixlPush</Typography></Box>
                      <Box sx={{ minHeight: 92, p: 1.4, borderRadius: 1, backgroundColor: '#e8e8ea', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}><Typography fontSize={16} fontWeight={950} sx={{ color: '#102235' }}>SMS / RCS</Typography><Button variant="text" size="small" onClick={() => setSales(true)} sx={{ alignSelf: 'flex-start', minWidth: 0, p: 0, textTransform: 'none', color: '#5135b9', textDecoration: 'underline', fontSize: 13 }}>Talk to sales</Button></Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={7} sx={{ p: { xs: 2, md: 3 } }}>
                  <Stack gap={1.7}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
                      <Box><Typography fontSize={20} fontWeight={950} sx={{ color: '#102235' }}>Your cost breakdown</Typography><Typography color="text.secondary" fontSize={13}>{number(calculator.audience)} estimated unique reachable users</Typography></Box>
                      <Chip icon={<CalculateRounded />} label={calculator.best?.plan === 'pro' ? 'Best value at this size' : 'Most cost-effective'} sx={{ color: '#fff', backgroundColor: '#6422c5', fontWeight: 900 }} />
                    </Stack>
                    {calculator.freeOverLimit && <Alert severity="warning" sx={{ borderRadius: 2 }}>Free supports up to 2,000 Reachable Users and does not create automatic overage charges.</Alert>}
                    <Typography fontSize={13} fontWeight={900} fontStyle="italic" sx={{ color: '#253342' }}>{planDetails[recommendedPlan].label} plan</Typography>
                    <Stack gap={1.15} sx={{ color: '#27313d' }}>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Platform cost</Typography><Typography fontSize={14} fontWeight={700}>{money(platformCost, currency)}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Additional reachable users</Typography><Typography fontSize={14} fontWeight={700}>{overageCost ? money(overageCost, currency) : 'Included'}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Email</Typography><Typography fontSize={14} color="text.secondary">Included with {planDetails[recommendedPlan].label}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>Push notifications</Typography><Typography fontSize={14} color="text.secondary">Included with {planDetails[recommendedPlan].label}</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontSize={14}>In-app messaging</Typography><Typography fontSize={14} color="text.secondary">Included with PixlPush</Typography></Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}><Typography fontSize={14}>SMS / RCS</Typography><Button variant="text" size="small" onClick={() => setSales(true)} sx={{ minWidth: 0, p: 0, textTransform: 'none', color: '#6422c5', textDecoration: 'underline', fontSize: 14 }}>Talk to sales</Button></Stack>
                    </Stack>
                    <Divider />
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2}><Typography fontSize={15} fontWeight={950} sx={{ color: '#102235' }}>Estimated cost per month</Typography><Typography fontSize={{ xs: 27, md: 34 }} fontWeight={950} sx={{ color: '#102235' }}>{money(monthlyTotal, currency)}<Typography component="span" color="text.secondary" fontSize={12}> / month equivalent</Typography></Typography></Stack>
                    <Typography color="text.secondary" fontSize={11}>Additional Reachable Users are billed monthly. Annual subscription discounts apply to the base plan, not usage overage.</Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Card>
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mt: 5 }}><Card sx={{ flex: 1, p: 2.2, borderRadius: 2, backgroundColor: '#fffaf6', border: '1px solid #f2dfd6', boxShadow: 'none' }}><Stack direction="row" gap={1.4} alignItems="flex-start"><Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.2, color: '#d16a3e', backgroundColor: '#ffeadf' }}><AutoAwesomeRounded fontSize="small" /></Box><Box><Typography fontWeight={900}>AI Credits are action-based</Typography><Typography color="text.secondary" fontSize={12} sx={{ mt: 0.6, lineHeight: 1.55 }}>AI Email Creator uses 10 credits per generation, Smart Translation uses 10 per target language, AI Journey Analysis uses 100, Journey Optimization uses 50, and AI Customized Journey uses 50.</Typography></Box></Stack></Card><Card sx={{ flex: 1, p: 2.2, borderRadius: 2, backgroundColor: '#f7f4ff', border: '1px solid #e4dafa', boxShadow: 'none' }}><Stack direction="row" gap={1.4} alignItems="flex-start"><Box sx={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0, borderRadius: 1.2, color: '#6422c5', backgroundColor: '#eee6ff' }}><ShieldRounded fontSize="small" /></Box><Box><Typography fontWeight={900}>Billing is Project-level</Typography><Typography color="text.secondary" fontSize={12} sx={{ mt: 0.6, lineHeight: 1.55 }}>Each Project has its own plan, usage, billing contact, invoices, and payment method. Payments are handled securely by Stripe.</Typography></Box></Stack></Card></Stack>
        <Box sx={{ mt: 7 }}><Typography fontSize={12} fontWeight={900} letterSpacing=".13em" color="primary.main">QUESTIONS, ANSWERED</Typography><Typography variant="h2" sx={{ fontSize: { xs: 31, md: 42 }, mt: 0.5, mb: 2.5 }}>Pricing without surprises.</Typography><Box sx={{ border: '1px solid #ded5e8', borderRadius: 2, overflow: 'hidden', backgroundColor: '#fff' }}>{faq.map(([question, answer]) => <Accordion key={question} disableGutters elevation={0} sx={{ border: 0, borderBottom: '1px solid #eee8f3', borderRadius: 0, '&:last-child': { borderBottom: 0 }, '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ minHeight: 52, '& .MuiAccordionSummary-content': { my: 1.4 } }}><Typography fontWeight={900}>{question}</Typography></AccordionSummary><AccordionDetails sx={{ pt: 0, pb: 2.2 }}><Typography color="text.secondary" fontSize={14} lineHeight={1.6}>{answer}</Typography></AccordionDetails></Accordion>)}</Box></Box>
      </Container>
      </Box>
      <Dialog open={sales} onClose={() => setSales(false)} maxWidth="sm" fullWidth><DialogTitle sx={{ fontWeight: 900 }}>Talk to Sales<IconButton onClick={() => setSales(false)} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle><DialogContent><Typography color="text.secondary" fontSize={13} lineHeight={1.6}>Enterprise plans are arranged with our team: custom limits, permissions, integrations, onboarding, and support. Tell us about your audience and we’ll shape the right Project setup.</Typography><Button variant="contained" size="large" href="/get-started?intent=enterprise" fullWidth sx={{ mt: 2, textTransform: 'none', fontWeight: 900 }}>Continue to contact sales</Button></DialogContent></Dialog>
    </SiteShell>
  );
}

function PricingCard({ plan, interval, currency, authenticated, recommended, onSales, onEstimate }: { plan: PlanKey; interval: BillingInterval; currency: Currency; authenticated: boolean; recommended?: boolean; onSales?: () => void; onEstimate: () => void }) {
  const detail = planDetails[plan];
  const isPaid = plan === 'starter' || plan === 'pro';
  const monthly = isPaid ? prices[currency][plan].month : 0;
  const annual = isPaid ? prices[currency][plan].year : 0;
  const display = isPaid ? (interval === 'year' ? annual : monthly) : 0;
  const href = isPaid ? planHref(plan, interval, currency, authenticated) : '/get-started?plan=free';
  const accent = plan === 'enterprise' ? '#e27b4f' : recommended ? '#6422c5' : '#7e5bb7';
  const tag = plan === 'free' ? 'Start simple' : plan === 'starter' ? 'For growing teams' : plan === 'pro' ? 'For scaling teams' : 'Tailored partnership';
  const surface = '#fff';
  const priceSurface = recommended ? '#f1eaff' : '#faf9fc';
  return (
    <Grid item xs={12} sm={6} lg={3}>
      <Card sx={{ position: 'relative', mt: recommended ? 1.5 : 0, height: '100%', overflow: 'visible', borderRadius: 2, border: recommended ? '2px solid #6422c5' : '1px solid #ded5e8', borderTop: `4px solid ${accent}`, boxShadow: recommended ? '0 14px 28px rgba(100,34,197,.15)' : '0 8px 18px rgba(69,30,91,.05)', background: surface, transition: 'transform .2s ease, box-shadow .2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: recommended ? '0 18px 34px rgba(100,34,197,.2)' : '0 14px 26px rgba(69,30,91,.1)' } }}>
        {recommended && <Chip label="RECOMMENDED" size="small" sx={{ position: 'absolute', zIndex: 2, top: -16, left: '50%', transform: 'translateX(-50%)', height: 24, px: .8, borderRadius: .5, color: '#fff', backgroundColor: '#6422c5', fontSize: 10, fontWeight: 950, letterSpacing: '.08em', boxShadow: '0 5px 12px rgba(100,34,197,.22)' }} />}
        <Stack sx={{ p: { xs: 2.3, md: 2.5 }, pt: 2.25, height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
                <Typography fontSize={23} fontWeight={950} sx={{ color: '#241536', flexShrink: 0 }}>{detail.label}</Typography>
                <Chip label={tag} size="small" sx={{ height: 23, maxWidth: 132, color: accent, backgroundColor: recommended ? '#eee6ff' : '#f6f2fa', fontSize: 11, fontWeight: 900, flexShrink: 0, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
              </Stack>
              <Typography color="text.secondary" fontSize={13} lineHeight={1.45} sx={{ mt: .75, minHeight: 35 }}>{detail.description}</Typography>
            </Box>
          </Stack>
          <Typography color="text.secondary" fontSize={13} lineHeight={1.45} sx={{ mt: 1.5, minHeight: 36 }}>{detail.audience}</Typography>
          <Box sx={{ mt: 1.75, p: 1.5, minHeight: interval === 'year' && isPaid ? 132 : 116, borderRadius: 2, backgroundColor: priceSurface, border: '1px solid', borderColor: recommended ? '#dcc8ff' : 'rgba(100,34,197,.1)' }}>
            <Stack gap={.35}>
              <Stack direction="row" alignItems="baseline" gap={.6} flexWrap="wrap">
                {interval === 'year' && isPaid && <Typography component="span" color="text.disabled" sx={{ textDecoration: 'line-through', fontSize: 13, whiteSpace: 'nowrap' }}>{money(monthly, currency)}</Typography>}
                <Typography fontSize={{ xs: 29, md: 31 }} fontWeight={950} sx={{ color: '#241536', whiteSpace: 'nowrap' }}>{isPaid ? money(display, currency) : plan === 'free' ? money(0, currency) : 'Custom'}</Typography>
              </Stack>
              <Typography color="text.secondary" fontSize={12} lineHeight={1.35}>{isPaid ? `per ${interval}, plus tax` : plan === 'free' ? 'Forever' : 'tailored to your scale'}</Typography>
            </Stack>
            {interval === 'year' && isPaid ? <Stack direction="row" gap={.7} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}><Chip label={`Save ${yearlySavingPercent}% · ${money(yearlySaving(plan, currency), currency)}`} size="small" sx={{ height: 22, color: '#16764a', backgroundColor: '#e7f8ed', fontWeight: 900, fontSize: 10, maxWidth: '100%' }} /><Typography color="text.secondary" fontSize={11}>billed annually</Typography></Stack> : <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>No setup fees. Cancel when you need to.</Typography>}
          </Box>
          <Button variant={recommended ? 'contained' : 'outlined'} fullWidth href={plan === 'enterprise' ? undefined : href} onClick={plan === 'enterprise' ? onSales : undefined} sx={{ mt: 1.7, textTransform: 'none', fontWeight: 900, borderRadius: 1.5, minHeight: 42 }}>{plan === 'enterprise' ? 'Talk to Sales' : authenticated && isPaid ? 'Choose plan' : isPaid ? 'Start free trial' : 'Start for free'}</Button>
          <Button variant="text" size="small" onClick={onEstimate} sx={{ mt: .4, textTransform: 'none', color: '#6422c5', fontWeight: 800 }}>Estimate your cost</Button>
          <Divider sx={{ my: 1.75 }} />
          <Typography fontSize={12} fontWeight={900} letterSpacing='.08em' color='#8b719e' sx={{ mb: .9, textTransform: 'uppercase' }}>What’s included</Typography>
          <Stack gap={1.05}>{detail.features.map((feature) => <Stack direction="row" gap={.8} alignItems="flex-start" key={feature}><CheckCircleRounded sx={{ color: '#22a064', fontSize: 17, mt: .1 }} /><Typography fontSize={13} lineHeight={1.35}>{feature}</Typography></Stack>)}</Stack>
        </Stack>
      </Card>
    </Grid>
  );
}

function ComparisonTable({ interval, currency, authenticated, onSales }: { interval: BillingInterval; currency: Currency; authenticated: boolean; onSales: () => void }) {
  const rows = comparisonGroups.flatMap((category) => [
    <TableRow key={`${category.group}-header`}>
      <TableCell colSpan={5} sx={{ py: 1.2, color: '#6422c5', backgroundColor: '#f5efff', fontWeight: 950, letterSpacing: '.04em' }}>{category.group}</TableCell>
    </TableRow>,
    ...category.rows.map(([label, values]) => (
      <TableRow key={`${category.group}-${label}`} hover>
        <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
          {label}
          {label === 'Push Notifications' && <Typography component="span" display="block" color="text.secondary" fontSize={10} fontWeight={400}>Unlimited push notifications within your Reachable User allowance, subject to fair-use and abuse-prevention policies.</Typography>}
        </TableCell>
        {(['free', 'starter', 'pro', 'enterprise'] as PlanKey[]).map((key) => (
          <TableCell align="center" key={key} sx={{ color: statusColor(values[key]), fontSize: 12, fontWeight: 800 }}>{values[key]}</TableCell>
        ))}
      </TableRow>
    )),
  ]);
  const planActions: Record<PlanKey, { label: string; href?: string; onClick?: () => void }> = {
    free: { label: 'Start for free', href: '/get-started?plan=free' },
    starter: { label: authenticated ? 'Choose plan' : 'Start free trial', href: planHref('starter', interval, currency, authenticated) },
    pro: { label: authenticated ? 'Choose plan' : 'Start free trial', href: planHref('pro', interval, currency, authenticated) },
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
        <Typography fontSize={12} fontWeight={950} letterSpacing=".14em" color="#6422c5">COMPARE PLANS IN DETAIL</Typography>
        <Typography fontSize={{ xs: 27, md: 36 }} fontWeight={950} sx={{ mt: .7, letterSpacing: '-.035em', color: '#241536' }}>Comprehensive feature breakdown</Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: .7 }}>Compare the features and benefits of each PixlPush plan.</Typography>
        <Chip icon={<InfoOutlined />} label="Included · Limited · Not included · Custom · Upgrade" size="small" sx={{ mt: 1.4, fontWeight: 800, color: '#5d3a8c', backgroundColor: '#f1eaff' }} />
      </Box>
      <TableContainer component={Card} sx={{ borderRadius: 1.5, border: '1px solid #ded5e8', boxShadow: '0 14px 34px rgba(69,30,91,.06)', backgroundColor: '#fff' }}>
        <Table size="small" sx={{ minWidth: 840 }}>
          <TableHead>
            <TableRow sx={{ '& th': { backgroundColor: '#fff', color: '#102235', borderBottom: '1px solid #ded5e8', position: 'sticky', top: 0, zIndex: 2 } }}>
              <TableCell sx={{ minWidth: 260, verticalAlign: 'bottom', pb: 2.2 }}><Typography fontSize={13} fontWeight={900}>Feature</Typography></TableCell>
              {(['free', 'starter', 'pro', 'enterprise'] as PlanKey[]).map((plan) => {
                const action = planActions[plan];
                return <TableCell key={plan} align="center" sx={{ minWidth: 138, py: 1.5, backgroundColor: plan === 'starter' ? '#faf6ff' : '#fff', borderLeft: '1px solid #f0ebf4' }}>
                  <Typography fontSize={15} fontWeight={950} sx={{ color: '#241536' }}>{planDetails[plan].label}</Typography>
                  <Typography color="text.secondary" fontSize={10} sx={{ mt: .35, mb: 1 }}>{planPrice(plan)}</Typography>
                  <Button variant={plan === 'starter' ? 'contained' : 'outlined'} size="small" href={action.href} onClick={action.onClick} sx={{ minWidth: 112, minHeight: 30, px: 1, borderRadius: .7, textTransform: 'none', fontSize: 10, fontWeight: 900, whiteSpace: 'nowrap' }}>{action.label}</Button>
                </TableCell>;
              })}
            </TableRow>
          </TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
