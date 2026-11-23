'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Skeleton, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import EmptyState from '@/components/dashboard/EmptyState';
import { dataSyncApi, journeysApi, type SyncMigrationRun, type SyncOverduePolicy, type SyncSourceComparison } from '@/lib/projects/api';

const STEPS = ['Stage', 'Drain', 'Source stopped', 'Compare', 'Approve', 'Live'];
const OVERDUE: Record<SyncOverduePolicy, string> = {
  catch_up: 'Send late, spread over time',
  skip: 'Skip messages that are too old',
  exit: 'Remove users who are too old',
};
const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

const activeStep = (run: SyncMigrationRun) => {
  if (run.status === 'cutover') return 6;
  if (run.status === 'draft') return 0;
  if (!run.drainConfirmedAt) return 1;
  if (!run.sourceHoldAt) return 2;
  if (!run.comparedAt || new Date(run.comparedAt) < new Date(run.sourceHoldAt)) return 3;
  return 4;
};

const parseStepCounts = (value: string) => Object.fromEntries(value.split(',').map((item) => item.trim()).filter(Boolean).map((item) => {
  const [key, count] = item.split('=').map((part) => part.trim());
  if (!key || !/^\d+$/.test(count ?? '')) throw new Error(`Use step=count. Could not read "${item}".`);
  return [key, Number(count)];
}));

type Action = { kind: 'drain' | 'hold' | 'compare' | 'request' | 'approve' | 'rollback'; run: SyncMigrationRun };

