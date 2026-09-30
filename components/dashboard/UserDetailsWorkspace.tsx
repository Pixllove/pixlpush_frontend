"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ElementType } from "react";
import {
  ArrowBackRounded,
  CalendarTodayRounded,
  CheckCircleRounded,
  CodeRounded,
  ContentCopyRounded,
  EmailRounded,
  GroupsRounded,
  LanguageRounded,
  LocationOnRounded,
  NotificationsActiveRounded,
  PhoneAndroidRounded,
  PublicRounded,
  RouteRounded,
  SendRounded,
  TimelineRounded,
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
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { eventsApi, usersApi } from "@/lib/projects/api";
import type { UserActivity, UserProfile } from "@/types/project";

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const display = (value: unknown) =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : String(value);

export default function UserDetailsWorkspace({ userId }: { userId: string }) {
  const router = useRouter();
  const { active } = useActiveProject();
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [json, setJson] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  const profileQuery = useQuery({
    queryKey: ["projects", "users", active?.id, userId],
    queryFn: () => usersApi.get(active!.id, userId),
    enabled: Boolean(active?.id && userId),
  });
  const activityQuery = useQuery({
    queryKey: [
      "projects",
      "users",
      active?.id,
      userId,
      "activity",
      activityCursor,
    ],
    queryFn: () =>
      usersApi.activity(active!.id, userId, {
        limit: 20,
        cursor: activityCursor,
      }),
    enabled: Boolean(active?.id && userId),
  });
  const eventsQuery = useQuery({
    queryKey: ["projects", "events", active?.id, userId],
    queryFn: () => eventsApi.listForUser(active!.id, userId),
    enabled: Boolean(active?.id && userId),
  });
  const user = profileQuery.data;
  const activities = activityQuery.data?.activity ?? [];
  const events = eventsQuery.data?.events ?? [];
  const goNext = () => {
    if (activityQuery.data?.nextCursor) {
      setHistory((current) => [...current, activityCursor ?? ""]);
      setActivityCursor(activityQuery.data.nextCursor);
    }
  };
  const goPrevious = () => {
    const previous = history[history.length - 1];
    if (previous !== undefined) {
      setHistory((current) => current.slice(0, -1));
      setActivityCursor(previous || null);
    }
  };

  return (
    <Stack gap={2.2} className="user-details-workspace">
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() => router.push("/dashboard/users")}
        className="group-back-button"
      >
        Back to Users
      </Button>
      <Box className="user-detail-breadcrumb">
        <Typography color="text.secondary" fontSize={10}>
          Users&nbsp; › &nbsp;{user?.email || userId}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={1}
        >
          <Typography className="user-detail-email-title">
            {user?.email || userId}
          </Typography>
          <Chip
            label={user?.deletedAt ? "Deleted" : "Active"}
            size="small"
            className={user?.deletedAt ? "paused-chip" : "active-chip"}
          />
        </Stack>
        <Typography color="text.secondary" fontSize={11}>
          {user?.name || "No name provided"}
        </Typography>
      </Box>
      {profileQuery.isLoading ? (
        <LoadingCards />
      ) : profileQuery.isError ? (
        <Card className="saas-card">
          <Typography color="error">
            Could not load this user. Please try again.
          </Typography>
        </Card>
      ) : (
        <>
          <Card className="saas-card user-detail-card">
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              className="user-detail-card-header"
            >
              <Box>
                <Typography fontWeight={900}>User Details</Typography>
                <Typography color="text.secondary" fontSize={10}>
                  Account identity, subscription, permissions, device, and
                  profile information
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setJson(user)}
              >
                &#123; &#125;&nbsp; View JSON
              </Button>
            </Stack>
            <Divider />
            <UserDetailSection title="Account Information">
              <DetailItem
                icon={GroupsRounded}
                label="Name"
                value={display(user?.name)}
              />
              <DetailItem
                icon={CodeRounded}
                label="User ID"
                value={display(user?.id)}
              />
              <DetailItem
                icon={EmailRounded}
                label="Email address"
                value={display(user?.email)}
              />
              <DetailItem
                icon={CheckCircleRounded}
                label="Email consent"
                value={display(user?.emailConsent)}
                badge={user?.emailConsent === true}
              />
              <DetailItem
                icon={CalendarTodayRounded}
                label="Last active"
                value={formatDate(user?.lastActiveAt)}
              />
              <DetailItem
                icon={CheckCircleRounded}
                label="Account status"
                value={display(user?.accountStatus)}
              />
              <DetailItem
                icon={RouteRounded}
                label="Signup source"
                value={display(user?.signupSource)}
              />
              <DetailItem
                icon={LocationOnRounded}
                label="Region"
                value={display(user?.region)}
              />
              <DetailItem
                icon={CalendarTodayRounded}
                label="Account created"
                value={formatDate(user?.createdAt)}
              />
            </UserDetailSection>
            <UserDetailSection title="Device & App">
              <DetailItem
                icon={NotificationsActiveRounded}
                label="Push permission"
                value={display(user?.pushPermission ?? user?.push?.permission)}
              />
              <DetailItem
                icon={PhoneAndroidRounded}
                label="Platform"
                value={display(user?.platform ?? user?.device?.platform)}
              />
              <DetailItem
                icon={NotificationsActiveRounded}
                label="Push token"
                value={display(
                  user?.push?.token ? "Available" : "Not available",
                )}
              />
            </UserDetailSection>
            <UserDetailSection title="Location & Preferences">
              <DetailItem
                icon={LocationOnRounded}
                label="Country"
                value={display(user?.country)}
              />
              <DetailItem
                icon={PublicRounded}
                label="Timezone"
                value={display(user?.timezone)}
              />
              <DetailItem
                icon={LanguageRounded}
                label="Language"
                value={display(user?.preferredLanguage)}
              />
            </UserDetailSection>
            <UserDetailSection title="Account Status">
              <DetailItem
                icon={CalendarTodayRounded}
                label="Deleted"
                value={
                  user?.deletedAt ? formatDate(user.deletedAt) : "Not deleted"
                }
              />
            </UserDetailSection>
          </Card>
          <Card className="group-section-card user-engagement-card">
            <Typography variant="h3">Engagement</Typography>
            <Typography color="text.secondary" fontSize={12}>
              Email and push performance are calculated independently by channel
            </Typography>
            <Grid container spacing={1.2} sx={{ mt: 1 }}>
              {metric(EmailRounded, "Emails sent", "0")}
              {metric(EmailRounded, "Emails opened", "0")}
              {metric(NotificationsActiveRounded, "Pushes sent", "0")}
              {metric(SendRounded, "Pushes clicked", "0")}
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box className="group-engagement-panel">
                <Typography fontWeight={900}>Email engagement</Typography>
                <MetricRows
                  rows={[
                    "Open rate|0%",
                    "Click rate|0%",
                    "Delivery rate|0%",
                    "Bounce rate|0%",
                    "Unsubscribe rate|0%",
                    "Spam complaint rate|0%",
                  ]}
                />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box className="group-engagement-panel">
                <Typography fontWeight={900}>Push engagement</Typography>
                <MetricRows
                  rows={[
                    "Sent|0",
                    "Delivered|0",
                    "Failed|0",
                    "Click rate|0%",
                    "No token|0%",
                  ]}
                />
                </Box>
              </Grid>
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <DetailItem
                icon={RouteRounded}
                label="Current Lifecycle Segment"
                value={display(user?.lifecycleSegment?.name)}
              />
              <DetailItem
                icon={GroupsRounded}
                label="Current Audience Groups"
                value={
                  user?.audienceGroups?.map((group) => group.name).join(", ") ||
                  "—"
                }
              />
              <DetailItem
                icon={TimelineRounded}
                label="Journey Automation"
                value="No"
              />
            </Grid>
            <Typography color="text.secondary" fontSize={10} sx={{ mt: 1 }}>
              SDK events recorded:{" "}
              {eventsQuery.isLoading ? "…" : events.length.toLocaleString()}
            </Typography>
          </Card>
          <ActivityCard
            activities={activities}
            loading={activityQuery.isLoading}
            hasPrevious={history.length > 0}
            hasNext={Boolean(activityQuery.data?.nextCursor)}
            onPrevious={goPrevious}
            onNext={goNext}
            onViewJson={setJson}
          />
        </>
      )}
      <Dialog
        open={json !== null}
        onClose={() => {
          setJson(null);
          setCopied(false);
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          JSON details
          <IconButton
            aria-label="Copy JSON"
            onClick={async () => {
              await navigator.clipboard.writeText(
                JSON.stringify(json, null, 2),
              );
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            }}
          >
            <ContentCopyRounded fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: "#171322" }}>
          <Box
            component="pre"
            sx={{
              m: 0,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "65vh",
              overflow: "auto",
              color: "#f7f1ff",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.65,
            }}
          >
            {JSON.stringify(json, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          {copied ? (
            <Typography color="success.main" fontSize={12} fontWeight={800}>
              JSON copied
            </Typography>
          ) : (
            <span />
          )}
          <Button
            onClick={() => {
              setJson(null);
              setCopied(false);
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function ActivityCard({
  activities,
  loading,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onViewJson,
}: {
  activities: UserActivity[];
  loading: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onViewJson: (value: unknown) => void;
}) {
  return (
    <Card className="saas-card activity-history-card">
      <DetailHeader
        icon={TimelineRounded}
        title="Activity History"
        subtitle="App, account, segment, group, journey, email, push, and SDK activity"
      />
      <Stack gap={2} sx={{ mt: 2 }}>
        {loading ? (
          Array.from({ length: 2 }, (_, index) => (
            <Box
              key={index}
              sx={{ p: 2, border: "1px solid #e0e6f0", borderRadius: 1 }}
            >
              <Skeleton width="35%" />
              <Skeleton width="60%" />
              <Skeleton width="25%" />
            </Box>
          ))
        ) : activities.length ? (
          activities.map((activity, index) => (
            <Box
              className="user-activity-event"
              key={activity.id || `${activity.type}-${index}`}
            >
              <Stack direction="row" gap={1}>
                <Box className="user-activity-dot">
                  <TimelineRounded fontSize="small" />
                </Box>
                <Box>
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography fontSize={11} fontWeight={900}>
                      {activity.title || activity.type || "Activity"}
                    </Typography>
                    <Chip
                      label={activity.category || "Activity"}
                      size="small"
                    />
                  </Stack>
                  <Typography color="text.secondary" fontSize={10}>
                    {formatDate(activity.occurredAt || activity.createdAt)}
                  </Typography>
                  <Typography color="text.secondary" fontSize={10}>
                    {activity.description || "No additional details available"}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                    onClick={() => onViewJson(activity)}
                  >
                    &#123; &#125;&nbsp; View JSON
                  </Button>
                </Box>
              </Stack>
            </Box>
          ))
        ) : (
          <Typography color="text.secondary" fontSize={12}>
            No activity recorded for this user.
          </Typography>
        )}
      </Stack>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Typography color="text.secondary" fontSize={10}>
          Activity is paginated by the backend
        </Typography>
        <Stack direction="row" gap={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={!hasPrevious || loading}
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!hasNext || loading}
            onClick={onNext}
          >
            Next
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
function LoadingCards() {
  return (
    <>
      <Card className="saas-card">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="rounded" height={180} sx={{ mt: 2 }} />
      </Card>
      <Card className="saas-card">
        <Skeleton variant="text" width="25%" />
        <Skeleton variant="rounded" height={130} sx={{ mt: 2 }} />
      </Card>
    </>
  );
}
function DetailHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <Stack direction="row" alignItems="center" gap={1}>
      <Box className="user-detail-header-icon">
        <Icon fontSize="small" />
      </Box>
      <Box>
        <Typography fontWeight={900} fontSize={13}>
          {title}
        </Typography>
        <Typography color="text.secondary" fontSize={10}>
          {subtitle}
        </Typography>
      </Box>
    </Stack>
  );
}
function UserDetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box className="user-detail-section">
      <Typography fontWeight={900} fontSize={11} sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Grid container spacing={1.2}>
        {children}
      </Grid>
    </Box>
  );
}
function DetailItem({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: ElementType;
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <Grid item xs={12} sm={4}>
      <Box className="user-detail-item">
        <Stack direction="row" gap={0.7} alignItems="center">
          <Icon sx={{ fontSize: 13, color: "#6678ee" }} />
          <Typography color="text.secondary" fontSize={9}>
            {label}
          </Typography>
        </Stack>
        {badge ? (
          <Chip label={value} size="small" className="active-chip" />
        ) : (
          <Typography fontSize={10} fontWeight={800}>
            {value}
          </Typography>
        )}
      </Box>
    </Grid>
  );
}
function MetricRows({ rows, empty = "—" }: { rows: string[]; empty?: string }) {
  return (
    <Stack gap={0.5} sx={{ mt: 0.8 }}>
      {rows.length ? (
        rows.map((row) => (
          <Stack key={row} direction="row" justifyContent="space-between" alignItems="center" className="group-metric-row">
            <Typography fontSize={10}>{row.split("|")[0]}</Typography>
            <Typography fontSize={10} fontWeight={900}>{row.split("|")[1] ?? "—"}</Typography>
          </Stack>
        ))
      ) : (
        <Stack direction="row" justifyContent="space-between" alignItems="center" className="group-metric-row">
          <Typography fontSize={10}>{empty}</Typography>
        </Stack>
      )}
    </Stack>
  );
}
function metric(Icon: ElementType, label: string, value: string) {
  return (
    <Card className="group-metric user-engagement-metric">
      <Box className="user-detail-icon">
        <Icon fontSize="small" />
      </Box>
      <Typography color="text.secondary" fontSize={10}>
        {label}
      </Typography>
      <Typography fontSize={20} fontWeight={900}>
        {value}
      </Typography>
    </Card>
  );
}
