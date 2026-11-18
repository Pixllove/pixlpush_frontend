'use client';
/* eslint-disable @next/next/no-img-element -- this markup is exported to customer sites, where next/image does not exist */

import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { SOCIAL_ICON_PATHS } from '@/lib/social-icons';
import type { Block, FormDraft, FormField } from './model';

/*
 * The one renderer for a form, as a website visitor sees it. The editor canvas, Preview, list
 * thumbnails and the HTML export all use it, so what you edit is what ships. It uses plain HTML and
 * inline styles (not MUI) because the same markup is exported to customer websites.
 */

export type RenderMode = 'editor' | 'preview' | 'export';
export type RenderProps = {
  draft: FormDraft;
  view?: 'form' | 'success';
  mode?: RenderMode;
  /** Phone-width layout: sidebars move on top and horizontal fields stack. */
  narrow?: boolean;
  /** Editor hook to add selection chrome around each block. */
  wrap?: (block: Block, node: ReactNode) => ReactNode;
  onSubmit?: () => void;
  onClose?: () => void;
  /** Editor only: change text by typing on the canvas (headings, text, button labels, field labels and placeholders). */
  edit?: InlineEdit;
};

export type InlineEdit = {
  block: (id: string, patch: Partial<Block>, key: string) => void;
  field: (id: string, patch: Partial<FormField>, key: string) => void;
};
const EditContext = createContext<InlineEdit | null>(null);

/**
 * Text you change by clicking it and typing. Uncontrolled while focused (React never rewrites it
 * under the caret); undo/redo and other edits sync in when it isn't focused.
 */
function Editable({ value, onChange, as: Tag = 'span', multiline = false, placeholder = 'Type here', style }: { value: string; onChange: (value: string) => void; as?: ElementType; multiline?: boolean; placeholder?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  return (
    <Tag
      ref={ref}
      className="pp-inline-edit"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      role="textbox"
      aria-multiline={multiline}
      aria-label={placeholder}
      data-placeholder={placeholder}
      spellCheck
      style={style}
      onInput={(event: React.FormEvent<HTMLElement>) => onChange(event.currentTarget.innerText.replace(/\n$/, ''))}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        if ((event.key === 'Enter' && !multiline) || event.key === 'Escape') { event.preventDefault(); event.currentTarget.blur(); }
      }}
      onDragStart={(event: React.DragEvent) => event.preventDefault()}
    />
  );
}

const fontStack: Record<FormDraft['design']['font'], string> = {
  Inter: 'Inter, system-ui, sans-serif',
  Manrope: 'Manrope, system-ui, sans-serif',
  Arial: 'Arial, Helvetica, sans-serif',
  Georgia: 'Georgia, "Times New Roman", serif',
  'Courier New': '"Courier New", monospace',
};

export const rgba = (hex: string, opacity: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
};

const isFullBleed = (draft: FormDraft) => draft.design.popupType === 'bar' || draft.design.popupType === 'fullscreen';

/** The page area around the form: backdrop and position (centre, corner, top/bottom bar, full screen). */
/** CSS position from 0–100 sliders; serves object-position, background-position and the zoom origin. */
export const focusPosition = (x: number, y: number) => `${x}% ${y}%`;

/** background-size for the card background from its fit mode and zoom (100 = no zoom). */
function bgSize(fit: string, zoom: number): string {
  if (fit === 'tile') return `${Math.max(100, zoom)}%`;
  if (fit === 'contain') return zoom > 100 ? `${zoom}% auto` : 'contain';
  return zoom > 100 ? `${zoom}% auto` : 'cover'; // cover
}

export function FormStage(props: RenderProps) {
  const { draft } = props;
  const d = draft.design;
  let justify = 'center';
  let align = 'center';
  let backdrop = true;
  let padding: number | string = props.narrow ? 12 : 24; // phones: popups sit close to the screen edge
  if (d.popupType === 'slidein') {
    backdrop = false; align = 'flex-end'; justify = d.slidePosition === 'left' ? 'flex-start' : 'flex-end';
  } else if (d.popupType === 'bar') {
    backdrop = false; padding = 0; align = d.barPosition === 'top' ? 'flex-start' : 'flex-end';
  } else if (d.popupType === 'fullscreen') {
    padding = 0; align = 'stretch';
  }
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: justify, alignItems: align, padding, minHeight: '100%', boxSizing: 'border-box', background: backdrop ? rgba(d.backdropColor, d.backdropOpacity) : 'transparent' }}>
      <FormCard {...props} />
    </div>
  );
}

