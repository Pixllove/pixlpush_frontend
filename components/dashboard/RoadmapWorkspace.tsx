"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { roadmapApi, type RoadmapItem, type RoadmapStage } from "@/lib/projects/api";

const stages: Array<{ key: RoadmapStage; label: string; emoji: string; accent: string; border: string }> = [
  { key: "under_consideration", label: "Under consideration", emoji: "🕵️", accent: "#db2777", border: "#fbcfe8" },
  { key: "future", label: "Future", emoji: "🖥️", accent: "#7c3aed", border: "#ddd6fe" },
  { key: "planned", label: "Planned", emoji: "📋", accent: "#2563eb", border: "#bfdbfe" },
  { key: "in_progress", label: "In progress", emoji: "🧑‍💻", accent: "#ea580c", border: "#fed7aa" },
  { key: "done", label: "Done", emoji: "🎉", accent: "#059669", border: "#a7f3d0" },
  { key: "unlikely_to_build", label: "Unlikely to build", emoji: "😕", accent: "#64748b", border: "#cbd5e1" },
];

export default function RoadmapWorkspace() {
  const { active } = useActiveProject();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", description: "", area: "" });
  const roadmap = useQuery({ queryKey: ["projects", active?.id, "roadmap"], queryFn: () => roadmapApi.list(active!.id), enabled: Boolean(active?.id), staleTime: 30_000 });
  const suggest = useMutation({ mutationFn: () => roadmapApi.suggest(active!.id, { title: draft.title.trim(), description: draft.description.trim(), area: draft.area.trim() || undefined }), onSuccess: () => { setDraft({ title: "", description: "", area: "" }); setOpen(false); client.invalidateQueries({ queryKey: ["projects", active?.id, "roadmap"] }); } });
  const items = roadmap.data?.items ?? [];

  return <Stack gap={2.5}>
    <Card className="pp-panel" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={2}>
        <Box><Typography variant="overline" color="primary">Product discovery</Typography><Typography variant="h1">Ideas &amp; Roadmap</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>See what PixlPush is considering, planning, and building next.</Typography></Box>
        <Button variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>Give suggestion</Button>
      </Stack>
      <Box sx={{ mt: 2, px: 2, py: 1.25, borderRadius: 2, bgcolor: "action.hover", color: "text.secondary", fontSize: 13 }}>The roadmap is managed by PixlPush. Published ideas are read-only here; send a suggestion for the team to review.</Box>
    </Card>

    {roadmap.isPending ? <Box sx={{ display: "grid", minHeight: 420, placeItems: "center" }}><CircularProgress /></Box> : roadmap.isError ? <Alert severity="error">Unable to load the roadmap for this Project.</Alert> : <Box sx={{ width: "100%" }}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }, gap: { xs: 1.25, md: 1.5 }, width: "100%" }}>
      {stages.map((stage) => {
        const stageItems = items.filter((item) => item.stage === stage.key);
        return <Box key={stage.key} sx={{ minWidth: 0, minHeight: { xs: 280, xl: 560 }, p: { xs: 1, md: 1.25 }, border: `1px solid ${stage.border}`, borderRadius: 3, bgcolor: "rgba(255,255,255,.7)" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: .75, pb: 1.25, borderBottom: `1px dashed ${stage.border}` }}><Typography sx={{ color: stage.accent, fontWeight: 800, fontSize: 13 }}>{stage.emoji} {stage.label}</Typography><Chip size="small" label={stageItems.length} sx={{ bgcolor: "action.hover", fontWeight: 700 }} /></Stack>
          <Stack gap={1.25} sx={{ pt: 1.25 }}>{stageItems.map((item) => <RoadmapCard key={item.id} item={item} />)}{stageItems.length === 0 && <Box sx={{ border: "1px dashed", borderColor: "divider", borderRadius: 2, p: 2.5, mt: .25, textAlign: "center", color: "text.disabled", fontSize: 12 }}>No published ideas here yet.</Box>}</Stack>
        </Box>;
      })}
    </Box></Box>}

    {suggest.isError && <Alert severity="error">Unable to submit your suggestion. Please try again.</Alert>}
    <Dialog open={open} onClose={() => !suggest.isPending && setOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Suggest a feature</DialogTitle><DialogContent><Typography color="text.secondary" sx={{ mb: 2 }}>Your suggestion will go to the PixlPush team for approval before it appears on the roadmap.</Typography><Stack gap={2}><TextField autoFocus label="Feature title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /><TextField label="Why would this help?" multiline minRows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /><TextField label="Product area (optional)" value={draft.area} onChange={(event) => setDraft({ ...draft, area: event.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setOpen(false)} disabled={suggest.isPending}>Cancel</Button><Button variant="contained" onClick={() => suggest.mutate()} disabled={!draft.title.trim() || !draft.description.trim() || suggest.isPending}>{suggest.isPending ? "Submitting…" : "Send suggestion"}</Button></DialogActions></Dialog>
  </Stack>;
}

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const stage = stages.find((value) => value.key === item.stage);
  return <Card variant="outlined" sx={{ p: 1.75, borderRadius: 2.5, minHeight: 220, boxShadow: "0 2px 8px rgba(45,55,100,.06)" }}><Stack direction="row" justifyContent="space-between" gap={1}><Chip size="small" label={`${item.requestCount} request${item.requestCount === 1 ? "" : "s"}`} /><Typography variant="caption" color="text.secondary">{stage?.label}</Typography></Stack><Typography variant="h2" sx={{ mt: 1.5, fontSize: 16 }}>{item.title}</Typography><Typography color="text.secondary" sx={{ mt: .75, fontSize: 13, lineHeight: 1.45 }}>{item.description}</Typography><Stack direction="row" gap={.75} flexWrap="wrap" sx={{ mt: 1.75 }}>{item.area && <Chip size="small" variant="outlined" label={item.area} />}{item.tags.map((tag) => <Chip key={tag} size="small" variant="outlined" label={`#${tag}`} />)}</Stack></Card>;
}
