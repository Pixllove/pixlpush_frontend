'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckRounded, ContentCopyRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { Alert, Box, Button, CircularProgress, FormControlLabel, IconButton, Snackbar, Stack, Switch, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsKeys, saveForm } from '@/lib/forms';
import { installSnippet, renderFormHtml } from './exportHtml';
import { FormCard } from './FormRenderer';
import type { SaveState } from './FormEditor';
import { publishProblems, statusLabel, type FormDraft, type FormStatus } from './model';

/**
 * Autosave state as a small pill: a spinner while saving, a check that pops in once saved, an error
 * mark when the browser refused to store it. Announced politely to screen readers.
 */
export function SaveStatus({ state, long = false }: { state: SaveState; long?: boolean }) {
  const text = state === 'saving' ? 'Saving…' : state === 'error' ? 'Not saved' : long ? 'All changes saved' : 'Saved';
  return (
    <Tooltip title={state === 'error' ? 'This browser could not store the form. Free up storage and keep editing to retry.' : state === 'saved' ? 'Your changes are saved automatically' : ''}>
      <span className={`pp-save is-${state}`} role="status" aria-live="polite">
        <span className="pp-save-icon" aria-hidden>
          {state === 'saving' ? <CircularProgress size={12} thickness={6} color="inherit" /> : state === 'error' ? <ErrorOutlineRounded /> : <CheckRounded key="check" />}
        </span>
        {text}
      </span>
    </Tooltip>
  );
}

/** A short-lived message at the bottom of the screen. */
export function useNotice(): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState('');
  const node = <Snackbar open={Boolean(message)} autoHideDuration={3000} onClose={() => setMessage('')} message={message} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />;
  return [node, setMessage];
}

// React 18 drops an `inert` prop, so set the attribute directly: the preview's fields and buttons stay out of the tab order and away from screen readers.
const setInert = (node: HTMLElement | null) => node?.setAttribute('inert', '');

/** A scaled, non-interactive render of the form for lists and template cards. */
export function FormThumbnail({ draft, width = 132, height = 100, scale = 0.32 }: { draft: FormDraft; width?: number | string; height?: number; scale?: number }) {
  return (
    <Box className="pp-form-thumb" sx={{ width, height }} aria-hidden>
      <Box sx={{ width: `${100 / scale}%`, transform: `scale(${scale})`, transformOrigin: 'top center' }} ref={setInert}>
        <FormCard draft={{ ...draft, design: { ...draft.design, width: Math.min(draft.design.width, 480) } }} mode="editor" />
      </Box>
    </Box>
  );
}

export const statusChipClass = (status: FormStatus) => `pp-form-status is-${status}`;
export const StatusChip = ({ status }: { status: FormStatus }) => <span className={statusChipClass(status)}>{statusLabel[status]}</span>;

export function useSaveForm() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveForm,
    onSuccess: (saved) => {
      client.setQueryData(formsKeys.one(saved.id), saved);
      void client.invalidateQueries({ queryKey: formsKeys.all, exact: true });
    },
  });
}

/** Turns a form on or off. A form with problems cannot go live; the reasons are listed instead. */
export function StatusControl({ draft, onChange }: { draft: FormDraft; onChange: (status: FormStatus) => void }) {
  const problems = useMemo(() => publishProblems(draft), [draft]);
  const live = draft.status === 'active';
  return (
    <Stack gap={1.5}>
      <FormControlLabel
        className="pp-form-switch"
        labelPlacement="start"
        control={<Switch checked={live} disabled={!live && problems.length > 0} onChange={(event) => onChange(event.target.checked ? 'active' : 'paused')} />}
        label={<Box><Typography className="pp-form-switch-label">{live ? 'Form is live' : 'Form is not live'}</Typography><Typography className="pp-form-switch-text">{live ? 'It shows on your site and collects subscribers.' : draft.status === 'paused' ? 'Paused: visitors do not see it.' : 'Turn it on when you have installed the code.'}</Typography></Box>}
      />
      {!live && problems.length > 0 && (
        <Alert severity="warning" icon={<ErrorOutlineRounded />}>
          <Typography fontSize="inherit" fontWeight={600}>Fix these before the form can go live:</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{problems.map((problem) => <li key={problem}>{problem}</li>)}</Box>
        </Alert>
      )}
    </Stack>
  );
}

/** Install code: the script snippet, and for embedded forms the static HTML too. */
export function InstallPanel({ draft }: { draft: FormDraft }) {
  const [tab, setTab] = useState<'snippet' | 'html'>('snippet');
  const [copied, setCopied] = useState(false);
  const [notice, notify] = useNotice();
  const code = useMemo(() => (tab === 'html' ? renderFormHtml(draft) : installSnippet(draft)), [draft, tab]);

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('unsupported');
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify('Code copied');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Copy failed. Select the code and copy it manually.');
    }
  };

  return (
    <Box>
      {draft.kind === 'embedded' && (
        <Tabs value={tab} onChange={(_, value) => setTab(value)} aria-label="Install method">
          <Tab value="snippet" label="JavaScript snippet" />
          <Tab value="html" label="HTML code" />
        </Tabs>
      )}
      <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mb: 1.5 }}>
        {tab === 'html'
          ? 'Paste this where the form should appear. It is a static copy: edits you make later need a fresh copy.'
          : draft.kind === 'embedded'
            ? 'Add the script once to your site, then place the div where the form should appear. Later edits update automatically.'
            : 'Add this before the closing </head> tag on every page. Behaviour settings decide where and when it appears.'}
      </Typography>
      <Box className="pp-form-code">
        <pre tabIndex={0} aria-label="Install code">{code}</pre>
        <Tooltip title={copied ? 'Copied' : 'Copy code'}><IconButton aria-label="Copy install code" onClick={copy}>{copied ? <CheckRounded /> : <ContentCopyRounded />}</IconButton></Tooltip>
      </Box>
      <Button size="small" sx={{ mt: 1 }} onClick={copy} startIcon={<ContentCopyRounded />}>Copy code</Button>
      {notice}
    </Box>
  );
}
