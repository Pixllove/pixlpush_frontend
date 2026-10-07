'use client';

import { useState } from 'react';
import { Avatar, Badge, Divider, IconButton, ListItemIcon, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { CheckRounded, KeyboardArrowDownRounded, PersonOutlineRounded, LogoutRounded } from '@mui/icons-material';
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
        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={account?.emailVerified ? <Tooltip title="Email verified"><CheckRounded sx={{ fontSize: 11, color: '#fff' }} /></Tooltip> : null} sx={{ '& .MuiBadge-badge': { width: 16, height: 16, minWidth: 16, borderRadius: '50%', bgcolor: '#1976d2', border: '2px solid #fff', p: 0 } }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#5517B8' }}>{initial}</Avatar>
        </Badge>
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Account menu">
          <KeyboardArrowDownRounded />
        </IconButton>
      </Stack>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} PaperProps={{ sx: { mt: 1, minWidth: 245, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(113,50,211,.12)', boxShadow: '0 18px 42px rgba(35,16,55,.2)' } }}>
        <Stack sx={{ px: 2.2, py: 1.8, bgcolor: '#FAF9FB' }}>
          <Typography fontSize={13} fontWeight={600}>
            {account?.name ?? 'Signed in'}
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            {account?.email ?? '—'}
          </Typography>
        </Stack>
        <Divider />
        <MenuItem component="a" href="/dashboard/account" onClick={() => setAnchor(null)} sx={{ px: 2.2, py: 1.25, gap: 1, '&:hover': { bgcolor: '#f5edff', color: 'primary.main' } }}>
          <ListItemIcon>
            <PersonOutlineRounded fontSize="small" />
          </ListItemIcon>
          My profile
        </MenuItem>
        <MenuItem
          sx={{ px: 2.2, py: 1.25, gap: 1, '&:hover': { bgcolor: '#fff1ef', color: '#d94841' } }}
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
