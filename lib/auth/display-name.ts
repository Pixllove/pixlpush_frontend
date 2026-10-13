import type { Account } from "@/types/auth";

/** Formats the signed-in account consistently for dashboard greetings. */
export function accountGreetingName(account?: Pick<Account, "name" | "email"> | null) {
  const name = account?.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return account?.email?.split("@")[0]?.trim() || "";
}
