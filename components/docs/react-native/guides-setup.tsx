import type { ReactNode } from "react";
import ApiRounded from "@mui/icons-material/ApiRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import BoltRounded from "@mui/icons-material/BoltRounded";
import { Box } from "@mui/material";
import CodeBlock from "../CodeBlock";
import CodeTabs from "../CodeTabs";
import { Body, Callout, Checklist, DataTable, Expect, LinkCard, List, Section, Step, SubHeading } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { guideHref } from "../registry";
import { aiPrompt, code, configOptions, installCommands, pushInstallCommands } from "./content";

export type GuideProps = { base: string };
const A = ({ href, children }: { href: string; children: ReactNode }) => <LinkBox href={href} sx={{ color: "inherit" }}>{children}</LinkBox>;
export const rn = (base: string, slug = "", hash?: string) => guideHref(base, "react-native", slug, hash);

export function Overview({ base }: GuideProps) {
  return <>
    <Callout tone="tip" title="Start here">
      <b>Analytics only:</b> <A href={rn(base, "quickstart")}>Quickstart</A> (about 15 minutes).<br />
      <b>Analytics and push:</b> Quickstart → <A href={rn(base, "firebase")}>Firebase & push setup</A> → <A href={rn(base, "push")}>Push notifications</A> → <A href={rn(base, "production")}>Verify & ship</A>.<br />
      <b>Building audiences:</b> after the quickstart, follow a <A href={rn(base, "paywall-segment")}>segment guide</A>.
    </Callout>
    <Section id="what-it-does" title="What it does">
      <Body>The SDK connects your app’s users and product behaviour to PixlPush, which uses them for audiences, journeys and push campaigns. It keeps an identity for every install, queues what your app reports while offline, and links notification taps back to the campaign that sent them.</Body>
    </Section>
    <Section id="data" title="What the SDK sends">
      <DataTable code={false} headers={["Request", "Sent when", "Contents"]} rows={[
        ["Identity update", "configure(), identify(), updateUser(), setConsent() with email/push, token changes", "Your externalUserId or the anonymous ID, profile fields you pass, consent, and device context: platform, OS version, model, app version, locale, timezone, push permission."],
        ["Event", "track(), trackBatch(), lifecycle", "Event ID, name, your properties, installation ID, session ID, environment, platform, source, timestamp."],
        ["Push open", "A tap on a PixlPush notification", "Only the notification job ID."],
        ["Reset", "reset()", "The installation ID to unlink."],
      ]} />
      <Body>Every request carries your SDK key in the <code>x-pixlpush-key</code> header and, when set, your project ID.</Body>
    </Section>
    <Section id="automatic" title="Automatic vs. manual">
      <DataTable code={false} headers={["The SDK does", "You do"]} rows={[
        ["Creates a random device ID and an anonymous user on first launch", "Call configure() once at start-up"],
        ["Persists identity, consent and the queue (with AsyncStorage)", "Install AsyncStorage"],
        ["Flushes every 15 s, on foreground and on background; retries with backoff", "Call identify() after login and reset() on logout"],
        ["Records app_opened and app_backgrounded", "Track the product events that matter"],
        ["With React Native Firebase: sends the FCM token, refreshes, and records taps (background and cold start)", "Ask for notification permission from your UI, then call syncPushToken()"],
        ["De-duplicates a tap seen by two listeners", "Handle foreground messages and deep links"],
      ]} />
    </Section>
    <Section id="app-paths" title="Expo, Expo Go, or bare">
      <DataTable code={false} headers={["App type", "Analytics & identity", "Push through PixlPush"]} rows={[
        ["Expo Go", "Works (the SDK is JavaScript-only)", "Not possible: React Native Firebase is native code that Expo Go does not include"],
        ["Expo development or production build", "Works", "Works with @react-native-firebase/messaging and config plugins"],
        ["Bare React Native ≥ 0.60", "Works", "Works with @react-native-firebase/messaging"],
      ]} />
      <Callout tone="warning" title="FCM, APNs and Expo push tokens are not interchangeable">PixlPush sends notifications through Firebase Cloud Messaging, so it needs the native FCM registration token. An Expo push token (<code>ExponentPushToken[…]</code>) only works with Expo’s push service and will never receive a PixlPush notification.</Callout>
    </Section>
    <Section id="next" title="Where to go next">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <LinkCard href={rn(base, "quickstart")} icon={<BoltRounded />} title="Quickstart" description="Install, configure and verify your first event." />
        <LinkCard href={rn(base, "firebase")} icon={<NotificationsActiveOutlined />} title="Firebase & push setup" description="Every file and key push needs, step by step." />
        <LinkCard href={rn(base, "identity")} icon={<FingerprintRounded />} title="Identity" description="Login, logout and account switching done right." />
        <LinkCard href={rn(base, "reference")} icon={<ApiRounded />} title="API reference" description="Every method, option and error code." />
      </Box>
    </Section>
  </>;
}

