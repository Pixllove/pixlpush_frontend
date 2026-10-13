"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AddRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  AutoGraphRounded,
  BoltRounded,
  CampaignRounded,
  CloseRounded,
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
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import DashboardFrame from "./DashboardFrame";
import EmptyState from "./EmptyState";
import { greeting } from "./HomeCommandCenter";
import { Sparkline, TrendChart, average, chunks } from "./analytics/Charts";
import { getDemoAnalytics, type Kpi, type RangeDays } from "./analytics/demo-data";

type WidgetConfig = {
  id: string;
  title: string;
  description: string;
  icon: typeof InsightsRounded;
  preview: string;
};

// Demo content: these widgets have no data source yet (see analytics/demo-data.ts for the tab's numbers).
const widgetCatalog: WidgetConfig[] = [
  { id: "audience", title: "Reachable audience", description: "Users contactable through push or email.", icon: GroupsRounded, preview: "42,320" },
  { id: "channels", title: "Channel performance", description: "Compare reach across every channel.", icon: DonutLargeRounded, preview: "86.5%" },
  { id: "retention", title: "Retention pulse", description: "Track returning users over time.", icon: ShowChartRounded, preview: "+8.7%" },
  { id: "lifecycle", title: "Lifecycle health", description: "See where users are in their journey.", icon: PeopleAltRounded, preview: "4 stages" },
  { id: "campaigns", title: "Top campaigns", description: "Campaigns driving the most engagement.", icon: CampaignRounded, preview: "42.8%" },
  { id: "activity", title: "Live activity", description: "Recent events from your project.", icon: BoltRounded, preview: "Live" },
  { id: "churn", title: "Churn risk", description: "Users most likely to become inactive.", icon: WarningAmberRounded, preview: "5,215" },
  { id: "journeys", title: "Journey performance", description: "Monitor active journey conversion.", icon: AutoGraphRounded, preview: "68.4%" },
  { id: "sessions", title: "Sessions overview", description: "Track sessions and daily activity trends.", icon: ShowChartRounded, preview: "388" },
  { id: "activeUsers", title: "Most active users", description: "See the users creating the most sessions.", icon: GroupsRounded, preview: "1,684" },
  { id: "countries", title: "Top locations", description: "Users by country and audience share.", icon: PublicRounded, preview: "54%" },
  { id: "devices", title: "Sessions by devices", description: "Compare desktop, mobile and tablet usage.", icon: DevicesRounded, preview: "5,388" },
];

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
  return <Box className="analytics-meters">{rows.map(([name, value, share = value]) => <Box key={name}><Stack direction="row" justifyContent="space-between" gap={2}><span>{name}</span><b>{value}</b></Stack><Box className="analytics-meter-track"><i style={{ width: share }} /></Box></Box>)}</Box>;
}

function Rows({ rows }: { rows: Array<[name: string, value: string]> }) {
  return <Box className="analytics-widget-body analytics-rows">{rows.map(([name, value]) => <Stack direction="row" justifyContent="space-between" gap={2} key={name}><span>{name}</span><b>{value}</b></Stack>)}</Box>;
}

/** The ring's segments are drawn by `variant` in the design layer, in the same series order as `rows`. */
function Donut({ variant, total, caption, rows }: { variant: "channels" | "devices"; total: string; caption: string; rows: Array<[name: string, value: string, series: 1 | 2 | 3]> }) {
  return <Box className="analytics-widget-body analytics-donut-row"><Box className={`analytics-donut is-${variant}`}><span>{total}<small>{caption}</small></span></Box><Stack gap={1}>{rows.map(([name, value, series]) => <Stack direction="row" justifyContent="space-between" gap={3} key={name}><span className={`pp-legend pp-series-${series}`}>{name}</span><b>{value}</b></Stack>)}</Stack></Box>;
}

// Demo audience shares, with each country's rough centre for the map.
const locations = [
  { flag: "🇺🇸", name: "United States", share: 54, lon: -98, lat: 39 },
  { flag: "🇬🇧", name: "United Kingdom", share: 21, lon: -2, lat: 54 },
  { flag: "🇮🇳", name: "India", share: 15, lon: 79, lat: 22 },
  { flag: "🇮🇩", name: "Indonesia", share: 10, lon: 113, lat: -2 },
];

/**
 * A real world map: public/world-land.svg is Natural Earth's 1:110m land (public domain) on a plain
 * longitude/latitude grid from 84°N to 58°S, used as a CSS mask so the land takes a token colour. A
 * marker is placed from its longitude and latitude on the same grid and grows with its share.
 */
function WorldMap() {
  return <Box className="analytics-country-map" role="img" aria-label={`World map of users by country: ${locations.map(({ name, share }) => `${name} ${share}%`).join(", ")}`}><Box className="analytics-world"><i className="analytics-world-land" />{locations.map(({ name, share, lon, lat }) => <i className="analytics-world-dot" key={name} style={{ left: `${((lon + 180) / 360) * 100}%`, top: `${((84 - lat) / 142) * 100}%`, width: 8 + share / 5, height: 8 + share / 5 }} />)}</Box></Box>;
}

