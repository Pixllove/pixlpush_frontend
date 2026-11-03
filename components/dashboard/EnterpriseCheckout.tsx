"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CheckCircleRounded, CheckRounded, LinkOffRounded, LockRounded, ShieldRounded } from "@mui/icons-material";
import { Alert, Box, Button, Card, CircularProgress, Divider, Grid, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { stripeAppearance as appearance, stripeFonts as fonts, stripePromise } from "@/lib/stripe";
import { formatMoney } from "@/lib/billing";
import { COUNTRIES, regionNames } from "@/components/dashboard/BillingCheckout";
import { authApi } from "@/lib/auth/api";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

type LinkState = "open" | "paid" | "expired" | "revoked" | "replaced" | "unavailable";
type Offer = {
  state: LinkState;
  invoiceNumber: string;
  issuedAt: string;
  expiresAt: string;
  project: { id: string; name: string; logoUrl: string | null };
  billedTo: { name: string | null; email: string };
  offer: { name: string; description: string | null; price: { amount: string; currency: string; interval: "month" | "year" } | null; features: { key: string; label: string; value: string }[] } | null;
};
type Totals = { currency: string; subtotal: number; tax: number | null; discount: number; total: number };
type Address = { name: string; country: string; line1: string; line2?: string; city?: string; state?: string; postalCode?: string };
type AddressForm = { name: string; country: string; line1: string; line2: string; city: string; state: string; postalCode: string };

class OfferError extends Error {
  constructor(message: string, readonly code?: string, readonly status?: number, readonly details?: { projectName?: string }) { super(message); }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => null) as { data?: T; error?: { code?: string; message?: string; details?: { projectName?: string } } } | null;
  // The session ran out: sign in again and come straight back to this offer.
  if (response.status === 401) { window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`); throw new OfferError("Please sign in again."); }
  if (!response.ok || json?.data === undefined) throw new OfferError(json?.error?.message ?? "Something went wrong. Please try again.", json?.error?.code, response.status, json?.error?.details);
  return json.data;
}

const sectionSx = { p: { xs: 2.5, md: 3 }, borderRadius: 2, border: "1px solid #ebe5f0", boxShadow: "0 14px 35px rgba(58,34,96,.06)" } as const;
const dateOf = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const minor = (amount: string) => Math.round(Number(amount) * 100);

/** /dashboard/billing/enterprise?token=…: pays the Enterprise offer emailed to a project owner, signed in. */
export default function EnterpriseCheckout() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const returned = params.get("paid") === "1";
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState<OfferError | null>(null);
  const [paid, setPaid] = useState(returned);

  useEffect(() => {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { setError(new OfferError("This payment link is not valid.")); return; }
    call<Offer>(`/api/enterprise-offers/${token}`).then(setOffer).catch((e: OfferError) => setError(e));
  }, [token]);

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto" }}>
      {error?.code === "OFFER_WRONG_ACCOUNT" ? <WrongAccount projectName={error.details?.projectName} />
        : error ? <Closed title="This link can't be used" message={error.message} />
        : !offer ? <Skeleton variant="rounded" height={420} />
        : paid || offer.state === "paid" ? <ThankYou token={token} offer={offer} waitForActivation={offer.state !== "paid"} />
        : offer.state !== "open" || !offer.offer?.price ? <Closed title={closedTitle(offer.state)} message={closedMessage(offer.state)} />
        : !stripePromise ? <Alert severity="warning">Payments are not available right now. Please contact PixlPush.</Alert>
        : (
          <Elements stripe={stripePromise} options={{ mode: "subscription", amount: minor(offer.offer.price.amount), currency: offer.offer.price.currency, appearance, fonts }}>
            <PayForm token={token} offer={offer} onPaid={() => setPaid(true)} />
          </Elements>
        )}
    </Box>
  );
}

/** Signed in, but not as an owner, admin or billing member of the offer's project. */
function WrongAccount({ projectName }: { projectName?: string }) {
  const { data: user } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const switchAccount = async () => {
    setBusy(true);
    await authApi.logout().catch(() => undefined);
    window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  };
  return (
    <Card sx={{ ...sectionSx, maxWidth: 560, mx: "auto", textAlign: "center", p: { xs: 3, md: 5 } }}>
      <LinkOffRounded sx={{ fontSize: 44, color: "#8e8798" }} />
      <Typography fontSize="var(--fs-24)" fontWeight={600} sx={{ mt: 1.5 }}>Sign in with the project owner&apos;s account</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        This Enterprise offer is for <strong>{projectName ?? "another project"}</strong>{user?.account.email ? <>, but you&apos;re signed in as <strong>{user.account.email}</strong></> : null}. Sign in with the account the offer was sent to, or ask the project owner to add you as a billing member.
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} justifyContent="center" sx={{ mt: 3 }}>
        <Button variant="contained" disabled={busy} onClick={switchAccount} sx={{ textTransform: "none" }}>{busy ? "Signing out…" : "Sign in with another account"}</Button>
        <Button href="/dashboard" variant="outlined" sx={{ textTransform: "none" }}>Go to dashboard</Button>
      </Stack>
    </Card>
  );
}

const closedTitle = (state: LinkState) => state === "expired" ? "This link has expired" : state === "unavailable" ? "This project is not active" : "This link is no longer valid";
const closedMessage = (state: LinkState) => state === "unavailable"
  ? "Payments can't be made for this project right now. Please contact PixlPush support."
  : "A newer offer may have been sent to you, or this one was withdrawn. Ask your PixlPush contact to send a new link.";

function Closed({ title, message }: { title: string; message: string }) {
  return (
    <Card sx={{ ...sectionSx, maxWidth: 520, mx: "auto", textAlign: "center", p: 5 }}>
      <LinkOffRounded sx={{ fontSize: 44, color: "#8e8798" }} />
      <Typography fontSize="var(--fs-24)" fontWeight={600} sx={{ mt: 1.5 }}>{title}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>{message}</Typography>
      <Button href="/contact-sales" variant="outlined" sx={{ mt: 3, textTransform: "none" }}>Contact PixlPush</Button>
    </Card>
  );
}

/** Shown after payment. Enterprise is switched on by Stripe's webhook, so the page waits briefly for it. */
function ThankYou({ token, offer, waitForActivation }: { token: string; offer: Offer; waitForActivation: boolean }) {
  const [active, setActive] = useState(!waitForActivation);
  useEffect(() => {
    if (active) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      // Asks the backend to re-read the payment from Stripe, so activation does not wait on the webhook.
      call<{ state: LinkState }>(`/api/enterprise-offers/${token}/confirm`, {}).then((next) => { if (next.state === "paid") setActive(true); }).catch(() => undefined);
      if (tries >= 15) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [active, token]);

  return (
    <Card sx={{ ...sectionSx, maxWidth: 560, mx: "auto", textAlign: "center", p: { xs: 3, md: 5 } }}>
      <CheckCircleRounded sx={{ fontSize: 56, color: "#18a677" }} />
      <Typography fontSize="var(--fs-28, 28px)" fontWeight={600} sx={{ mt: 1.5 }}>Thank you for your payment</Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {active
          ? <>Enterprise is now active for <strong>{offer.project.name}</strong>.</>
          : <>Your payment went through. We&apos;re activating Enterprise for <strong>{offer.project.name}</strong>; this takes a few seconds.</>}
      </Typography>
      {!active && <CircularProgress size={22} sx={{ mt: 2 }} />}
      <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 2 }}>A receipt is sent to your billing email. Invoices are available in Billing in your dashboard.</Typography>
      <Button href={`/dashboard/billing?project=${encodeURIComponent(offer.project.id)}`} variant="contained" size="large" sx={{ mt: 3, textTransform: "none", borderRadius: 1.5 }}>View billing</Button>
    </Card>
  );
}

function PayForm({ token, offer, onPaid }: { token: string; offer: Offer; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const price = offer.offer!.price!;
  const unitAmount = minor(price.amount);
  const [form, setForm] = useState<AddressForm>({ name: "", country: "", line1: "", line2: "", city: "", state: "", postalCode: "" });
  const address: Address | null = useMemo(() => form.name.trim() && form.country && form.line1.trim()
    ? { name: form.name.trim(), country: form.country, line1: form.line1.trim(), line2: form.line2.trim() || undefined, city: form.city.trim() || undefined, state: form.state.trim() || undefined, postalCode: form.postalCode.trim() || undefined }
    : null, [form]);
  const field = (key: keyof AddressForm) => ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value })) });
  const [totals, setTotals] = useState<Totals | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const previewId = useRef(0);

  // Tax follows the address, so Stripe recalculates the total whenever it changes.
  const addressKey = useMemo(() => JSON.stringify(address), [address]);
  useEffect(() => {
    if (!address) { setTotals(null); return; }
    const id = ++previewId.current;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      call<Totals>(`/api/enterprise-offers/${token}/preview`, { address })
        .then((next) => { if (id === previewId.current) { setTotals(next); setTaxError(null); elements?.update({ amount: next.total }); } })
        .catch((failure: Error) => { if (id === previewId.current) { setTotals(null); setTaxError(failure instanceof OfferError && failure.status === 409 ? failure.message : "We could not calculate tax for this address. Check the country and postal code."); } })
        .finally(() => { if (id === previewId.current) setPreviewing(false); });
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressKey, token]);

  const pay = async () => {
    if (!stripe || !elements || !address || paying) return;
    setPaying(true);
    setError(null);
    try {
      const { error: formError } = await elements.submit();
      if (formError) { setError(formError.message ?? "Check your payment details."); return; }
      let clientSecret: string;
      try {
        ({ clientSecret } = await call<{ clientSecret: string }>(`/api/enterprise-offers/${token}/subscribe`, { address }));
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "We could not start the payment. Please try again.");
        return;
      }
      // 3D Secure may redirect away; Stripe brings the browser back to this page with paid=1.
      const returnUrl = `${window.location.origin}/dashboard/billing/enterprise?token=${encodeURIComponent(token)}&project=${encodeURIComponent(offer.project.id)}&paid=1`;
      const { error: payError } = await stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: returnUrl }, redirect: "if_required" });
      if (payError) {
        setError(payError.type === "card_error" || payError.type === "validation_error" ? payError.message ?? "Your payment was not completed." : "Your payment was not completed. Please try again.");
        return;
      }
      onPaid();
    } finally {
      setPaying(false);
    }
  };

  const canPay = Boolean(stripe && elements && address && ready && !paying && !previewing && !taxError);
  const currency = price.currency;
  const { offer: plan } = offer;

  return (
    <Stack gap={3}>
      <Box>
        <Typography fontSize="var(--fs-32, 32px)" fontWeight={600}>Complete your Enterprise plan</Typography>
        <Typography color="text.secondary">For <strong>{offer.project.name}</strong> · Offer {offer.invoiceNumber} · valid until {dateOf(offer.expiresAt)}</Typography>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1.35fr) minmax(320px,.85fr)" }, gap: 2.5, alignItems: "start" }}>
        <Stack gap={2.5}>
          <Card sx={sectionSx}>
            <Typography fontSize="var(--fs-20)" fontWeight={600}>Billing information</Typography>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mb: 2 }}>Tax is calculated from this address. Use your company&apos;s billing address.</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}><TextField fullWidth size="small" label="Full name or company" placeholder="e.g. Acme Trading LLC" required {...field("name")} /></Grid>
              <Grid item xs={12}>
                <TextField select fullWidth size="small" label="Country or region" required {...field("country")} SelectProps={{ displayEmpty: true, renderValue: (value) => (value ? regionNames.of(value as string) : <span style={{ color: "#9a90ad" }}>Select your country</span>) }} InputLabelProps={{ shrink: true }}>
                  {COUNTRIES.map(({ code, name }) => <MenuItem key={code} value={code}>{name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Address line 1" placeholder="Street address, building" required {...field("line1")} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Address line 2" placeholder="Apartment, suite, floor (optional)" {...field("line2")} /></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="City" {...field("city")} /></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="State / region" placeholder="Optional" {...field("state")} /></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth size="small" label="Postal code" {...field("postalCode")} /></Grid>
            </Grid>
          </Card>
          <Card sx={sectionSx}>
            <Typography fontSize="var(--fs-20)" fontWeight={600}>Payment method</Typography>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mb: 2 }}>Card details go directly to Stripe and are never stored by PixlPush.</Typography>
            {!ready && <Skeleton variant="rounded" height={160} />}
            <PaymentElement options={{ layout: "tabs" }} onReady={() => setReady(true)} />
          </Card>
        </Stack>

        <Card sx={{ ...sectionSx, position: { lg: "sticky" }, top: { lg: 96 } }}>
          <Typography color="text.secondary" fontSize="var(--fs-13)" fontWeight={600}>Order summary</Typography>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={2} sx={{ mt: 1 }}>
            <Typography fontSize="var(--fs-24)" fontWeight={600}>{plan!.name}</Typography>
            <Typography fontWeight={600} fontSize="var(--fs-16)" sx={{ whiteSpace: "nowrap" }}>{formatMoney(unitAmount, currency)}<Typography component="span" fontSize="var(--fs-12)" color="text.secondary"> / {price.interval}</Typography></Typography>
          </Stack>
          {plan!.description && <Typography color="text.secondary" fontSize="var(--fs-12)">{plan!.description}</Typography>}
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mt: 1 }}>Billed to {offer.billedTo.name ?? offer.billedTo.email} · {offer.billedTo.email}</Typography>
          <Stack gap={0.75} sx={{ mt: 2 }}>
            {plan!.features.map((f) => (
              <Stack direction="row" gap={1} alignItems="center" key={f.key}>
                <CheckRounded sx={{ fontSize: 16, color: "#5517B8" }} />
                <Typography fontSize="var(--fs-12)" sx={{ flex: 1 }}>{f.label}</Typography>
                <Typography fontSize="var(--fs-12)" fontWeight={600}>{f.value}</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack gap={1}>
            <Row label="Subtotal" value={formatMoney(totals?.subtotal ?? unitAmount, currency)} />
            {Boolean(totals?.discount) && <Row label="Discount" value={`− ${formatMoney(totals!.discount, currency)}`} />}
            <Row label="Tax" value={previewing ? "Calculating…" : totals ? formatMoney(totals.tax ?? 0, currency) : "Added after you enter your address"} muted={!totals} />
            <Divider />
            <Row label="Total due today" value={totals ? formatMoney(totals.total, currency) : "—"} strong />
            <Typography color="text.secondary" fontSize="var(--fs-12)">Then {totals ? formatMoney(totals.total, currency) : `${formatMoney(unitAmount, currency)} plus tax`} every {price.interval} until cancelled.</Typography>
          </Stack>
          {(taxError || error) && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>{taxError ?? error}</Alert>}
          <Button variant="contained" fullWidth size="large" startIcon={<LockRounded />} disabled={!canPay} onClick={pay} sx={{ mt: 2, textTransform: "none", borderRadius: 1.5 }}>
            {paying ? "Processing payment…" : totals ? `Pay ${formatMoney(totals.total, currency)}` : "Pay securely"}
          </Button>
          <Stack direction="row" gap={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
            <ShieldRounded sx={{ fontSize: 16, color: "#8e8798" }} />
            <Typography color="text.secondary" fontSize="var(--fs-12)">Secured by Stripe. Tax calculated by Stripe Tax.</Typography>
          </Stack>
        </Card>
      </Box>
    </Stack>
  );
}

function Row({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2}>
      <Typography fontSize={strong ? "var(--fs-14)" : "var(--fs-13)"} fontWeight={600}>{label}</Typography>
      <Typography fontSize={strong ? "var(--fs-16)" : "var(--fs-13)"} fontWeight={600} color={muted ? "text.secondary" : undefined} sx={{ textAlign: "right" }}>{value}</Typography>
    </Stack>
  );
}