export function Quickstart({ base }: GuideProps) {
  return <>
    <Step id="prerequisites" number={1} title="Prerequisites">
      <List items={[
        "A PixlPush project. You need the owner, admin or developer role to create SDK keys.",
        "A React Native 0.60+ app, or an Expo app (Expo Go is enough for this quickstart; push needs a development build).",
        <>For push later: a Firebase project and, for iOS, an Apple Developer account. See <A href={rn(base, "firebase")}>Firebase & push setup</A>.</>,
      ]} />
    </Step>
    <Step id="install" number={2} title="Install the SDK">
      <Body>AsyncStorage is optional for the package but required in practice: without it identity, consent and the offline queue reset on every launch.</Body>
      <CodeTabs label="Package manager" group="package-manager" options={installCommands} />
    </Step>
    <Step id="key" number={3} title="Create an SDK key">
      <Body>In PixlPush open <b>Project settings → SDK keys</b>, create a key named for its environment (for example <code>mobile-development</code>) and copy it now: the full key is shown only once.</Body>
      <CodeTabs label="App type" group="app-type" options={{ Expo: { code: code.envExpo, language: "Environment", filename: ".env" }, "Bare React Native": { code: code.envBare, language: "TypeScript", filename: "src/config/pixlpush.ts" } }} />
      <Callout tone="danger" title="Only public values belong in the app">The SDK key is a public client identifier. Never put a dashboard login token, a Firebase service-account JSON or an APNs <code>.p8</code> key in your app or its environment files.</Callout>
    </Step>
    <Step id="configure" number={4} title="Configure once">
      <CodeBlock code={code.initialize} filename="src/lib/pixlpush.ts" highlight={[9, 13]} />
      <CodeBlock code={code.entry} filename="App.tsx" />
      <Expect>With <code>enableLogging</code>, the Metro console shows PixlPush queue activity within 15 seconds. <code>configure</code> resolves with <code>configured: true</code>.</Expect>
    </Step>
    <Step id="identify" number={5} title="Identify after login">
      <CodeBlock code={code.identify} filename="src/auth/pixlpush-session.ts" />
    </Step>
    <Step id="track" number={6} title="Track an event">
      <CodeBlock code={code.track} filename="src/screens/Checkout.tsx" />
    </Step>
    <Step id="verify" number={7} title="Verify">
      <CodeBlock code={code.verify} filename="src/dev/verify-pixlpush.ts" />
      <Expect><code>failed: 0</code> and <code>remaining: 0</code>. In PixlPush → Users, <code>qa-user-001</code> appears with an <code>integration_verified</code> event.</Expect>
    </Step>
    <Step id="push" number={8} title="Add push">
      <Body>Push needs two more guides, in this order:</Body>
      <List ordered items={[<><A href={rn(base, "firebase")}>Firebase & push setup</A> — Firebase in your app, the APNs key, and the service-account JSON in PixlPush.</>, <><A href={rn(base, "push")}>Push notifications</A> — permission, token sync, taps and deep links.</>]} />
    </Step>
    <Step id="checkpoint" number={9} title="Before production">
      <Checklist items={["Use a separate production SDK key.", "Test logout → login as a different user on one device.", "Test offline: track in airplane mode, reconnect, flush.", <>Work through <A href={rn(base, "production")}>Verify & ship</A>.</>]} />
    </Step>
  </>;
}

