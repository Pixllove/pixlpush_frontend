'use client';

import { useEffect, useState, type Dispatch, type DragEvent, type ReactNode } from 'react';
import {
  ArrowBackRounded, ArrowDownwardRounded, ArrowDropDownCircleOutlined, ArrowForwardRounded, CheckBoxOutlined, EventOutlined, NumbersRounded, PaletteOutlined, PhoneOutlined, ShortTextRounded, ArrowUpwardRounded, CheckRounded, CloseRounded, CodeRounded, ContentCopyRounded, DeleteOutlineRounded,
  DesktopWindowsOutlined, DragIndicatorRounded, FormatListBulletedRounded, HorizontalRuleRounded, ImageOutlined, InputRounded, NotesRounded,
  PhoneIphoneOutlined, RedoRounded, ShareOutlined, SmartButtonOutlined, SmartDisplayOutlined, TabletMacOutlined, TimerOutlined, TitleRounded,
  TuneRounded, UndoRounded, ViewQuiltOutlined, VisibilityOutlined, WidgetsOutlined } from '@mui/icons-material';
import { Box, Button, Dialog, Drawer, IconButton, Skeleton, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FormStage, type InlineEdit } from './FormRenderer';
import { SaveStatus } from './shared';
import BlockToolbar from './BlockToolbar';
import { BlockSections, FieldsDesign, FieldsSettings, FormSettings, StylePanel, SuccessDesignInspector, SuccessInspector, type Update } from './inspectors';
import { blockLabel, blockTypes, duplicateBlock, insertBlock, makeBlock, makeField, moveBlock, removeBlock, updateBlock, updateField, withFieldsBlock, type Block, type BlockType, type EditorAction, type EditorState, type FieldType, type FormDraft } from './model';

export type SaveState = 'saved' | 'saving' | 'error';
type Device = 'desktop' | 'tablet' | 'mobile';

const blockIcon: Record<BlockType, ReactNode> = {
  heading: <TitleRounded />, text: <NotesRounded />, image: <ImageOutlined />, imageText: <ViewQuiltOutlined />, button: <SmartButtonOutlined />,
  divider: <HorizontalRuleRounded />, countdown: <TimerOutlined />, social: <ShareOutlined />, list: <FormatListBulletedRounded />,
  video: <SmartDisplayOutlined />, code: <CodeRounded />, fields: <InputRounded />,
};

const NEW_BLOCK = 'application/x-pixlpush-block';
const NEW_FIELD = 'application/x-pixlpush-field';

