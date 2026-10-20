"use client";

import { useState } from "react";
import {
  ArrowOutwardRounded,
  CheckRounded,
  ContentCopyRounded,
  TerminalRounded,
} from "@mui/icons-material";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { aiPrompt, code, installCommands } from "@/components/docs/react-native/content";

const integrationPrompt = aiPrompt;
const codeExample = `${installCommands.npm}\n\n${code.initialize}\n\n${code.identify}\n\n${code.track}`;

type View = "prompt" | "code";

export default function IntegrationPromptSection() {
  const [view, setView] = useState<View>("prompt");
  const [copied, setCopied] = useState(false);
  const content = view === "prompt" ? integrationPrompt : codeExample;

  const copyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box className="site-page-seam" sx={{ position: "relative", isolation: "isolate", py: { xs: 8, md: 12 }, bgcolor: "#21152d", borderTop: "1px solid rgba(226,207,247,.12)", borderBottom: "1px solid rgba(226,207,247,.12)" }}>
      <Container maxWidth="lg">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.82fr 1.18fr" }, gap: { xs: 4, md: 8 }, alignItems: "center" }}>
          <Box>
            <Typography variant="h2" sx={{ maxWidth: 520, color: "#f8f3fc", fontSize: { xs: "var(--fs-40)", md: "var(--fs-56)" }, lineHeight: 1.04, letterSpacing: "-.045em", fontWeight: 700 }}>
              Connect PixlPush with{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(90deg, #ffe174 0%, #ff9b45 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                one prompt
              </Box>.
            </Typography>
            <Typography sx={{ mt: 2.2, maxWidth: 500, color: "#c4b6d0", fontSize: "var(--fs-16)", lineHeight: 1.7 }}>
              Give your AI coding assistant the PixlPush context. It can wire up the React Native SDK, user identification, push, and the events your marketing team needs for better journeys.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 3 }}>
              <Button href="/docs/react-native/ai-setup" variant="contained" endIcon={<ArrowOutwardRounded />} className="hero-gradient-button" sx={{ alignSelf: "flex-start", px: 2.2, py: 1.1, borderRadius: 2, fontWeight: 700, textTransform: "none" }}>
                View AI setup guide
              </Button>
            </Stack>
          </Box>

          <Box sx={{ overflow: "hidden", borderRadius: 4, bgcolor: "#171122", color: "#fff", border: "1px solid rgba(255,179,71,.52)", boxShadow: "0 0 0 1px rgba(255,179,71,.1), 0 24px 65px rgba(8,4,15,.42), 0 0 42px rgba(255,153,67,.13)" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1.5} sx={{ px: { xs: 2, md: 2.5 }, py: 1.7, borderBottom: "1px solid rgba(255,179,71,.26)", bgcolor: "linear-gradient(100deg, #30213a 0%, #261a33 55%, #30202d 100%)" }}>
              <Stack direction="row" gap={1} alignItems="center">
                <Box sx={{ display: "grid", width: 34, height: 34, placeItems: "center", borderRadius: 1.5, background: "linear-gradient(135deg, #ffe27a, #ff9a52)", color: "#21152d", boxShadow: "0 4px 16px rgba(255,164,71,.24)" }}><TerminalRounded fontSize="small" /></Box>
                <Box><Typography sx={{ fontSize: "var(--fs-12)", fontWeight: 800, letterSpacing: ".025em" }}>PIXLPUSH REACT NATIVE SDK</Typography><Typography sx={{ mt: .2, color: "rgba(255,255,255,.72)", fontSize: "var(--fs-12)" }}>AI-ready setup</Typography></Box>
              </Stack>
              <Stack direction="row" gap={0.5} alignItems="center">
                <Stack direction="row" gap={0.5} role="tablist" aria-label="Integration example">
                  {([{ id: "prompt", label: "AI prompt" }, { id: "code", label: "Code snippet" }] as const).map((tab) => <Button key={tab.id} role="tab" aria-selected={view === tab.id} onClick={() => { setView(tab.id); setCopied(false); }} sx={{ minWidth: 0, px: 1.4, py: .85, borderRadius: 1.5, color: view === tab.id ? "#21152d" : "rgba(255,255,255,.76)", background: view === tab.id ? "linear-gradient(100deg, #ffe27a, #ff9a52)" : "transparent", fontSize: "var(--fs-12)", fontWeight: 800, textTransform: "none", boxShadow: view === tab.id ? "0 4px 16px rgba(255,164,71,.2)" : "none", "&:hover": { background: view === tab.id ? "linear-gradient(100deg, #ffe995, #ffa86b)" : "rgba(255,255,255,.08)" } }}>{tab.label}</Button>)}
                </Stack>
                <Button onClick={copyContent} startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />} sx={{ minWidth: 0, px: 1.1, py: .75, borderRadius: 1.5, color: copied ? "#82e5b3" : "#ffd07a", fontSize: "var(--fs-12)", fontWeight: 700, textTransform: "none", whiteSpace: "nowrap", "&:hover": { bgcolor: "rgba(255,179,71,.12)" } }}>
                  {copied ? "Copied" : "Copy"}
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ height: { xs: 150, md: 190 }, px: { xs: 2, md: 2.8 }, pt: 2.2, pb: 2, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "thin", scrollbarColor: "rgba(255,179,71,.5) transparent", bgcolor: "#100c19", "&::-webkit-scrollbar": { width: 6 }, "&::-webkit-scrollbar-thumb": { borderRadius: 99, backgroundColor: "rgba(255,179,71,.5)" } }}>
              <Box component="pre" sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#f1eaff", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: { xs: "var(--fs-12)", md: "var(--fs-12)" }, lineHeight: 1.8 }}>
                {content}
              </Box>
            </Box>
            <Box sx={{ height: 12, borderTop: "1px solid rgba(255,179,71,.25)", bgcolor: "#241a2e" }} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
