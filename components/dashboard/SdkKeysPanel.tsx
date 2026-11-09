'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AddRounded,
  AutorenewRounded,
  CheckRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  ExpandMoreRounded,
  KeyRounded,
  MoreVertRounded,
  VisibilityOffRounded,
  VisibilityRounded,
} from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EmptyState from './EmptyState';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useSdkKeys } from '@/hooks/projects/use-project-settings';
import { sdkKeyApi } from '@/lib/projects/api';
import SettingsStatus from './SettingsStatus';
import IdentityVerificationCard from './IdentityVerificationCard';
import SidePanel from './SidePanel';
import type { ApiError } from '@/types/auth';
import type { CreatedSdkKey, SdkKey } from '@/types/project';

const KEY_ROLES = ['owner', 'admin', 'developer'];
const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const masked = (key: SdkKey) => `${key.keyPrefix}${'•'.repeat(16)}`;
const message = (cause: unknown) => (cause as ApiError).message ?? 'Something went wrong.';

/** Name | API key | Last used | actions, collapsing to two columns on phones. */
const ROW_GRID = { xs: 'minmax(0,1fr) auto', md: 'minmax(150px,1fr) minmax(0,2fr) 130px 40px' };
const mono = { fontFamily: 'var(--pp-mono)', fontSize: 12.5 };
const roundIcon = { border: '1px solid', borderColor: 'divider', width: 30, height: 30 };

/**
 * Public SDK / ingestion keys of the active Project, laid out like Supabase's
 * API keys page: active keys can be revealed and copied any time (each reveal
 * is audited); revoking is immediate and permanent.
 */
