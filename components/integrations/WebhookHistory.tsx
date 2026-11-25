"use client";

import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { MatchStatus, WebhookSample } from "@/lib/projects/api";

type Campaign = WebhookSample["campaignMatches"][number];
type Journey = WebhookSample["journeyMatches"][number];
type Named = { id: string; name: string };
/** A row's chosen PixlPush item. `confirmed`: matched exactly, saved, or picked by the customer. */
export type Choice = { target: string | null; confirmed: boolean };

type RowStatus = MatchStatus | "conflict" | "unsupported";
const CHIP: Record<
  RowStatus,
  { label: string; color: "success" | "info" | "warning" | "error" | "default" }
> = {
  matched: { label: "Matched", color: "success" },
  suggested: { label: "Suggested", color: "info" },
  needs_mapping: { label: "Needs mapping", color: "warning" },
  conflict: { label: "Conflict", color: "error" },
  unsupported: { label: "Unsupported", color: "default" },
};
const StatusChip = ({ status }: { status: RowStatus }) => (
  <Chip size="small" label={CHIP[status].label} color={CHIP[status].color} />
);
const mono = {
  fontFamily: "var(--pp-mono)",
  overflowWrap: "anywhere",
} as const;

const statusOf = (
  choice: Choice | undefined,
  match: { status: MatchStatus },
  conflict: boolean,
): RowStatus =>
  conflict
    ? "conflict"
    : choice?.confirmed
      ? choice.target
        ? "matched"
        : "needs_mapping"
      : match.status;

function TargetSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Named[];
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value || null)}
      sx={{ minWidth: 240 }}
      SelectProps={{ displayEmpty: true }}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem value="">
        <Typography component="span" color="text.secondary">
          Keep as history only
        </Typography>
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.id} value={option.id}>
          {option.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** 3.3.1 / 3.3.2: source campaigns → PixlPush campaigns of the same channel. */
export function CampaignTable({
  channel,
  matches,
  targets,
  choices,
  disabled,
  onChange,
}: {
  channel: "email" | "push";
  matches: Campaign[];
  targets: Named[];
  choices: Record<string, Choice>;
  disabled?: boolean;
  onChange: (source: string, target: string | null) => void;
}) {
  const rows = matches.filter((item) => item.channel === channel);
  // Two source campaigns on one PixlPush campaign would merge their recipients.
  const used = rows.map((row) => choices[row.source]?.target).filter(Boolean);
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No {channel} campaigns in your server data yet. Send{" "}
        <code>message_sent</code> (and opens, clicks…) with{" "}
        <code>channel: &quot;{channel}&quot;</code> and a{" "}
        <code>campaign_id</code>.
      </Typography>
    );
  }
  return (
    <Stack gap={1}>
      {rows.map((row) => {
        const choice = choices[row.source];
        const conflict =
          Boolean(choice?.target) &&
          used.filter((id) => id === choice!.target).length > 1;
        return (
          <Stack
            key={row.source}
            direction={{ xs: "column", md: "row" }}
            gap={1.5}
            alignItems={{ md: "center" }}
            sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500}>
                {row.name ?? row.source}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={mono}
                component="p"
              >
                {row.source} · {row.records} record
                {row.records === 1 ? "" : "s"} in sample ·{" "}
                {row.statuses.join(", ")}
              </Typography>
              {!choice?.confirmed && row.status !== "matched" && (
                <Typography variant="caption" color="warning.main">
                  {row.reason}
                </Typography>
              )}
              {row.unsupported.length > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="p"
                >
                  Not stored: push {row.unsupported.join(", ")} — PixlPush
                  records push opens only.
                </Typography>
              )}
            </Box>
            <TargetSelect
              label={`PixlPush ${channel} campaign`}
              value={choice?.target ?? null}
              options={targets}
              disabled={disabled}
              onChange={(value) => onChange(row.source, value)}
            />
            <StatusChip status={statusOf(choice, row, conflict)} />
            {row.unsupported.length > 0 && <StatusChip status="unsupported" />}
          </Stack>
        );
      })}
    </Stack>
  );
}

/** 3.3.3: source journeys → PixlPush journeys, and their steps → PixlPush steps. */
export function JourneyTable({
  matches,
  targets,
  choices,
  stepChoices,
  disabled,
  onJourney,
  onStep,
}: {
  matches: Journey[];
  targets: (Named & { steps: Named[] })[];
  choices: Record<string, Choice>;
  stepChoices: Record<string, Record<string, Choice>>;
  disabled?: boolean;
  onJourney: (source: string, target: string | null) => void;
  onStep: (journey: string, step: string, target: string | null) => void;
}) {
  if (!matches.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No journeys in your server data yet. Send{" "}
        <code>journey_step_entered</code> with a <code>journey_id</code> and{" "}
        <code>step_id</code>.
      </Typography>
    );
  }
  return (
    <Stack gap={2}>
      {matches.map((journey) => {
        const choice = choices[journey.source];
        const target = targets.find((item) => item.id === choice?.target);
        return (
          <Box
            key={journey.source}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              p: 1.5,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              gap={1.5}
              alignItems={{ md: "center" }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {journey.name ?? journey.source}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={mono}
                  component="p"
                >
                  {journey.source} · {journey.records} step entries in sample
                </Typography>
                {!choice?.confirmed && journey.status !== "matched" && (
                  <Typography variant="caption" color="warning.main">
                    {journey.reason}
                  </Typography>
                )}
              </Box>
              <TargetSelect
                label="PixlPush journey"
                value={choice?.target ?? null}
                options={targets}
                disabled={disabled}
                onChange={(value) => onJourney(journey.source, value)}
              />
              <StatusChip status={statusOf(choice, journey, false)} />
            </Stack>
            {target && (
              <Stack gap={0.5} sx={{ mt: 1.5, pl: { md: 2 } }}>
                <Typography variant="caption" color="text.secondary">
                  Steps
                </Typography>
                {journey.steps.map((step) => {
                  const stepChoice = stepChoices[journey.source]?.[step.source];
                  return (
                    <Stack
                      key={step.source}
                      direction={{ xs: "column", md: "row" }}
                      gap={1.5}
                      alignItems={{ md: "center" }}
                      sx={{
                        py: 0.75,
                        borderTop: "1px dashed",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="body2" sx={{ flex: 1, ...mono }}>
                        {step.name ?? step.source}
                      </Typography>
                      <TargetSelect
                        label="PixlPush step"
                        value={stepChoice?.target ?? null}
                        options={target.steps}
                        disabled={disabled}
                        onChange={(value) =>
                          onStep(journey.source, step.source, value)
                        }
                      />
                      <StatusChip status={statusOf(stepChoice, step, false)} />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}

/** Explains what 3.3 imports and what it never does. */
export function HistoryNotice({ unknownChannel }: { unknownChannel: number }) {
  return (
    <Stack gap={1}>
      <Alert severity="info">
        History from your previous tool is imported into PixlPush only. It shows
        on user profiles, campaign reports and journey pages marked as imported,
        is never counted as a PixlPush send, and never sends a message or moves
        anyone through a journey.
      </Alert>
      {unknownChannel > 0 && (
        <Alert severity="warning">
          {unknownChannel} message record{unknownChannel === 1 ? "" : "s"} in
          the sample have no channel. Send{" "}
          <code>channel: &quot;email&quot;</code> or{" "}
          <code>&quot;push&quot;</code> so they can be stored.
        </Alert>
      )}
    </Stack>
  );
}
