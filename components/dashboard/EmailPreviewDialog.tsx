"use client";

import { useState } from "react";
import { Box, Button, Dialog, Grow, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";
import LaptopMacRounded from "@mui/icons-material/LaptopMacRounded";
import PhoneIphoneRounded from "@mui/icons-material/PhoneIphoneRounded";
import SendRounded from "@mui/icons-material/SendRounded";
import { emailApi } from "@/lib/projects/api";

// A narrow preview is a narrow box, not a narrow screen, so nothing in the email knows to shrink. These rules
// make every fixed-width part of it fit the box instead of running out of it.
const narrow = {
  '& *': { maxWidth: '100% !important', minWidth: '0 !important', boxSizing: 'border-box' },
  '& img': { height: 'auto !important' },
  '& table': { tableLayout: 'auto' },
};

/** The "Preview and test" dialog of both email editors: the email as a recipient sees it, and a real test send. */
export default function EmailPreviewDialog({
  title,
  html,
  projectId,
  subject,
  onClose,
  onNotice,
}: {
  title: string;
  html: string;
  /** With a project and subject the test is really sent; the legacy editor passes neither. */
  projectId?: string;
  subject?: string;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Closing plays the exit animation first; the parent unmounts the dialog once it has finished.
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const sendTest = async () => {
    if (!projectId || !subject) { onNotice("Test email prepared locally"); close(); return; }
    const recipient = to.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) { setResult({ ok: false, message: "Enter a valid email address." }); return; }
    setSending(true);
    setResult(null);
    try {
      const sent = await emailApi.templates.sendTest(projectId, { to: recipient, subject, html });
      setResult({ ok: true, message: `Test email sent to ${sent.to}.` });
    } catch (error) {
      setResult({ ok: false, message: error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : "Could not send the test email." });
    } finally {
      setSending(false);
    }
  };
  return (
    // Escape and the close button close it; a click outside does not, so a stray click cannot lose the preview.
    <Dialog
      open={open}
      onClose={(_, reason) => { if (reason !== "backdropClick") close(); }}
      TransitionComponent={Grow}
      transitionDuration={{ enter: 320, exit: 200 }}
      TransitionProps={{ onExited: onClose, easing: { enter: 'cubic-bezier(.2,.9,.3,1.15)', exit: 'cubic-bezier(.4,0,1,1)' } }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(12,14,22,.6)', backdropFilter: 'blur(6px)' } } }}
      maxWidth="md"
      fullWidth
      aria-labelledby="email-preview-title"
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { m: { xs: 1.5, sm: 3 }, width: { xs: 'calc(100% - 24px)', sm: undefined }, maxHeight: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 48px)' }, borderRadius: '16px', bgcolor: '#fff', color: '#11131a', backgroundImage: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(10,12,20,.45)' } }}
    >
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderBottom: '1px solid #e6eaf1' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="email-preview-title" sx={{ fontSize: 17, fontWeight: 800, color: '#11131a', lineHeight: 1.3 }}>Preview and test</Typography>
          <Typography noWrap sx={{ fontSize: 12, color: '#64748b', mt: 0.25 }}>{subject ? `Subject: ${subject}` : title}</Typography>
        </Box>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={device}
          onChange={(_, value) => value && setDevice(value)}
          aria-label="Preview size"
          sx={{ bgcolor: '#f1f4f9', borderRadius: '10px', p: '3px', '& .MuiToggleButton-root': { border: 0, borderRadius: '8px !important', px: 1.25, py: 0.5, color: '#64748b', '&.Mui-selected': { bgcolor: '#fff', color: '#11131a', boxShadow: '0 1px 3px rgba(15,23,42,.16)' }, '&.Mui-selected:hover': { bgcolor: '#fff' } } }}
        >
          <ToggleButton value="desktop" aria-label="Desktop"><LaptopMacRounded fontSize="small" /></ToggleButton>
          <ToggleButton value="mobile" aria-label="Mobile"><PhoneIphoneRounded fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
        <IconButton onClick={close} aria-label="Close preview" size="small" sx={{ color: '#64748b' }}><CloseRounded /></IconButton>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: { xs: 1.5, sm: 3 }, bgcolor: '#f3f5f9' }}>
        <Box
          // the class hides editor-only controls (the footer's delete button) inside the email
          className="recipient-preview"
          sx={{ width: '100%', maxWidth: device === 'mobile' ? 390 : '100%', m: '0 auto !important', p: device === 'mobile' ? '12px !important' : { xs: '12px !important', sm: '26px !important' }, minHeight: 200, overflowWrap: 'anywhere', ...(device === 'mobile' ? narrow : { '@media (max-width:600px)': narrow }), overflowX: 'auto', bgcolor: '#fff', borderRadius: '12px', border: '1px solid #e6eaf1', boxShadow: '0 8px 24px rgba(15,23,42,.06)', transition: 'max-width .2s ease', '& img': { maxWidth: '100%' } }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Box>
      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={1.25}
        onSubmit={(event: React.FormEvent) => { event.preventDefault(); void sendTest(); }}
        sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderTop: '1px solid #e6eaf1', bgcolor: '#fff' }}
      >
        <Typography role="status" sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: !result ? '#64748b' : result.ok ? '#0d7a48' : '#c0352b' }}>
          {result ? result.message : "Send this email to yourself to see it in a real inbox."}
        </Typography>
        <TextField
          size="small"
          type="email"
          placeholder="test@example.com"
          aria-label="Send test to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          disabled={sending}
          sx={{ width: { xs: '100%', sm: 280 }, '& .MuiOutlinedInput-root': { height: 42, borderRadius: '10px', bgcolor: '#fff', color: '#11131a', '& fieldset': { borderColor: '#cbd3e1' }, '&:hover fieldset': { borderColor: '#94a3b8' }, '&.Mui-focused fieldset': { borderColor: '#1d9854' } }, '& .MuiInputBase-input': { color: '#11131a', WebkitTextFillColor: '#11131a', fontSize: 14, '&::placeholder': { color: '#7a869a', WebkitTextFillColor: '#7a869a', opacity: 1 } } }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<SendRounded />}
          disabled={sending}
          sx={{ height: 42, minHeight: 42, px: 2.5, borderRadius: '10px', flexShrink: 0, fontSize: 13, fontWeight: 800, textTransform: 'none', whiteSpace: 'nowrap', color: '#fff', bgcolor: '#1d9854', boxShadow: 'none', '&:hover': { bgcolor: '#178047', boxShadow: 'none' }, '&.Mui-disabled': { color: '#7a869a', bgcolor: '#e8ecf3' } }}
        >
          {sending ? "Sending…" : "Send test"}
        </Button>
      </Stack>
    </Dialog>
  );
}
