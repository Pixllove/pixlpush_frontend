'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddRounded, DeleteOutline } from '@mui/icons-material';
import {
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
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import DnsOutlined from '@mui/icons-material/DnsOutlined';
import EmptyState from '../EmptyState';
import { Toast } from '@/components/auth/AuthFeedback';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useEmailSettings } from '@/hooks/projects/use-project-settings';
import { projectKeys } from '@/lib/projects/api';
import { activateSendingDomain, checkDns, completeProviderConnection, deleteSendingDomain, listSendingDomains } from '@/lib/sending-domains/api';
import { domainErrorMessage, errorCode, isConnectionCode, messageForCode } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
import AddDomainDialog from './AddDomainDialog';
import { consumeCallbackParams, takeConnection } from './connection';
import DnsSetupDialog from './DnsSetupDialog';
import DomainAnalysisDialog from './DomainAnalysisDialog';
import DomainStatusBadge from './DomainStatusBadge';
import CustomDomainDialog from './CustomDomainDialog';

const MANAGE_ROLES = ['owner', 'admin'];
/** Statuses where the domain still needs a connection choice. */
const NEEDS_CONNECTION = ['not_configured', 'analyzing', 'provider_selection', 'connection_pending', 'connection_failed'];

type DialogState =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'analyze'; domain: SendingDomain }
  | { kind: 'dns'; domainId: string }
  | { kind: 'custom'; domain: SendingDomain }
  | { kind: 'delete'; domain: SendingDomain };

type ToastState = { message: string; severity: 'success' | 'error' | 'info' } | null;

