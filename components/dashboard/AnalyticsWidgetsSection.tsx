"use client";

import { useState } from "react";
import {
  AddRounded,
  ArrowForwardRounded,
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
  ShowChartRounded,
  WarningAmberRounded,
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
  Stack,
  Typography,
} from "@mui/material";

type WidgetConfig = {
  id: string;
  title: string;
  description: string;
  icon: typeof InsightsRounded;
  accent: string;
  preview: string;
};

const widgetCatalog: WidgetConfig[] = [
  { id: "audience", title: "Reachable audience", description: "Users contactable through push or email.", icon: GroupsRounded, accent: "#7040c9", preview: "42,320" },
  { id: "channels", title: "Channel performance", description: "Compare reach across every channel.", icon: DonutLargeRounded, accent: "#2f8d70", preview: "86.5%" },
  { id: "retention", title: "Retention pulse", description: "Track returning users over time.", icon: ShowChartRounded, accent: "#df7650", preview: "+8.7%" },
  { id: "lifecycle", title: "Lifecycle health", description: "See where users are in their journey.", icon: PeopleAltRounded, accent: "#4f78c9", preview: "4 stages" },
  { id: "campaigns", title: "Top campaigns", description: "Campaigns driving the most engagement.", icon: CampaignRounded, accent: "#7040c9", preview: "42.8%" },
  { id: "activity", title: "Live activity", description: "Recent events from your project.", icon: BoltRounded, accent: "#2f8d70", preview: "Live" },
  { id: "churn", title: "Churn risk", description: "Users most likely to become inactive.", icon: WarningAmberRounded, accent: "#d58a38", preview: "5,215" },
  { id: "journeys", title: "Journey performance", description: "Monitor active journey conversion.", icon: AutoGraphRounded, accent: "#8c45df", preview: "68.4%" },
  { id: "sessions", title: "Sessions overview", description: "Track sessions and daily activity trends.", icon: ShowChartRounded, accent: "#2f8cf4", preview: "388" },
  { id: "activeUsers", title: "Most active users", description: "See the users creating the most sessions.", icon: GroupsRounded, accent: "#2f8cf4", preview: "1,684" },
  { id: "countries", title: "Top locations", description: "Users by country and audience share.", icon: PublicRounded, accent: "#38a274", preview: "54%" },
  { id: "devices", title: "Sessions by devices", description: "Compare desktop, mobile and tablet usage.", icon: DevicesRounded, accent: "#2f8cf4", preview: "5,388" },
];

function MiniBars({ color = "#7040c9" }: { color?: string }) {
  return <Box className="analytics-mini-bars" aria-hidden="true">{[34, 48, 42, 66, 58, 78, 72, 92].map((height, i) => <i key={i} style={{ height: `${height}%`, background: color }} />)}</Box>;
}

