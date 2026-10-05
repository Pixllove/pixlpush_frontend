"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import TeamAccessPanel from "./team/TeamAccessPanel";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
  AddRounded,
  AccountBalanceWalletRounded,
  ArrowForwardRounded,
  AutoGraphRounded,
  AutorenewRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  CodeRounded,
  ContentCopyRounded,
  CreditCardRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailRounded,
  ErrorOutlineRounded,
  EventRounded,
  FiberManualRecordRounded,
  FileDownloadRounded,
  FileUploadRounded,
  FilterAltRounded,
  FilterListRounded,
  GridViewRounded,
  GroupsRounded,
  InsightsRounded,
  KeyRounded,
  LockRounded,
  ManageSearchRounded,
  MoreHorizRounded,
  NotificationsActiveRounded,
  PeopleAltRounded,
  PlayCircleOutlineRounded,
  RocketLaunchRounded,
  ReceiptLongRounded,
  SearchRounded,
  SendRounded,
  SettingsRounded,
  StorageRounded,
  ShieldRounded,
  TrendingUpRounded,
  VerifiedRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { RootState } from "@/lib/store";
import { projectContext } from "@/lib/projects";
import {
  audienceGroupsApi,
  billingApi,
  emailApi,
  lifecycleSegmentsApi,
  pushApi,
  userStatsApi,
  usersApi,
} from "@/lib/projects/api";
import type {
  AudienceGroup,
  BillingContact,
  EndUser,
  LifecycleSegment,
} from "@/types/project";
import type {
  EmailCampaign,
  EmailTemplate,
  PushCampaign,
  PushTemplate,
} from "@/lib/projects/api";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReusableDataTable, { DataTableColumn } from "./ReusableDataTable";
import PushComposer from "./PushComposer";
import JourneyWorkspace from "./JourneyWorkspace";
import AudienceGroupCreateDialog from "./AudienceGroupCreateDialog";
import LifecycleSegmentCreateDialog from "./LifecycleSegmentCreateDialog";
import UserImportDialog from "./UserImportDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { Toast } from "@/components/auth/AuthFeedback";

