'use client';

import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddRounded, ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, CheckRounded, GridViewRounded, ViewSidebarRounded } from '@mui/icons-material';
import {
  Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormHelperText, MenuItem, Paper,
  Radio, RadioGroup, Skeleton, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import EmptyState from '@/components/dashboard/EmptyState';
import SearchField from '@/components/dashboard/SearchField';
import { createGroup, formsKeys, getForm, listGroups, saveForm } from '@/lib/forms';
import { SettingSwitch } from './controls';
import FormEditor, { type SaveState } from './FormEditor';
import { applyTemplate, behaviourErrors, defaultDraft, editorReducer, kindLabel, kindPlural, templatesFor, urlLines, type FormBehaviour, type FormDraft, type FormKind } from './model';
import { FormThumbnail, InstallPanel, SaveStatus, StatusControl } from './shared';

type Step = 'details' | 'audience' | 'design' | 'editor' | 'behaviour' | 'setup';

const stepLabel: Record<Step, string> = { details: 'Form details', audience: 'Subscriber groups', design: 'Template', editor: 'Content & design', behaviour: 'Behaviour', setup: 'Install' };
const stepsFor = (kind: FormKind): Step[] => (kind === 'embedded' ? ['details', 'audience', 'design', 'editor', 'setup'] : ['details', 'audience', 'design', 'editor', 'behaviour', 'setup']);

const typeOptions: Array<{ value: FormKind; description: string; icon: ReactNode }> = [
  { value: 'popup', description: 'Turn website visitors into subscribers with a focused overlay.', icon: <ViewSidebarRounded /> },
  { value: 'embedded', description: 'Place a signup form inside a page, footer or content block.', icon: <GridViewRounded /> },
  { value: 'promotion', description: 'Show a timely offer or announcement on your site.', icon: <AutoAwesomeRounded /> },
];

/* ---------- layout ---------- */

function WizardShell({ title, name, steps, current, onStep, saveState, children, footer }: {
  title: string; name?: string; steps: Step[]; current: Step; onStep?: (step: Step) => void; saveState?: SaveState; children: ReactNode; footer: ReactNode;
}) {
  const index = steps.indexOf(current);
  return (
    <Box className="pp-form-wizard">
      <Stack direction="row" alignItems="center" gap={0.75} className="pp-form-crumbs">
        <Link href="/dashboard/forms">Forms</Link><span aria-hidden>/</span><Typography component="span" noWrap>{name || 'New form'}</Typography>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} gap={1} sx={{ mb: 2.5 }}>
        <Typography variant="h1" className="dashboard-title">{title}</Typography>
        {saveState && <SaveStatus state={saveState} long />}
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

function DetailsFields({ name, setName, kind, setKind, kindLocked, nameError }: { name: string; setName: (value: string) => void; kind: FormKind; setKind: (value: FormKind) => void; kindLocked?: boolean; nameError?: string }) {
  return (
    <Stack gap={3}>
      <Box><Typography variant="h2">Form details</Typography><Typography color="text.secondary">Name your form and choose how it appears on your site.</Typography></Box>
      <TextField label="Form name" placeholder="e.g. Spring product launch" value={name} onChange={(event) => setName(event.target.value)} error={Boolean(nameError)} helperText={nameError ?? 'Only your team sees this name.'} sx={{ maxWidth: 560 }} autoFocus />
      <Box>
        <Typography id="form-type-label" className="pp-form-control-label" sx={{ mb: 1 }}>Type</Typography>
        <RadioGroup aria-labelledby="form-type-label" value={kind} onChange={(event) => setKind(event.target.value as FormKind)} className="pp-form-choices">
          {typeOptions.map((option) => (
            <FormControlLabel key={option.value} value={option.value} disabled={kindLocked && option.value !== kind} control={<Radio />}
              className={`pp-form-choice${kind === option.value ? ' is-selected' : ''}`}
              label={<Stack direction="row" gap={1.5} alignItems="center"><span className="pp-form-choice-icon">{option.icon}</span><Box><Typography fontWeight={600}>{kindLabel[option.value]}</Typography><Typography color="text.secondary" fontSize="var(--fs-13)">{option.description}</Typography></Box></Stack>} />
          ))}
        </RadioGroup>
        {kindLocked && <FormHelperText>The type is fixed once a form is created. Create a new form to use another type.</FormHelperText>}
      </Box>
    </Stack>
  );
}

/* ---------- create (step 1 before a draft exists) ---------- */

export function FormCreate() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<FormKind>(() => (['popup', 'embedded', 'promotion'].includes(params.get('kind') ?? '') ? (params.get('kind') as FormKind) : 'popup'));
  const [touched, setTouched] = useState(false);
  const create = useMutation({
    mutationFn: () => saveForm(defaultDraft({ name, kind })),
    onSuccess: (draft) => {
      void client.invalidateQueries({ queryKey: formsKeys.all });
      router.push(`/dashboard/forms/${draft.id}/edit?step=audience`);
    },
  });
  const nameError = touched && !name.trim() ? 'Enter a name for the form.' : undefined;
  return (
    <WizardShell title="Create a form" steps={stepsFor(kind)} current="details"
      footer={<>
        <Button component={Link} href="/dashboard/forms">Cancel</Button>
        <Button variant="contained" endIcon={<ArrowForwardRounded />} disabled={create.isPending} onClick={() => { setTouched(true); if (name.trim()) create.mutate(); }}>Save and continue</Button>
      </>}>
      <DetailsFields name={name} setName={setName} kind={kind} setKind={setKind} nameError={nameError} />
      {create.isError && <Alert severity="error" sx={{ mt: 2 }}>{(create.error as Error).message}</Alert>}
    </WizardShell>
  );
}

/* ---------- edit wizard ---------- */

function useAutosave(draft: FormDraft) {
  const client = useQueryClient();
  const [state, setState] = useState<SaveState>('saved');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setState('saving');
    const timer = window.setTimeout(() => {
      saveForm(draft)
        .then((saved) => { client.setQueryData(formsKeys.one(saved.id), saved); void client.invalidateQueries({ queryKey: formsKeys.all, exact: true }); setState('saved'); })
        .catch(() => setState('error'));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft, client]);
  return state;
}

export function FormWizard({ id }: { id: string }) {
  const query = useQuery({ queryKey: formsKeys.one(id), queryFn: () => getForm(id), staleTime: Infinity });
  if (query.isError) return <EmptyState tone="error" title="This form could not be opened" description={(query.error as Error).message} action={{ label: 'Back to forms', href: '/dashboard/forms' }} />;
  if (!query.data) return <Box className="pp-form-wizard"><Skeleton height={48} width={280} /><Skeleton variant="rounded" height={360} sx={{ mt: 2 }} /></Box>;
  return <WizardSteps id={id} initial={query.data} />;
}

/** Owns the draft (with undo history) for every step, editor included, and autosaves it. */
function WizardSteps({ id, initial }: { id: string; initial: FormDraft }) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, dispatch] = useReducer(editorReducer, { draft: initial, past: [], future: [] });
  const draft = state.draft;
  const setDraft = (next: FormDraft) => dispatch({ type: 'update', fn: () => next });
  const saveState = useAutosave(draft);

  const steps = stepsFor(draft.kind);
  const requested = params.get('step') as Step | null;
  const step: Step = requested && steps.includes(requested) ? requested : 'audience';
  const goto = (next: Step) => router.push(`/dashboard/forms/${id}/edit?step=${next}`);
  const next = steps[steps.indexOf(step) + 1];
  const previous = steps[steps.indexOf(step) - 1];
  const patch = (value: Partial<FormDraft>) => dispatch({ type: 'update', fn: (current) => ({ ...current, ...value }), key: Object.keys(value).join() });

  if (step === 'editor') {
    return <FormEditor state={state} dispatch={dispatch} saveState={saveState} onBack={() => goto("design")} onDone={() => goto(next)} />;
  }

  let body: ReactNode = null;
  let canContinue = true;
  if (step === 'details') {
    canContinue = Boolean(draft.name.trim());
    body = <DetailsFields name={draft.name} setName={(name) => patch({ name })} kind={draft.kind} setKind={() => undefined} kindLocked nameError={canContinue ? undefined : 'Enter a name for the form.'} />;
  } else if (step === 'audience') {
    canContinue = draft.groups.length > 0;
    body = <AudienceStep selected={draft.groups} onChange={(groups) => patch({ groups })} />;
  } else if (step === 'design') {
    body = <TemplateStep draft={draft} onApply={(templateId) => { setDraft(applyTemplate(draft, templateId)); goto('editor'); }} />;
  } else if (step === 'behaviour') {
    canContinue = Object.keys(behaviourErrors(draft.behaviour)).length === 0;
    body = <BehaviourStep value={draft.behaviour} onChange={(behaviour) => patch({ behaviour })} />;
  } else if (step === 'setup') {
    body = <SetupStep draft={draft} onStatus={(status) => patch({ status })} />;
  }

  return (
    <WizardShell title={draft.status === 'draft' ? 'Create a form' : 'Edit form'} name={draft.name} steps={steps} current={step} onStep={goto} saveState={saveState}
      footer={<>
        <Button startIcon={<ArrowBackRounded />} onClick={() => (previous ? goto(previous) : router.push('/dashboard/forms'))}>{previous ? 'Back' : 'Forms'}</Button>
        {step === 'design'
          ? <Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => goto('editor')}>Open editor</Button>
          : next
            ? <Button variant="contained" endIcon={<ArrowForwardRounded />} disabled={!canContinue} onClick={() => goto(next)}>Save and continue</Button>
            : <Button variant="contained" component={Link} href={`/dashboard/forms/${id}`}>Finish</Button>}
      </>}>
      {body}
    </WizardShell>
  );
}

