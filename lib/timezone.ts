/** Viewer-local timezone helpers. Timestamps remain UTC instants at the API boundary. */

const OVERRIDE_KEY = "pixlpush-timezone";

const isZone = (value: string) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
};

/**
 * The profile's manual time zone, or null to follow the device. Kept in
 * localStorage so every page (and the X-User-Timezone header) uses it at once.
 */
export function setTimezoneOverride(timeZone: string | null) {
  if (typeof window === "undefined") return;
  if (timeZone && isZone(timeZone)) window.localStorage.setItem(OVERRIDE_KEY, timeZone);
  else window.localStorage.removeItem(OVERRIDE_KEY);
}

/** The zone dates are shown in: the profile's manual choice, else this device's zone. */
export function getViewerTimezone(): string {
  if (typeof window !== "undefined") {
    const chosen = window.localStorage.getItem(OVERRIDE_KEY);
    if (chosen && isZone(chosen)) return chosen;
  }
  return getDeviceTimezone();
}

/** This device's own zone, ignoring the profile setting. */
export function getDeviceTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      // Validate before sending it; older runtimes can return unsupported IDs.
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      return timezone;
    }
  } catch {
    // Fall through to the standards-defined UTC fallback.
  }
  return "UTC";
}

/** "UTC+05:00" for a zone at a moment (daylight saving aware). */
export function offsetLabel(date: Date, timeZone: string): string {
  try {
    const name = new Intl.DateTimeFormat("en", {
      timeZone,
      timeZoneName: "longOffset",
    }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
    if (!name || name === "GMT" || name === "GMT+00:00" || name === "GMT-00:00") {
      return "UTC+00:00";
    }
    const match = name.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    return match ? `UTC${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}` : name.replace(/^GMT/, "UTC");
  } catch {
    return "UTC+00:00";
  }
}

/** Formats one absolute timestamp in the current viewer's IANA timezone and shows its DST-aware offset. */
export function formatUserDateTime(
  value: string | number | Date | null | undefined,
  timeZone = getViewerTimezone(),
): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    const display = new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    }).format(date);
    return `${display} (${offsetLabel(date, timeZone)})`;
  } catch {
    return "—";
  }
}

export function formatUserTime(
  value: string | number | Date | null | undefined,
  timeZone = getViewerTimezone(),
): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return `${new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).format(date)} (${offsetLabel(date, timeZone)})`;
  } catch {
    return "—";
  }
}

/** Full viewer-local date and time, with an unambiguous 12-hour clock and event-time UTC offset. */
export function formatUserLocalDateTime(
  value: string | number | Date | null | undefined,
  timeZone = getViewerTimezone(),
): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return `${new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
      hour12: true,
    }).format(date)} (${offsetLabel(date, timeZone)})`;
  } catch {
    return "—";
  }
}

/** Compact viewer-local date and time for dense audit tables, including the event-time offset. */
export function formatUserCompactDateTime(
  value: string | number | Date | null | undefined,
  timeZone = getViewerTimezone(),
): string {
  if (value === null || value === undefined || value === "") return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    const display = new Intl.DateTimeFormat(undefined, {
      timeZone,
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
    return `${display} (${offsetLabel(date, timeZone)})`;
  } catch {
    return "—";
  }
}

export function describeViewerTimezone(
  value: string | number | Date | null | undefined,
  timeZone = getViewerTimezone(),
): string {
  const formatted = formatUserDateTime(value, timeZone);
  const offset = formatted.match(/\((UTC[+-]\d{2}:\d{2})\)$/)?.[1] ?? "UTC+00:00";
  return `${timeZone} (${offset})`;
}
