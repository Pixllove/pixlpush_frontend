import type { ComponentType, ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ApiRounded from "@mui/icons-material/ApiRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import BoltRounded from "@mui/icons-material/BoltRounded";
import CodeBlock from "../CodeBlock";
import CodeTabs from "../CodeTabs";
import { Body, Callout, Checklist, DataTable, Expect, LinkCard, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { guideHref } from "../registry";
import { code, configOptions, errorCodes, methods, SDK_VERSION } from "./content";

export type FlutterGuideProps = { base: string };
const A = ({ href, children }: { href: string; children: ReactNode }) => <LinkBox href={href} sx={{ color: "inherit" }}>{children}</LinkBox>;
export const flutter = (base: string, slug = "", hash?: string) => guideHref(base, "flutter", slug, hash);

export function Overview({ base }: FlutterGuideProps) {
  return <>
    <Callout tone="tip" title="Start here">
      <b>Analytics only:</b> <A href={flutter(base, "quickstart")}>Quickstart</A> (about 15 minutes).<br />
      <b>Analytics and push:</b> Quickstart → <A href={flutter(base, "firebase")}>Firebase &amp; push setup</A> → <A href={flutter(base, "push")}>Push notifications</A> → <A href={flutter(base, "production")}>Verify &amp; ship</A>.<br />
      <b>Building audiences:</b> track the events your journey needs, then use them in PixlPush segments.
    </Callout>
    <Section id="what-it-does" title="What it does">
      <Body>The Flutter SDK connects your app’s users and product behaviour to PixlPush. It creates an anonymous installation identity, persists it with shared preferences, queues work while offline, tracks lifecycle sessions and attributes taps on PixlPush notifications to the notification job that sent them.</Body>
      <DataTable code={false} headers={["Capability", "What happens automatically"]} rows={[
        ["Identity", "A stable installation and anonymous user are created on first launch; identify() links the install after login."],
        ["Events", "Events are validated, persisted locally and flushed in batches with retry handling."],
        ["Push", "Firebase Messaging token refresh, permission state, foreground display and foreground/background/terminated opens are handled by the adapter."],
        ["Attribution", "The SDK reads data.pp_job_id, records one push open and then emits the notificationOpened callback."],
      ]} />
    </Section>
    <Section id="app-states" title="App states and responsibilities">
      <DataTable code={false} headers={["App state", "SDK behavior", "Your app"]} rows={[
        ["Foreground", "Receives the FCM message, emits received, displays a local notification and records its tap.", "Do not schedule a second local notification."],
        ["Background", "Firebase reports the tap through onMessageOpenedApp and the SDK records it.", "Navigate from notificationOpened if the payload has a deep link."],
        ["Terminated", "getInitialMessage() and the local plugin launch response are read during adapter initialization.", "Initialize the adapter once during startup."],
      ]} />
    </Section>
    <Section id="data" title="What the SDK sends">
      <DataTable code={false} headers={["Request", "Contents"]} rows={[
        ["Identity", "Anonymous or external user ID, profile fields, consent and device metadata."],
        ["Event", "Event ID, name, your properties, installation ID, session ID, environment and timestamp."],
        ["Push open", "Only the notification job ID from pp_job_id."],
      ]} />
      <Body>Every request is authenticated with the project-scoped SDK key. A push open without <code>pp_job_id</code> cannot increase a PixlPush notification’s click count.</Body>
    </Section>
    <Section id="next" title="Where to go next">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <LinkCard href={flutter(base, "quickstart")} icon={<BoltRounded />} title="Quickstart" description="Install, configure and verify your first event." />
        <LinkCard href={flutter(base, "firebase")} icon={<NotificationsActiveOutlined />} title="Firebase & push setup" description="Configure Android, iOS, APNs and the sender credential." />
        <LinkCard href={flutter(base, "identity")} icon={<FingerprintRounded />} title="Identity" description="Login, logout and account switching done safely." />
        <LinkCard href={flutter(base, "reference")} icon={<ApiRounded />} title="API reference" description="Public methods, listeners and error codes." />
      </Box>
    </Section>
  </>;
}

export function Quickstart({ base }: FlutterGuideProps) {
  return <>
    <Step id="prerequisites" number={1} title="Prerequisites">
      <List items={[
        "A PixlPush project and permission to create SDK keys.",
        "Flutter 3.38.1 or later with Dart 3.10 or later.",
        "For push: a Firebase project, Android/iOS app registration and an Apple Developer account for iOS.",
        "A physical device or supported development build for reliable push testing.",
      ]} />
    </Step>
    <Step id="install" number={2} title="Install the package">
      <Body>PixlPush is published as one Flutter plugin package for Android and iOS. Add it from pub.dev; there is no separate Android or iOS PixlPush dependency.</Body>
      <CodeBlock code="flutter pub add pixlpush" language="Shell" />
      <Body>Or add it to pubspec.yaml yourself and run <code>flutter pub get</code>:</Body>
      <CodeBlock code={code.install} language="YAML" filename="pubspec.yaml" />
    </Step>
    <Step id="key" number={3} title="Create an SDK key">
      <Body>Open <b>Project settings → SDK keys</b>, create a key named for the environment and copy the full value immediately. The key is a public client credential that authenticates ingestion; it is not a dashboard token.</Body>
      <CodeBlock code={code.key} language="Dart" filename="lib/config/pixlpush_config.dart" />
    </Step>
    <Step id="configure" number={4} title="Configure once">
      <CodeBlock code={code.initialize} language="Dart" filename="lib/services/pixlpush.dart" />
      <CodeBlock code={code.main} language="Dart" filename="lib/main.dart" />
      <Expect><code>configure()</code> resolves with <code>configured: true</code>. Call it once and reuse <code>PixlPush.instance</code>.</Expect>
    </Step>
    <Step id="verify" number={5} title="Verify analytics">
      <CodeBlock code={code.status} language="Dart" filename="lib/debug/pixlpush_verify.dart" />
      <CodeBlock code={code.track} language="Dart" filename="lib/screens/checkout.dart" />
      <CodeBlock code={code.flush} language="Dart" />
      <Expect><code>failed: 0</code> and <code>remaining: 0</code>; the device and event appear in PixlPush → Users after the queue flushes.</Expect>
    </Step>
    <Step id="push" number={6} title="Add push">
      <Body>Complete <A href={flutter(base, "firebase")}>Firebase &amp; push setup</A>, then initialize the adapter after <code>Firebase.initializeApp()</code>.</Body>
      <CodeBlock code={code.push} language="Dart" filename="lib/services/pixlpush.dart" />
      <Callout tone="tip" title="No manual click call is required">The adapter listens to Firebase and the local notification plugin. It preserves <code>pp_job_id</code>, records the open automatically and deduplicates duplicate callbacks.</Callout>
    </Step>
    <Step id="checkpoint" number={7} title="Before production">
      <Checklist items={["Use a separate production SDK key.", "Test login → logout → login as a different user on one device.", "Test an offline event and confirm it flushes after reconnecting.", <>Send a PixlPush test notification in foreground, background and terminated states; verify its click count.</>, <>Work through <A href={flutter(base, "production")}>Verify &amp; ship</A>.</>]} />
    </Step>
  </>;
}

export function Installation({ base }: FlutterGuideProps) {
  return <>
    <Section id="packages" title="Packages">
      <DataTable code headers={["Package", "Purpose", "Required"]} rows={[
        ["pixlpush", "PixlPush identity, events, queue and push attribution.", "Yes"],
        ["firebase_core", "Initializes the Firebase application before the messaging adapter.", "For push"],
        ["firebase_messaging", "FCM token, permission and notification callbacks.", "Included; for push"],
        ["flutter_local_notifications", "Foreground notification display and local tap callbacks.", "Included; for push"],
        ["shared_preferences", "Default persistent identity, consent and queue storage.", "Included; recommended"],
      ]} />
      <Callout tone="note" title="No second foreground notification handler">The SDK’s Firebase adapter already displays foreground notifications. A second application <code>onMessage</code> listener commonly creates duplicate notifications and loses the attribution payload.</Callout>
    </Section>
    <Section id="environment" title="Environment and keys">
      <Body>Flutter does not read a <code>.env</code> file by itself. Pass values with <code>--dart-define</code>, a build configuration package, or your CI secret substitution. The SDK key is safe to ship; Firebase service-account JSON and APNs <code>.p8</code> files are not.</Body>
      <CodeBlock code={code.localDevelopment} language="Shell" filename="development" />
      <CodeBlock code="flutter build apk --release \\\n+  --dart-define=PIXLPUSH_SDK_KEY=YOUR_PRODUCTION_SDK_KEY \\\n+  --dart-define=PIXLPUSH_PROJECT_ID=YOUR_PROJECT_ID" language="Shell" filename="production" />
    </Section>
    <Section id="initialize" title="Initialization order">
      <List ordered items={["Call WidgetsFlutterBinding.ensureInitialized().", "Configure PixlPush once.", "Call Firebase.initializeApp().", "Create and initialize PixlPushFirebaseMessaging once.", "Run the app."]} />
      <Body>Register notification listeners before a screen needs them. The SDK processes cold-start responses during adapter initialization, so application navigation can subscribe immediately after the shared initialization service is ready.</Body>
      <CodeBlock code={code.initialize} language="Dart" filename="lib/services/pixlpush.dart" />
    </Section>
    <Section id="status" title="Check getStatus()">
      <CodeBlock code={code.status} language="Dart" />
      <Body><code>deviceId</code> is a random per-install ID, not a hardware identifier. <code>pixlpushId</code> remains stable across normal launches and logins; <code>reset()</code> creates a new anonymous install identity.</Body>
    </Section>
    <Section id="options" title="Configuration options">
      <DataTable headers={["Option", "Type", "Default", "Description"]} rows={configOptions} minWidth={760} />
    </Section>
    <Section id="endpoint" title="Where data is sent">
      <Body>Normal Flutter application code does not provide an API URL. The full SDK key carries the public endpoint that issued it, so the published package does not embed a Supabase or other infrastructure URL. Development keys can carry a reachable LAN or tunnel endpoint.</Body>
      <Callout tone="warning" title="Local testing requires a reachable host">A phone cannot reach the development computer through <code>localhost</code> or <code>127.0.0.1</code>. Generate a development key with the computer’s LAN IP or a reachable HTTPS tunnel, and use that key in the app.</Callout>
    </Section>
  </>;
}

export function SdkKeys({ base }: FlutterGuideProps) {
  return <>
    <Section id="what" title="What an SDK key is">
      <Body>A <code>pp_sk_…</code> key authenticates ingestion from the installed app and identifies the PixlPush project. It grants no dashboard access and should not be treated like a server secret.</Body>
    </Section>
    <Section id="create" title="Create a key">
      <List ordered items={["Open the target project in PixlPush.", <>Go to <b>Project settings → SDK keys</b>.</>, "Create a key named development, staging or production.", "Copy the full key immediately; it is shown only once."]} />
    </Section>
    <Section id="environments" title="One key per environment">
      <DataTable code={false} headers={["Environment", "SDK configuration", "Why"]} rows={[
        ["development", "Local key with a reachable development endpoint.", "Safe testing and local delivery."],
        ["staging", "Staging key and project.", "Separate QA traffic and credentials."],
        ["production", "Production key and environment: Environment.production.", "Release traffic and real journeys."],
      ]} />
    </Section>
    <Section id="rotate" title="Rotate without downtime">
      <List ordered items={["Create the new key.", "Ship it in the next app version or environment.", "Verify identity, events, token sync and push opens.", "Keep the old key active while older app versions remain in use.", "Revoke the old key after its last-used date stops moving."]} />
    </Section>
    <Section id="revoke" title="Revoke vs. delete">
      <DataTable code={false} headers={["State", "App behavior"]} rows={[
        ["Revoked", <><code>SDK_KEY_INVALID</code>; the key remains visible with its revoked date.</>],
        ["Deleted", <><code>SDK_KEY_INVALID</code>; the key record is removed.</>],
        ["Project mismatch", <><code>SDK_KEY_PROJECT_MISMATCH</code>; fix or omit <code>projectId</code>.</>],
        ["Inactive project", <><code>PROJECT_INACTIVE</code>; reactivate the project.</>],
      ]} />
    </Section>
  </>;
}

export function Firebase({ base }: FlutterGuideProps) {
  return <>
    <Section id="pieces" title="The four pieces">
      <DataTable code={false} headers={["Piece", "Purpose", "Where it belongs", "Secret?"]} rows={[
        [<><code>google-services.json</code></>, "Android app Firebase identity.", "android/app/", "No"],
        [<><code>GoogleService-Info.plist</code></>, "iOS app Firebase identity.", "Runner target in Xcode.", "No"],
        ["APNs .p8 key", "Lets Firebase deliver to Apple devices.", "Firebase Console.", "Yes"],
        ["Service-account JSON", "Lets PixlPush send through Firebase Admin.", "PixlPush Project settings → Firebase / FCM.", "Yes"],
      ]} />
      <Callout tone="danger" title="Never ship server credentials">The Firebase service-account JSON and APNs <code>.p8</code> key must never be placed in Flutter assets, git, logs, screenshots or <code>--dart-define</code> values.</Callout>
    </Section>
    <Step id="android" number={1} title="Android setup">
      <List ordered items={["Register the Android application in the same Firebase project as the PixlPush project.", "Use the exact Android application ID from android/app/build.gradle.", "Download google-services.json into android/app/.", "Ensure the Google services Gradle plugin is applied by the Flutter Firebase setup.", "Build and run on a device or emulator with Google Play services."]} />
      <CodeBlock code="android/app/google-services.json" language="Text" filename="android/app/google-services.json" lineNumbers={false} />
    </Step>
    <Step id="ios" number={2} title="iOS setup">
      <List ordered items={["Register the iOS bundle ID in Firebase.", "Download GoogleService-Info.plist and add it to the Runner target in Xcode.", "Enable Push Notifications and Background Modes → Remote notifications.", "Use a physical iOS device for APNs delivery tests; simulators do not represent production APNs behavior.", "Run pod install through the normal Flutter build workflow after adding Firebase packages."]} />
    </Step>
    <Step id="apns" number={3} title="Connect APNs">
      <List ordered items={["In Apple Developer, create an APNs authentication key with Key ID and Team ID.", "In Firebase Console → Project settings → Cloud Messaging, open the Apple app configuration.", "Upload the .p8 key and enter the Key ID and Team ID.", "Confirm the bundle ID is the same as the Flutter Runner target."]} />
    </Step>
    <Step id="service-account" number={4} title="Create the service account">
      <List ordered items={["In Google Cloud IAM, create a dedicated service account for PixlPush.", "Grant only the Firebase Cloud Messaging API Admin role required for sending.", "Create and download a JSON key once.", "Keep the file outside the app repository and upload it through PixlPush Project settings → Firebase / FCM."]} />
      <CodeBlock code={`{
  "type": "service_account",
  "project_id": "your-firebase-project",
  "client_email": "pixlpush-fcm-sender@your-firebase-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----\\n"
}`} language="JSON" filename="service-account shape (do not commit)" />
    </Step>
    <Step id="connect" number={5} title="Connect Firebase in PixlPush">
      <List ordered items={["Open the project’s settings.", "Choose Firebase / FCM.", "Choose JSON file and select the service-account JSON.", "Validate and connect.", "Wait for the connection to show active token sync."]} />
      <Expect>PixlPush accepts the credential, shows the Firebase project ID and reports a connected status without exposing the private key.</Expect>
    </Step>
    <Section id="checklist" title="Connection checklist">
      <DataTable code={false} headers={["Check", "Expected result"]} rows={[
        ["Firebase project", "The app config, APNs setup and PixlPush service account all reference the same project."],
        ["Permission", "The OS permission is granted or the SDK reports denied/provisional accurately."],
        ["Token sync", "An active device token appears in Project settings → Firebase / FCM after adapter initialization."],
        ["Test send", "A PixlPush test notification arrives on the target device."],
      ]} />
    </Section>
  </>;
}

export function Identity({ base }: FlutterGuideProps) {
  return <>
    <Section id="model" title="Users, installs and IDs">
      <DataTable code={false} headers={["ID", "Meaning", "Lifetime"]} rows={[
        ["deviceId", "Random installation identifier used for device context.", "Until app data is cleared or app is reinstalled."],
        ["anonymousId", "Anonymous PixlPush user while nobody is signed in.", "Until identify/reset changes the install identity."],
        ["pixlpushId", "Permanent PixlPush user identifier for the current install link.", "Across normal launches and logins."],
        ["externalUserId", "Your stable customer/account ID.", "Until reset or another user is identified."],
      ]} />
    </Section>
    <Section id="identify" title="Identify after login">
      <Body>Call <code>identify()</code> after restoring or completing login. Use your stable internal customer ID, not an email address that can change.</Body>
      <CodeBlock code={code.identify.split("\n\n// Await")[0]} language="Dart" filename="lib/auth/session.dart" />
    </Section>
    <Section id="update" title="Update user properties">
      <CodeBlock code={code.updateUser} language="Dart" />
      <Body>Use properties for segmentation fields that are not event-specific. Keep values small, useful and free of passwords, tokens and payment data.</Body>
    </Section>
    <Section id="reset" title="Reset on logout">
      <CodeBlock code="await PixlPush.instance.reset();" language="Dart" filename="lib/auth/logout.dart" />
      <Callout tone="warning" title="Await reset before the next login">Reset deactivates the previous push association and creates a new anonymous install identity. Await it before identifying a different account on the same device.</Callout>
    </Section>
  </>;
}

export function Events({ base }: FlutterGuideProps) {
  return <>
    <Section id="track" title="Track an event">
      <CodeBlock code={code.track} language="Dart" filename="lib/checkout/checkout.dart" />
      <Body>The SDK generates an event ID when one is not supplied and writes the event to the local queue before returning.</Body>
    </Section>
    <Section id="rules" title="Names and properties">
      <List items={["Use stable lowercase names such as checkout_completed or tutorial_step_completed.", "Use JSON-compatible strings, numbers, booleans, lists or maps in properties.", "Do not send passwords, access tokens, card numbers or other secrets.", "Keep event names and property values small enough for the SDK validation limits."]} />
    </Section>
    <Section id="batch" title="Track a batch">
      <CodeBlock code={code.batch} language="Dart" />
      <Body>Use batches for a group of related events. Keep each call at or below 100 events and use a stable <code>TrackOptions.eventId</code> when retrying a business action.</Body>
    </Section>
    <Section id="consent" title="Consent">
      <CodeBlock code={code.consent} language="Dart" />
      <Body>Analytics consent controls product event collection. OS notification permission and push-open attribution are separate: a user can deny marketing permission while an already delivered notification can still be attributed.</Body>
    </Section>
    <Section id="queue" title="Offline queue & retries">
      <Body>Events and identity updates are persisted locally first. The queue flushes automatically, retries transient failures with backoff and keeps items for <code>queueRetention</code>. Call <code>flush()</code> after a connectivity transition when you need an immediate attempt.</Body>
      <CodeBlock code={code.flush} language="Dart" />
    </Section>
    <Section id="lifecycle" title="Lifecycle and sessions">
      <Body>With <code>trackLifecycleEvents: true</code>, the SDK records <code>app_opened</code> and <code>app_backgrounded</code>. Sessions expire after <code>sessionInactivityTimeout</code>, which defaults to 30 minutes. Do not manually duplicate these events.</Body>
    </Section>
  </>;
}

export function Push({ base }: FlutterGuideProps) {
  return <>
    <Section id="how" title="How push works">
      <Body>PixlPush sends through Firebase Cloud Messaging. The Flutter adapter uses the FCM registration token, not an Expo token or a token from an unrelated provider. Every PixlPush notification carries <code>data.pp_job_id</code> so the SDK can attribute the open.</Body>
      <Callout tone="warning" title="The click count needs pp_job_id">Notifications sent directly from Firebase without the PixlPush job field can display normally, but they cannot increase the click count for a PixlPush notification.</Callout>
    </Section>
    <Section id="initialize" title="Initialize the adapter">
      <CodeBlock code={code.push} language="Dart" filename="lib/services/pixlpush.dart" />
      <Body>Initialize once after <code>Firebase.initializeApp()</code>. The adapter registers Firebase listeners, local notification callbacks, token refresh and the terminated-app launch response.</Body>
    </Section>
    <Section id="permission" title="Permission and token sync">
      <CodeTabs label="Permission timing" group="flutter-permission" options={{ "Request during startup": { code: code.push, language: "Dart" }, "Request from your UI": { code: code.permission, language: "Dart" } }} />
      <Body>Use <code>requestPermission: false</code> when your onboarding or settings screen owns the prompt. Call <code>requestPermission()</code> there; the adapter updates permission and token state.</Body>
    </Section>
    <Section id="states" title="Foreground, background and terminated">
      <DataTable code={false} headers={["State", "What the adapter does"]} rows={[
        ["Foreground", "Emits notificationReceived and displays a local notification with the original data payload."],
        ["Background", "Firebase emits onMessageOpenedApp; the SDK normalizes the response and records the open."],
        ["Terminated", "getInitialMessage and getNotificationAppLaunchDetails are checked during initialize()."],
      ]} />
      <CodeBlock code={code.foreground} language="Dart" filename="Do not duplicate this handler" />
    </Section>
    <Section id="attribution" title="Open attribution">
      <Body>When the user taps, the SDK extracts <code>pp_job_id</code>, queues a <code>push_opened</code> request, flushes it promptly and emits <code>notificationOpened</code>. Duplicate Firebase/local callbacks for the same job are deduplicated.</Body>
      <Expect>A tap on a PixlPush notification increments that notification’s click count after the SDK reaches the backend. No manual click-tracking function is required in the Flutter app.</Expect>
    </Section>
    <Section id="deep-links" title="Deep links">
      <Body>The SDK normalizes <code>pp_deep_link</code> into <code>deepLink</code>, records the open and leaves navigation to your router.</Body>
      <CodeBlock code={code.deepLink} language="Dart" filename="lib/navigation/pixlpush_notifications.dart" />
    </Section>
    <Section id="listeners" title="Notification listeners">
      <CodeBlock code={code.listeners} language="Dart" filename="lib/services/pixlpush_listeners.dart" />
      <Body>Listeners are for application behavior such as navigation or an in-app message. They are not needed for attribution itself.</Body>
    </Section>
    <Section id="test" title="Test matrix">
      <DataTable code={false} headers={["Test", "Expected result"]} rows={[
        ["Foreground receive", "A local notification is visible and the received listener fires."],
        ["Foreground tap", "The open listener fires and the click count increases."],
        ["Background tap", "The app opens, the open listener fires and the click count increases."],
        ["Terminated tap", "The app launches, the adapter processes the initial response and the click count increases."],
        ["Missing pp_job_id", "The notification may display, but it is not attributed to a PixlPush job."],
      ]} />
    </Section>
  </>;
}

export function Security({ base }: FlutterGuideProps) {
  return <>
    <Section id="credentials" title="Public vs. secret">
      <DataTable code={false} headers={["Credential", "Kind", "Rule"]} rows={[
        ["PixlPush SDK key", "Public, project-scoped", "May ship in the Flutter app; rotate if abused."],
        ["Firebase app config files", "Public client config", "google-services.json and GoogleService-Info.plist may ship in the app."],
        ["Firebase service-account JSON", "Secret", "Upload only to PixlPush Firebase / FCM settings."],
        ["APNs .p8 key", "Secret", "Upload only to Firebase Console."],
        ["Dashboard session/JWT", "Secret", "Never include in the app or SDK configuration."],
      ]} />
    </Section>
    <Section id="bundle" title="Keep secrets out of the app">
      <Checklist items={["Do not commit service-account JSON or APNs .p8 files.", "Do not put private credentials in --dart-define values.", "Do not log notification payloads containing personal data in production.", "Use separate Firebase projects and SDK keys for development, staging and production.", "Blur SDK keys in screenshots and support tickets."]} />
    </Section>
    <Section id="isolation" title="Project isolation">
      <Body>The SDK key authenticates the request and identifies the project. If you provide <code>projectId</code>, the backend verifies that it matches the key; a mismatch is rejected with <code>SDK_KEY_PROJECT_MISMATCH</code>.</Body>
    </Section>
    <Section id="data" title="Data minimization">
      <Body>Track only fields needed for an audience or journey. Keep identity properties and event payloads free of passwords, access tokens, payment data and other sensitive values.</Body>
    </Section>
  </>;
}

export function Production({ base }: FlutterGuideProps) {
  return <>
    <Section id="verify" title="Verify step by step">
      <Step level="h3" id="verify-config" number={1} title="Configuration"><CodeBlock code={code.status} language="Dart" /><Expect><code>configured: true</code>, the expected environment, a device ID and a PixlPush ID.</Expect></Step>
      <Step level="h3" id="verify-identity" number={2} title="Identify a test user"><CodeBlock code="await PixlPush.instance.identify(const EndUserIdentity(externalUserId: 'qa-user-001'));" language="Dart" /><Expect>The user appears in PixlPush → Users after the queue flushes.</Expect></Step>
      <Step level="h3" id="verify-event" number={3} title="Send and flush an event"><CodeBlock code={code.track} language="Dart" /><CodeBlock code={code.flush} language="Dart" /><Expect><code>failed: 0</code> and <code>remaining: 0</code>.</Expect></Step>
    </Section>
    <Section id="push-check" title="Verify notification opens">
      <List ordered items={["Confirm Firebase is connected and a token is active.", "Send a notification from a PixlPush journey or push test.", "Tap it in foreground, background and terminated states.", "Confirm the opened listener receives a notificationJobId.", "Refresh the journey/push report and confirm Clicks increased."]} />
      <Callout tone="danger" title="If clicks stay at zero">Check that the message came from PixlPush, the app used the matching project key, the adapter initialized once, and the notification payload still contains <code>data.pp_job_id</code>.</Callout>
    </Section>
    <Section id="checklist" title="Production checklist">
      <Checklist items={["Production SDK key and Environment.production are used in release builds.", "Firebase app config files match the Firebase project connected in PixlPush.", "Service account and APNs credentials are stored only in their server consoles.", "configure() and the Firebase adapter initialize exactly once.", "identify() runs after login; reset() is awaited on logout.", "Analytics consent is applied before marketing events are tracked.", "Foreground, background and terminated notification opens were tested on real devices.", "Offline events flush after reconnecting.", "Production build was tested, not only a debug build."]} />
    </Section>
    <Section id="upgrade" title="Upgrading the SDK">
      <List items={[<>This guide is written against <code>pixlpush {SDK_VERSION}</code>.</>, "Review the package changelog and run flutter pub get after changing the version.", "Rebuild Android and iOS after updating Firebase or local notification dependencies.", "Retest token registration, foreground display and all three notification-open states.", "Do not change SDK keys during a routine package upgrade; rotate keys separately when needed."]} />
    </Section>
  </>;
}

const troubleshooting: Record<string, [string, string, string][]> = {
  setup: [
    ["SDK_NOT_CONFIGURED", "A method ran before configure() completed.", "Await one shared initialization future."],
    ["SDK_ALREADY_CONFIGURED", "configure() ran with different credentials in the same process.", "Configure PixlPush once and reuse PixlPush.instance."],
    ["SDK_KEY_MISSING", "The build did not receive the key.", "Check --dart-define or the build-time config source."],
    ["SDK_KEY_INVALID", "The key is revoked, deleted or malformed.", "Create a new key in Project settings → SDK keys."],
    ["SDK_KEY_PROJECT_MISMATCH", "projectId belongs to another project.", "Use the matching project ID or omit projectId."],
    ["Local device cannot connect", "The development key points to localhost or an unreachable LAN host.", "Use the computer LAN IP or a reachable HTTPS tunnel."],
  ],
  events: [
    ["Events do not appear", "Offline, analytics consent is false, or the key is invalid.", "Inspect getStatus(), subscribe to errors and call flush()."],
    ["Queue never empties", "The backend is unreachable or a transient retry is in progress.", "Restore connectivity, wait for backoff or call flush() again."],
    ["Events repeat", "The same action is tracked more than once by the UI.", "Track in the action handler and provide a stable event ID for retries."],
  ],
  push: [
    ["No token registered", "Firebase is not initialized, permission is denied or the app config points to another project.", "Initialize Firebase first, grant permission and inspect Firebase / FCM token sync."],
    ["Foreground notification is missing", "The adapter was not initialized or the OS channel/permission is disabled.", "Initialize PixlPushFirebaseMessaging once and enable notification permission."],
    ["Works on Android but not iOS", "APNs key/capabilities or the iOS Firebase bundle ID is wrong.", "Check APNs, Push Notifications and Remote notifications setup."],
  ],
  opens: [
    ["Click count is zero", "The message lacks pp_job_id or the adapter never received the tap.", "Send from PixlPush, preserve data.pp_job_id and initialize the adapter once."],
    ["Foreground tap is not counted", "A second local notification was scheduled by application code without the PixlPush data.", "Remove the duplicate onMessage/local notification path."],
    ["Deep link does not navigate", "The SDK records attribution but navigation is application-owned.", "Subscribe to notificationOpened and pass deepLink to your router."],
  ],
};

export function Troubleshooting() {
  const titles: Record<string, string> = { setup: "Configuration", events: "Events", push: "Push delivery", opens: "Notification opens" };
  return <>{Object.entries(troubleshooting).map(([id, rows]) => <Section key={id} id={id} title={titles[id]}>
    <Stack sx={{ border: "1px solid var(--pp-border)", borderRadius: 2 }}>
      {rows.map(([symptom, cause, fix], index) => <Box key={symptom} sx={{ p: 2, borderTop: index ? "1px solid var(--pp-border)" : 0 }}>
        <Typography component="h3" sx={{ fontSize: "var(--fs-14)", fontWeight: 600, color: "var(--pp-text)", fontFamily: /^[A-Z_]+$/.test(symptom) ? "var(--pp-mono)" : undefined, overflowWrap: "anywhere" }}>{symptom}</Typography>
        <Box component="dl" sx={{ m: 0, mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "88px 1fr" }, rowGap: .5, columnGap: 2, fontSize: "var(--fs-14)", lineHeight: 1.6, "& dt": { color: "var(--pp-text-3)" }, "& dd": { m: 0, mb: { xs: 1, sm: 0 }, color: "var(--pp-text-2)" } }}>
          <dt>Cause</dt><dd>{cause}</dd><dt>Fix</dt><dd>{fix}</dd>
        </Box>
      </Box>)}
    </Stack>
  </Section>)}</>;
}

function MethodGroup({ id, title, list }: { id: string; title: string; list: [string, string, string][] }) {
  return <Section id={id} title={title}>
    {list.map(([name, returns, description]) => <Box key={name} component="article" id={name.split("(")[0]} sx={{ scrollMarginTop: "var(--docs-offset, 140px)", pb: 2.5, borderBottom: "1px solid var(--pp-border)", "&:last-of-type": { borderBottom: 0 } }}>
      <Typography component="h3" sx={{ fontFamily: "var(--pp-mono)", fontSize: "var(--fs-16)", fontWeight: 600, color: "var(--pp-text)" }}>{name}</Typography>
      <Box component="pre" sx={{ m: 0, mt: 1, p: 1.25, borderRadius: 1.5, bgcolor: "var(--pp-subtle)", overflowX: "auto", fontFamily: "var(--pp-mono)", fontSize: "var(--fs-13)", color: "var(--pp-text)" }}><code>{returns}</code></Box>
      <Typography sx={{ mt: 1.25, color: "var(--pp-text-2)", fontSize: "var(--fs-14)", lineHeight: 1.7 }}>{description}</Typography>
    </Box>)}
  </Section>;
}

export function Reference() {
  return <>
    <Callout tone="note" title="Import">{'import \'package:pixlpush/pixlpush.dart\';'} — use <code>PixlPush.instance</code> for the application singleton.</Callout>
    <MethodGroup id="setup-methods" title="Setup" list={methods.setup} />
    <MethodGroup id="identity-methods" title="Identity" list={methods.identity} />
    <MethodGroup id="event-methods" title="Events & consent" list={methods.events} />
    <MethodGroup id="push-methods" title="Push" list={methods.push} />
    <Section id="listeners" title="Listeners">
      <DataTable headers={["Listener", "Emitted when", "Payload"]} rows={[
        ["addNotificationReceivedListener", "A foreground FCM message is received.", "NormalizedPushPayload"],
        ["addNotificationOpenedListener", "A plain notification tap is processed.", "NormalizedPushPayload"],
        ["addNotificationActionListener", "An action button is selected.", "NormalizedPushPayload with actionId"],
        ["addPushTokenListener", "The FCM/APNs token changes.", "String"],
        ["addPushPermissionListener", "The OS push permission state changes.", "String"],
      ]} />
    </Section>
    <Section id="errors" title="Error codes">
      <Body>Validation and setup errors are thrown as <code>PixlPushError</code>. Queue failures are delivered to the SDK error listener and retried when transient.</Body>
      <DataTable headers={["Code", "Meaning", "Fix"]} rows={errorCodes} minWidth={760} />
    </Section>
  </>;
}

export const flutterGuides: Record<string, ComponentType<FlutterGuideProps>> = {
  "": Overview,
  quickstart: Quickstart,
  installation: Installation,
  "sdk-keys": SdkKeys,
  firebase: Firebase,
  identity: Identity,
  events: Events,
  push: Push,
  security: Security,
  production: Production,
  troubleshooting: Troubleshooting,
  reference: Reference,
};