export function AiSetup({ base }: GuideProps) {
  return <>
    <Section id="prompt" title="The prompt">
      <Body>Copy this into Claude Code, Cursor, GitHub Copilot, Codex, Windsurf, Gemini CLI, Cline or any coding agent, from the root of your app. It uses the same code as the <A href={rn(base, "quickstart")}>Quickstart</A>.</Body>
      <CodeBlock code={aiPrompt} language="Markdown" download="pixlpush-setup-prompt.md" filename="pixlpush-setup-prompt.md" lineNumbers={false} maxHeight={520} wrap />
    </Section>
    <Section id="how" title="How to use it">
      <DataTable code={false} headers={["Agent", "Where to paste it"]} rows={[
        ["Claude Code", "Run claude in the project root and paste it, or save it as CLAUDE.md."],
        ["Cursor", "Agent mode in chat, or save it under .cursor/rules/."],
        ["GitHub Copilot", "Copilot Chat in agent mode, or .github/copilot-instructions.md."],
        ["Codex / Gemini CLI", "Paste it into the CLI session, or save it as AGENTS.md / GEMINI.md."],
        ["Windsurf / Cline / others", "Paste it into the agent chat with file editing enabled."],
      ]} />
      <List ordered items={["Open your app’s repository in the agent (agent or edit mode, not plain chat).", "Paste the prompt and let it inspect the project first.", "Review the diff, paste your development SDK key, and run the verify script."]} />
    </Section>
    <Section id="manual" title="What you do by hand">
      <Body>The agent writes the push code but can’t use the Firebase, Apple or PixlPush consoles. Follow <A href={rn(base, "firebase")}>Firebase & push setup</A> to create <code>google-services.json</code>, <code>GoogleService-Info.plist</code>, the APNs key and the service-account JSON.</Body>
      <Callout tone="danger" title="Never give the agent your secrets">Upload the service-account JSON and the <code>.p8</code> key yourself. They never belong in the repo or the app.</Callout>
    </Section>
  </>;
}

export function Installation({ base }: GuideProps) {
  return <>
    <Section id="packages" title="Packages">
      <CodeTabs label="Package manager" group="package-manager" options={installCommands} />
      <DataTable code headers={["Package", "Required", "Why"]} rows={[
        ["@pixlpush/react-native", "yes", "The SDK; depends on @pixlpush/core."],
        ["@react-native-async-storage/async-storage", "strongly recommended", "Persistence. Without it every launch looks like a fresh install: new anonymous user, lost queue. The SDK logs a warning."],
        ["react-native", "peer, ≥ 0.60", "AppState (lifecycle, flushes) and Platform (device context)."],
        ["expo-application, expo-device", "optional", "When present, used for app version, build, model and OS version."],
      ]} />
    </Section>
    <Section id="push-packages" title="Push packages">
      <Body>Only needed for push. The SDK detects them at runtime; an app without them still builds.</Body>
      <CodeTabs label="Package manager" group="package-manager" options={pushInstallCommands} />
      <Callout tone="warning" title="React Native Firebase v22+ (modular API)">The SDK calls the modular functions <code>getMessaging</code>, <code>getToken</code> and <code>onTokenRefresh</code>. Older namespaced-only versions are ignored: no token is sent.</Callout>
      <Body><code>expo-notifications</code> is optional. When installed, the SDK also records taps it reports. See <A href={rn(base, "push", "expo-notifications")}>Using expo-notifications</A>.</Body>
    </Section>
    <Section id="environment" title="Environment variables">
      <CodeTabs label="App type" group="app-type" options={{ Expo: { code: code.envExpo, language: "Environment", filename: ".env" }, "Bare React Native": { code: code.envBare, language: "TypeScript", filename: "src/config/pixlpush.ts" } }} />
      <Body>Use a different key per environment (<A href={rn(base, "sdk-keys", "environments")}>why</A>). Expo inlines <code>EXPO_PUBLIC_*</code> variables at build time, so restart Metro with <code>--clear</code> after changing them.</Body>
    </Section>
    <Section id="initialize" title="Initialization module">
      <Body>Keep configuration in one module so every caller shares one promise. Calling <code>configure</code> again with the same key and project is harmless; a different key or project throws <code>SDK_ALREADY_CONFIGURED</code>.</Body>
      <CodeBlock code={code.initialize} filename="src/lib/pixlpush.ts" />
    </Section>
    <Section id="entry" title="App entry point">
      <CodeBlock code={code.entry} filename="App.tsx" />
      <Body>Calls made before <code>configure</code> resolves throw <code>SDK_NOT_CONFIGURED</code>. Calls made while it is still starting wait for it.</Body>
    </Section>
    <Section id="status" title="Check getStatus()">
      <CodeBlock code={code.status} />
    </Section>
    <Section id="options" title="Configuration options">
      <DataTable headers={["Option", "Type", "Default", "Description"]} rows={configOptions} minWidth={760} />
    </Section>
    <Section id="api-url" title="Where data is sent">
      <Body>There is no server URL to configure, in development or production. <b>The SDK key decides where data goes</b>, the way a Sentry DSN carries its host. To switch servers, switch keys.</Body>
      <Body>Create a development key and a production key in the dashboard, put each in the matching environment file, and you’re done.</Body>
      <Body>Leave endpoint and SDK-version overrides unset. The SDK key selects the endpoint and the package reports its own version.</Body>
    </Section>
  </>;
}

