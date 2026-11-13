"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AddRounded,
  ArrowBackRounded,
  CalendarMonthRounded,
  CallSplitRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EmailRounded,
  EventRounded,
  GroupRounded,
  MoreVertRounded,
  NotificationsActiveRounded,
  PauseCircleOutlineRounded,
  PlayArrowRounded,
  ReplayRounded,
  SaveRounded,
  SearchRounded,
  SettingsRounded,
  StopCircleRounded,
  TimerRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Popper,
  Radio,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  audienceGroupsApi,
  emailApi,
  eventsApi,
  journeysApi,
  lifecycleSegmentsApi,
  pushApi,
  type JourneyMetricUser,
  type JourneyUsersMetric,
} from "@/lib/projects/api";
import Link from "next/link";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { formatUserDateTime } from "@/lib/timezone";
import {
  ENTRANCE,
  EXIT,
  MESSAGE_BLOCKS,
  abMaxVariants,
  abResults,
  conditionOptions,
  mergeJourneyEventOptions,
  normalizeConditionRule,
  fromJourney,
  journeyError,
  toJourneyInput,
  type Block,
  type BlockSettings,
  type BlockStats,
  type BlockType,
  type Branches,
  type BranchSide,
  type BuilderStatus,
  type EntranceConfig,
} from "@/lib/journeys";

type Option = {
  id: string;
  name: string;
  deletedAt?: string | null;
  title?: string;
  body?: string;
  subject?: string;
  text?: string | null;
  html?: string | null;
  sources?: string[];
};
/** The real choices of this Project for the settings panel's dropdowns. */
type Choices = {
  segments: Option[];
  groups: Option[];
  emailTemplates: Option[];
  pushTemplates: Option[];
  events: Option[];
};
type SettingProps = {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
};
type AddTarget =
  | { scope: "root"; index: number }
  | { scope: "branch"; conditionId: string; branch: BranchSide };
const blockOptions: Array<[BlockType, string, string, typeof EmailRounded]> = [
  [
    "email",
    "Email template",
    "Send a designed email to subscribers.",
    EmailRounded,
  ],
  [
    "notification",
    "Push notification",
    "Send a push notification to subscribers.",
    NotificationsActiveRounded,
  ],
  [
    "web_notification",
    "Web push notification",
    "Send a web push notification to subscribers.",
    NotificationsActiveRounded,
  ],
  ["wait", "Wait", "Pause before the next step.", TimerRounded],
  [
    "condition",
    "Condition",
    "Split subscribers into Yes and No paths.",
    SettingsRounded,
  ],
  ["event", "Events", "Branch subscribers based on a tracked event.", EventRounded],
  ["ab_test", "A/B test", "Send each user one of 2 to 5 messages, then keep the best.", CallSplitRounded],
  [
    "specific_time",
    "Specific time",
    "Send the next step at a chosen time.",
    CalendarMonthRounded,
  ],
  [
    "repeat_journey",
    "Repeat same journey",
    "Repeat this journey for a user.",
    ReplayRounded,
  ],
];
/** One short line under each name in the "Add a step" menu (the card keeps the longer description). */
const MENU_HINTS: Record<BlockType, string> = {
  entrance: "",
  exit: "",
  email: "Send a designed email",
  notification: "Send a mobile push",
  web_notification: "Send a browser push",
  wait: "Pause for a set time",
  condition: "Split into Yes and No",
  event: "Branch on a tracked event",
  ab_test: "Test 2 to 5 messages",
  specific_time: "Continue at a set time",
  repeat_journey: "Run the journey again",
};
/** Inside a Yes/No path: everything but an A/B test, whose variants are only drawn on the main path. */
const branchOptions = blockOptions.filter(([type]) => type !== "ab_test");
const AB_LETTERS = "ABCDE";

