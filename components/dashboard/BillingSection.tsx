"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AccountBalanceWalletRounded,
  AutoGraphRounded,
  CheckCircleRounded,
  CreditCardRounded,
  EmailRounded,
  InsightsRounded,
  PeopleAltRounded,
  ReceiptLongRounded,
  SendRounded,
  ShieldRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  LinearProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tab,
  Tabs,
} from "@mui/material";
import { billingApi, projectKeys } from "@/lib/projects/api";
import {
  billingErrorMessage,
  billingState,
  canCancelBilling,
  canManageBilling,
  formatBillingDate,
  formatMoney,
  isSettling,
  priceOf,
  yearlySaving,
} from "@/lib/billing";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { stripePromise } from "@/lib/stripe";
import UpdatePaymentMethodDialog from "./UpdatePaymentMethodDialog";
import SavedCards from "./SavedCards";
import type { BillingContact, BillingInterval, PaidPlan, PlanName } from "@/types/project";

type BillingTab = "overview" | "history" | "methods" | "profile";

const planCopy: Record<PlanName, { label: string; description: string }> = {
  free: { label: "Free", description: "For exploring PixlPush with a lightweight setup." },
  starter: { label: "Starter", description: "For growing teams sending their first campaigns." },
  pro: { label: "Pro", description: "For teams running serious retention programs." },
  enterprise: { label: "Enterprise", description: "Flexible limits, support, and controls for larger teams." },
};
const paidPlans: PaidPlan[] = ["starter", "pro"];
const planRank: Record<PlanName, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 };
const toneColor = { success: "#a6f2b4", info: "#bcd7ff", warning: "#ffd98a", error: "#ffb0b8" } as const;
/** How many times a state that Stripe is still settling is re-read (every 3 s) before the page stops asking. */
const MAX_POLLS = 20;

const number = (value: number) => value.toLocaleString("en-US");

