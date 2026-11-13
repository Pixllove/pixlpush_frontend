import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeCommandCenter from '@/components/dashboard/HomeCommandCenter';
import { CollaborationTimeline } from '@/components/dashboard/CollaborationResultCard';
import { aiApi } from '@/lib/projects/ai';

vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ projects: [], active: { id: 'p1', name: 'Acme' }, isPending: false }) }));
vi.mock('@/hooks/auth/use-current-user', () => ({ useCurrentUser: () => ({ account: { name: 'Kamran Ahsan' } }) }));
vi.mock('@/lib/projects/ai', () => ({ aiApi: { catalog: vi.fn(), context: vi.fn(), businessContext: vi.fn(), updateBusinessContext: vi.fn(), analyzeBusinessContext: vi.fn(), detectBusinessContextLinks: vi.fn(), conversations: vi.fn(), collaborations: vi.fn(), approveCollaboration: vi.fn(), rejectCollaboration: vi.fn(), cancelCollaboration: vi.fn(), deleteConversation: vi.fn(), chat: vi.fn(), regenerate: vi.fn(), flowDraft: vi.fn(), flowCreate: vi.fn(), createConversation: vi.fn(), cancelConversation: vi.fn(), conversation: vi.fn(), submitInteraction: vi.fn(), cancelInteraction: vi.fn(), retryInteraction: vi.fn(), reloadInteraction: vi.fn() } }));

const api = vi.mocked(aiApi);
const profile = (id: string, role: string) => ({ id, role, avatar: `/assets/agent-avatar-${id.toLowerCase()}-v4.webp` });
const baseResponse = (assistant = 'Max') => ({ conversationId: 'c1', assistant, provider: 'rules' as const, message: `${assistant} final answer`, nextActions: [], evidence: [], context: { generatedAt: '' } });
const collaboration = (overrides: Record<string, unknown> = {}) => ({
  id: 'col-1', mode: 'consultation' as const, leadAgent: 'Max', activeAgent: 'Max', participants: [{ agentId: 'Max', role: 'lead', status: 'active' }, { agentId: 'Ben', role: 'specialist', status: 'completed' }], tasks: [{ id: 'task-1', taskKey: 'ben-analysis', agentId: 'Ben', type: 'analysis', status: 'completed', attempt: 1, maxAttempts: 2 }], results: [{ taskKey: 'ben-analysis', agentId: 'Ben', status: 'completed' as const, summary: 'Ben found a weak conversion point.', findings: ['Click-through is below the project baseline.'], evidence: [{ label: 'Click rate', value: '1.2%' }], recommendations: ['Test a clearer CTA.'], missingData: [], confidence: 'high' as const, approvalRequired: true }], approvalRequired: true, approvalStatus: 'pending' as const, maxSpecialistCalls: 3, ...overrides,
});

function renderHome() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><HomeCommandCenter /></QueryClientProvider>);
}

