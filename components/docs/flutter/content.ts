// Flutter SDK content. The version comes from sdk-versions.json, refreshed
// from pub.dev on every build (scripts/sync-sdk-versions.mjs).

import versions from "../sdk-versions.json";
import { fence } from "../prompt-kit";

export const SDK_VERSION = versions.flutter;
export const REVIEWED_AGAINST = `pixlpush Flutter SDK ${SDK_VERSION}`;

export const code = {
  install: `dependencies:
  pixlpush: ^${SDK_VERSION}`,

  key: `// Never commit a production key to a public repository.
const sdkKey = String.fromEnvironment(
  'PIXLPUSH_SDK_KEY',
  defaultValue: 'pp_sk_your_development_key',
);
const projectId = String.fromEnvironment('PIXLPUSH_PROJECT_ID');`,

  initialize: `import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/widgets.dart';
import 'package:pixlpush/pixlpush.dart';

Future<void> initializePixlPush() async {
  WidgetsFlutterBinding.ensureInitialized();

  final client = PixlPush.instance;
  await client.configure(
    const PixlPushConfig(
      sdkKey: String.fromEnvironment('PIXLPUSH_SDK_KEY'),
      projectId: String.fromEnvironment('PIXLPUSH_PROJECT_ID'),
      appName: 'My Flutter App',
      appVersion: '1.0.0',
      environment: Environment.development,
      enableLogging: true,
    ),
  );

  await Firebase.initializeApp();
}`,

  main: `Future<void> main() async {
  await initializePixlPush();
  runApp(const MyApp());
}`,

  status: `final status = PixlPush.instance.getStatus();
debugPrint('configured: \${status.configured}');
debugPrint('sdk: \${status.sdkVersion}');
debugPrint('device: \${status.deviceId}');
debugPrint('PixlPush user: \${status.pixlpushId}');
debugPrint('queue: \${status.queueSize}');`,

  identify: `await PixlPush.instance.identify(
  const EndUserIdentity(
    externalUserId: 'customer-123',
    email: 'customer@example.com',
    name: 'A customer',
    properties: <String, Object?>{'plan': 'pro'},
  ),
);

// Await reset before another account signs in on the same device.
await PixlPush.instance.reset();`,

  updateUser: `await PixlPush.instance.updateUser(
  const UserUpdate(
    country: 'PK',
    accountStatus: 'active',
    properties: <String, Object?>{'plan': 'pro'},
  ),
);`,

  track: `final eventId = await PixlPush.instance.track(
  'checkout_completed',
  properties: <String, Object?>{
    'order_id': 'order-123',
    'value': 49.99,
    'currency': 'USD',
  },
  options: const TrackOptions(source: 'checkout'),
);`,

  batch: `await PixlPush.instance.trackBatch(<TrackEvent>[
  const TrackEvent(
    name: 'screen_view',
    properties: <String, Object?>{'screen': 'Home'},
  ),
  const TrackEvent(
    name: 'feature_used',
    properties: <String, Object?>{'feature': 'search'},
  ),
]);`,

  flush: `final result = await PixlPush.instance.flush();
debugPrint('processed: \${result.processed}');
debugPrint('failed: \${result.failed}');
debugPrint('remaining: \${result.remaining}');`,

  consent: `await PixlPush.instance.setConsent(
  const ConsentSettings(
    analytics: true,
    email: true,
    push: true,
  ),
);`,

  push: `final push = PixlPushFirebaseMessaging(PixlPush.instance);
await push.initialize(requestPermission: false); // reads permission; never prompts`,

  listeners: `final removeReceived = PixlPush.instance.addNotificationReceivedListener(
  (notification) => debugPrint('Received: \${notification.title}'),
);

final removeOpened = PixlPush.instance.addNotificationOpenedListener(
  (notification) {
    debugPrint('Opened job: \${notification.notificationJobId}');
    if (notification.deepLink != null) {
      // Navigate with your own router.
    }
  },
);

// Call these from the service/widget that owns the listeners.
removeReceived();
removeOpened();`,

  permission: `// Use the same adapter instance initialized once in your push service.
// Call this from a user action, such as an onboarding or settings button.
await push.requestPermission();`,

  localDevelopment: `flutter run \\
  --dart-define=PIXLPUSH_SDK_KEY=YOUR_DEVELOPMENT_SDK_KEY \\
  --dart-define=PIXLPUSH_PROJECT_ID=YOUR_PROJECT_ID`,

  foreground: `// PixlPushFirebaseMessaging already listens for Firebase foreground
// messages and displays one local notification. Do not register another
// onMessage listener or schedule a second local notification.
// Use addNotificationReceivedListener only for app-specific in-app UI.`,

  deepLink: `PixlPush.instance.addNotificationOpenedListener((notification) {
  final deepLink = notification.deepLink;
  if (deepLink == null || deepLink.isEmpty) return;

  // Example only: pass deepLink to go_router, Navigator, or your router.
  debugPrint('Navigate to \$deepLink');
});`,
};

