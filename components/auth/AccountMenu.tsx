'use client';

import { useState } from 'react';
import { Box, ButtonBase, Chip, Divider, ListItemIcon, Menu, MenuItem, Skeleton, Stack, Typography } from '@mui/material';
import { KeyboardArrowDownRounded, LogoutRounded, PersonOutlineRounded } from '@mui/icons-material';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLogout } from '@/hooks/auth/use-logout';
import { planLabel, useActiveProject } from '@/hooks/projects/use-active-project';
import type { Account } from '@/types/auth';
import UserAvatar from './UserAvatar';

/** Who is signed in. Not a menu item: MUI skips it for focus and arrow keys. */
function Identity({ account, plan }: { account?: Account; plan?: string }) {
  const name = account?.name?.trim();
  return (
    <Box className="pp-account-identity">
      <Stack direction="row" alignItems="center" gap={1.5}>
        <UserAvatar account={account} size={40} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" noWrap title={name || account?.email}>{name || account?.email || 'Signed in'}</Typography>
          {name && <Typography variant="body2" color="text.secondary" noWrap title={account?.email}>{account?.email}</Typography>}
        </Box>
      </Stack>
      {account && (
        <Stack direction="row" gap={0.75} sx={{ mt: 1.5 }}>
          <Chip size="small" color={account.emailVerified ? 'success' : 'default'} label={account.emailVerified ? 'Verified' : 'Not verified'} />
          {plan && <Chip size="small" color="primary" label={plan} />}
        </Stack>
      )}
    </Box>
  );
}
Identity.muiSkipListHighlight = true;

export default function AccountMenu() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { account, isLoading } = useCurrentUser();
  const { active } = useActiveProject();
  const logout = useLogout();
  const open = Boolean(anchor);

  // The same size as the avatar, so the top bar does not shift when the account arrives.
  if (isLoading) return <Skeleton variant="circular" width={32} height={32} />;

  return (
    <>
      <ButtonBase className="pp-account-trigger" onClick={(event) => setAnchor(event.currentTarget)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'account-menu' : undefined}>
        <UserAvatar account={account} />
        <KeyboardArrowDownRounded className="pp-account-chevron" />
      </ButtonBase>

      <Menu
        id="account-menu"
        className="pp-account-menu"
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Identity account={account} plan={active ? planLabel(active) : undefined} />
        <Divider />
        <MenuItem href="/dashboard/account" onClick={() => setAnchor(null)}>
          <ListItemIcon><PersonOutlineRounded /></ListItemIcon>
          My profile
        </MenuItem>
        <Divider />
        <MenuItem
          className="pp-account-signout"
          disabled={logout.isPending}
          onClick={() => {
            setAnchor(null);
            logout.mutate();
          }}
        >
          <ListItemIcon><LogoutRounded /></ListItemIcon>
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </MenuItem>
      </Menu>
    </>
  );
}
