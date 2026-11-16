import { aiPromptFor, aiPrompts } from "@/components/docs/ai-prompts";

// /ai-prompts/<stack>.md: each SDK's setup prompt as plain Markdown, for coding agents and
// "Open in Claude / ChatGPT". Built at build time from the same source as the docs.
export const dynamic = "force-static";

export function generateStaticParams() {
  return aiPrompts.map((item) => ({ file: `${item.platformId}.md` }));
}

export function GET(_request: Request, { params }: { params: { file: string } }) {
  const { file } = params;
  const prompt = file.endsWith(".md") ? aiPromptFor(file.slice(0, -3)) : undefined;
  if (!prompt) return new Response("Not found", { status: 404 });
  return new Response(prompt.prompt, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
