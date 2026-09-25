'use client';

import { useState } from 'react';
import { WarningAmberRounded } from '@mui/icons-material';
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useProject, useProjectStatus } from '@/hooks/projects/use-projects';
import type { ApiError } from '@/types/auth';

/** Deactivate the active Project, or restore it during the recovery window. */
export default function DangerZonePanel() {
  const { active } = useActiveProject();
  const { data: project } = useProject(active?.id);
  const { deactivate, restore } = useProjectStatus(active?.id);

  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();

  // The backend enforces owner-only too; this just avoids a pointless 403.
  const isOwner = project?.role === 'owner';
  const deactivated = project?.status === 'deactivated';
  const recoveryOpen = Boolean(project?.recoveryUntil && new Date(project.recoveryUntil) > new Date());
  const name = project?.name ?? 'Project';

  const run = async (mutation: typeof deactivate) => {
    setError(undefined);
    try {
      await mutation.mutateAsync();
      setOpen(false);
      setConfirm('');
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Something went wrong. Please try again.');
    }
  };

  const close = () => { setOpen(false); setConfirm(''); setError(undefined); };

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Danger zone</Typography>
        <Typography color="text.secondary" fontSize={12}>Project deactivation is separate from subscription cancellation.</Typography>
      </Box>

      {error && !open && <Alert severity="error">{error}</Alert>}

      {deactivated ? (
        <Card className="danger-card">
          <WarningAmberRounded />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900}>{name} is deactivated</Typography>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
              {recoveryOpen
                ? `It can be restored until ${new Date(project!.recoveryUntil!).toLocaleString()}. Billing is unchanged.`
                : 'The recovery window has expired. Contact PixlPush support.'}
            </Typography>
          </Box>
          <Button variant="contained" disabled={!isOwner || !recoveryOpen || restore.isPending} onClick={() => run(restore)}>
            {restore.isPending ? 'Restoring…' : 'Restore Project'}
          </Button>
        </Card>
      ) : (
        <Card className="danger-card">
          <WarningAmberRounded />
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900}>Deactivate {name}</Typography>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>
              The Project enters a 14-day recovery window. After that, normal access cannot be restored. Deactivation does not cancel billing.
            </Typography>
            {project && !isOwner && <Typography color="text.secondary" fontSize={12} sx={{ mt: .5 }}>Only the Project owner can deactivate it.</Typography>}
          </Box>
          <Button color="error" variant="outlined" disabled={!isOwner} onClick={() => setOpen(true)}>Deactivate Project</Button>
        </Card>
      )}

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate {name}?</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            <Alert severity="warning">SDK ingestion stops immediately. You have 14 days to restore the Project. Billing is not cancelled.</Alert>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label={`Type "${name}" to confirm`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Cancel</Button>
          <Button color="error" variant="contained" disabled={confirm !== name || deactivate.isPending} onClick={() => run(deactivate)}>
            {deactivate.isPending ? 'Deactivating…' : 'Deactivate Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