export default function JourneyBuilder() {
  const router = useRouter();
  const params = useSearchParams();
  const template = params.get("template");
  const [name, setName] = useState(template || "New Journey");
  const [status, setStatus] = useState<BuilderStatus>("Draft");
  // ?id=… edits a saved journey; a new one gets its id on the first save.
  const [journeyId, setJourneyId] = useState(params.get("id"));
  const { active } = useActiveProject();
  const projectId = active?.id;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<BlockSettings>({});
  const listOptions = { enabled: Boolean(projectId), staleTime: 60_000 };
  const segments = useQuery({
    queryKey: ["projects", projectId, "lifecycle-segments"],
    queryFn: () => lifecycleSegmentsApi.list(projectId!),
    ...listOptions,
  });
  const groups = useQuery({
    queryKey: ["projects", projectId, "audience-groups"],
    queryFn: () => audienceGroupsApi.list(projectId!),
    ...listOptions,
  });
  const emailTemplates = useQuery({
    queryKey: ["projects", projectId, "journey-email-templates"],
    queryFn: () =>
      emailApi.templates.list(projectId!, { category: "template", limit: 100 }),
    ...listOptions,
  });
  const pushTemplates = useQuery({
    queryKey: ["projects", projectId, "journey-push-templates"],
    queryFn: () =>
      pushApi.templates.list(projectId!, { category: "template", limit: 100 }),
    ...listOptions,
  });
  const journeyEvents = useQuery({
    queryKey: ["projects", projectId, "journey-event-catalog"],
    queryFn: async () => {
      const [web, mobile] = await Promise.all([
        eventsApi.listCatalog(projectId!, "web"),
        eventsApi.listCatalog(projectId!, "mobile"),
      ]);
      return mergeJourneyEventOptions(web.events, mobile.events);
    },
    ...listOptions,
  });
  const loaded = useQuery({
    queryKey: ["projects", projectId, "journeys", journeyId],
    queryFn: () => journeysApi.get(projectId!, journeyId!),
    enabled: Boolean(projectId && params.get("id")),
    refetchOnWindowFocus: false,
  });
  const [entranceConfig, setEntranceConfig] = useState<EntranceConfig>({
    lifecycle: "",
    audience: "",
    allUsers: false,
  });
  const [conditionValues, setConditionValues] = useState<
    Record<string, string[]>
  >({});
  const [blocks, setBlocks] = useState<Block[]>([ENTRANCE, EXIT]);
  const [selected, setSelected] = useState<Block | null>(null);
  // One users panel for the whole builder: opening another counter replaces it.
  const [metricPanel, setMetricPanel] = useState<OpenMetric | null>(null);
  useEffect(() => {
    if (selected) setMetricPanel(null);
  }, [selected]);
  const openMetric = (open: OpenMetric) => {
    setSelected(null);
    setMetricPanel(open);
  };
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null);
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!addTarget) return;
    const closeIfOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".journey-add-popover, .journey-plus-wrap, .journey-ab-add-wrap")) return;
      setAddTarget(null);
      setAddAnchor(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddTarget(null);
        setAddAnchor(null);
      }
    };
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [addTarget]);
  const [stopOpen, setStopOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [branches, setBranches] = useState<Branches>({});
  const emailTemplateIds = Array.from(
    new Set(
      [
        ...blocks,
        ...Object.values(branches).flatMap((branch) => [
          ...branch.yes,
          ...branch.no,
          ...(branch.variants ?? []),
        ]),
      ]
        .filter((block) => block.type === "email")
        .map((block) => settings[block.id]?.template)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const pushTemplateIds = Array.from(
    new Set(
      [
        ...blocks,
        ...Object.values(branches).flatMap((branch) => [
          ...branch.yes,
          ...branch.no,
          ...(branch.variants ?? []),
        ]),
      ]
        .filter((block) => block.type === "notification" || block.type === "web_notification")
        .map((block) => settings[block.id]?.template)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const emailTemplateDetails = useQuery({
    queryKey: [
      "projects",
      projectId,
      "journey-email-template-details",
      emailTemplateIds,
    ],
    queryFn: async () => {
      const details = await Promise.all(
        emailTemplateIds.map((id) => emailApi.templates.get(projectId!, id, true)),
      );
      return Object.fromEntries(
        details.map((template) => [template.id, template]),
      );
    },
    enabled: Boolean(projectId && emailTemplateIds.length),
    staleTime: 60_000,
  });
  const pushTemplateDetails = useQuery({
    queryKey: ["projects", projectId, "journey-push-template-details", pushTemplateIds],
    queryFn: async () => {
      const details = await Promise.all(
        pushTemplateIds.map((id) => pushApi.templates.get(projectId!, id, true)),
      );
      return Object.fromEntries(details.map((template) => [template.id, template]));
    },
    enabled: Boolean(projectId && pushTemplateIds.length),
    staleTime: 60_000,
  });
  const listedEmailTemplates = emailTemplates.data?.items ?? [];
  const listedPushTemplates = pushTemplates.data?.items ?? [];
  const detailedEmailTemplates = [
    ...listedEmailTemplates.map((template) =>
      emailTemplateDetails.data?.[template.id]
        ? { ...template, ...emailTemplateDetails.data[template.id] }
        : template,
    ),
    ...Object.values(emailTemplateDetails.data ?? {}).filter(
      (template) => !listedEmailTemplates.some((listed) => listed.id === template.id),
    ),
  ];
  const detailedPushTemplates = [
    ...listedPushTemplates,
    ...Object.values(pushTemplateDetails.data ?? {}).filter(
      (template) => !listedPushTemplates.some((listed) => listed.id === template.id),
    ),
  ];
  const choices: Choices = {
    segments: segments.data ?? [],
    groups: groups.data ?? [],
    emailTemplates: detailedEmailTemplates,
    pushTemplates: detailedPushTemplates,
    events: journeyEvents.data ?? [],
  };
  const builderLoading = Boolean(
    journeyId &&
    !loaded.error &&
    (loaded.isLoading ||
      !loaded.data ||
      segments.isLoading ||
      groups.isLoading ||
      emailTemplates.isLoading ||
      pushTemplates.isLoading ||
      (emailTemplateIds.length > 0 && emailTemplateDetails.isLoading) ||
      (pushTemplateIds.length > 0 && pushTemplateDetails.isLoading)),
  );
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };
  // A saved journey is put on the canvas once, when it arrives.
  useEffect(() => {
    if (!loaded.data) return;
    const state = fromJourney(loaded.data);
    setName(state.name);
    setStatus(state.status);
    setEntranceConfig(state.entranceConfig);
    setBlocks(state.blocks);
    setBranches(state.branches);
    setSettings(state.settings);
    setConditionValues(state.conditionValues);
  }, [loaded.data]);
  useEffect(() => {
    if (loaded.error)
      notify(journeyError(loaded.error, "This journey could not be loaded."));
  }, [loaded.error]);

  /** One backend action at a time; a failure is shown in the toast and leaves the canvas as it is. */
  const run = async (work: () => Promise<void>) => {
    if (busy || !projectId) return;
    setBusy(true);
    try {
      await work();
      await queryClient.invalidateQueries({
        queryKey: ["projects", projectId, "journeys"],
      });
    } catch (error) {
      notify(journeyError(error));
    } finally {
      setBusy(false);
    }
  };
  /** Creates the draft on the first save, updates it afterwards. A running journey only takes a new name. */
  const save = async () => {
    if (status === "Running" && journeyId) {
      await journeysApi.update(projectId!, journeyId, {
        name: name.trim() || "New Journey",
      });
      return journeyId;
    }
    const input = toJourneyInput({
      name,
      entranceConfig,
      blocks,
      branches,
      settings,
      conditionValues,
    });
    const saved = journeyId
      ? await journeysApi.update(projectId!, journeyId, input)
      : await journeysApi.create(projectId!, input);
    if (!journeyId) {
      setJourneyId(saved.id);
      router.replace(`/dashboard/journeys/builder?id=${saved.id}`);
    }
    return saved.id;
  };
  const saveDraft = () =>
    run(async () => {
      await save();
      notify("Journey draft saved");
    });
  const setLive = () =>
    run(async () => {
      const id = await save();
      await journeysApi.action(projectId!, id, "activate");
      setStatus("Running");
      notify("Journey is now live");
    });
  const pause = () =>
    run(async () => {
      await journeysApi.action(projectId!, journeyId!, "pause");
      setStatus("Paused");
      notify("Journey paused");
    });
  const resume = () =>
    run(async () => {
      await journeysApi.action(projectId!, journeyId!, "resume");
      setStatus("Running");
      notify("Journey resumed");
    });
  /** Stop a live journey; delete hides drafts or already stopped journeys. */
  const stopOrDelete = () =>
    run(async () => {
      setStopOpen(false);
      if (journeyId) {
        if (status === "Running" || status === "Paused")
          await journeysApi.action(projectId!, journeyId, "archive");
        else
          await journeysApi.remove(projectId!, journeyId);
      }
      router.push("/dashboard/journeys");
    });
  const setSetting = (blockId: string, key: string, value: string) =>
    setSettings((items) => ({
      ...items,
      [blockId]: { ...items[blockId], [key]: value },
    }));
  const nameOf = (list: Option[], id: string) =>
    list.find((item) => item.id === id)?.name ?? id;
  const addBlock = (type: BlockType, title: string, description: string) => {
    const sourceType =
      addTarget?.scope === "branch"
        ? branches[addTarget.conditionId]?.[addTarget.branch]?.at(-1)?.type
        : addTarget?.scope === "root"
          ? blocks[addTarget.index - 1]?.type
          : undefined;
    const block = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      description,
      sourceType: type === "condition" || type === "event" ? sourceType : undefined,
    };
    if (addTarget?.scope === "branch")
      setBranches((items) => ({
        ...items,
        [addTarget.conditionId]: {
          ...(items[addTarget.conditionId] || { yes: [], no: [] }),
          [addTarget.branch]: [
            ...(items[addTarget.conditionId]?.[addTarget.branch] || []),
            block,
          ],
        },
      }));
    else {
      const index =
        addTarget?.scope === "root" ? addTarget.index : blocks.length - 1;
      setBlocks((items) => [
        ...items.slice(0, index),
        block,
        ...items.slice(index),
      ]);
    }
    if (type === "condition" || type === "event")
      setBranches((items) => ({ ...items, [block.id]: { yes: [], no: [] } }));
    if (type === "ab_test")
      setBranches((items) => ({ ...items, [block.id]: { yes: [], no: [], variants: [] } }));
    setAddTarget(null);
    setAddAnchor(null);
    setSelected(block);
  };
  const removeBlock = (id: string) => {
    setBlocks((items) => items.filter((item) => item.id !== id));
    setBranches((items) => {
      const next = { ...items };
      delete next[id];
      return next;
    });
    setSelected(null);
  };
  const removeBranchBlock = (
    conditionId: string,
    branch: BranchSide,
    id: string,
  ) =>
    setBranches((items) => ({
      ...items,
      [conditionId]: {
        ...(items[conditionId] || { yes: [], no: [] }),
        [branch]: (items[conditionId]?.[branch] || []).filter(
          (item) => item.id !== id,
        ),
      },
    }));
  const openAdd = (target: AddTarget, anchor: HTMLElement) => {
    if (addTarget && JSON.stringify(addTarget) === JSON.stringify(target)) {
      setAddTarget(null);
      setAddAnchor(null);
      return;
    }
    setAddTarget(target);
    setAddAnchor(anchor);
  };
  const closeAdd = () => {
    setAddTarget(null);
    setAddAnchor(null);
  };
  const isTarget = (target: AddTarget) =>
    Boolean(addTarget && JSON.stringify(addTarget) === JSON.stringify(target));
  /** The A/B test the selected card belongs to (the test itself or one of its variants). */
  const selectedTest = selected
    ? selected.type === "ab_test"
      ? selected.id
      : Object.keys(branches).find((id) => branches[id]?.variants?.some((variant) => variant.id === selected.id))
    : undefined;
  /** Keeps one variant on the saved journey (the test and the other variants go) and redraws it. */
  const applyWinner = (testId: string, variantId: string) =>
    run(async () => {
      await journeysApi.applyAbWinner(projectId!, journeyId!, testId, variantId);
      setSelected(null);
      await loaded.refetch();
      notify("Winner kept: the A/B test is now a single step");
    });
  const entranceDescription = entranceConfig.allUsers
    ? "All users"
    : entranceConfig.lifecycle
      ? `Lifecycle segment: ${nameOf(choices.segments, entranceConfig.lifecycle)}`
      : entranceConfig.audience
        ? `Audience group: ${nameOf(choices.groups, entranceConfig.audience)}`
        : "Select a lifecycle segment, audience group, or all users";
  const conditionDescription = (block: Block) =>
    block.type === "event"
      ? settings[block.id]?.event
        ? `Tracked event: ${settings[block.id].event}`
        : block.description
      : conditionValues[block.id]?.[0] || block.description;
  const readableEmailBody = (template: Option) =>
    String(template.text || template.html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n\n")
      .replace(/<li\s*>/gi, "• ")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  /** A message card says what will be sent: the push title/body or the complete email template. */
  const describe = (block: Block): Block => {
    if (block.type === "ab_test") {
      const max = abMaxVariants(settings[block.id]);
      return { ...block, description: `Send each user one of ${max} messages. You pick the winner with Apply.` };
    }
    if (block.type === "wait") {
      const rawAmount = settings[block.id]?.amount ?? "3";
      const amount = Math.floor(Number(rawAmount));
      const unit = settings[block.id]?.unit || "days";
      if (!Number.isFinite(amount) || amount < 1) {
        return { ...block, description: "Set how long users should wait before the next step." };
      }
      const durationUnit = amount === 1 ? unit.slice(0, -1) : unit;
      return {
        ...block,
        description: `Pause for ${amount} ${durationUnit} before the next step.`,
      };
    }
    const template = (
      block.type === "notification" || block.type === "web_notification"
        ? choices.pushTemplates
        : block.type === "email"
          ? choices.emailTemplates
          : []
    ).find((item) => item.id === settings[block.id]?.template);
    if (!template) return block;
    return {
      ...block,
      description:
        block.type === "notification" || block.type === "web_notification"
          ? `Title: ${template.title ?? template.name}\nBody: ${template.body ?? ""}`
          : `Template name: ${template.name}\nSubject: ${settings[block.id]?.subject || template.subject || template.name}\nBody:\n${readableEmailBody(template) || "No email body added yet."}`,
    };
  };
  return (
    <MetricPanelContext.Provider value={openMetric}>
    <Box className="journey-builder-page">
      {toast && (
        <Box className="journey-toast">
          <SaveRounded fontSize="small" />
          {toast}
        </Box>
      )}
      <Box className="journey-builder-header">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ md: "center" }}
          gap={2}
        >
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Button
              startIcon={<ArrowBackRounded />}
              onClick={() => router.push("/dashboard/journeys")}
              className="journey-builder-back-button"
            >
              Back to journeys
            </Button>
            <Stack direction="row" alignItems="center" gap={1}>
              <TextField
                size="small"
                value={name}
                placeholder="New Journey"
                onChange={(event) => setName(event.target.value)}
                aria-label="Journey name"
                sx={{ width: { xs: 180, md: 240 } }}
              />
            </Stack>
            <Box className={`journey-status ${status.toLowerCase()}`}>
              {status}
            </Box>
          </Stack>
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              startIcon={<SaveRounded />}
              variant="contained"
              disabled={busy || status === "Stopped"}
              onClick={saveDraft}
            >
              Save draft
            </Button>
            {status === "Draft" && (
              <Button
                startIcon={<PlayArrowRounded />}
                color="success"
                variant="contained"
                disabled={busy}
                onClick={setLive}
              >
                Save & set live
              </Button>
            )}
            {status === "Running" && (
              <>
                <Button
                  startIcon={<PauseCircleOutlineRounded />}
                  variant="outlined"
                  disabled={busy}
                  onClick={pause}
                >
                  Pause
                </Button>
                <Button
                  startIcon={<StopCircleRounded />}
                  color="error"
                  variant="contained"
                  onClick={() => setStopOpen(true)}
                >
                  Stop journey
                </Button>
              </>
            )}{" "}
            {status === "Paused" && (
              <>
                <Button
                  startIcon={<PlayArrowRounded />}
                  color="success"
                  variant="contained"
                  disabled={busy}
                  onClick={resume}
                >
                  Resume
                </Button>
                <Button
                  startIcon={<StopCircleRounded />}
                  color="error"
                  variant="contained"
                  disabled={busy}
                  onClick={() => setStopOpen(true)}
                >
                  Stop journey
                </Button>
              </>
            )}
            <Button
              startIcon={<DeleteOutlineRounded />}
              color="error"
              variant="outlined"
              onClick={() => setStopOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Box
        className={`journey-builder-canvas ${selected || metricPanel ? "with-settings" : ""}`}
      >
        <Stack alignItems="center" gap={0} className="journey-flow">
          {builderLoading ? (
            <Box
              className="journey-builder-loading"
              role="status"
              aria-live="polite"
            >
              <CircularProgress size={34} />
              <Typography fontWeight={600}>Loading your journey</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-13)">
                Fetching the steps and message templates…
              </Typography>
            </Box>
          ) : (
            blocks.map((block, index) => (
              <Box key={block.id} className="journey-flow-sequence">
                <JourneyBlock
                  block={
                    block.type === "entrance"
                      ? { ...block, description: entranceDescription }
                      : block.type === "condition" || block.type === "event"
                        ? { ...block, description: conditionDescription(block) }
                        : describe(block)
                  }
                  sourceType={blocks[index - 1]?.type}
                  selected={selected?.id === block.id}
                  onSelect={setSelected}
                  onRemove={removeBlock}
                />
                {block.type === "condition" || block.type === "event" ? (
                  <ConditionBranches
                    describe={describe}
                    conditionId={block.id}
                    branches={branches[block.id] || { yes: [], no: [] }}
                    anchorEl={addAnchor}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                    onRemove={removeBranchBlock}
                    onOpenAdd={openAdd}
                    onCloseAdd={closeAdd}
                    isTarget={isTarget}
                    addBlock={addBlock}
                  />
                ) : block.type === "ab_test" ? (
                  <>
                    <AbTestVariants
                      describe={describe}
                      testId={block.id}
                      variants={branches[block.id]?.variants ?? []}
                      max={abMaxVariants(settings[block.id])}
                      anchorEl={addAnchor}
                      selectedId={selected?.id}
                      onSelect={setSelected}
                      onRemove={removeBranchBlock}
                      onOpenAdd={openAdd}
                      onCloseAdd={closeAdd}
                      isTarget={isTarget}
                      addBlock={addBlock}
                    />
                    <PlusConnector
                      target={{ scope: "root", index: index + 1 }}
                      onOpen={openAdd}
                      anchorEl={addAnchor}
                      onClose={closeAdd}
                      isTarget={isTarget}
                      addBlock={addBlock}
                    />
                  </>
                ) : block.type !== "exit" ? (
                  <PlusConnector
                    target={{ scope: "root", index: index + 1 }}
                    onOpen={openAdd}
                    anchorEl={addAnchor}
                    onClose={closeAdd}
                    isTarget={isTarget}
                    addBlock={addBlock}
                  />
                ) : null}
              </Box>
            ))
          )}
        </Stack>
      </Box>
      {selected && (
        <SettingsPanel
          block={selected}
          entranceConfig={entranceConfig}
          conditionValues={conditionValues[selected.id] || []}
          choices={choices}
          values={settings[selected.id] || {}}
          set={(key, value) => {
            setSetting(selected.id, key, value);
            // fewer variants chosen: the extra variant blocks go, from the end (C before B)
            if (selected.type === "ab_test" && key === "maxVariants")
              setBranches((items) => {
                const test = items[selected.id];
                if (!test?.variants || test.variants.length <= Number(value)) return items;
                return { ...items, [selected.id]: { ...test, variants: test.variants.slice(0, Number(value)) } };
              });
          }}
          onEntranceChange={setEntranceConfig}
          onConditionChange={(values) =>
            setConditionValues((items) => ({ ...items, [selected.id]: values }))
          }
          onClose={() => setSelected(null)}
          onDelete={() => removeBlock(selected.id)}
          abTest={
            selectedTest
              ? {
                  variants: branches[selectedTest]?.variants ?? [],
                  // results exist once the journey has run; applying changes the saved journey
                  canApply: Boolean(journeyId) && (status === "Running" || status === "Paused") && !busy,
                  onApply: (variantId) => applyWinner(selectedTest, variantId),
                }
              : undefined
          }
        />
      )}
      <Dialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {status === "Running" || status === "Paused" ? "Stop this journey?" : "Delete this journey?"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {status === "Running" || status === "Paused"
              ? "This stops the journey for everyone. Its details and history remain available to platform admins."
              : "This journey will be hidden from your workspace. Platform admins will retain its details and history."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStopOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy}
            onClick={stopOrDelete}
          >
            {status === "Running" || status === "Paused" ? "Stop journey" : "Delete journey"}
          </Button>
        </DialogActions>
      </Dialog>
      {metricPanel && (
        <MetricUsersPanel
          key={`${metricPanel.blockId}:${metricPanel.label}`}
          {...metricPanel}
          onClose={() => setMetricPanel(null)}
        />
      )}
    </Box>
    </MetricPanelContext.Provider>
  );
}

function PlusConnector({
  target,
  onOpen,
  anchorEl,
  onClose,
  isTarget,
  addBlock,
  options,
  label = "Add journey step",
}: {
  target: AddTarget;
  onOpen: (target: AddTarget, anchor: HTMLElement) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  isTarget: (target: AddTarget) => boolean;
  addBlock: (type: BlockType, title: string, description: string) => void;
  options?: typeof blockOptions;
  label?: string;
}) {
  return (
    <Box className="journey-plus-wrap">
      <Box className="journey-plus-line">
        <Button onClick={(event) => onOpen(target, event.currentTarget)} aria-label={label}>
          <AddRounded />
        </Button>
      </Box>
      {isTarget(target) && anchorEl && (
        <AddStepPopover anchorEl={anchorEl} options={options} onChoose={addBlock} onClose={onClose} />
      )}
    </Box>
  );
}
/**
 * The variants of an A/B test, side by side (A, B, C…), all joining again below. A new variant can
 * only be the same kind of message as the first one, so the test compares like with like.
 */
function AbTestVariants({
  describe,
  testId,
  variants,
  max,
  anchorEl,
  selectedId,
  onSelect,
  onRemove,
  onOpenAdd,
  onCloseAdd,
  isTarget,
  addBlock,
}: {
  describe: (block: Block) => Block;
  testId: string;
  variants: Block[];
  /** How many variants the builder chose for this test. */
  max: number;
  anchorEl: HTMLElement | null;
  selectedId?: string;
  onSelect: (block: Block) => void;
  onRemove: (testId: string, branch: BranchSide, id: string) => void;
  onOpenAdd: (target: AddTarget, anchor: HTMLElement) => void;
  onCloseAdd: () => void;
  isTarget: (target: AddTarget) => boolean;
  addBlock: (type: BlockType, title: string, description: string) => void;
}) {
  const count = variants.length;
  const target: AddTarget = { scope: "branch", conditionId: testId, branch: "variants" };
  // centre of each variant column, in the 0–100 width of the connector drawings
  const xs = variants.map((_, i) => ((i + 0.5) / count) * 100);
  const [left, right] = [Math.min(50, ...xs), Math.max(50, ...xs)];
  const options = blockOptions.filter(([type]) => (variants[0] ? type === variants[0].type : MESSAGE_BLOCKS.includes(type)));
  // when the variants are wider than the canvas, open the row centred under the test card
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [count]);
  return (
    <Box className="journey-ab-scroll" ref={scroller}>
    <Box className="journey-branches journey-ab-variants" style={{ "--ab-columns": Math.max(count, 1) } as React.CSSProperties}>
      <svg className="journey-branch-connectors" viewBox="0 0 100 74" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={`M50 0 V22 ${count ? `M${left} 22 H${right} ${xs.map((x) => `M${x} 22 V74`).join(" ")}` : "M50 22 V74"}`} />
      </svg>
      {/* sits on the junction under the test card, like the + between steps */}
      <Box className="journey-ab-add-wrap">
        {count < max ? (
          <>
            <Button className="journey-ab-add" size="small" startIcon={<AddRounded />} aria-label="Add variant" onClick={(event) => onOpenAdd(target, event.currentTarget)}>
              Add variant
            </Button>
            {isTarget(target) && anchorEl && <AddStepPopover anchorEl={anchorEl} options={options} onChoose={addBlock} onClose={onCloseAdd} />}
          </>
        ) : (
          // the number the builder chose is reached; it can be raised in the test's settings
          <Box className="journey-ab-full">{count} of {max} variants</Box>
        )}
      </Box>
      {count === 0 ? (
        <Typography className="journey-ab-empty" color="text.secondary" fontSize="var(--fs-13)">
          Add 2 to 5 variants. They are all the same kind of message; each user gets one of them.
        </Typography>
      ) : (
        <Stack direction={{ xs: "column", md: "row" }} gap={0} className="journey-branch-columns">
          {variants.map((variant, index) => (
            <Box key={variant.id} className="journey-branch-column">
              <Box className="journey-branch-label">Variant {AB_LETTERS[index]}</Box>
              <Box className="journey-branch-step">
                <JourneyBlock
                  block={describe(variant)}
                  selected={selectedId === variant.id}
                  onSelect={onSelect}
                  onRemove={(id) => onRemove(testId, "variants", id)}
                  compact
                />
                <Box className="journey-ab-line" />
              </Box>
            </Box>
          ))}
        </Stack>
      )}
      <Box className="journey-branch-merge">
        <svg className="journey-branch-connectors journey-branch-merge-connectors" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={`M${left} 0 H${right} M50 0 V32`} />
        </svg>
      </Box>
    </Box>
    </Box>
  );
}
/** Each variant's sends, clicks and click rate; the leader can be kept, after a confirmation. */
function AbResults({ variants, canApply, onApply }: { variants: Block[]; canApply: boolean; onApply: (variantId: string) => void }) {
  const { rows, winner } = abResults(variants);
  const [confirm, setConfirm] = useState<(typeof rows)[number] | null>(null);
  return (
    <Box className="journey-ab-results">
      <Typography fontWeight={600} sx={{ mb: 1 }}>Results</Typography>
      {rows.length === 0 ? (
        <Typography color="text.secondary" fontSize="var(--fs-13)">Add at least 2 variants to start the test.</Typography>
      ) : (
        <Stack gap={1}>
          {rows.map((row) => (
            <Stack key={row.id} direction="row" alignItems="center" gap={1.5} className={`journey-ab-row ${row.id === winner ? "leader" : ""}`}>
              <Typography fontWeight={700} sx={{ width: 24 }}>{row.letter}</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography fontSize="var(--fs-13)">{row.sent.toLocaleString()} sent · {row.clicks.toLocaleString()} clicks</Typography>
              </Box>
              <Typography fontWeight={700}>{row.rate}%</Typography>
              {row.id === winner && canApply && (
                <Button size="small" variant="contained" color="success" onClick={() => setConfirm(row)}>
                  Apply
                </Button>
              )}
            </Stack>
          ))}
          <Typography color="text.secondary" fontSize="var(--fs-12)">
            {winner
              ? "Click rate = clicks ÷ sent. Apply keeps the best variant and removes the test."
              : "Apply appears on the best variant once someone has clicked."}
          </Typography>
        </Stack>
      )}
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Keep variant {confirm?.letter}?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Variant {confirm?.letter} becomes a normal step of this journey and keeps its results. The A/B test and the other
            variants are removed. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              if (confirm) onApply(confirm.id);
              setConfirm(null);
            }}
          >
            Keep {confirm?.letter}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
function ConditionBranches({
  describe,
  conditionId,
  branches,
  anchorEl,
  selectedId,
  onSelect,
  onRemove,
  onOpenAdd,
  onCloseAdd,
  isTarget,
  addBlock,
}: {
  describe: (block: Block) => Block;
  conditionId: string;
  branches: { yes: Block[]; no: Block[] };
  anchorEl: HTMLElement | null;
  selectedId?: string;
  onSelect: (block: Block) => void;
  onRemove: (conditionId: string, branch: "yes" | "no", id: string) => void;
  onOpenAdd: (target: AddTarget, anchor: HTMLElement) => void;
  onCloseAdd: () => void;
  isTarget: (target: AddTarget) => boolean;
  addBlock: (type: BlockType, title: string, description: string) => void;
}) {
  return (
    <Box className="journey-branches">
      <svg
        className="journey-branch-connectors"
        viewBox="0 0 100 74"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M50 0 V22 M50 22 H25 M50 22 H75 M25 22 V74 M75 22 V74" />
      </svg>
      <Stack
        direction={{ xs: "column", md: "row" }}
        gap={0}
        className="journey-branch-columns"
      >
        {(["yes", "no"] as const).map((branch) => (
          <Box key={branch} className="journey-branch-column">
            <Box className={`journey-branch-label ${branch}`}>
              {branch === "yes" ? "Yes" : "No"}
            </Box>
            {branches[branch].map((block, index) => (
              <Box key={block.id} className="journey-branch-step">
                <JourneyBlock
                  block={describe(block)}
                  sourceType={branches[branch][index - 1]?.type}
                  selected={selectedId === block.id}
                  onSelect={onSelect}
                  onRemove={(id) => onRemove(conditionId, branch, id)}
                />
                <PlusConnector
                  target={{ scope: "branch", conditionId, branch }} options={branchOptions}
                  onOpen={onOpenAdd}
                  anchorEl={anchorEl}
                  onClose={onCloseAdd}
                  isTarget={isTarget}
                  addBlock={addBlock}
                />
              </Box>
            ))}
            {branches[branch].length === 0 && (
              <PlusConnector
                target={{ scope: "branch", conditionId, branch }} options={branchOptions}
                onOpen={onOpenAdd}
                anchorEl={anchorEl}
                onClose={onCloseAdd}
                isTarget={isTarget}
                addBlock={addBlock}
              />
            )}
          </Box>
        ))}
      </Stack>
      <Box className="journey-branch-merge">
        <svg
          className="journey-branch-connectors journey-branch-merge-connectors"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M25 0 H75 M50 0 V32" />
        </svg>
      </Box>
    </Box>
  );
}
function JourneyBlock({
  block,
  sourceType,
  selected,
  onSelect,
  onRemove,
  compact = false,
}: {
  block: Block;
  sourceType?: BlockType;
  selected: boolean;
  onSelect: (block: Block) => void;
  onRemove: (id: string) => void;
  /** A/B variant cards: message counters only, so several fit side by side. */
  compact?: boolean;
}) {
  const entrance = block.type === "entrance";
  const exit = block.type === "exit";
  const Icon = entrance
    ? GroupRounded
    : exit
      ? CloseRounded
      : block.type === "email"
        ? EmailRounded
          : block.type === "notification" || block.type === "web_notification"
          ? NotificationsActiveRounded
            : block.type === "event"
              ? EventRounded
          : block.type === "wait"
            ? TimerRounded
            : block.type === "specific_time"
              ? CalendarMonthRounded
              : block.type === "repeat_journey"
                ? ReplayRounded
                : block.type === "ab_test"
                  ? CallSplitRounded
                  : SettingsRounded;
  return (
    <Card
      className={`journey-flow-block ${entrance ? "entrance" : ""} ${selected ? "selected" : ""}`}
      onClick={() => onSelect({ ...block, sourceType })}
    >
      <Stack direction="row" alignItems="flex-start" gap={1.3}>
        <Box className="journey-block-icon">
          <Icon />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={600} noWrap={compact} title={compact ? block.title : undefined}>
            {block.title}
          </Typography>
          <Typography
            color="text.secondary"
            fontSize="var(--fs-12)"
            sx={{ whiteSpace: "pre-line" }}
          >
            {block.description}
          </Typography>
        </Box>
        <Stack direction="row">
          {!compact && (
            <IconButton size="small">
              <MoreVertRounded />
            </IconButton>
          )}
          {!entrance && !exit && (
            <IconButton
              size="small"
              color="error"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(block.id);
              }}
            >
              <DeleteOutlineRounded fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>
      <Divider sx={{ my: 1.5 }} />
      <BlockMetrics blockId={block.id} blockTitle={block.title} type={block.type} stats={block.stats} compact={compact} />
    </Card>
  );
}
// Card label → `metric` of GET /journeys/:id/users. Rates are not lists.
const METRIC_KEYS: Record<string, JourneyUsersMetric> = {
  Sent: "sent",
  Opens: "opened",
  Clicks: "clicked",
  Waiting: "waiting",
  "Users waiting": "waiting",
  Completed: "completed",
  "Exited early": "exitedEarly",
  Paused: "paused",
  Deleted: "deleted",
  "Users entered": "entered",
  "Unreachable users": "unreachable",
};
type OpenMetric = { blockId: string; blockTitle: string; type: BlockType; label: string };
const MetricPanelContext = createContext<(open: OpenMetric) => void>(() => {});

const when = (date?: string | null) =>
  date ? formatUserDateTime(date) : null;
const number = (value: number) => value.toLocaleString();
const JOURNEY_STATUS: Record<string, [string, string]> = {
  active: ["In progress", "green"],
  completed: ["Finished", "blue"],
  exited: ["Left early", "orange"],
  failed: ["Stopped", "red"],
};
const MESSAGE_STATUS: Record<string, [string, string]> = {
  sent: ["Received", "green"],
  queued: ["Scheduled", "grey"],
  processing: ["Sending", "grey"],
  failed: ["Not delivered", "red"],
  skipped: ["Not sent", "orange"],
  canceled: ["Canceled", "orange"],
};
const CHIP: Record<string, { color: string; background: string }> = {
  green: { color: "#1b5e20", background: "#e8f5e9" },
  blue: { color: "#0d47a1", background: "#e3f2fd" },
  orange: { color: "#8a4b00", background: "#fff3e0" },
  red: { color: "#b71c1c", background: "#ffebee" },
  grey: { color: "#455a64", background: "#eceff1" },
};
/** One sentence under the title, so nobody has to guess what the number counts. */
function metricHelp(metric: JourneyUsersMetric, type: BlockType) {
  const push = type === "notification" || type === "web_notification";
  const what = push ? "notification" : "email";
  return {
    entered: "Everyone who has started this journey.",
    unreachable: "In the audience, but we have no way to reach them yet (no push permission and no email).",
    waiting: "People paused on this step right now. They move on when the wait is over.",
    completed: "People who have gone past this step.",
    exitedEarly: "People who left the journey at this step, before reaching the end.",
    sent: `People this ${what} was sent to.`,
    opened: `People who opened this ${what}.`,
    clicked: push ? "People who tapped this notification." : "People who clicked a link in this email.",
    paused: `${push ? "Notifications" : "Emails"} that were held back and not sent, for example because the user turned them off.`,
    deleted: `${push ? "Notifications" : "Emails"} sent to users who have since been deleted.`,
  }[metric];
}
/** The few facts that matter for this list, in plain words. */
function rowSummary({ user, journey, message }: JourneyMetricUser) {
  const facts: (string | null)[] = [];
  if (message) {
    facts.push(message.sentAt && `Sent ${when(message.sentAt)}`);
    facts.push(message.openedAt && `${message.clickedAt !== undefined ? "Opened" : "Tapped"} ${when(message.openedAt)}`);
    facts.push(message.clickedAt ? `Clicked ${when(message.clickedAt)}` : null);
    facts.push(message.bouncedAt ? `Bounced ${when(message.bouncedAt)}` : null);
  } else if (journey) {
    facts.push(`Joined ${when(journey.enteredAt)}`);
    facts.push(journey.completedAt && `Finished ${when(journey.completedAt)}`);
    facts.push(journey.exitedAt && `Left ${when(journey.exitedAt)}${journey.exitReason ? ` (${journey.exitReason.replace(/_/g, " ")})` : ""}`);
  } else {
    facts.push(user.lastActiveAt ? `Last active ${when(user.lastActiveAt)}` : "Never active");
  }
  const location = [user.region, user.country].filter(Boolean).join(", ");
  if (location) facts.push(location);
  return facts.filter(Boolean).join(" · ");
}
function MetricUsersPanel({ blockId, blockTitle, type, label, onClose }: OpenMetric & { onClose: () => void }) {
  const metric = METRIC_KEYS[label];
  const journeyId = useSearchParams().get("id");
  const projectId = useActiveProject().active?.id;
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const limit = 50;
  const users = useInfiniteQuery({
    queryKey: ["projects", projectId, "journeys", journeyId, "users", blockId, metric, search],
    queryFn: ({ pageParam }) =>
      journeysApi.users(projectId!, journeyId!, {
        metric,
        step: blockId === ENTRANCE.id ? undefined : blockId,
        search: search || undefined,
        page: pageParam,
        limit,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    enabled: Boolean(projectId && journeyId),
  });
  const rows = users.data?.pages.flatMap((page) => page.items) ?? [];
  const total = users.data?.pages[0]?.total ?? 0;
  // Load the next 50 as the list scrolls to its end.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && users.hasNextPage && !users.isFetchingNextPage) users.fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [users]);

  return (
    <Box
      className="journey-settings-panel"
      sx={{ zIndex: 6, width: { xs: "min(92vw, 420px)", sm: 420 }, display: "flex", flexDirection: "column" }}
    >
      <Box className="journey-settings-title">
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography fontSize="var(--fs-12)" color="#4775de" fontWeight={500} letterSpacing=".08em">
              {blockTitle.toUpperCase()}
            </Typography>
            <Typography variant="h3">{label}</Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseRounded />
          </IconButton>
        </Stack>
        <Typography fontSize="var(--fs-12)" color="text.secondary" sx={{ mt: 0.5 }}>
          {metricHelp(metric, type)}
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, email or user ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ mt: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Typography fontSize="var(--fs-12)" color="text.secondary" sx={{ mt: 1 }}>
          {users.isLoading
            ? "Loading…"
            : search
              ? `${number(total)} ${total === 1 ? "match" : "matches"}`
              : `${number(total)} ${total === 1 ? "person" : "people"}${total > rows.length ? ` · showing ${number(rows.length)}` : ""}`}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: 1 }}>
        {users.isLoading ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={24} />
          </Stack>
        ) : users.isError ? (
          <Typography color="error" sx={{ p: 2 }}>
            {journeyError(users.error)}
          </Typography>
        ) : !rows.length ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            {search ? `No one matches “${search}”.` : "No one here yet."}
          </Typography>
        ) : (
          <>
            {rows.map((row, index) => {
              const { user } = row;
              const [statusText, tone] = user.deletedAt
                ? ["Deleted", "red"]
                : (row.message && MESSAGE_STATUS[row.message.status]) || (row.journey && JOURNEY_STATUS[row.journey.status]) || [];
              return (
                <Link
                  key={`${user.id}-${index}`}
                  href={`/dashboard/users/${encodeURIComponent(user.id)}?tab=users`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open this user's profile in a new tab"
                  style={{ color: "inherit", textDecoration: "none", display: "block" }}
                >
                  <Box
                    sx={{
                      px: 1,
                      py: 1.1,
                      borderRadius: 1,
                      borderBottom: "1px solid #edf0f5",
                      "&:hover": { background: "#f5f7fb" },
                    }}
                  >
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Typography fontWeight={600} fontSize="var(--fs-14)" noWrap sx={{ flex: 1, minWidth: 0 }}>
                        {user.name || user.email || user.externalUserId || user.id}
                      </Typography>
                      {statusText && (
                        <Box
                          component="span"
                          sx={{ ...CHIP[tone ?? "grey"], fontSize: "var(--fs-12)", fontWeight: 600, px: 1, py: 0.25, borderRadius: 10, whiteSpace: "nowrap" }}
                        >
                          {statusText}
                        </Box>
                      )}
                    </Stack>
                    {(user.name || user.email) && (
                      <Typography fontSize="var(--fs-12)" color="text.secondary" noWrap>
                        {[user.name && user.email, user.externalUserId && `ID ${user.externalUserId}`].filter(Boolean).join(" · ")}
                      </Typography>
                    )}
                    <Typography fontSize="var(--fs-12)" color="text.secondary" noWrap>
                      {rowSummary(row)}
                    </Typography>
                  </Box>
                </Link>
              );
            })}
            <Box ref={sentinel} sx={{ py: 2, textAlign: "center" }}>
              {users.isFetchingNextPage ? (
                <CircularProgress size={20} />
              ) : users.hasNextPage ? (
                <Button size="small" onClick={() => users.fetchNextPage()}>
                  Show more
                </Button>
              ) : rows.length > limit ? (
                <Typography fontSize="var(--fs-12)" color="text.secondary">
                  That&apos;s everyone.
                </Typography>
              ) : null}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
function BlockMetrics({
  blockId,
  blockTitle,
  type,
  stats = {},
  compact = false,
}: {
  blockId: string;
  blockTitle: string;
  type: BlockType;
  stats?: BlockStats;
  compact?: boolean;
}) {
  const openMetric = useContext(MetricPanelContext);
  const setOpen = (label: string) => openMetric({ blockId, blockTitle, type, label });
  // Every counter comes from GET /journeys/:id; a journey that has not been saved yet shows zeros.
  const rate = (part?: number) =>
    stats.sent ? `${Math.round(((part ?? 0) / stats.sent) * 100)}%` : 0;
  const count: Record<string, number | string> = {
    Sent: stats.sent ?? 0,
    Opens: stats.opened ?? 0,
    Clicks: (type === "notification" || type === "web_notification" ? stats.opened : stats.clicked) ?? 0,
    "Open rate": rate(stats.opened),
    "Click rate": rate(type === "notification" || type === "web_notification" ? stats.opened : stats.clicked),
    Waiting: stats.waiting ?? 0,
    "Users waiting": stats.waiting ?? 0,
    Completed: stats.completed ?? 0,
    "Exited early": stats.exitedEarly ?? 0,
    Paused: stats.paused ?? 0,
    Deleted: stats.deleted ?? 0,
    "Users entered": stats.entered ?? 0,
    "Unreachable users": stats.unreachable ?? 0,
  };
  type Metric = [string, "purple" | "green"];
  const messageMetrics: Partial<Record<BlockType, Metric[]>> = {
    email: [
      ["Sent", "purple"],
      ["Opens", "purple"],
      ["Open rate", "purple"],
      ["Clicks", "purple"],
      ["Click rate", "purple"],
    ],
    notification: [
      ["Sent", "purple"],
      ["Clicks", "purple"],
      ["Click rate", "purple"],
    ],
    web_notification: [
      ["Sent", "purple"],
      ["Clicks", "purple"],
      ["Click rate", "purple"],
    ],
  };
  const userMetrics: Record<BlockType, Metric[]> = {
    entrance: [
      ["Users entered", "green"],
      ["Unreachable users", "green"],
    ],
    specific_time: [["Users waiting", "green"]],
    wait: [
      ["Waiting", "green"],
      ["Completed", "green"],
      ["Exited early", "green"],
    ],
    email: [
      ["Paused", "green"],
      ["Deleted", "green"],
      ["Exited early", "green"],
    ],
    notification: [
      ["Paused", "green"],
      ["Deleted", "green"],
      ["Exited early", "green"],
    ],
    web_notification: [
      ["Paused", "green"],
      ["Deleted", "green"],
      ["Exited early", "green"],
    ],
    repeat_journey: [["Users waiting", "green"]],
    exit: [
      ["Completed", "green"],
      ["Exited early", "green"],
    ],
    condition: [],
    event: [],
    ab_test: [],
  };
  if (type === "ab_test")
    return (
      <Stack direction="row" justifyContent="flex-end" className="journey-branch-ready">
        <span>Split evenly · each user always gets the same variant · click for results</span>
      </Stack>
    );
  if (type === "condition" || type === "event")
    return (
      <Stack
        direction="row"
        justifyContent="flex-end"
        className="journey-branch-ready"
      >
        <span>✓ Branching ready</span>
      </Stack>
    );
  const renderMetrics = (metrics: Metric[]) => (
    <Stack
      direction="row"
      justifyContent="flex-end"
      flexWrap="wrap"
      gap={1}
      className="journey-metrics"
    >
      {metrics.map(([label, color]) => {
        const clickable = METRIC_KEYS[label] && Number(count[label]) > 0;
        return (
          <span
            key={label}
            className={clickable ? "journey-metric-link" : undefined}
            {...(clickable
              ? {
                  role: "button",
                  tabIndex: 0,
                  title: `View ${label.toLowerCase()}`,
                  onClick: (event: React.MouseEvent) => {
                    event.stopPropagation();
                    setOpen(label);
                  },
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      setOpen(label);
                    }
                  },
                }
              : {})}
          >
            {label}{" "}
            <b className={`journey-count ${color}`}>{count[label] ?? 0}</b>
          </span>
        );
      })}
    </Stack>
  );
  const messages = messageMetrics[type] || [];
  const users = userMetrics[type] || [];
  if (compact && messages.length) return <Box className="journey-metrics-section">{renderMetrics(messages)}</Box>;
  if (!messages.length)
    return (
      <Box className="journey-metrics-section">
        <Typography className="journey-metrics-heading">Users</Typography>
        {renderMetrics(users)}
      </Box>
    );
  return (
    <Stack className="journey-metrics-section" gap={1}>
      <Box>
        <Typography className="journey-metrics-heading">Messages</Typography>
        {renderMetrics(messages)}
      </Box>
      <Divider />
      <Box>
        <Typography className="journey-metrics-heading">Users</Typography>
        {renderMetrics(users)}
      </Box>
    </Stack>
  );
}
function AddStepPopover({
  anchorEl,
  options,
  onChoose,
  onClose,
}: {
  anchorEl: HTMLElement;
  options?: typeof blockOptions;
  onChoose: (type: BlockType, title: string, description: string) => void;
  onClose: () => void;
}) {
  const list = options || blockOptions;
  const groups = (
    [
      ["SEND A MESSAGE", list.filter(([type]) => MESSAGE_BLOCKS.includes(type))],
      ["ACTIONS", list.filter(([type]) => !MESSAGE_BLOCKS.includes(type))],
    ] as const
  ).filter(([, items]) => items.length > 0);
  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement="right-start"
      modifiers={[
        { name: "flip", options: { padding: 16, fallbackPlacements: ["left-start", "bottom-start", "top-start"] } },
        { name: "preventOverflow", options: { padding: 16, altAxis: true, tether: true } },
      ]}
      sx={{ zIndex: 1400 }}
    >
      <Box className="journey-add-popover" role="dialog" aria-label="Add a step">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={600}>Add a step</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseRounded fontSize="small" />
          </IconButton>
        </Stack>
        <Box className="journey-add-popover-list">
        {groups.map(([label, items]) => (
          <Box key={label}>
            <Typography className="journey-add-group-label">{label}</Typography>
            <Stack gap={0.4}>
              {items.map(([type, title, description, Icon]) => (
                <Button
                  key={`${type}-${title}`}
                  className={`journey-add-popover-option ${type}`}
                  onClick={() => onChoose(type, title, description)}
                >
                  <Box className="journey-add-popover-icon">
                    <Icon />
                  </Box>
                  {/* name + one short hint, kept compact so the whole menu fits without scrolling */}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography className="journey-add-popover-title">{title}</Typography>
                    <Typography className="journey-add-popover-hint">{MENU_HINTS[type]}</Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Box>
        ))}
        </Box>
      </Box>
    </Popper>
  );
}
function SettingsPanel({
  block,
  entranceConfig,
  conditionValues,
  choices,
  values,
  set,
  onEntranceChange,
  onConditionChange,
  onClose,
  onDelete,
  abTest,
}: SettingProps & {
  block: Block;
  choices: Choices;
  entranceConfig: EntranceConfig;
  conditionValues: string[];
  onEntranceChange: (config: EntranceConfig) => void;
  onConditionChange: (values: string[]) => void;
  onClose: () => void;
  onDelete: () => void;
  /** Set when the block is an A/B test or one of its variants: the test's results. */
  abTest?: { variants: Block[]; canApply: boolean; onApply: (variantId: string) => void };
}) {
  return (
    <Box className="journey-settings-panel">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        className="journey-settings-title"
      >
        <Box>
          <Typography
            fontSize="var(--fs-12)"
            color="#4775de"
            fontWeight={500}
            letterSpacing=".08em"
          >
            SETTINGS
          </Typography>
          <Typography variant="h3">{block.title}</Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </Stack>
      <Box className="journey-settings-body">
        {block.type === "entrance" ? (
          <EntranceSettings
            config={entranceConfig}
            choices={choices}
            onChange={onEntranceChange}
          />
        ) : block.type === "exit" ? (
          <ExitSettings values={values} set={set} />
        ) : block.type === "email" ? (
          <EmailSettings
            values={values}
            set={set}
            templates={choices.emailTemplates}
          />
        ) : block.type === "notification" || block.type === "web_notification" ? (
          <NotificationSettings
            values={values}
            set={set}
            templates={choices.pushTemplates}
          />
        ) : block.type === "event" ? (
          <EventSettings values={values} set={set} events={choices.events} />
        ) : block.type === "wait" ? (
          <WaitSettings values={values} set={set} />
        ) : block.type === "specific_time" ? (
          <SpecificTimeSettings values={values} set={set} />
        ) : block.type === "repeat_journey" ? (
          <RepeatSettings values={values} set={set} />
        ) : block.type === "ab_test" ? (
          <AbTestSettings values={values} set={set} />
        ) : (
          <ConditionSettings
            sourceType={block.sourceType}
            values={conditionValues}
            onChange={onConditionChange}
            matchMode={values.match === "all" ? "all" : "any"}
            setMatchMode={(mode) => set("match", mode)}
          />
        )}
        {abTest && (
          <>
            <Divider sx={{ my: 2 }} />
            <AbResults {...abTest} />
          </>
        )}
      </Box>
      <Box className="journey-settings-footer">
        <Button onClick={onClose}>Cancel</Button>
        <Button color="success" variant="contained" onClick={onClose}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

function PanelSelect({
  label,
  placeholder,
  value,
  onChange,
  children,
}: {
  label?: string;
  placeholder: string;
  value?: string;
  onChange?: (event: any) => void;
  children?: ReactNode;
}) {
  return (
    <Stack gap={0.6}>
      {label && (
        <Typography className="journey-field-label">{label}</Typography>
      )}
      <Select
        fullWidth
        size="small"
        {...(value === undefined ? { defaultValue: "" } : { value })}
        onChange={onChange}
        displayEmpty
      >
        {!value && <MenuItem value="">{placeholder}</MenuItem>}
        {children}
      </Select>
    </Stack>
  );
}
function EntranceSettings({
  config,
  choices,
  onChange,
}: {
  config: EntranceConfig;
  choices: Choices;
  onChange: (config: EntranceConfig) => void;
}) {
  return (
    <Stack gap={1.8}>
      <Box>
        <Typography className="journey-field-label">
          Entrance trigger (OR)
        </Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">
          Choose how subscribers should enter this journey.
        </Typography>
      </Box>
      <Stack gap={0.7}>
        <Typography className="journey-settings-label">
          Lifecycle segment
        </Typography>
        <Select
          fullWidth
          size="small"
          value={config.lifecycle}
          displayEmpty
          onChange={(event) =>
            onChange({
              ...config,
              lifecycle: String(event.target.value),
              audience: "",
              allUsers: false,
            })
          }
        >
          <MenuItem value="">Select lifecycle segment</MenuItem>
          {choices.segments.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Typography className="journey-or">OR</Typography>
      <Stack gap={0.7}>
        <Typography className="journey-settings-label">
          Audience group
        </Typography>
        <Select
          fullWidth
          size="small"
          value={config.audience}
          displayEmpty
          onChange={(event) =>
            onChange({
              ...config,
              audience: String(event.target.value),
              lifecycle: "",
              allUsers: false,
            })
          }
        >
          <MenuItem value="">Select audience group</MenuItem>
          {choices.groups.map((item) => (
            <MenuItem key={item.id} value={item.id}>
              {item.name}
            </MenuItem>
          ))}
        </Select>
      </Stack>
      <Typography className="journey-or">OR</Typography>
      <FormControlLabel
        className="journey-all-users"
        control={
          <Checkbox
            checked={config.allUsers}
            onChange={(event) =>
              onChange({
                ...config,
                allUsers: event.target.checked,
                lifecycle: "",
                audience: "",
              })
            }
          />
        }
        label="All users"
      />
    </Stack>
  );
}
const pick =
  (set: SettingProps["set"], key: string) =>
  (event: { target: { value: unknown } }) =>
    set(key, String(event.target.value));
function EmailSettings({
  values,
  set,
  templates,
}: SettingProps & { templates: Option[] }) {
  return (
    <Stack gap={1.4}>
      <Typography className="journey-field-label">Email content</Typography>
      <Button
        variant="contained"
        startIcon={<SettingsRounded />}
        onClick={() => window.open("/dashboard/email", "_blank", "noopener")}
      >
        Design email
      </Button>
      <PanelSelect
        placeholder="Select any template"
        value={values.template || ""}
        onChange={pick(set, "template")}
      >
        {templates.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.deletedAt ? `${item.name} (deleted; existing journey)` : item.name}
          </MenuItem>
        ))}
      </PanelSelect>
      {/* Hidden for now: language, email name, subject, sender name, sender email and preheader.
<PanelSelect label="Language" placeholder="User spoken language" value={values.language || ''} onChange={pick(set, 'language')}><MenuItem value="en">English</MenuItem><MenuItem value="all">All languages</MenuItem></PanelSelect><TextField fullWidth label="Email name" value={values.emailName ?? ''} onChange={pick(set, 'emailName')} /><TextField fullWidth label="Subject" value={values.subject ?? ''} onChange={pick(set, 'subject')} InputProps={{ endAdornment: <Button size="small">Suggest</Button> }} /><TextField fullWidth label="Who is it from?" value={values.fromName ?? 'Pixllove'} onChange={pick(set, 'fromName')} /><TextField fullWidth label="Sender email" value={values.senderEmail ?? 'info@pixllove.com'} onChange={pick(set, 'senderEmail')} /><TextField fullWidth label="Preheader" placeholder="Short preview text" value={values.preheader ?? ''} onChange={pick(set, 'preheader')} />
*/}
    </Stack>
  );
}
function NotificationSettings({
  values,
  set,
  templates,
}: SettingProps & { templates: Option[] }) {
  return (
    <Stack gap={1.4}>
      <PanelSelect
        label="Message template"
        placeholder="Select a notification template"
        value={values.template || ""}
        onChange={pick(set, "template")}
      >
        {templates.map((item) => (
          <MenuItem key={item.id} value={item.id}>
            {item.deletedAt ? `${item.name} (deleted; existing journey)` : item.name}
          </MenuItem>
        ))}
      </PanelSelect>
    </Stack>
  );
}
function EventSettings({ values, set, events }: SettingProps & { events: Option[] }) {
  return (
    <Stack gap={1.4}>
      <PanelSelect
        label="Event"
        placeholder={events.length ? "Select a tracked event" : "No tracked events yet"}
        value={values.event ?? ""}
        onChange={pick(set, "event")}
      >
        {values.event && !events.some((event) => event.name === values.event) && (
          <MenuItem value={values.event}>{values.event} (not recently tracked)</MenuItem>
        )}
        {events.map((event) => (
          <MenuItem key={event.id} value={event.name}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, width: "100%" }}>
              <Typography component="span">{event.name}</Typography>
              <Typography component="span" color="text.secondary" fontSize="var(--fs-11)">{event.sources?.join(" · ")}</Typography>
            </Box>
          </MenuItem>
        ))}
      </PanelSelect>
      <Typography color="text.secondary" fontSize="var(--fs-12)">
        Subscribers who performed this event after entering the journey continue on the Yes path.
      </Typography>
    </Stack>
  );
}
const unitItems = [
  <MenuItem key="minutes" value="minutes">
    minute(s)
  </MenuItem>,
  <MenuItem key="hours" value="hours">
    hour(s)
  </MenuItem>,
  <MenuItem key="days" value="days">
    day(s)
  </MenuItem>,
];
function WaitSettings({ values, set }: SettingProps) {
  return (
    <Stack gap={1.4}>
      <Stack direction="row" gap={1}>
        <TextField
          fullWidth
          label="Wait"
          type="number"
          value={values.amount ?? "3"}
          onChange={pick(set, "amount")}
        />
        <TextField
          select
          label="Unit"
          fullWidth
          size="small"
          value={values.unit || "days"}
          onChange={pick(set, "unit")}
        >
          {unitItems}
        </TextField>
      </Stack>
    </Stack>
  );
}
/** How many variants the builder allows for this test. */
function AbTestSettings({ values, set }: SettingProps) {
  return (
    <Stack gap={1.6}>
      <Typography color="text.secondary" fontSize="var(--fs-13)">
        Each user gets one variant, the same one every time, split evenly. Add variants with “Add variant” under the test.
      </Typography>
      <TextField
        select
        fullWidth
        size="small"
        label="Number of variants"
        helperText="“Add variant” stops at this number."
        value={String(abMaxVariants(values))}
        onChange={pick(set, "maxVariants")}
      >
        {[2, 3, 4, 5].map((n) => (
          <MenuItem key={n} value={String(n)}>
            {n} variants ({AB_LETTERS.slice(0, n).split("").join(", ")})
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
function SpecificTimeSettings({ values, set }: SettingProps) {
  return (
    <Stack gap={1.4}>
      <TextField
        fullWidth
        label="Send time"
        type="time"
        value={values.time ?? "09:00"}
        onChange={pick(set, "time")}
      />
    </Stack>
  );
}
function RepeatSettings({ values, set }: SettingProps) {
  return (
    <Stack gap={1.4}>
      <Stack direction="row" gap={1}>
        <TextField
          fullWidth
          label="Repeat count"
          type="number"
          value={values.count ?? "5"}
          onChange={pick(set, "count")}
        />
        <TextField
          fullWidth
          label="Interval"
          type="number"
          value={values.interval ?? "1"}
          onChange={pick(set, "interval")}
        />
      </Stack>
      <PanelSelect
        label="Unit"
        placeholder="day(s)"
        value={values.unit || ""}
        onChange={pick(set, "unit")}
      >
        {unitItems}
      </PanelSelect>
    </Stack>
  );
}
function ConditionSettings({
  sourceType,
  values,
  onChange,
  matchMode,
  setMatchMode,
}: {
  sourceType?: BlockType;
  values: string[];
  onChange: (values: string[]) => void;
  matchMode: "any" | "all";
  setMatchMode: (mode: "any" | "all") => void;
}) {
  const options = conditionOptions(sourceType);
  const rules = values.length ? values.map((rule) => normalizeConditionRule(rule, sourceType)) : [options[0]];
  const choice = (mode: "any" | "all", title: string, description: string) => (
    <Box
      className={`journey-rule-choice ${matchMode === mode ? "active" : ""}`}
      onClick={() => setMatchMode(mode)}
    >
      <FormControlLabel
        control={
          <Radio
            checked={matchMode === mode}
            onChange={() => setMatchMode(mode)}
          />
        }
        label={
          <Box>
            <Typography fontWeight={600} fontSize="var(--fs-13)">
              {title}
            </Typography>
            <Typography fontSize="var(--fs-12)" color="text.secondary">
              {description}
            </Typography>
          </Box>
        }
      />
    </Box>
  );
  return (
    <Stack gap={1.4}>
      <Box>
        <Typography className="journey-field-label">
          Create a condition
        </Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">
          Add up to 5 conditions. Define whether any or all of them must be
          applicable, for the condition to be met.
        </Typography>
      </Box>
      <Stack gap={1}>
        {choice(
          "any",
          "Any rule",
          "Select one or a few conditions where ANY rule can match the criteria.",
        )}
        {choice(
          "all",
          "All rules",
          "Select one or a few conditions where ALL rules must match the criteria.",
        )}
      </Stack>
      {rules.map((rule, index) => (
        <Box key={index} className="journey-condition-rule">
          <Typography fontWeight={500} fontSize="var(--fs-12)">
            Condition {index + 1}
          </Typography>
          <PanelSelect
            value={rule}
            onChange={(event) => {
              const next = [...rules];
              next[index] = String(event.target.value);
              onChange(next);
            }}
            placeholder={options[0]}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </PanelSelect>
        </Box>
      ))}
      {rules.length < 5 && (
        <Button
          variant="contained"
          onClick={() => onChange([...rules, options[0]])}
          sx={{ alignSelf: "flex-start", background: "#303846" }}
        >
          + Add another condition
        </Button>
      )}
      <Box className="journey-condition-note">
        <b>Important!</b> Conditions are checked immediately. Add a delay before
        the condition to give subscribers time to receive and interact with the
        message before deciding the next step.
      </Box>
    </Stack>
  );
}
function ExitSettings({ values, set }: SettingProps) {
  const rules = [
    "Segment change",
    "Audience group change",
    "Clicked email",
    "Opened email",
    "Clicked notification",
    "Paused account",
    "Deleted account",
    "FCM token removed",
    "Email removed",
    "Disabled special push offers",
    "Disabled special email offers",
    "Email opt out",
  ];
  return (
    <Stack gap={1.2}>
      <Box className="journey-exit-help">
        Users leave the journey when they finish the path or match an exit rule.
      </Box>
      <Typography className="journey-field-label">Exit when</Typography>
      {rules.map((rule, index) => (
        <PanelSelect
          key={rule}
          label={rule}
          placeholder={index % 3 === 0 ? "Yes" : "No"}
          value={values[rule] || ""}
          onChange={pick(set, rule)}
        >
          <MenuItem value="yes">Yes</MenuItem>
          <MenuItem value="no">No</MenuItem>
        </PanelSelect>
      ))}
    </Stack>
  );
}
