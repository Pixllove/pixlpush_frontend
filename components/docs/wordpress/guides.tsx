import type { ComponentType, ReactNode } from "react";
import { Box } from "@mui/material";
import ApiRounded from "@mui/icons-material/ApiRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import NotificationsActiveOutlined from "@mui/icons-material/NotificationsActiveOutlined";
import ShoppingCartOutlined from "@mui/icons-material/ShoppingCartOutlined";
import CodeBlock from "../CodeBlock";
import { Body, Callout, Checklist, DataTable, Expect, LinkCard, List, Section, Step } from "../DocsPrimitives";
import { LinkBox } from "../links";
import { guideHref } from "../registry";
import { automaticEvents, code, PLUGIN_VERSION, settings, shortcodeAttributes, troubleshooting } from "./content";

export type WordPressGuideProps = { base: string };
const A = ({ href, children }: { href: string; children: ReactNode }) => <LinkBox href={href} sx={{ color: "inherit" }}>{children}</LinkBox>;
const wp = (base: string, slug = "", hash?: string) => guideHref(base, "wordpress", slug, hash);

export function Overview({ base }: WordPressGuideProps) {
  return <>
    <Callout tone="tip" title="Start here">
      <b>New site:</b> <A href={wp(base, "quickstart")}>Quickstart</A> (about 5 minutes, no code).<br />
      <b>Not on WordPress:</b> use the <A href={guideHref(base, "php")}>PHP SDK</A> or the <A href={guideHref(base, "web")}>web SDK</A>.
    </Callout>
    <Section id="what-it-does" title="What it does">
      <Body>The PixlPush plugin connects your WordPress site to PixlPush with no code. Paste an SDK key, add a subscribe button, and campaigns and journeys can reach your visitors by browser push and email.</Body>
      <DataTable code={false} headers={["Capability", "What happens automatically"]} rows={[
        ["Web Push", "No Firebase and no keys. Visitors who click your subscribe button and allow notifications can be reached even when your site is closed."],
        ["Identity", "Logged-in visitors are linked to their WordPress account (email, name and role) under a private PixlPush ID. Logins and logouts show on their profile; deleting a WordPress user marks them Deleted."],
        ["Events", "page_viewed and page_left (time on page) in the browser. Signups, profile updates and WooCommerce purchases from your server."],
        ["WooCommerce", "purchase_completed with amount, currency, items and coupon, once per order."],
        ["Attribution", "Notification clicks are recorded for their campaign or journey."],
      ]} />
      <Body>The plugin bundles the PixlPush <A href={guideHref(base, "web")}>web SDK</A> (as <code>window.PixlPush</code>) and the <A href={guideHref(base, "php")}>PHP SDK</A> (as <code>pixlpush_client()</code>), so you can add your own events with either.</Body>
    </Section>
    <Section id="automatic" title="Tracked automatically">
      <DataTable headers={["Event", "From", "When"]} rows={automaticEvents} minWidth={680} />
    </Section>
    <Section id="data" title="What the plugin sends">
      <DataTable code={false} headers={["From", "Contents"]} rows={[
        ["Browser", "A random browser ID, pages viewed, the push subscription once allowed, notification clicks, browser, OS, language and time zone. For logged-in users: their PixlPush user ID (a random cuid the plugin keeps in user meta, not the WordPress user ID), email and display name."],
        ["Your server", "On signup and profile updates: the PixlPush user ID, email, display name and role. When a user is deleted: their PixlPush user ID. With WooCommerce: order ID, total, currency, item count and coupon codes."],
      ]} />
      <Body>Mention PixlPush in your privacy policy as a processor of this data. Guest WooCommerce orders aren’t sent.</Body>
    </Section>
    <Section id="next" title="Where to go next">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <LinkCard href={wp(base, "quickstart")} icon={<BoltRounded />} title="Quickstart" description="Install, connect and send your first push." />
        <LinkCard href={wp(base, "subscribe-button")} icon={<NotificationsActiveOutlined />} title="Subscribe button" description="The shortcode, its options and styling." />
        <LinkCard href={wp(base, "events", "woocommerce")} icon={<ShoppingCartOutlined />} title="WooCommerce" description="Purchases, and journeys that react to them." />
        <LinkCard href={wp(base, "reference")} icon={<ApiRounded />} title="Reference" description="Shortcode, PHP and JavaScript." />
      </Box>
    </Section>
  </>;
}

