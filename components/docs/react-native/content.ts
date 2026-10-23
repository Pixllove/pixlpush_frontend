// React Native SDK content, verified against pixlpush_backend/packages (core + react-native) at 0.3.6.
// Every option, default, method and error code here exists in that source; keep it that way.

export const SDK_VERSION = "0.3.6";
export const REVIEWED_AGAINST = "@pixlpush/react-native 0.3.6";

export const installCommands = {
  Expo: "npx expo install @pixlpush/react-native @react-native-async-storage/async-storage",
  npm: "npm install @pixlpush/react-native @react-native-async-storage/async-storage",
  yarn: "yarn add @pixlpush/react-native @react-native-async-storage/async-storage",
  pnpm: "pnpm add @pixlpush/react-native @react-native-async-storage/async-storage",
};

export const pushInstallCommands = {
  Expo: "npx expo install @react-native-firebase/app @react-native-firebase/messaging expo-build-properties",
  npm: "npm install @react-native-firebase/app @react-native-firebase/messaging",
  yarn: "yarn add @react-native-firebase/app @react-native-firebase/messaging",
  pnpm: "pnpm add @react-native-firebase/app @react-native-firebase/messaging",
};

export const code = {
  envExpo: `# Expo inlines EXPO_PUBLIC_* values into the app bundle.
# Only public values belong here: the SDK key is a public client identifier.
EXPO_PUBLIC_PIXLPUSH_KEY=YOUR_DEVELOPMENT_SDK_KEY
EXPO_PUBLIC_PIXLPUSH_PROJECT_ID=YOUR_PROJECT_ID`,

  envBare: `// Bare React Native.
// Inject these with the build-time config tool you already use (for example react-native-config);
// the SDK does not read environment variables itself.
export const PIXLPUSH_SDK_KEY = __DEV__ ? "YOUR_DEVELOPMENT_SDK_KEY" : "YOUR_PRODUCTION_SDK_KEY";
export const PIXLPUSH_PROJECT_ID = "YOUR_PROJECT_ID";`,

  initialize: `import PixlPush, { type PixlPushStatus } from "@pixlpush/react-native";

let ready: Promise<PixlPushStatus> | undefined;

export function startPixlPush() {
  ready ??= (async () => {
    // Listeners work before configure. Register them first so nothing
    // emitted during start-up (such as a cold-start notification tap) is missed.
    PixlPush.onError((error) => {
      if (__DEV__) console.warn(\`[PixlPush] \${error.code}\`, error.message);
    });

    return PixlPush.configure({
      sdkKey: process.env.EXPO_PUBLIC_PIXLPUSH_KEY!,
      projectId: process.env.EXPO_PUBLIC_PIXLPUSH_PROJECT_ID,
      environment: __DEV__ ? "development" : "production",
      appName: "Your app",
      enableLogging: __DEV__,
    });
  })().catch((error) => {
    ready = undefined; // allow a retry, e.g. after fixing a missing key
    throw error;
  });
  return ready;
}`,

  entry: `import { useEffect } from "react";
import { startPixlPush } from "./src/lib/pixlpush";

export default function App() {
  useEffect(() => {
    startPixlPush().catch((error) => {
      // SDK_KEY_MISSING or SDK_ALREADY_CONFIGURED. Analytics must never block the UI.
      if (__DEV__) console.warn("PixlPush did not start", error);
    });
  }, []);

  return <RootNavigator />;
}`,

  status: `const status = PixlPush.getStatus();
// {
//   configured: true,
//   environment: "development",
//   sdkVersion: "0.3.6",
//   queueSize: 1,
//   identified: false,
//   pixlpushId: "pixlpush_c…",   // permanent PixlPush user ID
//   anonymousId: "c…",           // set while nobody is logged in
//   deviceId: "4f1c…",           // random per install, not a hardware ID
//   externalUserId: null,
//   sessionId: "9b2e…",
// }`,

  identify: `import PixlPush from "@pixlpush/react-native";

export async function onSignedIn(user: AppUser) {
  await PixlPush.identify({
    externalUserId: user.id, // your stable internal ID, never an email
    email: user.email,
    name: user.displayName,
    preferredLanguage: user.locale,
    properties: { plan: user.plan },
  });
  // Re-send this device's push token for the signed-in user right away
  // (the SDK also does this the next time the app comes to the foreground).
  await PixlPush.syncPushToken();
}

export async function onSignedOut() {
  // Await before another account can sign in on this device.
  await PixlPush.reset();
}`,

  updateUser: `await PixlPush.updateUser({
  accountStatus: "active",
  country: "DE",
  properties: { plan: "pro", seats: 5 },
});`,

  track: `const eventId = await PixlPush.track(
  "checkout_completed",
  { orderId: "ord_1042", value: 149, currency: "EUR" },
  { source: "checkout_screen" },
);`,

  idempotent: `// Retrying the same business action? Reuse its ID so it can be de-duplicated.
await PixlPush.track(
  "subscription_started",
  { plan: "pro" },
  { eventId: \`subscription_started:\${subscription.id}\`, timestamp: subscription.startedAt },
);`,

  batch: `const ids = await PixlPush.trackBatch([
  { name: "tutorial_step_completed", properties: { step: 1 } },
  { name: "tutorial_step_completed", properties: { step: 2 } },
  { name: "tutorial_completed", options: { source: "onboarding" } },
]); // at most 100 per call; returns one event ID per event`,

  typed: `import PixlPush, { type TrackOptions } from "@pixlpush/react-native";

type Events = {
  signup_completed: { method: "email" | "google" | "apple" };
  checkout_completed: { orderId: string; value: number; currency: string };
  paywall_viewed: { placement: string };
};

export function track<Name extends keyof Events>(name: Name, properties: Events[Name], options?: TrackOptions) {
  return PixlPush.track(name, properties, options);
}`,

  consent: `// When the user answers your privacy prompt (before or after login):
await PixlPush.setConsent({
  analytics: choices.analytics, // false: track() calls are dropped, not queued
  email: choices.marketingEmail,
  push: choices.marketingPush,
});`,

  flush: `const { processed, failed, remaining } = await PixlPush.flush();`,

  listeners: `// Import this file before startPixlPush() runs.
import { Linking } from "react-native";
import PixlPush from "@pixlpush/react-native";

// A tap that launched the app is reported while configure() starts up,
// so these must exist before configure is called.
PixlPush.addNotificationOpenedListener((notification) => {
  if (notification.deepLink) Linking.openURL(notification.deepLink).catch(() => {});
});

PixlPush.addNotificationActionListener(({ actionId, notification }) => {
  if (actionId === "reply") openReply(notification.data);
});`,

  permission: `import { PermissionsAndroid, Platform } from "react-native";
import { AuthorizationStatus, getMessaging, requestPermission } from "@react-native-firebase/messaging";
import PixlPush from "@pixlpush/react-native";

// Call from a button or onboarding step, never automatically at launch.
export async function enableNotifications() {
  if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  const status = await requestPermission(getMessaging());
  await PixlPush.syncPushToken(); // sends the FCM token, or "denied"
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}`,

  foregroundRepost: `// FCM doesn't show a notification while the app is open. Re-post it with
// expo-notifications so the user sees it and a tap is attributed automatically.
import { getMessaging, onMessage } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import PixlPush from "@pixlpush/react-native";

onMessage(getMessaging(), async (message) => {
  PixlPush.handleNotification(message); // emits notification_received
  await Notifications.scheduleNotificationAsync({
    content: {
      title: message.notification?.title,
      body: message.notification?.body,
      data: message.data, // keep this: it carries pp_job_id for open attribution
    },
    trigger: null,
  });
});`,

  foreground: `// FCM does not show or report foreground messages to PixlPush by itself.
import { getMessaging, onMessage } from "@react-native-firebase/messaging";
import PixlPush from "@pixlpush/react-native";

const unsubscribe = onMessage(getMessaging(), (message) => {
  PixlPush.handleNotification(message); // emits notification_received
});

PixlPush.addNotificationReceivedListener((notification) => {
  showInAppBanner(notification.title, notification.body);
});`,

  cliModule: `import PixlPush, { type NotificationModule } from "@pixlpush/react-native";

// Adapt your CLI notification library once. The SDK still owns normalization,
// automatic open attribution and duplicate protection.
const notificationModule: NotificationModule = {
  addNotificationResponseReceivedListener(listener) {
    const unsubscribe = registerLocalNotificationPress(listener);
    return { remove: unsubscribe };
  },
  async scheduleNotificationAsync({ content }) {
    return displayLocalNotification({
      title: content.title,
      body: content.body,
      data: content.data, // preserve pp_job_id
    });
  },
  async getLastNotificationResponseAsync() {
    return getLocalNotificationLaunchResponse();
  },
};

await PixlPush.configure({
  sdkKey: PIXLPUSH_SDK_KEY,
  notificationModule,
});`,

  expoToken: `// Android only: with expo-notifications, the device token is the FCM token.
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

if (Platform.OS === "android") {
  const { data } = await Notifications.getDevicePushTokenAsync();
  await PixlPush.updatePushToken(data, "fcm", "granted");
}
// Never pass getExpoPushTokenAsync() — an ExponentPushToken[…] is not an FCM token.`,

  verify: `await startPixlPush();
console.log(PixlPush.getStatus());               // configured: true

await PixlPush.identify({ externalUserId: "qa-user-001" });
const eventId = await PixlPush.track("integration_verified", { build: "dev" });

console.log(eventId, await PixlPush.flush());   // { processed: ≥2, failed: 0, remaining: 0 }`,


  serviceAccountShape: `{
  "type": "service_account",
  "project_id": "your-firebase-project",
  "private_key_id": "…",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n…\\n-----END PRIVATE KEY-----\\n",
  "client_email": "pixlpush-fcm-sender@your-firebase-project.iam.gserviceaccount.com",
  "client_id": "…",
  "token_uri": "https://oauth2.googleapis.com/token"
}`,

  googleServicesShape: `{
  "project_info": {
    "project_number": "…",
    "project_id": "your-firebase-project"
  },
  "client": [ … ]
}`,

  androidPluginsDsl: `// android/build.gradle
plugins {
  id("com.google.gms.google-services") version "4.5.0" apply false
}

// android/app/build.gradle
plugins {
  id("com.android.application")
  id("com.google.gms.google-services")
}`,

  // --- Firebase native configuration -------------------------------------------------------------
  expoConfig: `export default {
  expo: {
    name: "Your app",
    android: {
      package: "com.yourcompany.yourapp",
      googleServicesFile: "./google-services.json",
    },
    ios: {
      bundleIdentifier: "com.yourcompany.yourapp",
      googleServicesFile: "./GoogleService-Info.plist",
      entitlements: { "aps-environment": "production" },
      infoPlist: { UIBackgroundModes: ["remote-notification"] },
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      ["expo-build-properties", { ios: { useFrameworks: "dynamic" } }],
    ],
  },
};`,

  expoBuild: `# Regenerate native projects after changing plugins or Firebase files
npx expo prebuild --clean

# Run a development build on a device or emulator
npx expo run:android
npx expo run:ios

# Or build in the cloud
eas build --profile development --platform all`,

  androidIdentity: `// applicationId is your Android package name
android {
    namespace "com.yourcompany.yourapp"
    defaultConfig {
        applicationId "com.yourcompany.yourapp"
    }
}`,

  androidFiles: `android/
├── build.gradle                 ← Google Services classpath
└── app/
    ├── build.gradle             ← apply the plugin; namespace = package name
    ├── google-services.json     ← downloaded from Firebase
    └── src/main/AndroidManifest.xml`,

  signingReport: `cd android && ./gradlew signingReport
# Copy the SHA-1 and SHA-256 of the "debug" and "release" variants
# into Firebase Console → Project settings → Your apps → Android app.`,

  androidRootGradle: `buildscript {
  dependencies {
    // ...
    classpath "com.google.gms:google-services:4.5.0"
  }
}`,

  androidAppGradle: `apply plugin: "com.android.application"
apply plugin: "com.google.gms.google-services"`,

  androidRebuild: `cd android && ./gradlew clean && cd ..
npx react-native run-android`,

  iosFiles: `ios/
├── Podfile
├── YourApp.xcworkspace          ← always open this, not the .xcodeproj
├── YourApp.xcodeproj
└── YourApp/
    ├── AppDelegate.swift        ← React Native 0.77+
    ├── AppDelegate.mm           ← React Native < 0.77
    └── GoogleService-Info.plist ← added to the YourApp target`,

  podfile: `# Inside your app target, before use_react_native!
target 'YourApp' do
  use_frameworks! :linkage => :dynamic
  config = use_native_modules!
  use_react_native!(:path => config[:reactNativePath])
end`,

  podInstall: `cd ios && pod install --repo-update && cd ..
npx react-native run-ios --device`,

  appDelegateSwift: `import UIKit
import React
import ReactAppDependencyProvider
import Firebase

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()
    // ...the rest of the generated React Native setup
    return true
  }
}`,

  appDelegateObjc: `#import "AppDelegate.h"
#import <Firebase.h>

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];
  // ...the rest of the generated React Native setup
}`,

  firebaseJson: `{
  "react-native": {
    "messaging_ios_auto_register_for_remote_messages": true
  }
}`,


};

