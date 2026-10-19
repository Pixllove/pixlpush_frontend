import type { ComponentType } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import CodeBlock from "../CodeBlock";
import { Body, Callout, Checklist, DataTable, Expect, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { code, errorCodes, methods, SDK_VERSION } from "./content";
import { Events, Identity, Push } from "./guides-integrate";
import { EngagementSegment, PaywallSegment } from "./guides-segments";
import { Firebase, Installation, Overview, Quickstart, SdkKeys, rn, type GuideProps } from "./guides-setup";

export function Security({ base }: GuideProps) {
  return <>
    <Section id="credentials" title="Public vs. secret">
      <DataTable code={false} headers={["Credential", "Kind", "Rule"]} rows={[
        ["PixlPush SDK key", "Public, project-scoped", "Ships in the app. Rotate if abused; it grants ingestion only."],
        ["PixlPush account session (JWT)", "Secret, per person", "Never in an app or SDK config."],
        ["google-services.json / GoogleService-Info.plist", "Public client config", "Ships in the app."],
        ["Firebase service-account JSON", "Secret", "Only uploaded in PixlPush → Project settings → Firebase / FCM; stored encrypted and never returned."],
        ["APNs .p8 key", "Secret", "Only uploaded in Firebase Console."],
      ]} />
    </Section>
    <Section id="firebase-keys" title="Firebase API keys">
      <Body>The API key inside the Firebase config files identifies your Firebase project to Google; it is not a server secret and is meant to be in the app. Still restrict it in Google Cloud Console (to your Android package/SHA and iOS bundle ID, and to the APIs you use), and never confuse it with the service account.</Body>
    </Section>
    <Section id="bundle" title="Keep secrets out of the app">
      <Checklist items={[
        "No service-account JSON, .p8 file or private key in the repository, the bundle, or EXPO_PUBLIC_* variables.",
        "Don’t log SDK errors with user data; enableLogging only in development.",
        "Blur keys in screenshots, screen recordings and support tickets.",
        "Separate development, staging and production keys and Firebase projects.",
        "Revoke keys you no longer ship; delete them once their last-used date is stale.",
        "Give people the least role they need: owners, admins and developers manage keys and Firebase.",
      ]} />
    </Section>
    <Section id="isolation" title="Project isolation">
      <Body>The SDK key alone decides the project; the server ignores a client’s claim otherwise. A supplied <code>projectId</code> that doesn’t match is rejected with <code>SDK_KEY_PROJECT_MISMATCH</code>. Key and Firebase management are scoped to the project in the URL, so an ID from another project is simply not found.</Body>
    </Section>
    <Section id="data" title="Data minimization">
      <Body>Send what segments and journeys need, nothing more. The SDK rejects property keys that look like credentials or card data, rejects event names containing “@” or “://”, and limits value sizes (<LinkBox href={rn(base, "events", "rules")} sx={{ color: "inherit" }}>limits</LinkBox>). Deleting a person’s data on request is handled server-side; <code>reset()</code> only unlinks the device.</Body>
    </Section>
  </>;
}

export function Production({ base }: GuideProps) {
  return <>
    <Section id="verify" title="Verify step by step">
      <Step level="h3" id="v-config" number={1} title="Configuration">
        <CodeBlock code={"console.log(PixlPush.getStatus());"} />
        <Expect><code>configured: true</code>, the right <code>environment</code>, a <code>deviceId</code> and <code>pixlpushId</code>.</Expect>
      </Step>
      <Step level="h3" id="v-identify" number={2} title="Identify a test user">
        <CodeBlock code={'await PixlPush.identify({ externalUserId: "qa-user-001" });'} />
        <Expect><code>identified: true</code>, <code>externalUserId: &quot;qa-user-001&quot;</code>, <code>anonymousId: null</code>.</Expect>
      </Step>
      <Step level="h3" id="v-event" number={3} title="Send and flush an event">
        <CodeBlock code={code.verify} />
        <Expect><code>failed: 0, remaining: 0</code>; the user and event appear in PixlPush → Users.</Expect>
      </Step>
      <Step level="h3" id="v-token" number={4} title="Confirm token sync">
        <Expect>After granting permission, PixlPush → Project settings → Firebase / FCM shows at least one active device token.</Expect>
      </Step>
      <Step level="h3" id="v-push" number={5} title="Send a test notification and tap it">
        <Expect>The notification arrives in background and quit states; the tap opens your deep link and the open is counted for that message.</Expect>
      </Step>
      <Step level="h3" id="v-logout" number={6} title="Log out">
        <Expect>After <code>reset()</code>, a push to qa-user-001 is skipped for this device (no active subscription).</Expect>
      </Step>
    </Section>
    <Section id="checklist" title="Production checklist">
      <Checklist items={[
        "Production SDK key and environment: \"production\"; development keys not in release builds.",
        "configure() once; onError subscribed without logging personal data.",
        "identify() at login and session restore; await reset() at logout and before account switches.",
        "Consent applied before marketing collection.",
        "Event names and properties documented; no duplicates from effects.",
        "Firebase service account connected to the same Firebase project as the app.",
        "Android: release build, POST_NOTIFICATIONS on 13+, google-services plugin applied.",
        "iOS: Push Notifications + Remote notifications capabilities, APNs key in Firebase, tested on a device.",
        "Cold-start tap opens the right screen.",
        "Offline: events tracked in airplane mode arrive after reconnecting.",
        "Release build verified end to end, not only a development build.",
      ]} />
    </Section>
    <Section id="upgrade" title="Upgrading the SDK">
      <List items={[
        <>This guide is written against <code>@pixlpush/react-native {SDK_VERSION}</code>. Check your installed version with <code>PixlPush.getStatus().sdkVersion</code>.</>,
        "Upgrade @pixlpush/react-native and @pixlpush/core together, then rebuild native apps if push packages changed.",
        "Stored identity, consent and queue carry over between versions; installs from older SDKs keep their device and user.",
        "A public changelog is not published yet. Until it is, review the release notes shipped with the package before upgrading.",
      ]} />
    </Section>
  </>;
}

const troubleshooting: Record<string, [string, string, string][]> = {
  setup: [
    ["SDK_NOT_CONFIGURED", "A method ran before configure() resolved.", "Await the shared startPixlPush() promise first."],
    ["SDK_ALREADY_CONFIGURED", "configure() ran twice with different credentials (often a hot reload after changing .env).", "Use one initialization module; fully restart the app after changing keys."],
    ["SDK_KEY_MISSING", "The env variable wasn’t inlined.", "Restart Metro with --clear; check the EXPO_PUBLIC_ prefix."],
    ["SDK_KEY_INVALID", "Key revoked, deleted, mistyped, or from another backend.", "Create a new key in Project settings → SDK keys."],
    ["SDK_KEY_PROJECT_MISMATCH", "projectId isn’t the key’s project ID or slug.", "Fix projectId or remove it."],
    ["Data reaches PixlPush cloud while testing a local backend", "The key was created on the hosted dashboard, or the app’s JS engine has no atob (React Native below 0.74).", "Create the key on the local backend (SDK keys → Local backends) and use Hermes on RN 0.74+. Don’t set apiBaseUrl."],
    ["NETWORK_ERROR or timeouts on a real phone", "The key points at a Wi-Fi IP over http, or at a tunnel that has stopped.", "Create the key while the dashboard reaches the backend through a running HTTPS tunnel."],
    ["App still runs old SDK code", "A cached copy of the same SDK version.", "Delete node_modules/@pixlpush, reinstall, and restart Metro with --clear."],
  ],
  delivery: [
    ["Events don’t appear", "Offline, analytics consent false, or a fatal key error.", "Subscribe to onError; check flush() result and consent."],
    ["Events stay in the queue", "Transient errors in backoff (up to 60 s between attempts).", "Wait or call flush() once connectivity returns."],
    ["Duplicate events in development", "Tracking in effects under Strict Mode.", "Track in handlers; pass a stable eventId for business actions."],
    ["Lifecycle events you didn’t expect", "app_opened / app_backgrounded are automatic.", "Set trackLifecycleEvents: false if you don’t want them."],
  ],
  identity: [
    ["New user on every launch", "AsyncStorage missing (a warning is logged).", "Install it and rebuild."],
    ["Anonymous events not on the user", "identify() never ran, or ran with a different ID than other devices.", "Call identify() after login with your stable ID."],
    ["Previous user’s data on a new account", "reset() not awaited at logout.", "Await reset() before the next login."],
    ["ANONYMOUS_ID_CONFLICT (409)", "The same app storage was used with keys from two different projects.", "Clear the app’s data (or reinstall) when switching projects."],
  ],
  push: [
    ["No token registered", "React Native Firebase missing or below v22, permission not granted, or running in Expo Go.", "Use a development build with @react-native-firebase/messaging v22+; call syncPushToken() after permission."],
    ["Permission denied", "The user declined.", "Explain the value in your UI and link to Settings; the token syncs on next foreground."],
    ["Works in development, not release", "APNs key missing in Firebase, missing capabilities, or a different Firebase project in release.", "See Firebase & push setup, steps 4–6."],
    ["Received but open not attributed", "Custom handling without handleNotificationResponse(), or payload without pp_job_id.", "Forward taps to handleNotificationResponse(); send from PixlPush."],
    ["Cold-start tap does nothing", "Listener registered after configure().", "Register listeners at module level before startPixlPush()."],
    ["Expo push token rejected / never delivered", "ExponentPushToken isn’t an FCM token.", "Send the FCM token via React Native Firebase."],
  ],
};

export function Troubleshooting() {
  const titles: Record<string, string> = { setup: "Configuration", delivery: "Events", identity: "Identity", push: "Push" };
  return <>{Object.entries(troubleshooting).map(([id, rows]) => <Section key={id} id={id} title={titles[id]}>
    <Stack sx={{ border: `1px solid ${tokens.border}`, borderRadius: 2 }}>
      {rows.map(([symptom, cause, fix], index) => <Box key={symptom} sx={{ p: 2, borderTop: index ? `1px solid ${tokens.border}` : 0 }}>
        <Typography component="h3" sx={{ fontSize: "var(--fs-14)", fontWeight: 600, color: tokens.text, fontFamily: /^[A-Z_]+$/.test(symptom) ? "var(--pp-mono)" : undefined, overflowWrap: "anywhere" }}>{symptom}</Typography>
        <Box component="dl" sx={{ m: 0, mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "88px 1fr" }, rowGap: .5, columnGap: 2, fontSize: "var(--fs-14)", lineHeight: 1.6, "& dt": { color: tokens.textMuted }, "& dd": { m: 0, mb: { xs: 1, sm: 0 }, color: tokens.textSecondary } }}>
          <dt>Cause</dt><dd>{cause}</dd><dt>Fix</dt><dd>{fix}</dd>
        </Box>
      </Box>)}
    </Stack>
  </Section>)}</>;
}