export const configOptions: [string, string, string, string][] = [
  ["sdkKey", "String", "required", "Project-scoped public SDK key."],
  ["projectId", "String?", "null", "Optional project ID/slug consistency check."],
  ["environment", "Environment", "production", "development, staging or production."],
  ["appName", "String?", "null", "Application name included in device context."],
  ["appVersion", "String?", "auto-detected", "Application version override."],
  ["sdkVersion", "String?", SDK_VERSION, "SDK version override for device context."],
  ["enableLogging", "bool", "false", "Verbose SDK and queue logging."],
  ["autoFlushInterval", "Duration", "15 seconds", "Automatic queue flush interval."],
  ["maxQueueSize", "int", "1000", "Maximum retained queue items."],
  ["queueRetention", "Duration", "7 days", "How long queued work is retained."],
  ["sessionInactivityTimeout", "Duration", "30 minutes", "Time before a new session is created."],
  ["trackLifecycleEvents", "bool", "true", "Records app_opened and app_backgrounded."],
  ["storage", "PixlPushStorage?", "SharedPreferences", "Custom storage implementation for tests or app policy."],
];

export type FlutterMethod = [string, string, string];
export const methods: Record<"setup" | "identity" | "events" | "push", FlutterMethod[]> = {
  setup: [
    ["configure(PixlPushConfig config)", "Future<PixlPushStatus>", "Initializes storage, identity, queue and lifecycle tracking. Repeating the same configuration is idempotent."],
    ["getStatus()", "PixlPushStatus", "Returns configuration, identity, session and queue state."],
    ["flush()", "Future<FlushResult>", "Attempts to send queued identity, event and push-open work."],
    ["dispose()", "Future<void>", "Cancels queue timers and lifecycle observation."],
  ],
  identity: [
    ["identify(EndUserIdentity identity)", "Future<void>", "Links the current install to a stable application user ID."],
    ["updateUser(UserUpdate update)", "Future<void>", "Updates fields and properties for the current user."],
    ["reset()", "Future<void>", "Logout: unlinks the current install and creates a new anonymous installation user. The profile shows Logged out."],
    ["deleteUser()", "Future<void>", "The user deleted their account: devices unlinked, push and email stop, shown as Deleted (history kept; logging in again restores them). Then starts over anonymous."],
  ],
  events: [
    ["track(String name, ...)", "Future<String>", "Queues one validated product event and returns its ID."],
    ["trackBatch(List<TrackEvent> events)", "Future<List<String>>", "Queues up to 100 events as one batch."],
    ["setConsent(ConsentSettings consent)", "Future<void>", "Stores analytics, email and push consent."],
  ],
  push: [
    ["updatePushToken(String token, ...)", "Future<void>", "Registers an FCM or APNs token obtained by the application."],
    ["updatePushPermission(String permission)", "Future<void>", "Stores the OS push permission; sent and emitted (pushPermissionChanged) only when it changed."],
    ["push.syncPermission()", "Future<void>", "Firebase adapter: re-reads the permission without prompting and sends the token when allowed. Runs on every return to the foreground."],
    ["handleNotificationResponse(Object? raw)", "Future<NormalizedPushPayload>", "Normalizes a notification response, records its pp_job_id and emits the open/action event."],
  ],
};

export const errorCodes: [string, string, string][] = [
  ["SDK_NOT_CONFIGURED", "A public method ran before configure() completed.", "Await one shared configure promise."],
  ["SDK_ALREADY_CONFIGURED", "A second configure call used different credentials.", "Configure once and reuse the singleton."],
  ["SDK_KEY_MISSING", "The SDK key is empty.", "Pass a non-empty key from --dart-define or secure build configuration."],
  ["SDK_KEY_INVALID", "The key is revoked, deleted or malformed.", "Create or rotate the project SDK key."],
  ["SDK_KEY_PROJECT_MISMATCH", "projectId does not belong to the key.", "Use the project ID/slug from the same PixlPush project or omit it."],
  ["PROJECT_INACTIVE", "The project is not active.", "Reactivate the project before sending data."],
  ["VALIDATION_ERROR", "An event, identity or configuration value is invalid.", "Fix the value named by the error."],
  ["NETWORK_ERROR", "The device could not reach the PixlPush API.", "Check connectivity; queued work retries automatically."],
  ["QUEUE_FULL", "The offline queue reached maxQueueSize.", "Flush/reconnect or increase the limit deliberately."],
  ["STORAGE_ERROR", "Persistent storage failed.", "Check platform storage configuration and available space."],
];

