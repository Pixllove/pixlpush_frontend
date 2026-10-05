'use client';

import { useState } from 'react';
import { CheckRounded, CloseRounded, LockRounded } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Container, Dialog, DialogContent, DialogTitle, Divider, Grid, IconButton, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { SiteShell, PageHero } from './SiteShell';
import { PUBLIC_PRICES, formatMoney, priceOf, yearlySaving } from '@/lib/billing';
import type { BillingInterval, PaidPlan } from '@/types/project';

type Plan = { name: string; paid?: PaidPlan; description: string; featured?: boolean; features: string[] };

const plans: Plan[] = [
  { name: 'Free', description: 'Explore the core retention workflow.', features: ['1,000 reachable users', '5,000 emails / month', '30,000 pushes / month', '1 active Journey', '100 AI Credits / month'] },
  { name: 'Starter', paid: 'starter', description: 'For early teams building their first lifecycle engine.', features: ['5,000 reachable users', '50,000 emails / month', '100,000 pushes / month', '5 active Journeys', '500 AI Credits / month'] },
  { name: 'Pro', paid: 'pro', description: 'For growing products with serious retention programs.', featured: true, features: ['25,000 reachable users', '250,000 emails / month', '500,000 pushes / month', '20 active Journeys', '2,000 AI Credits / month'] },
  { name: 'Enterprise', description: 'For advanced teams with custom limits and support.', features: ['Custom reachable users', 'Custom channel volume', 'Advanced permissions', 'Dedicated success partner', 'Custom integrations'] },
];

export default function PricingExperience() {
  const [interval, setInterval] = useState<BillingInterval>('month');
  const [sales, setSales] = useState(false);

  return (
    <SiteShell>
      <PageHero eyebrow="PRICING" title="A plan that grows with your Project." description="Start with a clear, isolated Project. Upgrade when your reachable audience and retention program grow." />
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
        <Stack alignItems="center" gap={1} sx={{ mb: 4 }}>
          <ToggleButtonGroup exclusive value={interval} onChange={(_, value: BillingInterval | null) => value && setInterval(value)} aria-label="Billing interval">
            <ToggleButton value="month" sx={{ px: 3, textTransform: 'none', fontWeight: 800 }}>Monthly</ToggleButton>
            <ToggleButton value="year" sx={{ px: 3, textTransform: 'none', fontWeight: 800 }}>Yearly · 2 months free</ToggleButton>
          </ToggleButtonGroup>
          <Typography color="text.secondary" fontSize={12}>Prices in AED, excluding tax. Yearly billing costs ten monthly payments.</Typography>
        </Stack>
        <Grid container spacing={2} alignItems="stretch">
          {plans.map((plan) => {
            const price = plan.paid ? priceOf(PUBLIC_PRICES, plan.paid, interval) : null;
            return (
              <Grid item xs={12} sm={6} lg={3} key={plan.name}>
                <Card className={plan.featured ? 'pricing-card featured' : 'pricing-card'} sx={{ height: '100%' }}>
                  {plan.featured && <Box className="pricing-ribbon">RECOMMENDED</Box>}
                  <CardContent sx={{ p: 3, pt: plan.featured ? 5 : 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Typography fontWeight={900} fontSize={21}>{plan.name}</Typography>
                    <Typography color="text.secondary" fontSize={13} sx={{ minHeight: 58, mt: 1 }}>{plan.description}</Typography>
                    <Stack direction="row" alignItems="baseline" gap={.7} sx={{ mt: 2 }}>
                      <Typography fontSize={33} fontWeight={900}>{price ? formatMoney(price.unitAmount) : plan.name === 'Free' ? 'AED 0' : 'Custom'}</Typography>
                      <Typography color="text.secondary" fontSize={11}>{price ? `per ${interval}, plus tax` : plan.name === 'Free' ? 'Forever' : 'tailored to your scale'}</Typography>
                    </Stack>
                    <Typography fontSize={11} fontWeight={800} sx={{ minHeight: 17, color: '#18a677' }}>
                      {plan.paid && interval === 'year' ? `Save ${formatMoney(yearlySaving(PUBLIC_PRICES, plan.paid))} against paying monthly` : ''}
                    </Typography>
                    {plan.name === 'Enterprise' ? (
                      <Button variant="outlined" fullWidth onClick={() => setSales(true)} sx={{ mt: 2 }}>Contact sales</Button>
                    ) : (
                      // A paid plan goes to the Project's billing page with the choice in the URL. A visitor who is
                      // not signed in is sent to log in first and comes back to the same choice; payment itself
                      // only ever happens on Stripe Checkout, started from that page.
                      <Button variant={plan.featured ? 'contained' : 'outlined'} fullWidth href={plan.paid ? `/dashboard/billing/checkout?plan=${plan.paid}&interval=${interval}` : '/get-started'} sx={{ mt: 2 }}>
                        {plan.paid ? 'Start this plan' : 'Start for free'}
                      </Button>
                    )}
                    <Divider sx={{ my: 2.5 }} />
                    <Stack gap={1.3}>
                      {plan.features.map((feature) => (
                        <Stack direction="row" gap={1} key={feature}>
                          <CheckRounded sx={{ color: plan.featured ? '#ff633f' : '#7231c9', fontSize: 17 }} />
                          <Typography fontSize={12}>{feature}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
        <Box className="pricing-note" sx={{ mt: 4 }}>
          <LockRounded />
          <Box>
            <Typography fontWeight={800}>Billing is Project-level</Typography>
            <Typography color="text.secondary" fontSize={12}>Each Project has its own plan, usage, billing contact, invoices and payment method. Your Account can manage multiple Projects. Applicable VAT or tax is calculated at checkout from your billing location; payments are handled securely by Stripe.</Typography>
          </Box>
        </Box>
      </Container>
      <Dialog open={sales} onClose={() => setSales(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enterprise<IconButton onClick={() => setSales(false)} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={13}>Enterprise plans are arranged with our team: custom limits, permissions and support. Create your account and Project first, and we will set the plan up with you.</Typography>
          <Button variant="contained" size="large" href="/get-started" fullWidth sx={{ mt: 2 }}>Continue to create account</Button>
        </DialogContent>
      </Dialog>
    </SiteShell>
  );
}
