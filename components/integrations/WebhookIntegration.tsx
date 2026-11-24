"use client";

import { useState, type ReactNode } from "react";
import NextLink from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowBackRounded,
  ChevronRightRounded,
  CloseRounded,
  WebhookRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Drawer,
  FormControlLabel,
  IconButton,
  ListItemButton,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DataSyncImports from "@/components/dashboard/DataSyncImports";
import DataSyncMigrations from "@/components/dashboard/DataSyncMigrations";
import SettingsStatus from "@/components/dashboard/SettingsStatus";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useIntegration } from "@/hooks/projects/use-project-settings";
import { dataSyncApi } from "@/lib/projects/api";
import { integrationStatus } from "./registry";
import WebhookDeveloperGuide from "./WebhookDeveloperGuide";
import WebhookMapping from "./WebhookMapping";
import WebhookUpdates from "./WebhookUpdates";

const CONFIG_ROLES = ["owner", "admin", "developer"];
const errorText = (error: unknown) =>
  (error as { message?: string })?.message ??
  "Something went wrong. Please try again.";
const mono = {
  fontFamily: "var(--pp-mono)",
  fontSize: "var(--fs-12)",
} as const;

type Extra = "mapping" | "updates" | "history" | "journeys";
const EXTRAS: { key: Extra; title: string; detail: string }[] = [
  {
    key: "mapping",
    title: "Rename fields",
    detail:
      "Only if your data uses different names, like full_name instead of name.",
  },
  {
    key: "updates",
    title: "Send journey status to your server",
    detail:
      "Only if your own admin dashboard should show journey and message status.",
  },
  {
    key: "history",
    title: "Import past data",
    detail:
      "One time. Bring in old events, messages or segment changes from a file. Nothing is sent to users and no journey starts.",
  },
  {
    key: "journeys",
    title: "Move journeys from another tool",
    detail:
      "Only if you are switching running journeys over to PixlPush. PixlPush keeps a paused copy until you check it and switch over, so users never get a message twice.",
  },
];

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
  const status = integrationStatus(settings);
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [extra, setExtra] = useState<Extra>();
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
  const openExtra = EXTRAS.find((item) => item.key === extra);

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

      {settings && (!connected || replacing) && (
        <Card className="saas-card">
          <Stack
            gap={2.5}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Typography variant="h4">
              {connected ? "Change URL or token" : "Connect in 2 steps"}
            </Typography>
            {!connected && (
              <StepItem n={1} title="Send these instructions to your developer">
                <Typography variant="caption" color="text.secondary">
                  Copy the instructions and send them by email or chat. Your
                  developer adds one small endpoint to your backend and sends
                  you back a URL and a token.
                </Typography>
                <WebhookDeveloperGuide />
              </StepItem>
            )}
            <StepItem
              n={connected ? 1 : 2}
              title="Paste the URL and token, then connect"
            >
              <Stack gap={1.5} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="URL"
                  placeholder="https://api.example.com/pixlpush/events"
                  value={url}
                  disabled={!canEdit}
                  onChange={(event) => setUrl(event.target.value)}
                />
                <TextField
                  size="small"
                  fullWidth
                  type="password"
                  autoComplete="off"
                  label="Token"
                  helperText="Stored encrypted. Nobody can see it again, including you."
                  value={token}
                  disabled={!canEdit}
                  onChange={(event) => setToken(event.target.value)}
                />
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ alignSelf: "flex-start" }}
                  disabled={
                    !canEdit ||
                    connect.isPending ||
                    !url.trim() ||
                    token.trim().length < 8
                  }
                >
                  {connect.isPending ? "Checking…" : "Connect"}
                </Button>
              </Stack>
            </StepItem>
          </Stack>
        </Card>
      )}

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
                    : "Connected and syncing every 2 minutes"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {connected.accountLabel} ·{" "}
                  {connected.syncing && connected.syncEnabled
                    ? "Syncing…"
                    : connected.lastSyncedAt
                      ? `last checked ${new Date(connected.lastSyncedAt).toLocaleString()}`
                      : "waiting for the first sync"}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                sx={{ alignSelf: "flex-start" }}
                disabled={
                  !canEdit || !connected.syncEnabled || syncNow.isPending
                }
                onClick={() => run(() => syncNow.mutateAsync())}
              >
                Sync now
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
                    checked={connected.syncEnabled}
                    disabled={!canEdit || setSyncEnabled.isPending}
                    onChange={(_, on) =>
                      run(() => setSyncEnabled.mutateAsync(on))
                    }
                  />
                }
              />
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  variant="text"
                  disabled={!canEdit}
                  onClick={() => setReplacing((value) => !value)}
                >
                  {replacing ? "Cancel" : "Change URL or token"}
                </Button>
                {confirming ? (
                  <Button
                    color="error"
                    variant="contained"
                    disabled={disconnect.isPending}
                    onClick={() =>
                      run(async () => {
                        await disconnect.mutateAsync();
                        setConfirming(false);
                      })
                    }
                  >
                    Confirm disconnect
                  </Button>
                ) : (
                  <Button
                    color="error"
                    variant="text"
                    disabled={!canEdit}
                    onClick={() => setConfirming(true)}
                  >
                    Disconnect
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Card>
      )}


      {connected && (
        <Card className="saas-card">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1.5}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h4">Next: group your users</Typography>
              <Typography variant="body2" color="text.secondary">
                Create a lifecycle segment like “Cancelled, still active”. It
                fills up on its own from your server’s updates.
              </Typography>
            </Box>
            <Button
              variant="contained"
              component={NextLink}
              href="/dashboard/users?tab=segments"
              sx={{ flexShrink: 0 }}
            >
              Create lifecycle segment
            </Button>
          </Stack>
        </Card>
      )}

      {source && (
        <Card className="saas-card">
          <Stack gap={0.5}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="h4">Optional extras</Typography>
              <Typography variant="body2" color="text.secondary">
                Most teams never need these.
              </Typography>
            </Box>
            {EXTRAS.map((item) => (
              <ListItemButton
                key={item.key}
                onClick={() => setExtra(item.key)}
                sx={{
                  px: 1,
                  borderTop: "1px solid",
                  borderColor: "divider",
                  gap: 1.5,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.detail}
                  </Typography>
                </Box>
                <ChevronRightRounded color="action" />
              </ListItemButton>
            ))}
          </Stack>
        </Card>
      )}

      <Drawer
        anchor="right"
        open={Boolean(openExtra && source)}
        onClose={() => setExtra(undefined)}
        PaperProps={{ sx: { width: { xs: "100%", md: 720 } } }}
      >
        {openExtra && source && projectId && (
          <Stack gap={2} sx={{ p: 3 }}>
            <Stack direction="row" alignItems="flex-start" gap={1}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h3">{openExtra.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {openExtra.detail}
                </Typography>
              </Box>
              <IconButton
                aria-label="Close"
                onClick={() => setExtra(undefined)}
              >
                <CloseRounded />
              </IconButton>
            </Stack>
            {extra === "mapping" && (
              <WebhookMapping
                projectId={projectId}
                sourceId={source.id}
                canEdit={canControl}
              />
            )}
            {extra === "updates" && (
              <WebhookUpdates
                projectId={projectId}
                sourceId={source.id}
                canControl={canControl}
              />
            )}
            {extra === "history" && (
              <DataSyncImports
                projectId={projectId}
                source={source}
                canControl={canControl}
              />
            )}
            {extra === "journeys" && (
              <DataSyncMigrations
                projectId={projectId}
                accountId={account?.id}
                canEdit={canEdit}
                canControl={canControl}
              />
            )}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
