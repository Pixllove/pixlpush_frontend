'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddRounded } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Toast } from '@/components/auth/AuthFeedback';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { checkDns, completeProviderConnection, deleteSendingDomain, listSendingDomains } from '@/lib/sending-domains/api';
import { domainErrorMessage, errorCode } from '@/lib/sending-domains/errors';
import type { SendingDomain } from '@/types/sending-domain';
import AddDomainDialog from './AddDomainDialog';
import { consumeCallbackParams, takeConnection } from './connection';
import DnsSetupDialog from './DnsSetupDialog';
import DomainAnalysisDialog from './DomainAnalysisDialog';
import DomainStatusBadge from './DomainStatusBadge';

const MANAGE_ROLES = ['owner', 'admin'];
/** Statuses where the domain still needs a connection choice. */
const NEEDS_CONNECTION = ['not_configured', 'analyzing', 'provider_selection', 'connection_pending', 'connection_failed'];

type DialogState =
  | { kind: 'none' }
  | { kind: 'add' }
  | { kind: 'analyze'; domain: SendingDomain }
  | { kind: 'dns'; domainId: string }
  | { kind: 'delete'; domain: SendingDomain };

type ToastState = { message: string; severity: 'success' | 'error' | 'info' } | null;

/** Sending domains of the active Project (several per Project). */
export default function SendingDomainsPanel() {
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

  const reload = () => queryClient.invalidateQueries({ queryKey: ['projects', 'sending-domains', projectId] });

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
          ? { message: `${updated.domain} is authenticated.`, severity: 'success' }
          : { message: `${updated.domain}: DNS checked. Open the records for details.`, severity: 'info' },
      );
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

  if (!projectId) return <Skeleton height={40} />;

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
        <Box>
          <Typography variant="h3">Sending domains</Typography>
          <Typography color="text.secondary" fontSize={12}>Authenticate the domains you send email from. A domain can send once it is authenticated.</Typography>
        </Box>
        {canManage && (
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setDialog({ kind: 'add' })} sx={{ alignSelf: 'flex-start' }}>
            Add domain
          </Button>
        )}
      </Stack>

      {!canManage && <Alert severity="info">Only project owners and admins can add or change sending domains.</Alert>}

      {list.isPending && (
        <Card sx={{ p: 2 }} role="status" aria-label="Loading sending domains">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={40} />)}
        </Card>
      )}

      {list.isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => list.refetch()}>Retry</Button>}>
          {domainErrorMessage(list.error)}
        </Alert>
      )}

      {list.data && list.data.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography fontWeight={600}>No sending domains yet</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>Add the email address you want to send from to get started.</Typography>
          {canManage && <Button variant="outlined" onClick={() => setDialog({ kind: 'add' })}>Add domain</Button>}
        </Card>
      )}

      {list.data && list.data.length > 0 && (
        <Card sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Domain</TableCell>
                <TableCell>Sender email</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last check</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.data.map((domain) => (
                <TableRow key={domain.id} data-testid={`domain-row-${domain.domain}`}>
                  <TableCell><Typography fontWeight={600}>{domain.domain}</Typography></TableCell>
                  <TableCell>{domain.senderEmail ?? '—'}</TableCell>
                  <TableCell>{domain.providerName ?? (domain.connectionMethod === 'manual' && domain.dnsRecords.length ? 'Manual DNS' : '—')}</TableCell>
                  <TableCell><DomainStatusBadge status={domain.status} /></TableCell>
                  <TableCell>{domain.lastCheckedAt ? new Date(domain.lastCheckedAt).toLocaleString() : 'Never'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" gap={0.5} justifyContent="flex-end" flexWrap="wrap">
                      {rowBusy === domain.id && <CircularProgress size={18} sx={{ alignSelf: 'center' }} />}
                      {canManage && domain.dnsRecords.length > 0 && (
                        <Button size="small" onClick={() => checkStatus(domain)} disabled={rowBusy !== null}>Check status</Button>
                      )}
                      {canManage && domain.status !== 'verified' && (
                        <Button size="small" onClick={() => resolve(domain)} disabled={rowBusy !== null}>Resolve</Button>
                      )}
                      {domain.dnsRecords.length > 0 && (
                        <Button size="small" onClick={() => setDialog({ kind: 'dns', domainId: domain.id })}>View DNS records</Button>
                      )}
                      {canManage && (
                        <Button size="small" color="error" onClick={() => { setDeleteError(null); setDialog({ kind: 'delete', domain }); }} disabled={rowBusy !== null}>
                          Remove
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
        <DnsSetupDialog projectId={projectId} domainId={dialog.domainId} onClose={() => setDialog({ kind: 'none' })} onChanged={reload} />
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
