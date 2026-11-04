import versions from "./sdk-versions.json";
// The documentation's single source of structure. A platform lists its guides; every guide lists its
// sections. Navigation, routing, the table of contents, pagination, metadata and search are all built
// from this file, so adding a platform means adding an entry here plus its guide renderers.

export type DocSection = { id: string; label: string; keywords?: string };
export type Guide = { slug: string; title: string; description: string; group: string; sections: DocSection[] };
export type Platform = {
  id: string;
  label: string;
  description: string;
  status: "available" | "coming-soon";
  version?: string;
  groups?: string[];
  guides?: Guide[];
};

const s = (id: string, label: string, keywords?: string): DocSection => ({ id, label, keywords });

const reactNativeGuides: Guide[] = [
  {
    slug: "", group: "Get started", title: "React Native & Expo",
    description: "What the PixlPush SDK does in your app, what it sends, and which parts are automatic.",
    sections: [s("what-it-does", "What it does"), s("data", "What the SDK sends", "payload installation session"), s("automatic", "Automatic vs. app-owned"), s("app-paths", "Expo, Expo Go, or bare", "expo go development build"), s("next", "Where to go next")],
  },
  {
    slug: "quickstart", group: "Get started", title: "Quickstart",
    description: "From an empty app to a verified event, then push, in one ordered path.",
    sections: [s("prerequisites", "Prerequisites"), s("install", "Install the SDK", "npm yarn pnpm expo install"), s("key", "Create an SDK key", "pp_sk"), s("configure", "Configure once", "configure getStatus"), s("identify", "Identify after login", "identify reset"), s("track", "Track an event", "track"), s("verify", "Verify", "flush getStatus"), s("push", "Add push"), s("checkpoint", "Before production")],
  },
  {
    slug: "ai-setup", group: "Get started", title: "AI agent setup",
    description: "One copy-paste prompt that lets any AI coding agent install and configure the SDK, following these docs.",
    sections: [s("prompt", "The prompt", "ai agent claude cursor copilot codex"), s("how", "How to use it"), s("manual", "What you do by hand", "firebase apns service account")],
  },
  {
    slug: "installation", group: "Set up", title: "Install & configure",
    description: "Packages, environment variables, a production-ready initialization module, and every configuration option.",
    sections: [s("packages", "Packages", "peer dependencies async-storage"), s("push-packages", "Push packages", "@react-native-firebase/messaging expo-notifications"), s("environment", "Environment variables", ".env EXPO_PUBLIC react-native-config"), s("initialize", "Initialization module", "configure once onError"), s("entry", "App entry point"), s("status", "Check getStatus()", "getStatus pixlpushId deviceId"), s("options", "Configuration options", "sdkKey projectId environment enableLogging autoPush trackLifecycleEvents maxQueueSize"), s("api-url", "Where data is sent", "apiBaseUrl base url server url hosted local tunnel")],
  },
  {
    slug: "sdk-keys", group: "Set up", title: "SDK keys",
    description: "Create, store, rotate, revoke and delete the public key that authenticates your app.",
    sections: [s("what", "What an SDK key is", "pp_sk public key JWT"), s("create", "Create a key"), s("listing", "What the list shows", "prefix last used"), s("roles", "Who can manage keys", "owner admin developer"), s("environments", "One key per environment", "YOUR_DEVELOPMENT_SDK_KEY staging production"), s("rotate", "Rotate without downtime"), s("revoke-delete", "Revoke vs. delete", "SDK_KEY_INVALID SDK_KEY_PROJECT_MISMATCH PROJECT_INACTIVE")],
  },
  {
    slug: "firebase", group: "Set up", title: "Firebase & push setup",
    description: "Set up push from zero: a Firebase project, your Android and iOS apps, the APNs key, and the service-account JSON PixlPush sends with.",
    sections: [
      s("overview", "The three pieces", "service account google-services.json GoogleService-Info.plist api key which file"),
      s("firebase-project", "1. Create a Firebase project", "console sender id project id"),
      s("android", "2. Add the Android app", "google-services.json build.gradle package name applicationId google-services plugin signingReport SHA-1"),
      s("ios", "3. Add the iOS app", "GoogleService-Info.plist bundle id AppDelegate.swift AppDelegate.mm Podfile use_frameworks capabilities"),
      s("apns", "4. Connect APNs (iOS)", ".p8 key id team id apple developer"),
      s("service-account", "5. Generate the service-account JSON", "service account key json IAM Firebase Cloud Messaging API Admin generate new private key disableServiceAccountKeyCreation"),
      s("connect", "6. Connect it in PixlPush", "Project settings Firebase / FCM Connect Firebase Validate and connect"),
      s("checklist", "Read the connection checklist", "Token sync active device tokens Re-check Replace credentials"),
      s("expo", "Expo projects", "app.config.js prebuild eas build expo-build-properties"),
      s("errors", "Common errors", "INVALID_SERVICE_ACCOUNT FIREBASE_VALIDATION_FAILED firebase_not_configured no_active_push_subscription"),
    ],
  },
  {
    slug: "identity", group: "Integrate", title: "Identity",
    description: "Anonymous users, identify after login, profile updates, account switching and reset on logout.",
    sections: [s("model", "Users, installations, IDs", "pixlpushId anonymousId deviceId installation"), s("identify", "Identify after login", "externalUserId"), s("update", "Update user properties", "updateUser"), s("merge", "Anonymous to identified"), s("switch", "Switching accounts"), s("reset", "Reset on logout", "reset push tokens")],
  },
  {
    slug: "events", group: "Integrate", title: "Events, consent & offline",
    description: "Tracking product events, consent, the offline queue, retries, lifecycle events and sessions.",
    sections: [s("track", "Track an event", "track"), s("rules", "Names and properties", "VALIDATION_ERROR 120 100 2000 sensitive"), s("options", "TrackOptions & idempotency", "eventId timestamp source sessionId"), s("batch", "trackBatch", "trackBatch 100"), s("typed", "A typed tracking helper"), s("consent", "Consent", "setConsent analytics email push"), s("queue", "Offline queue & retries", "flush FIFO backoff QUEUE_FULL"), s("lifecycle", "Lifecycle & sessions", "app_opened app_backgrounded session_duration_seconds 30 minutes")],
  },
  {
    slug: "push", group: "Integrate", title: "Push notifications",
    description: "Permission, FCM token sync, foreground, background and cold-start taps, actions, deep links and attribution.",
    sections: [s("how", "How push works", "fcm only"), s("listeners", "Register listeners first", "addNotificationOpenedListener"), s("permission", "Ask for permission", "requestPermission POST_NOTIFICATIONS"), s("tokens", "Token sync", "syncPushToken onTokenRefresh updatePushPermission"), s("states", "Foreground, background, cold start", "onMessage handleNotification getInitialNotification"), s("actions", "Actions and deep links", "addNotificationActionListener deepLink"), s("attribution", "Open attribution", "pp_job_id automatic"), s("expo-notifications", "Using expo-notifications", "getDevicePushTokenAsync expo push token"), s("cli-module", "React Native CLI adapter", "notificationModule Notifee local notification"), s("test", "Test matrix")],
  },
  {
    slug: "engagement-segment", group: "Segment guides", title: "Engagement lifecycle segment",
    description: "Group users by the app activity the SDK already records, and use the segment as a journey audience.",
    sections: [s("goal", "What you’ll build"), s("events", "1. Check the events", "app_opened app_backgrounded"), s("segment", "2. Create the segment", "Users Lifecycle segments Create segment"), s("inactive", "Option: users who stopped coming back", "audience group not performed in the last 7 days inactive"), s("journey", "3. Use it in a journey"), s("verify", "4. Verify")],
  },
  {
    slug: "paywall-segment", group: "Segment guides", title: "Paywall drop-off segment",
    description: "Find users who saw a paywall but didn’t buy, using two segments and the order PixlPush evaluates them in.",
    sections: [s("goal", "What you’ll build"), s("events", "1. Track the paywall events", "paywall_viewed purchase_completed subscription_started"), s("segments", "2. Create the segments in order", "Paid Customer Paywall Viewed / Drop-off first match"), s("verify", "3. Verify")],
  },
  {
    slug: "security", group: "Operate", title: "Security",
    description: "What is public, what is secret, and the boundaries PixlPush enforces.",
    sections: [s("credentials", "Public vs. secret"), s("firebase-keys", "Firebase API keys", "restrict api key"), s("bundle", "Keep secrets out of the app", "logs screenshots"), s("isolation", "Project isolation", "tenant SDK_KEY_PROJECT_MISMATCH"), s("data", "Data minimization", "sensitive property keys")],
  },
  {
    slug: "production", group: "Operate", title: "Verify & ship",
    description: "Verification with expected results, the release checklist, and upgrading the SDK.",
    sections: [s("verify", "Verify step by step"), s("checklist", "Production checklist"), s("upgrade", "Upgrading the SDK", "changelog version")],
  },
  {
    slug: "troubleshooting", group: "Operate", title: "Troubleshooting",
    description: "Symptoms, their causes in the SDK and backend, and how to fix each one.",
    sections: [s("setup", "Configuration"), s("delivery", "Events"), s("identity", "Identity"), s("push", "Push")],
  },
  {
    slug: "reference", group: "Reference", title: "API reference",
    description: `Every public method of @pixlpush/react-native ${versions.reactNative}, its error codes and its listener events.`,
    sections: [s("setup-methods", "Setup", "configure getStatus onError flush"), s("identity-methods", "Identity", "identify updateUser reset"), s("event-methods", "Events & consent", "track trackBatch setConsent"), s("push-methods", "Push", "syncPushToken updatePushToken updatePushPermission handleNotification setInitialNotification getInitialNotification"), s("listener-methods", "Listeners", "addListener removeListener addNotificationReceivedListener addPushTokenListener addPushPermissionListener"), s("errors", "Error codes", "SDK_NOT_CONFIGURED SDK_ALREADY_CONFIGURED SDK_KEY_MISSING SDK_KEY_INVALID PROJECT_INACTIVE RATE_LIMITED QUEUE_FULL STORAGE_ERROR")],
  },
];

