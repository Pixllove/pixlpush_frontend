'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { DeleteOutlineRounded, ExpandMoreRounded, ImageOutlined } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, FormControlLabel, IconButton, InputAdornment, Slider, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { uploadFormImage } from '@/lib/forms';

/* Inspector primitives for the form editor. Every control has a visible label that is also its accessible name. */

export function InspectorSection({ title, defaultExpanded = true, children }: { title: string; defaultExpanded?: boolean; children: ReactNode }) {
  return (
    <Accordion className="pp-form-section" defaultExpanded={defaultExpanded} disableGutters elevation={0} square>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}><Typography className="pp-form-section-title">{title}</Typography></AccordionSummary>
      <AccordionDetails><Stack gap={2}>{children}</Stack></AccordionDetails>
    </Accordion>
  );
}

/** A labelled on/off row: label and optional description on the left, the themed Switch on the right. */
export function SettingSwitch({ label, description, checked, onChange, children, disabled = false }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void; children?: ReactNode; disabled?: boolean }) {
  return (
    <Box>
      <FormControlLabel
        className="pp-form-switch"
        disabled={disabled}
        labelPlacement="start"
        control={<Switch checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />}
        label={<Box><Typography className="pp-form-switch-label">{label}</Typography>{description && <Typography className="pp-form-switch-text">{description}</Typography>}</Box>}
      />
      {checked && children && <Stack gap={1.5} sx={{ mt: 1.5 }}>{children}</Stack>}
    </Box>
  );
}

const HEX = /^#[0-9a-f]{6}$/i;

/** A colour as an editable hex field with a swatch that opens the system picker. */
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const valid = HEX.test(text);
  // A stable adornment: a new element on every render makes MUI's FormControl update after every commit.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const adornment = useMemo(() => (
    <InputAdornment position="start">
      <Box component="label" className="pp-form-swatch" sx={{ background: value }}>
        <input type="color" aria-label={`${label} picker`} value={value} onChange={(event) => onChangeRef.current(event.target.value)} />
      </Box>
    </InputAdornment>
  ), [label, value]);
  return (
    <TextField
      label={label}
      value={text}
      error={!valid}
      helperText={valid ? undefined : 'Use a hex colour like #5517B8.'}
      onChange={(event) => {
        const next = event.target.value.trim();
        setText(next);
        if (HEX.test(next)) onChange(next.toLowerCase());
      }}
      onBlur={() => setText(value)}
      InputProps={{ startAdornment: adornment }}
    />
  );
}

/** A number with both a slider and a typed value; out-of-range input is clamped. */
export function NumberSlider({ label, value: raw, min, max, step = 1, unit = '', onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }) {
  const value = Number.isFinite(raw) ? raw : min;
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next / step) * step));
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography className="pp-form-control-label" id={`${label}-label`}>{label}</Typography>
        <TextField
          className="compact pp-form-number"
          type="number"
          value={value}
          inputProps={{ min, max, step, 'aria-label': label }}
          onChange={(event) => event.target.value !== '' && onChange(clamp(Number(event.target.value)))}
          InputProps={{ endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined }}
        />
      </Stack>
      <Slider aria-labelledby={`${label}-label`} min={min} max={max} step={step} value={value} onChange={(_, next) => onChange(next as number)} />
    </Box>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; icon?: ReactElement };

/** Either/or choices that set a value (DESIGN.md: themed ToggleButtonGroup, small). Icon-only options get a tooltip. */
export function Segmented<T extends string>({ label, value, options, onChange, iconOnly = false }: { label: string; value: T; options: SegmentOption<T>[]; onChange: (value: T) => void; iconOnly?: boolean }) {
  return (
    <Box>
      <Typography className="pp-form-control-label" sx={{ mb: 0.75 }}>{label}</Typography>
      <ToggleButtonGroup exclusive fullWidth size="small" aria-label={label} value={value} onChange={(_, next) => next && onChange(next)} className="pp-form-segmented">
        {options.map((option) => {
          const button = <ToggleButton key={option.value} value={option.value} aria-label={option.label}>{option.icon}{!iconOnly && <span>{option.label}</span>}</ToggleButton>;
          return iconOnly ? <Tooltip key={option.value} title={option.label}>{button}</Tooltip> : button;
        })}
      </ToggleButtonGroup>
    </Box>
  );
}

const MAX_IMAGE_BYTES = 5_000_000;

/**
 * Uploads an image to the project's media storage and saves its hosted URL in the form draft.
 */
export function ImageField({ label, value, onChange, projectId }: { label: string; value: string; onChange: (value: string) => void; projectId: string }) {
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  return (
    <Box>
      <Typography className="pp-form-control-label" sx={{ mb: 0.75 }}>{label}</Typography>
      <Stack direction="row" gap={1} alignItems="center">
        <Box className="pp-form-image-thumb" sx={{ backgroundImage: value ? `url("${value}")` : undefined }}>{!value && <ImageOutlined fontSize="small" />}</Box>
        <Button component="label" variant="outlined" size="small" disabled={uploading}>
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
          <input
            hidden
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (file.size > MAX_IMAGE_BYTES) return setError('Choose an image under 5 MB.');
              if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) return setError('Choose a PNG, JPEG, GIF, or WebP image.');
              setError('');
              setUploading(true);
              try {
                const asset = await uploadFormImage(file, projectId);
                onChange(asset.url);
              } catch (cause) {
                setError((cause as { message?: string })?.message || 'That image could not be uploaded. Try again.');
              } finally { setUploading(false); }
            }}
          />
        </Button>
        {value && <Tooltip title="Remove image"><IconButton aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange('')}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>}
      </Stack>
      {error && <Typography role="alert" className="pp-form-error">{error}</Typography>}
    </Box>
  );
}

/** An editable list of short strings (list items, interest groups, permissions, dropdown options). */
export function StringList({ label, items, onChange, addLabel = 'Add item' }: { label: string; items: string[]; onChange: (items: string[]) => void; addLabel?: string }) {
  return (
    <Stack gap={1}>
      <Typography className="pp-form-control-label">{label}</Typography>
      {items.map((item, index) => (
        <Stack key={index} direction="row" gap={0.5} alignItems="center">
          <TextField fullWidth label={`${label} ${index + 1}`} value={item} onChange={(event) => onChange(items.map((current, at) => (at === index ? event.target.value : current)))} />
          <Tooltip title="Remove"><span><IconButton aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} disabled={items.length <= 1} onClick={() => onChange(items.filter((_, at) => at !== index))}><DeleteOutlineRounded fontSize="small" /></IconButton></span></Tooltip>
        </Stack>
      ))}
      <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => onChange([...items, ''])}>{addLabel}</Button>
    </Stack>
  );
}
