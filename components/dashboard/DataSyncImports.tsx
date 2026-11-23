'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CloseRounded, HistoryRounded, InsertDriveFileRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Skeleton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import EmptyState, { listEmpty } from '@/components/dashboard/EmptyState';
import FileDropZone from '@/components/dashboard/FileDropZone';
import { IMPORT_FIELDS, IMPORT_FILE_MAX_BYTES, formatFileSize, parseImport, type ParsedImport } from '@/lib/data-sync-import';
import { dataSyncApi, type SyncImportJob, type SyncImportKind, type SyncSource } from '@/lib/projects/api';

const errorText = (error: unknown) => (error as { message?: string })?.message ?? 'Something went wrong. Please try again.';
const KIND_LABEL: Record<SyncImportKind, string> = { event_history: 'Event history', message_history: 'Message history' };
const STATUS: Record<SyncImportJob['status'], { label: string; color: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  queued: { label: 'Waiting for upload', color: 'default' },
  running: { label: 'Importing', color: 'info' },
  paused: { label: 'Paused', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  canceled: { label: 'Canceled', color: 'default' },
};
const isOpen = (job: SyncImportJob) => job.status === 'queued' || job.status === 'running' || job.status === 'paused';

export default function DataSyncImports({ projectId, sources, source, onSelectSource, canControl }: {
  projectId: string;
  sources: SyncSource[];
  source?: SyncSource;
  onSelectSource: (id: string) => void;
  canControl: boolean;
}) {
  const client = useQueryClient();
  const queryKey = ['projects', projectId, 'data-sync', 'imports'];
  const [kind, setKind] = useState<SyncImportKind>('event_history');
  const [file, setFile] = useState<File>();
  const [parsed, setParsed] = useState<ParsedImport>();
  const [fileError, setFileError] = useState('');
  const [reading, setReading] = useState(false);
  const [resumeJob, setResumeJob] = useState<SyncImportJob>();
  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toCancel, setToCancel] = useState<SyncImportJob>();
  const [acting, setActing] = useState('');
  const readId = useRef(0);

  const jobsQuery = useQuery({
    queryKey,
    queryFn: () => dataSyncApi.imports(projectId),
    refetchInterval: (query) => (query.state.data?.some(isOpen) ? 5000 : false),
  });
  const jobs = jobsQuery.data ?? [];
  const uploading = Boolean(progress);
  const fields = IMPORT_FIELDS[kind];

  const clearFile = () => {
    readId.current += 1;
    setFile(undefined);
    setParsed(undefined);
    setFileError('');
    setReading(false);
  };

  const readFile = async (next: File | undefined, forKind: SyncImportKind) => {
    const id = ++readId.current;
    setFile(next);
    setParsed(undefined);
    setFileError('');
    setError('');
    setNotice('');
    if (!next) return;
    if (!next.name.toLowerCase().endsWith('.json') && next.type !== 'application/json') return setFileError('Choose a .json file.');
    if (next.size > IMPORT_FILE_MAX_BYTES) return setFileError(`This file is ${formatFileSize(next.size)}. The limit is ${formatFileSize(IMPORT_FILE_MAX_BYTES)}.`);
    setReading(true);
    try {
      const result = parseImport(forKind, await next.text());
      if (id === readId.current) setParsed(result);
    } catch (cause) {
      if (id === readId.current) setFileError(errorText(cause));
    } finally {
      if (id === readId.current) setReading(false);
    }
  };

  const changeKind = (next: SyncImportKind) => {
    setKind(next);
    setResumeJob(undefined);
    if (file) void readFile(file, next);
  };

  const changeSource = (id: string) => {
    onSelectSource(id);
    setResumeJob(undefined);
  };

  const startImport = async () => {
    if (!source || !parsed?.parts.length || parsed.invalidRows || uploading) return;
    if (resumeJob && resumeJob.partsTotal !== parsed.parts.length) {
      setError(`This job expects ${resumeJob.partsTotal} parts, but this file has ${parsed.parts.length}. Choose the original file.`);
      return;
    }
    setError('');
    setNotice('');
    setProgress({ done: 0, total: parsed.parts.length });
    try {
      // Kept as the resume target, so a failed upload continues instead of starting over.
      const job = resumeJob ?? await dataSyncApi.createImport(projectId, source.id, { kind, partsTotal: parsed.parts.length });
      setResumeJob(job);
      const existing = await dataSyncApi.importJob(projectId, job.id);
      const uploaded = new Set((existing.parts ?? []).map((part) => part.partIndex));
      let done = uploaded.size;
      setProgress({ done, total: parsed.parts.length });
      for (const [partIndex, records] of parsed.parts.entries()) {
        if (uploaded.has(partIndex)) continue;
        await dataSyncApi.uploadImportPart(projectId, job.id, { partIndex, idempotencyKey: `${job.id}:${partIndex}`, records });
        done += 1;
        setProgress({ done, total: parsed.parts.length });
      }
      await dataSyncApi.startImport(projectId, job.id);
      setResumeJob(undefined);
      clearFile();
      setNotice(`${parsed.rows.toLocaleString()} records queued for import.`);
    } catch (cause) {
      setError(`${errorText(cause)} Your progress is saved. Start the import again to continue.`);
    } finally {
      setProgress(undefined);
      await client.invalidateQueries({ queryKey });
    }
  };

  const act = async (job: SyncImportJob, action: 'pause' | 'resume' | 'cancel') => {
    setActing(job.id);
    setError('');
    try {
      if (action === 'pause') await dataSyncApi.pauseImport(projectId, job.id);
      else if (action === 'resume') await dataSyncApi.resumeImport(projectId, job.id);
      else await dataSyncApi.cancelImport(projectId, job.id);
      if (action === 'cancel' && resumeJob?.id === job.id) setResumeJob(undefined);
      await client.invalidateQueries({ queryKey });
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setActing('');
      setToCancel(undefined);
    }
  };

  const continueUpload = (job: SyncImportJob) => {
    onSelectSource(job.sourceId);
    setKind(job.kind);
    setResumeJob(job);
    clearFile();
    setNotice('');
  };

  const canStart = Boolean(source && parsed?.parts.length && !parsed.invalidRows && !reading);

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="h4">Historical imports</Typography>
        <Typography variant="body2" color="text.secondary">Upload past events or messages. They are stored separately and never start journeys or send messages.</Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice('')}>{notice}</Alert>}

      {!source ? <Alert severity="info">Create a sync source before importing history.</Alert> : !canControl ? <Alert severity="info">Only owners and admins can start historical imports.</Alert> : (
        <Card className="saas-card">
          <Stack gap={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField select size="small" label="Sync source" value={source.id} disabled={uploading} onChange={(event) => changeSource(event.target.value)}>
                {sources.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.environment}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="History type" value={kind} disabled={uploading} onChange={(event) => changeKind(event.target.value as SyncImportKind)}>
                <MenuItem value="event_history">Event history</MenuItem>
                <MenuItem value="message_history">Message history</MenuItem>
              </TextField>
            </Box>

            {resumeJob && !uploading && (
              <Alert severity="info" action={<Button size="small" onClick={() => setResumeJob(undefined)}>Start new</Button>}>
                Choose the original file to continue this upload.
              </Alert>
            )}

            {!file ? (
              <FileDropZone
                accept=".json,application/json"
                label="Drag and drop your JSON file here"
                hint={`A JSON array of records, up to ${formatFileSize(IMPORT_FILE_MAX_BYTES)}`}
                inputLabel="Choose a JSON history file"
                onFile={(next) => void readFile(next, kind)}
              />
            ) : (
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 1 }}>
                <InsertDriveFileRounded color="primary" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap>{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}{parsed ? ` · ${parsed.rows.toLocaleString()} records${parsed.parts.length ? ` · ${parsed.parts.length} ${parsed.parts.length === 1 ? 'part' : 'parts'}` : ''}` : ''}
                  </Typography>
                </Box>
                {!uploading && <Tooltip title="Remove file"><IconButton size="small" aria-label="Remove file" onClick={clearFile}><CloseRounded fontSize="small" /></IconButton></Tooltip>}
              </Stack>
            )}

            {reading && <Stack gap={0.5}><Typography variant="caption" color="text.secondary">Checking file…</Typography><LinearProgress /></Stack>}
            {fileError && <Alert severity="error">{fileError}</Alert>}
            {parsed && parsed.invalidRows > 0 && (
              <Alert severity="error">
                <Typography variant="body2">{parsed.invalidRows.toLocaleString()} of {parsed.rows.toLocaleString()} records need fixing before this file can be imported.</Typography>
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
                  {parsed.issues.map((issue) => <Typography component="li" variant="caption" key={issue.row}>Record {issue.row.toLocaleString()} {issue.message}</Typography>)}
                </Box>
              </Alert>
            )}
            {parsed && parsed.invalidRows === 0 && !uploading && <Alert severity="success">All {parsed.rows.toLocaleString()} records are ready to import.</Alert>}
            {progress && (
              <Stack gap={0.5}>
                <Typography variant="caption" color="text.secondary">Uploaded {progress.done} of {progress.total} {progress.total === 1 ? 'part' : 'parts'}</Typography>
                <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
              </Stack>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5}>
              <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" color="text.secondary">Required</Typography>
                {fields.required.map((field) => <Chip key={field} size="small" label={field} />)}
                <Typography variant="caption" color="text.secondary">Optional</Typography>
                {fields.optional.map((field) => <Chip key={field} size="small" variant="outlined" label={field} />)}
              </Stack>
              <Button variant="contained" disabled={!canStart || uploading} onClick={() => void startImport()} sx={{ flexShrink: 0 }}>
                {uploading ? 'Uploading…' : resumeJob ? 'Continue import' : 'Start import'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      )}

      <Card className="saas-card">
        <Stack gap={1}>
          <Typography variant="subtitle1">Import jobs</Typography>
          {jobsQuery.isLoading ? [0, 1].map((item) => <Skeleton key={item} height={48} />) : jobs.length === 0 ? (
            <EmptyState size="compact" {...listEmpty({
              icon: <HistoryRounded />,
              noun: 'import jobs',
              description: 'Jobs appear here after you upload a history file.',
              error: jobsQuery.isError ? errorText(jobsQuery.error) : null,
              onRetry: () => void jobsQuery.refetch(),
            })} />
          ) : jobs.map((job) => {
            const uploaded = job.partsUploaded ?? job.partsCompleted;
            const needsUpload = job.status === 'queued' && uploaded < job.partsTotal;
            const percent = job.partsTotal ? ((needsUpload ? uploaded : job.partsCompleted) / job.partsTotal) * 100 : 0;
            return (
              <Stack key={job.id} direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }} sx={{ py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                    <Typography variant="body2">{KIND_LABEL[job.kind]}</Typography>
                    <Chip size="small" color={STATUS[job.status].color} label={STATUS[job.status].label} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {sources.find((item) => item.id === job.sourceId)?.name ?? 'Source'} · {new Date(job.createdAt).toLocaleString()} · {job.accepted.toLocaleString()} imported · {job.rejected.toLocaleString()} rejected
                  </Typography>
                  {job.lastError && <Typography variant="caption" color="error" sx={{ display: 'block' }}>{job.lastError}</Typography>}
                  {isOpen(job) && <LinearProgress variant="determinate" value={percent} aria-label={`${KIND_LABEL[job.kind]} progress`} sx={{ mt: 0.75, maxWidth: 420 }} />}
                </Box>
                {canControl && (
                  <Stack direction="row" gap={0.5} flexShrink={0}>
                    {needsUpload && <Button size="small" onClick={() => continueUpload(job)}>Continue upload</Button>}
                    {job.status === 'running' && <Button size="small" disabled={acting === job.id} onClick={() => void act(job, 'pause')}>Pause</Button>}
                    {(job.status === 'paused' || job.status === 'failed') && <Button size="small" disabled={acting === job.id} onClick={() => void act(job, 'resume')}>Resume</Button>}
                    {(isOpen(job) || job.status === 'failed') && <Button size="small" color="error" disabled={acting === job.id} onClick={() => setToCancel(job)}>Cancel</Button>}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
      </Card>

      <Dialog open={Boolean(toCancel)} onClose={() => !acting && setToCancel(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel this import?</DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">Records already imported stay in history. Remaining parts will not be processed.</Typography></DialogContent>
        <DialogActions>
          <Button disabled={Boolean(acting)} onClick={() => setToCancel(undefined)}>Keep importing</Button>
          <Button color="error" variant="contained" disabled={Boolean(acting)} onClick={() => toCancel && void act(toCancel, 'cancel')}>Cancel import</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
