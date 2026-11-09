// Web SDK content. The version comes from sdk-versions.json, refreshed
// from npm on every build (scripts/sync-sdk-versions.mjs).

import versions from "../sdk-versions.json";
import { suggestedEventsText } from "../SuggestedEvents";

export const SDK_VERSION = versions.web;
export const PACKAGE = "@pixlpush/web";

export const installCommands = {
  npm: `npm install ${PACKAGE}`,
  yarn: `yarn add ${PACKAGE}`,
  pnpm: `pnpm add ${PACKAGE}`,
};

export const code = {
  copyWorker: `node -e "require('fs').copyFileSync(require.resolve('${PACKAGE}/pixlpush-sw.js'), 'public/pixlpush-sw.js')"`,

  postinstall: `{
  "scripts": {
    "postinstall": "node -e \\"require('fs').copyFileSync(require.resolve('${PACKAGE}/pixlpush-sw.js'), 'public/pixlpush-sw.js')\\""
  }
}`,

  angularAssets: `"assets": [
  { "glob": "pixlpush-sw.js", "input": "node_modules/${PACKAGE}/dist", "output": "/" }
]`,

  react: `import { PixlPushProvider } from "${PACKAGE}/react";

createRoot(document.getElementById("root")!).render(
  <PixlPushProvider config={{ sdkKey: import.meta.env.VITE_PIXLPUSH_SDK_KEY }}>
    <App />
  </PixlPushProvider>,
);`,

  next: `import { PixlPushProvider } from "${PACKAGE}/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PixlPushProvider config={{ sdkKey: process.env.NEXT_PUBLIC_PIXLPUSH_SDK_KEY! }}>
          {children}
        </PixlPushProvider>
      </body>
    </html>
  );
}`,

  vue: `import { createApp } from "vue";
import { PixlPushPlugin } from "${PACKAGE}/vue";

createApp(App)
  .use(PixlPushPlugin, { sdkKey: import.meta.env.VITE_PIXLPUSH_SDK_KEY })
  .mount("#app");

// In a component: const pixlpush = usePixlPush();  (from "${PACKAGE}/vue")`,

  nuxt: `import { PixlPushPlugin } from "${PACKAGE}/vue";

export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.use(PixlPushPlugin, { sdkKey: useRuntimeConfig().public.pixlpushSdkKey });
});`,

  angular: `import { providePixlPush, PIXLPUSH } from "${PACKAGE}/angular";

bootstrapApplication(AppComponent, {
  providers: [providePixlPush({ sdkKey: environment.pixlpushSdkKey })],
});

// In a component or service: pixlpush = inject(PIXLPUSH);`,

  vanilla: `import { PixlPush } from "${PACKAGE}";

// Svelte, SvelteKit (in onMount or +layout.svelte), Astro, Remix, anything else.
PixlPush.init({ sdkKey: "YOUR_SDK_KEY" });`,

  script: `<script src="https://cdn.jsdelivr.net/npm/${PACKAGE}@${versions.web}/dist/pixlpush.min.js"></script>
<script>
  PixlPush.init({ sdkKey: "YOUR_SDK_KEY" });
</script>`,

  env: `# Vite / React / Vue
VITE_PIXLPUSH_SDK_KEY=pp_sk_your_development_key

# Next.js
NEXT_PUBLIC_PIXLPUSH_SDK_KEY=pp_sk_your_development_key`,

  status: `const status = PixlPush.getStatus();
console.log(status.configured, status.pixlpushId, status.sessionId, status.queueSize);`,

  identify: `await PixlPush.identify({
  externalUserId: user.id, // your stable user id, e.g. a cuid "cmw4tzovh05ivbpm0nt3r26vp"; never an email
  email: user.email,
  name: user.name,
  emailConsent: true, // reachable by email campaigns
});`,

  updateUser: `await PixlPush.updateUser({ country: "PK", properties: { plan: "pro" } });`,

  reset: `// On logout: the next visitor on this browser starts as a new anonymous user.
await PixlPush.reset();`,

  deleteUser: `// After your server deleted the account:
await PixlPush.deleteUser();`,

  userHash: `// Server (Node). Never send the identity secret to the browser.
import { createHmac } from "node:crypto";

const userHash = createHmac("sha256", process.env.PIXLPUSH_IDENTITY_SECRET!)
  .update(user.id)
  .digest("hex");

// Browser
await PixlPush.identify({ externalUserId: user.id, userHash });`,

  track: `const eventId = await PixlPush.track("purchase_completed", { plan: "pro", amount: 49 });
// eventId is null when the event was invalid; the reason goes to onError.`,

  consent: `await PixlPush.setConsent({ analytics: true, email: true, push: true });`,

  flush: `await PixlPush.flush(); // sends the queue now (it also flushes on its own)`,

  onError: `PixlPush.onError((error) => console.warn("PixlPush", error));`,

  permission: `function EnableNotifications() {
  const pixlpush = usePixlPush();
  return (
    <button onClick={() => pixlpush.requestPushPermission()}>
      Enable notifications
    </button>
  );
}
// Resolves "granted" | "denied" | "default" | "unsupported".`,

  pushState: `PixlPush.isPushSupported();   // false on old browsers and on iOS outside the Home Screen
PixlPush.getPushPermission(); // read it in an effect or handler, not on every render
await PixlPush.unsubscribePush();`,

  listeners: `useEffect(() => {
  const offReceived = PixlPush.onNotificationReceived((n) => {
    // A notification arrived while a tab of your site is open.
    showToast(n.title, n.body);
  });
  const offOpened = PixlPush.onNotificationOpened((n) => {
    // The user clicked a notification (system or in-page).
    router.push(n.deepLink ?? "/");
  });
  return () => { offReceived(); offOpened(); };
}, []);`,

  openNotification: `PixlPush.onNotificationReceived((n) => {
  showToast(n.title, {
    // Counts the open for the campaign or journey, closes the system
    // notification and fires onNotificationOpened.
    onClick: () => PixlPush.openNotification(n),
  });
});`,

  // ---------------------------------------------------------------- recipes

  nextLayout: `import { createHmac } from "node:crypto";
import { PixlPushProvider } from "${PACKAGE}/react";
import { auth } from "@/auth"; // your auth library (NextAuth, Clerk, Lucia…)
import { PixlPushAuthSync } from "./pixlpush-auth-sync";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Computed on the server: the identity secret never reaches the browser.
  const user = session?.user && {
    id: session.user.id,
    email: session.user.email,
    userHash: createHmac("sha256", process.env.PIXLPUSH_IDENTITY_SECRET!).update(session.user.id).digest("hex"),
  };

  return (
    <html lang="en">
      <body>
        <PixlPushProvider config={{ sdkKey: process.env.NEXT_PUBLIC_PIXLPUSH_SDK_KEY! }}>
          <PixlPushAuthSync user={user || null} />
          {children}
        </PixlPushProvider>
      </body>
    </html>
  );
}`,

  authSync: `"use client";
import { useEffect, useRef } from "react";
import { usePixlPush } from "${PACKAGE}/react";

type User = { id: string; email?: string | null; userHash?: string } | null;

/** Keeps PixlPush in step with your auth state: identify on login, reset on logout. */
export function PixlPushAuthSync({ user }: { user: User }) {
  const pixlpush = usePixlPush();
  const last = useRef<string | null>(null);

  useEffect(() => {
    const id = user?.id ?? null;
    if (id && id !== last.current) {
      // Pass emailConsent only from your own consent checkbox.
      void pixlpush.identify({ externalUserId: id, email: user?.email, userHash: user?.userHash });
    } else if (!id && last.current) {
      void pixlpush.reset(); // logged out: the next visitor starts anonymous
    }
    last.current = id;
  }, [user?.id]);

  return null;
}`,

  reactAuth: `// Vite / React Router: render it once inside the provider, with your auth hook.
function App() {
  const { user } = useAuth(); // your auth context
  return (
    <>
      <PixlPushAuthSync user={user ? { id: user.id, email: user.email } : null} />
      <Routes>{/* … */}</Routes>
    </>
  );
}`,

  vueAuth: `// Vue 3: watch your auth store.
import { watch } from "vue";
import { usePixlPush } from "${PACKAGE}/vue";

const pixlpush = usePixlPush();
const auth = useAuthStore();

watch(() => auth.user?.id, (id, previous) => {
  if (id) pixlpush.identify({ externalUserId: id, email: auth.user?.email });
  else if (previous) pixlpush.reset();
}, { immediate: true });`,

  typedTrack: `import { PixlPush } from "${PACKAGE}";

/** Every event your product sends, with its properties. One place to review them all. */
type Events = {
  signed_up: { method: "email" | "google" };
  plan_selected: { plan: "starter" | "pro"; billing: "monthly" | "yearly" };
  purchase_completed: { plan: string; amount: number; currency: string };
  paywall_viewed: { source: string };
};

export function track<E extends keyof Events>(name: E, properties: Events[E]) {
  return PixlPush.track(name, properties);
}

// Usage: autocomplete for names, type errors for wrong properties.
track("purchase_completed", { plan: "pro", amount: 49, currency: "USD" });`,

  permissionHook: `import { useEffect, useState } from "react";
import { usePixlPush, type PushPermission } from "${PACKAGE}/react";

export function usePushPermission() {
  const pixlpush = usePixlPush();
  const [permission, setPermission] = useState<PushPermission>("default");
  useEffect(() => setPermission(pixlpush.getPushPermission()), [pixlpush]);

  const request = async () => setPermission(await pixlpush.requestPushPermission());
  const unsubscribe = async () => { await pixlpush.unsubscribePush(); setPermission(pixlpush.getPushPermission()); };
  return { permission, request, unsubscribe };
}`,

  permissionButton: `export function NotificationsButton() {
  const { permission, request } = usePushPermission();

  if (permission === "unsupported") return null; // e.g. iOS outside the Home Screen
  if (permission === "granted") return <p>Notifications are on.</p>;
  if (permission === "denied") return <p>Notifications are blocked. Allow them in your browser’s site settings.</p>;
  return <button onClick={request}>Turn on notifications</button>;
}`,

  inAppToast: `import { useEffect } from "react";
import { usePixlPush } from "${PACKAGE}/react";
import { toast } from "sonner"; // or your toast library

/** Shows notifications that arrive while the site is open, and counts clicks on them. */
export function PixlPushToasts() {
  const pixlpush = usePixlPush();
  const router = useRouter();

  useEffect(() => {
    const offReceived = pixlpush.onNotificationReceived((n) => {
      toast(n.title, {
        description: n.body,
        action: { label: "Open", onClick: () => pixlpush.openNotification(n) },
      });
    });
    // Fires for system clicks and openNotification(): route inside the app.
    const offOpened = pixlpush.onNotificationOpened((n) => router.push(n.deepLink ?? "/"));
    return () => { offReceived(); offOpened(); };
  }, [pixlpush, router]);

  return null;
}`,

  serverEnv: `# Browser (public): the SDK key
NEXT_PUBLIC_PIXLPUSH_SDK_KEY=pp_sk_...

# Server only: identity verification secret (Project settings)
PIXLPUSH_IDENTITY_SECRET=...`,

  // ------------------------------------------------------ local development

  localSetup: `# 1. Run your site on localhost (a secure context, so push works over http)
npm run dev            # http://localhost:5173

# 2. Use a development key in .env.local
VITE_PIXLPUSH_SDK_KEY=pp_sk_your_development_key`,

  tunnel: `# A phone cannot open localhost, and push needs HTTPS off localhost.
# Expose your dev server over HTTPS:
npx ngrok http 5173          # or: cloudflared tunnel --url http://localhost:5173`,

  debugConfig: `PixlPush.init({ sdkKey, debug: true }); // logs every call and failure in the console
PixlPush.onError((e) => console.warn("PixlPush", e));
console.table(PixlPush.getStatus());`,

  csp: `connect-src 'self' https://<your PixlPush API host>;
worker-src 'self';`,

};

