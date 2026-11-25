"use client";

import { formatUserDateTime } from '@/lib/timezone';
import { useQuery } from "@tanstack/react-query";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { dataSyncApi } from "@/lib/projects/api";

type Props = { projectId?: string } & (
  | { kind: "user"; userId: string }
  | { kind: "campaign"; channel: "email" | "push"; campaignId: string }
  | { kind: "journey"; journeyId: string }
);

const when = (value?: string | null) =>
  value ? formatUserDateTime(value) : "—";

/** History imported from the customer's previous tool. Read-only; never counted as PixlPush sends. Renders nothing when empty. */
export default function ImportedHistory(props: Props) {
  const { projectId, kind } = props;
  const key =
    props.kind === "user"
      ? props.userId
      : props.kind === "journey"
        ? props.journeyId
        : `${props.channel}:${props.campaignId}`;
  const query = useQuery({
    queryKey: ["projects", projectId, "imported-history", kind, key],
    queryFn: async () => {
      if (props.kind === "user")
        return { user: await dataSyncApi.importedForUser(projectId!, props.userId) };
      if (props.kind === "journey")
        return { journey: await dataSyncApi.importedForJourney(projectId!, props.journeyId) };
      return {
        campaign: await dataSyncApi.importedForCampaign(projectId!, props.channel, props.campaignId),
      };
    },
    enabled: Boolean(projectId && key),
  });
  const data = query.data;
  if (!data) return null;

  let body: React.ReactNode = null;
  if (data.user && (data.user.messages.length || data.user.journeySteps.length)) {
    body = (
      <Stack gap={0.75}>
        {data.user.messages.slice(0, 20).map((m) => (
          <Typography key={m.id} variant="body2">
            {m.channel === "push" ? "Push" : "Email"} · {m.campaignName ?? m.sourceCampaignId ?? "Unknown campaign"} ·{" "}
            <b>{m.status}</b> · {when(m.sentAt ?? m.deliveredAt)}
          </Typography>
        ))}
        {data.user.journeySteps.slice(0, 20).map((s) => (
          <Typography key={s.id} variant="body2">
            Journey · {s.journeyName ?? s.sourceJourneyId} → {s.stepName ?? s.sourceStepId} · {when(s.enteredAt)}
          </Typography>
        ))}
      </Stack>
    );
  } else if (data.campaign && data.campaign.stats.total) {
    const s = data.campaign.stats;
    body = (
      <Typography variant="body2">
        {s.total} recipients · {s.delivered} delivered · {s.opened} opened
        {s.clicked !== null ? ` · ${s.clicked} clicked` : ""} · {s.bounced} bounced · {s.failed} failed
      </Typography>
    );
  } else if (data.journey && data.journey.recent.length) {
    body = (
      <Stack gap={0.75}>
        {data.journey.recent.slice(0, 20).map((s) => (
          <Typography key={s.id} variant="body2">
            {s.externalUserId ?? "User"} → {s.stepName ?? s.sourceStepId} · {when(s.enteredAt)}
          </Typography>
        ))}
      </Stack>
    );
  }
  if (!body) return null;

  return (
    <Card className="saas-card" sx={{ my: 1.5 }}>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4">History from your previous tool</Typography>
        <Chip size="small" label="Imported" />
      </Stack>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
        Imported through your Webhook. Not counted as PixlPush sends.
      </Typography>
      <Box>{body}</Box>
    </Card>
  );
}