// [option, type, default, description]
export const configOptions: [string, string, string, string][] = [
  ["sdkKey", "string", "required", "Project-scoped public SDK key. Missing or empty throws SDK_KEY_MISSING."],
  ["projectId", "string", "—", "Project ID or slug. Optional consistency check: the key already determines the project."],
  ["environment", '"development" | "staging" | "production"', '"production"', "Stored on every event and identity update."],
  ["appName", "string", "—", "Name of the app embedding the SDK."],
  ["appVersion", "string", "native app version", "Read from expo-application when available."],
  ["enableLogging", "boolean", "false", "Logs queue, retry and suppression details to the console."],
  ["defaultTimeoutMs", "number", "10000", "Per-request network timeout."],
  ["autoFlushIntervalMs", "number", "15000", "Queue flush timer; 0 disables the timer (foreground/background flushes still run)."],
  ["maxQueueSize", "number", "1000", "When full, the oldest event or open is dropped; identity and reset items are kept."],
  ["queueRetentionDays", "number", "7", "Queued items older than this are discarded."],
  ["sessionInactivityTimeoutMs", "number", "1800000", "30 minutes without activity starts a new session."],
  ["trackLifecycleEvents", "boolean", "true", "Records app_opened and app_backgrounded."],
  ["autoPush", "boolean", "true", "With @react-native-firebase/messaging installed, registers FCM tokens and records opens automatically."],
  ["storage", "StorageAdapter", "AsyncStorage", "Custom persistence; falls back to memory when AsyncStorage is missing."],
  ["platform", "string", "Platform.OS", "Override the reported platform."],
];