function WidgetPreview({ config, compact = false }: { config: WidgetConfig; compact?: boolean }) {
  const Icon = config.icon;
  if (compact) return <Box className="analytics-picker-preview-match"><WidgetPreview config={config} /></Box>;
  if (compact) {
    if (config.id === "countries") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>Top countries</b></Box><Box className="analytics-preview-map"><i className="map-dot map-dot-us" /><i className="map-dot map-dot-in" /><i className="map-dot map-dot-id" /></Box><Box className="analytics-preview-rows"><span>🇺🇸 United States <b>54%</b></span><span>🇬🇧 United Kingdom <b>36%</b></span><span>🇮🇳 India <b>15%</b></span></Box></Box>;
    if (config.id === "devices") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>5,388 total</b></Box><Box className="analytics-preview-device-bars"><i style={{ height: "76%" }} /><i style={{ height: "48%" }} /><i style={{ height: "22%" }} /></Box><Box className="analytics-preview-rows"><span>Desktop <b>76%</b></span><span>Mobile <b>21%</b></span></Box></Box>;
    if (config.id === "sessions") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>388 <small>+12%</small></b></Box><Box className="analytics-preview-line"><svg viewBox="0 0 160 36" preserveAspectRatio="none"><polyline points="0,26 16,22 32,25 48,12 64,19 80,9 96,20 112,14 128,18 144,5 160,10" /></svg></Box></Box>;
    if (config.id === "activeUsers") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>1,684 <small>+12%</small></b></Box><Box className="analytics-preview-device-bars"><i style={{ height: "38%" }} /><i style={{ height: "58%" }} /><i style={{ height: "28%" }} /><i style={{ height: "82%" }} /><i style={{ height: "100%" }} /></Box></Box>;
    if (config.id === "channels") return <Box className="analytics-picker-preview analytics-picker-channels"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>86.5%</b></Box><Box className="analytics-preview-donut" /><Box className="analytics-preview-legend"><span><i style={{ background: "#7040c9" }} />Push <b>32.1K</b></span><span><i style={{ background: "#df7650" }} />Email <b>24.7K</b></span><span><i style={{ background: "#2f8d70" }} />Both <b>14.5K</b></span></Box></Box>;
    if (config.id === "lifecycle") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>Lifecycle mix</b></Box><Box className="analytics-preview-progress">{[["New users", "30%", "#7040c9"], ["Onboarding", "38%", "#df7650"], ["Paid", "20%", "#2f8d70"]].map(([name, value, color]) => <span key={name}><em>{name}</em><i><b style={{ width: value, background: color }} /></i></span>)}</Box></Box>;
    if (config.id === "campaigns") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>Engagement</b></Box><Box className="analytics-preview-rows"><span>Back in Action <b>42.8%</b></span><span>Welcome Series <b>32.1%</b></span><span>Loyalty Rewards <b>28.4%</b></span></Box></Box>;
    if (config.id === "activity") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>Receiving events</b></Box><Box className="analytics-preview-rows"><span>Event received <b>2 min</b></span><span>Push opened <b>14 min</b></span><span>Audience entered <b>32 min</b></span></Box></Box>;
    if (config.id === "churn") return <Box className="analytics-picker-preview analytics-picker-detail"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>5,215</b></Box><Typography className="analytics-preview-caption">Users inactive for 14+ days</Typography><MiniBars color={config.accent} /></Box>;
    return <Box className="analytics-picker-preview"><Box className="analytics-picker-preview-head"><span style={{ color: config.accent }}><Icon fontSize="inherit" /></span><b>{config.preview}</b></Box><Typography className="analytics-preview-caption">{config.id === "audience" ? "Current reachable audience" : config.id === "retention" ? "Returning users this month" : "Conversion this month"}</Typography><MiniBars color={config.accent} /></Box>;
  }
  if (config.id === "sessions") return <Box className="analytics-widget-body"><Stack direction="row" justifyContent="space-between" alignItems="end"><Box><Typography className="analytics-big-number">388</Typography><Typography className="analytics-trend">↗ 12% vs last period</Typography></Box><Chip label="Last 7 days" size="small" /></Stack><Box className="analytics-session-chart"><svg viewBox="0 0 600 150" preserveAspectRatio="none"><path d="M0 114 C35 100 52 118 82 104 S122 55 150 73 S188 124 220 92 S268 60 300 83 S342 98 372 77 S420 93 450 56 S492 91 525 45 S560 73 600 52 L600 150 L0 150 Z" /><path className="line" d="M0 114 C35 100 52 118 82 104 S122 55 150 73 S188 124 220 92 S268 60 300 83 S342 98 372 77 S420 93 450 56 S492 91 525 45 S560 73 600 52" /></svg></Box></Box>;
  if (config.id === "activeUsers") return <Box className="analytics-widget-body"><Stack direction="row" justifyContent="space-between" alignItems="end"><Box><Typography className="analytics-big-number">1,684</Typography><Typography className="analytics-trend">↗ 12% active users</Typography></Box><Typography color="text.secondary" fontSize={11}>Last 3 years</Typography></Stack><Box className="analytics-active-bars">{[42, 58, 28, 49, 66, 100, 54].map((height, i) => <i key={i} style={{ height: `${height}%`, background: i === 5 ? "#2f8cf4" : "#e9ebef" }} />)}</Box></Box>;
  if (config.id === "countries") return <Box className="analytics-widget-body analytics-country-layout"><Box className="analytics-country-map"><svg viewBox="0 0 260 120" aria-label="World map showing user locations"><path d="M12 24 35 12 58 18 73 33 65 48 48 45 37 59 23 50 16 39Z" /><path d="M75 66 91 72 101 91 94 111 83 103 84 87 72 76Z" /><path d="M107 25 120 20 128 28 123 36 112 35 105 31Z" /><path d="M122 40 138 37 148 46 143 58 132 62 124 54Z" /><path d="M137 21 160 14 180 20 194 29 213 33 231 44 239 59 224 63 208 54 189 56 177 46 158 48 148 38 132 34Z" /><path d="M207 76 227 78 241 88 231 99 216 96 205 86Z" /><circle cx="42" cy="35" r="5" /><circle cx="116" cy="29" r="3" /><circle cx="162" cy="39" r="3" /><circle cx="219" cy="87" r="3" /></svg></Box><Box className="analytics-country-list">{[["🇺🇸", "United States", "54%", "#2f8cf4"], ["🇬🇧", "United Kingdom", "36%", "#df7650"], ["🇮🇳", "India", "15%", "#38a274"], ["🇮🇩", "Indonesia", "15%", "#e94f69"]].map(([flag, name, value, color]) => <Stack direction="row" alignItems="center" gap={.7} key={name}><span>{flag}</span><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" justifyContent="space-between"><Typography fontSize={10} noWrap>{name}</Typography><Typography fontSize={10} fontWeight={700}>{value}</Typography></Stack><Box className="analytics-country-track"><i style={{ width: value, background: color }} /></Box></Box></Stack>)}</Box></Box>;
  if (config.id === "devices") return <Box className="analytics-widget-body analytics-device-layout"><Box className="analytics-donut analytics-device-donut"><span>5,388<small>Total</small></span></Box><Box className="analytics-device-list">{[["Desktop", "4,089", "76%", "#2f8cf4"], ["Mobile", "1,149", "21%", "#df7650"], ["Tablet", "150", "3%", "#f1a24f"]].map(([name, value, percent, color]) => <Box key={name}><Stack direction="row" justifyContent="space-between"><Typography fontSize={10}>{name}</Typography><Typography fontSize={10} fontWeight={700}>{value} / {percent}</Typography></Stack><Box className="analytics-country-track"><i style={{ width: percent, background: color }} /></Box></Box>)}</Box></Box>;
  if (config.id === "channels") return <Box className="analytics-widget-body analytics-donut-row"><Box className="analytics-donut"><span>86.5%<small>reachable</small></span></Box><Stack gap={.7}>{[["Push", "32,108", "#7040c9"], ["Email", "24,740", "#df7650"], ["Both", "14,528", "#2f8d70"]].map(([name, value, color]) => <Stack direction="row" justifyContent="space-between" gap={2} key={name}><span className="analytics-legend"><i style={{ background: color }} />{name}</span><b className="analytics-legend-value">{value}</b></Stack>)}</Stack></Box>;
  if (config.id === "lifecycle") return <Box className="analytics-widget-body analytics-progress-list">{[["New users", "30%", "#7040c9"], ["Onboarding complete", "38%", "#df7650"], ["Paid customers", "20%", "#2f8d70"], ["At-risk / inactive", "12%", "#d58a38"]].map(([name, value, color]) => <Box key={name}><Stack direction="row" justifyContent="space-between"><span>{name}</span><b>{value}</b></Stack><Box className="analytics-progress-track"><i style={{ width: value, background: color }} /></Box></Box>)}</Box>;
  if (config.id === "campaigns") return <Box className="analytics-widget-body analytics-rows">{[["Back in Action", "42.8%"], ["Welcome Series", "32.1%"], ["Loyalty Rewards", "28.4%"]].map(([name, value]) => <Stack direction="row" justifyContent="space-between" key={name}><span>{name}</span><b>{value}</b></Stack>)}</Box>;
  if (config.id === "activity") return <Box className="analytics-widget-body analytics-rows">{[["Event received", "2 min ago"], ["Push opened", "14 min ago"], ["Audience entered", "32 min ago"]].map(([name, value]) => <Stack direction="row" justifyContent="space-between" key={name}><span>{name}</span><b>{value}</b></Stack>)}</Box>;
  if (config.id === "churn") return <Box className="analytics-widget-body"><Typography className="analytics-big-number">5,215</Typography><Typography className="analytics-trend analytics-trend-warn">Users inactive for 14+ days</Typography><Button className="analytics-text-link" endIcon={<ArrowForwardRounded fontSize="small" />}>Review audience</Button></Box>;
  return <Box className="analytics-widget-body"><Stack direction="row" justifyContent="space-between" alignItems="end"><Box><Typography className="analytics-big-number">{config.preview}</Typography><Typography className="analytics-trend">↗ 12.4% vs last period</Typography></Box><AutoGraphRounded sx={{ color: config.accent, fontSize: 36 }} /></Stack><MiniBars color={config.accent} /></Box>;
}

function WidgetCard({ config, onRemove }: { config: WidgetConfig; onRemove: () => void }) {
  const Icon = config.icon;
  return <Card className="analytics-widget-card"><Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}><Stack direction="row" alignItems="center" gap={1.25}><Box className="analytics-widget-icon" sx={{ color: config.accent, backgroundColor: `${config.accent}14` }}><Icon fontSize="small" /></Box><Box><Typography className="analytics-widget-title">{config.title}</Typography><Typography className="analytics-widget-description">{config.description}</Typography></Box></Stack><IconButton className="analytics-widget-remove" size="small" onClick={onRemove} aria-label={`Remove ${config.title}`}><CloseRounded fontSize="small" /></IconButton></Stack><WidgetPreview config={config} /></Card>;
}

function FixedOverview() {
  const fixedStats: Array<{ icon: typeof GroupsRounded; label: string; value: string; trend: string }> = [
    { icon: GroupsRounded, label: "Reachable users", value: "42,320", trend: "+12.4% this month" },
    { icon: CampaignRounded, label: "Email sends", value: "18,420", trend: "+14.2% this month" },
    { icon: BoltRounded, label: "Push sends", value: "27,860", trend: "+11.8% this month" },
    { icon: ShowChartRounded, label: "Email opened", value: "42.8%", trend: "+6.4% this month" },
    { icon: AutoGraphRounded, label: "Push clicks", value: "9.6%", trend: "+3.1% this month" },
    { icon: InsightsRounded, label: "Events received", value: "1.24M", trend: "+18.2% this month" },
  ];
  return <Stack gap={2}>
    <Card className="overview-command analytics-fixed-overview"><Box><Stack direction="row" alignItems="center" gap={1}><Box className="live-dot" /><Typography fontSize={11} fontWeight={700} color="#55d39b" letterSpacing=".08em">LIVE PROJECT HEALTH · TEST PROJECT</Typography></Stack><Typography className="command-title">Good morning, Hassib.</Typography><Typography color="rgba(255,255,255,.68)" fontSize={13}>Your project is healthy and your retention motion is trending up.</Typography></Box></Card>
    <Grid container spacing={2}>{fixedStats.map(({ icon: Icon, label, value, trend }) => <Grid item xs={12} sm={6} lg={4} key={label}><Card className="saas-stat"><Box className="saas-stat-icon"><Icon /></Box><Box><Typography color="text.secondary" fontSize={12}>{label}</Typography><Typography fontSize={24} fontWeight={700}>{value}</Typography><Typography color="#129661" fontSize={11} fontWeight={600}>{trend}</Typography></Box></Card></Grid>)}</Grid>
  </Stack>;
}

export default function AnalyticsWidgetsSection() {
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const addWidget = (id: string) => { if (!selectedWidgets.includes(id)) setSelectedWidgets((current) => [...current, id]); setPickerOpen(false); };
  const removeWidget = (id: string) => setSelectedWidgets((current) => current.filter((item) => item !== id));
  const rowPattern = [1, 2, 3];
  const rows: Array<{ size: number; widgets: Array<string | undefined> }> = [];
  let cursor = 0;
  let rowIndex = 0;
  while (cursor < selectedWidgets.length || rowIndex < rowPattern.length) {
    const size = rowPattern[rowIndex % rowPattern.length];
    rows.push({ size, widgets: Array.from({ length: size }, (_, slot) => selectedWidgets[cursor + slot]) });
    cursor += size;
    rowIndex += 1;
  }
  if (cursor < widgetCatalog.length && rows.length > 0 && rows[rows.length - 1].widgets.every(Boolean)) {
    const size = rowPattern[rows.length % rowPattern.length];
    rows.push({ size, widgets: Array.from({ length: size }, () => undefined) });
  }

  return <Stack className="analytics-widgets-page" gap={2.5}><FixedOverview /><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2} sx={{ mt: 1 }}><Box><Stack direction="row" alignItems="center" gap={1}><Box className="analytics-live-dot" /><Typography className="analytics-workspace-title">Custom analytics widgets</Typography><Chip className="analytics-widget-count" label={`${selectedWidgets.length} added`} size="small" /></Stack><Typography color="text.secondary" fontSize={13} sx={{ mt: .5 }}>Add the signals your team needs below the project overview.</Typography></Box><Button variant="contained" startIcon={<AddRounded />} className="analytics-add-widget" onClick={() => setPickerOpen(true)}>Add widget</Button></Stack><Stack className="analytics-widget-rows" gap={2}>{rows.map((row, rowNumber) => <Box className={`analytics-widget-row columns-${row.size}`} key={`row-${rowNumber}`}>{row.widgets.map((widgetId, slot) => { const config = widgetCatalog.find((item) => item.id === widgetId); return <Box className="analytics-widget-row-item" key={config?.id ?? `empty-${rowNumber}-${slot}`}>{config ? <WidgetCard config={config} onRemove={() => removeWidget(config.id)} /> : <Box component="button" className="analytics-empty-slot" onClick={() => setPickerOpen(true)}><span className="analytics-empty-plus"><AddRounded fontSize="small" /></span><strong>Add an analytics widget</strong><span>Choose a signal for this space</span></Box>}</Box>; })}</Box>)}</Stack><Dialog className="analytics-picker-dialog" open={pickerOpen} onClose={() => setPickerOpen(false)} fullWidth maxWidth="md"><DialogTitle><Stack direction="row" justifyContent="space-between" alignItems="center"><Box><Typography className="analytics-picker-title">Add an analytics widget</Typography><Typography className="analytics-picker-subtitle">Preview each widget before adding it to your workspace.</Typography></Box><IconButton onClick={() => setPickerOpen(false)} aria-label="Close widget picker"><CloseRounded /></IconButton></Stack></DialogTitle><DialogContent><Grid container spacing={1.5}>{widgetCatalog.map((item) => { const Icon = item.icon; const added = selectedWidgets.includes(item.id); return <Grid item xs={12} sm={6} key={item.id}><Box component="button" className={`analytics-picker-option ${added ? "is-added" : ""}`} onClick={() => addWidget(item.id)} disabled={added}><Box className="analytics-picker-icon" sx={{ color: item.accent, backgroundColor: `${item.accent}14` }}><Icon fontSize="small" /></Box><Box sx={{ textAlign: "left", minWidth: 0, flex: 1 }}><strong>{item.title}</strong><span>{item.description}</span><WidgetPreview config={item} compact /></Box><Chip label={added ? "Added" : "Add"} size="small" /></Box></Grid>; })}</Grid></DialogContent><DialogActions><Button onClick={() => setPickerOpen(false)}>Done</Button></DialogActions></Dialog></Stack>;
}