export function Quickstart({ base }: WordPressGuideProps) {
  return <>
    <Step id="requirements" number={1} title="Requirements">
      <List items={[
        <>A PixlPush project with the <b>Website</b> platform (Project settings → Push / Firebase).</>,
        "WordPress 5.8+ and PHP 7.4+.",
        "HTTPS. Browsers only allow push on secure sites (localhost works for development).",
      ]} />
    </Step>
    <Step id="install" number={2} title="Install the plugin">
      <Body>In WordPress, go to <b>Plugins → Add New Plugin</b>, search for <b>PixlPush</b>, then <b>Install Now</b> and <b>Activate</b>. With a zip file, use <b>Upload Plugin</b> on the same screen instead.</Body>
    </Step>
    <Step id="key" number={3} title="Create an SDK key">
      <Body>In PixlPush, open <b>Project settings → SDK keys</b>, create a key named for the site (for example “WordPress production”) and copy it. It is shown once.</Body>
    </Step>
    <Step id="connect" number={4} title="Connect the site">
      <Body>In WordPress, open <b>Settings → PixlPush</b>, paste the key and save. If identity verification is on in PixlPush, paste its secret too.</Body>
      <Expect>Open your site in a new tab. A <code>page_viewed</code> event appears in PixlPush → Users within a few seconds.</Expect>
    </Step>
    <Step id="button" number={5} title="Add a subscribe button">
      <Body>Browsers only show the notification prompt after a click. Add a Shortcode block with this to a page, post, footer or widget:</Body>
      <CodeBlock code={code.shortcode} language="Text" lineNumbers={false} />
    </Step>
    <Step id="test" number={6} title="Send yourself a notification">
      <Body>Click the button and allow notifications. Then open <b>PixlPush → Push Notifications → a template → Test send</b>.</Body>
      <Expect>The notification arrives, even with the site closed. Clicking it opens your site and counts as a click on the template.</Expect>
    </Step>
    <Step id="checkpoint" number={7} title="Before going live">
      <Checklist items={[
        "Use a separate SDK key for staging and production sites.",
        <>Check <code>https://your-site/?pixlpush_sw=1</code> shows JavaScript, not a page (see <A href={wp(base, "troubleshooting", "service-worker")}>Troubleshooting</A>).</>,
        "Log in, log out and log in as someone else: each shows as the right user in PixlPush.",
        "Add PixlPush to your privacy policy.",
      ]} />
    </Step>
  </>;
}

export function Settings({ base }: WordPressGuideProps) {
  return <>
    <Section id="options" title="Settings → PixlPush">
      <DataTable code={false} headers={["Setting", "What it does"]} rows={settings} />
    </Section>
    <Section id="verification" title="Identity verification">
      <Body>With verification on in PixlPush (<b>Project settings → SDK keys → Identity verification</b>), visitors can only be identified with a hash made from your secret. Paste the secret in the plugin. It stays in your WordPress database, and only a per-user hash is printed into pages. After rotating the secret in PixlPush, paste the new one. To remove it, tick <b>Remove</b> and save.</Body>
      <Body>See <A href={wp(base, "identity")}>Identity</A>.</Body>
    </Section>
    <Section id="local" title="Testing against your own backend">
      <Body>Only for PixlPush development: point the plugin’s server calls at a local API. The browser bundle needs a local build of the plugin too.</Body>
      <CodeBlock code={code.localApi} language="PHP" filename="wp-config.php" />
    </Section>
  </>;
}

