'use client';

import { useState } from 'react';
import { AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, DeleteOutlineRounded, EditOutlined, LockOutlined } from '@mui/icons-material';
import { Alert, Box, Button, IconButton, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CodeEditor from './CodeEditor';
import { ColorField, ImageField, InspectorSection, NumberSlider, Segmented, SettingSwitch, StringList, type SegmentOption } from './controls';
import {
  blockErrors, contrastRatio, fieldTypeLabel, fieldTypes, fonts, isHttpUrl, makeField, moveField, removeField, socialPlatforms, successErrors, updateBlock, updateField,
  type Block, type FormDesign, type FormDraft, type FormField, type SocialPlatform, blockLabel,
} from './model';

export type Update = (fn: (draft: FormDraft) => FormDraft, key?: string) => void;

/* ---------- glyphs for position and layout choices ---------- */

const glyphs: Record<string, JSX.Element> = {
  plain: <rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />,
  border: <><rect x="2" y="2" width="20" height="14" rx="2" fill="currentColor" /><rect x="5" y="5" width="14" height="8" rx="1" fill="var(--pp-surface)" /></>,
  topSidebar: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="2" y="2" width="20" height="5" rx="1" fill="currentColor" /></>,
  leftSidebar: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="2" y="2" width="7" height="14" rx="1" fill="currentColor" /></>,
  rightSidebar: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="15" y="2" width="7" height="14" rx="1" fill="currentColor" /></>,
  boxed: <><rect x="2" y="2" width="20" height="14" rx="2" fill="currentColor" opacity=".45" /><rect x="5" y="4.5" width="14" height="9" rx="1.5" fill="currentColor" /></>,
  center: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="8" y="6" width="8" height="6" rx="1" fill="currentColor" /></>,
  corner: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="13" y="9" width="7" height="5" rx="1" fill="currentColor" /></>,
  cornerLeft: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="4" y="9" width="7" height="5" rx="1" fill="currentColor" /></>,
  barTop: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="2" y="2" width="20" height="4" rx="1" fill="currentColor" /></>,
  barBottom: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="2" y="12" width="20" height="4" rx="1" fill="currentColor" /></>,
  full: <rect x="2" y="2" width="20" height="14" rx="2" fill="currentColor" />,
  alignLeft: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="4" y="5" width="9" height="8" rx="1" fill="currentColor" /></>,
  alignRight: <><rect x="2" y="2" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><rect x="11" y="5" width="9" height="8" rx="1" fill="currentColor" /></>,
};
const glyph = (name: string) => <svg width="24" height="18" viewBox="0 0 24 18" aria-hidden>{glyphs[name]}</svg>;

const alignOptions: SegmentOption<'left' | 'center' | 'right'>[] = [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }];

function ContrastWarning({ pairs }: { pairs: Array<[string, string, string]> }) {
  const failing = pairs.filter(([, a, b]) => contrastRatio(a, b) < 4.5).map(([name]) => name);
  if (failing.length === 0) return null;
  return <Alert severity="warning">{failing.join(' and ')} may be hard to read on this background (below 4.5:1 contrast).</Alert>;
}

/** Drag to choose which part of an image shows, and how far it is zoomed in. */
function ImageAdjust({ x, y, zoom, onX, onY, onZoom, onReset }: { x: number; y: number; zoom: number; onX: (v: number) => void; onY: (v: number) => void; onZoom: (v: number) => void; onReset: () => void }) {
  return (
    <Stack gap={1.5} sx={{ p: 1.5, border: '1px solid var(--pp-border)', borderRadius: 2, bgcolor: 'var(--pp-subtle)' }}>
      <Typography className="pp-form-hint">Drag the sliders to choose which part of the image shows. Zoom in to crop tighter.</Typography>
      <NumberSlider label="Move left ↔ right" unit="%" min={0} max={100} value={x} onChange={onX} />
      <NumberSlider label="Move up ↕ down" unit="%" min={0} max={100} value={y} onChange={onY} />
      <NumberSlider label="Zoom" unit="%" min={100} max={300} step={5} value={zoom} onChange={onZoom} />
      {(x !== 50 || y !== 50 || zoom !== 100) && <Button size="small" onClick={onReset} sx={{ alignSelf: 'flex-start', minWidth: 0, minHeight: 0, p: 0, mt: -0.5 }}>Reset image</Button>}
    </Stack>
  );
}

/* ---------- Style tab: form-level design ---------- */

