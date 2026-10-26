"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import CreditCardRounded from "@mui/icons-material/CreditCardRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import LockRounded from "@mui/icons-material/LockRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import type { SupportTicket, SupportTopic } from "@/lib/support/api";
import { supportApi } from "@/lib/support/api";

type SupportTopicOption = { label: string; value: SupportTopic; icon: typeof BoltRounded };

const supportTopics: SupportTopicOption[] = [
  { label: "Campaigns", value: "campaigns", icon: BoltRounded },
  { label: "Integrations", value: "integrations", icon: CodeRounded },
  { label: "Billing", value: "billing", icon: CreditCardRounded },
  { label: "Other help", value: "general", icon: HelpOutlineRounded },
];

const timeOf = (value: string | Date) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));

export default function SupportChatWidget({
  showLauncher = true,
  isOpen,
  onClose,
  projectId,
  authenticated = false,
}: {
  showLauncher?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  projectId?: string;
  authenticated?: boolean;
} = {}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen ?? localOpen;
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SupportTopic>("general");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const changeOpen = (next: boolean) => {
    setLocalOpen(next);
    if (!next) onClose?.();
  };

  useEffect(() => {
    if (!open) return;
    // Do not autofocus the guest email field: Chrome opens its native address
    // suggestions over the support form as soon as the widget opens. Once a
    // ticket exists, focusing the reply composer is useful and does not expose
    // a personal-data autofill menu.
    if (!ticket) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open, ticket]);

  useEffect(() => {
    if (!open || !authenticated || ticket) return;
    let cancelled = false;
    void supportApi.list().then((result) => {
      if (!cancelled && result.items[0]) void supportApi.get(result.items[0].id).then(setTicket).catch(() => undefined);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [authenticated, open, ticket]);

  useEffect(() => {
    if (!open || !ticket || ["closed", "resolved"].includes(ticket.status)) return;
    const poll = window.setInterval(() => {
      void supportApi.get(ticket.id).then(setTicket).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(poll);
  }, [open, ticket]);

  const startTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!authenticated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address to start.");
      return;
    }
    if (!message) {
      setError("Tell us what you need help with so we can create your ticket.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await supportApi.create({
        ...(authenticated ? {} : { email: email.trim() }),
        topic: selectedTopic,
        subject: subject.trim() || undefined,
        message,
        projectId,
        source: authenticated ? "dashboard" : "website",
      });
      setTicket(result.ticket);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start support. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!ticket || !message || busy) return;
    setBusy(true);
    setError("");
    try {
      setTicket(await supportApi.send(ticket.id, message));
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your message.");
    } finally {
      setBusy(false);
    }
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (ticket) void sendMessage();
    }
  };

  if (!showLauncher && !open) return null;

  return (
    <Box sx={{ position: "fixed", right: { xs: 16, sm: 26 }, bottom: { xs: 16, sm: 24 }, zIndex: 1400 }}>
      {open && (
        <Paper elevation={0} role="dialog" aria-label="PixlPush support chat" sx={{ position: "absolute", right: 0, bottom: showLauncher ? 80 : 0, display: "flex", width: { xs: "min(calc(100vw - 32px), 410px)", sm: 410 }, height: ticket ? { xs: "min(580px, calc(100dvh - 104px))", sm: 580 } : "auto", maxHeight: { xs: "calc(100dvh - 104px)", sm: "none" }, flexDirection: "column", overflow: "hidden", border: "1px solid rgba(226,207,247,.22)", borderRadius: "28px", bgcolor: "#160d20", color: "#f8f3fc", boxShadow: "0 32px 100px rgba(9, 3, 18, .62)", animation: "supportChatEnter .28s cubic-bezier(.2,.8,.2,1) both", "@keyframes supportChatEnter": { from: { opacity: 0, transform: "translateY(16px) scale(.96)" }, to: { opacity: 1, transform: "translateY(0) scale(1)" } } }}>
          <Stack direction="row" alignItems="center" gap={1.35} sx={{ px: { xs: 2, sm: 2.4 }, py: 2, borderBottom: "1px solid rgba(226,207,247,.13)", background: "linear-gradient(135deg, rgba(63,31,86,.95), rgba(37,20,53,.9))" }}>
            <Box sx={{ display: "grid", width: 42, height: 42, placeItems: "center", border: "1px solid rgba(255,211,110,.46)", borderRadius: "14px", color: "#291534", background: "linear-gradient(145deg, #ffd36e, #ff914f)" }}><SupportAgentRounded sx={{ fontSize: 23 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={.8}><Typography sx={{ fontSize: 15, fontWeight: 800 }}>Contact PixlPush Support</Typography><Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#69d39b" }} /></Stack>
              <Typography sx={{ mt: .35, color: "rgba(255,255,255,.62)", fontSize: 10.5 }}>{ticket ? ticket.reference : "Get help from the PixlPush team"}</Typography>
            </Box>
            <IconButton aria-label="Close support chat" onClick={() => changeOpen(false)} size="small" sx={{ color: "rgba(255,255,255,.75)" }}><CloseRounded fontSize="small" /></IconButton>
          </Stack>

          {!ticket ? (
            <Box component="form" onSubmit={startTicket} sx={{ display: "flex", flexDirection: "column", p: { xs: 2, sm: 2.5 }, background: "linear-gradient(180deg, rgba(27,17,38,.82), rgba(22,13,32,.98))" }}>
              <Typography sx={{ color: "#ffc66d", fontSize: 10, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase" }}>Contact support</Typography>
              <Typography sx={{ mt: .7, color: "#fff", fontSize: { xs: 25, sm: 28 }, fontWeight: 750, lineHeight: 1.08 }}>What can we help you with?</Typography>
              <Typography sx={{ mt: .85, mb: 1.7, color: "rgba(248,243,252,.66)", fontSize: 12.5, lineHeight: 1.55 }}>Choose a topic and send your question. We’ll create a support ticket so the conversation stays together.</Typography>
              <Stack direction="row" flexWrap="wrap" gap={.8} sx={{ mb: 1.7 }}>
                {supportTopics.map(({ label, value, icon: Icon }) => {
                  const selected = selectedTopic === value;
                  return <Box component="button" type="button" key={value} onClick={() => setSelectedTopic(value)} sx={{ display: "flex", flex: "1 1 45%", minWidth: 0, alignItems: "center", gap: .7, px: 1.1, py: 1, border: `1px solid ${selected ? "rgba(255,198,109,.6)" : "rgba(226,207,247,.16)"}`, borderRadius: "14px", color: selected ? "#ffd36e" : "rgba(248,243,252,.72)", bgcolor: selected ? "rgba(255,198,109,.12)" : "rgba(255,255,255,.045)", fontSize: 10.5, fontWeight: 750, cursor: "pointer" }}><Icon sx={{ fontSize: 17 }} /><Box component="span">{label}</Box></Box>;
                })}
              </Stack>
              {!authenticated && <TextField fullWidth size="small" type="email" name="support-contact-email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} label="Your work email" placeholder="you@company.com" aria-label="Your email address" autoComplete="off" inputProps={{ autoCapitalize: "none", spellCheck: "false", autoComplete: "off", "data-lpignore": "true", "data-1p-ignore": "true" }} sx={{ mb: 1.1, "& .MuiOutlinedInput-root": { borderRadius: "12px", color: "#fff", bgcolor: "rgba(9,4,16,.36)", "& fieldset": { borderColor: "rgba(226,207,247,.42)" }, "&:hover fieldset": { borderColor: "rgba(248,243,252,.72)" }, "&.Mui-focused fieldset": { borderColor: "#ffc66d", borderWidth: 2 }, "& input:-webkit-autofill": { WebkitBoxShadow: "0 0 0 100px #24152f inset", WebkitTextFillColor: "#fff", caretColor: "#fff", borderRadius: "12px" } }, "& label": { color: "rgba(248,243,252,.7)" }, "& label.Mui-focused": { color: "#ffc66d" } }} />}
              <TextField fullWidth multiline minRows={3} maxRows={6} value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} label="How can we help?" placeholder="Tell us what you’re trying to do…" sx={{ mb: 1.1, "& .MuiOutlinedInput-root": { borderRadius: "12px", color: "#fff", bgcolor: "rgba(9,4,16,.36)", "& fieldset": { borderColor: "rgba(226,207,247,.42)" }, "&:hover fieldset": { borderColor: "rgba(248,243,252,.72)" }, "&.Mui-focused fieldset": { borderColor: "#ffc66d", borderWidth: 2 } }, "& label": { color: "rgba(248,243,252,.7)" }, "& label.Mui-focused": { color: "#ffc66d" } }} />
              <TextField fullWidth size="small" value={subject} onChange={(event) => setSubject(event.target.value)} label="Subject (optional)" sx={{ mb: 1.1, "& .MuiOutlinedInput-root": { borderRadius: "12px", color: "#fff", bgcolor: "rgba(9,4,16,.36)", "& fieldset": { borderColor: "rgba(226,207,247,.42)" }, "&:hover fieldset": { borderColor: "rgba(248,243,252,.72)" }, "&.Mui-focused fieldset": { borderColor: "#ffc66d", borderWidth: 2 } }, "& label": { color: "rgba(248,243,252,.7)" }, "& label.Mui-focused": { color: "#ffc66d" } }} />
              {error && <Typography role="alert" sx={{ mb: 1, color: "#ffad9e", fontSize: 11 }}>{error}</Typography>}
              <Box component="button" type="submit" disabled={busy} sx={{ display: "flex", width: "100%", minHeight: 46, alignItems: "center", justifyContent: "center", gap: .7, border: 0, borderRadius: "12px", color: "#291534", background: "linear-gradient(100deg, #ffd36e, #ff914f)", fontFamily: "inherit", fontSize: 12, fontWeight: 850, cursor: busy ? "wait" : "pointer", opacity: busy ? .75 : 1 }}>{busy ? <CircularProgress size={17} sx={{ color: "#291534" }} /> : <>Create support ticket <ArrowForwardRounded sx={{ fontSize: 16 }} /></>}</Box>
              {!authenticated && <Typography sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: .5, mt: 1.1, color: "rgba(248,243,252,.42)", fontSize: 9.5 }}><LockRounded sx={{ fontSize: 11 }} /> Your email is used only to keep this ticket together.</Typography>}
            </Box>
          ) : (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.2, borderBottom: "1px solid rgba(226,207,247,.1)", bgcolor: "rgba(255,255,255,.025)" }}><Stack direction="row" alignItems="center" gap={.8}><Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: ticket.status === "closed" ? "#ff8b83" : "#69d39b" }} /><Typography sx={{ color: "rgba(248,243,252,.64)", fontSize: 10 }}>{ticket.status.replaceAll("_", " ")}</Typography></Stack><Typography sx={{ color: "rgba(248,243,252,.42)", fontSize: 9.5 }}>{ticket.topic}</Typography></Stack>
              <Box sx={{ display: "flex", flex: 1, flexDirection: "column", gap: 1.7, overflowY: "auto", px: 2, py: 2, bgcolor: "rgba(22,13,32,.84)" }}>
                {(ticket.messages ?? []).map((message) => { const customer = message.senderType === "customer"; return <Stack key={message.id} direction="row" justifyContent={customer ? "flex-end" : "flex-start"} alignItems="flex-end" gap={.8}>{!customer && <Avatar sx={{ width: 28, height: 28, color: "#291534", bgcolor: "#ffc66d" }}><AutoAwesomeRounded sx={{ fontSize: 16 }} /></Avatar>}<Box sx={{ maxWidth: "82%" }}><Typography sx={{ mb: .45, color: "rgba(248,243,252,.42)", fontSize: 10 }}>{customer ? "You" : "PixlPush Support"}</Typography><Box sx={{ p: 1.4, borderRadius: customer ? "16px 5px 16px 16px" : "5px 16px 16px 16px", color: "#f8f3fc", bgcolor: customer ? "#7444df" : "rgba(255,255,255,.07)", border: customer ? "none" : "1px solid rgba(226,207,247,.14)" }}><Typography sx={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.6 }}>{message.body}</Typography></Box><Typography sx={{ mt: .45, color: "rgba(248,243,252,.38)", fontSize: 9, textAlign: customer ? "right" : "left" }}>{timeOf(message.createdAt)}</Typography></Box></Stack>; })}
              </Box>
              <Box component="form" onSubmit={sendMessage} sx={{ p: 1.5, borderTop: "1px solid rgba(226,207,247,.13)", bgcolor: "rgba(33,21,45,.96)" }}><Stack direction="row" alignItems="center" gap={.7} sx={{ p: .55, pl: 1.35, border: "1px solid rgba(226,207,247,.19)", borderRadius: "15px", bgcolor: "rgba(255,255,255,.04)" }}><TextField inputRef={inputRef} fullWidth size="small" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask a question…" inputProps={{ "aria-label": "Type your message" }} sx={{ "& .MuiInputBase-root": { p: 0, color: "#fff", fontSize: 13 }, "& fieldset": { border: "none" } }} /><IconButton type="submit" aria-label="Send message" disabled={!draft.trim() || busy} sx={{ width: 37, height: 37, color: "#291534", bgcolor: "#ffc66d" }}>{busy ? <CircularProgress size={16} /> : <SendRounded sx={{ fontSize: 17 }} />}</IconButton></Stack>{error && <Typography role="alert" sx={{ mt: .8, color: "#ffad9e", fontSize: 10 }}>{error}</Typography>}<Typography sx={{ mt: .8, color: "rgba(248,243,252,.35)", fontSize: 9, textAlign: "center" }}>Your message will be added to ticket {ticket.reference}.</Typography></Box>
            </>
          )}
        </Paper>
      )}
      {showLauncher && <Box sx={{ position: "relative", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>{!open && <Paper elevation={0} sx={{ mr: 1.25, px: 1.25, py: .8, border: "1px solid rgba(226,207,247,.22)", borderRadius: "14px 14px 5px 14px", color: "#f8f3fc", bgcolor: "rgba(33,21,45,.92)" }}><Typography sx={{ color: "#ffd36e", fontSize: 11, fontWeight: 800 }}>Contact support</Typography><Typography sx={{ mt: .15, color: "rgba(248,243,252,.62)", fontSize: 9 }}>We’re here to help</Typography></Paper>}<IconButton onClick={() => changeOpen(!open)} aria-label={open ? "Close support chat" : "Open PixlPush support chat"} aria-expanded={open} sx={{ position: "relative", zIndex: 1, width: 68, height: 68, minWidth: 68, p: 0, borderRadius: "50% !important", color: "#291534", background: "linear-gradient(145deg,#ffd36e 0%,#ff914f 46%,#8a42dc 100%)", border: "3px solid rgba(255,255,255,.94)", boxShadow: "0 0 0 5px rgba(169,107,234,.1), 0 15px 38px rgba(34,14,56,.38)" }}>{open ? <CloseRounded /> : <SupportAgentRounded sx={{ fontSize: 28 }} />}</IconButton></Box>}
    </Box>
  );
}
