'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowForwardRounded,
  CalculateRounded,
  CheckRounded,
  CloseRounded,
  CompareArrowsRounded,
  ExpandMoreRounded,
  InfoOutlined,
  ShieldRounded,
  StarRounded,
  TrendingUpRounded,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { SiteShell, PageHero } from './SiteShell';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import type { BillingInterval, PaidPlan } from '@/types/project';

type Currency = 'usd' | 'eur' | 'aed';
type PlanKey = 'free' | PaidPlan | 'enterprise';
type FeatureValue = 'Included' | 'Limited' | 'Not included' | 'Custom' | 'Upgrade' | 'Basic' | 'Advanced' | 'Partial' | 'Priority' | 'Optional' | 'Unlimited' | 'Multiple' | '1' | '3' | '5' | '10' | '20' | '2,000' | '5,000' | '25,000' | '50,000' | '10,000' | '250,000' | '1,000,000' | '100' | '500' | '$0.01' | '$0.008' | 'Talk to Sales';

const currencyMeta: Record<Currency, { label: string; symbol: string }> = {
  usd: { label: 'USD', symbol: '$' },
  eur: { label: 'EUR', symbol: '€' },
  aed: { label: 'AED', symbol: 'AED' },
};

const prices: Record<Currency, Record<PaidPlan, { month: number; year: number }>> = {
  usd: { starter: { month: 2900, year: 29000 }, pro: { month: 7900, year: 79000 } },
  eur: { starter: { month: 2700, year: 27000 }, pro: { month: 7300, year: 73000 } },
  aed: { starter: { month: 10700, year: 107000 }, pro: { month: 29000, year: 290000 } },
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
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [sales, setSales] = useState(false);
  const [emailReachable, setEmailReachable] = useState(3500);
  const [pushReachable, setPushReachable] = useState(1800);
  const [uniqueReachable, setUniqueReachable] = useState(3500);
  const [needsConditions, setNeedsConditions] = useState(false);
  const [needsAdvanced, setNeedsAdvanced] = useState(false);
  const calculatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('pixlpush-pricing-currency');
    if (stored === 'usd' || stored === 'eur' || stored === 'aed') setCurrency(stored);
  }, []);

  const chooseCurrency = (value: Currency) => {
    setCurrency(value);
    window.localStorage.setItem('pixlpush-pricing-currency', value);
  };
  const scrollToCalculator = () => calculatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const calculator = useMemo(() => {
    const audience = Math.max(0, uniqueReachable || Math.max(emailReachable, pushReachable));
    const eligible: PlanKey[] = needsAdvanced ? ['pro'] : needsConditions ? ['starter', 'pro'] : audience <= 2000 ? ['free', 'starter', 'pro'] : ['starter', 'pro'];
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
  }, [currency, emailReachable, interval, needsAdvanced, needsConditions, pushReachable, uniqueReachable]);

  return (
    <SiteShell>
      <PageHero eyebrow="PRICING" title="Pay for the users you can reach — not for every message you send." description="Start with a clear, isolated Project. Upgrade when your reachable audience and retention program grow." />
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ mb: 4 }}>
          <Box><Typography fontSize={12} fontWeight={900} letterSpacing=".13em" color="primary.main">SIMPLE, TRANSPARENT PRICING</Typography><Typography variant="h2" sx={{ fontSize: { xs: 31, md: 42 }, mt: 0.5 }}>Choose the right room to grow.</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Every Project starts independently. Change plans as your audience changes.</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
            <ToggleButtonGroup exclusive size="small" value={interval} onChange={(_, value: BillingInterval | null) => value && setInterval(value)} aria-label="Billing interval" sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 800, px: 1.8 } }}><ToggleButton value="month">Monthly</ToggleButton><ToggleButton value="year">Yearly · 2 months free</ToggleButton></ToggleButtonGroup>
            <ToggleButtonGroup exclusive size="small" value={currency} onChange={(_, value: Currency | null) => value && chooseCurrency(value)} aria-label="Currency" sx={{ '& .MuiToggleButton-root': { minWidth: 52, textTransform: 'none', fontWeight: 800 } }}><ToggleButton value="usd">USD</ToggleButton><ToggleButton value="eur">EUR</ToggleButton><ToggleButton value="aed">AED</ToggleButton></ToggleButtonGroup>
          </Stack>
        </Stack>
        <Alert icon={<ShieldRounded />} severity="info" sx={{ mb: 3, borderRadius: 2, color: '#245c7b', backgroundColor: '#e8f7ff', '& .MuiAlert-icon': { color: '#258fca' } }}>Prices are exclusive of applicable taxes. Taxes are calculated at checkout based on your billing country.</Alert>
        <Grid container spacing={2} alignItems="stretch">
          <PricingCard plan="free" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="starter" interval={interval} currency={currency} authenticated={isAuthenticated} recommended onEstimate={scrollToCalculator} />
          <PricingCard plan="pro" interval={interval} currency={currency} authenticated={isAuthenticated} onEstimate={scrollToCalculator} />
          <PricingCard plan="enterprise" interval={interval} currency={currency} authenticated={isAuthenticated} onSales={() => setSales(true)} onEstimate={scrollToCalculator} />
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} sx={{ mt: 3, p: 2, borderRadius: 2.5, border: '1px solid #e5dcef', background: 'linear-gradient(100deg,#fff,#faf7ff)' }}><Stack direction="row" gap={1.25} alignItems="center"><Box sx={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 1.5, color: '#6422c5', backgroundColor: '#eee6ff' }}><CompareArrowsRounded fontSize="small" /></Box><Box><Typography fontWeight={900}>Need every detail before you decide?</Typography><Typography color="text.secondary" fontSize={12}>Compare the complete approved plan matrix by category.</Typography></Box></Stack><Button variant="outlined" onClick={() => setComparisonOpen((open) => !open)} endIcon={<ArrowForwardRounded />} sx={{ textTransform: 'none', fontWeight: 900, whiteSpace: 'nowrap' }}>{comparisonOpen ? 'Hide full comparison' : 'Compare all features'}</Button></Stack>
        {comparisonOpen && <ComparisonTable />}

        <Box ref={calculatorRef} sx={{ mt: 7, scrollMarginTop: 28 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} gap={1} sx={{ mb: 2.5 }}><Box><Typography fontSize={12} fontWeight={900} letterSpacing=".13em" color="primary.main">PLAN FIT CALCULATOR</Typography><Typography variant="h2" sx={{ fontSize: { xs: 31, md: 42 }, mt: 0.5 }}>Estimate your cost.</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Email and push are channel breakdowns. People reachable through both count once.</Typography></Box><Chip icon={<CalculateRounded />} label="Free never creates automatic overage charges" sx={{ color: '#5d3a8c', backgroundColor: '#f1eaff', fontWeight: 800 }} /></Stack>
          <Card sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, border: '1px solid #e5dcef', boxShadow: '0 16px 38px rgba(69,30,91,.07)' }}><Grid container spacing={3}><Grid item xs={12} md={4}><Stack gap={2}><TextField label="Reachable Users via Email" type="number" inputProps={{ min: 0 }} value={emailReachable} onChange={(event) => { const value = Math.max(0, Number(event.target.value)); setEmailReachable(value); if (uniqueReachable < value) setUniqueReachable(value); }} fullWidth /><TextField label="Reachable Users via Push" type="number" inputProps={{ min: 0 }} value={pushReachable} onChange={(event) => setPushReachable(Math.max(0, Number(event.target.value)))} fullWidth /><TextField label="Estimated Total Unique Reachable Users" helperText="People in both channels count once." type="number" inputProps={{ min: 0 }} value={uniqueReachable} onChange={(event) => setUniqueReachable(Math.max(0, Number(event.target.value)))} fullWidth /><Divider /><FormControlLabel control={<Checkbox checked={needsConditions} onChange={(event) => setNeedsConditions(event.target.checked)} />} label={<Typography fontSize={13}>I need Journey Conditions</Typography>} /><FormControlLabel control={<Checkbox checked={needsAdvanced} onChange={(event) => setNeedsAdvanced(event.target.checked)} />} label={<Typography fontSize={13}>I need advanced automation or analytics</Typography>} /></Stack></Grid><Grid item xs={12} md={8}><Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1.5 }}><Box><Typography fontSize={18} fontWeight={900}>Your recommendation</Typography><Typography color="text.secondary" fontSize={12}>{number(calculator.audience)} estimated unique reachable users</Typography></Box><Chip label={needsAdvanced ? 'Pro required' : calculator.best?.plan === 'pro' ? 'Best value at this size' : 'Most cost-effective'} color="primary" sx={{ fontWeight: 900 }} /></Stack>{needsAdvanced && <Alert severity="info" sx={{ mb: 1.5, borderRadius: 1.5 }}>Pro is recommended because Advanced Journey Automation, Advanced Analytics, Conversion Tracking, and Revenue Tracking require Pro or higher.</Alert>}{needsConditions && !needsAdvanced && <Alert severity="info" sx={{ mb: 1.5, borderRadius: 1.5 }}>Starter is the minimum plan for Journey Conditions and Branching.</Alert>}{calculator.freeOverLimit && !needsAdvanced && <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 1.5 }}>Free supports up to 2,000 Reachable Users and does not create automatic overage charges.</Alert>}<Stack gap={1.25}>{calculator.costs.map((item) => <CalculatorPlan key={item.plan} item={item} interval={interval} currency={currency} recommended={item.plan === calculator.best?.plan} />)}</Stack><Typography color="text.secondary" fontSize={11} sx={{ mt: 1.75 }}>Additional Reachable Users are billed monthly. Annual subscription discounts apply to the base plan, not usage overage.</Typography></Grid></Grid></Card>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mt: 5 }}><Card sx={{ flex: 1, p: 2.5, borderRadius: 2.5, backgroundColor: '#fffaf6', border: '1px solid #f2dfd6' }}><Typography fontWeight={900}>AI Credits are action-based</Typography><Typography color="text.secondary" fontSize={12} sx={{ mt: 0.75, lineHeight: 1.6 }}>AI Email Creator uses 10 credits per generation, Smart Translation uses 10 per target language, AI Journey Analysis uses 100, Journey Optimization uses 50, and AI Customized Journey uses 50.</Typography></Card><Card sx={{ flex: 1, p: 2.5, borderRadius: 2.5, backgroundColor: '#f7f4ff', border: '1px solid #e4dafa' }}><Typography fontWeight={900}>Billing is Project-level</Typography><Typography color="text.secondary" fontSize={12} sx={{ mt: 0.75, lineHeight: 1.6 }}>Each Project has its own plan, usage, billing contact, invoices, and payment method. Payments are handled securely by Stripe.</Typography></Card></Stack>
        <Box sx={{ mt: 7 }}><Typography fontSize={12} fontWeight={900} letterSpacing=".13em" color="primary.main">QUESTIONS, ANSWERED</Typography><Typography variant="h2" sx={{ fontSize: { xs: 31, md: 42 }, mt: 0.5, mb: 2.5 }}>Pricing without surprises.</Typography>{faq.map(([question, answer]) => <Accordion key={question} disableGutters elevation={0} sx={{ border: '1px solid #e8e0f0', '&:not(:last-child)': { borderBottom: 0 }, '&:before': { display: 'none' } }}><AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography fontWeight={900}>{question}</Typography></AccordionSummary><AccordionDetails><Typography color="text.secondary" fontSize={14} lineHeight={1.6}>{answer}</Typography></AccordionDetails></Accordion>)}</Box>
      </Container>
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
  return <Grid item xs={12} sm={6} lg={3}><Card sx={{ position: 'relative', height: '100%', overflow: 'hidden', borderRadius: 2.5, border: recommended ? '2px solid #6422c5' : '1px solid #e5dcef', boxShadow: recommended ? '0 18px 42px rgba(100,34,197,.16)' : '0 12px 30px rgba(69,30,91,.06)', background: recommended ? 'linear-gradient(160deg,#fff 0%,#f8f2ff 100%)' : '#fff' }}>{recommended && <Box sx={{ py: 0.8, textAlign: 'center', color: '#fff', background: 'linear-gradient(90deg,#6422c5,#a74cd6)', fontSize: 10, fontWeight: 900, letterSpacing: '.14em' }} >RECOMMENDED FOR MOST TEAMS</Box>}<Stack sx={{ p: 2.5, pt: recommended ? 2.2 : 2.5, height: '100%' }}><Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}><Box><Typography fontSize={21} fontWeight={950}>{detail.label}</Typography><Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5, minHeight: 36 }}>{detail.description}</Typography></Box>{recommended && <StarRounded sx={{ color: '#f4b42c' }} />}</Stack><Typography color="text.secondary" fontSize={12} sx={{ mt: 1.5, minHeight: 38 }}>{detail.audience}</Typography><Stack direction="row" alignItems="baseline" gap={0.6} sx={{ mt: 2 }}>{interval === 'year' && isPaid && <Typography component="span" color="text.disabled" sx={{ textDecoration: 'line-through', fontSize: 13 }}>{money(monthly, currency)}</Typography>}<Typography fontSize={31} fontWeight={950} sx={{ color: '#241536' }}>{isPaid ? money(display, currency) : plan === 'free' ? money(0, currency) : 'Custom'}</Typography><Typography color="text.secondary" fontSize={11}>{isPaid ? `per ${interval}, plus tax` : plan === 'free' ? 'Forever' : 'tailored to your scale'}</Typography></Stack>{interval === 'year' && isPaid ? <Stack direction="row" gap={0.7} alignItems="center" sx={{ mt: 0.9 }}><Chip label={`Save ${money(yearlySaving(plan, currency), currency)}`} size="small" sx={{ color: '#16764a', backgroundColor: '#e7f8ed', fontWeight: 900, fontSize: 10 }} /><Typography color="text.secondary" fontSize={10}>billed annually</Typography></Stack> : <Box sx={{ height: 27 }} />}<Button variant={recommended ? 'contained' : 'outlined'} fullWidth href={plan === 'enterprise' ? undefined : href} onClick={plan === 'enterprise' ? onSales : undefined} sx={{ mt: 1.5, textTransform: 'none', fontWeight: 900, borderRadius: 1.5 }}>{plan === 'enterprise' ? 'Talk to Sales' : authenticated && isPaid ? 'Choose plan' : isPaid ? 'Start free trial' : 'Start for free'}</Button><Button variant="text" size="small" onClick={onEstimate} sx={{ mt: 0.5, textTransform: 'none', color: '#6422c5', fontWeight: 800 }}>Estimate your cost</Button><Divider sx={{ my: 1.75 }} /><Stack gap={1.1}>{detail.features.map((feature) => <Stack direction="row" gap={0.8} alignItems="flex-start" key={feature}><CheckRounded sx={{ color: recommended ? '#6422c5' : '#25a365', fontSize: 16, mt: 0.1 }} /><Typography fontSize={11.5} lineHeight={1.35}>{feature}</Typography></Stack>)}</Stack></Stack></Card></Grid>;
}

