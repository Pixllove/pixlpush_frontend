"use client";

import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckCircleRounded,
  CheckRounded,
  CloseRounded,
  DnsRounded,
  ExpandMoreRounded,
  LanguageRounded,
  PhoneIphoneRounded,
  WebhookRounded,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemButton,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import EmptyState from "./EmptyState";
import SearchField from "./SearchField";
import type { ProjectEventCatalogEntry } from "@/types/project";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import {
  eventsApi,
  integrationsApi,
  projectKeys,
  type SegmentRulesInput,
} from "@/lib/projects/api";
import {
  SEGMENT_PURPOSES,
  SOURCE_COPY,
  type SegmentSource,
} from "@/lib/lifecycle-purposes";

type EventOption = ProjectEventCatalogEntry;
const STEPS = ["Define", "Connect data", "Review"];
const WEBHOOK_PAGE = "/dashboard/integrations/webhook";

function EventChips({ names, empty }: { names: string[]; empty: string }) {
  if (!names.length)
    return (
      <Typography color="text.secondary" fontSize="var(--fs-12)">
        {empty}
      </Typography>
    );
  return (
    <Stack direction="row" gap={0.75} flexWrap="wrap">
      {names.map((name) => (
        <Chip
          key={name}
          size="small"
          label={name}
          sx={{ fontFamily: "var(--pp-mono)" }}
        />
      ))}
    </Stack>
  );
}

/** Server events picker: suggestions are events already received, plus the purpose's standard names. */
function ServerEventField({
  label,
  helper,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  helper: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <Autocomplete
      multiple
      freeSolo
      options={options}
      value={value}
      disabled={disabled}
      onChange={(_, next) =>
        onChange([...new Set(next.map((item) => item.trim()).filter(Boolean))])
      }
      renderTags={(items, getTagProps) =>
        items.map((item, index) => (
          <Chip
            {...getTagProps({ index })}
            key={item}
            size="small"
            label={item}
            sx={{ fontFamily: "var(--pp-mono)" }}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helper}
          placeholder={value.length ? "" : "Type an event name and press Enter"}
        />
      )}
    />
  );
}

const PAGE_SIZE = 20;

/** Searchable, paged event checklist. The same picker serves app (SDK) and server events. */
function EventPicker({
  options,
  selected,
  onToggle,
  loading,
  disabled,
  emptyDescription,
}: {
  options: EventOption[];
  selected: string[];
  onToggle: (name: string) => void;
  loading?: boolean;
  disabled?: boolean;
  emptyDescription: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const visible = options.filter((option) =>
    option.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <Stack gap={2.5}>
      <SearchField
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        placeholder="Search events"
      />
      <Box
        sx={{
          border: "1px solid #e3dcef",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "#fcfbff",
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            {Array.from({ length: 8 }, (_, index) => (
              <Stack
                key={index}
                direction="row"
                gap={2}
                alignItems="center"
                sx={{ px: 2, py: 1.6, borderBottom: "1px solid #eeeaf5" }}
              >
                <Skeleton variant="rounded" width={22} height={22} />
                <Skeleton variant="text" width="68%" />
              </Stack>
            ))}
          </Box>
        ) : paged.length ? (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            }}
          >
            {paged.map((option) => {
              const checked = selected.includes(option.name);
              const locked = Boolean(option.assignedSegment) || disabled;
              return (
                <ListItemButton
                  key={option.name}
                  onClick={() => !locked && onToggle(option.name)}
                  disabled={locked}
                  sx={{
                    minHeight: 78,
                    py: 1.1,
                    px: 1.5,
                    borderRight: { sm: "1px solid #eeeaf5" },
                    borderBottom: "1px solid #eeeaf5",
                    bgcolor: checked ? "#f1eaff" : "transparent",
                    "&:hover": { bgcolor: checked ? "#ede3ff" : "#f8f5ff" },
                  }}
                >
                  <Checkbox
                    checked={checked}
                    disabled={locked}
                    onChange={() => onToggle(option.name)}
                    onClick={(event) => event.stopPropagation()}
                    sx={{ mr: 1 }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize="var(--fs-12)" fontWeight={500} noWrap>
                      {option.name}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      fontSize="var(--fs-12)"
                      noWrap
                    >
                      {option.assignedSegment
                        ? `Already assigned to ${option.assignedSegment.name}`
                        : "Tracked events"}
                    </Typography>
                  </Box>
                  {checked && <CheckRounded color="primary" fontSize="small" />}
                </ListItemButton>
              );
            })}
          </Box>
        ) : (
          <EmptyState
            size="compact"
            icon={<SearchOffRounded />}
            title={
              search ? "No matching events found" : "No events received yet"
            }
            description={
              search
                ? "Check the spelling or try a different search."
                : emptyDescription
            }
          />
        )}
      </Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "center" }}
        gap={1}
      >
        <Typography color="text.secondary" fontSize="var(--fs-12)">
          {selected.length} event{selected.length === 1 ? "" : "s"} selected ·
          Showing {paged.length} of {visible.length}
        </Typography>
        {pageCount > 1 && (
          <Pagination
            size="small"
            page={page}
            count={pageCount}
            onChange={(_event, value) => setPage(value)}
            color="primary"
            shape="rounded"
          />
        )}
      </Stack>
    </Stack>
  );
}

