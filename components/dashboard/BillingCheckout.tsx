"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stripeAppearance as appearance, stripePromise } from "@/lib/stripe";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { ArrowBackRounded, CheckRounded, LockRounded, ShieldRounded } from "@mui/icons-material";
import { Alert, Box, Button, Card, Divider, Grid, MenuItem, Skeleton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { billingApi } from "@/lib/projects/api";
import { billingErrorMessage, canManageBilling, formatMoney, priceOf, yearlySaving } from "@/lib/billing";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import type { BillingInterval, CheckoutInput, CheckoutTotals, PaidPlan } from "@/types/project";

const plans: Record<PaidPlan, { label: string; description: string; features: string[] }> = {
  starter: { label: "Starter", description: "For growing teams sending their first campaigns.", features: ["5,000 reachable users", "20,000 emails / month", "Unlimited push notifications", "5 active journeys", "500 AI credits / month"] },
  pro: { label: "Pro", description: "For teams running serious retention programs.", features: ["10,000 reachable users", "Unlimited emails", "Unlimited push notifications", "20 active journeys", "2,000 AI credits / month"] },
};

// ISO 3166 country codes; the names come from the browser in the user's language.
const COUNTRY_CODES = "AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ES ET FI FJ FO FR GA GB GD GE GG GH GI GL GM GN GR GT GU GY HK HN HR HT HU ID IE IL IM IN IQ IS IT JE JM JO JP KE KG KH KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NZ OM PA PE PF PG PH PK PL PR PS PT PY QA RO RS RW SA SB SC SE SG SI SK SL SM SN SO SR ST SV SZ TC TD TG TH TJ TL TM TN TO TR TT TW TZ UA UG US UY UZ VC VE VG VN VU WS YE ZA ZM ZW".split(" ");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: regionNames.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
type AddressForm = { name: string; country: string; line1: string; line2: string; city: string; state: string; postalCode: string };

const sectionSx = { p: { xs: 2.5, md: 3 }, borderRadius: 2, border: "1px solid #ebe5f0", boxShadow: "0 14px 35px rgba(58,34,96,.06)" } as const;

/** /dashboard/billing/checkout?plan=pro&interval=month: PixlPush's own checkout for a first paid plan. */
export default function BillingCheckout() {
  const searchParams = useSearchParams();
  const plan: PaidPlan = searchParams.get("plan") === "starter" ? "starter" : "pro";
  const [interval, setInterval] = useState<BillingInterval>(searchParams.get("interval") === "year" ? "year" : "month");
  const { active } = useActiveProject();
  const projectId = active?.id;

  const pricesQuery = useQuery({ queryKey: ["projects", "billing", projectId, "prices"], queryFn: () => billingApi.prices(projectId!), enabled: Boolean(projectId) });
  const subscriptionQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "subscription"],
    queryFn: () => billingApi.subscription(projectId!),
    enabled: Boolean(projectId) && canManageBilling(active?.role),
  });
  const price = priceOf(pricesQuery.data ?? [], plan, interval);
  const current = subscriptionQuery.data?.subscription;
  const alreadyPaid = Boolean(current && current.plan !== "free" && current.status !== "incomplete");

  const back = (
    <Button href="/dashboard/billing" startIcon={<ArrowBackRounded />} sx={{ alignSelf: "flex-start", textTransform: "none", color: "#6b6378" }}>
      Back to billing
    </Button>
  );
  if (!canManageBilling(active?.role)) {
    return <Stack gap={2}>{back}<Alert severity="info" sx={{ borderRadius: 2 }}>Only owners, admins and billing members of this project can buy a plan.</Alert></Stack>;
  }
  if (alreadyPaid) {
    return <Stack gap={2}>{back}<Alert severity="info" sx={{ borderRadius: 2 }}>This project already has a subscription. Change the plan from the billing page.</Alert></Stack>;
  }
  if (!stripePromise) {
    return <Stack gap={2}>{back}<Alert severity="warning" sx={{ borderRadius: 2 }}>Payments are not available yet: the Stripe publishable key is not configured for this site.</Alert></Stack>;
  }

  return (
    <Stack gap={2}>
      {back}
      {/* Deferred intent: the form renders before anything exists in Stripe; the subscription is only created on Pay. */}
      <Elements
        key={`${projectId}-${plan}-${interval}`}
        stripe={stripePromise}
        options={{ mode: "subscription", amount: price.unitAmount, currency: price.currency, appearance }}
      >
        <CheckoutForm projectId={projectId!} plan={plan} interval={interval} onInterval={setInterval} unitAmount={price.unitAmount} currency={price.currency} saving={yearlySaving(pricesQuery.data ?? [], plan)} />
      </Elements>
    </Stack>
  );
}