/** Inputs people can add from the palette. Email is always there; hidden values live in Settings. */
const paletteFields: Array<{ type: FieldType; label: string; icon: ReactNode }> = [
  { type: 'text', label: 'Text input', icon: <ShortTextRounded /> },
  { type: 'phone', label: 'Phone', icon: <PhoneOutlined /> },
  { type: 'number', label: 'Number', icon: <NumbersRounded /> },
  { type: 'select', label: 'Dropdown', icon: <ArrowDropDownCircleOutlined /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckBoxOutlined /> },
  { type: 'textarea', label: 'Long text', icon: <NotesRounded /> },
  { type: 'date', label: 'Date', icon: <EventOutlined /> },
];
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The editor works on the wizard's draft state directly, so every edit is a single render and a single autosave. */
export default function FormEditor({ state, dispatch, saveState, onBack, onDone, projectId, doneLabel = 'Save and continue' }: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  saveState: SaveState;
  onBack: () => void;
  onDone: () => void;
  projectId: string;
  doneLabel?: string;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const draft = state.draft;
  const [selected, setSelected] = useState<string | null>(null);
  // A part inside the selected block that has its own tools (the signup form's submit button).
  const [part, setPart] = useState<string | null>(null);
  const [view, setView] = useState<'form' | 'success'>('form');
  // Take people to the place where they can finish the choice they just made.
  const followMode = (mode: FormDraft['success']['mode']) => {
    if (mode === 'message') {
      setView('success');
      setSelected(null);
      setTab('design');
      return;
    }
    setView('form');
    setTab('design');
    setSelected(draft.blocks.find((block) => block.type === 'fields')?.id ?? null);
    setPart('submit');
  };
  const [device, setDevice] = useState<Device>('desktop');
  const [tab, setTab] = useState<'design' | 'settings'>('design');
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const [preview, setPreview] = useState(false);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);

  const update: Update = (fn, key) => dispatch({ type: 'update', fn, key });
  const selectedBlock = draft.blocks.find((block) => block.id === selected);

  const select = (id: string | null) => {
    setSelected(id);
    // Every block, signup fields included, is edited in Design.
    if (id) setTab('design');
    if (id && !desktop) setDrawer('right');
  };

  const addBlock = (type: BlockType, afterId = selected) => {
    const block = makeBlock(type);
    update((current) => insertBlock(current, block, afterId));
    setView('form');
    setSelected(block.id);
    setTab('design');
    setDrawer(null);
  };

  /** Adds an input to the signup fields and opens their settings, where it can be edited. */
  const addField = (type: FieldType) => {
    update((current) => ({ ...withFieldsBlock(current), fields: [...current.fields, makeField(type)] }));
    const fieldsBlock = draft.blocks.find((block) => block.type === 'fields');
    setView('form');
    setSelected(fieldsBlock?.id ?? null);
    setTab('design');
    if (!desktop) setDrawer('right');
    else setDrawer(null);
  };

  const remove = (id: string) => {
    const index = draft.blocks.findIndex((block) => block.id === id);
    update((current) => removeBlock(current, id));
    setSelected(draft.blocks[index + 1]?.id ?? draft.blocks[index - 1]?.id ?? null);
  };

  const move = (id: string, by: -1 | 1) => update((current) => moveBlock(current, id, current.blocks.findIndex((block) => block.id === id) + by));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z' && !isTyping(event.target)) {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' });
      } else if (mod && event.key.toLowerCase() === 'y' && !isTyping(event.target)) {
        event.preventDefault();
        dispatch({ type: 'redo' });
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selected && !isTyping(event.target) && selectedBlock?.type !== 'fields') {
        event.preventDefault();
        remove(selected);
      } else if (event.key === 'Escape' && selected && !isTyping(event.target)) {
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* drag and drop: existing blocks reorder, palette items insert */
  const onDragOver = (event: DragEvent, block: Block) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDrop({ id: block.id, after: event.clientY > rect.top + rect.height / 2 });
  };
  const onDrop = (event: DragEvent, block: Block) => {
    event.preventDefault();
    const after = event.clientY > event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2;
    setDrop(null);
    const field = event.dataTransfer.getData(NEW_FIELD) as FieldType;
    if (field) { addField(field); return; }
    const fresh = event.dataTransfer.getData(NEW_BLOCK) as BlockType;
    const target = draft.blocks.findIndex((item) => item.id === block.id);
    if (fresh) {
      const previous = after ? block.id : draft.blocks[target - 1]?.id;
      const created = makeBlock(fresh);
      update((current) => previous ? insertBlock(current, created, previous) : { ...current, blocks: [created, ...current.blocks] });
      setSelected(created.id);
      return;
    }
    const id = event.dataTransfer.getData('text/plain');
    const from = draft.blocks.findIndex((item) => item.id === id);
    if (from === -1 || id === block.id) return;
    let to = target + (after ? 1 : 0);
    if (from < to) to -= 1;
    update((current) => moveBlock(current, id, to));
  };

  // Typing on the canvas: same undo grouping as the sidebar (one history step per field being typed in).
  const inlineEdit: InlineEdit = {
    block: (id, patch, key) => update((current) => updateBlock(current, id, patch), key),
    field: (id, patch, key) => update((current) => updateField(current, id, patch), key),
    success: (patch, key) => update((current) => ({ ...current, success: { ...current.success, ...patch } }), key),
  };

  const wrap = (block: Block, node: ReactNode) => {
    const active = selected === block.id;
    const index = draft.blocks.indexOf(block);
    return (
      <div
        className={`pp-form-block${active ? ' is-selected' : ''}${drop?.id === block.id ? (drop.after ? ' drop-after' : ' drop-before') : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${blockLabel[block.type]} block`}
        aria-pressed={active}
        draggable={!active}
        onDragStart={(event) => { event.dataTransfer.setData('text/plain', block.id); event.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(event) => onDragOver(event, block)}
        onDragLeave={() => setDrop(null)}
        onDrop={(event) => onDrop(event, block)}
        onDragEnd={() => setDrop(null)}
        onClick={(event) => { event.stopPropagation(); setPart((event.target as HTMLElement).closest('[data-pp-part]')?.getAttribute('data-pp-part') ?? null); select(block.id); }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(block.id); }
          if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); move(block.id, -1); }
          if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); move(block.id, 1); }
        }}
      >
        <span className={`pp-form-block-bar${active && part === 'submit' ? ' is-below' : ''}`} onClick={(event) => event.stopPropagation()}>
        <span className="pp-form-block-chip" aria-hidden draggable onDragStart={(event) => { event.dataTransfer.setData('text/plain', block.id); event.dataTransfer.effectAllowed = 'move'; }}><DragIndicatorRounded />{blockLabel[block.type]}</span>
        {active && (
          <span className="pp-form-block-tools">
            <BlockToolbar block={block} part={part} draft={draft} update={update} openPanel={(next) => { setTab(next); if (!desktop) setDrawer('right'); }} />
            <Tooltip title="Move up (Alt+↑)"><span><IconButton aria-label="Move block up" disabled={index === 0} onClick={() => move(block.id, -1)}><ArrowUpwardRounded /></IconButton></span></Tooltip>
            <Tooltip title="Move down (Alt+↓)"><span><IconButton aria-label="Move block down" disabled={index === draft.blocks.length - 1} onClick={() => move(block.id, 1)}><ArrowDownwardRounded /></IconButton></span></Tooltip>
            {block.type !== 'fields' && <Tooltip title="Duplicate"><IconButton aria-label="Duplicate block" onClick={() => { const result = duplicateBlock(draft, block.id); update(() => result.draft); setSelected(result.id ?? null); }}><ContentCopyRounded /></IconButton></Tooltip>}
            {block.type !== 'fields' && <Tooltip title="Delete (Del)"><IconButton aria-label="Delete block" onClick={() => remove(block.id)}><DeleteOutlineRounded /></IconButton></Tooltip>}
          </span>
        )}
        </span>
        {node}
      </div>
    );
  };

  const elements = (
    <Box className="pp-form-palette">
      <Typography className="pp-form-hint" sx={{ px: 2, pt: 2 }}>Click to add, or drag onto the form.</Typography>
      <Typography className="pp-form-section-title" sx={{ px: 2, pt: 2 }}>Form fields</Typography>
      <Typography className="pp-form-hint" sx={{ px: 2 }}>Inputs people fill in. Email is always included.</Typography>
      <Box className="pp-form-palette-grid">
        {paletteFields.map((item) => (
          <button key={item.type} type="button" className="pp-form-palette-item" draggable onDragStart={(event) => event.dataTransfer.setData(NEW_FIELD, item.type)} onClick={() => addField(item.type)}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </Box>
      <Typography className="pp-form-section-title" sx={{ px: 2, pt: 1 }}>Content</Typography>
      <Box className="pp-form-palette-grid">
        {blockTypes.filter((type) => type !== 'fields').map((type) => (
          <button key={type} type="button" className="pp-form-palette-item" draggable onDragStart={(event) => event.dataTransfer.setData(NEW_BLOCK, type)} onClick={() => addBlock(type)}>
            {blockIcon[type]}<span>{blockLabel[type]}</span>
          </button>
        ))}
      </Box>
    </Box>
  );

  const leftPanel = (
    <Box className="pp-form-panel" component="aside" aria-label="Elements">
      <Box className="pp-form-panel-head"><Typography className="pp-form-panel-title">Elements</Typography></Box>
      {elements}
    </Box>
  );
  const successPanel = (
    <Box className="pp-form-panel" component="aside" aria-label="Success page">
      <Box className="pp-form-panel-head">
        <Typography className="pp-form-panel-title">Success page</Typography>
        <Typography className="pp-form-hint">Click the thank-you message in the preview to edit its words.</Typography>
      </Box>
    </Box>
  );

  // Both tabs always show the whole form; the clicked block's section opens, scrolls into view and is highlighted.
  const activeId = view === 'form' ? selectedBlock?.id ?? null : null;
  const fieldsBlock = draft.blocks.find((block) => block.type === 'fields');
  const rightPanel = (
    <Box className="pp-form-panel pp-form-sidebar" component="aside" aria-label="Design and settings">
      <Box className="pp-form-panel-tabs">
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="fullWidth" aria-label="Design and settings" sx={{
          // Plain underline tabs here, not the theme's segmented pill.
          '&&': { display: 'flex', width: '100%', m: 0, p: 0, border: 0, borderRadius: 0, bgcolor: 'transparent' },
          '& .MuiTabs-flexContainer': { gap: 0 },
          '& .MuiTabs-indicator': { top: 'auto', bottom: 0, height: 2, borderRadius: 0, bgcolor: 'var(--pp-accent)', boxShadow: 'none' },
          '& .MuiTab-root': { minHeight: 48, borderRadius: 0 },
          '& .MuiTab-root.Mui-selected': { color: 'var(--pp-accent)' },
        }}>
          <Tab value="design" label="Design" icon={<PaletteOutlined />} iconPosition="start" />
          <Tab value="settings" label="Settings" icon={<TuneRounded />} iconPosition="start" />
        </Tabs>
      </Box>
      {view === 'success' ? tab === 'design' ? (
        <>
          <Box className="pp-form-panel-head">
            <Typography className="pp-form-panel-title">Success page design</Typography>
            <Typography className="pp-form-hint">Choose what appears with your thank-you message. Click the preview to edit its words.</Typography>
          </Box>
          <SuccessDesignInspector draft={draft} update={update} />
        </>
      ) : (
        <>
          <Box className="pp-form-panel-head">
            <Typography className="pp-form-panel-title">After sign-up</Typography>
            <Typography className="pp-form-hint">Choose what people see after they join.</Typography>
          </Box>
          <Box sx={{ p: 2 }}><SuccessInspector draft={draft} update={update} onMode={followMode} /></Box>
        </>
      ) : tab === 'design' ? (
        <>
          <Box className="pp-form-panel-head">
            <Typography className="pp-form-panel-title">Design</Typography>
            <Typography className="pp-form-hint">How the form looks, and the content of each block. Click anything on the form to jump to it.</Typography>
          </Box>
          <StylePanel draft={draft} update={update} projectId={projectId} />
          {/* Signup form: clicking the button highlights the button section, clicking anywhere else the fields. */}
          {fieldsBlock && <FieldsSettings block={fieldsBlock} draft={draft} update={update} active={fieldsBlock.id === activeId && part !== 'submit'} />}
          {fieldsBlock && <FieldsDesign draft={draft} update={update} onMode={followMode} active={fieldsBlock.id === activeId && part === 'submit' ? 'submit' : null} />}
          <BlockSections draft={draft} update={update} projectId={projectId} activeId={activeId} />
        </>
      ) : (
        <>
          <Box className="pp-form-panel-head">
            <Typography className="pp-form-panel-title">Settings</Typography>
            <Typography className="pp-form-hint">Your form name, privacy choices and subscriber tags.</Typography>
          </Box>
          <FormSettings draft={draft} update={update} />
        </>
      )}
    </Box>
  );

  return (
    <Dialog fullScreen open transitionDuration={0} PaperProps={{ className: 'pp-form-editor' }} aria-label={`Form editor: ${draft.name}`} disableEscapeKeyDown>
      <Box component="header" className="pp-form-topbar">
        <Stack direction="row" alignItems="center" gap={1.5} className="pp-form-topbar-left">
          <Tooltip title="Save and go back to forms"><IconButton aria-label="Back to forms" onClick={onBack} className="pp-form-topbar-back"><ArrowBackRounded /></IconButton></Tooltip>
          <span className="pp-form-topbar-divider" aria-hidden />
          <Box sx={{ minWidth: 0 }} className="pp-form-topbar-title">
            <Typography className="pp-form-topbar-overline">Form builder</Typography>
            <Typography className="pp-form-topbar-name" noWrap>{draft.name}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.5} className="pp-form-topbar-centre">
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, value) => { if (!value) return; setView(value); setSelected(null); setPart(null); if (value === 'success') setTab('design'); }} aria-label="Editing">
            <ToggleButton value="form">Form</ToggleButton>
            <ToggleButton value="success">Success</ToggleButton>
          </ToggleButtonGroup>
          {desktop && (
            <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, value) => value && setDevice(value)} aria-label="Preview size" className="pp-form-topbar-devices">
              <ToggleButton value="desktop" aria-label="Desktop"><Tooltip title="Desktop"><DesktopWindowsOutlined /></Tooltip></ToggleButton>
              <ToggleButton value="tablet" aria-label="Tablet"><Tooltip title="Tablet"><TabletMacOutlined /></Tooltip></ToggleButton>
              <ToggleButton value="mobile" aria-label="Mobile"><Tooltip title="Mobile"><PhoneIphoneOutlined /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" gap={1} justifyContent="flex-end" className="pp-form-topbar-right">
          <Stack direction="row" className="pp-form-history" aria-label="History">
            <Tooltip title="Undo (Ctrl+Z)"><span><IconButton aria-label="Undo" disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}><UndoRounded /></IconButton></span></Tooltip>
            <Tooltip title="Redo (Ctrl+Shift+Z)"><span><IconButton aria-label="Redo" disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}><RedoRounded /></IconButton></span></Tooltip>
          </Stack>
          <SaveStatus state={saveState} />
          <span className="pp-form-topbar-divider" aria-hidden />
          <Tooltip title="Preview">
            <IconButton aria-label="Preview" onClick={() => setPreview(true)} className="pp-form-topbar-back pp-form-preview-icon"><VisibilityOutlined /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => setPreview(true)} className="pp-form-preview-full">Preview</Button>
          <Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={onDone} className="pp-form-done">{doneLabel}</Button>
        </Stack>
      </Box>

      {!desktop && (
        <Stack direction="row" gap={1} className="pp-form-mobilebar">
          {view === 'form' && <Button variant="outlined" size="small" startIcon={<WidgetsOutlined />} onClick={() => setDrawer('left')}>Add element</Button>}
          <Button variant="outlined" size="small" startIcon={<TuneRounded />} onClick={() => setDrawer('right')}>Design and settings</Button>
          <Button variant="outlined" size="small" startIcon={<VisibilityOutlined />} onClick={() => setPreview(true)}>Preview</Button>
        </Stack>
      )}

      <Box className="pp-form-workspace">
        {desktop && (view === 'form' ? leftPanel : successPanel)}
        <Box className="pp-form-canvas" onClick={() => setSelected(null)}>
          <DeviceFrame device={desktop ? device : 'mobile'}>
            <FormStage draft={draft} view={view} mode="editor" narrow={!desktop || device === 'mobile'} wrap={view === 'form' ? wrap : undefined} edit={inlineEdit} />
          </DeviceFrame>
        </Box>
        {desktop && rightPanel}
      </Box>

      {!desktop && (
        <Drawer anchor="bottom" open={drawer !== null} onClose={() => setDrawer(null)} PaperProps={{ className: 'pp-form-drawer' }} sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}><IconButton aria-label="Close panel" onClick={() => setDrawer(null)}><CloseRounded /></IconButton></Stack>
          {drawer === 'left' && view === 'form' ? leftPanel : rightPanel}
        </Drawer>
      )}

      <FormPreview draft={draft} open={preview} onClose={() => setPreview(false)} />
    </Dialog>
  );
}

