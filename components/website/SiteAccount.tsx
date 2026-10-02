'use client';

import { useState } from 'react';
import { Avatar, Box, Button, ButtonBase, Divider, Link, ListItemIcon, Menu, MenuItem, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import PersonOutlineRounded from '@mui/icons-material/PersonOutlineRounded';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLogout } from '@/hooks/auth/use-logout';

/**
 * The right-hand end of the marketing header. A visitor sees "Log in" and
 * "Get started"; someone already signed in sees a way into the app and their
 * account menu instead of being asked to log in again.
 */
export function SiteAccount() {
  const { account, isAuthenticated, isPending } = useCurrentUser();
  const logout = useLogout();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  // Until the session is known, hold the space: showing "Log in" and then swapping it out would flicker.
  if (isPending) return <Box aria-hidden sx={{ width: 190, height: 40, borderRadius: 999, bgcolor: 'rgba(255,255,255,.07)' }} />;

  if (!isAuthenticated || !account) {
    return (
      <>
        <Link href="/login" underline="none" sx={{ px: 1.5, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.88)', '&:hover': { color: '#ffab8e' } }}>Log in</Link>
        <Button variant="contained" href="/get-started" endIcon={<ArrowOutwardRounded />}>Get started</Button>
      </>
    );
  }

  const name = account.name?.trim() || account.email.split('@')[0];
  const initial = name.charAt(0).toUpperCase();
  const close = () => setAnchor(null);

  return (
    <>
      <Button variant="contained" href="/dashboard" endIcon={<ArrowOutwardRounded />}>Dashboard</Button>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={`Account menu for ${name}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={{
          gap: 0.5,
          p: '3px',
          pr: 0.75,
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,.18)',
          color: 'rgba(255,255,255,.8)',
          transition: 'background-color .15s, border-color .15s',
          '&:hover, &[aria-expanded="true"]': { bgcolor: 'rgba(255,255,255,.09)', borderColor: 'rgba(255,255,255,.34)' },
          '&:focus-visible': { outline: '2px solid #ffab8e', outlineOffset: 2 },
        }}
      >
        <Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 800, background: 'linear-gradient(135deg,#ff5d6c,#7928ef)' }}>{initial}</Avatar>
        <KeyboardArrowDownRounded sx={{ fontSize: 18, transition: 'transform .15s', transform: anchor ? 'rotate(180deg)' : 'none' }} />
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { mt: 1.25, minWidth: 260, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(113,50,211,.12)', boxShadow: '0 18px 42px rgba(35,16,55,.28)' } }}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ px: 2.2, py: 1.8, background: 'linear-gradient(135deg, #f5edff 0%, #fff5f1 100%)' }}>
          <Avatar sx={{ width: 38, height: 38, fontWeight: 800, background: 'linear-gradient(135deg,#ff5d6c,#7928ef)' }}>{initial}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={13} fontWeight={800} noWrap>{name}</Typography>
            <Typography fontSize={12} color="text.secondary" noWrap>{account.email}</Typography>
          </Box>
        </Stack>
        <Divider />
        <MenuItem component="a" href="/dashboard" onClick={close} sx={{ px: 2.2, py: 1.25, '&:hover': { bgcolor: '#f5edff', color: 'primary.main' } }}>
          <ListItemIcon><DashboardRounded fontSize="small" /></ListItemIcon>
          Dashboard
        </MenuItem>
        <MenuItem component="a" href="/dashboard/account" onClick={close} sx={{ px: 2.2, py: 1.25, '&:hover': { bgcolor: '#f5edff', color: 'primary.main' } }}>
          <ListItemIcon><PersonOutlineRounded fontSize="small" /></ListItemIcon>
          My profile
        </MenuItem>
        <Divider />
        <MenuItem disabled={logout.isPending} onClick={() => { close(); logout.mutate(); }} sx={{ px: 2.2, py: 1.25, '&:hover': { bgcolor: '#fff1ef', color: '#d94841' } }}>
          <ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </MenuItem>
      </Menu>
    </>
  );
}

/** The same choice for the mobile drawer, as plain stacked links. */
export function SiteAccountDrawer({ onNavigate }: { onNavigate: () => void }) {
  const { account, isAuthenticated } = useCurrentUser();
  const logout = useLogout();
  const linkSx = { color: 'rgba(255,255,255,.84)' };

  if (!isAuthenticated || !account) {
    return (
      <>
        <Link href="/login" onClick={onNavigate} underline="none" fontWeight={700} sx={linkSx}>Log in</Link>
        <Button variant="contained" href="/get-started">Create your free account</Button>
      </>
    );
  }
  const name = account.name?.trim() || account.email.split('@')[0];
  return (
    <>
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ pt: 2, borderTop: '1px solid rgba(255,255,255,.14)' }}>
        <Avatar sx={{ width: 36, height: 36, fontWeight: 800, background: 'linear-gradient(135deg,#ff5d6c,#7928ef)' }}>{name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontSize={13} fontWeight={800} noWrap>{name}</Typography>
          <Typography fontSize={12} noWrap sx={{ color: 'rgba(255,255,255,.6)' }}>{account.email}</Typography>
        </Box>
      </Stack>
      <Button variant="contained" href="/dashboard">Go to dashboard</Button>
      <Link href="/dashboard/account" onClick={onNavigate} underline="none" fontWeight={700} sx={linkSx}>My profile</Link>
      <Link component="button" type="button" underline="none" fontWeight={700} disabled={logout.isPending} onClick={() => { onNavigate(); logout.mutate(); }} sx={{ ...linkSx, textAlign: 'left', font: 'inherit', fontWeight: 700 }}>
        {logout.isPending ? 'Signing out…' : 'Sign out'}
      </Link>
    </>
  );
}
