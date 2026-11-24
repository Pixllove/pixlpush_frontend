"use client";

import { useEffect, useState } from "react";
import { AddRounded } from "@mui/icons-material";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { eventsApi, type WebhookSample } from "@/lib/projects/api";

type Match = WebhookSample["eventMatches"][number];
type Known = WebhookSample["knownEvents"][number];

const errorText = (error: unknown) =>
  (error as { message?: string })?.message ??
  "Something went wrong. Please try again.";
/** A readable suggestion for the custom event name, e.g. "AppReviewLeft" → "app_review_left". */
const suggestName = (source: string) =>
  source
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "event_$1")
    .slice(0, 120);

/**
 * Review one incoming event: confirm a suggestion, pick another PixlPush event, create a
 * described custom event, or leave it unmapped (it is still stored under its own name).
 */
export default function EventMappingDialog({
  open,
  projectId,
  source,
  match,
  known,
  current,
  canCreate,
  onClose,
  onConfirm,
  onLeave,
}: {
  open: boolean;
  projectId: string;
  source: string;
  match?: Match;
  known: Known[];
  current?: string;
  canCreate: boolean;
  onClose: () => void;
  /** The chosen PixlPush event name; `created` when a custom event was just made. */
  onConfirm: (target: string, created?: boolean) => void;
  onLeave: () => void;
}) {
  const [choice, setChoice] = useState("");
  const [other, setOther] = useState<Known | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const first = match?.candidates[0]?.name;
    setChoice(
      current && current !== source
        ? current
        : (first ?? (match?.status === "needs_mapping" ? "custom" : "")),
    );
    setOther(null);
    setName(suggestName(source));
    setDescription("");
    setError("");
  }, [open, source, match, current]);

  const candidates = match?.candidates ?? [];
  const pickedOther = choice === "other" ? other?.name : undefined;
  const canSave =
    !busy &&
    (choice === "custom"
      ? /^[a-z][a-z0-9_]{1,119}$/.test(name) && description.trim().length >= 10
      : Boolean(choice && choice !== "other") || Boolean(pickedOther));

  const save = async () => {
    if (choice !== "custom") return onConfirm(pickedOther ?? choice);
    setBusy(true);
    setError("");
    try {
      const createdEvent = await eventsApi.createCustom(projectId, {
        name,
        description: description.trim(),
      });
      onConfirm(createdEvent.name, true);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        Map an incoming event
        <Typography variant="body2" color="text.secondary">
          Choose what{" "}
          <Box component="code" sx={{ fontFamily: "var(--pp-mono)" }}>
            {source}
          </Box>{" "}
          means in PixlPush.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              From your server
            </Typography>
            <Stack
              direction="row"
              gap={1}
              alignItems="center"
              flexWrap="wrap"
              sx={{ mt: 0.5 }}
            >
              <Chip
                size="small"
                label={source}
                sx={{ fontFamily: "var(--pp-mono)" }}
              />
              <Typography variant="caption" color="text.secondary">
                Event
              </Typography>
            </Stack>
            {match?.sampleProperties.length ? (
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
                sx={{ mt: 0.5 }}
              >
                Sent with: {match.sampleProperties.join(", ")}
              </Typography>
            ) : null}
            {match && (
              <Typography
                variant="caption"
                color="text.secondary"
                component="p"
              >
                {match.reason}
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <RadioGroup
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            {candidates.map((item) => (
              <FormControlLabel
                key={item.name}
                value={item.name}
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: "var(--pp-mono)" }}
                    >
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.reason}
                    </Typography>
                  </Box>
                }
                sx={{
                  alignItems: "flex-start",
                  mb: 1,
                  "& .MuiRadio-root": { pt: 0.25 },
                }}
              />
            ))}
            <FormControlLabel
              value="other"
              control={<Radio size="small" />}
              label="Another PixlPush event"
            />
            {choice === "other" && (
              <Autocomplete
                size="small"
                options={known}
                value={other}
                onChange={(_, value) => setOther(value)}
                getOptionLabel={(item) => item.name}
                renderOption={(props, item) => (
                  <li {...props} key={item.name}>
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: "var(--pp-mono)" }}
                      >
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.description ??
                          (item.standard ? "Standard event" : "Your event")}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} label="PixlPush event" />
                )}
                sx={{ ml: 4, mb: 1 }}
              />
            )}
            <FormControlLabel
              value="custom"
              control={<Radio size="small" />}
              label="Create a custom event"
              disabled={!canCreate}
            />
          </RadioGroup>

          {choice === "custom" && (
            <Stack gap={1.5} sx={{ pl: 4 }}>
              <Alert severity="info" icon={<AddRounded />}>
                The name below is a suggestion from the source name. Check it,
                and describe what the event means so your team and PixlPush AI
                understand it.
              </Alert>
              <TextField
                size="small"
                label="Event name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                helperText="Lowercase letters, digits and _ , starting with a letter."
                error={Boolean(name) && !/^[a-z][a-z0-9_]{1,119}$/.test(name)}
              />
              <TextField
                size="small"
                label="Description"
                required
                multiline
                minRows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="e.g. A user left a review in the app store prompt. Sent once per review."
                helperText="What it means, when it happens and what it represents in your product. At least 10 characters."
                inputProps={{ maxLength: 500 }}
              />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3, py: 2 }}>
        <Button onClick={onLeave} disabled={busy}>
          Leave unmapped
        </Button>
        <Stack direction="row" gap={1}>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {busy
              ? "Creating…"
              : choice === "custom"
                ? "Create and map"
                : "Save"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
