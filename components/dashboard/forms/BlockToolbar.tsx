'use client';

import { useState, type ReactNode } from 'react';
import {
  FormatAlignCenterRounded, FormatAlignJustifyRounded, FormatAlignLeftRounded, FormatAlignRightRounded, FormatBoldRounded,
  FormatColorFillRounded, FormatColorTextRounded, LabelOutlined, PaletteOutlined, PhotoSizeSelectLargeRounded, RoundedCornerRounded,
  TextDecreaseRounded, TextIncreaseRounded, ViewColumnRounded, ViewStreamRounded,
} from '@mui/icons-material';
import { IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from '@mui/material';
import { updateBlock, type Block, type FormDraft } from './model';
import type { Update } from './inspectors';

type Align = 'left' | 'center' | 'right' | 'full';
const alignIcon: Record<Align, ReactNode> = {
  left: <FormatAlignLeftRounded />, center: <FormatAlignCenterRounded />, right: <FormatAlignRightRounded />, full: <FormatAlignJustifyRounded />,
};
const alignLabel: Record<Align, string> = { left: 'Left', center: 'Center', right: 'Right', full: 'Full width' };

/** A tool that opens a short menu of choices, showing the current one as its icon. */
function MenuTool<T extends string | number>({ title, icon, value, options, onPick }: { title: string; icon: ReactNode; value: T; options: { value: T; label: string; icon?: ReactNode }[]; onPick: (value: T) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={title}><IconButton aria-label={title} aria-haspopup="menu" onClick={(event) => setAnchor(event.currentTarget)}>{icon}</IconButton></Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={(event) => event.stopPropagation()}>
        {options.map((option) => (
          <MenuItem key={option.value} dense selected={option.value === value} onClick={() => { onPick(option.value); setAnchor(null); }}>
            {option.icon && <ListItemIcon>{option.icon}</ListItemIcon>}{option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Colour picked with the browser's own picker, behind an icon. */
function ColorTool({ title, icon, value, onChange }: { title: string; icon: ReactNode; value: string; onChange: (value: string) => void }) {
  return (
    <Tooltip title={title}>
      <IconButton component="label" aria-label={title} sx={{ position: 'relative' }}>
        {icon}
        <span className="pp-form-tool-swatch" style={{ background: value }} />
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
      </IconButton>
    </Tooltip>
  );
}

/** Quick styling for the selected block, shown on the canvas next to it. Everything else lives in the side panel. */
export default function BlockToolbar({ block, part, draft, update, openPanel }: { block: Block; part?: string | null; draft: FormDraft; update: Update; openPanel: (tab: 'design' | 'settings') => void }) {
  const set = (patch: Partial<Block>, key?: string) => update((current) => updateBlock(current, block.id, patch), key && `${block.id}.${key}`);
  const d = draft.design;
  const tools: ReactNode[] = [];
  const t = block.type;

  const align = (choices: Align[], current: Align, pick: (value: Align) => void) => tools.push(
    <MenuTool key="align" title="Alignment" icon={alignIcon[current]} value={current} onPick={pick}
      options={choices.map((value) => ({ value, label: alignLabel[value], icon: alignIcon[value] }))} />,
  );

  /** Text size: A- / A+ in 1px steps, the same on every block that has text. */
  const sizeTools = (size: number, min: number, max: number, onSize: (size: number) => void) => tools.push(
    <Tooltip key="smaller" title={`Smaller text (${size}px)`}><span><IconButton aria-label="Smaller text" disabled={size <= min} onClick={() => onSize(size - 1)}><TextDecreaseRounded /></IconButton></span></Tooltip>,
    <Tooltip key="bigger" title={`Bigger text (${size}px)`}><span><IconButton aria-label="Bigger text" disabled={size >= max} onClick={() => onSize(size + 1)}><TextIncreaseRounded /></IconButton></span></Tooltip>,
  );

  /** One tool set for every button (a Button block or the signup form's submit button). */
  type Look = { variant: 'filled' | 'outline'; align: Align; radius: number; size: number; bg: string; text: string };
  const buttonTools = (look: Look, change: (patch: Partial<Look>, key?: string) => void) => {
    tools.push(<MenuTool key="style" title="Button style" icon={<span className="pp-form-tool-text">{look.variant === 'outline' ? 'Outline' : 'Filled'}</span>} value={look.variant}
      onPick={(variant) => change({ variant })} options={[{ value: 'filled', label: 'Filled' }, { value: 'outline', label: 'Outline' }]} />);
    align(['left', 'center', 'right', 'full'], look.align, (value) => change({ align: value }));
    tools.push(<MenuTool key="corners" title="Corners" icon={<RoundedCornerRounded />} value={look.radius} onPick={(radius) => change({ radius })}
      options={[{ value: 0, label: 'Square' }, { value: 6, label: 'Rounded' }, { value: 12, label: 'More rounded' }, { value: 24, label: 'Pill' }]} />);
    sizeTools(look.size, 11, 24, (size) => change({ size }, 'size'));
    tools.push(<ColorTool key="bg" title={look.variant === 'outline' ? 'Outline colour' : 'Button colour'} icon={<FormatColorFillRounded />} value={look.bg} onChange={(bg) => change({ bg }, 'bg')} />);
    if (look.variant !== 'outline') tools.push(<ColorTool key="text" title="Text colour" icon={<FormatColorTextRounded />} value={look.text} onChange={(text) => change({ text }, 'text')} />);
  };

  if (t === 'heading' || t === 'text') {
    const weight = block.weight ?? (t === 'heading' ? 700 : 400);
    align(['left', 'center', 'right'], block.align ?? 'left', (value) => set({ align: value as Block['align'] }));
    tools.push(<Tooltip key="bold" title="Bold"><IconButton aria-label="Bold" aria-pressed={weight >= 600} className={weight >= 600 ? 'is-on' : ''} onClick={() => set({ weight: weight >= 600 ? 400 : 700 })}><FormatBoldRounded /></IconButton></Tooltip>);
    sizeTools(block.size ?? (t === 'heading' ? 24 : 15), 11, 48, (size) => set({ size }, 'size'));
    tools.push(<ColorTool key="color" title="Text colour" icon={<FormatColorTextRounded />} value={block.color ?? (t === 'heading' ? d.headingColor : d.textColor)} onChange={(color) => set({ color }, 'color')} />);
  }

  if (t === 'button') {
    const full = block.fullWidth ?? true;
    buttonTools(
      { variant: block.variant ?? 'filled', align: full ? 'full' : block.align ?? 'left', radius: block.radius ?? d.buttonRadius, size: block.size ?? 15, bg: block.bg ?? d.buttonBg, text: block.textColor ?? d.buttonText },
      (p, key) => set({
        ...(p.variant && { variant: p.variant }), ...(p.radius !== undefined && { radius: p.radius }), ...(p.size !== undefined && { size: p.size }),
        ...(p.bg && { bg: p.bg }), ...(p.text && { textColor: p.text }),
        ...(p.align && (p.align === 'full' ? { fullWidth: true } : { fullWidth: false, align: p.align })),
      }, key),
    );
  }

  if (t === 'image') {
    align(['left', 'center', 'right'], block.align ?? 'center', (value) => set({ align: value as Block['align'] }));
    tools.push(<MenuTool key="width" title="Width" icon={<PhotoSizeSelectLargeRounded />} value={block.width ?? 100} onPick={(width) => set({ width })}
      options={[25, 50, 75, 100].map((value) => ({ value, label: `${value}%` }))} />);
  }

  if (t === 'countdown' || t === 'social') align(['left', 'center', 'right'], block.align ?? 'center', (value) => set({ align: value as Block['align'] }));
  if (t === 'list' || t === 'social' || t === 'imageText') tools.push(<ColorTool key="color" title="Colour" icon={<FormatColorTextRounded />} value={block.color ?? (t === 'social' ? d.headingColor : d.textColor)} onChange={(color) => set({ color }, 'color')} />);

  const setDesign = (patch: Partial<FormDraft['design']>, key?: string) => update((current) => ({ ...current, design: { ...current.design, ...patch } }), key);
  if (t === 'fields' && part === 'submit') {
    // Saved on the form design so the live form matches. Choosing an alignment puts the button on its own line.
    buttonTools(
      { variant: d.buttonStyle, align: d.display === 'horizontal' ? 'right' : d.buttonAlign, radius: d.buttonRadius, size: d.buttonSize, bg: d.buttonBg, text: d.buttonText },
      (p, key) => setDesign({
        ...(p.variant && { buttonStyle: p.variant }), ...(p.radius !== undefined && { buttonRadius: p.radius }), ...(p.size !== undefined && { buttonSize: p.size }),
        ...(p.bg && { buttonBg: p.bg }), ...(p.text && { buttonText: p.text }), ...(p.align && { buttonAlign: p.align, display: 'stacked' as const }),
      }, key && `design.button.${key}`),
    );
  } else if (t === 'fields') {
    const row = d.display === 'horizontal';
    if (draft.options.labelsAbove) tools.push(<MenuTool key="labelAlign" title="Label alignment" icon={alignIcon[d.labelAlign]} value={d.labelAlign} onPick={(labelAlign) => setDesign({ labelAlign })}
      options={(['left', 'center', 'right'] as const).map((value) => ({ value, label: `Labels ${alignLabel[value].toLowerCase()}`, icon: alignIcon[value] }))} />);
    tools.push(
      <Tooltip key="layout" title={row ? 'Stack fields' : 'Put fields in one row'}><IconButton aria-label={row ? 'Stack fields' : 'Put fields in one row'} onClick={() => setDesign({ display: row ? 'stacked' : 'horizontal' })}>{row ? <ViewStreamRounded /> : <ViewColumnRounded />}</IconButton></Tooltip>,
      <Tooltip key="labels" title={draft.options.labelsAbove ? 'Hide labels' : 'Show labels above fields'}><IconButton aria-label="Labels above fields" aria-pressed={draft.options.labelsAbove} className={draft.options.labelsAbove ? 'is-on' : ''} onClick={() => update((current) => ({ ...current, options: { ...current.options, labelsAbove: !current.options.labelsAbove } }))}><LabelOutlined /></IconButton></Tooltip>,
      <ColorTool key="fieldBg" title="Field background" icon={<FormatColorFillRounded />} value={d.inputBg} onChange={(inputBg) => setDesign({ inputBg }, 'design.inputBg')} />,
    );
  }

  tools.push(
    <Tooltip key="design" title="Edit in the side panel"><IconButton aria-label="Edit in the side panel" onClick={() => openPanel('design')}><PaletteOutlined /></IconButton></Tooltip>,
  );

  return <>{tools}<span className="pp-form-tool-sep" aria-hidden /></>;
}
