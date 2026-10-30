"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, Divider, Stack, TextField, Typography } from "@mui/material";
import SendRounded from "@mui/icons-material/SendRounded";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { supportApi, supportKeys, type SupportTicket } from "@/lib/support/api";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const statusLabels: Record<SupportTicket["status"], string> = {
  open: "Needs review",
  in_progress: "Needs review",
  waiting_on_customer: "Needs review",
  resolved: "Closed",
  closed: "Closed",
};

export default function SupportPage() {
  useActiveProject();
  const client = useQueryClient();
  // Reply emails link to /dashboard/support?ticket=<id>.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { const linked = new URLSearchParams(window.location.search).get("ticket"); if (linked) setSelectedId(linked); }, []);
  const [draft, setDraft] = useState("");
  const pendingSend = useRef<{ ticketId: string; message: string; key: string } | null>(null);
  const tickets = useQuery({ queryKey: supportKeys.tickets(), queryFn: supportApi.list });
  const selected = useQuery({ queryKey: supportKeys.ticket(selectedId ?? ""), queryFn: () => supportApi.get(selectedId!), enabled: Boolean(selectedId) });
  useEffect(() => {
    if (!selectedId) return;
    return supportApi.stream(selectedId, () => { void client.invalidateQueries({ queryKey: supportKeys.ticket(selectedId) }); void client.invalidateQueries({ queryKey: supportKeys.tickets() }); });
  }, [client, selectedId]);
  const send = useMutation({
    mutationFn: () => { const message = draft.trim(); const pending = pendingSend.current?.ticketId === selectedId && pendingSend.current.message === message ? pendingSend.current : { ticketId: selectedId!, message, key: crypto.randomUUID() }; pendingSend.current = pending; return supportApi.send(selectedId!, message, pending.key); },
    onSuccess: (ticket) => { pendingSend.current = null; setDraft(""); client.setQueryData(supportKeys.ticket(ticket.id), ticket); client.invalidateQueries({ queryKey: supportKeys.tickets() }); },
  });
  const reopen = useMutation({ mutationFn: () => supportApi.reopen(selectedId!), onSuccess: (ticket) => { client.setQueryData(supportKeys.ticket(ticket.id), ticket); client.invalidateQueries({ queryKey: supportKeys.tickets() }); } });

  return (
    <DashboardFrame active="Contact support" title="Support" description="Ask a question, track your tickets, and keep every reply in one place." requiresProject={false}>
      <Stack direction={{ xs: "column", md: "row" }} gap={2.5} sx={{ minHeight: 560 }}>
        <Card className="pp-panel" sx={{ width: { xs: "100%", md: 330 }, p: 2 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>Your support tickets</Typography>
          <Typography color="text.secondary" sx={{ mb: 2, fontSize: 13 }}>Questions from the website and dashboard appear here.</Typography>
          {tickets.isPending ? <CircularProgress size={22} /> : tickets.isError ? <Alert severity="error">Unable to load support tickets.</Alert> : tickets.data.items.length === 0 ? <Typography color="text.secondary">No tickets yet. Use Contact support to start one.</Typography> : <Stack divider={<Divider flexItem />}>
            {tickets.data.items.map((ticket) => <Button key={ticket.id} onClick={() => setSelectedId(ticket.id)} sx={{ justifyContent: "flex-start", alignItems: "flex-start", py: 1.4, textAlign: "left", color: "text.primary", bgcolor: selectedId === ticket.id ? "action.hover" : "transparent" }}><Box><Typography fontWeight={700}>{ticket.subject || `${ticket.topic} support`}</Typography><Typography color="text.secondary" sx={{ display: "block", mt: .35, fontSize: 12 }}>{ticket.reference} · {statusLabels[ticket.status]}</Typography></Box></Button>)}
          </Stack>}
        </Card>
        <Card className="pp-panel" sx={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", p: { xs: 2, md: 3 } }}>
          {!selectedId ? <Box sx={{ display: "grid", flex: 1, minHeight: 350, placeItems: "center", textAlign: "center" }}><Box><Typography variant="h2" sx={{ mb: 1 }}>How can we help?</Typography><Typography color="text.secondary">Select a ticket or open Contact support to ask the PixlPush team a question.</Typography></Box></Box> : selected.isPending ? <CircularProgress size={22} /> : selected.isError || !selected.data ? <Alert severity="error">Unable to load this ticket.</Alert> : <SupportThread ticket={selected.data} draft={draft} setDraft={setDraft} onSend={() => send.mutate()} onReopen={() => reopen.mutate()} sending={send.isPending || reopen.isPending} sendError={send.isError ? (send.error instanceof Error ? send.error.message : "Unable to send your reply.") : ""} />}
        </Card>
      </Stack>
    </DashboardFrame>
  );
}

function SupportThread({ ticket, draft, setDraft, onSend, onReopen, sending, sendError }: { ticket: SupportTicket; draft: string; setDraft: (value: string) => void; onSend: () => void; onReopen: () => void; sending: boolean; sendError: string }) {
  const closed = ticket.status === "closed";
  const solved = ticket.status === "resolved";
  return <><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} sx={{ mb: 2 }}><Box><Typography variant="h2">{ticket.subject || `${ticket.topic} support`}</Typography><Typography color="text.secondary" sx={{ mt: .5, fontSize: 13 }}>{ticket.reference} · {statusLabels[ticket.status]}</Typography></Box><Typography color="text.secondary" sx={{ fontSize: 13 }}>{ticket.project?.name ?? "Account support"}</Typography></Stack>{sendError && <Alert severity="error" sx={{ mt: 1 }}>{sendError}</Alert>}{closed ? <Alert severity="info" sx={{ mt: 1, mb: 1 }} action={<Button color="inherit" onClick={onReopen} disabled={sending}>Reopen</Button>}>This request is closed. Reopen it if you still need help.</Alert> : solved ? <Alert severity="success" sx={{ mt: 1, mb: 1 }}>We marked this request as solved. Reply below if you still need help.</Alert> : null}<Divider /><Stack gap={2} sx={{ flex: 1, overflowY: "auto", py: 2 }}>{(ticket.messages ?? []).map((message) => <Box key={message.id} sx={{ alignSelf: message.senderType === "customer" ? "flex-end" : "flex-start", maxWidth: "min(720px, 88%)", p: 1.5, borderRadius: 2, bgcolor: message.senderType === "customer" ? "primary.main" : "action.hover", color: message.senderType === "customer" ? "primary.contrastText" : "text.primary" }}><Typography sx={{ whiteSpace: "pre-wrap" }}>{message.body}</Typography><Typography sx={{ display: "block", mt: .7, opacity: .7, fontSize: 11 }}>{message.senderType === "customer" ? "You" : "PixlPush Support"} · {new Date(message.createdAt).toLocaleString()}</Typography></Box>)}</Stack><Stack component="form" direction="row" gap={1} onSubmit={(event) => { event.preventDefault(); if (draft.trim()) onSend(); }}><TextField fullWidth multiline maxRows={4} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={closed ? "Reopen this request to reply" : "Write a reply to PixlPush Support"} disabled={closed || sending} /><Button type="submit" variant="contained" endIcon={<SendRounded />} disabled={!draft.trim() || closed || sending}>{sending ? "Sending" : "Reply"}</Button></Stack></>;
}
