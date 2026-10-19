import type { ReactNode } from "react";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import LightbulbOutlined from "@mui/icons-material/LightbulbOutlined";
import ReportGmailerrorredRounded from "@mui/icons-material/ReportGmailerrorredRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { Box, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";
import { LinkBox } from "./links";

// Visually hidden, still announced. Pinned to its (positioned) parent so it can never widen the page.
export const srOnly = { position: "absolute", left: 0, top: 0, width: 1, height: 1, m: "-1px", p: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 } as const;
export const bodySx = { color: tokens.textSecondary, fontSize: "var(--fs-16)", lineHeight: 1.75 } as const;
export const listSx = { ...bodySx, pl: 2.5, m: 0, "& li": { mb: 1, pl: .5 }, "& li::marker": { color: tokens.textMuted } } as const;
const inlineSx = {
  "& :not(pre) > code": { fontFamily: "var(--pp-mono)", fontSize: ".875em", px: .6, py: .2, borderRadius: 1, bgcolor: tokens.subtle, color: tokens.text, overflowWrap: "anywhere" },
  "& p a, & li a, & td a": { color: tokens.accent, fontWeight: 500, textUnderlineOffset: 3 },
} as const;

/** Side navigation columns: still scrollable, never shows a bar. */
export const hiddenScrollbar = { scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } } as const;

/** Thin scrollbars for light surfaces (tables, side navigation), matching the code blocks. */
export const lightScrollbar = {
  // Invisible until the area is hovered or focused, so it never sits on the page as a grey bar.
  scrollbarWidth: "thin", scrollbarColor: "transparent transparent", transition: "scrollbar-color var(--pp-ease)",
  "&:hover, &:focus-within": { scrollbarColor: `${tokens.borderStrong} transparent` },
  "&::-webkit-scrollbar": { width: 10, height: 10 },
  "&::-webkit-scrollbar-track": { background: "transparent" },
  "&::-webkit-scrollbar-thumb": { background: "transparent", borderRadius: 999, border: "3px solid transparent", backgroundClip: "padding-box" },
  "&:hover::-webkit-scrollbar-thumb, &:focus-within::-webkit-scrollbar-thumb": { background: tokens.borderStrong, backgroundClip: "padding-box" },
  "&::-webkit-scrollbar-thumb:hover": { background: tokens.textMuted, backgroundClip: "padding-box" },
} as const;

// Heading anchors land below the sticky header and docs bar (DocsLayout sets the variable).
export const scrollOffset = "var(--docs-offset, 140px)";

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <Box component="section" id={id} aria-labelledby={`${id}-title`} sx={{ position: "relative", scrollMarginTop: scrollOffset, py: { xs: 4, md: 5 }, borderBottom: `1px solid ${tokens.border}`, "&:first-of-type": { pt: 0 }, "&:last-of-type": { borderBottom: 0 }, ...inlineSx }}>
    <Typography id={`${id}-title`} component="h2" sx={{ mb: 2, color: tokens.text, fontSize: { xs: "var(--fs-24)", md: "var(--fs-28)" }, fontWeight: 600, lineHeight: 1.25, letterSpacing: "var(--ls-display)" }}>
      <Box component="a" href={`#${id}`} sx={{ color: "inherit", textDecoration: "none", "&:hover::after, &:focus-visible::after": { content: '"#"', ml: 1, color: tokens.textMuted } }}>{title}</Box>
    </Typography>
    <Stack gap={2}>{children}</Stack>
  </Box>;
}

export function SubHeading({ id, children }: { id?: string; children: ReactNode }) {
  return <Typography id={id} component="h3" sx={{ mt: 1.5, scrollMarginTop: scrollOffset, color: tokens.text, fontSize: "var(--fs-18)", fontWeight: 600 }}>{children}</Typography>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Typography component="div" sx={{ ...bodySx, "& p": { m: 0 } }}>{children}</Typography>;
}

