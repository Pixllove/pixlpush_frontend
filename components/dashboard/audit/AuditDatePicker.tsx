'use client';

import { useMemo, useState } from 'react';
import { ArrowBackIosNewRounded, ArrowForwardIosRounded, CalendarMonthRounded } from '@mui/icons-material';
import { Box, Button, IconButton, Popover, Stack, TextField, Typography } from '@mui/material';

const pad = (value: number) => String(value).padStart(2, '0');
const toKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Theme-aware audit filter calendar. The value stays a local YYYY-MM-DD date string. */
export default function AuditDatePicker({ label, value, onChange, min, max }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => value ? parseKey(value) : new Date());
  const open = Boolean(anchor);
  const calendarDays = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [visibleMonth]);
  const displayValue = value ? `${pad(parseKey(value).getDate())}/${pad(parseKey(value).getMonth() + 1)}/${parseKey(value).getFullYear()}` : '';
  const today = toKey(new Date());

  const selectDay = (date: Date) => {
    const key = toKey(date);
    if ((min && key < min) || (max && key > max)) return;
    onChange(key);
    setAnchor(null);
  };

  return (
    <>
      <TextField
        fullWidth size="small" label={label} placeholder="dd/mm/yyyy" value={displayValue}
        onClick={(event) => {
          setVisibleMonth(value ? parseKey(value) : new Date());
          setAnchor(event.currentTarget);
        }}
        InputLabelProps={{ shrink: true }}
        inputProps={{ readOnly: true, 'aria-label': label, 'aria-haspopup': 'dialog', 'aria-expanded': open }}
        InputProps={{ endAdornment: <IconButton size="small" aria-label={`Choose ${label.toLowerCase()} date`} onClick={(event) => {
          setVisibleMonth(value ? parseKey(value) : new Date());
          setAnchor(event.currentTarget.closest('.MuiFormControl-root') as HTMLElement);
        }}><CalendarMonthRounded fontSize="small" /></IconButton> }}
        sx={{ '& .MuiOutlinedInput-root': { height: 46, borderRadius: '8px', bgcolor: 'background.paper' } }}
      />
      <Popover
        open={open} anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { role: 'dialog', 'aria-label': `${label} date calendar`, sx: { mt: 0.5, p: 1.5, width: 320, border: '1px solid', borderColor: 'divider', borderRadius: '10px', bgcolor: 'background.paper', color: 'text.primary', boxShadow: '0 12px 30px rgba(30,20,41,.18)' } } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" aria-label="Previous month" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ArrowBackIosNewRounded sx={{ fontSize: 15 }} /></IconButton>
            <IconButton size="small" aria-label="Next month" onClick={() => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ArrowForwardIosRounded sx={{ fontSize: 15 }} /></IconButton>
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Typography key={`${day}-${index}`} variant="caption" color="text.secondary" fontWeight={700} sx={{ py: 0.75 }}>{day}</Typography>)}
          {calendarDays.map((date) => {
            const key = toKey(date);
            const disabled = Boolean((min && key < min) || (max && key > max));
            const selected = value === key;
            return <Box key={key} component="button" type="button" disabled={disabled} aria-label={date.toLocaleDateString()} aria-pressed={selected} onClick={() => selectDay(date)} sx={{ border: 0, borderRadius: '6px', height: 36, bgcolor: selected ? 'primary.main' : 'transparent', color: selected ? 'primary.contrastText' : sameMonth(date, visibleMonth) ? 'text.primary' : 'text.disabled', font: 'inherit', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1, outline: key === today && !selected ? '1px solid' : 'none', outlineColor: 'primary.main', '&:hover': { bgcolor: selected ? 'primary.dark' : 'action.hover' } }}>{date.getDate()}</Box>;
          })}
        </Box>
        <Stack direction="row" justifyContent="space-between" sx={{ pt: 1 }}>
          <Button size="small" onClick={() => { onChange(''); setAnchor(null); }} sx={{ textTransform: 'none' }}>Clear</Button>
          <Button size="small" onClick={() => selectDay(new Date())} sx={{ textTransform: 'none' }}>Today</Button>
        </Stack>
      </Popover>
    </>
  );
}