export function BillingSection() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const canManage = canManageBilling(active?.role);
  const canCancel = canCancelBilling(active?.role);
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Stripe sends the browser back with ?checkout=…; the pricing page sends ?plan=…&interval=….
  const checkout = searchParams.get("checkout");
  const wantedPlan = paidPlans.find((plan) => plan === searchParams.get("plan"));

  const [tab, setTab] = useState<BillingTab>("overview");
  const [interval, setInterval] = useState<BillingInterval>(searchParams.get("interval") === "year" ? "year" : "month");
  // One action at a time: a second click cannot open a second Checkout Session.
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cardSecret, setCardSecret] = useState<string | null>(null);
  const [change, setChange] = useState<{ plan: PaidPlan; interval: BillingInterval; upgrade: boolean } | null>(null);
  const [profile, setProfile] = useState<BillingContact>({ email: "" });
  const [profileError, setProfileError] = useState<string | null>(null);
  const polls = useRef(0);
  const plansRef = useRef<HTMLDivElement>(null);

  // Every key carries the project id, so one Project's billing is never shown inside another.
  const subscriptionQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "subscription"],
    queryFn: () => billingApi.subscription(projectId!),
    enabled: Boolean(projectId) && canManage,
    // The Stripe redirect proves nothing: the plan changes when the webhook reaches the backend. So the
    // subscription is re-read for a while after a checkout, and while a payment is still settling.
    refetchInterval: (query) => {
      const subscription = query.state.data?.subscription ?? null;
      const waiting = isSettling(subscription) || (checkout === "success" && (subscription?.plan ?? "free") === "free");
      if (!waiting || polls.current >= MAX_POLLS) return false;
      polls.current += 1;
      return 3000;
    },
  });
  const usageQuery = useQuery({
    queryKey: ["projects", projectId, "usage"],
    queryFn: () => billingApi.usage(projectId!),
    enabled: Boolean(projectId),
  });
  const pricesQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "prices"],
    queryFn: () => billingApi.prices(projectId!),
    enabled: Boolean(projectId),
  });
  const plansQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "plans"],
    queryFn: () => billingApi.plans(projectId!),
    enabled: Boolean(projectId),
  });
  const paymentMethodQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "payment-method"],
    queryFn: () => billingApi.paymentMethod(projectId!),
    enabled: Boolean(projectId) && canManage && tab === "overview",
  });
  const invoicesQuery = useQuery({
    queryKey: ["projects", "billing", projectId, "invoices"],
    queryFn: () => billingApi.invoices(projectId!),
    enabled: Boolean(projectId) && canManage && tab === "history",
  });

  useEffect(() => { polls.current = 0; setError(null); setNotice(null); setBusy(null); }, [projectId]);
  useEffect(() => { setProfile(subscriptionQuery.data?.billingContact ?? { email: "" }); }, [subscriptionQuery.data]);
  useEffect(() => { if (wantedPlan) plansRef.current?.scrollIntoView?.({ block: "center" }); }, [wantedPlan]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["projects", "billing", projectId, "subscription"] }),
    queryClient.invalidateQueries({ queryKey: ["projects", "billing", projectId, "invoices"] }),
    queryClient.invalidateQueries({ queryKey: ["projects", "billing", projectId, "payment-method"] }),
    queryClient.invalidateQueries({ queryKey: ["projects", "billing", projectId, "payment-methods"] }),
    queryClient.invalidateQueries({ queryKey: ["projects", projectId] }),
    queryClient.invalidateQueries({ queryKey: ["projects", projectId, "usage"] }),
    // where the plan badge in the project selector and the project's own page read from
    queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
    queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId ?? "") }),
  ]);

  const subscription = subscriptionQuery.data?.subscription ?? null;
  const currentPlan: PlanName = subscription?.plan ?? usageQuery.data?.plan ?? active?.subscription?.plan ?? "free";
  const plan = planCopy[currentPlan];
  const state = billingState(subscription);
  const prices = pricesQuery.data ?? [];
  // A Stripe subscription that is still running: plans are changed on it, never bought a second time.
  const subscribed = Boolean(subscription && subscription.plan !== "free" && subscription.plan !== "enterprise");
  const hasBillingAccount = Boolean(subscription?.stripeStatus);
  const currentInterval = subscription?.billingInterval ?? "month";

  const scrollToPlans = () => plansRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" });

  /** Opens the in-app card dialog with a fresh SetupIntent. */
  const updateCard = async () => {
    if (busy || !projectId) return;
    setBusy("card");
    setError(null);
    try {
      setCardSecret((await billingApi.setupPaymentMethod(projectId)).clientSecret);
    } catch (failure) {
      setError(billingErrorMessage(failure, "We could not open the card form right now. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  /** A renewal or upgrade the bank wants authenticated: Stripe shows its 3D Secure step here, in the app. */
  const completePayment = async () => {
    if (busy || !projectId) return;
    setBusy("authenticate");
    setError(null);
    try {
      const stripe = stripePromise && (await stripePromise);
      if (!stripe) throw { code: "BILLING_NOT_CONFIGURED" };
      const { clientSecret } = await billingApi.confirmOpenPayment(projectId);
      const { error: actionError } = await stripe.handleNextAction({ clientSecret });
      if (actionError) setError(actionError.message ?? "The payment was not completed. Try again or update your card.");
      else { polls.current = 0; setNotice("Payment completed. Your subscription will update in a moment."); }
      await refresh();
    } catch (failure) {
      setError(billingErrorMessage(failure, "We could not open the payment confirmation. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  // A first plan is bought on PixlPush's own checkout page; nothing is created until the user pays there.
  const startCheckout = (chosen: PaidPlan) => router.push(`/dashboard/billing/checkout?plan=${chosen}&interval=${interval}`);

  /** A backend call that changes the subscription, then re-reads what the backend now says. */
  const run = async (key: string, request: () => Promise<unknown>, done: string) => {
    if (busy || !projectId) return;
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await request();
      await refresh();
      setNotice(done);
    } catch (failure) {
      setError(billingErrorMessage(failure));
    } finally {
      setBusy(null);
    }
  };

  const choosePlan = (chosen: PaidPlan) => {
    if (!subscribed) return startCheckout(chosen);
    const upgrade = planRank[chosen] > planRank[currentPlan] || (chosen === currentPlan && interval === "year");
    setChange({ plan: chosen, interval, upgrade });
  };

  const saveProfile = useMutation({
    mutationFn: (input: BillingContact) => billingApi.updateContact(projectId!, input),
    onSuccess: async (saved) => {
      await refresh();
      setNotice(saved.taxIdSent === false && saved.vatId
        ? "Billing details saved. Your VAT / tax id is kept here but could not be added to Stripe invoices for this country."
        : "Billing details saved. Future invoices will use them.");
    },
    onError: (failure) => setProfileError(billingErrorMessage(failure, "We could not save your billing details. Please try again.")),
  });
  const submitProfile = () => {
    setProfileError(null);
    setNotice(null);
    const country = (profile.country ?? "").trim().toUpperCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) return setProfileError("Enter a valid billing email.");
    if (country && !/^[A-Z]{2}$/.test(country)) return setProfileError("Use the two-letter country code, for example AE, DE, GB or US.");
    saveProfile.mutate({ ...profile, email: profile.email.trim(), country: country || null });
  };

  const usage = usageQuery.data;
  const usageRows = usage ? [
    { label: "Reachable users", value: usage.usage.reachable_users, limit: usage.limits.reachableUsers, over: usage.overLimit.reachableUsers, icon: PeopleAltRounded, color: "#f0445d" },
    { label: "Email sends", value: usage.usage.email_sends, limit: usage.limits.emailSendsPerMonth, over: usage.overLimit.emailSends, icon: EmailRounded, color: "#db3291" },
    { label: "Push sends", value: usage.usage.push_sends, limit: usage.limits.pushSendsPerMonth, over: usage.overLimit.pushSends, icon: SendRounded, color: "#7a3be0" },
    { label: "Active journeys", value: usage.usage.active_journeys, limit: usage.limits.activeJourneys, over: usage.overLimit.activeJourneys, icon: AutoGraphRounded, color: "#18a677" },
    { label: "AI credits", value: usage.usage.ai_credits, limit: usage.limits.aiCreditsPerMonth, over: false, icon: InsightsRounded, color: "#ee9c35" },
  ] : [];
  const overCount = usageRows.filter((row) => row.over).length;

  const profileFields = [
    ["name", "Billing name"],
    ["company", "Company"],
    ["email", "Billing email"],
    ["addressLine1", "Address line 1"],
    ["addressLine2", "Address line 2"],
    ["city", "City"],
    ["state", "State / province"],
    ["postalCode", "Postal code"],
    ["country", "Country code"],
    ["vatId", "VAT / tax ID"],
  ] as const;

  const managersOnly = (
    <Alert severity="info" sx={{ borderRadius: 2 }}>
      Only owners, admins and billing members of this project can view and manage billing.
    </Alert>
  );


  // What the checkout return shows comes from the backend's state, never from the redirect itself.
  const checkoutBanner = checkout === "cancelled"
    ? { severity: "info" as const, text: "Checkout was cancelled. No payment was taken." }
    : checkout !== "success" || !canManage ? null
    : subscribed && !isSettling(subscription) ? { severity: "success" as const, text: `Payment confirmed. Your ${plan.label} plan is active.` }
    : subscription?.billingProblem ? null // the state message below explains the failure
    : polls.current < MAX_POLLS ? { severity: "info" as const, text: "Payment processing. Your plan will update here as soon as Stripe confirms the payment." }
    : { severity: "warning" as const, text: "Your payment is still being confirmed. Refresh this page in a minute, or open the billing portal to check it." };

  return (
    <Stack gap={2.5}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        {[
          { id: "overview" as BillingTab, label: "Overview", icon: InsightsRounded },
          { id: "history" as BillingTab, label: "Billing history", icon: ReceiptLongRounded },
          { id: "methods" as BillingTab, label: "Payment methods", icon: CreditCardRounded },
          { id: "profile" as BillingTab, label: "Billing details", icon: AccountBalanceWalletRounded },
        ].map(({ id, label, icon: Icon }) => (
          <Tab key={id} value={id} icon={<Icon />} iconPosition="start" label={label} />
        ))}
      </Tabs>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)} sx={{ borderRadius: 2 }}>{notice}</Alert>}

      {tab === "overview" && (
        <Stack gap={2.5}>
          {checkoutBanner && <Alert severity={checkoutBanner.severity} sx={{ borderRadius: 2 }}>{checkoutBanner.text}</Alert>}
          {canManage && state.message && state.label !== "Active" && (
            <Alert
              severity={state.tone}
              sx={{ borderRadius: 2 }}
              action={!hasBillingAccount || state.tone === "info" || subscription?.status === "cancel_at_period_end" ? undefined
                : subscription?.billingProblem === "payment_action_required" ? <Button color="inherit" size="small" disabled={Boolean(busy)} onClick={completePayment} sx={{ textTransform: "none" }}>{busy === "authenticate" ? "Opening…" : "Complete payment"}</Button>
                : subscription?.billingProblem === "tax_location_missing" ? <Button color="inherit" size="small" onClick={() => setTab("profile")} sx={{ textTransform: "none" }}>Edit billing details</Button>
                : <Button color="inherit" size="small" disabled={Boolean(busy)} onClick={updateCard} sx={{ textTransform: "none" }}>Update payment method</Button>}
            >
              {state.message}
            </Alert>
          )}
          {canManage && subscription?.pendingPlan && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Your plan will change to {planCopy[subscription.pendingPlan].label}{subscription.pendingInterval ? ` (${subscription.pendingInterval}ly)` : ""} on {formatBillingDate(subscription.currentPeriodEnd)}. Your current plan remains active until then.
            </Alert>
          )}
          <Card
            sx={{
              overflow: "hidden",
              borderRadius: 2,
              border: "1px solid #e8e1f0",
              boxShadow: "0 14px 35px rgba(58,34,96,.08)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.45fr .8fr" },
            }}
          >
            <Box sx={{ p: { xs: 2.5, md: 3.25 }, color: "#fff", background: "var(--pp-hero)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box>
                  <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.6, color: "rgba(255,255,255,.68)" }}>
                    CURRENT PLAN
                  </Typography>
                  <Typography fontSize={{ xs: 28, md: 32 }} fontWeight={600} sx={{ mt: 0.5 }}>
                    {plan.label}
                  </Typography>
                </Box>
                <Chip icon={<CheckCircleRounded />} label={state.label} size="small" sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,.14)", "& .MuiChip-icon": { color: toneColor[state.tone] } }} />
              </Stack>
              <Typography sx={{ color: "rgba(255,255,255,.76)", maxWidth: 500, mt: 1 }} fontSize={13}>
                {plan.description}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2.5 }}>
                <Chip icon={<ShieldRounded />} label="Secure billing by Stripe" size="small" sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,.12)", "& .MuiChip-icon": { color: "#d8c3ff" } }} />
                {subscribed && (
                  <Chip label={subscription?.cancelAtPeriodEnd ? "Does not renew" : `Renews ${currentInterval}ly`} size="small" sx={{ color: "rgba(255,255,255,.8)", backgroundColor: "rgba(255,255,255,.08)" }} />
                )}
              </Stack>
            </Box>
            <Box sx={{ p: { xs: 2.5, md: 3.25 }, backgroundColor: "#fff" }}>
              <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>
                {currentInterval === "year" ? "YEARLY" : "MONTHLY"} INVESTMENT
              </Typography>
              <Typography fontSize={{ xs: 28, md: 32 }} fontWeight={600} sx={{ mt: 0.35, color: "#241434" }}>
                {currentPlan === "enterprise" ? "Custom" : formatMoney(subscribed ? subscription?.unitAmount ?? 0 : 0, subscription?.currency ?? "aed")}
                {currentPlan !== "enterprise" && <Typography component="span" fontSize={13} color="text.secondary"> / {currentInterval}</Typography>}
              </Typography>
              {subscribed && <Typography fontSize={11} color="text.secondary">Excluding tax. Tax is added by Stripe from your billing location.</Typography>}
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" gap={2}>
                <Box>
                  <Typography fontSize={11} color="text.secondary">{subscription?.cancelAtPeriodEnd ? "Access until" : "Next billing date"}</Typography>
                  <Typography fontSize={13} fontWeight={600} sx={{ mt: 0.35 }}>{subscribed ? formatBillingDate(subscription?.currentPeriodEnd) : "—"}</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography fontSize={11} color="text.secondary">Period started</Typography>
                  <Typography fontSize={13} fontWeight={600} sx={{ mt: 0.35 }}>{formatBillingDate(subscription?.currentPeriodStart ?? usage?.periodStart)}</Typography>
                </Box>
              </Stack>
              {canManage && (
                <Stack gap={1} sx={{ mt: 2.25 }}>
                  <Button variant="outlined" fullWidth onClick={scrollToPlans} sx={{ borderRadius: 1.25, textTransform: "none" }}>
                    {subscribed ? "Change plan or interval" : "View plan options"}
                  </Button>
                  {canCancel && subscribed && (subscription?.cancelAtPeriodEnd ? (
                    <Button fullWidth disabled={Boolean(busy)} onClick={() => run("resume", () => billingApi.resumeSubscription(projectId!), "Your subscription has been resumed.")} sx={{ textTransform: "none" }}>
                      {busy === "resume" ? "Resuming…" : "Resume subscription"}
                    </Button>
                  ) : (
                    <Button fullWidth color="inherit" disabled={Boolean(busy)} onClick={() => setConfirmCancel(true)} sx={{ textTransform: "none", color: "#6b6378" }}>
                      Cancel subscription
                    </Button>
                  ))}
                </Stack>
              )}
            </Box>
          </Card>

          {canManage && hasBillingAccount && (
            <Card className="saas-card" sx={{ p: 2.5, borderRadius: 2, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0,1fr))" }, gap: 2.5 }}>
              <Box>
                <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>SUBSCRIPTION</Typography>
                <Typography fontWeight={600} fontSize={14} sx={{ mt: 0.75 }}>{plan.label} · {currentInterval === "year" ? "Yearly" : "Monthly"}</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  {state.label}{subscription?.cancelAtPeriodEnd ? ` · ends ${formatBillingDate(subscription.currentPeriodEnd)}` : subscribed ? ` · renews ${formatBillingDate(subscription?.currentPeriodEnd)}` : ""}
                </Typography>
              </Box>
              <Box>
                <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>PAYMENT METHOD</Typography>
                <Typography fontWeight={600} fontSize={14} sx={{ mt: 0.75, textTransform: "capitalize" }}>
                  {paymentMethodQuery.data ? `${paymentMethodQuery.data.brand ?? paymentMethodQuery.data.type} •••• ${paymentMethodQuery.data.last4 ?? ""}` : paymentMethodQuery.isPending ? "Loading…" : "None saved"}
                </Typography>
                <Button size="small" disabled={Boolean(busy)} onClick={updateCard} sx={{ px: 0, minWidth: 0, textTransform: "none" }}>{busy === "card" ? "Opening…" : "Update card"}</Button>
              </Box>
              <Box>
                <Typography fontSize={11} fontWeight={500} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>BILLING ADDRESS</Typography>
                <Typography fontWeight={600} fontSize={14} sx={{ mt: 0.75 }}>{profile.company || profile.name || "—"}</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  {[profile.addressLine1, profile.city, profile.postalCode, profile.country].filter(Boolean).join(", ") || "No address yet"}
                </Typography>
                <Button size="small" onClick={() => setTab("profile")} sx={{ px: 0, minWidth: 0, textTransform: "none" }}>Edit details</Button>
              </Box>
            </Card>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "end" }} gap={1.5}>
            <Box>
              <Typography variant="h3">Usage this billing cycle</Typography>
              <Typography color="text.secondary" fontSize={12}>Keep an eye on the limits that matter to your project.</Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
              {overCount > 0 && <Chip label={`${overCount} limit${overCount > 1 ? "s need" : " needs"} attention`} size="small" sx={{ backgroundColor: "#fff0f1", color: "#d72f48", fontWeight: 500 }} />}
              {usage && <Chip label={`Since ${formatBillingDate(usage.periodStart)}`} size="small" sx={{ backgroundColor: "#f3edfc", color: "#6422c5", fontWeight: 500 }} />}
            </Stack>
          </Stack>
          {usageQuery.isError && <Alert severity="error" sx={{ borderRadius: 2 }}>We could not load usage for this project. Please refresh the page.</Alert>}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" },
              gap: 2,
            }}
          >
            {usageRows.map(({ label, value, limit, over, icon: UsageIcon, color }) => {
              const percent = limit ? Math.round((value / limit) * 100) : 0;
              return (
                <Card
                  className="usage-card"
                  key={label}
                  sx={{
                    p: 2,
                    minHeight: 184,
                    borderRadius: 2,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    "&::before": { content: '""', position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Stack direction="row" gap={1} alignItems="center" minWidth={0}>
                      <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 1.25, color, backgroundColor: color + "18" }}>
                        <UsageIcon fontSize="small" />
                      </Box>
                      <Typography fontWeight={600} fontSize={13} sx={{ lineHeight: 1.25 }}>{label}</Typography>
                    </Stack>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: "conic-gradient(" + color + " " + Math.min(percent, 100) + "%, #eeeaf5 0)",
                      }}
                    >
                      <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "#fff" }}>
                        <Typography fontSize={11} fontWeight={500} sx={{ color }}>{limit ? percent + "%" : "∞"}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                  <Box sx={{ mt: 1.5 }}>
                    <Typography fontSize={16} fontWeight={600} sx={{ color: "#261735" }}>
                      {number(value)}
                      <Typography component="span" fontSize={11} fontWeight={500} color="text.secondary"> / {limit ? number(limit) : "Unlimited"}</Typography>
                    </Typography>
                    <LinearProgress variant="determinate" value={Math.min(percent, 100)} sx={{ mt: 1, "& .MuiLinearProgress-bar": { backgroundColor: color } }} />
                    <Typography color={over ? "error.main" : "text.secondary"} fontSize={11} fontWeight={over ? 500 : 400} sx={{ mt: 0.8 }}>
                      {over ? "Over limit" : limit ? percent + "% used this period" : "No limit on this plan"}
                    </Typography>
                  </Box>
                </Card>
              );
            })}
          </Box>

          {currentPlan !== "enterprise" && (
            <Card
              className="saas-card"
              ref={plansRef}
              sx={{
                p: 0,
                overflow: "hidden",
                borderRadius: 2,
                border: "1px solid #e0d8f1",
                background: "#FAF9FB",
                boxShadow: "0 18px 45px rgba(56, 28, 116, 0.08)",
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  px: { xs: 2.5, md: 3.25 },
                  py: { xs: 2.5, md: 3 },
                  color: "#fff",
                  background: "var(--pp-hero)",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    width: 300,
                    height: 300,
                    right: -125,
                    top: -190,
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,.2)",
                    boxShadow: "0 0 0 28px rgba(255,255,255,.035), 0 0 0 58px rgba(255,255,255,.025)",
                  },
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ position: "relative", zIndex: 1 }}>
                  <Stack direction="row" alignItems="center" gap={1.5}>
                    <Box sx={{ width: 44, height: 44, display: "grid", placeItems: "center", flexShrink: 0, borderRadius: 1.75, color: "#f4d46b", backgroundColor: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.18)" }}>
                      <AutoGraphRounded />
                    </Box>
                    <Box>
                      <Typography fontSize={11} fontWeight={500} letterSpacing=".14em" sx={{ color: "#e7c5ff" }}>PLAN BUILDER</Typography>
                      <Typography fontSize={{ xs: 20, md: 24 }} fontWeight={600} sx={{ mt: 0.25, lineHeight: 1.1 }}>Scale with confidence</Typography>
                    </Box>
                  </Stack>
                  <Stack alignItems={{ xs: "flex-start", sm: "flex-end" }} gap={0.75}>
                    <Typography fontSize={11} fontWeight={500} letterSpacing=".12em" sx={{ color: "#ddc9fa" }}>BILLING CYCLE</Typography>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={interval}
                      onChange={(_, value: BillingInterval | null) => value && setInterval(value)}
                      aria-label="Billing interval"
                    >
                      <ToggleButton value="month">Monthly</ToggleButton>
                      <ToggleButton value="year">Yearly</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1} sx={{ position: "relative", zIndex: 1, mt: 2 }}>
                  <Typography fontSize={13} sx={{ color: "rgba(255,255,255,.78)", maxWidth: 560 }}>
                    Pick the plan that matches your audience, messaging volume, and journey goals. You can change your plan whenever your project grows.
                  </Typography>
                  {interval === "year" && <Chip label="Yearly billing saves 2 months" size="small" sx={{ color: "#204b35", backgroundColor: "#baf3cf", fontWeight: 500 }} />}
                </Stack>
              </Box>

              <Box sx={{ p: { xs: 2, md: 2.75 } }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
                  <Box>
                    <Typography fontSize={16} fontWeight={600} sx={{ color: "#241434" }}>Plans for your next stage</Typography>
                    <Typography color="text.secondary" fontSize={12}>Compare limits and choose the right amount of room to grow.</Typography>
                  </Box>
                  <Chip icon={<ShieldRounded sx={{ fontSize: 16 }} />} label="Secure billing" size="small" sx={{ width: "fit-content", color: "#5c2ab5", backgroundColor: "#eee6ff", fontWeight: 500 }} />
                </Stack>

                <Grid container spacing={2} sx={{ mt: 0.75 }}>
                  {paidPlans.map((option, index) => {
                    const price = priceOf(prices, option, interval);
                    const limits = plansQuery.data?.[option];
                    const isCurrent = subscribed && option === currentPlan && interval === currentInterval;
                    const isHighlighted = option === "pro";
                    const metrics = limits ? [
                      limits.reachableUsers && `${number(limits.reachableUsers)} users`,
                      limits.emailSendsPerMonth && `${number(limits.emailSendsPerMonth)} emails`,
                      limits.pushSendsPerMonth && `${number(limits.pushSendsPerMonth)} pushes`,
                      limits.activeJourneys && `${limits.activeJourneys} journeys`,
                    ].filter(Boolean) : [];
                    const action = isCurrent ? "Current plan"
                      : !subscribed ? "Choose plan"
                      : planRank[option] > planRank[currentPlan] ? "Upgrade"
                      : planRank[option] < planRank[currentPlan] ? "Downgrade"
                      : interval === "year" ? "Switch to yearly" : "Switch to monthly";
                    return (
                      <Grid item xs={12} md={6} key={option}>
                        <Box
                          sx={{
                            position: "relative",
                            height: "100%",
                            p: { xs: 2, md: 2.25 },
                            borderRadius: 2.5,
                            border: "1px solid",
                            borderColor: isCurrent || (!subscribed && option === wantedPlan) ? "#6422c5" : isHighlighted ? "#d7c2fb" : "#e5e0ee",
                            background: "#fff",
                            boxShadow: isCurrent ? "0 0 0 3px rgba(100,34,197,.1)" : "0 8px 20px rgba(50,28,91,.04)",
                          }}
                        >
                          {(isCurrent || isHighlighted) && (
                            <Chip label={isCurrent ? "Your current plan" : "Best for growing teams"} size="small" sx={{ position: "absolute", top: 14, right: 14, color: isCurrent ? "#19743c" : "#6422c5", backgroundColor: isCurrent ? "#e6f8ed" : "#eee6ff", fontWeight: 500, fontSize: 11 }} />
                          )}
                          <Stack direction="row" alignItems="center" gap={1.25}>
                            <Box sx={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 1.25, color: isHighlighted ? "#6422c5" : "#4f2a8f", backgroundColor: isHighlighted ? "#eee6ff" : "#f1ecfb" }}>
                              {index === 0 ? <CreditCardRounded fontSize="small" /> : <AutoGraphRounded fontSize="small" />}
                            </Box>
                            <Box>
                              <Typography fontSize={16} fontWeight={600} sx={{ color: "#241434" }}>{planCopy[option].label}</Typography>
                              <Typography fontSize={11} color="text.secondary">{option === "pro" ? "For teams ready to scale" : "A simple start for growing teams"}</Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" alignItems="baseline" gap={0.5} sx={{ mt: 2 }}>
                            <Typography fontSize={24} fontWeight={600} sx={{ color: "#241434", lineHeight: 1 }}>{formatMoney(price.unitAmount, price.currency)}</Typography>
                            <Typography fontSize={12} color="text.secondary">/ {interval}</Typography>
                          </Stack>
                          <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.8, minHeight: 34 }}>{planCopy[option].description}</Typography>
                          {metrics.length > 0 && (
                            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
                              {metrics.map((metric) => <Chip key={metric} icon={<CheckCircleRounded sx={{ fontSize: 14 }} />} label={metric} size="small" sx={{ color: "#51435f", backgroundColor: "#f6f3fa", fontSize: 11, fontWeight: 500, "& .MuiChip-icon": { color: "#25a365" } }} />)}
                            </Stack>
                          )}
                          {interval === "year" && (
                            <Typography fontSize={11} fontWeight={500} sx={{ mt: 1.25, color: "#16814d" }}>
                              Save {formatMoney(yearlySaving(prices, option), price.currency)} a year
                            </Typography>
                          )}
                          {canManage && (
                            <Button variant={isCurrent ? "outlined" : "contained"} fullWidth disabled={isCurrent || Boolean(busy)} onClick={() => choosePlan(option)} sx={{ mt: 2, textTransform: "none", borderRadius: 1.5, minHeight: 40 }}>
                              {busy === `plan-${option}` ? "Updating…" : action}
                            </Button>
                          )}
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>

                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={0.75} sx={{ mt: 2, pt: 1.75, borderTop: "1px solid #e9e3f2" }}>
                  <Typography color="text.secondary" fontSize={11}>Prices are in AED and exclude tax. VAT is calculated at checkout.</Typography>
                  <Link href="/pricing" underline="hover" sx={{ fontSize: 11, fontWeight: 500, whiteSpace: "nowrap" }}>Contact sales for Enterprise</Link>
                </Stack>
                {!canManage && <Typography color="text.secondary" fontSize={11} sx={{ mt: 0.75 }}>Ask an owner, admin or billing member of this project to change the plan.</Typography>}
              </Box>
            </Card>
          )}
        </Stack>
      )}

      {tab === "history" && (!canManage ? managersOnly : (
        <Card className="saas-card" sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="h3">Billing history</Typography>
              <Typography color="text.secondary" fontSize={12}>Invoices and payment activity for this project.</Typography>
            </Box>
          </Stack>
          <Divider sx={{ my: 2 }} />
          {invoicesQuery.isError ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>We could not load your invoices. Please try again.</Alert>
          ) : !invoicesQuery.data?.length ? (
            <Stack direction="row" alignItems="center" gap={1}>
              <ReceiptLongRounded sx={{ fontSize: 18, color: "#9874c9" }} />
              <Typography color="text.secondary" fontSize={12}>
                {invoicesQuery.isPending ? "Loading invoices…" : "Your invoices will appear here after your first successful payment."}
              </Typography>
            </Stack>
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell>Subtotal</TableCell>
                    <TableCell>Tax</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Documents</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoicesQuery.data.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{formatBillingDate(invoice.createdAt)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{invoice.number ?? "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{formatMoney(invoice.subtotalExcludingTax, invoice.currency)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{formatMoney(invoice.tax, invoice.currency)}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 500 }}>{formatMoney(invoice.total, invoice.currency)}</TableCell>
                      <TableCell>
                        <Chip
                          label={invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          size="small"
                          sx={{
                            color: invoice.status === "paid" ? "#19743c" : invoice.status === "open" ? "#a15c07" : "#5c5568",
                            backgroundColor: invoice.status === "paid" ? "#e7f8ed" : invoice.status === "open" ? "#fff4df" : "#f1eef5",
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                        {invoice.hostedInvoiceUrl && <Link href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" underline="hover">{invoice.status === "open" ? "Pay" : "View"}</Link>}
                        {invoice.hostedInvoiceUrl && invoice.invoicePdf && " · "}
                        {invoice.invoicePdf && <Link href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer" underline="hover">PDF</Link>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Card>
      ))}

      {tab === "methods" && (!canManage ? managersOnly : (
        <Stack gap={2.5}>
          <Card className="saas-card" sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
              <Box>
                <Typography variant="h3">Payment methods</Typography>
                <Typography color="text.secondary" fontSize={12}>Cards saved for this project. Renewals are charged to the default card; a new card is checked by Stripe and also pays any unpaid invoice.</Typography>
              </Box>
              {projectId && (
                <Button variant="contained" disabled={Boolean(busy)} onClick={updateCard} sx={{ textTransform: "none", borderRadius: 1.25 }}>
                  {busy === "card" ? "Opening…" : "Add a card"}
                </Button>
              )}
            </Stack>
          </Card>
          {hasBillingAccount && projectId && (
            <SavedCards projectId={projectId} adding={busy === "card"} onAdd={updateCard} onChanged={async (message) => { await refresh(); setNotice(message); }} />
          )}
          {!hasBillingAccount && (
            <Card className="saas-card" sx={{ p: 5, textAlign: "center" }}>
              <CreditCardRounded sx={{ fontSize: 48, color: "#9874c9" }} />
              <Typography variant="h3" sx={{ mt: 1 }}>No payment method yet</Typography>
              <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>Add a payment method securely through Stripe when you choose a plan.</Typography>
              <Button variant="outlined" onClick={() => setTab("overview")} sx={{ mt: 2, textTransform: "none" }}>View plan options</Button>
            </Card>
          )}
          <Alert severity="info" icon={<ShieldRounded />} sx={{ borderRadius: 2 }}>
            Card details are entered on Stripe and never reach or are stored in PixlPush.
          </Alert>
        </Stack>
      ))}

      {tab === "profile" && (!canManage ? managersOnly : (
        <Card className="saas-card" sx={{ p: 2.5 }}>
          <Typography variant="h3">Billing details</Typography>
          <Typography color="text.secondary" fontSize={12}>
            Keep your invoice recipient and tax information up to date. Tax is calculated from the billing/business address and tax information provided at checkout.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {profileFields.map(([key, label]) => (
              <Grid item xs={12} sm={key === "addressLine1" || key === "addressLine2" || key === "company" ? 6 : 4} key={key}>
                <TextField
                  fullWidth
                  size="small"
                  label={label}
                  value={profile[key] ?? ""}
                  onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                  type={key === "email" ? "email" : "text"}
                  required={key === "email"}
                  helperText={key === "country" ? "Two letters, e.g. AE, DE, GB, US" : key === "vatId" ? "Confirmed with Stripe at checkout" : undefined}
                  inputProps={key === "country" ? { maxLength: 2, style: { textTransform: "uppercase" } } : undefined}
                />
              </Grid>
            ))}
          </Grid>
          {profileError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{profileError}</Alert>}
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button variant="contained" disabled={!projectId || !profile.email || saveProfile.isPending} onClick={submitProfile} sx={{ textTransform: "none" }}>
              {saveProfile.isPending ? "Saving..." : "Save billing details"}
            </Button>
          </Stack>
        </Card>
      ))}

      {projectId && (
        <UpdatePaymentMethodDialog
          projectId={projectId}
          clientSecret={cardSecret}
          onClose={() => setCardSecret(null)}
          onSaved={async (message) => { setCardSecret(null); await refresh(); setNotice(message); }}
        />
      )}

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel subscription?</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            Your {plan.label} plan stays active until {formatBillingDate(subscription?.currentPeriodEnd)}. It will not renew after that date, and you can resume it any time before then.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmCancel(false)} sx={{ textTransform: "none" }}>Keep subscription</Button>
          <Button color="error" variant="contained" disabled={Boolean(busy)} sx={{ textTransform: "none" }} onClick={() => { setConfirmCancel(false); void run("cancel", () => billingApi.cancelSubscription(projectId!), "Your subscription is cancelled and will end at the close of the current period."); }}>
            Cancel subscription
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(change)} onClose={() => setChange(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change to {change ? planCopy[change.plan].label : ""} ({change?.interval}ly)?</DialogTitle>
        <DialogContent>
          <Typography fontSize={14} color="text.secondary">
            {change?.upgrade
              ? "The prorated difference is charged to your payment method now. Your plan will upgrade after Stripe confirms the payment."
              : `Your plan will change on ${formatBillingDate(subscription?.currentPeriodEnd)}. Your current plan remains active until then, with no refund or credit.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setChange(null)} sx={{ textTransform: "none" }}>Keep current plan</Button>
          <Button variant="contained" disabled={Boolean(busy)} sx={{ textTransform: "none" }} onClick={() => { const next = change!; setChange(null); void run(`plan-${next.plan}`, () => billingApi.changeSubscription(projectId!, { plan: next.plan, interval: next.interval }), next.upgrade ? "Plan change requested. It applies as soon as Stripe confirms the payment." : "Your plan change is scheduled for the next renewal."); }}>
            Confirm change
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