const webGuides: Guide[] = [
  { slug: "", group: "Get started", title: "Web", description: "What the PixlPush web SDK does on your website, what it sends, and which frameworks and browsers it supports.", sections: [s("what-it-does", "What it does"), s("architecture", "How it fits together", "service worker backend api architecture"), s("frameworks", "Frameworks and browsers", "react next.js vue nuxt angular svelte astro script tag safari ios"), s("data", "What the SDK sends", "payload subscription"), s("next", "Where to go next")] },
  { slug: "quickstart", group: "Get started", title: "Quickstart", description: "Install, serve the service worker, initialize, verify an event and send your first web push.", sections: [s("prerequisites", "Prerequisites", "https website platform"), s("install", "Install the SDK", "npm yarn pnpm @pixlpush/web"), s("worker", "Serve the service worker", "pixlpush-sw.js public postinstall"), s("key", "Create an SDK key", "pp_sk VITE_ NEXT_PUBLIC_"), s("init", "Initialize once", "PixlPushProvider PixlPushPlugin providePixlPush init"), s("identify", "Identify after login", "identify reset"), s("track", "Track an event", "track"), s("push", "Add an Enable notifications button", "requestPushPermission"), s("checkpoint", "Before production")] },
  { slug: "ai-setup", group: "Get started", title: "AI agent setup", description: "One copy-paste prompt that lets any AI coding agent install the web SDK on your site.", sections: [s("prompt", "The prompt", "ai agent claude code codex cursor copilot gemini windsurf AGENTS.md CLAUDE.md"), s("how", "How to use it"), s("what-it-does", "What the agent will do"), s("manual", "What you do by hand")] },
  { slug: "installation", group: "Set up", title: "Install & configure", description: "The package, the service worker in every framework, environment variables, initialization and every configuration option.", sections: [s("packages", "Package"), s("worker", "Service worker", "pixlpush-sw.js angular.json assets scope"), s("environment", "Environment variables", ".env VITE_ NEXT_PUBLIC_"), s("initialize", "Initialize"), s("status", "Check getStatus()", "getStatus debug onError"), s("options", "Configuration options", "sdkKey projectId serviceWorkerPath notificationIcon trackPageViews autoPush"), s("endpoint", "Where data is sent", "api url development key")] },
  { slug: "sdk-keys", group: "Set up", title: "SDK keys", description: "Create, store, rotate and revoke the public key your website uses.", sections: [s("what", "What an SDK key is", "pp_sk public"), s("create", "Create a key"), s("environments", "One key per environment"), s("rotate", "Rotate without downtime"), s("revoke", "Revoke vs. delete", "SDK_KEY_INVALID")] },
  { slug: "local-development", group: "Set up", title: "Local development & debugging", description: "Run it on localhost, test on a phone, inspect requests and the service worker, and reset state.", sections: [s("setup", "Run it locally", "localhost dev key"), s("phone", "Test on a phone", "https ngrok tunnel cloudflared"), s("devtools", "Inspect it in DevTools", "network console application service worker local storage"), s("send", "Send yourself a notification", "test send"), s("reset", "Start over", "clear site data unregister permission reset"), s("macos", "Nothing shows on macOS?", "focus do not disturb")] },
  { slug: "identity", group: "Integrate", title: "Identity", description: "Anonymous visitors, identify after login, profile updates, logout and identity verification.", sections: [s("model", "Anonymous and identified users"), s("identify", "Identify after login", "externalUserId email emailConsent"), s("update", "Update user properties", "updateUser"), s("reset", "Reset on logout", "reset"), s("verification", "Identity verification", "userHash hmac secret")] },
  { slug: "events", group: "Integrate", title: "Events, consent & offline", description: "Tracking events, the automatic page_viewed and app_opened events, consent and the offline queue.", sections: [s("track", "Track an event", "track"), s("rules", "Names and properties", "VALIDATION_ERROR 120 100 2000"), s("automatic", "Tracked automatically", "page_viewed app_opened session"), s("consent", "Consent", "setConsent"), s("queue", "Offline queue & retries", "flush localStorage backoff")] },
  { slug: "push", group: "Integrate", title: "Web Push", description: "Permission, notifications while the site is open or closed, clicks, deep links and open attribution, with no Firebase.", sections: [s("how", "How Web Push works", "vapid service worker no firebase"), s("permission", "Ask for permission", "requestPushPermission isPushSupported unsubscribePush"), s("listeners", "Notification listeners", "onNotificationReceived onNotificationOpened"), s("attribution", "Open attribution", "openNotification click count pp_job_id"), s("deep-links", "Deep links"), s("browsers", "Browser support", "safari ios home screen"), s("test", "Test matrix")] },
  { slug: "recipes", group: "Integrate", title: "Full-stack recipes", description: "Complete, copy-paste patterns: Next.js end to end, auth sync, typed events, a notifications button and in-app notifications.", sections: [s("nextjs", "Next.js end to end", "app router layout server component userHash"), s("auth-sync", "Sync with your auth state", "login logout useEffect watch vue"), s("typed-events", "Typed events", "typescript tracking plan"), s("permission", "A notifications button", "usePushPermission hook"), s("in-app", "In-app notifications", "toast sonner openNotification"), s("checklist", "Wiring checklist")] },
  { slug: "security", group: "Operate", title: "Security", description: "What is public, what stays on your server, CSP, and how projects are isolated.", sections: [s("credentials", "Public vs. secret"), s("csp", "Content Security Policy", "connect-src worker-src"), s("isolation", "Project isolation"), s("data", "Data minimization")] },
  { slug: "production", group: "Operate", title: "Verify & ship", description: "Checks that should pass before your site goes live, and how to upgrade the SDK.", sections: [s("verify", "Verify step by step"), s("checklist", "Production checklist"), s("upgrade", "Upgrading the SDK", "version changelog")] },
  { slug: "troubleshooting", group: "Operate", title: "Troubleshooting", description: "Symptoms, causes and fixes for setup, events, push delivery and notification opens.", sections: [s("setup", "Configuration"), s("events", "Events"), s("push", "Push delivery"), s("opens", "Notification opens")] },
  { slug: "reference", group: "Reference", title: "API reference", description: `Every public method of @pixlpush/web ${versions.web}, its framework helpers and error codes.`, sections: [s("setup-methods", "Setup", "init getStatus flush onError"), s("identity-methods", "Identity", "identify updateUser reset"), s("event-methods", "Events & consent", "track setConsent"), s("push-methods", "Push", "requestPushPermission openNotification onNotificationOpened"), s("helpers", "Framework helpers", "PixlPushProvider PixlPushPlugin providePixlPush"), s("errors", "Error codes")] },
];

