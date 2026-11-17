'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AddRounded, ArrowBackRounded, ArrowForwardRounded, AutoAwesomeOutlined, CheckCircleRounded, CheckRounded, DesktopWindowsOutlined, GridViewRounded, GroupsOutlined,
  IosShareRounded, PhoneIphoneOutlined, RadioButtonUncheckedRounded, TabletMacOutlined, TouchAppOutlined, ViewAgendaOutlined,
} from '@mui/icons-material';
import {
  Alert, Avatar, Box, Button, Card, CardActionArea, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup,
  FormHelperText, LinearProgress, MenuItem, Paper, Skeleton, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState, { listEmpty } from '@/components/dashboard/EmptyState';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import SearchField from '@/components/dashboard/SearchField';
import { createForm, deleteFormImage, formsKeys, getForm, listGroups, saveForm, setFormStatus } from '@/lib/forms';
import FormEditor, { EditorSkeleton, type SaveState } from './FormEditor';
import { applyTemplate, behaviourErrors, defaultDraft, editorReducer, uploadsIn, isEditorStep, kindPlural, templatesFor, urlLines, type FormBehaviour, type FormDraft, type UsageMode } from './model';
import { FormThumbnail, InstallPanel, SaveStatus, StatusControl } from './shared';

type Step = 'details' | 'audience' | 'design' | 'editor' | 'setup';

const steps: Step[] = ['details', 'audience', 'design', 'editor', 'setup'];
const stepLabel: Record<Step, string> = { details: 'Form name', audience: 'Subscriber groups', design: 'Template', editor: 'Design and settings', setup: 'How to use' };
/** Links from older flows keep working. */
const legacySteps: Record<string, Step> = { behaviour: 'setup' };
/** Steps that need subscriber groups first. */
const needsGroups: Step[] = ['design', 'editor', 'setup'];

/* ---------- layout ---------- */

function WizardShell({ title, name, current, onStep, saveState, children, footer }: {
  title: string; name?: string; current: Step; onStep?: (step: Step) => void; saveState?: SaveState; children: ReactNode; footer: ReactNode;
}) {
  const index = steps.indexOf(current);
  return (
    <Box className="pp-form-wizard">
      <Stack direction="row" alignItems="center" gap={0.75} className="pp-form-crumbs">
        <Link href="/dashboard/forms">Forms</Link><span aria-hidden>/</span><Typography component="span" noWrap>{name || 'New form'}</Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={1} sx={{ mb: 2.5 }}>
        <Typography variant="h1" className="dashboard-title">{title}</Typography>
        <Stack direction="row" alignItems="center" gap={2}>
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary" noWrap>Step {index + 1} of {steps.length}</Typography>
            <LinearProgress variant="determinate" value={((index + 1) / steps.length) * 100} sx={{ width: 110, height: 6, borderRadius: 3 }} aria-hidden />
          </Stack>
          {saveState && <SaveStatus state={saveState} long />}
        </Stack>
      </Stack>
      <Box component="nav" aria-label="Form setup steps">
        <Typography className="pp-form-steps-compact">Step {index + 1} of {steps.length} · {stepLabel[current]}</Typography>
        <Box component="ol" className="pp-form-steps">
          {steps.map((step, at) => {
            const state = at < index ? 'done' : at === index ? 'current' : 'todo';
            const content = <><span className="pp-form-step-dot">{at < index ? <CheckRounded /> : at + 1}</span>{stepLabel[step]}</>;
            return (
              <li key={step} className={`is-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
                {state === 'done' && onStep ? <button type="button" onClick={() => onStep(step)}>{content}</button> : <span>{content}</span>}
              </li>
            );
          })}
        </Box>
      </Box>
      <Paper className="pp-form-step-card">{children}</Paper>
      <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mt: 2.5 }}>{footer}</Stack>
    </Box>
  );
}

/** Icon + heading + one line of help, at the top of every step. */
function StepHeading({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5}>
      <Stack direction="row" gap={1.5} alignItems="center">
        <span className="pp-form-usage-icon" aria-hidden>{icon}</span>
        <Box><Typography variant="h2">{title}</Typography><Typography color="text.secondary">{text}</Typography></Box>
      </Stack>
      {action}
    </Stack>
  );
}

function DetailsFields({ name, setName, nameError }: { name: string; setName: (value: string) => void; nameError?: string }) {
  return (
    <Stack gap={3}>
      <StepHeading icon={<AutoAwesomeOutlined />} title="Name your form" text="Next you will choose who signups go to and pick a design." />
      <TextField label="Form name" placeholder="e.g. Spring product launch" value={name} onChange={(event) => setName(event.target.value)} error={Boolean(nameError)}
        helperText={nameError ?? 'Only your team sees this name. You can change it later.'} sx={{ maxWidth: 560 }} autoFocus />
    </Stack>
  );
}

/* ---------- create: step 1, before the form exists ---------- */

export function FormCreate() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const router = useRouter();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const create = useMutation({
    mutationFn: () => projectId ? createForm(defaultDraft({ name, kind: 'popup' }), projectId) : Promise.reject(new Error('Choose a project before creating a form.')),
    onSuccess: (draft) => {
      void client.invalidateQueries({ queryKey: formsKeys.all });
      router.push(`/dashboard/forms/${draft.id}/edit?step=audience`);
    },
  });
  const nameError = touched && !name.trim() ? 'Enter a name for the form.' : undefined;
  return (
    <WizardShell title="Create a form" current="details"
      footer={<>
        <Button component={Link} href="/dashboard/forms">Cancel</Button>
        <Button variant="contained" endIcon={<ArrowForwardRounded />} startIcon={create.isPending ? <CircularProgress size={18} color="inherit" /> : undefined} disabled={create.isPending}
          onClick={() => { setTouched(true); if (name.trim()) create.mutate(); }}>{create.isPending ? 'Saving…' : 'Save and continue'}</Button>
      </>}>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); setTouched(true); if (name.trim()) create.mutate(); }}>
        <DetailsFields name={name} setName={setName} nameError={nameError} />
      </Box>
      {create.isError && <Alert severity="error" sx={{ mt: 2 }}>{(create.error as Error).message}</Alert>}
    </WizardShell>
  );
}

/* ---------- edit ---------- */

function useAutosave(draft: FormDraft, projectId: string) {
  const client = useQueryClient();
  const [state, setState] = useState<SaveState>('saved');
  const first = useRef(true);
  const latestDraft = useRef(draft);
  const saving = useRef(false);
  const queued = useRef(false);
  const timer = useRef<number | null>(null);
  const waiters = useRef<Array<{ resolve: () => void; reject: (reason: unknown) => void }>>([]);
  latestDraft.current = draft;
  const saveLatest = useCallback(async function saveLatestRequest() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (saving.current) {
      queued.current = true;
      return new Promise<void>((resolve, reject) => waiters.current.push({ resolve, reject }));
    }
    saving.current = true;
    setState('saving');
    let failed = false;
    let failure: unknown;
    try {
      do {
        queued.current = false;
        const saved = await saveForm(latestDraft.current, projectId);
        client.setQueryData(formsKeys.one(projectId, saved.id), saved);
        void client.invalidateQueries({ queryKey: formsKeys.all });
      } while (queued.current);
      setState('saved');
    } catch (error) {
      failed = true;
      failure = error;
      setState('error');
      throw error;
    } finally {
      saving.current = false;
      const pending = waiters.current.splice(0);
      pending.forEach(({ resolve, reject }) => failed ? reject(failure) : resolve());
    }
  }, [client, projectId]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState('saving');
    const timeout = window.setTimeout(() => {
      timer.current = null;
      void saveLatest().catch(() => undefined);
    }, 500);
    timer.current = timeout;
    return () => {
      window.clearTimeout(timeout);
      if (timer.current === timeout) timer.current = null;
    };
  }, [draft, saveLatest]); // The callback reads the latest draft and serializes requests.
  return [state, saveLatest] as const;
}

export function FormWizard({ id }: { id: string }) {
  const editor = isEditorStep(useSearchParams().get('step'));
  const { active } = useActiveProject();
  const projectId = active?.id;
  const query = useQuery({ queryKey: formsKeys.one(projectId ?? '', id), queryFn: () => getForm(id, projectId!), staleTime: Infinity, enabled: Boolean(projectId) });
  if (query.isError) return <EmptyState tone="error" title="This form could not be opened" description={(query.error as Error).message} action={{ label: 'Back to forms', href: '/dashboard/forms' }} />;
  if (!query.data && editor) return <EditorSkeleton />;
  if (!query.data) return <Box className="pp-form-wizard"><Skeleton height={48} width={280} /><Skeleton variant="rounded" height={360} sx={{ mt: 2 }} /></Box>;
  return <WizardSteps id={id} projectId={projectId!} initial={query.data} />;
}

/** Owns the draft (with undo history) for every step, editor included, and autosaves it. */
function WizardSteps({ id, projectId, initial }: { id: string; projectId: string; initial: FormDraft }) {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [state, dispatch] = useReducer(editorReducer, { draft: initial, past: [], future: [] });
  const draft = state.draft;
  const [saveState, saveNow] = useAutosave(draft, projectId);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<string | null>(null);
  const statusChange = useMutation({
    mutationFn: async (status: FormDraft['status']) => {
      await saveNow();
      return setFormStatus(id, status, projectId);
    },
    onSuccess: (saved) => {
      dispatch({ type: 'update', fn: (current) => ({ ...current, status: saved.status, publicKey: saved.publicKey, embedSnippet: saved.embedSnippet }) });
      client.setQueryData(formsKeys.one(projectId, id), saved);
      void client.invalidateQueries({ queryKey: formsKeys.all });
    },
  });

  const requested = params.get('step') ?? '';
  const resolved: Step = steps.includes(requested as Step) ? requested as Step : legacySteps[requested] ?? 'editor';
  // Groups come before design: a form without any goes back to choose them.
  const step: Step = needsGroups.includes(resolved) && draft.groups.length === 0 ? 'audience' : resolved;
  const groupsQuery = useQuery({ queryKey: formsKeys.groupsFor(projectId), queryFn: () => listGroups(projectId), enabled: step === 'audience' });
  const goto = (next: Step) => router.push(`/dashboard/forms/${id}/edit?step=${next}`);
  const patch = (value: Partial<FormDraft>) => dispatch({ type: 'update', fn: (current) => ({ ...current, ...value }), key: Object.keys(value).join() });
  const returnedGroupId = params.get('newGroupId');
  useEffect(() => {
    if (step === requested || returnedGroupId) return;
    router.replace(`/dashboard/forms/${id}/edit?step=${step}`, { scroll: false });
  }, [id, requested, returnedGroupId, router, step]);
  useEffect(() => {
    if (!returnedGroupId) return;
    dispatch({ type: 'update', fn: (current) => current.groups.includes(returnedGroupId) ? current : { ...current, groups: [...current.groups, returnedGroupId] } });
    void client.invalidateQueries({ queryKey: formsKeys.groupsFor(projectId) });
    router.replace(`/dashboard/forms/${id}/edit?step=${requested && requested !== 'audience' ? requested : 'audience'}`, { scroll: false });
  }, [client, id, projectId, requested, returnedGroupId, router]);

  // Every uploaded image this session has shown. Once the form is saved without one (replaced, removed,
  // its block deleted), it is deleted from storage; the server keeps it if another form or email uses it.
  const seenUploads = useRef(new Set<string>());
  useEffect(() => { uploadsIn(draft).forEach((url) => seenUploads.current.add(url)); }, [draft]);
  const releaseUploads = () => {
    const kept = uploadsIn(draft);
    const unused = [...seenUploads.current].filter((url) => !kept.has(url));
    seenUploads.current = kept;
    unused.forEach((url) => void deleteFormImage(url, projectId).catch(() => undefined));
  };

  /** Saves first, so leaving a step never loses an edit. */
  const saveThen = async (go: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await saveNow();
      releaseUploads();
      go();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your changes. Try again.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const openGroupCreator = (from: Step) => void saveThen(() => {
    const returnTo = `/dashboard/forms/${id}/edit?step=${from}`;
    router.push(`/dashboard/users?tab=groups&createGroup=1&returnTo=${encodeURIComponent(returnTo)}`);
  });
  const applyAndEdit = (templateId: string) => { dispatch({ type: 'update', fn: (current) => applyTemplate(current, templateId) }); void saveThen(() => goto('editor')); };

  if (step === 'editor') {
    return (
      <>
        <FormEditor state={state} dispatch={dispatch} saveState={saveState} projectId={projectId} onBack={() => void saveThen(() => router.push('/dashboard/forms'))}
          onDone={() => void saveThen(() => goto('setup'))} />
        {error && <Alert severity="error" sx={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: (theme) => theme.zIndex.modal + 2 }}>{error}</Alert>}
      </>
    );
  }

  const spinner = pending ? <CircularProgress size={18} color="inherit" /> : undefined;
  const next = (to: Step, label = 'Save and continue', disabled = false) => (
    <Button variant="contained" endIcon={<ArrowForwardRounded />} startIcon={spinner} disabled={pending || disabled} onClick={() => void saveThen(() => goto(to))}>{pending ? 'Saving…' : label}</Button>
  );
  let body: ReactNode = null;
  let footer: ReactNode = null;
  if (step === 'details') {
    body = <DetailsFields name={draft.name} setName={(name) => patch({ name })} nameError={draft.name.trim() ? undefined : 'Enter a name for the form.'} />;
    footer = <><Button component={Link} href="/dashboard/forms" startIcon={<ArrowBackRounded />}>Forms</Button>{next('audience', 'Save and continue', !draft.name.trim())}</>;
  } else if (step === 'audience') {
    const available = new Set((groupsQuery.data ?? []).map((group) => group.id));
    const ready = groupsQuery.isSuccess && draft.groups.length > 0 && draft.groups.every((groupId) => available.has(groupId));
    body = <AudienceStep projectId={projectId} selected={draft.groups} onChange={(groups) => patch({ groups })} onCreateGroup={() => openGroupCreator('audience')} creatingGroup={pending} />;
    footer = <><Button startIcon={<ArrowBackRounded />} onClick={() => goto('details')}>Back</Button>{next('design', 'Save and continue', !ready)}</>;
  } else if (step === 'design') {
    // A draft takes the new template straight away (undo is in the editor); a published form asks first.
    body = <TemplateStep draft={draft} busy={pending} onChoose={(templateId) => (draft.status === 'draft' ? applyAndEdit(templateId) : setConfirmTemplate(templateId))} />;
    // Nothing to keep until a template was picked: choosing a card is the way forward.
    footer = <><Button startIcon={<ArrowBackRounded />} onClick={() => goto('audience')}>Back</Button>{draft.template && next('editor', 'Keep current design')}</>;
  } else {
    body = <UsageStep draft={draft} onChange={(behaviour) => patch({ behaviour })} onStatus={(status) => statusChange.mutate(status)} statusBusy={statusChange.isPending} statusError={statusChange.error instanceof Error ? statusChange.error.message : undefined} />;
    footer = <>
      <Button startIcon={<ArrowBackRounded />} onClick={() => goto('editor')}>Back to editor</Button>
      <Button variant="contained" startIcon={spinner} disabled={pending || Object.keys(behaviourErrors(draft.behaviour)).length > 0} onClick={() => void saveThen(() => router.push(`/dashboard/forms/${id}`))}>{pending ? 'Saving…' : 'Finish'}</Button>
    </>;
  }

  return (
    <WizardShell title={draft.status === 'draft' ? 'Create a form' : 'Edit form'} name={draft.name} current={step} onStep={goto} saveState={saveState} footer={footer}>
      {body}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Dialog open={Boolean(confirmTemplate)} onClose={() => setConfirmTemplate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Replace the form content?</DialogTitle>
        <DialogContent><Typography color="text.secondary">This form is already published. The template replaces its blocks, fields and design; you can undo in the editor.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTemplate(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => { if (confirmTemplate) applyAndEdit(confirmTemplate); setConfirmTemplate(null); }}>Use template</Button>
        </DialogActions>
      </Dialog>
    </WizardShell>
  );
}

/* ---------- step 2: subscriber groups ---------- */

function AudienceStep({ projectId, selected, onChange, onCreateGroup, creatingGroup }: { projectId: string; selected: string[]; onChange: (groups: string[]) => void; onCreateGroup: () => void; creatingGroup: boolean }) {
  const groups = useQuery({ queryKey: formsKeys.groupsFor(projectId), queryFn: () => listGroups(projectId) });
  const all = groups.data ?? [];
  const allSelected = all.length > 0 && all.every((group) => selected.includes(group.id));
  const validSelected = selected.filter((id) => all.some((group) => group.id === id));
  const toggle = (id: string) => onChange(validSelected.includes(id) ? validSelected.filter((item) => item !== id) : [...validSelected, id]);

  return (
    <Stack gap={2.5}>
      <StepHeading icon={<GroupsOutlined />} title="Subscriber groups" text="Everyone who signs up through this form joins the groups you choose."
        action={<Button variant="outlined" startIcon={creatingGroup ? <CircularProgress size={16} /> : <AddRounded />} disabled={creatingGroup} onClick={onCreateGroup} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' } }}>
          {all.length === 0 && groups.isSuccess ? 'Create your first group' : 'Create group'}
        </Button>} />
      {groups.isPending ? <Skeleton variant="rounded" height={180} /> : (
        groups.isError
          ? <EmptyState size="compact" {...listEmpty({ noun: 'subscriber groups', error: 'Could not load subscriber groups', onRetry: () => groups.refetch() })} />
          : all.length === 0
            ? <EmptyState size="compact" {...listEmpty({ noun: 'audience groups', description: 'Create a group to choose where signups are saved.' })} />
            : <Box>
              <FormControlLabel control={<Checkbox checked={allSelected} indeterminate={!allSelected && validSelected.length > 0} onChange={() => onChange(allSelected ? [] : all.map((group) => group.id))} />} label={<Typography fontWeight={600}>Select all groups</Typography>} />
              {selected.some((groupId) => !all.some((group) => group.id === groupId)) && <FormHelperText error>One or more selected groups are no longer available. Choose a current group to continue.</FormHelperText>}
              <Stack gap={1} sx={{ mt: 1 }}>
                {all.map((group) => {
                  const on = selected.includes(group.id);
                  return (
                    <FormControlLabel key={group.id} className={`pp-form-choice${on ? ' is-selected' : ''}`} sx={{ width: '100%', minWidth: 0, m: 0 }}
                      control={<Checkbox checked={on} onChange={() => toggle(group.id)} />}
                      label={
                        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={1} sx={{ width: '100%' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={600}>{group.name}</Typography>
                            {group.description && <Typography color="text.secondary" fontSize="var(--fs-13)">{group.description}</Typography>}
                          </Box>
                          <Chip label={`${group.count.toLocaleString()} ${group.count === 1 ? 'subscriber' : 'subscribers'}`} size="small" color={on ? 'primary' : 'default'} />
                        </Stack>
                      } />
                  );
                })}
              </Stack>
              {selected.length === 0 && <FormHelperText sx={{ mt: 1 }}>Choose at least one group to continue.</FormHelperText>}
            </Box>
      )}
    </Stack>
  );
}

/* ---------- step 3: template ---------- */

function TemplateStep({ draft, onChoose, busy }: { draft: FormDraft; onChoose: (templateId: string) => void; busy: boolean }) {
  const available = templatesFor(draft.kind);
  const categories = ['All', ...Array.from(new Set(available.filter((template) => template.id !== 'blank').map((template) => template.category)))];
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const previews = useMemo(() => Object.fromEntries(templatesFor(draft.kind).map((template) => [template.id, template.id === draft.template ? draft : applyTemplate(draft, template.id)])), [draft]);
  const query = search.trim().toLowerCase();
  const shown = available.filter((template) => template.id !== 'blank' && (category === 'All' || template.category === category) && template.name.toLowerCase().includes(query));
  const showBlank = category === 'All' && 'start from scratch blank pop-up'.includes(query);
  const card = (id: string, name: string, caption: string) => (
    <div key={id} className={`pp-form-template${draft.template === id ? ' is-current' : ''}`}>
      <FormThumbnail draft={previews[id]} width="100%" height={180} scale={0.42} />
      <span className="pp-form-template-meta">
        <span><strong>{name}</strong><small>{caption}</small></span>
        {draft.template === id ? <span className="pp-form-status is-active">In use</span> : <ArrowForwardRounded fontSize="small" sx={{ color: 'var(--pp-text-3)' }} />}
      </span>
      <button type="button" className="pp-form-template-hit" aria-label={`Use ${name}${draft.template === id ? ' (in use)' : ''}`} disabled={busy} onClick={() => onChoose(id)} />
    </div>
  );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '230px minmax(0, 1fr)' }, gap: { xs: 2.5, lg: 4 } }}>
      <Box component="aside" aria-label="Template categories" sx={{ minWidth: 0 }}>
        <Stack direction="row" gap={1.25} alignItems="center" sx={{ mb: 1.25 }}>
          <span className="pp-form-usage-icon" aria-hidden><GridViewRounded /></span>
          <Box><Typography variant="h2" sx={{ fontSize: 20 }}>Choose a design</Typography><Typography variant="caption" color="text.secondary">Pop-up templates</Typography></Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.25 }}>Start with a ready-made pop-up, or build your own from a blank one.</Typography>
        <Typography variant="overline" color="text.secondary">Browse templates</Typography>
        <Stack gap={0.5} sx={{ mt: 0.65 }}>
          {categories.map((item) => {
            const count = item === 'All' ? available.length : available.filter((template) => template.category === item).length;
            const on = category === item;
            return (
              <Button key={item} variant={on ? 'contained' : 'text'} size="small" fullWidth onClick={() => setCategory(item)} aria-pressed={on}
                sx={{ minHeight: 38, px: 1.25, justifyContent: 'space-between', color: on ? undefined : 'text.secondary' }}>
                <span>{item === 'All' ? 'All templates' : item}</span>
                <Typography component="span" fontSize={12} sx={{ opacity: 0.85 }}>{count}</Typography>
              </Button>
            );
          })}
        </Stack>
        <Paper variant="outlined" sx={{ mt: 2.5, p: 1.5, bgcolor: 'var(--pp-accent-soft)', borderColor: 'var(--pp-accent-line)' }}>
          <Typography variant="body2" fontWeight={600}>Need full control?</Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>Start from scratch with a blank pop-up and add each part yourself.</Typography>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => onChoose('blank')}>Start from scratch</Button>
        </Paper>
      </Box>

      <Box component="section" aria-label="Available templates" sx={{ minWidth: 0 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2.25 }}>
          <Box><Typography variant="h3" sx={{ fontSize: 17 }}>Templates for {kindPlural[draft.kind]}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>{draft.template ? 'Click another design to switch, or keep the one in use.' : 'Click a design to open it in the editor. You can change everything there.'}</Typography></Box>
          <SearchField placeholder="Search templates" value={search} onChange={setSearch} />
        </Stack>
        {shown.length === 0 && !showBlank
          ? <EmptyState size="compact" title="No templates found" description="Try another search or choose a different category." action={{ label: 'Clear search', onClick: () => { setSearch(''); setCategory('All'); } }} />
          : (
            <Box className="pp-form-template-grid">
              {showBlank && card('blank', 'Start from scratch', 'Blank pop-up')}
              {shown.map((template) => card(template.id, template.name, template.category))}
            </Box>
          )}
      </Box>
    </Box>
  );
}

/* ---------- How to use: click, automatic pop-up, or embedded ---------- */

const usageOptions: Array<{ value: UsageMode; title: string; text: string; icon: ReactNode }> = [
  { value: 'click', title: 'Show on click', text: 'The pop-up opens when a visitor clicks a button or link on your site.', icon: <TouchAppOutlined /> },
  { value: 'auto', title: 'Show on specific pages', text: 'The pop-up appears by itself on the pages you choose, for example after 5 seconds.', icon: <IosShareRounded /> },
  { value: 'inline', title: 'Embed in a fixed spot', text: 'The form sits inside your page where you place it, like the footer or sidebar.', icon: <ViewAgendaOutlined /> },
];

function UsageStep({ draft, onChange, onStatus, statusBusy, statusError }: {
  draft: FormDraft; onChange: (value: FormBehaviour) => void; onStatus: (status: FormDraft['status']) => void; statusBusy: boolean; statusError?: string;
}) {
  const mode = draft.behaviour.mode;
  let step = 1;
  return (
    <Stack gap={4.5}>
      <Section number={step++} title="How should the form appear?" description="Pick one. You can change it any time; the code below updates to match.">
        <Box role="radiogroup" aria-label="How the form appears" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5 }}>
          {usageOptions.map((option) => {
            const on = mode === option.value;
            return (
              <Card key={option.value} variant="outlined" sx={{ borderColor: on ? 'primary.main' : undefined, boxShadow: on ? (theme) => `0 0 0 1px ${theme.palette.primary.main}` : 'none', bgcolor: on ? 'var(--pp-accent-soft)' : undefined }}>
                <CardActionArea role="radio" aria-checked={on} onClick={() => onChange({ ...draft.behaviour, mode: option.value })} sx={{ height: '100%', p: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 1.5 }}>
                  <span className="pp-form-usage-icon" aria-hidden>{option.icon}</span>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600}>{option.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{option.text}</Typography>
                  </Box>
                  {on ? <CheckCircleRounded color="primary" fontSize="small" /> : <RadioButtonUncheckedRounded fontSize="small" sx={{ color: 'text.disabled' }} />}
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Section>

      {mode === 'auto' && (
        <Section number={step++} title="Pop-up behaviour" description="When it appears, on which pages and devices, and how often.">
          <PopupRules value={draft.behaviour} onChange={onChange} />
        </Section>
      )}

      <Section number={step++} title="Add it to your website" description={mode === 'click' ? 'Two small pieces: the script and the button.' : mode === 'inline' ? 'Two small pieces: the box where it shows and the script.' : 'One line of code is all you need.'}>
        <InstallPanel draft={draft} />
      </Section>

      <Section number={step++} title="Go live" description="Visitors see the form only while it is live.">
        <Paper variant="outlined" sx={{ p: 2 }}>
          <StatusControl draft={draft} onChange={onStatus} busy={statusBusy} error={statusError} />
        </Paper>
      </Section>
    </Stack>
  );
}

function Section({ number, title, description, children }: { number: number; title: string; description?: string; children: ReactNode }) {
  return (
    <Box component="section" aria-label={title}>
      <Stack direction="row" gap={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
        <Avatar sx={{ width: 28, height: 28, fontSize: 14, fontWeight: 600, bgcolor: 'primary.main' }}>{number}</Avatar>
        <Box>
          <Typography variant="h3">{title}</Typography>
          {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ pl: { md: 5.5 } }}>{children}</Box>
    </Box>
  );
}

/** One rule: a plain-language question on the left, one control on the right. */
function RuleRow({ label, help, children, last = false }: { label: string; help?: string; children: ReactNode; last?: boolean }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px minmax(0, 1fr)' }, gap: { xs: 1.25, md: 3 }, py: 2.5, borderBottom: last ? 0 : '1px solid var(--pp-border)' }}>
      <Box>
        <Typography fontWeight={600}>{label}</Typography>
        {help && <Typography variant="body2" color="text.secondary">{help}</Typography>}
      </Box>
      <Stack gap={1.5} sx={{ minWidth: 0, maxWidth: 520 }}>{children}</Stack>
    </Box>
  );
}

type Trigger = 'now' | 'delay' | 'scroll' | 'exit';
const triggerOf = (b: FormBehaviour): Trigger => (b.exitOn ? 'exit' : b.scrollOn ? 'scroll' : b.delayOn && b.delay > 0 ? 'delay' : 'now');
const repeatPresets: Array<[string, string]> = [['always', 'On every visit, until they sign up'], ['after:1:days', 'After 1 day'], ['after:1:weeks', 'After 1 week'], ['after:1:months', 'After 1 month'], ['after:3:months', 'After 3 months']];

/** The rules of an automatic pop-up, one simple choice each. */
function PopupRules({ value, onChange }: { value: FormBehaviour; onChange: (value: FormBehaviour) => void }) {
  const errors = behaviourErrors(value);
  const set = (patch: Partial<FormBehaviour>) => onChange({ ...value, ...patch });
  const int = (text: string) => (text === '' ? Number.NaN : Number(text));
  const trigger = triggerOf(value);
  const setTrigger = (next: Trigger) => set({
    delayOn: next === 'now' || next === 'delay', delay: next === 'now' ? 0 : value.delay > 0 ? value.delay : 5,
    scrollOn: next === 'scroll', exitOn: next === 'exit',
  });
  const repeat = value.repeat === 'always' ? 'always' : `after:${value.frequency}:${value.frequencyUnit}`;
  const repeatOptions = repeatPresets.some(([key]) => key === repeat) ? repeatPresets : [...repeatPresets, [repeat, `After ${value.frequency} ${value.frequencyUnit}`] as [string, string]];

  return (
    <Paper variant="outlined" sx={{ px: { xs: 2, md: 3 } }}>
      <RuleRow label="Appear after">
        <TextField select label="Show the pop-up" value={trigger} onChange={(event) => setTrigger(event.target.value as Trigger)}>
          <MenuItem value="delay">A few seconds after the page opens</MenuItem>
          <MenuItem value="now">Straight away</MenuItem>
          <MenuItem value="scroll">When the visitor scrolls down</MenuItem>
          <MenuItem value="exit">When the visitor is about to leave</MenuItem>
        </TextField>
        {trigger === 'delay' && (
          <TextField label="Seconds to wait" type="number" inputProps={{ min: 1, max: 600 }} value={Number.isNaN(value.delay) ? '' : value.delay} onChange={(event) => set({ delay: int(event.target.value) })}
            error={Boolean(errors.delay)} helperText={errors.delay ?? 'Counted from when the page opens.'} sx={{ maxWidth: 200 }} />
        )}
        {trigger === 'scroll' && (
          <TextField select label="How far down" value={value.scroll} onChange={(event) => set({ scroll: Number(event.target.value) })} sx={{ maxWidth: 240 }}>
            {[25, 50, 75].map((depth) => <MenuItem key={depth} value={depth}>{depth}% of the page</MenuItem>)}
          </TextField>
        )}
        {trigger === 'exit' && <Alert severity="info">Works on computers, where the mouse moves towards the browser bar. On phones and tablets it shows as soon as the page opens.</Alert>}
      </RuleRow>

      <RuleRow label="Pages">
        <TextField select label="Show on" value={value.pages} onChange={(event) => set({ pages: event.target.value as FormBehaviour['pages'] })}>
          <MenuItem value="all">All pages</MenuItem>
          <MenuItem value="show">Only specific pages</MenuItem>
          {value.pages === 'hide' && <MenuItem value="hide">All pages except some</MenuItem>}
        </TextField>
        {value.pages !== 'all' && (
          <TextField label="Page addresses" multiline minRows={3} placeholder={'https://example.com/pricing\nhttps://example.com/blog'} value={value.urls} onChange={(event) => set({ urls: event.target.value })}
            error={Boolean(errors.urls)} helperText={errors.urls ?? `One address per line. Pages under it are included too. ${urlLines(value.urls).length} added.`} />
        )}
      </RuleRow>

      <RuleRow label="Devices" help="Turn on to hide the pop-up there.">
        <FormGroup>
          {([['hideDesktop', 'Hide on desktop', <DesktopWindowsOutlined key="d" fontSize="small" />], ['hideTablet', 'Hide on tablet', <TabletMacOutlined key="t" fontSize="small" />], ['hideMobile', 'Hide on mobile', <PhoneIphoneOutlined key="m" fontSize="small" />]] as const).map(([key, label, icon]) => (
            <FormControlLabel key={key} labelPlacement="start" sx={{ mx: 0, justifyContent: 'space-between' }}
              control={<Switch checked={value[key]} onChange={(event) => set({ [key]: event.target.checked })} />}
              label={<Stack direction="row" gap={1} alignItems="center" sx={{ color: 'text.secondary' }}>{icon}<Typography color="text.primary">{label}</Typography></Stack>} />
          ))}
        </FormGroup>
        {errors.hideMobile && <FormHelperText error>{errors.hideMobile}</FormHelperText>}
      </RuleRow>

      <RuleRow label="Show the pop-up again" help="People who sign up never see it again.">
        <TextField select label="Show it" value={repeat} onChange={(event) => {
          const [kind, amount, unit] = event.target.value.split(':');
          set(kind === 'always' ? { repeat: 'always' } : { repeat: 'after', frequency: Number(amount), frequencyUnit: unit as FormBehaviour['frequencyUnit'] });
        }}>
          {repeatOptions.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
        </TextField>
      </RuleRow>

      <RuleRow label="Schedule" last>
        <TextField select label="Active" value={value.schedule} onChange={(event) => set({ schedule: event.target.value as FormBehaviour['schedule'] })}>
          <MenuItem value="now">Always, while the form is live</MenuItem>
          <MenuItem value="range">Only between two dates</MenuItem>
        </TextField>
        {value.schedule === 'range' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField fullWidth label="Starts" type="datetime-local" InputLabelProps={{ shrink: true }} value={value.startAt} onChange={(event) => set({ startAt: event.target.value })} error={Boolean(errors.startAt)} helperText={errors.startAt} />
            <TextField fullWidth label="Ends" type="datetime-local" InputLabelProps={{ shrink: true }} value={value.endAt} onChange={(event) => set({ endAt: event.target.value })} error={Boolean(errors.endAt)} helperText={errors.endAt} />
          </Stack>
        )}
      </RuleRow>
    </Paper>
  );
}