export function SdkKeys({ base }: GuideProps) {
  return <>
    <Section id="what" title="What an SDK key is">
      <Body>An SDK key (<code>pp_sk_…</code>) authenticates ingestion from your app and decides which project the data belongs to. It is designed to ship inside the app. It is not a dashboard login token and grants no dashboard access. <code>projectId</code> is only a consistency check against it.</Body>
    </Section>
    <Section id="create" title="Create a key">
      <List ordered items={[
        "Open the right project in PixlPush (the project switcher in the sidebar).",
        <>Go to <LinkBox href="/dashboard/settings/sdk-keys" sx={{ color: "inherit" }}><b>Project settings → SDK keys</b></LinkBox>.</>,
        <>Create a key with a name such as <code>mobile-development</code>, <code>mobile-staging</code> or <code>mobile-production</code>.</>,
        "Copy the full key immediately. It is shown once; PixlPush stores only a hash and a display prefix and cannot show it again.",
      ]} />
    </Section>
    <Section id="listing" title="What the list shows">
      <Body>Name, the first 16 characters as a prefix, status (active or revoked), created date, last-used date (updated on each authenticated request) and revoked date. Never the key itself.</Body>
    </Section>
    <Section id="roles" title="Who can manage keys">
      <Body>Project <b>owners</b>, <b>admins</b> and <b>developers</b> can list, create, revoke and delete keys. Other roles cannot see them.</Body>
    </Section>
    <Section id="environments" title="One key per environment">
      <CodeBlock language="Environment" filename=".env.development / .env.staging / .env.production" code={`EXPO_PUBLIC_PIXLPUSH_KEY=YOUR_DEVELOPMENT_SDK_KEY\nEXPO_PUBLIC_PIXLPUSH_KEY=YOUR_STAGING_SDK_KEY\nEXPO_PUBLIC_PIXLPUSH_KEY=YOUR_PRODUCTION_SDK_KEY`} />
      <Body>Separate keys let you revoke a leaked development key without touching production, and tell traffic apart by last-used date. Pair them with the matching <code>environment</code> option.</Body>
    </Section>
    <Section id="rotate" title="Rotate without downtime">
      <Body>Several keys can be active at once on purpose.</Body>
      <List ordered items={["Create the new key.", "Ship it in a new app version (or environment).", "Verify identify, events and push opens arrive; watch the new key’s last-used date.", "Keep the old key active while older app versions are still in use.", "Revoke the old key once its last-used date stops moving.", "Delete it when you no longer need its record."]} />
    </Section>
    <Section id="revoke-delete" title="Revoke vs. delete">
      <DataTable code={false} headers={["State", "What apps see"]} rows={[
        ["Revoked", <>Requests fail with <code>SDK_KEY_INVALID</code> (401). The key stays listed with its revoked date. Revoking twice is rejected.</>],
        ["Deleted", <>The record is removed; requests fail with <code>SDK_KEY_INVALID</code>. Any key can be deleted, active or not, so revoke first.</>],
        ["Project mismatch", <><code>projectId</code> is neither the key’s project ID nor its slug: <code>SDK_KEY_PROJECT_MISMATCH</code> (401).</>],
        ["Project deactivated", <><code>PROJECT_INACTIVE</code> (403).</>],
      ]} />
      <Callout tone="warning" title="These errors stop the queue">On any of them the SDK discards the item it was sending, reports the error to <code>onError</code>, and stops flushing until the next trigger. Items behind it stay queued, so ship a fixed key quickly.</Callout>
    </Section>
  </>;
}