export function StatCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: typeof GroupsRounded;
}) {
  return (
    <Card className="saas-stat">
      <Box className="saas-stat-icon">
        <Icon />
      </Box>
      <Box>
        <Typography color="text.secondary" fontSize={12}>
          {label}
        </Typography>
        <Typography fontSize={25} fontWeight={900}>
          {value}
        </Typography>
        {trend && (
          <Typography color="#129661" fontSize={11} fontWeight={800}>
            {trend}
          </Typography>
        )}
      </Box>
    </Card>
  );
}
export function OverviewSection() {
  const selectedProject = useSelector(
    (state: RootState) => state.ui.selectedProject,
  );
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  const project = projectContext(selectedProject);
  const [switching, setSwitching] = useState(false);
  // The fade is for switching Projects. Opening the page, and the remembered Project being restored just
  // after it, are not switches: animating those made the whole page dip on every visit.
  const shownProject = useRef(selectedProject);
  useEffect(() => {
    const previous = shownProject.current;
    shownProject.current = selectedProject;
    if (!previous || previous === selectedProject) return;
    setSwitching(true);
    const timer = window.setTimeout(() => setSwitching(false), 260);
    return () => window.clearTimeout(timer);
  }, [selectedProject]);
  const m = project.metrics;
  const points =
    selectedProject === "PixlLove"
      ? "0,108 60,96 120,102 180,78 240,84 300,60 360,68 420,45 480,52 540,34 600,40 660,24 720,30 780,14 840,20 900,4"
      : "0,118 60,103 120,108 180,88 240,96 300,72 360,79 420,54 480,61 540,43 600,47 660,26 720,34 780,18 840,24 900,8";
  const activity = [
    [
      "Event received",
      "purchase_completed",
      "customer_123",
      "2 min ago",
      "#8c45df",
    ],
    ["Push opened", "Welcome back", "customer_847", "14 min ago", "#ef7049"],
    [
      "Audience entered",
      "At-risk users · 183",
      "Audience Group",
      "32 min ago",
      "#38a274",
    ],
    [
      "Journey completed",
      "Welcome onboarding",
      "customer_219",
      "1 hr ago",
      "#5486d8",
    ],
  ];
  return (
    <Stack
      gap={2.5}
      className={`overview-page ${switching ? "project-switching" : ""}`}
    >
      <Card className="overview-command">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Box className="live-dot" />
              <Typography
                fontSize={11}
                fontWeight={900}
                color="#168c5b"
                letterSpacing=".08em"
              >
                LIVE PROJECT HEALTH · {projectName.toUpperCase()}
              </Typography>
            </Stack>
            <Typography className="command-title">
              Good morning, Hassib.
            </Typography>
            <Typography color="rgba(255,255,255,.68)" fontSize={13}>
              {projectName} is healthy and your retention motion is trending up.
            </Typography>
          </Box>
          <Stack direction="row" gap={1} alignItems="center">
            <Button className="command-button" startIcon={<FilterAltRounded />}>
              Last 30 days
            </Button>
            <Button
              className="command-button command-button-primary"
              startIcon={<InsightsRounded />}
            >
              View insights
            </Button>
          </Stack>
        </Stack>
        <Grid container spacing={1.5} sx={{ mt: 2.5 }}>
          <Grid item xs={12} sm={4}>
            <Box className="command-stat">
              <Typography>Reachable audience</Typography>
              <strong>{m.reachable}</strong>
              <span>
                <TrendingUpRounded /> {m.reachableChange} vs last period
              </span>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box className="command-stat">
              <Typography>Engaged this week</Typography>
              <strong>{m.engaged}</strong>
              <span>
                <TrendingUpRounded /> {m.engagedChange} vs last period
              </span>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box className="command-stat">
              <Typography>Retention pulse</Typography>
              <strong>Healthy</strong>
              <span>
                <FiberManualRecordRounded /> {m.reachRate} of users reachable
              </span>
            </Box>
          </Grid>
        </Grid>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={GroupsRounded}
            label="Reachable users"
            value={m.reachable}
            trend={`+${m.reachableChange} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={AutoGraphRounded}
            label="Activation rate"
            value={m.activation}
            trend={`+${m.activationChange} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={NotificationsActiveRounded}
            label="Push open rate"
            value={m.pushOpen}
            trend={`+${m.pushChange} this month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            icon={EventRounded}
            label="Events received"
            value={m.events}
            trend={`+${m.eventsChange} this month`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <Card className="saas-card chart-card">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="h3">Reachable audience</Typography>
                  <Chip
                    label={`+${m.reachableChange}`}
                    size="small"
                    className="positive-chip"
                  />
                </Stack>
                <Typography color="text.secondary" fontSize={12}>
                  Unique users contactable through push or email in{" "}
                  {projectName}
                </Typography>
              </Box>
              <Stack direction="row" gap={0.5}>
                <Button size="small" className="chart-tab active">
                  Reachable
                </Button>
                <Button size="small" className="chart-tab">
                  Engaged
                </Button>
              </Stack>
            </Stack>
            <Box className="analytics-chart">
              <Box className="chart-y-axis">
                <span>45k</span>
                <span>30k</span>
                <span>15k</span>
                <span>0</span>
              </Box>
              <svg
                viewBox="0 0 900 150"
                preserveAspectRatio="none"
                aria-label="Reachable audience trend"
              >
                <defs>
                  <linearGradient
                    id={`reachFill-${selectedProject}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#9a55e8" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#9a55e8" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,150 ${points} 900,150`}
                  fill={`url(#reachFill-${selectedProject})`}
                />
                <polyline
                  points={points}
                  fill="none"
                  stroke="#8b43dc"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="780"
                  cy="18"
                  r="5"
                  fill="#fff"
                  stroke="#8b43dc"
                  strokeWidth="3"
                />
              </svg>
            </Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              className="chart-labels"
            >
              <span>Aug 20</span>
              <span>Aug 27</span>
              <span>Sep 03</span>
              <span>Sep 10</span>
              <span>Sep 17</span>
            </Stack>
            <Stack direction="row" gap={2.5} className="chart-summary">
              <Box>
                <Typography>Current reach</Typography>
                <strong>{m.reachable}</strong>
              </Box>
              <Box>
                <Typography>New this period</Typography>
                <strong className="green-text">
                  +{selectedProject === "PixlLove" ? "19,842" : "4,684"}
                </strong>
              </Box>
              <Box>
                <Typography>Reachability rate</Typography>
                <strong>{m.reachRate}</strong>
              </Box>
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card className="saas-card channel-card">
            <Stack direction="row" justifyContent="space-between">
              <Box>
                <Typography variant="h3">Channel performance</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Last 30 days · {projectName}
                </Typography>
              </Box>
              <AutoGraphRounded className="muted-purple" />
            </Stack>
            <Box className="channel-donut">
              <Box className="donut-center">
                <strong>{m.reachRate}</strong>
                <span>reachable</span>
              </Box>
            </Box>
            <Stack gap={1.2} className="channel-legend">
              <Stack direction="row" alignItems="center">
                <Box className="legend-dot push" />
                <Typography sx={{ flex: 1 }} fontSize={12}>
                  Push reachable
                </Typography>
                <strong>
                  {selectedProject === "PixlLove" ? "94,218" : "32,108"}
                </strong>
                <Typography color="#15965e" fontSize={11}>
                  {selectedProject === "PixlLove" ? "73.1%" : "75.9%"}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center">
                <Box className="legend-dot email" />
                <Typography sx={{ flex: 1 }} fontSize={12}>
                  Email reachable
                </Typography>
                <strong>
                  {selectedProject === "PixlLove" ? "76,402" : "24,740"}
                </strong>
                <Typography color="#15965e" fontSize={11}>
                  {selectedProject === "PixlLove" ? "59.3%" : "58.5%"}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center">
                <Box className="legend-dot overlap" />
                <Typography sx={{ flex: 1 }} fontSize={12}>
                  Both channels
                </Typography>
                <strong>
                  {selectedProject === "PixlLove" ? "41,716" : "14,528"}
                </strong>
                <Typography color="#15965e" fontSize={11}>
                  {selectedProject === "PixlLove" ? "32.4%" : "34.3%"}
                </Typography>
              </Stack>
            </Stack>
            <Button
              href="/dashboard/email"
              sx={{ mt: 1, px: 0 }}
              endIcon={<ArrowForwardRounded />}
            >
              Explore channel analytics
            </Button>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card className="saas-card lifecycle-card">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box>
                <Typography variant="h3">Lifecycle health</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Where your users are today
                </Typography>
              </Box>
              <Button size="small" href="/dashboard/users">
                Manage
              </Button>
            </Stack>
            <Stack gap={1.8} sx={{ mt: 2.5 }}>
              {[
                ["New users", "12,480", "30%", "#9b53e1"],
                ["Onboarding complete", "16,204", "38%", "#ef7049"],
                ["Paid customers", "8,421", "20%", "#35a579"],
                ["At-risk / inactive", "5,215", "12%", "#e0a04d"],
              ].map(([name, count, share, color]) => (
                <Box key={name} className="lifecycle-row">
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mb: 0.7 }}
                  >
                    <Typography fontSize={12} fontWeight={800}>
                      {name}
                    </Typography>
                    <Typography fontSize={12} fontWeight={800}>
                      {count}
                      <span className="row-share"> · {share}</span>
                    </Typography>
                  </Stack>
                  <Box className="lifecycle-track">
                    <Box sx={{ width: share, bgcolor: color }} />
                  </Box>
                </Box>
              ))}
            </Stack>
            <Button
              href="/dashboard/users"
              sx={{ mt: 2, px: 0 }}
              endIcon={<ArrowForwardRounded />}
            >
              View lifecycle segments
            </Button>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card className="saas-card campaign-performance">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
            >
              <Box>
                <Typography variant="h3">Top performing campaigns</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Driving the most engaged users this period
                </Typography>
              </Box>
              <Button href="/dashboard/email" size="small">
                View all
              </Button>
            </Stack>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign</TableCell>
                  <TableCell>Channel</TableCell>
                  <TableCell>Reach</TableCell>
                  <TableCell align="right">Engagement</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ["Back in Action", "Email", "22.1K", "42.8%"],
                  ["Welcome Series", "Push", "18.4K", "32.1%"],
                  ["Loyalty Rewards", "Push", "36.7K", "28.4%"],
                ].map(([name, channel, reach, metric], i) => (
                  <TableRow hover key={name}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" gap={1.2}>
                        <Box
                          className={`campaign-mini-icon ${i === 0 ? "orange" : i === 1 ? "purple" : "green"}`}
                        >
                          {i === 0 ? (
                            <EmailRounded fontSize="small" />
                          ) : i === 1 ? (
                            <NotificationsActiveRounded fontSize="small" />
                          ) : (
                            <GroupsRounded fontSize="small" />
                          )}
                        </Box>
                        <Typography fontSize={12} fontWeight={800}>
                          {name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={channel}
                        size="small"
                        className="neutral-chip"
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{reach}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontSize={12}
                        fontWeight={900}
                        color="#15965e"
                      >
                        {metric}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>

      <Card className="saas-card activity-card">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h3">Live activity</Typography>
            <Typography color="text.secondary" fontSize={12}>
              A real-time pulse of your active Project
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={0.7}>
            <Box className="live-dot" />
            <Typography fontSize={11} fontWeight={800} color="#168c5b">
              Receiving events
            </Typography>
            <Button href="/dashboard/users" size="small" sx={{ ml: 1 }}>
              View users
            </Button>
          </Stack>
        </Stack>
        <Stack className="activity-list">
          {activity.map(([type, object, user, time, color]) => (
            <Stack
              direction="row"
              alignItems="center"
              gap={1.5}
              className="activity-row"
              key={type}
            >
              <Box
                className="activity-icon"
                sx={{ color, bgcolor: `${color}14` }}
              >
                {type === "Event received" ? (
                  <CodeRounded />
                ) : type === "Push opened" ? (
                  <NotificationsActiveRounded />
                ) : type === "Audience entered" ? (
                  <GroupsRounded />
                ) : (
                  <CheckCircleRounded />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography fontSize={12} fontWeight={800}>
                  {type}
                </Typography>
                <Typography color="text.secondary" fontSize={11}>
                  {user} <span className="activity-separator">·</span> {object}
                </Typography>
              </Box>
              <Typography color="text.secondary" fontSize={11}>
                {time}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

export function UsersSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<"users" | "segments" | "groups">(
    requestedTab === "segments" || requestedTab === "groups" ? requestedTab : "users",
  );
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);
  const [importUsersOpen, setImportUsersOpen] = useState(false);
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [userCursors, setUserCursors] = useState<string[]>([]);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const deferredUserSearch = useDeferredValue(userSearch);
  const selectedProject = useSelector(
    (state: RootState) => state.ui.selectedProject,
  );
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  const project = projectContext(selectedProject);
  const usersQuery = useQuery({
    queryKey: [
      "projects",
      "users",
      active?.id,
      deferredUserSearch,
      userCursors[userCursors.length - 1],
    ],
    queryFn: () =>
      usersApi.list(active!.id, {
        search: deferredUserSearch,
        limit: 100,
        cursor: userCursors[userCursors.length - 1],
      }),
    enabled: Boolean(active?.id),
  });
  const segmentsQuery = useQuery({
    queryKey: ["projects", "lifecycle-segments", active?.id],
    queryFn: () => lifecycleSegmentsApi.list(active!.id),
    enabled: Boolean(active?.id),
  });
  const segmentSchemaQuery = useQuery({
    queryKey: ["projects", "lifecycle-segments", active?.id, "schema"],
    queryFn: () => lifecycleSegmentsApi.schema(active!.id),
    enabled: Boolean(active?.id && createSegmentOpen),
  });
  const groupsQuery = useQuery({
    queryKey: ["projects", "audience-groups", active?.id],
    queryFn: () => audienceGroupsApi.list(active!.id),
    enabled: Boolean(active?.id),
  });
  // Deletes the classification only; the users stay (their segment is cleared).
  const deleteSegment = useMutation({
    mutationFn: (segmentId: string) =>
      lifecycleSegmentsApi.delete(active!.id, segmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "lifecycle-segments", active?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["projects", "users"] });
    },
  });
  const deleteGroup = useMutation({
    mutationFn: (groupId: string) =>
      audienceGroupsApi.delete(active!.id, groupId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["projects", "audience-groups", active?.id],
      }),
  });
  const createGroup = useMutation({
    mutationFn: (input: { name: string; description: string }) =>
      audienceGroupsApi.create(active!.id, input),
    onSuccess: (group) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "audience-groups", active?.id],
      });
      setCreateGroupOpen(false);
      router.push(`/dashboard/users/groups/${group.id}?tab=groups`);
    },
  });
  const createSegment = useMutation({
    mutationFn: (input: {
      name: string;
      description: string;
      events: string[];
    }) =>
      lifecycleSegmentsApi.create(active!.id, {
        name: input.name,
        description: input.description || undefined,
        rules: {
          operator: "OR",
          conditions: input.events.map((event) => ({ event })),
        },
      }),
    onSuccess: (segment) => {
      queryClient.invalidateQueries({
        queryKey: ["projects", "lifecycle-segments", active?.id],
      });
      setCreateSegmentOpen(false);
      router.push(`/dashboard/users/segments/${segment.id}?tab=segments`);
    },
  });
  useEffect(() => setUserCursors([]), [deferredUserSearch, active?.id]);
  useEffect(() => {
    if (requestedTab === "users" || requestedTab === "segments" || requestedTab === "groups") setTab(requestedTab);
  }, [requestedTab]);
  const statsQuery = useQuery({
    queryKey: ["projects", "users", "stats", active?.id],
    queryFn: () => userStatsApi.get(active!.id),
    enabled: Boolean(active?.id),
  });
  const stats = statsQuery.data;
  const reachRate = stats?.total
    ? `${((stats.reachable / stats.total) * 100).toFixed(1)}% of users`
    : "No users yet";
  const eventsTrend = !stats
    ? ""
    : stats.eventsYesterday
      ? `${stats.eventsToday >= stats.eventsYesterday ? "+" : ""}${(((stats.eventsToday - stats.eventsYesterday) / stats.eventsYesterday) * 100).toFixed(1)}% vs yesterday`
      : `${stats.eventsYesterday} yesterday`;
  const tabs = [
    {
      id: "users" as const,
      label: "All users",
      icon: PeopleAltRounded,
      count: stats ? stats.total.toLocaleString() : "—",
    },
    {
      id: "segments" as const,
      label: "Lifecycle segments",
      icon: InsightsRounded,
      count: segmentsQuery.data
        ? segmentsQuery.data.length.toLocaleString()
        : "—",
    },
    {
      id: "groups" as const,
      label: "Audience groups",
      icon: GroupsRounded,
      count: groupsQuery.data ? groupsQuery.data.length.toLocaleString() : "—",
    },
  ];
  const users = usersQuery.data?.users ?? [];
  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : "Never";
  const exportUsers = () => {
    const columns = [
      "User",
      "Lifecycle segment",
      "Email",
      "Last active",
      "Country",
    ];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      columns,
      ...users.map((row) => [
        row.externalUserId || row.email || row.id,
        row.lifecycleSegment?.name || "No segment",
        row.email || "",
        formatDate(row.lastActiveAt),
        row.country || "Unknown",
      ]),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "users.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const userColumns: DataTableColumn<EndUser>[] = [
    {
      key: "externalUserId",
      label: "User",
      render: (row) => (
        <Box
          className="user-table-link"
          role="link"
          tabIndex={0}
          onClick={() => router.push(`/dashboard/users/${row.id}?tab=users`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ")
              router.push(`/dashboard/users/${row.id}?tab=users`);
          }}
        >
          <Typography fontSize={12} fontWeight={800}>
            {row.externalUserId || row.email || row.id}
          </Typography>
          <Typography color="text.secondary" fontSize={10}>
            {row.name || "Identified user"}
          </Typography>
        </Box>
      ),
    },
    {
      key: "lifecycleSegment",
      label: "Lifecycle segment",
      render: (row) => (
        <Typography fontSize={12}>
          {row.lifecycleSegment?.name || "No segment"}
        </Typography>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (row) => (
        <Typography fontSize={12}>{row.email || "—"}</Typography>
      ),
    },
    {
      key: "lastActiveAt",
      label: "Last active",
      render: (row) => (
        <Typography fontSize={12}>{formatDate(row.lastActiveAt)}</Typography>
      ),
    },
    {
      key: "country",
      label: "Country",
      render: (row) => (
        <Typography fontSize={12}>{row.country || "Unknown"}</Typography>
      ),
    },
  ];
  const segments = (segmentsQuery.data ?? []).filter((segment) =>
    `${segment.name} ${segment.description ?? ""}`
      .toLowerCase()
      .includes(segmentSearch.toLowerCase()),
  );
  const segmentTotalUsers = segments.reduce(
    (sum, segment) => sum + (segment.userCount ?? segment.usersCount ?? 0),
    0,
  );
  const segmentColumns: DataTableColumn<LifecycleSegment>[] = [
    {
      key: "name",
      label: "Segment",
      render: (row) => (
        <Box
          className="segment-table-link"
          role="link"
          tabIndex={0}
          onClick={() => router.push(`/dashboard/users/segments/${row.id}?tab=segments`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ")
              router.push(`/dashboard/users/segments/${row.id}?tab=segments`);
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.2}>
            <Box className="segment-color" sx={{ bgcolor: "#9b53e1" }} />
            <Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography fontSize={12} fontWeight={800}>
                  {row.name}
                </Typography>
                <Chip label="AUTO LIFECYCLE" size="small" />
              </Stack>
              <Typography color="text.secondary" fontSize={10}>
                {row.description ||
                  "Automatically updated based on user activity."}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ),
    },
    {
      key: "updatedAt",
      label: "Status",
      render: (row) => (
        <Typography color="#168c5b" fontSize={11} fontWeight={800}>
          {row.updatedAt
            ? `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(row.updatedAt))}`
            : "Updated automatically"}
        </Typography>
      ),
    },
    {
      key: "share",
      label: "Share",
      align: "right",
      render: (row) => (
        <Typography fontSize={12}>
          {segmentTotalUsers
            ? `${Math.round(((row.userCount ?? row.usersCount ?? 0) / segmentTotalUsers) * 100)}%`
            : "—"}
        </Typography>
      ),
    },
    {
      key: "userCount",
      label: "Users",
      align: "right",
      render: (row) => (
        <Box className="segment-count">
          <Typography color="text.secondary" fontSize={10}>
            <GroupsRounded fontSize="inherit" /> Users
          </Typography>
          <strong>
            {(row.userCount ?? row.usersCount ?? 0).toLocaleString()}
          </strong>
        </Box>
      ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <IconButton
          aria-label={`Delete ${row.name}`}
          title="Delete segment"
          className="group-delete-button"
          disabled={deleteSegment.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Delete the segment "${row.name}"? Its users are kept; they just lose this classification.`,
              )
            )
              deleteSegment.mutate(row.id);
          }}
        >
          <DeleteOutlineRounded fontSize="small" />
        </IconButton>
      ),
    },
  ];
  const groups = (groupsQuery.data ?? []).filter((group) =>
    `${group.name} ${group.description ?? ""}`
      .toLowerCase()
      .includes(groupSearch.toLowerCase()),
  );
  const groupColumns: DataTableColumn<AudienceGroup>[] = [
    {
      key: "name",
      label: "Audience group",
      render: (row) => (
        <Stack
          direction="row"
          alignItems="center"
          gap={1.2}
          className="group-table-link"
          role="link"
          tabIndex={0}
          onClick={() => router.push(`/dashboard/users/groups/${row.id}?tab=groups`)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              router.push(`/dashboard/users/groups/${row.id}?tab=groups`);
            }
          }}
        >
          <Box className="group-dot" />
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontSize={12} fontWeight={800}>
                {row.name}
              </Typography>
              <Chip label="DYNAMIC" size="small" />
            </Stack>
            <Typography color="text.secondary" fontSize={10}>
              {row.description || "Dynamic audience group"}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "updatedAt",
      label: "Updated",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.updatedAt
            ? new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
              }).format(new Date(row.updatedAt))
            : "Updated automatically"}
        </Typography>
      ),
    },
    {
      key: "memberCount",
      label: "Users",
      align: "right",
      render: (row) => (
        <Box className="segment-count">
          <Typography color="text.secondary" fontSize={10}>
            <GroupsRounded fontSize="inherit" /> Users
          </Typography>
          <strong>{(row.memberCount ?? 0).toLocaleString()}</strong>
        </Box>
      ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          gap={0.5}
        >
          <Button
            size="small"
            variant="outlined"
            className="group-view-button"
            onClick={() => router.push(`/dashboard/users/groups/${row.id}?tab=groups`)}
          >
            View group
          </Button>
          <IconButton
            aria-label={`Remove ${row.name}`}
            title="Remove group"
            className="group-delete-button"
            disabled={deleteGroup.isPending}
            onClick={() => {
              if (window.confirm(`Delete ${row.name}?`))
                deleteGroup.mutate(row.id);
            }}
          >
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];
  return (
    <Stack gap={2.5} className="users-workspace">
      <Box className="workspace-tabs">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <Button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? "workspace-tab active" : "workspace-tab"}
            startIcon={<Icon />}
          >
            <span>{label}</span>
            <Chip label={count} size="small" />
          </Button>
        ))}
      </Box>
      {tab === "users" && (
        <Stack gap={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <StatCard
                icon={GroupsRounded}
                label="Identified users"
                value={stats ? stats.total.toLocaleString() : "—"}
                trend="All users in this project"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                icon={NotificationsActiveRounded}
                label="Reachable users"
                value={stats ? stats.reachable.toLocaleString() : "—"}
                trend={reachRate}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                icon={EventRounded}
                label="Events today"
                value={stats ? stats.eventsToday.toLocaleString() : "—"}
                trend={eventsTrend}
              />
            </Grid>
          </Grid>
          <Card className="saas-card data-panel">
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ md: "center" }}
              gap={2}
            >
              <Box>
                <Typography variant="h3">All users</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Search and inspect identified people in {projectName}.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                <Button
                  variant="contained"
                  startIcon={<FileUploadRounded />}
                  className="users-import-button"
                  onClick={() => setImportUsersOpen(true)}
                >
                  Import users
                </Button>
                <Button
                  variant="contained"
                  startIcon={<FileDownloadRounded />}
                  className="users-export-button"
                  onClick={exportUsers}
                  disabled={!users.length}
                >
                  Export
                </Button>
              </Stack>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1.2}
              className="data-toolbar"
            >
              <TextField
                size="small"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by user ID, email or country"
                className="table-search"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Select
                size="small"
                defaultValue="all"
                className="filter-select"
                startAdornment={
                  <InputAdornment position="start">
                    <FilterListRounded fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">All users</MenuItem>
                <MenuItem value="email-subscribed">Email subscribed</MenuItem>
                <MenuItem value="email-unsubscribed">
                  Email unsubscribed
                </MenuItem>
                <MenuItem value="push-enabled">Push enabled</MenuItem>
                <MenuItem value="unreachable">Unreachable users</MenuItem>
              </Select>
            </Stack>
            {usersQuery.isError ? (
              <Typography color="error" fontSize={12} sx={{ p: 2 }}>
                Could not load users. Please try again.
              </Typography>
            ) : (
              <ReusableDataTable
                columns={userColumns}
                rows={users}
                totalCount={users.length}
                noun="users"
                showMenu={false}
                loading={usersQuery.isLoading || usersQuery.isFetching}
                hasNextPage={Boolean(usersQuery.data?.nextCursor)}
                hasPreviousPage={userCursors.length > 0}
                onNextPage={() =>
                  usersQuery.data?.nextCursor &&
                  setUserCursors((current) => [
                    ...current,
                    usersQuery.data!.nextCursor!,
                  ])
                }
                onPreviousPage={() =>
                  setUserCursors((current) => current.slice(0, -1))
                }
              />
            )}
          </Card>
        </Stack>
      )}
      {tab === "segments" && (
        <Stack gap={2}>
          <Card className="setup-strip segment-getting-started">
            <Box className="setup-intro">
              <Box className="setup-icon">
                <ManageSearchRounded />
              </Box>
              <Box>
                <Typography fontWeight={900}>Getting started</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Create <strong>Lifecycle Segments</strong> based on what users
                  do in your app. Integrate the SDK, choose events, set
                  conditions and filters, and we&apos;ll keep segments up to
                  date automatically.
                </Typography>
                <Button
                  href="/docs"
                  size="small"
                  sx={{ mt: 1, px: 0 }}
                  endIcon={<ArrowForwardRounded />}
                >
                  View documentation
                </Button>
              </Box>
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              className="setup-steps"
            >
              <Box className="setup-step">
                <Box className="setup-step-icon">
                  <CodeRounded />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" gap={0.7}>
                    <span>1</span>
                    <Typography fontSize={11} fontWeight={800}>
                      Integrate SDK
                    </Typography>
                  </Stack>
                  <Typography className="setup-step-desc">
                    Connect the PixlPush SDK to start sending events from your
                    app.
                  </Typography>
                </Box>
              </Box>
              <Box className="setup-step">
                <Box className="setup-step-icon">
                  <AutoGraphRounded />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" gap={0.7}>
                    <span>2</span>
                    <Typography fontSize={11} fontWeight={800}>
                      Choose events
                    </Typography>
                  </Stack>
                  <Typography className="setup-step-desc">
                    Pick the events you want to track, like sign up, purchase or
                    screen view.
                  </Typography>
                </Box>
              </Box>
              <Box className="setup-step">
                <Box className="setup-step-icon">
                  <FilterListRounded />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" gap={0.7}>
                    <span>3</span>
                    <Typography fontSize={11} fontWeight={800}>
                      Add conditions
                    </Typography>
                  </Stack>
                  <Typography className="setup-step-desc">
                    Define rules and filters to include the right users in the
                    segment.
                  </Typography>
                </Box>
              </Box>
              <Box className="setup-step">
                <Box className="setup-step-icon">
                  <GroupsRounded />
                </Box>
                <Box>
                  <Stack direction="row" alignItems="center" gap={0.7}>
                    <span>4</span>
                    <Typography fontSize={11} fontWeight={800}>
                      Segment updates
                    </Typography>
                  </Stack>
                  <Typography className="setup-step-desc">
                    Segments update automatically as users take action in your
                    app.
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </Card>
          <Card className="saas-card data-panel">
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={2}
            >
              <Box>
                <Typography variant="h3">Lifecycle segments</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Automatic classifications that update as users take action in{" "}
                  {projectName}.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setCreateSegmentOpen(true)}
              >
                Create segment
              </Button>
            </Stack>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1.2}
              className="data-toolbar"
            >
              <TextField
                size="small"
                value={segmentSearch}
                onChange={(event) => setSegmentSearch(event.target.value)}
                placeholder="Search segments"
                className="table-search"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Select
                size="small"
                defaultValue="updated"
                className="filter-select"
                startAdornment={
                  <InputAdornment position="start">
                    <CalendarTodayRounded fontSize="small" />
                  </InputAdornment>
                }
              >
                <MenuItem value="updated">Recently updated</MenuItem>
                <MenuItem value="created">Date created</MenuItem>
                <MenuItem value="largest">Most users</MenuItem>
              </Select>
            </Stack>
            {segmentsQuery.isError ? (
              <Typography color="error" fontSize={12} sx={{ p: 2 }}>
                Could not load lifecycle segments. Please try again.
              </Typography>
            ) : (
              <ReusableDataTable
                columns={segmentColumns}
                rows={segments}
                totalCount={segments.length}
                noun="segments"
                showMenu={false}
                loading={segmentsQuery.isLoading || segmentsQuery.isFetching}
              />
            )}
          </Card>
        </Stack>
      )}
      {tab === "groups" && (
        <Card className="saas-card data-panel">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            gap={2}
          >
            <Box>
              <Typography variant="h3">Audience groups</Typography>
              <Typography color="text.secondary" fontSize={12}>
                Dynamic targeting groups for campaigns and journey automations.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setCreateGroupOpen(true)}
            >
              Create group
            </Button>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1.2}
            className="data-toolbar"
          >
            <TextField
              size="small"
              value={groupSearch}
              onChange={(event) => setGroupSearch(event.target.value)}
              placeholder="Search audience groups"
              className="table-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              size="small"
              defaultValue="created"
              className="filter-select"
              startAdornment={
                <InputAdornment position="start">
                  <CalendarTodayRounded fontSize="small" />
                </InputAdornment>
              }
            >
              <MenuItem value="created">Date created</MenuItem>
              <MenuItem value="updated">Recently updated</MenuItem>
              <MenuItem value="largest">Most users</MenuItem>
            </Select>
          </Stack>
          {groupsQuery.isError ? (
            <Typography color="error" fontSize={12} sx={{ p: 2 }}>
              Could not load audience groups. Please try again.
            </Typography>
          ) : (
            <ReusableDataTable
              columns={groupColumns}
              rows={groups}
              totalCount={groups.length}
              noun="groups"
              showMenu={false}
              loading={groupsQuery.isLoading || groupsQuery.isFetching}
            />
          )}
        </Card>
      )}
      <AudienceGroupCreateDialog
        open={createGroupOpen}
        onClose={() => {
          if (!createGroup.isPending) setCreateGroupOpen(false);
        }}
        onCreate={(name, description) =>
          createGroup.mutate({ name, description })
        }
        loading={createGroup.isPending}
        error={
          createGroup.isError
            ? "Could not create the audience group. Please try again."
            : undefined
        }
      />
      <LifecycleSegmentCreateDialog
        open={createSegmentOpen}
        onClose={() => {
          if (!createSegment.isPending) setCreateSegmentOpen(false);
        }}
        onCreate={(input) => createSegment.mutate(input)}
        schema={segmentSchemaQuery.data}
        loading={createSegment.isPending}
        error={
          segmentSchemaQuery.isError
            ? "Could not load tracked events for this project."
            : createSegment.isError
              ? ((createSegment.error as { message?: string })?.message ??
                "Could not create the lifecycle segment.")
              : undefined
        }
      />
      <UserImportDialog
        open={importUsersOpen}
        onClose={() => setImportUsersOpen(false)}
      />
    </Stack>
  );
}

export function ChannelSection({ channel }: { channel: "email" | "push" }) {
  const email = channel === "email";
  if (email) return <EmailDataSection />;
  return <PushSection />;
}

function EmailDataSection() {
  const { active } = useActiveProject();
  const project = projectContext(
    useSelector((state: RootState) => state.ui.selectedProject),
  );
  const [tab, setTab] = useState<"send" | "drafts" | "templates">("send");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const templatesQuery = useQuery({
    queryKey: ["email", "templates", active?.id, page, deferredSearch],
    queryFn: () => emailApi.templates.list(active!.id, {
      page, limit: 25, search: deferredSearch, category: "template",
    }),
    enabled: Boolean(active?.id),
  });
  const draftsQuery = useQuery({
    queryKey: ["email", "campaigns", active?.id, "draft", page, deferredSearch],
    queryFn: () => emailApi.campaigns.list(active!.id, {
      tab: "draft", page, limit: 25, search: deferredSearch,
    }),
    enabled: Boolean(active?.id),
  });
  const sentQuery = useQuery({
    queryKey: ["email", "campaigns", active?.id, "sent", page, deferredSearch],
    queryFn: () => emailApi.campaigns.list(active!.id, {
      tab: "sent", page, limit: 25, search: deferredSearch,
    }),
    enabled: Boolean(active?.id),
  });
  type EmailRow = { id: string; name: string; detail: string; meta: string; status: string };
  const date = (value?: string) => value
    ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const templateRows: EmailRow[] = (templatesQuery.data?.items ?? []).map((item: EmailTemplate) => ({
    id: item.id,
    name: item.name,
    detail: item.subject || "No subject",
    meta: `${item.category === "template" ? "Reusable template" : item.category ?? "Email template"} · Updated ${date(item.updatedAt)}`,
    status: "Reusable template",
  }));
  const campaignRows: EmailRow[] = ((tab === "drafts" ? draftsQuery.data?.items : sentQuery.data?.items) ?? [])
    .map((item: EmailCampaign) => ({
      id: item.id,
      name: item.name,
      detail: item.template?.subject || "No subject",
      meta: tab === "drafts"
        ? `Draft · Updated ${date(item.updatedAt)}`
        : `${item.stats?.sent?.toLocaleString() ?? "—"} sent · ${item.stats?.openRate?.toFixed(1) ?? "—"}% open rate`,
      status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Sent",
    }));
  const activeQuery = tab === "templates" ? templatesQuery : tab === "drafts" ? draftsQuery : sentQuery;
  const rows: EmailRow[] = tab === "templates" ? templateRows : campaignRows;
  const campaignCounts = sentQuery.data?.tabCounts;
  const emailTabs = [
    { id: "send" as const, label: "Send", count: campaignCounts?.send ?? sentQuery.data?.total ?? 0, icon: SendRounded },
    { id: "drafts" as const, label: "Drafts", count: campaignCounts?.drafts ?? draftsQuery.data?.total ?? 0, icon: EditRounded },
    { id: "templates" as const, label: "My Templates", count: templatesQuery.data?.total ?? 0, icon: GridViewRounded },
  ];
  const columns: DataTableColumn<EmailRow>[] = [
    {
      key: "name",
      label: "Email",
      render: (row) => (
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box className="email-preview"><Box /><Box /><Box /></Box>
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontSize={12} fontWeight={800}>{row.name}</Typography>
              <Chip label={row.status} size="small" className={row.status === "Sent" || row.status === "Delivered" ? "active-chip" : "neutral-chip"} />
            </Stack>
            <Typography color="text.secondary" fontSize={10}>{row.detail}</Typography>
            <Typography color="text.secondary" fontSize={10} sx={{ mt: 0.5 }}>{row.meta}</Typography>
          </Box>
        </Stack>
      ),
    },
    { key: "status", label: "Type", render: (row) => <Typography color="text.secondary" fontSize={11}>{row.status}</Typography> },
    { key: "meta", label: "Updated", render: (row) => <Typography color="text.secondary" fontSize={11}>{row.meta.split(" · ")[1] ?? row.meta}</Typography> },
    {
      key: "action",
      label: "",
      align: "right",
      render: () => <Button size="small" variant="contained">{tab === "drafts" ? "Continue editing" : tab === "templates" ? "Edit" : "View"}</Button>,
    },
  ];
  return (
    <Stack gap={2.5} className="email-workspace">
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={2}>
        <Box>
          <Typography variant="h3">Email workspace</Typography>
          <Typography color="text.secondary" fontSize={12}>Create, manage, and reuse email content for {project.name} campaigns and journeys.</Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="contained" startIcon={<AddRounded />}>Create email campaign</Button>
          <Button variant="outlined" startIcon={<GridViewRounded />}>Create email template</Button>
        </Stack>
      </Stack>
      <Box className="workspace-tabs">
        {emailTabs.map(({ id, label, count: tabCount, icon: Icon }) => (
          <Button key={id} onClick={() => { setTab(id); setPage(1); }} className={`workspace-tab ${id}-tab ${tab === id ? "active" : ""}`} startIcon={<Icon />}>
            <span>{label}</span><Chip label={tabCount} size="small" />
          </Button>
        ))}
      </Box>
      <Card className="saas-card data-panel email-data-panel">
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
          <Box>
            <Typography variant="h3">{tab === "templates" ? "My Templates" : tab === "drafts" ? "Draft emails" : "Sent campaigns"}</Typography>
            <Typography color="text.secondary" fontSize={12}>{tab === "templates" ? "Reusable content blocks ready for your next campaign." : tab === "drafts" ? "Continue editing saved email drafts." : "Track the latest email campaigns and their performance."}</Typography>
          </Box>
          <Stack direction="row" gap={1} className="data-toolbar email-toolbar">
            <TextField size="small" placeholder={`Search ${tab === "templates" ? "templates" : tab === "drafts" ? "drafts" : "campaigns"}`} className="table-search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} />
            <Select size="small" defaultValue="recent" className="filter-select"><MenuItem value="recent">Recently updated</MenuItem><MenuItem value="name">Name</MenuItem></Select>
          </Stack>
        </Stack>
        <ReusableDataTable
          columns={columns}
          rows={rows}
          totalCount={String(activeQuery.data?.total ?? 0)}
          noun={tab === "templates" ? "templates" : tab === "drafts" ? "drafts" : "campaigns"}
          showMenu={false}
          loading={activeQuery.isLoading || (activeQuery.isFetching && !activeQuery.data)}
          page={page}
          serverPageSize={25}
          hasPreviousPage={page > 1}
          hasNextPage={rows.length === 25}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
        />
      </Card>
    </Stack>
  );
}

function EmailSection() {
  const [tab, setTab] = useState<"send" | "drafts" | "templates">("templates");
  const project = projectContext(
    useSelector((state: RootState) => state.ui.selectedProject),
  );
  const emailRows =
    tab === "templates"
      ? [
          {
            id: "welcome",
            name: "Welcome New Users",
            detail:
              "Introduce PixlLove, highlight profile setup, and invite users to start matching.",
            meta: "Onboarding · Updated today",
            status: "Reusable template",
          },
          {
            id: "premium",
            name: "Premium Offer",
            detail:
              "A clean offer layout with benefits, pricing nudge, and a strong upgrade action.",
            meta: "Promotion · Updated yesterday",
            status: "Reusable template",
          },
          {
            id: "reengagement",
            name: "Re-engagement",
            detail:
              "Bring inactive subscribers back with warm copy and personalized reminders.",
            meta: "Winback · Updated 2 days ago",
            status: "Reusable template",
          },
          {
            id: "product-update",
            name: "Product Update",
            detail:
              "Share new features, product improvements, and important announcements.",
            meta: "Product · Updated 4 days ago",
            status: "Reusable template",
          },
        ]
      : tab === "drafts"
        ? [
            {
              id: "draft-1",
              name: "Welcome back",
              detail: "Continue editing your onboarding email draft.",
              meta: "Draft · Edited 2 hrs ago",
              status: "Draft",
            },
            {
              id: "draft-2",
              name: "Spring promotion",
              detail: "Draft campaign for the next seasonal promotion.",
              meta: "Draft · Edited yesterday",
              status: "Draft",
            },
          ]
        : [
            {
              id: "campaign-1",
              name: "Back in Action",
              detail: "Re-engagement campaign sent to at-risk users.",
              meta: "125.4K delivered · 42.8% open rate",
              status: "Delivered",
            },
            {
              id: "campaign-2",
              name: "Welcome Series",
              detail: "Onboarding email sequence for new users.",
              meta: "18.4K delivered · 38.2% open rate",
              status: "Delivered",
            },
          ];
  const emailColumns: DataTableColumn<(typeof emailRows)[number]>[] = [
    {
      key: "name",
      label: "Email",
      render: (row) => (
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Box className="email-preview">
            <Box />
            <Box />
            <Box />
          </Box>
          <Box>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography fontSize={12} fontWeight={800}>
                {row.name}
              </Typography>
              <Chip
                label={row.status}
                size="small"
                className={
                  row.status === "Delivered" ? "active-chip" : "neutral-chip"
                }
              />
            </Stack>
            <Typography color="text.secondary" fontSize={10}>
              {row.detail}
            </Typography>
            <Typography color="text.secondary" fontSize={10} sx={{ mt: 0.5 }}>
              {row.meta}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      key: "status",
      label: "Type",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.status}
        </Typography>
      ),
    },
    {
      key: "meta",
      label: "Updated",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.meta.split(" · ")[1] ?? row.meta}
        </Typography>
      ),
    },
    {
      key: "action",
      label: "",
      align: "right",
      render: (row) => (
        <Button size="small" variant="contained">
          {tab === "drafts"
            ? "Continue editing"
            : tab === "templates"
              ? "Edit"
              : "View"}
        </Button>
      ),
    },
  ];
  const emailTabs = [
    { id: "send" as const, label: "Send", count: "1", icon: SendRounded },
    { id: "drafts" as const, label: "Drafts", count: "2", icon: EditRounded },
    {
      id: "templates" as const,
      label: "My Templates",
      count: "4",
      icon: GridViewRounded,
    },
  ];
  return (
    <Stack gap={2.5} className="email-workspace">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h3">Email workspace</Typography>
          <Typography color="text.secondary" fontSize={12}>
            Create, manage, and reuse email content for {project.name} campaigns
            and journeys.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button variant="contained" startIcon={<AddRounded />}>
            Create email campaign
          </Button>
          <Button variant="outlined" startIcon={<GridViewRounded />}>
            Create email template
          </Button>
        </Stack>
      </Stack>
      <Box className="workspace-tabs">
        {emailTabs.map(({ id, label, count, icon: Icon }) => (
          <Button
            key={id}
            onClick={() => setTab(id)}
            className={`workspace-tab ${id}-tab ${tab === id ? "active" : ""}`}
            startIcon={<Icon />}
          >
            <span>{label}</span>
            <Chip label={count} size="small" />
          </Button>
        ))}
      </Box>
      <Card className="saas-card data-panel email-data-panel">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          gap={2}
        >
          <Box>
            <Typography variant="h3">
              {tab === "templates"
                ? "My Templates"
                : tab === "drafts"
                  ? "Draft emails"
                  : "Sent campaigns"}
            </Typography>
            <Typography color="text.secondary" fontSize={12}>
              {tab === "templates"
                ? "Reusable content blocks ready for your next campaign."
                : tab === "drafts"
                  ? "Continue editing saved email drafts."
                  : "Track the latest email campaigns and their performance."}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} className="data-toolbar email-toolbar">
            <TextField
              size="small"
              placeholder={`Search ${tab === "templates" ? "templates" : tab === "drafts" ? "drafts" : "campaigns"}`}
              className="table-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              size="small"
              defaultValue="recent"
              className="filter-select"
            >
              <MenuItem value="recent">Recently updated</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </Stack>
        </Stack>
        <ReusableDataTable
          columns={emailColumns}
          rows={emailRows}
          totalCount={String(emailRows.length)}
          noun={
            tab === "templates"
              ? "templates"
              : tab === "drafts"
                ? "drafts"
                : "campaigns"
          }
          showMenu={false}
        />
      </Card>
    </Stack>
  );
}

function PushSection() {
  const { active } = useActiveProject();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"send" | "drafts" | "templates">("templates");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState<"campaign" | "template" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    severity: "success" | "error";
  } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const templatesQuery = useQuery({
    queryKey: ["push", "templates", active?.id, page, deferredSearch],
    queryFn: () =>
      pushApi.templates.list(active!.id, {
        page,
        limit: 25,
        search: deferredSearch,
        category: "template",
      }),
    enabled: Boolean(active?.id),
  });
  const draftsQuery = useQuery({
    queryKey: ["push", "campaigns", active?.id, "draft", page, deferredSearch],
    queryFn: () =>
      pushApi.campaigns.list(active!.id, {
        tab: "draft",
        page,
        limit: 25,
        search: deferredSearch,
      }),
    enabled: Boolean(active?.id),
  });
  const sentQuery = useQuery({
    queryKey: ["push", "campaigns", active?.id, "sent", page, deferredSearch],
    queryFn: () =>
      pushApi.campaigns.list(active!.id, {
        tab: "sent",
        page,
        limit: 25,
        search: deferredSearch,
      }),
    enabled: Boolean(active?.id),
  });
  const actionMutation = useMutation({
    mutationFn: async ({
      kind,
      id,
    }: {
      kind: "duplicate" | "remove";
      id: string;
    }) => {
      if (!active?.id) throw new Error("Select a project first.");
      if (kind === "duplicate")
        return pushApi.templates.duplicate(active.id, id);
      if (tab === "send") return pushApi.campaigns.cancel(active.id, id);
      return tab === "templates"
        ? pushApi.templates.delete(active.id, id)
        : pushApi.campaigns.delete(active.id, id);
    },
    onSuccess: (_result, variables) => {
      setDeleteTarget(null);
      setToast({
        message:
          variables.kind === "remove"
            ? "Deleted successfully."
            : "Duplicated successfully.",
        severity: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["push"] });
    },
    onError: (cause: Error) =>
      setToast({
        message: cause.message || "Could not delete this item.",
        severity: "error",
      }),
  });
  if (composer)
    return (
      <PushComposer
        mode={composer}
        onBack={() => setComposer(null)}
        onSaved={(target) => {
          setComposer(null);
          setTab(target === "send" ? "send" : target);
          setPage(1);
        }}
      />
    );
  type PushRow = {
    id: string;
    name: string;
    title: string;
    message: string;
    category: string;
    created: string;
    status: string;
    target: string;
    sends: string;
    clicks: string;
  };
  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—";
  const templateRows: PushRow[] = (templatesQuery.data?.items ?? []).map(
    (item: PushTemplate) => ({
      id: item.id,
      name: item.name,
      title: item.title,
      message: item.body,
      category:
        item.category === "push_notification"
          ? "Push notification"
          : "Template",
      created: formatDate(item.updatedAt),
      status: item.status === "active" ? "Active" : (item.status ?? "Active"),
      target: "Reusable content",
      sends: item.sends === undefined ? "—" : item.sends.toLocaleString(),
      clicks: item.opens === undefined ? "—" : item.opens.toLocaleString(),
    }),
  );
  const campaignRows: PushRow[] = (
    (tab === "drafts" ? draftsQuery.data?.items : sentQuery.data?.items) ?? []
  ).map((item: PushCampaign) => ({
    id: item.id,
    name: item.name,
    title: item.template?.title ?? "—",
    message: item.template?.body ?? "—",
    category: item.category === "template" ? "Template" : "Push notification",
    created: formatDate(item.updatedAt),
    status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    target: item.audience?.allUsers
      ? "All eligible users"
      : item.audience?.audienceGroupIds?.length
        ? "Audience group"
        : item.audience?.lifecycleSegmentIds?.length
          ? "Lifecycle segment"
          : "Selected users",
    sends:
      item.stats?.sent === undefined ? "—" : item.stats.sent.toLocaleString(),
    clicks:
      item.stats?.opened === undefined
        ? "—"
        : `${item.stats.opened.toLocaleString()} · ${item.stats.openRate.toFixed(1)}%`,
  }));
  const activeQuery =
    tab === "templates"
      ? templatesQuery
      : tab === "drafts"
        ? draftsQuery
        : sentQuery;
  const pushRows: PushRow[] = tab === "templates" ? templateRows : campaignRows;
  const pushColumns: DataTableColumn<PushRow>[] = [
    {
      key: "name",
      label: "Notification name",
      render: (row) => (
        <Box>
          <Typography fontSize={12} fontWeight={800}>
            {row.name}
          </Typography>
          <Typography color="text.secondary" fontSize={10}>
            {row.category}
          </Typography>
        </Box>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (row) => <Typography fontSize={11}>{row.title}</Typography>,
    },
    {
      key: "message",
      label: "Message",
      render: (row) => <Typography fontSize={11}>{row.message}</Typography>,
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <Chip label={row.category} size="small" className="neutral-chip" />
      ),
    },
    {
      key: "created",
      label: "Created / updated",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.created}
        </Typography>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Chip
          label={row.status}
          size="small"
          className={
            row.status === "Sent"
              ? "active-chip"
              : row.status === "Draft"
                ? "warning-chip"
                : "neutral-chip"
          }
        />
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.target}
        </Typography>
      ),
    },
    {
      key: "sends",
      label: "Sends",
      align: "right",
      render: (row) => (
        <Typography
          color={row.sends === "—" ? "text.secondary" : "#168c5b"}
          fontSize={11}
          fontWeight={800}
        >
          {row.sends}
        </Typography>
      ),
    },
    {
      key: "clicks",
      label: "Opens",
      align: "right",
      render: (row) => (
        <Typography color="text.secondary" fontSize={11}>
          {row.clicks}
        </Typography>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row) => (
        <Stack
          direction="row"
          justifyContent="flex-end"
          className="table-row-actions"
        >
          {tab === "templates" && (
            <IconButton
              size="small"
              aria-label={`Duplicate ${row.name}`}
              onClick={() =>
                actionMutation.mutate({ kind: "duplicate", id: row.id })
              }
              disabled={actionMutation.isPending}
            >
              <ContentCopyRounded fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small"
            aria-label={
              tab === "send" ? `Cancel ${row.name}` : `Delete ${row.name}`
            }
            onClick={() => setDeleteTarget({ id: row.id, name: row.name })}
            disabled={actionMutation.isPending}
          >
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];
  const pushTabs = [
    {
      id: "send" as const,
      label: "Send",
      count: String(
        sentQuery.data?.tabCounts?.send ?? sentQuery.data?.total ?? 0,
      ),
      icon: SendRounded,
    },
    {
      id: "drafts" as const,
      label: "Drafts",
      count: String(
        draftsQuery.data?.tabCounts?.drafts ?? draftsQuery.data?.total ?? 0,
      ),
      icon: EditRounded,
    },
    {
      id: "templates" as const,
      label: "My Templates",
      count: String(
        templatesQuery.data?.tabCounts?.templates ??
          templatesQuery.data?.total ??
          0,
      ),
      icon: GridViewRounded,
    },
  ];
  return (
    <Stack gap={2.5} className="email-workspace push-workspace">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="flex-end"
        alignItems={{ md: "center" }}
        gap={2}
      >
        <Stack direction="row" gap={1}>
          <Button
            variant="contained"
            startIcon={<SendRounded />}
            onClick={() => setComposer("campaign")}
          >
            Create push campaign
          </Button>
          <Button
            variant="outlined"
            startIcon={<GridViewRounded />}
            onClick={() => setComposer("template")}
          >
            Create push template
          </Button>
        </Stack>
      </Stack>
      <Box className="workspace-tabs">
        {pushTabs.map(({ id, label, count, icon: Icon }) => (
          <Button
            key={id}
            onClick={() => {
              setTab(id);
              setPage(1);
            }}
            className={`workspace-tab ${id}-tab ${tab === id ? "active" : ""}`}
            startIcon={<Icon />}
          >
            <span>{label}</span>
            <Chip label={count} size="small" />
          </Button>
        ))}
      </Box>
      <Card className="saas-card data-panel email-data-panel">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ sm: "center" }}
          gap={2}
        >
          <Box>
            <Typography variant="h3">
              {tab === "templates"
                ? "My Templates"
                : tab === "drafts"
                  ? "Draft notifications"
                  : "Sent notifications"}
            </Typography>
            <Typography color="text.secondary" fontSize={12}>
              {tab === "templates"
                ? "Reusable push content ready for your next campaign."
                : tab === "drafts"
                  ? "Continue editing saved push notification drafts."
                  : "Track delivery and click performance for sent notifications."}
            </Typography>
          </Box>
          <Stack direction="row" gap={1} className="data-toolbar email-toolbar">
            <TextField
              size="small"
              placeholder="Search by name, title, or message ..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="table-search"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Select
              size="small"
              defaultValue="recent"
              className="filter-select"
            >
              <MenuItem value="recent">Recently updated</MenuItem>
              <MenuItem value="name">Name</MenuItem>
            </Select>
          </Stack>
        </Stack>
        {activeQuery.isError && (
          <Typography color="warning.main" fontSize={11}>
            The push API is unavailable. Refresh after the backend is reachable.
          </Typography>
        )}
        <ReusableDataTable
          columns={pushColumns}
          rows={pushRows}
          totalCount={
            activeQuery.data?.total ??
            (activeQuery.isError || !active ? pushRows.length : 0)
          }
          noun={
            tab === "templates"
              ? "templates"
              : tab === "drafts"
                ? "drafts"
                : "campaigns"
          }
          showMenu={false}
          loading={
            activeQuery.isLoading ||
            (activeQuery.isFetching && !activeQuery.data)
          }
          hasPreviousPage={page > 1}
          hasNextPage={Boolean(
            activeQuery.data &&
            page * activeQuery.data.limit < activeQuery.data.total,
          )}
          onPreviousPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
          page={page}
          serverPageSize={25}
        />
      </Card>
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        loading={actionMutation.isPending}
        onConfirm={() => { if (deleteTarget) actionMutation.mutate({ kind: "remove", id: deleteTarget.id }); }}
      />
      <Toast message={toast?.message ?? null} severity={toast?.severity} onClose={() => setToast(null)} />
    </Stack>
  );
}

export function JourneysSection() {
  return <JourneyWorkspace />;
}

export function IntegrationsSection() {
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Integrations</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Connect the services {projectName} needs to send, receive and measure
          communication.
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {[
          [
            "Firebase / FCM",
            "Push delivery and device tokens",
            "Connected",
            "Firebase credentials are encrypted and valid.",
            "Connected",
          ],
          [
            "Email sending domain",
            "Production email sender identity",
            "Verified",
            "pixltrace.com · DNS records verified",
            "Verified",
          ],
          [
            "React Native / Expo SDK",
            "Event ingestion and user identity",
            "Receiving events",
            "SDK v1.0.4 · Last event 2 min ago",
            "Connected",
          ],
        ].map(([name, desc, status, detail, button]) => (
          <Grid item xs={12} md={4} key={name}>
            <Card className="integration-card">
              <Box className="integration-icon">
                <StorageRounded />
              </Box>
              <Typography fontWeight={900} sx={{ mt: 2 }}>
                {name}
              </Typography>
              <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
                {desc}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" gap={1} alignItems="center">
                <CheckCircleRounded sx={{ color: "#15965e", fontSize: 18 }} />
                <Typography fontSize={12} fontWeight={800} color="#15965e">
                  {status}
                </Typography>
              </Stack>
              <Typography color="text.secondary" fontSize={11} sx={{ mt: 0.7 }}>
                {detail}
              </Typography>
              <Button variant="outlined" fullWidth sx={{ mt: 2 }}>
                Manage
              </Button>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card className="saas-card">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h3">SDK / ingestion keys</Typography>
            <Typography color="text.secondary" fontSize={12}>
              Rotate public keys safely without breaking older app versions.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddRounded />}>
            Create key
          </Button>
        </Stack>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Production mobile", "Production", "Jun 12, 2025", "Active"],
              ["Staging testing", "Staging", "May 28, 2025", "Active"],
            ].map((row) => (
              <TableRow key={row[0]}>
                {row.map((x, i) => (
                  <TableCell
                    key={x}
                    sx={{ fontSize: 12, fontWeight: i === 0 ? 800 : 400 }}
                  >
                    {i === 3 ? (
                      <Chip label={x} size="small" className="active-chip" />
                    ) : (
                      x
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}

/** Team & Access: real members and invitations of the active Project. */
export function TeamSection() {
  return <TeamAccessPanel />;
}

type BillingTab = "overview" | "history" | "methods" | "profile";
type PaymentMethodType = "card" | "paypal" | "stripe" | "payoneer";
type VerificationStatus = "idle" | "verifying" | "success" | "error";

type PaymentMethodRecord = {
  id: string;
  type: PaymentMethodType;
  brand?: "Visa" | "Mastercard" | "Card";
  last4?: string;
  holder?: string;
  expiry?: string;
  account?: string;
  isDefault: boolean;
};

const billingPlans = {
  free: { label: "Free", price: "$0", description: "For exploring PixlPush with a lightweight setup." },
  starter: { label: "Starter", price: "$49", description: "For growing teams sending their first campaigns." },
  pro: { label: "Pro", price: "$249", description: "For teams running serious retention programs." },
  enterprise: { label: "Enterprise", price: "Custom", description: "Flexible limits, support, and controls for larger teams." },
};

const billingHistory = [
  { date: "Oct 01, 2026", description: "Free plan · Monthly subscription", amount: "$0.00", status: "Active" },
  { date: "Sep 01, 2026", description: "Pro plan · Monthly subscription", amount: "$249.00", status: "Paid" },
  { date: "Aug 01, 2026", description: "Pro plan · Monthly subscription", amount: "$249.00", status: "Paid" },
  { date: "Jul 01, 2026", description: "Pro plan · Monthly subscription", amount: "$249.00", status: "Paid" },
];

function cardBrandFromNumber(number: string): "Visa" | "Mastercard" | "Card" {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("4")) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  return "Card";
}

function paymentMethodLabel(type: PaymentMethodType) {
  if (type === "paypal") return "PayPal";
  if (type === "stripe") return "Stripe";
  if (type === "payoneer") return "Payoneer";
  return "Credit or debit card";
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
}

function PaymentBrandMark({
  type,
  compact = false,
}: {
  type: PaymentMethodType;
  compact?: boolean;
}) {
  if (type === "card") {
    return (
      <Box
        sx={{
          width: compact ? 34 : 42,
          height: compact ? 23 : 28,
          borderRadius: 0.75,
          display: "grid",
          placeItems: "center",
          color: "#fff",
          background: "linear-gradient(135deg, #1c2541, #4355a4)",
          fontSize: compact ? 8 : 10,
          fontWeight: 900,
          letterSpacing: 0.3,
        }}
      >
        <Stack direction="row" alignItems="center" gap={0.25}>
          <Box sx={{ width: compact ? 9 : 11, height: compact ? 9 : 11, borderRadius: "50%", backgroundColor: "#ef4444", opacity: 0.92 }} />
          <Box sx={{ width: compact ? 9 : 11, height: compact ? 9 : 11, borderRadius: "50%", backgroundColor: "#fbbf24", opacity: 0.92, ml: -0.8 }} />
        </Stack>
      </Box>
    );
  }
  const labels: Record<Exclude<PaymentMethodType, "card">, string> = {
    paypal: "P",
    stripe: "S",
    payoneer: "p",
  };
  return (
    <Box
      sx={{
        width: compact ? 34 : 42,
        height: compact ? 23 : 28,
        borderRadius: 0.75,
        display: "grid",
        placeItems: "center",
        color: "#fff",
        background:
          type === "paypal"
            ? "#125ba8"
            : type === "stripe"
              ? "#635bff"
              : "#18a775",
        fontSize: compact ? 14 : 17,
        fontWeight: 900,
        fontStyle: type === "payoneer" ? "italic" : "normal",
      }}
    >
      {labels[type]}
    </Box>
  );
}

function PaymentMethodPreview({
  method,
  onDefault,
  onRemove,
}: {
  method: PaymentMethodRecord;
  onDefault: () => void;
  onRemove: () => void;
}) {
  const isCard = method.type === "card";
  return (
    <Card
      sx={{
        p: 1.5,
        border: "1px solid #ebe8f2",
        borderRadius: 2,
        boxShadow: "0 10px 30px rgba(48, 24, 83, .06)",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 380,
          aspectRatio: "1.586 / 1",
          borderRadius: 1.75,
          p: 2,
          color: "#fff",
          background:
            method.type === "card"
              ? "linear-gradient(135deg, #211234 0%, #55209c 58%, #ba317e 100%)"
              : "linear-gradient(135deg, #17132b 0%, #312052 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.25), 0 12px 24px rgba(35,20,62,.18)",
        }}
      >
        <Box sx={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", right: -78, top: -80, background: "rgba(255,255,255,.08)" }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" gap={1}>
            <PaymentBrandMark type={method.type} compact />
            <Typography fontWeight={800} fontSize={13}>{isCard ? method.brand : paymentMethodLabel(method.type)}</Typography>
          </Stack>
          {!method.isDefault && (
            <Chip
              label="Payment method"
              size="small"
              sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,.16)", fontSize: 10, fontWeight: 700 }}
            />
          )}
          {method.isDefault && (
            <Box
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                color: "#176b38",
                backgroundColor: "#d9f8e4",
                boxShadow: "0 3px 10px rgba(14,96,47,.18)",
              }}
            >
              <CheckCircleRounded sx={{ fontSize: 15 }} />
              <Typography fontSize={10} fontWeight={900}>Default</Typography>
            </Box>
          )}
        </Stack>
        {isCard && (
          <Stack direction="row" alignItems="center" gap={1.25}>
            <Box sx={{ width: 34, height: 25, borderRadius: 0.75, background: "linear-gradient(135deg,#e8d39d,#fff0bd)", border: "1px solid rgba(84,51,10,.35)" }} />
            <Typography fontSize={16} sx={{ letterSpacing: 2, opacity: 0.9 }}>)))</Typography>
          </Stack>
        )}
        <Box>
          <Typography
            sx={{
              letterSpacing: isCard ? 2 : 0,
              fontSize: isCard ? { xs: 15, sm: 18 } : 15,
              fontWeight: 700,
              fontFamily: isCard ? "monospace" : "inherit",
            }}
          >
            {isCard ? "•••• •••• •••• " + method.last4 : method.account}
          </Typography>
          {isCard && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography fontSize={11} sx={{ opacity: 0.75 }}>
                {method.holder}
              </Typography>
              <Typography fontSize={11} sx={{ opacity: 0.75 }}>
                Expires {method.expiry}
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mt: 1.25 }}>
        <Typography fontSize={12} color="text.secondary">
          {isCard ? "Securely stored card" : "Connected payment account"}
        </Typography>
        <Stack direction="row" gap={0.5}>
          {!method.isDefault && (
            <Button size="small" onClick={onDefault} sx={{ textTransform: "none" }}>
              Make default
            </Button>
          )}
          <IconButton size="small" color="error" onClick={onRemove} aria-label="Remove payment method">
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Card>
  );
}

function PaymentVerificationDialog({
  status,
  method,
  onClose,
  onRetry,
}: {
  status: VerificationStatus;
  method: PaymentMethodRecord | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  const isVerifying = status === "verifying";
  const isSuccess = status === "success";
  const title = isVerifying
    ? "Verifying your payment method"
    : isSuccess
      ? "Payment method verified"
      : "We couldn’t verify this method";
  const description = isVerifying
    ? "We’re securely checking the payment details. This usually takes a few seconds."
    : isSuccess
      ? "Your payment method is verified and ready for future billing."
      : "Check the details and try again. Your payment method was not saved.";

  return (
    <Dialog
      open
      onClose={isVerifying ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          overflow: "hidden",
          borderRadius: 2.5,
          border: "1px solid #ebe5f2",
          boxShadow: "0 28px 80px rgba(37,21,65,.26)",
        },
      }}
    >
      <DialogContent sx={{ px: 3, pt: 3.5, pb: 2.5, textAlign: "center" }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            mx: "auto",
            position: "relative",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            backgroundColor: isSuccess ? "#e8f8ee" : status === "error" ? "#fff0f1" : "#f1eafd",
            color: isSuccess ? "#159447" : status === "error" ? "#d6314b" : "#6724c8",
          }}
        >
          {isVerifying && (
            <>
              <CircularProgress
                size={88}
                thickness={2.5}
                sx={{ position: "absolute", color: "#7a35d9", animationDuration: "1.1s" }}
              />
              <AutorenewRounded
                sx={{
                  fontSize: 34,
                  animation: "payment-verify-spin 1s linear infinite",
                  "@keyframes payment-verify-spin": {
                    from: { transform: "rotate(0deg)" },
                    to: { transform: "rotate(360deg)" },
                  },
                }}
              />
            </>
          )}
          {isSuccess && <CheckCircleRounded sx={{ fontSize: 58 }} />}
          {status === "error" && <ErrorOutlineRounded sx={{ fontSize: 58 }} />}
        </Box>
        <Typography fontSize={22} fontWeight={900} sx={{ mt: 2.25, color: "#28163c" }}>
          {title}
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.75, lineHeight: 1.6 }}>
          {description}
        </Typography>
        {method && (
          <Box
            sx={{
              mt: 2.25,
              px: 1.5,
              py: 1.25,
              display: "inline-flex",
              alignItems: "center",
              gap: 1,
              border: "1px solid #e9e2f1",
              borderRadius: 1.5,
              backgroundColor: "#fcfbff",
            }}
          >
            <CreditCardRounded sx={{ color: "#6e28d9", fontSize: 20 }} />
            <Typography fontSize={12} fontWeight={800}>
              {method.type === "card"
                ? method.brand + " ending in " + method.last4
                : paymentMethodLabel(method.type)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", gap: 1, px: 3, pb: 3 }}>
        {isVerifying ? (
          <Button disabled sx={{ textTransform: "none", color: "#6e28d9", fontWeight: 800 }}>
            Verifying securely…
          </Button>
        ) : isSuccess ? (
          <Button variant="contained" onClick={onClose} sx={{ minWidth: 130, borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}>
              Close
            </Button>
            <Button variant="contained" onClick={onRetry} sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}>
              Try again
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function SetDefaultPaymentDialog({
  method,
  onClose,
  onConfirm,
}: {
  method: PaymentMethodRecord | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={Boolean(method)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          border: "1px solid #ebe5f2",
          boxShadow: "0 24px 70px rgba(37,21,65,.24)",
        },
      }}
    >
      <DialogContent sx={{ px: 3, pt: 3.5, pb: 2, textAlign: "center" }}>
        <Box sx={{ width: 68, height: 68, mx: "auto", display: "grid", placeItems: "center", borderRadius: "50%", color: "#159447", backgroundColor: "#e8f8ee" }}>
          <CheckCircleRounded sx={{ fontSize: 40 }} />
        </Box>
        <Typography fontSize={21} fontWeight={900} sx={{ mt: 2, color: "#28163c" }}>
          Set as default?
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.75, lineHeight: 1.6 }}>
          Use this payment method for future billing and move it to the top of your payment methods.
        </Typography>
        {method && (
          <Box sx={{ mt: 2, p: 1.25, display: "inline-flex", alignItems: "center", gap: 1, border: "1px solid #e9e2f1", borderRadius: 1.5, backgroundColor: "#fcfbff" }}>
            <CreditCardRounded sx={{ color: "#6e28d9", fontSize: 20 }} />
            <Typography fontSize={12} fontWeight={800}>
              {method.type === "card" ? method.brand + " ending in " + method.last4 : paymentMethodLabel(method.type)}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", gap: 1, px: 3, pb: 3 }}>
        <Button onClick={onClose} sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} sx={{ borderRadius: 1.5, textTransform: "none", fontWeight: 800 }}>
          Set as default
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function BillingSection() {
  const { active } = useActiveProject();
  const project = projectContext(active?.id ?? "");
  const [tab, setTab] = useState<BillingTab>("overview");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
  const [paymentStorageKey, setPaymentStorageKey] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentMethodType>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethodRecord | null>(null);
  const [paymentMethodToMakeDefault, setPaymentMethodToMakeDefault] = useState<PaymentMethodRecord | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethodRecord | null>(null);
  const [verificationWillFail, setVerificationWillFail] = useState(false);
  const [profile, setProfile] = useState<BillingContact>({ email: "" });

  const billingQuery = useQuery({
    queryKey: ["projects", "billing", active?.id, "subscription"],
    queryFn: () => billingApi.subscription(active!.id),
    enabled: Boolean(active?.id),
  });
  const saveProfileMutation = useMutation({
    mutationFn: (input: BillingContact) => billingApi.updateContact(active!.id, input),
    onSuccess: (saved) => setProfile(saved),
  });

  useEffect(() => {
    if (!active?.id) {
      setPaymentMethods([]);
      setPaymentStorageKey(null);
      return;
    }
    const key = "pixlpush-payment-methods-" + active.id;
    setPaymentStorageKey(key);
    try {
      const stored = window.localStorage.getItem(key);
      setPaymentMethods(stored ? (JSON.parse(stored) as PaymentMethodRecord[]) : []);
    } catch {
      setPaymentMethods([]);
    }
  }, [active?.id]);

  useEffect(() => {
    if (paymentStorageKey) {
      window.localStorage.setItem(paymentStorageKey, JSON.stringify(paymentMethods));
    }
  }, [paymentMethods, paymentStorageKey]);

  useEffect(() => {
    if (billingQuery.data?.billingContact) setProfile(billingQuery.data.billingContact);
  }, [billingQuery.data]);

  useEffect(() => {
    if (verificationStatus !== "verifying" || !pendingPaymentMethod) return;
    const timer = window.setTimeout(() => {
      if (verificationWillFail) {
        setVerificationStatus("error");
        return;
      }
      setPaymentMethods((current) => [...current, pendingPaymentMethod]);
      setVerificationStatus("success");
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [pendingPaymentMethod, verificationStatus, verificationWillFail]);

  const subscriptionPlan = active?.subscription?.plan ?? "free";
  const plan = billingPlans[subscriptionPlan];
  const usage = [
    { label: "Reachable users", value: project.metrics.reachable, limit: "25,000", percent: 169, icon: PeopleAltRounded, color: "#f0445d" },
    { label: "Email sends", value: "125,400", limit: "250,000", percent: 50, icon: EmailRounded, color: "#db3291" },
    { label: "Push sends", value: "84,200", limit: "500,000", percent: 17, icon: SendRounded, color: "#7a3be0" },
    { label: "Active journeys", value: "3", limit: "20", percent: 15, icon: AutoGraphRounded, color: "#18a677" },
    { label: "AI credits", value: "624", limit: "2,000", percent: 31, icon: InsightsRounded, color: "#ee9c35" },
  ];

  const resetPaymentForm = () => {
    setPaymentType("card");
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardCvc("");
    setAccountIdentifier("");
    setPaymentError("");
  };

  const addPaymentMethod = () => {
    if (paymentType === "card") {
      const digits = cardNumber.replace(/\D/g, "");
      if (digits.length < 12 || !cardHolder.trim() || !cardExpiry.trim() || cardCvc.replace(/\D/g, "").length < 3) {
        setPaymentError("Enter valid card details to continue.");
        return;
      }
    } else if (!accountIdentifier.trim()) {
      setPaymentError("Enter the email or account ID for this payment method.");
      return;
    }

    const digits = cardNumber.replace(/\D/g, "");
    const method: PaymentMethodRecord =
      paymentType === "card"
        ? {
            id: String(Date.now()),
            type: "card",
            brand: cardBrandFromNumber(cardNumber),
            last4: digits.slice(-4),
            holder: cardHolder.trim(),
            expiry: cardExpiry.trim(),
            isDefault: paymentMethods.length === 0,
          }
        : {
            id: String(Date.now()),
            type: paymentType,
            account: accountIdentifier.trim(),
            isDefault: paymentMethods.length === 0,
          };
    setPendingPaymentMethod(method);
    setVerificationWillFail(
      (paymentType === "card" && (cardCvc.replace(/\D/g, "") === "000" || digits.endsWith("0000"))) ||
        accountIdentifier.trim().toLowerCase().includes("fail"),
    );
    setDialogOpen(false);
    resetPaymentForm();
    setVerificationStatus("verifying");
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods((current) => {
      const removed = current.find((item) => item.id === id);
      const remaining = current.filter((item) => item.id !== id);
      if (removed?.isDefault && remaining[0]) remaining[0] = { ...remaining[0], isDefault: true };
      return remaining;
    });
  };

  const makeDefault = (id: string) => {
    setPaymentMethods((current) => current.map((item) => ({ ...item, isDefault: item.id === id })));
  };

  const displayedPaymentMethods = [...paymentMethods].sort(
    (first, second) => Number(second.isDefault) - Number(first.isDefault),
  );

  const closeVerification = () => {
    setVerificationStatus("idle");
    setPendingPaymentMethod(null);
    setVerificationWillFail(false);
  };

  const retryVerification = () => {
    closeVerification();
    resetPaymentForm();
    setDialogOpen(true);
  };

  const exportBillingHistory = () => {
    const csv = [
      ["Date", "Description", "Amount", "Status"],
      ...billingHistory.map((entry) => [entry.date, entry.description, entry.amount, entry.status]),
    ]
      .map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pixlpush-billing-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const profileFields = [
    ["name", "Billing name"],
    ["company", "Company"],
    ["email", "Billing email"],
    ["addressLine1", "Address"],
    ["city", "City"],
    ["postalCode", "Postal code"],
    ["country", "Country"],
    ["vatId", "VAT / tax ID"],
  ] as const;

  return (
    <Stack gap={2.5}>
      <Box className="workspace-tabs billing-workspace-tabs">
        {[
          { id: "overview" as BillingTab, label: "Overview", icon: InsightsRounded },
          { id: "history" as BillingTab, label: "Billing history", icon: ReceiptLongRounded },
          { id: "methods" as BillingTab, label: "Payment methods", icon: CreditCardRounded },
          { id: "profile" as BillingTab, label: "Billing details", icon: AccountBalanceWalletRounded },
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            onClick={() => setTab(id)}
            className={tab === id ? "workspace-tab active" : "workspace-tab"}
            startIcon={<Icon />}
            aria-pressed={tab === id}
          >
            {label}
          </Button>
        ))}
      </Box>

      {tab === "overview" && (
        <Stack gap={2.5}>
          <Card
            sx={{
              overflow: "hidden",
              borderRadius: 2,
              border: "1px solid #e8e1f0",
              boxShadow: "0 14px 35px rgba(58,34,96,.08)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.45fr .8fr" },
            }}
          >
            <Box sx={{ p: { xs: 2.5, md: 3.25 }, color: "#fff", background: "linear-gradient(125deg,#24133c 0%,#4b1e88 62%,#7026c9 100%)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                <Box>
                  <Typography fontSize={11} fontWeight={900} sx={{ letterSpacing: 1.6, color: "rgba(255,255,255,.68)" }}>
                    CURRENT PLAN
                  </Typography>
                  <Typography fontSize={{ xs: 30, md: 38 }} fontWeight={900} sx={{ mt: 0.5 }}>
                    {plan.label}
                  </Typography>
                </Box>
                <Chip icon={<CheckCircleRounded />} label="Active" size="small" sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,.14)", "& .MuiChip-icon": { color: "#a6f2b4" } }} />
              </Stack>
              <Typography sx={{ color: "rgba(255,255,255,.76)", maxWidth: 500, mt: 1 }} fontSize={13}>
                {plan.description}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2.5 }}>
                <Chip icon={<ShieldRounded />} label="Secure billing" size="small" sx={{ color: "#fff", backgroundColor: "rgba(255,255,255,.12)", "& .MuiChip-icon": { color: "#d8c3ff" } }} />
                <Chip label="Renews monthly" size="small" sx={{ color: "rgba(255,255,255,.8)", backgroundColor: "rgba(255,255,255,.08)" }} />
              </Stack>
            </Box>
            <Box sx={{ p: { xs: 2.5, md: 3.25 }, backgroundColor: "#fff" }}>
              <Typography fontSize={11} fontWeight={900} sx={{ letterSpacing: 1.3, color: "#8e8798" }}>
                MONTHLY INVESTMENT
              </Typography>
              <Typography fontSize={{ xs: 30, md: 36 }} fontWeight={900} sx={{ mt: 0.35, color: "#241434" }}>
                {plan.price}
                {plan.price !== "Custom" && <Typography component="span" fontSize={13} color="text.secondary"> / month</Typography>}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" gap={2}>
                <Box>
                  <Typography fontSize={11} color="text.secondary">Next billing date</Typography>
                  <Typography fontSize={13} fontWeight={800} sx={{ mt: 0.35 }}>Nov 01, 2026</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography fontSize={11} color="text.secondary">Payment method</Typography>
                  <Typography fontSize={13} fontWeight={800} sx={{ mt: 0.35 }}>Not added</Typography>
                </Box>
              </Stack>
              <Button variant="outlined" onClick={() => setTab("profile")} fullWidth sx={{ mt: 2.25, borderRadius: 1.25, textTransform: "none", fontWeight: 800 }}>
                Manage subscription
              </Button>
            </Box>
          </Card>

          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "end" }} gap={1.5}>
            <Box>
              <Typography variant="h3">Usage this billing cycle</Typography>
              <Typography color="text.secondary" fontSize={12}>Keep an eye on the limits that matter to your project.</Typography>
            </Box>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ alignSelf: { xs: "flex-start", sm: "auto" } }}>
              <Chip label="1 limit needs attention" size="small" sx={{ backgroundColor: "#fff0f1", color: "#d72f48", fontWeight: 800 }} />
              <Chip label="Oct 01 – Oct 31, 2026" size="small" sx={{ backgroundColor: "#f3edfc", color: "#6422c5", fontWeight: 800 }} />
            </Stack>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(5, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {usage.map(({ label, value, limit, percent, icon: UsageIcon, color }) => (
              <Card
                className="usage-card"
                key={label}
                sx={{
                  p: 2,
                  minHeight: 184,
                  borderRadius: 2,
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  "&::before": { content: '""', position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: color },
                }}
              >
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Stack direction="row" gap={1} alignItems="center" minWidth={0}>
                    <Box sx={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 1.25, color, backgroundColor: color + "18" }}>
                      <UsageIcon fontSize="small" />
                    </Box>
                    <Typography fontWeight={800} fontSize={13} sx={{ lineHeight: 1.25 }}>{label}</Typography>
                  </Stack>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      flexShrink: 0,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "conic-gradient(" + color + " " + Math.min(percent, 100) + "%, #eeeaf5 0)",
                    }}
                  >
                    <Box sx={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "#fff" }}>
                      <Typography fontSize={10} fontWeight={900} sx={{ color }}>{percent}%</Typography>
                    </Box>
                  </Box>
                </Stack>
                <Box sx={{ mt: 1.5 }}>
                  <Typography fontSize={19} fontWeight={900} sx={{ color: "#261735" }}>
                    {value}
                    <Typography component="span" fontSize={11} fontWeight={600} color="text.secondary"> / {limit}</Typography>
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(percent, 100)}
                    sx={{ mt: 1, "& .MuiLinearProgress-bar": { backgroundColor: color } }}
                  />
                  <Typography color={percent > 100 ? "error.main" : "text.secondary"} fontSize={11} fontWeight={percent > 100 ? 800 : 400} sx={{ mt: 0.8 }}>
                    {percent > 100 ? "Over limit" : percent + "% used this period"}
                  </Typography>
                </Box>
              </Card>
            ))}
          </Box>
          <Card className="saas-card" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
              <Box>
                <Typography variant="h3">Need more capacity?</Typography>
                <Typography color="text.secondary" fontSize={12}>Upgrade your plan when your audience and campaigns grow.</Typography>
              </Box>
              <Button variant="contained" onClick={() => setTab("profile")} sx={{ alignSelf: { sm: "center" }, textTransform: "none" }}>
                View plan options
              </Button>
            </Stack>
          </Card>
        </Stack>
      )}

      {tab === "history" && (
        <Card className="saas-card" sx={{ p: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
            <Box>
              <Typography variant="h3">Billing history</Typography>
              <Typography color="text.secondary" fontSize={12}>Invoices and payment activity for this project.</Typography>
            </Box>
            <Button variant="outlined" startIcon={<FileDownloadRounded />} onClick={exportBillingHistory} sx={{ textTransform: "none", borderRadius: 1.25 }}>
              Export CSV
            </Button>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {billingHistory.map((entry) => (
                <TableRow key={entry.date + entry.description} hover>
                  <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{entry.date}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{entry.description}</TableCell>
                  <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>{entry.amount}</TableCell>
                  <TableCell>
                    <Chip
                      label={entry.status}
                      size="small"
                      icon={<CheckCircleRounded />}
                      sx={{
                        color: entry.status === "Active" ? "#19743c" : "#2763a5",
                        backgroundColor: entry.status === "Active" ? "#e7f8ed" : "#eaf2ff",
                        fontSize: 11,
                        fontWeight: 800,
                        "& .MuiChip-icon": { color: "inherit" },
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} sx={{ pt: 2, borderBottom: 0 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <ReceiptLongRounded sx={{ fontSize: 18, color: "#9874c9" }} />
                    <Typography color="text.secondary" fontSize={11}>
                      Sample billing activity shown for preview purposes.
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === "methods" && (
        <Stack gap={2.5}>
          <Card className="saas-card" sx={{ p: 2.5 }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={2}>
              <Box>
                <Typography variant="h3">Payment methods</Typography>
                <Typography color="text.secondary" fontSize={12}>Add multiple methods and choose which one is used by default.</Typography>
              </Box>
              <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialogOpen(true)} sx={{ textTransform: "none" }}>Add payment method</Button>
            </Stack>
          </Card>
          {paymentMethods.length === 0 ? (
            <Card className="saas-card" sx={{ p: 5, textAlign: "center" }}>
              <CreditCardRounded sx={{ fontSize: 48, color: "#9874c9" }} />
              <Typography variant="h3" sx={{ mt: 1 }}>No payment methods added</Typography>
              <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>Add a card or connect a payment account to manage future billing.</Typography>
              <Button variant="outlined" startIcon={<AddRounded />} onClick={() => setDialogOpen(true)} sx={{ mt: 2, textTransform: "none" }}>Add your first method</Button>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {displayedPaymentMethods.map((method) => (
                <Grid item xs={12} sm={6} lg={4} key={method.id}>
                  <PaymentMethodPreview method={method} onDefault={() => setPaymentMethodToMakeDefault(method)} onRemove={() => setPaymentMethodToDelete(method)} />
                </Grid>
              ))}
            </Grid>
          )}
          <Alert severity="info" icon={<ShieldRounded />} sx={{ borderRadius: 2 }}>
            Your full card number and security code are never stored in this workspace. Only the masked last four digits are shown.
          </Alert>
        </Stack>
      )}

      {tab === "profile" && (
        <Card className="saas-card" sx={{ p: 2.5 }}>
          <Typography variant="h3">Billing details</Typography>
          <Typography color="text.secondary" fontSize={12}>Keep your invoice recipient and tax information up to date.</Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {profileFields.map(([key, label]) => (
              <Grid item xs={12} sm={key === "addressLine1" || key === "company" ? 6 : 4} key={key}>
                <TextField
                  fullWidth
                  size="small"
                  label={label}
                  value={profile[key] ?? ""}
                  onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                  type={key === "email" ? "email" : "text"}
                />
              </Grid>
            ))}
          </Grid>
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={!active?.id || !profile.email || saveProfileMutation.isPending}
              onClick={() => active?.id && saveProfileMutation.mutate(profile)}
              sx={{ textTransform: "none" }}
            >
              {saveProfileMutation.isPending ? "Saving..." : "Save billing details"}
            </Button>
          </Stack>
        </Card>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); resetPaymentForm(); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            overflow: "hidden",
            border: "1px solid #ebe8f2",
            boxShadow: "0 24px 70px rgba(30,18,52,.24)",
          },
        }}
      >
        <DialogTitle sx={{ px: 3, pt: 3, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Box sx={{ width: 42, height: 42, borderRadius: 1.5, display: "grid", placeItems: "center", color: "#6e28d9", backgroundColor: "#f1eafd" }}>
              <CreditCardRounded />
            </Box>
            <Box>
              <Typography fontSize={22} fontWeight={900}>Add payment method</Typography>
              <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.25 }}>
                Add a secure method for future billing.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 1.5, backgroundColor: "#fcfbff" }}>
          <Alert severity="info" icon={<ShieldRounded />} sx={{ mb: 2, borderRadius: 1.5, fontSize: 12 }}>
            Your full card number and CVC are never stored.
          </Alert>
          <Typography fontSize={12} fontWeight={900} sx={{ mb: 1 }}>
            Choose a payment method
          </Typography>
          <Grid container spacing={1} sx={{ mb: 2.5 }}>
            {(["card", "paypal", "stripe", "payoneer"] as PaymentMethodType[]).map((type) => (
              <Grid item xs={6} key={type}>
                <Button
                  fullWidth
                  variant={paymentType === type ? "contained" : "outlined"}
                  onClick={() => { setPaymentType(type); setPaymentError(""); }}
                  sx={{
                    minHeight: 58,
                    justifyContent: "flex-start",
                    gap: 1,
                    px: 1.25,
                    borderRadius: 1.5,
                    textTransform: "none",
                    borderColor: paymentType === type ? "transparent" : "#ddd6eb",
                    color: paymentType === type ? "#fff" : "#342047",
                    backgroundColor: paymentType === type ? "#6422c5" : "#fff",
                    "&:hover": {
                      borderColor: "#6422c5",
                      backgroundColor: paymentType === type ? "#5519b3" : "#f7f2ff",
                    },
                  }}
                >
                  <PaymentBrandMark type={type} compact />
                  <Box sx={{ textAlign: "left" }}>
                    <Typography fontSize={12} fontWeight={900}>
                      {type === "card" ? "Visa / Mastercard" : paymentMethodLabel(type)}
                    </Typography>
                    <Typography fontSize={10} sx={{ opacity: 0.7 }}>
                      {type === "card" ? "Credit or debit card" : "Connected account"}
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            ))}
          </Grid>
          {paymentType === "card" ? (
            <Stack gap={2}>
              <TextField label="Card number" value={cardNumber} onChange={(event) => setCardNumber(formatCardNumber(event.target.value))} fullWidth size="small" placeholder="1234 5678 9012 3456" inputProps={{ inputMode: "numeric" }} />
              <TextField label="Name on card" value={cardHolder} onChange={(event) => setCardHolder(event.target.value)} fullWidth size="small" />
              <Stack direction="row" gap={2}>
                <TextField label="Expiry" value={cardExpiry} onChange={(event) => setCardExpiry(formatExpiry(event.target.value))} fullWidth size="small" placeholder="MM/YY" />
                <TextField label="CVC" value={cardCvc} onChange={(event) => setCardCvc(event.target.value)} fullWidth size="small" type="password" inputProps={{ inputMode: "numeric", maxLength: 4 }} />
              </Stack>
            </Stack>
          ) : (
            <TextField
              label={paymentType === "paypal" ? "PayPal email" : paymentMethodLabel(paymentType) + " account ID or email"}
              value={accountIdentifier}
              onChange={(event) => setAccountIdentifier(event.target.value)}
              fullWidth
              size="small"
              type={paymentType === "paypal" ? "email" : "text"}
              placeholder={paymentType === "paypal" ? "you@example.com" : "Account ID or email"}
            />
          )}
          {paymentError && <Alert severity="warning" sx={{ mt: 2 }}>{paymentError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2.5, borderTop: "1px solid #eeeaf5", backgroundColor: "#fff" }}>
          <Button onClick={() => { setDialogOpen(false); resetPaymentForm(); }} sx={{ textTransform: "none", color: "#6b6378" }}>Cancel</Button>
          <Button variant="contained" onClick={addPaymentMethod} sx={{ textTransform: "none", borderRadius: 1.5, px: 2.5 }}>
            Add method
          </Button>
        </DialogActions>
      </Dialog>
      <DeleteConfirmDialog
        open={Boolean(paymentMethodToDelete)}
        onClose={() => setPaymentMethodToDelete(null)}
        onConfirm={() => {
          if (paymentMethodToDelete) {
            removePaymentMethod(paymentMethodToDelete.id);
            setPaymentMethodToDelete(null);
          }
        }}
        title="Remove this payment method?"
        description={
          paymentMethodToDelete
            ? "Remove " +
              (paymentMethodToDelete.type === "card"
                ? paymentMethodToDelete.brand + " ending in " + paymentMethodToDelete.last4
                : paymentMethodLabel(paymentMethodToDelete.type)) +
              "? This action cannot be undone."
            : "This action cannot be undone."
        }
      />
      <PaymentVerificationDialog
        status={verificationStatus}
        method={pendingPaymentMethod}
        onClose={closeVerification}
        onRetry={retryVerification}
      />
      <SetDefaultPaymentDialog
        method={paymentMethodToMakeDefault}
        onClose={() => setPaymentMethodToMakeDefault(null)}
        onConfirm={() => {
          if (paymentMethodToMakeDefault) {
            makeDefault(paymentMethodToMakeDefault.id);
            setPaymentMethodToMakeDefault(null);
          }
        }}
      />
    </Stack>
  );
}

export function SettingsSection() {
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Project settings</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Settings apply only to the active Project.
        </Typography>
      </Box>
      {[
        ["Project details", projectName, "Project name, ID and environment"],
        [
          "Data & privacy",
          "Consent and retention controls",
          "Manage data minimization and deletion workflows",
        ],
        [
          "Danger zone",
          `Deactivate ${projectName}`,
          "14-day recovery window · does not cancel billing",
        ],
      ].map(([title, value, desc], i) => (
        <Card className="settings-row" key={title}>
          <Box className="settings-icon">
            <SettingsRounded />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900}>{title}</Typography>
            <Typography fontSize={13} sx={{ mt: 0.4 }}>
              {value}
            </Typography>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
              {desc}
            </Typography>
          </Box>
          <Button
            variant={i === 2 ? "outlined" : "text"}
            color={i === 2 ? "error" : "primary"}
          >
            {i === 2 ? "Deactivate" : "Manage"}
          </Button>
        </Card>
      ))}
    </Stack>
  );
}