export default function SdkKeysPanel() {
  const { active } = useActiveProject();
  const canManage = Boolean(active && KEY_ROLES.includes(active.role));
  // The backend refuses the whole list to other roles, so do not ask.
  const { query, create, revoke, remove } = useSdkKeys(canManage ? active?.id : undefined);

  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<string>();
  /** Keys fetched in this session, by id. */
  const [values, setValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; key: SdkKey }>();
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<CreatedSdkKey>();
  const [revoking, setRevoking] = useState<SdkKey>();
  const [deleting, setDeleting] = useState<SdkKey>();

  const keys = query.data ?? [];
  const activeKeys = keys.filter((key) => key.status === 'active');
  const revokedKeys = keys.filter((key) => key.status === 'revoked');
  const remember = (id: string, value: string) => setValues((current) => ({ ...current, [id]: value }));

  const fetchKey = async (key: SdkKey) => {
    if (values[key.id]) return values[key.id]!;
    setLoadingId(key.id);
    try {
      const { key: value } = await sdkKeyApi.reveal(active!.id, key.id);
      remember(key.id, value);
      return value;
    } finally {
      setLoadingId(undefined);
    }
  };

  const copy = async (id: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    setToast('Key copied to clipboard');
    window.setTimeout(() => setCopiedId((current) => (current === id ? undefined : current)), 2000);
  };

  /** Reveal asks the backend for this key of this project (audited); Hide forgets it again. */
  const toggleReveal = async (key: SdkKey) => {
    setError(undefined);
    if (revealed[key.id]) {
      setRevealed((current) => ({ ...current, [key.id]: false }));
      setValues(({ [key.id]: _hidden, ...rest }) => rest);
      return;
    }
    try {
      await fetchKey(key);
      setRevealed((current) => ({ ...current, [key.id]: true }));
    } catch (cause) { setError(message(cause)); }
  };

  const copyKey = async (key: SdkKey) => {
    setError(undefined);
    try { await copy(key.id, await fetchKey(key)); } catch (cause) { setError(message(cause)); }
  };

  /** Like rolling a key elsewhere: a new revealable key; the old one stays active until revoked. */
  const replaceKey = async (key: SdkKey) => {
    setError(undefined);
    try {
      const created = await create.mutateAsync(`${key.name} (replacement)`.slice(0, 80));
      remember(created.id, created.key);
      setFresh(created);
    } catch (cause) { setError(message(cause)); }
  };

  const fromMenu = (run: (key: SdkKey) => void) => () => {
    const key = menu!.key;
    setMenu(undefined);
    run(key);
  };

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={1.5}>
        <Box>
          <Typography variant="h3">SDK keys</Typography>
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ maxWidth: 640 }}>
            Public keys your app uses to send events and register devices. They are safe to ship inside your app. Use one key per app or environment, so you can revoke one without touching the others.
          </Typography>
        </Box>
        {canManage && (
          <Button variant="outlined" startIcon={<AddRounded />} onClick={() => setCreating(true)} sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            New SDK key
          </Button>
        )}
      </Stack>

      {!canManage && active && <Alert severity="info">Only owners, admins and developers can view and manage SDK keys.</Alert>}
      {query.isError && <Alert severity="error">{query.error.message}</Alert>}
      {error && <Alert severity="error" onClose={() => setError(undefined)}>{error}</Alert>}

      {canManage && (
        <Card className="saas-card" sx={{ p: '0 !important', overflow: 'hidden' }}>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: ROW_GRID.md, gap: 2, px: 2.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            {['Name', 'API key', 'Last used', ''].map((label) => (
              <Typography key={label} color="text.secondary" sx={{ ...mono, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</Typography>
            ))}
          </Box>

          {query.isLoading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={22} /></Stack>}
          {query.isSuccess && activeKeys.length === 0 && (
            <EmptyState size="compact" icon={<KeyRounded />} title="No active SDK keys" description="Your apps cannot send events until you create a key." />
          )}

          {activeKeys.map((key) => {
            const shown = Boolean(revealed[key.id] && values[key.id]);
            const busy = loadingId === key.id;
            return (
              <Box
                key={key.id}
                sx={{ display: 'grid', gridTemplateColumns: ROW_GRID, gap: { xs: 1, md: 2 }, alignItems: 'center', px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={600} fontSize="var(--fs-13)" noWrap>{key.name}</Typography>
                  <Typography color="text.secondary" fontSize="var(--fs-12)">Created {date(key.createdAt)}</Typography>
                </Box>

                <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 2, md: 'auto' } }}>
                  <Box
                    sx={{ ...mono, minWidth: 0, flex: '0 1 auto', px: 1.5, py: 0.6, border: '1px solid', borderColor: 'divider', borderRadius: 999, bgcolor: 'background.paper', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: shown ? 'all' : 'none' }}
                    aria-label={shown ? 'SDK key' : 'Hidden SDK key'}
                  >
                    {shown ? values[key.id] : masked(key)}
                  </Box>
                  {!key.revealable ? (
                    <Tooltip title="This older key was saved in a way that can't be shown again. Create a replacement, put it in your app, then revoke this one.">
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AutorenewRounded />}
                          disabled={create.isPending}
                          onClick={() => replaceKey(key)}
                          sx={{ borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }}
                        >
                          Replace key
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (<>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => toggleReveal(key)}
                    disabled={busy}
                    startIcon={busy ? <CircularProgress size={14} /> : shown ? <VisibilityOffRounded /> : <VisibilityRounded />}
                    sx={{ borderRadius: 999, borderColor: 'divider', flexShrink: 0, minWidth: 92 }}
                  >
                    {shown ? 'Hide' : 'Reveal'}
                  </Button>
                  <Tooltip title={copiedId === key.id ? 'Copied' : 'Copy key'}>
                    <span>
                      <IconButton size="small" sx={roundIcon} onClick={() => copyKey(key)} disabled={busy} aria-label="Copy key">
                        {copiedId === key.id ? <CheckRounded sx={{ fontSize: 16 }} color="success" /> : <ContentCopyRounded sx={{ fontSize: 16 }} />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  </>)}
                </Stack>

                <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ display: { xs: 'none', md: 'block' } }}>
                  {key.lastUsedAt ? date(key.lastUsedAt) : 'Never'}
                </Typography>

                <IconButton size="small" aria-label={`Actions for ${key.name}`} onClick={(event) => setMenu({ anchor: event.currentTarget, key })} sx={{ justifySelf: 'end', gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}>
                  <MoreVertRounded fontSize="small" />
                </IconButton>
              </Box>
            );
          })}

          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ px: 2.5, py: 1.25, bgcolor: 'action.hover' }}>
            SDK keys can be shipped publicly. Every time a key is revealed it is recorded in <Link href="/dashboard/audit-logs">Audit Logs</Link>.
          </Typography>
        </Card>
      )}

      {revokedKeys.length > 0 && (
        <Accordion disableGutters className="saas-card" sx={{ '&::before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Typography fontWeight={600}>Revoked keys ({revokedKeys.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ mb: 1 }}>These keys are rejected. Requests that still use them fail with “Invalid SDK key”.</Typography>
            {revokedKeys.map((key) => (
              <Stack key={key.id} direction="row" alignItems="center" gap={1} sx={{ py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontSize="var(--fs-13)" fontWeight={600} noWrap>{key.name}</Typography>
                  <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ fontFamily: 'var(--pp-mono)' }}>
                    {key.keyPrefix}… · revoked {key.revokedAt ? date(key.revokedAt) : ''}{key.lastUsedAt ? ` · last used ${date(key.lastUsedAt)}` : ''}
                  </Typography>
                </Box>
                <SettingsStatus tone="neutral">Revoked</SettingsStatus>
                <Tooltip title="Delete permanently">
                  <IconButton size="small" onClick={() => setDeleting(key)} aria-label={`Delete ${key.name}`}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Tooltip>
              </Stack>
            ))}
          </AccordionDetails>
        </Accordion>
      )}

      {canManage && active && <IdentityVerificationCard projectId={active.id} role={active.role} />}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(undefined)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {menu?.key.revealable !== false && <MenuItem onClick={fromMenu(copyKey)}><ListItemIcon><ContentCopyRounded fontSize="small" /></ListItemIcon>Copy key</MenuItem>}
        {menu?.key.revealable === false ? (
          <MenuItem onClick={fromMenu(replaceKey)}><ListItemIcon><AutorenewRounded fontSize="small" /></ListItemIcon>Replace key</MenuItem>
        ) : (
          <MenuItem onClick={fromMenu(toggleReveal)}>
            <ListItemIcon>{menu && revealed[menu.key.id] ? <VisibilityOffRounded fontSize="small" /> : <VisibilityRounded fontSize="small" />}</ListItemIcon>
            {menu && revealed[menu.key.id] ? 'Hide key' : 'Reveal key'}
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={fromMenu(setRevoking)} sx={{ color: 'error.main' }}><ListItemIcon sx={{ color: 'inherit' }}><DeleteOutlineRounded fontSize="small" /></ListItemIcon>Revoke key</MenuItem>
      </Menu>

      <CreateKeyPanel
        open={creating || Boolean(fresh)}
        fresh={fresh}
        pending={create.isPending}
        slug={active?.slug}
        copied={Boolean(fresh && copiedId === fresh.id)}
        onCopy={() => fresh && copy(fresh.id, fresh.key)}
        onClose={() => { setCreating(false); setFresh(undefined); }}
        onCreate={async (name) => {
          const created = await create.mutateAsync(name);
          remember(created.id, created.key);
          setCreating(false);
          setFresh(created);
        }}
      />

      <RevokeDialog
        sdkKey={revoking}
        isLast={activeKeys.length === 1}
        pending={revoke.isPending}
        onClose={() => setRevoking(undefined)}
        onConfirm={async (key) => {
          await revoke.mutateAsync(key.id);
          setValues(({ [key.id]: _gone, ...rest }) => rest);
          setRevoking(undefined);
          setToast(`"${key.name}" revoked`);
        }}
      />

      <Dialog open={Boolean(deleting)} onClose={() => !remove.isPending && setDeleting(undefined)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete revoked key?</DialogTitle>
        <DialogContent>
          <Typography fontSize="var(--fs-13)">“{deleting?.name}” is removed from this list. It already does not work; audit log entries stay.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(undefined)} disabled={remove.isPending}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={async () => {
              try { await remove.mutateAsync(deleting!.id); } catch (cause) { setError(message(cause)); }
              setDeleting(undefined);
            }}
          >
            {remove.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(undefined)} message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Stack>
  );
}

/** New SDK key in the shared side panel: name it, then copy the key it shows. */
function CreateKeyPanel({ open, fresh, pending, slug, copied, onCopy, onClose, onCreate }: {
  open: boolean;
  fresh?: CreatedSdkKey;
  pending: boolean;
  slug?: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const close = () => { if (pending) return; setName(''); setError(undefined); onClose(); };
  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!name.trim() || pending) return;
    setError(undefined);
    try { await onCreate(name.trim()); setName(''); } catch (cause) { setError(message(cause)); }
  };

  if (fresh) {
    return (
      <SidePanel open={open} onClose={close} eyebrow="SDK key created" title={fresh.name} footer={<Button variant="contained" onClick={close}>Done</Button>}>
        <Typography fontSize="var(--fs-13)" color="text.secondary">
          Add this key to your app. You can reveal and copy it again from the SDK keys page any time. If it replaces an older key, revoke the old one once your updated app is released.
        </Typography>
        <Box className="key-field" sx={{ mt: '0 !important' }}>
          <KeyRounded />
          <Typography sx={{ wordBreak: 'break-all' }}>{fresh.key}</Typography>
          <Button size="small" startIcon={copied ? <CheckRounded /> : <ContentCopyRounded />} onClick={onCopy}>{copied ? 'Copied' : 'Copy'}</Button>
        </Box>
        <Box>
          <Typography fontSize="var(--fs-12)" color="text.secondary">Project ID for the SDK</Typography>
          <Typography fontSize="var(--fs-13)" fontWeight={600} sx={mono}>{slug}</Typography>
        </Box>
      </SidePanel>
    );
  }

  return (
    <SidePanel
      open={open}
      onClose={close}
      eyebrow="New SDK key"
      title="Create an SDK key"
      footer={<>
        <Button onClick={close} disabled={pending}>Cancel</Button>
        <Button variant="contained" startIcon={<KeyRounded />} disabled={!name.trim() || pending} onClick={() => submit()}>{pending ? 'Creating…' : 'Create key'}</Button>
      </>}
    >
      <Typography fontSize="var(--fs-13)" color="text.secondary">
        Use one key per app or environment (for example Production iOS, Staging web), so you can revoke one without touching the others.
      </Typography>
      <Box component="form" onSubmit={submit}>
        <TextField label="Key name" placeholder="Production iOS" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} autoFocus fullWidth helperText="Only you and your team see this name." />
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
    </SidePanel>
  );
}