export function Firebase({ base }: GuideProps) {
  return <>
    <Section id="overview" title="The three pieces">
      <Body>Push needs three things to point at the <b>same Firebase project</b>. Most setup problems come from mixing them up, so here is what each one is before you start.</Body>
      <DataTable code={false} headers={["Piece", "What it is", "Where it ends up", "Secret?"]} minWidth={680} rows={[
        [<>Your app’s Firebase config<br /><code>google-services.json</code> · <code>GoogleService-Info.plist</code></>, "Tells the app which Firebase project it belongs to, so it can get an FCM token.", "Inside your app (android/app and the Xcode target).", "No — designed to ship in the app."],
        [<>APNs key<br /><code>AuthKey_XXXXXXXXXX.p8</code></>, "Lets Firebase deliver to iPhones through Apple.", "Uploaded once in Firebase Console. Not in the app.", "Yes."],
        [<>Service-account JSON<br /><code>your-project-xxxx.json</code></>, "Lets PixlPush’s server send pushes through your Firebase project.", <>Uploaded once in PixlPush → <b>Project settings → Firebase / FCM</b>. Not in the app.</>, "Yes."],
      ]} />
      <Callout tone="danger" title="Never put the .p8 or the service-account JSON in your app">Anyone holding them can send notifications to all your users. Keep them out of git, the app bundle, logs, screenshots and tickets.</Callout>
      <Body>Time needed: about 20 minutes for Android, plus 15 for iOS. You need access to the Firebase project, and for iOS an Apple Developer account.</Body>
    </Section>

    <Step id="firebase-project" number={1} title="Create a Firebase project">
      <List ordered items={[
        <>Open <b>console.firebase.google.com</b> and click <b>Create a project</b> (or open an existing one).</>,
        "Name it, and finish the wizard. Google Analytics is optional for push.",
        <>Open <b>Project settings</b> (gear icon next to “Project Overview”). On the <b>General</b> tab, note the <b>Project ID</b> — you’ll compare it in step 6.</>,
      ]} />
      <Callout tone="tip" title="One Firebase project per PixlPush project">Each PixlPush project connects to exactly one Firebase project. If you keep separate development and production PixlPush projects, give each its own Firebase project too.</Callout>
    </Step>

    <Step id="android" number={2} title="Add the Android app">
      <SubHeading>2a. Find your package name</SubHeading>
      <Body>It’s the <code>applicationId</code> in <code>android/app/build.gradle</code> (Expo: <code>android.package</code> in <code>app.config.js</code>).</Body>
      <CodeBlock code={code.androidIdentity} filename="android/app/build.gradle" language="Gradle" highlight={[5]} />
      <SubHeading>2b. Register it and download the config</SubHeading>
      <List ordered items={[
        <>In Firebase, on <b>Project Overview</b>, click <b>Add app</b> → the <b>Android</b> icon.</>,
        <>Paste the package name exactly (it’s case-sensitive and can’t be changed later), then click <b>Register app</b>.</>,
        <>Click <b>Download google-services.json</b> and save it as <code>android/app/google-services.json</code>. Make sure the browser didn’t rename it to <code>google-services (1).json</code>.</>,
        "Skip Firebase’s “Add Firebase SDK” step — React Native Firebase handles it. Continue to the console.",
      ]} />
      <CodeBlock code={code.androidFiles} language="Text" filename="Where the files go" lineNumbers={false} />
      <SubHeading>2c. Apply the Google Services plugin</SubHeading>
      <Body>React Native projects use the <code>buildscript</code> form. If your project uses a <code>plugins {"{ }"}</code> block, use the second tab.</Body>
      <CodeTabs label="Gradle style" options={{
        "buildscript (React Native default)": { code: `${code.androidRootGradle}\n\n${code.androidAppGradle}`, language: "Gradle", filename: "android/build.gradle · android/app/build.gradle" },
        "plugins { } block": { code: code.androidPluginsDsl, language: "Gradle", filename: "android/build.gradle · android/app/build.gradle" },
      }} />
      <SubHeading>2d. Rebuild</SubHeading>
      <Body>Native changes need a new build; reloading Metro isn’t enough.</Body>
      <CodeBlock code={code.androidRebuild} language="Shell" />
      <Callout tone="note" title="SHA-1 fingerprints are optional for push">FCM doesn’t need them. Add them (from <code>cd android && ./gradlew signingReport</code>) only if you also use Google Sign-In, Phone Auth or App Check.</Callout>
    </Step>

    <Step id="ios" number={3} title="Add the iOS app">
      <SubHeading>3a. Register it and download the config</SubHeading>
      <List ordered items={[
        <>Find your bundle ID: open <code>ios/YourApp.xcworkspace</code> in Xcode → select the app target → <b>General → Bundle Identifier</b> (Expo: <code>ios.bundleIdentifier</code>).</>,
        <>In Firebase, click <b>Add app</b> → the <b>iOS+</b> icon, paste the bundle ID, click <b>Register app</b>.</>,
        <>Click <b>Download GoogleService-Info.plist</b>.</>,
        <>Drag the file into the app folder in Xcode’s navigator. In the dialog, check <b>Copy items if needed</b> and your app target.</>,
      ]} />
      <CodeBlock code={code.iosFiles} language="Text" filename="Where the files go" lineNumbers={false} />
      <SubHeading>3b. Turn on push capabilities</SubHeading>
      <Body>In Xcode → app target → <b>Signing & Capabilities</b> → <b>+ Capability</b>: add <b>Push Notifications</b>, then <b>Background Modes</b> and tick <b>Remote notifications</b>.</Body>
      <SubHeading>3c. Initialize Firebase at launch</SubHeading>
      <CodeTabs label="AppDelegate" options={{ "Swift (RN 0.77+)": { code: code.appDelegateSwift, language: "Swift", filename: "ios/YourApp/AppDelegate.swift" }, "Objective-C (RN < 0.77)": { code: code.appDelegateObjc, language: "Objective-C", filename: "ios/YourApp/AppDelegate.mm" } }} />
      <SubHeading>3d. Pods</SubHeading>
      <Body>React Native Firebase asks for dynamic frameworks. Don’t also set <code>:linkage =&gt; :static</code> — <code>pod install</code> rejects that combination.</Body>
      <CodeBlock code={code.podfile} filename="ios/Podfile" language="Ruby" highlight={[3]} />
      <CodeBlock code={code.podInstall} language="Shell" />
      <Body>Optional: React Native Firebase reads settings from a <code>firebase.json</code> at the project root. The default already registers iOS for remote messages; you only need the file to change it.</Body>
      <CodeBlock code={code.firebaseJson} filename="firebase.json" language="JSON" />
      <Callout tone="note" title="Test on a real iPhone">A physical device is the reliable way to test APNs, signing and permissions.</Callout>
    </Step>

    <Step id="apns" number={4} title="Connect APNs (iOS)">
      <Body>Firebase delivers to iPhones through Apple’s push service, so it needs your APNs key. One key covers development and production, and every app in your team.</Body>
      <SubHeading>4a. Create the key in Apple Developer</SubHeading>
      <List ordered items={[
        <>Open <b>developer.apple.com/account</b> → <b>Certificates, Identifiers & Profiles</b> → <b>Keys</b> → <b>+</b>.</>,
        <>Name it (e.g. “PixlPush APNs”), tick <b>Apple Push Notifications service (APNs)</b>, click <b>Continue</b> → <b>Register</b>.</>,
        <>Click <b>Download</b>. You get <code>AuthKey_XXXXXXXXXX.p8</code> — Apple lets you download it only once.</>,
        <>Note the <b>Key ID</b> (on the key page) and your <b>Team ID</b> (under <b>Membership details</b>).</>,
      ]} />
      <SubHeading>4b. Upload it to Firebase</SubHeading>
      <List ordered items={[
        <>Firebase → <b>Project settings</b> → <b>Cloud Messaging</b> tab.</>,
        <>Under <b>Apple app configuration</b>, find your iOS app → <b>APNs Authentication Key</b> → <b>Upload</b>.</>,
        <>Choose the <code>.p8</code> file, enter the Key ID and Team ID, click <b>Upload</b>.</>,
      ]} />
    </Step>

    <Step id="service-account" number={5} title="Generate the service-account JSON">
      <Body>This is the file PixlPush uploads in <b>Project settings → Firebase / FCM</b>. It’s a private key for a Google “service account” — a robot user that PixlPush’s server signs in as to send your pushes. There are two ways to create it.</Body>

      <SubHeading>Option A — Push-only account (recommended)</SubHeading>
      <Body>The account can send notifications and nothing else. This is what PixlPush’s connect dialog recommends.</Body>
      <List ordered items={[
        <>Open <b>console.cloud.google.com</b> and pick your Firebase project in the project selector at the top (Firebase projects are Google Cloud projects with the same ID).</>,
        <>Go to <b>IAM & Admin → Service accounts</b> and click <b>+ Create service account</b>.</>,
        <>Name it <code>pixlpush-fcm-sender</code>, then click <b>Create and continue</b>.</>,
        <>Under <b>Grant this service account access to project</b>, choose the role <b>Firebase Cloud Messaging API Admin</b>. Click <b>Continue</b>, then <b>Done</b>.</>,
        <>Click the new account’s email → <b>Keys</b> tab → <b>Add key → Create new key</b> → <b>JSON</b> → <b>Create</b>. The file downloads once; store it somewhere safe.</>,
      ]} />

      <SubHeading>Option B — Firebase Admin key (quicker, broader)</SubHeading>
      <List ordered items={[
        <>Firebase → <b>Project settings</b> → <b>Service accounts</b> tab.</>,
        <>With <b>Firebase Admin SDK</b> selected, click <b>Generate new private key</b> → <b>Generate key</b>.</>,
      ]} />
      <Callout tone="warning" title="Option B gives PixlPush more than push access">This key can also read and write your database, users and storage. PixlPush works with it and will show a warning; use Option A when you can.</Callout>

      <SubHeading>Is this the right file?</SubHeading>
      <Body>The service-account JSON starts with <code>&quot;type&quot;: &quot;service_account&quot;</code> and contains <code>private_key</code> and <code>client_email</code>. If you see <code>project_info</code>, you picked <code>google-services.json</code> by mistake — PixlPush tells you so.</Body>
      <CodeTabs label="Which file" options={{
        "✓ Service account (upload this)": { code: code.serviceAccountShape, language: "JSON", filename: "your-firebase-project-1a2b3c.json" },
        "✗ google-services.json (app config)": { code: code.googleServicesShape, language: "JSON", filename: "google-services.json" },
      }} />
      <Callout tone="note" title="“Key creation is disabled”?">Organizations created since May 2024 block service-account keys by default (policy <code>iam.disableServiceAccountKeyCreation</code>). Ask your Google Cloud organization admin to allow it for this project.</Callout>
    </Step>

    <Step id="connect" number={6} title="Connect it in PixlPush">
      <List ordered items={[
        <>In PixlPush, open <LinkBox href="/dashboard/settings/firebase" sx={{ color: "inherit" }}><b>Project settings → Firebase / FCM</b></LinkBox> (owner, admin or developer role).</>,
        <>Click <b>Connect Firebase</b> (or <b>Replace credentials</b> if one is already connected).</>,
        <>Click <b>Choose JSON file</b> and pick the file from step 5. The dialog shows <b>Firebase project in this file</b> — it must equal the Project ID from step 1.</>,
        <>Click <b>Validate and connect</b>.</>,
      ]} />
      <Body>PixlPush asks Google for a token with the key, then sends a test message with <code>validate_only</code> (nothing is delivered). Only if both succeed is the key stored, encrypted. A failed upload never replaces a working one.</Body>
    </Step>

    <Section id="checklist" title="Read the connection checklist">
      <Body>After connecting, the Firebase / FCM tab shows four rows. All four green means push is fully working.</Body>
      <DataTable code={false} headers={["Row", "Green when", "If it isn’t green"]} minWidth={640} rows={[
        ["Service account JSON", "Uploaded", "Do step 5 and 6."],
        ["Firebase Cloud Messaging API", "Enabled — Google accepted the test message", "“Check failed”: read the error under the title, then see Common errors."],
        ["Firebase project ID", "Shows your project ID", "Compare it with project_id in google-services.json and PROJECT_ID in GoogleService-Info.plist. They must match."],
        ["Token sync", "“N active device tokens”", "“Waiting for the SDK”: no phone has registered yet. Run a development build, allow notifications, and call PixlPush.syncPushToken()."],
      ]} />
      <List items={[
        <><b>Re-check</b> re-runs the Google validation with the stored key.</>,
        <><b>Replace credentials</b> rotates the key (same Firebase project). Afterwards, delete the old key in Google Cloud → the service account → Keys.</>,
        <><b>Start change flow</b> moves to a different Firebase project; you type the new project ID to confirm, and existing device tokens may stop working until users reopen the app.</>,
        <><b>Disconnect</b> stops all push sending for the project.</>,
      ]} />
    </Section>

    <Section id="expo" title="Expo projects">
      <Body>Expo generates the native projects for you, so steps 2c, 3b, 3c and 3d become config. Put both Firebase files in your project (often the root) and point to them:</Body>
      <CodeBlock code={code.expoConfig} filename="app.config.js" language="JavaScript" highlight={[6, 10, 11, 12]} />
      <CodeBlock code={code.expoBuild} language="Shell" />
      <List items={[
        "Expo Go can’t run push: React Native Firebase is native code. Use a development build.",
        "After adding native modules or changing this config, uninstall the old development build before installing the new one.",
        <>Using <code>expo-notifications</code> for display? Read <A href={rn(base, "push", "expo-notifications")}>which token to send</A>.</>,
      ]} />
    </Section>

    <Section id="errors" title="Common errors">
      <DataTable code={false} headers={["You see", "Cause", "Fix"]} minWidth={720} rows={[
        ["“This is google-services.json (app config)…”", "You chose the app config file.", "Upload the service-account JSON from step 5."],
        ["INVALID_SERVICE_ACCOUNT", "The file isn’t a service-account key.", "Download a new JSON key (step 5)."],
        ["“Google rejected this service account…”", "The key was deleted or disabled in Google Cloud.", "Create a new key and Replace credentials."],
        ["“…not allowed to send messages via FCM”", "The account lacks the Firebase Cloud Messaging API Admin role.", "Add the role (step 5, Option A)."],
        ["API disabled / “has not been used”", "Firebase Cloud Messaging API is off for the project.", "Google Cloud → APIs & Services → enable “Firebase Cloud Messaging API”, then Re-check."],
        ["Message skipped: no_active_push_subscription", "That user has no active device token (or logged out on it).", "Open the app, allow notifications, syncPushToken()."],
        ["Message failed: firebase_not_configured", "No service account connected.", "Do step 6."],
        ["Android build: “No matching client found for package name”", "applicationId ≠ the package registered in Firebase.", "Register the right package or fix applicationId."],
        ["Android build: “File google-services.json is missing”", "Wrong location or renamed file.", "Place it at android/app/google-services.json."],
        ["iOS crash in FirebaseApp.configure", "The plist isn’t in the app target.", "Re-add it with your target ticked."],
        ["iOS gets a token but no pushes", "No APNs key in Firebase, or capabilities missing.", "Do steps 3b and 4."],
      ]} />
    </Section>
  </>;
}
