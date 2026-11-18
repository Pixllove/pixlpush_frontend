'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { CheckRounded, ContentCopyRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { Alert, Box, CircularProgress, FormControlLabel, IconButton, Snackbar, Stack, Switch, Tooltip, Typography } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formsKeys, saveForm } from '@/lib/forms';
import { FormCard } from './FormRenderer';
import type { SaveState } from './FormEditor';
import { installSnippets, publishProblems, statusLabel, type FormDraft, type FormStatus } from './model';

/**
 * Autosave state as a small pill: a spinner while saving, a check that pops in once saved, and a
 * clear retry hint if the account API is unreachable. Announced politely to screen readers.
 */
export function SaveStatus({ state, long = false }: { state: SaveState; long?: boolean }) {
  const text = state === 'saving' ? 'Saving…' : state === 'error' ? 'Not saved' : long ? 'All changes saved' : 'Saved';
  return (
    <Tooltip title={state === 'error' ? 'We could not save these changes to your account. Check your connection, then make another edit to retry.' : state === 'saved' ? 'Your changes are saved to your account automatically' : ''}>
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

export function useSaveForm(projectId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: FormDraft) => saveForm(draft, projectId),
    onSuccess: (saved) => {
      client.setQueryData(formsKeys.one(projectId, saved.id), saved);
      void client.invalidateQueries({ queryKey: formsKeys.all });
    },
  });
}

/** Turns a form on or off. A form with problems cannot go live; the reasons are listed instead. */
export function StatusControl({ draft, onChange, busy = false, error }: { draft: FormDraft; onChange: (status: FormStatus) => void; busy?: boolean; error?: string }) {
  const problems = useMemo(() => publishProblems(draft), [draft]);
  const live = draft.status === 'active';
  return (
    <Stack gap={1.5}>
      <FormControlLabel
        className="pp-form-switch"
        labelPlacement="start"
        control={<Switch checked={live} disabled={busy || draft.heldByPixlPush || (!live && problems.length > 0)} onChange={(event) => onChange(event.target.checked ? 'active' : 'paused')} />}
        label={<Box><Typography className="pp-form-switch-label">{live ? 'Form is live' : 'Form is not live'}</Typography><Typography className="pp-form-switch-text">{live ? 'It shows on your site and collects subscribers.' : draft.status === 'paused' ? 'Paused: visitors do not see it.' : 'Turn it on when you have installed the code.'}</Typography></Box>}
      />
      {draft.heldByPixlPush && <Alert severity="error">PixlPush has paused this form. You can still edit it, but it can’t go live until our team releases it. Check your notifications for the reason. Contact support if you have questions.</Alert>}
      {!draft.heldByPixlPush && !live && problems.length > 0 && (
        <Alert severity="warning" icon={<ErrorOutlineRounded />}>
          <Typography fontSize="inherit" fontWeight={600}>Fix these before the form can go live:</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>{problems.map((problem) => <li key={problem}>{problem}</li>)}</Box>
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}

/** One copyable piece of install code. */
export function CodeSnippet({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const [notice, notify] = useNotice();
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
      <Box className="pp-form-code">
        <pre tabIndex={0} aria-label={label}>{code}</pre>
        <Tooltip title={copied ? 'Copied' : 'Copy code'}><IconButton aria-label={`Copy ${label.toLowerCase()}`} onClick={copy}>{copied ? <CheckRounded /> : <ContentCopyRounded />}</IconButton></Tooltip>
      </Box>
      {notice}
    </Box>
  );
}

/** Install code for the way this form is used on the website, as numbered steps. */
export function InstallPanel({ draft }: { draft: FormDraft }) {
  const snippets = installSnippets(draft);
  if (!snippets) return <Typography color="text.secondary" fontSize="var(--fs-13)">The install code appears once the form is saved.</Typography>;
  return (
    <Stack gap={2}>
      {snippets.map((snippet, index) => (
        <Box key={snippet.title}>
          <Typography fontWeight={600}>{snippets.length > 1 ? `${index + 1}. ` : ''}{snippet.title}</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mb: 1 }}>{snippet.help}</Typography>
          <CodeSnippet code={snippet.code} label={snippet.title} />
        </Box>
      ))}
      {draft.status !== 'active' && <Alert severity="info">The code starts working as soon as you make the form live.</Alert>}
    </Stack>
  );
}
