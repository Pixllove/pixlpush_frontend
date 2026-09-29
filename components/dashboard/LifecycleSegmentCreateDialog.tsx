"use client";

import {
  ArrowBackRounded,
  ArrowForwardRounded,
  CheckRounded,
  CloseRounded,
  SearchRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  ListItemButton,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { LifecycleSegmentSchema } from "@/types/project";

type EventOption = {
  name: string;
  group: string;
  assigned?: string | null;
  suggestedSegment?: string;
};
export default function LifecycleSegmentCreateDialog({
  open,
  onClose,
  onCreate,
  schema,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    name: string;
    description: string;
    events: string[];
  }) => void;
  schema?: LifecycleSegmentSchema;
  loading?: boolean;
  error?: string;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setName("");
      setDescription("");
      setSelectedEvents([]);
      setSearch("");
      setPage(1);
    }
  }, [open]);

  const eventOptions = useMemo<EventOption[]>(() => {
    const tracked = (schema?.events ?? []).map((item) => ({
      name: item.name,
      group: "Tracked events",
      assigned: item.assignedSegment?.name ?? null,
    }));
    const trackedNames = new Set(tracked.map((item) => item.name));
    const suggested = (schema?.recommendedEvents ?? []).filter((item) => !trackedNames.has(item.name)).map((item) => ({
      name: item.name,
      group: "Suggested events",
      assigned: item.assignedSegment?.name ?? null,
      suggestedSegment: item.suggestedSegment,
    }));
    // Both lists come from the API: this project's SDK events, then recommendations.
    return [...tracked, ...suggested];
  }, [schema]);
  const visibleEvents = eventOptions.filter((option) =>
    option.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(visibleEvents.length / pageSize));
  const pagedEvents = visibleEvents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const schemaLoading = open && !schema && !error;
  const toggleEvent = (option: EventOption) => {
    if (option.assigned || loading) return;
    setSelectedEvents((current) =>
      current.includes(option.name)
        ? current.filter((item) => item !== option.name)
        : [...current, option.name],
    );
  };
  const close = () => {
    if (!loading) onClose();
  };
  const canCreate =
    Boolean(name.trim()) && selectedEvents.length > 0 && !loading;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="md">
      <DialogTitle sx={{ px: { xs: 3, md: 5 }, pt: 3.5, pb: 2 }}>
        <Typography
          color="primary"
          fontSize={12}
          letterSpacing={1.5}
          fontWeight={900}
        >
          LIFECYCLE SEGMENTS
        </Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>
          Create segment
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.7 }}>
          {step === 0
            ? "Choose the product events that define this lifecycle segment."
            : "Name your segment and review the events that will qualify users."}
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
        {step === 0 ? (
          <Stack gap={2.5}>
            <Stack direction="row" gap={1} alignItems="center">
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  bgcolor: "primary.main",
                  fontWeight: 900,
                }}
              >
                1
              </Box>
              <Box>
                <Typography fontWeight={900}>Select events</Typography>
                <Typography color="text.secondary" fontSize={12}>
                  Users who complete any selected event will enter this segment.
                </Typography>
              </Box>
            </Stack>
            <TextField
              size="small"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search events"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Box
              sx={{
                border: "1px solid #e3dcef",
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "#fcfbff",
              }}
            >
              {schemaLoading ? (
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
                        disabled={Boolean(option.assigned) || loading}
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
                          disabled={Boolean(option.assigned) || loading}
                          onChange={() => toggleEvent(option)}
                          onClick={(event) => event.stopPropagation()}
                          sx={{ mr: 1 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontSize={12} fontWeight={800} noWrap>
                            {option.name}
                          </Typography>
                          <Typography
                            color="text.secondary"
                            fontSize={10}
                            noWrap
                          >
                            {option.assigned
                              ? `Already assigned to ${option.assigned}`
                              : option.group}
                            {option.suggestedSegment
                              ? ` · suggested for ${option.suggestedSegment}`
                              : ""}
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
                <Typography
                  color="text.secondary"
                  fontSize={13}
                  sx={{ p: 3, textAlign: "center" }}
                >
                  No matching events found.
                </Typography>
              )}
            </Box>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              gap={1}
            >
              <Typography color="text.secondary" fontSize={12}>
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
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  bgcolor: "primary.main",
                  fontWeight: 900,
                }}
              >
                2
              </Box>
              <Box>
                <Typography fontWeight={900}>Add segment details</Typography>
                <Typography color="text.secondary" fontSize={12}>
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
              <Typography fontWeight={900} fontSize={13}>
                Users enter when they complete any of these events
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
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {event}
                  </Box>
                ))}
              </Stack>
            </Box>
            {error && (
              <Typography color="error" fontSize={12}>
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
          onClick={() => (step === 0 ? close() : setStep(0))}
          disabled={loading}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step === 0 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => setStep(1)}
            disabled={selectedEvents.length === 0 || loading}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() =>
              onCreate({
                name: name.trim(),
                description: description.trim(),
                events: selectedEvents,
              })
            }
            disabled={!canCreate}
          >
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
