import type { ComponentType, ReactNode } from "react";
import { Box } from "@mui/material";
import ApiRounded from "@mui/icons-material/ApiRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import FingerprintRounded from "@mui/icons-material/FingerprintRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import CodeBlock from "../CodeBlock";
import CodeTabs from "../CodeTabs";
import { Body, Callout, Checklist, DataTable, Expect, LinkCard, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { guideHref } from "../registry";
import { code, configOptions, errorCodes, laravelConfig, methods, PACKAGE, runtimes, SDK_VERSION, troubleshooting } from "./content";

export type PhpGuideProps = { base: string };
const A = ({ href, children }: { href: string; children: ReactNode }) => <LinkBox href={href} sx={{ color: "inherit" }}>{children}</LinkBox>;
const php = (base: string, slug = "", hash?: string) => guideHref(base, "php", slug, hash);

const setups = {
  "Plain PHP": { code: code.plain, language: "PHP", filename: "bootstrap.php" },
  Laravel: { code: code.laravel, language: "PHP", filename: ".env + any class" },
  Symfony: { code: code.symfony, language: "YAML", filename: "config/services.yaml" },
  "CodeIgniter 4": { code: code.codeigniter, language: "PHP", filename: "app/Config/Services.php" },
  Slim: { code: code.slim, language: "PHP", filename: "app/dependencies.php" },
  "Yii 2": { code: code.yii, language: "PHP", filename: "config/web.php" },
  Drupal: { code: code.drupal, language: "YAML", filename: "mymodule.services.yml" },
};

export function Overview({ base }: PhpGuideProps) {
  return <>
    <Callout tone="tip" title="Start here">
      <b>New integration:</b> <A href={php(base, "quickstart")}>Quickstart</A> (about 10 minutes).<br />
      <b>WordPress site:</b> use the <A href={guideHref(base, "wordpress")}>WordPress plugin</A>. It includes this SDK and the browser SDK.
    </Callout>
    <Section id="what-it-does" title="What it does">
      <Body><code>{PACKAGE}</code> sends users and product events to PixlPush from your PHP backend: Laravel, Symfony, CodeIgniter or plain PHP. Use it for things only your server knows, like signups, payments, webhooks and plan changes.</Body>
      <DataTable code={false} headers={["Capability", "How"]} rows={[
        ["Identity", "identify() creates or updates a user by your own user id, with email, name, plan and custom properties."],
        ["Events", "track() records what a user did. Journeys and segments can react to it right away."],
        ["Email reach", "identify() with email and emailConsent makes the user reachable by email campaigns."],
        ["Identity verification", "userHash() computes the hash the browser SDK needs, so the secret stays on your server."],
      ]} />
      <Body>It never throws into your app (unless you turn on <code>strict</code>). Calls queue in memory and go out together when the request ends. It needs no dependencies, only PHP 7.4+ with curl.</Body>
    </Section>
    <Section id="architecture" title="How it fits together">
      <DataTable code={false} headers={["Piece", "Runs where", "Its job"]} rows={[
        [<code key="p">{PACKAGE}</code>, "Your PHP server", "Users and events your server knows about."],
        [<code key="w">@pixlpush/web</code>, "Your pages (browser)", <>Web Push, page views, sessions and notification clicks. See <A href={php(base, "push")}>Browser push</A>.</>],
        ["PixlPush API", "PixlPush’s servers", "Stores users and events, runs campaigns and journeys, sends push and email."],
      ]} />
      <Body>Both SDKs name a logged-in user by <b>your user id</b> (as a string). Server events and browser activity then belong to the same PixlPush user.</Body>
    </Section>
    <Section id="data" title="What the SDK sends">
      <DataTable code={false} headers={["Request", "Contents"]} rows={[
        ["Identity", "Your user id, the profile fields you pass, environment, platform and SDK version, plus userHash when configured."],
        ["Events", "Event id, name, your user id, your properties, environment, platform and timestamp, up to 100 per request."],
      ]} />
      <Body>Requests come from your server, so PixlPush never treats your server’s IP as the user’s location. Pass <code>clientIp</code> if you want the user located (see <A href={php(base, "identity", "location")}>Identity</A>).</Body>
    </Section>
    <Section id="next" title="Where to go next">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <LinkCard href={php(base, "quickstart")} icon={<BoltRounded />} title="Quickstart" description="Install, configure and verify your first event." />
        <LinkCard href={php(base, "identity")} icon={<FingerprintRounded />} title="Identity" description="Users, location and identity verification." />
        <LinkCard href={php(base, "push")} icon={<NotificationsActiveOutlined />} title="Browser push" description="Add Web Push to the pages your PHP renders." />
        <LinkCard href={php(base, "reference")} icon={<ApiRounded />} title="API reference" description="Every method and error code." />
      </Box>
    </Section>
  </>;
}

export function Quickstart({ base }: PhpGuideProps) {
  return <>
    <Step id="prerequisites" number={1} title="Prerequisites">
      <List items={["A PixlPush project, and permission to create SDK keys.", "PHP 7.4 or newer, and Composer.", <>Outbound HTTPS from your server. Using Laravel? Follow <A href={php(base, "laravel")}>Laravel</A> instead.</>]} />
    </Step>
    <Step id="install" number={2} title="Install the SDK">
      <CodeBlock code={code.install} language="Shell" />
    </Step>
    <Step id="key" number={3} title="Create an SDK key">
      <Body>Open <b>Project settings → SDK keys</b>, create a key and keep it in your environment, not in code.</Body>
      <CodeBlock code={code.env} language="Environment" filename=".env" />
    </Step>
    <Step id="configure" number={4} title="Create one client">
      <CodeTabs options={setups} label="Framework" group="php-framework" />
    </Step>
    <Step id="identify" number={5} title="Identify users">
      <CodeBlock code={code.identify} language="PHP" />
    </Step>
    <Step id="track" number={6} title="Track an event">
      <CodeBlock code={code.track} language="PHP" />
      <Body>Nothing is sent yet: the queue goes out when the request ends.</Body>
    </Step>
    <Step id="verify" number={7} title="Verify">
      <Body>From your project root, with the key in the environment:</Body>
      <CodeBlock code={code.verify} language="Shell" />
      <Expect><code>processed</code> is 2 and <code>failed</code> is 0. The user <code>test-user-1</code> appears in PixlPush → Users, with an <code>sdk_test</code> event.</Expect>
    </Step>
    <Step id="push" number={8} title="Add browser push (optional)">
      <Body>Push subscriptions live in the browser. Add the web SDK to your layout: see <A href={php(base, "push")}>Browser push</A>.</Body>
    </Step>
    <Step id="checkpoint" number={9} title="Before production">
      <Checklist items={[
        "Use a separate production SDK key, set environment to production.",
        "Use the same user id (as a string) on the server and in the browser.",
        <>Set <code>onError</code> to your logger.</>,
        <>Pass your own <code>eventId</code> for webhook events so retries don’t double-count.</>,
        <>Call <code>flush()</code> in queue workers and CLI scripts.</>,
      ]} />
    </Step>
  </>;
}

export function Installation({ base }: PhpGuideProps) {
  return <>
    <Section id="requirements" title="Requirements">
      <List items={[
        "PHP 7.4 to 8.5, on Linux, macOS and Windows.",
        <>json (built in). curl is used when installed; otherwise PHP’s own HTTP streams (<code>allow_url_fopen</code>), so shared hosts work too.</>,
        <>Composer, or copy <code>src/</code> and require two files.</>,
      ]} />
      <CodeBlock code={code.install} language="Shell" />
      <CodeBlock code={code.noComposer} language="PHP" />
    </Section>
    <Section id="configure" title="Configure">
      <Body>Create one client per request, or register it as a singleton in your container. It holds no connection, so constructing it is cheap. Without an <code>sdkKey</code> (for example an unset env var in tests) it is disabled and drops every call instead of failing. Laravel has its own integration: see <A href={php(base, "laravel")}>Laravel</A>.</Body>
      <CodeTabs options={setups} label="Framework" group="php-framework" />
    </Section>
    <Section id="options" title="Configuration options">
      <DataTable headers={["Option", "Type", "Default", "What it does"]} rows={configOptions} minWidth={760} />
    </Section>
    <Section id="sending" title="When data is sent">
      <Body>Calls wait in memory and go out in order. Consecutive events go in one request, and the queue is sent automatically every 100 events.</Body>
      <DataTable code={false} headers={["Runtime", "When the queue is sent"]} rows={runtimes} />
      <List items={[
        "A timeout or server error is retried once. What still fails goes to onError and is dropped: PHP keeps nothing between requests.",
        <>For guaranteed delivery, call <code>track()</code> from a queued job, so your queue retries it. Long-running runtimes: <A href={php(base, "frameworks", "long-running")}>Frameworks &amp; runtimes</A>.</>,
      ]} />
      <CodeBlock code={code.flush} language="PHP" />
      <Body>The SDK uses the PixlPush API. For a local backend, pass <code>apiBaseUrl</code> (for example <code>http://localhost:4000</code>).</Body>
    </Section>
  </>;
}

export function Laravel({ base }: PhpGuideProps) {
  return <>
    <Step id="install" number={1} title="Install">
      <Body>Laravel 8 and newer discover the package: there is no provider or alias to register.</Body>
      <CodeBlock code={code.laravelInstall} language="Shell" />
    </Step>
    <Step id="configure" number={2} title="Configure">
      <CodeBlock code={code.laravelEnv} language="Environment" filename=".env" />
      <DataTable headers={["Env", "config/pixlpush.php", "What it does"]} rows={laravelConfig} minWidth={680} />
      <Body>After changing <code>.env</code> with a cached config, run <code>php artisan config:clear</code>.</Body>
    </Step>
    <Step id="use" number={3} title="Use the facade or inject the client">
      <CodeBlock code={code.laravelUsage} language="PHP" />
      <Body>Failures are written to your log as warnings (with <code>PIXLPUSH_STRICT=true</code> they throw).</Body>
    </Step>
    <Section id="user-ids" title="A PixlPush id per user">
      <Body>Give each user one stable id (a cuid) when they sign up, and tell PixlPush when they delete their account:</Body>
      <CodeBlock code={code.laravelIds} language="PHP" filename="app/Models/User.php" />
    </Section>
    <Section id="auth-events" title="Users from Laravel’s auth events">
      <Body>One listener keeps PixlPush in sync with sign-ups and logins (Breeze, Jetstream, Fortify and Socialite all fire these events). Logins and logouts already show on the profile, from the browser SDK:</Body>
      <CodeBlock code={code.laravelListener} language="PHP" filename="app/Listeners/SendUserToPixlPush.php" />
    </Section>
    <Section id="webhooks" title="Webhooks and payments">
      <CodeBlock code={code.laravelWebhook} language="PHP" />
      <Body>See <A href={php(base, "events", "idempotency")}>Idempotency</A>.</Body>
    </Section>
    <Section id="lifecycle" title="When data is sent">
      <List items={[
        "php-fpm: after the response is sent (Laravel’s terminate), so the user never waits for PixlPush.",
        "Octane (Swoole, RoadRunner, FrankenPHP): after each request.",
        "Queue workers and Horizon: after each job, processed or failed.",
        "Artisan commands and the scheduler: when the command ends.",
      ]} />
    </Section>
    <Section id="blade" title="Browser push in Blade">
      <Body>Add the web SDK to your layout. The same user id and the server-computed <code>userHash</code> link browser and server:</Body>
      <CodeBlock code={code.laravelBlade} language="HTML" filename="resources/views/layouts/app.blade.php" />
      <Body>Also serve <code>public/pixlpush-sw.js</code>: see <A href={php(base, "push", "worker")}>Browser push</A>.</Body>
    </Section>
    <Section id="testing" title="Tests">
      <CodeBlock code={code.laravelTesting} language="XML" filename="phpunit.xml" />
      <Body>With an empty key the client is disabled: <code>PixlPush::isEnabled()</code> is false and nothing is sent. To assert calls, swap the facade: <code>PixlPush::shouldReceive(&apos;track&apos;)-&gt;once()</code>.</Body>
    </Section>
  </>;
}

export function Frameworks({ base }: PhpGuideProps) {
  return <>
    <Section id="setup" title="Set up in your framework">
      <Body>The SDK is plain PHP with no dependencies, so it runs in any framework. Register one client in your container:</Body>
      <CodeTabs options={setups} label="Framework" group="php-framework" />
      <Body>Others (CakePHP, Laminas, Phalcon, Magento modules) work the same way: construct <code>PixlPush\Client</code> once as a shared service. WordPress has a plugin: <A href={guideHref(base, "wordpress")}>WordPress</A>.</Body>
    </Section>
    <Section id="runtimes" title="Runtimes">
      <DataTable code={false} headers={["Runtime", "When the queue is sent"]} rows={runtimes} />
    </Section>
    <Section id="long-running" title="Long-running runtimes">
      <Body>Where one PHP process serves many requests or jobs, the process never ends, so send the queue yourself after each unit of work:</Body>
      <CodeBlock code={code.symfonyTerminate} language="PHP" filename="src/EventListener/FlushPixlPush.php" />
      <CodeBlock code={code.longRunning} language="PHP" />
    </Section>
    <Section id="compatibility" title="Compatibility">
      <DataTable code={false} headers={["", "Supported"]} rows={[
        ["PHP", "7.4, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5"],
        ["HTTP", "curl extension, or PHP streams (allow_url_fopen) when curl is missing"],
        ["Laravel", "8 and newer (auto-discovery, facade, Octane, queues)"],
        ["OS", "Linux, macOS, Windows"],
      ]} />
    </Section>
  </>;
}

export function Identity({ base }: PhpGuideProps) {
  return <>
    <Section id="ids" title="User ids">
      <Body>Name every user by your own stable id: the same one your pages pass to the browser SDK. It must never change or be reused, and must not be an email. PixlPush uses cuids everywhere; if your users don’t have such an id, make one at sign-up:</Body>
      <CodeBlock code={code.cuid} language="PHP" />
    </Section>
    <Section id="identify" title="Identify users">
      <Body>Call <code>identify()</code> after signup and login, and when the profile changes. The first call creates the user; later calls update only the fields you pass.</Body>
      <CodeBlock code={code.identify} language="PHP" />
      <DataTable headers={["Field", "Notes"]} rows={[
        ["email", "Required for email campaigns, together with emailConsent."],
        ["name", "Display name, used in personalization."],
        ["userType · accountStatus", "Your plan or tier and account state, for targeting."],
        ["country · region · timezone · preferredLanguage", "Overrides what PixlPush fills in from the browser."],
        ["emailConsent", "true / false / null."],
        ["properties", "Up to 100 flat values (string, number, boolean, null, date)."],
      ]} />
    </Section>
    <Section id="update" title="Update and consent">
      <CodeBlock code={code.update} language="PHP" />
      <Body>Analytics and push consent belong to a browser, so they’re set with the <A href={guideHref(base, "web", "events", "consent")}>web SDK</A>.</Body>
    </Section>
    <Section id="location" title="Location">
      <Body>PixlPush fills a user’s country from their IP. Calls from PHP come from your server, so its IP is never used. When <code>identify()</code> runs in the user’s own request, you can pass their IP:</Body>
      <CodeBlock code={code.clientIp} language="PHP" />
      <Callout tone="warning" title="Behind a proxy or CDN">Pass the visitor’s IP, not the proxy’s. In Laravel, configure trusted proxies so <code>$request-&gt;ip()</code> is correct. If you add the browser SDK, it fills the location itself and you can skip this.</Callout>
    </Section>
    <Section id="verification" title="Identity verification">
      <Body>With verification on (<b>Project settings → SDK keys → Identity verification</b>), PixlPush only accepts a user id together with its HMAC. Pass <code>identitySecret</code> and the server SDK adds it to every <code>identify()</code>. For the browser SDK, compute it on the server and print it into the page:</Body>
      <CodeBlock code={code.userHash} language="PHP" />
      <Callout tone="danger" title="Keep the secret on the server">Never print the identity secret into a page or ship it to the browser. Only the per-user hash goes there.</Callout>
    </Section>
    <Section id="lifecycle" title="Log in, log out, delete">
      <DataTable headers={["In your app", "Call", "PixlPush profile"]} rows={[
        ["Sign up / log in", "identify() here, and the browser SDK’s identify() on the next page", "Active · “Logged in”"],
        ["Log out", "the browser SDK’s reset() on the first page after logout", "Logged out · “Logged out”"],
        ["Delete account", "deleteUser() here, after you deleted the user", "Deleted · “Account deleted”"],
      ]} />
      <CodeBlock code={code.deleteUser} language="PHP" />
      <Body><code>deleteUser()</code> is sent at once (queued calls go first) and needs <code>identitySecret</code>, so the public SDK key alone can never delete anyone. PixlPush keeps the history, unlinks every device and stops push and email. The user stays in the Users list as Deleted; logging in again with the same id restores the profile and its history, while a call queued before the deletion (a tab still open, a retried job) can’t undo it. Without identity verification, call the browser SDK’s <code>PixlPush.deleteUser()</code> from the signed-in page instead. Don’t track <code>logged_in</code> or <code>logged_out</code> events yourself.</Body>
    </Section>
  </>;
}

export function Events({ base }: PhpGuideProps) {
  return <>
    <Section id="track" title="Track an event">
      <CodeBlock code={code.track} language="PHP" />
      <Body>Returns the <code>eventId</code>, or <code>null</code> when the event was rejected (the reason goes to <code>onError</code>).</Body>
    </Section>
    <Section id="rules" title="Names and properties">
      <Body>The same rules as every PixlPush SDK, checked before anything is sent:</Body>
      <List items={["Event names: 1–120 characters, without @ or ://.", "At most 100 properties.", "Values: strings up to 2000 characters, numbers, booleans, null or DateTimeInterface. No nested arrays.", "Keys that look like secrets (password, secret, api_key, access_token, credit_card, cvv, ssn…) are rejected."]} />
    </Section>
    <Section id="idempotency" title="Idempotency and timestamps">
      <CodeBlock code={code.idempotent} language="PHP" />
      <Body>An <code>eventId</code> is recorded once per project. Base it on your own record (order, subscription, invoice) whenever an event can be sent twice.</Body>
    </Section>
    <Section id="batch" title="trackBatch">
      <CodeBlock code={code.batch} language="PHP" />
      <Body>Up to 100 events per call. Separate <code>track()</code> calls are batched anyway; use <code>trackBatch()</code> when you already have a list.</Body>
    </Section>
    <Section id="flush" title="Flush">
      <CodeBlock code={code.flush} language="PHP" />
      <Body>See <A href={php(base, "installation", "sending")}>When data is sent</A>.</Body>
    </Section>
  </>;
}

export function Push({ base }: PhpGuideProps) {
  return <>
    <Section id="how" title="How browser push works">
      <Body>A push subscription belongs to a browser, so the browser SDK creates it. Add <code>@pixlpush/web</code> to the pages your PHP renders. It needs no Firebase and no keys. It also tracks page views and sessions, and records notification clicks.</Body>
      <Body>Your project needs the <b>Website</b> platform, and your site needs HTTPS (<code>localhost</code> works for development).</Body>
    </Section>
    <Step id="script" number={1} title="Add the script to your layout">
      <CodeBlock code={code.browser} language="PHP" filename="layout.php" />
      <Body>This identifies logged-in users with the same id your server uses, and logs out the browser when no one is logged in.</Body>
    </Step>
    <Step id="worker" number={2} title="Serve the service worker from your site root">
      <Body>Browsers only accept a service worker from your own domain. Download it into your public folder so it is served at <code>/pixlpush-sw.js</code>:</Body>
      <CodeBlock code={code.worker} language="Shell" />
      <Expect>Opening <code>https://your-site/pixlpush-sw.js</code> shows the script, not a 404 or your HTML page.</Expect>
    </Step>
    <Step id="button" number={3} title="Add a button">
      <Body>Browsers only show the prompt after a click:</Body>
      <CodeBlock code={code.button} language="HTML" />
      <Expect>After <b>Allow</b>, a test from <b>Push Notifications → a template → Test send</b> arrives.</Expect>
    </Step>
    <Section id="more" title="More">
      <Body>Listeners, deep links, in-app notifications and browser support are the same as on any website: see the <A href={guideHref(base, "web", "push")}>Web Push guide</A>.</Body>
    </Section>
  </>;
}

export function Troubleshooting({ base }: PhpGuideProps) {
  return <>
    <Section id="problems" title="Symptoms and fixes">
      <Body>First turn on <code>debug</code> (or <code>strict</code> in a script) and check the PHP error log.</Body>
      <DataTable code={false} headers={["Symptom", "Cause", "Fix"]} rows={troubleshooting} minWidth={760} />
      <Body>Push problems: see <A href={guideHref(base, "web", "troubleshooting")}>Web troubleshooting</A>.</Body>
    </Section>
  </>;
}

export function Reference({ base }: PhpGuideProps) {
  return <>
    <Section id="methods" title="Methods">
      <Body><code>PixlPush\Client</code> in <code>{PACKAGE}</code> {SDK_VERSION}. <code>$userId</code> is always your own user id.</Body>
      <DataTable headers={["Method", "Returns", "What it does"]} rows={methods} minWidth={760} />
      <Body>Options: see <A href={php(base, "installation", "options")}>Configuration options</A>.</Body>
    </Section>
    <Section id="errors" title="Errors">
      <CodeBlock code={code.errors} language="PHP" />
      <Body><code>PixlPush\PixlPushException</code> has <code>errorCode</code>, <code>statusCode</code>, <code>isTransient</code> and <code>details</code>. The codes are the same as in the other SDKs.</Body>
      <DataTable headers={["Code", "Meaning", "Fix"]} rows={errorCodes} minWidth={760} />
    </Section>
  </>;
}

export const phpGuides: Record<string, ComponentType<PhpGuideProps>> = {
  "": Overview,
  quickstart: Quickstart,
  installation: Installation,
  laravel: Laravel,
  frameworks: Frameworks,
  identity: Identity,
  events: Events,
  push: Push,
  troubleshooting: Troubleshooting,
  reference: Reference,
};