function WidgetPreview({ config, compact = false }: { config: WidgetConfig; compact?: boolean }) {
  // The picker shows the real body, scaled down; it is a picture there, so it is hidden from assistive tech.
  if (compact) return <Box className="analytics-picker-preview-match" aria-hidden="true"><WidgetPreview config={config} /></Box>;
  switch (config.id) {
    case "sessions": return <Box className="analytics-widget-body"><Headline value="388" trend="↗ 12% vs last period" aside={<Chip label="Last 7 days" size="small" />} /><Box className="analytics-session-chart"><svg viewBox="0 0 600 150" preserveAspectRatio="none"><path d="M0 114 C35 100 52 118 82 104 S122 55 150 73 S188 124 220 92 S268 60 300 83 S342 98 372 77 S420 93 450 56 S492 91 525 45 S560 73 600 52 L600 150 L0 150 Z" /><path className="line" d="M0 114 C35 100 52 118 82 104 S122 55 150 73 S188 124 220 92 S268 60 300 83 S342 98 372 77 S420 93 450 56 S492 91 525 45 S560 73 600 52" /></svg></Box></Box>;
    case "activeUsers": return <Box className="analytics-widget-body"><Headline value="1,684" trend="↗ 12% active users" aside={<Chip label="Last 3 years" size="small" />} /><Bars heights={[42, 58, 28, 49, 66, 100, 54]} peak={5} /></Box>;
    case "countries": return <Box className="analytics-widget-body analytics-country-layout"><WorldMap /><Meters rows={locations.map(({ flag, name, share }) => [`${flag} ${name}`, `${share}%`])} /></Box>;
    case "devices": return <Donut variant="devices" total="5,388" caption="sessions" rows={[["Desktop", "4,089", 1], ["Mobile", "1,149", 2], ["Tablet", "150", 3]]} />;
    case "channels": return <Donut variant="channels" total="86.5%" caption="reachable" rows={[["Email", "24,740", 1], ["Push", "32,108", 2], ["Both", "14,528", 3]]} />;
    case "lifecycle": return <Box className="analytics-widget-body"><Meters rows={[["New users", "30%"], ["Onboarding complete", "38%"], ["Paid customers", "20%"], ["At-risk / inactive", "12%"]]} /></Box>;
    case "campaigns": return <Rows rows={[["Back in Action", "42.8%"], ["Welcome Series", "32.1%"], ["Loyalty Rewards", "28.4%"]]} />;
    case "activity": return <Rows rows={[["Event received", "2 min ago"], ["Push opened", "14 min ago"], ["Audience entered", "32 min ago"]]} />;
    case "churn": return <Box className="analytics-widget-body"><Headline value="5,215" trend="Users inactive for 14+ days" warn /><Bars heights={[30, 34, 41, 39, 52, 58, 66, 74]} /></Box>;
    default: return <Box className="analytics-widget-body"><Headline value={config.preview} trend="↗ 12.4% vs last period" /><Bars heights={[34, 48, 42, 66, 58, 78, 72, 92]} /></Box>;
  }
}

function WidgetCard({ config, onRemove }: { config: WidgetConfig; onRemove: () => void }) {
  const Icon = config.icon;
  return <Card className="analytics-widget-card"><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Stack direction="row" alignItems="center" gap={1.25}><Box className="analytics-widget-icon"><Icon fontSize="small" /></Box><Box><Typography className="analytics-widget-title">{config.title}</Typography><Typography className="analytics-widget-description">{config.description}</Typography></Box></Stack><IconButton className="analytics-widget-remove" size="small" onClick={onRemove} aria-label={`Remove ${config.title}`}><CloseRounded fontSize="small" /></IconButton></Stack><WidgetPreview config={config} /></Card>;
}

const RANGES: RangeDays[] = [7, 30, 90];
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const percent = (value: number) => `${value.toFixed(1)}%`;
// The arrow carries the direction; the colour only repeats it.
const deltaIcon = { up: <ArrowUpwardRounded titleAccess="Up" />, down: <ArrowDownwardRounded titleAccess="Down" />, flat: <RemoveRounded titleAccess="No change" /> };

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

