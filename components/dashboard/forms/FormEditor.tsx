'use client';

import { useEffect, useState, type Dispatch, type DragEvent, type ReactNode } from 'react';
import {
  ArrowBackRounded, ArrowDownwardRounded, ArrowUpwardRounded, CheckRounded, CloseRounded, CodeRounded, ContentCopyRounded, DeleteOutlineRounded,
  DesktopWindowsOutlined, DragIndicatorRounded, FormatListBulletedRounded, HorizontalRuleRounded, ImageOutlined, InputRounded, NotesRounded,
  PhoneIphoneOutlined, RedoRounded, ShareOutlined, SmartButtonOutlined, SmartDisplayOutlined, TabletMacOutlined, TimerOutlined, TitleRounded,
  TuneRounded, UndoRounded, ViewQuiltOutlined, VisibilityOutlined, WidgetsOutlined,
} from '@mui/icons-material';
import { Box, Button, Dialog, Drawer, IconButton, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FormStage } from './FormRenderer';
import { SaveStatus } from './shared';
import { BlockInspector, FieldsInspector, FormSettings, StylePanel, SuccessInspector, type Update } from './inspectors';
import { blockLabel, blockTypes, duplicateBlock, insertBlock, makeBlock, moveBlock, removeBlock, type Block, type BlockType, type EditorAction, type EditorState, type FormDraft } from './model';

export type SaveState = 'saved' | 'saving' | 'error';
type Device = 'desktop' | 'tablet' | 'mobile';

const blockIcon: Record<BlockType, ReactNode> = {
  heading: <TitleRounded />, text: <NotesRounded />, image: <ImageOutlined />, imageText: <ViewQuiltOutlined />, button: <SmartButtonOutlined />,
  divider: <HorizontalRuleRounded />, countdown: <TimerOutlined />, social: <ShareOutlined />, list: <FormatListBulletedRounded />,
  video: <SmartDisplayOutlined />, code: <CodeRounded />, fields: <InputRounded />,
};

