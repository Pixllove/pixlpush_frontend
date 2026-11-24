"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AddRounded,
  CheckCircleRounded,
  ErrorOutlineRounded,
  EditRounded,
  ExpandMoreRounded,
  WarningAmberRounded,
  GroupsRounded,
  InsightsRounded,
  RouteRounded,
  ToggleOffRounded,
  ToggleOnRounded,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  dataSyncApi,
  type MatchStatus,
  type SyncExternalSegment,
} from "@/lib/projects/api";
import EventMappingDialog from "./EventMappingDialog";

type FieldRule = {
  source: string;
  target: string;
  enabled?: boolean;
  [key: string]: unknown;
};
type EventRule = {
  source: string;
  target: string;
  enabled?: boolean;
  liveTrigger?: boolean;
  properties?: { source: string; target: string }[];
};
type SegmentRule = {
  sourceName: string;
  namespace: string;
  key: string;
  displayName: string;
  enabled?: boolean;
  exclusive?: boolean;
  emitOnEnter?: string;
};
/** Only ongoing sync is switchable; imports, outbound updates and migrations are explicit actions. */
type DataCategories = {
  userAndSegments: { ongoingSync: boolean };
  activity: { ongoingSync: boolean };
};
type Config = {
  fields?: FieldRule[];
  consent?: {
    source: string;
    channel: string;
    optIn?: unknown[];
    optOut?: unknown[];
  }[];
  entitlements?: {
    products: { source: string; entitlementKey: string; tier?: string }[];
    states?: unknown[];
    events?: unknown;
  };
  events?: EventRule[];
  segments?: SegmentRule[];
  categories?: Partial<DataCategories>;
  autoMap?: boolean;
  [key: string]: unknown;
};

const TARGETS = [
  ["", "Custom property"],
  ["email", "Email"],
  ["name", "Name"],
  ["preferredLanguage", "Language"],
  ["timezone", "Time zone"],
  ["country", "Country"],
  ["region", "Region"],
  ["accountStatus", "Account status"],
  ["userType", "User type"],
] as const;
const DEFAULT_CATEGORIES: DataCategories = {
  userAndSegments: { ongoingSync: true },
  activity: { ongoingSync: true },
};
const errorText = (error: unknown) =>
  (error as { message?: string })?.message ??
  "Something went wrong. Please try again.";
const sourceKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "segment";
const matchLabel = (match: boolean, enabled: boolean) =>
  !enabled ? "Disabled" : match ? "Matched" : "Needs mapping";
export const webhookSwitchSx = {
  width: 30,
  height: 18,
  p: 0,
  m: 0,
  flexShrink: 0,
  "& .MuiSwitch-switchBase": {
    p: "2px",
    transform: "translateX(0)",
    "&.Mui-checked": {
      transform: "translateX(12px)",
      color: "#fff",
    },
    "&.Mui-checked + .MuiSwitch-track": {
      opacity: 1,
      backgroundColor: "primary.main",
    },
  },
  "& .MuiSwitch-thumb": {
    width: 14,
    height: 14,
    boxShadow: "0 1px 2px rgba(30,20,41,.25)",
  },
  "& .MuiSwitch-track": {
    borderRadius: "999px",
    opacity: 1,
    backgroundColor: "#D8D2E1",
  },
} as const;
const mappingSwitchLabelSx = {
  m: 0,
  gap: 0.75,
  alignItems: "center",
  "& .MuiSwitch-root": { m: 0, flexShrink: 0 },
  "& .MuiFormControlLabel-label": {
    fontSize: "var(--fs-13)",
    lineHeight: 1.35,
    color: "text.secondary",
  },
} as const;

