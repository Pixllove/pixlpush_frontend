import { loadStripe } from "@stripe/stripe-js";

/** The publishable key only identifies the Stripe account; card details go from the browser straight to Stripe. */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/** Stripe Elements styled like the dashboard's own inputs. */
export const stripeAppearance = {
  theme: "stripe" as const,
  variables: { colorPrimary: "#5517B8", colorText: "#1E1429", colorDanger: "#C0352B", fontFamily: "Inter, system-ui, sans-serif", borderRadius: "6px", spacingUnit: "4px" },
  rules: { ".Input": { padding: "10px 12px", fontSize: "14px", lineHeight: "20px", borderColor: "#D9D3E1", boxShadow: "none" }, ".Input:focus": { borderColor: "#5517B8", boxShadow: "0 0 0 1px #5517B8" }, ".Label": { fontWeight: "500", fontSize: "13px", color: "#625A6E" } },
};