export function StylePanel({ draft, update, projectId }: { draft: FormDraft; update: Update; projectId: string }) {
  const d = draft.design;
  const set = <K extends keyof FormDesign>(key: K) => (value: FormDesign[K]) => update((current) => ({ ...current, design: { ...current.design, [key]: value } }), `design.${key}`);
  const usesSidebar = d.layout !== 'plain';
  const overlay = d.popupType === 'lightbox' || d.popupType === 'fullscreen';
  const fullBleed = d.popupType === 'bar' || d.popupType === 'fullscreen';
  const background = d.transparent ? '#ffffff' : d.background;

  return (
    <Box>
      <InspectorSection title="Type and position">
        {draft.behaviour.modes.every((m) => m === 'inline') ? (
          <Typography className="pp-form-hint">This form sits inside your page (chosen in “How to use”), so pop-up type and overlay don’t apply.</Typography>
        ) : (
          <>
            <Segmented label="Pop-up type" iconOnly value={d.popupType} onChange={set('popupType')} options={[
              { value: 'lightbox', label: 'Lightbox (centre)', icon: glyph('center') },
              { value: 'slidein', label: 'Slide-in (corner)', icon: glyph('corner') },
              { value: 'bar', label: 'Floating bar', icon: glyph('barTop') },
              { value: 'fullscreen', label: 'Full screen', icon: glyph('full') },
            ]} />
            {d.popupType === 'slidein' && <Segmented label="Corner" value={d.slidePosition} onChange={set('slidePosition')} options={[{ value: 'left', label: 'Bottom left', icon: glyph('cornerLeft') }, { value: 'right', label: 'Bottom right', icon: glyph('corner') }]} />}
            {d.popupType === 'bar' && <Segmented label="Bar position" value={d.barPosition} onChange={set('barPosition')} options={[{ value: 'top', label: 'Top', icon: glyph('barTop') }, { value: 'bottom', label: 'Bottom', icon: glyph('barBottom') }]} />}
          </>
        )}
        <NumberSlider label={fullBleed ? 'Content width' : 'Width'} unit="px" min={300} max={960} step={10} value={d.width} onChange={set('width')} />
      </InspectorSection>

      <InspectorSection title="Layout">
        <Segmented label="Layout" iconOnly value={d.layout} onChange={set('layout')} options={[
          { value: 'plain', label: 'Plain', icon: glyph('plain') },
          { value: 'border', label: 'Border', icon: glyph('border') },
          { value: 'topSidebar', label: 'Image on top', icon: glyph('topSidebar') },
          { value: 'leftSidebar', label: 'Image on the left', icon: glyph('leftSidebar') },
          { value: 'rightSidebar', label: 'Image on the right', icon: glyph('rightSidebar') },
          { value: 'boxed', label: 'Boxed', icon: glyph('boxed') },
        ]} />
        {usesSidebar && <ColorField label={d.layout === 'border' ? 'Border colour' : d.layout === 'boxed' ? 'Outer colour' : 'Side panel colour'} value={d.sidebarColor} onChange={set('sidebarColor')} />}
        {(d.layout === 'topSidebar' || d.layout === 'leftSidebar' || d.layout === 'rightSidebar') && (
          <>
            <NumberSlider label={d.layout === 'topSidebar' ? 'Panel height' : 'Panel width'} unit="%" min={20} max={60} value={d.sidebarWidth} onChange={set('sidebarWidth')} />
            <ImageField label="Side panel image" value={d.sidebarImage} projectId={projectId} onChange={set('sidebarImage')} />
            <SettingSwitch label="Show on phones" description="Off: phones show just the form, so it fits the small screen. On: the panel moves above the form." checked={d.sidebarMobile} onChange={set('sidebarMobile')} />
            {d.sidebarImage && (
              <>
                <Segmented label="How the image fills the panel" value={d.sidebarFit} onChange={set('sidebarFit')} options={[{ value: 'fill', label: 'Fill' }, { value: 'fit', label: 'Fit' }]} />
                <Typography className="pp-form-hint">{d.sidebarFit === 'fill' ? 'The image covers the whole panel and may be cropped.' : 'The whole image is shown; the panel colour fills any gaps.'}</Typography>
                <ImageAdjust x={d.sidebarX} y={d.sidebarY} zoom={d.sidebarZoom} onX={set('sidebarX')} onY={set('sidebarY')} onZoom={set('sidebarZoom')}
                  onReset={() => update((current) => ({ ...current, design: { ...current.design, sidebarX: 50, sidebarY: 50, sidebarZoom: 100 } }))} />
              </>
            )}
          </>
        )}
        <NumberSlider label="Corner radius" unit="px" min={0} max={32} value={d.radius} onChange={set('radius')} />
        <SettingSwitch label="Shadow" checked={d.shadow} onChange={set('shadow')} />
      </InspectorSection>

      <InspectorSection title="Background">
        <SettingSwitch label="Transparent background" description="Let the page behind the form show through." checked={d.transparent} onChange={set('transparent')} />
        {!d.transparent && <ColorField label="Background colour" value={d.background} onChange={set('background')} />}
        <ImageField label="Background image" value={d.backgroundImage} projectId={projectId} onChange={set('backgroundImage')} />
        {d.backgroundImage && (
          <>
            <Segmented label="How the background sits" value={d.backgroundFit} onChange={set('backgroundFit')} options={[{ value: 'cover', label: 'Fill' }, { value: 'contain', label: 'Fit' }, { value: 'tile', label: 'Tile' }]} />
            <Typography className="pp-form-hint">{d.backgroundFit === 'cover' ? 'Covers the whole form and may be cropped.' : d.backgroundFit === 'contain' ? 'Shows the whole image; the background colour fills any gaps.' : 'Repeats to fill the form.'}</Typography>
            <ImageAdjust x={d.backgroundX} y={d.backgroundY} zoom={d.backgroundZoom} onX={set('backgroundX')} onY={set('backgroundY')} onZoom={set('backgroundZoom')}
              onReset={() => update((current) => ({ ...current, design: { ...current.design, backgroundX: 50, backgroundY: 50, backgroundZoom: 100 } }))} />
          </>
        )}
      </InspectorSection>

      <InspectorSection title="Fonts and colours">
        <TextField select label="Font" value={d.font} onChange={(event) => set('font')(event.target.value as FormDesign['font'])}>
          {fonts.map((font) => <MenuItem key={font} value={font} sx={{ fontFamily: font }}>{font}</MenuItem>)}
        </TextField>
        <ColorField label="Heading colour" value={d.headingColor} onChange={set('headingColor')} />
        <ColorField label="Text colour" value={d.textColor} onChange={set('textColor')} />
        <ContrastWarning pairs={[['Headings', d.headingColor, background], ['Text', d.textColor, background]]} />
      </InspectorSection>


      <InspectorSection title="Overlay and close" defaultExpanded={false}>
          {overlay ? (
            <>
              <ColorField label="Overlay colour" value={d.backdropColor} onChange={set('backdropColor')} />
              <NumberSlider label="Overlay opacity" unit="%" min={0} max={90} value={d.backdropOpacity} onChange={set('backdropOpacity')} />
            </>
          ) : <Typography className="pp-form-hint">This position has no overlay; the page stays visible.</Typography>}
          <SettingSwitch label="Close button" description="Visitors can dismiss the form." checked={d.showClose} onChange={set('showClose')}>
            <ColorField label="Close button colour" value={d.closeColor} onChange={set('closeColor')} />
          </SettingSwitch>
      </InspectorSection>
    </Box>
  );
}