export const configOptions: [string, string, string, string][] = [
  ["sdkKey", "string", "required", "Public SDK key (pp_sk_…). The SDK always sends to the PixlPush API; there is no URL option."],
  ["projectId", "string", "none", "Optional; the server checks the key belongs to this project (id or slug)."],
  ["environment", "string", "\"production\"", "\"development\", \"staging\" or \"production\"."],
  ["serviceWorkerPath", "string", "\"/pixlpush-sw.js\"", "Where your site serves the worker."],
  ["serviceWorkerScope", "string", "\"/pixlpush/\"", "The worker's own scope, so your site's worker is untouched."],
  ["notificationIcon", "string", "none", "Icon URL shown on notifications."],
  ["trackPageViews", "boolean", "true", "Automatic page_viewed on load and client-side navigation, and page_left (with visible time on page) when the page is left."],
  ["autoPush", "boolean", "true", "Re-syncs an already granted subscription on load. Never prompts."],
  ["debug", "boolean", "false", "Console logging (same as enableLogging)."],
  ["appName / appVersion", "string", "none", "Sent with the device context."],
  ["defaultTimeoutMs", "number", "10000", "Request timeout."],
  ["maxQueueSize", "number", "1000", "Most queued items kept offline."],
  ["autoFlushIntervalMs", "number", "15000", "How often the queue is sent."],
  ["sessionInactivityTimeoutMs", "number", "1800000", "Inactivity before a new session (30 minutes)."],
];