/** A numbered, collapsible part of step 3 ("3.1 Segments and user association"). */
function Section({
  number,
  icon,
  title,
  detail,
  children,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <Accordion
      defaultExpanded
      disableGutters
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "10px !important",
        "&::before": { display: "none" },
        overflow: "hidden",
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRounded />}
        sx={{
          bgcolor: "#f8f5ff",
          px: 2,
          "& .MuiAccordionSummary-content": {
            my: 1.5,
            gap: 1.5,
            alignItems: "center",
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: "#ece3fb",
            color: "primary.main",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={600}>
            {number} {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {detail}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 2 }}>
        <Stack gap={2}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}

const STATUS_CHIP: Record<
  MatchStatus | "disabled" | "conflict",
  { label: string; color: "success" | "warning" | "default" | "error" | "info" }
> = {
  matched: { label: "Matched", color: "success" },
  suggested: { label: "Suggested", color: "info" },
  needs_mapping: { label: "Needs mapping", color: "warning" },
  disabled: { label: "Disabled", color: "default" },
  conflict: { label: "Conflict", color: "error" },
};
function StatusChip({ status }: { status: keyof typeof STATUS_CHIP }) {
  return (
    <Chip
      size="small"
      label={STATUS_CHIP[status].label}
      color={STATUS_CHIP[status].color}
    />
  );
}

function existingSegmentMatch(name: string, segments: SyncExternalSegment[]) {
  const normalize = (value: string) =>
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  const key = normalize(name);
  return segments.find(
    (segment) =>
      segment.status === "active" &&
      (normalize(segment.displayName) === key ||
        normalize(segment.key) === key),
  );
}

/** Step 3 of the Webhook page. `activity` and `journeys` add the one-off tools under 3.2 and 3.3. */
export default function WebhookMapping({
  projectId,
  sourceId,
  canEdit,
  activity,
  journeys,
}: {
  projectId: string;
  sourceId: string;
  canEdit: boolean;
  activity?: ReactNode;
  journeys?: ReactNode;
}) {
  const client = useQueryClient();
  const mappingKey = ["projects", projectId, "data-sync", sourceId, "mappings"];
  const mappings = useQuery({
    queryKey: mappingKey,
    queryFn: () => dataSyncApi.mappings(projectId, sourceId),
  });
  const sample = useQuery({
    queryKey: ["projects", projectId, "webhook-sample"],
    queryFn: () => dataSyncApi.serverSample(projectId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const knownSegments = useQuery({
    queryKey: ["projects", projectId, "data-sync", "segments"],
    queryFn: () => dataSyncApi.segments(projectId),
  });
  const active = mappings.data?.find((item) => item.status === "active");
  const config = (active?.config ?? {}) as Config;
  const [fields, setFields] = useState<Record<string, string>>({});
  const [fieldEnabled, setFieldEnabled] = useState<Record<string, boolean>>({});
  const [tiers, setTiers] = useState<Record<string, string>>({});
  // `confirmed`: saved, exactly matched, or chosen by the customer. Unconfirmed suggestions are not saved.
  const [events, setEvents] = useState<
    Record<string, { target: string; enabled: boolean; confirmed: boolean }>
  >({});
  const [fieldConfirmed, setFieldConfirmed] = useState<Record<string, boolean>>(
    {},
  );
  const [editing, setEditing] = useState<string>();
  const [segments, setSegments] = useState<SegmentRule[]>([]);
  const [segmentSource, setSegmentSource] = useState("");
  const [categories, setCategories] =
    useState<DataCategories>(DEFAULT_CATEGORIES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const consent = useMemo(
    () => new Set((config.consent ?? []).map((rule) => rule.source)),
    [config.consent],
  );

  useEffect(() => {
    const current = active?.config as Config | undefined;
    if (!current) return;
    const nextFields: Record<string, string> = {};
    const nextEnabled: Record<string, boolean> = {};
    const nextConfirmed: Record<string, boolean> = {};
    for (const name of sample.data?.fields ?? []) {
      const found = sample.data?.fieldMatches.find(
        (item) => item.source === name,
      );
      // Only a confident match is applied; a suggestion waits for the customer.
      nextFields[name] =
        found?.status === "matched" && found.target
          ? found.target
          : current.autoMap
            ? `properties.${sourceKey(name)}`
            : "";
      nextEnabled[name] = true;
      nextConfirmed[name] = found?.status === "matched";
    }
    for (const rule of current.fields ?? []) {
      nextFields[rule.source] = rule.target;
      nextEnabled[rule.source] = rule.enabled !== false;
      nextConfirmed[rule.source] = true;
    }
    const nextTiers: Record<string, string> = {};
    for (const product of sample.data?.products ?? []) nextTiers[product] = "";
    for (const rule of current.entitlements?.products ?? [])
      nextTiers[rule.source] = rule.tier ?? rule.source;
    const nextEvents: Record<
      string,
      { target: string; enabled: boolean; confirmed: boolean }
    > = {};
    for (const source of new Set([
      ...(sample.data?.events ?? []),
      ...(current.events ?? []).map((rule) => rule.source),
    ])) {
      const rule = current.events?.find((item) => item.source === source);
      const found = sample.data?.eventMatches.find(
        (item) => item.source === source,
      );
      nextEvents[source] = {
        target:
          rule?.target ??
          (found?.status === "matched"
            ? found.target!
            : (found?.target ?? source)),
        enabled: rule?.enabled !== false,
        confirmed: Boolean(rule) || found?.status === "matched",
      };
    }
    setFields(nextFields);
    setFieldEnabled(nextEnabled);
    setFieldConfirmed(nextConfirmed);
    setTiers(nextTiers);
    setEvents(nextEvents);
    setSegments(current.segments ?? []);
    setCategories({
      userAndSegments: {
        ongoingSync: current.categories?.userAndSegments?.ongoingSync ?? true,
      },
      activity: {
        ongoingSync: current.categories?.activity?.ongoingSync ?? true,
      },
    });
  }, [active, sample.data]);

  const shown = sample.data?.fields.length
    ? sample.data.fields
    : Object.keys(fields);
  const eventNames = [
    ...new Set([...(sample.data?.events ?? []), ...Object.keys(events)]),
  ].sort();
  const externalSegments =
    knownSegments.data?.filter((item) => item.sourceId === sourceId) ?? [];
  const fieldConflicts = useMemo(() => {
    const enabled = shown
      .filter((source) => fieldEnabled[source] !== false && fields[source])
      .map((source) => fields[source]!);
    return new Set(
      enabled.filter(
        (target) => enabled.indexOf(target) !== enabled.lastIndexOf(target),
      ),
    );
  }, [shown, fieldEnabled, fields]);
  const needsAttention =
    shown.filter((source) => fieldEnabled[source] !== false && !fields[source])
      .length +
    eventNames.filter(
      (source) => events[source]?.enabled && !events[source]?.confirmed,
    ).length;
  const mappingStatuses = useMemo(
    () => ({
      matched:
        shown.filter(
          (source) =>
            fieldEnabled[source] !== false &&
            Boolean(fields[source]) &&
            !fieldConflicts.has(fields[source]!),
        ).length +
        eventNames.filter(
          (source) => events[source]?.enabled && events[source]?.confirmed,
        ).length +
        segments.filter((item) => item.enabled !== false).length,
      conflicts: fieldConflicts.size,
    }),
    [shown, fieldEnabled, fields, fieldConflicts, eventNames, events, segments],
  );

  const setCategory = <
    K extends keyof DataCategories,
    F extends keyof DataCategories[K],
  >(
    category: K,
    field: F,
    value: DataCategories[K][F],
  ) => {
    setCategories((current) => ({
      ...current,
      [category]: { ...current[category], [field]: value },
    }));
  };

  const addSegment = () => {
    const sourceName = segmentSource.trim();
    if (
      !sourceName ||
      segments.some(
        (item) => item.sourceName.toLowerCase() === sourceName.toLowerCase(),
      )
    )
      return;
    const match = existingSegmentMatch(sourceName, externalSegments);
    setSegments((current) => [
      ...current,
      {
        sourceName,
        namespace: match?.namespace ?? "webhook",
        key: match?.key ?? sourceKey(sourceName),
        displayName: match?.displayName ?? sourceName,
        enabled: true,
        exclusive: false,
      },
    ]);
    setSegmentSource("");
  };

  const updateSegment = (sourceName: string, patch: Partial<SegmentRule>) =>
    setSegments((current) =>
      current.map((item) =>
        item.sourceName === sourceName ? { ...item, ...patch } : item,
      ),
    );

  const save = async () => {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      if (fieldConflicts.size)
        throw new Error(
          `Resolve duplicate PixlPush field mappings: ${[...fieldConflicts].join(", ")}.`,
        );
      const previous = new Map(
        (config.fields ?? []).map((rule) => [rule.source, rule]),
      );
      const chosen = shown
        .filter(
          (source) =>
            fields[source] &&
            fieldEnabled[source] !== false &&
            !consent.has(source),
        )
        .map((source) => fields[source]!);
      const keep = (source: string, target: string) =>
        shown.includes(source) || !chosen.includes(target);
      const next: Config = {
        ...config,
        fields: [
          ...(config.fields ?? []).filter(
            (rule) =>
              rule.target.startsWith("properties.") && !fields[rule.source],
          ),
          ...Object.entries(fields)
            .filter(
              ([source, target]) =>
                target && !consent.has(source) && keep(source, target),
            )
            .map(([source, target]) => ({
              ...(previous.get(source)?.target === target
                ? previous.get(source)
                : {}),
              source,
              target,
              enabled: fieldEnabled[source] !== false,
            })),
        ],
        // Unconfirmed events are left out, so they keep arriving under their own name.
        events: eventNames
          .filter((source) => events[source]?.confirmed)
          .map((source) => ({
            source,
            target: events[source]?.target.trim() || source,
            enabled: events[source]?.enabled !== false,
            liveTrigger: true,
            ...(config.events?.find((rule) => rule.source === source)
              ?.properties
              ? {
                  properties: config.events.find(
                    (rule) => rule.source === source,
                  )!.properties,
                }
              : {}),
          })),
        segments,
        categories,
        entitlements: {
          states: [],
          events: {},
          ...config.entitlements,
          products: Object.entries(tiers)
            .filter(([, tier]) => tier.trim())
            .map(([source, tier]) => ({
              source,
              entitlementKey: "subscription",
              tier: tier.trim(),
            })),
        },
      };
      const draft = await dataSyncApi.createMapping(projectId, sourceId, next);
      if (!draft.validation.valid)
        throw new Error(
          draft.validation.errors[0]?.message ?? "This mapping is not valid.",
        );
      await dataSyncApi.publishMapping(projectId, sourceId, draft.version);
      await client.invalidateQueries({ queryKey: mappingKey });
      setSaved(true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const fieldMatch = (name: string) =>
    sample.data?.fieldMatches.find((item) => item.source === name);
  const eventMatch = (name: string) =>
    sample.data?.eventMatches.find((item) => item.source === name);

  if (mappings.isLoading) return <Skeleton height={200} />;
  const fieldNames = shown.filter((name) => !consent.has(name)).sort();
  const products = Object.keys(tiers).sort();

  return (
    <Stack gap={2}>
      {sample.isError && (
        <Alert severity="warning">
          Could not read a sample from your server: {errorText(sample.error)}{" "}
          You can still add mappings manually.
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" onClose={() => setSaved(false)}>
          Mapping published. It applies to new data from your server.
        </Alert>
      )}

      <Section
        number="3.1"
        icon={<GroupsRounded fontSize="small" />}
        title="Segments and user association"
        detail="Users are matched by user_id. Map the segment names your server sends to PixlPush segments."
      >
        <FormControlLabel
          sx={mappingSwitchLabelSx}
          control={
            <Switch
              size="small"
              sx={webhookSwitchSx}
              checked={categories.userAndSegments.ongoingSync}
              disabled={!canEdit || busy}
              onChange={(_, on) =>
                setCategory("userAndSegments", "ongoingSync", on)
              }
            />
          }
          label="Sync users and segments from your server"
        />
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          Segments
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          gap={1}
          alignItems={{ sm: "flex-start" }}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            addSegment();
          }}
        >
          <TextField
            size="small"
            label="Segment name from your server"
            value={segmentSource}
            onChange={(event) => setSegmentSource(event.target.value)}
            disabled={!canEdit || busy}
            placeholder="e.g. cancel_at_period_end"
            helperText="The exact value your server sends in segment."
            sx={{ flex: 1, maxWidth: { sm: 420 } }}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={<AddRounded />}
            disabled={!canEdit || busy || !segmentSource.trim()}
            sx={{ height: 40, flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Add segment mapping
          </Button>
        </Stack>
        {segments.map((segment) => {
          const match = existingSegmentMatch(
            segment.sourceName,
            externalSegments,
          );
          return (
            <Stack
              key={segment.sourceName}
              direction={{ xs: "column", md: "row" }}
              gap={1}
              alignItems={{ md: "center" }}
              sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontFamily: "var(--pp-mono)",
                  overflowWrap: "anywhere",
                }}
              >
                {segment.sourceName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {match
                  ? `Existing: ${match.displayName}`
                  : `New external segment: ${segment.displayName}`}
              </Typography>
              <Chip
                size="small"
                label={matchLabel(Boolean(match), segment.enabled !== false)}
                color={
                  segment.enabled === false
                    ? "default"
                    : match
                      ? "success"
                      : "warning"
                }
              />
              <TextField
                size="small"
                label="PixlPush segment name"
                value={segment.displayName}
                disabled={!canEdit || busy}
                onChange={(event) =>
                  updateSegment(segment.sourceName, {
                    displayName: event.target.value,
                    key: sourceKey(event.target.value),
                  })
                }
              />
              <FormControlLabel
                sx={mappingSwitchLabelSx}
                control={
                  <Switch
                    size="small"
                    sx={webhookSwitchSx}
                    checked={segment.enabled !== false}
                    disabled={!canEdit || busy}
                    onChange={(_, on) =>
                      updateSegment(segment.sourceName, { enabled: on })
                    }
                  />
                }
                label={segment.enabled === false ? "Disabled" : "Enabled"}
              />
            </Stack>
          );
        })}
        {!segments.length && (
          <Typography variant="body2" color="text.secondary">
            No segment values have been mapped yet. Add source names from your
            server data; unknown values won’t be reported as matched.
          </Typography>
        )}
      </Section>

      <Section
        number="3.2"
        icon={<InsightsRounded fontSize="small" />}
        title="Historical user activity data"
        detail="Profile fields, plans and events from your server. New events can start journeys; older ones are stored but never send anything."
      >
        <FormControlLabel
          sx={mappingSwitchLabelSx}
          control={
            <Switch
              size="small"
              sx={webhookSwitchSx}
              checked={categories.activity.ongoingSync}
              disabled={!canEdit || busy}
              onChange={(_, on) => setCategory("activity", "ongoingSync", on)}
            />
          }
          label="Sync profile fields, subscriptions and new events from your server"
        />
        <Typography variant="caption" color="text.secondary">
          Events used by a lifecycle segment are always kept, so those segments
          stay correct even when this is off.
        </Typography>
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          Profile fields
        </Typography>
        {sample.isLoading ? (
          <Skeleton height={80} />
        ) : fieldNames.length ? (
          fieldNames.map((name) => {
            const conflict = fields[name] && fieldConflicts.has(fields[name]!);
            const enabled = fieldEnabled[name] !== false;
            return (
              <Stack
                key={name}
                direction={{ xs: "column", sm: "row" }}
                gap={1}
                alignItems={{ sm: "center" }}
                sx={{ py: 0.5, borderTop: "1px solid", borderColor: "divider" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontFamily: "var(--pp-mono)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {name}
                  {enabled && !fieldConfirmed[name] && fieldMatch(name) && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="warning.main"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <WarningAmberRounded sx={{ fontSize: 14 }} />
                      {fieldMatch(name)!.status === "suggested" &&
                      fieldMatch(name)!.target ? (
                        <>
                          Suggested:{" "}
                          {TARGETS.find(
                            ([value]) => value === fieldMatch(name)!.target,
                          )?.[1] ?? fieldMatch(name)!.target}
                          .
                          <Button
                            size="small"
                            sx={{ minWidth: 0, p: 0, ml: 0.5 }}
                            disabled={!canEdit || busy}
                            onClick={() => {
                              setFields((current) => ({
                                ...current,
                                [name]: fieldMatch(name)!.target!,
                              }));
                              setFieldConfirmed((current) => ({
                                ...current,
                                [name]: true,
                              }));
                            }}
                          >
                            Use
                          </Button>
                        </>
                      ) : (
                        fieldMatch(name)!.reason
                      )}
                    </Typography>
                  )}
                  {fieldMatch(name)?.samples.length ? (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontFamily: "inherit" }}
                    >
                      e.g. {fieldMatch(name)!.samples.join(", ")}
                    </Typography>
                  ) : null}
                </Typography>
                <TextField
                  select
                  size="small"
                  sx={{ minWidth: 220 }}
                  value={fields[name] ?? ""}
                  disabled={!canEdit || busy || !enabled}
                  onChange={(event) => {
                    setFields((current) => ({
                      ...current,
                      [name]: event.target.value,
                    }));
                    setFieldConfirmed((current) => ({
                      ...current,
                      [name]: true,
                    }));
                  }}
                  SelectProps={{ displayEmpty: true }}
                  inputProps={{ "aria-label": `PixlPush field for ${name}` }}
                >
                  {TARGETS.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                  <MenuItem value={`properties.${sourceKey(name)}`}>
                    Custom property · {sourceKey(name)}
                  </MenuItem>
                </TextField>
                <StatusChip
                  status={
                    !enabled
                      ? "disabled"
                      : conflict
                        ? "conflict"
                        : fieldConfirmed[name]
                          ? "matched"
                          : (fieldMatch(name)?.status ?? "needs_mapping")
                  }
                />
                <FormControlLabel
                  sx={mappingSwitchLabelSx}
                  control={
                    <Switch
                      size="small"
                      sx={webhookSwitchSx}
                      checked={enabled}
                      disabled={!canEdit || busy}
                      onChange={(_, on) =>
                        setFieldEnabled((current) => ({
                          ...current,
                          [name]: on,
                        }))
                      }
                    />
                  }
                  label={enabled ? "Enabled" : "Disabled"}
                />
              </Stack>
            );
          })
        ) : (
          <Typography variant="body2" color="text.secondary">
            No profile fields found yet. They appear once your server sends a
            user object.
          </Typography>
        )}
        {consent.size > 0 && (
          <Stack
            direction="row"
            gap={1}
            alignItems="center"
            flexWrap="wrap"
            sx={{ pt: 1, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Typography variant="caption" color="text.secondary">
              Consent fields:
            </Typography>
            {[...consent].map((name) => (
              <Chip
                key={name}
                size="small"
                label={name}
                sx={{ fontFamily: "var(--pp-mono)" }}
              />
            ))}
          </Stack>
        )}
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          Plans
        </Typography>
        {sample.isLoading ? (
          <Skeleton height={60} />
        ) : products.length ? (
          products.map((product) => (
            <Stack
              key={product}
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              alignItems={{ sm: "center" }}
              sx={{ py: 0.5, borderTop: "1px solid", borderColor: "divider" }}
            >
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  fontFamily: "var(--pp-mono)",
                  overflowWrap: "anywhere",
                }}
              >
                {product}
              </Typography>
              <TextField
                size="small"
                sx={{ minWidth: 220 }}
                label="PixlPush tier"
                placeholder={product}
                value={tiers[product] ?? ""}
                disabled={!canEdit || busy}
                onChange={(event) =>
                  setTiers((current) => ({
                    ...current,
                    [product]: event.target.value,
                  }))
                }
                inputProps={{
                  maxLength: 60,
                  "aria-label": `Plan name for ${product}`,
                }}
              />
              <Chip
                size="small"
                label={tiers[product]?.trim() ? "Matched" : "Needs mapping"}
                color={tiers[product]?.trim() ? "success" : "warning"}
              />
            </Stack>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No products found yet. They appear when the server sends
            subscription events with product_id.
          </Typography>
        )}
        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          Events
        </Typography>
        <Stack gap={1}>
          {eventNames.map((source) => {
            const value = events[source] ?? { target: source, enabled: true };
            const match = value.target.trim() === source.trim();
            return (
              <Stack
                key={source}
                direction={{ xs: "column", md: "row" }}
                gap={1}
                alignItems={{ md: "center" }}
                sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    fontFamily: "var(--pp-mono)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {source}
                  {value.enabled && !value.confirmed && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="warning.main"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        fontFamily: "inherit",
                      }}
                    >
                      <WarningAmberRounded sx={{ fontSize: 14 }} />
                      {eventMatch(source)?.status === "suggested"
                        ? "Suggested match. Review and confirm."
                        : "Needs mapping. Not saved until you review it."}
                    </Typography>
                  )}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    minWidth: 200,
                    fontFamily: "var(--pp-mono)",
                    overflowWrap: "anywhere",
                    color: value.confirmed ? "text.primary" : "text.secondary",
                  }}
                >
                  → {value.target}
                </Typography>
                <StatusChip
                  status={
                    !value.enabled
                      ? "disabled"
                      : value.confirmed
                        ? "matched"
                        : (eventMatch(source)?.status ?? "needs_mapping")
                  }
                />
                <IconButton
                  size="small"
                  aria-label={`Edit mapping for ${source}`}
                  disabled={!canEdit || busy}
                  onClick={() => setEditing(source)}
                >
                  <EditRounded fontSize="small" />
                </IconButton>
                <FormControlLabel
                  sx={mappingSwitchLabelSx}
                  control={
                    <Switch
                      size="small"
                      sx={webhookSwitchSx}
                      checked={value.enabled}
                      disabled={!canEdit || busy}
                      onChange={(_, on) =>
                        setEvents((current) => ({
                          ...current,
                          [source]: { ...value, enabled: on },
                        }))
                      }
                    />
                  }
                  label={value.enabled ? "Enabled" : "Disabled"}
                />
              </Stack>
            );
          })}
        </Stack>
        {!eventNames.length && (
          <Typography variant="body2" color="text.secondary">
            No events from your server yet. They appear here once your server
            sends them.
          </Typography>
        )}
        {activity}
      </Section>

      {editing && (
        <EventMappingDialog
          open
          projectId={projectId}
          source={editing}
          match={eventMatch(editing)}
          known={sample.data?.knownEvents ?? []}
          current={events[editing]?.target}
          canCreate={canEdit}
          onClose={() => setEditing(undefined)}
          onConfirm={(target) => {
            setEvents((current) => ({
              ...current,
              [editing]: {
                ...(current[editing] ?? { enabled: true }),
                target,
                confirmed: true,
              },
            }));
            setEditing(undefined);
            void sample.refetch();
          }}
          onLeave={() => {
            // Stored under its own name; never dropped.
            setEvents((current) => ({
              ...current,
              [editing]: {
                ...(current[editing] ?? { enabled: true }),
                target: editing,
                confirmed: false,
              },
            }));
            setEditing(undefined);
          }}
        />
      )}

      <Section
        number="3.3"
        icon={<RouteRounded fontSize="small" />}
        title="Journeys and campaigns data"
        detail="Stage participants in existing PixlPush journeys. Nothing is sent until you switch over."
      >
        <Alert severity="info">
          Participants map to an existing PixlPush user, journey and step.
          Existing email and push templates in this project can be reused;
          source content, standalone campaigns and in-app steps are not
          imported.
        </Alert>
        {journeys}
      </Section>

      <Card className="saas-card">
        <Stack gap={1.5}>
          <Typography variant="h4">Review mapping</Typography>
          <Typography variant="body2" color="text.secondary">
            Sample: {sample.data?.fields.length ?? 0} profile fields ·{" "}
            {sample.data?.events.length ?? 0} event names ·{" "}
            {sample.data?.products.length ?? 0} products. Disabled rows will not
            be synced. Unmapped optional values can remain custom properties.
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Chip
              icon={<CheckCircleRounded />}
              color="success"
              label={`${mappingStatuses.matched} matched`}
            />
            {needsAttention > 0 && (
              <Chip
                icon={<ErrorOutlineRounded />}
                color="warning"
                label={`${needsAttention} need mapping`}
              />
            )}
            {mappingStatuses.conflicts > 0 && (
              <Chip
                color="error"
                label={`${mappingStatuses.conflicts} conflicts`}
              />
            )}
            {eventNames.filter((source) => events[source]?.enabled === false)
              .length > 0 && (
              <Chip
                icon={<ToggleOffRounded />}
                label={`${eventNames.filter((source) => events[source]?.enabled === false).length} event types disabled`}
              />
            )}
            {eventNames.some((source) => events[source]?.enabled) && (
              <Chip
                icon={<ToggleOnRounded />}
                label="Ongoing events can start configured journeys"
              />
            )}
          </Stack>
          {canEdit && (
            <Button
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
              disabled={busy || !active || mappingStatuses.conflicts > 0}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Review and publish mapping"}
            </Button>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
