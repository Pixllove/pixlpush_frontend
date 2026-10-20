"use client";

import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import InsertDriveFileOutlined from "@mui/icons-material/InsertDriveFileOutlined";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import { srOnly } from "./DocsPrimitives";
import { personalize, useDocsProject } from "./DocsProject";

// The code surface palette, tuned for tokens.plum. Every foreground is ≥ 4.5:1 on the background.
export const syntax = {
  bg: tokens.plum, header: "#160C1F", line: tokens.plumLine,
  text: "#EDE7F5", muted: "#A898BE", comment: "#9A8AB0", punctuation: "#B4A7C8",
  keyword: "#D6BEFF", string: "#A9E5C2", number: "#FFC59C", fn: "#8FCBFF", type: "#FFD88A", property: "#F3B5DC",
  gutter: "#6F5F86", highlight: "rgba(205,182,255,.09)", accent: "#CDB6FF",
};

/** Thin themed scrollbars for anything that scrolls on the code surface. */
export const codeScrollbar = {
  // Hidden until the code is hovered or focused; still scrollable by touch, trackpad and keyboard.
  scrollbarWidth: "thin", scrollbarColor: "transparent transparent",
  "&:hover, &:focus-visible": { scrollbarColor: `${syntax.line} transparent` },
  "&::-webkit-scrollbar": { width: 10, height: 10 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "transparent", borderRadius: 999, border: `3px solid ${syntax.bg}` },
  "&:hover::-webkit-scrollbar-thumb, &:focus-visible::-webkit-scrollbar-thumb": { background: syntax.line },
  "&::-webkit-scrollbar-thumb:hover": { background: "#5A4675" },
  "&::-webkit-scrollbar-corner": { background: "transparent" },
} as const;

const PROSE = new Set(["Shell", "Environment", "Text"]);
const HASH_COMMENTS = new Set(["Shell", "Environment", "Ruby", "Text"]);
const KEYWORDS = new Set("import from export default await async const let var function return new type interface if else true false null undefined class func extends implements as of in typeof void def end do target apply plugins dependencies buildscript".split(" "));

type Kind = "comment" | "string" | "number" | "keyword" | "fn" | "type" | "property" | "punctuation";
export type Token = [kind: Kind | null, text: string];

