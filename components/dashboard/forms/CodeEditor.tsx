'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { CheckRounded, CloseFullscreenRounded, CodeRounded, ContentCopyRounded, OpenInFullRounded, PlayArrowRounded, SwapHorizRounded, SwapVertRounded, VisibilityRounded } from '@mui/icons-material';
import { Box, Button, IconButton, ListItemButton, ListItemText, Paper, Popper, Stack, Tooltip, Typography } from '@mui/material';
import { syntax, tokenize, type Token } from '@/components/docs/CodeBlock';
import SidePanel from '@/components/dashboard/SidePanel';
import { CodeFrame } from './FormRenderer';

/*
 * A small HTML editor for the Custom code block: a native textarea over a highlighted copy of the
 * same text, with line numbers. HTML is highlighted here; <script> and <style> bodies reuse the docs
 * highlighter. ponytail: line-based highlighting, swap for CodeMirror if people need autocomplete.
 */

type Mode = 'html' | 'script' | 'style';
type State = { mode: Mode; inTag: boolean };

export function highlightHtml(source: string): Token[][] {
  const state: State = { mode: 'html', inTag: false };
  return source.split('\n').map((line) => {
    const out: Token[] = [];
    let rest = line;
    while (rest) {
      if (state.mode !== 'html') {
        const end = rest.search(state.mode === 'script' ? /<\/script/i : /<\/style/i);
        const body = end === -1 ? rest : rest.slice(0, end);
        out.push(...tokenize(body, state.mode === 'script' ? 'JavaScript' : 'CSS'));
        if (end === -1) break;
        state.mode = 'html';
        rest = rest.slice(end);
        continue;
      }
      let m: RegExpMatchArray | null;
      if (state.inTag) {
        if ((m = rest.match(/^\/?>/))) {
          state.inTag = false;
          out.push(['punctuation', m[0]]);
        } else if ((m = rest.match(/^"[^"]*"?|^'[^']*'?/))) out.push(['string', m[0]]);
        else if ((m = rest.match(/^[^\s=>"'/]+/))) out.push(['property', m[0]]);
        else if ((m = rest.match(/^=/))) out.push(['punctuation', m[0]]);
        else out.push([null, (m = rest.match(/^\s+|^./))![0]]);
      } else if ((m = rest.match(/^<!--.*?(?:-->|$)/))) out.push(['comment', m[0]]);
      else if ((m = rest.match(/^(<\/?)([A-Za-z][\w-]*)/))) {
        out.push(['punctuation', m[1]], ['keyword', m[2]]);
        state.inTag = true;
        if (m[1] === '<' && /^(script|style)$/i.test(m[2])) {
          // The body starts after this tag's closing ">".
          const close = rest.indexOf('>', m[0].length);
          if (close !== -1) {
            out.push(...highlightTagRest(rest.slice(m[0].length, close)), ['punctuation', '>']);
            state.inTag = false;
            state.mode = m[2].toLowerCase() as Mode;
            rest = rest.slice(close + 1);
            continue;
          }
        }
      } else out.push([null, (m = rest.match(/^[^<]+|^./))![0]]);
      rest = rest.slice(m![0].length);
    }
    return out;
  });
}

function highlightTagRest(attrs: string): Token[] {
  return attrs.split(/("[^"]*"|'[^']*'|=|\s+)/).filter(Boolean).map((part): Token => [/^["']/.test(part) ? 'string' : part === '=' ? 'punctuation' : /^\s+$/.test(part) ? null : 'property', part]);
}

const tokenColor = (kind: Token[0]) => (kind ? syntax[kind] : syntax.text);

type Suggestion = { label: string; detail: string; insert: string; caretOffset: number; replaceFrom: number };
type SuggestionMenu = { items: Suggestion[]; activeIndex: number; anchor: { getBoundingClientRect: () => DOMRect; contextElement: Element } };

const htmlTags = ['div', 'section', 'header', 'footer', 'main', 'article', 'aside', 'p', 'span', 'h1', 'h2', 'h3', 'strong', 'em', 'a', 'button', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'form', 'input', 'label', 'textarea', 'select', 'option', 'script', 'style'];
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const htmlAttributes = [
  ['class', 'Reusable styling name'], ['id', 'Unique element name'], ['style', 'Inline styling'], ['title', 'Helpful hover text'],
  ['href', 'Link destination'], ['target', 'Where a link opens'], ['rel', 'Link relationship'], ['src', 'Image or script source'],
  ['alt', 'Image description'], ['type', 'Input or button type'], ['name', 'Field name'], ['value', 'Starting field value'],
  ['placeholder', 'Hint inside a field'], ['aria-label', 'Accessible name'], ['role', 'Accessible element role'], ['required', 'Require this field'],
  ['disabled', 'Disable this control'], ['checked', 'Start this option selected'], ['multiple', 'Allow multiple selections'],
];
const htmlAttributeValues: Record<string, string[]> = {
  type: ['text', 'email', 'password', 'number', 'tel', 'url', 'checkbox', 'radio', 'submit', 'button', 'date'],
  target: ['_blank', '_self', '_parent', '_top'],
  method: ['get', 'post'],
  rel: ['noopener noreferrer', 'noopener', 'noreferrer', 'nofollow'],
  autocomplete: ['name', 'given-name', 'family-name', 'email', 'tel', 'off', 'on'],
  loading: ['lazy', 'eager'],
};

function getHtmlSuggestions(value: string, caret: number): { items: Suggestion[]; replaceFrom: number } | null {
  const before = value.slice(0, caret);
  const lower = before.toLowerCase();
  const lastOpenScript = lower.lastIndexOf('<script');
  const lastCloseScript = lower.lastIndexOf('</script');
  const lastOpenStyle = lower.lastIndexOf('<style');
  const lastCloseStyle = lower.lastIndexOf('</style');
  if ((lastOpenScript > lastCloseScript && before.indexOf('>', lastOpenScript) !== -1) || (lastOpenStyle > lastCloseStyle && before.indexOf('>', lastOpenStyle) !== -1)) return null;

  const open = before.lastIndexOf('<');
  const close = before.lastIndexOf('>');
  if (open <= close) {
    // Beginners often type a tag name first (for example, "div") before they know to add
    // angle brackets. Offer the same element picker when that is the whole current line.
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = before.slice(lineStart);
    const bareTag = currentLine.match(/^(\s*)([A-Za-z][\w-]*)$/);
    if (!bareTag || bareTag[2].length < 2) return null;
    const typed = bareTag[2].toLowerCase();
    const replaceFrom = lineStart + bareTag[1].length;
    const items = htmlTags.filter((tag) => tag.startsWith(typed)).slice(0, 8).map((tag): Suggestion => {
      const isVoid = voidTags.has(tag);
      return {
        label: isVoid ? `<${tag}>` : `<${tag}> … </${tag}>`,
        detail: isVoid ? 'HTML element · no closing tag needed' : 'HTML element · closing tag included',
        insert: isVoid ? `<${tag}>` : `<${tag}></${tag}>`,
        caretOffset: isVoid ? tag.length + 2 : tag.length + 2,
        replaceFrom,
      };
    });
    return items.length ? { items, replaceFrom } : null;
  }
  const fragment = before.slice(open + 1);

  const valueMatch = fragment.match(/^([A-Za-z][\w-]*)([\s\S]*)(\s+)([\w:-]+)\s*=\s*(["'])([^"']*)$/);
  if (valueMatch) {
    const values = htmlAttributeValues[valueMatch[4].toLowerCase()] ?? [];
    const typed = valueMatch[6].toLowerCase();
    const valueStart = caret - valueMatch[6].length;
    const items = values.filter((item) => item.toLowerCase().startsWith(typed)).slice(0, 8).map((item): Suggestion => ({
      label: item, detail: `${valueMatch[4]} value`, insert: item, caretOffset: item.length, replaceFrom: valueStart,
    }));
    if (items.length) return { items, replaceFrom: valueStart };
  }

  if ((fragment.match(/["']/g) ?? []).length % 2) return null;

  const tagMatch = fragment.match(/^(\/?)((?:[A-Za-z][\w-]*)?)$/);
  if (tagMatch) {
    const closing = tagMatch[1] === '/';
    const typed = tagMatch[2].toLowerCase();
    const items = htmlTags.filter((tag) => tag.startsWith(typed)).slice(0, 8).map((tag): Suggestion => {
      const insert = closing || voidTags.has(tag) ? `${tag}>` : `${tag}></${tag}>`;
      return {
        label: closing ? `</${tag}>` : `<${tag}>`,
        detail: closing ? 'HTML closing tag' : voidTags.has(tag) ? 'HTML element · no closing tag' : 'HTML element · closing tag added',
        insert,
        caretOffset: tag.length + 1,
        replaceFrom: open + 1 + (closing ? 1 : 0),
      };
    });
    return items.length ? { items, replaceFrom: open + 1 + (closing ? 1 : 0) } : null;
  }

  const attrMatch = fragment.match(/^([A-Za-z][\w-]*)([\s\S]*)(\s+)([\w:-]*)$/);
  if (!attrMatch) return null;
  const typed = attrMatch[4].toLowerCase();
  const attrStart = open + 1 + attrMatch[1].length + attrMatch[2].length + attrMatch[3].length;
  const used = new Set(Array.from(attrMatch[2].matchAll(/([\w:-]+)\s*=/g), (match) => match[1].toLowerCase()));
  const items = htmlAttributes
    .filter(([name]) => name.startsWith(typed) && !used.has(name))
    .slice(0, 8)
    .map(([name, detail]): Suggestion => {
      const hasValue = !['required', 'disabled', 'checked', 'multiple'].includes(name);
      const insert = hasValue ? `${name}=""` : name;
      return { label: insert, detail, insert, caretOffset: hasValue ? name.length + 2 : insert.length, replaceFrom: attrStart };
    });
  return items.length ? { items, replaceFrom: attrStart } : null;
}

function caretAnchor(element: HTMLTextAreaElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const before = element.value.slice(0, element.selectionStart);
  const line = before.split('\n').length - 1;
  const currentLine = before.slice(before.lastIndexOf('\n') + 1);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) context.font = style.font;
  const textWidth = context?.measureText(currentLine).width ?? currentLine.length * 8;
  const lineHeight = Number.parseFloat(style.lineHeight) || 20;
  const padLeft = Number.parseFloat(style.paddingLeft) || 0;
  const padTop = Number.parseFloat(style.paddingTop) || 0;
  const x = Math.max(rect.left + 4, Math.min(rect.right - 20, rect.left + padLeft + textWidth - element.scrollLeft));
  const y = Math.max(rect.top + 4, Math.min(rect.bottom - lineHeight, rect.top + padTop + line * lineHeight - element.scrollTop));
  const anchorRect = new DOMRect(x, y, 1, lineHeight);
  return { getBoundingClientRect: () => anchorRect, contextElement: element };
}

function Surface({ value, onChange, minRows, label, inputRef, onRun, wrapLines = false }: { value: string; onChange: (value: string) => void; minRows: number; label: string; inputRef?: RefObject<HTMLTextAreaElement>; onRun?: () => void; wrapLines?: boolean }) {
  const lines = useMemo(() => highlightHtml(value), [value]);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [wrapColumns, setWrapColumns] = useState(72);
  useEffect(() => {
    if (!wrapLines) return;
    const layers = surfaceRef.current?.querySelector('.pp-code-layers');
    if (!layers) return;
    const measure = () => {
      const style = window.getComputedStyle(layers);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) context.font = style.font;
      const horizontalPadding = 28;
      const characterWidth = context?.measureText('M').width || 8;
      setWrapColumns(Math.max(12, Math.floor((layers.clientWidth - horizontalPadding) / characterWidth)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(layers);
    measure();
    return () => observer.disconnect();
  }, [wrapLines]);
  const gutterRows = useMemo(() => {
    if (!wrapLines) return lines.map((_, index) => String(index + 1));
    return lines.flatMap((tokens, index) => {
      const text = tokens.map(([, part]) => part).join('');
      const visualRows = Math.max(1, Math.ceil(text.length / wrapColumns));
      return Array.from({ length: visualRows }, (_, row) => row === 0 ? String(index + 1) : '');
    });
  }, [lines, wrapColumns, wrapLines]);
  const rows = Math.max(minRows, gutterRows.length);
  const visibleGutterRows = [...gutterRows, ...Array.from({ length: Math.max(0, rows - gutterRows.length) }, () => '')];
  const localInput = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? localInput;
  const listId = `html-suggestions-${useId()}`;
  const [menu, setMenu] = useState<SuggestionMenu | null>(null);

  const refreshSuggestions = (element: HTMLTextAreaElement, current = element.value, caret = element.selectionStart) => {
    const result = getHtmlSuggestions(current, caret);
    if (!result) { setMenu(null); return; }
    setMenu((previous) => {
      const activeLabel = previous?.items[previous.activeIndex]?.label;
      const activeIndex = activeLabel ? result.items.findIndex((item) => item.label === activeLabel) : -1;
      return { items: result.items, activeIndex: Math.max(0, activeIndex), anchor: caretAnchor(element) };
    });
  };

  const acceptSuggestion = (suggestion: Suggestion) => {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart;
    const next = `${value.slice(0, suggestion.replaceFrom)}${suggestion.insert}${value.slice(start)}`;
    const cursor = suggestion.replaceFrom + suggestion.caretOffset;
    onChange(next);
    setMenu(null);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursor, cursor);
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.altKey && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r' && onRun) {
      event.preventDefault();
      onRun();
      return;
    }
    if (menu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setMenu((current) => current ? { ...current, activeIndex: (current.activeIndex + (event.key === 'ArrowDown' ? 1 : current.items.length - 1)) % current.items.length } : current);
      return;
    }
    if (menu && (event.key === 'Enter' || event.key === 'Tab')) {
      event.preventDefault();
      acceptSuggestion(menu.items[menu.activeIndex]);
      return;
    }
    if (menu && event.key === 'Escape') { event.preventDefault(); setMenu(null); return; }
    // Finish an opening tag by adding its partner, like a code editor. Leave the
    // caret between the tags so the user can immediately type the element content.
    if (event.key === '>' && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const el = event.currentTarget;
      const { selectionStart: start, selectionEnd: end } = el;
      if (start === end) {
        const before = value.slice(0, start);
        const tag = before.match(/<([A-Za-z][\w-]*)(?:\s[^<>]*)?$/);
        if (tag && !voidTags.has(tag[1].toLowerCase()) && (before.match(/["']/g) ?? []).length % 2 === 0) {
          const lower = before.toLowerCase();
          const rawTextOpen = Math.max(lower.lastIndexOf('<script'), lower.lastIndexOf('<style'));
          const rawTextClose = Math.max(lower.lastIndexOf('</script'), lower.lastIndexOf('</style'));
          const suffix = value.slice(end).toLowerCase();
          const alreadyClosed = suffix.startsWith(`</${tag[1].toLowerCase()}>`);
          if (!(rawTextOpen > rawTextClose && before.indexOf('>', rawTextOpen) !== -1) && !alreadyClosed) {
            event.preventDefault();
            const insert = `></${tag[1]}>`;
            const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
            const cursor = start + 1;
            onChange(next);
            requestAnimationFrame(() => {
              el.focus();
              el.setSelectionRange(cursor, cursor);
            });
            return;
          }
        }
      }
    }
    if (event.key !== 'Tab' || event.metaKey || event.ctrlKey || event.altKey) return;
    // Tab indents; Shift+Tab or Escape then Tab leave the editor, so the keyboard is never trapped.
    if (event.shiftKey) return;
    event.preventDefault();
    const el = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
  };

  return (
    <Box ref={surfaceRef} className={`pp-code-surface${wrapLines ? ' is-wrapped' : ''}`} sx={{ background: syntax.bg }}>
      <Box className="pp-code-gutter" aria-hidden sx={{ color: syntax.gutter }}>
        {visibleGutterRows.map((number, index) => <div key={index}>{number}</div>)}
      </Box>
      <Box className="pp-code-layers">
        <pre aria-hidden className="pp-code-highlight">
          {lines.map((tokens, index) => (
            <Fragment key={index}>
              {tokens.map(([kind, text], at) => <span key={at} style={{ color: tokenColor(kind) }}>{text}</span>)}
              {'\n'}
            </Fragment>
          ))}
          {Array.from({ length: rows - lines.length }, () => '\n').join('')}{' '}
        </pre>
        <textarea
          className="pp-code-input"
          maxLength={10_000}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={Boolean(menu)}
          aria-controls={menu ? listId : undefined}
          aria-activedescendant={menu ? `${listId}-${menu.activeIndex}` : undefined}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          ref={ref}
          value={value}
          onChange={(event) => {
            const element = event.currentTarget;
            const next = element.value;
            onChange(next);
            requestAnimationFrame(() => refreshSuggestions(element, next, element.selectionStart));
          }}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => refreshSuggestions(event.currentTarget)}
          onClick={(event) => refreshSuggestions(event.currentTarget)}
          onScroll={(event) => { if (menu) refreshSuggestions(event.currentTarget); }}
          onBlur={() => setMenu(null)}
          style={{ caretColor: syntax.accent }}
        />
      </Box>
      <Popper open={Boolean(menu)} anchorEl={menu?.anchor} placement="bottom-start" modifiers={[{ name: 'offset', options: { offset: [0, 4] } }, { name: 'flip', options: { fallbackPlacements: ['top-start'] } }]}>
        <Paper className="pp-code-suggestions" elevation={10}>
          <Typography className="pp-code-suggestions-heading">HTML suggestions <span>↑↓ move · Enter/Tab insert · Esc close</span></Typography>
          <Box id={listId} role="listbox" aria-label="HTML suggestions">
            {menu?.items.map((item, index) => (
              <ListItemButton
                key={`${item.label}-${index}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={menu.activeIndex === index}
                selected={menu.activeIndex === index}
                className="pp-code-suggestion"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setMenu((current) => current ? { ...current, activeIndex: index } : current)}
                onClick={() => acceptSuggestion(item)}
              >
                <ListItemText primary={item.label} secondary={item.detail} primaryTypographyProps={{ className: 'pp-code-suggestion-label' }} secondaryTypographyProps={{ className: 'pp-code-suggestion-detail' }} />
              </ListItemButton>
            ))}
          </Box>
        </Paper>
      </Popper>
    </Box>
  );
}

function Toolbar({ value, expanded, onExpand }: { value: string; expanded?: boolean; onExpand: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* the user can still select and copy by hand */
    }
  };
  return (
    <Stack direction="row" alignItems="center" className="pp-code-bar" sx={{ background: syntax.header, color: syntax.muted }}>
      <CodeRounded sx={{ fontSize: 16, color: syntax.accent }} />
      <Typography component="span" className="pp-code-bar-title">custom.html</Typography>
      <Box sx={{ flex: 1 }} />
      <Tooltip title={copied ? 'Copied' : 'Copy code'}><IconButton size="small" aria-label="Copy code" onClick={copy} sx={{ color: 'inherit' }}>{copied ? <CheckRounded /> : <ContentCopyRounded />}</IconButton></Tooltip>
      {expanded ? (
        <Tooltip title="Close full editor">
          <IconButton size="small" aria-label="Close full editor" onClick={onExpand} sx={{ color: 'inherit' }}><CloseFullscreenRounded /></IconButton>
        </Tooltip>
      ) : (
        <Button className="pp-code-open-button" size="small" startIcon={<OpenInFullRounded />} onClick={onExpand}>Open editor</Button>
      )}
    </Stack>
  );
}

function StatusBar({ value }: { value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" className="pp-code-status" sx={{ background: syntax.header, color: syntax.muted }}>
      <span>HTML · {value.split('\n').length} ln · {value.length.toLocaleString()} / 10,000 ch</span>
      <span>Tab = indent</span>
    </Stack>
  );
}

/** Custom HTML editor with a compact inspector view and a focused, live-preview workspace. */
export default function CodeEditor({ value: saved, onChange: save }: { value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [previewRun, setPreviewRun] = useState(0);
  const [orientation, setOrientation] = useState<'split' | 'stacked'>('split');
  // Typing stays local and reaches the form 250ms after the last key (and at once on blur or close),
  // so a keystroke re-renders only this editor, not the whole form builder and preview.
  const [value, setValue] = useState(saved);
  const pending = useRef<number>();
  const latest = useRef({ value, saved, save });
  latest.current = { value, saved, save };
  const flush = () => {
    window.clearTimeout(pending.current);
    const { value: text, saved: stored, save: commit } = latest.current;
    if (text !== stored) commit(text);
  };
  const onChange = (next: string) => {
    setValue(next);
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(flush, 250);
  };
  const runPreview = () => {
    flush();
    setPreviewRun((version) => version + 1);
  };
  useEffect(() => { if (saved !== latest.current.value) setValue(saved); }, [saved]); // undo, redo, another block
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps -- save what was typed when the block is deselected
  const largeInput = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <Box className="pp-code-editor" sx={{ borderColor: syntax.line }} onBlur={flush}>
        <Toolbar value={value} onExpand={() => setExpanded(true)} />
        <Box className="pp-code-scroll is-compact"><Surface value={value} onChange={onChange} minRows={4} label="Custom HTML code" wrapLines /></Box>
        <StatusBar value={value} />
      </Box>
      <Box className="pp-code-help">
        <Typography className="pp-code-help-title">Add custom content</Typography>
        <Typography className="pp-form-hint">Paste HTML, CSS, or scripts. Open the full editor to see a live preview alongside your code.</Typography>
        <Typography className="pp-form-hint">Your code runs in an isolated preview and cannot access this dashboard.</Typography>
      </Box>

      <SidePanel
        open={expanded}
        onClose={() => { flush(); setExpanded(false); }}
        eyebrow="Custom HTML editor"
        title="Custom code"
        label="Custom code editor"
        closeLabel="Close code editor"
        width={{ xs: '100%', sm: 'min(96vw, 1480px)' }}
        zIndex={1400}
        className="pp-code-dialog"
      >
        <Typography className="pp-code-dialog-subtitle">Edit your HTML and see how it appears in the form.</Typography>
        <Box className={`pp-code-dialog-grid${orientation === 'stacked' ? ' is-stacked' : ''}`}>
          <Box className="pp-code-workspace-pane">
            <Box className="pp-code-pane-heading">
              <Typography className="pp-code-pane-title"><CodeRounded /> Code</Typography>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography className="pp-code-pane-note">HTML · CSS · JavaScript</Typography>
                <Tooltip title={orientation === 'split' ? 'Stack preview below code' : 'Show code and preview side by side'}>
                  <IconButton
                    className="pp-code-orientation-button"
                    size="small"
                    aria-label={orientation === 'split' ? 'Stack preview below code' : 'Show code and preview side by side'}
                    onClick={() => setOrientation((current) => current === 'split' ? 'stacked' : 'split')}
                  >
                    {orientation === 'split' ? <SwapVertRounded /> : <SwapHorizRounded />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
            <Box className="pp-code-editor is-large" sx={{ borderColor: syntax.line }}>
              <Toolbar value={value} expanded onExpand={() => { flush(); setExpanded(false); }} />
              <Box className="pp-code-scroll"><Surface value={value} onChange={onChange} minRows={1} label="Custom HTML code" inputRef={largeInput} onRun={runPreview} /></Box>
              <StatusBar value={value} />
            </Box>
          </Box>
          <Box className="pp-code-preview">
            <Box className="pp-code-pane-heading">
              <Typography className="pp-code-pane-title"><VisibilityRounded /> Live preview</Typography>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography className="pp-code-pane-note">Updates as you type</Typography>
                <Tooltip title="Run the current code in the preview · Ctrl/⌘ + Alt + R">
                  <Button className="pp-code-run-button" variant="contained" size="small" startIcon={<PlayArrowRounded />} onClick={runPreview}>Run preview</Button>
                </Tooltip>
              </Stack>
            </Box>
            <Box className="pp-code-preview-frame">
              {value.trim() ? <CodeFrame key={previewRun} html={value} editor={false} /> : (
                <Box className="pp-code-preview-empty">
                  <CodeRounded />
                  <Typography fontWeight={600}>Your preview will appear here</Typography>
                  <Typography>Paste or write some HTML to see it in your form.</Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </SidePanel>
    </>
  );
}
