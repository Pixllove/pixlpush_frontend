"use client";

import { useQuery } from "@tanstack/react-query";
import type { BillingInterval } from "@/types/project";

export type Entitlement = { enabled: false } | { enabled: true; unlimited: true } | { enabled: true; unlimited: false; limit: number };
export interface PriceQuote { currency: string; interval: BillingInterval; amount: string; approximate: boolean }
export interface PublicPlan {
  code: "free" | "starter" | "pro";
  name: string;
  tagline: string | null;
  description: string | null;
  annualDiscountPercent: string | null;
  features: Record<string, Entitlement>;
  display: Record<BillingInterval, { usd: PriceQuote | null; local: PriceQuote | null }>;
}
export interface LocalPricing {
  /// The visitor's country by IP, when known.
  country: string | null;
  /// Their currency; "usd" when it is unknown.
  currency: string;
  /// USD -> currency, for display conversions. Null when no rate is available.
  usdRate: number | null;
  plans: PublicPlan[];
}

/** Public plans with prices in the visitor's currency, picked by the backend from their IP. */
export function useLocalPricing() {
  return useQuery({
    queryKey: ["public-plans", "auto"],
    queryFn: async () => {
      const response = await fetch("/api/plans?currency=auto");
      if (!response.ok) throw new Error("Plans unavailable");
      return ((await response.json()) as { data: LocalPricing }).data;
    },
    staleTime: 60 * 60_000,
    retry: 1,
  });
}

/** Decimal string in major units -> smallest unit, for display only. */
export const toMinor = (amount: string) => Math.round(Number(amount) * 100);
