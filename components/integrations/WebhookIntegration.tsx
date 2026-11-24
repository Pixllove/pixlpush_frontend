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
import WebhookMapping, { webhookSwitchSx } from "./WebhookMapping";
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
    title: "Segments and user association",
    detail: "Map profile fields, source segment names, subscription products, and choose ongoing sync or historical membership import.",
  },
  {
    key: "history",
    title: "Historical user activity",
    detail: "Choose event or message history to import as an archive. These records do not become live messaging activity.",
  },
  {
    key: "journeys",
    title: "Journeys and campaigns",
    detail: "Map source step keys to existing PixlPush journeys, stage participant progress, and review what content is reusable.",
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
                  Email your developer the setup guide. They add one small
                  endpoint to your backend and send you back a URL and a token.
                </Typography>
                <WebhookDeveloperGuide projectId={projectId} />
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


      {source && projectId && (
        <Card className="saas-card">
          <Stack gap={1.5}>
            <StepItem n={3} title="Map data">
              <Typography variant="caption" color="text.secondary">
                Choose any categories you use. Historical imports and ongoing sync are separate, and journey participants stay staged until you review cutover.
              </Typography>
            </StepItem>
            <Stack gap={0.5}>
              {EXTRAS.map((item) => (
                <ListItemButton key={item.key} onClick={() => setExtra(item.key)} sx={{ px: 1, borderTop: "1px solid", borderColor: "divider", gap: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>{item.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.detail}</Typography>
                  </Box>
                  <ChevronRightRounded color="action" />
                </ListItemButton>
              ))}
            </Stack>
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
              <Stack gap={3}>
                <Box>
                  <Typography variant="h4">Content and step support</Typography>
                  <Typography variant="body2" color="text.secondary">Map source step keys to an existing PixlPush journey and reuse project templates already attached to its steps (email subject/body or push title/body/image/deep link). Source template content, standalone campaign records, in-app content, and unsupported creative fields are not imported. Recreate and review those manually before cutover.</Typography>
                </Box>
                <DataSyncMigrations projectId={projectId} accountId={account?.id} canEdit={canEdit} canControl={canControl} />
                <Box sx={{ pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography variant="h4">Outbound journey and message updates</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>This separate integration sends PixlPush delivery status to your server. It is not the incoming server feed.</Typography>
                  <WebhookUpdates projectId={projectId} sourceId={source.id} canControl={canControl} />
                </Box>
              </Stack>
            )}
            {extra === "updates" && <WebhookUpdates projectId={projectId} sourceId={source.id} canControl={canControl} />}
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}
