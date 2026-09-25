'use client';

import { useState } from 'react';
import { Avatar, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { KeyboardArrowDownRounded, LockOutlined, LogoutRounded } from '@mui/icons-material';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLogout } from '@/hooks/auth/use-logout';

export default function AccountMenu() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { account } = useCurrentUser();
  const logout = useLogout();

  const initial = (account?.name ?? account?.email ?? '?').charAt(0).toUpperCase();

  return (
    <>
      <Stack direction="row" alignItems="center" gap={0.5}>
        <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#ff5d6c,#7928ef)' }}>
          {initial}
        </Avatar>
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
          <KeyboardArrowDownRounded />
        </IconButton>
      </Stack>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Stack sx={{ px: 2, py: 1 }}>
          <Typography fontSize={13} fontWeight={700}>
            {account?.name ?? 'Signed in'}
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {account?.email ?? '—'}
          </Typography>
        </Stack>
        <Divider />
        <MenuItem component="a" href="/dashboard/account" onClick={() => setAnchor(null)}>
          <ListItemIcon>
            <LockOutlined fontSize="small" />
          </ListItemIcon>
          Account security
        </MenuItem>
        <MenuItem
          disabled={logout.isPending}
          onClick={() => {
            setAnchor(null);
            logout.mutate();
          }}
        >
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </MenuItem>
      </Menu>
    </>
  );
}
