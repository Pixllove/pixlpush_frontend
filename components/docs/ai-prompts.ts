// Every stack's AI setup prompt in one list (the AI prompt dialog, the AI agent setup pages and
// /ai-prompts/<stack>.md all read it). Nothing here is maintained by hand:
// - versions come from sdk-versions.json, refreshed from npm / pub.dev / Packagist / WordPress.org on
//   every build (scripts/sync-sdk-versions.mjs);
// - each prompt body is built from the same code snippets its guides render;
// - <api_reference> is generated from the same method and option tables as the API reference page,
//   so documenting a new SDK method or option adds it to the prompt too.
// tests/docs-ai-prompts.test.ts fails when a docs platform has no prompt.

import { platforms } from "./registry";
import * as reactNative from "./react-native/content";
import * as web from "./web/content";
import * as flutter from "./flutter/content";
import * as php from "./php/content";
import * as wordpress from "./wordpress/content";

/** Where the public docs live; links in a copied prompt must work outside this site. */
export const DOCS_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixlpush.vercel.app").replace(/\/$/, "");

export type AiPrompt = { platformId: string; label: string; packageName: string; version: string; file: string; prompt: string };

type Ref = { methods: string[]; options: string[] };
const names = (rows: readonly (readonly unknown[])[]) => rows.map((row) => String(row[0]));

const stacks: Record<string, { packageName: string; version: string; body: string; ref: Ref }> = {
  web: {
    packageName: web.PACKAGE,
    version: web.SDK_VERSION,
    body: web.aiPrompt,
    ref: { methods: Object.values(web.methods).flat().map(([name, returns]) => `${name} → ${returns}`), options: names(web.configOptions) },
  },
  "react-native": {
    packageName: "@pixlpush/react-native",
    version: reactNative.SDK_VERSION,
    body: reactNative.aiPrompt,
    ref: { methods: Object.values(reactNative.methods).flat().map((m) => `${m.signature || m.name} → ${m.returns}`), options: names(reactNative.configOptions) },
  },
  flutter: {
    packageName: "pixlpush",
    version: flutter.SDK_VERSION,
    body: flutter.aiPrompt,
    ref: { methods: Object.values(flutter.methods).flat().map(([name, returns]) => `${name} → ${returns}`), options: names(flutter.configOptions) },
  },
  php: {
    packageName: php.PACKAGE,
    version: php.SDK_VERSION,
    body: php.aiPrompt,
    ref: { methods: php.methods.map(([name, returns]) => `${name} → ${returns}`), options: names(php.configOptions) },
  },
  wordpress: {
    packageName: "pixlpush (WordPress plugin)",
    version: wordpress.PLUGIN_VERSION,
    body: wordpress.aiPrompt,
    ref: {
      methods: ["[pixlpush_subscribe] shortcode", "pixlpush_client() → PixlPush\\Client|null", "pixlpush_user_id($wpUserId) → string", "window.PixlPush (the web SDK) in the browser"],
      options: names(wordpress.shortcodeAttributes).map((name) => `shortcode ${name}`),
    },
  },
};

function finish(platformId: string, label: string, stack: (typeof stacks)[string]) {
  const docs = `${DOCS_ORIGIN}/docs/${platformId}`;
  return `${stack.body}

<api_reference>
Generated from the PixlPush ${label} docs for ${stack.packageName} ${stack.version}. Use only these; do not invent methods or options.
Methods:
${stack.ref.methods.map((line) => `- ${line}`).join("\n")}
${stack.ref.options.length ? `Options: ${stack.ref.options.join(", ")}` : ""}
</api_reference>

<source_of_truth>
- Full documentation: ${docs} (this prompt: ${DOCS_ORIGIN}/ai-prompts/${platformId}.md).
- If the installed package's README, CHANGELOG or type definitions differ from this prompt (a newer release), follow the installed package and say so under Open questions.
</source_of_truth>`;
}

/** In the order of the docs platform picker; only platforms that are available. */
export const aiPrompts: AiPrompt[] = platforms
  .filter((platform) => platform.status === "available" && stacks[platform.id])
  .map((platform) => {
    const stack = stacks[platform.id];
    return {
      platformId: platform.id,
      label: platform.label,
      packageName: stack.packageName,
      version: stack.version,
      file: `pixlpush-${platform.id}-setup-prompt.md`,
      prompt: finish(platform.id, platform.label, stack),
    };
  });

export const aiPromptFor = (platformId: string) => aiPrompts.find((item) => item.platformId === platformId);