/** Setup prompt for coding agents. Built from the same snippets the guides render, so it cannot drift from them. */
export const aiPrompt = `You are a senior Flutter engineer. Integrate the PixlPush Flutter SDK (pixlpush ${SDK_VERSION}) into this app: analytics, user identity and push notifications. Work like a careful reviewer is watching: small, focused changes that match the existing code.

<goal>
When you are done, the app configures PixlPush once at startup, identifies users on sign-in, resets on sign-out, tracks its core product events, receives push through Firebase Cloud Messaging (or APNs on iOS without Firebase), and passes the verification step below.
</goal>

<rules>
1. Use ONLY the classes, options and methods in this prompt and its api_reference. Do not invent APIs. Do not set apiBaseUrl or sdkVersion.
2. Fit the codebase: follow its state management (Provider, Riverpod, Bloc, GetX…), folder layout, naming and lints. Adapt file paths; keep behaviour identical.
3. Secrets: only the public SDK key and project ID go in the app, through --dart-define. Never add a Firebase service-account JSON, an APNs .p8 key or a dashboard token to the repo or the app.
4. Privacy: externalUserId is the stable internal user ID, never an email. Never send passwords, tokens or payment data as properties.
5. Permission: ask for push permission from onboarding or a settings button, not silently at launch, unless the app already does so.
6. Scope: do not refactor unrelated code, upgrade unrelated dependencies, or touch the Firebase, Apple or PixlPush consoles.
7. Uncertainty: if the project conflicts with these steps (no clear auth flow, flavors, an existing FCM handler), stop and ask one concise question instead of guessing.
</rules>

<automatic_behavior_safety>
- The core SDK records app_opened and app_backgrounded when lifecycle tracking is enabled. Do not track those events yourself.
- Initialize one PixlPushFirebaseMessaging adapter. It owns Firebase foreground receipt, local notification display, token refresh, permission sync and notification-open attribution.
- Do not add a parallel Firebase onMessage listener, schedule a second local notification, or call a separate click-tracking endpoint. Subscribe to addNotificationReceivedListener only for app-specific UI, and route from the opened listener.
- Configure the adapter with requestPermission: false during startup. Request permission later from the app's existing user-initiated flow.
</automatic_behavior_safety>

<workflow>
Step 0 — Inspect, then plan. Before editing, report in a short list:
- Flutter and Dart versions, platforms built (android, ios, web)
- whether firebase_core / firebase_messaging are already used, and how
- the main() entry point and the state management in use
- where sign-in and sign-out happen
- the files you intend to create or change
Then proceed.

Step 1 — Install. Add to pubspec.yaml, then run flutter pub get:
${fence("yaml", code.install)}

Step 2 — Public config through --dart-define (placeholder; I will paste the key from PixlPush → Project settings → SDK keys):
${fence("dart", code.key)}
${fence("sh", code.localDevelopment)}

Step 3 — Configure once → lib/services/pixlpush.dart
${fence("dart", code.initialize)}
Call it from main():
${fence("dart", code.main)}

Step 4 — Identity: hook into the existing auth flow (identify after sign-in, await reset on sign-out).
${fence("dart", code.identify)}

Step 5 — Events: track the app's core actions (snake_case names, non-sensitive properties) next to the code that completes them. Prefer signed_up, paywall_viewed, checkout_started, purchase_completed and trial_started when the action exists; skip the ones the app does not have.
${fence("dart", code.track)}
If a consent prompt exists, forward its answers:
${fence("dart", code.consent)}

Step 6 — Push. Initialize the Firebase adapter once with requestPermission: false. It owns notification display, token sync and taps. Keep its instance in your app's push service; call requestPermission() later only from a user action:
${fence("dart", code.push)}
${fence("dart", code.permission)}
${fence("dart", code.foreground)}
Listeners and deep links (route with the app's own router):
${fence("dart", code.deepLink)}

Step 7 — Verify (debug builds only):
${fence("dart", code.status)}
${fence("dart", code.flush)}
Run flutter analyze and the existing tests, and fix anything you introduced.
</workflow>

<acceptance_criteria>
- configure() runs exactly once per launch, before runApp.
- identify() runs after every sign-in; reset() is awaited on sign-out.
- The app's main conversion events are tracked.
- flush() reports failed: 0, remaining: 0, and the QA user appears in PixlPush → Users.
- No secrets, no sensitive properties, no unrelated changes.
</acceptance_criteria>

<manual_steps>
Do not attempt these. List them for me at the end:
1. Firebase project → add the Android and iOS apps → place google-services.json and GoogleService-Info.plist (or run flutterfire configure).
2. Apple Developer → APNs .p8 key → upload it to Firebase, or to PixlPush → Push setup → Apple Push for iOS without Firebase.
3. Upload the Firebase service-account JSON in PixlPush → Project settings → Push setup.
4. Paste the development SDK key; create a separate production key before release.
</manual_steps>

<final_report>
End with: 1. Summary (two sentences). 2. Files changed (one line each). 3. Events tracked (name, file, properties). 4. Commands to run. 5. Manual steps. 6. Open questions.
</final_report>`;
