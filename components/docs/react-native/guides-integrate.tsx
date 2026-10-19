import CodeBlock from "../CodeBlock";
import CodeTabs from "../CodeTabs";
import { Body, Callout, Checklist, DataTable, List, Section, SubHeading } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { code } from "./content";
import { rn, type GuideProps } from "./guides-setup";

export function Identity({ base }: GuideProps) {
  return <>
    <Section id="model" title="Users, installations, IDs">
      <DataTable headers={["ID", "What it identifies", "Lifetime"]} rows={[
        ["deviceId", "This install. A random UUID created on first launch — not a hardware ID.", "Until the app is uninstalled or its storage cleared."],
        ["anonymousId", "The PixlPush user of this install while nobody is logged in.", "Until identify() or reset()."],
        ["pixlpushId", "The permanent PixlPush user ID (pixlpush_…).", "Kept across launches and logins; replaced by reset(), or by the existing user’s ID when a login matches someone already known."],
        ["externalUserId", "Your user’s ID, set by identify().", "Until reset()."],
      ]} />
      <Body>Every install has a user from its first launch, so pre-login behaviour is never lost.</Body>
    </Section>
    <Section id="identify" title="Identify after login">
      <CodeBlock code={code.identify} filename="src/auth/pixlpush-session.ts" highlight={[4, 13, 18]} />
      <List items={[
        "Use your stable internal user ID (1–255 characters). Not an email or phone number: those change.",
        "Call it after every successful login or signup, and on app start when a session is restored. Repeating it is safe.",
        "Profile fields you omit are left as they are on the server.",
      ]} />
    </Section>
    <Section id="update" title="Update user properties">
      <CodeBlock code={code.updateUser} />
      <Body>Works for anonymous and identified users. Property values are strings, numbers, booleans or null (dates become ISO strings).</Body>
    </Section>
    <Section id="merge" title="Anonymous to identified">
      <DataTable code={false} headers={["When identify() runs for…", "PixlPush"]} rows={[
        ["A user PixlPush hasn’t seen", "Attaches your ID to this install’s anonymous user. Same row, same pixlpushId, history kept."],
        ["A user already known (other device, reinstall)", "Moves this install’s anonymous activity into the existing user and returns that user’s pixlpushId, which the SDK stores."],
      ]} />
    </Section>
    <Section id="switch" title="Switching accounts">
      <Body>If <code>identify()</code> is called for a different user while one is logged in, the SDK starts a fresh device user first so the new account can’t inherit the previous one. Still, call <code>reset()</code> at logout: it is what unlinks the device on the server.</Body>
    </Section>
    <Section id="reset" title="Reset on logout">
      <List ordered items={[
        "Queues an unlink of this installation on the server, which also deactivates its push tokens — the former user stops receiving notifications on this device.",
        "Clears the external ID and the session.",
        "Creates a new anonymous user and pixlpushId, and queues its identity.",
        "Flushes.",
      ]} />
      <Callout tone="note" title="History is retained">The former user, their events and their other devices stay in PixlPush. Deleting a user’s data is a separate, server-side responsibility.</Callout>
      <Body>The token is re-registered for the new anonymous user the next time <code>syncPushToken()</code> runs (automatically on the next foreground).</Body>
    </Section>
  </>;
}

