"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AddRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  AutoGraphRounded,
  BoltRounded,
  CampaignRounded,
  CloseRounded,
  DownloadRounded,
  DonutLargeRounded,
  DevicesRounded,
  GroupsRounded,
  InsightsRounded,
  PeopleAltRounded,
  PublicRounded,
  RemoveRounded,
  ShowChartRounded,
  WarningAmberRounded,
  WidgetsOutlined,
} from "@mui/icons-material";
import {
  Box,
  Button,
  ButtonBase,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { journeysApi } from "@/lib/projects/api";
import {
  analyticsApi,
  type AnalyticsActivity,
  type AnalyticsCampaigns,
  type AnalyticsDemographics,
  type AnalyticsDeliveryPage,
  type AnalyticsEmailDelivery,
  type AnalyticsJourneyActivity,
  type AnalyticsLifecycle,
  type AnalyticsOverview,
  type AnalyticsPushDelivery,
  type AnalyticsReachability,
  type AnalyticsRange,
  type AnalyticsWidgetId,
  type AnalyticsWidgetPreference,
} from "@/lib/projects/analytics";
import DashboardFrame from "./DashboardFrame";
import EmptyState from "./EmptyState";
import { greeting } from "./HomeCommandCenter";
import { accountGreetingName } from "@/lib/auth/display-name";
import SegmentedTabs from "./SegmentedTabs";
import { Sparkline, TrendChart } from "./analytics/Charts";
type RangeDays = AnalyticsRange;
type Kpi = { label: string; value: string; delta: string; direction: "up" | "down" | "flat"; spark: number[] };
type AnalyticsView = {
  labels: string[];
  kpis: Kpi[];
  sends: { email: number[]; push: number[] };
  engagement: { email: number[]; push: number[] };
  channels: Array<{ name: string; sent: number; rates: Array<{ label: string; value: number }> }>;
  campaigns: Array<{ id: string; name: string; channel: "Email" | "Push"; sent: number; rate: number }>;
};

type WidgetConfig = {
  id: AnalyticsWidgetId;
  title: string;
  description: string;
  icon: typeof InsightsRounded;
  preview: string;
};

// Picker previews intentionally mirror the original Analytics cards with deterministic sample data.
// Once added, the same cards render the live payload from the backend below.
const widgetCatalog: WidgetConfig[] = [
  { id: "reachable_audience", title: "Reachable audience", description: "Users contactable through push or email.", icon: GroupsRounded, preview: "42,320" },
  { id: "channel_performance", title: "Channel performance", description: "Compare reach across every channel.", icon: DonutLargeRounded, preview: "86.5%" },
  { id: "retention_pulse", title: "Retention pulse", description: "Track returning users over time.", icon: ShowChartRounded, preview: "+8.7%" },
  { id: "lifecycle_health", title: "Lifecycle health", description: "See where users are in their journey.", icon: PeopleAltRounded, preview: "4 stages" },
  { id: "top_campaigns", title: "Top campaigns", description: "Campaigns driving the most engagement.", icon: CampaignRounded, preview: "42.8%" },
  { id: "live_activity", title: "Live activity", description: "Recent events from your project.", icon: BoltRounded, preview: "Live" },
  { id: "churn_risk", title: "Churn risk", description: "Users most likely to become inactive.", icon: WarningAmberRounded, preview: "5,215" },
  { id: "journey_performance", title: "Journey performance", description: "Monitor active journey conversion.", icon: AutoGraphRounded, preview: "68.4%" },
  { id: "sessions_overview", title: "Sessions overview", description: "Track sessions and daily activity trends.", icon: ShowChartRounded, preview: "388" },
  { id: "most_active_users", title: "Most active users", description: "See the users creating the most sessions.", icon: GroupsRounded, preview: "1,684" },
  { id: "top_locations", title: "Top locations", description: "Users by country and audience share.", icon: PublicRounded, preview: "54%" },
  { id: "sessions_by_devices", title: "Sessions by devices", description: "Compare desktop, mobile and tablet usage.", icon: DevicesRounded, preview: "5,388" },
];

const widgetCatalogById = new Map(widgetCatalog.map((widget) => [widget.id, widget]));
const widgetTitle = (id: AnalyticsWidgetId) => id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const widgetConfig = (id: AnalyticsWidgetId): WidgetConfig => widgetCatalogById.get(id) ?? {
  id,
  title: widgetTitle(id),
  description: "Live project analytics from the backend.",
  icon: WidgetsOutlined,
  preview: "Live",
};

// The pieces every widget body is built from. Colour comes from the design layer, never from a widget.
function Headline({ value, trend, warn = false, aside }: { value: string; trend: string; warn?: boolean; aside?: ReactNode }) {
  return <Stack direction="row" justifyContent="space-between" alignItems="flex-end" gap={2}><Box><Typography className="analytics-big-number">{value}</Typography><Typography className={`analytics-trend${warn ? " analytics-trend-warn" : ""}`}>{trend}</Typography></Box>{aside}</Stack>;
}

/** Bars: `peak` picks out one bar and greys the rest; without it they are all the accent. */
function Bars({ heights, peak }: { heights: number[]; peak?: number }) {
  return <Box className={`analytics-bars${peak === undefined ? "" : " has-peak"}`} aria-hidden="true">{heights.map((height, i) => <i key={i} className={i === peak ? "is-peak" : undefined} style={{ height: `${height}%` }} />)}</Box>;
}

/** A label, a value and a track filled to `share` (the value itself when it is already a percentage). */
function Meters({ rows }: { rows: Array<[name: string, value: string, share?: string]> }) {
  return <Box className="analytics-meters">{rows.length ? rows.map(([name, value, share = value]) => <Box key={name}><Stack direction="row" justifyContent="space-between" gap={2}><span>{name}</span><b>{value}</b></Stack><Box className="analytics-meter-track"><i style={{ width: share }} /></Box></Box>) : <Typography color="text.secondary">No data for this period.</Typography>}</Box>;
}

function Rows({ rows }: { rows: Array<[name: string, value: string]> }) {
  return <Box className="analytics-widget-body analytics-rows">{rows.length ? rows.map(([name, value]) => <Stack direction="row" justifyContent="space-between" gap={2} key={name}><span>{name}</span><b>{value}</b></Stack>) : <Typography color="text.secondary">No data for this period.</Typography>}</Box>;
}

/** The ring's segments are drawn by `variant` in the design layer, in the same series order as `rows`. */
function Donut({ variant, total, caption, rows, shares }: { variant: "channels" | "devices"; total: string; caption: string; rows: Array<[name: string, value: string, series: 1 | 2 | 3]>; shares: number[] }) {
  const safeShares = shares.map((share) => Number.isFinite(share) && share > 0 ? share : 0);
  const sum = safeShares.reduce((value, share) => value + share, 0);
  let start = 0;
  const stops = safeShares.map((share, index) => {
    const end = sum ? start + (share / sum) * 100 : start;
    const stop = `var(--pp-series-${index + 1}) ${start}% ${end}%`;
    start = end;
    return stop;
  });
  const gradient = stops.length && sum ? `conic-gradient(${stops.join(", ")}, var(--pp-subtle) ${start}% 100%)` : "var(--pp-subtle)";
  return <Box className="analytics-widget-body analytics-donut-row"><Box className={`analytics-donut is-${variant}`} style={{ background: gradient }}><span>{total}<small>{caption}</small></span></Box><Stack gap={1}>{rows.length ? rows.map(([name, value, series]) => <Stack direction="row" justifyContent="space-between" gap={3} key={name}><span className={`pp-legend pp-series-${series}`}>{name}</span><b>{value}</b></Stack>) : <Typography color="text.secondary">No data for this period.</Typography>}</Stack></Box>;
}

function PickerLine() {
  return <Box className="analytics-picker-line" aria-hidden="true"><svg viewBox="0 0 240 64" preserveAspectRatio="none"><path d="M0 48 C18 42 26 51 42 45 S66 20 84 35 S106 57 124 39 S150 22 168 35 S190 44 207 20 S224 38 240 26 L240 64 L0 64 Z" /><path className="line" d="M0 48 C18 42 26 51 42 45 S66 20 84 35 S106 57 124 39 S150 22 168 35 S190 44 207 20 S224 38 240 26" /></svg></Box>;
}

function PickerLocations() {
  const rows: Array<[string, string, string]> = [["🇺🇸 United States", "54%", "54%"], ["🇬🇧 United Kingdom", "21%", "21%"], ["🇮🇳 India", "15%", "15%"], ["🇮🇩 Indonesia", "10%", "10%"]];
  return <Box className="analytics-widget-body analytics-country-layout"><WorldMap rows={[{ label: "United States", count: 54 }, { label: "United Kingdom", count: 21 }, { label: "India", count: 15 }, { label: "Indonesia", count: 10 }]} /><Box className="analytics-picker-location-list">{rows.map(([label, value, share]) => <Box key={label}><Stack direction="row" justifyContent="space-between" gap={1}><span>{label}</span><b>{value}</b></Stack><Box className="analytics-meter-track"><i style={{ width: share }} /></Box></Box>)}</Box></Box>;
}

function PickerPreview({ config }: { config: WidgetConfig }) {
  switch (config.id) {
    case "reachable_audience": return <Box className="analytics-widget-body"><Headline value="42,320" trend="Users contactable by email or push" /><Meters rows={[["Email only", "18,420", "44%"], ["Push only", "12,860", "30%"], ["Both channels", "11,040", "26%"]]} /></Box>;
    case "channel_performance": return <Donut variant="channels" total="86.5%" caption="delivered" rows={[["Email", "64.2%", 1], ["Push", "22.3%", 2]]} shares={[64.2, 22.3]} />;
    case "retention_pulse": return <Box className="analytics-widget-body"><Headline value="+8.7%" trend="↗ 8.7% vs last period" /><Bars heights={[25, 32, 29, 42, 37, 51, 48, 61]} /></Box>;
    case "lifecycle_health": return <Box className="analytics-widget-body"><Headline value="4 stages" trend="Users by lifecycle stage" /><Meters rows={[["New", "8,240", "32%"], ["Activated", "6,180", "24%"], ["Engaged", "7,450", "29%"], ["At risk", "3,120", "12%"]]} /></Box>;
    case "top_campaigns": return <Rows rows={[["Spring reactivation", "42.8%"], ["Product education", "36.4%"], ["Weekly digest", "29.1%"]]} />;
    case "live_activity": return <Rows rows={[["purchase_completed", "1,284"], ["session_started", "982"], ["onboarding_done", "641"]]} />;
    case "churn_risk": return <Box className="analytics-widget-body"><Headline value="5,215" trend="Users inactive for 14+ days" warn /><Bars heights={[28, 32, 36, 35, 45, 49, 55, 62]} /></Box>;
    case "journey_performance": return <Box className="analytics-widget-body"><Headline value="68.4%" trend="↗ 12.4% vs last period" /><Bars heights={[34, 42, 38, 55, 47, 64, 60, 78]} /></Box>;
    case "sessions_overview": return <Box className="analytics-widget-body"><Headline value="388" trend="↗ 12% vs last period" aside={<Chip size="small" label="Last 7 days" />} /><PickerLine /></Box>;
    case "most_active_users": return <Box className="analytics-widget-body"><Headline value="1,684" trend="↗ 12% active users" /><Bars heights={[38, 49, 26, 42, 55, 82, 46]} peak={5} /></Box>;
    case "top_locations": return <PickerLocations />;
    case "sessions_by_devices": return <Donut variant="devices" total="5,388" caption="sessions" rows={[["Desktop", "4,089", 1], ["Mobile", "1,149", 2], ["Tablet", "150", 3]]} shares={[4089, 1149, 150]} />;
    default: return <Box className="analytics-widget-body"><Headline value={config.preview} trend="Preview" /><Bars heights={[24, 34, 28, 42, 36, 50, 44, 58]} /></Box>;
  }
}

const countryCoordinates: Record<string, { lon: number; lat: number }> = {
  "United States": { lon: -98, lat: 39 },
  "United Kingdom": { lon: -2, lat: 54 },
  India: { lon: 79, lat: 22 },
  Indonesia: { lon: 113, lat: -2 },
  Canada: { lon: -106, lat: 56 },
  Australia: { lon: 134, lat: -25 },
  Brazil: { lon: -51, lat: -10 },
  Germany: { lon: 10, lat: 51 },
  France: { lon: 2, lat: 46 },
  Japan: { lon: 138, lat: 36 },
};

/**
 * A real world map: public/world-land.svg is Natural Earth's 1:110m land (public domain) on a plain
 * longitude/latitude grid from 84°N to 58°S, used as a CSS mask so the land takes a token colour. A
 * marker is placed from its longitude and latitude on the same grid and grows with its share.
 */
function WorldMap({ rows }: { rows: Array<Record<string, unknown>> }) {
  const markers = rows.map((row) => {
    const label = textData(row.label);
    const position = countryCoordinates[label];
    return position ? { label, count: numberData(row.count), ...position } : null;
  }).filter((marker): marker is { label: string; count: number; lon: number; lat: number } => Boolean(marker));
  return <Box className="analytics-country-map" role="img" aria-label={`World map of users by country: ${rows.map((row) => `${textData(row.label)} ${whole.format(numberData(row.count))}`).join(", ")}`}><Box className="analytics-world"><i className="analytics-world-land" />{markers.map(({ label, count, lon, lat }) => <i className="analytics-world-dot" key={label} style={{ left: `${((lon + 180) / 360) * 100}%`, top: `${((84 - lat) / 142) * 100}%`, width: 8 + Math.min(16, count / 10), height: 8 + Math.min(16, count / 10) }} />)}</Box></Box>;
}

const objectData = (data: unknown): Record<string, unknown> => data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
const arrayData = (data: unknown): Array<Record<string, unknown>> => Array.isArray(data) ? data.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item))) : [];
const numberData = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const textData = (value: unknown, fallback = "Unknown") => typeof value === "string" && value.trim() ? value : fallback;
const displayData = (value: unknown) => typeof value === "number" ? whole.format(numberData(value)) : textData(value, "Not available");

