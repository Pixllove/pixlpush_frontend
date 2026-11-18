'use client';

import { useState, type CSSProperties } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Popover } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

/**
 * A date field styled like the form's other inputs that opens the Material calendar.
 * Submits YYYY-MM-DD (what the server checks), shows the date in the visitor's own format.
 */
export default function DateField({ id, name, required, disabled, placeholder, style, accent }: {
  id: string; name: string; required: boolean; disabled: boolean; placeholder: string; style: CSSProperties; accent: string;
}) {
  const [value, setValue] = useState<Dayjs | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const theme = createTheme({ palette: { primary: { main: accent } } });
  const open = (target: HTMLElement) => { if (!disabled) setAnchor(target); };

  return (
    <>
      <input id={id} type="text" readOnly required={required} disabled={disabled} aria-haspopup="dialog" placeholder={placeholder || 'Pick a date'}
        value={value ? value.toDate().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        onClick={(event) => open(event.currentTarget)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') { event.preventDefault(); open(event.currentTarget); } }}
        style={{ ...style, cursor: disabled ? 'default' : 'pointer', paddingRight: 40, backgroundImage: calendarIcon, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }} />
      <input type="hidden" name={name} value={value ? value.format('YYYY-MM-DD') : ''} />
      <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2, boxShadow: '0 12px 32px rgba(30,20,41,.18)' } } }}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar value={value} referenceDate={dayjs()} onChange={(next) => { setValue(next); setAnchor(null); }} />
          </LocalizationProvider>
        </ThemeProvider>
      </Popover>
    </>
  );
}

const calendarIcon = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#8a8195"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10ZM5 8V6h14v2H5Z"/></svg>')}")`;
