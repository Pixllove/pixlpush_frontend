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

/** One source for the on-screen guide and the copied AI prompt, so they never drift apart. */
const EXAMPLE = `{
  "data": [
    {
      "id": "evt_1001",
      "event_name": "subscription_canceled",
      "user_id": "12345",
      "time": "2026-11-24T10:00:00Z",
      "product_id": "premium_monthly",
      "billing_period": "monthly",
      "transaction": { "expires": "2026-12-24T10:00:00Z" },
      "user": {
        "email": "ana@example.com",
        "name": "Ana",
        "language": "en",
        "country": "DE",
        "region": "Berlin",
        "timezone": "Europe/Berlin",
        "user_type": "premium",
        "account_status": "active",
        "platform": "ios",
        "email_consent": true,
        "push_consent": true
      }
    },
    {
      "id": "msg_2001_opened",
      "event_name": "message_opened",
      "user_id": "12345",
      "time": "2026-11-20T09:15:00Z",
      "channel": "email",
      "message_id": "msg_2001",
      "campaign_id": "spring_sale",
      "campaign_name": "Spring Sale"
    }
  ],
  "next": null
}`;

const FIELDS: [string, string, string][] = [
  ["id", "Yes", "A unique, stable id for this event. If the same id is sent again, PixlPush ignores the repeat."],
  ["event_name", "Yes", "What happened. Use a name from the lists below, or your own name."],
  ["user_id", "Yes", "The user’s id in your system."],
  ["custom_user_id", "No", "Your app’s own user id, when user_id comes from a billing tool. It wins when set."],
  ["time", "Yes", "When it really happened: ISO date, or Unix seconds or milliseconds."],
  ["product_id", "For subscription events", "Which plan or product, e.g. premium_monthly."],
  ["billing_period", "Recommended", "weekly, monthly, quarterly, yearly or one_time (coin packs and other one-time payments)."],
  ["transaction.expires", "No", "When access ends, for cancellations and expiries."],
  ["segment", "For segment events", "The segment name for segment_entered and segment_exited."],
  ["user", "Recommended", "The user’s current profile. See Profile fields."],
  ["properties", "No", "Extra event details as a flat object of text, numbers or true/false."],
];

const PROFILE: [string, string][] = [
  ["email, name", "Contact details."],
  ["language", "e.g. en, de."],
  ["country, region", "Country and region or city."],
  ["timezone", "An IANA name like Asia/Karachi. Invalid values are skipped; the rest of the profile still syncs."],
  ["user_type", "e.g. free, premium, vip. Used by segment membership rules; keep the values consistent."],
  ["account_status", "e.g. active, paused, blocked, deleted."],
  ["platform", "ios, android or web. Shown until the PixlPush SDK registers the user’s device."],
  ["email_consent, push_consent", "true or false. Leave the key out when the user was never asked; PixlPush never guesses consent."],
  ["anything else", "Saved as a custom property you can use in segments."],
];

const EVENTS: [string, string][] = [
  ["A free trial starts", "trial_started"],
  ["The user cancels the trial", "trial_canceled"],
  ["The trial ends, or turns into a paid subscription", "trial_expired, trial_converted"],
  ["A paid subscription starts or renews", "subscription_started, subscription_renewed, subscription_upgraded, subscription_product_changed"],
  ["The user cancels but still has access", "subscription_canceled"],
  ["The subscription ends or is refunded", "subscription_expired, subscription_refunded"],
  ["A payment fails", "subscription_billing_retry"],
  ["The user buys something once (coins, credits, lifetime)", "purchase"],
  ["The account is paused, resumed or deleted", "account_paused, account_resumed, account_deleted"],
  ["The user enters or leaves one of your segments (send segment)", "segment_entered, segment_exited"],
];

const HISTORY: [string, string][] = [
  ["An email or push from your previous tool was sent, delivered, opened, clicked, bounced or failed", "message_sent, message_delivered, message_opened, message_clicked, message_bounced, message_failed"],
  ["The user unsubscribed or complained (email)", "message_unsubscribed, message_complained"],
  ["The user reached a step in a journey of your previous tool", "journey_step_entered"],
];

const HISTORY_NOTE =
  "Optional. Message events need channel (email or push), message_id and campaign_id (campaign_name helps matching). journey_step_entered needs journey_id and step_id (journey_name and step_name help matching). This history is shown in PixlPush as imported: it is never counted as a PixlPush send and never sends anything. Push has no clicks in PixlPush, so push clicks are not stored.";

const STEPS = [
  "Create a read-only endpoint in your backend, for example GET https://api.yourapp.com/pixlpush/events.",
  "Protect it with a secret token. PixlPush sends it in the header: Authorization: Bearer <token>.",
  "Return events as JSON in stable time order, using the format and paging rules below. Put the user’s current profile in user on every event.",
  "Make it a public HTTPS URL. Localhost, private network addresses and invalid TLS certificates do not work.",
  "Send the URL and the token to the person setting up PixlPush. They paste both on the Webhook page.",
];