export function SubscribeButton() {
  return <>
    <Section id="shortcode" title="The shortcode">
      <CodeBlock code={code.shortcodeFull} language="Text" lineNumbers={false} wrap />
      <Body>The button asks for permission and subscribes. When notifications are allowed or blocked it shows that and disables itself. It hides itself where push isn’t supported (for example iPhone Safari before the site is on the Home Screen).</Body>
    </Section>
    <Section id="attributes" title="Attributes">
      <DataTable headers={["Attribute", "Default", "What it does"]} rows={shortcodeAttributes} />
    </Section>
    <Section id="own-button" title="Use your own button or menu item">
      <Body>Any element with the class <code>pixlpush-subscribe</code> works the same, including buttons from page builders and menu items (Appearance → Menus → CSS Classes):</Body>
      <CodeBlock code={code.ownButton} language="HTML" lineNumbers={false} />
      <Body>Add <code>data-on</code> and <code>data-denied</code> attributes to change the text after subscribing or blocking.</Body>
    </Section>
    <Section id="styling" title="Styling">
      <Body>The shortcode renders a <code>{'<button class="pixlpush-subscribe wp-element-button">'}</code>, so block themes style it like their other buttons. To change it:</Body>
      <CodeBlock code={code.css} language="CSS" />
    </Section>
  </>;
}

export function Events({ base }: WordPressGuideProps) {
  return <>
    <Section id="automatic" title="Tracked automatically">
      <DataTable headers={["Event", "From", "When"]} rows={automaticEvents} minWidth={680} />
      <Body>Use these as journey triggers and segment rules, for example a welcome journey on <code>signed_up</code>.</Body>
    </Section>
    <Section id="woocommerce" title="WooCommerce">
      <Body>With WooCommerce active, <code>purchase_completed</code> is sent when an order is paid, or marked completed, whichever comes first. The order is the event’s id, so it counts once. Only orders by logged-in customers are sent; guest checkouts have no WordPress user.</Body>
      <List items={[
        <>Revenue journeys: trigger on <code>purchase_completed</code>, filter on <code>amount</code> or <code>coupon</code>.</>,
        "Lapsed customers: a segment of users who did purchase_completed, but not in the last 60 days.",
      ]} />
    </Section>
    <Section id="custom-js" title="Your own events (JavaScript)">
      <Body>The web SDK is loaded on every page as <code>window.PixlPush</code>. Everything in the <A href={guideHref(base, "web", "reference")}>web SDK reference</A> works:</Body>
      <CodeBlock code={code.jsTrack} language="HTML" />
    </Section>
    <Section id="custom-php" title="Your own events (PHP)">
      <Body><code>pixlpush_client()</code> returns the bundled <A href={guideHref(base, "php", "reference")}>PHP SDK</A> client, or <code>null</code> when the plugin isn’t connected or server events are off. Name users with <code>pixlpush_user_id($wp_user_id)</code>, the same id the browser uses.</Body>
      <CodeBlock code={code.phpTrack} language="PHP" filename="functions.php" />
      <CodeBlock code={code.phpIdentify} language="PHP" />
    </Section>
  </>;
}