describe('PixlPush collaboration UI', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.localStorage.clear();
    api.context.mockReturnValue(new Promise(() => {}));
    api.businessContext.mockResolvedValue({} as never);
    api.collaborations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue({ id: 'c1' } as never);
  });

  it.each(['Ben', 'Nova', 'Anna'] as const)('keeps a directly selected %s conversation direct', async (assistant) => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse(assistant), message: `${assistant} answered directly` } as never);
    renderHome();
    await user.click(screen.getByRole('button', { name: 'Assistant: Max. Change assistant' }));
    await user.click(screen.getByRole('menuitem', { name: new RegExp(`^${assistant}`) }));
    await user.type(screen.getByRole('textbox', { name: `Message ${assistant}` }), 'Answer directly for me{Enter}');
    expect(await screen.findByText(`${assistant} answered directly`, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(api.chat).toHaveBeenCalledWith('p1', expect.objectContaining({ assistant, mode: 'direct', prompt: 'Answer directly for me', requestKey: expect.any(String) }), expect.any(AbortSignal));
  }, 15_000);

  it('keeps Max active during consultation and renders Ben evidence before the final synthesis', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse(), message: 'Max synthesized the campaign recommendation.', mode: 'consultation', collaboration: collaboration() } as never);
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Improve this campaign conversion rate{Enter}');
    expect(await screen.findByText('Ben found a weak conversion point.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('Click-through is below the project baseline.')).toBeInTheDocument();
    expect(screen.getByText('Max synthesized the campaign recommendation.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistant: Max. Change assistant' })).toBeInTheDocument();
    expect(api.chat).toHaveBeenCalledWith('p1', expect.objectContaining({ assistant: 'Max', mode: 'consultation', requestKey: expect.any(String) }), expect.any(AbortSignal));
  }, 8_000);

  it('switches only for a completed handoff and does not replay the request twice', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse('Nova'), mode: 'handoff', handoffCompleted: true, message: 'Nova continued with the request.', handoff: { assistant: 'Nova', name: 'Nova', role: 'Campaign & Journey Creator' }, collaboration: { ...collaboration({ mode: 'handoff', leadAgent: 'Nova', currentAgent: 'Nova', participants: [{ agentId: 'Max', role: 'previous_lead', status: 'active' }, { agentId: 'Nova', role: 'lead', status: 'active' }], tasks: [{ id: 'task-1', taskKey: 'handoff-specialist', agentId: 'Nova', type: 'handoff', status: 'completed', attempt: 1, maxAttempts: 2 }], results: [] }), approvalRequired: true, approvalStatus: 'pending' } } as never);
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Please hand this to Nova{Enter}');
    expect(await screen.findByText('Nova continued with the request.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assistant: Nova. Change assistant' })).toBeInTheDocument();
    expect(api.regenerate).not.toHaveBeenCalled();
    expect(api.chat).toHaveBeenCalledTimes(1);
  }, 8_000);

  it('shows approval and rejection actions without implying activation', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse(), mode: 'consultation', collaboration: collaboration() } as never);
    api.approveCollaboration.mockResolvedValue({ collaborationId: 'col-1', approvalStatus: 'approved', activationRequired: true, message: 'Approved for review.' } as never);
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Improve this campaign conversion rate{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Approve draft' }, { timeout: 4000 }));
    expect(api.approveCollaboration).toHaveBeenCalledWith('p1', 'col-1');
    expect(await screen.findByText('Approval approved')).toBeInTheDocument();
    expect(screen.getByText('Approved for review. Sending, scheduling, or activation remains a separate action.')).toBeInTheDocument();
  }, 8_000);

  it('does not present downstream specialists as successful after Ben fails', () => {
    render(<CollaborationTimeline collaboration={collaboration({ results: [{ taskKey: 'ben-analysis', agentId: 'Ben', status: 'failed', summary: 'Ben could not complete the analysis.', evidence: [], recommendations: [], missingData: ['delivery data'], confidence: 'low', approvalRequired: true }, { taskKey: 'anna-draft', agentId: 'Anna', status: 'completed', summary: 'Anna should not be displayed as successful.', evidence: [], recommendations: [], missingData: [], confidence: 'high', approvalRequired: true }], tasks: [{ id: 'task-1', taskKey: 'ben-analysis', agentId: 'Ben', type: 'analysis', status: 'failed', attempt: 2, maxAttempts: 2 }, { id: 'task-2', taskKey: 'anna-draft', agentId: 'Anna', type: 'draft', status: 'completed', attempt: 1, maxAttempts: 2 }] })} profiles={[profile('Max', 'Growth Concierge'), profile('Ben', 'Lifecycle & Campaign Data Analyst'), profile('Anna', 'Cross-Sell & Marketing Expert')]} />);
    expect(screen.getByText('Ben could not complete the analysis.')).toBeInTheDocument();
    expect(screen.getByText('delivery data')).toBeInTheDocument();
    expect(screen.queryByText('Anna should not be displayed as successful.')).not.toBeInTheDocument();
  });

  it('keeps onboarding on Max without inviting specialists', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse(), message: 'Max reviewed your onboarding status.', mode: 'direct' } as never);
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Which onboarding steps are missing?{Enter}');
    expect(await screen.findByText('Max reviewed your onboarding status.', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(api.chat).toHaveBeenCalledWith('p1', expect.objectContaining({ assistant: 'Max', mode: 'direct' }), expect.any(AbortSignal));
  }, 8_000);

  it('cancels an in-flight collaboration request and records the cancellation', async () => {
    const user = userEvent.setup();
    api.chat.mockImplementation((_projectId, _input, signal) => new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject({ status: 0, code: 'ABORTED', message: 'Request stopped.' }))));
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Improve this campaign conversion rate{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Stop generation' }));
    expect(api.cancelConversation).toHaveBeenCalledWith('p1', 'c1');
    expect(await screen.findByText('Generation stopped.')).toBeInTheDocument();
  }, 8_000);

  it('supports collaboration history data from the persisted route', async () => {
    const user = userEvent.setup();
    api.chat.mockResolvedValue({ ...baseResponse(), mode: 'consultation', collaboration: collaboration() } as never);
    api.collaborations.mockResolvedValue([{
      id: 'col-1', mode: 'consultation', leadAgent: 'Max', activeAgent: 'Max', currentAgent: 'Max', nextAgent: null, status: 'completed', approvalRequired: true, approvalStatus: 'pending', maxSpecialistCalls: 3,
      participants: [{ id: 'p-max', agentId: 'Max', role: 'lead', status: 'active' }, { id: 'p-ben', agentId: 'Ben', role: 'specialist', status: 'completed' }],
      tasks: [{ id: 'task-1', taskKey: 'ben-analysis', agentId: 'Ben', type: 'analysis', status: 'completed', attempt: 1, maxAttempts: 2, startedAt: '2026-11-12T10:00:00.000Z', completedAt: '2026-11-12T10:01:00.000Z' }],
      results: [{ taskKey: 'ben-analysis', agentId: 'Ben', status: 'completed', summary: 'Persisted Ben result', findings: ['Persisted finding'], evidence: [{ label: 'Persisted evidence', value: '1.2%', source: 'email_jobs' }], recommendations: ['Persisted recommendation'], missingData: [], confidence: 'medium', approvalRequired: true, createdAt: '2026-11-12T10:01:00.000Z' }],
      events: [{ id: 'event-1', collaborationId: 'col-1', type: 'lead_synthesis_completed', actorAgent: 'Max', targetAgent: null, payload: {}, createdAt: '2026-11-12T10:01:00.000Z' }],
      createdAt: '2026-11-12T10:00:00.000Z', updatedAt: '2026-11-12T10:01:00.000Z',
    }] as never);
    renderHome();
    await user.type(screen.getByRole('textbox', { name: 'Message Max' }), 'Improve this campaign conversion rate{Enter}');
    await screen.findByText('Max final answer', {}, { timeout: 4000 });
    await user.click(screen.getByRole('button', { name: 'Context' }));
    await user.click(screen.getByRole('menuitem', { name: 'Collaboration history' }));
    expect(await screen.findByText('Persisted Ben result')).toBeInTheDocument();
    expect(screen.getByText('Persisted finding')).toBeInTheDocument();
    expect(screen.getAllByText(/lead_synthesis_completed/).length).toBeGreaterThan(0);
  }, 8_000);
});
