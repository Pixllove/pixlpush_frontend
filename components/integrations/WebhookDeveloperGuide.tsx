"use client";

import { useState, type FormEvent } from "react";
import {
  CloseRounded,
  EmailRounded,
  OpenInNewRounded,
  SmartToyRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { onboardingApi } from "@/lib/projects/api";

/** One source for both the on-screen guide and the copied text, so they never drift apart. */
const EXAMPLE = `{
  "data": [
    {
      "id": "evt_1001",
      "event_name": "subscription_canceled",
      "user_id": "12345",
      "time": "2026-11-24T10:00:00Z",
      "product_id": "premium_monthly",
      "transaction": { "expires": "2026-12-24T10:00:00Z" },
      "user": { "email": "ana@example.com", "name": "Ana", "language": "en", "email_consent": true }
    }
  ],
  "next": null
}`;

const FIELDS: [string, string, string][] = [
  [
    "id",
    "Yes",
    "A unique id for this event. If the same id is sent again, PixlPush ignores the repeat.",
  ],
  ["event_name", "Yes", "What happened. Use a name from the list below."],
  ["user_id", "Yes", "The user’s id in your system."],
  [
    "time",
    "Yes",
    "When it happened: ISO date, or Unix seconds or milliseconds.",
  ],
  [
    "product_id",
    "For subscription events",
    "Which plan or product, e.g. premium_monthly.",
  ],
  ["transaction.expires", "No", "When access ends, for cancellations."],
  [
    "user",
    "No",
    "Profile details: email, name, language, timezone, country, email_consent, push_consent.",
  ],
];

const EVENTS: [string, string][] = [
  ["A free trial starts", "trial_started"],
  ["The user cancels the trial", "trial_canceled"],
  [
    "The trial ends, or turns into a paid subscription",
    "trial_expired, trial_converted",
  ],
  [
    "A paid subscription starts or renews",
    "subscription_started, subscription_renewed, subscription_upgraded, subscription_product_changed",
  ],
  ["The user cancels but still has access", "subscription_canceled"],
  [
    "The subscription ends or is refunded",
    "subscription_expired, subscription_refunded",
  ],
  ["A payment fails", "subscription_billing_retry"],
  [
    "The account is paused, resumed or deleted",
    "account_paused, account_resumed, account_deleted",
  ],
];

const STEPS = [
  "Create a read-only endpoint in your backend, for example GET https://api.yourapp.com/pixlpush/events.",
  "Protect it with a secret token. PixlPush sends it in the header: Authorization: Bearer <token>.",
  "Return events as JSON in stable chronological order, using the format and paging rules below.",
  "Make it a public HTTPS URL. Localhost, private network addresses, and endpoints with invalid TLS certificates do not work.",
  "Send the URL and the token to the person setting up PixlPush. They paste both on the Webhook page.",
];

const PAGING =
  "PixlPush requests up to 500 events per page with limit=500. It may include since=<ISO timestamp> to request events from a recent checkpoint; include events at the boundary so retries cannot skip them. When more results remain, return next as a non-empty opaque cursor and use that cursor to return the next page for the same query. Return next:null on the final page. Keep ordering stable across pages. Event ids must remain stable because PixlPush uses them to deduplicate overlapping reads and retries.";

const DEVELOPER_DOCS = "/dashboard/developer-docs/webhook";

function aiPrompt() {
  return [
    "You are a senior backend engineer working in this repository. Implement the PixlPush server event feed in the existing application, using its actual language, framework, database, authentication, and conventions.",
    "",
    "Read the PixlPush webhook developer documentation before making changes:",
    `${typeof window === "undefined" ? DEVELOPER_DOCS : `${window.location.origin}${DEVELOPER_DOCS}`}`,
    "",
    "Requirements:",
    "- Add a public HTTPS GET endpoint for the PixlPush event feed. PixlPush polls it; do not implement an outbound callback.",
    "- Require Authorization: Bearer <token>. Compare credentials safely, keep the configured token in environment/secret storage, and never log or return it.",
    '- Accept limit (up to 500), since (ISO timestamp), and cursor query parameters. Return JSON shaped as {"data":[...events],"next":"opaque-cursor"}; use next:null on the last page.',
    "- Return events in stable chronological order. Implement opaque, stable cursor pagination and filter by since without skipping events at page boundaries.",
    "- Each event must have a stable unique id, event_name, user_id, and real occurrence time. Include product_id for billing events and segment for segment_entered/segment_exited. Preserve user, properties, custom_user_id, expires_at, and transaction.expires when available.",
    "- Use only fields and event semantics in the PixlPush documentation. Keep credentials server-side, validate inputs, and return 401/403 for invalid credentials.",
    "- Add focused tests for auth, event serialization, since filtering, paging boundaries, stable ordering, and the final-page response. Update the project’s setup documentation with the route and secret configuration.",
    "- First inspect the repository and report a short implementation plan. Then implement it, run relevant checks, and summarize changed files, configuration needed, and deployment steps. Do not invent database tables or claim checks passed unless you ran them.",
    "",
    "PixlPush endpoint contract:",
    `GET https://your-domain.example${new URL("/pixlpush/events", "https://your-domain.example").pathname}?limit=500&since=<ISO timestamp>&cursor=<opaque cursor>`,
    "Authorization: Bearer <secret token>",
    "Accept: application/json",
    "",
    "Example response:",
    EXAMPLE,
  ].join("\n");
}

const code = {
  fontFamily: "var(--pp-mono)",
  fontSize: "var(--fs-12)",
} as const;

export default function WebhookDeveloperGuide({
  projectId,
}: {
  projectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const validDeveloperEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    developerEmail.trim(),
  );
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt());
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setOpen(true);
    }
  };
  const sendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || emailSending) return;
    setEmailSending(true);
    setEmailError("");
    try {
      await onboardingApi.sendWebhookInstructions(
        projectId,
        developerEmail.trim(),
      );
      setEmailSent(true);
    } catch (error) {
      setEmailError(
        error instanceof Error
          ? error.message
          : "The email could not be sent. Please try again.",
      );
    } finally {
      setEmailSending(false);
    }
  };
  const openEmailPanel = () => {
    setEmailSent(false);
    setEmailError("");
    setEmailOpen(true);
  };

  return (
    <Stack gap={1.5} sx={{ mt: 1 }}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          size="small"
          variant="contained"
          startIcon={<EmailRounded />}
          onClick={openEmailPanel}
          disabled={!projectId}
        >
          Email developer
        </Button>
        <Button
          size="small"
          startIcon={<SmartToyRounded />}
          onClick={() => void copyPrompt()}
        >
          {promptCopied ? "AI prompt copied" : "Copy AI prompt"}
        </Button>
        <Button
          size="small"
          component={Link}
          href={DEVELOPER_DOCS}
          endIcon={<OpenInNewRounded />}
        >
          Go to developer docs
        </Button>
        <Button size="small" onClick={() => setOpen((value) => !value)}>
          {open ? "Hide instructions" : "Preview instructions"}
        </Button>
      </Stack>
      <Drawer
        anchor="right"
        open={emailOpen}
        onClose={() => !emailSending && setEmailOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 460 },
            p: { xs: 2.5, sm: 3 },
            boxSizing: "border-box",
          },
        }}
      >
        <Stack
          component="form"
          onSubmit={sendEmail}
          gap={2}
          sx={{ height: "100%" }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h5">Email your developer</Typography>
            <IconButton
              aria-label="Close email panel"
              onClick={() => setEmailOpen(false)}
              disabled={emailSending}
            >
              <CloseRounded />
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            We’ll email the Webhook setup steps and developer documentation link
            for this project.
          </Typography>
          {emailError && <Alert severity="error">{emailError}</Alert>}
          {emailSent ? (
            <Stack gap={2}>
              <Alert severity="success">
                Instructions sent to {developerEmail.trim()}.
              </Alert>
              <Button
                variant="contained"
                onClick={() => setEmailOpen(false)}
                sx={{ alignSelf: "flex-start" }}
              >
                Done
              </Button>
            </Stack>
          ) : (
            <>
              <TextField
                label="Developer email"
                type="email"
                required
                autoFocus
                fullWidth
                value={developerEmail}
                onChange={(event) => setDeveloperEmail(event.target.value)}
                placeholder="developer@example.com"
              />
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" justifyContent="flex-end" gap={1}>
                <Button
                  onClick={() => setEmailOpen(false)}
                  disabled={emailSending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<EmailRounded />}
                  disabled={!projectId || emailSending || !validDeveloperEmail}
                >
                  {emailSending ? "Sending…" : "Send email"}
                </Button>
              </Stack>
            </>
          )}
        </Stack>
      </Drawer>
      {open && (
        <Stack
          gap={2.5}
          sx={{
            p: { xs: 2, sm: 2.5 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              What to build
            </Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5, "& li": { mb: 0.75 } }}>
              {STEPS.map((step) => (
                <li key={step}>
                  <Typography variant="body2">{step}</Typography>
                </li>
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Response format
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                overflowX: "auto",
                borderRadius: 1,
                bgcolor: "action.hover",
                ...code,
              }}
            >
              {EXAMPLE}
            </Box>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Fields
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Field</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>What it is</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {FIELDS.map(([name, required, about]) => (
                  <TableRow key={name}>
                    <TableCell sx={code}>{name}</TableCell>
                    <TableCell>{required}</TableCell>
                    <TableCell>{about}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Event names
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When this happens</TableCell>
                  <TableCell>Send event_name</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {EVENTS.map(([when, names]) => (
                  <TableRow key={when}>
                    <TableCell>{when}</TableCell>
                    <TableCell sx={{ ...code, overflowWrap: "anywhere" }}>
                      {names}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell>Anything else</TableCell>
                  <TableCell>
                    Any other name is saved too and can be used in segments and
                    journeys.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
              Paging
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {PAGING}
            </Typography>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