export function Identity({ base }: WordPressGuideProps) {
  return <>
    <Section id="logged-in" title="Logged-in users">
      <Body>Every visitor starts as an anonymous user. When someone is logged in, the plugin identifies the browser once per login with their PixlPush user ID, email and display name. That ID is a cuid (for example <code>cmw4tzovh05ivbpm0nt3r26vp</code>) the plugin creates for each WordPress user and keeps in user meta (<code>pixlpush_user_id</code>), so the WordPress numeric ID never leaves your site. Their earlier anonymous visits stay with them, and their profile shows “Logged in”. Server events use the same ID, so all of it is one user in PixlPush.</Body>
      <Body>Profile changes in WordPress (email, name, role) are sent from your server.</Body>
    </Section>
    <Section id="logout" title="Logout">
      <Body>When a visitor who was identified loads a page while logged out, the plugin calls <code>reset()</code>. The browser becomes a new anonymous user, so the next person on a shared computer doesn’t inherit the account. Their push subscription moves to the new anonymous user. The profile shows “Logged out”.</Body>
    </Section>
    <Section id="deleted" title="Deleted users">
      <Body>Deleting a WordPress user (Users → Delete, or an account-deletion plugin) marks them <strong>Deleted</strong> in PixlPush: every browser is unlinked, push and email stop, their history stays for reports. They stay in the Users list with status Deleted (filter: Deleted accounts). If they sign up again with the same email, the plugin gives them back the same PixlPush ID, and their profile and history are restored. This needs the identity verification secret in <A href={wp(base, "settings", "verification")}>Settings → PixlPush</A>: the request is signed, so the public SDK key alone can never delete anyone.</Body>
    </Section>
    <Section id="verification" title="Identity verification">
      <Body>Recommended for production. Without it, anyone who knows a user’s ID could claim to be them with your public SDK key, and deleted WordPress users can’t be marked deleted in PixlPush. Turn it on in PixlPush and paste the secret in <A href={wp(base, "settings", "verification")}>Settings → PixlPush</A>.</Body>
    </Section>
    <Section id="user-ids" title="With a mobile app in the same project">
      <Body>The plugin uses its own cuid per WordPress user. If your app uses another id for the same people (for example from your own API), they show as separate users. Use one PixlPush project per product, or have the app identify with the same ID: read it from the user meta <code>pixlpush_user_id</code> (for example through your REST API).</Body>
    </Section>
  </>;
}

export function Troubleshooting() {
  return <>
    <Section id="problems" title="Symptoms and fixes">
      <Body>First, turn on <b>Debug logging</b> in Settings → PixlPush. Then check the browser console, and <code>wp-content/debug.log</code> with <code>WP_DEBUG_LOG</code> on.</Body>
      <DataTable code={false} headers={["Symptom", "Cause", "Fix"]} rows={troubleshooting} minWidth={760} />
    </Section>
    <Section id="service-worker" title="Check the service worker">
      <Body>WordPress serves the service worker itself at <code>/?pixlpush_sw=1</code>, so no file or rewrite rule is needed. It must answer with JavaScript:</Body>
      <CodeBlock code={code.swCheck} language="Shell" />
      <Expect><code>Content-Type: application/javascript</code>, and the body starts with JavaScript, not <code>&lt;!DOCTYPE html&gt;</code>.</Expect>
      <Body>If you get HTML, a caching, security or maintenance plugin is answering first. Exclude URLs containing <code>pixlpush_sw</code> from it.</Body>
    </Section>
  </>;
}

export function Reference({ base }: WordPressGuideProps) {
  return <>
    <Section id="shortcode" title="Shortcode">
      <Body><code>[pixlpush_subscribe]</code> in plugin {PLUGIN_VERSION}:</Body>
      <DataTable headers={["Attribute", "Default", "What it does"]} rows={shortcodeAttributes} />
    </Section>
    <Section id="php" title="PHP">
      <DataTable headers={["Function", "Returns", "What it does"]} rows={[
        ["pixlpush_client()", "?PixlPush\\Client", "The PHP SDK client for this request, or null when not connected or server events are off."],
        ["pixlpush_user_id($user_id)", "string", "The PixlPush user id of a WordPress user (its ID as a string)."],
        ["pixlpush_settings()", "array", "The plugin’s settings."],
      ]} minWidth={680} />
      <Body>Client methods: see the <A href={guideHref(base, "php", "reference")}>PHP SDK reference</A>.</Body>
    </Section>
    <Section id="javascript" title="JavaScript">
      <Body><code>window.PixlPush</code> is the web SDK, already initialized. See the <A href={guideHref(base, "web", "reference")}>web SDK reference</A>. Don’t call <code>PixlPush.init()</code> again.</Body>
    </Section>
  </>;
}

export const wordpressGuides: Record<string, ComponentType<WordPressGuideProps>> = {
  "": Overview,
  quickstart: Quickstart,
  settings: Settings,
  "subscribe-button": SubscribeButton,
  identity: Identity,
  events: Events,
  troubleshooting: Troubleshooting,
  reference: Reference,
};