export function Events({ base }: GuideProps) {
  return <>
    <Section id="track" title="Track an event">
      <CodeBlock code={code.track} />
      <Body>Each event is enriched with the current user, installation ID, session ID, environment, platform and timestamp, queued, and its client-generated ID returned.</Body>
    </Section>
    <Section id="rules" title="Names and properties">
      <DataTable headers={["Rule", "Limit"]} code={false} rows={[
        ["Event name", "Non-empty, at most 120 characters, no “@” or “://”. Use past-tense snake_case: checkout_completed."],
        ["Properties", "At most 100 keys. Values: string (≤ 2,000 chars), number, boolean, null or Date. No nested objects or arrays."],
        ["Blocked keys", "Keys matching password, secret, access_token, refresh_token, api_key, auth_token, credit_card, cvv or ssn throw VALIDATION_ERROR."],
      ]} />
      <Callout tone="danger" title="Minimize what you send">The key filter is a safety net, not a policy. Don’t send passwords, tokens, card data, credentials, health data, or free text that may contain personal data.</Callout>
      <Body>Don’t track <code>app_opened</code>, <code>app_backgrounded</code> or notification opens yourself: the SDK records the first two, and opens are attributed through a separate request.</Body>
    </Section>
    <Section id="options" title="TrackOptions & idempotency">
      <DataTable headers={["Option", "Default", "Use"]} rows={[
        ["eventId", "random UUID", "Stable ID for a business action, so a retried action can be de-duplicated."],
        ["timestamp", "now", "When it happened (Date or ISO string)."],
        ["sessionId", "current session", "Override only if you manage sessions yourself."],
        ["source", "—", "Where in the app it happened, e.g. checkout_screen."],
      ]} />
      <CodeBlock code={code.idempotent} />
      <Callout tone="tip" title="Duplicates in development">React Strict Mode runs effects twice. Track from user actions (handlers), not from mount effects.</Callout>
    </Section>
    <Section id="batch" title="trackBatch">
      <CodeBlock code={code.batch} />
    </Section>
    <Section id="typed" title="A typed tracking helper">
      <CodeBlock code={code.typed} filename="src/analytics/events.ts" />
    </Section>
    <Section id="consent" title="Consent">
      <CodeBlock code={code.consent} />
      <List items={[
        <>Analytics consent is allowed until set to <code>false</code>. Then <code>track()</code> drops events (still returning an ID) — they are not queued for later.</>,
        "Email and push marketing consent are saved and sent to PixlPush, for the anonymous or identified user.",
        "Choices persist across launches and merge with earlier ones.",
        <>Marketing push consent is not the OS notification permission. Ask for that separately (<LinkBox href={rn(base, "push", "permission")} sx={{ color: "inherit" }}>Ask for permission</LinkBox>).</>,
      ]} />
    </Section>
    <Section id="queue" title="Offline queue & retries">
      <List items={[
        "Every call is queued and persisted (with AsyncStorage) before sending, in FIFO order. Consecutive events are sent together, up to 100 per request.",
        "The queue flushes every 15 seconds, when the app comes to the foreground, and when it goes to the background.",
        "Network errors, timeouts, 5xx and 429 are retried with exponential backoff (2 s doubling to 60 s, ±20% jitter; Retry-After is honoured).",
        <>Rejected items (401, 403, 413, 422) are discarded, not retried. A rejected batch is retried one event at a time so valid events survive. <code>SDK_KEY_INVALID</code>, <code>SDK_KEY_PROJECT_MISMATCH</code> and <code>PROJECT_INACTIVE</code> also stop the current flush.</>,
        "Up to 1,000 items, for 7 days. When full, the oldest event or open is dropped first and QUEUE_FULL is reported to onError.",
        "Without AsyncStorage the queue is in memory and lost when the app closes.",
        "If the OS kills the app before a flush finishes, the remaining items are sent on the next launch.",
      ]} />
      <CodeBlock code={code.flush} />
    </Section>
    <Section id="lifecycle" title="Lifecycle & sessions">
      <DataTable headers={["Event", "When", "Properties"]} rows={[
        ["app_opened", "configure(), and each return to the foreground", "from_background: boolean"],
        ["app_backgrounded", "Each move to the background", "session_duration_seconds: number"],
      ]} />
      <Body>Turn both off with <code>trackLifecycleEvents: false</code>. A session ends after 30 minutes without activity (<code>sessionInactivityTimeoutMs</code>).</Body>
      <Callout tone="warning" title="There is no ‘app killed’ event">Mobile OSes don’t tell apps when they’re force-quit, so the SDK never reports one. Treat app_backgrounded as the last reliable signal.</Callout>
    </Section>
  </>;
}

