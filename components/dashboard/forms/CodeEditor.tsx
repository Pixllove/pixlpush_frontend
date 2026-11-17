'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { CheckRounded, CloseFullscreenRounded, CodeRounded, ContentCopyRounded, OpenInFullRounded } from '@mui/icons-material';
import { Box, Dialog, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { syntax, tokenize, type Token } from '@/components/docs/CodeBlock';
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

function Surface({ value, onChange, minRows, label, inputRef }: { value: string; onChange: (value: string) => void; minRows: number; label: string; inputRef?: RefObject<HTMLTextAreaElement> }) {
  const lines = useMemo(() => highlightHtml(value), [value]);
  const rows = Math.max(minRows, lines.length);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
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
    <Box className="pp-code-surface" sx={{ background: syntax.bg }}>
      <Box className="pp-code-gutter" aria-hidden sx={{ color: syntax.gutter }}>
        {Array.from({ length: rows }, (_, index) => <div key={index}>{index + 1}</div>)}
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
          aria-label={label}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          style={{ caretColor: syntax.accent }}
        />
      </Box>
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
      <Tooltip title={expanded ? 'Close full editor' : 'Open full editor with live preview'}>
        <IconButton size="small" aria-label={expanded ? 'Close full editor' : 'Open full editor'} onClick={onExpand} sx={{ color: 'inherit' }}>{expanded ? <CloseFullscreenRounded /> : <OpenInFullRounded />}</IconButton>
      </Tooltip>
    </Stack>
  );
}

function StatusBar({ value }: { value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" className="pp-code-status" sx={{ background: syntax.header, color: syntax.muted }}>
      <span>HTML · {value.split('\n').length} ln · {value.length} ch</span>
      <span>Tab = indent</span>
    </Stack>
  );
}

/** The Custom code field: compact in the inspector, with a full editor and live preview a click away. */
export default function CodeEditor({ value: saved, onChange: save }: { value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
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
  useEffect(() => { if (saved !== latest.current.value) setValue(saved); }, [saved]); // undo, redo, another block
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps -- save what was typed when the block is deselected
  const largeInput = useRef<HTMLTextAreaElement>(null);
  return (
    <>
      <Box className="pp-code-editor" sx={{ borderColor: syntax.line }} onBlur={flush}>
        <Toolbar value={value} onExpand={() => setExpanded(true)} />
        <Box className="pp-code-scroll is-compact"><Surface value={value} onChange={onChange} minRows={12} label="Custom HTML" /></Box>
        <StatusBar value={value} />
      </Box>
      <Typography className="pp-form-hint">HTML, CSS and scripts are allowed. In the editor and preview they run in an isolated frame that cannot reach this dashboard.</Typography>

      <Dialog open={expanded} onClose={() => { flush(); setExpanded(false); }} fullWidth maxWidth="xl" PaperProps={{ className: 'pp-code-dialog' }} aria-label="Custom code editor" TransitionProps={{ onEntered: () => largeInput.current?.focus() }}>
        <Box className="pp-code-dialog-grid">
          <Box className="pp-code-editor is-large" sx={{ borderColor: syntax.line }}>
            <Toolbar value={value} expanded onExpand={() => { flush(); setExpanded(false); }} />
            <Box className="pp-code-scroll"><Surface value={value} onChange={onChange} minRows={30} label="Custom HTML" inputRef={largeInput} /></Box>
            <StatusBar value={value} />
          </Box>
          <Box className="pp-code-preview">
            <Typography className="pp-form-section-title" sx={{ mb: 1 }}>Live preview</Typography>
            <Box className="pp-code-preview-frame"><CodeFrame key={saved} html={saved} editor={false} /></Box>
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
