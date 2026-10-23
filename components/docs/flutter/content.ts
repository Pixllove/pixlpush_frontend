// Flutter SDK content reviewed against the published pixlpush 0.1.5 package.

export const SDK_VERSION = "0.1.5";
export const REVIEWED_AGAINST = "pixlpush Flutter SDK 0.1.5";

export const code = {
  install: `dependencies:
  pixlpush: ^0.1.5`,

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
  final push = PixlPushFirebaseMessaging(client);
  await push.initialize(requestPermission: true);
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
await push.initialize(requestPermission: true);`,

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

  permission: `final push = PixlPushFirebaseMessaging(PixlPush.instance);
await push.initialize(requestPermission: false);

// Call later from your onboarding/settings UI.
await push.requestPermission();`,

  localDevelopment: `flutter run \\
  --dart-define=PIXLPUSH_SDK_KEY=YOUR_DEVELOPMENT_SDK_KEY \\
  --dart-define=PIXLPUSH_PROJECT_ID=YOUR_PROJECT_ID`,

  foreground: `// Do not add a second onMessage listener that schedules another
// local notification. The PixlPush Firebase adapter owns this path.
final push = PixlPushFirebaseMessaging(PixlPush.instance);
await push.initialize(requestPermission: true);`,

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
  ["sdkVersion", "String?", "0.1.5", "SDK version override for device context."],
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
    ["reset()", "Future<void>", "Unlinks the current install and creates a new anonymous installation user."],
  ],
  events: [
    ["track(String name, ...)", "Future<String>", "Queues one validated product event and returns its ID."],
    ["trackBatch(List<TrackEvent> events)", "Future<List<String>>", "Queues up to 100 events as one batch."],
    ["setConsent(ConsentSettings consent)", "Future<void>", "Stores analytics, email and push consent."],
  ],
  push: [
    ["updatePushToken(String token, ...)", "Future<void>", "Registers an FCM or APNs token obtained by the application."],
    ["updatePushPermission(String permission)", "Future<void>", "Stores the current OS push permission state."],
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
  ["NETWORK_ERROR", "The device could not reach the endpoint.", "Check connectivity and use a reachable development key URL."],
  ["QUEUE_FULL", "The offline queue reached maxQueueSize.", "Flush/reconnect or increase the limit deliberately."],
  ["STORAGE_ERROR", "Persistent storage failed.", "Check platform storage configuration and available space."],
];