/* ---------- block inspector ---------- */

export type Part = 'design' | 'settings';

/**
 * One block's controls, split the same way for every block: Settings holds what it says and does
 * (text, links, images, dates, items, code); Design holds how it looks (alignment, size, colours, spacing).
 */
export function BlockInspector({ block, draft, update, projectId, part, bare = false }: { block: Block; draft: FormDraft; update: Update; projectId: string; part: Part; bare?: boolean }) {
  const set = (patch: Partial<Block>, key?: string) => update((current) => updateBlock(current, block.id, patch), key && `${block.id}.${key}`);
  const error = blockErrors(block);
  const colorOr = (value: string | undefined, fallback: string) => value ?? fallback;
  const d = draft.design;
  const settings = part === 'settings';
  const none = (text: string) => <Typography className="pp-form-hint">{text}</Typography>;

  return (
    <Stack gap={2} sx={{ p: bare ? 0 : 2 }}>
      {settings && error && <Alert severity="warning">{error}</Alert>}

      {(block.type === 'heading' || block.type === 'text') && (
        <>
          {settings && !bare && <Typography className="pp-form-hint">Click the text on the form to change it.</Typography>}
          {!settings && <>
          <Segmented label="Alignment" value={block.align ?? 'left'} onChange={(align) => set({ align })} options={alignOptions} />
          <NumberSlider label="Size" unit="px" min={11} max={48} value={block.size ?? (block.type === 'heading' ? 24 : 15)} onChange={(size) => set({ size }, 'size')} />
          <Segmented label="Weight" value={String(block.weight ?? (block.type === 'heading' ? 700 : 400)) as '400' | '600' | '700'} onChange={(weight) => set({ weight: Number(weight) })} options={[{ value: '400', label: 'Regular' }, { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }]} />
          <ColorField label="Colour" value={colorOr(block.color, block.type === 'heading' ? d.headingColor : d.textColor)} onChange={(color) => set({ color }, 'color')} />
          {block.color && <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => set({ color: undefined })}>Use the form&apos;s colour</Button>}
          </>}
        </>
      )}

      {(block.type === 'image' || block.type === 'imageText') && (settings ? (
        <>
          <ImageField label="Image" value={block.src ?? ''} projectId={projectId} onChange={(src) => set({ src })} />
          <TextField label="Alt text" helperText="Describes the image for screen readers." value={block.alt ?? ''} onChange={(event) => set({ alt: event.target.value }, 'alt')} />
          {block.type === 'image' && <TextField label="Link (optional)" placeholder="https://" value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />}
          {block.type === 'imageText' && <Typography className="pp-form-hint">Click the text on the form to change it.</Typography>}
        </>
      ) : block.type === 'image' ? (
        <>
          <NumberSlider label="Width" unit="%" min={20} max={100} step={5} value={block.width ?? 100} onChange={(width) => set({ width }, 'width')} />
          <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />
        </>
      ) : (
        <>
          <Segmented label="Image side" value={block.side ?? 'left'} onChange={(side) => set({ side })} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
          <ColorField label="Text colour" value={colorOr(block.color, d.textColor)} onChange={(color) => set({ color }, 'color')} />
        </>
      ))}

      {block.type === 'button' && (settings ? (
        <>
          <Typography className="pp-form-hint">Click the button on the form to change its text.</Typography>
          <Segmented label="When clicked" value={block.action ?? 'url'} onChange={(action) => set({ action })} options={[{ value: 'url', label: 'Open a link' }, { value: 'submit', label: 'Submit the form' }]} />
          {block.action !== 'submit' && <TextField label="Link" placeholder="https://" value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />}
        </>
      ) : (
        <>
          <Segmented label="Style" value={block.variant ?? 'filled'} onChange={(variant) => set({ variant })} options={[{ value: 'filled', label: 'Filled' }, { value: 'outline', label: 'Outline' }]} />
          <NumberSlider label="Text size" unit="px" min={11} max={24} value={block.size ?? 15} onChange={(size) => set({ size }, 'size')} />
          <SettingSwitch label="Full width" checked={block.fullWidth ?? true} onChange={(fullWidth) => set({ fullWidth })} />
          {!(block.fullWidth ?? true) && <Segmented label="Alignment" value={block.align ?? 'left'} onChange={(align) => set({ align })} options={alignOptions} />}
          <ColorField label="Button colour" value={colorOr(block.bg, d.buttonBg)} onChange={(bg) => set({ bg }, 'bg')} />
          <ColorField label="Text colour" value={colorOr(block.textColor, d.buttonText)} onChange={(textColor) => set({ textColor }, 'textColor')} />
          <NumberSlider label="Corner radius" unit="px" min={0} max={24} value={block.radius ?? d.buttonRadius} onChange={(radius) => set({ radius }, 'radius')} />
          <ContrastWarning pairs={[['Button text', colorOr(block.textColor, d.buttonText), colorOr(block.bg, d.buttonBg)]]} />
        </>
      ))}

      {block.type === 'divider' && (settings ? none('A divider has nothing to set up. Change its colour and spacing in Design.') : (
        <>
          <ColorField label="Colour" value={block.color ?? '#eae6ef'} onChange={(color) => set({ color }, 'color')} />
          <NumberSlider label="Thickness" unit="px" min={1} max={8} value={block.thickness ?? 1} onChange={(thickness) => set({ thickness }, 'thickness')} />
          <NumberSlider label="Space above and below" unit="px" min={0} max={40} value={block.spacing ?? 8} onChange={(spacing) => set({ spacing }, 'spacing')} />
        </>
      ))}

      {block.type === 'countdown' && (settings ? (
        <>
          <TextField label="Ends at" type="datetime-local" InputLabelProps={{ shrink: true }} value={block.endsAt ?? ''} onChange={(event) => set({ endsAt: event.target.value })} helperText="In your local time zone." />
          <TextField label="Label above the timer" value={block.text ?? ''} onChange={(event) => set({ text: event.target.value }, 'text')} />
          <Segmented label="When time runs out" value={block.onExpire ?? 'text'} onChange={(onExpire) => set({ onExpire })} options={[{ value: 'text', label: 'Show a message' }, { value: 'hide', label: 'Hide the timer' }]} />
          {block.onExpire !== 'hide' && <TextField label="Message" value={block.expiredText ?? ''} onChange={(event) => set({ expiredText: event.target.value }, 'expiredText')} />}
        </>
      ) : <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />)}

      {block.type === 'social' && (settings ? (
        <>
          {(block.links ?? []).map((link, index) => (
            <Stack key={index} gap={1} className="pp-form-row-card">
              <Stack direction="row" gap={1} alignItems="center">
                <TextField select fullWidth label="Platform" value={link.platform} onChange={(event) => set({ links: (block.links ?? []).map((item, at) => at === index ? { ...item, platform: event.target.value as SocialPlatform } : item) })}>
                  {socialPlatforms.map((platform) => <MenuItem key={platform} value={platform}>{platform}</MenuItem>)}
                </TextField>
                <Tooltip title="Remove link"><IconButton aria-label={`Remove ${link.platform} link`} onClick={() => set({ links: (block.links ?? []).filter((_, at) => at !== index) })}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
              </Stack>
              <TextField label={`${link.platform} address`} value={link.url} onChange={(event) => set({ links: (block.links ?? []).map((item, at) => at === index ? { ...item, url: event.target.value } : item) }, `link${index}`)} />
            </Stack>
          ))}
          <Button variant="outlined" size="small" startIcon={<AddRounded />} sx={{ alignSelf: 'flex-start' }} onClick={() => set({ links: [...(block.links ?? []), { platform: 'X', url: 'https://' }] })}>Add link</Button>
        </>
      ) : (
        <>
          <NumberSlider label="Icon size" unit="px" min={24} max={56} value={block.size ?? 32} onChange={(size) => set({ size }, 'size')} />
          <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />
          <ColorField label="Icon colour" value={colorOr(block.color, d.headingColor)} onChange={(color) => set({ color }, 'color')} />
        </>
      ))}

      {block.type === 'list' && (settings
        ? <StringList label="Item" items={block.items ?? []} addLabel="Add item" onChange={(items) => set({ items }, 'items')} />
        : (
          <>
            <NumberSlider label="Size" unit="px" min={11} max={24} value={block.size ?? 15} onChange={(size) => set({ size }, 'size')} />
            <ColorField label="Colour" value={colorOr(block.color, d.textColor)} onChange={(color) => set({ color }, 'color')} />
          </>
        ))}

      {block.type === 'video' && (settings
        ? <TextField label="Video link" placeholder="https://youtube.com/watch?v=…" helperText="A YouTube link or a direct .mp4 / .webm file." value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />
        : none('A video fills the form width. Change the form width in Design with nothing selected.'))}

      {block.type === 'code' && (settings
        ? <CodeEditor value={block.html ?? ''} onChange={(html) => set({ html }, 'html')} />
        : none('Custom code is styled by its own CSS. Write a <style> tag in Settings.'))}
    </Stack>
  );
}

