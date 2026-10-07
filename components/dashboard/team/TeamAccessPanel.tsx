'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AddRounded } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Toast } from '@/components/auth/AuthFeedback';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { teamApi } from '@/lib/projects/api';
import type { ApiError } from '@/types/auth';
import type { ProjectInvitation, ProjectMember, ProjectRole } from '@/types/project';

export const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  developer: 'Developer',
  analyst: 'Analyst',
  read_only: 'Read-only',
  billing: 'Billing',
};
const ROLES = Object.keys(ROLE_LABEL) as ProjectRole[];
const MANAGE: ProjectRole[] = ['owner', 'admin'];

/** Backend codes → short, safe copy. */
const MESSAGES: Record<string, string> = {
  ALREADY_MEMBER: 'User already has access to this project.',
  INSUFFICIENT_ROLE: 'Your role does not allow this change.',
  LAST_OWNER: 'A project must always have at least one owner.',
  CANNOT_CHANGE_OWN_ACCESS: 'You cannot change or remove your own access. Ask another owner or admin.',
  MEMBER_NOT_FOUND: 'This member no longer has access. Refresh the list.',
  INVITATION_NOT_FOUND: 'This invitation no longer exists.',
  INVITATION_NOT_PENDING: 'Only pending or expired invitations can be changed.',
  VALIDATION_ERROR: 'Check the email address and role.',
  EMAIL_NOT_SENT: 'The invitation was renewed, but the email could not be sent.',
  NETWORK_ERROR: 'Cannot reach the server. Check your connection.',
};
export const teamError = (e: unknown) => MESSAGES[(e as ApiError)?.code] ?? 'Something went wrong. Please try again.';

const person = (a: { name: string | null; email: string } | null | undefined) => (a ? a.name ?? a.email : '—');
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

type Confirm = { kind: 'remove'; member: ProjectMember } | { kind: 'revoke'; invitation: ProjectInvitation } | null;

