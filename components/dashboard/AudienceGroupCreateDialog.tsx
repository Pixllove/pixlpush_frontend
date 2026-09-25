'use client';

import { useState } from 'react';
import { CloseRounded } from '@mui/icons-material';
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';

export default function AudienceGroupCreateDialog({ open, onClose, onCreate, loading, error }: { open: boolean; onClose: () => void; onCreate: (name: string, description: string) => void; loading?: boolean; error?: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const close = () => { setName(''); setDescription(''); onClose(); };
  const create = () => { if (!name.trim()) return; onCreate(name.trim(), description.trim()); setName(''); setDescription(''); };
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm" className="group-create-dialog">
    <DialogTitle><Typography className="group-dialog-eyebrow">AUDIENCE GROUPS</Typography><Typography className="group-dialog-title">Create group</Typography><IconButton onClick={close} aria-label="Close"><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers><Box className="group-dialog-field"><Typography fontWeight={900}>Group name <span>*</span></Typography><TextField autoFocus fullWidth placeholder="Enter group name" value={name} onChange={event => setName(event.target.value)} /></Box><Box className="group-dialog-field"><Typography fontWeight={900}>Description <em>(optional)</em></Typography><TextField fullWidth multiline minRows={3} placeholder="What this group is for" value={description} onChange={event => setDescription(event.target.value)} /></Box>{error && <Typography color="error" fontSize={12} sx={{ mt: 1 }}>{error}</Typography>}</DialogContent>
    <DialogActions><Button variant="outlined" onClick={close} disabled={loading}>Cancel</Button><Button variant="contained" disabled={!name.trim() || loading} onClick={create}>{loading ? <CircularProgress size={18} color="inherit" /> : 'Create'}</Button></DialogActions>
  </Dialog>;
}