function WidgetPreview({ config, data, compact = false }: { config: WidgetConfig; data?: unknown; compact?: boolean }) {
  // Picker previews are illustrative; once added, the card below is always rendered from the API payload.
  if (compact) return <Box className="analytics-picker-preview-match" aria-hidden="true"><PickerPreview config={config} /></Box>;
  const payload = objectData(data);
  const rows = arrayData(data);
  switch (config.id) {
    case "reachable_audience": return <Box className="analytics-widget-body"><Headline value={whole.format(numberData(payload.reachable))} trend={`${whole.format(numberData(payload.total))} total users`} /><Meters rows={[["Email only", whole.format(numberData(payload.emailOnly))], ["Push only", whole.format(numberData(payload.pushOnly))], ["Both", whole.format(numberData(payload.both))]]} /></Box>;
    case "channel_performance": { const email = objectData(payload.email); const push = objectData(payload.push); const emailSent = numberData(email.sent); const pushSent = numberData(push.sent); const total = emailSent + pushSent; return <Donut variant="channels" total={whole.format(total)} caption="messages" rows={[["Email", whole.format(emailSent), 1], ["Push", whole.format(pushSent), 2]]} shares={[emailSent, pushSent]} />; }
    case "retention_pulse": { if (!rows.length) return <Rows rows={[]} />; const latest = rows.at(-1) ?? {}; return <Box className="analytics-widget-body"><Headline value={percent(numberData(latest.day7))} trend={`${rows.length} retention cohorts`} /><Bars heights={rows.slice(-8).map((row) => Math.max(8, Math.min(100, numberData(row.day7))))} /></Box>; }
    case "lifecycle_health": return <Box className="analytics-widget-body"><Meters rows={rows.slice(0, 5).map((row) => [textData(row.name), whole.format(numberData(row.users))])} /></Box>;
    case "top_campaigns": return <Rows rows={rows.slice(0, 4).map((row) => [textData(row.name), percent(numberData(row.engagementRate))])} />;
    case "live_activity": return <Rows rows={rows.slice(0, 4).map((row) => [textData(row.name), whole.format(numberData(row.count))])} />;
    case "churn_risk": { const signals = arrayData(payload.signals); if (!signals.length && !Object.keys(payload).length) return <Rows rows={[]} />; return <Box className="analytics-widget-body"><Headline value={whole.format(numberData(payload.atRisk))} trend={`${whole.format(numberData(payload.inactive14d))} inactive for 14+ days`} warn /><Bars heights={signals.map((row) => Math.max(8, Math.min(100, numberData(row.users))))} /></Box>; }
    case "journey_performance": { const journeys = arrayData(payload.items); return <Rows rows={journeys.slice(0, 4).map((row) => [textData(row.name), percent(numberData(row.completionRate))])} />; }
    case "sessions_overview": return <Box className="analytics-widget-body"><Headline value={whole.format(numberData(payload.sessions))} trend={`${whole.format(numberData(payload.activeUsers))} active users`} /><Bars heights={[numberData(payload.events), numberData(payload.sessions), numberData(payload.activeUsers)].map((value) => Math.max(8, Math.min(100, value)))} /></Box>;
    case "most_active_users": return <Rows rows={rows.slice(0, 4).map((row) => [textData(row.id), `${whole.format(numberData(row.sessions))} sessions`])} />;
    case "top_locations": return <Box className="analytics-widget-body analytics-country-layout"><WorldMap rows={rows.slice(0, 4)} /><Meters rows={rows.slice(0, 4).map((row) => [textData(row.label), whole.format(numberData(row.count))])} /></Box>;
    case "sessions_by_devices": { const deviceRows = rows.slice(0, 3); const counts = deviceRows.map((row) => numberData(row.count)); return <Donut variant="devices" total={whole.format(counts.reduce((sum, count) => sum + count, 0))} caption="sessions" rows={deviceRows.map((row, index) => [textData(row.label), whole.format(numberData(row.count)), (index + 1) as 1 | 2 | 3])} shares={counts} />; }
    default: { const genericRows = rows.length ? rows.slice(0, 5).map((row) => { const [key, value] = Object.entries(row).find(([, item]) => typeof item === "number" || typeof item === "string") ?? ["Data", "0"]; return [textData(key, "Data"), displayData(value)] as [string, string]; }) : Object.entries(payload).filter(([, value]) => typeof value === "number" || typeof value === "string").slice(0, 5).map(([key, value]) => [key, displayData(value)] as [string, string]); return <Rows rows={genericRows} />; }
  }
}

