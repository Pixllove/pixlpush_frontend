/** Viewer-local timezone helpers. Timestamps remain UTC instants at the API boundary. */
export function getViewerTimezone(): string {
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

function offsetLabel(date: Date, timeZone: string): string {
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