function ComparisonTable() {
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
  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
        <Box><Typography fontSize={21} fontWeight={950}>Full plan comparison</Typography><Typography color="text.secondary" fontSize={12}>Clear entitlements for teams that need to go deeper.</Typography></Box>
        <Chip icon={<InfoOutlined />} label="Included · Limited · Not included · Custom" size="small" sx={{ width: 'fit-content', fontWeight: 800 }} />
      </Stack>
      <TableContainer component={Card} sx={{ borderRadius: 2.5, border: '1px solid #e5dcef', boxShadow: '0 14px 34px rgba(69,30,91,.06)' }}>
        <Table size="small" sx={{ minWidth: 840 }}>
          <TableHead><TableRow sx={{ '& th': { backgroundColor: '#241536', color: '#fff', borderBottom: 0, fontWeight: 900, position: 'sticky', top: 0, zIndex: 2 } }}><TableCell sx={{ minWidth: 260 }}>Feature</TableCell><TableCell align="center">Free</TableCell><TableCell align="center" sx={{ backgroundColor: '#5a24b2 !important' }}>Starter</TableCell><TableCell align="center">Pro</TableCell><TableCell align="center">Enterprise</TableCell></TableRow></TableHead>
          <TableBody>{rows}</TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function CalculatorPlan({ item, interval, currency, recommended }: { item: { plan: PlanKey; included: number; rate: number; additional: number; overage: number; baseMonthly: number; annualTotal: number }; interval: BillingInterval; currency: Currency; recommended: boolean }) {
  const label = planDetails[item.plan].label;
  return <Box sx={{ p: 1.75, borderRadius: 2, border: '1px solid', borderColor: recommended ? '#6422c5' : '#e6e0ed', backgroundColor: recommended ? '#faf6ff' : '#fff' }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Stack direction="row" alignItems="center" gap={1}><Box sx={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 1, color: '#6422c5', backgroundColor: '#eee6ff' }}><TrendingUpRounded sx={{ fontSize: 17 }} /></Box><Box><Stack direction="row" gap={0.7} alignItems="center"><Typography fontWeight={900}>{label}</Typography>{recommended && <Chip label="Recommended" size="small" sx={{ color: '#6422c5', backgroundColor: '#eee6ff', fontWeight: 900, fontSize: 9 }} />}</Stack><Typography color="text.secondary" fontSize={11}>{number(item.included)} included <Tooltip title={`${label} includes ${number(item.included)} Reachable Users and charges ${currencyMeta[currency].symbol}${item.rate} per additional user. Users reachable through both email and push count only once.`}><InfoOutlined sx={{ fontSize: 14, verticalAlign: 'middle', ml: 0.4, cursor: 'help' }} /></Tooltip></Typography></Box></Stack><Typography fontWeight={950} fontSize={19}>{money(interval === 'year' ? item.annualTotal : item.baseMonthly + item.overage, currency)}<Typography component="span" color="text.secondary" fontSize={11}> / month equivalent</Typography></Typography></Stack><Stack direction={{ xs: 'column', sm: 'row' }} gap={{ xs: 0.3, sm: 2 }} sx={{ mt: 1.2, color: '#5e526b' }}><Typography fontSize={11}>Additional users: <b>{number(item.additional)}</b></Typography><Typography fontSize={11}>Overage: <b>{money(item.overage, currency)} / month</b></Typography><Typography fontSize={11}>Annual total: <b>{money(item.annualTotal, currency)}</b></Typography></Stack></Box>;
}
