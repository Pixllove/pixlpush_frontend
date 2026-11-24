"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControlLabel,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  dataSyncApi,
  type CreatedSyncWebhook,
  type SyncWebhookEndpoint,
} from "@/lib/projects/api";

/** Plain choices over the backend's topics. */
const GROUPS = [
  {
    key: "journeys",
    label: "Journey updates",
    detail:
      "A user enters, moves to a new step, completes or leaves a journey.",
    topics: [
      "journey.entered",
      "journey.step_changed",
      "journey.completed",
      "journey.exited",
      "journey.failed",
      "journey.paused",
      "journey.resumed",
    ],
  },
  {
    key: "messages",
    label: "Message updates",
    detail: "An email or push is sent, fails, is opened or is clicked.",
    topics: [
      "message.sent",
      "message.failed",
      "message.opened",
      "message.clicked",
    ],
  },
] as const;
const errorText = (error: unknown) =>
  (error as { message?: string })?.message ??
  "Something went wrong. Please try again.";
const groupsOf = (endpoint: SyncWebhookEndpoint) =>
  GROUPS.filter((group) =>
    group.topics.some((topic) => endpoint.events.includes(topic)),
  ).map((group) => group.label);

function Deliveries({
  projectId,
  endpointId,
}: {
  projectId: string;
  endpointId: string;
}) {
  const deliveries = useQuery({
    queryKey: ["projects", projectId, "webhook-deliveries", endpointId],
    queryFn: () => dataSyncApi.webhookDeliveries(projectId, endpointId),
    refetchInterval: 30_000,
  });
  const rows = deliveries.data ?? [];
  const failed = rows.filter((row) => row.status === "dead_letter").length;
  const sent = rows.filter((row) => row.status === "delivered").length;
  if (deliveries.isLoading) return <Skeleton width={180} />;
  return (
    <Typography variant="caption" color={failed ? "error" : "text.secondary"}>
      {rows.length
        ? `Last ${rows.length} updates: ${sent} delivered${failed ? `, ${failed} failed` : ""}`
        : "Nothing sent yet"}
    </Typography>
  );
}

export default function WebhookUpdates({
  projectId,
  sourceId,
  canControl,
}: {
  projectId: string;
  sourceId: string;
  canControl: boolean;
}) {
  const client = useQueryClient();
  const key = ["projects", projectId, "data-sync", sourceId, "webhooks"];
  const endpoints = useQuery({
    queryKey: key,
    queryFn: () => dataSyncApi.webhooks(projectId, sourceId),
  });
  const [url, setUrl] = useState("");
  const [groups, setGroups] = useState<string[]>(["journeys", "messages"]);
  const [created, setCreated] = useState<CreatedSyncWebhook>();
  const [busy, setBusy] = useState("");
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  const run = async (id: string, work: () => Promise<unknown>) => {
    setBusy(id);
    setError("");
    try {
      await work();
      await client.invalidateQueries({ queryKey: key });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy("");
    }
  };
  const add = () =>
    run("add", async () => {
      const events = GROUPS.filter((group) =>
        groups.includes(group.key),
      ).flatMap((group) => [...group.topics]);
      setCreated(
        await dataSyncApi.createWebhook(projectId, sourceId, {
          name: new URL(url.trim()).host,
          url: url.trim(),
          events,
        }),
      );
      setUrl("");
    });

  return (
    <Stack gap={2.5}>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {created && (
        <Alert severity="success" onClose={() => setCreated(undefined)}>
          <Typography variant="body2" fontWeight={600}>
            Copy this signing secret now. It is shown only once.
          </Typography>
          <Box
            component="code"
            sx={{
              display: "block",
              mt: 0.5,
              fontFamily: "var(--pp-mono)",
              fontSize: "var(--fs-12)",
              overflowWrap: "anywhere",
            }}
          >
            {created.secret}
          </Box>
          <Typography variant="caption">
            Your server uses it to check that updates really come from PixlPush.
          </Typography>
        </Alert>
      )}

      <Card className="saas-card">
        <Stack gap={1.5}>
          <Typography variant="h4">Your URLs</Typography>
          {endpoints.isLoading ? (
            <Skeleton height={48} />
          ) : endpoints.data?.length ? (
            endpoints.data.map((endpoint) => (
              <Stack
                key={endpoint.id}
                direction={{ xs: "column", sm: "row" }}
                gap={1}
                alignItems={{ sm: "center" }}
                sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                    {endpoint.url}
                  </Typography>
                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    {groupsOf(endpoint).map((label) => (
                      <Chip key={label} size="small" label={label} />
                    ))}
                    <Deliveries
                      projectId={projectId}
                      endpointId={endpoint.id}
                    />
                  </Stack>
                </Box>
                {canControl && (
                  <Stack direction="row" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        void run(endpoint.id, () =>
                          dataSyncApi.setWebhookStatus(
                            projectId,
                            endpoint.id,
                            endpoint.status === "active" ? "paused" : "active",
                          ),
                        )
                      }
                    >
                      {endpoint.status === "active" ? "Pause" : "Resume"}
                    </Button>
                    {removing === endpoint.id ? (
                      <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={Boolean(busy)}
                        onClick={() =>
                          void run(endpoint.id, () =>
                            dataSyncApi.deleteWebhook(projectId, endpoint.id),
                          )
                        }
                      >
                        Confirm remove
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        disabled={Boolean(busy)}
                        onClick={() => setRemoving(endpoint.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>
                )}
              </Stack>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No URLs yet.
            </Typography>
          )}
        </Stack>
      </Card>

      {canControl ? (
        <Card className="saas-card">
          <Stack
            gap={1.5}
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              void add();
            }}
          >
            <Typography variant="h4">Add a URL</Typography>
            <TextField
              size="small"
              fullWidth
              label="Your server URL"
              placeholder="https://api.example.com/pixlpush/updates"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            {GROUPS.map((group) => (
              <FormControlLabel
                key={group.key}
                control={
                  <Checkbox
                    checked={groups.includes(group.key)}
                    onChange={(_, on) =>
                      setGroups((current) =>
                        on
                          ? [...current, group.key]
                          : current.filter((item) => item !== group.key),
                      )
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {group.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {group.detail}
                    </Typography>
                  </Box>
                }
              />
            ))}
            <Button
              type="submit"
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
              disabled={
                busy === "add" ||
                !/^https:\/\/\S+$/.test(url.trim()) ||
                !groups.length
              }
            >
              {busy === "add" ? "Adding…" : "Add URL"}
            </Button>
          </Stack>
        </Card>
      ) : (
        <Alert severity="info">Only owners and admins can add URLs.</Alert>
      )}
    </Stack>
  );
}