function WidgetCard({ config, data, onRemove, removing }: { config: WidgetConfig; data: unknown; onRemove: () => void; removing: boolean }) {
  const Icon = config.icon;
  return <Card className="analytics-widget-card"><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Stack direction="row" alignItems="center" gap={1.25}><Box className="analytics-widget-icon"><Icon fontSize="small" /></Box><Box><Typography className="analytics-widget-title">{config.title}</Typography><Typography className="analytics-widget-description">{config.description}</Typography></Box></Stack><IconButton className="analytics-widget-remove" size="small" onClick={onRemove} disabled={removing} aria-label={`Remove ${config.title}`}><CloseRounded fontSize="small" /></IconButton></Stack><WidgetPreview config={config} data={data} /></Card>;
}

const RANGES: RangeDays[] = [7, 30, 90];
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const percent = (value: number) => `${numberData(value).toFixed(1)}%`;
const analyticsDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
// The arrow carries the direction; the colour only repeats it.
const deltaIcon = { up: <ArrowUpwardRounded titleAccess="Up" />, down: <ArrowDownwardRounded titleAccess="Down" />, flat: <RemoveRounded titleAccess="No change" /> };

const emptyAnalyticsView = (): AnalyticsView => ({
  labels: [],
  kpis: [
    "Reachable users",
    "Email sends",
    "Push sends",
    "Email open rate",
    "Push click rate",
    "Events received",
  ].map((label) => ({ label, value: "0", delta: "No previous data", direction: "flat", spark: [] })),
  sends: { email: [], push: [] },
  engagement: { email: [], push: [] },
  channels: [
    { name: "Email", sent: 0, rates: [{ label: "Delivered", value: 0 }, { label: "Open rate", value: 0 }] },
    { name: "Push", sent: 0, rates: [{ label: "Delivered", value: 0 }, { label: "Click rate", value: 0 }] },
  ],
  campaigns: [],
});