export type WebMethod = [string, string, string];
export const methods: Record<"setup" | "identity" | "events" | "push", WebMethod[]> = {
  setup: [
    ["init(config)", "Promise<boolean>", "Starts the SDK once. true when ready; false on the server or with an invalid config. Later calls return the first result."],
    ["getStatus()", "PixlPushStatus", "configured, environment, sdkVersion, pixlpushId, anonymousId, deviceId, externalUserId, sessionId and queueSize."],
    ["flush()", "Promise<boolean>", "Sends queued work now."],
    ["onError(listener)", "() => void", "Every background or call failure. Returns an unsubscribe function."],
  ],
  identity: [
    ["identify(user)", "Promise<boolean>", "Links this browser to your user: externalUserId, email, name, emailConsent, properties, userHash."],
    ["updateUser(fields)", "Promise<boolean>", "Updates profile fields and custom properties of the current user."],
    ["reset()", "Promise<boolean>", "Logout. The browser becomes a new anonymous user; its push subscription moves with it. The profile shows Logged out."],
    ["deleteUser()", "Promise<boolean>", "The user deleted their account: devices unlinked, push and email stop, history kept. The profile shows Deleted; logging in again restores it."],
  ],
  events: [
    ["track(name, properties?, options?)", "Promise<string | null>", "Queues one event and resolves its id, or null when it was invalid."],
    ["setConsent({ analytics, email, push })", "Promise<boolean>", "Stores the visitor's consent."],
  ],
  push: [
    ["isPushSupported()", "boolean", "Whether this browser can receive web push."],
    ["getPushPermission()", "\"granted\" | \"denied\" | \"default\" | \"unsupported\"", "The current permission. Never prompts."],
    ["requestPushPermission()", "Promise<PushPermission>", "Asks for permission and subscribes. Call it from a click."],
    ["unsubscribePush()", "Promise<boolean>", "Removes this browser's subscription."],
    ["onPushPermissionChange(listener)", "() => void", "Fires when the visitor allows, blocks or resets notifications (prompt, address bar or browser settings), with 'granted', 'denied' or 'default'. PixlPush updates the user by itself."],
    ["openNotification(notification)", "Promise<boolean>", "For your own in-page toast or inbox: records the open, closes the system notification and fires onNotificationOpened."],
    ["onNotificationReceived(listener)", "() => void", "A notification arrived while a tab is open."],
    ["onNotificationOpened(listener)", "() => void", "The user clicked a notification (system, or in-page through openNotification)."],
  ],
};

