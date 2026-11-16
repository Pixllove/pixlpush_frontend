// WordPress plugin content. The version comes from sdk-versions.json, refreshed
// from WordPress.org on every build (scripts/sync-sdk-versions.mjs).

import versions from "../sdk-versions.json";
import { fence } from "../prompt-kit";

export const PLUGIN_VERSION = versions.wordpress;

export const code = {
  shortcode: `[pixlpush_subscribe]`,

  shortcodeFull: `[pixlpush_subscribe label="Get notified" subscribed_label="You're subscribed" denied_label="Blocked in your browser" class="my-button"]`,

  ownButton: `<a href="#" class="pixlpush-subscribe button">Turn on notifications</a>`,

  css: `/* Appearance → Customize → Additional CSS */
.pixlpush-subscribe {
  background: #111;
  color: #fff;
  border-radius: 999px;
  padding: 10px 20px;
}
.pixlpush-subscribe[disabled] { opacity: .6; cursor: default; }`,

  jsTrack: `<script>
  // window.PixlPush is the PixlPush web SDK, loaded on every page.
  document.querySelector('#signup-form')?.addEventListener('submit', () => {
    PixlPush.track('newsletter_form_submitted', { form: 'footer' });
  });
</script>`,

  phpTrack: `// functions.php or your own plugin
add_action('learndash_course_completed', function ($data) {
    if ($pixlpush = pixlpush_client()) {
        // pixlpush_user_id(): the user's PixlPush id (a cuid kept in user meta), as the browser uses.
        $pixlpush->track(pixlpush_user_id($data['user']->ID), 'course_completed', [
            'course' => get_the_title($data['course']->ID),
        ]);
    }
});`,

  phpIdentify: `if ($pixlpush = pixlpush_client()) {
    $pixlpush->updateUser(pixlpush_user_id($user_id), [
        'userType' => 'premium',
        'properties' => ['membership' => 'gold'],
    ]);
}`,

  localApi: `// wp-config.php: only for testing against your own PixlPush backend
define('PIXLPUSH_API_URL', 'http://localhost:4000');`,

  swCheck: `curl -i "https://your-site.com/?pixlpush_sw=1"`,
};

export const settings = [
  ["SDK key", "Required. The project's SDK key (pp_sk_…) from Project settings → SDK keys."],
  ["Project ID", "Optional. If set, PixlPush checks the key belongs to this project."],
  ["Identity verification secret", "Required when identity verification is on in PixlPush. Stays on your server; only a per-user hash reaches the browser. Never shown again after saving."],
  ["Notification icon URL", "Icon on notifications. Defaults to the site icon (Appearance → Customize → Site Identity)."],
  ["Identify logged-in users", "On by default. Links visitors to their WordPress account, and logs them out of PixlPush when they log out."],
  ["Track page views", "On by default. page_viewed on every page, page_left with the time it was on screen."],
  ["Track account and order events", "On by default. signed_up, profile updates, deleted users (needs the identity secret) and WooCommerce purchases, sent from your server."],
  ["Debug logging", "Logs SDK calls in the browser console and the PHP error log."],
];

export const automaticEvents = [
  ["page_viewed", "Browser", "Every page: path, url, title, referrer."],
  ["page_left", "Browser", "Leaving a page (next page or closing the tab): path, url, title, duration_ms (time it was visible)."],
  ["signed_up", "Server", "A WordPress account is created. Properties: method."],
  ["purchase_completed", "Server (WooCommerce)", "An order is paid or completed, once per order (its event id is a cuid saved on the order). Properties: order_id, amount, currency, items, coupon."],
];

export const shortcodeAttributes = [
  ["label", "Turn on notifications", "Button text before subscribing."],
  ["subscribed_label", "Notifications are on", "Text once notifications are allowed (the button is disabled)."],
  ["denied_label", "Notifications are blocked in your browser settings", "Text when the visitor blocked notifications."],
  ["class", "—", "Extra CSS classes for your theme."],
];