function changeDirection(change: number | null | undefined): Kpi["direction"] {
  if (change === null || change === undefined || !Number.isFinite(change) || change === 0) return "flat";
  return change > 0 ? "up" : "down";
}

function changeText(change: number | null | undefined, points = false) {
  if (change === null || change === undefined || !Number.isFinite(change)) return "No previous data";
  return `${Math.abs(change).toFixed(1)}${points ? " pts" : "%"}`;
}

function analyticsViewFromApi(overview: AnalyticsOverview | null, campaigns: AnalyticsCampaigns | null): AnalyticsView {
  if (!overview) return emptyAnalyticsView();
  const summary = overview.summary;
  const series = overview.sendsOverTime.series.map((row) => ({
    bucket: row.bucket,
    emailSends: numberData(row.emailSends),
    pushSends: numberData(row.pushSends),
    emailOpenRate: numberData(row.emailOpenRate),
    pushClickRate: numberData(row.pushClickRate),
    events: numberData(row.events),
  }));
  const labels = series.map((row) => analyticsDay.format(new Date(row.bucket)));
  const spark = (values: number[]) => values.length ? values.map(numberData) : [0];
  const kpi = (label: string, value: number, change: number | null | undefined, values: number[], points = false): Kpi => ({
    label,
    value: points ? percent(numberData(value)) : numberData(value) >= 1e6 ? short.format(numberData(value)) : whole.format(numberData(value)),
    delta: changeText(change, points),
    direction: changeDirection(change),
    spark: spark(values),
  });

  return {
    labels,
    kpis: [
      kpi("Reachable users", summary.reachableUsers.value, summary.reachableUsers.changePercent, series.map(() => summary.reachableUsers.value)),
      kpi("Email sends", summary.emailSends.value, summary.emailSends.changePercent, series.map((row) => row.emailSends)),
      kpi("Push sends", summary.pushSends.value, summary.pushSends.changePercent, series.map((row) => row.pushSends)),
      kpi("Email open rate", summary.emailOpenRate.value, summary.emailOpenRate.changePoints, series.map((row) => row.emailOpenRate), true),
      kpi("Push click rate", summary.pushClickRate.value, summary.pushClickRate.changePoints, series.map((row) => row.pushClickRate), true),
      kpi("Events received", summary.eventsReceived.value, summary.eventsReceived.changePercent, series.map((row) => row.events)),
    ],
    sends: { email: series.map((row) => row.emailSends), push: series.map((row) => row.pushSends) },
    engagement: { email: series.map((row) => row.emailOpenRate), push: series.map((row) => row.pushClickRate) },
    channels: [
      {
        name: "Email",
        sent: numberData(overview.channelPerformance.email.sent),
        rates: [
          { label: "Delivered", value: numberData(overview.channelPerformance.email.deliveryRate) },
          { label: "Open rate", value: numberData(overview.channelPerformance.email.openRate) },
        ],
      },
      {
        name: "Push",
        sent: numberData(overview.channelPerformance.push.sent),
        rates: [
          { label: "Delivered", value: numberData(overview.channelPerformance.push.deliveryRate) },
          { label: "Click rate", value: numberData(overview.channelPerformance.push.clickRate) },
        ],
      },
    ],
    campaigns: (campaigns?.items ?? []).map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      channel: campaign.channel === "email" ? "Email" : "Push",
      sent: numberData(campaign.sent),
      rate: numberData(campaign.channel === "email" ? campaign.openRate : campaign.clickRate),
    })),
  };
}

