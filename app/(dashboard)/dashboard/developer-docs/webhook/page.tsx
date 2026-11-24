import { ArrowBackRounded } from "@mui/icons-material";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { Body, Callout, DataTable, Section } from "@/components/docs/DocsPrimitives";
import CodeBlock from "@/components/docs/CodeBlock";
import { LinkButton } from "@/components/docs/links";

export const metadata = { title: "Webhook Integration — Developer Documentation — PixlPush" };

const responseExample = `{
  "data": [
    {
      "id": "evt_1001",
      "event_name": "subscription_canceled",
      "user_id": "12345",
      "time": "2026-11-24T10:00:00Z",
      "product_id": "premium_monthly",
      "transaction": { "expires": "2026-12-24T10:00:00Z" },
      "user": {
        "email": "ana@example.com",
        "name": "Ana",
        "email_consent": true
      }
    }
  ],
  "next": null
}`;

const expressExample = `import express from "express";
import { timingSafeEqual } from "node:crypto";

const app = express();
const feedToken = process.env.PIXLPUSH_WEBHOOK_TOKEN;

function validBearer(header: string | undefined) {
  if (!feedToken || !header?.startsWith("Bearer ")) return false;
  const candidate = Buffer.from(header.slice(7));
  const expected = Buffer.from(feedToken);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

app.get("/pixlpush/events", async (req, res, next) => {
  try {
    if (!validBearer(req.header("authorization"))) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requestedLimit = Number(req.query.limit ?? 500);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 500) {
      return res.status(400).json({ error: "limit must be an integer from 1 to 500" });
    }
    const limit = requestedLimit;
    const since = typeof req.query.since === "string" ? req.query.since : undefined;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    // Implement this with your database. Order by (occurredAt, id), apply the
    // since filter inclusively, and encode the last row as an opaque cursor.
    const page = await eventRepository.listForPixlPush({ limit, since, cursor });
    return res.json({ data: page.events, next: page.nextCursor ?? null });
  } catch (error) {
    return next(error);
  }
});`;

const fields = [
  [<code>id</code>, "Required", "Stable unique event id (8–160 characters). Keep it unchanged on retries."],
  [<code>event_name</code>, "Required", "Event name (1–120 characters). Use a supported lifecycle name or your own event name."],
  [<code>user_id</code>, "Required", "User identifier in the billing provider or your application."],
  [<code>custom_user_id</code>, "Optional", "Your application's user id. When provided and non-empty, it takes precedence over user_id."],
  [<code>time</code>, "Required in feed", "Event occurrence time as an ISO date, Unix seconds, or Unix milliseconds."],
  [<code>user</code>, "Optional", "Flat profile fields. Scalar values only; email_consent and push_consent are treated as consent flags."],
  [<code>properties</code>, "Optional", "Flat event properties with string, number, boolean, or null values."],
  [<code>product_id</code>, "Conditional", "Required for subscription and trial lifecycle events."],
  [<code>expires_at</code>, "Optional", "Entitlement access end time. transaction.expires is also accepted."],
  [<code>segment</code>, "Conditional", "Required for segment_entered and segment_exited."],
];

const lifecycleEvents = [
  ["Trial", "trial_started, trial_canceled, trial_cancelled, trial_converted, trial_expired, trial_billing_retry, trial_billing_retry_entered"],
  ["Subscription", "subscription_started, subscription_renewed, subscription_upgraded, subscription_downgraded, subscription_product_changed"],
  ["Cancellation and access", "subscription_canceled, subscription_cancelled, subscription_renew_restored, will_renew, subscription_expired, subscription_refunded, in_app_refunded, subscription_revoked"],
  ["Billing retry", "subscription_billing_retry, subscription_billing_retry_entered"],
  ["Account and segments", "account_deleted, segment_entered, segment_exited"],
];

