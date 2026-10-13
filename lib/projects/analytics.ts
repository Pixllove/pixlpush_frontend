import { authRequest } from "@/lib/auth/client";

const BASE = "/api/projects";

const at = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}/analytics${path}`;
const projectAt = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}${path}`;

export type AnalyticsRange = 7 | 30 | 90;
export type AnalyticsKnownWidgetId =
  | "reachable_audience"
  | "channel_performance"
  | "retention_pulse"
  | "lifecycle_health"
  | "top_campaigns"
  | "live_activity"
  | "churn_risk"
  | "journey_performance"
  | "sessions_overview"
  | "most_active_users"
  | "top_locations"
  | "sessions_by_devices";
/** Backend may add a widget id before the frontend has a specialized renderer. */
export type AnalyticsWidgetId = AnalyticsKnownWidgetId | (string & {});

export interface AnalyticsPeriod {
  days: number;
  bucket: "day" | "week";
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
}

export type AnalyticsPeriodInput =
  | AnalyticsRange
  | { range?: AnalyticsRange; from?: string; to?: string };

export interface AnalyticsWidgetPreference {
  selected: AnalyticsWidgetId[];
  layout: Array<{ id: AnalyticsWidgetId; x: number; y: number; w: number; h: number }>;
  available: AnalyticsWidgetId[];
  widgets: Array<{ id: AnalyticsWidgetId; data: unknown }>;
  updatedAt: string | null;
}

export interface AnalyticsOverview {
  period: AnalyticsPeriod;
  health: { messagesSent: number; deliveredRate: number; metricsTrendingUp: number; metricsTotal: number };
  summary: {
    reachableUsers: { value: number; changePercent: number | null };
    emailSends: { value: number; changePercent: number | null };
    pushSends: { value: number; changePercent: number | null };
    emailOpenRate: { value: number; changePoints: number };
    pushClickRate: { value: number; changePoints: number };
    eventsReceived: { value: number; changePercent: number | null };
  };
  sendsOverTime: { series: Array<{ bucket: string; emailSends: number; pushSends: number; emailOpenRate: number; pushClickRate: number; events: number }> };
  engagementOverTime: { series: Array<{ bucket: string; emailSends: number; pushSends: number; emailOpenRate: number; pushClickRate: number; events: number }> };
  channelPerformance: { email: { sent: number; deliveryRate: number; openRate: number }; push: { sent: number; deliveryRate: number; clickRate: number } };
}

export interface AnalyticsCampaigns {
  period: AnalyticsPeriod;
  items: Array<{ id: string; name: string; channel: "email" | "push"; sent: number; openRate: number | string; clickRate: number | string; engagementRate: number | string }>;
}

export interface AnalyticsReachability {
  period: AnalyticsPeriod;
  total: number;
  reachable: number;
  emailOnly: number;
  pushOnly: number;
  both: number;
  neither: number;
  channels: Array<{ channel: "email" | "push"; reachable: number; share: number }>;
}

export interface AnalyticsActivity {
  period: AnalyticsPeriod;
  totals: { events: number; activeUsers: number; sessions: number; eventsPerActiveUser: number };
  series: Array<{ bucket: string; events: number; activeUsers: number; sessions: number }>;
  topEvents: Array<{ name: string; count: number }>;
}

export interface AnalyticsLifecycle {
  period: AnalyticsPeriod;
  stages: Array<{ id: string | null; name: string; users: number }>;
  retention: Array<{ cohort: string; users: number; day1: number | string; day7: number | string; day30: number | string }>;
  churn: { atRisk: number; inactive14d: number; inactive30d: number; signals: Array<{ inactiveDays: number; users: number }> };
}

export interface AnalyticsDemographics {
  period: AnalyticsPeriod;
  countries: Array<{ label: string; count: number }>;
  platforms: Array<{ label: string; count: number }>;
  devices: Array<{ label: string; count: number }>;
  appVersions: Array<{ label: string; count: number }>;
}

export interface AnalyticsDeliveryPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AnalyticsEmailDelivery {
  id: string;
  status: string;
  toEmail: string;
  campaignId: string | null;
  stepId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  openCount: number;
  clickedAt: string | null;
  clickCount: number;
  unsubscribedAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  attempts: number;
  lastError: string | null;
  skipReason: string | null;
  createdAt: string;
  user?: { id: string; externalUserId: string | null; email: string | null; name: string | null } | null;
  template?: { id: string; name: string } | null;
  participant?: { journeyId: string } | null;
}

