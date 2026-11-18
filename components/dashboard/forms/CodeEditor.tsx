'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AutoFixHighRounded, CheckRounded, CloseFullscreenRounded, CodeRounded, ContentCopyRounded, OpenInFullRounded, PlayArrowRounded, SwapHorizRounded, SwapVertRounded, VisibilityRounded } from '@mui/icons-material';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CodeMirror, { EditorState, EditorView, keymap } from '@uiw/react-codemirror';
import { html, htmlLanguage } from '@codemirror/lang-html';
import { snippetCompletion, type CompletionContext } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { abbreviationTracker, expandAbbreviation } from '@emmetio/codemirror6-plugin';
import { syntax, tokenize, type Token } from '@/components/docs/CodeBlock';
import SidePanel from '@/components/dashboard/SidePanel';
import { CodeFrame } from './FormRenderer';

/*
 * A small HTML editor for the Custom code block: a native textarea over a highlighted copy of the
 * same text, with line numbers. HTML is highlighted here; <script> and <style> bodies reuse the docs
 * highlighter.
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


const bareTags = ['div', 'section', 'header', 'footer', 'main', 'article', 'aside', 'nav', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'a', 'button', 'img', 'br', 'hr', 'ul', 'ol', 'li', 'form', 'input', 'label', 'textarea', 'select', 'option', 'table', 'tr', 'td', 'script', 'style', 'video', 'iframe'];
const voidTags = new Set(['br', 'hr', 'img', 'input']);
const bareTagOptions = bareTags.map((tag) => snippetCompletion(
  voidTags.has(tag) ? `<${tag}>` : tag === 'a' ? '<a href="${}">${}</a>' : tag === 'script' || tag === 'style' ? `<${tag}>\n  \${}\n</${tag}>` : `<${tag}>\${}</${tag}>`,
  { label: tag, detail: voidTags.has(tag) ? 'element' : 'element + closing tag', type: 'type', boost: -1 },
));

/** Typing a bare word like `div` in text offers `<div></div>` (lang-html only completes after `<`). */
function bareTagCompletion(context: CompletionContext) {
  const word = context.matchBefore(/[A-Za-z][\w-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const node = syntaxTree(context.state).resolveInner(context.pos, -1);
  if (!['Text', 'Document', 'Element'].includes(node.name) && node.name !== '⚠') return null;
  if (context.state.sliceDoc(word.from - 1, word.from) === '<') return null;
  return { from: word.from, options: bareTagOptions, validFor: /^[\w-]*$/ };
}

/** Pretty-print with Prettier, loaded only when the button is pressed (keeps it out of the bundle). */
export async function formatHtml(source: string) {
  const [prettier, htmlPlugin, cssPlugin, babelPlugin, estreePlugin] = await Promise.all([
    import('prettier/standalone'), import('prettier/plugins/html'), import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/estree'),
  ]);
  const out = await prettier.format(source, { parser: 'html', plugins: [htmlPlugin, cssPlugin, babelPlugin, estreePlugin as unknown as import('prettier').Plugin], printWidth: 100, htmlWhitespaceSensitivity: 'ignore' });
  return out.trimEnd();
}

const editorTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: '1.6' },
  '.cm-tooltip-autocomplete': { borderRadius: '6px' },
});

/** CodeMirror 6 (the editor CodePen uses): HTML/CSS/JS highlighting, tag + attribute autocomplete,
 * auto-closing tags, Emmet (type `div.card` then Tab), folding, search, and soft line wrap. */
function Surface({ value, onChange, minHeight, label, onRun, onFormat }: { value: string; onChange: (value: string) => void; minHeight: string; label: string; onRun?: () => void; onFormat?: () => void }) {
  const run = useRef(onRun);
  const format = useRef(onFormat);
  format.current = onFormat;
  run.current = onRun; // keep extensions stable so typing never reconfigures the editor
  const extensions = useMemo(() => [
    html({ autoCloseTags: true, matchClosingTags: true }),
    htmlLanguage.data.of({ autocomplete: bareTagCompletion }),
    abbreviationTracker(),
    keymap.of([
      { key: 'Tab', run: expandAbbreviation },
      { key: 'Shift-Alt-f', run: () => { format.current?.(); return Boolean(format.current); } },
      { key: 'Mod-Alt-r', run: () => { run.current?.(); return Boolean(run.current); } },
    ]),
    EditorView.lineWrapping,
    EditorState.transactionFilter.of((tr) => tr.newDoc.length > 10_000 ? [] : tr),
    EditorView.contentAttributes.of({ 'aria-label': label }),
    editorTheme,
  ], [label]);
  return (
    <CodeMirror
      className="pp-cm"
      value={value}
      onChange={onChange}
      theme={oneDark}
      height="100%"
      minHeight={minHeight}
      extensions={extensions}
      basicSetup={{ tabSize: 2, foldGutter: true, highlightActiveLine: true, bracketMatching: true, closeBrackets: true, autocompletion: true }}
      indentWithTab={false}
    />
  );
}