// Options the SDK accepts but apps must not set: the key decides the server, the package sets the version.
export const internalOptions: [string, string][] = [
  ["apiBaseUrl", "Leave unset. Your SDK key already decides where data goes."],
  ["sdkVersion", "Leave unset. The package reports its own version."],
];

// [code, transient, meaning, fix]
export const errorCodes: [string, string, string, string][] = [
  ["SDK_NOT_CONFIGURED", "no", "A method ran before configure().", "Await startPixlPush() first."],
  ["SDK_ALREADY_CONFIGURED", "no", "configure() was called again with a different key or project.", "Configure once per process."],
  ["SDK_KEY_MISSING", "no", "sdkKey is empty, or the request had no key.", "Check the environment variable is inlined in this build."],
  ["SDK_KEY_INVALID", "no — stops the queue", "The key is unknown or revoked (HTTP 401).", "Create a new key and ship it."],
  ["SDK_KEY_PROJECT_MISMATCH", "no — stops the queue", "projectId does not match the key’s project (401).", "Fix projectId or remove it."],
  ["PROJECT_INACTIVE", "no — stops the queue", "The project is deactivated (403).", "Reactivate the project."],
  ["NETWORK_ERROR", "yes (5xx, offline)", "Network failure or server error.", "Nothing; the queue retries with backoff."],
  ["TIMEOUT", "yes", "The request exceeded defaultTimeoutMs.", "Nothing; retried."],
  ["RATE_LIMITED", "yes", "HTTP 429; Retry-After is honoured.", "Nothing; retried."],
  ["VALIDATION_ERROR", "no", "Invalid name, property, ID, or payload (422).", "Fix the call; rejected items are discarded."],
  ["PAYLOAD_TOO_LARGE", "no", "HTTP 413.", "Send fewer or smaller properties."],
  ["QUEUE_FULL", "no — reported, not thrown", "The queue hit maxQueueSize and dropped its oldest event (or, if none, its oldest item).", "Restore connectivity; raise maxQueueSize if offline periods are long."],
  ["NO_IDENTIFIED_USER", "no", "Declared by the SDK; not thrown by 0.3.6 methods.", "—"],
  ["STORAGE_ERROR", "no", "Declared by the SDK; storage failures fall back to memory instead.", "—"],
];

