"use client";

import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Typography } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";

export default function CloseEmailEditor({ onDiscard, onSaveDraft }: { onDiscard: () => void; onSaveDraft: () => void }) {
  const [open, setOpen] = useState(false);
  // The browser's Back button would silently leave the editor and drop the work in it. It asks instead:
  // a marked history entry sits in front of the page, and stepping back off it opens this dialog.
  useEffect(() => {
    // Marked, so a remount of the editor (its review screen, a reload) does not stack up extra entries.
    const guard = () => {
      if (!window.history.state?.emailEditorGuard) window.history.pushState({ ...window.history.state, emailEditorGuard: true }, "", window.location.href);
    };
    const onBack = () => { setOpen(true); guard(); };
    guard();
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  return <>
    <IconButton onClick={() => setOpen(true)} aria-label="Close editor"><CloseRounded /></IconButton>
    <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="close-email-title" sx={{ zIndex: 1400 }} PaperProps={{ sx: { width: 448, maxWidth: 'calc(100% - 32px)', m: 2, borderRadius: '12px', p: 1 } }}>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, letterSpacing: '.16em', fontWeight: 800, color: '#94a3b8' }}>CLOSE EDITOR</Typography>
          <IconButton onClick={() => setOpen(false)} aria-label="Keep editing" size="small"><CloseRounded /></IconButton>
        </Box>
        <Typography id="close-email-title" sx={{ fontSize: 24, fontWeight: 700, color: '#172033', mt: 1 }}>Save this email as a draft?</Typography>
        <Typography sx={{ fontSize: 13, lineHeight: 1.8, color: '#64748b', mt: 1.5 }}>Save it in drafts to keep editing later, or discard to close without saving this version.</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onDiscard} sx={{ borderRadius: '7px', color: '#334155', borderColor: '#dfe5ee' }}>Discard</Button>
        <Button variant="contained" onClick={onSaveDraft} sx={{ borderRadius: '7px', bgcolor: '#1d9854', '&:hover': { bgcolor: '#178047' } }}>Save as draft</Button>
      </DialogActions>
    </Dialog>
  </>;
}
