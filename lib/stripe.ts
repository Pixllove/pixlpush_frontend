import { loadStripe } from "@stripe/stripe-js";

/** The publishable key only identifies the Stripe account; card details go from the browser straight to Stripe. */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/** Stripe Elements styled like the dashboard's own inputs. */
export const stripeAppearance = {
  theme: "stripe" as const,
  variables: { colorPrimary: "#5517B8", colorText: "#241536", colorDanger: "#d72f48", fontFamily: "Arial, Helvetica, sans-serif", borderRadius: "10px", spacingUnit: "4px" },
  rules: { ".Input": { borderColor: "#e3dcec", boxShadow: "none" }, ".Input:focus": { borderColor: "#5517B8", boxShadow: "0 0 0 3px rgba(85,23,184,.12)" }, ".Label": { fontWeight: "700", fontSize: "12px" } },
};