type Method = { name: string; signature: string; returns: string; description: string; notes?: string; example?: string };

export const methods: Record<"setup" | "identity" | "events" | "push" | "listeners", Method[]> = {
  setup: [
    { name: "configure", signature: "configure(config: PixlPushConfig)", returns: "Promise<PixlPushStatus>", description: "Starts the SDK: loads storage, consent and the queue, creates the install’s random device ID and anonymous user on first launch, queues an identity update, and records app_opened.", notes: "Idempotent for the same sdkKey and projectId; otherwise throws SDK_ALREADY_CONFIGURED. Also wires AppState flushes and, with autoPush, Firebase listeners." },
    { name: "getStatus", signature: "getStatus()", returns: "PixlPushStatus", description: "Synchronous snapshot: configured, environment, sdkVersion, queueSize, identified, pixlpushId, anonymousId, deviceId, externalUserId, sessionId." },
    { name: "flush", signature: "flush()", returns: "Promise<{ processed, failed, remaining }>", description: "Sends due queue items now. Consecutive events go in batches of up to 100." },
    { name: "onError", signature: "onError(listener: (error: PixlPushError) => void)", returns: "() => void", description: "Receives queue and network errors. Returns an unsubscribe function. Safe before configure." },
  ],
  identity: [
    { name: "identify", signature: "identify(identity: EndUserIdentity)", returns: "Promise<void>", description: "Links your externalUserId (1–255 chars) to this install. Accepts email, name, accountStatus, userType, country, region, timezone, preferredLanguage, emailConsent and properties.", notes: "Identifying a different user without reset() first starts a fresh PixlPush user for the new account." },
    { name: "updateUser", signature: "updateUser(fields: Partial<EndUserIdentity>)", returns: "Promise<void>", description: "Queues profile, consent, device or custom-property changes for the current (anonymous or identified) user." },
    { name: "reset", signature: "reset()", returns: "Promise<void>", description: "Logout: unlinks the install from the user on the server and deactivates its push tokens, clears the external ID and session, creates a new anonymous user and pixlpushId, then flushes.", notes: "The former user and their history stay in PixlPush." },
  ],
  events: [
    { name: "track", signature: "track(name: string, properties?: Record<string, unknown>, options?: TrackOptions)", returns: "Promise<string>", description: "Validates and queues one event enriched with user, installation, session, environment, platform and timestamp. Returns the event ID.", notes: "With analytics consent false the event is dropped and an ID is still returned." },
    { name: "trackBatch", signature: "trackBatch(events: { name, properties?, options? }[])", returns: "Promise<string[]>", description: "Queues up to 100 events; more throws VALIDATION_ERROR. An empty array returns []." },
    { name: "setConsent", signature: "setConsent(consent: { analytics?, email?, push? })", returns: "Promise<void>", description: "Persists consent and merges with earlier choices. Email and push choices are sent to PixlPush with an identity update." },
  ],
  push: [
    { name: "syncPushToken", signature: "syncPushToken()", returns: "Promise<void>", description: "Reads Firebase permission: authorized/provisional sends the FCM token; denied sends permission \"denied\". No-op without @react-native-firebase/messaging.", notes: "Called automatically on configure and on every return to the foreground." },
    { name: "updatePushToken", signature: 'updatePushToken(token: string, provider: "fcm" | "apns" | "web_push" = "fcm", permission?: string)', returns: "Promise<void>", description: "Registers or rotates a token for this installation. The mobile push integration uses native FCM tokens." },
    { name: "updatePushPermission", signature: "updatePushPermission(permission: string)", returns: "Promise<void>", description: "Records the OS permission, e.g. \"granted\", \"denied\", \"provisional\"." },
    { name: "handleNotification", signature: "handleNotification(raw: unknown)", returns: "NormalizedPushPayload", description: "For foreground messages: normalizes the payload and emits notification_received. Does not record an open." },
    { name: "setInitialNotification", signature: "setInitialNotification(raw: unknown)", returns: "NormalizedPushPayload", description: "Stores a cold-start payload your native layer captured, for getInitialNotification()." },
    { name: "getInitialNotification", signature: "getInitialNotification()", returns: "NormalizedPushPayload | null", description: "Returns and clears the payload stored by setInitialNotification. It does not query Firebase; the SDK handles Firebase cold starts itself." },
  ],
  listeners: [
    { name: "addNotificationOpenedListener", signature: "addNotificationOpenedListener(listener)", returns: "() => void", description: "A plain tap on a notification (any app state)." },
    { name: "addNotificationActionListener", signature: "addNotificationActionListener(listener)", returns: "() => void", description: "An action button: receives { actionId, notification }." },
    { name: "addNotificationReceivedListener", signature: "addNotificationReceivedListener(listener)", returns: "() => void", description: "Foreground messages passed to handleNotification." },
    { name: "addPushTokenListener", signature: "addPushTokenListener(listener)", returns: "() => void", description: "Each token sent through updatePushToken." },
    { name: "addPushPermissionListener", signature: "addPushPermissionListener(listener)", returns: "() => void", description: "Each permission sent through updatePushPermission." },
    { name: "addListener / removeListener", signature: 'addListener(event, listener) · removeListener(event, listener)', returns: "() => void · void", description: "Typed access to notification_received, notification_opened, notification_action, push_token_changed, push_permission_changed and error." },
  ],
};

