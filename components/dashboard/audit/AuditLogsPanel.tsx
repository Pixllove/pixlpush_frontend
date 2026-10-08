'use client';

import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDownwardRounded, ChevronRightRounded, CloseRounded } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import SearchOffRounded from '@mui/icons-material/SearchOffRounded';
import EmptyState from '../EmptyState';
import { auditApi } from '@/lib/projects/api';
import type { ApiError } from '@/types/auth';
import type { AuditCategory, AuditLogEntry, AuditLogQuery } from '@/types/project';
import SearchField from '../SearchField';

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  team: 'Team & access',
  project: 'Project',
  settings: 'Settings',
  integration: 'Integrations',
  workspace: 'Workspace',
  auth: 'Sign-in & security',
};

const CATEGORY_COLOR: Record<AuditCategory, { color: string; bg: string }> = {
  team: { color: '#5a2bd6', bg: '#f0ebfd' },
  project: { color: '#1d5fd1', bg: '#e8f0fd' },
  settings: { color: '#8a5a00', bg: '#fdf3e1' },
  integration: { color: '#0b7a75', bg: '#e3f6f4' },
  workspace: { color: '#15965e', bg: '#e8f8ef' },
  auth: { color: '#6b6577', bg: '#f0eef3' },
};

const border = '1px solid #e7e5ec';
const headCell = { fontSize: 11, fontWeight: 500, letterSpacing: 0.6, textTransform: 'uppercase', color: '#6b6577', py: 1.2, bgcolor: '#fafafb' } as const;

const errorText = (e: unknown) =>
  (e as ApiError)?.code === 'NETWORK_ERROR' ? 'Cannot reach the server. Check your connection.' : 'Audit logs could not be loaded. Please try again.';

export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

