'use client';

import { CloseRounded } from '@mui/icons-material';
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import type { LifecycleSegmentSchema } from '@/types/project';

export default function LifecycleSegmentCreateDialog({ open, onClose, onCreate, schema, loading, error }: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; description: string; event: string }) => void;
  schema?: LifecycleSegmentSchema;
  loading?: boolean;
  error?: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [event, setEvent] = useState('');
  useEffect(() => {
    if (!open) {
      setName('');
      setDescription('');
      setEvent('');
    }
  }, [open]);
  const close = () => { if (!loading) onClose(); };
  const trackedEvents = schema?.events.filter(item => item.tracked !== false) ?? [];
  const schemaLoading = open && !schema && !error;
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
    <DialogTitle><Typography color="primary" fontSize={12} letterSpacing={1.5} fontWeight={900}>LIFECYCLE SEGMENTS</Typography><Typography variant="h3">Create segment</Typography><IconButton onClick={close} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers><Stack gap={2} sx={{ pt: 1 }}>
      <TextField label="Segment name" required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Buyers" autoFocus />
      <TextField label="Description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What this segment represents" multiline minRows={2} />
      <Stack gap={.7}><Typography fontSize={12} fontWeight={800}>Event condition</Typography>{schemaLoading ? <Skeleton variant="rounded" height={56} /> : <Select displayEmpty value={event} onChange={value => setEvent(String(value.target.value))} disabled={!schema || loading}><MenuItem value="">Choose an event</MenuItem>{trackedEvents.map(item => <MenuItem key={item.name} value={item.name} disabled={Boolean(item.assignedSegment)}>{item.name}{item.assignedSegment ? ` — assigned to ${item.assignedSegment.name}` : ''}</MenuItem>)}</Select>}{schema && trackedEvents.length === 0 && <><Typography color="text.secondary" fontSize={11}>No events tracked yet — send events with the SDK track() function.</Typography>{schema.recommendedEvents?.length ? <Typography color="text.secondary" fontSize={11}>Recommended event names: {schema.recommendedEvents.map(item => item.name).join(', ')}</Typography> : null}</>}<Typography color="text.secondary" fontSize={11}>A lifecycle segment requires at least one tracked event.</Typography></Stack>
      {error && <Typography color="error" fontSize={12}>{error}</Typography>}
    </Stack></DialogContent>
    <DialogActions><Button variant="outlined" onClick={close} disabled={loading}>Cancel</Button><Button variant="contained" onClick={() => onCreate({ name: name.trim(), description: description.trim(), event })} disabled={!name.trim() || !event || loading}>{loading ? <CircularProgress size={18} color="inherit" /> : 'Create segment'}</Button></DialogActions>
  </Dialog>;
}