/** Revoking is permanent. The last active key needs its name typed, because every app stops. */
function RevokeDialog({ sdkKey, isLast, pending, onClose, onConfirm }: {
  sdkKey?: SdkKey;
  isLast: boolean;
  pending: boolean;
  onClose: () => void;
  onConfirm: (key: SdkKey) => Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string>();
  const close = () => { if (pending) return; setTyped(''); setError(undefined); onClose(); };
  const blocked = isLast && typed.trim() !== sdkKey?.name;

  return (
    <Dialog open={Boolean(sdkKey)} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Revoke “{sdkKey?.name}”?</DialogTitle>
      <DialogContent>
        <Stack gap={1.5}>
          <Typography fontSize="var(--fs-13)">
            App versions using this key stop sending events and registering devices immediately. This cannot be undone.
          </Typography>
          {sdkKey?.lastUsedAt && <Typography fontSize="var(--fs-12)" color="text.secondary">Last used {date(sdkKey.lastUsedAt)}.</Typography>}
          {isLast ? (
            <>
              <Alert severity="error">This is the only active key. After revoking it, none of your apps can reach PixlPush until you create a new key and release an update.</Alert>
              <Box>
                <Typography fontSize="var(--fs-13)" sx={{ mb: 0.75 }}>
                  Type <Box component="b" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>{sdkKey?.name}</Box> to confirm.
                </Typography>
                <TextField
                  fullWidth
                  label="Key name"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  error={typed.length > 0 && typed.trim() !== sdkKey?.name}
                  helperText={typed.length > 0 && typed.trim() !== sdkKey?.name ? 'The name does not match yet.' : ' '}
                  inputProps={{ autoComplete: 'off', spellCheck: false }}
                />
              </Box>
            </>
          ) : (
            <Alert severity="info">Make sure your released apps already use another active key.</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={pending}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          disabled={pending || blocked}
          onClick={async () => {
            setError(undefined);
            try { await onConfirm(sdkKey!); setTyped(''); } catch (cause) { setError(message(cause)); }
          }}
        >
          {pending ? 'Revoking…' : 'Revoke key'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