function Toolbar({ value, expanded, onExpand, onFormat, formatError }: { value: string; expanded?: boolean; onExpand: () => void; onFormat: () => void; formatError: string }) {
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
      <Tooltip title={formatError || 'Format code · Shift+Alt+F'}>
        <IconButton size="small" aria-label="Format code" onClick={onFormat} sx={{ color: formatError ? '#ff8a80' : 'inherit' }}><AutoFixHighRounded /></IconButton>
      </Tooltip>
      <Tooltip title={copied ? 'Copied' : 'Copy code'}><IconButton size="small" aria-label="Copy code" onClick={copy} sx={{ color: 'inherit' }}>{copied ? <CheckRounded /> : <ContentCopyRounded />}</IconButton></Tooltip>
      <Tooltip title={expanded ? 'Close full editor' : 'Open full editor with live preview'}>
        <IconButton size="small" aria-label={expanded ? 'Close full editor' : 'Open full editor'} onClick={onExpand} sx={{ color: 'inherit' }}>{expanded ? <CloseFullscreenRounded /> : <OpenInFullRounded />}</IconButton>
      </Tooltip>
    </Stack>
  );
}

function StatusBar({ value, compact }: { value: string; compact?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" className="pp-code-status" sx={{ background: syntax.header, color: syntax.muted }}>
      <span>{value.split('\n').length} ln · {value.length.toLocaleString()} / 10,000</span>
      {!compact && <span className="pp-code-hint">Type div → Enter · Emmet div.card + Tab · Shift+Alt+F format</span>}
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
  const [formatError, setFormatError] = useState('');
  const format = async () => {
    try {
      onChange(await formatHtml(latest.current.value));
      setFormatError('');
    } catch (error) {
      // Prettier refuses broken markup; say where instead of mangling it.
      setFormatError(`Can't format: ${String((error as Error).message).split('\n')[0]}`);
    }
  };
  const runPreview = () => {
    flush();
    setPreviewRun((version) => version + 1);
  };
  useEffect(() => { if (saved !== latest.current.value) setValue(saved); }, [saved]); // undo, redo, another block
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps -- save what was typed when the block is deselected
  return (
    <>
      <Box className="pp-code-editor" sx={{ borderColor: syntax.line }} onBlur={flush}>
        <Toolbar value={value} onFormat={format} formatError={formatError} onExpand={() => setExpanded(true)} />
        <Box className="pp-code-scroll is-compact"><Surface value={value} onChange={onChange} minHeight="96px" label="Custom HTML code" onFormat={format} /></Box>
        <StatusBar value={value} compact />
      </Box>
      <Button
        className="pp-code-open-cta"
        fullWidth
        variant="contained"
        size="large"
        startIcon={<OpenInFullRounded />}
        onClick={() => { flush(); setExpanded(true); }}
      >
        Open code editor
      </Button>
      <Typography className="pp-form-hint" sx={{ mt: 1, textAlign: 'center' }}>Opens a bigger editor with a live preview, so you can see your changes as you type.</Typography>
      <Box className="pp-code-help">
        <Typography className="pp-code-help-title">How it works</Typography>
        <Typography className="pp-form-hint">1. Click <strong>Open code editor</strong> above.</Typography>
        <Typography className="pp-form-hint">2. Paste the HTML you were given, or write your own. Buttons, links, forms and scripts all work.</Typography>
        <Typography className="pp-form-hint">3. Close the editor. Your changes save automatically.</Typography>
        <Typography className="pp-form-hint">Your code runs separately from your website, so it can&apos;t break the rest of the page.</Typography>
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
              <Toolbar value={value} onFormat={format} formatError={formatError} expanded onExpand={() => { flush(); setExpanded(false); }} />
              <Box className="pp-code-scroll"><Surface value={value} onChange={onChange} minHeight="100%" label="Custom HTML code" onRun={runPreview} onFormat={format} /></Box>
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