/** Sending domains of the active Project (several per Project). */
export default function SendingDomainsPanel({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const canManage = Boolean(active && MANAGE_ROLES.includes(active.role));
  const queryClient = useQueryClient();
  const listKey = ['projects', 'sending-domains', projectId];
  const list = useQuery({ queryKey: listKey, queryFn: () => listSendingDomains(projectId!), enabled: Boolean(projectId) });

  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [toast, setToast] = useState<ToastState>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // The Project sends from one domain at a time: the one its sender address is on.
  const activeDomain = useEmailSettings(projectId).query.data?.sendingDomain ?? null;

  // The sender can change with any domain action (the first verified domain becomes it), so both reload.
  const reload = () => {
    if (projectId) void queryClient.invalidateQueries({ queryKey: projectKeys.setting(projectId, 'email') });
    return queryClient.invalidateQueries({ queryKey: ['projects', 'sending-domains', projectId] });
  };

  // Back from the provider: finish the connection once, for this Project only.
  const handledCallback = useRef(false);
  useEffect(() => {
    if (!projectId || handledCallback.current) return;
    const params = consumeCallbackParams();
    if (!params) return;
    handledCallback.current = true;
    const pending = takeConnection();
    if (!pending || pending.projectId !== projectId) {
      setToast({ message: domainErrorMessage({ code: 'PROVIDER_STATE_INVALID' }), severity: 'error' });
      return;
    }
    completeProviderConnection(projectId, pending.domainId, pending.provider, params)
      .then((domain) => {
        setToast({ message: `${domain.domain} is connected. We are checking the DNS records now.`, severity: 'success' });
        setDialog({ kind: 'dns', domainId: domain.id });
      })
      .catch((e) =>
        setToast({ message: domainErrorMessage(e), severity: errorCode(e) === 'PROVIDER_CONNECTION_CANCELLED' ? 'info' : 'error' }),
      )
      .finally(reload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const checkStatus = async (domain: SendingDomain) => {
    setRowBusy(domain.id);
    try {
      const updated = await checkDns(projectId!, domain.id);
      setToast(
        updated.status === 'verified'
          ? { message: `${updated.domain}: Domain authenticated and sending connection ready.`, severity: 'success' }
          : isConnectionCode(updated.lastError)
            ? { message: `${updated.domain}: ${messageForCode(updated.lastError)}`, severity: 'info' }
            : { message: `${updated.domain}: DNS checked. Open the records for details.`, severity: 'info' },
      );
    } catch (e) {
      setToast({ message: domainErrorMessage(e), severity: 'error' });
    } finally {
      setRowBusy(null);
      reload();
    }
  };

  const sendFrom = async (domain: SendingDomain) => {
    setRowBusy(domain.id);
    try {
      await activateSendingDomain(projectId!, domain.id);
      setToast({ message: `Email is now sent from ${domain.senderEmail ?? domain.domain}.`, severity: 'success' });
    } catch (e) {
      setToast({ message: domainErrorMessage(e), severity: 'error' });
    } finally {
      setRowBusy(null);
      reload();
    }
  };

  const resolve = (domain: SendingDomain) =>
    setDialog(NEEDS_CONNECTION.includes(domain.status) || !domain.dnsRecords.length ? { kind: 'analyze', domain } : { kind: 'dns', domainId: domain.id });

  const confirmDelete = async (domain: SendingDomain) => {
    setRowBusy(domain.id);
    setDeleteError(null);
    try {
      await deleteSendingDomain(projectId!, domain.id);
      setDialog({ kind: 'none' });
      setToast({ message: `${domain.domain} was removed.`, severity: 'success' });
    } catch (e) {
      setDeleteError(domainErrorMessage(e));
    } finally {
      setRowBusy(null);
      reload();
    }
  };

  // Shaped like the page it stands in for, so nothing jumps when the Project arrives.
  if (!projectId) return <Stack gap={2.5}><Skeleton variant="rounded" height={44} /><Skeleton variant="rounded" height={172} /></Stack>;

  return (
    <Stack gap={2.5}>
      {!canManage && <Alert severity="info">Only project owners and admins can add or change sending domains.</Alert>}

      {list.data?.some((d) => d.status === 'verification_failed' && isConnectionCode(d.lastError)) && (
        <Alert severity="warning" action={onNavigate && <Button color="inherit" size="small" onClick={() => onNavigate('Email sending')}>Finish setup</Button>}>
          Provider connection incomplete. Your DNS records are correct, but email cannot be sent until the sending connection is finished under Domain.
        </Alert>
      )}

      <Card className="saas-card" sx={{ p: 0, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h3">Sending domains</Typography>
            <Typography color="text.secondary" fontSize={12}>Manage your sending domains. Add a domain and authenticate it before sending.</Typography>
          </Box>
          {canManage && <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ kind: 'add' })} sx={{ alignSelf: 'flex-start' }}>Add domain</Button>}
        </Stack>

        {list.isPending && <Box sx={{ p: 2 }} role="status" aria-label="Loading sending domains">{[0, 1, 2].map((i) => <Skeleton key={i} height={40} />)}</Box>}

        {list.isError && <Box sx={{ p: 2 }}><Alert severity="error" action={<Button color="inherit" size="small" onClick={() => list.refetch()}>Retry</Button>}>{domainErrorMessage(list.error)}</Alert></Box>}

        {list.data && list.data.length === 0 && <Box sx={{ p: 2 }}><EmptyState size="compact" icon={<DnsOutlined />} title="No sending domains yet" description="Add the email address you want to send from to get started." action={canManage ? { label: 'Add domain', onClick: () => setDialog({ kind: 'add' }) } : undefined} /></Box>}

        {list.data && list.data.length > 0 && <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', minWidth: 980 }}>
            <TableHead><TableRow><TableCell sx={{ width: '24%', color: 'text.secondary', fontSize: 12 }}>Domain</TableCell><TableCell sx={{ width: '24%', color: 'text.secondary', fontSize: 12 }}>Status</TableCell><TableCell sx={{ width: '24%', color: 'text.secondary', fontSize: 12 }}>Action</TableCell><TableCell sx={{ width: '24%', color: 'text.secondary', fontSize: 12 }}>Domain alignment</TableCell><TableCell sx={{ width: 56 }} align="right" /></TableRow></TableHead>
            <TableBody>
              {list.data.map((domain) => <TableRow key={domain.id} data-testid={`domain-row-${domain.domain}`}>
                <TableCell sx={{ verticalAlign: 'middle' }}><Typography fontWeight={600} color="text.secondary" noWrap>{domain.domain}</Typography></TableCell>
                <TableCell sx={{ verticalAlign: 'middle' }}><Stack direction="row" gap={0.5} flexWrap="wrap"><DomainStatusBadge status={domain.status} lastError={domain.lastError} />{domain.status === 'verified' && domain.domain === activeDomain && <Chip size="small" variant="outlined" label="Sending from this domain" />}</Stack></TableCell>
                <TableCell sx={{ verticalAlign: 'middle' }}><Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">{rowBusy === domain.id && <CircularProgress size={18} />}{canManage && domain.dnsRecords.length > 0 && <Button variant="contained" disableElevation sx={{ px: 1.2, minWidth: 0, mr: 1, backgroundColor: 'action.hover', color: 'primary.main', '&:hover': { backgroundColor: 'action.selected' } }} size="small" onClick={() => checkStatus(domain)} disabled={rowBusy !== null}>Check status</Button>}{canManage && domain.status === 'verified' && domain.domain !== activeDomain && <Button variant="contained" disableElevation sx={{ px: 1.2, minWidth: 0, mr: 1, backgroundColor: 'action.hover', color: 'primary.main', '&:hover': { backgroundColor: 'action.selected' } }} size="small" onClick={() => sendFrom(domain)} disabled={rowBusy !== null}>Use for sending</Button>}{canManage && domain.status !== 'verified' && domain.dnsRecords.length === 0 && <Button variant="contained" disableElevation sx={{ px: 1.2, minWidth: 0, mr: 1, backgroundColor: 'action.hover', color: 'primary.main', '&:hover': { backgroundColor: 'action.selected' } }} size="small" onClick={() => resolve(domain)} disabled={rowBusy !== null}>Resolve</Button>}{domain.dnsRecords.length > 0 && <Button variant="contained" disableElevation sx={{ px: 1.2, minWidth: 0, mr: 1, backgroundColor: 'action.hover', color: 'primary.main', '&:hover': { backgroundColor: 'action.selected' } }} size="small" onClick={() => setDialog({ kind: 'dns', domainId: domain.id })}>View DNS records</Button>}</Stack></TableCell>
                <TableCell sx={{ verticalAlign: 'middle' }}><Button variant="contained" disableElevation size="small" disabled={!canManage} onClick={() => setDialog({ kind: 'custom', domain })} sx={{ whiteSpace: 'nowrap', px: 1.2, minWidth: 0, backgroundColor: 'action.hover', color: 'text.secondary', '&:hover': { backgroundColor: 'action.selected' } }}>Add custom domain</Button></TableCell>
                <TableCell align="right">{canManage && <IconButton aria-label="Remove" color="error" onClick={() => { setDeleteError(null); setDialog({ kind: 'delete', domain }); }} disabled={rowBusy !== null} size="small"><DeleteOutline fontSize="small" /></IconButton>}</TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </Box>}
      </Card>

      <AddDomainDialog
        open={dialog.kind === 'add'}
        projectId={projectId}
        onClose={() => setDialog({ kind: 'none' })}
        onCreated={(domain) => {
          reload();
          setDialog({ kind: 'analyze', domain });
        }}
      />

      {dialog.kind === 'analyze' && (
        <DomainAnalysisDialog
          projectId={projectId}
          domain={dialog.domain}
          onClose={() => setDialog({ kind: 'none' })}
          onChanged={reload}
          onManual={(domain) => setDialog({ kind: 'dns', domainId: domain.id })}
        />
      )}

      {dialog.kind === 'dns' && (
        <DnsSetupDialog
          projectId={projectId}
          domainId={dialog.domainId}
          onClose={() => setDialog({ kind: 'none' })}
          onChanged={reload}
          onRetryAutomatic={(domain) => setDialog({ kind: 'analyze', domain })}
        />
      )}

      {dialog.kind === 'custom' && (
        <CustomDomainDialog
          open
          domain={dialog.domain.domain}
          onClose={() => setDialog({ kind: 'none' })}
          onAdd={() => {
            setDialog({ kind: 'none' });
            setToast({ message: 'Custom domain alignment needs its provider API connection before it can be saved.', severity: 'info' });
          }}
        />
      )}

      {dialog.kind === 'delete' && (
        <Dialog open onClose={rowBusy ? undefined : () => setDialog({ kind: 'none' })}>
          <DialogTitle>Remove {dialog.domain.domain}?</DialogTitle>
          <DialogContent>
            {deleteError && <Alert severity="error" sx={{ mb: 1.5 }}>{deleteError}</Alert>}
            <Typography>Email can no longer be sent from this domain until you add and authenticate it again.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog({ kind: 'none' })} disabled={rowBusy !== null}>Cancel</Button>
            <Button color="error" variant="contained" onClick={() => confirmDelete(dialog.domain)} disabled={rowBusy !== null}>Remove domain</Button>
          </DialogActions>
        </Dialog>
      )}

      <Toast message={toast?.message ?? null} severity={toast?.severity} onClose={() => setToast(null)} />
    </Stack>
  );
}
