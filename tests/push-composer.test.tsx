import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PushComposer from '@/components/dashboard/PushComposer';
import { pushApi } from '@/lib/projects/api';

vi.mock('@/lib/projects/api', () => ({
  pushApi: { templates: { create: vi.fn() }, campaigns: { create: vi.fn(), audiencePreview: vi.fn() } },
  audienceGroupsApi: { list: vi.fn(async () => []) },
  lifecycleSegmentsApi: { list: vi.fn(async () => []) },
}));
vi.mock('@/hooks/projects/use-active-project', () => ({ useActiveProject: () => ({ active: { id: 'p1' } }) }));

const push = vi.mocked(pushApi, true);

const saveDraft = async (mode: 'campaign' | 'template') => {
  const onSaved = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PushComposer mode={mode} onBack={() => {}} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText(/Push notification name/), { target: { value: 'Promo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled(), { timeout: 2000 });
  return onSaved.mock.calls[0]![0];
};

describe('PushComposer · Save as draft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    push.templates.create.mockResolvedValue({ id: 't1' } as never);
    push.campaigns.create.mockResolvedValue({ id: 'c1' } as never);
  });

  it('push notification mode saves a campaign draft', async () => {
    expect(await saveDraft('campaign')).toBe('drafts');
    expect(push.campaigns.create).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Promo', sendNow: false }));
    expect(push.templates.create).not.toHaveBeenCalled();
  });

  it('template mode saves a reusable template, never a campaign', async () => {
    expect(await saveDraft('template')).toBe('templates');
    expect(push.templates.create).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Promo', category: 'template' }));
    expect(push.campaigns.create).not.toHaveBeenCalled();
  });
});