function MethodGroup({ id, title, list }: { id: string; title: string; list: (typeof methods)["setup"] }) {
  return <Section id={id} title={title}>
    {list.map((method) => <Box key={method.name} component="article" id={method.name.split(" ")[0]} sx={{ scrollMarginTop: "var(--docs-offset, 140px)", pb: 2.5, borderBottom: `1px solid ${tokens.border}`, "&:last-of-type": { borderBottom: 0 } }}>
      <Typography component="h3" sx={{ fontFamily: "var(--pp-mono)", fontSize: "var(--fs-16)", fontWeight: 600, color: tokens.text }}>{method.name}</Typography>
      <Box component="pre" sx={{ m: 0, mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: tokens.subtle, overflowX: "auto", fontFamily: "var(--pp-mono)", fontSize: "var(--fs-13)", color: tokens.text }}><code>{method.signature} → {method.returns}</code></Box>
      <Typography sx={{ mt: 1.25, color: tokens.textSecondary, fontSize: "var(--fs-14)", lineHeight: 1.7 }}>{method.description}</Typography>
      {method.notes && <Typography sx={{ mt: .75, color: tokens.textSecondary, fontSize: "var(--fs-14)", lineHeight: 1.7 }}><b>Note:</b> {method.notes}</Typography>}
    </Box>)}
  </Section>;
}

