import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditLogsPanel from '@/components/dashboard/audit/AuditLogsPanel';
import TeamAccessPanel from '@/components/dashboard/team/TeamAccessPanel';
import { auditApi, teamApi } from '@/lib/projects/api';
import type { AuditLogEntry, ProjectMember } from '@/types/project';

vi.mock('@/lib/projects/api', () => ({
  teamApi: {
    members: vi.fn(),
    updateRole: vi.fn(),
    removeMember: vi.fn(),
    invitations: vi.fn(),
    invite: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
  },
  auditApi: { list: vi.fn(), filters: vi.fn(), project: vi.fn() },
}));

let role = 'owner';
vi.mock('@/hooks/projects/use-active-project', () => ({
  useActiveProject: () => ({ active: { id: 'e1', name: 'Project E1', role } }),
}));

vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ account: { id: 'a-emi@example.com' } }),
}));

const team = vi.mocked(teamApi);
const audit = vi.mocked(auditApi);

const member = (over: Partial<ProjectMember> & { email: string; name?: string }): ProjectMember => ({
  id: `m-${over.email}`,
  role: over.role ?? 'developer',
  joinedAt: '2026-09-29T10:00:00.000Z',
  state: 'activated',
  account: { id: `a-${over.email}`, email: over.email, name: over.name ?? null },
  invitedBy: over.invitedBy ?? null,
});

const members = [
  member({ email: 'emi@example.com', name: 'Emi', role: 'owner' }),
  member({ email: 'dimi@example.com', name: 'Dimi', role: 'read_only', invitedBy: { id: 'a-emi', email: 'emi@example.com', name: 'Emi' } }),
];

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);

beforeEach(() => {
  role = 'owner';
  vi.clearAllMocks();
  team.members.mockResolvedValue(members);
  team.invitations.mockResolvedValue([
    { id: 'i1', email: 'new@example.com', role: 'analyst', status: 'pending', expiresAt: '2026-10-06T10:00:00.000Z', createdAt: '2026-09-29T10:00:00.000Z', invitedBy: { id: 'a-emi', email: 'emi@example.com', name: 'Emi' } },
  ]);
});

