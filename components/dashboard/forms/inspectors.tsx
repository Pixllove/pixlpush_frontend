'use client';

import { useState } from 'react';
import { AddRounded, ArrowDownwardRounded, ArrowUpwardRounded, DeleteOutlineRounded, EditOutlined } from '@mui/icons-material';
import { Alert, Box, Button, Chip, IconButton, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import CodeEditor from './CodeEditor';
import { ColorField, ImageField, InspectorSection, NumberSlider, Segmented, SettingSwitch, StringList, type SegmentOption } from './controls';
import {
  blockErrors, contrastRatio, fieldTypeLabel, fieldTypes, fonts, makeField, moveField, removeField, socialPlatforms, successErrors, updateBlock, updateField,
  type Block, type FormDesign, type FormDraft, type FormField, type SocialPlatform,
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

/* ---------- Style tab: form-level design ---------- */

export function StylePanel({ draft, update }: { draft: FormDraft; update: Update }) {
  const d = draft.design;
  const set = <K extends keyof FormDesign>(key: K) => (value: FormDesign[K]) => update((current) => ({ ...current, design: { ...current.design, [key]: value } }), `design.${key}`);
  const usesSidebar = d.layout !== 'plain';
  const overlay = (draft.kind === 'popup' && (d.popupType === 'lightbox' || d.popupType === 'fullscreen')) || (draft.kind === 'promotion' && d.promoPosition === 'center');
  const fullBleed = (draft.kind === 'popup' && (d.popupType === 'bar' || d.popupType === 'fullscreen')) || (draft.kind === 'promotion' && d.promoPosition === 'banner');
  const background = d.transparent ? '#ffffff' : d.background;

  return (
    <Box>
      <InspectorSection title={draft.kind === 'embedded' ? 'Placement' : 'Type and position'}>
        {draft.kind === 'popup' && (
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
        {draft.kind === 'promotion' && <Segmented label="Position" iconOnly value={d.promoPosition} onChange={set('promoPosition')} options={[{ value: 'center', label: 'Centred', icon: glyph('center') }, { value: 'corner', label: 'Corner', icon: glyph('corner') }, { value: 'banner', label: 'Bottom banner', icon: glyph('barBottom') }]} />}
        {draft.kind === 'embedded' && <Segmented label="Alignment on the page" iconOnly value={d.align} onChange={set('align')} options={[{ value: 'left', label: 'Left', icon: glyph('alignLeft') }, { value: 'center', label: 'Centre', icon: glyph('center') }, { value: 'right', label: 'Right', icon: glyph('alignRight') }]} />}
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
            <ImageField label="Side panel image" value={d.sidebarImage} onChange={set('sidebarImage')} />
            {d.sidebarImage && <Segmented label="Image fit" value={d.sidebarFit} onChange={set('sidebarFit')} options={[{ value: 'fill', label: 'Fill' }, { value: 'fit', label: 'Fit' }]} />}
          </>
        )}
        <NumberSlider label="Corner radius" unit="px" min={0} max={32} value={d.radius} onChange={set('radius')} />
        <SettingSwitch label="Shadow" checked={d.shadow} onChange={set('shadow')} />
      </InspectorSection>

      <InspectorSection title="Background">
        <SettingSwitch label="Transparent background" description="Let the page behind the form show through." checked={d.transparent} onChange={set('transparent')} />
        {!d.transparent && <ColorField label="Background colour" value={d.background} onChange={set('background')} />}
        <ImageField label="Background image" value={d.backgroundImage} onChange={set('backgroundImage')} />
      </InspectorSection>

      <InspectorSection title="Text">
        <TextField select label="Font" value={d.font} onChange={(event) => set('font')(event.target.value as FormDesign['font'])}>
          {fonts.map((font) => <MenuItem key={font} value={font} sx={{ fontFamily: font }}>{font}</MenuItem>)}
        </TextField>
        <ColorField label="Heading colour" value={d.headingColor} onChange={set('headingColor')} />
        <ColorField label="Text colour" value={d.textColor} onChange={set('textColor')} />
        <ColorField label="Field label colour" value={d.labelColor} onChange={set('labelColor')} />
        <ContrastWarning pairs={[['Headings', d.headingColor, background], ['Text', d.textColor, background]]} />
      </InspectorSection>

      <InspectorSection title="Fields and button" defaultExpanded={false}>
        <ColorField label="Field background" value={d.inputBg} onChange={set('inputBg')} />
        <ColorField label="Field border" value={d.inputBorder} onChange={set('inputBorder')} />
        <NumberSlider label="Field radius" unit="px" min={0} max={24} value={d.inputRadius} onChange={set('inputRadius')} />
        <ColorField label="Button colour" value={d.buttonBg} onChange={set('buttonBg')} />
        <ColorField label="Button text colour" value={d.buttonText} onChange={set('buttonText')} />
        <NumberSlider label="Button radius" unit="px" min={0} max={24} value={d.buttonRadius} onChange={set('buttonRadius')} />
        <ContrastWarning pairs={[['Button text', d.buttonText, d.buttonBg]]} />
      </InspectorSection>

      {draft.kind !== 'embedded' && (
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
      )}
    </Box>
  );
}

/* ---------- block inspector ---------- */

export function BlockInspector({ block, draft, update }: { block: Block; draft: FormDraft; update: Update }) {
  const set = (patch: Partial<Block>, key?: string) => update((current) => updateBlock(current, block.id, patch), key && `${block.id}.${key}`);
  const error = blockErrors(block);
  const colorOr = (value: string | undefined, fallback: string) => value ?? fallback;
  const d = draft.design;

  return (
    <Stack gap={2} sx={{ p: 2 }}>
      {error && <Alert severity="warning">{error}</Alert>}

      {(block.type === 'heading' || block.type === 'text') && (
        <>
          <TextField label={block.type === 'heading' ? 'Heading' : 'Text'} multiline={block.type === 'text'} rows={block.type === 'text' ? 4 : undefined} value={block.text ?? ''} onChange={(event) => set({ text: event.target.value }, 'text')} />
          <Segmented label="Alignment" value={block.align ?? 'left'} onChange={(align) => set({ align })} options={alignOptions} />
          <NumberSlider label="Size" unit="px" min={11} max={48} value={block.size ?? (block.type === 'heading' ? 24 : 15)} onChange={(size) => set({ size }, 'size')} />
          <Segmented label="Weight" value={String(block.weight ?? (block.type === 'heading' ? 700 : 400)) as '400' | '600' | '700'} onChange={(weight) => set({ weight: Number(weight) })} options={[{ value: '400', label: 'Regular' }, { value: '600', label: 'Semibold' }, { value: '700', label: 'Bold' }]} />
          <ColorField label="Colour" value={colorOr(block.color, block.type === 'heading' ? d.headingColor : d.textColor)} onChange={(color) => set({ color }, 'color')} />
          {block.color && <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => set({ color: undefined })}>Use the form&apos;s colour</Button>}
        </>
      )}

      {(block.type === 'image' || block.type === 'imageText') && (
        <>
          <ImageField label="Image" value={block.src ?? ''} onChange={(src) => set({ src })} />
          <TextField label="Alt text" helperText="Describes the image for screen readers." value={block.alt ?? ''} onChange={(event) => set({ alt: event.target.value }, 'alt')} />
          {block.type === 'image' && (
            <>
              <TextField label="Link (optional)" placeholder="https://" value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />
              <NumberSlider label="Width" unit="%" min={20} max={100} step={5} value={block.width ?? 100} onChange={(width) => set({ width }, 'width')} />
              <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />
            </>
          )}
          {block.type === 'imageText' && (
            <>
              <TextField label="Text" multiline rows={3} value={block.text ?? ''} onChange={(event) => set({ text: event.target.value }, 'text')} />
              <Segmented label="Image side" value={block.side ?? 'left'} onChange={(side) => set({ side })} options={[{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
            </>
          )}
        </>
      )}

      {block.type === 'button' && (
        <>
          <TextField label="Button text" value={block.label ?? ''} onChange={(event) => set({ label: event.target.value }, 'label')} />
          <Segmented label="When clicked" value={block.action ?? 'url'} onChange={(action) => set({ action })} options={[{ value: 'url', label: 'Open a link' }, { value: 'submit', label: 'Submit the form' }]} />
          {block.action !== 'submit' && <TextField label="Link" placeholder="https://" value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />}
          <SettingSwitch label="Full width" checked={block.fullWidth ?? true} onChange={(fullWidth) => set({ fullWidth })} />
          {!block.fullWidth && <Segmented label="Alignment" value={block.align ?? 'left'} onChange={(align) => set({ align })} options={alignOptions} />}
          <ColorField label="Button colour" value={colorOr(block.bg, d.buttonBg)} onChange={(bg) => set({ bg }, 'bg')} />
          <ColorField label="Text colour" value={colorOr(block.textColor, d.buttonText)} onChange={(textColor) => set({ textColor }, 'textColor')} />
          <NumberSlider label="Corner radius" unit="px" min={0} max={24} value={block.radius ?? d.buttonRadius} onChange={(radius) => set({ radius }, 'radius')} />
        </>
      )}

      {block.type === 'divider' && (
        <>
          <ColorField label="Colour" value={block.color ?? '#eae6ef'} onChange={(color) => set({ color }, 'color')} />
          <NumberSlider label="Thickness" unit="px" min={1} max={8} value={block.thickness ?? 1} onChange={(thickness) => set({ thickness }, 'thickness')} />
          <NumberSlider label="Space above and below" unit="px" min={0} max={40} value={block.spacing ?? 8} onChange={(spacing) => set({ spacing }, 'spacing')} />
        </>
      )}

      {block.type === 'countdown' && (
        <>
          <TextField label="Ends at" type="datetime-local" InputLabelProps={{ shrink: true }} value={block.endsAt ?? ''} onChange={(event) => set({ endsAt: event.target.value })} helperText="In your local time zone." />
          <TextField label="Label above the timer" value={block.text ?? ''} onChange={(event) => set({ text: event.target.value }, 'text')} />
          <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />
          <Segmented label="When time runs out" value={block.onExpire ?? 'text'} onChange={(onExpire) => set({ onExpire })} options={[{ value: 'text', label: 'Show a message' }, { value: 'hide', label: 'Hide the timer' }]} />
          {block.onExpire !== 'hide' && <TextField label="Message" value={block.expiredText ?? ''} onChange={(event) => set({ expiredText: event.target.value }, 'expiredText')} />}
        </>
      )}

      {block.type === 'social' && (
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
          <NumberSlider label="Icon size" unit="px" min={24} max={56} value={block.size ?? 32} onChange={(size) => set({ size }, 'size')} />
          <Segmented label="Alignment" value={block.align ?? 'center'} onChange={(align) => set({ align })} options={alignOptions} />
          <ColorField label="Icon colour" value={colorOr(block.color, d.headingColor)} onChange={(color) => set({ color }, 'color')} />
        </>
      )}

      {block.type === 'list' && (
        <>
          <StringList label="Item" items={block.items ?? []} addLabel="Add item" onChange={(items) => set({ items }, 'items')} />
          <NumberSlider label="Size" unit="px" min={11} max={24} value={block.size ?? 15} onChange={(size) => set({ size }, 'size')} />
        </>
      )}

      {block.type === 'video' && <TextField label="Video link" placeholder="https://youtube.com/watch?v=…" helperText="A YouTube link or a direct .mp4 / .webm file." value={block.href ?? ''} onChange={(event) => set({ href: event.target.value }, 'href')} />}

      {block.type === 'code' && (
        <CodeEditor value={block.html ?? ''} onChange={(html) => set({ html }, 'html')} />
      )}
    </Stack>
  );
}

/* ---------- signup fields ---------- */

export function FieldsInspector({ block, draft, update }: { block: Block; draft: FormDraft; update: Update }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const setField = (field: FormField, patch: Partial<FormField>, key?: string) => update((current) => updateField(current, field.id, patch), key && `${field.id}.${key}`);

  return (
    <Box>
      <InspectorSection title="Fields">
        <Stack gap={0.5}>
          {draft.fields.map((field, index) => (
            <Box key={field.id} className="pp-form-field-row">
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap className="pp-form-switch-label">{field.label || fieldTypeLabel[field.type]}{field.required ? ' *' : ''}</Typography>
                  <Typography className="pp-form-switch-text">{fieldTypeLabel[field.type]}</Typography>
                </Box>
                <Tooltip title="Move up"><span><IconButton aria-label={`Move ${field.label} up`} disabled={index === 0} onClick={() => update((current) => moveField(current, field.id, -1))}><ArrowUpwardRounded fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Move down"><span><IconButton aria-label={`Move ${field.label} down`} disabled={index === draft.fields.length - 1} onClick={() => update((current) => moveField(current, field.id, 1))}><ArrowDownwardRounded fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title={editing === field.id ? 'Close' : 'Edit'}><IconButton aria-label={`Edit ${field.label}`} aria-expanded={editing === field.id} onClick={() => setEditing(editing === field.id ? null : field.id)}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                <Tooltip title={field.type === 'email' ? 'Email is required on every form' : 'Remove'}><span><IconButton aria-label={`Remove ${field.label}`} disabled={field.type === 'email'} onClick={() => update((current) => removeField(current, field.id))}><DeleteOutlineRounded fontSize="small" /></IconButton></span></Tooltip>
              </Stack>
              {editing === field.id && (
                <Stack gap={1.5} sx={{ pt: 1.5 }}>
                  <TextField label="Label" value={field.label} onChange={(event) => setField(field, { label: event.target.value }, 'label')} />
                  {field.type === 'hidden'
                    ? <TextField label="Value" value={field.value} onChange={(event) => setField(field, { value: event.target.value }, 'value')} helperText="Saved on every subscriber from this form." />
                    : field.type !== 'checkbox' && <TextField label="Placeholder" value={field.placeholder} onChange={(event) => setField(field, { placeholder: event.target.value }, 'placeholder')} />}
                  {field.type === 'select' && <StringList label="Option" items={field.options} addLabel="Add option" onChange={(options) => setField(field, { options }, 'options')} />}
                  {field.type !== 'hidden' && <SettingSwitch label="Required" description={field.type === 'email' ? 'Email is always required.' : undefined} checked={field.required} onChange={(required) => field.type !== 'email' && setField(field, { required })} />}
                  {field.type !== 'hidden' && <SettingSwitch label="Half width" description="Sits next to another half-width field." checked={field.half} onChange={(half) => setField(field, { half })} />}
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
      <InspectorSection title="Layout and button">
        <TextField label="Button text" value={block.label ?? ''} onChange={(event) => update((current) => updateBlock(current, block.id, { label: event.target.value }), `${block.id}.label`)} />
        <Segmented label="Field layout" value={draft.design.display} onChange={(display) => update((current) => ({ ...current, design: { ...current.design, display } }))} options={[{ value: 'stacked', label: 'Stacked' }, { value: 'horizontal', label: 'In one row' }]} />
        <SettingSwitch label="Labels above fields" description="Otherwise the label is shown as placeholder text." checked={draft.options.labelsAbove} onChange={(labelsAbove) => update((current) => ({ ...current, options: { ...current.options, labelsAbove } }))} />
      </InspectorSection>
    </Box>
  );
}

/* ---------- form settings (nothing selected) ---------- */

export function FormSettings({ draft, update }: { draft: FormDraft; update: Update }) {
  const o = draft.options;
  const set = <K extends keyof FormDraft['options']>(key: K, value: FormDraft['options'][K], typing?: string) => update((current) => ({ ...current, options: { ...current.options, [key]: value } }), typing && `options.${typing}`);
  return (
    <Box>
      <InspectorSection title="Consent and privacy">
        <SettingSwitch label="Privacy policy" description="A line with a link to your privacy policy." checked={o.privacy.on} onChange={(on) => set('privacy', { ...o.privacy, on })}>
          <TextField label="Text before the link" value={o.privacy.text} onChange={(event) => set('privacy', { ...o.privacy, text: event.target.value }, 'privacy.text')} />
          <TextField label="Privacy policy link" placeholder="https://" value={o.privacy.url} onChange={(event) => set('privacy', { ...o.privacy, url: event.target.value }, 'privacy.url')} />
        </SettingSwitch>
        <SettingSwitch label="Confirmation checkbox" description="Subscribers must tick it to sign up." checked={o.consent.on} onChange={(on) => set('consent', { ...o.consent, on })}>
          <TextField label="Checkbox text" multiline rows={2} value={o.consent.text} onChange={(event) => set('consent', { ...o.consent, text: event.target.value }, 'consent.text')} />
        </SettingSwitch>
        <SettingSwitch label="Marketing permissions (GDPR)" description="Let subscribers choose how you contact them." checked={o.permissions.on} onChange={(on) => set('permissions', { ...o.permissions, on })}>
          <TextField label="Intro text" value={o.permissions.text} onChange={(event) => set('permissions', { ...o.permissions, text: event.target.value }, 'permissions.text')} />
          <StringList label="Permission" items={o.permissions.items} addLabel="Add permission" onChange={(items) => set('permissions', { ...o.permissions, items }, 'permissions.items')} />
        </SettingSwitch>
      </InspectorSection>
      <InspectorSection title="Segmentation">
        <SettingSwitch label="Interest groups" description="Subscribers pick the topics they want." checked={o.interests.on} onChange={(on) => set('interests', { ...o.interests, on })}>
          <TextField label="Question" value={o.interests.label} onChange={(event) => set('interests', { ...o.interests, label: event.target.value }, 'interests.label')} />
          <StringList label="Interest" items={o.interests.items} addLabel="Add interest" onChange={(items) => set('interests', { ...o.interests, items }, 'interests.items')} />
        </SettingSwitch>
        <SettingSwitch label="Hidden segmentation field" description="Tags every subscriber from this form with a value." checked={o.hidden.on} onChange={(on) => set('hidden', { ...o.hidden, on })}>
          <TextField label="Field name" value={o.hidden.name} onChange={(event) => set('hidden', { ...o.hidden, name: event.target.value }, 'hidden.name')} />
          <TextField label="Value" placeholder="spring-campaign" value={o.hidden.value} onChange={(event) => set('hidden', { ...o.hidden, value: event.target.value }, 'hidden.value')} />
        </SettingSwitch>
      </InspectorSection>
      <InspectorSection title="Protection">
        <SettingSwitch label="reCAPTCHA" description="Blocks spam sign-ups with an invisible check." checked={o.recaptcha} onChange={(recaptcha) => set('recaptcha', recaptcha)} />
        <SettingSwitch label="Double opt-in" description="New subscribers confirm by email before they are added." checked={o.doubleOptIn} onChange={(doubleOptIn) => set('doubleOptIn', doubleOptIn)} />
      </InspectorSection>
    </Box>
  );
}

/* ---------- success ---------- */

export function SuccessInspector({ draft, update }: { draft: FormDraft; update: Update }) {
  const s = draft.success;
  const errors = successErrors(s);
  const set = (patch: Partial<FormDraft['success']>, key?: string) => update((current) => ({ ...current, success: { ...current.success, ...patch } }), key && `success.${key}`);
  return (
    <Stack gap={2} sx={{ p: 2 }}>
      <Segmented label="After someone signs up" value={s.mode} onChange={(mode) => set({ mode })} options={[{ value: 'message', label: 'Show a message' }, { value: 'redirect', label: 'Go to a page' }]} />
      {s.mode === 'redirect' ? (
        <TextField label="Page address" placeholder="https://example.com/thanks" value={s.redirectUrl} error={Boolean(errors.redirectUrl)} helperText={errors.redirectUrl} onChange={(event) => set({ redirectUrl: event.target.value }, 'redirectUrl')} />
      ) : (
        <>
          <TextField label="Heading" value={s.heading} onChange={(event) => set({ heading: event.target.value }, 'heading')} />
          <TextField label="Message" multiline rows={3} value={s.text} onChange={(event) => set({ text: event.target.value }, 'text')} />
          <TextField label="Discount code (optional)" value={s.coupon} onChange={(event) => set({ coupon: event.target.value.toUpperCase() }, 'coupon')} helperText="Shown in a box people can copy." />
          <TextField label="Button text (optional)" value={s.buttonLabel} onChange={(event) => set({ buttonLabel: event.target.value }, 'buttonLabel')} />
          {s.buttonLabel.trim() && <TextField label="Button link" placeholder="https://" value={s.buttonUrl} error={Boolean(errors.buttonUrl)} helperText={errors.buttonUrl} onChange={(event) => set({ buttonUrl: event.target.value }, 'buttonUrl')} />}
        </>
      )}
      {draft.options.doubleOptIn && <Chip size="small" label="Double opt-in is on: people also get a confirmation email." />}
    </Stack>
  );
}