/** The public method names above, used by tests to keep the docs aligned with the SDK. */
export const documentedMethodNames = Object.values(methods).flat().flatMap((method) => method.name.split(" / "));

// Agent-agnostic setup prompt (Claude Code, Cursor, Copilot, Codex, Windsurf, Gemini CLI, Cline…).
// Built from the same snippets the Quickstart, Installation, Firebase and Push guides render, so it cannot drift from them.
const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```";
const list = (commands: Record<string, string>) => Object.entries(commands).map(([name, cmd]) => `- ${name}: \`${cmd}\``).join("\n");

export const aiPrompt = `You are a senior React Native engineer. Integrate the PixlPush SDK (@pixlpush/react-native ${SDK_VERSION}) into this repository: analytics, user identity and push notifications. Work like a careful reviewer is watching: small, focused changes that match the existing code.

<goal>
When you are done, the app configures PixlPush once at startup, identifies users on sign-in, resets on sign-out, tracks its core product events, registers for push, and passes the verification step below.
</goal>

<rules>
1. Source of truth: use ONLY the packages, options and methods in this prompt. Do not invent APIs. Do not set apiBaseUrl or sdkVersion.
2. Fit the codebase: follow its language (TS/JS), folder layout, naming, formatting and state/auth patterns. Adapt file paths; keep behaviour identical.
3. Secrets: only the public SDK key and project ID go in the app. Never add a dashboard token, Firebase service-account JSON or APNs .p8 key to the repo, bundle or env files.
4. Privacy: never send passwords, tokens, payment data or other sensitive values as event or user properties. externalUserId is the stable internal user ID, never an email.
5. Scope: do not refactor unrelated code, upgrade unrelated dependencies, or touch Firebase/Apple/PixlPush consoles.
6. Uncertainty: if the project conflicts with these steps (unknown auth flow, monorepo, unusual entry point), stop and ask one concise question instead of guessing.
</rules>

<workflow>
Step 0 — Inspect, then plan. Before editing, report in a short list:
- Expo (app.json / app.config.*) or bare React Native, and the RN version
- package manager (from the lockfile)
- app entry point (App.tsx or expo-router root layout)
- where sign-in and sign-out happen
- whether a privacy/consent prompt exists
- the files you intend to create or change
Then proceed.

Step 1 — Install (pick the matching command):
${list(installCommands)}

Step 2 — Public config.
Expo → .env:
${fence("sh", code.envExpo)}
Bare → src/config/pixlpush.ts (inject values with the project's existing build-time config tool; the SDK reads no env vars itself):
${fence("ts", code.envBare)}
Leave the key as a placeholder; I will paste it from PixlPush → Project settings → SDK keys.

Step 3 — Configure once → src/lib/pixlpush.ts
${fence("ts", code.initialize)}
Call it from the entry point:
${fence("tsx", code.entry)}

Step 4 — Identity: hook into the existing auth flow.
${fence("ts", code.identify)}

Step 5 — Events: track this app's core actions (snake_case names, non-sensitive properties).
${fence("ts", code.track)}
If a consent prompt exists, forward its answers:
${fence("ts", code.consent)}

Step 6 — Push (code only).
${list(pushInstallCommands)}
React Native Firebase must be v22+ (modular API).

Expo → merge into app.config.*, then rebuild (Expo Go cannot receive push):
${fence("js", code.expoConfig)}
${fence("sh", code.expoBuild)}

Bare Android → android/build.gradle and android/app/build.gradle:
${fence("gradle", code.androidRootGradle + "\n\n" + code.androidAppGradle)}

Bare iOS → Podfile, AppDelegate (Swift for RN 0.77+, otherwise Objective-C), firebase.json, then run pod install:
${fence("ruby", code.podfile)}
${fence("swift", code.appDelegateSwift)}
${fence("objc", code.appDelegateObjc)}
${fence("json", code.firebaseJson)}

Listeners → in a file imported before startPixlPush() runs:
${fence("ts", code.listeners)}
Permission → call from a button or onboarding step, never automatically at launch:
${fence("ts", code.permission)}
Foreground messages:
${fence("ts", code.foreground)}
Never send an Expo push token (ExponentPushToken[…]) to PixlPush; autoPush sends the native FCM token.

Step 7 — Verify → src/dev/verify-pixlpush.ts (dev builds only)
${fence("ts", code.verify)}
Run the type checker and linter the project already uses and fix anything you introduced.
</workflow>

<acceptance_criteria>
- configure() runs exactly once per app launch; errors are logged in dev and never block the UI.
- identify() runs after every sign-in; reset() is awaited on sign-out.
- At least the app's main conversion events are tracked.
- Verification prints failed: 0, remaining: 0, and qa-user-001 appears in PixlPush → Users with an integration_verified event.
- No secrets, no sensitive properties, no unrelated changes.
</acceptance_criteria>

<manual_steps>
Do not attempt these. List them for me at the end and point me to the "Firebase & push setup" guide in the PixlPush docs:
1. Firebase project → add the Android app (package name) → place google-services.json in android/app/ (Expo: project root).
2. Add the iOS app (bundle ID) → add GoogleService-Info.plist to the iOS target (Expo: project root).
3. Apple Developer → create an APNs .p8 key → upload it to Firebase.
4. Create a service-account JSON (role: Firebase Cloud Messaging API Admin) → upload it in PixlPush → Project settings → Firebase / FCM.
5. Paste the development SDK key; create a separate production key before release.
</manual_steps>

<final_report>
End with exactly these sections:
1. Summary — two sentences.
2. Files changed — one line per file with what changed.
3. Commands to run — anything I still need to run (install, prebuild, pod install).
4. Manual steps — the checklist above, in order.
5. Open questions — assumptions you made, if any.
</final_report>`;
