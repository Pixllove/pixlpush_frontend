"use client";

import { useDeferredValue, useEffect, useState } from "react";
import TeamAccessPanel from "./team/TeamAccessPanel";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import {
  AddRounded,
  ArrowForwardRounded,
  AutoGraphRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  CodeRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  EditRounded,
  EmailRounded,
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
  SearchRounded,
  SendRounded,
  SettingsRounded,
  StorageRounded,
  TrendingUpRounded,
  VerifiedRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
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
  emailApi,
  lifecycleSegmentsApi,
  pushApi,
  userStatsApi,
  usersApi,
} from "@/lib/projects/api";
import type { AudienceGroup, EndUser, LifecycleSegment } from "@/types/project";
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
  useEffect(() => {
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

export function BillingSection() {
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  const project = projectContext(active?.id ?? "");
  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Billing & Usage</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Plan, limits and usage for the active {projectName} Project.
        </Typography>
      </Box>
      <Card className="plan-card">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          gap={2}
        >
          <Box>
            <Chip label="CURRENT PLAN" size="small" />
            <Typography fontSize={30} fontWeight={900} sx={{ mt: 1 }}>
              {active?.subscription?.plan
                ? active.subscription.plan.charAt(0).toUpperCase() +
                  active.subscription.plan.slice(1)
                : "—"}
            </Typography>
            <Typography color="text.secondary" fontSize={13}>
              For growing products with serious retention programs.
            </Typography>
          </Box>
          <Box textAlign={{ sm: "right" }}>
            <Typography fontSize={26} fontWeight={900}>
              {project.plan.includes("Internal") ? "Internal" : "$249"}{" "}
              {!project.plan.includes("Internal") && (
                <Typography
                  component="span"
                  color="text.secondary"
                  fontSize={13}
                >
                  / month
                </Typography>
              )}
            </Typography>
            <Button variant="outlined" sx={{ mt: 1 }}>
              Manage subscription
            </Button>
          </Box>
        </Stack>
      </Card>
      <Grid container spacing={2}>
        {[
          ["Reachable Users", project.metrics.reachable, "25,000", "169%"],
          ["Email Sends", "125,400", "250,000", "50%"],
          ["Push Sends", "84,200", "500,000", "17%"],
          ["Active Journeys", "3", "20", "15%"],
          ["AI Credits", "624", "2,000", "31%"],
        ].map(([label, value, limit, percent]) => (
          <Grid item xs={12} sm={6} md={4} key={label}>
            <Card className="usage-card">
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight={800} fontSize={13}>
                  {label}
                </Typography>
                <Typography fontSize={12} color="text.secondary">
                  {value} / {limit}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(Number(percent.replace("%", "")), 100)}
                sx={{ mt: 1.5 }}
              />
              <Typography color="text.secondary" fontSize={11} sx={{ mt: 0.7 }}>
                {percent} used this billing period
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card className="saas-card">
        <Typography variant="h3">Invoices</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Your Project billing history
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 2 }}>
          No invoices available in this prototype.
        </Typography>
      </Card>
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