/** Every content block, in order: what it says and how it looks. The block clicked on the form opens and is highlighted. */
export function BlockSections({ draft, update, projectId, activeId }: { draft: FormDraft; update: Update; projectId: string; activeId?: string | null }) {
  const blocks = draft.blocks.filter((block) => block.type !== 'fields');
  const count = (type: Block['type']) => blocks.filter((block) => block.type === type);
  return (
    <>
      {blocks.map((block) => {
        const same = count(block.type);
        const title = same.length > 1 ? `${blockLabel[block.type]} ${same.indexOf(block) + 1}` : blockLabel[block.type];
        return (
          <InspectorSection key={block.id} title={title} active={block.id === activeId} defaultExpanded={false}>
            <BlockInspector block={block} draft={draft} update={update} projectId={projectId} part="settings" bare />
            <BlockInspector block={block} draft={draft} update={update} projectId={projectId} part="design" bare />
          </InspectorSection>
        );
      })}
    </>
  );
}

/* ---------- signup fields ---------- */

/** What each field type checks when someone signs up (the server checks the same). */
const fieldTypeHelp: Record<FormField['type'], string> = {
  email: 'Must be a valid email address.',
  text: 'One line of text, up to 500 characters.',
  textarea: 'Several lines, for messages or comments (up to 2,000 characters).',
  phone: 'Opens the phone keypad on mobiles.',
  number: 'Only numbers are accepted.',
  select: 'People pick one of your options.',
  checkbox: 'A single tick box, for example “I agree”.',
  date: 'People pick a date from a calendar. Saved as YYYY-MM-DD.',
  hidden: 'Not shown. Saves the value below on every subscriber.',
};

