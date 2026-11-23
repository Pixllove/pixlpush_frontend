"use client";

import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckRounded,
  CloseRounded,
  LanguageRounded,
  PhoneIphoneRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  Alert,
  CircularProgress,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemButton,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import EmptyState from "./EmptyState";
import { useEffect, useMemo, useState } from "react";
import type { ProjectEventCatalogEntry } from "@/types/project";
import SearchField from "./SearchField";
import Link from "next/link";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { dataSyncApi } from "@/lib/projects/api";
import { SEGMENT_PURPOSES, SOURCE_COPY, type SegmentSource } from "@/lib/lifecycle-purposes";

type EventOption = ProjectEventCatalogEntry;
export default function LifecycleSegmentCreateDialog({
  open,
  onClose,
  onExternalCreated,
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
  onExternalCreated?: (segment: { id: string; name: string }) => void;
  onCreate: (input: {
    name: string;
    description: string;
    events: string[];
  }) => void;
  events?: ProjectEventCatalogEntry[];
  eventsLoading?: boolean;
  selectedSdk?: "web" | "mobile";
  onSdkSelect: (sdk: "web" | "mobile") => void;
  loading?: boolean;
  error?: string;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { active } = useActiveProject();
  const [purposeKey, setPurposeKey] = useState("");
  const [otherPurpose, setOtherPurpose] = useState("");
  const [chosenSource, setChosenSource] = useState<SegmentSource>();
  const [serverConnected, setServerConnected] = useState<boolean>();
  const [incomingStatus, setIncomingStatus] = useState("");
  const [externalBusy, setExternalBusy] = useState(false);
  const [externalError, setExternalError] = useState("");
  const purpose = SEGMENT_PURPOSES.find((item) => item.key === purposeKey);
  const dataSource = purpose?.source ?? chosenSource;
  const isWebhook = dataSource === "webhook";
  const busy = Boolean(loading) || externalBusy;

  useEffect(() => {
    if (!open || !isWebhook || !active?.id) return;
    let live = true;
    dataSyncApi.serverSync(active.id)
      .then((status) => { if (live) setServerConnected(status.connected); })
      .catch((cause: { message?: string }) => { if (live) setExternalError(cause.message ?? "Could not load Server Sync."); });
    return () => { live = false; };
  }, [open, isWebhook, active?.id]);

  const createExternal = async () => {
    if (!active?.id || !serverConnected) return;
    setExternalBusy(true);
    setExternalError("");
    try {
      const segment = await dataSyncApi.mapServerSegment(active.id, { sourceName: incomingStatus.trim(), name: name.trim(), description: description.trim() || undefined });
      onExternalCreated?.(segment);
      onClose();
    } catch (cause) {
      setExternalError((cause as { message?: string }).message ?? "Could not create this segment.");
    } finally {
      setExternalBusy(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setStep(0);
      setName("");
      setDescription("");
      setSelectedEvents([]);
      setSearch("");
      setPage(1);
      setPurposeKey("");
      setOtherPurpose("");
      setChosenSource(undefined);
      setServerConnected(undefined);
      setIncomingStatus("");
      setExternalError("");
    }
  }, [open]);

  const eventOptions = useMemo<EventOption[]>(() => events ?? [], [events]);
  const visibleEvents = eventOptions.filter((option) =>
    option.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(visibleEvents.length / pageSize));
  const pagedEvents = visibleEvents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const eventListLoading = open && eventsLoading && !error;
  const toggleEvent = (option: EventOption) => {
    if (option.assignedSegment || loading) return;
    setSelectedEvents((current) =>
      current.includes(option.name)
        ? current.filter((item) => item !== option.name)
        : [...current, option.name],
    );
  };
  const close = () => {
    if (!busy) onClose();
  };
  const canCreate = Boolean(name.trim()) && !busy && (isWebhook ? Boolean(serverConnected && incomingStatus.trim()) : selectedEvents.length > 0);
  const canAdvance = step === 0 ? Boolean(purpose && (purpose.source || (otherPurpose.trim() && chosenSource))) : step === 1 ? isWebhook || Boolean(selectedSdk) : isWebhook ? Boolean(serverConnected && incomingStatus.trim()) : selectedEvents.length > 0;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: { xs: 3, md: 5 }, pt: 3.5, pb: 2 }}>
        <Typography
          color="primary"
          fontSize="var(--fs-12)"
          letterSpacing={1.5}
          fontWeight={500}
        >
          LIFECYCLE SEGMENTS
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>
          Create segment
        </Typography>
        <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: 0.7 }}>
          {["What do you want this lifecycle segment to track?", "Review the recommended data source.", isWebhook ? "Choose the connected system and incoming status." : "Choose events received from the selected SDK.", "Review how this segment will update."][step]}
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
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>{["Purpose", "Source", "Configure", "Review"].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
        {step === 0 ? (
          <Stack gap={2}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 1 }}>
              {SEGMENT_PURPOSES.map((item) => (
                <ListItemButton key={item.key} selected={purposeKey === item.key} onClick={() => { setPurposeKey(item.key); setName(item.suggestedName); }} sx={{ minHeight: 56, border: "1px solid", borderColor: purposeKey === item.key ? "primary.main" : "divider", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                  {purposeKey === item.key && <CheckRounded color="primary" fontSize="small" />}
                </ListItemButton>
              ))}
            </Box>
            {purposeKey === "other" && (
              <Stack gap={1.5}>
                <TextField label="What should this segment identify?" value={otherPurpose} onChange={(event) => setOtherPurpose(event.target.value)} multiline minRows={2} />
                <TextField select label="Where is this data recorded?" value={chosenSource ?? ""} onChange={(event) => setChosenSource(event.target.value as SegmentSource)} helperText="Use SDK for app or website actions. Use Server Sync for backend or billing status.">
                  <MenuItem value="sdk">In the app or website (SDK)</MenuItem>
                  <MenuItem value="webhook">In our backend or billing system (Server Sync)</MenuItem>
                </TextField>
              </Stack>
            )}
          </Stack>
        ) : step === 1 && isWebhook ? (
          <Alert severity="info"><Typography variant="body2" fontWeight={600}>Recommended source: {SOURCE_COPY.webhook.title}</Typography>{purpose?.source ? purpose.why + " " : ""}{SOURCE_COPY.webhook.detail}</Alert>
        ) : step === 2 && isWebhook ? (
          <Stack gap={2}>
            {externalError && <Alert severity="error">{externalError}</Alert>}
            {serverConnected === false ? (
              <Alert severity="warning" action={<Button component={Link} href="/dashboard/integrations/webhook" size="small">Connect server</Button>}>Connect your server in Integrations, then return here.</Alert>
            ) : (
              <TextField label="Incoming segment or status name" placeholder="e.g. cancel_at_period_end" value={incomingStatus} onChange={(event) => setIncomingStatus(event.target.value)} helperText="The exact value your server sends as segment." />
            )}
          </Stack>
        ) : step === 1 ? (
          <Stack gap={2.5}>
            <Alert severity="info"><Typography variant="body2" fontWeight={600}>Recommended source: {SOURCE_COPY.sdk.title}</Typography>{purpose?.source ? purpose.why + " " : ""}{SOURCE_COPY.sdk.detail}</Alert>
            <Stack direction="row" gap={1} alignItems="center">
                            <Box>
                <Typography fontWeight={600}>Select SDK</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-12)">
                  Select where the events you need are coming from.
                </Typography>
              </Box>
            </Stack>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
              {([
                ["web", "Web Push", "Website SDK events", LanguageRounded],
                ["mobile", "Mobile App", "React Native or Flutter SDK events", PhoneIphoneRounded],
              ] as const).map(([sdk, title, subtitle, Icon]) => {
                const selected = selectedSdk === sdk;
                return (
                  <ListItemButton
                    key={sdk}
                    selected={selected}
                    onClick={() => {
                      onSdkSelect(sdk);
                      setSelectedEvents([]);
                      setSearch("");
                      setPage(1);
                    }}
                    sx={{ minHeight: 104, border: "1px solid", borderColor: selected ? "primary.main" : "#e3dcef", borderRadius: 2, bgcolor: selected ? "#f1eaff" : "#fcfbff" }}
                  >
                    <Icon color={selected ? "primary" : "action"} sx={{ mr: 1.5 }} />
                    <Box>
                      <Typography fontWeight={600}>{title}</Typography>
                      <Typography color="text.secondary" fontSize="var(--fs-12)">{subtitle}</Typography>
                    </Box>
                    {selected && <CheckRounded color="primary" sx={{ ml: "auto" }} />}
                  </ListItemButton>
                );
              })}
            </Box>
          </Stack>
        ) : step === 2 ? (
          <Stack gap={2.5}>
            <Stack direction="row" gap={1} alignItems="center">
                            <Box>
                <Typography fontWeight={600}>Select events</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-12)">
                  Users who complete any selected event will enter this segment.
                </Typography>
              </Box>
            </Stack>
            {error && (
              <Typography color="error" fontSize="var(--fs-12)">
                {error}
              </Typography>
            )}
            <SearchField value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search events" />
            <Box
              sx={{
                border: "1px solid #e3dcef",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "#fcfbff",
              }}
            >
              {eventListLoading ? (
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
              ) : pagedEvents.length ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  }}
                >
                  {pagedEvents.map((option) => {
                    const checked = selectedEvents.includes(option.name);
                    return (
                      <ListItemButton
                        key={option.name}
                        onClick={() => toggleEvent(option)}
                        disabled={Boolean(option.assignedSegment) || loading}
                        sx={{
                          minHeight: 78,
                          py: 1.1,
                          px: 1.5,
                          borderRight: { sm: "1px solid #eeeaf5" },
                          borderBottom: "1px solid #eeeaf5",
                          bgcolor: checked ? "#f1eaff" : "transparent",
                          "&:hover": {
                            bgcolor: checked ? "#ede3ff" : "#f8f5ff",
                          },
                        }}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={Boolean(option.assignedSegment) || loading}
                          onChange={() => toggleEvent(option)}
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
                        {checked && (
                          <CheckRounded color="primary" fontSize="small" />
                        )}
                      </ListItemButton>
                    );
                  })}
                </Box>
              ) : (
                <EmptyState
                  size="compact"
                  icon={<SearchOffRounded />}
                  title={search ? "No matching events found" : "No events received yet"}
                  description={search ? "Check the spelling or try a different search." : "Events sent by this SDK will appear here."}
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
                {selectedEvents.length} event
                {selectedEvents.length === 1 ? "" : "s"} selected · Showing{" "}
                {pagedEvents.length} of {visibleEvents.length}
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
        ) : (
          <Stack gap={2.5}>
            <Stack direction="row" gap={1} alignItems="center">
                            <Box>
                <Typography fontWeight={600}>Add segment details</Typography>
                <Typography color="text.secondary" fontSize="var(--fs-12)">
                  Give this lifecycle segment a clear name your team will
                  recognize.
                </Typography>
              </Box>
            </Stack>
            <TextField
              label="Segment name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Highly engaged users"
              autoFocus
              disabled={loading}
            />
            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What this segment represents"
              multiline
              minRows={3}
              disabled={loading}
            />
            <Box
              sx={{
                p: 2,
                border: "1px solid #e3dcef",
                borderRadius: 2,
                bgcolor: "#faf8ff",
              }}
            >
              <Typography fontWeight={600} fontSize="var(--fs-13)">
                {isWebhook ? `Source: Server Sync · updates when your server sends "${incomingStatus.trim()}"` : "Source: SDK · users enter when they complete any of these events"}
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {selectedEvents.map((event) => (
                  <Box
                    key={event}
                    sx={{
                      px: 1.2,
                      py: 0.7,
                      borderRadius: 1.5,
                      bgcolor: "#eee5ff",
                      color: "#5f22be",
                      fontSize: "var(--fs-12)",
                      fontWeight: 500,
                    }}
                  >
                    {event}
                  </Box>
                ))}
              </Stack>
            </Box>
            {(error || externalError) && (
              <Typography color="error" fontSize="var(--fs-12)">
                {externalError || error}
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
          disabled={busy}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => setStep(step + 1)} disabled={!canAdvance || busy}>Next</Button>
        ) : (
          <Button variant="contained" onClick={() => isWebhook ? void createExternal() : onCreate({ name: name.trim(), description: description.trim(), events: selectedEvents })} disabled={!canCreate}>
            {busy ? <CircularProgress size={18} color="inherit" /> : "Create segment"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