export const troubleshooting: Record<string, [string, string, string][]> = {
  setup: [
    ["init() resolves false", "Running on the server, or sdkKey is empty.", "Initialize on the client (the React provider does this) and check the environment variable is exposed to the browser (VITE_ / NEXT_PUBLIC_ prefix)."],
    ["NETWORK_ERROR or requests time out", "A key created on a local development server points at that machine (for example http://192.168.x.x:4000).", "Use a production key on your live site, and allow the API host in your CSP connect-src."],
    ["SDK_KEY_INVALID", "The key was revoked or deleted.", "Create a new key in Project settings → SDK keys."],
    ["window is not defined (Next.js)", "The SDK was called at the top level of a server component.", "Import from @pixlpush/web/react or call PixlPush.init inside useEffect."],
  ],
  events: [
    ["track() resolves null", "The event failed validation.", "Read the onError message: snake_case name up to 120 characters, flat properties, no secret-looking keys."],
    ["Events appear late", "They wait in the queue (every 15 s, and when the tab is hidden).", "Call PixlPush.flush() while testing."],
  ],
  push: [
    ["The permission prompt never appears", "requestPushPermission() was not called from a click, or the visitor already blocked it.", "Call it from a button. A blocked site must be reset in the address bar → site settings."],
    ["unsupported", "An old browser, a private window, or iOS outside the Home Screen.", "Push works on iOS/iPadOS 16.4+ only after Add to Home Screen."],
    ["No notification arrives", "pixlpush-sw.js is not served, or the OS hides browser notifications.", "Open /pixlpush-sw.js on your site (it must not 404). On macOS allow the browser in System Settings → Notifications and turn off Focus."],
    ["Status says “Waiting for the web SDK”", "No browser has subscribed yet.", "Click Enable notifications on your site and allow it; the project then shows subscribed browsers."],
  ],
  opens: [
    ["Click count stays at zero", "Clicks in your own toast or inbox were not reported.", "Call PixlPush.openNotification(n) from that click. System notification clicks are recorded automatically."],
    ["Clicks are not recorded after upgrading", "The site still serves an old pixlpush-sw.js.", "Copy the worker again after every upgrade (the postinstall script does this)."],
  ],
};

