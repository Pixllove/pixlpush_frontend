"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Divider, Stack, TextField, Typography } from "@mui/material";
import SendRounded from "@mui/icons-material/SendRounded";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { supportApi, supportKeys, type SupportTicket } from "@/lib/support/api";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function SupportPage() {
  useActiveProject();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const tickets = useQuery({ queryKey: supportKeys.tickets(), queryFn: supportApi.list });
  const selected = useQuery({ queryKey: supportKeys.ticket(selectedId ?? ""), queryFn: () => supportApi.get(selectedId!), enabled: Boolean(selectedId) });
  const send = useMutation({
    mutationFn: () => supportApi.send(selectedId!, draft.trim()),
    onSuccess: (ticket) => { setDraft(""); client.setQueryData(supportKeys.ticket(ticket.id), ticket); client.invalidateQueries({ queryKey: supportKeys.tickets() }); },
  });

  return (
    <DashboardFrame active="Contact support" title="Support" description="Ask a question, track your tickets, and keep every reply in one place." requiresProject={false}>
      <Stack direction={{ xs: "column", md: "row" }} gap={2.5} sx={{ minHeight: 560 }}>
        <Card className="pp-panel" sx={{ width: { xs: "100%", md: 330 }, p: 2 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>Your support tickets</Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>Questions from the website and dashboard appear here.</Typography>
          {tickets.isPending ? <CircularProgress size={22} /> : tickets.isError ? <Alert severity="error">Unable to load support tickets.</Alert> : tickets.data.items.length === 0 ? <Typography color="text.secondary">No tickets yet. Use Contact support to start one.</Typography> : <Stack divider={<Divider flexItem />}>
            {tickets.data.items.map((ticket) => <Button key={ticket.id} onClick={() => setSelectedId(ticket.id)} sx={{ justifyContent: "flex-start", alignItems: "flex-start", py: 1.4, textAlign: "left", color: "text.primary", bgcolor: selectedId === ticket.id ? "action.hover" : "transparent" }}><Box><Typography fontWeight={700}>{ticket.subject || `${ticket.topic} support`}</Typography><Typography color="text.secondary" sx={{ display: "block", mt: .35, fontSize: 12 }}>{ticket.reference} · {ticket.status.replaceAll("_", " ")}</Typography></Box></Button>)}
          </Stack>}
        </Card>
        <Card className="pp-panel" sx={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", p: { xs: 2, md: 3 } }}>
          {!selectedId ? <Box sx={{ display: "grid", flex: 1, minHeight: 350, placeItems: "center", textAlign: "center" }}><Box><Typography variant="h2" sx={{ mb: 1 }}>How can we help?</Typography><Typography color="text.secondary">Select a ticket or open Contact support to ask the PixlPush team a question.</Typography></Box></Box> : selected.isPending ? <CircularProgress size={22} /> : selected.isError || !selected.data ? <Alert severity="error">Unable to load this ticket.</Alert> : <SupportThread ticket={selected.data} draft={draft} setDraft={setDraft} onSend={() => send.mutate()} sending={send.isPending} />}
        </Card>
      </Stack>
    </DashboardFrame>
  );
}

function SupportThread({ ticket, draft, setDraft, onSend, sending }: { ticket: SupportTicket; draft: string; setDraft: (value: string) => void; onSend: () => void; sending: boolean }) {
  return <><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} sx={{ mb: 2 }}><Box><Typography variant="h2">{ticket.subject || `${ticket.topic} support`}</Typography><Typography color="text.secondary" sx={{ mt: .5, fontSize: 13 }}>{ticket.reference} · {ticket.status.replaceAll("_", " ")}</Typography></Box><Typography color="text.secondary" sx={{ fontSize: 13 }}>{ticket.project?.name ?? "Account support"}</Typography></Stack><Divider /><Stack gap={2} sx={{ flex: 1, overflowY: "auto", py: 2 }}>{(ticket.messages ?? []).map((message) => <Box key={message.id} sx={{ alignSelf: message.senderType === "customer" ? "flex-end" : "flex-start", maxWidth: "min(720px, 88%)", p: 1.5, borderRadius: 2, bgcolor: message.senderType === "customer" ? "primary.main" : "action.hover", color: message.senderType === "customer" ? "primary.contrastText" : "text.primary" }}><Typography sx={{ whiteSpace: "pre-wrap" }}>{message.body}</Typography><Typography sx={{ display: "block", mt: .7, opacity: .7, fontSize: 11 }}>{message.senderType === "customer" ? "You" : "PixlPush Support"} · {new Date(message.createdAt).toLocaleString()}</Typography></Box>)}</Stack><Stack component="form" direction="row" gap={1} onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onSend(); }}><TextField fullWidth multiline maxRows={4} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Reply to PixlPush Support" disabled={ticket.status === "closed" || sending} /><Button type="submit" variant="contained" endIcon={<SendRounded />} disabled={!draft.trim() || ticket.status === "closed" || sending}>{sending ? "Sending" : "Reply"}</Button></Stack></>;
}
