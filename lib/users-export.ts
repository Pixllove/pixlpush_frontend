import type { EndUser } from "@/types/project";

/**
 * Users -> CSV the importer reads back as-is. Writable fields use the
 * importer's header names; "PixlPush ..." and timestamp columns are info only
 * (the importer skips them). Users without an app user ID export their
 * PixlPush id, which the importer matches back to the same user.
 */
const iso = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 19).replace("T", " ") : "");
const text = (v: unknown) =>
  v === null || v === undefined
    ? ""
    : typeof v === "boolean"
      ? v ? "yes" : "no"
      : typeof v === "object"
        ? JSON.stringify(v)
        : String(v);
const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

type Column = [string, (u: EndUser) => unknown];

export function usersToCsv(users: EndUser[]): string {
  // signupSource is SDK-set: an info column below, not a custom field.
  const propertyKeys = [...new Set(users.flatMap((u) => Object.keys(u.properties ?? {})))]
    .filter((key) => key !== "signupSource")
    .sort();
  const columns: Column[] = [
    ["User ID", (u) => u.externalUserId || u.id],
    ["Email", (u) => u.email],
    ["Name", (u) => u.name],
    ["Account status", (u) => u.accountStatus],
    ["User type", (u) => u.userType],
    ["Country", (u) => u.country],
    ["Region", (u) => u.region],
    ["Timezone", (u) => u.timezone],
    ["Preferred language", (u) => u.preferredLanguage],
    ["Email consent", (u) => u.emailConsent],
    ["Last active at (UTC)", (u) => iso(u.lastActiveAt)],
    ...propertyKeys.map((key): Column => [key, (u) => u.properties?.[key]]),
    ["PixlPush ID", (u) => u.pixlpushId ?? `pixlpush_${u.id}`],
    ["PixlPush status", (u) => u.status],
    ["PixlPush lifecycle segment", (u) => u.lifecycleSegment?.name],
    ["PixlPush email status", (u) => u.emailStatus],
    ["PixlPush signup source", (u) => u.properties?.signupSource],
    ["PixlPush platform", (u) => {
      const d = u.installations?.[0];
      return d ? [d.platform, d.deviceModel, d.osVersion].filter(Boolean).join(" · ") : "";
    }],
    ["PixlPush push permission", (u) => u.installations?.[0]?.pushPermission ?? u.pushSubscriptions?.[0]?.permission],
    ["PixlPush push token", (u) => (u.pushSubscriptions?.[0] ? `Available (${u.pushSubscriptions[0].provider.toUpperCase()})` : "Not available")],
    ["First seen at (UTC)", (u) => iso(u.firstSeenAt)],
    ["Created at (UTC)", (u) => iso(u.createdAt)],
    ["Logged out at (UTC)", (u) => iso(u.loggedOutAt)],
    ["Account deleted at (UTC)", (u) => iso(u.accountDeletedAt)],
  ];
  // BOM so Excel opens UTF-8 names correctly.
  return "﻿" + [columns.map(([header]) => header), ...users.map((u) => columns.map(([, get]) => text(get(u))))]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}
