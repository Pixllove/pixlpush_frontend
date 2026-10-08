'use client';

import { Avatar } from '@mui/material';
import { tokens } from '@/lib/theme';

type Person = { id: string; name?: string | null; email: string; avatarUrl?: string | null };

/** Two letters from the name, else the first letter of the email. */
export const personInitials = (person?: Pick<Person, 'name' | 'email'>) =>
  (person?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('') || person?.email.charAt(0) || '?').toUpperCase();

/**
 * Which palette colour a person gets. Derived from their id rather than stored, so the same person has
 * the same colour on every screen and for every viewer.
 */
export const avatarColorIndex = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % tokens.avatar.length;
};

/** The one avatar for a person (DESIGN.md): their Google photo, or their initials on their colour. */
export default function UserAvatar({ account, size = 32, className = '' }: { account?: Person; size?: 32 | 40 | 56; className?: string }) {
  return (
    <Avatar
      // If the photo fails to load, MUI falls back to the initials below. Google's image host can refuse
      // requests that carry a referrer.
      src={account?.avatarUrl ?? undefined}
      alt=""
      slotProps={{ img: { referrerPolicy: 'no-referrer', loading: 'lazy' } }}
      className={`pp-avatar pp-avatar-${account ? avatarColorIndex(account.id) + 1 : 1} is-${size} ${className}`}
    >
      {personInitials(account)}
    </Avatar>
  );
}
