import type { ApiError } from "@/types/auth";
import type { BillingInterval, BillingPrice, PaidPlan, ProjectRole, SubscriptionState } from "@/types/project";

/**
 * The approved public prices, before tax. Shown on the public pricing page and wherever the backend has no
 * Stripe prices to give (local development). The backend and Stripe decide what is actually charged: the
 * frontend only ever sends a plan and an interval, never an amount or a Stripe price id.
 */
export const PUBLIC_PRICES: BillingPrice[] = [
  { plan: "starter", interval: "month", unitAmount: 10700, currency: "aed", taxExclusive: true },
  { plan: "starter", interval: "year", unitAmount: 107000, currency: "aed", taxExclusive: true },
  { plan: "pro", interval: "month", unitAmount: 29000, currency: "aed", taxExclusive: true },
  { plan: "pro", interval: "year", unitAmount: 290000, currency: "aed", taxExclusive: true },
];

export const priceOf = (prices: BillingPrice[], plan: PaidPlan, interval: BillingInterval) =>
  prices.find((price) => price.plan === plan && price.interval === interval)
  ?? PUBLIC_PRICES.find((price) => price.plan === plan && price.interval === interval)!;

/** "AED 107" / "AED 304.50": amounts arrive in the smallest currency unit. */
export function formatMoney(minor: number, currency = "aed") {
  const amount = minor / 100;
  return `${currency.toUpperCase()} ${amount.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** What paying yearly saves against twelve monthly payments, in the smallest currency unit. */
export const yearlySaving = (prices: BillingPrice[], plan: PaidPlan) =>
  priceOf(prices, plan, "month").unitAmount * 12 - priceOf(prices, plan, "year").unitAmount;

export const formatBillingDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** The backend enforces this; here it only decides which controls are shown. */
export const canManageBilling = (role?: ProjectRole) => role === "owner" || role === "admin" || role === "billing";
export const canCancelBilling = (role?: ProjectRole) => role === "owner" || role === "billing";

export type BillingTone = "success" | "info" | "warning" | "error";

/** The label and sentence for the state the backend reports. Nothing is inferred from a Stripe redirect. */
export function billingState(subscription: SubscriptionState | null): { label: string; tone: BillingTone; message: string | null } {
  if (!subscription) return { label: "Free", tone: "success", message: null };
  const { status, plan, billingProblem, stripeStatus, currentPeriodEnd } = subscription;
  if (billingProblem === "payment_action_required")
    return { label: "Payment action required", tone: "warning", message: "Additional payment verification is required. Open the billing portal to complete payment." };
  if (billingProblem === "tax_location_missing")
    return { label: "Billing attention required", tone: "warning", message: "Stripe needs a complete billing address before tax can be calculated. Open the billing portal to complete it." };
  if (billingProblem === "invoice_finalization_failed" || billingProblem === "dispute")
    return { label: "Billing attention required", tone: "warning", message: "There is a problem with your latest invoice or payment. Please contact support." };
  if (status === "past_due")
    return { label: "Past due", tone: "error", message: "We could not collect your latest payment. Update your payment method to keep your subscription active." };
  if (status === "billing_attention" || billingProblem === "payment_failed")
    return { label: "Billing attention required", tone: "warning", message: "We could not collect your latest payment. Update your payment method to keep your subscription active." };
  if (status === "incomplete")
    return { label: "Payment pending", tone: "info", message: "Your payment is being processed. Your paid features will become available after Stripe confirms payment." };
  if (status === "cancel_at_period_end")
    return { label: "Canceling at period end", tone: "warning", message: `Your subscription will remain active until ${formatBillingDate(currentPeriodEnd)}. It will not renew after that date.` };
  if (status === "paused") return { label: "Paused", tone: "warning", message: "Your paid subscription has ended. Choose a plan to restore paid features." };
  if (status === "unpaid") return { label: "Unpaid", tone: "error", message: "Your paid subscription has ended. Choose a plan to restore paid features." };
  if (plan === "free" && stripeStatus === "canceled")
    return { label: "Canceled", tone: "info", message: "Your paid subscription has ended. Choose a plan to restore paid features." };
  if (plan === "free") return { label: "Free", tone: "success", message: null };
  if (status === "trialing") return { label: "Trial", tone: "success", message: "Your trial is active." };
  return { label: "Active", tone: "success", message: "Your subscription is active." };
}

/** States worth re-reading for a while, because Stripe is about to change them. */
export const isSettling = (subscription: SubscriptionState | null) =>
  Boolean(subscription && (subscription.status === "incomplete" || subscription.status === "billing_attention" || subscription.billingProblem === "payment_action_required"));

const ERRORS: Record<string, string> = {
  INSUFFICIENT_ROLE: "You do not have permission to manage billing for this project.",
  PROJECT_DEACTIVATED: "This project is deactivated. Restore it before changing its billing.",
  VALIDATION_ERROR: "That plan or billing interval is not available.",
  SUBSCRIPTION_EXISTS: "This project already has a subscription. Change the plan here or open the billing portal.",
  ENTERPRISE_PLAN: "This project is on Enterprise. Contact sales to change it.",
  ENTERPRISE_REQUIRES_SALES: "Enterprise is arranged with our sales team.",
  BILLING_ADDRESS_REQUIRED: "Stripe needs a complete billing address before tax can be calculated.",
  BILLING_NOT_CONFIGURED: "Payments are not available on this server yet.",
  NO_BILLING_ACCOUNT: "There is no billing account yet. Choose a plan to start.",
  CHECKOUT_REQUIRED: "Choose a plan to start a subscription first.",
  SUBSCRIPTION_ENDED: "This subscription has already ended. Choose a plan to start a new one.",
  NO_STRIPE_SUBSCRIPTION: "There is no active subscription to change.",
  INVALID_PAYMENT_METHOD: "That card does not belong to this project.",
  DEFAULT_PAYMENT_METHOD: "Make another card the default before removing this one.",
  INVALID_CARD_DETAILS: "Stripe did not accept this expiry date.",
  INVALID_TAX_ID: "This VAT / tax id is not valid for the billing country.",
  NOTHING_TO_PAY: "There is no payment waiting.",
  RATE_LIMITED: "Too many attempts. Please wait a minute and try again.",
  NETWORK_ERROR: "Cannot reach the server. Check your connection.",
};

/** A friendly sentence for a failed billing call. Raw Stripe or server text is never shown. */
export function billingErrorMessage(error: unknown, fallback = "We could not complete that right now. Please try again or open the billing portal.") {
  const api = error as Partial<ApiError> | null;
  if (api?.status === 401) return "Your session has expired. Please sign in again.";
  return (api?.code && ERRORS[api.code]) || fallback;
}
