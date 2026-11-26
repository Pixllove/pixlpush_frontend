"use client";

import { formatUserDateTime, formatUserTime } from "@/lib/timezone";

import { useEffect, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowBackRounded,
  VisibilityOffRounded,
  VisibilityRounded,
  WebhookRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputBase,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DataSyncMigrations from "@/components/dashboard/DataSyncMigrations";
import SettingsStatus from "@/components/dashboard/SettingsStatus";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useIntegration } from "@/hooks/projects/use-project-settings";
import { dataSyncApi } from "@/lib/projects/api";
import { integrationStatus } from "./registry";
import WebhookDeveloperGuide from "./WebhookDeveloperGuide";
import WebhookMapping, { webhookSwitchSx } from "./WebhookMapping";

const CONFIG_ROLES = ["owner", "admin", "developer"];
const errorText = (error: unknown) =>
  (error as { message?: string })?.message ??
  "Something went wrong. Please try again.";
/**
 * A URL next to a password field looks like a login form, so browser autofill and
 * password-manager extensions rewrite it while React writes it back, which loops.
 */
const noAutofill = {
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
  "data-form-type": "other",
} as const;
const bareInputSx = {
  mt: 0.5,
  px: 1.5,
  py: 0.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 1.5,
  "&.Mui-focused": { borderColor: "primary.main" },
} as const;
const mono = {
  fontFamily: "var(--pp-mono)",
  fontSize: "var(--fs-12)",
} as const;

function StepItem({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Stack direction="row" gap={1.5}>
      <Box
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontSize: "var(--fs-12)",
          fontWeight: 600,
        }}
      >
        {n}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>
          {title}
        </Typography>
        {children}
      </Box>
    </Stack>
  );
}

type Conn = { syncEnabled: boolean; importing?: boolean; lastCheckedAt?: string | null; lastSyncedAt: string | null; nextSyncAt?: string };
/** One batch of up to 2,500 events every 2 minutes; nothing runs in between. */
function syncCaption(c: Conn) {
  const last = c.lastCheckedAt ?? c.lastSyncedAt;
  if (!last) return "waiting for the first sync";
  const next = c.syncEnabled && c.nextSyncAt ? ` · next sync ${formatUserTime(c.nextSyncAt)}` : "";
  return `last synced ${formatUserDateTime(last)}${next}`;
}