const NEW_BLOCK = 'application/x-pixlpush-block';
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The editor works on the wizard's draft state directly, so every edit is a single render and a single autosave. */
export default function FormEditor({ state, dispatch, saveState, onBack, onDone }: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  saveState: SaveState;
  onBack: () => void;
  onDone: () => void;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const draft = state.draft;
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'form' | 'success'>('form');
  const [device, setDevice] = useState<Device>('desktop');
  const [leftTab, setLeftTab] = useState<'elements' | 'style'>('elements');
  const [drawer, setDrawer] = useState<'left' | 'right' | null>(null);
  const [preview, setPreview] = useState(false);
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);

  const update: Update = (fn, key) => dispatch({ type: 'update', fn, key });
  const selectedBlock = draft.blocks.find((block) => block.id === selected);

  const select = (id: string | null) => {
    setSelected(id);
    if (id && !desktop) setDrawer('right');
  };

  const addBlock = (type: BlockType, afterId = selected) => {
    const block = makeBlock(type);
    update((current) => insertBlock(current, block, afterId));
    setView('form');
    setSelected(block.id);
    setDrawer(null);
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
        draggable
        onDragStart={(event) => { event.dataTransfer.setData('text/plain', block.id); event.dataTransfer.effectAllowed = 'move'; }}
        onDragOver={(event) => onDragOver(event, block)}
        onDragLeave={() => setDrop(null)}
        onDrop={(event) => onDrop(event, block)}
        onDragEnd={() => setDrop(null)}
        onClick={(event) => { event.stopPropagation(); select(block.id); }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(block.id); }
          if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); move(block.id, -1); }
          if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); move(block.id, 1); }
        }}
      >
        <span className="pp-form-block-chip" aria-hidden><DragIndicatorRounded />{blockLabel[block.type]}</span>
        {active && (
          <span className="pp-form-block-tools" onClick={(event) => event.stopPropagation()}>
            <Tooltip title="Move up (Alt+↑)"><span><IconButton aria-label="Move block up" disabled={index === 0} onClick={() => move(block.id, -1)}><ArrowUpwardRounded /></IconButton></span></Tooltip>
            <Tooltip title="Move down (Alt+↓)"><span><IconButton aria-label="Move block down" disabled={index === draft.blocks.length - 1} onClick={() => move(block.id, 1)}><ArrowDownwardRounded /></IconButton></span></Tooltip>
            {block.type !== 'fields' && <Tooltip title="Duplicate"><IconButton aria-label="Duplicate block" onClick={() => { const result = duplicateBlock(draft, block.id); update(() => result.draft); setSelected(result.id ?? null); }}><ContentCopyRounded /></IconButton></Tooltip>}
            {block.type !== 'fields' && <Tooltip title="Delete (Del)"><IconButton aria-label="Delete block" onClick={() => remove(block.id)}><DeleteOutlineRounded /></IconButton></Tooltip>}
          </span>
        )}
        {node}
      </div>
    );
  };

  const elements = (
    <Box className="pp-form-palette">
      <Typography className="pp-form-hint" sx={{ px: 2, pt: 2 }}>Click to add after the selected block, or drag onto the form.</Typography>
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
    <Box className="pp-form-panel">
      <Box className="pp-form-panel-tabs"><Tabs value={leftTab} onChange={(_, value) => setLeftTab(value)} aria-label="Editor tools"><Tab value="elements" label="Elements" icon={<WidgetsOutlined />} iconPosition="start" /><Tab value="style" label="Style" icon={<TuneRounded />} iconPosition="start" /></Tabs></Box>
      {leftTab === 'elements' ? elements : <StylePanel draft={draft} update={update} />}
    </Box>
  );

  const inspectorTitle = view === 'success' ? 'Success message' : selectedBlock ? blockLabel[selectedBlock.type] : 'Form settings';
  const rightPanel = (
    <Box className="pp-form-panel" component="aside" aria-label="Settings">
      <Stack direction="row" alignItems="center" justifyContent="space-between" className="pp-form-panel-head">
        <Box sx={{ minWidth: 0 }}>
          <Typography className="pp-form-panel-title">{inspectorTitle}</Typography>
          <Typography className="pp-form-hint">{view === 'success' ? 'What people see after they sign up.' : selectedBlock ? 'Settings for the selected block.' : 'Options that apply to the whole form.'}</Typography>
        </Box>
        {view === 'form' && selectedBlock && <Button size="small" onClick={() => setSelected(null)}>Form settings</Button>}
      </Stack>
      {view === 'success'
        ? <SuccessInspector draft={draft} update={update} />
        : selectedBlock?.type === 'fields'
          ? <FieldsInspector block={selectedBlock} draft={draft} update={update} />
          : selectedBlock
            ? <BlockInspector block={selectedBlock} draft={draft} update={update} />
            : <FormSettings draft={draft} update={update} />}
    </Box>
  );

  return (
    <Dialog fullScreen open transitionDuration={0} PaperProps={{ className: 'pp-form-editor' }} aria-label={`Form editor: ${draft.name}`} disableEscapeKeyDown>
      <Box component="header" className="pp-form-topbar">
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          <Tooltip title="Back to templates"><IconButton aria-label="Back to templates" onClick={onBack} className="pp-form-topbar-back"><ArrowBackRounded /></IconButton></Tooltip>
          <span className="pp-form-topbar-divider" aria-hidden />
          <Box sx={{ minWidth: 0, display: { xs: 'none', sm: 'block' } }}>
            <Typography className="pp-form-topbar-overline">Form builder</Typography>
            <Typography className="pp-form-topbar-name" noWrap>{draft.name}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, value) => value && setView(value)} aria-label="Editing">
            <ToggleButton value="form">Form</ToggleButton>
            <ToggleButton value="success">Success</ToggleButton>
          </ToggleButtonGroup>
          {desktop && (
            <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, value) => value && setDevice(value)} aria-label="Preview size">
              <ToggleButton value="desktop" aria-label="Desktop"><Tooltip title="Desktop"><DesktopWindowsOutlined /></Tooltip></ToggleButton>
              <ToggleButton value="tablet" aria-label="Tablet"><Tooltip title="Tablet"><TabletMacOutlined /></Tooltip></ToggleButton>
              <ToggleButton value="mobile" aria-label="Mobile"><Tooltip title="Mobile"><PhoneIphoneOutlined /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
        <Stack direction="row" alignItems="center" gap={1.5} justifyContent="flex-end">
          <Stack direction="row" className="pp-form-history" aria-label="History">
            <Tooltip title="Undo (Ctrl+Z)"><span><IconButton aria-label="Undo" disabled={state.past.length === 0} onClick={() => dispatch({ type: 'undo' })}><UndoRounded /></IconButton></span></Tooltip>
            <Tooltip title="Redo (Ctrl+Shift+Z)"><span><IconButton aria-label="Redo" disabled={state.future.length === 0} onClick={() => dispatch({ type: 'redo' })}><RedoRounded /></IconButton></span></Tooltip>
          </Stack>
          <SaveStatus state={saveState} />
          <span className="pp-form-topbar-divider" aria-hidden />
          <Button variant="outlined" startIcon={<VisibilityOutlined />} onClick={() => setPreview(true)} sx={{ display: { xs: 'none', md: 'inline-flex' } }}>Preview</Button>
          <Button variant="contained" onClick={onDone}>Done editing</Button>
        </Stack>
      </Box>

      {!desktop && (
        <Stack direction="row" gap={1} className="pp-form-mobilebar">
          <Button variant="outlined" size="small" startIcon={<WidgetsOutlined />} onClick={() => setDrawer('left')}>Add and style</Button>
          <Button variant="outlined" size="small" startIcon={<TuneRounded />} onClick={() => setDrawer('right')}>Settings</Button>
          <Button variant="outlined" size="small" startIcon={<VisibilityOutlined />} onClick={() => setPreview(true)}>Preview</Button>
        </Stack>
      )}

      <Box className="pp-form-workspace">
        {desktop && leftPanel}
        <Box className="pp-form-canvas" onClick={() => setSelected(null)}>
          <Box className={`pp-form-page is-${desktop ? device : 'mobile'}`}>
            <FormStage draft={draft} view={view} mode="editor" narrow={!desktop || device === 'mobile'} wrap={view === 'form' ? wrap : undefined} />
          </Box>
        </Box>
        {desktop && rightPanel}
      </Box>

      {!desktop && (
        <Drawer anchor="bottom" open={drawer !== null} onClose={() => setDrawer(null)} PaperProps={{ className: 'pp-form-drawer' }} sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}><IconButton aria-label="Close panel" onClick={() => setDrawer(null)}><CloseRounded /></IconButton></Stack>
          {drawer === 'left' ? leftPanel : rightPanel}
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
      <Box component="header" className="pp-form-topbar">
        <Typography className="pp-form-topbar-name">Preview: {draft.name}</Typography>
        <ToggleButtonGroup size="small" exclusive value={device} onChange={(_, value) => value && setDevice(value)} aria-label="Preview size">
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
        <Box className={`pp-form-page is-${device}`}>
          {view === 'closed'
            ? <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }} gap={1}><Typography color="text.secondary">The visitor closed the form.</Typography><Button onClick={() => setView('form')}>Show it again</Button></Stack>
            : <FormStage draft={draft} view={view} mode="preview" narrow={device === 'mobile'} onSubmit={() => setView('success')} onClose={() => setView('closed')} />}
        </Box>
      </Box>
    </Dialog>
  );
}
