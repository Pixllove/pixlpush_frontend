"use client";

import { useEffect, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { tokens } from "@/lib/theme";

export default function TableOfContents({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const fromHash = decodeURIComponent(window.location.hash.slice(1));
    if (items.some((item) => item.id === fromHash)) setActive(fromHash);
    const sections = items.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-20% 0px -65% 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return <Box component="nav" aria-label="On this page">
    <Typography component="h2" sx={{ color: tokens.textMuted, fontSize: "var(--fs-11)", fontWeight: 600, letterSpacing: "var(--ls-overline)", textTransform: "uppercase" }}>On this page</Typography>
    <Stack component="ul" sx={{ m: 0, mt: 1.25, p: 0, listStyle: "none", borderLeft: `1px solid ${tokens.border}` }}>
      {items.map((item) => {
        const current = active === item.id;
        return <li key={item.id}><Box component="a" href={`#${item.id}`} onClick={() => setActive(item.id)} aria-current={current ? "location" : undefined}
          sx={{ display: "block", ml: "-1px", py: .75, px: 1.5, borderLeft: "2px solid", borderColor: current ? tokens.accent : "transparent", color: current ? tokens.accent : tokens.textSecondary, fontWeight: current ? 600 : 400, fontSize: "var(--fs-13)", lineHeight: 1.4, textDecoration: "none", transition: "color var(--pp-ease), border-color var(--pp-ease)", "&:hover": { color: tokens.text }, "&:focus-visible": { outline: `2px solid ${tokens.accent}`, outlineOffset: -2 } }}>{item.label}</Box></li>;
      })}
    </Stack>
  </Box>;
}