function KpiCard({ kpi, range, loading }: { kpi: Kpi; range: RangeDays; loading: boolean }) {
  return (
    <Card className="pp-stat">
      <Typography variant="body2" color="text.secondary">{kpi.label}</Typography>
      <Box className="pp-stat-row">
        {loading ? <Skeleton variant="rounded" width={112} height={36} /> : <span className="pp-stat-value">{kpi.value}</span>}
        {loading ? <Skeleton variant="rounded" width={96} height={32} /> : <Sparkline values={kpi.spark} />}
      </Box>
      {loading ? <Skeleton variant="rounded" width={168} height={18} /> : <p className={`pp-stat-delta is-${kpi.direction}`}>{deltaIcon[kpi.direction]}<b>{kpi.delta}</b> vs previous {range} days</p>}
    </Card>
  );
}

const dateTime = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
const displayCount = (value: unknown) => whole.format(numberData(value));
const displayDate = (value: string | null | undefined) => value ? dateTime.format(new Date(value)) : "Not available";

function DeliveryHistoryTable({ email, rows }: { email: boolean; rows: Array<AnalyticsEmailDelivery | AnalyticsPushDelivery> }) {
  return <Box className="reusable-table-wrap"><Table size="small"><TableHead><TableRow><TableCell>Recipient</TableCell><TableCell>Status</TableCell><TableCell>Sent</TableCell><TableCell>Engagement</TableCell></TableRow></TableHead><TableBody>{rows.length ? rows.slice(0, 10).map((row) => {
    const emailRow = email ? row as AnalyticsEmailDelivery : null;
    const pushRow = email ? null : row as AnalyticsPushDelivery;
    return <TableRow hover key={row.id}><TableCell>{emailRow?.toEmail ?? pushRow?.user?.email ?? pushRow?.user?.name ?? "Anonymous user"}</TableCell><TableCell><Chip size="small" label={row.status || "Unknown"} /></TableCell><TableCell>{displayDate(row.sentAt)}</TableCell><TableCell>{emailRow ? `${emailRow.openCount} opens · ${emailRow.clickCount} clicks` : `${displayCount(pushRow?.deliveredCount)} delivered${pushRow?.openedAt ? " · opened" : ""}`}</TableCell></TableRow>;
  }) : <TableRow><TableCell colSpan={4}><Typography color="text.secondary">No delivery records for this period.</Typography></TableCell></TableRow>}</TableBody></Table></Box>;
}

