import { FEED_FETCH, FEED_FETCH_SIZE, FEED_MAX_MB, FEED_MILLION_MINUTES, FEED_PAGE, FEED_TIMEOUT_SECONDS } from "@/lib/webhook-feed";
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
      return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or wrong bearer token" } });
    }

    // PixlPush decides the page size: use it as your database LIMIT, no cap.
    const limit = Number(req.query.limit);
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
  [<code key="id">id</code>, "Required", "Stable unique event id (8–160 characters). Keep it unchanged on retries."],
  [<code key="event_name">event_name</code>, "Required", "Event name (1–120 characters). Use a supported lifecycle name or your own event name."],
  [<code key="user_id">user_id</code>, "Required", "User identifier in the billing provider or your application."],
  [<code key="custom_user_id">custom_user_id</code>, "Optional", "Your application's user id. When provided and non-empty, it takes precedence over user_id."],
  [<code key="time">time</code>, "Required in feed", "Event occurrence time as an ISO date, Unix seconds, or Unix milliseconds."],
  [<code key="user">user</code>, "Recommended", "The user’s current profile as flat scalar values. See Profile fields. Send it on every event; only keys you include are changed."],
  [<code key="properties">properties</code>, "Optional", "Flat event properties with string, number, boolean, or null values."],
  [<code key="product_id">product_id</code>, "Conditional", "Required for subscription and trial lifecycle events."],
  [<code key="expires_at">expires_at</code>, "Optional", "Entitlement access end time. transaction.expires is also accepted."],
  [<code key="billing_period">billing_period</code>, "Optional", "weekly, monthly, quarterly, yearly or one_time. Tells PixlPush whether the product is a subscription or a one-time payment. Detected from product_id or the paid length when left out."],
  [<code key="segment">segment</code>, "Conditional", "Required for segment_entered and segment_exited."],
  [<code key="channel">channel</code>, "Conditional", "email or push. Required for message_* history events."],
  [<code key="message_id">message_id</code>, "Conditional", "Your id for one delivered message. Required for message_* history events."],
  [<code key="campaign_id">campaign_id</code>, "Conditional", "Your campaign id for message_* history events; campaign_name helps PixlPush suggest a match."],
  [<code key="journey_id">journey_id, step_id</code>, "Conditional", "Required for journey_step_entered; journey_name and step_name help PixlPush suggest a match."],
];

const profileFields = [
  [<code key="contact">email, name</code>, "Contact details. An invalid email rejects that one event."],
  [<code key="language">language</code>, "Language code, e.g. en or de."],
  [<code key="country">country, region</code>, "Country and region or city."],
  [<code key="timezone">timezone</code>, "IANA name such as Asia/Karachi. An invalid value is skipped; the rest of the profile still syncs."],
  [<code key="user_type">user_type</code>, "Your plan or user type, e.g. free, premium, trial."],
  [<code key="account_status">account_status</code>, "e.g. active, paused, blocked, deleted."],
  [<code key="platform">platform</code>, "ios, android or web. Shown on the user profile until the PixlPush SDK registers a device."],
  [<code key="consent">email_consent, push_consent</code>, "true or false. Leave the key out when the user never made a choice."],
  ["Any other key", "Saved as a custom property and available in segments."],
];