export interface AnalyticsPushDelivery {
  id: string;
  status: string;
  campaignId: string | null;
  stepId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  deliveredCount: number;
  openedAt: string | null;
  createdAt: string;
  user?: { id: string; externalUserId: string | null; email: string | null; name: string | null } | null;
  template?: { id: string; name: string } | null;
  participant?: { journeyId: string } | null;
}

export interface AnalyticsJourneyActivity {
  metrics: {
    entered: number;
    active: number;
    completed: number;
    exited: number;
    failed: number;
    exitReasons: Record<string, number>;
    push: Record<string, number>;
    email: Record<string, number>;
  };
  items: Array<{ id: string; type: string; title: string | null; data: unknown; occurredAt: string; user?: { id: string; externalUserId: string | null; email: string | null } | null }>;
  total: number;
  page: number;
  limit: number;
}

const query = (input: AnalyticsPeriodInput = 30) => {
  const value = typeof input === "number" ? { range: input } : input;
  const params = new URLSearchParams();
  if (value.range !== undefined) params.set("range", String(value.range));
  if (value.from) params.set("from", value.from);
  if (value.to) params.set("to", value.to);
  return `?${params.toString()}`;
};

const pageQuery = (params: { page?: number; limit?: number; status?: string; userId?: string; campaignId?: string; journeyId?: string; type?: string } = {}) => {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 25));
  for (const [key, value] of Object.entries(params)) if (key !== "page" && key !== "limit" && value) query.set(key, String(value));
  return `?${query.toString()}`;
};

export const analyticsApi = {
  overview: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsOverview>(at(projectId, `/overview${query(period)}`), undefined, BASE),
  reachability: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsReachability>(at(projectId, `/reachability${query(period)}`), undefined, BASE),
  activity: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsActivity>(at(projectId, `/activity${query(period)}`), undefined, BASE),
  lifecycle: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsLifecycle>(at(projectId, `/lifecycle${query(period)}`), undefined, BASE),
  campaigns: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsCampaigns>(at(projectId, `/campaigns${query(period)}`), undefined, BASE),
  demographics: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsDemographics>(at(projectId, `/demographics${query(period)}`), undefined, BASE),
  widgets: (projectId: string, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsWidgetPreference>(at(projectId, `/widgets${query(period)}`), undefined, BASE),
  updateWidgets: (
    projectId: string,
    input: { selected?: AnalyticsWidgetId[]; layout?: AnalyticsWidgetPreference["layout"] },
    period: AnalyticsPeriodInput = 30,
  ) => authRequest<AnalyticsWidgetPreference>(at(projectId, `/widgets${query(period)}`), input, BASE, "PATCH"),
  removeWidget: (projectId: string, widgetId: AnalyticsWidgetId, period: AnalyticsPeriodInput = 30) =>
    authRequest<AnalyticsWidgetPreference>(at(projectId, `/widgets/${encodeURIComponent(widgetId)}${query(period)}`), {}, BASE, "DELETE"),
  emailDeliveries: (projectId: string, params: Parameters<typeof pageQuery>[0] = {}) =>
    authRequest<AnalyticsDeliveryPage<AnalyticsEmailDelivery>>(at(projectId, `/email-deliveries${pageQuery(params)}`), undefined, BASE),
  pushDeliveries: (projectId: string, params: Parameters<typeof pageQuery>[0] = {}) =>
    authRequest<AnalyticsDeliveryPage<AnalyticsPushDelivery>>(at(projectId, `/push-deliveries${pageQuery(params)}`), undefined, BASE),
  journeyActivity: (projectId: string, journeyId: string, params: { page?: number; limit?: number; type?: "journey_entered" | "journey_step" | "journey_exited" } = {}) =>
    authRequest<AnalyticsJourneyActivity>(projectAt(projectId, `/journeys/${encodeURIComponent(journeyId)}/activity${pageQuery(params)}`), undefined, BASE),
  exportJson: (projectId: string, period: AnalyticsPeriodInput = 30, sections?: string[]) => {
    const suffix = sections?.length ? `&sections=${encodeURIComponent(sections.join(","))}` : "";
    return authRequest<{ period: AnalyticsPeriod; generatedAt: string; sections: Record<string, unknown> }>(at(projectId, `/export${query(period)}${suffix}`), undefined, BASE);
  },
};
