import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormWizard } from '@/components/dashboard/forms/FormWizard';
import { defaultDraft, type FormDraft } from '@/components/dashboard/forms/model';
import { getForm, listGroups, saveForm } from '@/lib/forms';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  search: 'step=editor',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

vi.mock('@/hooks/projects/use-active-project', () => ({
  useActiveProject: () => ({ active: { id: 'project_isolated' } }),
}));

vi.mock('@/lib/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/forms')>();
  return { ...actual, getForm: vi.fn(), listGroups: vi.fn(), saveForm: vi.fn() };
});

const initialDraft = (): FormDraft => ({
  ...defaultDraft({ name: 'Welcome form', kind: 'popup' }),
  id: 'form_isolated',
  groups: [],
});

const audienceGroup = {
  id: 'group_isolated',
  name: 'Newsletter',
  description: 'People who want product updates',
  count: 0,
};

function renderWizard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><FormWizard id="form_isolated" /></QueryClientProvider>);
  return client;
}

describe('form wizard subscriber groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.search = 'step=audience';
    vi.mocked(getForm).mockResolvedValue(initialDraft());
    vi.mocked(listGroups).mockResolvedValue([]);
    vi.mocked(saveForm).mockImplementation(async (draft) => draft);
  });

  it('needs a group before continuing, then saves it and opens the templates', async () => {
    const user = userEvent.setup();
    vi.mocked(listGroups).mockResolvedValue([audienceGroup]);
    renderWizard();

    const group = await screen.findByRole('checkbox', { name: /Newsletter.*People who want product updates.*0 subscribers/ });
    expect(group).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();

    await user.click(group);
    await user.click(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(saveForm).toHaveBeenCalledWith(expect.objectContaining({ groups: [audienceGroup.id] }), 'project_isolated'));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith('/dashboard/forms/form_isolated/edit?step=design'));
  });

  it('saves the draft and opens Users → Audience groups to create a shared group', async () => {
    const user = userEvent.setup();
    renderWizard();

    await screen.findByText('No audience groups yet');
    await user.click(screen.getByRole('button', { name: 'Create your first group' }));
    await waitFor(() => expect(saveForm).toHaveBeenCalledWith(expect.objectContaining({ id: 'form_isolated' }), 'project_isolated'));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith(
      '/dashboard/users?tab=groups&createGroup=1&returnTo=%2Fdashboard%2Fforms%2Fform_isolated%2Fedit%3Fstep%3Daudience',
    ));
  });

  it('selects the group created in Users when returning to the wizard', async () => {
    navigation.search = 'step=audience&newGroupId=group_isolated';
    vi.mocked(listGroups).mockResolvedValue([audienceGroup]);
    renderWizard();

    expect(await screen.findByRole('checkbox', { name: /Newsletter/ })).toBeChecked();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/dashboard/forms/form_isolated/edit?step=audience', { scroll: false }));
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeEnabled();
  });

  it('sends a form without groups back to choose them before the template or editor', async () => {
    navigation.search = 'step=editor';
    renderWizard();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/dashboard/forms/form_isolated/edit?step=audience', { scroll: false }));
  });

  it('adds an input from the Elements panel to the signup fields', async () => {
    const user = userEvent.setup();
    navigation.search = 'step=editor';
    vi.mocked(getForm).mockResolvedValue({ ...initialDraft(), groups: [audienceGroup.id] });
    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Add element' }));
    await user.click(screen.getByRole('button', { name: 'Phone' }));
    await waitFor(() => expect(saveForm).toHaveBeenCalledWith(
      expect.objectContaining({ fields: expect.arrayContaining([expect.objectContaining({ type: 'email' }), expect.objectContaining({ type: 'phone' })]) }), 'project_isolated'));
  });

  it('sends old step links to the new flow', async () => {
    navigation.search = 'step=behaviour';
    vi.mocked(getForm).mockResolvedValue({ ...initialDraft(), groups: [audienceGroup.id] });
    renderWizard();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/dashboard/forms/form_isolated/edit?step=setup', { scroll: false }));
  });
});
