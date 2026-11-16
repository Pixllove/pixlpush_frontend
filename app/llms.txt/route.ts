import { aiPrompts, DOCS_ORIGIN } from "@/components/docs/ai-prompts";
import { availablePlatforms, guideHref } from "@/components/docs/registry";

// /llms.txt (llmstxt.org): an index of the developer docs for AI tools, generated from the docs registry.
export const dynamic = "force-static";

export function GET() {
  const body = [
    "# PixlPush",
    "",
    "> Customer engagement for apps and websites: product analytics, user identity, push notifications (FCM, APNs, Web Push), email, segments and journeys. SDKs for React Native, Flutter, Web, PHP and WordPress.",
    "",
    "## AI setup prompts",
    "",
    ...aiPrompts.map((item) => `- [${item.label} setup prompt](${DOCS_ORIGIN}/ai-prompts/${item.platformId}.md): ${item.packageName} ${item.version}`),
    ...availablePlatforms.flatMap((platform) => [
      "",
      `## ${platform.label}${platform.version ? ` (${platform.version})` : ""}`,
      "",
      ...(platform.guides ?? []).map((guide) => `- [${guide.title}](${DOCS_ORIGIN}${guideHref("/docs", platform.id, guide.slug)}): ${guide.description}`),
    ]),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