export const platforms: Platform[] = [
  { id: "react-native", label: "React Native", description: "Expo and bare React Native CLI apps.", status: "available", version: versions.reactNative, groups: ["Get started", "Set up", "Integrate", "Segment guides", "Operate", "Reference"], guides: reactNativeGuides },
  {
    id: "flutter", label: "Flutter", description: "Flutter Android and iOS applications.", status: "available", version: versions.flutter,
    groups: ["Get started", "Set up", "Integrate", "Operate", "Reference"], guides: [
      { slug: "", group: "Get started", title: "Flutter", description: "What the PixlPush Flutter SDK does, what it sends, and how notification opens are attributed.", sections: [s("what-it-does", "What it does"), s("app-states", "App states and responsibilities", "foreground background terminated"), s("data", "What the SDK sends", "identity event push open"), s("next", "Where to go next")] },
      { slug: "quickstart", group: "Get started", title: "Quickstart", description: "Install the published plugin, configure PixlPush, verify an event, and add push in one ordered path.", sections: [s("prerequisites", "Prerequisites"), s("install", "Install the package", "pub.dev pubspec path dependency"), s("key", "Create an SDK key", "pp_sk"), s("configure", "Configure once", "PixlPushConfig configure"), s("verify", "Verify analytics", "flush getStatus"), s("push", "Add push", "Firebase.initializeApp PixlPushFirebaseMessaging"), s("checkpoint", "Before production")] },
      { slug: "installation", group: "Set up", title: "Install & configure", description: "Package setup, SDK-key endpoint resolution, lifecycle configuration, persistence and the complete Flutter configuration reference.", sections: [s("packages", "Packages", "pubspec.yaml shared_preferences"), s("environment", "Environment and keys", "dart-define sdk key"), s("initialize", "Initialization order", "WidgetsFlutterBinding Firebase.initializeApp"), s("status", "Check getStatus()", "PixlPushStatus"), s("options", "Configuration options", "PixlPushConfig"), s("endpoint", "Where data is sent", "SDK key endpoint local development") ] },
      { slug: "sdk-keys", group: "Set up", title: "SDK keys", description: "Create, store, rotate, revoke and delete the public key used by your Flutter app.", sections: [s("what", "What an SDK key is", "pp_sk public key"), s("create", "Create a key"), s("environments", "One key per environment", "development staging production"), s("rotate", "Rotate without downtime"), s("revoke", "Revoke vs. delete", "SDK_KEY_INVALID") ] },
      { slug: "firebase", group: "Set up", title: "Firebase & push setup", description: "Configure Firebase for Android and iOS, connect APNs, and upload the server credential PixlPush uses to send notifications.", sections: [s("pieces", "The four pieces", "google-services.json GoogleService-Info.plist APNs service account"), s("android", "Android setup", "google-services.json google services plugin"), s("ios", "iOS setup", "GoogleService-Info.plist APNs capability"), s("apns", "Connect APNs", "p8 key team id"), s("service-account", "Create the service account", "Firebase Cloud Messaging API Admin"), s("connect", "Connect Firebase in PixlPush", "Project settings Firebase FCM"), s("checklist", "Connection checklist") ] },
      { slug: "identity", group: "Integrate", title: "Identity", description: "Keep anonymous installs, signed-in users, account switching and logout boundaries correct.", sections: [s("model", "Users, installs and IDs", "anonymousId deviceId pixlpushId"), s("identify", "Identify after login", "EndUserIdentity"), s("update", "Update user properties", "UserUpdate"), s("reset", "Reset on logout") ] },
      { slug: "events", group: "Integrate", title: "Events, consent & offline", description: "Track product events, apply consent, inspect the offline queue and flush safely.", sections: [s("track", "Track an event", "track properties"), s("rules", "Names and properties", "validation"), s("batch", "Track a batch", "trackBatch"), s("consent", "Consent", "ConsentSettings"), s("queue", "Offline queue & retries", "flush FIFO backoff"), s("lifecycle", "Lifecycle and sessions", "app_opened app_backgrounded") ] },
      { slug: "push", group: "Integrate", title: "Push notifications", description: "Initialize Firebase Messaging once and let the Flutter adapter render foreground notifications and attribute taps automatically.", sections: [s("how", "How push works", "FCM"), s("initialize", "Initialize the adapter", "PixlPushFirebaseMessaging"), s("permission", "Permission and token sync", "requestPermission"), s("states", "Foreground, background and terminated", "onMessageOpenedApp getInitialMessage"), s("attribution", "Open attribution", "pp_job_id notificationOpened"), s("deep-links", "Deep links"), s("listeners", "Notification listeners"), s("test", "Test matrix") ] },
      { slug: "security", group: "Operate", title: "Security", description: "Understand what can ship in a Flutter bundle, what must stay in PixlPush or Firebase, and how projects are isolated.", sections: [s("credentials", "Public vs. secret"), s("bundle", "Keep secrets out of the app", "logs screenshots git"), s("isolation", "Project isolation", "projectId"), s("data", "Data minimization") ] },
      { slug: "production", group: "Operate", title: "Verify & ship", description: "Run the analytics and push checks that should pass before a Flutter release reaches production.", sections: [s("verify", "Verify step by step"), s("push-check", "Verify notification opens"), s("checklist", "Production checklist"), s("upgrade", "Upgrading the SDK") ] },
      { slug: "troubleshooting", group: "Operate", title: "Troubleshooting", description: "Fix configuration, delivery, identity, foreground display and notification-open attribution problems.", sections: [s("setup", "Configuration"), s("events", "Events"), s("push", "Push delivery"), s("opens", "Notification opens") ] },
      { slug: "reference", group: "Reference", title: "API reference", description: `The public Flutter client, Firebase adapter, notification payload and error surface in package ${versions.flutter}.`, sections: [s("setup-methods", "Setup"), s("identity-methods", "Identity"), s("event-methods", "Events & consent"), s("push-methods", "Push"), s("listeners", "Listeners"), s("errors", "Error codes") ] },
    ],
  },
  { id: "web", label: "Web", description: "React, Next.js, Vue, Nuxt, Angular, Svelte and plain HTML websites.", status: "available", version: versions.web, groups: ["Get started", "Set up", "Integrate", "Operate", "Reference"], guides: webGuides },
  { id: "ios", label: "iOS (Swift)", description: "Native iOS SDK.", status: "coming-soon" },
  { id: "android", label: "Android (Kotlin)", description: "Native Android SDK.", status: "coming-soon" },
];

