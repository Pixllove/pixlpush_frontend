'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseRounded, SearchRounded } from '@mui/icons-material';
import { IconButton, InputAdornment, TextField, type SxProps, type Theme } from '@mui/material';

/**
 * The one search box of the app. `value`/`onChange` are the text as typed; `onSearch` gets the trimmed text
 * once the user pauses (200ms), at once on Enter, and at once with "" when cleared — drive requests from it.
 * Looks come from the theme's standard field; `sx` and `className` are for layout only.
 */
export default function SearchField({ value: controlled, onChange, onSearch, placeholder = 'Search', size = 'default', fullWidth, sx, className = '', autoFocus, disabled, 'aria-label': ariaLabel }: {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  size?: 'default' | 'compact';
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const [own, setOwn] = useState('');
  const value = controlled ?? own;
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const search = (next: string, wait: number) => {
    window.clearTimeout(timer.current);
    if (!onSearch) return;
    if (wait) timer.current = window.setTimeout(() => onSearch(next.trim()), wait);
    else onSearch(next.trim());
  };
  const change = (next: string, wait = 200) => { setOwn(next); onChange?.(next); search(next, wait); };

  return (
    <TextField
      type="search"
      value={value}
      placeholder={placeholder}
      className={`${size === 'compact' ? 'compact ' : ''}${className}`.trim() || undefined}
      autoFocus={autoFocus}
      disabled={disabled}
      inputRef={input}
      onChange={(event) => change(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') search(value, 0);
        // Escape empties the box first; only an empty box lets it close a surrounding dialog.
        if (event.key === 'Escape' && value) { event.stopPropagation(); change('', 0); }
      }}
      inputProps={{ 'aria-label': ariaLabel ?? placeholder, autoComplete: 'off', spellCheck: false }}
      InputProps={{
        startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment>,
        // Always rendered, so the box does not change size when the button appears.
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" edge="end" aria-label="Clear search" tabIndex={value ? 0 : -1} onMouseDown={(event) => event.preventDefault()} onClick={() => { change('', 0); input.current?.focus(); }} sx={{ visibility: value ? 'visible' : 'hidden', '& svg': { fontSize: 16 } }}>
              <CloseRounded />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={[{ width: fullWidth ? '100%' : 'min(320px, 100%)', '& input::-webkit-search-cancel-button': { display: 'none' } }, ...(Array.isArray(sx) ? sx : [sx])]}
    />
  );
}