export default function AnalyticsWidgetsSection() {
  // Nothing here is fetched yet (see analytics/demo-data.ts); the tab waits only for the Project.
  const { active: project, isPending: loading } = useActiveProject();
  const firstName = useCurrentUser().account?.name?.trim().split(/\s+/)[0];
  const [range, setRange] = useState<RangeDays>(30);
  const [metric, setMetric] = useState<"sends" | "engagement">("sends");
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const data = useMemo(() => getDemoAnalytics(range), [range]);
  const addWidget = (id: string) => { if (!selectedWidgets.includes(id)) setSelectedWidgets((current) => [...current, id]); setPickerOpen(false); };
  const removeWidget = (id: string) => setSelectedWidgets((current) => current.filter((item) => item !== id));
  const widgets = widgetCatalog.filter((item) => selectedWidgets.includes(item.id)).sort((x, y) => selectedWidgets.indexOf(x.id) - selectedWidgets.indexOf(y.id));
  const sends = metric === "sends";
  const metricsUp = data.kpis.filter((kpi) => kpi.direction === "up").length;
  const sent = data.channels.reduce((total, channel) => total + channel.sent, 0);
  // Delivered across both channels, weighted by how much each one sent.
  const delivered = data.channels.reduce((total, channel) => total + channel.sent * channel.rates[0].value, 0) / sent;
  const headline = [
    { label: "Messages sent", value: whole.format(sent) },
    { label: "Delivered", value: percent(delivered) },
    { label: "Metrics trending up", value: `${metricsUp} of ${data.kpis.length}` },
  ];
  // Ninety daily points are noise: past a month the chart shows each week's daily average instead.
  const weekly = range === 90;
  const plot = (values: number[]) => (weekly ? chunks(values, 7).map(average) : values);
  const chartLabels = weekly ? chunks(data.labels, 7).map((week) => week[0]) : data.labels;
  const labelPrefix = weekly ? "Week of " : "";

  const action = (
    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1.5}>
      <ToggleButtonGroup exclusive size="small" value={range} onChange={(_, value: RangeDays | null) => value && setRange(value)} aria-label="Date range" sx={{ alignSelf: "center" }}>
        {RANGES.map((days) => <ToggleButton value={days} key={days} aria-label={`Last ${days} days`}>{days}d</ToggleButton>)}
      </ToggleButtonGroup>
      <Button variant="contained" startIcon={<AddRounded />} onClick={() => setPickerOpen(true)}>Add widget</Button>
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
            <p className="pp-hero-text">{loading ? <Skeleton width={320} /> : `${metricsUp} of your ${data.kpis.length} key metrics are up on the previous ${range} days.`}</p>
          </Box>
          <dl className="pp-hero-stats">
            {headline.map(({ label, value }) => <div className="pp-hero-stat" key={label}><dt>{label}</dt><dd>{loading ? <Skeleton width={72} /> : value}</dd></div>)}
          </dl>
        </Card>

        <Box className="pp-kpi-grid">{data.kpis.map((kpi) => <KpiCard kpi={kpi} range={range} loading={loading} key={kpi.label} />)}</Box>

        <Card className="pp-panel">
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
            <Box>
              <Typography variant="h3">{sends ? "Sends over time" : "Engagement over time"}</Typography>
              <Typography variant="body2" color="text.secondary">{sends ? "Messages sent per day" : "Daily open and click rate"}{weekly ? ", averaged by week" : ""}, last {range} days</Typography>
            </Box>
            {/* The theme leaves 16px under a tab bar for the panel below it; here it shares a row with the title. */}
            <Tabs value={metric} onChange={(_, value: typeof metric) => setMetric(value)} aria-label="Chart metric" sx={{ mb: 0, flexShrink: 0 }}>
              <Tab value="sends" label="Sends" />
              <Tab value="engagement" label="Engagement" />
            </Tabs>
          </Stack>
          {loading ? <Skeleton variant="rounded" className="pp-chart-skeleton" /> : sends
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
                  <Typography variant="body2" color="text.secondary" className="pp-num">{loading ? <Skeleton width={88} /> : <><b>{whole.format(channel.sent)}</b> sent</>}</Typography>
                </Stack>
                {channel.rates.map((rate) => (
                  <Box key={rate.label}>
                    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 0.75 }}>
                      <Typography variant="caption" color="text.secondary">{rate.label}</Typography>
                      <Typography variant="caption" className="pp-num">{loading ? <Skeleton width={36} /> : percent(rate.value)}</Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={loading ? 0 : rate.value} aria-label={`${channel.name} ${rate.label.toLowerCase()}`} />
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
                  {data.campaigns.map((campaign) => (
                    <TableRow hover key={campaign.id}>
                      <TableCell>{loading ? <Skeleton width="70%" /> : campaign.name}</TableCell>
                      <TableCell>{loading ? <Skeleton width={44} /> : <Chip size="small" label={campaign.channel} />}</TableCell>
                      <TableCell align="right">{loading ? <Skeleton width={44} sx={{ ml: "auto" }} /> : whole.format(campaign.sent)}</TableCell>
                      <TableCell align="right">{loading ? <Skeleton width={36} sx={{ ml: "auto" }} /> : percent(campaign.rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Card>
        </Box>

        <Stack gap={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="h2">Custom widgets</Typography>
            {widgets.length > 0 && <Chip size="small" label={`${widgets.length} added`} />}
          </Stack>
          {widgets.length === 0
            ? <Card><EmptyState size="compact" icon={<WidgetsOutlined />} title="No custom widgets yet" description="Add the signals your team wants to keep an eye on." action={{ label: "Add widget", onClick: () => setPickerOpen(true) }} /></Card>
            : <Box className="analytics-widget-grid">{widgets.map((config) => <WidgetCard config={config} onRemove={() => removeWidget(config.id)} key={config.id} />)}</Box>}
        </Stack>
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
            {widgetCatalog.map((item) => {
              const Icon = item.icon;
              const added = selectedWidgets.includes(item.id);
              return (
                <Grid item xs={12} sm={6} key={item.id}>
                  <Box component="button" className="analytics-picker-option" onClick={() => addWidget(item.id)} disabled={added}>
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
