"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AddRounded,
  CheckRounded,
  ContentCopyRounded,
  DeleteOutlineRounded,
  KeyRounded,
  SearchRounded,
  VisibilityOffRounded,
  VisibilityRounded,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { dataSyncApi, type SyncKey } from "@/lib/projects/api";
import { formatUserDateTime } from "@/lib/timezone";

const mono = { fontFamily: "var(--pp-mono)", fontSize: "var(--fs-12)", overflowWrap: "anywhere" } as const;
const date = (value: string) => formatUserDateTime(value);

function CopyButton({ label, value, onFeedback }: { label: string; value: string; onFeedback: (copied: boolean, label: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      onFeedback(true, label);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      onFeedback(false, label);
    }
  };

  return (
    <Tooltip title={copied ? "Copied" : `Copy ${label.toLowerCase()}`}>
      <IconButton size="small" aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`} onClick={() => void copy()}>
        {copied ? <CheckRounded fontSize="small" color="success" /> : <ContentCopyRounded fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

function CopyField({ label, value, onFeedback }: { label: string; value: string; onFeedback: (copied: boolean, label: string) => void }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 0.5, minWidth: 0 }}>
      <Typography component="code" sx={{ ...mono, flex: 1, minWidth: 0 }} aria-label={label}>
        {value}
      </Typography>
      <CopyButton label={label} value={value} onFeedback={onFeedback} />
    </Stack>
  );
}

function KeyRow({ keyItem, value, revealed, copied, loading, onReveal, onCopy, onRevoke, disabled }: {
  keyItem: SyncKey;
  value?: string;
  revealed: boolean;
  copied: boolean;
  loading: boolean;
  onReveal: (key: SyncKey) => void;
  onCopy: (key: SyncKey) => void;
  onRevoke: (key: SyncKey) => void;
  disabled: boolean;
}) {
  const canReveal = keyItem.revealable !== false;
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ md: "center" }}
      gap={{ xs: 1, md: 2 }}
      sx={{ px: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}
    >
      <Box sx={{ minWidth: 0, flex: "1 1 180px" }}>
        <Typography fontWeight={600} fontSize="var(--fs-13)" noWrap>{keyItem.name}</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-12)">Created {date(keyItem.createdAt)}</Typography>
      </Box>
      <Stack gap={0.5} sx={{ minWidth: 0, flex: "1 1 280px" }}>
        <Stack direction="row" alignItems="center" gap={0.5} flexWrap={revealed ? "wrap" : "nowrap"} sx={{ minWidth: 0 }}>
          <Box sx={{ ...mono, minWidth: 0, flex: revealed ? "1 1 100%" : "0 1 auto", maxWidth: "100%", px: 1.5, py: 0.65, border: "1px solid", borderColor: "divider", borderRadius: revealed ? 1.5 : 999, bgcolor: "background.paper", overflow: revealed ? "visible" : "hidden", textOverflow: revealed ? "clip" : "ellipsis", whiteSpace: revealed ? "normal" : "nowrap", overflowWrap: revealed ? "anywhere" : "normal", userSelect: revealed ? "all" : "none" }} aria-label={revealed && value ? "Push key" : "Hidden push key"}>
            {revealed && value ? value : `${keyItem.keyPrefix}${"•".repeat(16)}`}
          </Box>
          <Tooltip title={!canReveal ? "This older key cannot be recovered. Reveal and copy are available for keys created after secure storage was added." : revealed ? "Hide key" : "Reveal key"}>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                aria-label={revealed ? "Hide push key" : "Reveal push key"}
                disabled={disabled || loading || !canReveal}
                onClick={() => onReveal(keyItem)}
                startIcon={loading ? <CircularProgress size={14} /> : revealed ? <VisibilityOffRounded /> : <VisibilityRounded />}
                sx={{ borderRadius: 999, borderColor: "divider", flexShrink: 0, minWidth: 92 }}
              >
                {revealed ? "Hide" : "Reveal"}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={!canReveal ? "This older key cannot be recovered." : copied ? "Copied" : "Copy key"}>
            <span>
              <IconButton size="small" aria-label={copied ? "Push key copied" : "Copy push key"} disabled={disabled || loading || !canReveal} onClick={() => onCopy(keyItem)}>
                {copied ? <CheckRounded fontSize="small" color="success" /> : <ContentCopyRounded fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {!canReveal && <Typography variant="caption" color="text.secondary">This older key has no recoverable secret. New keys support Reveal, Hide, and Copy.</Typography>}
      </Stack>
      <Stack direction="row" gap={0.75} flexWrap="wrap" alignItems="center" sx={{ flex: "1 1 190px" }}>
        <Chip size="small" label={keyItem.lastUsedAt ? `Last used ${date(keyItem.lastUsedAt)}` : "Not used yet"} />
        {keyItem.scopes.map((scope) => <Chip key={scope} size="small" variant="outlined" label={scope} />)}
        {keyItem.expiresAt && <Chip size="small" variant="outlined" label={`Expires ${date(keyItem.expiresAt)}`} />}
      </Stack>
      <Button size="small" color="error" disabled={disabled} onClick={() => onRevoke(keyItem)} sx={{ alignSelf: { xs: "flex-end", md: "center" }, flexShrink: 0 }}>
        Revoke
      </Button>
    </Stack>
  );
}

/**
 * Optional real-time delivery: the customer's server pushes live events (purchases, subscription
 * changes) to PixlPush the moment they happen. The 2-minute pull keeps running for history and to
 * catch anything a push missed; an event that arrives both ways is applied once.
 */
export default function WebhookPush({ projectId, sourceId, pushUrl, canEdit }: { projectId: string; sourceId: string; pushUrl: string; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const keysKey = ["projects", projectId, "data-sync", sourceId, "push-keys"];
  const keys = useQuery({ queryKey: keysKey, queryFn: () => dataSyncApi.keys(projectId, sourceId) });
  const [newKey, setNewKey] = useState<{ name: string; value: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [search, setSearch] = useState("");
  const [revokeTarget, setRevokeTarget] = useState<SyncKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SyncKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [copyToast, setCopyToast] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();

  const handleCopyFeedback = (copied: boolean, label: string) => {
    setCopyFailed(!copied);
    setCopyToast(copied ? `${label} copied to clipboard` : `Could not copy ${label.toLowerCase()}`);
  };

  const allKeys = keys.data ?? [];
  const active = allKeys.filter((key) => !key.revokedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const revoked = allKeys.filter((key) => Boolean(key.revokedAt)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filteredActive = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return active;
    return active.filter((key) => `${key.name} ${key.keyPrefix} ${key.scopes.join(" ")}`.toLocaleLowerCase().includes(needle));
  }, [active, search]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: keysKey });
      return true;
    } catch (e) {
      setError((e as { message?: string }).message ?? "Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const fetchKey = async (key: SyncKey) => {
    if (keyValues[key.id]) return keyValues[key.id]!;
    setLoadingId(key.id);
    try {
      const { key: value } = await dataSyncApi.revealKey(projectId, sourceId, key.id);
      setKeyValues((current) => ({ ...current, [key.id]: value }));
      return value;
    } finally {
      setLoadingId(undefined);
    }
  };

  const toggleReveal = async (key: SyncKey) => {
    setError("");
    if (revealed[key.id]) {
      setRevealed((current) => ({ ...current, [key.id]: false }));
      setKeyValues(({ [key.id]: _hidden, ...rest }) => rest);
      return;
    }
    try {
      await fetchKey(key);
      setRevealed((current) => ({ ...current, [key.id]: true }));
    } catch (e) {
      setError((e as { message?: string }).message ?? "Could not reveal this key. Try again.");
    }
  };

  const copyKey = async (key: SyncKey) => {
    try {
      await navigator.clipboard.writeText(await fetchKey(key));
      setCopiedId(key.id);
      handleCopyFeedback(true, `${key.name} key`);
      window.setTimeout(() => setCopiedId((current) => (current === key.id ? undefined : current)), 1800);
    } catch (e) {
      if (e instanceof Error && e.message) setError(e.message);
      handleCopyFeedback(false, `${key.name} key`);
    }
  };

  const createKey = async () => {
    const name = keyName.trim();
    if (!name) {
      setFormError("Enter a name so you can identify where this key is used.");
      return;
    }
    if (name.length > 80) {
      setFormError("Key names must be 80 characters or fewer.");
      return;
    }
    setFormError("");
    await run(async () => {
      const created = await dataSyncApi.createKey(projectId, sourceId, name);
      setKeyValues((current) => ({ ...current, [created.id]: created.key }));
      setNewKey({ name: created.name || name, value: created.key });
      setCreateOpen(false);
      setKeyName("");
    });
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const target = revokeTarget;
    if (await run(() => dataSyncApi.revokeKey(projectId, sourceId, target.id))) {
      setRevokeTarget(null);
      setKeyValues(({ [target.id]: _revoked, ...rest }) => rest);
      setRevealed(({ [target.id]: _hidden, ...rest }) => rest);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    if (await run(() => dataSyncApi.deleteKey(projectId, sourceId, target.id))) setDeleteTarget(null);
  };

  const example = `curl -X POST ${pushUrl} \\
  -H "Authorization: Bearer <push key>" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"pur_123","event_name":"purchase","user_id":"42","time":"${new Date().toISOString().slice(0, 19)}Z","product_id":"coins_500","billing_period":"one_time"}'`;

  return (
    <Stack gap={1.5}>
      <Box>
        <Typography variant="body2" fontWeight={600}>Real-time events (optional)</Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          Your server can also send each event to PixlPush the moment it happens, so purchases and subscription
          changes reach users and journeys in seconds. The 2-minute pull keeps running for history and catches
          anything that was missed. An event that arrives both ways is applied once.
        </Typography>
      </Box>
      <Stack gap={0.5}>
        <Typography variant="caption" color="text.secondary">Push URL (POST)</Typography>
        <CopyField label="Push URL" value={pushUrl} onFeedback={handleCopyFeedback} />
      </Stack>

      {newKey && (
        <Alert severity="success" onClose={() => setNewKey(null)}>
          <Stack gap={1}>
            <Typography variant="body2" fontWeight={600}>{newKey.name} was created. Copy it now, or reveal and copy it from the active key list later.</Typography>
            <CopyField label="Push key" value={newKey.value} onFeedback={handleCopyFeedback} />
          </Stack>
        </Alert>
      )}
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <Stack gap={0.75}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Push keys · send as <code>Authorization: Bearer &lt;push key&gt;</code>
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Create a separate key for each server or environment. Reveals are restricted and recorded in Audit Logs.
            </Typography>
          </Box>
          <Button size="small" variant="outlined" startIcon={<AddRounded />} disabled={!canEdit || busy} onClick={() => { setFormError(""); setCreateOpen(true); }}>
            Create push key
          </Button>
        </Stack>

        {keys.isLoading && <Typography variant="caption" color="text.secondary">Loading keys…</Typography>}
        {keys.isError && <Alert severity="error">{keys.error.message}</Alert>}
        {keys.isSuccess && allKeys.length === 0 && (
          <Card variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <KeyRounded color="action" />
            <Typography fontWeight={600}>No push keys yet</Typography>
            <Typography variant="caption" color="text.secondary">Create a named key for the server that sends your live events.</Typography>
          </Card>
        )}

        {active.length > 0 && <>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1}>
            <Typography variant="caption" color="text.secondary">Active keys · {active.length}</Typography>
            <TextField
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search keys"
              aria-label="Search push keys"
              sx={{ width: { xs: "100%", sm: 240 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }}
            />
          </Stack>
          <Card variant="outlined" sx={{ overflow: "hidden" }}>
            {filteredActive.length ? filteredActive.map((key) => <KeyRow key={key.id} keyItem={key} value={keyValues[key.id]} revealed={Boolean(revealed[key.id])} copied={copiedId === key.id} loading={loadingId === key.id} onReveal={(keyItem) => void toggleReveal(keyItem)} onCopy={(keyItem) => void copyKey(keyItem)} onRevoke={setRevokeTarget} disabled={!canEdit || busy} />) : (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1.5 }}>No active keys match “{search}”.</Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, py: 1, bgcolor: "action.hover" }}>
              Keep these server-only keys in a secret manager. To rotate, create a replacement, update your server, then revoke the old key.
            </Typography>
          </Card>
        </>}

        {revoked.length > 0 && (
          <Accordion disableGutters sx={{ "&::before": { display: "none" }, border: "1px solid", borderColor: "divider", borderRadius: "12px !important" }}>
            <AccordionSummary expandIcon={<span aria-hidden="true">▾</span>}>
              <Typography fontWeight={600} fontSize="var(--fs-13)">Revoked keys ({revoked.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {revoked.map((key) => (
                <Stack key={key.id} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1} sx={{ px: 2, py: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={600} fontSize="var(--fs-13)" noWrap>{key.name}</Typography>
                    <Typography sx={mono} color="text.secondary">{key.keyPrefix}…</Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                      Revoked {key.revokedAt ? date(key.revokedAt) : ""}{key.lastUsedAt ? ` · Last used ${date(key.lastUsedAt)}` : " · Never used"}
                    </Typography>
                    <Tooltip title="Delete permanently">
                      <span>
                        <IconButton size="small" color="error" aria-label={`Delete ${key.name}`} disabled={!canEdit || busy} onClick={() => setDeleteTarget(key)}>
                          <DeleteOutlineRounded fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Stack>
                </Stack>
              ))}
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>

      <Stack gap={0.5}>
        <Typography variant="caption" color="text.secondary">Example: one purchase, sent as it happens. Use the same event id as in your feed.</Typography>
        <Stack direction="row" alignItems="flex-start" gap={1} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "action.hover", minWidth: 0 }}>
          <Box component="pre" sx={{ ...mono, m: 0, flex: 1, minWidth: 0, overflowX: "auto", whiteSpace: "pre" }}>{example}</Box>
          <CopyButton label="Example snippet" value={example} onFeedback={handleCopyFeedback} />
        </Stack>
      </Stack>

      <Snackbar open={Boolean(copyToast)} autoHideDuration={2200} onClose={() => setCopyToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={copyFailed ? "error" : "success"} variant="filled" onClose={() => setCopyToast("")} sx={{ width: "100%" }}>{copyToast}</Alert>
      </Snackbar>

      <Dialog open={createOpen} onClose={() => !busy && setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create push key</DialogTitle>
        <DialogContent>
          <Stack gap={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">Give this key a name that identifies its server or environment. Authorized project managers can reveal or copy it from the active key list later.</Typography>
            <TextField
              autoFocus
              required
              fullWidth
              label="Key name"
              placeholder="e.g. production billing"
              value={keyName}
              onChange={(event) => { setKeyName(event.target.value); setFormError(""); }}
              inputProps={{ maxLength: 80 }}
              error={Boolean(formError)}
              helperText={formError || `${keyName.length}/80`}
              onKeyDown={(event) => { if (event.key === "Enter" && !busy) void createKey(); }}
            />
            <Typography variant="caption" color="text.secondary">Permission: records:write</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={() => void createKey()} disabled={!canEdit || busy}>
            {busy ? "Creating…" : "Create key"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onClose={() => !busy && setRevokeTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Revoke {revokeTarget?.name}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">Requests using this key will stop working. If you’re rotating, make sure the replacement is configured first.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeTarget(null)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmRevoke()} disabled={busy}>{busy ? "Revoking…" : "Revoke key"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !busy && setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete {deleteTarget?.name} permanently?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This removes the revoked key from the list permanently. It cannot be restored. Deleting it does not affect active keys.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void confirmDelete()} disabled={busy}>
            {busy ? "Deleting…" : "Delete permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
