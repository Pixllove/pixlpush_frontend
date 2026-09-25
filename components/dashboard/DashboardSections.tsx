"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useActiveProject } from "@/hooks/projects/use-active-project";
import ReusableDataTable, { DataTableColumn } from "./ReusableDataTable";
import PushComposer from "./PushComposer";
import JourneyWorkspace from "./JourneyWorkspace";
import AudienceGroupCreateDialog from "./AudienceGroupCreateDialog";
import UserImportDialog from "./UserImportDialog";

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
  const [tab, setTab] = useState<'users' | 'segments' | 'groups'>('users');
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [importUsersOpen, setImportUsersOpen] = useState(false);
  const [removedGroupIds, setRemovedGroupIds] = useState<string[]>([]);
  const selectedProject = useSelector(
    (state: RootState) => state.ui.selectedProject,
  );
  const { active } = useActiveProject();
  const projectName = active?.name ?? "this project";
  const project = projectContext(selectedProject);
  const tabs = [{ id: 'users' as const, label: 'All users', icon: PeopleAltRounded, count: '48.9K' }, { id: 'segments' as const, label: 'Lifecycle segments', icon: InsightsRounded, count: '12' }, { id: 'groups' as const, label: 'Audience groups', icon: GroupsRounded, count: '8' }];
  const users = [{ id: 'customer_123', user: 'customer_123', segment: 'Paid Customer', reachability: 'Push + Email', lastActive: '2 min ago', location: 'Canada' }, { id: 'customer_847', user: 'customer_847', segment: 'Incomplete Onboarding', reachability: 'Push only', lastActive: '14 min ago', location: 'United States' }, { id: 'customer_219', user: 'customer_219', segment: 'Onboarding Complete', reachability: 'Email only', lastActive: '1 hr ago', location: 'United Kingdom' }, { id: 'customer_091', user: 'customer_091', segment: 'No segment', reachability: 'Unreachable', lastActive: '3 hrs ago', location: 'Australia' }, { id: 'customer_442', user: 'customer_442', segment: 'Paid Customer', reachability: 'Push + Email', lastActive: '5 hrs ago', location: 'Germany' }];
  const exportUsers = () => {
    const columns = ['User', 'Lifecycle segment', 'Reachability', 'Last active', 'Location'];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [columns, ...users.map(row => [row.user, row.segment, row.reachability, row.lastActive, row.location])].map(row => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const userColumns: DataTableColumn<typeof users[number]>[] = [{ key: 'user', label: 'User', render: row => <Box className="user-table-link" role="link" tabIndex={0} onClick={() => router.push(`/dashboard/users/${row.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') router.push(`/dashboard/users/${row.id}`); }}><Typography fontSize={12} fontWeight={800}>{row.user}</Typography><Typography color="text.secondary" fontSize={10}>Identified user</Typography></Box> }, { key: 'segment', label: 'Lifecycle segment' }, { key: 'reachability', label: 'Reachability' }, { key: 'lastActive', label: 'Last active' }, { key: 'location', label: 'Location' }];
  const segments = [{ id: 'new-users', name: 'New users', count: '12,480', share: '30%', color: '#9b53e1', description: 'Users who joined in the last 7 days', updated: 'Updated automatically' }, { id: 'onboarding-complete', name: 'Onboarding complete', count: '16,204', share: '38%', color: '#35a579', description: 'Completed the core onboarding event', updated: 'Updated automatically' }, { id: 'paid-customers', name: 'Paid customers', count: '8,421', share: '20%', color: '#ef7049', description: 'Completed a purchase or subscription', updated: 'Updated automatically' }, { id: 'at-risk', name: 'At-risk / inactive', count: '5,215', share: '12%', color: '#e0a04d', description: 'No meaningful activity in 14 days', updated: 'Updated automatically' }];
  const segmentColumns: DataTableColumn<typeof segments[number]>[] = [{ key: 'name', label: 'Segment', render: row => <Box className="segment-table-link" role="link" tabIndex={0} onClick={() => router.push(`/dashboard/users/segments/${row.id}`)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') router.push(`/dashboard/users/segments/${row.id}`); }}><Stack direction="row" alignItems="center" gap={1.2}><Box className="segment-color" sx={{ bgcolor: row.color }} /><Box><Stack direction="row" alignItems="center" gap={1}><Typography fontSize={12} fontWeight={800}>{row.name}</Typography><Chip label="AUTO LIFECYCLE" size="small" /></Stack><Typography color="text.secondary" fontSize={10}>{row.description}</Typography></Box></Stack></Box> }, { key: 'updated', label: 'Status', render: row => <Typography color="#168c5b" fontSize={11} fontWeight={800}>{row.updated}</Typography> }, { key: 'share', label: 'Share', align: 'right' }, { key: 'count', label: 'Users', align: 'right', render: row => <Box className="segment-count"><Typography color="text.secondary" fontSize={10}><GroupsRounded fontSize="inherit" /> Users</Typography><strong>{row.count}</strong></Box> }];
  const groups = [{ id: 'at-risk-customers', name: 'At-risk customers', count: '3,804', updated: 'Updated 8 min ago', description: 'High intent users showing early churn signals' }, { id: 'premium-subscribers', name: 'Premium subscribers', count: '1,982', updated: 'Updated 21 min ago', description: 'Active subscribers on a premium plan' }, { id: 'new-users-7-days', name: 'New users · 7 days', count: '4,218', updated: 'Updated 1 hr ago', description: 'Users still inside the activation window' }];
  const visibleGroups = groups.filter(group => !removedGroupIds.includes(group.id));
  const groupColumns: DataTableColumn<typeof groups[number]>[] = [{ key: 'name', label: 'Audience group', render: row => <Stack direction="row" alignItems="center" gap={1.2}><Box className="group-dot" /><Box><Stack direction="row" alignItems="center" gap={1}><Typography fontSize={12} fontWeight={800}>{row.name}</Typography><Chip label="DYNAMIC" size="small" /></Stack><Typography color="text.secondary" fontSize={10}>{row.description}</Typography></Box></Stack> }, { key: 'updated', label: 'Updated', render: row => <Typography color="text.secondary" fontSize={11}>{row.updated}</Typography> }, { key: 'count', label: 'Users', align: 'right', render: row => <Box className="segment-count"><Typography color="text.secondary" fontSize={10}><GroupsRounded fontSize="inherit" /> Users</Typography><strong>{row.count}</strong></Box> }, { key: 'action', label: '', align: 'right', render: row => <Stack direction="row" justifyContent="flex-end" alignItems="center" gap={.5}><Button size="small" variant="outlined" className="group-view-button" onClick={() => router.push(`/dashboard/users/groups/${row.id}`)}>View group</Button><IconButton aria-label={`Remove ${row.name}`} title="Remove group" className="group-delete-button" onClick={() => { if (window.confirm('Remove this audience group?')) setRemovedGroupIds(current => [...current, row.id]); }}><DeleteOutlineRounded fontSize="small" /></IconButton></Stack> }];
  return <Stack gap={2.5} className="users-workspace">
    <Box className="workspace-tabs">{tabs.map(({ id, label, icon: Icon, count }) => <Button key={id} onClick={() => setTab(id)} className={tab === id ? 'workspace-tab active' : 'workspace-tab'} startIcon={<Icon />}><span>{label}</span><Chip label={count} size="small" /></Button>)}</Box>
    {tab === 'users' && <Stack gap={2}><Grid container spacing={2}><Grid item xs={12} sm={4}><StatCard icon={GroupsRounded} label="Identified users" value={selectedProject === 'PixlLove' ? '184,286' : '48,912'} trend="+8.4% this month" /></Grid><Grid item xs={12} sm={4}><StatCard icon={NotificationsActiveRounded} label="Reachable users" value={project.metrics.reachable} trend={`${project.metrics.reachRate} of users`} /></Grid><Grid item xs={12} sm={4}><StatCard icon={EventRounded} label="Events today" value={selectedProject === 'PixlLove' ? '48,902' : '18,492'} trend="+14.1% vs yesterday" /></Grid></Grid><Card className="saas-card data-panel"><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2}><Box><Typography variant="h3">All users</Typography><Typography color="text.secondary" fontSize={12}>Search and inspect identified people in {projectName}.</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button variant="contained" startIcon={<FileUploadRounded />} className="users-import-button" onClick={() => setImportUsersOpen(true)}>Import users</Button><Button variant="contained" startIcon={<FileDownloadRounded />} className="users-export-button" onClick={exportUsers}>Export</Button></Stack></Stack><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2} className="data-toolbar"><TextField size="small" placeholder="Search by user ID, email or country" className="table-search" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} /><Select size="small" defaultValue="all" className="filter-select" startAdornment={<InputAdornment position="start"><FilterListRounded fontSize="small" /></InputAdornment>}><MenuItem value="all">All users</MenuItem><MenuItem value="email-subscribed">Email subscribed</MenuItem><MenuItem value="email-unsubscribed">Email unsubscribed</MenuItem><MenuItem value="push-enabled">Push enabled</MenuItem><MenuItem value="unreachable">Unreachable users</MenuItem></Select></Stack><ReusableDataTable columns={userColumns} rows={users} totalCount={selectedProject === 'PixlLove' ? '184,286' : '48,912'} noun="users" showMenu={false} /></Card></Stack>}
    {tab === 'segments' && <Stack gap={2}><Card className="setup-strip segment-getting-started"><Box className="setup-intro"><Box className="setup-icon"><ManageSearchRounded /></Box><Box><Typography fontWeight={900}>Getting started</Typography><Typography color="text.secondary" fontSize={12}>Create <strong>Lifecycle Segments</strong> based on what users do in your app. Integrate the SDK, choose events, set conditions and filters, and we&apos;ll keep segments up to date automatically.</Typography><Button href="/docs" size="small" sx={{ mt: 1, px: 0 }} endIcon={<ArrowForwardRounded />}>View documentation</Button></Box></Box><Stack direction={{ xs: 'column', sm: 'row' }} gap={1} className="setup-steps"><Box className="setup-step"><Box className="setup-step-icon"><CodeRounded /></Box><Box><Stack direction="row" alignItems="center" gap={.7}><span>1</span><Typography fontSize={11} fontWeight={800}>Integrate SDK</Typography></Stack><Typography className="setup-step-desc">Connect the PixlPush SDK to start sending events from your app.</Typography></Box></Box><Box className="setup-step"><Box className="setup-step-icon"><AutoGraphRounded /></Box><Box><Stack direction="row" alignItems="center" gap={.7}><span>2</span><Typography fontSize={11} fontWeight={800}>Choose events</Typography></Stack><Typography className="setup-step-desc">Pick the events you want to track, like sign up, purchase or screen view.</Typography></Box></Box><Box className="setup-step"><Box className="setup-step-icon"><FilterListRounded /></Box><Box><Stack direction="row" alignItems="center" gap={.7}><span>3</span><Typography fontSize={11} fontWeight={800}>Add conditions</Typography></Stack><Typography className="setup-step-desc">Define rules and filters to include the right users in the segment.</Typography></Box></Box><Box className="setup-step"><Box className="setup-step-icon"><GroupsRounded /></Box><Box><Stack direction="row" alignItems="center" gap={.7}><span>4</span><Typography fontSize={11} fontWeight={800}>Segment updates</Typography></Stack><Typography className="setup-step-desc">Segments update automatically as users take action in your app.</Typography></Box></Box></Stack></Card><Card className="saas-card data-panel"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Lifecycle segments</Typography><Typography color="text.secondary" fontSize={12}>Automatic classifications that update as users take action in {projectName}.</Typography></Box><Button variant="contained" startIcon={<AddRounded />}>Create segment</Button></Stack><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.2} className="data-toolbar"><TextField size="small" placeholder="Search segments" className="table-search" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} /><Select size="small" defaultValue="updated" className="filter-select" startAdornment={<InputAdornment position="start"><CalendarTodayRounded fontSize="small" /></InputAdornment>}><MenuItem value="updated">Recently updated</MenuItem><MenuItem value="created">Date created</MenuItem><MenuItem value="largest">Most users</MenuItem></Select></Stack><ReusableDataTable columns={segmentColumns} rows={segments} totalCount="12" noun="segments" showMenu={false} /></Card></Stack>}
    {tab === 'groups' && <Card className="saas-card data-panel"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h3">Audience groups</Typography><Typography color="text.secondary" fontSize={12}>Dynamic targeting groups for campaigns and journey automations.</Typography></Box><Button variant="contained" startIcon={<AddRounded />} onClick={() => setCreateGroupOpen(true)}>Create group</Button></Stack><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2} className="data-toolbar"><TextField size="small" placeholder="Search audience groups" className="table-search" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} /><Select size="small" defaultValue="created" className="filter-select" startAdornment={<InputAdornment position="start"><CalendarTodayRounded fontSize="small" /></InputAdornment>}><MenuItem value="created">Date created</MenuItem><MenuItem value="updated">Recently updated</MenuItem><MenuItem value="largest">Most users</MenuItem></Select></Stack><ReusableDataTable columns={groupColumns} rows={visibleGroups} totalCount={String(visibleGroups.length)} noun="groups" showMenu={false} /></Card>}
    <AudienceGroupCreateDialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} onCreate={(name) => { setCreateGroupOpen(false); router.push(`/dashboard/users/groups/${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}`); }} />
    <UserImportDialog open={importUsersOpen} onClose={() => setImportUsersOpen(false)} />
  </Stack>;
}

export function ChannelSection({ channel }: { channel: "email" | "push" }) {
  const email = channel === "email";
  if (email) return <EmailSection />;
  return <PushSection />;
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
  const [tab, setTab] = useState<"send" | "drafts" | "templates">("templates");
  const [composer, setComposer] = useState<"campaign" | "template" | null>(
    null,
  );
  const project = projectContext(
    useSelector((state: RootState) => state.ui.selectedProject),
  );
  if (composer)
    return (
      <PushComposer
        mode={composer}
        onBack={() => setComposer(null)}
        onSaved={(target) => {
          setComposer(null);
          setTab(target === "send" ? "send" : target);
        }}
      />
    );
  const pushRows =
    tab === "templates"
      ? [
          {
            id: "push-welcome",
            name: "Welcome back",
            title: "Someone liked you... 👀",
            message: "Find out who it is now.",
            category: "Push template",
            created: "Updated today",
            status: "Template",
            target: "New users",
            sends: "—",
            clicks: "—",
          },
          {
            id: "push-offer",
            name: "Premium offer",
            title: "Last chance ⏳",
            message:
              "Your 50% offer is about to expire. 👉 Open now to claim it.",
            category: "Push template",
            created: "Updated yesterday",
            status: "Template",
            target: "At-risk users",
            sends: "—",
            clicks: "—",
          },
          {
            id: "push-reengagement",
            name: "Re-engagement",
            title: "Someone you liked might...",
            message: "Don’t miss your chance to reconnect.",
            category: "Push template",
            created: "Updated 2 days ago",
            status: "Template",
            target: "Inactive users",
            sends: "—",
            clicks: "—",
          },
          {
            id: "push-update",
            name: "Product update",
            title: "Discover what’s new ✨",
            message: "New features and improvements are waiting for you.",
            category: "Push template",
            created: "Updated 4 days ago",
            status: "Template",
            target: "All eligible users",
            sends: "—",
            clicks: "—",
          },
        ]
      : tab === "drafts"
        ? [
            {
              id: "push-draft-1",
              name: "Urgency Peak",
              title: "Last Chance ⏳",
              message: "Your 50% offer is about to expire.",
              category: "Push notification",
              created: "Edited 2 hrs ago",
              status: "Draft",
              target: "Android + iOS",
              sends: "—",
              clicks: "—",
            },
            {
              id: "push-draft-2",
              name: "Welcome onboarding",
              title: "Welcome to PixlLove 🎉",
              message:
                "Start your first match now — exciting profiles are waiting.",
              category: "Push notification",
              created: "Edited yesterday",
              status: "Draft",
              target: "Android + iOS",
              sends: "—",
              clicks: "—",
            },
            {
              id: "push-draft-3",
              name: "Swiping reminder",
              title: "You got a like 💜",
              message:
                "Click on the eye icon to view the profile behind the like.",
              category: "Push notification",
              created: "Edited Dec 11",
              status: "Draft",
              target: "Android + iOS",
              sends: "—",
              clicks: "—",
            },
          ]
        : [
            {
              id: "push-campaign-1",
              name: "Hot lead 6",
              title: "Someone liked you... 👀",
              message: "Find out who it is now.",
              category: "Templates",
              created: "Apr 1, 2026",
              status: "Sent",
              target: "Android + iOS",
              sends: "1,199",
              clicks: "13 · 1.1%",
            },
            {
              id: "push-campaign-2",
              name: "Hot lead 5",
              title: "Last Chance ⏳",
              message:
                "Your 50% offer is about to expire. 👉 Open now to claim it.",
              category: "Templates",
              created: "Apr 1, 2026",
              status: "Sent",
              target: "Android + iOS",
              sends: "1,519",
              clicks: "17 · 1.1%",
            },
            {
              id: "push-campaign-3",
              name: "Hot lead 4",
              title: "50% OFF — just for you 🤩",
              message:
                "Unlock Premium now with 50% off! Enjoy unlimited live chats.",
              category: "Templates",
              created: "Apr 1, 2026",
              status: "Sent",
              target: "Android + iOS",
              sends: "1,850",
              clicks: "11 · 0.6%",
            },
            {
              id: "push-campaign-4",
              name: "Hot lead 3",
              title: "Unlock everything instantly 🏆",
              message:
                "Unlimited chats. More visibility. More matches. Your upgrade changes everything.",
              category: "Templates",
              created: "Apr 1, 2026",
              status: "Sent",
              target: "Android + iOS",
              sends: "2,225",
              clicks: "19 · 0.9%",
            },
            {
              id: "push-campaign-5",
              name: "Hot lead 2",
              title: "Your matches won’t wait... 💔",
              message:
                "Someone you liked might already be talking to someone else.",
              category: "Templates",
              created: "Apr 1, 2026",
              status: "Sent",
              target: "Android + iOS",
              sends: "2,793",
              clicks: "47 · 1.7%",
            },
          ];
  const pushColumns: DataTableColumn<(typeof pushRows)[number]>[] = [
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
        <Chip
          label={row.category === "Templates" ? "Templates" : row.status}
          size="small"
          className="neutral-chip"
        />
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
      label: "Clicks",
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
          <IconButton size="small" aria-label={`Duplicate ${row.name}`}>
            <ContentCopyRounded fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label={`Delete ${row.name}`}>
            <DeleteOutlineRounded fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ];
  const pushTabs = [
    { id: "send" as const, label: "Send", count: "23", icon: SendRounded },
    { id: "drafts" as const, label: "Drafts", count: "3", icon: EditRounded },
    {
      id: "templates" as const,
      label: "My Templates",
      count: "26",
      icon: GridViewRounded,
    },
  ];
  return (
    <Stack gap={2.5} className="email-workspace push-workspace">
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ md: "center" }}
        gap={2}
      >
        <Box>
          <Typography variant="h3">Push workspace</Typography>
          <Typography color="text.secondary" fontSize={12}>
            Create, manage, and reuse push notifications for {project.name}{" "}
            campaigns and journeys.
          </Typography>
        </Box>
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
              placeholder="Search by name, title, or description ..."
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
          columns={pushColumns}
          rows={pushRows}
          totalCount={
            tab === "templates" ? "26" : tab === "drafts" ? "3" : "23"
          }
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

export function TeamSection() {
  return (
    <Stack gap={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h3">Team & Access</Typography>
          <Typography color="text.secondary" fontSize={12}>
            Manage who can access the active Project and what they can do.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRounded />}>
          Invite member
        </Button>
      </Stack>
      <Card className="saas-card">
        <Typography variant="h3">Project members</Typography>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last active</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ["Hassib", "hassib@pixlpush.com", "Owner", "Activated", "Now"],
              [
                "Kamran",
                "kamran@pixlpush.com",
                "Admin",
                "Activated",
                "2 hrs ago",
              ],
              ["Maya Chen", "maya@acme.com", "Analyst", "Pending", "—"],
            ].map((row) => (
              <TableRow key={row[0]}>
                <TableCell>
                  <Typography fontWeight={800} fontSize={12}>
                    {row[0]}
                  </Typography>
                  <Typography color="text.secondary" fontSize={11}>
                    {row[1]}
                  </Typography>
                </TableCell>
                {row.slice(2).map((x, i) => (
                  <TableCell key={x} sx={{ fontSize: 12 }}>
                    {i === 1 ? (
                      <Chip
                        label={x}
                        size="small"
                        className={
                          x === "Activated" ? "active-chip" : "paused-chip"
                        }
                      />
                    ) : (
                      x
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <MoreHorizRounded fontSize="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="saas-card">
        <Typography variant="h3">Project roles</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Owner, Admin, Developer, Analyst, Read-only and Billing are scoped to
          this Project.
        </Typography>
      </Card>
    </Stack>
  );
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