export default function DataSyncMigrations({ projectId, accountId, canEdit, canControl }: { projectId: string; accountId?: string; canEdit: boolean; canControl: boolean }) {
  const client = useQueryClient();
  const queryKey = ['projects', projectId, 'data-sync', 'migrations'];
  const runsQuery = useQuery({ queryKey, queryFn: () => dataSyncApi.migrations(projectId), refetchInterval: 15000 });
  const journeysQuery = useQuery({ queryKey: ['projects', projectId, 'migration-journeys'], queryFn: () => journeysApi.list(projectId, { limit: 100 }) });
  const journeyName = (id: string) => journeysQuery.data?.items.find((journey) => journey.id === id)?.name ?? id.slice(0, 8);
  const [name, setName] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [journeyIds, setJourneyIds] = useState<string[]>([]);
  const [editing, setEditing] = useState('');
  const [stagedText, setStagedText] = useState('');
  const [participantsRun, setParticipantsRun] = useState('');
  const [participantsText, setParticipantsText] = useState('[]');
  const [action, setAction] = useState<Action>();
  const [watermark, setWatermark] = useState('');
  const [stopped, setStopped] = useState(false);
  const [migrated, setMigrated] = useState(true);
  const [counts, setCounts] = useState<Record<string, { steps: string; active: string; stepCounts: string; sentMessages: string }>>({});
  const [importProblems, setImportProblems] = useState<string[]>([]);
  const [policy, setPolicy] = useState<SyncOverduePolicy>('catch_up');
  const [maxHours, setMaxHours] = useState('24');
  const [catchUp, setCatchUp] = useState('60');
  const [selfApproved, setSelfApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = () => client.invalidateQueries({ queryKey });
  const run = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
      if (done) setNotice(done);
      await refresh();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const open = (kind: Action['kind'], target: SyncMigrationRun) => {
    setAction({ kind, run: target });
    setDialogError('');
    setWatermark('');
    setStopped(false);
    setSelfApproved(false);
    if (kind === 'compare') setCounts(Object.fromEntries(target.journeyIds.map((id) => [id, { steps: '', active: '0', stepCounts: '', sentMessages: '' }])));
  };

  const submit = async () => {
    if (!action) return;
    setBusy(true);
    setDialogError('');
    try {
      const id = action.run.id;
      if (action.kind === 'drain') await dataSyncApi.drainMigration(projectId, id);
      if (action.kind === 'hold') await dataSyncApi.confirmSourceHold(projectId, id, watermark.trim());
      if (action.kind === 'compare') {
        const journeys = Object.fromEntries(Object.entries(counts).map(([journeyId, value]) => [journeyId, { steps: Number(value.steps), active: Number(value.active || 0), stepCounts: parseStepCounts(value.stepCounts), ...(migrated && value.sentMessages ? { sentMessages: Number(value.sentMessages) } : {}) }]));
        const result = await dataSyncApi.compareMigration(projectId, id, { participantsMigrated: migrated, journeys });
        if (!result.matched) {
          await refresh();
          setDialogError(`Counts do not match: ${result.differences.map((item) => `${journeyName(item.journeyId)} ${item.field} (source ${item.source}, PixlPush ${item.pixlpush})`).join('; ') || 'a journey is missing.'}`);
          return;
        }
      }
      if (action.kind === 'request') await dataSyncApi.requestCutover(projectId, id, { overduePolicy: policy, overdueMaxHours: Number(maxHours), catchUpMinutes: Number(catchUp) });
      if (action.kind === 'approve') await dataSyncApi.cutoverMigration(projectId, id, selfApproved);
      if (action.kind === 'rollback') await dataSyncApi.rollbackMigration(projectId, id);
      setAction(undefined);
      await refresh();
    } catch (cause) {
      setDialogError(errorText(cause));
    } finally {
      setBusy(false);
    }
  };

  const validCounts = Object.values(counts).every((value) => /^\d+$/.test(value.steps) && (!migrated || (/^\d+$/.test(value.active) && /^\d*$/.test(value.sentMessages))));
  const validPolicy = /^\d+$/.test(maxHours) && Number(maxHours) >= 1 && Number(maxHours) <= 720 && /^\d+$/.test(catchUp) && Number(catchUp) >= 1 && Number(catchUp) <= 1440;
  const canSubmit = !busy && (action?.kind === 'hold' ? Boolean(watermark.trim() && stopped) : action?.kind === 'compare' ? validCounts : action?.kind === 'request' ? validPolicy : true);
  const ownRequest = action?.kind === 'approve' && action.run.cutoverRequestedById === accountId;
  const titles: Record<Action['kind'], string> = {
    drain: 'Start draining?',
    hold: 'Confirm the source has stopped',
    compare: 'Compare source counts',
    request: 'Request cutover',
    approve: 'Approve cutover',
    rollback: 'Roll back this migration?',
  };

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="h4">Journey migration runs</Typography>
        <Typography variant="body2" color="text.secondary">Move journeys safely. Only one system can send at a time, and cutover needs an explicit approval.</Typography>
      </Box>
      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

      {canControl && (
        <Card className="saas-card">
          <Stack gap={1.5}>
            <Typography variant="subtitle1">Create a staged migration</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              <TextField size="small" label="Run name" value={name} onChange={(event) => setName(event.target.value)} inputProps={{ maxLength: 100 }} />
              <TextField size="small" label="Current source system" value={sourceName} onChange={(event) => setSourceName(event.target.value)} inputProps={{ maxLength: 100 }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
              {(journeysQuery.data?.items ?? []).map((journey) => (
                <FormControlLabel key={journey.id} label={`${journey.name} · ${journey.status}`} control={<Checkbox checked={journeyIds.includes(journey.id)} onChange={(event) => setJourneyIds((ids) => event.target.checked ? [...ids, journey.id] : ids.filter((id) => id !== journey.id))} />} />
              ))}
            </Box>
            {journeysQuery.isSuccess && !journeysQuery.data.items.length && <Typography variant="body2" color="text.secondary">Create a journey before starting a migration.</Typography>}
            <Button variant="contained" sx={{ alignSelf: 'flex-start' }} disabled={busy || !name.trim() || !journeyIds.length} onClick={() => void run(async () => {
              await dataSyncApi.createMigration(projectId, { name: name.trim(), sourceName: sourceName.trim() || 'External source', journeyIds });
              setName(''); setSourceName(''); setJourneyIds([]);
            }, 'Staged run created.')}>Create staged run</Button>
          </Stack>
        </Card>
      )}

      {runsQuery.isLoading ? <Card className="saas-card"><Skeleton height={96} /></Card> : runsQuery.isError ? <Alert severity="error">{errorText(runsQuery.error)}</Alert> : !runsQuery.data?.length ? (
        <Card className="saas-card"><EmptyState size="compact" title="No migration runs yet" description="Create a staged run when you are ready to move a journey." /></Card>
      ) : runsQuery.data.map((item) => {
        const step = activeStep(item);
        const report = item.validationReport as { valid?: boolean; errors?: { message?: string; code?: string }[]; warnings?: { message?: string }[] } | null;
        const comparison = item.comparisonReport as SyncSourceComparison | null;
        const requested = Boolean(item.cutoverRequestedAt);
        const staging = item.status === 'draft' || item.status === 'draining';
        return (
          <Card key={item.id} className="saas-card">
            <Stack gap={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                <Box>
                  <Stack direction="row" gap={1} alignItems="center"><Typography variant="subtitle1">{item.name}</Typography><Chip size="small" label={item.status.replace('_', ' ')} color={item.status === 'cutover' ? 'success' : item.status === 'rolled_back' ? 'default' : 'warning'} /></Stack>
                  <Typography variant="caption" color="text.secondary">{item.sourceName} · {item.journeyIds.map(journeyName).join(', ')}</Typography>
                </Box>
                <Stack direction="row" gap={0.75} flexWrap="wrap">
                  {canEdit && item.status === 'draft' && <Button size="small" disabled={busy} onClick={() => void run(() => dataSyncApi.validateMigration(projectId, item.id), 'Validation refreshed.')}>Validate</Button>}
                  {canControl && item.status === 'draft' && <Button size="small" variant="contained" disabled={busy} onClick={() => open('drain', item)}>Start drain</Button>}
                  {canControl && item.status === 'draining' && !item.drainConfirmedAt && <Button size="small" variant="contained" disabled={busy} onClick={() => void run(() => dataSyncApi.confirmMigrationDrain(projectId, item.id), 'PixlPush sends have drained.')}>Confirm drained</Button>}
                  {canControl && step === 2 && <Button size="small" variant="contained" onClick={() => open('hold', item)}>Confirm source stopped</Button>}
                  {canEdit && item.status === 'draining' && item.sourceHoldAt && <Button size="small" variant={step === 3 ? 'contained' : 'outlined'} onClick={() => open('compare', item)}>Compare counts</Button>}
                  {canControl && step === 4 && !requested && <Button size="small" variant="contained" onClick={() => open('request', item)}>Request cutover</Button>}
                  {canControl && step === 4 && requested && <Button size="small" variant="contained" onClick={() => open('approve', item)}>Review and approve</Button>}
                  {canControl && item.status === 'cutover' && <Button size="small" color="error" onClick={() => open('rollback', item)}>Roll back</Button>}
                </Stack>
              </Stack>

              {item.status !== 'rolled_back' && <Stepper activeStep={step} alternativeLabel>{STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>}
              {report?.errors?.length ? <Alert severity="error">{report.errors.map((entry) => entry.message ?? entry.code).join(' ')}</Alert> : report?.warnings?.length && item.status === 'draft' ? <Alert severity="warning">{report.warnings.map((entry) => entry.message).join(' ')}</Alert> : null}
              {comparison?.matched === false && <Alert severity="error">Source counts do not match. Import the final changes, then compare again.</Alert>}
              {requested && item.status === 'draining' && <Alert severity="info">Cutover requested. {item.cutoverRequestedById === accountId ? 'Another owner or admin should approve it.' : 'Review and approve when ready.'}</Alert>}
              {item.status === 'cutover' && <Alert severity="success">PixlPush owns sending. Resume each journey from Journey Automations when you are ready.</Alert>}

              {canControl && staging && (
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button size="small" onClick={() => setParticipantsRun(participantsRun === item.id ? '' : item.id)}>Import participants</Button>
                  {canEdit && item.status === 'draft' && <Button size="small" onClick={() => { setEditing(editing === item.id ? '' : item.id); setStagedText(pretty(item.stagedDefinitions)); }}>Edit definitions</Button>}
                </Stack>
              )}
              {participantsRun === item.id && (
                <Stack gap={1}>
                  <TextField multiline minRows={4} label="Participants JSON" value={participantsText} onChange={(event) => setParticipantsText(event.target.value)} helperText="Each row: journeyId, externalUserId, and optional externalKey, resumeAtStepKey, enteredAt, nextRunAt, entryNumber, completedSteps (stepKey, status, sentAt, openedAt, clickedAt, sourceMessageId)." InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 'var(--fs-12)' } }} />
                  {importProblems.length > 0 && <Alert severity="error" onClose={() => setImportProblems([])}>{importProblems.map((problem) => <Typography key={problem} variant="body2">{problem}</Typography>)}</Alert>}
                  <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => void run(async () => {
                    setImportProblems([]);
                    const rows = JSON.parse(participantsText) as Parameters<typeof dataSyncApi.importMigrationParticipants>[2];
                    if (!Array.isArray(rows)) throw new Error('Participants must be a JSON array.');
                    let staged = 0; let messages = 0; let unknown = 0; let duplicates = 0; let rejectedCount = 0;
                    const problems: string[] = [];
                    for (let offset = 0; offset < rows.length; offset += 500) {
                      const result = await dataSyncApi.importMigrationParticipants(projectId, item.id, rows.slice(offset, offset + 500));
                      staged += result.staged; messages += result.messages; unknown += result.unknownUsers; duplicates += result.duplicates; rejectedCount += result.rejectedCount;
                      for (const problem of result.rejected) if (problems.length < 5) problems.push(`Row ${offset + problem.index + 1}: ${problem.message}`);
                    }
                    setImportProblems(rejectedCount ? [`${rejectedCount} rows need fixing.`, ...problems] : []);
                    setNotice(`${staged} staged · ${messages} sent messages recorded · ${unknown} unknown users · ${duplicates} duplicates`);
                  })}>Stage participants</Button>
                </Stack>
              )}
              {editing === item.id && (
                <Stack gap={1}>
                  <TextField multiline minRows={6} label="Staged definitions JSON" value={stagedText} onChange={(event) => setStagedText(event.target.value)} InputProps={{ sx: { fontFamily: 'var(--pp-mono)', fontSize: 'var(--fs-12)' } }} />
                  <Button size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => void run(async () => { await dataSyncApi.stageMigration(projectId, item.id, JSON.parse(stagedText)); setEditing(''); }, 'Staged definitions saved.')}>Save definitions</Button>
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}

      <Dialog open={Boolean(action)} onClose={() => !busy && setAction(undefined)} fullWidth maxWidth="sm">
        <DialogTitle>{action ? titles[action.kind] : ''}</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 0.5 }}>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            {action?.kind === 'drain' && <Typography variant="body2" color="text.secondary">These journeys will pause in PixlPush and queued journey messages will be canceled.</Typography>}
            {action?.kind === 'hold' && <>
              <Typography variant="body2" color="text.secondary">PixlPush cannot see inside your source system. Stop new entries and pending sends there first.</Typography>
              <TextField label="Last processed change" placeholder="e.g. change ID or timestamp" value={watermark} onChange={(event) => setWatermark(event.target.value)} inputProps={{ maxLength: 200 }} helperText="Recorded so the final data sync can be checked against it." />
              <FormControlLabel control={<Checkbox checked={stopped} onChange={(event) => setStopped(event.target.checked)} />} label="The source can no longer send these journeys." />
            </>}
            {action?.kind === 'compare' && <>
              <FormControlLabel control={<Checkbox checked={migrated} onChange={(event) => setMigrated(event.target.checked)} />} label="Current participants are moving to PixlPush" />
              {Object.entries(counts).map(([id, value]) => (
                <Stack key={id} gap={1}>
                  <Typography variant="body2" fontWeight={600}>{journeyName(id)}</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: migrated ? '1fr 1fr' : '1fr' }, gap: 1 }}>
                    <TextField size="small" label="Source steps" value={value.steps} onChange={(event) => setCounts((all) => ({ ...all, [id]: { ...value, steps: event.target.value } }))} />
                    {migrated && <TextField size="small" label="Active participants" value={value.active} onChange={(event) => setCounts((all) => ({ ...all, [id]: { ...value, active: event.target.value } }))} />}
                  </Box>
                  {migrated && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 1 }}><TextField size="small" label="Participants per step (optional)" placeholder="welcome=10, wait=3" value={value.stepCounts} onChange={(event) => setCounts((all) => ({ ...all, [id]: { ...value, stepCounts: event.target.value } }))} /><TextField size="small" label="Sent messages (optional)" value={value.sentMessages} onChange={(event) => setCounts((all) => ({ ...all, [id]: { ...value, sentMessages: event.target.value } }))} /></Box>}
                </Stack>
              ))}
            </>}
            {action?.kind === 'request' && <>
              <TextField select label="When a scheduled step is overdue" value={policy} onChange={(event) => setPolicy(event.target.value as SyncOverduePolicy)}>
                {Object.entries(OVERDUE).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
              </TextField>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <TextField label="Too old after (hours)" value={maxHours} onChange={(event) => setMaxHours(event.target.value)} disabled={policy === 'catch_up'} />
                <TextField label="Spread late sends over (minutes)" value={catchUp} onChange={(event) => setCatchUp(event.target.value)} />
              </Box>
            </>}
            {action?.kind === 'approve' && <>
              <Typography variant="body2" color="text.secondary">PixlPush will own sending for these journeys. They stay paused until someone resumes them. Late steps: {OVERDUE[(action.run.overduePolicy ?? 'catch_up') as SyncOverduePolicy]}.</Typography>
              {ownRequest && <FormControlLabel control={<Checkbox checked={selfApproved} onChange={(event) => setSelfApproved(event.target.checked)} />} label="I am the only owner or admin and approve my own request." />}
            </>}
            {action?.kind === 'rollback' && <Typography variant="body2" color="text.secondary">PixlPush will stop sending and cancel queued messages. The original definitions are restored, and the source system owns these journeys again.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setAction(undefined)}>Cancel</Button>
          <Button variant="contained" color={action?.kind === 'rollback' ? 'error' : 'primary'} disabled={!canSubmit} onClick={() => void submit()}>{busy ? 'Saving…' : action?.kind === 'approve' ? 'Approve cutover' : action?.kind === 'rollback' ? 'Roll back' : 'Continue'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