/** A working preview: fields accept input and submitting shows the success view. */
export function FormPreview({ draft, open, onClose }: { draft: FormDraft; open: boolean; onClose: () => void }) {
  const [device, setDevice] = useState<Device>('desktop');
  const [view, setView] = useState<'form' | 'success' | 'closed'>('form');
  useEffect(() => { if (open) setView('form'); }, [open]);
  return (
    <Dialog fullScreen open={open} onClose={onClose} PaperProps={{ className: 'pp-form-editor' }} aria-label="Form preview">
      <Box component="header" className="pp-form-topbar" sx={{ display: 'grid !important', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}>
        <Typography className="pp-form-topbar-name" noWrap>Preview: {draft.name}</Typography>
        <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, value) => value && setDevice(value)} aria-label="Preview size" sx={{ justifySelf: 'center' }}>
          <ToggleButton value="desktop">Desktop</ToggleButton>
          <ToggleButton value="tablet">Tablet</ToggleButton>
          <ToggleButton value="mobile">Mobile</ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" gap={1} justifyContent="flex-end">
          {view !== 'form' && <Button variant="outlined" onClick={() => setView('form')}>Start again</Button>}
          <Button variant="contained" startIcon={<CloseRounded />} onClick={onClose}>Close preview</Button>
        </Stack>
      </Box>
      <Box className="pp-form-canvas">
        <DeviceFrame device={device}>
          {view === 'closed'
            ? <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }} gap={1}><Typography color="text.secondary">The visitor closed the form.</Typography><Button onClick={() => setView('form')}>Show it again</Button></Stack>
            : <FormStage draft={draft} view={view} mode="preview" narrow={device === 'mobile'} onSubmit={() => setView('success')} onClose={() => setView('closed')} />}
        </DeviceFrame>
      </Box>
    </Dialog>
  );
}

