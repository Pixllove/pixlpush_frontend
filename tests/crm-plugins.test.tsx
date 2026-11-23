import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CrmPluginsDialog from '@/components/dashboard/CrmPluginsDialog';
import { roadmapApi } from '@/lib/projects/api';

vi.mock('@/hooks/projects/use-project-settings', () => ({
  useIntegrations: () => ({ data: [] }),
}));

describe('CRM plugin picker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists every CRM plugin with its connect page', () => {
    render(<CrmPluginsDialog open projectId="project-1" onClose={() => undefined} />);
    for (const name of ['HubSpot', 'Salesforce', 'Pipedrive']) expect(screen.getByText(name)).toBeTruthy();
    const links = screen.getAllByRole('link', { name: /connect/i }).map((link) => link.getAttribute('href'));
    expect(links).toEqual(expect.arrayContaining(['/dashboard/integrations/hubspot', '/dashboard/integrations/salesforce', '/dashboard/integrations/pipedrive']));
  });

  it('sends a request for a missing plugin', async () => {
    const suggest = vi.spyOn(roadmapApi, 'suggest').mockResolvedValue({} as never);
    const user = userEvent.setup();
    render(<CrmPluginsDialog open projectId="project-1" onClose={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Request more plugins' }));
    expect((screen.getByRole('button', { name: 'Send request' }) as HTMLButtonElement).disabled).toBe(true);
    await user.type(screen.getByLabelText('CRM or tool name'), 'Zoho');
    await user.click(screen.getByRole('button', { name: 'Send request' }));
    await waitFor(() => expect(suggest).toHaveBeenCalledWith('project-1', expect.objectContaining({ title: 'Plugin request: Zoho', area: 'Integrations' })));
    expect(await screen.findByText(/received your request for Zoho/)).toBeTruthy();
  });
});