export const errorCodes: [string, string, string][] = [
  ["SDK_KEY_MISSING", "init() ran without an sdkKey.", "Pass the key from an environment variable exposed to the browser."],
  ["SDK_KEY_INVALID", "The key is revoked, deleted or malformed.", "Create or rotate the project SDK key."],
  ["SDK_KEY_PROJECT_MISMATCH", "projectId does not belong to the key.", "Use the project id/slug of the same project, or omit it."],
  ["PROJECT_INACTIVE", "The project is not active.", "Reactivate the project before sending data."],
  ["VALIDATION_ERROR", "An event, identity or configuration value is invalid.", "Fix the value named in the message."],
  ["NETWORK_ERROR", "The browser could not reach the API.", "Check the network, the key's server and your CSP; queued work retries on its own."],
  ["RATE_LIMITED", "Too many requests from this key.", "The queue backs off and retries automatically."],
  ["QUEUE_FULL", "The offline queue reached maxQueueSize.", "Reconnect, or raise maxQueueSize deliberately."],
];

const fence = (lang: string, body: string) => "```" + lang + "\n" + body + "\n```";
const list = (commands: Record<string, string>) => Object.entries(commands).map(([name, cmd]) => `- ${name}: \`${cmd}\``).join("\n");

/** One prompt for Claude Code, Codex, Cursor, Copilot and other agents. Built from the same snippets as the guides. */
export const aiPrompt = `You are a senior full-stack engineer. Integrate the PixlPush web SDK (${PACKAGE} ${SDK_VERSION}) into this repository: user identity, product analytics, and browser push notifications (Web Push, no Firebase). Work like a careful reviewer is watching: small, focused changes that match the existing code.

<goal>
When you are done, the site initializes PixlPush once on the client, identifies users on sign-in and resets on sign-out, tracks its core product events, offers a "Turn on notifications" button, counts clicks on in-app notifications, serves the PixlPush service worker, and passes the verification step below.
</goal>

<sdk_facts>
- One npm package: ${PACKAGE}. Entry points: "${PACKAGE}/react" (PixlPushProvider, usePixlPush), "${PACKAGE}/vue" (PixlPushPlugin, usePixlPush), "${PACKAGE}/angular" (providePixlPush, PIXLPUSH), "${PACKAGE}" (PixlPush singleton for anything else).
- It never throws and never rejects; on the server (SSR) every call is a no-op. Failures go to PixlPush.onError.
- The only required option is sdkKey (a public pp_sk_… key; safe in browser code). The SDK always sends to the PixlPush API: there is NO apiBaseUrl/url option.
- page_viewed (every navigation) and page_left (with duration_ms, the visible time on the page) are tracked automatically. Do not track them yourself, and do not track logged_in / logged_out: identify() and reset() already show as "Logged in" / "Logged out" on the user's profile.
- Every id the SDK makes is a cuid. externalUserId is the app's own stable user id (never an email).
- Push needs a service worker file served from the site root at /pixlpush-sw.js. The SDK registers it under its own scope (/pixlpush/), so an existing service worker (PWA, caching) is untouched.
</sdk_facts>

<api_whitelist>
Use only these. Do not invent methods or options.
- init(config) · getStatus() · flush() · onError(fn)
- identify({ externalUserId, email?, name?, emailConsent?, userHash?, properties? }) · updateUser(fields) · reset() · deleteUser()
- track(name, properties?) · setConsent({ analytics?, email?, push? })
- isPushSupported() · getPushPermission() · requestPushPermission() · unsubscribePush() · onPushPermissionChange(fn)
- onNotificationReceived(fn) · onNotificationOpened(fn) · openNotification(notification)
- Config options: sdkKey, projectId, environment, debug, notificationIcon, serviceWorkerPath, serviceWorkerScope, trackPageViews, autoPush.
</api_whitelist>

<rules>
1. Fit the codebase: follow its framework, language (TS/JS), folder layout, naming, formatting, state and auth patterns. Adapt file paths; keep behaviour identical.
2. Client only: initialize in client code (React provider / Vue plugin / Angular provider / onMount). Never call the SDK at module top level of a server component or SSR-only file.
3. Secrets: only the public SDK key goes to the browser, through the framework's public env prefix (VITE_, NEXT_PUBLIC_, NUXT_PUBLIC_, PUBLIC_, Angular environment.ts). An identity-verification secret, if used, stays on the server.
4. Privacy: externalUserId is the stable internal user id, never an email. Never send passwords, tokens, payment data or other sensitive values as properties. Set emailConsent only from a real consent signal; do not default it to true.
5. Permission: call requestPushPermission() only from a user click. Never prompt on page load.
6. Scope: do not refactor unrelated code, upgrade unrelated dependencies, or change build tooling beyond what the steps need.
7. Uncertainty: if something conflicts with these steps (no clear auth flow, monorepo with several apps, unusual entry point, custom service worker setup), stop and ask one concise question instead of guessing.
</rules>

<workflow>
Step 0 — Inspect, then plan. Before editing, report in a short list:
- framework and version (Next.js App/Pages Router, Vite + React, Remix, Vue, Nuxt, Angular, SvelteKit, Astro, plain HTML)
- package manager (from the lockfile) and the public/static folder
- the root component or bootstrap file
- where sign-in and sign-out happen, and how the current user is read
- whether the site already shows toasts/notifications, and with which library
- whether a Content-Security-Policy is set (headers, next.config, meta tag)
- the files you intend to create or change
Then proceed.

Step 1 — Install (pick the matching command):
${list(installCommands)}

Step 2 — Service worker. Copy it into the public folder and keep it in sync on every install by adding a postinstall script (merge with any existing postinstall; SvelteKit uses static/ instead of public/):
${fence("json", code.postinstall)}
Angular: add this to the build "assets" in angular.json instead:
${fence("json", code.angularAssets)}
Run the copy once now. /pixlpush-sw.js must not be caught by an SPA catch-all route or rewritten to index.html.

Step 3 — Public config. Add the key as a placeholder; I will paste it from PixlPush → Project settings → SDK keys:
${fence("sh", code.env)}
Also add the variable name (empty value) to .env.example if the project has one.

Step 4 — Initialize once at the root. Use the block for this framework:
React / Vite / Remix:
${fence("tsx", code.react)}
Next.js App Router (app/layout.tsx; the react entry is already a client module). Pages Router: wrap pages/_app.tsx the same way:
${fence("tsx", code.next)}
Vue 3:
${fence("ts", code.vue)}
Nuxt 3 (plugins/pixlpush.client.ts; expose the key via runtimeConfig.public.pixlpushSdkKey):
${fence("ts", code.nuxt)}
Angular 15+ (NgModule apps: add providePixlPush to the root module providers):
${fence("ts", code.angular)}
SvelteKit / Astro / other (call inside onMount or a client-only script):
${fence("ts", code.vanilla)}
Plain HTML:
${fence("html", code.script)}
Pass debug: true only in development (for example import.meta.env.DEV or process.env.NODE_ENV !== "production").

Step 5 — Identity: drive it from the existing auth state, once per sign-in and sign-out, not per page.
React / Next.js → a small client component rendered once inside the provider:
${fence("tsx", code.authSync)}
Vue / Nuxt:
${fence("ts", code.vueAuth)}
Angular / other: call identify after a successful sign-in and await reset() on sign-out, in the existing auth service.
Identity verification: only if the project already has a server and I confirm PixlPush identity verification is on, compute userHash on the server and pass it down (Next.js example; never expose PIXLPUSH_IDENTITY_SECRET to the client):
${fence("tsx", code.nextLayout)}

Step 6 — Events: find the site's 3–8 most important actions and track them through one typed helper. snake_case names, flat properties (string, number, boolean, null), no sensitive values. Add each track() call next to the existing code that completes the action (sign-up, pricing/paywall, checkout); do not change what that code does. Prefer these names when the action exists, so PixlPush journeys can start and end on them; skip the ones this site doesn't have:
${suggestedEventsText}

${fence("ts", code.typedTrack)}
If a cookie/consent banner exists, forward its answers:
${fence("ts", code.consent)}

Step 7 — Push permission UI: a hook plus a button placed where opting in makes sense (account/settings page, after a purchase or order), styled with the project's own components:
${fence("ts", code.permissionHook)}
${fence("tsx", code.permissionButton)}

Step 8 — In-app notifications (only if the site has a toast/notification system; otherwise skip and say so). Show notifications that arrive while the site is open and route on open. openNotification(n) on click is required, or the click is not counted:
${fence("tsx", code.inAppToast)}

Step 9 — CSP (only if one exists): allow the PixlPush API host in connect-src and 'self' in worker-src:
${fence("text", code.csp)}
Ask me for the API host rather than guessing it.

Step 10 — Verify. Run the project's type checker, linter and build, and fix anything you introduced. Then tell me how to check in the browser:
${fence("ts", code.debugConfig)}
</workflow>

<acceptance_criteria>
- The SDK initializes exactly once, on the client only; the production build and SSR pages work with no "window is not defined" errors.
- /pixlpush-sw.js is served from the site root (not 404, not the app's HTML) and is refreshed by postinstall (or angular.json assets).
- identify() runs after sign-in with the internal user id; reset() runs on sign-out.
- The main conversion events are tracked through one typed helper; no page_viewed/page_left duplicates.
- Account deletion calls deleteUser() after the server deleted the account.
- requestPushPermission() is only reachable from a click; the button handles granted, denied, default and unsupported.
- In-app notification clicks call openNotification(n).
- No secrets in client code, no sensitive properties, no unrelated changes. Type check, lint and build pass.
</acceptance_criteria>

<manual_steps>
Do not attempt these. List them for me at the end:
1. In PixlPush → Project settings, make sure the project's platform is Website (no Firebase needed for websites).
2. Create a development SDK key and paste it into the env file; create a separate production key for the live site.
3. If identity verification is on: copy the identity secret into the server's environment (never the client's).
4. Run the site, click the notifications button, allow, then send a test from PixlPush → Push Notifications → a template → Test send.
</manual_steps>

<final_report>
End with exactly these sections:
1. Summary — two sentences.
2. Files changed — one line per file with what changed.
3. Events tracked — name, where, properties.
4. Commands to run — anything I still need to run.
5. Manual steps — the checklist above, in order.
6. Open questions — assumptions you made, if any.
</final_report>`;
