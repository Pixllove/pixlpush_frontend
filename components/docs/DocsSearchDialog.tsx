"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ArticleOutlined from "@mui/icons-material/ArticleOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SubdirectoryArrowRightRounded from "@mui/icons-material/SubdirectoryArrowRightRounded";
import { Box, Chip, Dialog, InputBase, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import { lightScrollbar, srOnly } from "./DocsPrimitives";
import type { SearchEntry } from "./registry";

const suggestions = ["configure", "SDK keys", "google-services.json", "reset", "syncPushToken", "SDK_KEY_INVALID"];

/** Every term must match somewhere; titles that start with the query rank first. Exported for tests. */
export function searchDocs(entries: SearchEntry[], query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return entries.filter((entry) => !entry.id.includes("#"));
  return entries
    .map((entry) => {
      const label = entry.label.toLowerCase();
      const haystack = `${label} ${entry.hint} ${entry.keywords} ${entry.group}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) return null;
      const score = terms.reduce((total, term) => total + (label.startsWith(term) ? 6 : label.includes(term) ? 4 : entry.keywords.toLowerCase().includes(term) ? 2 : 1), 0) + (entry.id.includes("#") ? 0 : 1); // pages edge out their own sections
      return { entry, score };
    })
    .filter((item): item is { entry: SearchEntry; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((item) => item.entry);
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const term = terms.find((t) => text.toLowerCase().includes(t));
  if (!term) return <>{text}</>;
  const at = text.toLowerCase().indexOf(term);
  return <>{text.slice(0, at)}<Box component="mark" sx={{ bgcolor: "transparent", color: tokens.accent, fontWeight: 600 }}>{text.slice(at, at + term.length)}</Box>{text.slice(at + term.length)}</>;
}

const Kbd = ({ children }: { children: React.ReactNode }) => <Box component="kbd" sx={{ display: "inline-grid", placeItems: "center", minWidth: 20, height: 20, px: .5, border: `1px solid ${tokens.border}`, borderRadius: 1, bgcolor: tokens.surface, color: tokens.textSecondary, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-11)" }}>{children}</Box>;

export default function DocsSearchDialog({ items, open, onClose, onNavigate }: { items: SearchEntry[]; open: boolean; onClose: () => void; onNavigate: (href: string) => void }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setQuery(input); setActive(0); }, 120); return () => window.clearTimeout(timer); }, [input]);
  useEffect(() => { if (open) { setInput(""); setQuery(""); setActive(0); } }, [open]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" }); }, [active]);

  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => searchDocs(items, query), [items, query]);
  const select = (href: string) => { onClose(); onNavigate(href); };
  const move = (delta: number) => setActive((value) => (value + delta + results.length) % Math.max(results.length, 1));

  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-label="Search documentation" TransitionProps={{ onEntered: () => inputRef.current?.focus() }}
    PaperProps={{ sx: { mt: { xs: 1.5, sm: "12vh" }, mx: { xs: 1.5, sm: 4 }, width: { xs: "calc(100% - 24px)", sm: undefined }, alignSelf: "flex-start", overflow: "hidden", borderRadius: "var(--pp-r-overlay)" } }}>
    <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2, height: 56, borderBottom: `1px solid ${tokens.border}` }}>
      <SearchRounded sx={{ color: tokens.textMuted, fontSize: 20 }} />
      <InputBase
        inputRef={inputRef}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
          if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
          if (event.key === "Enter") { event.preventDefault(); const target = input === query ? results[active] : searchDocs(items, input)[0]; if (target) select(target.id); }
        }}
        placeholder="Search methods, options, errors, Firebase files"
        fullWidth
        inputProps={{ role: "combobox", "aria-label": "Search documentation", "aria-expanded": true, "aria-autocomplete": "list", "aria-controls": "docs-search-results", "aria-activedescendant": results[active] ? `docs-result-${active}` : undefined, autoComplete: "off", spellCheck: false }}
        sx={{ fontSize: "var(--fs-16)", color: tokens.text }}
      />
      <Box sx={{ display: { xs: "none", sm: "block" } }}><Kbd>esc</Kbd></Box>
    </Stack>

    <Box component="span" role="status" aria-live="polite" sx={srOnly}>{query ? `${results.length} results` : ""}</Box>

    <Box id="docs-search-results" ref={listRef} role="listbox" aria-label="Results" sx={{ maxHeight: { xs: "60vh", sm: 420 }, overflowY: "auto", p: 1, ...lightScrollbar }}>
      {results.map((item, index) => {
        const isPage = !item.id.includes("#");
        const header = item.group !== results[index - 1]?.group && <Typography role="presentation" sx={{ px: 1.5, pt: index ? 1.5 : .75, pb: .75, color: tokens.textMuted, fontSize: "var(--fs-11)", fontWeight: 600, letterSpacing: "var(--ls-overline)", textTransform: "uppercase" }}>{item.group}</Typography>;
        const current = index === active;
        return <Fragment key={item.id}>
          {header}
          <Stack id={`docs-result-${index}`} data-index={index} role="option" aria-selected={current} direction="row" alignItems="center" gap={1.5} onClick={() => select(item.id)} onMouseMove={() => setActive(index)}
            sx={{ px: 1.5, py: 1, minHeight: 48, borderRadius: 1.5, cursor: "pointer", bgcolor: current ? tokens.accentSoft : "transparent" }}>
            <Box sx={{ flexShrink: 0, display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 1.5, border: `1px solid ${current ? tokens.accentLine : tokens.border}`, bgcolor: tokens.surface, color: current ? tokens.accent : tokens.textMuted }}>
              {isPage ? <ArticleOutlined sx={{ fontSize: 16 }} /> : <SubdirectoryArrowRightRounded sx={{ fontSize: 16 }} />}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: "var(--fs-14)", fontWeight: 500, color: tokens.text }}><Highlight text={item.label} terms={terms} /></Typography>
              <Typography noWrap sx={{ fontSize: "var(--fs-12)", color: tokens.textSecondary }}>{item.hint}</Typography>
            </Box>
            {current && <Box aria-hidden="true" sx={{ display: { xs: "none", sm: "block" } }}><Kbd>↵</Kbd></Box>}
          </Stack>
        </Fragment>;
      })}
      {!results.length && <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
        <Typography sx={{ fontSize: "var(--fs-14)", fontWeight: 600, color: tokens.text }}>No results for “{query}”</Typography>
        <Typography sx={{ mt: .5, fontSize: "var(--fs-13)", color: tokens.textSecondary }}>Try one of these:</Typography>
        <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 1.5 }}>{suggestions.map((term) => <Chip key={term} label={term} onClick={() => { setInput(term); inputRef.current?.focus(); }} />)}</Stack>
      </Box>}
    </Box>

    <Stack direction="row" gap={2} sx={{ display: { xs: "none", sm: "flex" }, px: 2, py: 1.25, borderTop: `1px solid ${tokens.border}`, bgcolor: tokens.canvas, color: tokens.textMuted, fontSize: "var(--fs-12)" }}>
      <Stack direction="row" gap={.5} alignItems="center"><Kbd>↑</Kbd><Kbd>↓</Kbd> to navigate</Stack>
      <Stack direction="row" gap={.5} alignItems="center"><Kbd>↵</Kbd> to open</Stack>
      <Stack direction="row" gap={.5} alignItems="center"><Kbd>esc</Kbd> to close</Stack>
    </Stack>
  </Dialog>;
}
