"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
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
  SortRounded,
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
  MenuItem,
  Select,
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

const count = (n?: number) => (n === undefined ? "…" : n.toLocaleString());
const percent = (n?: number) => (n === undefined ? "…" : `${n}%`);

const ACTIVITY_PAGE_SIZE = 10;

export default function UserDetailsWorkspace({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { active } = useActiveProject();
  const [activityPage, setActivityPage] = useState(1);
  const [activityOrder, setActivityOrder] = useState<"desc" | "asc">("desc");
  const [activityCategory, setActivityCategory] = useState("");
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
      activityPage,
      activityOrder,
      activityCategory,
    ],
    queryFn: () =>
      usersApi.activity(active!.id, userId, {
        page: activityPage,
        limit: ACTIVITY_PAGE_SIZE,
        order: activityOrder,
        category: activityCategory || null,
      }),
    enabled: Boolean(active?.id && userId),
    // Keep the current page on screen while the next one loads.
    placeholderData: (previous) => previous,
  });
  const eventsQuery = useQuery({
    queryKey: ["projects", "events", active?.id, userId],
    queryFn: () => eventsApi.listForUser(active!.id, userId),
    enabled: Boolean(active?.id && userId),
  });
  const user = profileQuery.data;
  // The API returns devices and push subscriptions as lists; show the most relevant one.
  const device = user?.installations?.[0];
  const activePush = user?.pushSubscriptions?.find((sub) => sub.active);
  const activities = activityQuery.data?.activity ?? [];
  const email = user?.engagement?.email;
  const push = user?.engagement?.push;
  const events = eventsQuery.data?.events ?? [];
  const totalPages = activityQuery.data?.totalPages ?? 1;

  return (
    <Stack gap={2.2} className="user-details-workspace">
      <Button
        startIcon={<ArrowBackRounded />}
        onClick={() => router.push(`/dashboard/users?tab=${searchParams.get("tab") || "users"}`)}
        className="group-back-button"
      >
        Back to Users
      </Button>
      <Box className="user-detail-breadcrumb">
        <Typography color="text.secondary" fontSize={11}>
          Users&nbsp; › &nbsp;{user?.email || user?.externalUserId || userId}
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "center" }}
          gap={1}
        >
          <Typography className="user-detail-email-title">
            {user?.email || user?.externalUserId || userId}
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
                <Typography fontWeight={600}>User Details</Typography>
                <Typography color="text.secondary" fontSize={11}>
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
                value={display(user?.externalUserId ?? user?.id)}
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
                value={display(user?.signupSource ?? user?.properties?.signupSource)}
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
                value={display(activePush?.permission ?? user?.pushSubscriptions?.[0]?.permission)}
              />
              <DetailItem
                icon={PhoneAndroidRounded}
                label="Platform"
                value={display(device ? [device.platform, device.osVersion].filter(Boolean).join(" ") : null)}
              />
              <DetailItem
                icon={NotificationsActiveRounded}
                label="Push token"
                value={activePush ? `Available (${activePush.provider.toUpperCase()})` : "Not available"}
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
              {metric(EmailRounded, "Emails sent", count(email?.sent))}
              {metric(EmailRounded, "Emails opened", count(email?.opened))}
              {metric(NotificationsActiveRounded, "Pushes sent", count(push?.sent))}
              {metric(SendRounded, "Pushes clicked", count(push?.clicked))}
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box className="group-engagement-panel">
                <Typography fontWeight={600}>Email engagement</Typography>
                <MetricRows
                  rows={[
                    `Open rate|${percent(email?.openRate)}`,
                    `Click rate|${percent(email?.clickRate)}`,
                    `Delivery rate|${percent(email?.deliveryRate)}`,
                    `Bounce rate|${percent(email?.bounceRate)}`,
                    `Unsubscribe rate|${percent(email?.unsubscribeRate)}`,
                    `Spam complaint rate|${percent(email?.complaintRate)}`,
                  ]}
                />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box className="group-engagement-panel">
                <Typography fontWeight={600}>Push engagement</Typography>
                <MetricRows
                  rows={[
                    `Sent|${count(push?.sent)}`,
                    `Delivered|${count(push?.delivered)}`,
                    `Failed|${count(push?.failed)}`,
                    `Click rate|${percent(push?.clickRate)}`,
                    `No token|${percent(push?.noTokenRate)}`,
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
            <Typography color="text.secondary" fontSize={11} sx={{ mt: 1 }}>
              SDK events recorded:{" "}
              {count(user?.engagement?.sdkEvents ?? (eventsQuery.isLoading ? undefined : events.length))}
            </Typography>
          </Card>
          <ActivityCard
            activities={activities}
            loading={activityQuery.isLoading}
            fetching={activityQuery.isFetching}
            page={activityPage}
            totalPages={totalPages}
            total={activityQuery.data?.total ?? 0}
            order={activityOrder}
            category={activityCategory}
            categories={activityQuery.data?.categories ?? []}
            onPrevious={() => setActivityPage((p) => Math.max(1, p - 1))}
            onNext={() => setActivityPage((p) => Math.min(totalPages, p + 1))}
            onToggleOrder={() => {
              setActivityOrder((o) => (o === "desc" ? "asc" : "desc"));
              setActivityPage(1);
            }}
            onCategoryChange={(value) => {
              setActivityCategory(value);
              setActivityPage(1);
            }}
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
              fontFamily: "var(--pp-mono)",
              fontSize: 12,
              lineHeight: 1.65,
            }}
          >
            {JSON.stringify(json, null, 2)}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          {copied ? (
            <Typography color="success.main" fontSize={12} fontWeight={500}>
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
  fetching,
  page,
  totalPages,
  total,
  order,
  category,
  categories,
  onPrevious,
  onNext,
  onToggleOrder,
  onCategoryChange,
  onViewJson,
}: {
  activities: UserActivity[];
  loading: boolean;
  fetching: boolean;
  page: number;
  totalPages: number;
  total: number;
  order: "desc" | "asc";
  category: string;
  categories: string[];
  onPrevious: () => void;
  onNext: () => void;
  onToggleOrder: () => void;
  onCategoryChange: (value: string) => void;
  onViewJson: (value: unknown) => void;
}) {
  return (
    <Card className="saas-card activity-history-card">
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={1.5}
      >
        <DetailHeader
          icon={TimelineRounded}
          title="Activity History"
          subtitle="App, account, segment, group, journey, email, push, and SDK activity"
        />
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              <SortRounded
                sx={{ transform: order === "asc" ? "scaleY(-1)" : undefined }}
              />
            }
            onClick={onToggleOrder}
          >
            {order === "desc" ? "Newest first" : "Oldest first"}
          </Button>
          <Select
            size="small"
            value={category}
            displayEmpty
            onChange={(event) => onCategoryChange(String(event.target.value))}
            sx={{ minWidth: 150, fontSize: 13 }}
          >
            <MenuItem value="">All activity</MenuItem>
            {categories.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
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
                    <Typography fontSize={11} fontWeight={500}>
                      {activity.title || activity.type || "Activity"}
                    </Typography>
                    <Chip
                      label={activity.category || "Activity"}
                      size="small"
                    />
                  </Stack>
                  <Typography color="text.secondary" fontSize={11}>
                    {formatDate(activity.occurredAt || activity.createdAt)}
                  </Typography>
                  {activity.details?.length ? (
                    activity.details.map((item) => (
                      <Typography key={item.label} fontSize={11}>
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          {item.label}:
                        </Box>{" "}
                        {item.value}
                      </Typography>
                    ))
                  ) : activity.description ? (
                    <Typography color="text.secondary" fontSize={11}>
                      {activity.description}
                    </Typography>
                  ) : null}
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
        <Typography color="text.secondary" fontSize={11}>
          Page {page} of {totalPages} • {total.toLocaleString()}{" "}
          {total === 1 ? "activity" : "activities"}
        </Typography>
        <Stack direction="row" gap={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={page <= 1 || fetching}
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={page >= totalPages || fetching}
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
        <Typography fontWeight={600} fontSize={13}>
          {title}
        </Typography>
        <Typography color="text.secondary" fontSize={11}>
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
      <Typography fontWeight={500} fontSize={11} sx={{ mb: 1 }}>
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
          <Typography color="text.secondary" fontSize={11}>
            {label}
          </Typography>
        </Stack>
        {badge ? (
          <Chip label={value} size="small" className="active-chip" />
        ) : (
          <Typography fontSize={11} fontWeight={500}>
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
            <Typography fontSize={11}>{row.split("|")[0]}</Typography>
            <Typography fontSize={11} fontWeight={500}>{row.split("|")[1] ?? "—"}</Typography>
          </Stack>
        ))
      ) : (
        <Stack direction="row" justifyContent="space-between" alignItems="center" className="group-metric-row">
          <Typography fontSize={11}>{empty}</Typography>
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
      <Typography color="text.secondary" fontSize={11}>
        {label}
      </Typography>
      <Typography fontSize={20} fontWeight={600}>
        {value}
      </Typography>
    </Card>
  );
}