/** "Just now", "12 min ago", "3 h ago", then the date. */
export function relative(iso: string, now = Date.now()) {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const actorName = (e: AuditLogEntry) => (e.actor ? e.actor.name ?? e.actor.email : 'System');

function CategoryChip({ category }: { category: AuditCategory }) {
  const c = CATEGORY_COLOR[category] ?? CATEGORY_COLOR.auth;
  return <Chip size="small" label={CATEGORY_LABEL[category] ?? category} sx={{ color: c.color, bgcolor: c.bg, fontWeight: 500, fontSize: 11, height: 22 }} />;
}

/** Event code as a small badge, e.g. "resource_deleted". */
export function EventBadge({ action }: { action: string }) {
  return (
    <Chip
      size="small"
      label={action.toLowerCase()}
      sx={{ height: 20, fontSize: 11, fontFamily: 'var(--pp-mono)', color: '#4a4556', bgcolor: '#f0eef3', borderRadius: 1 }}
    />
  );
}

/** Who did what, where and when, across the projects you manage. */

export default function AuditLogsPanel() {
  const [search, setSearch] = useState('');
  // What the server was last asked for: set once the user pauses typing.
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState<AuditCategory | 'all'>('all');
  const [filters, setFilters] = useState<AuditLogQuery>({});
  const [dates, setDates] = useState({ from: '', to: '' });
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const options = useQuery({ queryKey: ['audit-logs', 'filters'], queryFn: auditApi.filters });

  const query: AuditLogQuery = {
    ...filters,
    ...(category !== 'all' ? { category } : {}),
    ...(term ? { q: term } : {}),
    // Date inputs are whole days: "to" includes the chosen day.
    ...(dates.from ? { from: new Date(`${dates.from}T00:00:00`).toISOString() } : {}),
    ...(dates.to ? { to: new Date(`${dates.to}T23:59:59.999`).toISOString() } : {}),
  };
  const feed = useInfiniteQuery({
    queryKey: ['audit-logs', query],
    queryFn: ({ pageParam }) => auditApi.list({ ...query, limit: 25, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = Boolean(filters.projectId || filters.actorAccountId || search.trim() || dates.from || dates.to || category !== 'all');

  const clear = () => {
    setSearch('');
    setTerm('');
    setCategory('all');
    setFilters({});
    setDates({ from: '', to: '' });
  };

  return (
    <Stack gap={2}>
      <Tabs value={category} onChange={(_, v) => setCategory(v)} aria-label="Activity type" sx={{ mb: 0 }}>
        <Tab value="all" label="All" />
        {(Object.keys(CATEGORY_LABEL) as AuditCategory[]).map((c) => <Tab key={c} value={c} label={CATEGORY_LABEL[c]} />)}
      </Tabs>
      <Box sx={{ p: 1.5, border: '1px solid #ece9f2', borderRadius: '8px', bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} gap={1.5} alignItems={{ lg: 'center' }}>
          <SearchField value={search} onChange={setSearch} onSearch={setTerm} placeholder="Search activity, user or project" aria-label="Search" sx={{ flex: 1, minWidth: 240 }} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr)) auto' }, gap: 1.2, alignItems: 'center' }}>
          <TextField size="small" select label="Project" value={filters.projectId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value || undefined }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
            <MenuItem value="">All projects</MenuItem>
            {options.data?.projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="User" value={filters.actorAccountId ?? ''} onChange={(e) => setFilters((f) => ({ ...f, actorAccountId: e.target.value || undefined }))} SelectProps={{ displayEmpty: true }} InputLabelProps={{ shrink: true }}>
            <MenuItem value="">All users</MenuItem>
            {options.data?.actors.map((a) => <MenuItem key={a.id} value={a.id}>{a.name ?? a.email}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="From" value={dates.from} onChange={(e) => setDates((d) => ({ ...d, from: e.target.value }))} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={dates.to} onChange={(e) => setDates((d) => ({ ...d, to: e.target.value }))} InputLabelProps={{ shrink: true }} />
          {filtered ? <Button size="small" onClick={clear} sx={{ height: 40, textTransform: 'none' }}>Clear filters</Button> : <span />}
        </Box>
      </Box>

      {feed.isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => feed.refetch()}>Retry</Button>}>{errorText(feed.error)}</Alert>
      )}

      <Box sx={{ border, borderRadius: '8px', bgcolor: '#fff', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={headCell}>
                <Stack direction="row" alignItems="center" gap={0.5}>Date & time <ArrowDownwardRounded sx={{ fontSize: 14 }} /></Stack>
              </TableCell>
              <TableCell sx={headCell}>User</TableCell>
              <TableCell sx={headCell}>Activity</TableCell>
              <TableCell sx={headCell}>Category</TableCell>
              <TableCell sx={headCell}>Project</TableCell>
              <TableCell sx={headCell} align="right">Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feed.isPending &&
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={i} aria-label={i === 0 ? 'Loading audit logs' : undefined} role={i === 0 ? 'status' : undefined} sx={{ height: 58 }}>
                  {[0, 1, 2, 3, 4, 5].map((c) => <TableCell key={c}><Skeleton height={22} /></TableCell>)}
                </TableRow>
              ))}
            {feed.isSuccess && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ height: 290, borderBottom: 0 }}>
                  <EmptyState
                    size="compact"
                    icon={filtered ? <SearchOffRounded /> : <HistoryRounded />}
                    title="No activity found"
                    description={filtered ? 'No activity matches these filters. Clear them above to see everything.' : 'Changes made in projects you own or administer, and your own sign-ins, appear here.'}
                  />
                </TableCell>
              </TableRow>
            )}
            {items.map((entry) => (
              <TableRow
                key={entry.id}
                hover
                data-testid="audit-row"
                onClick={() => setSelected(entry)}
                sx={{ cursor: 'pointer', '& td': { fontSize: 13, py: 1.3, borderColor: '#efeef3' } }}
              >
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title={fullDate(entry.createdAt)}><span>{relative(entry.createdAt)}</span></Tooltip>
                </TableCell>
                <TableCell>
                  <Typography fontSize={13} fontWeight={600}>{actorName(entry)}</Typography>
                  {entry.actor?.name && <Typography fontSize={11} color="text.secondary">{entry.actor.email}</Typography>}
                </TableCell>
                <TableCell sx={{ maxWidth: 420 }}>{entry.description}</TableCell>
                <TableCell><CategoryChip category={entry.category} /></TableCell>
                <TableCell>{entry.project?.name ?? <Typography component="span" fontSize={13} color="text.secondary">Account</Typography>}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label={`View details: ${entry.description}`} sx={{ border, borderRadius: '8px' }}>
                    <ChevronRightRounded fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography color="text.secondary" fontSize={12}>{items.length ? `Showing ${items.length} ${items.length === 1 ? 'entry' : 'entries'}` : ''}</Typography>
        {feed.hasNextPage && (
          <Button variant="outlined" size="small" onClick={() => feed.fetchNextPage()} disabled={feed.isFetchingNextPage}>
            {feed.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </Stack>

      <DetailsDrawer entry={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}

const pretty = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const label = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <Stack direction="row" gap={2} sx={{ py: 1, borderBottom: '1px solid #f1f0f4' }}>
      <Typography fontSize={12} color="text.secondary" sx={{ width: 110, flexShrink: 0 }}>{k}</Typography>
      <Box sx={{ fontSize: 13, minWidth: 0, wordBreak: 'break-word' }}>{v}</Box>
    </Stack>
  );
}

/** Readable details: who/what/where, before → after, changed fields. */
function DetailsDrawer({ entry, onClose }: { entry: AuditLogEntry | null; onClose: () => void }) {
  const meta = (entry?.metadata ?? {}) as Record<string, unknown>;
  const before = (meta.before ?? {}) as Record<string, unknown>;
  const after = (meta.after ?? {}) as Record<string, unknown>;
  const changeKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changedFields = Array.isArray(meta.changedFields) ? (meta.changedFields as string[]) : [];
  const extra = Object.entries(meta).filter(([k]) => !['before', 'after', 'changedFields', 'method', 'route'].includes(k));

  return (
    <Drawer anchor="right" open={Boolean(entry)} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
      {entry && (
        <Stack sx={{ p: 3 }} gap={2} role="dialog" aria-label="Activity details">
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box>
              <Typography fontSize={11} fontWeight={500} letterSpacing={1} color="text.secondary">ACTIVITY DETAILS</Typography>
              <Typography fontSize={16} fontWeight={600} sx={{ mt: 0.5 }}>{entry.description}</Typography>
            </Box>
            <IconButton aria-label="Close details" onClick={onClose}><CloseRounded /></IconButton>
          </Stack>
          <Box>
            <DetailRow k="When" v={<>{fullDate(entry.createdAt)} <Typography component="span" fontSize={12} color="text.secondary">· {relative(entry.createdAt)}</Typography></>} />
            <DetailRow k="User" v={<>{actorName(entry)}{entry.actor?.name && <Typography fontSize={12} color="text.secondary">{entry.actor.email}</Typography>}</>} />
            <DetailRow k="Project" v={entry.project?.name ?? 'Account-level'} />
            <DetailRow k="Category" v={<CategoryChip category={entry.category} />} />
            <DetailRow k="Event" v={<EventBadge action={entry.action} />} />
            {entry.ipAddress && <DetailRow k="IP address" v={entry.ipAddress} />}
          </Box>

          {changeKeys.length > 0 && (
            <Box>
              <Typography fontWeight={600} fontSize={13} sx={{ mb: 1 }}>Changes</Typography>
              <Box sx={{ border, borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headCell}>Field</TableCell>
                      <TableCell sx={headCell}>Before</TableCell>
                      <TableCell sx={headCell}>After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {changeKeys.map((k) => (
                      <TableRow key={k} sx={{ '& td': { fontSize: 12 } }}>
                        <TableCell>{label(k)}</TableCell>
                        <TableCell sx={{ color: '#b3261e' }}>{pretty(before[k])}</TableCell>
                        <TableCell sx={{ color: '#15965e' }}>{pretty(after[k])}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {changedFields.length > 0 && (
            <Box>
              <Typography fontWeight={600} fontSize={13} sx={{ mb: 1 }}>Fields changed</Typography>
              <Stack direction="row" gap={0.8} flexWrap="wrap">
                {changedFields.map((f) => <Chip key={f} size="small" variant="outlined" label={label(f)} />)}
              </Stack>
              <Typography fontSize={11} color="text.secondary" sx={{ mt: 1 }}>Values are not stored for these changes, so secrets never reach the log.</Typography>
            </Box>
          )}

          {extra.length > 0 && (
            <Box>
              <Typography fontWeight={600} fontSize={13} sx={{ mb: 0.5 }}>More information</Typography>
              {extra.map(([k, v]) => <DetailRow key={k} k={label(k)} v={pretty(v)} />)}
            </Box>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