const lifecycleEvents = [
  ["Trial", "trial_started, trial_canceled, trial_cancelled, trial_converted, trial_expired, trial_billing_retry, trial_billing_retry_entered"],
  ["One-time payment", "purchase, one_time_purchase, purchase_restored (coin packs, credits, lifetime unlocks; send product_id)"],
  ["Subscription", "subscription_started, subscription_renewed, subscription_restored, subscription_upgraded, subscription_downgraded, subscription_product_changed"],
  ["Cancellation and access", "subscription_canceled, subscription_cancelled, subscription_renew_restored, will_renew, subscription_expired, subscription_refunded, in_app_refunded, subscription_revoked"],
  ["Billing retry", "subscription_billing_retry, subscription_billing_retry_entered"],
  ["Account and segments", "account_paused, account_resumed, account_deleted, segment_entered, segment_exited"],
  ["History (optional)", "message_sent, message_delivered, message_opened, message_clicked, message_bounced, message_failed, message_unsubscribed, message_complained, journey_step_entered"],
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
          <Button href="#manual-setup" variant="outlined">Step-by-step setup</Button>
          <Button href="#endpoint" variant="outlined">Read endpoint contract</Button>
        </Stack>
      </CardContent></Card>

      <Section id="manual-setup" title="Set up step by step (without the AI prompt)">
        <Box component="ol" sx={{ pl: 2.5, m: 0, color: "text.secondary", "& li": { mb: 1.5 } }}>
          <li><strong>Look at your backend.</strong> Note your framework, router, database and ORM, and open your real schema. Find the tables for users, purchases or subscriptions, and billing history, and write down their exact column names.</li>
          <li><strong>Generate a token.</strong> Run <code>openssl rand -hex 32</code> and store the result as a server secret, for example <code>PIXLPUSH_FEED_TOKEN</code>. Never commit it or put it in app code.</li>
          <li><strong>Add the route.</strong> Create a public <code>GET /pixlpush/events</code> route next to your existing routes, following their structure.</li>
          <li><strong>Check the token.</strong> Read <code>Authorization: Bearer &lt;token&gt;</code>, compare it in constant time, and return <code>401</code> with a JSON error when it is missing or wrong.</li>
          <li><strong>Read the parameters.</strong> <code>limit</code> is the page size PixlPush asks for: pass it straight to your database <code>LIMIT</code>, with no cap or check of your own. <code>since</code> is an optional ISO timestamp; <code>cursor</code> is the opaque value you returned as <code>next</code>. Return <code>400</code> with a clear JSON message for invalid values.</li>
          <li><strong>Map your rows to events.</strong> Each source row becomes one event with a stable <code>id</code> (e.g. <code>purchase_123</code>), an <code>event_name</code> from the event list below, <code>user_id</code>, and the real <code>time</code> it happened. Subscription events need <code>product_id</code>, <code>billing_period</code> and <code>expires_at</code> when known.</li>
          <li><strong>Write the query.</strong> Filter <code>time &gt;= since</code>, continue after the cursor with <code>WHERE (time, id) &gt; (:time, :id)</code>, <code>ORDER BY time, id</code>, and fetch <code>limit + 1</code> rows to know if there is a next page. Index <code>(time, id)</code> and never use <code>OFFSET</code>. If you combine tables with <code>UNION</code>, give every part the same column names.</li>
          <li><strong>Add the user profile.</strong> Load the profiles for the whole page in one query and put them in <code>user</code> on each event: email, name, language, country, timezone, consent and so on. Leave out keys you do not have.</li>
          <li><strong>Return the page.</strong> Send <code>{'{"data": [...], "next": "cursor"}'}</code>, with <code>next: null</code> on the last page. Encode the last event&apos;s time and id as the cursor, for example base64 JSON.</li>
          <li><strong>Return clear errors.</strong> Every error is JSON like <code>{'{"error": {"code": "INVALID_CURSOR", "message": "cursor is not valid"}}'}</code>. PixlPush shows this message exactly as sent, so never include stack traces, SQL or tokens.</li>
          <li><strong>Test it.</strong> Call it with <code>curl -H &quot;Authorization: Bearer $TOKEN&quot; &quot;https://api.example.com/pixlpush/events?limit=1&quot;</code>, then with a wrong token, a <code>since</code> value, and the returned cursor. Check there are no gaps or duplicates between pages.</li>
          <li><strong>Deploy and connect.</strong> Deploy it on public HTTPS, open Integrations → Webhook, paste the URL and token, and click Connect. If it fails, open Technical details to see your endpoint&apos;s exact response.</li>
        </Box>
      </Section>

      <Section id="endpoint" title="Endpoint and authentication">
        <Body><p>Implement a read-only <code>GET</code> route such as <code>https://api.example.com/pixlpush/events</code>. It must be reachable over public HTTPS. Localhost, private network addresses, redirects, and invalid TLS certificates are rejected.</p></Body>
        <CodeBlock language="HTTP" code={`GET /pixlpush/events?limit=${FEED_FETCH_SIZE}&since=2026-11-24T10%3A00%3A00.000Z&cursor=eyJ... HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer <your-token>\nAccept: application/json`} />
        <Callout tone="warning" title="Keep the feed token private">Generate a unique high-entropy token, store it in your server’s secret manager or environment, and compare it as a bearer credential. Do not put it in browser or mobile code, source control, or application logs. Rotate it by reconnecting with the replacement token.</Callout>
        <Body><p>Return <code>401</code> or <code>403</code> for invalid credentials. Return a successful JSON response only after the page has been read from your data store. The request has a {FEED_TIMEOUT_SECONDS} second timeout, and each response is limited to {FEED_MAX_MB} MB.</p></Body>
      </Section>

      <Section id="pagination" title="Request parameters and pagination">
        <DataTable headers={["Parameter", "Meaning"]} rows={[
          [<code key="limit">limit</code>, `Events per request. PixlPush asks for ${FEED_FETCH_SIZE} at a time and follows next, reading up to ${FEED_PAGE} events per 2-minute cycle until it reaches your last page. Never return more than limit events, and keep each page under ${FEED_MAX_MB} MB. Use limit as-is in your database LIMIT; do not cap or hardcode a page size.`],
          [<code key="since">since</code>, "ISO timestamp checkpoint. Filter inclusively so events at the boundary are not lost."],
          [<code key="cursor">cursor</code>, "Opaque cursor returned in next. Use it to continue the same query on the next page."],
        ]} />
        <Body><p>Return events in stable chronological order. Use a deterministic tie-breaker such as event id when timestamps match. Keep cursor values opaque to the caller. If a page has more events, return a non-empty <code>next</code> cursor; return <code>null</code> when it is the final page. PixlPush may re-read an overlapping time range, so keep event ids stable and make reading the feed safe to repeat.</p></Body>
        <CodeBlock language="JSON" code={responseExample} />
      </Section>

      <Section id="performance" title="Make the feed fast">
        <Body><p>PixlPush waits up to {FEED_TIMEOUT_SECONDS} seconds for each page. Aim for about a second per {FEED_FETCH}-event request:</p></Body>
        <Box component="ul" sx={{ pl: 2.5, m: 0, color: "text.secondary", "& li": { mb: 1 } }}>
          <li>Index the columns you order and filter by, for example <code>(occurred_at, id)</code>.</li>
          <li>Use a keyset cursor: <code>WHERE (occurred_at, id) &gt; (:time, :id) ORDER BY occurred_at, id LIMIT :limit</code>. Never use <code>OFFSET</code>; it gets slower on every page.</li>
          <li>Select only the columns you send, and load each user’s profile in one query for the whole page, not one query per event.</li>
          <li>Keep times in UTC when comparing with <code>since</code> and the cursor.</li>
        </Box>
      </Section>

      <Section id="event-schema" title="Event fields">
        <DataTable headers={["Field", "Requirement", "Description"]} rows={fields} code={false} minWidth={760} />
        <Body><p>Each <code>data</code> item is one event. Profile and property objects must be flat maps of scalar values: strings (up to 2,000 characters), numbers, booleans, or null. Unknown top-level event fields are ignored. The event <code>time</code> must represent when it actually occurred, not when this endpoint was queried.</p></Body>
        <Callout title="Identity matching">Set <code>custom_user_id</code> to your stable application user id when a billing provider supplies a different <code>user_id</code>. PixlPush uses the non-empty <code>custom_user_id</code> as the user identity.</Callout>
      </Section>

      <Section id="profile" title="Profile fields">
        <DataTable headers={["Key inside user", "What to send"]} rows={profileFields} code={false} minWidth={760} />
        <Body><p>Send the user’s current profile on every event. A key you leave out never clears anything, so you can send only what you have. Push permission and push tokens come from the PixlPush SDK in your app; from the server, send <code>push_consent</code> and <code>platform</code>.</p></Body>
        <Callout title="Consent is never guessed">Only <code>email_consent</code> and <code>push_consent</code> change consent, and only when the key is present. Do not send <code>false</code> for users who were never asked.</Callout>
      </Section>

      <Section id="events" title="Lifecycle event names">
        <DataTable headers={["Category", "Accepted event names"]} rows={lifecycleEvents} code={false} minWidth={760} />
        <Body><p>Every <code>product_id</code> is processed automatically: PixlPush keeps each user&apos;s current subscription state per product, with no setup. In 3.1 Segments, membership rules pick the exact products, events or data, and user types that put users in a lifecycle segment and take them out, so Premium and VIP never mix.</p></Body>
        <Body><p>Segments your server sends (<code>segment_entered</code> / <code>segment_exited</code>) are listed under Integrations → Webhook → 3.1, <b>turned off</b>, with three columns: your segment, the PixlPush lifecycle segment, and its membership rules. For the PixlPush lifecycle segment, pick a predefined one (for example “Expired subscription” or “Paywall drop-off”) or create a custom one, such as “VIP Cancelled”, and rename it with the pencil.</p></Body>
        <Body><p><b>Membership rules</b> decide who is in the segment from your subscription data: <b>Product</b> (exact <code>product_id</code>s), <b>Event / data</b> (for example <code>subscription_canceled</code> and <code>billing_retry</code>) and <b>User type</b> (<code>user.user_type</code>, or Any). PixlPush prefills them from the events your server actually sent; review them, turn the row on and publish. A user enters and stays while one of those products is in a matching state and the user type matches, and leaves as soon as that product&apos;s state changes or the user type no longer matches. Other products never change the segment, so Premium and VIP stay separate. A row without rules follows your <code>segment_entered</code> and <code>segment_exited</code> events instead.</p></Body>
        <Body><p>Subscription and trial events update the user’s subscription entitlement and are also recorded as events. They require <code>product_id</code>. PixlPush keeps a separate current state for each product, and an older event never replaces newer state. Cancellation, billing retry and grace period keep access until <code>expires_at</code>; when that time passes PixlPush marks the subscription expired on its own, never earlier. Send <code>subscription_expired</code> when access ends early or when there is no end date. <code>account_deleted</code> removes the user. <code>segment_entered</code> and <code>segment_exited</code> require a <code>segment</code> name.</p></Body>
        <Body><p>Custom event names are also accepted and stored as events. Include the same event id and event data if you retry a read or replay an event.</p></Body>
      </Section>

      <Section id="push" title="Real-time push (optional)">
        <Body><p>The feed above is pulled every 2 minutes. For live events, especially purchases, your server can also <b>push</b> each event to PixlPush the moment it happens. Accepted events are stored and applied immediately; users, plans, segments and journeys can update within seconds. Keep the feed for history and recovery if a push fails.</p></Body>
        <DataTable headers={["Item", "Value"]} rows={[
          ["URL", "The push URL shown on Integrations → Webhook (POST)."],
          ["Authentication", "Authorization: Bearer <push key>. Create a named key on the Webhook page; it is scoped to records:write. Reveal or copy it from the active key list (reveals are audited), then store it in server-side secret storage. It is separate from the token PixlPush uses to read your feed. Never put it in a browser or mobile app. Revoke keys that are no longer needed."],
          ["Body and limits", "One event in the feed format, or {\"data\": [...]} with 1–500 events. Maximum request size is 2 MB; rate limit is 1,000 requests per minute per key. The endpoint rejects browser-origin requests."],
          ["Duplicates", "Use the same stable event id and payload in your feed and push. PixlPush deduplicates by event id across push, pull and retries. Do not make a new id per attempt, change the event under an existing id, or send the same business action from multiple hooks/SDKs."],
          ["Delivery", "A 202 response means valid events were stored and applied immediately. Inspect accepted, duplicates, rejected and each result; a mixed batch can return 202 with some rejected events."],
        ]} code={false} minWidth={640} />
        <CodeBlock language="HTTP" code={'POST /server/v1/webhook/events HTTP/1.1\nHost: <PixlPush API host from the Webhook page>\nAuthorization: Bearer pp_srv_live_...\nContent-Type: application/json\n\n{"id":"pur_123","event_name":"purchase","user_id":"42","time":"2026-11-26T10:00:00Z","product_id":"coins_500","billing_period":"one_time","user":{"email":"ana@example.com"}}'} />
        <DataTable headers={["Response", "Meaning"]} rows={[
          ["202", "Valid events were stored and applied. The response includes accepted / duplicates / rejected counts and one result per event. Do not retry accepted or duplicate events."],
          ["400", "Every event in the request is invalid; each result names the field to fix. Correct the payload before retrying."],
          ["401", "Missing, wrong or revoked push key."],
          ["403", "A key from another source, or the request came from a browser. Push keys are for servers only."],
          ["409", "The Webhook connection is paused or has no active mapping; resume/connect it in PixlPush."],
          ["422", "The batch is empty or has more than 500 events."],
          ["413", "The request body exceeds 2 MB; split it into smaller batches without changing event ids."],
          ["429 / 5xx / network failure", "Retry with capped backoff and the exact same event ids and payloads. Do not retry 401/403/409 until the configuration is fixed."],
        ]} code={false} minWidth={640} />
        <Callout tone="warning" title="Forward events; do not create another send">Use one canonical server-side producer for each business action. Push and pull can carry the same event safely when its id and payload stay identical. Do not also emit the same action from another hook or SDK, and do not send a customer notification from the forwarding handler. A PixlPush event can affect configured journeys; duplicate event ids are ignored to prevent duplicate downstream processing.</Callout>
      </Section>

      <Section id="history" title="Campaign and journey history (optional)">
        <Body><p>If you are moving from another messaging tool, you can include its history in the same feed. Message events (<code>message_sent</code>, <code>message_delivered</code>, <code>message_opened</code>, <code>message_clicked</code>, <code>message_bounced</code>, <code>message_failed</code>, <code>message_unsubscribed</code>, <code>message_complained</code>) need <code>channel</code>, <code>message_id</code> and <code>campaign_id</code>. <code>journey_step_entered</code> needs <code>journey_id</code> and <code>step_id</code>.</p></Body>
        <Body><p>On the Webhook page, step 3.3 maps your campaigns to PixlPush email and push campaigns, and your journeys and steps to PixlPush journeys. The history then appears on user profiles, campaign reports and journey pages, marked as imported.</p></Body>
        <Callout tone="warning" title="History never sends">Imported history is never counted as a PixlPush send, never sends a message, and never moves anyone through a journey. PixlPush records push opens but not push clicks, so push click events are not stored.</Callout>
      </Section>

      <Section id="matching" title="How PixlPush matches your data">
        <Body><p>After connecting, PixlPush reads a sample of your feed and compares each profile field and event name with what it already knows: standard fields, standard Webhook events, and the events already in your project. Each item gets one of these states on the Webhook page under Map data.</p></Body>
        <DataTable code={false} headers={["State", "Meaning"]} rows={[
          ["Matched", "An exact match, or a mapping someone confirmed. Applied to new data."],
          ["Suggested", "A close match, such as a different spelling. Not applied until someone confirms it."],
          ["Needs mapping", "Nothing close. The data is still stored: fields as custom properties, events under their own name."],
        ]} />
        <Body><p>Click the pencil next to an event to pick a suggestion, choose another PixlPush event, or create a custom event. A custom event needs a description of what it means and when it happens, so your team and PixlPush AI features understand it. PixlPush refuses a name that already exists, including the same name in another spelling.</p></Body>
        <Callout title="Consent and identity are never guessed">Only <code>email_consent</code> and <code>push_consent</code> are treated as consent, and users are always matched by <code>custom_user_id</code> or <code>user_id</code>. Confirmed mappings apply to new data only; they do not change data already synced or send messages.</Callout>
      </Section>

      <Section id="journey-migrations" title="Journey migration and message content">
        <Callout tone="warning" title="The event feed does not import journey definitions">The Webhook feed imports user, subscription, segment, and event data. Journey migration is a separate staged workflow under Integrations → Webhook. It maps participants to journeys and steps that already exist in the PixlPush project.</Callout>
        <Body><p>A staged participant row is associated with an existing PixlPush user by <code>externalUserId</code>, an existing target journey by <code>journeyId</code>, and a target step by <code>resumeAtStepKey</code>. <code>enteredAt</code>, <code>nextRunAt</code>, and <code>entryNumber</code> are retained. Each <code>completedSteps</code> item records the target <code>stepKey</code>, one supported outcome (<code>sent</code>, <code>delivered</code>, <code>opened</code>, or <code>clicked</code>), timestamps, and optional <code>sourceMessageId</code>. These outcomes are stored against the staged participant and step so the journey runner can skip messages already sent.</p></Body>
        <Body><p>PixlPush email templates store subject, preview text, HTML/text bodies, editor design, and translations. Push templates store title, body, image URL, deep link, data payload, and translations. A migration can reuse templates already in the project by their PixlPush template IDs; the migration does not import external template content or preserve external campaign/template IDs. Email and push campaigns reference those templates, but standalone campaign records are not imported. Journey steps support email and push plus delay, condition, repeat, A/B test, and exit behavior; there is no in-app journey step.</p></Body>
        <Callout title="Staging never sends">Imported participants remain staged and imported step outcomes are migration records. Importing users, content references, or history does not activate a journey or send a message. Cutover requires the separate drain, source-hold, comparison, and approval steps; after cutover, a project owner must explicitly resume the journey. Completion, pause, and exit states from the source are not represented by the participant import and must be reconciled manually.</Callout>
      </Section>

      <Section id="implementation" title="Express implementation shape">
        <Body><p>This example shows the HTTP boundary and auth check. Connect <code>eventRepository.listForPixlPush</code> to your database and implement its cursor using the last event’s timestamp and id. Keep the query bounded by the requested limit.</p></Body>
        <CodeBlock language="TypeScript" filename="routes/pixlpush-events.ts" code={expressExample} />
      </Section>

      <Section id="verify" title="Test before connecting">
        <Box component="ol" sx={{ pl: 2.5, m: 0, color: "text.secondary", "& li": { mb: 1 } }}>
          <li>Call the endpoint with the bearer token and verify it returns valid JSON in the documented shape.</li>
          <li>Check that an incorrect token receives 401 or 403, and that the token is absent from logs and responses.</li>
          <li>Request a small limit, follow the returned cursor, and confirm pages contain no gaps or duplicates and never more than limit events.</li>
          <li>Replay the same page and confirm every event keeps the same id and occurrence time.</li>
          <li>Open Integrations → Webhook in PixlPush, paste the public URL and token, and connect. The connection check requests one event before it is saved.</li>
        </Box>
        <Callout tone="success" title="After connecting">Every 2 minutes PixlPush reads up to {FEED_PAGE} events ({FEED_FETCH} per request) and applies them before the next cycle, so a first import of 1,000,000 events takes at least {FEED_MILLION_MINUTES} minutes; after that each run picks up only new events. The status shows “Importing” until it is up to date. Check profile fields and plans under Map data, and turn on the segments you want.</Callout>
      </Section>
    </Stack>
  </DashboardFrame>;
}