export const availablePlatforms = platforms.filter((platform) => platform.status === "available" && platform.guides?.length);

export function getPlatform(id: string) {
  return availablePlatforms.find((platform) => platform.id === id);
}

export function getGuide(platformId: string, slug = "") {
  return getPlatform(platformId)?.guides?.find((guide) => guide.slug === slug);
}

/** `base` is "/docs" on the website and "/dashboard/integrations" in the app. */
export function guideHref(base: string, platformId: string, slug = "", hash?: string) {
  return `${base}/${platformId}${slug ? `/${slug}` : ""}${hash ? `#${hash}` : ""}`;
}

export function guideNeighbours(platformId: string, slug: string) {
  const guides = getPlatform(platformId)?.guides ?? [];
  const index = guides.findIndex((guide) => guide.slug === slug);
  return { previous: guides[index - 1], next: guides[index + 1] };
}

export type SearchEntry = { id: string; label: string; hint: string; group: string; keywords: string };

export function buildSearchIndex(base: string): SearchEntry[] {
  return availablePlatforms.flatMap((platform) => (platform.guides ?? []).flatMap((guide) => [
    { id: guideHref(base, platform.id, guide.slug), label: guide.title, hint: guide.description, group: guide.group, keywords: `${platform.label} ${guide.slug}` },
    ...guide.sections.map((section) => ({ id: guideHref(base, platform.id, guide.slug, section.id), label: section.label, hint: guide.title, group: guide.group, keywords: `${platform.label} ${section.id} ${section.keywords ?? ""}` })),
  ]));
}
