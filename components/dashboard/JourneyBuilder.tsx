"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AddRounded,
  ArrowBackRounded,
  CalendarMonthRounded,
  CloseRounded,
  DeleteOutlineRounded,
  EmailRounded,
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
  Radio,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  audienceGroupsApi,
  emailApi,
  journeysApi,
  lifecycleSegmentsApi,
  pushApi,
  type JourneyMetricUser,
  type JourneyUsersMetric,
} from "@/lib/projects/api";
import Link from "next/link";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import {
  ENTRANCE,
  EXIT,
  conditionOptions,
  fromJourney,
  journeyError,
  toJourneyInput,
  type Block,
  type BlockSettings,
  type BlockStats,
  type BlockType,
  type Branches,
  type BuilderStatus,
  type EntranceConfig,
} from "@/lib/journeys";

type Option = {
  id: string;
  name: string;
  title?: string;
  body?: string;
  subject?: string;
  text?: string | null;
  html?: string | null;
};
/** The real choices of this Project for the settings panel's dropdowns. */
type Choices = {
  segments: Option[];
  groups: Option[];
  emailTemplates: Option[];
  pushTemplates: Option[];
};
type SettingProps = {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
};
type AddTarget =
  | { scope: "root"; index: number }
  | { scope: "branch"; conditionId: string; branch: "yes" | "no" };
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
  ["wait", "Wait", "Pause before the next step.", TimerRounded],
  [
    "condition",
    "Condition",
    "Split subscribers into Yes and No paths.",
    SettingsRounded,
  ],
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
        ]),
      ]
        .filter((block) => block.type === "email")
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
        emailTemplateIds.map((id) => emailApi.templates.get(projectId!, id)),
      );
      return Object.fromEntries(
        details.map((template) => [template.id, template]),
      );
    },
    enabled: Boolean(projectId && emailTemplateIds.length),
    staleTime: 60_000,
  });
  const listedEmailTemplates = emailTemplates.data?.items ?? [];
  const detailedEmailTemplates = listedEmailTemplates.map((template) =>
    emailTemplateDetails.data?.[template.id]
      ? { ...template, ...emailTemplateDetails.data[template.id] }
      : template,
  );
  const choices: Choices = {
    segments: segments.data ?? [],
    groups: groups.data ?? [],
    emailTemplates: detailedEmailTemplates,
    pushTemplates: pushTemplates.data?.items ?? [],
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
      (emailTemplateIds.length > 0 && emailTemplateDetails.isLoading)),
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
  /** Stop = archive (ends it for good). Delete removes it; a journey that ever ran is archived first, as the backend requires. */
  const stopOrDelete = () =>
    run(async () => {
      setStopOpen(false);
      if (journeyId) {
        if (status !== "Draft")
          await journeysApi.action(projectId!, journeyId, "archive");
        if (status !== "Running")
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
      sourceType: type === "condition" ? sourceType : undefined,
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
    if (type === "condition")
      setBranches((items) => ({ ...items, [block.id]: { yes: [], no: [] } }));
    setAddTarget(null);
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
    branch: "yes" | "no",
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
  const openAdd = (target: AddTarget) =>
    setAddTarget((current) =>
      current && JSON.stringify(current) === JSON.stringify(target)
        ? null
        : target,
    );
  const isTarget = (target: AddTarget) =>
    Boolean(addTarget && JSON.stringify(addTarget) === JSON.stringify(target));
  const entranceDescription = entranceConfig.allUsers
    ? "All users"
    : entranceConfig.lifecycle
      ? `Lifecycle segment: ${nameOf(choices.segments, entranceConfig.lifecycle)}`
      : entranceConfig.audience
        ? `Audience group: ${nameOf(choices.groups, entranceConfig.audience)}`
        : "Select a lifecycle segment, audience group, or all users";
  const conditionDescription = (block: Block) =>
    conditionValues[block.id]?.[0] || block.description;
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
    const template = (
      block.type === "notification"
        ? choices.pushTemplates
        : block.type === "email"
          ? choices.emailTemplates
          : []
    ).find((item) => item.id === settings[block.id]?.template);
    if (!template) return block;
    return {
      ...block,
      description:
        block.type === "notification"
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
              disabled={busy}
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
              <Button
                startIcon={<PlayArrowRounded />}
                color="success"
                variant="contained"
                disabled={busy}
                onClick={resume}
              >
                Resume
              </Button>
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
                      : block.type === "condition"
                        ? { ...block, description: conditionDescription(block) }
                        : describe(block)
                  }
                  sourceType={blocks[index - 1]?.type}
                  selected={selected?.id === block.id}
                  onSelect={setSelected}
                  onRemove={removeBlock}
                />
                {block.type === "condition" ? (
                  <ConditionBranches
                    describe={describe}
                    conditionId={block.id}
                    branches={branches[block.id] || { yes: [], no: [] }}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                    onRemove={removeBranchBlock}
                    onOpenAdd={openAdd}
                    isTarget={isTarget}
                    addBlock={addBlock}
                  />
                ) : block.type !== "exit" ? (
                  <PlusConnector
                    target={{ scope: "root", index: index + 1 }}
                    onOpen={openAdd}
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
          set={(key, value) => setSetting(selected.id, key, value)}
          onEntranceChange={setEntranceConfig}
          onConditionChange={(values) =>
            setConditionValues((items) => ({ ...items, [selected.id]: values }))
          }
          onClose={() => setSelected(null)}
          onDelete={() => removeBlock(selected.id)}
        />
      )}
      <Dialog
        open={stopOpen}
        onClose={() => setStopOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {status === "Running" ? "Stop this journey?" : "Delete this journey?"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            This action cannot be undone. Your journey data will be preserved,
            but you will need to create a new journey to run it again.
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
            {status === "Running" ? "Stop journey" : "Delete journey"}
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
  isTarget,
  addBlock,
}: {
  target: AddTarget;
  onOpen: (target: AddTarget) => void;
  isTarget: (target: AddTarget) => boolean;
  addBlock: (type: BlockType, title: string, description: string) => void;
}) {
  return (
    <Box className="journey-plus-wrap">
      <Box className="journey-plus-line">
        <Button onClick={() => onOpen(target)} aria-label="Add journey step">
          <AddRounded />
        </Button>
      </Box>
      {isTarget(target) && (
        <AddStepPopover onChoose={addBlock} onClose={() => onOpen(target)} />
      )}
    </Box>
  );
}
function ConditionBranches({
  describe,
  conditionId,
  branches,
  selectedId,
  onSelect,
  onRemove,
  onOpenAdd,
  isTarget,
  addBlock,
}: {
  describe: (block: Block) => Block;
  conditionId: string;
  branches: { yes: Block[]; no: Block[] };
  selectedId?: string;
  onSelect: (block: Block) => void;
  onRemove: (conditionId: string, branch: "yes" | "no", id: string) => void;
  onOpenAdd: (target: AddTarget) => void;
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
                  target={{ scope: "branch", conditionId, branch }}
                  onOpen={onOpenAdd}
                  isTarget={isTarget}
                  addBlock={addBlock}
                />
              </Box>
            ))}
            {branches[branch].length === 0 && (
              <PlusConnector
                target={{ scope: "branch", conditionId, branch }}
                onOpen={onOpenAdd}
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
}: {
  block: Block;
  sourceType?: BlockType;
  selected: boolean;
  onSelect: (block: Block) => void;
  onRemove: (id: string) => void;
}) {
  const entrance = block.type === "entrance";
  const exit = block.type === "exit";
  const Icon = entrance
    ? GroupRounded
    : exit
      ? CloseRounded
      : block.type === "email"
        ? EmailRounded
        : block.type === "notification"
          ? NotificationsActiveRounded
          : block.type === "wait"
            ? TimerRounded
            : block.type === "specific_time"
              ? CalendarMonthRounded
              : block.type === "repeat_journey"
                ? ReplayRounded
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
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={600}>{block.title}</Typography>
          <Typography
            color="text.secondary"
            fontSize="var(--fs-12)"
            sx={{ whiteSpace: "pre-line" }}
          >
            {block.description}
          </Typography>
        </Box>
        <Stack direction="row">
          <IconButton size="small">
            <MoreVertRounded />
          </IconButton>
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
      <BlockMetrics blockId={block.id} blockTitle={block.title} type={block.type} stats={block.stats} />
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
  date
    ? new Date(date).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;
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
  const push = type === "notification";
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
                        {user.name || user.email || user.externalUserId || "Unnamed user"}
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
}: {
  blockId: string;
  blockTitle: string;
  type: BlockType;
  stats?: BlockStats;
}) {
  const openMetric = useContext(MetricPanelContext);
  const setOpen = (label: string) => openMetric({ blockId, blockTitle, type, label });
  // Every counter comes from GET /journeys/:id; a journey that has not been saved yet shows zeros.
  const rate = (part?: number) =>
    stats.sent ? `${Math.round(((part ?? 0) / stats.sent) * 100)}%` : 0;
  const count: Record<string, number | string> = {
    Sent: stats.sent ?? 0,
    Opens: stats.opened ?? 0,
    Clicks: (type === "notification" ? stats.opened : stats.clicked) ?? 0,
    "Open rate": rate(stats.opened),
    "Click rate": rate(type === "notification" ? stats.opened : stats.clicked),
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
    repeat_journey: [["Users waiting", "green"]],
    exit: [
      ["Completed", "green"],
      ["Exited early", "green"],
    ],
    condition: [],
  };
  if (type === "condition")
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
  options,
  onChoose,
  onClose,
}: {
  options?: typeof blockOptions;
  onChoose: (type: BlockType, title: string, description: string) => void;
  onClose: () => void;
}) {
  const groups = [
    ["SEND A MESSAGE", (options || blockOptions).slice(0, 2)],
    ["ACTIONS", (options || blockOptions).slice(2)],
  ] as const;
  return (
    <Box
      className="journey-add-popover"
      onClick={(event) => event.stopPropagation()}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography fontWeight={600}>Add a step</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </Stack>
      {groups.map(([label, items]) => (
        <Box key={label} sx={{ mt: 1.5 }}>
          <Typography className="journey-add-group-label">{label}</Typography>
          <Stack gap={0.4}>
            {items.map(([type, title, description, Icon]) => (
              <Button
                key={type}
                className={`journey-add-popover-option ${type}`}
                onClick={() => onChoose(type, title, description)}
              >
                <Box className="journey-add-popover-icon">
                  <Icon />
                </Box>
                <Box sx={{ textAlign: "left" }}>
                  <Typography fontWeight={600}>{title}</Typography>
                  <Typography color="text.secondary" fontSize="var(--fs-12)">
                    {description}
                  </Typography>
                </Box>
              </Button>
            ))}
          </Stack>
        </Box>
      ))}
    </Box>
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
}: SettingProps & {
  block: Block;
  choices: Choices;
  entranceConfig: EntranceConfig;
  conditionValues: string[];
  onEntranceChange: (config: EntranceConfig) => void;
  onConditionChange: (values: string[]) => void;
  onClose: () => void;
  onDelete: () => void;
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
        ) : block.type === "notification" ? (
          <NotificationSettings
            values={values}
            set={set}
            templates={choices.pushTemplates}
          />
        ) : block.type === "wait" ? (
          <WaitSettings values={values} set={set} />
        ) : block.type === "specific_time" ? (
          <SpecificTimeSettings values={values} set={set} />
        ) : block.type === "repeat_journey" ? (
          <RepeatSettings values={values} set={set} />
        ) : (
          <ConditionSettings
            sourceType={block.sourceType}
            values={conditionValues}
            onChange={onConditionChange}
            matchMode={values.match === "all" ? "all" : "any"}
            setMatchMode={(mode) => set("match", mode)}
          />
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
            {item.name}
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
            {item.name}
          </MenuItem>
        ))}
      </PanelSelect>
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
        <PanelSelect
          label="Unit"
          placeholder="day(s)"
          value={values.unit || ""}
          onChange={pick(set, "unit")}
        >
          {unitItems}
        </PanelSelect>
      </Stack>
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
  const rules = values.length ? values : [options[0]];
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
