"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
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
import { SEGMENT_PURPOSES } from "@/lib/lifecycle-purposes";
import EventMappingDialog from "./EventMappingDialog";
import {
  CampaignTable,
  HistoryNotice,
  JourneyTable,
  type Choice,
} from "./WebhookHistory";

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
  /** The PixlPush lifecycle segment this server segment is associated with. */
  lifecycle?: string;
};
/** Only ongoing sync is switchable; imports, outbound updates and migrations are explicit actions. */
type DataCategories = {
  userAndSegments: { ongoingSync: boolean };
  activity: { ongoingSync: boolean };
  emailCampaigns: { ongoingSync: boolean };
  pushCampaigns: { ongoingSync: boolean };
  journeys: { ongoingSync: boolean };
};
type CampaignRule = {
  channel: "email" | "push";
  source: string;
  target: string | null;
};
type JourneyRule = {
  source: string;
  target: string | null;
  steps: { source: string; target: string | null }[];
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
    products: {
      source: string;
      entitlementKey: string;
      tier?: string;
      enabled?: boolean;
    }[];
    states?: unknown[];
    events?: unknown;
  };
  events?: EventRule[];
  segments?: SegmentRule[];
  categories?: Partial<DataCategories>;
  campaigns?: CampaignRule[];
  journeys?: JourneyRule[];
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
  ["properties.platform", "Platform"],
] as const;
const DEFAULT_CATEGORIES: DataCategories = {
  userAndSegments: { ongoingSync: true },
  activity: { ongoingSync: true },
  emailCampaigns: { ongoingSync: true },
  pushCampaigns: { ongoingSync: true },
  journeys: { ongoingSync: true },
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
/** PixlPush's built-in lifecycle segments a server segment can be associated with. */
const LIFECYCLE_TARGETS = SEGMENT_PURPOSES.filter(
  (item) => item.key !== "other",
);
// First hit wins, so "uncancelled" is checked before "cancelled" and trials before subscriptions.
const LIFECYCLE_HINTS: [RegExp, string][] = [
  [/trial.*(cancel)|(cancel).*trial/, "trial_cancelled"],
  [/trial/, "trial_active"],
  [
    /un-?cancel|not.?cancel|active.?(sub|premium|vip)|^(premium|vip|paid|pro)\b(?!.*(cancel|expir))/,
    "subscription_active",
  ],
  [/cancel/, "subscription_cancelled"],
  [/expir|lapsed|churn/, "subscription_expired"],
  [/paywall/, "paywall_drop_off"],
  [/onboard|registr|sign.?up.?(start|incomplete)/, "registration_started"],
  [/pause/, "account_paused"],
  [/first.?(open|launch)/, "first_app_open"],
  [/new.*user|account.?created|signed.?up/, "account_created"],
];
/** PixlPush plan types, like Apple and Google Play. The value is saved as the user's subscription tier (ent_subscription_tier). */
const PLAN_TIERS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-time" },
  { value: "trial", label: "Trial" },
];
/** The plan type a product id most likely is, e.g. "large_monthly" → monthly. */
const suggestTier = (product: string) => {
  const name = product.toLowerCase();
  if (/trial/.test(name)) return "trial";
  if (/week/.test(name)) return "weekly";
  if (/year|annual|12.?month/.test(name)) return "yearly";
  if (/one.?time|lifetime|forever|coins?|credits?|pack|consumable/.test(name))
    return "one_time";
  if (/month/.test(name)) return "monthly";
  return "";
};
/** The built-in lifecycle segment a server segment name most likely means, if any. */
const suggestLifecycle = (name: string) => {
  const key = LIFECYCLE_HINTS.find(([pattern]) =>
    pattern.test(name.toLowerCase()),
  )?.[1];
  return LIFECYCLE_TARGETS.find((item) => item.key === key)?.label;
};
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
  const [planEnabled, setPlanEnabled] = useState<Record<string, boolean>>({});
  // `confirmed`: saved, exactly matched, or chosen by the customer. Unconfirmed suggestions are not saved.
  const [events, setEvents] = useState<
    Record<string, { target: string; enabled: boolean; confirmed: boolean }>
  >({});
  const [fieldConfirmed, setFieldConfirmed] = useState<Record<string, boolean>>(
    {},
  );
  const [editing, setEditing] = useState<string>();
  const [campaignChoices, setCampaignChoices] = useState<
    Record<string, Choice>
  >({});
  const [journeyChoices, setJourneyChoices] = useState<Record<string, Choice>>(
    {},
  );
  const [stepChoices, setStepChoices] = useState<
    Record<string, Record<string, Choice>>
  >({});
  const [segments, setSegments] = useState<SegmentRule[]>([]);
  const [categories, setCategories] =
    useState<DataCategories>(DEFAULT_CATEGORIES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const consent = useMemo(
    () => new Set((config.consent ?? []).map((rule) => rule.source)),
    [config.consent],
  );

  // Unsaved-changes tracking: the snapshot taken right after loading is the baseline.
  const [resetToken, setResetToken] = useState(0);
  const [baseline, setBaseline] = useState<string | null>(null);
  const pendingBaseline = useRef(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const router = useRouter();
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
    // New products start off and unassociated; turning one on applies the suggestion.
    const nextPlanEnabled: Record<string, boolean> = {};
    for (const product of sample.data?.products ?? []) {
      nextTiers[product] = "";
      nextPlanEnabled[product] = false;
    }
    for (const rule of current.entitlements?.products ?? []) {
      nextTiers[rule.source] = rule.tier ?? "";
      nextPlanEnabled[rule.source] = rule.enabled !== false;
    }
    setPlanEnabled(nextPlanEnabled);
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
      emailCampaigns: {
        ongoingSync: current.categories?.emailCampaigns?.ongoingSync ?? true,
      },
      pushCampaigns: {
        ongoingSync: current.categories?.pushCampaigns?.ongoingSync ?? true,
      },
      journeys: {
        ongoingSync: current.categories?.journeys?.ongoingSync ?? true,
      },
    });
    // Step 3.3: saved choices win; otherwise only an exact match is applied, suggestions wait.
    const nextCampaigns: Record<string, Choice> = {};
    for (const match of sample.data?.campaignMatches ?? []) {
      nextCampaigns[`${match.channel}:${match.source}`] = {
        target: match.target,
        confirmed: match.status === "matched",
      };
    }
    for (const rule of current.campaigns ?? [])
      nextCampaigns[`${rule.channel}:${rule.source}`] = {
        target: rule.target,
        confirmed: true,
      };
    const nextJourneys: Record<string, Choice> = {};
    const nextSteps: Record<string, Record<string, Choice>> = {};
    for (const match of sample.data?.journeyMatches ?? []) {
      nextJourneys[match.source] = {
        target: match.target,
        confirmed: match.status === "matched",
      };
      nextSteps[match.source] = Object.fromEntries(
        match.steps.map((step) => [
          step.source,
          { target: step.target, confirmed: step.status === "matched" },
        ]),
      );
    }
    for (const rule of current.journeys ?? []) {
      nextJourneys[rule.source] = { target: rule.target, confirmed: true };
      nextSteps[rule.source] = {
        ...nextSteps[rule.source],
        ...Object.fromEntries(
          rule.steps.map((step) => [
            step.source,
            { target: step.target, confirmed: true },
          ]),
        ),
      };
    }
    setCampaignChoices(nextCampaigns);
    setJourneyChoices(nextJourneys);
    setStepChoices(nextSteps);
    pendingBaseline.current = true;
  }, [active, sample.data, resetToken]);

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

  // Every segment name seen in the data is listed; names without a saved rule start off.
  const seenSegments = [
    ...new Set([
      ...(sample.data?.segmentNames ?? []),
      ...externalSegments
        .filter((item) => item.namespace === "webhook")
        .map((item) => item.displayName),
    ]),
  ];
  const allSegments: SegmentRule[] = [
    ...segments,
    ...seenSegments
      .filter(
        (name) =>
          !segments.some(
            (item) => item.sourceName.toLowerCase() === name.toLowerCase(),
          ),
      )
      .sort()
      .map((name) => ({
        sourceName: name,
        namespace: "webhook",
        key:
          existingSegmentMatch(name, externalSegments)?.key ?? sourceKey(name),
        displayName: name,
        enabled: false,
        exclusive: false,
      })),
  ];

  const updateSegment = (sourceName: string, patch: Partial<SegmentRule>) =>
    setSegments((current) =>
      current.some((item) => item.sourceName === sourceName)
        ? current.map((item) =>
            item.sourceName === sourceName ? { ...item, ...patch } : item,
          )
        : [
            ...current,
            {
              ...allSegments.find((item) => item.sourceName === sourceName)!,
              ...patch,
            },
          ],
    );

  const snapshot = JSON.stringify({
    fields,
    fieldEnabled,
    tiers,
    planEnabled,
    events,
    segments,
    categories,
    campaignChoices,
    journeyChoices,
    stepChoices,
  });
  // Until the customer edits something, the baseline follows the loaded state (sections
  // finish loading at different times), so the bar never shows without a real change.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!pendingBaseline.current && touched) return;
    pendingBaseline.current = false;
    setBaseline(snapshot);
  }, [snapshot, touched]);
  const dirty = touched && baseline !== null && snapshot !== baseline;
  const discard = () => {
    setTouched(false);
    setResetToken((value) => value + 1);
  };
  // The bar is fixed to the screen bottom (a parent card clips overflow, so sticky
  // cannot work) and lined up with this section so it never covers the sidebar.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [barBox, setBarBox] = useState<{ left: number; width: number } | null>(
    null,
  );
  useEffect(() => {
    // From the sidebar's right edge to the window's right edge (no sidebar on phones).
    const sidebar = document.querySelector(
      '[aria-label="PixlPush navigation"]',
    );
    const measure = () => {
      const rect = sidebar?.getBoundingClientRect();
      const left = rect && rect.width > 0 && rect.right > 0 ? rect.right : 0;
      const width = document.documentElement.clientWidth - left;
      setBarBox((current) =>
        current && current.left === left && current.width === width
          ? current
          : { left, width },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (sidebar) observer.observe(sidebar);
    observer.observe(document.documentElement);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mappings.isLoading]);
  // The floating bar is only needed while the Review mapping card is off-screen.
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  useEffect(() => {
    const node = reviewRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setReviewVisible(Boolean(entry?.isIntersecting)),
    );
    observer.observe(node);
    return () => observer.disconnect();
  });

  // Leaving with unsaved changes: the browser asks on reload/close; in-app links ask here.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (
        !href ||
        !href.startsWith("/") ||
        link?.getAttribute("target") === "_blank"
      )
        return;
      if (href.split("#")[0] === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setLeaveTo(href);
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

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
        // Only confirmed 3.3 choices are saved; unconfirmed history is still stored, just not linked.
        campaigns: Object.entries(campaignChoices)
          .filter(([, choice]) => choice.confirmed)
          .map(([key, choice]) => ({
            channel: key.split(":")[0] as "email" | "push",
            source: key.slice(key.indexOf(":") + 1),
            target: choice.target,
          })),
        journeys: Object.entries(journeyChoices)
          .filter(([, choice]) => choice.confirmed)
          .map(([source, choice]) => ({
            source,
            target: choice.target,
            steps: choice.target
              ? Object.entries(stepChoices[source] ?? {})
                  .filter(([, step]) => step.confirmed)
                  .map(([step, value]) => ({
                    source: step,
                    target: value.target,
                  }))
              : [],
          })),
        entitlements: {
          states: [],
          events: {},
          ...config.entitlements,
          // Saved with their switch; products never touched stay unmapped (off).
          products: Object.entries(tiers)
            .filter(([source, tier]) => tier.trim() || planEnabled[source])
            .map(([source, tier]) => ({
              source,
              entitlementKey: "subscription",
              ...(tier.trim() ? { tier: tier.trim() } : {}),
              enabled: planEnabled[source] === true,
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
      setBaseline(snapshot);
      setTouched(false);
      return true;
    } catch (cause) {
      setError(errorText(cause));
      return false;
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
    <Stack
      gap={2}
      ref={rootRef}
      onChangeCapture={() => setTouched(true)}
      onClickCapture={(event) => {
        // Switches, selects and buttons inside the mapping count as edits.
        if ((event.target as Element).closest("input, [role=option], button"))
          setTouched(true);
      }}
    >
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
        <Typography variant="caption" color="text.secondary">
          Every segment your server sends is listed here, turned off. Turn one
          on and associate it with a PixlPush segment, then publish: its users,
          including past entries, join that PixlPush segment and leave it when
          your server takes them out.
        </Typography>
        {allSegments.map((segment) => {
          const enabled = segment.enabled !== false;
          const suggested = suggestLifecycle(segment.sourceName);
          const status = segment.lifecycle
            ? { label: "Associated", color: "success" as const }
            : suggested
              ? { label: "Suggested", color: "info" as const }
              : { label: "Not associated", color: "default" as const };
          return (
            <Stack
              key={segment.sourceName}
              direction={{ xs: "column", md: "row" }}
              gap={1.5}
              alignItems={{ md: "center" }}
              sx={{ py: 1, borderTop: "1px solid", borderColor: "divider" }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "var(--pp-mono)",
                    overflowWrap: "anywhere",
                  }}
                >
                  {segment.sourceName}
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label="PixlPush segment"
                value={segment.lifecycle ?? ""}
                disabled={!canEdit || busy}
                onChange={(event) =>
                  updateSegment(segment.sourceName, {
                    // Associating never turns import on; only the switch does.
                    lifecycle: event.target.value || undefined,
                  })
                }
                sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">
                  <Typography component="span" color="text.secondary">
                    Not associated
                  </Typography>
                </MenuItem>
                {LIFECYCLE_TARGETS.map((item) => (
                  <MenuItem key={item.key} value={item.label}>
                    {item.label}
                    {item.label === suggested ? " (suggested)" : ""}
                  </MenuItem>
                ))}
              </TextField>
              <Chip size="small" label={status.label} color={status.color} />
              <FormControlLabel
                sx={mappingSwitchLabelSx}
                control={
                  <Switch
                    size="small"
                    sx={webhookSwitchSx}
                    checked={enabled}
                    disabled={!canEdit || busy}
                    onChange={(_, on) =>
                      updateSegment(segment.sourceName, {
                        enabled: on,
                        // Turning a segment on applies the suggestion; it can be changed.
                        ...(on && !segment.lifecycle && suggested
                          ? { lifecycle: suggested }
                          : {}),
                      })
                    }
                  />
                }
                label={enabled ? "Enabled" : "Disabled"}
              />
            </Stack>
          );
        })}
        {!allSegments.length && (
          <Typography variant="body2" color="text.secondary">
            No segments found in your server data yet. They appear here, turned
            off, as soon as your feed sends segment_entered or segment_exited.
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
                  {`properties.${sourceKey(name)}` !==
                    "properties.platform" && (
                    <MenuItem value={`properties.${sourceKey(name)}`}>
                      Custom property · {sourceKey(name)}
                    </MenuItem>
                  )}
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
        <Typography variant="caption" color="text.secondary">
          Every product your server sends is listed here, turned off. Associate
          it with a PixlPush plan type (Weekly, Monthly, Yearly, One-time or
          Trial), turn it on and publish: purchases of that product, including
          earlier ones, set the user’s plan, which you can target in segments
          and audiences.
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
                select
                size="small"
                label="PixlPush plan"
                value={tiers[product] ?? ""}
                disabled={!canEdit || busy}
                onChange={(event) =>
                  setTiers((current) => ({
                    ...current,
                    [product]: event.target.value,
                  }))
                }
                sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}
                SelectProps={{ displayEmpty: true }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ "aria-label": `PixlPush plan for ${product}` }}
              >
                <MenuItem value="">
                  <Typography component="span" color="text.secondary">
                    Not associated
                  </Typography>
                </MenuItem>
                {PLAN_TIERS.map((tier) => (
                  <MenuItem key={tier.value} value={tier.value}>
                    {tier.label}
                    {tier.value === suggestTier(product) ? " (suggested)" : ""}
                  </MenuItem>
                ))}
                {/* A plan saved before these types existed keeps its own name. */}
                {tiers[product] &&
                  !PLAN_TIERS.some((tier) => tier.value === tiers[product]) && (
                    <MenuItem value={tiers[product]}>{tiers[product]}</MenuItem>
                  )}
              </TextField>
              <Chip
                size="small"
                label={
                  tiers[product]
                    ? "Associated"
                    : suggestTier(product)
                      ? "Suggested"
                      : "Not associated"
                }
                color={
                  tiers[product]
                    ? "success"
                    : suggestTier(product)
                      ? "info"
                      : "default"
                }
              />
              <FormControlLabel
                sx={mappingSwitchLabelSx}
                control={
                  <Switch
                    size="small"
                    sx={webhookSwitchSx}
                    checked={planEnabled[product] === true}
                    disabled={!canEdit || busy}
                    onChange={(_, on) => {
                      setPlanEnabled((current) => ({
                        ...current,
                        [product]: on,
                      }));
                      // Turning a product on applies the suggestion; it can be changed.
                      if (on && !tiers[product] && suggestTier(product))
                        setTiers((current) => ({
                          ...current,
                          [product]: suggestTier(product),
                        }));
                    }}
                  />
                }
                label={planEnabled[product] ? "Enabled" : "Disabled"}
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
        detail="Map email campaigns, push campaigns and journeys from your previous tool, and import who received what."
      >
        <HistoryNotice unknownChannel={sample.data?.unknownChannel ?? 0} />
        {(
          [
            [
              "emailCampaigns",
              "3.3.1 Email campaigns",
              "email",
              "Sent, delivered, opened, clicked, bounced, failed, unsubscribed and complained.",
            ],
            [
              "pushCampaigns",
              "3.3.2 Push campaigns",
              "push",
              "Sent, delivered, opened and failed. PixlPush records push opens, not link clicks.",
            ],
          ] as const
        ).map(([key, label, channel, statuses]) => (
          <Box
            key={key}
            sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Stack
              direction={{ xs: "column", sm: "row" }}
              gap={1}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
            >
              <Box>
                <Typography fontWeight={600}>{label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {statuses}
                </Typography>
              </Box>
              <FormControlLabel
                sx={mappingSwitchLabelSx}
                control={
                  <Switch
                    size="small"
                    sx={webhookSwitchSx}
                    checked={categories[key].ongoingSync}
                    disabled={!canEdit || busy}
                    onChange={(_, on) => setCategory(key, "ongoingSync", on)}
                  />
                }
                label={categories[key].ongoingSync ? "Import" : "Skip"}
              />
            </Stack>
            {categories[key].ongoingSync && (
              <Box sx={{ mt: 1 }}>
                <CampaignTable
                  channel={channel}
                  matches={sample.data?.campaignMatches ?? []}
                  targets={sample.data?.targets[channel] ?? []}
                  choices={Object.fromEntries(
                    Object.entries(campaignChoices)
                      .filter(([itemKey]) => itemKey.startsWith(`${channel}:`))
                      .map(([itemKey, value]) => [
                        itemKey.slice(channel.length + 1),
                        value,
                      ]),
                  )}
                  disabled={!canEdit || busy}
                  onChange={(source, target) =>
                    setCampaignChoices((current) => ({
                      ...current,
                      [`${channel}:${source}`]: { target, confirmed: true },
                    }))
                  }
                />
              </Box>
            )}
          </Box>
        ))}
        <Box sx={{ pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
          >
            <Box>
              <Typography fontWeight={600}>3.3.3 Journeys</Typography>
              <Typography variant="caption" color="text.secondary">
                Which step each user reached. History only: nobody is added to
                or moved through a PixlPush journey.
              </Typography>
            </Box>
            <FormControlLabel
              sx={mappingSwitchLabelSx}
              control={
                <Switch
                  size="small"
                  sx={webhookSwitchSx}
                  checked={categories.journeys.ongoingSync}
                  disabled={!canEdit || busy}
                  onChange={(_, on) =>
                    setCategory("journeys", "ongoingSync", on)
                  }
                />
              }
              label={categories.journeys.ongoingSync ? "Import" : "Skip"}
            />
          </Stack>
          {categories.journeys.ongoingSync && (
            <Box sx={{ mt: 1 }}>
              <JourneyTable
                matches={sample.data?.journeyMatches ?? []}
                targets={sample.data?.targets.journeys ?? []}
                choices={journeyChoices}
                stepChoices={stepChoices}
                disabled={!canEdit || busy}
                onJourney={(source, target) => {
                  setJourneyChoices((current) => ({
                    ...current,
                    [source]: { target, confirmed: true },
                  }));
                  // A different journey has different steps; start them over.
                  setStepChoices((current) => ({ ...current, [source]: {} }));
                }}
                onStep={(journey, step, target) =>
                  setStepChoices((current) => ({
                    ...current,
                    [journey]: {
                      ...current[journey],
                      [step]: { target, confirmed: true },
                    },
                  }))
                }
              />
            </Box>
          )}
          {journeys && (
            <Box sx={{ mt: 2 }}>
              <Typography fontWeight={600}>
                Move users who are mid-journey (optional)
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{ mb: 1 }}
              >
                A separate, staged step for switching running journeys to
                PixlPush. Participants stay paused until you review and switch
                over.
              </Typography>
              {journeys}
            </Box>
          )}
        </Box>
      </Section>

      <Card className="saas-card" ref={reviewRef}>
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
              sx={{ alignSelf: { xs: "stretch", sm: "flex-start" } }}
              disabled={
                busy || !active || mappingStatuses.conflicts > 0 || !dirty
              }
              onClick={() => void save()}
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {busy
                ? "Publishing…"
                : dirty
                  ? "Save and publish"
                  : "No changes to publish"}
            </Button>
          )}
        </Stack>
      </Card>

      {canEdit && dirty && !reviewVisible && (
        <Paper
          elevation={0}
          square
          role="region"
          aria-label="Unsaved mapping changes"
          sx={{
            position: "fixed",
            bottom: 0,
            left: barBox ? barBox.left : 0,
            width: barBox ? barBox.width : "100%",
            zIndex: (theme) => theme.zIndex.appBar,
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 1.5, sm: 1.75 },
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            gap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>
              You have unsaved changes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Save and publish to apply them to data from your server.
            </Typography>
          </Box>
          <Stack direction="row" gap={1} justifyContent="flex-end">
            <Button onClick={discard} disabled={busy}>
              Discard
            </Button>
            <Button
              variant="contained"
              onClick={() => void save()}
              disabled={busy || !active || mappingStatuses.conflicts > 0}
              startIcon={
                busy ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              {busy ? "Publishing…" : "Save and publish"}
            </Button>
          </Stack>
        </Paper>
      )}

      <Dialog
        open={leaveTo !== null}
        onClose={() => !busy && setLeaveTo(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Save your mapping changes?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            You changed the Webhook mapping but did not publish it. Save and
            publish now, or discard the changes and leave.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
          <Button onClick={() => setLeaveTo(null)} disabled={busy}>
            Keep editing
          </Button>
          <Button
            color="error"
            disabled={busy}
            onClick={() => {
              const href = leaveTo!;
              setTouched(false);
              setLeaveTo(null);
              router.push(href);
            }}
          >
            Discard changes
          </Button>
          <Button
            variant="contained"
            disabled={busy || !active || mappingStatuses.conflicts > 0}
            startIcon={
              busy ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            onClick={async () => {
              const href = leaveTo!;
              if (await save()) {
                setLeaveTo(null);
                router.push(href);
              }
            }}
          >
            {busy ? "Publishing…" : "Save and publish"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