function CheckoutForm({ projectId, plan, interval, onInterval, unitAmount, currency, saving }: {
  projectId: string; plan: PaidPlan; interval: BillingInterval; onInterval: (value: BillingInterval) => void;
  unitAmount: number; currency: string; saving: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const queryClient = useQueryClient();
  // The billing address is not card data, so it is a normal form; only the card goes into a Stripe Element.
  const [form, setForm] = useState<AddressForm>({ name: "", country: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const address: CheckoutInput["address"] | null = useMemo(() => form.name.trim() && form.country && form.line1.trim()
    ? { name: form.name.trim(), country: form.country, line1: form.line1.trim(), line2: form.line2.trim() || undefined, city: form.city.trim() || undefined, state: form.state.trim() || undefined, postalCode: form.postalCode.trim() || undefined }
    : null, [form]);
  const field = (key: keyof AddressForm) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value })) });
  const [totals, setTotals] = useState<CheckoutTotals | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A failed tax calculation blocks payment until the address is corrected.
  const [taxError, setTaxError] = useState<string | null>(null);
  const [ready, setReady] = useState({ payment: false });
  const previewId = useRef(0);
  const info = plans[plan];

  // Tax depends on the address, so the total is recalculated by Stripe (through the backend) whenever it changes.
  const addressKey = useMemo(() => JSON.stringify(address), [address]);
  useEffect(() => {
    if (!address) { setTotals(null); return; }
    const id = ++previewId.current;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      billingApi.previewCheckout(projectId, { plan, interval, address })
        .then((next) => { if (id === previewId.current) { setTotals(next); setTaxError(null); elements?.update({ amount: next.total }); } })
        .catch((failure) => { if (id === previewId.current) { setTotals(null); setTaxError(billingErrorMessage(failure, "We could not calculate tax for this address. Check the country and postal code.")); } })
        .finally(() => { if (id === previewId.current) setPreviewing(false); });
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressKey, plan, interval, projectId]);

  const pay = async () => {
    if (!stripe || !elements || !address || paying) return;
    setPaying(true);
    setError(null);
    try {
      // 1. Stripe checks the card form first, so nothing is created for an incomplete form.
      const { error: formError } = await elements.submit();
      if (formError) { setError(formError.message ?? "Check your payment details."); return; }
      // 2. The backend creates the unpaid subscription at the approved price and returns its payment's secret.
      let clientSecret: string;
      try {
        ({ clientSecret } = await billingApi.createCheckoutSubscription(projectId, { plan, interval, address }));
      } catch (failure) {
        setError(billingErrorMessage(failure, "We could not start the payment right now. Please try again."));
        return;
      }
      // 3. Stripe confirms the payment in the browser, including 3D Secure when the bank asks for it.
      const returnUrl = `${window.location.origin}/dashboard/billing?checkout=success`;
      const { error: payError } = await stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
      if (payError) {
        // Card and validation messages come from Stripe for the customer (e.g. "Your card was declined.").
        setError(payError.type === "card_error" || payError.type === "validation_error" ? payError.message ?? "Your payment was not completed." : "Your payment was not completed. Please try again.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["projects", "billing", projectId] });
      // The plan itself is granted by Stripe's webhook; the billing page waits for the backend to confirm it.
      router.replace("/dashboard/billing?checkout=success");
    } finally {
      setPaying(false);
    }
  };

  const canPay = Boolean(stripe && elements && address && ready.payment && !paying && !previewing && !taxError);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.35fr) minmax(320px,.85fr)" }, gap: 2.5, alignItems: "start" }}>
      <Stack gap={2.5}>
        <Card sx={sectionSx}>
          <Typography fontSize={20} fontWeight={600}>Billing information</Typography>
          <Typography color="text.secondary" fontSize={12} sx={{ mb: 2 }}>Tax is calculated from this address. Use your company&apos;s own billing address.</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth size="small" label="Full name or company" placeholder="e.g. Acme Trading LLC" required {...field("name")} /></Grid>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="Country or region" required {...field("country")} SelectProps={{ displayEmpty: true, renderValue: (value) => (value ? regionNames.of(value as string) : <span style={{ color: "#9a90ad" }}>Select your country</span>) }} InputLabelProps={{ shrink: true }}>
                {COUNTRIES.map(({ code, name }) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address line 1" placeholder="Street address, building" required {...field("line1")} /></Grid>
            <Grid item xs={12}><TextField fullWidth size="small" label="Address line 2" placeholder="Apartment, suite, floor (optional)" {...field("line2")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="City" placeholder="e.g. Dubai" {...field("city")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="State / region" placeholder="Optional" {...field("state")} /></Grid>
            <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Postal code" placeholder="e.g. 10115" {...field("postalCode")} /></Grid>
          </Grid>
        </Card>
        <Card sx={sectionSx}>
          <Typography fontSize={20} fontWeight={600}>Payment method</Typography>
          <Typography color="text.secondary" fontSize={12} sx={{ mb: 2 }}>Card details are sent directly to Stripe and never stored by PixlPush.</Typography>
          {!ready.payment && <Skeleton variant="rounded" height={160} />}
          <PaymentElement options={{ layout: "tabs" }} onReady={() => setReady((r) => ({ ...r, payment: true }))} />
        </Card>
      </Stack>

      <Card sx={{ ...sectionSx, position: { lg: "sticky" }, top: { lg: 96 } }}>
        <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>ORDER SUMMARY</Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 1 }}>
          <Typography fontSize={24} fontWeight={600}>PixlPush {info.label}</Typography>
          <Typography fontWeight={600} fontSize={16}>{formatMoney(unitAmount, currency)}<Typography component="span" fontSize={12} color="text.secondary"> / {interval}</Typography></Typography>
        </Stack>
        <Typography color="text.secondary" fontSize={12}>{info.description}</Typography>
        <ToggleButtonGroup exclusive fullWidth size="small" value={interval} disabled={paying} onChange={(_, value: BillingInterval | null) => value && onInterval(value)} aria-label="Billing interval" sx={{ mt: 2 }}>
          <ToggleButton value="month">Monthly</ToggleButton>
          <ToggleButton value="year">Yearly · 2 months free</ToggleButton>
        </ToggleButtonGroup>
        {interval === "year" && <Typography fontSize={12} fontWeight={500} sx={{ mt: 1, color: "#18a677" }}>You save {formatMoney(saving, currency)} against paying monthly.</Typography>}
        <Stack gap={0.75} sx={{ mt: 2 }}>
          {info.features.map((feature) => (
            <Stack direction="row" gap={1} alignItems="center" key={feature}><CheckRounded sx={{ fontSize: 16, color: "#5517B8" }} /><Typography fontSize={12}>{feature}</Typography></Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Stack gap={1}>
          <Row label="Subtotal" value={formatMoney(totals?.subtotal ?? unitAmount, currency)} />
          {Boolean(totals?.discount) && <Row label="Discount" value={`− ${formatMoney(totals!.discount, currency)}`} />}
          <Row label="Tax" value={previewing ? "Calculating…" : totals ? formatMoney(totals.tax ?? 0, currency) : "Added after you enter your address"} muted={!totals} />
          <Divider />
          <Row label="Total due today" value={totals ? formatMoney(totals.total, currency) : "—"} strong />
          <Typography color="text.secondary" fontSize={11}>Then {totals ? formatMoney(totals.total, currency) : formatMoney(unitAmount, currency) + " plus tax"} every {interval} until you cancel. Cancel any time; access runs to the end of the paid period.</Typography>
        </Stack>
        {(taxError || error) && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{taxError ?? error}</Alert>}
        <Button variant="contained" fullWidth size="large" startIcon={<LockRounded />} disabled={!canPay} onClick={pay} sx={{ mt: 2, textTransform: "none", borderRadius: 1.5 }}>
          {paying ? "Processing payment…" : totals ? `Pay ${formatMoney(totals.total, currency)}` : "Pay securely"}
        </Button>
        <Stack direction="row" gap={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
          <ShieldRounded sx={{ fontSize: 16, color: "#8e8798" }} />
          <Typography color="text.secondary" fontSize={11}>Secured by Stripe. Prices in AED, tax calculated by Stripe Tax.</Typography>
        </Stack>
      </Card>
    </Box>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography fontSize={strong ? 14 : 13} fontWeight={strong ? 600 : 600}>{label}</Typography>
      <Typography fontSize={strong ? 16 : 13} fontWeight={strong ? 600 : 600} color={muted ? "text.secondary" : undefined} sx={{ textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}