/** Settings for the signup fields: which inputs there are. Their text and the button text are typed on the form. */
export function FieldsSettings({ block, draft, update, active = false }: { block: Block; draft: FormDraft; update: Update; active?: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const setField = (field: FormField, patch: Partial<FormField>, key?: string) => update((current) => updateField(current, field.id, patch), key && `${field.id}.${key}`);

  return (
    <Box>
      <InspectorSection title="What people fill in" active={active}>
        <Typography className="pp-form-hint">The details you ask for. Email is always included. Use <strong>Add field</strong> to ask for more, like a name or phone number.</Typography>
        <Stack gap={0.5}>
          {draft.fields.map((field, index) => (
            <Box key={field.id} className="pp-form-field-row">
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap className="pp-form-switch-label">{field.label || fieldTypeLabel[field.type]}{field.required ? ' *' : ''}</Typography>
                  <Typography className="pp-form-switch-text">{field.type === 'email' ? 'Always included' : fieldTypeLabel[field.type]}</Typography>
                </Box>
                <Tooltip title="Move up"><span><IconButton aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => update((current) => moveField(current, field.id, -1))}><ArrowUpwardRounded fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Move down"><span><IconButton aria-label={`Move ${field.label} down`} disabled={index === draft.fields.length - 1} onClick={() => update((current) => moveField(current, field.id, 1))}><ArrowDownwardRounded fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={editing === field.id ? 'Close' : 'Edit'}><IconButton aria-label={`Edit ${field.label}`} aria-expanded={editing === field.id} onClick={() => setEditing(editing === field.id ? null : field.id)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                {field.type === 'email'
                  ? <Tooltip title="Every form collects an email, so this field stays."><LockOutlined fontSize="small" sx={{ mx: 1, color: 'text.disabled' }} aria-label="Email is always included" /></Tooltip>
                  : <Tooltip title="Remove"><IconButton aria-label={`Remove ${field.label}`} onClick={() => update((current) => removeField(current, field.id))}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>}
              </Stack>
              {editing === field.id && (
                <Stack gap={1.5} sx={{ pt: 1.5 }}>
                  {field.type !== 'email' && (
                    <TextField select label="Field type" value={field.type} helperText={fieldTypeHelp[field.type]}
                      onChange={(event) => {
                        const type = event.target.value as FormField['type'];
                        setField(field, { type, ...(type === 'select' && field.options.length === 0 ? { options: ['Option 1', 'Option 2'] } : {}) });
                      }}>
                      {fieldTypes.filter((type) => type !== 'email').map((type) => <MenuItem key={type} value={type}>{fieldTypeLabel[type]}</MenuItem>)}
                    </TextField>
                  )}
                  {/* Labels and hint text are typed on the form itself; only what can't be seen there is edited here. */}
                  {(field.type === 'hidden' || (!draft.options.labelsAbove && field.type !== 'checkbox')) && <TextField label="Label" helperText={field.type === 'hidden' ? undefined : 'Labels are hidden on this form, so name the field here.'} value={field.label} onChange={(event) => setField(field, { label: event.target.value }, 'label')} />}
                  {field.type === 'hidden'
                    ? <TextField label="Value" value={field.value} onChange={(event) => setField(field, { value: event.target.value }, 'value')} helperText="Saved on every subscriber from this form." />
                    : field.type === 'select'
                      ? <TextField label="Placeholder" value={field.placeholder} onChange={(event) => setField(field, { placeholder: event.target.value }, 'placeholder')} />
                      : field.type !== 'checkbox' && field.type !== 'date' && <Typography className="pp-form-hint">Click the field on the form to change its label or hint text.</Typography>}
                  {field.type === 'select' && <StringList label="Option" items={field.options} addLabel="Add option" onChange={(options) => setField(field, { options }, 'options')} />}
                  {field.type !== 'hidden' && <SettingSwitch label="Required" description={field.type === 'email' ? 'Email is always required.' : undefined} checked={field.required} onChange={(required) => field.type !== 'email' && setField(field, { required })} />}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
        <Button variant="outlined" size="small" startIcon={<AddRounded />} sx={{ alignSelf: 'flex-start' }} aria-haspopup="menu" onClick={(event) => setMenu(event.currentTarget)}>Add field</Button>
        <Menu anchorEl={menu} open={Boolean(menu)} onClose={() => setMenu(null)}>
          {fieldTypes.filter((type) => type !== 'email').map((type) => (
            <MenuItem key={type} onClick={() => {
              const field = makeField(type);
              update((current) => ({ ...current, fields: [...current.fields, field] }));
              setEditing(field.id);
              setMenu(null);
            }}>{fieldTypeLabel[type]}</MenuItem>
          ))}
        </Menu>
      </InspectorSection>
    </Box>
  );
}

/** Design for the signup fields: layout, labels and the input and button colours. */
export function FieldsDesign({ draft, update, active, onMode }: { draft: FormDraft; update: Update; active?: 'inputs' | 'submit' | null; onMode?: (mode: FormDraft['success']['mode']) => void }) {
  const d = draft.design;
  const set = <K extends keyof FormDesign>(key: K) => (value: FormDesign[K]) => update((current) => ({ ...current, design: { ...current.design, [key]: value } }), `design.${key}`);
  const hint = (text: string) => <Typography className="pp-form-hint">{text}</Typography>;
  return (
    <Box>
      <InspectorSection title="Input boxes" active={active === 'inputs'}>
        {hint('The boxes people type their details into. Tip: click a box on the form to change its label or hint text.')}
        <Segmented label="Arrange boxes" value={d.display} onChange={set('display')} options={[{ value: 'stacked', label: 'One under another' }, { value: 'horizontal', label: 'Side by side' }]} />
        <SettingSwitch label="Show a title above each box" description="Off: the title shows inside the empty box instead." checked={draft.options.labelsAbove} onChange={(labelsAbove) => update((current) => ({ ...current, options: { ...current.options, labelsAbove } }))} />
        {draft.options.labelsAbove && <Segmented label="Title position" value={d.labelAlign} onChange={set('labelAlign')} options={alignOptions} />}
        {draft.options.labelsAbove && <ColorField label="Title colour" value={d.labelColor} onChange={set('labelColor')} />}
        <ColorField label="Box colour" value={d.inputBg} onChange={set('inputBg')} />
        <ColorField label="Box outline colour" value={d.inputBorder} onChange={set('inputBorder')} />
        <NumberSlider label="Rounded corners" unit="px" min={0} max={24} value={d.inputRadius} onChange={set('inputRadius')} />
      </InspectorSection>
      <InspectorSection title="Sign-up button" active={active === 'submit'}>
        {hint('The button people click to join. Tip: click it on the form to change its text or style it right there.')}
        <AfterSubscribe draft={draft} update={update} onMode={onMode} />
        <Segmented label="Look" value={d.buttonStyle} onChange={set('buttonStyle')} options={[{ value: 'filled', label: 'Solid colour' }, { value: 'outline', label: 'Outline only' }]} />
        {d.display !== 'horizontal'
          ? <Segmented label="Width and position" value={d.buttonAlign} onChange={set('buttonAlign')} options={[{ value: 'full', label: 'Full width' }, { value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Right' }]} />
          : hint('The boxes are side by side, so the button sits at the end of the row.')}
        <ColorField label={d.buttonStyle === 'outline' ? 'Outline and text colour' : 'Button colour'} value={d.buttonBg} onChange={set('buttonBg')} />
        {d.buttonStyle !== 'outline' && <ColorField label="Text colour" value={d.buttonText} onChange={set('buttonText')} />}
        <NumberSlider label="Text size" unit="px" min={11} max={24} value={d.buttonSize} onChange={set('buttonSize')} />
        <NumberSlider label="Rounded corners" unit="px" min={0} max={24} value={d.buttonRadius} onChange={set('buttonRadius')} />
        {d.buttonStyle !== 'outline' && <ContrastWarning pairs={[['Button text', d.buttonText, d.buttonBg]]} />}
      </InspectorSection>
    </Box>
  );
}

/* ---------- Settings tab: everything about the form, always visible ---------- */

export function FormSettings({ draft, update }: { draft: FormDraft; update: Update }) {
  const o = draft.options;
  const set = <K extends keyof FormDraft['options']>(key: K, value: FormDraft['options'][K], typing?: string) => update((current) => ({ ...current, options: { ...current.options, [key]: value } }), typing && `options.${typing}`);
  return (
    <Box>
      <InspectorSection title="Name">
        <TextField label="Form name" value={draft.name} error={!draft.name.trim()} helperText={draft.name.trim() ? 'Only your team sees this name.' : 'Enter a name for the form.'}
          onChange={(event) => update((current) => ({ ...current, name: event.target.value }), 'name')} />
      </InspectorSection>
      <InspectorSection title="Consent and privacy">
        <SettingSwitch label="Privacy policy link" description="Shows a line with a link to your privacy policy." checked={o.privacy.on} onChange={(on) => set('privacy', { ...o.privacy, on })}>
          <TextField label="Text before the link" value={o.privacy.text} onChange={(event) => set('privacy', { ...o.privacy, text: event.target.value }, 'privacy.text')} />
          <TextField label="Privacy policy link" placeholder="https://example.com/privacy" value={o.privacy.url} error={o.privacy.on && !isHttpUrl(o.privacy.url)} helperText={o.privacy.on && !isHttpUrl(o.privacy.url) ? 'Enter the full web address, such as https://example.com/privacy.' : ' '} onChange={(event) => set('privacy', { ...o.privacy, url: event.target.value }, 'privacy.url')} />
        </SettingSwitch>
        <SettingSwitch label="Consent checkbox" description="People must tick it before they can sign up." checked={o.consent.on} onChange={(on) => set('consent', { ...o.consent, on })}>
          <TextField label="Checkbox text" multiline rows={2} value={o.consent.text} onChange={(event) => set('consent', { ...o.consent, text: event.target.value }, 'consent.text')} />
        </SettingSwitch>
      </InspectorSection>
      <InspectorSection title="Tag new subscribers">
        <SettingSwitch label="Add a tag" description="Saves the same value on everyone who signs up here, so you can find them later (for example source = spring-sale)." checked={o.hidden.on} onChange={(on) => set('hidden', { ...o.hidden, on })}>
          <TextField label="Tag name" value={o.hidden.name} onChange={(event) => set('hidden', { ...o.hidden, name: event.target.value }, 'hidden.name')} />
          <TextField label="Tag value" placeholder="spring-sale" value={o.hidden.value} onChange={(event) => set('hidden', { ...o.hidden, value: event.target.value }, 'hidden.value')} />
        </SettingSwitch>
      </InspectorSection>
      <InspectorSection title="Spam protection" defaultExpanded={false}>
        <Typography color="text.secondary" fontSize="var(--fs-13)">Always on. A hidden check and request limits stop bots; you don’t need to set anything up.</Typography>
      </InspectorSection>
    </Box>
  );
}

/* ---------- success ---------- */

/** What clicking Subscribe does: show the success message, or send people to a page. Shown on the button and on Success. */
function AfterSubscribe({ draft, update, onMode }: { draft: FormDraft; update: Update; onMode?: (mode: FormDraft['success']['mode']) => void }) {
  const s = draft.success;
  const set = (patch: Partial<FormDraft['success']>, key?: string) => update((current) => ({ ...current, success: { ...current.success, ...patch } }), key && `success.${key}`);
  // Only complain once they have typed something: an empty "https://" is just the starting point.
  const error = successErrors(s).redirectUrl;
  return (
    <>
      <Segmented label="After someone subscribes" value={s.mode} onChange={(mode) => { set({ mode, chosen: true }); onMode?.(mode); }} options={[{ value: 'message', label: 'Show message' }, { value: 'redirect', label: 'Redirect' }]} />
      {s.mode === 'redirect'
        ? <TextField label="Page to send people to" placeholder="https://example.com/thank-you" value={s.redirectUrl === 'https://' ? '' : s.redirectUrl} error={Boolean(error)} helperText={error ?? 'People go here after joining. Leave it blank to show your success page instead.'} onChange={(event) => set({ redirectUrl: event.target.value.trim() }, 'redirectUrl')} />
        : hint('People will see your success page after joining. Edit its content under Design or click the preview.')}
    </>
  );
}

const hint = (text: string) => <Typography className="pp-form-hint">{text}</Typography>;

export function SuccessInspector({ draft, update, onMode }: { draft: FormDraft; update: Update; onMode?: (mode: FormDraft['success']['mode']) => void }) {
  return (
    <Stack gap={2}>
      <AfterSubscribe draft={draft} update={update} onMode={onMode} />
    </Stack>
  );
}

/** Controls only for the success page. The optional image reuses the image already chosen for the form. */
export function SuccessDesignInspector({ draft, update }: { draft: FormDraft; update: Update }) {
  const s = draft.success;
  const set = <K extends keyof FormDraft['success']>(key: K, value: FormDraft['success'][K]) => update((current) => ({ ...current, success: { ...current.success, [key]: value } }), `success.${String(key)}`);
  const buttonError = successErrors(s).buttonUrl;
  if (s.mode === 'redirect') {
    return <Typography className="pp-form-hint">Your success page is hidden while “Redirect” is selected. Choose “Show message” under Settings to design it.</Typography>;
  }
  return (
    <Box>
      <InspectorSection title="Message content">
        <Typography className="pp-form-hint">Edit the text here or click it in the preview.</Typography>
        <TextField label="Heading" value={s.heading} onChange={(event) => set('heading', event.target.value)} />
        <TextField label="Message" multiline rows={3} value={s.text} onChange={(event) => set('text', event.target.value)} />
        <TextField label="Discount code (optional)" value={s.coupon} onChange={(event) => set('coupon', event.target.value.toUpperCase())} helperText="Shown in a box people can copy." />
        <TextField label="Button text (optional)" value={s.buttonLabel} onChange={(event) => set('buttonLabel', event.target.value)} />
        {s.buttonLabel.trim() && <TextField label="Button link" placeholder="https://" value={s.buttonUrl} error={Boolean(buttonError)} helperText={buttonError ?? 'Where this button takes people.'} onChange={(event) => set('buttonUrl', event.target.value)} />}
      </InspectorSection>
      <InspectorSection title="Layout and image" defaultExpanded={false}>
        <NumberSlider label="Success page width" unit="px" min={280} max={960} step={10} value={s.width ?? draft.design.width} onChange={(width) => set('width', width)} />
        <SettingSwitch label="Show close button" description="Let people close the popup from this page." checked={s.showClose ?? draft.design.showClose} onChange={(showClose) => set('showClose', showClose)} />
        <SettingSwitch label="Show image on success page" description={draft.design.sidebarImage ? 'Uses the image chosen in Form → Design.' : 'Add an image in Form → Design first, then choose whether it appears here.'} checked={s.showImage} onChange={(showImage) => set('showImage', showImage)} />
      </InspectorSection>
      <InspectorSection title="Colours" defaultExpanded={false}>
        <ColorField label="Background colour" value={s.background ?? draft.design.background} onChange={(background) => set('background', background)} />
        <ColorField label="Heading colour" value={s.headingColor ?? draft.design.headingColor} onChange={(headingColor) => set('headingColor', headingColor)} />
        <ColorField label="Message colour" value={s.textColor ?? draft.design.textColor} onChange={(textColor) => set('textColor', textColor)} />
        {s.buttonLabel.trim() && <>
          <ColorField label="Button colour" value={s.buttonColor ?? draft.design.buttonBg} onChange={(buttonColor) => set('buttonColor', buttonColor)} />
          <ColorField label="Button text colour" value={s.buttonText ?? draft.design.buttonText} onChange={(buttonText) => set('buttonText', buttonText)} />
        </>}
      </InspectorSection>
    </Box>
  );
}