export function Push({ base }: GuideProps) {
  return <>
    <Section id="how" title="How push works">
      <List ordered items={[
        <>Your app is configured for Firebase, and PixlPush has the service account (<LinkBox href={rn(base, "firebase")} sx={{ color: "inherit" }}>Firebase & push setup</LinkBox>).</>,
        "The user grants permission; the SDK sends the device’s FCM token, linked to the current user and installation.",
        "PixlPush sends through FCM (FCM relays to APNs on iOS) with a pp_job_id in the data payload.",
        "A tap is reported back with that job ID, which attributes the open to the campaign or journey.",
      ]} />
      <Callout tone="warning" title="FCM tokens only">PixlPush 0.2.0 delivers only to tokens registered with provider <code>&quot;fcm&quot;</code>. Raw APNs tokens and Expo push tokens are stored but never receive a notification.</Callout>
      <Body>Tokens rotate and can move between users on a shared device. Never use one as a user identifier.</Body>
    </Section>
    <Section id="listeners" title="Register listeners first">
      <CodeBlock code={code.listeners} filename="src/lib/pixlpush-listeners.ts" />
      <Body>Each listener returns an unsubscribe function. Module-level listeners live for the app’s lifetime; inside components, unsubscribe in the effect cleanup.</Body>
    </Section>
    <Section id="permission" title="Ask for permission">
      <CodeBlock code={code.permission} filename="src/notifications/enable-notifications.ts" />
      <List items={[
        "Ask in context (after onboarding, or from a toggle), not at launch: a denied iOS prompt can’t be shown again.",
        "Android 13+ needs the POST_NOTIFICATIONS runtime permission; earlier versions grant it at install.",
        "iOS provisional permission is reported as \"provisional\" and still receives quiet notifications.",
      ]} />
    </Section>
    <Section id="tokens" title="Token sync">
      <DataTable headers={["Trigger", "What happens"]} rows={[
        ["configure() with autoPush", "syncPushToken() runs once."],
        ["App returns to foreground", "syncPushToken() runs again — this also catches permission granted later in Settings."],
        ["FCM token refresh", "The new token is sent automatically."],
        ["syncPushToken() yourself", "After your permission prompt, and after identify()/reset()."],
      ]} />
      <Body><code>syncPushToken()</code> reads the Firebase permission: authorized or provisional sends the token; denied sends <code>updatePushPermission(&quot;denied&quot;)</code>. Without React Native Firebase it does nothing.</Body>
    </Section>
    <Section id="states" title="Foreground, background, cold start">
      <DataTable code={false} headers={["App state", "Receipt", "Tap"]} rows={[
        ["Foreground", "Not shown by FCM. Forward onMessage (below).", "Automatic if you re-post with expo-notifications and keep data; otherwise call handleNotificationResponse() from your UI."],
        ["Background", "Shown by the OS.", "Automatic: recorded and notification_opened emitted."],
        ["Quit (cold start)", "Shown by the OS.", "Automatic during configure() — which is why listeners must exist first."],
      ]} />
      <Body>FCM doesn’t display a notification while your app is open. Pick one:</Body>
      <CodeTabs label="Foreground handling" options={{
        "Re-post with expo-notifications (recommended)": { code: code.foregroundRepost, language: "TypeScript", filename: "src/notifications/foreground.ts" },
        "Your own in-app banner": { code: code.foreground, language: "TypeScript", filename: "src/notifications/foreground.ts" },
      }} />
      <Callout tone="warning" title="Keep data: message.data when re-posting">The tap is attributed from <code>pp_job_id</code> inside <code>data</code>. Drop it and the open isn’t counted.</Callout>
      <Body><code>getInitialNotification()</code> on the SDK only returns a payload you stored with <code>setInitialNotification()</code>; it does not ask Firebase. You don’t need it with React Native Firebase.</Body>
    </Section>
    <Section id="actions" title="Actions and deep links">
      <Body>A plain tap emits <code>notification_opened</code>; an action button emits <code>notification_action</code> with its <code>actionId</code>. The normalized payload exposes <code>deepLink</code> (from <code>deepLink</code>, <code>url</code> or <code>link</code> in data), <code>title</code>, <code>body</code>, <code>campaignId</code>, <code>journeyId</code> and the raw <code>data</code>. On a cold start, queue navigation until your navigator is ready.</Body>
    </Section>
    <Section id="attribution" title="Open attribution">
      <List items={[
        <>An open is recorded only when the payload carries <code>pp_job_id</code> (or <code>notificationJobId</code>) — PixlPush adds it to every notification it sends.</>,
        "Opens are sent immediately (the queue is flushed), separately from your events.",
        "A tap reported by both Firebase and expo-notifications is recorded once per job ID.",
      ]} />
    </Section>
    <Section id="expo-notifications" title="Using expo-notifications">
      <Body>If <code>expo-notifications</code> is installed, the SDK also records taps from its response listener. For tokens, React Native Firebase is the supported path on both platforms. Without it, Android can still register its FCM device token:</Body>
      <CodeBlock code={code.expoToken} />
      <Body>On iOS <code>getDevicePushTokenAsync()</code> returns a raw APNs token, which PixlPush 0.2.0 can’t deliver to — use React Native Firebase on iOS.</Body>
    </Section>
    <Section id="manual" title="Manual integration">
      <Body>If another library (such as Notifee) owns tokens and taps, set <code>autoPush: false</code> and report them yourself.</Body>
      <CodeBlock code={code.manualPush} />
    </Section>
    <Section id="test" title="Test matrix">
        <Checklist items={[
          "Android and iOS release-like builds on physical devices.",
          "Permission granted, denied, and granted later in Settings (then foreground the app).",
          "Foreground receipt shows your in-app UI.",
          "Background tap and cold-start tap both open the deep link and are attributed.",
          "Action buttons reach addNotificationActionListener.",
          "Token refresh (reinstall) re-registers.",
          "Logout: the former user no longer receives pushes on this device.",
        ]} />
      <SubHeading>Verify in PixlPush</SubHeading>
      <Body>Project settings → Firebase / FCM shows the active device-token count under <b>Token sync</b>; send a test push to your QA user and confirm its open is counted.</Body>
    </Section>
  </>;
}