/** A small, predictable highlighter: enough for TS/JS/JSON/Gradle/Swift/Ruby/shell snippets. */
export function tokenize(line: string, language: string): Token[] {
  const out: Token[] = [];
  const hash = HASH_COMMENTS.has(language);
  const prose = PROSE.has(language);
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    let m: RegExpMatchArray | null = null;
    let kind: Kind | null = null;
    if ((m = rest.match(/^\/\/.*/)) || (hash && (m = rest.match(/^#.*/))) || (m = rest.match(/^\/\*.*?(?:\*\/|$)/))) kind = "comment";
    else if ((m = rest.match(/^"(?:[^"\\]|\\.)*"?|^'(?:[^'\\]|\\.)*'?|^`(?:[^`\\]|\\.)*`?/))) {
      // A quoted key followed by ":" (JSON) reads as a property.
      kind = !prose && /^\s*:/.test(rest.slice(m[0].length)) ? "property" : "string";
    } else if (prose) m = rest.match(/^[^#"'/]+/) ?? rest.match(/^./);
    else if ((m = rest.match(/^\d[\d_.]*\b/))) kind = "number";
    else if ((m = rest.match(/^[A-Za-z_$][\w$]*/))) {
      const after = rest.slice(m[0].length);
      kind = KEYWORDS.has(m[0]) ? "keyword" : /^\s*\(/.test(after) ? "fn" : /^\s*\??:(?!:)/.test(after) ? "property" : /^[A-Z]/.test(m[0]) ? "type" : null;
    } else if ((m = rest.match(/^[{}()[\];,.<>=!?:+\-*/&|]+/))) kind = "punctuation";
    else m = rest.match(/^./);
    const part = m?.[0] || rest[0];
    out.push([kind, part]);
    i += part.length;
  }
  return out;
}

export type CodeTab = { label: string; selected: boolean; onSelect: () => void; id: string; panelId: string };

function HeaderTabs({ tabs, label }: { tabs: CodeTab[]; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (event: KeyboardEvent, index: number) => {
    const next = event.key === "ArrowRight" ? index + 1 : event.key === "ArrowLeft" ? index - 1 : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    const target = (next + tabs.length) % tabs.length;
    tabs[target].onSelect();
    refs.current[target]?.focus();
  };
  return <Stack role="tablist" aria-label={label} direction="row" sx={{ alignSelf: "stretch", minWidth: 0, overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
    {tabs.map((tab, index) => <ButtonBase key={tab.label} ref={(el) => { refs.current[index] = el; }} role="tab" id={tab.id} aria-selected={tab.selected} aria-controls={tab.panelId} tabIndex={tab.selected ? 0 : -1}
      onClick={tab.onSelect} onKeyDown={(event) => onKey(event, index)}
      sx={{ position: "relative", flexShrink: 0, px: 1.5, minHeight: 44, color: tab.selected ? syntax.text : syntax.muted, fontFamily: "inherit", fontSize: "var(--fs-13)", fontWeight: tab.selected ? 600 : 500, whiteSpace: "nowrap", transition: "color var(--pp-ease)", "&:hover": { color: syntax.text },
        "&::after": { content: '""', position: "absolute", left: 12, right: 12, bottom: 0, height: 2, borderRadius: 2, bgcolor: tab.selected ? syntax.accent : "transparent", transition: "background-color var(--pp-ease)" },
        "&:focus-visible": { outline: `2px solid ${syntax.accent}`, outlineOffset: -4, borderRadius: 1 } }}>{tab.label}</ButtonBase>)}
  </Stack>;
}

export default function CodeBlock({ code, language = "TypeScript", filename, highlight = [], lineNumbers, tabs, tabsLabel = "Variants", maxHeight, wrap = false, download }: {
  code: string; language?: string; filename?: string; highlight?: number[]; lineNumbers?: boolean;
  tabs?: CodeTab[]; tabsLabel?: string; maxHeight?: number; wrap?: boolean; /** File name; shows a Download button that saves the code as this file. */ download?: string;
}) {
  const { projectId } = useDocsProject();
  const text = personalize(code, projectId);
  const lines = text.split("\n");
  const numbered = lineNumbers ?? lines.length > 4;
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setState("copied"); }
    catch { setState("error"); }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };

  const save = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download });
    link.click();
    URL.revokeObjectURL(url);
  };

  const label = filename ?? language;
  const isCommand = language === "Shell";
  const selectedTab = tabs?.find((tab) => tab.selected);
  const icon = isCommand ? <TerminalRounded sx={{ fontSize: 15, color: syntax.muted }} /> : <InsertDriveFileOutlined sx={{ fontSize: 15, color: syntax.muted }} />;
  let title: ReactNode = null;
  if (tabs) title = <HeaderTabs tabs={tabs} label={tabsLabel} />;
  else if (filename || isCommand) title = <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
    {icon}
    <Typography noWrap title={filename} sx={{ color: filename ? syntax.text : syntax.muted, fontFamily: filename ? "var(--pp-mono)" : undefined, fontSize: "var(--fs-12)" }}>{filename ?? "Terminal"}</Typography>
  </Stack>;

  return <Box component="figure" sx={{ position: "relative", m: 0, minWidth: 0, borderRadius: 2, overflow: "hidden", bgcolor: syntax.bg, border: `1px solid ${syntax.line}` }}>
    <Stack component="figcaption" direction="row" alignItems="center" gap={1.25} sx={{ minHeight: 44, pl: tabs ? .5 : 2, pr: .75, bgcolor: syntax.header, borderBottom: `1px solid ${syntax.line}` }}>
      <Box sx={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", alignSelf: "stretch" }}>{title}</Box>
      <Typography component="span" sx={{ flexShrink: 0, display: { xs: tabs ? "none" : "inline", sm: "inline" }, px: .75, borderRadius: 1, border: `1px solid ${syntax.line}`, color: syntax.muted, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-11)", lineHeight: 1.7 }}>{language}</Typography>
      {download && <ButtonBase onClick={save} aria-label={`Download ${download}`}
        sx={{ flexShrink: 0, gap: .75, minWidth: { xs: 44, sm: 104 }, height: { xs: 44, sm: 32 }, px: 1.25, borderRadius: 1.5, color: syntax.muted, fontFamily: "inherit", fontSize: "var(--fs-12)", fontWeight: 500, transition: "background-color var(--pp-ease), color var(--pp-ease)", "&:hover": { bgcolor: "rgba(255,255,255,.06)", color: syntax.text }, "&:focus-visible": { outline: `2px solid ${syntax.accent}`, outlineOffset: -2 } }}>
        <FileDownloadOutlined sx={{ fontSize: 16 }} />
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Download</Box>
      </ButtonBase>}
      <ButtonBase onClick={copy} aria-label={`Copy ${selectedTab ? `${selectedTab.label} ` : ""}${label}`}
        sx={{ flexShrink: 0, gap: .75, minWidth: { xs: 44, sm: 84 }, height: { xs: 44, sm: 32 }, px: 1.25, borderRadius: 1.5, color: state === "copied" ? syntax.string : state === "error" ? "#FFB4AB" : syntax.muted, fontFamily: "inherit", fontSize: "var(--fs-12)", fontWeight: 500, transition: "background-color var(--pp-ease), color var(--pp-ease)", "&:hover": { bgcolor: "rgba(255,255,255,.06)", color: state === "idle" ? syntax.text : undefined }, "&:focus-visible": { outline: `2px solid ${syntax.accent}`, outlineOffset: -2 } }}>
        {state === "copied" ? <CheckRounded sx={{ fontSize: 16 }} /> : state === "error" ? <ErrorOutlineRounded sx={{ fontSize: 16 }} /> : <ContentCopyRounded sx={{ fontSize: 15 }} />}
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>{state === "copied" ? "Copied" : state === "error" ? "Failed" : "Copy"}</Box>
      </ButtonBase>
      <Box component="span" role="status" aria-live="polite" sx={srOnly}>{state === "copied" ? "Copied to clipboard" : state === "error" ? "Copy failed. Select the code and copy it manually." : ""}</Box>
    </Stack>
    <Box component="pre" tabIndex={0} role={tabs ? "tabpanel" : undefined} id={selectedTab?.panelId} aria-labelledby={selectedTab?.id} aria-label={tabs ? undefined : `${label} code`}
      sx={{ m: 0, py: 2, overflow: "auto", maxHeight, color: syntax.text, fontFamily: "var(--pp-mono)", fontSize: { xs: "var(--fs-12)", md: "var(--fs-13)" }, lineHeight: 1.75, whiteSpace: wrap ? "pre-wrap" : "pre", overflowWrap: wrap ? "anywhere" : undefined, tabSize: 2, fontVariantLigatures: "none", ...codeScrollbar, "&:focus-visible": { outline: `2px solid ${syntax.accent}`, outlineOffset: -2 } }}>
      <Box component="code" sx={{ display: "block", minWidth: wrap ? 0 : "max-content", fontFamily: "inherit" }}>
        {lines.map((line, index) => {
          const marked = highlight.includes(index + 1);
          return <Box component="span" key={index} sx={{ display: "block", pl: numbered ? 0 : 2.25, pr: 3, bgcolor: marked ? syntax.highlight : "transparent", boxShadow: marked ? `inset 2px 0 ${syntax.accent}` : "none" }}>
            {numbered && <Box component="span" aria-hidden="true" sx={{ display: "inline-block", width: 44, pr: 2, textAlign: "right", color: marked ? syntax.muted : syntax.gutter, userSelect: "none" }}>{index + 1}</Box>}
            {isCommand && line && !line.startsWith("#") && <Box component="span" aria-hidden="true" sx={{ color: syntax.gutter, userSelect: "none" }}>$ </Box>}
            {line ? tokenize(line, language).map(([kind, part], i) => kind ? <span key={i} style={{ color: syntax[kind] }}>{part}</span> : part) : " "}
          </Box>;
        })}
      </Box>
    </Box>
  </Box>;
}