export const troubleshooting = [
  ["No prompt when clicking the button", "Notifications were blocked or already allowed, or the browser doesn't support push (iOS before adding to the Home Screen).", "Check the browser's site settings. On iPhone, add the site to the Home Screen first."],
  ["Service worker fails to register", "Something answers /?pixlpush_sw=1 with HTML instead of JavaScript: a maintenance or coming-soon mode, a security plugin, or a cached page.", "Open /?pixlpush_sw=1: it must be JavaScript. Exclude that URL from caching and maintenance plugins."],
  ["Logged-in users stay anonymous", "Identify logged-in users is off, or a cached page was served to them.", "Turn the setting on; make sure your cache skips logged-in users (the default in caching plugins)."],
  ["IDENTITY_VERIFICATION_FAILED in the console", "Identity verification is on in PixlPush, but the plugin has no secret, or the secret is wrong.", "Paste the current secret in Settings → PixlPush. After rotating it, save it again."],
  ["No WooCommerce purchases", "Guest checkout (no WordPress user), or Track account and order events is off.", "Purchases are tracked for logged-in customers. Check the setting."],
  ["Nothing reaches PixlPush from the server", "Your host blocks outbound HTTPS from PHP.", "Turn on Debug logging and check wp-content/debug.log (WP_DEBUG_LOG)."],
  ["Push works on desktop, not on the phone", "Mobile Safari needs the site on the Home Screen; some Android browsers block notifications.", "Test in Chrome on Android, or install the site on iOS 16.4+."],
];

/** Setup prompt for coding agents. Built from the same snippets and settings the guides render. */
export const aiPrompt = `You are a senior WordPress engineer. Add PixlPush (WordPress plugin "pixlpush" ${PLUGIN_VERSION}) to this site: web push, page views, identity for logged-in users, and the site's own custom events. Work like a careful reviewer is watching: small, focused changes that match the existing theme or plugin code.

<goal>
When you are done, the PixlPush plugin is installed and active, a "Turn on notifications" button is placed where it fits the site, custom actions that matter for the business are tracked, and the service worker check below passes.
</goal>

<plugin_facts>
- The plugin loads the PixlPush web SDK on every page, serves the service worker at /?pixlpush_sw=1, identifies logged-in users and logs them out of PixlPush on logout.
- It already tracks these events; never add them yourself:
${automaticEvents.map(([name, where, what]) => `  - ${name} (${where}): ${what}`).join("\n")}
- Settings live in Settings → PixlPush (wp-admin). They are entered by a person, not by code.
- Server helpers: pixlpush_client() returns the configured PHP client (null when not configured); pixlpush_user_id($wpUserId) returns that user's PixlPush id.
</plugin_facts>

<rules>
1. Use ONLY the plugin, shortcode, helpers and methods in this prompt and its api_reference. Do not invent hooks or options.
2. Put custom code in the child theme's functions.php or a small site plugin (mu-plugin), never in the PixlPush plugin or a parent theme.
3. Always guard server calls: if ($pixlpush = pixlpush_client()) { … } so the site works while PixlPush is not configured.
4. Privacy: never send passwords, tokens, payment details or other sensitive values as properties.
5. Scope: do not change unrelated templates, plugins or caching rules beyond the service-worker exclusion below.
6. Uncertainty: if something conflicts with these steps (multisite, headless WordPress, a page builder without shortcodes), stop and ask one concise question instead of guessing.
</rules>

<workflow>
Step 0 — Inspect, then plan. Before editing, report in a short list:
- WordPress version, active theme (child theme or not), WooCommerce or membership/LMS plugins
- caching, security or maintenance plugins (they can block the service worker)
- where a notifications button fits (header, footer, account page)
- custom actions worth tracking (forms, courses, bookings, downloads)
- the files you intend to create or change
Then proceed.

Step 1 — Install and activate (WP-CLI if available; otherwise tell me to use Plugins → Add New → "PixlPush"):
${fence("sh", "wp plugin install pixlpush --activate")}

Step 2 — The button. Place the shortcode in a template, block or widget:
${fence("text", code.shortcodeFull)}
Or turn an existing link or button into one:
${fence("html", code.ownButton)}

Step 3 — Custom events from the server (child theme or site plugin):
${fence("php", code.phpTrack)}
Extra user fields:
${fence("php", code.phpIdentify)}
From the browser:
${fence("html", code.jsTrack)}

Step 4 — Service worker. If a caching, security or maintenance plugin is active, exclude /?pixlpush_sw=1 from it. Then check it returns JavaScript (not HTML):
${fence("sh", code.swCheck)}
</workflow>

<acceptance_criteria>
- The plugin is active and the button renders on the chosen pages.
- Custom events use snake_case names, are guarded with pixlpush_client(), and do not duplicate the automatic ones.
- /?pixlpush_sw=1 returns JavaScript with HTTP 200.
- No changes to the PixlPush plugin files, no sensitive properties, no unrelated changes.
</acceptance_criteria>

<manual_steps>
Do not attempt these. List them for me at the end:
1. Settings → PixlPush: paste the SDK key (and the identity verification secret if it is on in PixlPush).
2. PixlPush → Project settings → Push setup: choose Website.
3. Visit the site, click the button, allow notifications and send a test push.
</manual_steps>

<final_report>
End with: 1. Summary (two sentences). 2. Files changed (one line each). 3. Events tracked (name, where, properties). 4. Manual steps. 5. Open questions.
</final_report>`;
