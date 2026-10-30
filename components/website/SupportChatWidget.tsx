"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { Avatar, Badge, Box, Button, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";
import type { SupportChatMessage, SupportTicket, SupportTopic } from "@/lib/support/api";
import { supportApi } from "@/lib/support/api";

type ChatLine = SupportChatMessage & { id: string; links?: Array<{ label: string; href: string }> };
type SalesDetails = { name: string; company: string; users: string; industry: string; channels: string };
const topics: Array<{ label: string; value: SupportTopic }> = [
  { label: "Campaigns", value: "campaigns" }, { label: "Integrations", value: "integrations" },
  { label: "Billing", value: "billing" }, { label: "Other help", value: "general" },
];
const timeOf = (value: string | Date) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
const initialChat: ChatLine = { id: "welcome", role: "assistant", content: "Hi! I can answer product and pricing questions, help with a special offer, or connect you with our support team." };
/** PixlPush "P" mark, filled in the dark brand ink so it reads on the yellow avatar. */
const markMask = "url(/assets/pixlpush-mark-mask.png) center / contain no-repeat";
const BrandMark = () => <Box aria-hidden="true" sx={{ width: 13, height: 18, bgcolor: "#291534", mask: markMask, WebkitMask: markMask }} />;
const responseDelayMs = 650;
const adminCount = (ticket: SupportTicket) => (ticket.messages ?? []).filter((message) => message.senderType === "admin").length;
const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function supportRouteHref(href: string): string {
  if (typeof window === "undefined") return href;
  try {
    const url = new URL(href, window.location.origin);
    // The backend may use a different local development port in FRONTEND_URL.
    // Keep trusted support links on this running frontend origin instead of
    // navigating to a dead dev-server port.
    if (url.protocol === "http:" || url.protocol === "https:") return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
  return href;
}

export default function SupportChatWidget({ showLauncher = true, isOpen, onClose, onUnreadChange, projectId, authenticated = false }: { showLauncher?: boolean; isOpen?: boolean; onClose?: () => void; onUnreadChange?: (count: number) => void; projectId?: string; authenticated?: boolean } = {}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen ?? localOpen;
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [ticketDetails, setTicketDetails] = useState("");
  const [draft, setDraft] = useState("");
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [ticketHistory, setTicketHistory] = useState<SupportTicket[]>([]);
  const [showTicketHistory, setShowTicketHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [selectedTopic, setSelectedTopic] = useState<SupportTopic>("general");
  const [chat, setChat] = useState<ChatLine[]>([initialChat]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showSalesForm, setShowSalesForm] = useState(false);
  const [sales, setSales] = useState<SalesDetails>({ name: "", company: "", users: "", industry: "", channels: "" });
  const [busy, setBusy] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const supportFormRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const scrollBehaviorRef = useRef<ScrollBehavior>("auto");
  const openRef = useRef(open);
  const previousAuthenticated = useRef(authenticated);
  const createRequestRef = useRef<{ signature: string; key: string } | null>(null);
  const sendRequestRef = useRef<{ ticketId: string; message: string; key: string } | null>(null);
  const seenAdminRef = useRef(0);
  // "Support is typing" from the admin's live signal; hides after 6s of silence.
  const [supportTyping, setSupportTyping] = useState(false);
  const typingTimerRef = useRef<number | undefined>(undefined);
  const [startedFresh, setStartedFresh] = useState(false);
  const reopenTicket = async () => {
    if (!ticket || busy) return;
    setBusy(true); setError("");
    try {
      const updated = await supportApi.reopen(ticket.id);
      setTicket(updated);
      setTicketHistory((current) => current.map((item) => item.id === updated.id ? updated : item));
      window.setTimeout(() => inputRef.current?.focus(), 50);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to reopen this conversation."); }
    finally { setBusy(false); }
  };
  const startNewChat = () => { setTicket(null); setStartedFresh(true); setShowTicketHistory(false); setConversationId(undefined); setChat([initialChat]); setDraft(""); setError(""); setShowTicketForm(false); setShowSalesForm(false); setSubject(""); setTicketDetails(""); seenAdminRef.current = 0; };
  const viewAllChats = () => {
    setShowTicketHistory(true);
    setError("");
    void supportApi.list().then((result) => setTicketHistory(result.items)).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Unable to load your chats.");
    });
  };
  const openHistoryTicket = async (id: string) => {
    setError("");
    try {
      const full = await supportApi.get(id);
      setTicket(full);
      setStartedFresh(false);
      setShowTicketHistory(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this chat.");
    }
  };
  const changeOpen = (next: boolean) => { openRef.current = next; scrollBehaviorRef.current = "auto"; setLocalOpen(next); if (next) setUnreadCount(0); else onClose?.(); };

  useEffect(() => {
    openRef.current = open;
    if (open) setUnreadCount(0);
  }, [open]);

  useEffect(() => { onUnreadChange?.(unreadCount); }, [onUnreadChange, unreadCount]);

  useEffect(() => {
    if (previousAuthenticated.current === authenticated) return;
    const wasAuthenticated = previousAuthenticated.current;
    previousAuthenticated.current = authenticated;
    // A false -> true transition is the normal session hydration path on a
    // landing page. Do not mistake that initial auth resolution for logout;
    // clearing here made a conversation disappear immediately after reload.
    // Only clear private state on a real signed-in -> signed-out transition.
    if (!wasAuthenticated || authenticated) return;
    // Do not carry a private conversation or draft across a real logout.
    setTicket(null);
    setConversationId(undefined);
    setChat([initialChat]);
    setDraft("");
    setEmail("");
    setSubject("");
    setTicketDetails("");
    setSelectedTopic("general");
    setShowTicketForm(false);
    setShowSalesForm(false);
    setSales({ name: "", company: "", users: "", industry: "", channels: "" });
    setBusy(false);
    setUnreadCount(0);
    setError("");
    openRef.current = false;
    setLocalOpen(false);
    onClose?.();
  }, [authenticated, onClose]);

  // Restore the visitor's active ticket on page load (not only when opened),
  // so a reload keeps the thread and replies can raise the unread badge.
  useEffect(() => {
    if (ticket || startedFresh) return;
    let cancelled = false;
    void Promise.resolve().then(() => supportApi.list()).then((result) => {
      if (cancelled || !result) return;
      setTicketHistory(result.items);
      // Prefer an open ticket; otherwise follow the latest one so a support
      // reply to a closed ticket (which reopens it) still lights the badge.
      const active = result.items.find((item) => item.status !== "closed") ?? result.items[0];
      if (active) void supportApi.get(active.id).then((full) => { if (!cancelled) { seenAdminRef.current = adminCount(full); setTicket(full); } }).catch(() => undefined);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [authenticated, ticket, startedFresh]);

  // Email links for guests: /?support_access=<token> opens that ticket here.
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("support_access");
    if (!token) return;
    url.searchParams.delete("support_access");
    window.history.replaceState(null, "", url.toString());
    void fetch("/api/support/access", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        const payload = await response.json().catch(() => undefined);
        if (!response.ok) throw new Error(payload?.error?.message ?? "This support link is no longer valid.");
        const full = await supportApi.get(payload.data.ticketId);
        seenAdminRef.current = adminCount(full);
        setTicket(full);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "This support link is no longer valid."))
      .finally(() => changeOpen(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open || ticket || startedFresh) return;
    let cancelled = false;
    void supportApi.listConversations().then((result) => {
      const latest = result.items[0];
      if (cancelled || !latest) return;
      void supportApi.getConversation(latest.id).then((conversation) => {
        if (cancelled || !conversation.messages?.length) return;
        scrollBehaviorRef.current = "auto";
        setConversationId(conversation.id);
        setChat(conversation.messages.filter((message) => message.role !== "system").map((message) => {
          const metadata = message.metadata ?? {};
          return {
            id: message.id,
            role: message.role === "user" ? "user" : "assistant",
            content: message.body,
            links: Array.isArray(metadata.links) ? metadata.links as Array<{ label: string; href: string }> : undefined,
          };
        }));
      }).catch(() => undefined);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [authenticated, open, ticket, startedFresh]);

  // Listen for support replies even while the widget is closed: a reply to a
  // resolved/closed ticket reopens it, and new replies raise the unread badge.
  const ticketId = ticket?.id;
  const ticketRef = useRef(ticket);
  ticketRef.current = ticket;
  useEffect(() => {
    if (!ticketId) return;
    // Replies already on screen when we start following this ticket are seen.
    seenAdminRef.current = ticketRef.current ? adminCount(ticketRef.current) : 0;
    const refreshTicket = () => {
      void supportApi.get(ticketId).then((updated) => {
        const replies = adminCount(updated);
        // Compute the delta now: the state updater runs later, after the ref moves on.
        const fresh = replies - seenAdminRef.current;
        if (fresh > 0 && !openRef.current) setUnreadCount((current) => current + fresh);
        if (replies > seenAdminRef.current) { window.clearTimeout(typingTimerRef.current); setSupportTyping(false); }
        seenAdminRef.current = replies;
        setTicket(updated);
        setTicketHistory((current) => current.map((item) => item.id === updated.id ? updated : item));
      }).catch(() => undefined);
    };
    const onTyping = () => {
      setSupportTyping(true);
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = window.setTimeout(() => setSupportTyping(false), 6_000);
    };
    const stop = supportApi.stream(ticketId, refreshTicket, onTyping);
    return () => { stop(); window.clearTimeout(typingTimerRef.current); setSupportTyping(false); };
  }, [ticketId]);

  // Read receipt: replies count as seen only while the chat is open and the
  // tab is visible. Anything else (closed widget, background tab, left the
  // site) leaves them unseen so the backend emails the customer.
  const visibleReplies = ticket ? adminCount(ticket) : 0;
  useEffect(() => {
    if (!open || !ticketId || !visibleReplies) return;
    const report = () => { if (document.visibilityState === "visible") void supportApi.seen(ticketId); };
    report();
    document.addEventListener("visibilitychange", report);
    return () => document.removeEventListener("visibilitychange", report);
  }, [open, ticketId, visibleReplies]);

  useEffect(() => {
    if (!open || !ticket) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => window.clearTimeout(timer);
  }, [open, ticket]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const formOpen = showTicketForm || showSalesForm;
      const target = formOpen ? supportFormRef.current : messageEndRef.current;
      if (target && typeof target.scrollIntoView === "function") {
        const behavior = scrollBehaviorRef.current;
        scrollBehaviorRef.current = "auto";
        target.scrollIntoView({ behavior, block: formOpen ? "start" : "end" });
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, ticket?.id, ticket?.messages?.length, chat.length, assistantTyping, supportTyping, showTicketForm, showSalesForm, error, ticket]);

  const transcript = () => chat.map((line) => `${line.role === "user" ? "Customer" : "PixlPush assistant"}: ${line.content}`).join("\n\n");
  const askChatbot = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    scrollBehaviorRef.current = "smooth";
    const userLine: ChatLine = { id: crypto.randomUUID(), role: "user", content: message };
    setDraft(""); setChat((current) => [...current, userLine]); setBusy(true); setAssistantTyping(true); setError("");
    const startedAt = performance.now();
    try {
      const answer = await supportApi.chat(message, chat.map(({ role, content }) => ({ role, content })), { conversationId, projectId, idempotencyKey: crypto.randomUUID() });
      await wait(Math.max(0, responseDelayMs - (performance.now() - startedAt)));
      if (answer.conversationId) setConversationId(answer.conversationId);
      setSelectedTopic(answer.topic);
      setChat((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: answer.reply, links: answer.links }]);
      if (!openRef.current) setUnreadCount((current) => current + 1);
      if (answer.salesForm) { setShowSalesForm(true); setShowTicketForm(false); }
      else if (answer.handoff) { setShowSalesForm(false); setTicketDetails(message); setShowTicketForm(true); }
      else { setShowSalesForm(false); setShowTicketForm(false); }
    } catch (caught) { await wait(Math.max(0, responseDelayMs - (performance.now() - startedAt))); setError(caught instanceof Error ? caught.message : "The assistant is unavailable. You can still create a ticket."); setShowTicketForm(true); if (!openRef.current) setUnreadCount((current) => current + 1); }
    finally { setAssistantTyping(false); setBusy(false); }
  };

  const createTicket = async (event: FormEvent, salesRequest = false) => {
    event.preventDefault();
    const finalMessage = salesRequest
      ? `Special offer request\nName: ${sales.name}\nCompany: ${sales.company}\nUsers: ${sales.users}\nIndustry: ${sales.industry}\nChannels: ${sales.channels}\n\nConversation:\n${transcript()}`
      : `Issue details:\n${ticketDetails.trim()}\n\nConversation with PixlPush assistant:\n${transcript()}`;
    if (!authenticated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("Enter a valid email address to start."); return; }
    if (!salesRequest && !subject.trim()) { setError("Add a short subject so the support team can route your request."); return; }
    if (!salesRequest && !ticketDetails.trim()) { setError("Describe the issue so the support team can help faster."); return; }
    if (salesRequest && (!sales.users.trim() || !sales.industry.trim() || !sales.channels.trim())) { setError("Add your user count, industry, and preferred channels."); return; }
    const payload = { ...(authenticated ? {} : { email: email.trim() }), topic: salesRequest ? "general" : selectedTopic, subject: salesRequest ? "Special offer request" : subject.trim() || "Support request", message: finalMessage, projectId, source: authenticated ? "dashboard" as const : "website" as const };
    const signature = JSON.stringify(payload);
    const createRequest = createRequestRef.current?.signature === signature ? createRequestRef.current : { signature, key: crypto.randomUUID() };
    createRequestRef.current = createRequest;
    setBusy(true); setError("");
    try {
      const result = await supportApi.create({ ...payload, idempotencyKey: createRequest.key });
      createRequestRef.current = null;
      setTicketHistory((current) => [result.ticket, ...current.filter((item) => item.id !== result.ticket.id)]);
      seenAdminRef.current = 0; setStartedFresh(false);
      setTicket(result.ticket); setShowTicketForm(false); setShowSalesForm(false); setDraft("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create the support ticket."); }
    finally { setBusy(false); }
  };

  const sendMessage = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = draft.trim();
    if (!ticket || !message || busy) return;
    scrollBehaviorRef.current = "smooth";
    const sendRequest = sendRequestRef.current?.ticketId === ticket.id && sendRequestRef.current.message === message ? sendRequestRef.current : { ticketId: ticket.id, message, key: crypto.randomUUID() };
    sendRequestRef.current = sendRequest;
    setBusy(true); setError("");
    try { setTicket(await supportApi.send(ticket.id, message, sendRequest.key)); sendRequestRef.current = null; setDraft(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to send your message."); }
    finally { setBusy(false); }
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if (ticket) void sendMessage(); else void askChatbot(); } };
  if (!showLauncher && !open) return null;

  const fieldSx = {
    "& .MuiInputBase-root": { color: "#fff", bgcolor: "#21152d" },
    "& .MuiOutlinedInput-root": {
      color: "#fff",
      bgcolor: "#21152d",
      "& fieldset": { borderColor: "rgba(226,207,247,.42)" },
      "&:hover fieldset": { borderColor: "rgba(255,211,110,.72)" },
      "&.Mui-focused fieldset": { borderColor: "#ffd36e", borderWidth: 2 },
    },
    "& .MuiInputBase-input": { color: "#fff", WebkitTextFillColor: "#fff", caretColor: "#ffd36e" },
    "& .MuiInputLabel-root": { color: "rgba(248,243,252,.72)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#ffd36e" },
    "& input:-webkit-autofill, & textarea:-webkit-autofill": { WebkitBoxShadow: "0 0 0 100px #21152d inset", WebkitTextFillColor: "#fff", caretColor: "#ffd36e" },
  };
  const composerSx = {
    "& .MuiInputBase-root": { p: 0, color: "#fff", bgcolor: "transparent", fontSize: 13 },
    "& .MuiInputBase-input": { color: "#fff", bgcolor: "transparent", WebkitTextFillColor: "#fff", caretColor: "#ffd36e" },
    "& input, & textarea": { color: "#fff", bgcolor: "transparent", WebkitTextFillColor: "#fff", caretColor: "#ffd36e" },
    "& input::placeholder, & textarea::placeholder": { color: "rgba(248,243,252,.55)", opacity: 1 },
    "& input:-webkit-autofill, & textarea:-webkit-autofill": { WebkitBoxShadow: "0 0 0 100px #21152d inset", WebkitTextFillColor: "#fff", caretColor: "#ffd36e" },
    "& fieldset": { border: "none" },
  };
  const sendButtonSx = {
    width: 37,
    height: 37,
    color: "#291534",
    bgcolor: "#ffc66d",
    transition: "transform .18s ease, background-color .18s ease, box-shadow .18s ease",
    "&:hover": { bgcolor: "#ffd36e", color: "#291534", transform: "translateY(-1px) scale(1.04)", boxShadow: "0 5px 14px rgba(255, 198, 109, .32)" },
    "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
    "&.Mui-disabled": { bgcolor: "rgba(255,198,109,.42)", color: "rgba(41,21,52,.55)" },
  };
  const actionButtonSx = {
    bgcolor: "#ffc66d",
    color: "#291534",
    fontWeight: 800,
    "&:hover": { bgcolor: "#ffd36e", color: "#291534", boxShadow: "0 6px 16px rgba(255,198,109,.25)" },
    "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
    "&.Mui-disabled": { bgcolor: "rgba(255,198,109,.42)", color: "rgba(41,21,52,.55)" },
  };
  const topicOptionSx = (selected: boolean) => ({
    flex: "1 1 45%",
    minWidth: 0,
    minHeight: 40,
    px: 1,
    border: `1px solid ${selected ? "#ffd36e" : "rgba(226,207,247,.34)"}`,
    borderRadius: 1.5,
    color: selected ? "#291534" : "rgba(248,243,252,.78)",
    bgcolor: selected ? "#ffd36e" : "rgba(255,255,255,.035)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "none",
    "&:hover": { bgcolor: selected ? "#ffe08c" : "rgba(255,211,110,.12)", borderColor: "#ffd36e", color: selected ? "#291534" : "#ffd36e" },
    "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
  });
  const linkButtonSx = {
    minWidth: 0,
    px: 1,
    color: "#ffd36e",
    bgcolor: "#21152d",
    borderColor: "rgba(255,211,110,.55)",
    fontSize: 10,
    textTransform: "none",
    "&:hover": { color: "#291534", bgcolor: "#ffd36e", borderColor: "#ffd36e" },
    "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
  };
  const scrollAreaSx = {
    scrollbarWidth: "thin",
    scrollbarColor: "#72528e rgba(255,255,255,.06)",
    "&::-webkit-scrollbar": { width: 9, height: 9 },
    "&::-webkit-scrollbar-track": { background: "rgba(255,255,255,.045)", borderRadius: 999 },
    "&::-webkit-scrollbar-thumb": { background: "#72528e", border: "2px solid #160d20", borderRadius: 999 },
    "&::-webkit-scrollbar-thumb:hover": { background: "#a474c4" },
    "&::-webkit-scrollbar-corner": { background: "transparent" },
  };
  return <Box sx={{ position: "fixed", right: { xs: 16, sm: 26 }, bottom: { xs: 16, sm: 24 }, zIndex: 1400 }}>
    {open && <Paper elevation={0} role="dialog" aria-label="PixlPush support chat" sx={{ position: "absolute", right: 0, bottom: showLauncher ? 80 : 0, display: "flex", width: { xs: "min(calc(100vw - 32px), 410px)", sm: 410 }, height: { xs: "min(680px, calc(100dvh - 104px))", sm: 680 }, maxHeight: "calc(100dvh - 104px)", flexDirection: "column", overflow: "hidden", border: "1px solid rgba(226,207,247,.22)", borderRadius: "28px", bgcolor: "#160d20", color: "#f8f3fc", boxShadow: "0 32px 100px rgba(9, 3, 18, .62)" }}>
      <Stack direction="row" alignItems="center" gap={1.35} sx={{ px: 2.4, py: 2, borderBottom: "1px solid rgba(226,207,247,.13)", background: "linear-gradient(135deg, rgba(63,31,86,.95), rgba(37,20,53,.9))" }}><Box sx={{ display: "grid", width: 42, height: 42, flexShrink: 0, placeItems: "center", borderRadius: "14px", color: "#291534", background: "linear-gradient(145deg, #ffd36e, #ff914f)" }}><SupportAgentRounded /></Box><Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontSize: 15, fontWeight: 800 }}>PixlPush Support</Typography><Typography sx={{ mt: .35, color: "rgba(255,255,255,.62)", fontSize: 10.5 }}>{ticket ? ticket.reference : "Ask the assistant or contact our team"}</Typography>{!ticket && startedFresh && <Button size="small" startIcon={<ArrowBackRounded sx={{ fontSize: 15 }} />} onClick={viewAllChats} sx={{ mt: .25, ml: -.5, minWidth: 0, px: .5, color: "#ffd36e", fontSize: 9.5, fontWeight: 700, whiteSpace: "nowrap", textTransform: "none" }}>View all chats</Button>}</Box><IconButton className="support-chat-close-button" aria-label="Close support chat" onClick={() => changeOpen(false)} size="small" sx={{ color: "rgba(255,255,255,.75)" }}><CloseRounded fontSize="small" /></IconButton></Stack>
      {!ticket ? <>
        {showTicketHistory && <Box role="region" aria-label="All support chats" sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.5, py: 1.5, bgcolor: "rgba(22,13,32,.84)", ...scrollAreaSx }}><Typography sx={{ px: .5, pb: 1, color: "rgba(248,243,252,.7)", fontSize: 12, fontWeight: 700 }}>Your chats</Typography>{ticketHistory.length ? ticketHistory.map((item) => <Button key={item.id} fullWidth onClick={() => void openHistoryTicket(item.id)} sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: .6, px: 1.2, py: 1, color: "#f8f3fc", textAlign: "left", bgcolor: "rgba(255,255,255,.045)", border: "1px solid rgba(226,207,247,.1)", borderRadius: 1.5, textTransform: "none", "&:hover": { bgcolor: "rgba(169,107,234,.16)" } }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject || item.reference}</span><span style={{ flexShrink: 0, opacity: .62, fontSize: 10 }}>{item.status.replaceAll("_", " ")}</span></Button>) : <Typography sx={{ px: .5, py: 1, color: "rgba(248,243,252,.58)", fontSize: 11 }}>No previous chats yet.</Typography>}{error && <Typography role="alert" sx={{ px: .5, py: 1, color: "#ffad9e", fontSize: 11 }}>{error}</Typography>}</Box>}
        <Box sx={{ display: showTicketHistory ? "none" : "flex", flex: 1, minHeight: 0, flexDirection: "column", overflowY: "auto", px: 2, py: 2, bgcolor: "rgba(22,13,32,.84)", ...scrollAreaSx }}><Stack gap={1.7}>{chat.map((line) => <Stack key={line.id} direction="row" justifyContent={line.role === "user" ? "flex-end" : "flex-start"} alignItems="flex-end" gap={.8}>{line.role === "assistant" && <Avatar sx={{ width: 28, height: 28, color: "#291534", bgcolor: "#ffc66d" }}><BrandMark /></Avatar>}<Box sx={{ maxWidth: "86%" }}><Typography sx={{ mb: .45, color: "rgba(248,243,252,.42)", fontSize: 10 }}>{line.role === "user" ? "You" : "PixlPush assistant"}</Typography><Box sx={{ p: 1.4, borderRadius: line.role === "user" ? "16px 5px 16px 16px" : "5px 16px 16px 16px", color: "#f8f3fc", bgcolor: line.role === "user" ? "#7444df" : "rgba(255,255,255,.07)", border: line.role === "user" ? "none" : "1px solid rgba(226,207,247,.14)" }}><Typography sx={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.6 }}>{line.content}</Typography>{line.links?.length ? <Stack direction="row" flexWrap="wrap" gap={.6} sx={{ mt: 1 }}>{line.links.map((link) => { const href = supportRouteHref(link.href); return <Button key={link.href} component={NextLink} href={href} onClick={() => changeOpen(false)} size="small" sx={linkButtonSx} variant="outlined">{link.label}</Button>; })}</Stack> : null}</Box></Box></Stack>)}{assistantTyping && <Stack direction="row" alignItems="flex-end" gap={.8} role="status" aria-label="PixlPush assistant is typing"><Avatar sx={{ width: 28, height: 28, color: "#291534", bgcolor: "#ffc66d" }}><BrandMark /></Avatar><Box sx={{ px: 1.35, py: 1.05, borderRadius: "5px 16px 16px 16px", color: "rgba(248,243,252,.82)", bgcolor: "rgba(255,255,255,.07)", border: "1px solid rgba(226,207,247,.14)" }}><Typography sx={{ mb: .55, color: "rgba(248,243,252,.48)", fontSize: 9.5 }}>PixlPush assistant</Typography><Stack direction="row" gap={.45} aria-hidden="true">{[0, 1, 2].map((index) => <Box key={index} sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#ffd36e", opacity: .45, animation: "supportChatTyping 1.15s ease-in-out infinite", animationDelay: `${index * 140}ms`, "@keyframes supportChatTyping": { "0%, 60%, 100%": { transform: "translateY(0)", opacity: .35 }, "30%": { transform: "translateY(-3px)", opacity: 1 } } }} />)}</Stack></Box></Stack>}</Stack>
          {showSalesForm && <Box ref={supportFormRef} component="form" onSubmit={(event) => void createTicket(event, true)} sx={{ mt: 2, p: 1.5, border: "1px solid rgba(255,198,109,.35)", borderRadius: 2, bgcolor: "rgba(255,198,109,.08)" }}><Typography sx={{ mb: 1, color: "#ffd36e", fontSize: 12, fontWeight: 800 }}>Prepare a special offer</Typography><Stack gap={1.5}>{([['name', 'Your name'], ['company', 'Company'], ['users', 'How many users?'], ['industry', 'Industry'], ['channels', 'Channels you want to use']] as const).map(([key, label]) => <TextField key={key} size="small" required={key !== "name" && key !== "company"} label={label} value={sales[key]} onChange={(event) => setSales((current) => ({ ...current, [key]: event.target.value }))} sx={fieldSx} />)}{!authenticated && <TextField size="small" required type="email" label="Your work email" value={email} onChange={(event) => setEmail(event.target.value)} sx={fieldSx} />}<Button type="submit" disabled={busy} variant="contained" sx={actionButtonSx}>Send to sales <ArrowForwardRounded sx={{ ml: .5, fontSize: 16 }} /></Button></Stack></Box>}
          {showTicketForm && !showSalesForm && <Box ref={supportFormRef} component="form" onSubmit={(event) => void createTicket(event)} sx={{ mt: 2, p: 1.5, border: "1px solid rgba(255,198,109,.35)", borderRadius: 2, bgcolor: "rgba(255,198,109,.08)" }}><Typography sx={{ mb: .4, color: "#ffd36e", fontSize: 12, fontWeight: 800 }}>Create a support ticket</Typography><Typography sx={{ mb: 1.5, color: "rgba(248,243,252,.58)", fontSize: 10.5, lineHeight: 1.45 }}>Add the key details below. Your chat transcript will be attached automatically.</Typography><Stack gap={1.5}>{!authenticated && <TextField fullWidth required type="email" size="small" label="Your work email" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} sx={fieldSx} />}<Box><Typography sx={{ mb: .7, color: "rgba(248,243,252,.72)", fontSize: 12 }}>Topic <Box component="span" sx={{ color: "#ffd36e" }}>*</Box></Typography><Stack direction="row" flexWrap="wrap" gap={.7}>{topics.map((topic) => <Button key={topic.value} type="button" aria-pressed={selectedTopic === topic.value} onClick={() => { setSelectedTopic(topic.value); setError(""); }} sx={topicOptionSx(selectedTopic === topic.value)}>{topic.label}</Button>)}</Stack></Box><TextField fullWidth required size="small" label="Subject" placeholder="What do you need help with?" value={subject} onChange={(event) => { setSubject(event.target.value); setError(""); }} sx={fieldSx} /><TextField fullWidth required multiline minRows={3} maxRows={6} label="Describe the issue" placeholder="Tell us what happened, what you expected, and any safe error message." value={ticketDetails} onChange={(event) => { setTicketDetails(event.target.value); setError(""); }} sx={fieldSx} /><Button type="submit" disabled={busy} variant="contained" sx={actionButtonSx}>Create support ticket <ArrowForwardRounded sx={{ ml: .5, fontSize: 16 }} /></Button></Stack></Box>}
          {error && <Typography role="alert" sx={{ mt: 1, color: "#ffad9e", fontSize: 11 }}>{error}</Typography>}
          <Box ref={messageEndRef} sx={{ height: "1px", flexShrink: 0 }} />
        </Box>
        {showTicketHistory ? <Box sx={{ p: 1.5, borderTop: "1px solid rgba(226,207,247,.13)", bgcolor: "rgba(33,21,45,.96)" }}><Button fullWidth onClick={() => setShowTicketHistory(false)} variant="contained" sx={actionButtonSx}>Start a new chat</Button></Box> : <Box component="form" onSubmit={(event) => void askChatbot(event)} sx={{ p: 1.5, borderTop: "1px solid rgba(226,207,247,.13)", bgcolor: "rgba(33,21,45,.96)" }}><Stack direction="row" alignItems="center" gap={.7} sx={{ p: .55, pl: 1.35, border: "1px solid rgba(226,207,247,.19)", borderRadius: "15px", bgcolor: "rgba(255,255,255,.04)" }}><TextField fullWidth size="small" value={draft} onChange={(event) => { setDraft(event.target.value); setError(""); }} onKeyDown={handleKeyDown} placeholder="Ask a question…" inputProps={{ "aria-label": "Ask support assistant" }} sx={composerSx} /><IconButton type="submit" aria-label="Send question" disabled={!draft.trim() || busy} sx={sendButtonSx}>{busy ? <CircularProgress size={16} /> : <SendRounded sx={{ fontSize: 17 }} />}</IconButton></Stack></Box>}
      </> : <>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ px: 2, py: 1.2, borderBottom: "1px solid rgba(226,207,247,.1)" }}><Typography sx={{ color: "rgba(248,243,252,.72)", fontSize: 11, textTransform: "capitalize" }}>{ticket.status.replaceAll("_", " ")}</Typography><Stack direction="row" alignItems="center" gap={.6}><Typography sx={{ color: "rgba(248,243,252,.42)", fontSize: 10 }}>{ticket.topic}</Typography><Button size="small" startIcon={<ArrowBackRounded sx={{ fontSize: 16 }} />} onClick={() => setShowTicketHistory(true)} sx={{ minWidth: 0, px: 1, color: "#d7c1ff", fontSize: 10, whiteSpace: "nowrap" }}>All chats{ticketHistory.length > 1 ? ` (${ticketHistory.length})` : ""}</Button><Button size="small" onClick={startNewChat} sx={{ minWidth: 0, px: 1, color: "#d7c1ff", fontSize: 10, whiteSpace: "nowrap" }}>New chat</Button></Stack></Stack>{showTicketHistory && <Box role="region" aria-label="All support chats" sx={{ maxHeight: 180, overflowY: "auto", px: 1.5, py: 1, borderBottom: "1px solid rgba(226,207,247,.1)", bgcolor: "rgba(255,255,255,.035)", ...scrollAreaSx }}>{ticketHistory.length ? ticketHistory.map((item) => <Button key={item.id} fullWidth onClick={() => { setShowTicketHistory(false); void supportApi.get(item.id).then(setTicket).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load this request.")); }} sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: .5, px: 1.2, py: .8, color: "#f8f3fc", textAlign: "left", bgcolor: item.id === ticket.id ? "rgba(169,107,234,.18)" : "transparent" }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject || item.reference}</span><span style={{ flexShrink: 0, opacity: .62, fontSize: 10 }}>{item.status.replaceAll("_", " ")}</span></Button>) : <Typography sx={{ px: 1, py: .5, color: "rgba(248,243,252,.58)", fontSize: 11 }}>No previous requests yet.</Typography>}</Box>}
        <Box sx={{ display: "flex", flex: 1, flexDirection: "column", gap: 1.7, overflowY: "auto", px: 2, py: 2, bgcolor: "rgba(22,13,32,.84)", ...scrollAreaSx }}>{(ticket.messages ?? []).map((message) => { const customer = message.senderType === "customer"; return <Stack key={message.id} direction="row" justifyContent={customer ? "flex-end" : "flex-start"} alignItems="flex-end" gap={.8}>{!customer && <Avatar sx={{ width: 28, height: 28, color: "#291534", bgcolor: "#ffc66d" }}><BrandMark /></Avatar>}<Box sx={{ maxWidth: "82%" }}><Typography sx={{ mb: .45, color: "rgba(248,243,252,.42)", fontSize: 10 }}>{customer ? "You" : "PixlPush Support"}</Typography><Box sx={{ p: 1.4, borderRadius: customer ? "16px 5px 16px 16px" : "5px 16px 16px 16px", color: "#f8f3fc", bgcolor: customer ? "#7444df" : "rgba(255,255,255,.07)" }}><Typography sx={{ whiteSpace: "pre-wrap", fontSize: 12.5, lineHeight: 1.6 }}>{message.body}</Typography></Box><Typography sx={{ mt: .45, color: "rgba(248,243,252,.38)", fontSize: 9 }}>{timeOf(message.createdAt)}</Typography></Box></Stack>; })}{!adminCount(ticket) && <Typography role="status" sx={{ alignSelf: "center", maxWidth: "90%", p: 1.2, borderRadius: 2, textAlign: "center", color: "rgba(248,243,252,.72)", bgcolor: "rgba(255,198,109,.08)", border: "1px solid rgba(255,198,109,.25)", fontSize: 11, lineHeight: 1.5 }}>Your request {ticket.reference} has been sent. Our support team will reply here shortly. {ticket.guestEmail ? `We’ll also email ${ticket.guestEmail}.` : "We’ll also email you."} This conversation is saved.</Typography>}{supportTyping && <Stack direction="row" alignItems="flex-end" gap={.8} role="status" aria-label="PixlPush Support is typing"><Avatar sx={{ width: 28, height: 28, color: "#291534", bgcolor: "#ffc66d" }}><BrandMark /></Avatar><Box sx={{ px: 1.35, py: 1.05, borderRadius: "5px 16px 16px 16px", bgcolor: "rgba(255,255,255,.07)", border: "1px solid rgba(226,207,247,.14)" }}><Typography sx={{ mb: .55, color: "rgba(248,243,252,.48)", fontSize: 9.5 }}>PixlPush Support is typing</Typography><Stack direction="row" gap={.45} aria-hidden="true">{[0, 1, 2].map((index) => <Box key={index} sx={{ width: 5, height: 5, borderRadius: "50%", bgcolor: "#ffd36e", animation: "supportChatTyping 1.15s ease-in-out infinite", animationDelay: `${index * 140}ms`, "@keyframes supportChatTyping": { "0%, 60%, 100%": { transform: "translateY(0)", opacity: .35 }, "30%": { transform: "translateY(-3px)", opacity: 1 } } }} />)}</Stack></Box></Stack>}<Box ref={messageEndRef} sx={{ height: "1px", flexShrink: 0 }} /></Box>
        {ticket.status === "closed" ? <Box role="status" sx={{ p: 2, borderTop: "1px solid rgba(226,207,247,.13)", bgcolor: "rgba(33,21,45,.96)", textAlign: "center" }}><Typography sx={{ color: "#f8f3fc", fontSize: 13, fontWeight: 700 }}>This conversation has been closed</Typography><Typography sx={{ mt: .5, mb: 1.5, color: "rgba(248,243,252,.62)", fontSize: 11, lineHeight: 1.5 }}>Still need help? Start a new chat and our team will pick it up.</Typography><Stack direction="row" gap={1} justifyContent="center">{/* Reopen hidden for now; reopenTicket() still works if it comes back.
<Button onClick={() => void reopenTicket()} disabled={busy} variant="contained" size="small" sx={{ ...actionButtonSx, fontSize: 11 }}>{busy ? <CircularProgress size={14} /> : "Reopen conversation"}</Button> */}<Button onClick={startNewChat} disabled={busy} variant="contained" size="small" sx={{ ...actionButtonSx, fontSize: 11 }}>Start a new chat</Button></Stack>{error && <Typography role="alert" sx={{ mt: 1, color: "#ffad9e", fontSize: 10 }}>{error}</Typography>}</Box> : <Box component="form" onSubmit={sendMessage} sx={{ p: 1.5, borderTop: "1px solid rgba(226,207,247,.13)", bgcolor: "rgba(33,21,45,.96)" }}><Stack direction="row" alignItems="center" gap={.7} sx={{ p: .55, pl: 1.35, border: "1px solid rgba(226,207,247,.19)", borderRadius: "15px", bgcolor: "rgba(255,255,255,.04)" }}><TextField inputRef={inputRef} fullWidth size="small" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} disabled={busy || adminCount(ticket) === 0} placeholder={adminCount(ticket) === 0 ? "Support will reply here shortly…" : "Reply to support…"} inputProps={{ "aria-label": "Type your message" }} sx={composerSx} /><IconButton type="submit" aria-label="Send message" disabled={!draft.trim() || busy || adminCount(ticket) === 0} sx={sendButtonSx}>{busy ? <CircularProgress size={16} /> : <SendRounded sx={{ fontSize: 17 }} />}</IconButton></Stack>{ticket.status === "resolved" && <Typography sx={{ mt: .8, color: "rgba(248,243,252,.5)", fontSize: 10 }}>Marked as resolved. Reply if you still need help and we will reopen it.</Typography>}{error && <Typography role="alert" sx={{ mt: .8, color: "#ffad9e", fontSize: 10 }}>{error}</Typography>}</Box>}
      </>}
    </Paper>}
    {showLauncher && <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}><Badge variant="dot" overlap="circular" invisible={!unreadCount || open} anchorOrigin={{ vertical: "top", horizontal: "right" }} sx={{ "& .MuiBadge-dot": { width: 16, height: 16, borderRadius: "50%", bgcolor: "#22c55e", border: "2.5px solid #ffffff", top: "14%", right: "14%", animation: "supportUnreadPulse 2s ease-out infinite", "@keyframes supportUnreadPulse": { "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,.55)" }, "70%": { boxShadow: "0 0 0 8px rgba(34,197,94,0)" }, "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" } } } }}><IconButton className={`support-chat-launcher${open ? " support-chat-close-button" : ""}`} onClick={() => changeOpen(!open)} aria-label={open ? "Close support chat" : unreadCount ? `Open support chat, ${unreadCount} new message${unreadCount === 1 ? "" : "s"}` : "Open PixlPush support chat"} aria-expanded={open} sx={{ width: 68, height: 68, minWidth: 68, borderRadius: "50% !important", color: "#291534", background: "linear-gradient(145deg,#ffd36e 0%,#ff914f 46%,#8a42dc 100%)", border: "3px solid rgba(255,255,255,.94)", boxShadow: "0 0 0 5px rgba(169,107,234,.1), 0 15px 38px rgba(34,14,56,.38)" }}>{open ? <CloseRounded /> : <SupportAgentRounded sx={{ fontSize: 28 }} />}</IconButton></Badge></Box>}
  </Box>;
}