export default function LifecycleSegmentCreateDialog({
  open,
  onClose,
  onCreate,
  events,
  eventsLoading,
  selectedSdk,
  onSdkSelect,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    rules: SegmentRulesInput;
  }) => void;
  events?: ProjectEventCatalogEntry[];
  eventsLoading?: boolean;
  selectedSdk?: "web" | "mobile";
  onSdkSelect: (sdk: "web" | "mobile") => void;
  loading?: boolean;
  error?: string;
}) {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [purposeKey, setPurposeKey] = useState("");
  const [chosenSource, setChosenSource] = useState<SegmentSource>();
  const [enter, setEnter] = useState<string[]>([]);
  const [exit, setExit] = useState<string[]>([]);
  const [editExit, setEditExit] = useState(false);
  const purpose = SEGMENT_PURPOSES.find((item) => item.key === purposeKey);
  // Preset purposes use their recommended source; only "Something else" lets the customer choose.
  const source = purpose?.source ?? chosenSource;
  const isWebhook = source === "webhook";

  const webhook = useQuery({
    queryKey: [...projectKeys.integrations(projectId ?? ""), "webhook"],
    queryFn: () => integrationsApi.get(projectId!, "webhook"),
    enabled: Boolean(open && isWebhook && projectId),
  });
  const serverEvents = useQuery({
    queryKey: ["projects", "events", "catalog", projectId, "server"],
    queryFn: () => eventsApi.listCatalog(projectId!, "server"),
    enabled: Boolean(open && isWebhook && step >= 1 && projectId),
  });
  const connection = webhook.data?.connected ? webhook.data : undefined;

  useEffect(() => {
    if (open) return;
    setStep(0);
    setName("");
    setDescription("");
    setSelectedEvents([]);
    setPurposeKey("");
    setChosenSource(undefined);
    setEnter([]);
    setExit([]);
    setEditExit(false);
  }, [open]);

  const choosePurpose = (key: string) => {
    const next = SEGMENT_PURPOSES.find((item) => item.key === key);
    setPurposeKey(key);
    setChosenSource(undefined);
    setName(next?.suggestedName ?? "");
    setEnter(next?.server?.enter ?? []);
    setExit(next?.server?.exit ?? []);
  };

  const eventOptions = useMemo<EventOption[]>(() => events ?? [], [events]);
  const eventListLoading = open && eventsLoading && !error;
  const toggleIn =
    (setter: (update: (current: string[]) => string[]) => void) =>
    (name: string) =>
      setter((current) =>
        current.includes(name)
          ? current.filter((item) => item !== name)
          : [...current, name],
      );

  const received = useMemo(
    () => new Set((serverEvents.data?.events ?? []).map((item) => item.name)),
    [serverEvents.data],
  );
  const serverOptions = useMemo(
    () => [
      ...new Set([
        ...received,
        ...(purpose?.server?.enter ?? []),
        ...(purpose?.server?.exit ?? []),
      ]),
    ],
    [received, purpose],
  );
  const overlap = enter.filter((item) => exit.includes(item));
  const serverReady = enter.length > 0 && overlap.length === 0;
  // The preset's leave events read as one sentence until the customer changes them.
  const exitSummary =
    purpose?.server && !editExit && exit.join() === purpose.server.exit.join()
      ? purpose.server.leaves
      : "";

  const close = () => {
    if (!loading) onClose();
  };
  const canAdvance =
    step === 0
      ? Boolean(purpose && source && (purpose.key !== "other" || name.trim()))
      : isWebhook
        ? serverReady
        : Boolean(selectedSdk) && selectedEvents.length > 0;
  const subtitle = [
    "Choose how users enter this segment.",
    isWebhook
      ? "Connect your server and choose the events that move users in and out."
      : "Choose where the events come from and which ones add users.",
    "Review the segment, then create it.",
  ][step];
  const defineHelper = !purpose
    ? "Pick the moment or status this segment is about."
    : purpose.key === "other"
      ? "Name your segment, then choose where the data comes from."
      : purpose.source === "webhook"
        ? "Users enter when your server confirms this status."
        : "Users enter when this event is received.";
  const canCreate =
    Boolean(name.trim()) &&
    !loading &&
    (isWebhook ? serverReady : selectedEvents.length > 0);
  const create = () =>
    onCreate({
      name: name.trim(),
      description: description.trim(),
      rules: isWebhook
        ? { source: "server", enter, exit }
        : {
            operator: "OR",
            conditions: selectedEvents.map((event) => ({ event })),
          },
    });

  const SOURCES: {
    key: SegmentSource;
    title: string;
    detail: string;
    Icon: typeof DnsRounded;
  }[] = [
    {
      key: "webhook",
      title: "Connect your server",
      detail: "Send subscription status and user updates to PixlPush.",
      Icon: DnsRounded,
    },
    {
      key: "sdk",
      title: "Track it in your app",
      detail: "Send this event from your app or website with the PixlPush SDK.",
      Icon: PhoneIphoneRounded,
    },
  ];

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: { xs: 3, md: 5 }, pt: 3.5, pb: 2 }}>
        <Typography variant="h3">Create a lifecycle segment</Typography>
        <Typography
          color="text.secondary"
          fontSize="var(--fs-13)"
          sx={{ mt: 0.7 }}
        >
          {subtitle}
        </Typography>
        <IconButton
          onClick={close}
          aria-label="Close"
          sx={{ position: "absolute", right: 18, top: 20 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: { xs: 3, md: 5 }, py: 3.5 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 ? (
          <Stack gap={2}>
            <Box>
              <Typography
                variant="h4"
                component="label"
                htmlFor="segment-purpose"
                sx={{ display: "block", mb: 1.25 }}
              >
                What should put a user in this segment?
              </Typography>
              <TextField
                id="segment-purpose"
                select
                fullWidth
                value={purposeKey}
                onChange={(event) => choosePurpose(event.target.value)}
                helperText={defineHelper}
                SelectProps={{
                  displayEmpty: true,
                  renderValue: (value) =>
                    SEGMENT_PURPOSES.find((item) => item.key === value)
                      ?.label ?? (
                      <Typography component="span" color="text.secondary">
                        Choose one
                      </Typography>
                    ),
                }}
              >
                {SEGMENT_PURPOSES.map((item) => (
                  <MenuItem key={item.key} value={item.key}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            {purposeKey === "other" && (
              <Stack gap={1.5}>
                <TextField
                  label="Segment name"
                  placeholder="e.g. Requested a refund"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  inputProps={{ maxLength: 120 }}
                  autoFocus
                />
              </Stack>
            )}
            {purpose && (
              <>
                <Divider />
                <Typography variant="h4">
                  Where will this data come from?
                </Typography>
                <Stack gap={1.25}>
                  {SOURCES.map(({ key, title, detail, Icon }) => {
                    const selected = source === key;
                    // Only the recommended source can be picked; the other is shown dimmed for context.
                    const locked =
                      Boolean(purpose.source) && purpose.source !== key;
                    return (
                      <ListItemButton
                        key={key}
                        selected={selected}
                        onClick={() => setChosenSource(key)}
                        disabled={locked}
                        aria-disabled={locked}
                        sx={{
                          gap: 2,
                          p: 2,
                          alignItems: "center",
                          border: "1px solid",
                          borderColor: selected ? "primary.main" : "divider",
                          borderRadius: 2,
                          "&.Mui-selected": { bgcolor: "#f6f1ff" },
                          "&.Mui-disabled": {
                            opacity: 0.45,
                            filter: "blur(0.6px) grayscale(1)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            flexShrink: 0,
                            borderRadius: 2,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "#ece3fb",
                            color: "primary.main",
                          }}
                        >
                          <Icon />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600}>{title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {detail}
                          </Typography>
                          {purpose.source === key && (
                            <Chip
                              size="small"
                              label="Recommended for this segment"
                              sx={{
                                mt: 1,
                                bgcolor: "#ece3fb",
                                color: "primary.main",
                                fontWeight: 500,
                              }}
                            />
                          )}
                        </Box>
                        {selected && <CheckCircleRounded color="primary" />}
                      </ListItemButton>
                    );
                  })}
                </Stack>
                {purpose.source && (
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px !important",
                      bgcolor: "action.hover",
                      "&::before": { display: "none" },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreRounded />}>
                      <Box>
                        <Typography fontWeight={600}>
                          Why this is recommended
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {purpose.why}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2">
                        {SOURCE_COPY[purpose.source].detail}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                )}
              </>
            )}
          </Stack>
        ) : step === 1 && isWebhook ? (
          <Stack gap={2.5}>
            <Box
              sx={{
                p: 2,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              {webhook.isLoading ? (
                <Skeleton height={40} />
              ) : connection ? (
                <Stack direction="row" gap={1.5} alignItems="center">
                  <CheckCircleRounded color="success" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600}>Webhook connected</Typography>
                    <Typography
                      color="text.secondary"
                      fontSize="var(--fs-12)"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {connection.accountLabel} · PixlPush checks it every 2
                      minutes.
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  gap={1.5}
                  alignItems={{ sm: "center" }}
                >
                  <WebhookRounded color="action" />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>
                      Your server is not connected yet
                    </Typography>
                    <Typography color="text.secondary" fontSize="var(--fs-12)">
                      You can create this segment now. Users join once your
                      server is connected and sends these events.
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    href={WEBHOOK_PAGE}
                    target="_blank"
                    rel="noopener"
                    sx={{ flexShrink: 0 }}
                  >
                    Connect server
                  </Button>
                </Stack>
              )}
            </Box>

            {!purpose?.server && (
              <Box>
                <Typography fontWeight={600}>
                  Events from your server
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize="var(--fs-12)"
                  sx={{ mb: 1.25 }}
                >
                  Tick the events that should add users to this segment.
                </Typography>
                <EventPicker
                  options={serverEvents.data?.events ?? []}
                  selected={enter}
                  onToggle={toggleIn(setEnter)}
                  loading={serverEvents.isLoading}
                  disabled={loading}
                  emptyDescription="Events sent by your server will appear here."
                />
              </Box>
            )}
            {purpose?.server && (
              <>
                <ServerEventField
                  label="Add users when your server sends"
                  helper={
                    purpose?.server
                      ? "Standard event names are filled in. Change them only if your server uses different names."
                      : "Selected events show here. To add one that has not arrived yet, type its name and press Enter."
                  }
                  value={enter}
                  onChange={setEnter}
                  options={serverOptions}
                  disabled={loading}
                />
                {exitSummary ? (
                  <Stack
                    direction="row"
                    gap={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Typography variant="body2">
                      Users leave {exitSummary}.
                    </Typography>
                    <Button size="small" onClick={() => setEditExit(true)}>
                      Edit events
                    </Button>
                  </Stack>
                ) : (
                  <ServerEventField
                    label="Remove users when your server sends (optional)"
                    helper="Users also move out when they join another lifecycle segment."
                    value={exit}
                    onChange={setExit}
                    options={serverOptions}
                    disabled={loading}
                  />
                )}
                {overlap.length > 0 && (
                  <Alert severity="error">
                    {overlap.join(", ")} cannot both add and remove users.
                  </Alert>
                )}
                {serverEvents.data && (
                  <Typography color="text.secondary" fontSize="var(--fs-12)">
                    {received.size
                      ? `${enter.filter((item) => received.has(item)).length} of ${enter.length} chosen events have already arrived from your server.`
                      : "No events have arrived from your server yet. That is fine: the segment fills up as they arrive."}
                  </Typography>
                )}
              </>
            )}
          </Stack>
        ) : step === 1 ? (
          <Stack gap={2.5}>
            <Box>
              <Typography fontWeight={600}>Where does this happen?</Typography>
              <Typography color="text.secondary" fontSize="var(--fs-12)">
                Choose the SDK that sends these events.
              </Typography>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 1.5,
              }}
            >
              {(
                [
                  [
                    "mobile",
                    "Mobile App",
                    "React Native or Flutter SDK events",
                    PhoneIphoneRounded,
                  ],
                  ["web", "Website", "Website SDK events", LanguageRounded],
                ] as const
              ).map(([sdk, title, subtitle, Icon]) => {
                const selected = selectedSdk === sdk;
                return (
                  <ListItemButton
                    key={sdk}
                    selected={selected}
                    onClick={() => {
                      onSdkSelect(sdk);
                      setSelectedEvents([]);
                    }}
                    sx={{
                      minHeight: 88,
                      border: "1px solid",
                      borderColor: selected ? "primary.main" : "divider",
                      borderRadius: 2,
                    }}
                  >
                    <Icon
                      color={selected ? "primary" : "action"}
                      sx={{ mr: 1.5 }}
                    />
                    <Box>
                      <Typography fontWeight={600}>{title}</Typography>
                      <Typography
                        color="text.secondary"
                        fontSize="var(--fs-12)"
                      >
                        {subtitle}
                      </Typography>
                    </Box>
                    {selected && (
                      <CheckRounded color="primary" sx={{ ml: "auto" }} />
                    )}
                  </ListItemButton>
                );
              })}
            </Box>
            {selectedSdk && (
              <Stack gap={2.5}>
                {error && (
                  <Typography color="error" fontSize="var(--fs-12)">
                    {error}
                  </Typography>
                )}
                <EventPicker
                  key={selectedSdk}
                  options={eventOptions}
                  selected={selectedEvents}
                  onToggle={toggleIn(setSelectedEvents)}
                  loading={eventListLoading}
                  disabled={loading}
                  emptyDescription="Events sent by this SDK will appear here."
                />
              </Stack>
            )}
          </Stack>
        ) : (
          <Stack gap={2.5}>
            <TextField
              label="Segment name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Cancelled, still active"
              autoFocus
              disabled={loading}
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this segment represents"
              multiline
              minRows={2}
              disabled={loading}
              inputProps={{ maxLength: 500 }}
            />
            <Box
              sx={{
                p: 2,
                border: "1px solid #e3dcef",
                borderRadius: 2,
                bgcolor: "#faf8ff",
              }}
            >
              <Stack gap={1.5}>
                <Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)">
                    Source
                  </Typography>
                  <Typography fontWeight={600} fontSize="var(--fs-13)">
                    {isWebhook
                      ? `Webhook/API${connection ? ` · ${connection.accountLabel}` : " · not connected yet"}`
                      : `SDK · ${selectedSdk === "web" ? "Website" : "Mobile App"}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    color="text.secondary"
                    fontSize="var(--fs-12)"
                    sx={{ mb: 0.5 }}
                  >
                    {isWebhook
                      ? "Users join when your server sends"
                      : "Users join when they do any of"}
                  </Typography>
                  <EventChips
                    names={isWebhook ? enter : selectedEvents}
                    empty="—"
                  />
                </Box>
                {isWebhook && (
                  <Box>
                    <Typography
                      color="text.secondary"
                      fontSize="var(--fs-12)"
                      sx={{ mb: 0.5 }}
                    >
                      Users leave
                    </Typography>
                    {exitSummary ? (
                      <Typography fontSize="var(--fs-13)">
                        {exitSummary.charAt(0).toUpperCase() +
                          exitSummary.slice(1)}
                      </Typography>
                    ) : (
                      <EventChips
                        names={exit}
                        empty="Only when they join another lifecycle segment"
                      />
                    )}
                  </Box>
                )}
                <Box>
                  <Typography color="text.secondary" fontSize="var(--fs-12)">
                    How it updates
                  </Typography>
                  <Typography fontSize="var(--fs-13)">
                    {isWebhook
                      ? "Automatically, each time PixlPush syncs with your server (every 2 minutes). The most recent event decides, and users already in your system are placed right away."
                      : "Automatically, as soon as the app or website sends one of these events."}
                  </Typography>
                </Box>
              </Stack>
            </Box>
            {error && (
              <Typography color="error" fontSize="var(--fs-12)">
                {error}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{ px: { xs: 3, md: 5 }, py: 2.5, justifyContent: "space-between" }}
      >
        <Button
          startIcon={step === 0 ? undefined : <ArrowBackRounded />}
          variant={step === 0 ? "text" : "outlined"}
          onClick={() => (step === 0 ? close() : setStep(step - 1))}
          disabled={loading}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 2 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance || loading}
          >
            Continue
          </Button>
        ) : (
          <Button variant="contained" onClick={create} disabled={!canCreate}>
            {loading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Create segment"
            )}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
