import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UserAvatar, { avatarColorIndex, personInitials } from '@/components/auth/UserAvatar';
import { tokens } from '@/lib/theme';

describe('UserAvatar', () => {
  it('gives one person one colour, and spreads people across the palette', () => {
    expect(avatarColorIndex('account-1')).toBe(avatarColorIndex('account-1'));
    const used = new Set(Array.from({ length: 200 }, (_, i) => avatarColorIndex(`cm${i}x0a1b${i * 7}`)));
    expect(used.size).toBe(tokens.avatar.length);
    for (const index of used) expect(index).toBeGreaterThanOrEqual(0);
  });

  it('takes two letters from the name, else one from the email', () => {
    expect(personInitials({ name: 'Sample Person Three', email: 'x@example.com' })).toBe('SP');
    expect(personInitials({ name: null, email: 'zed@example.com' })).toBe('Z');
    expect(personInitials()).toBe('?');
  });

  it('shows initials on the person\'s colour when there is no photo', () => {
    const { container } = render(<UserAvatar account={{ id: 'a1', name: 'Sample User', email: 's@example.com' }} />);
    expect(screen.getByText('SU')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstChild).toHaveClass(`pp-avatar-${avatarColorIndex('a1') + 1}`);
  });

  it('shows the Google photo, asked for without a referrer', () => {
    const url = 'https://lh3.googleusercontent.com/a/photo=s96-c';
    const { container } = render(<UserAvatar account={{ id: 'a1', name: 'Sample User', email: 's@example.com', avatarUrl: url }} size={56} />);
    expect(container.firstChild).toHaveClass('is-56');
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', url);
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
  });
});