function AnalyticsSupportingData({ projectId, range }: { projectId: string; range: RangeDays }) {
  const [reachability, setReachability] = useState<AnalyticsReachability | null>(null);
  const [activity, setActivity] = useState<AnalyticsActivity | null>(null);
  const [lifecycle, setLifecycle] = useState<AnalyticsLifecycle | null>(null);
  const [demographics, setDemographics] = useState<AnalyticsDemographics | null>(null);
  const [emailDeliveries, setEmailDeliveries] = useState<AnalyticsDeliveryPage<AnalyticsEmailDelivery> | null>(null);
  const [pushDeliveries, setPushDeliveries] = useState<AnalyticsDeliveryPage<AnalyticsPushDelivery> | null>(null);
  const [journeys, setJourneys] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState("");
  const [journeyActivity, setJourneyActivity] = useState<AnalyticsJourneyActivity | null>(null);
  const [deliveryTab, setDeliveryTab] = useState<"email" | "push">("email");
  const [loading, setLoading] = useState(true);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.reachability(projectId, range),
      analyticsApi.activity(projectId, range),
      analyticsApi.lifecycle(projectId, range),
      analyticsApi.demographics(projectId, range),
      analyticsApi.emailDeliveries(projectId),
      analyticsApi.pushDeliveries(projectId),
      journeysApi.list(projectId, { page: 1, limit: 50 }),
    ]).then(([nextReachability, nextActivity, nextLifecycle, nextDemographics, nextEmail, nextPush, nextJourneys]) => {
      if (cancelled) return;
      setReachability(nextReachability);
      setActivity(nextActivity);
      setLifecycle(nextLifecycle);
      setDemographics(nextDemographics);
      setEmailDeliveries(nextEmail);
      setPushDeliveries(nextPush);
      const journeyOptions = nextJourneys.items.map((journey) => ({ id: journey.id, name: journey.name }));
      setJourneys(journeyOptions);
      setSelectedJourneyId((current) => current && journeyOptions.some((journey) => journey.id === current) ? current : journeyOptions[0]?.id ?? "");
    }).catch(() => {
      if (!cancelled) setError("Some supporting analytics could not be loaded. Please try again.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId, range]);

  useEffect(() => {
    if (!selectedJourneyId) {
      setJourneyActivity(null);
      return;
    }
    let cancelled = false;
    setJourneyLoading(true);
    setError(null);
    analyticsApi.journeyActivity(projectId, selectedJourneyId, { page: 1, limit: 10 }).then((result) => {
      if (!cancelled) setJourneyActivity(result);
    }).catch(() => {
      if (!cancelled) setError("Journey activity could not be loaded. Please try again.");
    }).finally(() => {
      if (!cancelled) setJourneyLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId, selectedJourneyId]);

  if (loading) return <Stack gap={2}><Skeleton variant="rounded" height={180} /><Skeleton variant="rounded" height={220} /></Stack>;
  const demographicGroups: Array<[string, Array<{ label: string; count: number }> | undefined]> = [
    ["Countries", demographics?.countries],
    ["Platforms", demographics?.platforms],
    ["Devices", demographics?.devices],
    ["App versions", demographics?.appVersions],
  ];

  return <Stack gap={2}>
    {error && <Typography color="error" role="alert">{error}</Typography>}
    <Box className="pp-panel-grid">
      <Card className="pp-panel"><Box><Typography variant="h3">Reachability and activity</Typography><Typography variant="body2" color="text.secondary">Live audience contactability and project activity.</Typography></Box><Box className="analytics-detail-metrics">{[
        ["Reachable users", reachability?.reachable], ["Email only", reachability?.emailOnly], ["Push only", reachability?.pushOnly], ["Both channels", reachability?.both], ["Active users", activity?.totals.activeUsers], ["Sessions", activity?.totals.sessions], ["Events", activity?.totals.events],
      ].map(([label, value]) => <Box key={label as string}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h3">{displayCount(value)}</Typography></Box>)}</Box></Card>
      <Card className="pp-panel"><Box><Typography variant="h3">Lifecycle and retention</Typography><Typography variant="body2" color="text.secondary">Current stages and cohort retention.</Typography></Box>{lifecycle?.stages.length ? <Meters rows={lifecycle.stages.slice(0, 5).map((stage) => [stage.name, displayCount(stage.users)])} /> : <Typography color="text.secondary">No lifecycle data for this period.</Typography>}<Typography variant="body2" color="text.secondary">Churn risk: {displayCount(lifecycle?.churn.atRisk)} · Inactive 14+ days: {displayCount(lifecycle?.churn.inactive14d)}</Typography></Card>
    </Box>
    <Card className="pp-panel"><Box><Typography variant="h3">Geography and devices</Typography><Typography variant="body2" color="text.secondary">Privacy-safe breakdowns from the demographics API.</Typography></Box><Box className="pp-panel-grid">{demographicGroups.map(([label, values]) => <Box key={label}><Typography variant="body2" fontWeight={600}>{label}</Typography><Rows rows={values?.slice(0, 5).map((row) => [row.label, displayCount(row.count)]) ?? []} /></Box>)}</Box></Card>
    <Card className="pp-panel"><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Delivery history</Typography><Typography variant="body2" color="text.secondary">Recent email and push delivery records.</Typography></Box><SegmentedTabs value={deliveryTab} options={[{ value: "email", label: "Email" }, { value: "push", label: "Push" }]} onChange={setDeliveryTab} ariaLabel="Delivery channel" /></Stack><DeliveryHistoryTable email={deliveryTab === "email"} rows={deliveryTab === "email" ? emailDeliveries?.items ?? [] : pushDeliveries?.items ?? []} /></Card>
    <Card className="pp-panel"><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Journey activity</Typography><Typography variant="body2" color="text.secondary">Entries, exits, steps, and engagement from the selected journey.</Typography></Box><Select size="small" value={selectedJourneyId} onChange={(event) => setSelectedJourneyId(event.target.value)} displayEmpty aria-label="Select journey" disabled={!journeys.length}><MenuItem value="">No journeys available</MenuItem>{journeys.map((journey) => <MenuItem value={journey.id} key={journey.id}>{journey.name}</MenuItem>)}</Select></Stack>{journeyLoading ? <Skeleton variant="rounded" height={120} /> : journeyActivity ? <><Box className="analytics-detail-metrics">{[["Entered", journeyActivity.metrics.entered], ["Active", journeyActivity.metrics.active], ["Completed", journeyActivity.metrics.completed], ["Exited", journeyActivity.metrics.exited]].map(([label, value]) => <Box key={label as string}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography variant="h3">{displayCount(value)}</Typography></Box>)}</Box><Rows rows={journeyActivity.items.slice(0, 5).map((item) => [item.title || item.type, displayDate(item.occurredAt)])} /></> : <Typography color="text.secondary">No journey activity for this project.</Typography>}</Card>
  </Stack>;
}

export default function AnalyticsWidgetsSection() {
  const { active: project, isPending: loading } = useActiveProject();
  const { account } = useCurrentUser();
  const firstName = accountGreetingName(account);
  const [range, setRange] = useState<RangeDays>(30);
  const [metric, setMetric] = useState<"sends" | "engagement">("sends");
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [campaigns, setCampaigns] = useState<AnalyticsCampaigns | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [selectedWidgets, setSelectedWidgets] = useState<AnalyticsWidgetId[]>([]);
  const [widgetPreference, setWidgetPreference] = useState<AnalyticsWidgetPreference | null>(null);
  const [widgetsLoading, setWidgetsLoading] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [savingWidget, setSavingWidget] = useState<AnalyticsWidgetId | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const data = useMemo(() => analyticsViewFromApi(overview, campaigns), [overview, campaigns]);
  const pageLoading = loading || overviewLoading;
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    setOverviewLoading(true);
    setWidgetError(null);
    Promise.all([analyticsApi.overview(project.id, range), analyticsApi.campaigns(project.id, range)]).then(([nextOverview, nextCampaigns]) => {
      if (cancelled) return;
      setOverview(nextOverview);
      setCampaigns(nextCampaigns);
    }).catch(() => {
      if (!cancelled) setWidgetError("Analytics data could not be loaded. Please try again.");
    }).finally(() => {
      if (!cancelled) setOverviewLoading(false);
    });
    return () => { cancelled = true; };
  }, [project?.id, range]);
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    setWidgetsLoading(true);
    setWidgetError(null);
    analyticsApi.widgets(project.id, range).then((preference) => {
      if (cancelled) return;
      setWidgetPreference(preference);
      setSelectedWidgets(preference.selected);
    }).catch(() => {
      if (!cancelled) setWidgetError("Analytics widgets could not be loaded. Please try again.");
    }).finally(() => {
      if (!cancelled) setWidgetsLoading(false);
    });
    return () => { cancelled = true; };
  }, [project?.id, range]);
  const addWidget = (id: AnalyticsWidgetId) => {
    if (!project?.id || selectedWidgets.includes(id) || savingWidget) return;
    const selected = [...selectedWidgets, id];
    setSavingWidget(id);
    setWidgetError(null);
    analyticsApi.updateWidgets(project.id, { selected }, range).then((preference) => {
      setWidgetPreference(preference);
      setSelectedWidgets(preference.selected);
      setPickerOpen(false);
    }).catch(() => setWidgetError("The widget could not be added. Please try again.")).finally(() => setSavingWidget(null));
  };
  const removeWidget = (id: AnalyticsWidgetId) => {
    if (!project?.id || savingWidget) return;
    setSavingWidget(id);
    setWidgetError(null);
    analyticsApi.removeWidget(project.id, id, range).then((preference) => {
      setWidgetPreference(preference);
      setSelectedWidgets(preference.selected);
    }).catch(() => setWidgetError("The widget could not be removed. Please try again.")).finally(() => setSavingWidget(null));
  };
  const availableWidgetIds = widgetPreference?.available?.length ? widgetPreference.available : widgetCatalog.map((item) => item.id);
  const pickerWidgets = availableWidgetIds.map(widgetConfig);
  const widgets = selectedWidgets.map(widgetConfig);
  const widgetData = new Map((widgetPreference?.widgets ?? []).map((item) => [item.id, item.data]));
  const sends = metric === "sends";
  const metricsUp = data.kpis.filter((kpi) => kpi.direction === "up").length;
  // The API already returns weekly buckets for a 90-day period, so preserve its point/label alignment.
  const weekly = range === 90;
  const plot = (values: number[]) => values;
  const chartLabels = data.labels;
  const labelPrefix = weekly ? "Week of " : "";
  const chartValues = sends ? [...data.sends.email, ...data.sends.push] : [...data.engagement.email, ...data.engagement.push];
  const hasChartData = chartValues.some((value) => Number.isFinite(value) && value > 0);

  const exportAnalytics = async () => {
    if (!project?.id || exporting) return;
    setExporting(true);
    setExportStatus(null);
    try {
      const payload = await analyticsApi.exportJson(project.id, range);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pixlpush-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportStatus("Analytics export downloaded.");
    } catch {
      setExportStatus("Analytics export could not be downloaded.");
    } finally {
      setExporting(false);
    }
  };

  const action = (
    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
      <SegmentedTabs value={range} options={RANGES.map((days) => ({ value: days, label: `${days}d`, ariaLabel: `Last ${days} days` }))} onChange={setRange} ariaLabel="Date range" className="pp-segmented-tabs-wide" />
      <Button variant="outlined" startIcon={<DownloadRounded />} onClick={exportAnalytics} disabled={!project?.id || exporting}>{exporting ? "Exporting…" : "Export"}</Button>
    </Stack>
  );

  return (
    <DashboardFrame requiresProject active="Analytics" title="Analytics" description="Understand what is happening across your users, campaigns and retention motion." action={action}>
      <Stack gap={3}>
        <Card className="pp-hero-card">
          <Box sx={{ minWidth: 0 }}>
            <p className="pp-hero-eyebrow">Live project health{project && ` · ${project.name}`}</p>
            {/* The hour comes from the viewer's clock, so the server and the browser may disagree on it. */}
            <Typography component="h2" className="pp-hero-title" suppressHydrationWarning>{greeting()}{firstName && `, ${firstName}`}.</Typography>
            <p className="pp-hero-text">{pageLoading ? <Skeleton width={320} /> : `${metricsUp} of your ${data.kpis.length} key metrics are up on the previous ${range} days.`}</p>
          </Box>
        </Card>

        <Box className="pp-kpi-grid">{data.kpis.map((kpi) => <KpiCard kpi={kpi} range={range} loading={pageLoading} key={kpi.label} />)}</Box>

        <Card className="pp-panel">
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
            <Box>
              <Typography variant="h3">{sends ? "Sends over time" : "Engagement over time"}</Typography>
              <Typography variant="body2" color="text.secondary">{sends ? "Messages sent per day" : "Daily open and click rate"}{weekly ? ", averaged by week" : ""}, last {range} days</Typography>
            </Box>
            {/* The theme leaves 16px under a tab bar for the panel below it; here it shares a row with the title. */}
            <SegmentedTabs value={metric} options={[{ value: "sends", label: "Sends" }, { value: "engagement", label: "Engagement" }]} onChange={setMetric} ariaLabel="Chart metric" />
          </Stack>
          {pageLoading ? <Skeleton variant="rounded" className="pp-chart-skeleton" /> : !hasChartData
            ? <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>No analytics activity for this period.</Typography>
            : sends
            ? <TrendChart labels={chartLabels} labelPrefix={labelPrefix} series={[{ name: "Email sends", values: plot(data.sends.email) }, { name: "Push sends", values: plot(data.sends.push) }]} formatTick={short.format} formatValue={whole.format} />
            : <TrendChart labels={chartLabels} labelPrefix={labelPrefix} series={[{ name: "Email open rate", values: plot(data.engagement.email) }, { name: "Push click rate", values: plot(data.engagement.push) }]} formatTick={(value) => `${value}%`} formatValue={percent} />}
        </Card>

        <Box className="pp-panel-grid">
          <Card className="pp-panel">
            <Box>
              <Typography variant="h3">Channel performance</Typography>
              <Typography variant="body2" color="text.secondary">Email and push, last {range} days</Typography>
            </Box>
            {data.channels.map((channel, i) => (
              <Box className="pp-channel" key={channel.name}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
                  <span className={`pp-legend pp-series-${i + 1}`}>{channel.name}</span>
                  <Typography variant="body2" color="text.secondary" className="pp-num">{pageLoading ? <Skeleton width={88} /> : <><b>{whole.format(channel.sent)}</b> sent</>}</Typography>
                </Stack>
                {channel.rates.map((rate) => (
                  <Box key={rate.label}>
                    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">{rate.label}</Typography>
                      <Typography variant="caption" className="pp-num">{pageLoading ? <Skeleton width={36} /> : percent(rate.value)}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={pageLoading ? 0 : rate.value} aria-label={`${channel.name} ${rate.label.toLowerCase()}`} />
                  </Box>
                ))}
              </Box>
            ))}
          </Card>

          <Card className="pp-panel">
            <Box>
              <Typography variant="h3">Top campaigns</Typography>
              <Typography variant="body2" color="text.secondary">By messages sent, last {range} days</Typography>
            </Box>
            <Box className="reusable-table-wrap">
              <Table size="small">
                <TableHead><TableRow><TableCell>Campaign</TableCell><TableCell>Channel</TableCell><TableCell align="right">Sent</TableCell><TableCell align="right">Open / click rate</TableCell></TableRow></TableHead>
                <TableBody>
                  {data.campaigns.length ? data.campaigns.map((campaign) => (
                    <TableRow hover key={campaign.id}>
                      <TableCell>{pageLoading ? <Skeleton width="70%" /> : campaign.name}</TableCell>
                      <TableCell>{pageLoading ? <Skeleton width={44} /> : <Chip size="small" label={campaign.channel} />}</TableCell>
                      <TableCell align="right">{pageLoading ? <Skeleton width={44} sx={{ ml: "auto" }} /> : whole.format(campaign.sent)}</TableCell>
                      <TableCell align="right">{pageLoading ? <Skeleton width={36} sx={{ ml: "auto" }} /> : percent(campaign.rate)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Box className="analytics-table-empty" role="status">
                          <Typography color="text.secondary">No campaigns for this period.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Box>

        <Stack gap={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h2">Custom widgets</Typography>
              {widgets.length > 0 && <Chip size="small" label={`${widgets.length} added`} />}
            </Stack>
            <Button variant="contained" startIcon={<AddRounded />} onClick={() => setPickerOpen(true)}>Add widget</Button>
          </Stack>
          {widgetError && <Typography color="error" role="alert">{widgetError}</Typography>}
          {widgetsLoading && selectedWidgets.length === 0
            ? <Card><Stack p={3} gap={1}><Skeleton width="40%" /><Skeleton width="80%" /><Skeleton width="100%" height={96} /></Stack></Card>
            : widgets.length === 0
            ? <Card><EmptyState size="compact" icon={<WidgetsOutlined />} title="No custom widgets yet" description="Add the signals your team wants to keep an eye on." /></Card>
            : <Box className="analytics-widget-grid">
              {widgets.map((config) => <WidgetCard config={config} data={widgetData.get(config.id)} removing={savingWidget === config.id} onRemove={() => removeWidget(config.id)} key={config.id} />)}
              <ButtonBase className="analytics-add-widget-card" onClick={() => setPickerOpen(true)} aria-label="Add another widget">
                <Box className="analytics-add-widget-icon"><AddRounded /></Box>
                <Typography className="analytics-add-widget-title">Add a widget</Typography>
                <Typography className="analytics-add-widget-description">Choose another signal to add to your dashboard.</Typography>
              </ButtonBase>
            </Box>}
        </Stack>
        {exportStatus && <Typography color={exportStatus.includes("could not") ? "error" : "success.main"} role="status">{exportStatus}</Typography>}
        {project?.id && <AnalyticsSupportingData projectId={project.id} range={range} />}
      </Stack>

      <Dialog open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <Box>Add an analytics widget<Typography component="span" display="block" variant="body2" color="text.secondary">Preview each widget before adding it to your workspace.</Typography></Box>
            <IconButton onClick={() => setPickerOpen(false)} aria-label="Close widget picker"><CloseRounded /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5}>
            {pickerWidgets.map((item) => {
              const Icon = item.icon;
              const added = selectedWidgets.includes(item.id);
              return (
                <Grid item xs={12} sm={6} key={item.id}>
                  <Box component="button" className="analytics-picker-option" onClick={() => addWidget(item.id)} disabled={added || Boolean(savingWidget)}>
                    <span className="analytics-picker-head">
                      <span className="analytics-picker-icon"><Icon fontSize="small" /></span>
                      <span className="analytics-picker-text"><strong>{item.title}</strong><span>{item.description}</span></span>
                      <Chip label={added ? "Added" : "Add"} size="small" color={added ? "success" : "primary"} />
                    </span>
                    <WidgetPreview config={item} compact />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={() => setPickerOpen(false)}>Done</Button></DialogActions>
      </Dialog>
    </DashboardFrame>
  );
}