/** Members and invitations of the active Project; managers can change them. */
export default function TeamAccessPanel() {
  const { active } = useActiveProject();
  const projectId = active?.id;
  const myRole = active?.role;
  const canManage = Boolean(myRole && MANAGE.includes(myRole));
  const isOwner = myRole === 'owner';
  const me = useCurrentUser().account?.id;
  const queryClient = useQueryClient();

  const members = useQuery({ queryKey: ['projects', 'team', projectId, 'members'], queryFn: () => teamApi.members(projectId!), enabled: Boolean(projectId) });
  const invitations = useQuery({
    queryKey: ['projects', 'team', projectId, 'invitations'],
    queryFn: () => teamApi.invitations(projectId!),
    enabled: Boolean(projectId) && canManage,
  });
  const reload = () => queryClient.invalidateQueries({ queryKey: ['projects', 'team', projectId] });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);

  const act = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      setToast({ message: success, severity: 'success' });
    } catch (e) {
      setToast({ message: teamError(e), severity: 'error' });
    } finally {
      setBusy(null);
      setConfirm(null);
      reload();
    }
  };

  /** Owners may touch anyone; admins may not touch owners or grant ownership. */
  /// Nobody edits their own row: another owner/admin changes or removes them.
  const canEdit = (m: ProjectMember) => canManage && Boolean(me) && m.account.id !== me && (isOwner || m.role !== 'owner');
  const pending = (invitations.data ?? []).filter((i) => i.status === 'pending' || i.status === 'expired');

  // Shaped like the page it stands in for, so nothing jumps when the Project arrives.
  if (!projectId) return <Stack gap={2.5}><Skeleton variant="rounded" height={40} /><Skeleton variant="rounded" height={150} /></Stack>;

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ minHeight: 40 }}>
        <Typography color="text.secondary" fontSize={13}>
          Access is granted per project. Members only see the projects they were added to.
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => setInviteOpen(true)} sx={{ alignSelf: 'flex-start' }}>
            Invite member
          </Button>
        )}
      </Stack>

      <Card className="saas-card">
        <Typography variant="h3">Project members</Typography>
        {members.isError && (
          <Alert severity="error" sx={{ mt: 1 }} action={<Button color="inherit" size="small" onClick={() => members.refetch()}>Retry</Button>}>
            {teamError(members.error)}
          </Alert>
        )}
        {!members.isError && (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Invited by</TableCell>
                  <TableCell>Access since</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {members.isPending && [0].map((i) => (
                  <TableRow key={i} role="status" aria-label="Loading members" sx={{ height: 61 }}>
                    {[0, 1, 2, 3, 4, 5].map((c) => <TableCell key={c}><Skeleton variant="text" /></TableCell>)}
                  </TableRow>
                ))}
                {(members.data ?? []).map((m) => (
                  <TableRow key={m.id} data-testid={`member-${m.account.email}`}>
                    <TableCell>
                      <Typography fontWeight={500} fontSize={12}>
                        {m.account.name ?? m.account.email}
                        {m.account.id === me && <Chip size="small" label="You" sx={{ ml: 1, height: 18, fontSize: 11 }} />}
                      </Typography>
                      <Typography color="text.secondary" fontSize={11}>{m.account.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {canEdit(m) ? (
                        <Select
                          size="small"
                          value={m.role}
                          disabled={busy !== null}
                          inputProps={{ 'aria-label': `Role of ${m.account.email}` }}
                          onChange={(e) => {
                            const role = e.target.value as ProjectRole;
                            void act(`role-${m.id}`, () => teamApi.updateRole(projectId, m.id, role), `${person(m.account)} is now ${ROLE_LABEL[role]}.`);
                          }}
                        >
                          {ROLES.filter((r) => isOwner || r !== 'owner').map((r) => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
                        </Select>
                      ) : (
                        <Typography fontSize={12}>{ROLE_LABEL[m.role]}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={m.state === 'pending' ? 'Pending' : 'Activated'} className={m.state === 'pending' ? 'paused-chip' : 'active-chip'} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{person(m.invitedBy)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{m.joinedAt ? date(m.joinedAt) : '—'}</TableCell>
                    <TableCell align="right">
                      {canEdit(m) && (
                        <Button size="small" color="error" disabled={busy !== null} onClick={() => setConfirm({ kind: 'remove', member: m })}>
                          Remove access
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      {canManage && (
        <Card className="saas-card">
          <Typography variant="h3">Pending invitations</Typography>
          {invitations.isError && <Alert severity="error" sx={{ mt: 1 }}>{teamError(invitations.error)}</Alert>}
          {invitations.isPending && <Skeleton variant="text" width={360} sx={{ mt: 1, fontSize: 12, lineHeight: '19px' }} />}
          {invitations.data && pending.length === 0 && (
            <Typography color="text.secondary" fontSize={12} sx={{ mt: 1 }}>No pending invitations. Invitees join once they accept the emailed invitation.</Typography>
          )}
          {pending.length > 0 && (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Invited by</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pending.map((i) => (
                    <TableRow key={i.id} data-testid={`invitation-${i.email}`}>
                      <TableCell sx={{ fontSize: 12 }}>{i.email}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{ROLE_LABEL[i.role]}</TableCell>
                      <TableCell><Chip size="small" label={i.status === 'expired' ? 'Expired' : 'Pending'} className="paused-chip" /></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{person(i.invitedBy)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{date(i.expiresAt)}</TableCell>
                      <TableCell align="right">
                        {(isOwner || i.role !== 'owner') && (
                          <Stack direction="row" gap={0.5} justifyContent="flex-end">
                            <Button
                              size="small"
                              disabled={busy !== null}
                              onClick={() =>
                                act(`resend-${i.id}`, async () => {
                                  const r = await teamApi.resendInvitation(projectId, i.id);
                                  if (!r.emailSent) throw { code: 'EMAIL_NOT_SENT' };
                                }, `Invitation resent to ${i.email}.`)
                              }
                            >
                              Resend
                            </Button>
                            <Button size="small" color="error" disabled={busy !== null} onClick={() => setConfirm({ kind: 'revoke', invitation: i })}>Revoke</Button>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Card>
      )}

      <Card className="saas-card">
        <Typography variant="h3">Project roles</Typography>
        <Typography color="text.secondary" fontSize={12}>
          Owner and Admin manage members and settings. Developer and Analyst work in the Workspace. Read-only can view. Billing manages billing. Only owners can grant or remove ownership.
        </Typography>
      </Card>

      {inviteOpen && (
        <InviteDialog
          projectId={projectId}
          allowOwner={isOwner}
          onClose={() => setInviteOpen(false)}
          onDone={(message, severity) => {
            setInviteOpen(false);
            setToast({ message, severity });
            reload();
          }}
        />
      )}

      {confirm && (
        <Dialog open onClose={busy ? undefined : () => setConfirm(null)}>
          <DialogTitle>{confirm.kind === 'remove' ? `Remove ${person(confirm.member.account)}?` : `Revoke the invitation to ${confirm.invitation.email}?`}</DialogTitle>
          <DialogContent>
            <Typography>
              {confirm.kind === 'remove'
                ? `${person(confirm.member.account)} will immediately lose access to ${active?.name}. Their other projects are not affected.`
                : 'The invitation link stops working immediately.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirm(null)} disabled={busy !== null}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              disabled={busy !== null}
              onClick={() =>
                confirm.kind === 'remove'
                  ? act(`remove-${confirm.member.id}`, () => teamApi.removeMember(projectId, confirm.member.id), `${person(confirm.member.account)} no longer has access.`)
                  : act(`revoke-${confirm.invitation.id}`, () => teamApi.revokeInvitation(projectId, confirm.invitation.id), 'Invitation revoked.')
              }
            >
              {confirm.kind === 'remove' ? 'Remove access' : 'Revoke invitation'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Toast message={toast?.message ?? null} severity={toast?.severity} onClose={() => setToast(null)} />
    </Stack>
  );
}

function InviteDialog({
  projectId,
  allowOwner,
  onClose,
  onDone,
}: {
  projectId: string;
  allowOwner: boolean;
  onClose: () => void;
  onDone: (message: string, severity: 'success' | 'info') => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('developer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await teamApi.invite(projectId, { email: email.trim(), role });
      const who = result.type === 'member' ? (result.member.account.name ?? result.member.account.email) : result.email;
      const base = result.type === 'member' ? `${who} now has access to this project.` : `Invitation sent to ${who}.`;
      onDone(result.emailSent ? base : `${base} The notification email could not be sent.`, result.emailSent ? 'success' : 'info');
    } catch (e) {
      setError(teamError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit} noValidate>
        <DialogTitle>Invite member</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary" fontSize={13}>
              We email an invitation. Existing PixlPush users sign in to accept; new users create an account. Access starts once they accept.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required fullWidth />
            <Select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} inputProps={{ 'aria-label': 'Role' }}>
              {ROLES.filter((r) => allowOwner || r !== 'owner').map((r) => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send invite'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
