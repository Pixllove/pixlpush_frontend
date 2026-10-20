"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import CloseRounded from "@mui/icons-material/CloseRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { Box, Button, Drawer, IconButton, ListSubheader, MenuItem, Select, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import DocsSearchDialog from "./DocsSearchDialog";
import { hiddenScrollbar } from "./DocsPrimitives";
import { availablePlatforms, buildSearchIndex, guideHref, platforms } from "./registry";

const BAR = 56;

// "site": below the sticky marketing header (68px, 82px from md, +1px border).
// "app": below the dashboard top bar (76px, 64px at ≤760px).
const topVar = {
  site: { "--docs-top": { xs: "69px", md: "83px" } },
  app: { "--docs-top": "76px", "@media (max-width: 760px)": { "--docs-top": "64px" } },
};

function PlatformSelect({ base, current }: { base: string; current: string }) {
  const router = useRouter();
  return <Select value={current} onChange={(event) => router.push(guideHref(base, String(event.target.value)))} inputProps={{ "aria-label": "Platform" }} className="compact" sx={{ minWidth: 168 }}
    renderValue={(value) => platforms.find((platform) => platform.id === value)?.label}>
    <ListSubheader>Available</ListSubheader>
    {availablePlatforms.map((platform) => <MenuItem key={platform.id} value={platform.id}>{platform.label}<Box component="span" sx={{ ml: "auto", pl: 2, color: tokens.textMuted, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-11)" }}>v{platform.version}</Box></MenuItem>)}
    <ListSubheader>Coming soon</ListSubheader>
    {platforms.filter((platform) => platform.status === "coming-soon").map((platform) => <MenuItem key={platform.id} value={platform.id} disabled>{platform.label}</MenuItem>)}
  </Select>;
}

function GuideNav({ base, platformId, pathname, onNavigate }: { base: string; platformId: string; pathname: string; onNavigate?: () => void }) {
  const platform = availablePlatforms.find((item) => item.id === platformId) ?? availablePlatforms[0];
  return <Box component="nav" aria-label={`${platform.label} documentation`}>
    {platform.groups?.map((group) => <Box key={group} sx={{ mb: 2.5 }}>
      <Typography component="h2" sx={{ px: 1.25, mb: .75, color: tokens.textMuted, fontSize: "var(--fs-11)", fontWeight: 600, letterSpacing: "var(--ls-overline)", textTransform: "uppercase" }}>{group}</Typography>
      <Stack component="ul" gap={.25} sx={{ m: 0, p: 0, listStyle: "none" }}>
        {platform.guides?.filter((guide) => guide.group === group && (guide.slug !== "ai-setup" || pathname === guideHref(base, platform.id, guide.slug))).map((guide) => {
          const href = guideHref(base, platform.id, guide.slug);
          const current = pathname === href;
          return <li key={guide.slug}><Box component={NextLink} href={href} onClick={onNavigate} aria-current={current ? "page" : undefined}
            sx={{ position: "relative", display: "flex", alignItems: "center", minHeight: { xs: 44, lg: 34 }, px: 1.25, borderRadius: 1.5, color: current ? tokens.accent : tokens.textSecondary, bgcolor: current ? tokens.accentSoft : "transparent", fontSize: "var(--fs-14)", fontWeight: current ? 600 : 400, textDecoration: "none", transition: "background-color var(--pp-ease), color var(--pp-ease)", "&:hover": { color: current ? tokens.accent : tokens.text, bgcolor: current ? tokens.accentSoft : tokens.subtle }, "&:focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: -2 } }}>{guide.title}</Box></li>;
        })}
      </Stack>
    </Box>)}
  </Box>;
}

export default function DocsLayout({ base, variant, children }: { base: string; variant: "site" | "app"; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const index = useMemo(() => buildSearchIndex(base), [base]);
  const platformId = availablePlatforms.find((platform) => pathname.startsWith(`${base}/${platform.id}`))?.id ?? availablePlatforms[0].id;

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setShortcut("⌘K");
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((open) => !open); }
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSearch = () => { setDrawerOpen(false); setSearchOpen(true); };

  return <Box sx={{ ...topVar[variant], "--docs-offset": `calc(var(--docs-top) + ${BAR + 24}px)`, bgcolor: tokens.surface, color: tokens.text, ...(variant === "app" ? { border: `1px solid ${tokens.border}`, borderRadius: 2 } : {}) }}>
    {variant === "site" && <Box component="a" href="#docs-content" sx={{ position: "absolute", left: 16, top: -60, zIndex: 20, px: 2, py: 1, bgcolor: tokens.accent, color: "#fff", borderRadius: 1.5, "&:focus": { top: 96 } }}>Skip to content</Box>}

    <Stack data-docs-bar direction="row" alignItems="center" gap={1.5} sx={{ position: "sticky", top: "var(--docs-top)", zIndex: 6, height: BAR, px: variant === "site" ? { xs: 2, md: "max(32px, calc((100% - 1360px) / 2 + 32px))" } : { xs: 1, sm: 2, lg: 3 }, bgcolor: "rgba(255,255,255,.96)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${tokens.border}`, ...(variant === "app" ? { borderRadius: "8px 8px 0 0" } : {}) }}>
      <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open documentation menu" sx={{ display: { lg: "none" }, width: 44, height: 44 }}><MenuRounded /></IconButton>
      <Typography component={NextLink} href={base === "/docs" ? "/docs" : guideHref(base, platformId)} sx={{ display: { xs: "none", sm: "block" }, color: tokens.text, fontWeight: 600, fontSize: "var(--fs-14)", textDecoration: "none", whiteSpace: "nowrap" }}>Developer docs</Typography>
      <Stack direction="row" alignItems="stretch" gap={1.5}>
      <Box sx={{ display: { xs: "none", md: "flex" } }}><PlatformSelect base={base} current={platformId} /></Box>
      {platformId === "react-native" && pathname !== guideHref(base, "react-native", "ai-setup") && <Button component={NextLink} href={guideHref(base, "react-native", "ai-setup")} startIcon={<AutoAwesomeRounded />} variant="contained" className="docs-ai-shine"
        sx={{ position: "relative", overflow: "hidden", minHeight: 0, py: 0, px: { xs: 1.25, sm: 1.75 }, whiteSpace: "nowrap", background: "linear-gradient(135deg,#6d28d9,#9333ea 55%,#db2777)", "&:hover": { background: "linear-gradient(135deg,#5b21b6,#7e22ce 55%,#be185d)" } }}>
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>AI setup prompt</Box><Box component="span" sx={{ display: { sm: "none" } }}>AI</Box>
      </Button>}
      </Stack>
      <Button onClick={openSearch} aria-label="Search documentation" aria-keyshortcuts="Meta+K Control+K /" variant="outlined" startIcon={<SearchRounded />}
        endIcon={<Box component="kbd" sx={{ display: { xs: "none", sm: "inline" }, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-11)", color: tokens.textMuted }}>{shortcut}</Box>}
        sx={{ ml: "auto", width: { xs: 44, sm: 280 }, minWidth: 44, minHeight: { xs: 44, md: 36 }, px: { xs: 0, sm: 1.5 }, "& .MuiButton-startIcon": { mx: { xs: 0, sm: undefined } }, justifyContent: "flex-start", color: tokens.textMuted, fontWeight: 400, "& .MuiButton-endIcon": { ml: "auto" } }}>
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Search docs</Box>
      </Button>
    </Stack>

    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "248px minmax(0,1fr)" }, maxWidth: variant === "site" ? 1360 : undefined, mx: "auto" }}>
      <Box component="aside" sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: `calc(var(--docs-top) + ${BAR}px)`, alignSelf: "start", maxHeight: `calc(100vh - var(--docs-top) - ${BAR}px)`, overflowY: "auto", ...hiddenScrollbar, p: 2, pt: 3, borderRight: `1px solid ${tokens.border}` }}>
        <GuideNav base={base} platformId={platformId} pathname={pathname} />
      </Box>
      <Box component={variant === "site" ? "main" : "div"} id="docs-content" tabIndex={-1} sx={{ minWidth: 0, outline: 0 }}>{children}</Box>
    </Box>

    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: "min(320px, 88vw)", p: 2 } }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography fontWeight={600}>Developer docs</Typography>
        <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close documentation menu" sx={{ width: 44, height: 44 }}><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ mb: 2.5, "& .MuiInputBase-root": { width: "100%" } }}><PlatformSelect base={base} current={platformId} /></Box>
      <GuideNav base={base} platformId={platformId} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
    </Drawer>
    <DocsSearchDialog items={index} open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={(href) => router.push(href)} />
  </Box>;
}