export function FormCard(props: RenderProps) {
  const { draft, view = 'form', mode = 'editor', narrow = false, wrap, onSubmit, onClose } = props;
  const d = draft.design;
  const fullBleed = isFullBleed(draft);
  const fullscreen = d.popupType === 'fullscreen';
  const sideLayout = d.layout === 'leftSidebar' || d.layout === 'rightSidebar';
  const side = d.layout === 'topSidebar' || (sideLayout && narrow) ? 'top' : d.layout === 'leftSidebar' ? 'left' : d.layout === 'rightSidebar' ? 'right' : null;
  const boxed = d.layout === 'boxed';
  const editor = mode === 'editor';

  const card: CSSProperties = {
    position: 'relative', boxSizing: 'border-box', width: fullBleed ? '100%' : d.width, maxWidth: '100%',
    minHeight: fullscreen ? '100%' : undefined, display: 'flex',
    flexDirection: side === 'left' ? 'row' : side === 'right' ? 'row-reverse' : 'column',
    // The editor lets block toolbars stick out of the card; corners are rounded on the side image instead.
    overflow: editor ? 'visible' : 'hidden', borderRadius: fullBleed ? 0 : d.radius,
    background: boxed ? d.sidebarColor : d.transparent ? 'transparent' : d.background,
    backgroundImage: d.backgroundImage && !boxed ? `url("${d.backgroundImage}")` : undefined,
    backgroundSize: bgSize(d.backgroundFit, d.backgroundZoom), backgroundRepeat: d.backgroundFit === 'tile' ? 'repeat' : 'no-repeat', backgroundPosition: focusPosition(d.backgroundX, d.backgroundY),
    border: d.layout === 'border' ? `8px solid ${d.sidebarColor}` : undefined,
    boxShadow: d.shadow ? '0 24px 60px rgba(27, 16, 37, 0.18)' : 'none',
    fontFamily: fontStack[d.font], color: d.textColor, fontSize: 15, lineHeight: 1.5, textAlign: d.align,
  };
  const body: CSSProperties = {
    flex: 1, minWidth: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: fullscreen ? 'center' : undefined,
    gap: 14, padding: fullBleed && !fullscreen ? '16px 24px' : narrow ? 24 : 32,
    ...(boxed ? { margin: 16, background: d.transparent ? 'transparent' : d.background, borderRadius: Math.max(d.radius - 4, 4) } : {}),
  };
  const inner: CSSProperties = fullBleed ? { width: '100%', maxWidth: d.width, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 } : { display: 'contents' };

  return (
    <EditContext.Provider value={editor ? props.edit ?? null : null}>
    <div style={card} data-pixlpush-card="">
      {side && (
        <div aria-hidden style={{ position: 'relative', overflow: 'hidden', borderRadius: fullBleed ? 0 : side === 'top' ? `${d.radius}px ${d.radius}px 0 0` : side === 'left' ? `${d.radius}px 0 0 ${d.radius}px` : `0 ${d.radius}px ${d.radius}px 0`, flex: side === 'top' ? `0 0 ${Math.round((d.sidebarWidth / 100) * 320)}px` : `0 0 ${d.sidebarWidth}%`, minHeight: 140, background: d.sidebarColor }}>
          {d.sidebarImage && <img src={d.sidebarImage} alt="" aria-hidden style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: d.sidebarFit === 'fit' ? 'contain' : 'cover',
            objectPosition: focusPosition(d.sidebarX, d.sidebarY),
            transform: d.sidebarZoom > 100 ? `scale(${d.sidebarZoom / 100})` : undefined,
            transformOrigin: focusPosition(d.sidebarX, d.sidebarY),
          }} />}
        </div>
      )}
      <form
        style={body}
        noValidate={editor}
        onSubmit={(event) => {
          event.preventDefault();
          if (mode === 'preview') onSubmit?.();
        }}
      >
        <div style={inner}>
          {view === 'success'
            ? <SuccessView draft={draft} mode={mode} />
            : draft.blocks.map((block) => {
                const node = <BlockView key={block.id} block={block} draft={draft} mode={mode} narrow={narrow} />;
                return wrap ? <div key={block.id}>{wrap(block, node)}</div> : node;
              })}
        </div>
      </form>
      {d.showClose && (
        <button type="button" aria-label="Close" tabIndex={editor ? -1 : undefined} onClick={onClose} data-pixlpush-close=""
          style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, border: 0, borderRadius: 16, background: 'transparent', color: d.closeColor, fontSize: 22, lineHeight: '32px', cursor: 'pointer' }}>
          ×
        </button>
      )}
    </div>
    </EditContext.Provider>
  );
}

