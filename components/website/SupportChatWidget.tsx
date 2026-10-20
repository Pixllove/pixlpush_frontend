"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import SupportAgentRounded from "@mui/icons-material/SupportAgentRounded";

type ChatMessage = { from: "support" | "visitor"; text: string; time: string };

const timeNow = () =>
  new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date());

export default function SupportChatWidget({
  showLauncher = true,
  isOpen,
  onClose,
}: {
  showLauncher?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = isOpen ?? localOpen;
  const changeOpen = (next: boolean) => {
    setLocalOpen(next);
    if (!next) onClose?.();
  };
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 180);
  }, [open, hasStarted]);

  const startChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setEmailError("Enter a valid email address to start.");
      return;
    }
    setEmail(normalized);
    setEmailError("");
    setMessages([
      {
        from: "support",
        text: "Hi! Thanks for contacting PixlPush Support. Tell us a little about what you’re working on and we’ll point you in the right direction.",
        time: timeNow(),
      },
    ]);
    setHasStarted(true);
  };

  const sendMessage = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { from: "visitor", text, time: timeNow() },
      {
        from: "support",
        text: "Thanks for sharing that. This is a support-chat preview, so your message hasn’t been sent to a live team.",
        time: timeNow(),
      },
    ]);
    setDraft("");
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  if (!showLauncher && !open) return null;

  return (
    <Box sx={{ position: "fixed", right: { xs: 16, sm: 26 }, bottom: { xs: 16, sm: 24 }, zIndex: 1400 }}>
      {open && (
        <Paper
          elevation={0}
          role="dialog"
          aria-label="PixlPush support chat"
          sx={{
            position: "absolute", right: 0, bottom: showLauncher ? 74 : 0, display: "flex", width: { xs: "min( calc(100vw - 32px), 390px)", sm: 380 },
            height: { xs: "min(590px, calc(100dvh - 110px))", sm: 570 }, flexDirection: "column", overflow: "hidden",
            border: "1px solid rgba(226,207,247,.18)", borderRadius: "22px", bgcolor: "#21152d", color: "#f8f3fc",
            boxShadow: "0 24px 80px rgba(35,20,48,.22)", animation: "supportChatEnter .24s cubic-bezier(.2,.8,.2,1) both",
            "@keyframes supportChatEnter": { from: { opacity: 0, transform: "translateY(12px) scale(.97)" }, to: { opacity: 1, transform: "translateY(0) scale(1)" } },
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.4} sx={{ px: 2.2, py: 1.8, color: "#fff", background: "linear-gradient(125deg,#261536,#3d2054)" }}>
            <Box sx={{ display: "grid", width: 39, height: 39, placeItems: "center", border: "1px solid rgba(255,255,255,.25)", borderRadius: "13px", bgcolor: "rgba(255,255,255,.12)" }}>
              <SupportAgentRounded sx={{ fontSize: 23 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 750, letterSpacing: "-.02em" }}>PixlPush Support</Typography>
              <Stack direction="row" alignItems="center" gap={.7} sx={{ mt: .25 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#69d39b", boxShadow: "0 0 0 3px rgba(105,211,155,.15)" }} />
                <Typography sx={{ color: "rgba(255,255,255,.72)", fontSize: 11 }}>Here to help with your product</Typography>
              </Stack>
            </Box>
            <IconButton aria-label="Close support chat" onClick={() => changeOpen(false)} size="small" sx={{ color: "rgba(255,255,255,.8)" }}><CloseRounded fontSize="small" /></IconButton>
          </Stack>

          {!hasStarted ? (
            <Box sx={{ display: "flex", flex: 1, flexDirection: "column", overflow: "auto", p: 2.4, bgcolor: "#1b1126" }}>
              <Stack direction="row" alignItems="center" gap={1.3} sx={{ mb: 2.2 }}>
                <Avatar sx={{ width: 35, height: 35, color: "#5b18bc", bgcolor: "#3a2850" }}><SupportAgentRounded fontSize="small" /></Avatar>
                <Box>
                  <Typography sx={{ color: "#392b45", fontSize: 12, fontWeight: 750 }}>PixlPush Support</Typography>
                  <Typography sx={{ color: "#ad9dbb", fontSize: 10 }}>A quick note before we start</Typography>
                </Box>
              </Stack>
              <Box sx={{ maxWidth: "92%", p: 1.7, border: "1px solid rgba(226,207,247,.16)", borderRadius: "4px 16px 16px 16px", bgcolor: "#2a1c38", boxShadow: "none" }}>
                <Typography sx={{ color: "#d4c9df", fontSize: 13, lineHeight: 1.65 }}>Hi there 👋 Need a hand with PixlPush? Share your email and we’ll open a conversation.</Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 25 }} />
              <Box component="form" onSubmit={startChat} sx={{ p: 1.8, border: "1px solid rgba(226,207,247,.16)", borderRadius: 3, bgcolor: "#2a1c38" }}>
                <Typography sx={{ mb: 1.1, color: "#f8f3fc", fontSize: 13, fontWeight: 750 }}>Where can we reach you?</Typography>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  size="small"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setEmailError(""); }}
                  placeholder="you@company.com"
                  aria-label="Your email address"
                  error={Boolean(emailError)}
                  helperText={emailError || "We’ll use this to keep your support conversation together."}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: 13 }, "& .MuiFormHelperText-root": { mx: .2, fontSize: 10, lineHeight: 1.4 } }}
                />
                <Box component="button" type="submit" sx={{ display: "flex", width: "100%", minHeight: 43, alignItems: "center", justifyContent: "center", gap: .8, mt: 1.5, border: 0, borderRadius: 2, color: "#fff", bgcolor: "#5b18bc", fontSize: 12, fontWeight: 750, cursor: "pointer", transition: "background .18s, transform .18s", "&:hover": { bgcolor: "#491292", transform: "translateY(-1px)" } }}>
                  Start a conversation <SendRounded sx={{ fontSize: 15 }} />
                </Box>
              </Box>
              <Typography sx={{ mt: 1.4, color: "#a997b7", fontSize: 10, textAlign: "center" }}>Demo preview · No message is sent or stored</Typography>
            </Box>
          ) : (
            <>
              <Stack direction="row" justifyContent="center" sx={{ py: 1.2 }}>
                <Typography sx={{ px: 1.2, py: .45, borderRadius: 99, color: "#ad9dbb", bgcolor: "#2a1c38", fontSize: 10 }}>Today · {email}</Typography>
              </Stack>
              <Box sx={{ display: "flex", flex: 1, flexDirection: "column", gap: 1.7, overflowY: "auto", px: 2, pb: 2, bgcolor: "#1b1126" }}>
                {messages.map((message, index) => (
                  <Stack key={`${message.time}-${index}`} direction="row" justifyContent={message.from === "visitor" ? "flex-end" : "flex-start"} alignItems="flex-end" gap={.8}>
                    {message.from === "support" && <Avatar sx={{ width: 27, height: 27, color: "#5b18bc", bgcolor: "#3a2850" }}><SupportAgentRounded sx={{ fontSize: 16 }} /></Avatar>}
                    <Box sx={{ maxWidth: "82%" }}>
                      {message.from === "support" && <Typography sx={{ mb: .45, color: "#ad9dbb", fontSize: 10 }}>PixlPush Support · demo</Typography>}
                      <Box sx={{ p: 1.4, borderRadius: message.from === "visitor" ? "15px 5px 15px 15px" : "5px 15px 15px 15px", color: "#f8f3fc", bgcolor: message.from === "visitor" ? "#7444df" : "#2a1c38", border: message.from === "visitor" ? "none" : "1px solid rgba(226,207,247,.16)", boxShadow: "none" }}>
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.6 }}>{message.text}</Typography>
                      </Box>
                      <Typography sx={{ mt: .45, color: "#a997b7", fontSize: 9, textAlign: message.from === "visitor" ? "right" : "left" }}>{message.time}</Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
              <Box component="form" onSubmit={sendMessage} sx={{ p: 1.5, borderTop: "1px solid rgba(226,207,247,.16)", bgcolor: "#21152d" }}>
                <Stack direction="row" alignItems="center" gap={.8} sx={{ p: .55, pl: 1.4, border: "1px solid rgba(226,207,247,.2)", borderRadius: 3, transition: "border-color .2s, box-shadow .2s", "&:focus-within": { borderColor: "#9a6bd1", boxShadow: "0 0 0 3px rgba(91,24,188,.08)" } }}>
                  <TextField inputRef={inputRef} fullWidth size="small" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Type your message…" inputProps={{ "aria-label": "Type your message" }} sx={{ "& .MuiInputBase-root": { p: 0, fontSize: 13 }, "& fieldset": { border: "none" } }} />
                  <IconButton type="submit" aria-label="Send message" disabled={!draft.trim()} sx={{ width: 36, height: 36, color: "#fff", bgcolor: "#5b18bc", "&:hover": { bgcolor: "#491292" }, "&.Mui-disabled": { color: "#a99db3", bgcolor: "#3a2850" } }}><SendRounded sx={{ fontSize: 17 }} /></IconButton>
                </Stack>
                <Typography sx={{ mt: .8, color: "#a997b7", fontSize: 9, textAlign: "center" }}>Demo only · Replies are simulated, not sent to live support</Typography>
              </Box>
            </>
          )}
        </Paper>
      )}

      {showLauncher && <Box sx={{ position: "relative", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        {!open && <>
          {[0, 1].map((wave) => (
            <Box
              key={wave}
              aria-hidden="true"
              sx={{
                position: "absolute", right: 0, zIndex: 0, width: 66, height: 66,
                border: "1px solid rgba(111,58,180,.38)", borderRadius: "50%",
                boxShadow: "0 0 0 3px rgba(111,58,180,.055)", pointerEvents: "none",
                animation: "supportSignalWave 3.2s cubic-bezier(.12,.62,.32,1) infinite",
                animationDelay: wave === 1 ? "1.6s" : "0s",
                "@keyframes supportSignalWave": {
                  "0%": { transform: "scale(.88)", opacity: .7 },
                  "72%": { opacity: .16 },
                  "100%": { transform: "scale(1.85)", opacity: 0 },
                },
                "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0 },
              }}
            />
          ))}
        </>}
        {!open && <Paper elevation={0} sx={{ mr: 1.2, px: 1.2, py: .75, border: "1px solid #eee7f1", borderRadius: 2.2, color: "#463650", bgcolor: "#fff", boxShadow: "0 8px 25px rgba(42,26,55,.1)", animation: "supportChatNudge 5s ease-in-out infinite", "@keyframes supportChatNudge": { "0%,75%,100%": { transform: "translateY(0)" }, "82%": { transform: "translateY(-4px)" }, "89%": { transform: "translateY(0)" } }, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>Need a hand?</Typography>
          <Typography sx={{ color: "#82758b", fontSize: 9 }}>Chat with PixlPush</Typography>
        </Paper>}
        <IconButton
          onClick={() => changeOpen(!open)}
          aria-label={open ? "Close support chat" : "Open PixlPush support chat"}
          aria-expanded={open}
          sx={{
            position: "relative", zIndex: 1, width: 66, height: 66, minWidth: 66, p: 0,
            borderRadius: "50% !important", overflow: "visible", color: "#fff",
            background: "linear-gradient(145deg,#8a42dc 0%,#641fc0 48%,#4c149e 100%)",
            border: "3px solid rgba(255,255,255,.96)",
            outline: "1px solid rgba(104,54,167,.16)",
            boxShadow: "0 0 0 5px rgba(108,52,176,.08), 0 13px 34px rgba(58,25,92,.3), inset 0 1px 0 rgba(255,255,255,.38)",
            transition: "transform .22s ease, box-shadow .22s ease, background .22s ease",
            "&::before": { content: '""', position: "absolute", inset: 5, border: "1px solid rgba(255,255,255,.24)", borderRadius: "50%", pointerEvents: "none" },
            "&:hover": { background: "linear-gradient(145deg,#9854e5 0%,#7028c9 48%,#5515a8 100%)", transform: "translateY(-3px) scale(1.035)", boxShadow: "0 0 0 6px rgba(108,52,176,.1), 0 17px 38px rgba(58,25,92,.34), inset 0 1px 0 rgba(255,255,255,.42)" },
            "@media (prefers-reduced-motion: reduce)": { animation: "none", transition: "none" },
          }}
        >
          {open ? <CloseRounded /> : <SupportAgentRounded sx={{ fontSize: 27, filter: "drop-shadow(0 2px 2px rgba(35,13,58,.2))" }} />}
          {!open && <Box sx={{ position: "absolute", top: 3, right: 3, width: 12, height: 12, border: "2px solid #fff", borderRadius: "50%", bgcolor: "#62ca91", boxShadow: "0 2px 7px rgba(25,55,38,.22)" }} />}
        </IconButton>
      </Box>}
    </Box>
  );
}
