'use client';

import { CloseRounded } from '@mui/icons-material';
import { Box, Drawer, IconButton, Stack, Typography } from '@mui/material';

/**
 * The dashboard's right-hand panel (audit log details, creating SDK keys, …):
 * small uppercase label, title, close button, content, optional footer pinned
 * to the bottom for actions. Full width on phones, 440px from `sm` up.
 */
export default function SidePanel({ open, onClose, eyebrow, title, children, footer, label, closeLabel = 'Close panel' }: {
  open: boolean;
  onClose: () => void;
  /** Small uppercase line above the title, e.g. "Activity details". */
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Actions (Cancel / Save), kept visible at the bottom. */
  footer?: React.ReactNode;
  /** Accessible name of the panel; defaults to the eyebrow. */
  label?: string;
  closeLabel?: string;
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}>
      <Stack sx={{ height: '100%' }} role="dialog" aria-label={label ?? eyebrow}>
        <Stack sx={{ p: 3, flex: 1, overflowY: 'auto' }} gap={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontSize="var(--fs-12)" fontWeight={500} letterSpacing={1} color="text.secondary" textTransform="uppercase">{eyebrow}</Typography>
              <Typography fontSize="var(--fs-16)" fontWeight={600} sx={{ mt: 0.5, wordBreak: 'break-word' }}>{title}</Typography>
            </Box>
            <IconButton aria-label={closeLabel} onClick={onClose}><CloseRounded /></IconButton>
          </Stack>
          {children}
        </Stack>
        {footer && (
          <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            {footer}
          </Stack>
        )}
      </Stack>
    </Drawer>
  );
}