export default function WebhookDeveloperDocsPage() {
  return <DashboardFrame requiresProject active="Developer documentation" title="Webhook integration" description="Build a secure, paginated event feed that PixlPush can sync from your backend.">
    <Stack gap={2.5} sx={{ maxWidth: 980 }}>
      <LinkButton href="/dashboard/developer-docs" startIcon={<ArrowBackRounded />} sx={{ alignSelf: "flex-start" }}>Developer documentation</LinkButton>
      <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h3">Connect events from your server</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>The Webhook integration is a server-to-server pull feed. PixlPush makes authenticated GET requests to an endpoint in your application and imports the returned user, subscription, and event data.</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
          <LinkButton href="/dashboard/integrations/webhook" variant="contained">Open Webhook setup</LinkButton>
          <Button href="#endpoint" variant="outlined">Read endpoint contract</Button>
        </Stack>
      </CardContent></Card>

      <Section id="endpoint" title="Endpoint and authentication">
        <Body><p>Implement a read-only <code>GET</code> route such as <code>https://api.example.com/pixlpush/events</code>. It must be reachable over public HTTPS. Localhost, private network addresses, redirects, and invalid TLS certificates are rejected.</p></Body>
        <CodeBlock language="HTTP" code={'GET /pixlpush/events?limit=500&since=2026-11-24T10%3A00%3A00.000Z&cursor=eyJ... HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer <your-token>\nAccept: application/json'} />
        <Callout tone="warning" title="Keep the feed token private">Generate a unique high-entropy token, store it in your server's secret manager or environment, and compare it as a bearer credential. Do not put it in browser or mobile code, source control, or application logs. Rotate it by reconnecting with the replacement token.</Callout>
        <Body><p>Return <code>401</code> or <code>403</code> for invalid credentials. Return a successful JSON response only after the page has been read from your data store. The request has a 15 second timeout, and each response is limited to 5 MB.</p></Body>
      </Section>

      <Section id="pagination" title="Request parameters and pagination">
        <DataTable headers={["Parameter", "Meaning"]} rows={[
          [<code>limit</code>, "Maximum events requested per page; PixlPush requests 500."],
          [<code>since</code>, "ISO timestamp checkpoint. Filter inclusively so events at the boundary are not lost."],
          [<code>cursor</code>, "Opaque cursor returned in next. Use it to continue the same query on the next page."],
        ]} />
        <Body><p>Return events in stable chronological order. Use a deterministic tie-breaker such as event id when timestamps match. Keep cursor values opaque to the caller. If a page has more events, return a non-empty <code>next</code> cursor; return <code>null</code> when it is the final page. PixlPush may re-read an overlapping time range, so keep event ids stable and make reading the feed safe to repeat.</p></Body>
        <CodeBlock language="JSON" code={responseExample} />
      </Section>

      <Section id="event-schema" title="Event fields">
        <DataTable headers={["Field", "Requirement", "Description"]} rows={fields} code={false} minWidth={760} />
        <Body><p>Each <code>data</code> item is one event. Profile and property objects must be flat maps of scalar values: strings (up to 2,000 characters), numbers, booleans, or null. Unknown top-level event fields are ignored. The event <code>time</code> must represent when it actually occurred, not when this endpoint was queried.</p></Body>
        <Callout title="Identity matching">Set <code>custom_user_id</code> to your stable application user id when a billing provider supplies a different <code>user_id</code>. PixlPush uses the non-empty <code>custom_user_id</code> as the user identity.</Callout>
      </Section>

      <Section id="events" title="Lifecycle event names">
        <DataTable headers={["Category", "Accepted event names"]} rows={lifecycleEvents} code={false} minWidth={760} />
        <Body><p>Subscription and trial events update the user's subscription entitlement and are also recorded as events. They require <code>product_id</code>. Cancellation schedules access to end; send <code>subscription_expired</code> when access actually ends. <code>account_deleted</code> removes the user. <code>segment_entered</code> and <code>segment_exited</code> require a <code>segment</code> name.</p></Body>
        <Body><p>Custom event names are also accepted and stored as events. Include the same event id and event data if you retry a read or replay an event.</p></Body>
      </Section>

      <Section id="journey-migrations" title="Journey migration and message content">
        <Callout tone="warning" title="The event feed does not import journey definitions">The Webhook feed imports user, subscription, segment, and event data. Journey migration is a separate staged workflow under Integrations → Webhook. It maps participants to journeys and steps that already exist in the PixlPush project.</Callout>
        <Body><p>A staged participant row is associated with an existing PixlPush user by <code>externalUserId</code>, an existing target journey by <code>journeyId</code>, and a target step by <code>resumeAtStepKey</code>. <code>enteredAt</code>, <code>nextRunAt</code>, and <code>entryNumber</code> are retained. Each <code>completedSteps</code> item records the target <code>stepKey</code>, one supported outcome (<code>sent</code>, <code>delivered</code>, <code>opened</code>, or <code>clicked</code>), timestamps, and optional <code>sourceMessageId</code>. These outcomes are stored against the staged participant and step so the journey runner can skip messages already sent.</p></Body>
        <Body><p>PixlPush email templates store subject, preview text, HTML/text bodies, editor design, and translations. Push templates store title, body, image URL, deep link, data payload, and translations. A migration can reuse templates already in the project by their PixlPush template IDs; the migration does not import external template content or preserve external campaign/template IDs. Email and push campaigns reference those templates, but standalone campaign records are not imported. Journey steps support email and push plus delay, condition, repeat, A/B test, and exit behavior; there is no in-app journey step.</p></Body>
        <Callout title="Staging never sends">Imported participants remain staged and imported step outcomes are migration records. Importing users, content references, or history does not activate a journey or send a message. Cutover requires the separate drain, source-hold, comparison, and approval steps; after cutover, a project owner must explicitly resume the journey. Completion, pause, and exit states from the source are not represented by the participant import and must be reconciled manually.</Callout>
      </Section>

      <Section id="implementation" title="Express implementation shape">
        <Body><p>This example shows the HTTP boundary and auth check. Connect <code>eventRepository.listForPixlPush</code> to your database and implement its cursor using the last event's timestamp and id. Keep the query bounded by the requested limit.</p></Body>
        <CodeBlock language="TypeScript" filename="routes/pixlpush-events.ts" code={expressExample} />
      </Section>

      <Section id="verify" title="Test before connecting">
        <Box component="ol" sx={{ pl: 2.5, m: 0, color: "text.secondary", "& li": { mb: 1 } }}>
          <li>Call the endpoint with the bearer token and verify it returns valid JSON in the documented shape.</li>
          <li>Check that an incorrect token receives 401 or 403, and that the token is absent from logs and responses.</li>
          <li>Request a small limit, follow the returned cursor, and confirm pages contain no gaps or duplicates.</li>
          <li>Replay the same page and confirm every event keeps the same id and occurrence time.</li>
          <li>Open Integrations → Webhook in PixlPush, paste the public URL and token, and connect. The connection check requests one event before it is saved.</li>
        </Box>
        <Callout tone="success" title="After connecting">Use the Webhook page's sync controls and sample data to confirm events and profile fields are arriving. Map profile fields and product tiers there if your source uses different names.</Callout>
      </Section>
    </Stack>
  </DashboardFrame>;
}
