import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmptyState, { listEmpty } from '@/components/dashboard/EmptyState';

describe('EmptyState', () => {
  it('shows its title and sentence and fires its action', async () => {
    const onClick = vi.fn();
    render(<EmptyState title="No journeys yet" description="Create your first one." action={{ label: 'Create journey', onClick }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No journeys yet');
    expect(screen.getByText('Create your first one.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create journey' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('tells apart could-not-load, nothing-matches and nothing-yet', () => {
    const create = { label: 'Create', onClick: vi.fn() };
    const base = { noun: 'journeys', create, onClear: vi.fn(), onRetry: vi.fn() };
    expect(listEmpty({ ...base, error: 'Could not load', search: 'abc' })).toMatchObject({ tone: 'error', title: 'Could not load', action: { label: 'Try again' } });
    expect(listEmpty({ ...base, search: ' abc ' })).toMatchObject({ title: 'No journeys match “abc”', action: { label: 'Clear search' } });
    expect(listEmpty({ ...base, search: '' })).toMatchObject({ title: 'No journeys yet', action: create });
  });
});
