import type { Metadata } from "next";
import { Box, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import TableOfContents from "@/components/docs/TableOfContents";
import { hiddenScrollbar } from "@/components/docs/DocsPrimitives";
import { getPlatform } from "@/components/docs/registry";
import { reactNativeGuides as renderers } from "@/components/docs/react-native/guides-operate";

export const metadata: Metadata = { title: "Full documentation · React Native | PixlPush Docs", description: "Every React Native & Expo guide on one page." };

// Every guide on one page, in nav order. ponytail: section ids repeat across guides, so deep links
// inside a guide resolve to the first match; prefix ids per guide if that becomes a problem.
export default function FullReactNativeDocs() {
  const platform = getPlatform("react-native")!;
  const guides = platform.guides!.filter((guide) => guide.slug !== "ai-setup");
  const id = (slug: string) => `guide-${slug || "overview"}`;

  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: "minmax(0,1fr) 208px" }, gap: { lg: 5 }, px: { xs: 2, sm: 4, md: 5 }, pt: { xs: 3, md: 5 }, pb: { xs: 8, md: 10 } }}>
    <Box component="article" sx={{ minWidth: 0, maxWidth: 780 }}>
      <Typography component="h1" sx={{ color: tokens.text, fontSize: { xs: "var(--fs-32)", md: "var(--fs-40)" }, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.03em" }}>{platform.label} — full documentation</Typography>
      <Typography sx={{ mt: 1.5, color: tokens.textSecondary, fontSize: { xs: "var(--fs-16)", md: "var(--fs-18)" }, lineHeight: 1.65 }}>Every guide for @pixlpush/{platform.id} {platform.version} on one page — read it top to bottom, search it with Ctrl/⌘ F, or print it.</Typography>
      {guides.map((guide) => {
        const Guide = renderers[guide.slug];
        return <Box component="section" key={guide.slug} id={id(guide.slug)} aria-labelledby={`${id(guide.slug)}-title`} sx={{ mt: { xs: 8, md: 10 }, pt: 4, borderTop: `1px solid ${tokens.border}`, scrollMarginTop: "var(--docs-offset)" }}>
          <Typography component="p" sx={{ color: tokens.accent, fontSize: "var(--fs-12)", fontWeight: 600, letterSpacing: "var(--ls-overline)", textTransform: "uppercase" }}>{guide.group}</Typography>
          <Typography id={`${id(guide.slug)}-title`} component="h2" sx={{ mt: 1, color: tokens.text, fontSize: { xs: "var(--fs-28)", md: "var(--fs-32)" }, fontWeight: 600, letterSpacing: "-0.03em" }}>{guide.title}</Typography>
          <Typography sx={{ mt: 1, mb: 4, color: tokens.textSecondary }}>{guide.description}</Typography>
          <Guide base="/docs" />
        </Box>;
      })}
    </Box>
    <Box component="aside" sx={{ display: { xs: "none", lg: "block" }, position: "sticky", top: "calc(var(--docs-top) + 80px)", alignSelf: "start", maxHeight: "calc(100vh - var(--docs-top) - 100px)", overflowY: "auto", ...hiddenScrollbar }}>
      <TableOfContents items={guides.map((guide) => ({ id: id(guide.slug), label: guide.title }))} />
    </Box>
  </Box>;
}