export default function WebhookIntegration() {
  const { active } = useActiveProject();
  const { account } = useCurrentUser();
  const projectId = active?.id;
  const canEdit = Boolean(active && CONFIG_ROLES.includes(active.role));
  const canControl = Boolean(
    active && ["owner", "admin"].includes(active.role),
  );
  const { query, connect, setSyncEnabled, syncNow, disconnect } =
    useIntegration(projectId, "webhook");
  const settings = query.data;
  const connected = settings?.connected ? settings : undefined;
  // Queued (waiting for the worker) or running: either way a second click would do nothing.
  // A ticking clock, so the page notices when the next automatic sync is due.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  // An automatic sync is due: show it as running until the server reports the new sync time.
  // Capped at 2 minutes overdue, so a stopped worker never leaves the spinner on forever.
  const overdueMs = connected?.syncEnabled && connected.nextSyncAt ? now - new Date(connected.nextSyncAt).getTime() : -1;
  const due = overdueMs >= 0 && overdueMs < 120_000;
  const busySync = syncNow.isPending || due || Boolean(connected?.fetching || (connected?.syncing && !connected.importing));
  const status = integrationStatus(settings);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState("");

  // Created by the first sync after connecting; the extras need it.
  const sources = useQuery({
    queryKey: ["projects", projectId, "data-sync", "sources"],
    queryFn: () => dataSyncApi.sources(projectId!),
    enabled: Boolean(projectId && connected),
  });
  const source =
    connected &&
    sources.data?.find(
      (item) => item.name === "Webhook" && item.environment === "production",
    );

  const run = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(errorText(cause));
    }
  };
  const submit = () =>
    run(async () => {
      await connect.mutateAsync({ url: url.trim(), token: token.trim() });
      setUrl("");
      setToken("");
      setReplacing(false);
    });

  return (
    <Stack gap={2.5}>
      <Button
        component={NextLink}
        href="/dashboard/integrations"
        startIcon={<ArrowBackRounded />}
        sx={{ alignSelf: "flex-start" }}
      >
        All integrations
      </Button>
      {query.isError && (
        <Alert severity="error">{errorText(query.error)}</Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {!canEdit && active && (
        <Alert severity="info">
          Only owners, admins and developers can change this connection.
        </Alert>
      )}

      <Card className="saas-card">
        <Stack direction="row" gap={1.5} alignItems="flex-start">
          <Box className="integration-icon">
            <WebhookRounded />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h3">Webhook</Typography>
              {status ? (
                <SettingsStatus tone={status.tone}>
                  {status.label}
                </SettingsStatus>
              ) : (
                <Chip size="small" variant="outlined" label="Not connected" />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Keeps your users’ subscription and account status up to date in
              PixlPush, automatically, from your own server.
            </Typography>
          </Box>
        </Stack>
      </Card>

      {connected && (
        <Card className="saas-card">
          <Stack gap={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              justifyContent="space-between"
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {connected.lastError
                    ? "Connected, but the last sync had a problem"
                    : "Connected · syncs automatically every 2 minutes"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {connected.accountLabel} · {syncCaption(connected)}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                sx={{ alignSelf: "flex-start" }}
                disabled={!canEdit || !connected.syncEnabled || busySync}
                onClick={() => run(() => syncNow.mutateAsync())}
                startIcon={busySync ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {busySync ? "Syncing…" : "Sync now"}
              </Button>
            </Stack>
            {connected.lastError && (
              <Alert severity="warning">{connected.lastError}</Alert>
            )}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
            >
              <FormControlLabel
                sx={{ ml: 0, gap: 1 }}
                label="Automatic sync"
                control={
                  <Switch
                    size="small"
                    sx={webhookSwitchSx}
                    checked={connected.syncEnabled}
                    disabled={!canEdit || setSyncEnabled.isPending}
                    onChange={(_, on) =>
                      run(() => setSyncEnabled.mutateAsync(on))
                    }
                  />
                }
              />
              <Stack direction="row" gap={1} flexWrap="wrap">
                {/* One click: disconnecting only pauses the sync; synced data stays and you can reconnect. */}
                <Button
                  color="error"
                  variant="text"
                  disabled={!canEdit || disconnect.isPending}
                  onClick={() => run(() => disconnect.mutateAsync())}
                  startIcon={
                    disconnect.isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : undefined
                  }
                >
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Card>
      )}

      {query.isLoading && <Skeleton height={120} />}

      {settings && (
        <Card className="saas-card">
          <Stack gap={3}>
            <Typography variant="h4">Connect in 3 steps</Typography>
            <StepItem n={1} title="Copy the AI prompt or send the instructions">
              <Typography variant="caption" color="text.secondary">
                Give the prompt to your AI coding assistant, or email the setup
                guide to your developer. Either way you get back a URL and a
                token.
              </Typography>
              <WebhookDeveloperGuide projectId={projectId} />
            </StepItem>

            <StepItem n={2} title="Paste the URL and token">
              {connected && !replacing ? (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1}
                  alignItems={{ sm: "center" }}
                  sx={{ mt: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      overflowWrap: "anywhere",
                    }}
                  >
                    Connected to <b>{connected.accountLabel}</b>. The token is
                    stored encrypted.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!canEdit}
                    onClick={() => setReplacing(true)}
                  >
                    Change URL or token
                  </Button>
                </Stack>
              ) : (
                <Stack
                  gap={1.5}
                  sx={{ mt: 1 }}
                  component="form"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  {/*
                    Bare inputs on purpose: TextField's FormControl tracks "filled" state, and
                    autofill/password-manager extensions rewriting these fields made it loop
                    ("Maximum update depth exceeded"). InputBase outside a FormControl has no
                    such state. Uncontrolled too: React never writes the value back.
                  */}
                  <Box component="label" sx={{ display: "block" }}>
                    <Typography variant="caption" color="text.secondary">
                      Server URL
                    </Typography>
                    <InputBase
                      fullWidth
                      placeholder="https://api.example.com/pixlpush/events"
                      defaultValue=""
                      disabled={!canEdit}
                      autoComplete="off"
                      inputProps={{ ...noAutofill, "aria-label": "Server URL", spellCheck: false }}
                      onChange={(event) => setUrl(event.target.value)}
                      sx={bareInputSx}
                    />
                  </Box>
                  <Box component="label" sx={{ display: "block" }}>
                    <Typography variant="caption" color="text.secondary">
                      Token
                    </Typography>
                    <InputBase
                      fullWidth
                      // Masked text, not type="password": a URL plus a password field looks like
                      // a login form to password managers.
                      type="text"
                      defaultValue=""
                      disabled={!canEdit}
                      autoComplete="off"
                      inputProps={{
                        ...noAutofill,
                        "aria-label": "Token",
                        spellCheck: false,
                        style: showToken ? undefined : ({ WebkitTextSecurity: "disc" } as React.CSSProperties),
                      }}
                      onChange={(event) => setToken(event.target.value)}
                      sx={bareInputSx}
                      endAdornment={
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label={showToken ? "Hide token" : "Show token"}
                            onClick={(event) => {
                              event.preventDefault();
                              setShowToken((on) => !on);
                            }}
                          >
                            {showToken ? (
                              <VisibilityOffRounded fontSize="small" />
                            ) : (
                              <VisibilityRounded fontSize="small" />
                            )}
                          </IconButton>
                        </InputAdornment>
                      }
                    />
                    <Typography variant="caption" color="text.secondary">
                      Stored encrypted. It won’t be shown again.
                    </Typography>
                  </Box>
                  <Stack direction="row" gap={1}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={
                        !canEdit ||
                        connect.isPending ||
                        !url.trim() ||
                        token.trim().length < 8
                      }
                      startIcon={
                        connect.isPending ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : undefined
                      }
                    >
                      {connect.isPending
                        ? "Connecting…"
                        : connected
                          ? "Save"
                          : "Connect"}
                    </Button>
                    {replacing && (
                      <Button
                        onClick={() => {
                          setReplacing(false);
                          setUrl("");
                          setToken("");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </Stack>
                </Stack>
              )}
            </StepItem>

            <StepItem n={3} title="Map data">
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{ mb: 1.5 }}
              >
                Choose what to sync from your server. Older events in your feed
                are stored too, so users are placed right away; journey
                participants stay staged until you switch over.
              </Typography>
              {source && projectId ? (
                <WebhookMapping
                  key={`${projectId}:${source.id}`}
                  projectId={projectId}
                  sourceId={source.id}
                  canEdit={canControl}
                  journeys={
                    <DataSyncMigrations
                      projectId={projectId}
                      accountId={account?.id}
                      canEdit={canEdit}
                      canControl={canControl}
                    />
                  }
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {connected
                    ? "Available once the first sync finishes."
                    : "Available after you connect your server."}
                </Typography>
              )}
            </StepItem>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