/* ---------- blocks ---------- */

const placeholder = (text: string): ReactNode => (
  <div style={{ padding: 18, border: '1px dashed #d9d3e1', borderRadius: 6, background: '#faf9fb', color: '#8a8195', fontSize: 13, textAlign: 'center' }}>{text}</div>
);

export const buttonStyle = (d: FormDraft['design'], fullWidth = true): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', minHeight: 44, padding: '0 20px',
  width: fullWidth ? '100%' : 'auto', border: 0, borderRadius: d.buttonRadius, background: d.buttonBg, color: d.buttonText,
  font: 'inherit', fontSize: 15, fontWeight: 600, textDecoration: 'none', cursor: 'pointer',
});

const justify = (align?: string) => (align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start');

function BlockView({ block, draft, mode, narrow }: { block: Block; draft: FormDraft; mode: RenderMode; narrow: boolean }) {
  const d = draft.design;
  const editor = mode === 'editor';
  const edit = useContext(EditContext);
  const text = (value: string | undefined, key: 'text' | 'label', placeholder: string, multiline = false, display = 'block') => edit
    ? <Editable value={value ?? ''} multiline={multiline} placeholder={placeholder} style={{ display }} onChange={(next) => edit.block(block.id, { [key]: next }, `${block.id}.${key}`)} />
    : value;
  const linkProps = editor ? { tabIndex: -1, onClick: (event: { preventDefault: () => void }) => event.preventDefault() } : { target: '_blank', rel: 'noopener noreferrer' };

  switch (block.type) {
    case 'heading':
      return <h2 style={{ margin: 0, fontSize: block.size ?? 24, fontWeight: block.weight ?? 700, lineHeight: 1.25, color: block.color ?? d.headingColor, textAlign: block.align }}>{text(block.text, 'text', 'Add a heading')}</h2>;
    case 'text':
      return <p style={{ margin: 0, fontSize: block.size ?? 15, fontWeight: block.weight ?? 400, color: block.color ?? d.textColor, textAlign: block.align, whiteSpace: 'pre-line' }}>{text(block.text, 'text', 'Add some text', true)}</p>;
    case 'image': {
      if (!block.src) return editor ? placeholder('Image: upload one in the settings panel') : null;
      const img = <img src={block.src} alt={block.alt ?? ''} style={{ display: 'block', width: `${block.width ?? 100}%`, maxWidth: '100%', height: 'auto', borderRadius: 6 }} />;
      return <div style={{ display: 'flex', justifyContent: justify(block.align) }}>{block.href ? <a href={block.href} {...linkProps} style={{ display: 'contents' }}>{img}</a> : img}</div>;
    }
    case 'imageText':
      return (
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : block.side === 'right' ? 'row-reverse' : 'row', gap: 16, alignItems: narrow ? 'stretch' : 'center' }}>
          <div style={{ flex: '0 0 40%' }}>{block.src ? <img src={block.src} alt={block.alt ?? ''} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 6 }} /> : editor ? placeholder('Add an image') : null}</div>
          <p style={{ margin: 0, flex: 1, color: block.color ?? d.textColor, whiteSpace: 'pre-line' }}>{text(block.text, 'text', 'Add some text', true)}</p>
        </div>
      );
    case 'button': {
      const style = { ...buttonStyle(d, block.fullWidth ?? true), ...(block.bg ? { background: block.bg } : {}), ...(block.textColor ? { color: block.textColor } : {}), ...(block.radius !== undefined ? { borderRadius: block.radius } : {}) };
      return (
        <div style={{ display: 'flex', justifyContent: justify(block.align) }}>
          {edit
            ? <div style={style}>{text(block.label, 'label', 'Button text', false, 'inline-block')}</div>
            : block.action === 'submit'
            ? <button type="submit" tabIndex={editor ? -1 : undefined} style={style}>{block.label}</button>
            : <a href={block.href} {...linkProps} style={style}>{block.label}</a>}
        </div>
      );
    }
    case 'divider':
      return <hr style={{ border: 0, borderTop: `${block.thickness ?? 1}px solid ${block.color ?? '#eae6ef'}`, margin: `${block.spacing ?? 8}px 0`, width: '100%' }} />;
    case 'countdown':
      return <Countdown block={block} draft={draft} mode={mode} />;
    case 'social':
      return (
        <div style={{ display: 'flex', gap: 10, justifyContent: justify(block.align), flexWrap: 'wrap' }}>
          {(block.links ?? []).map((link, index) => (
            <a key={`${link.platform}-${index}`} href={link.url} aria-label={link.platform} {...linkProps}
              style={{ display: 'grid', placeItems: 'center', width: block.size ?? 32, height: block.size ?? 32, borderRadius: '50%', background: block.color ?? d.headingColor, color: '#ffffff' }}>
              <svg aria-hidden width={(block.size ?? 32) * 0.5} height={(block.size ?? 32) * 0.5} viewBox="0 0 24 24" fill="currentColor"><path d={SOCIAL_ICON_PATHS[link.platform]} /></svg>
            </a>
          ))}
        </div>
      );
    case 'list':
      return <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: block.size ?? 15, color: block.color ?? d.textColor }}>{(block.items ?? []).filter(Boolean).map((item, index) => <li key={index}>{item}</li>)}</ul>;
    case 'video': {
      const youtube = /(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/.exec(block.href ?? '')?.[1];
      if (youtube) return <iframe title="Video" src={`https://www.youtube-nocookie.com/embed/${youtube}`} allow="encrypted-media; picture-in-picture" allowFullScreen style={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 6, pointerEvents: editor ? 'none' : undefined }} />;
      if (/\.(mp4|webm|ogg)(\?|$)/i.test(block.href ?? '')) return <video src={block.href} controls style={{ width: '100%', borderRadius: 6 }} />;
      return editor ? placeholder('Video: paste a YouTube or .mp4 link in the settings panel') : null;
    }
    case 'code':
      return mode === 'export' ? <div dangerouslySetInnerHTML={{ __html: block.html ?? '' }} /> : <CodeFrame html={block.html ?? ''} editor={editor} />;
    case 'fields':
      return <FieldsBlock block={block} draft={draft} mode={mode} narrow={narrow} />;
  }
}

