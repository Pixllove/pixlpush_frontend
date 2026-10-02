"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Typography } from "@mui/material";
import CloseRounded from "@mui/icons-material/CloseRounded";

/** `snapshot` is the editor's content as a string: once it differs from what the editor opened with, a reload asks first. */
export default function CloseEmailEditor({ onDiscard, onSaveDraft, snapshot }: { onDiscard: () => void; onSaveDraft: () => void; snapshot?: string }) {
  const [open, setOpen] = useState(false);
  const [reloadOpen, setReloadOpen] = useState(false);
  const opened = useRef(snapshot);
  const dirty = useRef(false);
  const touched = useRef(false);
  useEffect(() => {
    // Until the user has done something, a change is the email still loading, not an edit.
    if (!touched.current) opened.current = snapshot;
    dirty.current = snapshot !== opened.current;
  }, [snapshot]);
  // An untouched editor reloads freely. With changes, the reload shortcut opens the dialog below. The browser's
  // own reload button is left alone: its built-in question cannot be styled and Chrome keeps it on screen over
  // every other tab until it is answered.
  useEffect(() => {
    const onTouch = () => { touched.current = true; };
    const onKey = (event: KeyboardEvent) => {
      touched.current = true;
      const reload = event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r");
      if (!reload || !dirty.current) return;
      event.preventDefault();
      setReloadOpen(true);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onTouch, true);
    return () => { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", onTouch, true); };
  }, []);
  const reload = () => { dirty.current = false; window.location.reload(); };
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
    <Dialog open={reloadOpen} onClose={() => setReloadOpen(false)} aria-labelledby="reload-email-title" sx={{ zIndex: 1400 }} PaperProps={{ sx: { width: 448, maxWidth: 'calc(100% - 32px)', m: 2, borderRadius: '12px', p: 1 } }}>
      <DialogContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, letterSpacing: '.16em', fontWeight: 800, color: '#94a3b8' }}>RELOAD PAGE</Typography>
          <IconButton onClick={() => setReloadOpen(false)} aria-label="Keep editing" size="small"><CloseRounded /></IconButton>
        </Box>
        <Typography id="reload-email-title" sx={{ fontSize: 24, fontWeight: 700, color: '#172033', mt: 1 }}>Are you sure you want to reload?</Typography>
        <Typography sx={{ fontSize: 13, lineHeight: 1.8, color: '#64748b', mt: 1.5 }}>Reloading discards the changes you have not saved. The editor reopens as it was last saved.</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={() => setReloadOpen(false)} sx={{ borderRadius: '7px', color: '#334155', borderColor: '#dfe5ee' }}>Cancel</Button>
        <Button variant="contained" onClick={reload} sx={{ borderRadius: '7px', bgcolor: '#1d9854', '&:hover': { bgcolor: '#178047' } }}>Continue</Button>
      </DialogActions>
    </Dialog>
  </>;
}
