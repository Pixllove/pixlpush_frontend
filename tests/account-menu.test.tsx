import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AccountMenu from '@/components/auth/AccountMenu';

const logout = { mutate: vi.fn(), isPending: false };
vi.mock('@/hooks/auth/use-logout', () => ({ useLogout: () => logout }));
vi.mock('@/hooks/auth/use-current-user', () => ({
  useCurrentUser: () => ({ isLoading: false, account: { id: 'a1', name: 'Sample User', email: 'sample@example.com', emailVerified: true, createdAt: '2026-01-01T00:00:00Z' } }),
}));
vi.mock('@/hooks/projects/use-active-project', () => ({
  useActiveProject: () => ({ active: { id: 'p1', subscription: { plan: 'pro' } } }),
  planLabel: () => 'Pro',
}));

describe('AccountMenu', () => {
  it('opens from the avatar, shows who is signed in, and signs out', async () => {
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));

    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent('Sample User');
    expect(menu).toHaveTextContent('sample@example.com');
    expect(menu).toHaveTextContent('Verified');
    expect(menu).toHaveTextContent('Pro');
    // The identity block is not an item: only the two actions are, and focus lands on the first.
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['My profile', 'Sign out']);
    await waitFor(() => expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveFocus());
    // A real link, not an <li> carrying an href nobody follows.
    expect(screen.getByRole('menuitem', { name: 'My profile' }).tagName).toBe('A');
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toHaveAttribute('href', '/dashboard/account');

    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(logout.mutate).toHaveBeenCalledOnce();
  });
});