/* ---------- signup fields ---------- */

function FieldsBlock({ block, draft, mode, narrow }: { block: Block; draft: FormDraft; mode: RenderMode; narrow: boolean }) {
  const d = draft.design;
  const o = draft.options;
  const editor = mode === 'editor';
  const horizontal = d.display === 'horizontal' && !narrow;
  const lock = editor ? { readOnly: true, tabIndex: -1 } : {};
  const input: CSSProperties = { boxSizing: 'border-box', width: '100%', height: 44, padding: '0 12px', font: 'inherit', fontSize: 15, color: '#1e1429', background: d.inputBg, border: `1px solid ${d.inputBorder}`, borderRadius: d.inputRadius };
  const labelStyle: CSSProperties = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: d.labelColor };
  const check: CSSProperties = { display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: d.textColor };
  const inputId = (field: FormField) => `ppf-${draft.id}-${field.id}`;
  const edit = useContext(EditContext);
  const labelText = (field: FormField) => edit
    ? <Editable value={field.label} placeholder="Field label" onChange={(label) => edit.field(field.id, { label }, `${field.id}.label`)} />
    : field.label;

  const control = (field: FormField) => {
    const common = { id: inputId(field), name: field.label, required: field.required, 'aria-label': o.labelsAbove ? undefined : field.label, ...lock };
    if (field.type === 'select') {
      return (
        <select {...common} disabled={editor} defaultValue="" style={{ ...input, appearance: 'auto' }}>
          <option value="" disabled>{field.placeholder || `Choose ${field.label.toLowerCase()}`}</option>
          {field.options.filter(Boolean).map((option) => <option key={option}>{option}</option>)}
        </select>
      );
    }
    const type = field.type === 'phone' ? 'tel' : field.type === 'email' || field.type === 'number' || field.type === 'date' ? field.type : 'text';
    // Editor: type straight into the box to change its hint text.
    if (edit && field.type !== 'date') {
      return <input id={common.id} type="text" aria-label={`${field.label} hint text`} title="Click and type to change the hint text" placeholder="Hint text (optional)" value={field.placeholder}
        onChange={(event) => edit.field(field.id, { placeholder: event.target.value }, `${field.id}.placeholder`)} style={{ ...input, color: '#8a8195', cursor: 'text' }} />;
    }
    return <input {...common} type={type} placeholder={field.placeholder} autoComplete={field.type === 'email' ? 'email' : undefined} style={input} />;
  };

  const visible = draft.fields.filter((field) => field.type !== 'hidden');
  const submit = edit
    ? <div style={{ ...buttonStyle(d, !horizontal), whiteSpace: 'nowrap' }}><Editable value={block.label ?? ''} placeholder="Subscribe" style={{ display: 'inline-block' }} onChange={(label) => edit.block(block.id, { label }, `${block.id}.label`)} /></div>
    : <button type="submit" tabIndex={editor ? -1 : undefined} style={{ ...buttonStyle(d, !horizontal), whiteSpace: 'nowrap' }}>{block.label || 'Subscribe'}</button>;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        {visible.map((field) => (
          <div key={field.id} style={{ flex: horizontal ? '1 1 160px' : field.half && !narrow ? '1 1 calc(50% - 6px)' : '1 1 100%', minWidth: 0 }}>
            {field.type === 'checkbox'
              ? <label style={check}><input type="checkbox" name={field.label} required={field.required} disabled={editor} style={{ marginTop: 3 }} /><span>{labelText(field)}{field.required ? ' *' : ''}</span></label>
              : <>
                  {o.labelsAbove && <label htmlFor={inputId(field)} style={labelStyle}>{labelText(field)}{field.required ? ' *' : ''}</label>}
                  {control(field)}
                </>}
          </div>
        ))}
        {horizontal && submit}
      </div>
      {draft.fields.filter((field) => field.type === 'hidden').map((field) => <input key={field.id} type="hidden" name={field.label} value={field.value} />)}
      {o.hidden.on && o.hidden.name.trim() && <input type="hidden" name={o.hidden.name} value={o.hidden.value} />}
      {o.interests.on && (
        <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'grid', gap: 6 }}>
          <legend style={{ ...labelStyle, padding: 0 }}>{o.interests.label}</legend>
          {o.interests.items.filter(Boolean).map((item) => <label key={item} style={check}><input type="checkbox" name="interests" value={item} disabled={editor} style={{ marginTop: 3 }} />{item}</label>)}
        </fieldset>
      )}
      {o.permissions.on && (
        <fieldset style={{ margin: 0, padding: 0, border: 0, display: 'grid', gap: 6 }}>
          <legend style={{ ...check, padding: 0, marginBottom: 6 }}>{o.permissions.text}</legend>
          {o.permissions.items.filter(Boolean).map((item) => <label key={item} style={check}><input type="checkbox" name="permissions" value={item} disabled={editor} style={{ marginTop: 3 }} />{item}</label>)}
        </fieldset>
      )}
      {o.consent.on && <label style={check}><input type="checkbox" name="consent" required disabled={editor} style={{ marginTop: 3 }} /><span>{o.consent.text}</span></label>}
      {!horizontal && submit}
      {o.privacy.on && <p style={{ margin: 0, fontSize: 12, color: d.textColor }}>{o.privacy.text} {o.privacy.url && <a href={o.privacy.url} {...(editor ? { tabIndex: -1 } : { target: '_blank', rel: 'noopener noreferrer' })} style={{ color: 'inherit' }}>privacy policy</a>}.</p>}
      {o.recaptcha && <p style={{ margin: 0, fontSize: 11, color: d.textColor, opacity: 0.8 }}>Protected by reCAPTCHA.</p>}
    </div>
  );
}

