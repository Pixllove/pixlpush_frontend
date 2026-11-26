"use client";

import { formatUserDateTime, formatUserTime } from "@/lib/timezone";

import { useEffect, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowForwardRounded,
  ArrowBackRounded,
  BoltRounded,
  InfoOutlined,
  LayersRounded,
  StorefrontRounded,
  SyncRounded,
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
import WebhookPush from "./WebhookPush";
import SettingsStatus from "@/components/dashboard/SettingsStatus";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useIntegration } from "@/hooks/projects/use-project-settings";
import { dataSyncApi, integrationsApi } from "@/lib/projects/api";
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
const purchaseMethodCardSx = {
  p: { xs: 1.5, sm: 2 },
  borderColor: "divider",
  bgcolor: "#f8f5ff",
  borderRadius: 2,
} as const;
const purchaseTimingBadgeSx = {
  bgcolor: "#ece3fb",
  color: "primary.main",
  border: "1px solid rgba(91, 33, 182, 0.2)",
  fontWeight: 600,
} as const;
const purchaseFlowSourceChipSx = {
  bgcolor: "#ece3fb",
  color: "#4c1d95",
  border: "1px solid rgba(91, 33, 182, 0.22)",
  fontWeight: 600,
  "& .MuiChip-icon": { color: "#5b21b6" },
} as const;
const purchaseFlowTargetChipSx = {
  bgcolor: "#5b21b6",
  color: "#ffffff",
  fontWeight: 600,
  "& .MuiChip-icon": { color: "#ffffff" },
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
  const lastSyncAt = connected?.lastCheckedAt ?? connected?.lastSyncedAt;
  const nextSyncAt = connected?.syncEnabled ? connected.nextSyncAt : undefined;
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
  const [savedToken, setSavedToken] = useState("");
  const [showSavedToken, setShowSavedToken] = useState(false);
  const [revealingSavedToken, setRevealingSavedToken] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSavedToken("");
    setShowSavedToken(false);
  }, [projectId, connected?.connectedAt]);

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
      setShowToken(false);
    });

  const revealSavedToken = async () => {
    if (savedToken) {
      setShowSavedToken((visible) => !visible);
      return;
    }
    if (!projectId) return;
    setError("");
    setRevealingSavedToken(true);
    try {
      const result = await integrationsApi.revealWebhookToken(projectId);
      setSavedToken(result.token);
      setShowSavedToken(true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setRevealingSavedToken(false);
    }
  };

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

            <StepItem n={2} title="Connect purchase events">
              <Typography variant="caption" color="text.secondary">
                Choose one method or use both. Historical sync imports past purchases and keeps new data up to date; real-time events arrive instantly.
              </Typography>
              <Stack gap={1.5} sx={{ mt: 1.5 }}>
                <Card variant="outlined" sx={purchaseMethodCardSx}>
                  <Stack gap={1.5}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                      <Stack direction="row" gap={1.25} alignItems="center">
                        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#ece3fb", color: "primary.main" }}>
                          <SyncRounded />
                        </Box>
                        <Box>
                          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600}>Historical &amp; ongoing sync</Typography>
                            <Chip size="small" label="Every 2 minutes" sx={purchaseTimingBadgeSx} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">Import past purchases and keep new data up to date.</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.75} sx={{ pl: { xs: 6.25, sm: 0 } }}>
                        <Chip size="small" icon={<SyncRounded />} label="History" sx={purchaseFlowSourceChipSx} />
                        <ArrowForwardRounded fontSize="small" color="action" />
                        <Chip size="small" icon={<LayersRounded />} label="PixlPush" sx={purchaseFlowTargetChipSx} />
                      </Stack>
                    </Stack>
                    {connected ? (
                      <Stack gap={1.5} sx={{ mt: 1 }}>
                        <Box component="label" sx={{ display: "block" }}>
                          <Typography variant="caption" color="text.secondary">
                            Server URL
                          </Typography>
                          <InputBase
                            fullWidth
                            value={connected.serverUrl ?? `https://${connected.accountLabel}`}
                            inputProps={{
                              ...noAutofill,
                              "aria-label": "Server URL",
                              readOnly: true,
                              spellCheck: false,
                            }}
                            sx={bareInputSx}
                          />
                        </Box>
                        <Box component="label" sx={{ display: "block" }}>
                          <Typography variant="caption" color="text.secondary">
                            Token
                          </Typography>
                          <InputBase
                            fullWidth
                            type="text"
                            value={showSavedToken ? savedToken : "•".repeat(32)}
                            inputProps={{
                              ...noAutofill,
                              "aria-label": "Webhook token",
                              readOnly: true,
                              spellCheck: false,
                            }}
                            sx={bareInputSx}
                            endAdornment={
                              <InputAdornment position="end">
                                <IconButton
                                  edge="end"
                                  size="small"
                                  disabled={!canEdit || revealingSavedToken}
                                  aria-label={showSavedToken ? "Hide webhook token" : "Reveal webhook token"}
                                  onClick={() => void revealSavedToken()}
                                >
                                  {revealingSavedToken ? (
                                    <CircularProgress size={16} />
                                  ) : showSavedToken ? (
                                    <VisibilityOffRounded fontSize="small" />
                                  ) : (
                                    <VisibilityRounded fontSize="small" />
                                  )}
                                </IconButton>
                              </InputAdornment>
                            }
                          />
                          <Typography variant="caption" color="text.secondary">
                            Stored encrypted. Use the eye to reveal the token.
                          </Typography>
                        </Box>
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
                            Stored encrypted after connecting.
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
                            {connect.isPending ? "Connecting…" : "Connect"}
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                    <Stack direction="row" gap={1} alignItems="flex-start" sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                      <InfoOutlined fontSize="small" color="primary" />
                      <Typography variant="caption" color="text.secondary">
                        Historical import starts after connecting. Automatic sync repeats every 2 minutes while enabled.
                      </Typography>
                    </Stack>
                    {connected && (
                      <Box sx={{ p: 1.5, bgcolor: "#ece3fb", border: "1px solid rgba(91, 33, 182, 0.12)", borderRadius: 1.5 }}>
                        <Stack
                          direction={{ xs: "column", xl: "row" }}
                          gap={1.5}
                          justifyContent="space-between"
                          alignItems={{ xl: "center" }}
                        >
                          <Stack direction="row" gap={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              gap={{ xs: 0.25, sm: 1.5 }}
                              flexWrap="wrap"
                              sx={{ minWidth: 0 }}
                            >
                              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: { sm: "nowrap" } }}>
                                Last synced: {lastSyncAt
                                  ? formatUserDateTime(lastSyncAt)
                                  : "Waiting for first sync"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: { sm: "nowrap" } }}>
                                Next sync: {nextSyncAt
                                  ? formatUserTime(nextSyncAt)
                                  : "Paused"}
                              </Typography>
                            </Stack>
                          </Stack>
                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            gap={1.5}
                            alignItems={{ sm: "center" }}
                            sx={{ flexShrink: 0 }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              disabled={!canEdit || !connected.syncEnabled || busySync}
                              onClick={() => run(() => syncNow.mutateAsync())}
                              startIcon={busySync ? <CircularProgress size={16} color="inherit" /> : undefined}
                              sx={{ minWidth: 104, minHeight: 36, whiteSpace: "nowrap" }}
                            >
                              {busySync ? "Syncing…" : "Sync now"}
                            </Button>
                            <FormControlLabel
                              sx={{
                                ml: 0,
                                mr: 0,
                                gap: 1,
                                whiteSpace: "nowrap",
                                "& .MuiFormControlLabel-label": { lineHeight: 1.2 },
                              }}
                              label="Automatic sync"
                              control={
                                <Switch
                                  size="small"
                                  sx={webhookSwitchSx}
                                  checked={connected.syncEnabled}
                                  disabled={!canEdit || setSyncEnabled.isPending}
                                  onChange={(_, on) => run(() => setSyncEnabled.mutateAsync(on))}
                                />
                              }
                            />
                            <Button
                              size="small"
                              color="error"
                              disabled={!canEdit || disconnect.isPending}
                              onClick={() => run(() => disconnect.mutateAsync())}
                              sx={{ minHeight: 36, whiteSpace: "nowrap" }}
                            >
                              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                            </Button>
                          </Stack>
                        </Stack>
                        {connected.lastError && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            {connected.lastError}
                          </Alert>
                        )}
                      </Box>
                    )}
                  </Stack>
                </Card>

                <Card variant="outlined" sx={purchaseMethodCardSx}>
                  <Stack gap={1.5}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
                      <Stack direction="row" gap={1.25} alignItems="center">
                        <Box sx={{ width: 40, height: 40, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: "#ece3fb", color: "primary.main" }}>
                          <BoltRounded />
                        </Box>
                        <Box>
                          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={600}>Real-time webhook</Typography>
                            <Chip size="small" label="Instant" sx={purchaseTimingBadgeSx} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">Send each purchase as it happens.</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" alignItems="center" gap={0.75} sx={{ pl: { xs: 6.25, sm: 0 } }}>
                        <Chip size="small" icon={<StorefrontRounded />} label="Your server" sx={purchaseFlowSourceChipSx} />
                        <ArrowForwardRounded fontSize="small" color="action" />
                        <Chip size="small" icon={<LayersRounded />} label="PixlPush" sx={purchaseFlowTargetChipSx} />
                      </Stack>
                    </Stack>
                    {connected?.pushUrl && source && projectId ? (
                      <WebhookPush projectId={projectId} sourceId={source.id} pushUrl={connected.pushUrl} canEdit={canControl} />
                    ) : connected && sources.isLoading ? (
                      <Alert severity="info">Loading your real-time webhook settings…</Alert>
                    ) : connected ? (
                      <Alert severity="info">Your webhook URL and push keys will be available after the first history sync.</Alert>
                    ) : (
                      <Alert severity="info" icon={<InfoOutlined />}>
                        Connect your purchase history feed below to set up the webhook URL and manage push keys.
                      </Alert>
                    )}
                  </Stack>
                </Card>


              </Stack>
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