/* ---------- step 2: groups ---------- */

function AudienceStep({ selected, onChange }: { selected: string[]; onChange: (groups: string[]) => void }) {
  const client = useQueryClient();
  const groups = useQuery({ queryKey: formsKeys.groups, queryFn: listGroups });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const add = useMutation({
    mutationFn: () => createGroup(name, description),
    onSuccess: (group) => {
      void client.invalidateQueries({ queryKey: formsKeys.groups });
      onChange([...selected, group.id]);
      setOpen(false); setName(''); setDescription('');
    },
  });
  const all = groups.data ?? [];
  const allSelected = all.length > 0 && all.every((group) => selected.includes(group.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
        <Box><Typography variant="h2">Subscriber groups</Typography><Typography color="text.secondary">New subscribers from this form join the groups you choose.</Typography></Box>
        <Button variant="outlined" startIcon={<AddRounded />} onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>New group</Button>
      </Stack>
      {groups.isPending ? <Skeleton variant="rounded" height={180} /> : (
        <Box>
          <FormControlLabel control={<Checkbox checked={allSelected} indeterminate={!allSelected && selected.length > 0} onChange={() => onChange(allSelected ? [] : all.map((group) => group.id))} />} label={<Typography fontWeight={600}>Select all groups</Typography>} />
          <Stack gap={1} sx={{ mt: 1 }}>
            {all.map((group) => (
              <FormControlLabel key={group.id} className={`pp-form-choice${selected.includes(group.id) ? ' is-selected' : ''}`} control={<Checkbox checked={selected.includes(group.id)} onChange={() => toggle(group.id)} />}
                label={<Box><Typography fontWeight={600}>{group.name}</Typography>{group.description && <Typography color="text.secondary" fontSize="var(--fs-13)">{group.description}</Typography>}</Box>} />
            ))}
          </Stack>
          {selected.length === 0 && <FormHelperText error sx={{ mt: 1 }}>Choose at least one group to continue.</FormHelperText>}
        </Box>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New subscriber group</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <TextField autoFocus label="Group name" value={name} onChange={(event) => setName(event.target.value)} error={add.isError} helperText={add.isError ? (add.error as Error).message : undefined} />
            <TextField label="Description (optional)" value={description} onChange={(event) => setDescription(event.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={!name.trim() || add.isPending} onClick={() => add.mutate()}>Create group</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

/* ---------- step 3: template ---------- */

function TemplateStep({ draft, onApply }: { draft: FormDraft; onApply: (templateId: string) => void }) {
  const available = templatesFor(draft.kind);
  const categories = ['All', ...Array.from(new Set(available.map((template) => template.category)))];
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const previews = useMemo(() => Object.fromEntries(templatesFor(draft.kind).map((template) => [template.id, template.id === draft.template ? draft : applyTemplate(draft, template.id)])), [draft]);
  const shown = available.filter((template) => (category === 'All' || template.category === category) && template.name.toLowerCase().includes(search.trim().toLowerCase()));
  const choose = (id: string) => (id === draft.template ? onApply(id) : setConfirm(id));

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
        <Box><Typography variant="h2">Choose a template</Typography><Typography color="text.secondary">Templates for {kindPlural[draft.kind]}. Everything can be changed in the editor.</Typography></Box>
        <SearchField placeholder="Search templates" value={search} onChange={setSearch} />
      </Stack>
      <Tabs value={category} onChange={(_, value) => setCategory(value)} variant="scrollable" aria-label="Template categories">
        {categories.map((item) => <Tab key={item} value={item} label={<>{item}<Chip size="small" label={item === 'All' ? available.length : available.filter((template) => template.category === item).length} /></>} />)}
      </Tabs>
      {shown.length === 0
        ? <EmptyState size="compact" title="No templates match" description="Try another search or category." action={{ label: 'Clear search', onClick: () => { setSearch(''); setCategory('All'); } }} />
        : (
          <Box className="pp-form-templates">
            {shown.map((template) => (
              <div key={template.id} className={`pp-form-template${draft.template === template.id ? ' is-current' : ''}`}>
                <FormThumbnail draft={previews[template.id]} width="100%" height={170} scale={0.42} />
                <span className="pp-form-template-meta">
                  <span><strong>{template.name}</strong><small>{template.category}</small></span>
                  {draft.template === template.id && <span className="pp-form-status is-active">In use</span>}
                </span>
                <button type="button" className="pp-form-template-hit" aria-label={`${template.name}${draft.template === template.id ? ' (in use)' : ''}`} onClick={() => choose(template.id)} />
              </div>
            ))}
          </Box>
        )}
      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Replace the form content?</DialogTitle>
        <DialogContent><Typography color="text.secondary">The template replaces the current blocks, fields and design. Groups and behaviour stay as they are. You can undo inside the editor.</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="contained" onClick={() => { if (confirm) onApply(confirm); setConfirm(null); }}>Use template</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}

/* ---------- step 5: behaviour ---------- */

function BehaviourStep({ value, onChange }: { value: FormBehaviour; onChange: (value: FormBehaviour) => void }) {
  const errors = behaviourErrors(value);
  const set = <K extends keyof FormBehaviour>(key: K, next: FormBehaviour[K]) => onChange({ ...value, [key]: next });
  const int = (text: string) => (text === '' ? Number.NaN : Number(text));
  return (
    <Stack gap={3}>
      <Box><Typography variant="h2">Behaviour</Typography><Typography color="text.secondary">Choose when the form appears, how often, and to whom.</Typography></Box>

      <Box component="section" aria-labelledby="b-trigger">
        <Typography id="b-trigger" variant="h3">Trigger</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mb: 1.5 }}>Show the form when any of these happen.</Typography>
        <Stack gap={2} className="pp-form-behaviour-group">
          <SettingSwitch label="After a delay" description="Counted from when the page opens." checked={value.delayOn} onChange={(on) => set('delayOn', on)}>
            <TextField label="Seconds" type="number" inputProps={{ min: 0, max: 600 }} value={Number.isNaN(value.delay) ? '' : value.delay} onChange={(event) => set('delay', int(event.target.value))} error={Boolean(errors.delay)} helperText={errors.delay} sx={{ maxWidth: 200 }} />
          </SettingSwitch>
          <SettingSwitch label="When the visitor scrolls" checked={value.scrollOn} onChange={(on) => set('scrollOn', on)}>
            <TextField select label="Scroll depth" value={value.scroll} onChange={(event) => set('scroll', Number(event.target.value))} sx={{ maxWidth: 200 }}>
              {[25, 50, 75, 100].map((depth) => <MenuItem key={depth} value={depth}>{depth}% of the page</MenuItem>)}
            </TextField>
          </SettingSwitch>
          <SettingSwitch label="Before the visitor leaves" description="Desktop only: when the mouse heads for the browser bar." checked={value.exitOn} onChange={(on) => set('exitOn', on)} />
          <SettingSwitch label="When an element is clicked" description="The install code includes a button you can place anywhere." checked={value.clickOn} onChange={(on) => set('clickOn', on)} />
        </Stack>
        {errors.trigger && <FormHelperText error>{errors.trigger}</FormHelperText>}
      </Box>

      <Box component="section" aria-labelledby="b-frequency">
        <Typography id="b-frequency" variant="h3">Frequency</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mb: 1.5 }}>If someone closes the form without subscribing, show it again after:</Typography>
        <Stack direction="row" gap={1}>
          <TextField label="Every" type="number" inputProps={{ min: 1, max: 365 }} value={Number.isNaN(value.frequency) ? '' : value.frequency} onChange={(event) => set('frequency', int(event.target.value))} error={Boolean(errors.frequency)} helperText={errors.frequency} sx={{ width: 140 }} />
          <TextField select label="Unit" value={value.frequencyUnit} onChange={(event) => set('frequencyUnit', event.target.value as FormBehaviour['frequencyUnit'])} sx={{ width: 160 }}>
            <MenuItem value="days">days</MenuItem><MenuItem value="weeks">weeks</MenuItem><MenuItem value="months">months</MenuItem>
          </TextField>
        </Stack>
      </Box>

      <Box component="section" aria-labelledby="b-schedule">
        <Typography id="b-schedule" variant="h3" sx={{ mb: 1 }}>Schedule</Typography>
        <RadioGroup aria-labelledby="b-schedule" value={value.schedule} onChange={(event) => set('schedule', event.target.value as FormBehaviour['schedule'])}>
          <FormControlLabel value="now" control={<Radio />} label="Show as soon as the form is live" />
          <FormControlLabel value="range" control={<Radio />} label="Only between two dates" />
        </RadioGroup>
        {value.schedule === 'range' && (
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 1.5 }}>
            <TextField label="Starts" type="datetime-local" InputLabelProps={{ shrink: true }} value={value.startAt} onChange={(event) => set('startAt', event.target.value)} error={Boolean(errors.startAt)} helperText={errors.startAt} />
            <TextField label="Ends" type="datetime-local" InputLabelProps={{ shrink: true }} value={value.endAt} onChange={(event) => set('endAt', event.target.value)} error={Boolean(errors.endAt)} helperText={errors.endAt} />
          </Stack>
        )}
      </Box>

      <Box component="section" aria-labelledby="b-visibility">
        <Typography id="b-visibility" variant="h3" sx={{ mb: 1 }}>Visibility</Typography>
        <RadioGroup aria-labelledby="b-visibility" value={value.pages} onChange={(event) => set('pages', event.target.value as FormBehaviour['pages'])}>
          <FormControlLabel value="all" control={<Radio />} label="Every page" />
          <FormControlLabel value="hide" control={<Radio />} label="Every page except these" />
          <FormControlLabel value="show" control={<Radio />} label="Only these pages" />
        </RadioGroup>
        {value.pages !== 'all' && (
          <Stack gap={1} sx={{ mt: 1.5, maxWidth: 560 }}>
            <TextField label="Page addresses" multiline rows={3} placeholder={'https://example.com/pricing\nhttps://example.com/blog'} value={value.urls} onChange={(event) => set('urls', event.target.value)} error={Boolean(errors.urls)} helperText={errors.urls ?? `One address per line · ${urlLines(value.urls).length} added`} />
            <SettingSwitch label="Exact match only" description="Off: an address also matches its sub-pages (example.com/blog matches example.com/blog/post)." checked={value.strict} onChange={(strict) => set('strict', strict)} />
          </Stack>
        )}
        <Typography className="pp-form-control-label" sx={{ mt: 2, mb: 0.5 }}>Devices</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={{ sm: 2 }}>
          <FormControlLabel control={<Checkbox checked={value.hideDesktop} onChange={(event) => set('hideDesktop', event.target.checked)} />} label="Hide on desktop" />
          <FormControlLabel control={<Checkbox checked={value.hideTablet} onChange={(event) => set('hideTablet', event.target.checked)} />} label="Hide on tablet" />
          <FormControlLabel control={<Checkbox checked={value.hideMobile} onChange={(event) => set('hideMobile', event.target.checked)} />} label="Hide on mobile" />
        </Stack>
        {errors.hideMobile && <FormHelperText error>{errors.hideMobile}</FormHelperText>}
      </Box>
    </Stack>
  );
}

/* ---------- step 6: install ---------- */

function SetupStep({ draft, onStatus }: { draft: FormDraft; onStatus: (status: FormDraft['status']) => void }) {
  return (
    <Stack gap={3}>
      <Box><Typography variant="h2">Install and go live</Typography><Typography color="text.secondary">Add the code to your site, then switch the form on.</Typography></Box>
      <InstallPanel draft={draft} />
      <StatusControl draft={draft} onChange={onStatus} />
    </Stack>
  );
}