describe('Team & Access', () => {
  it('shows real members and invitations, without a duplicate page title', async () => {
    wrap(<TeamAccessPanel />);
    const dimi = await screen.findByTestId('member-dimi@example.com');
    expect(within(dimi).getByText('Dimi')).toBeInTheDocument();
    expect(within(dimi).getByText('Emi')).toBeInTheDocument(); // invited by
    expect(within(dimi).getByText('Activated')).toBeInTheDocument();
    const invite = await screen.findByTestId('invitation-new@example.com');
    expect(within(invite).getByText('Analyst')).toBeInTheDocument();
    expect(screen.queryByText('Team & Access')).not.toBeInTheDocument();
    expect(screen.queryByText('Maya Chen')).not.toBeInTheDocument();
    expect(team.members).toHaveBeenCalledWith('e1');
  });

  it('never offers to change or remove your own access', async () => {
    wrap(<TeamAccessPanel />);
    const me = await screen.findByTestId('member-emi@example.com');
    expect(within(me).getByText('You')).toBeInTheDocument();
    expect(within(me).queryByLabelText('Role of emi@example.com')).not.toBeInTheDocument();
    expect(within(me).queryByRole('button', { name: 'Remove access' })).not.toBeInTheDocument();
    const dimi = screen.getByTestId('member-dimi@example.com');
    expect(within(dimi).getByRole('button', { name: 'Remove access' })).toBeInTheDocument();
  });

  it('invites an existing account and shows duplicate access clearly', async () => {
    team.invite.mockResolvedValueOnce({ type: 'member', emailSent: true, member: { id: 'm3', role: 'developer', account: { id: 'a3', email: 'x@example.com', name: 'Xavi' } } });
    wrap(<TeamAccessPanel />);
    await userEvent.click(await screen.findByRole('button', { name: 'Invite member' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Email/), 'x@example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send invite' }));
    expect(team.invite).toHaveBeenCalledWith('e1', { email: 'x@example.com', role: 'developer' });
    expect(await screen.findByText('Xavi now has access to this project.')).toBeInTheDocument();
    await waitFor(() => expect(team.members).toHaveBeenCalledTimes(2));

    team.invite.mockRejectedValueOnce({ status: 409, code: 'ALREADY_MEMBER', message: 'raw' });
    await userEvent.click(screen.getByRole('button', { name: 'Invite member' }));
    const again = screen.getByRole('dialog');
    await userEvent.type(within(again).getByLabelText(/Email/), 'dimi@example.com');
    await userEvent.click(within(again).getByRole('button', { name: 'Send invite' }));
    expect(await within(again).findByText('User already has access to this project.')).toBeInTheDocument();
  });

  it('changes a role, removes access after confirmation, resends and revokes', async () => {
    team.updateRole.mockResolvedValue({ id: 'm-dimi@example.com', role: 'admin', updatedAt: '' });
    team.removeMember.mockResolvedValue(null);
    team.resendInvitation.mockResolvedValue({ id: 'i1', email: 'new@example.com', role: 'analyst', status: 'pending', expiresAt: '', createdAt: '', emailSent: true });
    team.revokeInvitation.mockResolvedValue(null);
    wrap(<TeamAccessPanel />);

    fireEvent.mouseDown(await screen.findByLabelText('Role of dimi@example.com'));
    await userEvent.click(await screen.findByRole('option', { name: 'Admin' }));
    expect(team.updateRole).toHaveBeenCalledWith('e1', 'm-dimi@example.com', 'admin');
    expect(await screen.findByText('Dimi is now Admin.')).toBeInTheDocument();

    await userEvent.click(within(screen.getByTestId('member-dimi@example.com')).getByRole('button', { name: 'Remove access' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove access' }));
    expect(team.removeMember).toHaveBeenCalledWith('e1', 'm-dimi@example.com');

    await userEvent.click(within(await screen.findByTestId('invitation-new@example.com')).getByRole('button', { name: 'Resend' }));
    expect(team.resendInvitation).toHaveBeenCalledWith('e1', 'i1');
    await userEvent.click(within(screen.getByTestId('invitation-new@example.com')).getByRole('button', { name: 'Revoke' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Revoke invitation' }));
    expect(team.revokeInvitation).toHaveBeenCalledWith('e1', 'i1');
  });

  it('limits admins and hides management from other roles', async () => {
    role = 'admin';
    const { unmount } = wrap(<TeamAccessPanel />);
    const owner = await screen.findByTestId('member-emi@example.com');
    expect(within(owner).queryByRole('button', { name: 'Remove access' })).not.toBeInTheDocument();
    expect(within(owner).getByText('Owner')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Role of dimi@example.com'));
    expect(screen.queryByRole('option', { name: 'Owner' })).not.toBeInTheDocument();
    unmount();
    team.invitations.mockClear();

    role = 'read_only';
    wrap(<TeamAccessPanel />);
    await screen.findByTestId('member-dimi@example.com');
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove access' })).not.toBeInTheDocument();
    expect(team.invitations).not.toHaveBeenCalled();
  });
});

describe('Audit Logs', () => {
  const entry = (over: Partial<AuditLogEntry>): AuditLogEntry => ({
    id: 'l1',
    action: 'member_role_changed',
    category: 'team',
    entityType: 'member',
    entityId: 'a-dimi',
    description: "Changed Dimi's role from Read-only to Admin",
    metadata: { member: 'dimi@example.com', before: { role: 'read_only' }, after: { role: 'admin' } },
    ipAddress: '127.0.0.1',
    createdAt: '2026-09-29T15:30:00.000Z',
    project: { id: 'e1', name: 'Project E1' },
    actor: { id: 'a-emi', name: 'Emi', email: 'emi@example.com' },
    ...over,
  });

  beforeEach(() => {
    audit.filters.mockResolvedValue({ projects: [{ id: 'e1', name: 'Project E1' }], actors: [{ id: 'a-emi', name: 'Emi', email: 'emi@example.com' }], categories: ['team'], actions: [] });
  });

  it('shows a table of entries and a readable details panel', async () => {
    audit.list.mockResolvedValueOnce({ items: [entry({}), entry({ id: 'l0', description: 'Updated the SMTP relay', category: 'settings', metadata: { method: 'PUT', route: 'email-settings/smtp', changedFields: ['host', 'password'] } })], nextCursor: null });
    wrap(<AuditLogsPanel />);
    const row = (await screen.findAllByTestId('audit-row'))[0]!;
    expect(within(row).getByText("Changed Dimi's role from Read-only to Admin")).toBeInTheDocument();
    expect(within(row).getByText('Emi')).toBeInTheDocument();
    expect(within(row).getByText('emi@example.com')).toBeInTheDocument();
    expect(within(row).getByText('Project E1')).toBeInTheDocument();
    expect(within(row).getByText('Team & access')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 entries')).toBeInTheDocument();

    await userEvent.click(row);
    const drawer = await screen.findByRole('dialog', { name: 'Activity details' });
    expect(within(drawer).getByText('Changes')).toBeInTheDocument();
    expect(within(drawer).getByText('read_only')).toBeInTheDocument();
    expect(within(drawer).getByText('admin')).toBeInTheDocument();
    expect(within(drawer).getByText('member_role_changed')).toBeInTheDocument();
    expect(within(drawer).queryByText(/"before"/)).not.toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Close details' }));

    await userEvent.click(screen.getAllByTestId('audit-row')[1]!);
    const second = await screen.findByRole('dialog', { name: 'Activity details' });
    expect(within(second).getByText('Fields changed')).toBeInTheDocument();
    expect(within(second).getByText('Password')).toBeInTheDocument();
  });

  it('paginates, filters by activity and project, and shows empty and error states', async () => {
    audit.list.mockResolvedValueOnce({ items: [entry({})], nextCursor: 'l1' });
    audit.list.mockResolvedValueOnce({ items: [entry({ id: 'l2', description: 'Updated the project details', category: 'project' })], nextCursor: null });
    wrap(<AuditLogsPanel />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Updated the project details')).toBeInTheDocument();
    expect(audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'l1', limit: 25 }));

    audit.list.mockResolvedValue({ items: [], nextCursor: null });
    await userEvent.click(screen.getByRole('tab', { name: 'Team & access' }));
    await waitFor(() => expect(audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'team' })));
    expect(await screen.findByText('No activity found')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Project'));
    await userEvent.click(await screen.findByRole('option', { name: 'Project E1' }));
    await waitFor(() => expect(audit.list).toHaveBeenLastCalledWith(expect.objectContaining({ projectId: 'e1', category: 'team' })));
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(audit.list).toHaveBeenLastCalledWith({ limit: 25, cursor: null }));

    audit.list.mockRejectedValue({ status: 0, code: 'NETWORK_ERROR', message: '' });
    await userEvent.click(screen.getByRole('tab', { name: 'Workspace' }));
    expect(await screen.findByText('Cannot reach the server. Check your connection.')).toBeInTheDocument();
  });
});
