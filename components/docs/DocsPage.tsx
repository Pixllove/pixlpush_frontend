import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import { LinkBox } from "./links";
import TableOfContents from "./TableOfContents";
import { hiddenScrollbar } from "./DocsPrimitives";
import { getGuide, getPlatform, guideHref, guideNeighbours } from "./registry";

function Pager({ href, label, direction }: { href: string; label: string; direction: "Previous" | "Next" }) {
  return <LinkBox href={href} sx={{ flex: 1, p: 2, minHeight: 64, borderRadius: 2, border: `1px solid ${tokens.border}`, textDecoration: "none", textAlign: direction === "Next" ? "right" : "left", transition: "border-color var(--pp-ease)", "&:hover": { borderColor: tokens.accentLine }, "&:focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: 2 } }}>
    <Typography fontSize="var(--fs-12)" color={tokens.textMuted}>{direction === "Next" ? "Next →" : "← Previous"}</Typography>
    <Typography fontSize="var(--fs-14)" fontWeight={600} color={tokens.text} sx={{ mt: .25 }}>{label}</Typography>
  </LinkBox>;
}

/** A guide page: breadcrumb, title, lead, content, prev/next and the "On this page" column. */
export default function DocsPage({ base, platformId, slug, tocFrom = "lg", children }: { base: string; platformId: string; slug: string; tocFrom?: "lg" | "xl"; children: ReactNode }) {
  const platform = getPlatform(platformId)!;
  const guide = getGuide(platformId, slug)!;
  const { previous, next } = guideNeighbours(platformId, slug);

  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", [tocFrom]: "minmax(0,1fr) 208px" }, gap: { [tocFrom]: 5 }, px: { xs: 2, sm: 4, md: 5 }, pt: { xs: 3, md: 5 }, pb: { xs: 8, md: 10 } }}>
    <Box component="article" sx={{ minWidth: 0, maxWidth: 780 }}>
      <Box component="header" sx={{ mb: { xs: 4, md: 5 } }}>
        <Box component="nav" aria-label="Breadcrumb">
          <Stack component="ol" direction="row" flexWrap="wrap" gap={.75} sx={{ m: 0, p: 0, listStyle: "none", fontSize: "var(--fs-13)", color: tokens.textMuted }}>
            {base !== "/docs" && <Stack component="li" direction="row" gap={.75}><LinkBox href="/dashboard/developer-docs" sx={{ color: "inherit", textDecoration: "none", "&:hover": { color: tokens.accent } }}>Developer documentation</LinkBox><span aria-hidden="true">/</span></Stack>}
            <li><LinkBox href={guideHref(base, platformId)} sx={{ color: "inherit", textDecoration: "none", "&:hover": { color: tokens.accent } }}>{platform.label}</LinkBox></li>
            <Stack component="li" direction="row" gap={.75}><span aria-hidden="true">/</span><span>{guide.group}</span></Stack>
            {slug && <Stack component="li" direction="row" gap={.75}><span aria-hidden="true">/</span><Box component="span" aria-current="page" sx={{ color: tokens.textSecondary }}>{guide.title}</Box></Stack>}
          </Stack>
        </Box>
        <Typography component="h1" sx={{ mt: 2, color: tokens.text, fontSize: { xs: "var(--fs-32)", md: "var(--fs-40)" }, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.03em" }}>{guide.title}</Typography>
        <Typography sx={{ mt: 1.5, maxWidth: 680, color: tokens.textSecondary, fontSize: { xs: "var(--fs-16)", md: "var(--fs-18)" }, lineHeight: 1.65 }}>{guide.description}</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
          <Box component="span" sx={{ px: 1, py: .25, borderRadius: 999, bgcolor: tokens.subtle, color: tokens.textSecondary, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-12)" }}>@pixlpush/{platform.id} {platform.version}</Box>
        </Stack>
      </Box>
      {children}
      <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} sx={{ mt: 8, pt: 4, borderTop: `1px solid ${tokens.border}` }}>
        {previous ? <Pager href={guideHref(base, platformId, previous.slug)} label={previous.title} direction="Previous" /> : <Box sx={{ flex: 1 }} />}
        {next ? <Pager href={guideHref(base, platformId, next.slug)} label={next.title} direction="Next" /> : <Box sx={{ flex: 1 }} />}
      </Stack>
      <Typography sx={{ mt: 3, color: tokens.textMuted, fontSize: "var(--fs-12)" }}>Written against the source of @pixlpush/{platform.id} {platform.version}. If behaviour differs in a newer version, the SDK’s changelog takes precedence.</Typography>
    </Box>
    <Box component="aside" sx={{ display: { xs: "none", [tocFrom]: "block" }, position: "sticky", top: "calc(var(--docs-top) + 80px)", alignSelf: "start", maxHeight: "calc(100vh - var(--docs-top) - 100px)", overflowY: "auto", ...hiddenScrollbar }}>
      <TableOfContents items={guide.sections} />
    </Box>
  </Box>;
}