const PAGING =
  "PixlPush reads one page of up to 2,500 events every 2 minutes (limit=2500) until it reaches your last page; never return more than limit events, and keep each page under 5 MB. To keep it fast: index the columns you order and filter by (time, id), read one page per request with a keyset query (WHERE (time, id) > cursor ORDER BY time, id LIMIT n) instead of OFFSET, and select only the columns you send. It may include since=<ISO timestamp> to restart from a checkpoint; include events at that exact time so retries cannot skip them. When more results remain, return next as a non-empty opaque cursor and return the next page for that cursor. Return next:null on the final page. Keep ordering stable across pages, and keep event ids stable because PixlPush uses them to ignore repeats.";

const DEVELOPER_DOCS = "/dashboard/developer-docs/webhook";

function aiPrompt() {
  const docs = typeof window === "undefined" ? DEVELOPER_DOCS : `${window.location.origin}${DEVELOPER_DOCS}`;
  return [
    "You are a senior backend engineer working in this repository. Implement the PixlPush server event feed in the existing application, using its actual language, framework, database, authentication and conventions.",
    "",
    "Read the PixlPush Webhook developer documentation before making changes:",
    docs,
    "",
    "Requirements:",
    "- Add a public HTTPS GET endpoint for the PixlPush event feed. PixlPush polls it; do not build an outbound callback.",
    "- Require Authorization: Bearer <token>. Compare it in constant time, keep the token in environment/secret storage, and never log or return it. Return 401 for a missing or wrong token.",
    '- Accept limit (1–2500), since (ISO timestamp, inclusive) and cursor query parameters. Return {"data":[...events],"next":"opaque-cursor"}; use next:null on the last page. Return 400 for invalid parameters.',
    "- Make each page fast: index (time, id), use a keyset query (WHERE (time, id) > cursor ORDER BY time, id LIMIT limit), never OFFSET, and select only the columns you send. A 2,500-event page should return in well under a second.",
    "- Order events by (time, id). Make the cursor opaque and stable, and never skip or repeat events at page boundaries or at the since boundary. If the database stores times without a timezone, compare in UTC.",
    "- Build events only from real data that already exists. Do not create new tables. Every event needs a stable unique id (derive it from the source row, e.g. purchase_<rowId>), event_name, user_id and the real time it happened.",
    "- Map billing data to the documented lifecycle events, one event per change, with the exact product_id (e.g. premium_monthly, vip_monthly), billing_period (weekly, monthly, quarterly, yearly, or one_time for one-time payments such as coin packs) and expires_at when access has an end date: start, renewal, one-time purchase (purchase), cancellation (subscription_canceled), payment failure (subscription_billing_retry), restore, expiry and refund. PixlPush keeps a separate state per product and uses these for segment membership rules, so send cancellations and renewals, not only purchases. Map segment changes to segment_entered/segment_exited with segment (the segment’s name).",
    "- Always honour limit: never return more than limit events per page (PixlPush asks for 2500, one page every 2 minutes) and keep each page under 5 MB.",
    "- On every event, include user with the user’s current profile from the database: email, name, language, country, region, timezone, user_type, account_status, platform, email_consent, push_consent. Leave out keys you do not have; do not send null or empty strings. Send email_consent/push_consent only when the user actually made a choice (never guess).",
    "- Optional, only if this app has message or journey history: send message_sent/_delivered/_opened/_clicked/_bounced/_failed/_unsubscribed/_complained with channel, message_id, campaign_id, campaign_name, and journey_step_entered with journey_id, journey_name, step_id, step_name.",
    "- Use only fields and event names from the PixlPush documentation. Do not start crons, queues or emails as part of this endpoint.",
    "- Add focused tests for auth, serialization (including profile fields and consent rules), since filtering, page boundaries, stable ordering and the final-page response. Add the route and the token variable to the project’s setup docs.",
    "- First inspect the repository and report a short plan: which tables become which events, and where each profile field comes from. Then implement, run the relevant checks, and summarize changed files, configuration and deployment steps. Do not claim checks passed unless you ran them.",
    "",
    "PixlPush endpoint contract:",
    "GET https://your-domain.example/pixlpush/events?limit=2500&since=<ISO timestamp>&cursor=<opaque cursor>",
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
              Profile fields (inside user)
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>What to send</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PROFILE.map(([key, about]) => (
                  <TableRow key={key}>
                    <TableCell sx={code}>{key}</TableCell>
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

          <Box sx={{ overflowX: "auto" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              History from your previous tool (optional)
            </Typography>
            <Table size="small">
              <TableBody>
                {HISTORY.map(([when, names]) => (
                  <TableRow key={when}>
                    <TableCell>{when}</TableCell>
                    <TableCell sx={{ ...code, overflowWrap: "anywhere" }}>
                      {names}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {HISTORY_NOTE}
            </Typography>
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
