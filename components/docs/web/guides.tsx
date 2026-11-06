import type { ComponentType, ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ApiRounded from "@mui/icons-material/ApiRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import BugReportOutlined from "@mui/icons-material/BugReportOutlined";
import CodeRounded from "@mui/icons-material/CodeRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import CodeBlock from "../CodeBlock";
import CodeTabs from "../CodeTabs";
import { Body, Callout, Checklist, DataTable, Expect, LinkCard, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { guideHref } from "../registry";
import { aiPrompt, code, configOptions, errorCodes, installCommands, methods, PACKAGE, SDK_VERSION, troubleshooting } from "./content";

export type WebGuideProps = { base: string };
const A = ({ href, children }: { href: string; children: ReactNode }) => <LinkBox href={href} sx={{ color: "inherit" }}>{children}</LinkBox>;
export const web = (base: string, slug = "", hash?: string) => guideHref(base, "web", slug, hash);

const frameworks = {
  "React / Vite": { code: code.react, language: "TypeScript", filename: "src/main.tsx" },
  "Next.js": { code: code.next, language: "TypeScript", filename: "app/layout.tsx" },
  Vue: { code: code.vue, language: "TypeScript", filename: "src/main.ts" },
  Nuxt: { code: code.nuxt, language: "TypeScript", filename: "plugins/pixlpush.client.ts" },
  Angular: { code: code.angular, language: "TypeScript", filename: "src/main.ts" },
  "Svelte / other": { code: code.vanilla, language: "TypeScript", filename: "src/pixlpush.ts" },
  "Script tag": { code: code.script, language: "HTML", filename: "index.html" },
};

export function Overview({ base }: WebGuideProps) {
  return <>
    <Callout tone="tip" title="Start here">
      <b>Analytics and push:</b> <A href={web(base, "quickstart")}>Quickstart</A> (about 10 minutes). Website push needs no Firebase.<br />
      <b>Already installed:</b> <A href={web(base, "push")}>Web Push</A> → <A href={web(base, "production")}>Verify &amp; ship</A>.<br />
      <b>Using an AI coding agent:</b> <A href={web(base, "ai-setup")}>AI agent setup</A>.
    </Callout>
    <Section id="what-it-does" title="What it does">
      <Body><code>{PACKAGE}</code> connects your website’s visitors and what they do to PixlPush. One package works in React, Next.js, Vue, Nuxt, Angular, Svelte, Remix, Astro and plain HTML. It never throws, does nothing during server rendering, and queues work while offline.</Body>
      <DataTable code={false} headers={["Capability", "What happens automatically"]} rows={[
        ["Identity", "Every browser starts as an anonymous user; identify() links it to your user after login."],
        ["Events", "page_viewed on every navigation and page_left with the time on page; your own events with track()."],
        ["Email reach", "identify() with email and emailConsent makes the user reachable by email campaigns."],
        ["Web Push", "PixlPush creates the project’s push keys. After the visitor allows notifications, campaigns and journeys reach the browser."],
        ["Attribution", "Clicking a notification records the open for its campaign or journey, even with no tab open."],
      ]} />
    </Section>
    <Section id="architecture" title="How it fits together">
      <DataTable code={false} headers={["Piece", "Runs where", "Its job"]} rows={[
        [<code key="s">{PACKAGE}</code>, "Your site’s JavaScript (browser)", "Identity, events, the offline queue, asking for push permission."],
        [<code key="w">pixlpush-sw.js</code>, "The browser, in the background (service worker)", "Shows notifications even when your site is closed, and records clicks."],
        ["PixlPush API", "PixlPush’s servers (built into the SDK)", "Stores users and events, runs campaigns and journeys, sends push."],
        ["Your backend", "Your server", <>Nothing required. Optional: compute <code key="h">userHash</code> for <A href={web(base, "identity", "verification")}>identity verification</A>.</>],
      ]} />
      <Body>You don’t write any server-side push code, store subscriptions, or manage push keys: PixlPush does that. Your code calls <code>identify</code>, <code>track</code> and <code>requestPushPermission</code>; campaigns and journeys are built in the dashboard.</Body>
    </Section>
    <Section id="frameworks" title="Frameworks and browsers">
      <DataTable headers={["Entry point", "Use it for"]} rows={[
        [`${PACKAGE}/react`, "React, Next.js (App and Pages Router), Remix, Gatsby: PixlPushProvider and usePixlPush()."],
        [`${PACKAGE}/vue`, "Vue 3 and Nuxt 3: PixlPushPlugin and usePixlPush()."],
        [`${PACKAGE}/angular`, "Angular 15+: providePixlPush() and the PIXLPUSH token."],
        [PACKAGE, "Svelte, SvelteKit, Astro and anything else: the PixlPush singleton."],
        ["pixlpush.min.js", "Any site without a bundler: a <script> tag that sets window.PixlPush (from the CDN)."],
      ]} />
      <Body>Push works in Chrome, Edge, Firefox, Opera and Safari 16+ on macOS. On iOS/iPadOS 16.4+ it works after the visitor adds the site to the Home Screen.</Body>
    </Section>
    <Section id="data" title="What the SDK sends">
      <DataTable code={false} headers={["Request", "Contents"]} rows={[
        ["Identity", "Anonymous or external user id, profile fields, consent, browser, OS, language, timezone and push permission."],
        ["Event", "Event id, name, your properties, installation id, session id, environment and timestamp."],
        ["Push subscription", "The browser’s Web Push endpoint and its encryption keys."],
        ["Push open", "Only the notification job id."],
      ]} />
      <Body>Every request is authenticated with the project’s public SDK key.</Body>
    </Section>
    <Section id="next" title="Where to go next">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <LinkCard href={web(base, "quickstart")} icon={<BoltRounded />} title="Quickstart" description="Install, initialize and verify your first event and push." />
        <LinkCard href={web(base, "push")} icon={<NotificationsActiveOutlined />} title="Web Push" description="Permission, notifications, clicks and attribution." />
        <LinkCard href={web(base, "identity")} icon={<FingerprintRounded />} title="Identity" description="Login, logout, account deletion and identity verification." />
        <LinkCard href={web(base, "recipes")} icon={<CodeRounded />} title="Full-stack recipes" description="Next.js end to end, auth sync, typed events, in-app notifications." />
        <LinkCard href={web(base, "local-development")} icon={<BugReportOutlined />} title="Local development" description="Test on localhost and phones, debug in DevTools." />
        <LinkCard href={web(base, "reference")} icon={<ApiRounded />} title="API reference" description="Every method, option and error code." />
      </Box>
    </Section>
  </>;
}

export function Quickstart({ base }: WebGuideProps) {
  return <>
    <Step id="prerequisites" number={1} title="Prerequisites">
      <List items={[
        <>A PixlPush project with the <b>Website</b> platform (Project settings → Push / Firebase), and permission to create SDK keys.</>,
        "A site served over HTTPS (localhost is fine while developing).",
        "Nothing else: no Firebase project and no push keys.",
      ]} />
    </Step>
    <Step id="install" number={2} title="Install the SDK">
      <CodeTabs options={installCommands} label="Package manager" group="package-manager" />
    </Step>
    <Step id="worker" number={3} title="Serve the service worker">
      <Body>Browsers only run service workers from your own site, so <code>pixlpush-sw.js</code> must be served at <code>/pixlpush-sw.js</code>. Copy it into your public folder:</Body>
      <CodeBlock code={code.copyWorker} language="Shell" />
      <Body>Add a <code>postinstall</code> script so it is refreshed on every upgrade (Angular: see <A href={web(base, "installation", "worker")}>Install &amp; configure</A>):</Body>
      <CodeBlock code={code.postinstall} language="JSON" filename="package.json" />
      <Expect>Opening <code>https://your-site/pixlpush-sw.js</code> shows the script, not a 404.</Expect>
    </Step>
    <Step id="key" number={4} title="Create an SDK key">
      <Body>Open <b>Project settings → SDK keys</b>, create a key named for the environment and copy it. It is a public key: it can ship in your site’s JavaScript.</Body>
      <CodeBlock code={code.env} language="Environment" filename=".env.local" />
    </Step>
    <Step id="init" number={5} title="Initialize once">
      <CodeTabs options={frameworks} label="Framework" group="web-framework" />
      <Expect><code>PixlPush.getStatus().configured</code> is <code>true</code>, and a <code>page_viewed</code> event appears in PixlPush → Users.</Expect>
    </Step>
    <Step id="identify" number={6} title="Identify after login">
      <CodeBlock code={code.identify} filename="after login" />
      <CodeBlock code={code.reset} filename="on logout" />
    </Step>
    <Step id="track" number={7} title="Track an event">
      <CodeBlock code={code.track} />
    </Step>
    <Step id="push" number={8} title="Add an Enable notifications button">
      <CodeBlock code={code.permission} filename="EnableNotifications.tsx" />
      <Expect>After the visitor clicks <b>Allow</b>, Project settings shows a subscribed browser, and a test push from <b>Push Notifications → a template → Test send</b> arrives.</Expect>
    </Step>
    <Step id="checkpoint" number={9} title="Before production">
      <Checklist items={["Use a separate production SDK key.", "Copy pixlpush-sw.js on every deploy (postinstall).", "Test login → logout → login as someone else in one browser.", <>Send a test push, click it with the tab open and with it closed, and check the template’s click count.</>, <>Work through <A href={web(base, "production")}>Verify &amp; ship</A>.</>]} />
    </Step>
  </>;
}

export function AiSetup({ base }: WebGuideProps) {
  return <>
    <Section id="prompt" title="The prompt">
      <Body>Copy this into Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Cline or any coding agent, from the root of your website’s repository. It detects your framework, uses the same code as these guides, and lists only real SDK methods, so the agent doesn’t invent APIs.</Body>
      <CodeBlock code={aiPrompt} language="Markdown" download="pixlpush-web-setup-prompt.md" filename="pixlpush-web-setup-prompt.md" lineNumbers={false} maxHeight={520} wrap />
    </Section>
    <Section id="how" title="How to use it">
      <DataTable code={false} headers={["Agent", "Where to paste it"]} rows={[
        ["Claude Code", "Run claude in the project root and paste it, or save it as CLAUDE.md."],
        ["Codex (CLI, IDE or cloud)", "Paste it into the session, or save it as AGENTS.md in the repo root."],
        ["Cursor", "Agent mode in chat, or save it under .cursor/rules/."],
        ["GitHub Copilot", "Copilot Chat in agent mode, or .github/copilot-instructions.md."],
        ["Gemini CLI", "Paste it into the session, or save it as GEMINI.md."],
        ["Windsurf / Cline / others", "Paste it into the agent chat with file editing enabled."],
      ]} />
      <List ordered items={["Open your website’s repository in the agent (agent or edit mode, not plain chat).", "Paste the prompt. The agent first reports what it found (framework, auth, toasts, CSP) and its plan.", "Answer any question it asks, review the diff, then paste your development SDK key.", <>Run the site, click the notifications button, and follow <A href={web(base, "production")}>Verify &amp; ship</A>.</>]} />
    </Section>
    <Section id="what-it-does" title="What the agent will do">
      <DataTable code={false} headers={["Step", "Result"]} rows={[
        ["Inspect", "Framework, package manager, auth flow, toast library and CSP, with a plan before any edit."],
        ["Install", "The package, plus a postinstall copy of pixlpush-sw.js (angular.json assets for Angular)."],
        ["Initialize", "The provider, plugin or init call for your framework, client-only, with debug in development."],
        ["Identity", "identify on sign-in and reset on sign-out, driven from your auth state."],
        ["Events", "Your 3–8 key actions through one typed track helper."],
        ["Push", "A notifications button that handles every permission state, and openNotification on in-app toasts."],
        ["Verify", "Type check, lint and build, then a report with files changed, events tracked and open questions."],
      ]} />
    </Section>
    <Section id="manual" title="What you do by hand">
      <List items={["Create the SDK key in PixlPush and paste it into your env file.", "Choose the Website platform in Project settings (no Firebase needed).", "If you use identity verification, put the secret in your server’s environment yourself.", "Click Allow on the permission prompt and send a test push."]} />
      <Callout tone="danger" title="Never give the agent secrets">The SDK key is public, but an identity-verification secret is not. Add it to your server environment yourself.</Callout>
    </Section>
  </>;
}

export function Installation({ base }: WebGuideProps) {
  return <>
    <Section id="packages" title="Package">
      <CodeTabs options={installCommands} label="Package manager" group="package-manager" />
      <Body>One package, no dependencies, about 11 KB gzipped. React and Angular are optional peer dependencies, only needed for their helpers. Current version: <code>{SDK_VERSION}</code>.</Body>
    </Section>
    <Section id="worker" title="Service worker">
      <Body>Serve <code>pixlpush-sw.js</code> from your site’s root. The SDK registers it under its own scope (<code>/pixlpush/</code>), so a worker your site already has (PWA, caching) keeps working.</Body>
      <DataTable code={false} headers={["Framework", "Where it goes"]} rows={[
        ["Vite, React, Vue, Next.js, Nuxt, SvelteKit, Astro", <><code key="p">public/pixlpush-sw.js</code> (Nuxt 3: <code>public/</code>; SvelteKit: <code>static/</code>)</>],
        ["Angular", "The assets entry below, in angular.json."],
        ["Plain HTML", "Next to your index.html."],
      ]} />
      <CodeBlock code={code.postinstall} language="JSON" filename="package.json" />
      <CodeBlock code={code.angularAssets} language="JSON" filename="angular.json (build → options)" />
    </Section>
    <Section id="environment" title="Environment variables">
      <Body>The key must be readable in the browser, so use your framework’s public prefix.</Body>
      <CodeBlock code={code.env} language="Environment" filename=".env.local" />
    </Section>
    <Section id="initialize" title="Initialize">
      <CodeTabs options={frameworks} label="Framework" group="web-framework" />
      <Body>Initialize once at the root. Calls made before <code>init()</code> finishes wait for it (up to 10 s), so components can track right away.</Body>
    </Section>
    <Section id="status" title="Check getStatus()">
      <CodeBlock code={code.status} />
      <Body>Set <code>debug: true</code> to log every call in the browser console. Listen with <code>onError</code> to see failures in production.</Body>
      <CodeBlock code={code.onError} />
    </Section>
    <Section id="options" title="Configuration options">
      <DataTable headers={["Option", "Type", "Default", "Description"]} rows={configOptions} minWidth={760} />
    </Section>
    <Section id="endpoint" title="Where data is sent">
      <Body>There is no URL option. The SDK always sends to the PixlPush API, whatever <code>environment</code> you set; the key decides which project the data belongs to.</Body>
      <Callout tone="tip" title="One key per environment">Use a development key locally and a production key on your live site, both created in the PixlPush dashboard. Only the key changes.</Callout>
    </Section>
  </>;
}

export function SdkKeys() {
  return <>
    <Section id="what" title="What an SDK key is">
      <Body>A <code>pp_sk_…</code> key identifies your PixlPush project and authenticates what the website sends. It is public by design: it ships in your site’s JavaScript and grants no dashboard access.</Body>
    </Section>
    <Section id="create" title="Create a key">
      <List ordered items={["Open the project in PixlPush.", <>Go to <b>Project settings → SDK keys</b>.</>, "Create a key named development, staging or production.", "Copy the full key now; it is shown only once."]} />
    </Section>
    <Section id="environments" title="One key per environment">
      <DataTable code={false} headers={["Environment", "Where the key goes", "Why"]} rows={[
        ["development", ".env.local", "Local testing against your development server."],
        ["staging", "Staging environment variables", "Separate QA traffic."],
        ["production", "Production environment variables", "Real visitors, campaigns and journeys."],
      ]} />
    </Section>
    <Section id="rotate" title="Rotate without downtime">
      <List ordered items={["Create the new key.", "Deploy the site with it.", "Check events and push opens arrive.", "Revoke the old key once its last-used date stops moving."]} />
    </Section>
    <Section id="revoke" title="Revoke vs. delete">
      <DataTable code={false} headers={["State", "What the site sees"]} rows={[
        ["Revoked or deleted", <><code key="i">SDK_KEY_INVALID</code> in onError; nothing is sent.</>],
        ["Project mismatch", <><code key="m">SDK_KEY_PROJECT_MISMATCH</code>; fix or remove <code>projectId</code>.</>],
        ["Inactive project", <><code key="p">PROJECT_INACTIVE</code>; reactivate the project.</>],
      ]} />
    </Section>
  </>;
}

export function Identity() {
  return <>
    <Section id="model" title="Anonymous and identified users">
      <Body>Each browser gets an anonymous PixlPush user on its first visit, stored in <code>localStorage</code>. <code>identify()</code> links it to your own user id; what it did before login is kept on that user.</Body>
    </Section>
    <Section id="identify" title="Identify after login">
      <CodeBlock code={code.identify} />
      <Body>Pass <code>email</code> with <code>emailConsent: true</code> to make the user reachable by email campaigns.</Body>
    </Section>
    <Section id="update" title="Update user properties">
      <CodeBlock code={code.updateUser} />
    </Section>
    <Section id="reset" title="Reset on logout">
      <CodeBlock code={code.reset} />
      <Body>The browser’s push subscription moves to the new anonymous user, so a shared computer never receives the previous person’s notifications.</Body>
    </Section>
    <Section id="delete" title="Account deletion">
      <CodeBlock code={code.deleteUser} />
      <Body>PixlPush keeps the user’s history but unlinks every device and stops their push and email. The user stays in the Users list as Deleted. Logging in again with the same id restores the profile and its history; an identify queued before the deletion (another tab still open) can’t undo it. The request proves itself with the <code>userHash</code> from <code>identify()</code>, or, without identity verification, with this browser being signed in as the user. From a server, use a server SDK (PHP: <code>deleteUser()</code>).</Body>
    </Section>
    <Section id="profile" title="What the profile shows">
      <DataTable headers={["Your app", "Call", "Status", "Activity"]} rows={[
        ["Sign up / log in", "identify()", "Active", "Logged in (once per sign-in on a device; repeat calls log nothing)"],
        ["Log out", "reset()", "Logged out (when no device is still signed in)", "Logged out"],
        ["Delete account", "deleteUser()", "Deleted (still listed; a later login restores it)", "Account deleted"],
      ]} />
      <Body>Don’t track <code>logged_in</code> or <code>logged_out</code> events yourself: the profile already has them. Use a stable <code>externalUserId</code> that is never reused, such as a cuid (<code>cmw4tzovh05ivbpm0nt3r26vp</code>); every id the SDK makes itself is one.</Body>
    </Section>
    <Section id="verification" title="Identity verification">
      <Body>When the project requires it, pass <code>userHash</code>: HMAC-SHA256 of <code>externalUserId</code> with the project’s identity secret, computed on your server.</Body>
      <CodeBlock code={code.userHash} />
      <Callout tone="danger" title="Never put the identity secret in the browser">Anyone could then sign in as any user. Compute the hash on your server and send only the hash to the page.</Callout>
    </Section>
  </>;
}

export function Events() {
  return <>
    <Section id="track" title="Track an event">
      <CodeBlock code={code.track} />
    </Section>
    <Section id="rules" title="Names and properties">
      <List items={["Names: snake_case, up to 120 characters, no emails or URLs.", "Up to 100 properties; values are strings (up to 2000 characters), numbers, booleans, dates or null. No nested objects.", "Keys that look like secrets (password, token, card_number…) are rejected."]} />
      <Body>An invalid event is dropped, <code>track()</code> resolves <code>null</code>, and the reason goes to <code>onError</code>. Your site never breaks.</Body>
    </Section>
    <Section id="automatic" title="Tracked automatically">
      <DataTable headers={["Event", "When", "Properties"]} rows={[
        ["page_viewed", "On load, every client-side navigation (pushState, popstate) and a back/forward-cache restore.", "path, url, title, referrer"],
        ["page_left", "When the page is left: the next route, a full navigation or closing the tab.", "path, url, title, duration_ms (visible time only)"],
      ]} />
      <Body>A visit reads page_viewed → page_left → page_viewed…, like PostHog’s pageview/pageleave and GA4’s engagement time. Every event carries a <code>sessionId</code> (a new session after 30 minutes of inactivity), so there is no separate session event. A <code>page_left</code> the browser could not send before the tab closed goes out on the next visit with its original time. Set the page title before navigating so <code>page_viewed</code> records it. Turn both off with <code>trackPageViews: false</code>.</Body>
    </Section>
    <Section id="consent" title="Consent">
      <CodeBlock code={code.consent} />
    </Section>
    <Section id="queue" title="Offline queue & retries">
      <Body>Work is stored in <code>localStorage</code> (memory if blocked) and sent every 15 seconds, when the tab is hidden, and when the browser comes back online. Failed requests retry with backoff.</Body>
      <CodeBlock code={code.flush} />
    </Section>
  </>;
}

export function Push({ base }: WebGuideProps) {
  return <>
    <Section id="how" title="How Web Push works">
      <List ordered items={[
        "The visitor clicks your Enable notifications button and allows notifications.",
        "The browser creates a push subscription; the SDK sends it to PixlPush. PixlPush creates the project’s push keys the first time.",
        "Campaigns and journeys send to the browser’s push service, which wakes pixlpush-sw.js to show the notification, even with your site closed.",
        "A click records the open and opens the deep link.",
      ]} />
      <Callout tone="tip" title="No Firebase">Website push uses the browser’s standard Web Push. There is nothing to configure in PixlPush besides choosing the Website platform.</Callout>
    </Section>
    <Section id="permission" title="Ask for permission">
      <CodeBlock code={code.permission} filename="EnableNotifications.tsx" />
      <Body>Browsers only show the prompt after a click. Once granted, the subscription is re-synced on every visit and follows identify/reset. The SDK never prompts on its own.</Body>
      <CodeBlock code={code.pushState} />
    </Section>
    <Section id="permission-changes" title="Permission changes">
      <Body>Visitors can allow, block or reset notifications later from the address bar or browser settings. The SDK notices by itself, never prompts, and sends only a real change: through the browser’s permission change event (Chrome, Edge, Firefox), when the visitor comes back to the tab (every browser, Safari included), and on every page load. PixlPush stops sending to a device that is no longer allowed, and the user’s activity shows “Notifications allowed”, “Notifications blocked” or “Notifications permission reset”, with the browser or device.</Body>
      <CodeBlock code={'const off = PixlPush.onPushPermissionChange((permission) => {\n  // "granted" | "denied" | "default": update your own toggle\n});'} />
    </Section>
    <Section id="listeners" title="Notification listeners">
      <CodeBlock code={code.listeners} />
      <Body>Each notification has <code>notificationJobId</code>, <code>campaignId</code>, <code>journeyId</code>, <code>deepLink</code>, <code>title</code>, <code>body</code> and <code>data</code>.</Body>
    </Section>
    <Section id="attribution" title="Open attribution">
      <DataTable code={false} headers={["Where the visitor clicks", "What records the open"]} rows={[
        ["System notification, site closed", "The service worker records it, then opens the deep link in a new tab."],
        ["System notification, tab open", "The service worker records it, focuses the tab, and onNotificationOpened fires."],
        ["Your own toast or inbox", <>Call <code key="o">PixlPush.openNotification(n)</code>; it does exactly what a system click does.</>],
      ]} />
      <CodeBlock code={code.openNotification} />
      <Callout tone="warning" title="In-page clicks need openNotification">Without it, clicks in your own UI are not counted as opens and journey click counts stay at zero.</Callout>
    </Section>
    <Section id="deep-links" title="Deep links">
      <Body>Web links (<code>https://…</code> or a path like <code>/checkout</code>) open on click. Same-site links arrive in <code>onNotificationOpened</code>, so a single-page app can route without a reload; with no listener the SDK navigates itself. App links such as <code>myapp://…</code> open your site’s root.</Body>
    </Section>
    <Section id="browsers" title="Browser support">
      <DataTable code={false} headers={["Browser", "Support"]} rows={[
        ["Chrome, Edge, Opera, Firefox (desktop and Android)", "Yes"],
        ["Safari 16+ on macOS", "Yes"],
        ["Safari on iOS/iPadOS 16.4+", "Only after Add to Home Screen"],
        ["Private windows, very old browsers", "No: isPushSupported() is false"],
      ]} />
    </Section>
    <Section id="test" title="Test matrix">
      <Checklist items={["Allow notifications; Project settings shows a subscribed browser.", "Test send with the tab focused: a notification shows and onNotificationReceived fires.", "Click it: the tab focuses, the deep link opens, the click count rises.", "Close the site, test send, click: a new tab opens on the deep link; the click count rises.", "Click Open in your own toast: the click count rises.", "Unsubscribe: no further notifications."]} />
    </Section>
  </>;
}

export function Recipes({ base }: WebGuideProps) {
  return <>
    <Callout tone="tip" title="Copy, then adapt">Each recipe is a complete file. Replace the auth and router imports with your own; the PixlPush parts work as written.</Callout>
    <Section id="nextjs" title="Next.js end to end">
      <Body>The provider and an auth-sync component in the root layout. The identity hash is computed on the server, so the secret never ships to the browser.</Body>
      <CodeBlock code={code.serverEnv} language="Environment" filename=".env.local" />
      <CodeBlock code={code.nextLayout} filename="app/layout.tsx" />
      <CodeBlock code={code.authSync} filename="app/pixlpush-auth-sync.tsx" />
      <Expect>After login the user appears in PixlPush → Users under your own user id; after logout the browser starts a new anonymous user.</Expect>
    </Section>
    <Section id="auth-sync" title="Sync with your auth state">
      <Body>Calling <code>identify</code> once per login and <code>reset</code> once per logout is all PixlPush needs. Drive both from your auth state, not from individual pages:</Body>
      <CodeTabs options={{
        "React / Vite": { code: code.reactAuth, filename: "src/App.tsx", language: "TypeScript" },
        "Vue / Nuxt": { code: code.vueAuth, filename: "src/pixlpush-auth.ts", language: "TypeScript" },
      }} label="Framework" group="web-framework-short" />
      <Body>Reuse <code>PixlPushAuthSync</code> from the Next.js recipe for any React app. Calling <code>identify</code> again for the same user is safe.</Body>
    </Section>
    <Section id="typed-events" title="Typed events">
      <Body>Keep every event name and its properties in one type, so typos fail at build time and the list doubles as your tracking plan.</Body>
      <CodeBlock code={code.typedTrack} filename="src/lib/analytics.ts" />
    </Section>
    <Section id="permission" title="A notifications button that knows its state">
      <CodeBlock code={code.permissionHook} filename="src/hooks/usePushPermission.ts" />
      <CodeBlock code={code.permissionButton} filename="src/components/NotificationsButton.tsx" />
      <Body>Show it where turning notifications on makes sense (after a purchase, on an order page, in settings) rather than on first load: browsers block sites that prompt too early.</Body>
    </Section>
    <Section id="in-app" title="In-app notifications">
      <Body>When a notification arrives while the site is open, show it in your UI and count clicks on it:</Body>
      <CodeBlock code={code.inAppToast} filename="src/components/PixlPushToasts.tsx" />
      <Callout tone="warning" title="Call openNotification on click">It records the open for the campaign or journey. Without it, clicks on your toast are not counted.</Callout>
    </Section>
    <Section id="checklist" title="Wiring checklist">
      <Checklist items={["Provider (or init) once at the app root.", "PixlPushAuthSync (or the Vue watch) next to it.", "A typed track helper for your product events.", "A notifications button in a sensible place.", "PixlPushToasts if you show notifications in-app.", <>Then <A href={web(base, "production")}>Verify &amp; ship</A>.</>]} />
    </Section>
  </>;
}

export function LocalDevelopment() {
  return <>
    <Section id="setup" title="Run it locally">
      <CodeBlock code={code.localSetup} language="Shell" />
      <Body><code>localhost</code> counts as a secure context, so push works there over plain http. The SDK sends to the PixlPush API as usual; use your development key so test data stays out of production.</Body>
    </Section>
    <Section id="phone" title="Test on a phone or another device">
      <Body>Off <code>localhost</code>, browsers require HTTPS for service workers and push. Expose your dev server over HTTPS:</Body>
      <CodeBlock code={code.tunnel} language="Shell" />
      <Body>The device needs internet access to reach the PixlPush API; nothing else changes.</Body>
    </Section>
    <Section id="devtools" title="Inspect it in DevTools">
      <DataTable code={false} headers={["Where", "What to look for"]} rows={[
        ["Console (with debug: true)", "Every SDK call, its result and any failure, prefixed [PixlPush]."],
        ["Network, filter “sdk/v1”", "identify, events, push/web-config and push/opened requests, and their responses."],
        ["Application → Service workers", <><code key="w">pixlpush-sw.js</code> with scope <code>/pixlpush/</code>, activated and running.</>],
        ["Application → Local storage", "The anonymous id, session and offline queue."],
      ]} />
      <CodeBlock code={code.debugConfig} />
    </Section>
    <Section id="send" title="Send yourself a notification">
      <List ordered items={["Click your Enable notifications button and allow.", "In PixlPush open Push Notifications → a template → Test send, and pick your user (identify first, so you can find yourself).", "Test with the tab focused, in the background, and with the site closed."]} />
      <Callout tone="note" title="The DevTools “Push” button won’t show anything">It sends a plain-text message; the PixlPush worker only handles PixlPush notifications. Use Test send instead.</Callout>
    </Section>
    <Section id="reset" title="Start over">
      <List items={[<>New anonymous visitor: DevTools → Application → Storage → <b>Clear site data</b>.</>, "Permission prompt again: click the lock icon in the address bar → Notifications → Reset (or Ask).", "Fresh service worker: Application → Service workers → Unregister, then reload."]} />
    </Section>
    <Section id="macos" title="Nothing shows on macOS?">
      <Body>Check <b>System Settings → Notifications → your browser</b> is allowed, and that Focus / Do Not Disturb is off. Chrome also groups notifications in Notification Centre.</Body>
    </Section>
  </>;
}

export function Security() {
  return <>
    <Section id="credentials" title="Public vs. secret">
      <DataTable code={false} headers={["Value", "Where it belongs", "Secret?"]} rows={[
        ["SDK key (pp_sk_…)", "Your site’s JavaScript", "No"],
        ["Identity secret", "Your server only", "Yes"],
        ["Project push (VAPID) private key", "Created and kept by PixlPush", "Yes: never leaves PixlPush"],
      ]} />
    </Section>
    <Section id="csp" title="Content Security Policy">
      <Body>If your site sends a CSP header, allow the PixlPush API host and your own worker:</Body>
      <CodeBlock code={code.csp} language="Text" filename="Content-Security-Policy" />
    </Section>
    <Section id="isolation" title="Project isolation">
      <Body>Each key only reaches its own project. A push subscription can only be sent to by the project that created it, and the service worker only handles PixlPush messages, so your site’s own pushes are untouched.</Body>
    </Section>
    <Section id="data" title="Data minimization">
      <Body>Browser and OS are coarse labels (for example “Chrome 131”, “macOS”), with no fingerprinting. Property keys that look like secrets are rejected before they leave the browser.</Body>
    </Section>
  </>;
}

export function Production({ base }: WebGuideProps) {
  return <>
    <Section id="verify" title="Verify step by step">
      <List ordered items={["Open your site with debug: true and check the console has no PixlPush errors.", "PixlPush → Users → filter Anonymous visitors shows the visitor with page_viewed and page_left (time on page).", "Log in: the user is listed under your externalUserId and email, status Active, activity “Logged in”.", "Allow notifications and send a test push; click it. Block notifications in the address bar and come back to the tab: the activity shows “Notifications blocked”.", "Log out: status Logged out. Delete the account (deleteUser): status Deleted; log in again: “Account restored”."]} />
      <Expect>The template or journey shows one delivery and one click.</Expect>
    </Section>
    <Section id="checklist" title="Production checklist">
      <Checklist items={["Production SDK key in production environment variables.", "/pixlpush-sw.js returns the script (not a 404, not your app’s HTML).", "HTTPS everywhere.", "CSP allows the PixlPush API host.", "Your own notification toast calls openNotification on click.", "Account deletion calls deleteUser() after your server deleted the account.", <>Identity verification on, if the project requires it (see <A href={web(base, "identity", "verification")}>Identity</A>).</>]} />
    </Section>
    <Section id="upgrade" title="Upgrading the SDK">
      <CodeBlock code={`npm install ${PACKAGE}@latest\n${code.copyWorker}`} language="Shell" />
      <Body>Always re-copy the service worker after upgrading (the postinstall script does it). Script-tag sites: change the version in the CDN URL.</Body>
    </Section>
  </>;
}

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
    <Callout tone="note" title="Never throws">Every method returns the fallback shown (false, null, &quot;unsupported&quot;) on the server, before init, or on failure, and reports the reason to <code>onError</code>.</Callout>
    <MethodGroup id="setup-methods" title="Setup" list={methods.setup} />
    <MethodGroup id="identity-methods" title="Identity" list={methods.identity} />
    <MethodGroup id="event-methods" title="Events & consent" list={methods.events} />
    <MethodGroup id="push-methods" title="Push" list={methods.push} />
    <Section id="helpers" title="Framework helpers">
      <DataTable headers={["Import", "Exports"]} rows={[
        [`${PACKAGE}/react`, "PixlPushProvider, usePixlPush()"],
        [`${PACKAGE}/vue`, "PixlPushPlugin, usePixlPush()"],
        [`${PACKAGE}/angular`, "providePixlPush(), PIXLPUSH"],
        [PACKAGE, "PixlPush (also the default export)"],
      ]} />
    </Section>
    <Section id="errors" title="Error codes">
      <DataTable headers={["Code", "Meaning", "Fix"]} rows={errorCodes} minWidth={760} />
    </Section>
  </>;
}

export const webGuides: Record<string, ComponentType<WebGuideProps>> = {
  "": Overview,
  quickstart: Quickstart,
  "ai-setup": AiSetup,
  installation: Installation,
  "sdk-keys": SdkKeys,
  identity: Identity,
  events: Events,
  push: Push,
  recipes: Recipes,
  "local-development": LocalDevelopment,
  security: Security,
  production: Production,
  troubleshooting: Troubleshooting,
  reference: Reference,
};
