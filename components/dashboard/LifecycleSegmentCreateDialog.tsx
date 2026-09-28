'use client';

import { CloseRounded } from '@mui/icons-material';
import { Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Skeleton, Stack, TextField, Typography } from '@mui/material';
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
  // Tracked events first, then the blueprint's suggestions; any other name can be typed.
  // A segment on a not-yet-tracked event starts empty and fills when the app sends it.
  type Option = { name: string; group: string; assigned: string | null; suggestedSegment?: string };
  const eventOptions: Option[] = [
    ...(schema?.events ?? []).map(item => ({ name: item.name, group: 'Tracked events', assigned: item.assignedSegment?.name ?? null })),
    ...(schema?.recommendedEvents ?? []).map(item => ({ name: item.name, group: 'Suggested (not tracked yet)', assigned: item.assignedSegment?.name ?? null, suggestedSegment: item.suggestedSegment })),
  ];
  const chosen = eventOptions.find(item => item.name === event.trim());
  const eventTaken = Boolean(chosen?.assigned);
  const tracked = Boolean(schema?.events.some(item => item.name === event.trim()));
  const schemaLoading = open && !schema && !error;
  return <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
    <DialogTitle><Typography color="primary" fontSize={12} letterSpacing={1.5} fontWeight={900}>LIFECYCLE SEGMENTS</Typography><Typography variant="h3">Create segment</Typography><IconButton onClick={close} aria-label="Close" sx={{ position: 'absolute', right: 12, top: 12 }}><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers><Stack gap={2} sx={{ pt: 1 }}>
      <TextField label="Segment name" required value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Buyers" autoFocus />
      <TextField label="Description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What this segment represents" multiline minRows={2} />
      <Stack gap={.7}><Typography fontSize={12} fontWeight={800}>Event condition</Typography>{schemaLoading ? <Skeleton variant="rounded" height={56} /> : <Autocomplete
        freeSolo
        options={eventOptions}
        groupBy={option => option.group}
        getOptionLabel={option => typeof option === 'string' ? option : option.name}
        getOptionDisabled={option => Boolean(option.assigned)}
        renderOption={(props, option) => <li {...props} key={option.name}><Stack><Typography fontSize={13}>{option.name}</Typography>{(option.assigned || option.suggestedSegment) && <Typography color="text.secondary" fontSize={11}>{option.assigned ? `Assigned to ${option.assigned}` : `e.g. "${option.suggestedSegment}"`}</Typography>}</Stack></li>}
        inputValue={event}
        onInputChange={(_e, value) => setEvent(value)}
        onChange={(_e, value) => {
          const option = typeof value === 'string' ? undefined : value;
          setEvent(typeof value === 'string' ? value : value?.name ?? '');
          if (option?.suggestedSegment && !name.trim()) setName(option.suggestedSegment);
        }}
        disabled={loading}
        renderInput={params => <TextField {...params} placeholder="Choose or type an event name, e.g. purchase_completed" inputProps={{ ...params.inputProps, maxLength: 120 }} />}
      />}<Typography color={eventTaken ? 'error' : 'text.secondary'} fontSize={11}>{eventTaken ? `This event already belongs to "${chosen?.assigned}". An event can back only one segment.` : event.trim() && !tracked ? 'Not tracked yet: the segment starts empty and users join as soon as your app sends this event with track().' : 'Users who performed this event are classified into the segment.'}</Typography></Stack>
      {error && <Typography color="error" fontSize={12}>{error}</Typography>}
    </Stack></DialogContent>
    <DialogActions><Button variant="outlined" onClick={close} disabled={loading}>Cancel</Button><Button variant="contained" onClick={() => onCreate({ name: name.trim(), description: description.trim(), event: event.trim() })} disabled={!name.trim() || !event.trim() || eventTaken || loading}>{loading ? <CircularProgress size={18} color="inherit" /> : 'Create segment'}</Button></DialogActions>
  </Dialog>;
}