/* ---------- countdown ---------- */

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

export function countdownParts(endsAt: string, now: number) {
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const seconds = Math.floor(left / 1000);
  return { done: left === 0, days: Math.floor(seconds / 86400), hours: Math.floor(seconds / 3600) % 24, minutes: Math.floor(seconds / 60) % 60, seconds: seconds % 60 };
}

function Countdown({ block, draft, mode }: { block: Block; draft: FormDraft; mode: RenderMode }) {
  const d = draft.design;
  const now = useNow(mode !== 'export' && Boolean(block.endsAt));
  if (!block.endsAt) return mode === 'editor' ? placeholder('Countdown: choose an end date in the settings panel') : null;
  const parts = countdownParts(block.endsAt, now);
  if (parts.done && mode !== 'editor') return block.onExpire === 'text' ? <p style={{ margin: 0, textAlign: block.align, color: d.textColor }}>{block.expiredText}</p> : null;
  const units: Array<[keyof typeof parts, string]> = [['days', 'Days'], ['hours', 'Hours'], ['minutes', 'Minutes'], ['seconds', 'Seconds']];
  return (
    <div data-pixlpush-countdown={new Date(block.endsAt).toISOString()} style={{ display: 'grid', gap: 8, textAlign: block.align }}>
      {block.text && <span style={{ fontSize: 13, color: d.textColor }}>{block.text}</span>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {units.map(([key, label]) => (
          <div key={key} style={{ padding: '8px 4px', borderRadius: 6, background: rgba(d.buttonBg, 8), textAlign: 'center' }}>
            <div data-unit={key} style={{ fontSize: 22, fontWeight: 700, color: d.headingColor, fontVariantNumeric: 'tabular-nums' }}>{String(parts[key]).padStart(2, '0')}</div>
            <div style={{ fontSize: 11, color: d.textColor }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- custom code ---------- */

/**
 * Custom HTML runs in a sandboxed iframe (scripts allowed, no same-origin access), so it can never
 * reach the dashboard's cookies, storage or styles. The frame reports its height to size itself.
 */
export function CodeFrame({ html, editor }: { html: string; editor: boolean }) {
  const key = useId();
  const [height, setHeight] = useState(48);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.ppfFrame === key && typeof event.data.height === 'number') setHeight(Math.min(2000, Math.max(24, Math.ceil(event.data.height))));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [key]);
  const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;overflow:hidden}body{display:flow-root;font:14px/1.5 system-ui,sans-serif}</style></head><body>${html}<script>(function(){function s(){parent.postMessage({ppfFrame:${JSON.stringify(key)},height:document.body.scrollHeight},'*')}new ResizeObserver(s).observe(document.body);addEventListener('load',s);s()})()</script></body></html>`;
  return <iframe title="Custom code" scrolling="no" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads" srcDoc={doc} style={{ display: 'block', width: '100%', height, border: 0, pointerEvents: editor ? 'none' : undefined }} />;
}

/* ---------- success ---------- */

function SuccessView({ draft, mode }: { draft: FormDraft; mode: RenderMode }) {
  const d = draft.design;
  const s = draft.success;
  if (s.mode === 'redirect') {
    return mode === 'export' ? null : <p style={{ margin: 0, color: d.textColor, textAlign: 'center' }}>New subscribers are sent to <strong style={{ wordBreak: 'break-all' }}>{s.redirectUrl}</strong></p>;
  }
  return (
    <div style={{ display: 'grid', gap: 12, textAlign: 'center' }}>
      <h2 style={{ margin: 0, fontSize: 24, color: d.headingColor }}>{s.heading}</h2>
      {s.text && <p style={{ margin: 0, color: d.textColor, whiteSpace: 'pre-line' }}>{s.text}</p>}
      {s.coupon && <div style={{ padding: '10px 16px', border: `2px dashed ${d.buttonBg}`, borderRadius: 6, fontSize: 20, fontWeight: 700, letterSpacing: '.08em', color: d.headingColor, fontFamily: 'monospace' }}>{s.coupon}</div>}
      {s.buttonLabel.trim() && <a href={s.buttonUrl} {...(mode === 'editor' ? { tabIndex: -1 } : { target: '_blank', rel: 'noopener noreferrer' })} style={buttonStyle(d)}>{s.buttonLabel}</a>}
    </div>
  );
}