export function List({ ordered, items }: { ordered?: boolean; items: ReactNode[] }) {
  return <Box component={ordered ? "ol" : "ul"} sx={listSx}>{items.map((item, index) => <li key={index}>{item}</li>)}</Box>;
}

const calloutTone = {
  note: { icon: InfoOutlined, bg: tokens.infoSoft, fg: tokens.info, label: "Note" },
  tip: { icon: LightbulbOutlined, bg: tokens.accentSoft, fg: tokens.accent, label: "Tip" },
  warning: { icon: WarningAmberRounded, bg: tokens.warningSoft, fg: tokens.warning, label: "Warning" },
  danger: { icon: ReportGmailerrorredRounded, bg: tokens.errorSoft, fg: tokens.error, label: "Danger" },
  success: { icon: CheckCircleRounded, bg: tokens.successSoft, fg: tokens.success, label: "Success" },
};

export function Callout({ tone = "note", title, children }: { tone?: keyof typeof calloutTone; title: string; children: ReactNode }) {
  const { icon: Icon, bg, fg, label } = calloutTone[tone];
  return <Stack role="note" direction="row" gap={1.5} sx={{ position: "relative", "& + section, & + .docs-step": { mt: { xs: 4, md: 5 } }, p: 2, borderRadius: 2, bgcolor: bg, borderLeft: `3px solid ${fg}`, ...inlineSx }}>
    <Icon aria-hidden="true" sx={{ mt: .1, flexShrink: 0, fontSize: 20, color: fg }} />
    <Box sx={{ minWidth: 0 }}>
      <Typography fontWeight={600} fontSize="var(--fs-14)" color={tokens.text}><Box component="span" sx={srOnly}>{label}: </Box>{title}</Typography>
      <Typography component="div" fontSize="var(--fs-14)" lineHeight={1.65} color={tokens.textSecondary} sx={{ mt: .5 }}>{children}</Typography>
    </Box>
  </Stack>;
}