/** A browser window, tablet or phone around a sample page, sized like the real screen. */
function DeviceFrame({ device, children }: { device: Device; children: ReactNode }) {
  return (
    <div className={`pp-device is-${device}`}>
      {device === 'desktop'
        ? <div className="pp-device-bar" aria-hidden><i /><i /><i /><span>yourwebsite.com</span></div>
        : <div className="pp-device-speaker" aria-hidden />}
      <div className="pp-device-screen">{children}</div>
    </div>
  );
}

/** What a reload of the editor paints first: the editor's own shape, never the dashboard. */
export function EditorSkeleton() {
  return (
    <Box className="pp-form-editor" sx={{ position: 'fixed', inset: 0, zIndex: (theme) => theme.zIndex.modal }} aria-busy aria-label="Loading the form editor">
      <Box component="header" className="pp-form-topbar">
        <Stack direction="row" gap={1.5} alignItems="center"><Skeleton variant="rounded" width={40} height={40} /><Skeleton width={140} /></Stack>
        <Skeleton variant="rounded" width={260} height={36} />
        <Stack direction="row" gap={1.5} justifyContent="flex-end"><Skeleton variant="rounded" width={96} height={36} /><Skeleton variant="rounded" width={150} height={36} /></Stack>
      </Box>
      <Box className="pp-form-workspace">
        <Box className="pp-form-panel" sx={{ p: 2, display: { xs: 'none', md: 'block' } }}><Skeleton variant="rounded" height={320} /></Box>
        <Box className="pp-form-canvas"><Skeleton variant="rounded" sx={{ mx: 'auto', maxWidth: 1180, height: 'min(780px, calc(100vh - 160px))' }} /></Box>
        <Box className="pp-form-panel" sx={{ p: 2, display: { xs: 'none', md: 'block' } }}><Skeleton variant="rounded" height={48} sx={{ mb: 2 }} /><Skeleton variant="rounded" height={420} /></Box>
      </Box>
    </Box>
  );
}