export function Reference({ base }: GuideProps) {
  return <>
    <Callout tone="note" title="Import">{'import PixlPush, { PixlPushError, type PixlPushConfig } from "@pixlpush/react-native";'} — the default export is the singleton. Options are listed in <LinkBox href={rn(base, "installation", "options")} sx={{ color: "inherit" }}>Configuration options</LinkBox>.</Callout>
    <MethodGroup id="setup-methods" title="Setup" list={methods.setup} />
    <MethodGroup id="identity-methods" title="Identity" list={methods.identity} />
    <MethodGroup id="event-methods" title="Events & consent" list={methods.events} />
    <MethodGroup id="push-methods" title="Push" list={methods.push} />
    <MethodGroup id="listener-methods" title="Listeners" list={methods.listeners} />
    <Section id="errors" title="Error codes">
      <Body>Errors are <code>PixlPushError</code> instances with <code>code</code>, <code>isTransient</code>, and, for HTTP failures, <code>statusCode</code>. Methods throw validation and setup errors; queue errors go to <code>onError</code>.</Body>
      <DataTable headers={["Code", "Retried", "Meaning", "Fix"]} rows={errorCodes} minWidth={760} />
    </Section>
  </>;
}

export const reactNativeGuides: Record<string, ComponentType<GuideProps>> = {
  "": Overview, quickstart: Quickstart, installation: Installation, "sdk-keys": SdkKeys, firebase: Firebase,
  identity: Identity, events: Events, push: Push, "engagement-segment": EngagementSegment, "paywall-segment": PaywallSegment, security: Security, production: Production,
  troubleshooting: Troubleshooting, reference: Reference,
};