/** Tables scroll inside their own frame on small screens, never the page. */
export function DataTable({ headers, rows, code = true, minWidth }: { headers: string[]; rows: ReactNode[][]; code?: boolean; minWidth?: number }) {
  return <TableContainer tabIndex={0} role="region" aria-label={`${headers[0]} table`} sx={{ border: `1px solid ${tokens.border}`, borderRadius: 2, bgcolor: tokens.surface, ...inlineSx, ...lightScrollbar, "&:focus-visible": { outline: `2px solid ${tokens.accent}` } }}>
    <Table size="small" sx={{ minWidth: minWidth ?? (headers.length > 3 ? 680 : 0) }}>
      <TableHead><TableRow>{headers.map((header) => <TableCell key={header} scope="col" sx={{ whiteSpace: "nowrap" }}>{header}</TableCell>)}</TableRow></TableHead>
      <TableBody>{rows.map((row, rowIndex) => <TableRow key={rowIndex}>{row.map((cell, index) => <TableCell key={index} component={index === 0 ? "th" : "td"} scope={index === 0 ? "row" : undefined} sx={{ verticalAlign: "top", lineHeight: 1.6, ...(index === 0 && code ? { color: tokens.accent, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-12)", whiteSpace: "nowrap" } : { color: index === 0 ? tokens.text : tokens.textSecondary, fontWeight: index === 0 ? 500 : 400, fontSize: "var(--fs-13)" }) }}>{cell}</TableCell>)}</TableRow>)}</TableBody>
    </Table>
  </TableContainer>;
}

export function Checklist({ items }: { items: ReactNode[] }) {
  return <Stack component="ul" gap={1.25} sx={{ m: 0, p: 0, listStyle: "none", ...inlineSx }}>
    {items.map((item, index) => <Stack component="li" key={index} direction="row" gap={1.25} alignItems="flex-start" sx={bodySx}><CheckCircleRounded aria-hidden="true" sx={{ color: tokens.success, fontSize: 20, mt: .5, flexShrink: 0 }} /><span>{item}</span></Stack>)}
  </Stack>;
}

/** A numbered step on a vertical rail. */
export function Step({ id, number, title, level = "h2", children }: { id: string; number: number; title: string; level?: "h2" | "h3"; children: ReactNode }) {
  return <Box component="section" className="docs-step" id={id} aria-labelledby={`${id}-title`} sx={{ scrollMarginTop: scrollOffset, position: "relative", pl: { xs: 5.5, md: 7 }, pb: 5, "section:not(.docs-step) + &": { mt: { xs: 4, md: 5 } }, "&:last-of-type": { pb: 0 }, "&:not(:last-of-type)::before": { content: '""', position: "absolute", left: { xs: 15, md: 17 }, top: 44, bottom: 4, width: "1px", bgcolor: tokens.border }, ...inlineSx }}>
    <Box aria-hidden="true" sx={{ position: "absolute", left: 0, top: 0, width: { xs: 32, md: 36 }, height: { xs: 32, md: 36 }, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: tokens.accentSoft, color: tokens.accent, border: `1px solid ${tokens.accentLine}`, fontFamily: "var(--pp-mono)", fontSize: "var(--fs-13)", fontWeight: 600 }}>{number}</Box>
    <Typography id={`${id}-title`} component={level} sx={{ pt: { xs: .5, md: .6 }, mb: 1.5, color: tokens.text, fontSize: level === "h3" ? "var(--fs-18)" : { xs: "var(--fs-20)", md: "var(--fs-24)" }, fontWeight: 600, letterSpacing: "var(--ls-display)" }}><Box component="span" sx={srOnly}>Step {number}: </Box>{title}</Typography>
    <Stack gap={2}>{children}</Stack>
  </Box>;
}

/** "Expected result" after a verification step. */
export function Expect({ children }: { children: ReactNode }) {
  return <Stack direction="row" gap={1} sx={{ px: 1.5, py: 1.25, borderRadius: 2, border: `1px dashed ${tokens.borderStrong}`, ...inlineSx }}>
    <Typography component="span" sx={{ flexShrink: 0, color: tokens.success, fontSize: "var(--fs-13)", fontWeight: 600 }}>Expected</Typography>
    <Typography component="span" sx={{ color: tokens.textSecondary, fontSize: "var(--fs-13)", lineHeight: 1.6 }}>{children}</Typography>
  </Stack>;
}

export function LinkCard({ href, icon, title, description, meta }: { href: string; icon: ReactNode; title: string; description: string; meta?: ReactNode }) {
  return <LinkBox href={href} sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2.5, minHeight: 156, borderRadius: 2, border: `1px solid ${tokens.border}`, bgcolor: tokens.surface, color: "inherit", textDecoration: "none", transition: "border-color var(--pp-ease)", "&:hover": { borderColor: tokens.accentLine }, "&:hover .docs-card-arrow": { transform: "translateX(3px)", color: tokens.accent }, "&:focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: 2 }, "@media (prefers-reduced-motion: reduce)": { "& .docs-card-arrow": { transition: "none" } } }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box sx={{ width: 36, height: 36, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: tokens.accentSoft, color: tokens.accent, "& svg": { fontSize: 20 } }}>{icon}</Box>
      {meta}
    </Stack>
    <Box>
      <Typography component="h3" fontWeight={600} fontSize="var(--fs-16)" color={tokens.text}>{title} <Box component="span" className="docs-card-arrow" aria-hidden="true" sx={{ display: "inline-block", color: tokens.textMuted, transition: "transform var(--pp-ease), color var(--pp-ease)" }}>→</Box></Typography>
      <Typography fontSize="var(--fs-14)" lineHeight={1.6} color={tokens.textSecondary} sx={{ mt: .5 }}>{description}</Typography>
    </Box>
  </LinkBox>;
}
