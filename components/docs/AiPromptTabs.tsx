"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import { Button, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import CodeBlock from "./CodeBlock";
import { aiPrompts, DOCS_ORIGIN } from "./ai-prompts";
import { guideHref } from "./registry";

/** Chat apps get a short message pointing at the prompt file, so the link never exceeds URL limits. */
const chatMessage = (platformId: string, label: string) =>
  `Read ${DOCS_ORIGIN}/ai-prompts/${platformId}.md and follow it to add PixlPush to my ${label} project. Start with step 0.`;

/**
 * Every SDK's setup prompt, one tab per stack, starting on the stack being read. Picking another
 * stack also moves the docs to that stack's AI agent setup page (sidebar, picker and breadcrumb
 * follow), keeping the scroll position. Copy and Download are in the code header.
 */
export default function AiPromptTabs({ initial, base, maxHeight = 460 }: { initial?: string; base?: string; maxHeight?: number }) {
  const fallback = aiPrompts.find((item) => item.platformId === initial)?.platformId ?? aiPrompts[0]?.platformId;
  const [selected, setSelected] = useState(fallback);
  const id = useId();
  const router = useRouter();
  const choose = (platformId: string) => {
    setSelected(platformId); // instant, before the page arrives
    if (base && platformId !== initial) router.push(guideHref(base, platformId, "ai-setup"), { scroll: false });
  };

  const current = aiPrompts.find((item) => item.platformId === selected) ?? aiPrompts[0];
  if (!current) return null;
  const message = encodeURIComponent(chatMessage(current.platformId, current.label));

  return <Stack gap={1.25}>
    <CodeBlock code={current.prompt} language="Markdown" filename={current.file} download={current.file} lineNumbers={false} maxHeight={maxHeight} wrap
      tabsLabel="SDK" tabs={aiPrompts.map((item) => ({ label: item.label, selected: item.platformId === current.platformId, onSelect: () => choose(item.platformId), id: `${id}-tab-${item.platformId}`, panelId: `${id}-panel` }))} />
    <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={1}>
      <Typography sx={{ color: tokens.textMuted, fontSize: "var(--fs-12)", mr: { sm: "auto" } }}>
        {current.packageName} {current.version} · paste into Claude Code, Codex, Cursor, Copilot or any coding agent at your project root.
      </Typography>
      <Stack direction="row" gap={1}>
        <Button size="small" variant="outlined" endIcon={<OpenInNewRounded fontSize="small" />} href={`https://claude.ai/new?q=${message}`} target="_blank" rel="noopener noreferrer">Open in Claude</Button>
        <Button size="small" variant="outlined" endIcon={<OpenInNewRounded fontSize="small" />} href={`https://chatgpt.com/?q=${message}`} target="_blank" rel="noopener noreferrer">Open in ChatGPT</Button>
      </Stack>
    </Stack>
  </Stack>;
}
