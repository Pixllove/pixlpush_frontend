'use client';

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setSelectedProject } from '@/lib/uiSlice';
import { useCreateProject } from '@/hooks/projects/use-projects';
import SubmitButton from '@/components/auth/SubmitButton';
import type { ApiError } from '@/types/auth';

/**
 * Creates a Project and selects it. The caller becomes its owner, so the
 * new Project is immediately the one the dashboard is looking at.
 */
export default function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dispatch = useDispatch();
  const createProject = useCreateProject();
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  const close = () => {
    setName('');
    setError(undefined);
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);

    try {
      const project = await createProject.mutateAsync({ name: name.trim() });
      // Switch to it straight away: creating a Project is how someone with none
      // gets started, so leaving the old selection would strand them.
      dispatch(setSelectedProject(project.id));
      close();
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not create the project. Please try again.');
    }
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle>Create project</DialogTitle>
        <DialogContent>
          <Stack gap={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Project name"
              placeholder="e.g. Acme Mobile"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={createProject.isPending}
              fullWidth
              autoFocus
              helperText="Each Project has its own users, events, plan and billing."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={createProject.isPending}>Cancel</Button>
          <SubmitButton
            type="submit"
            variant="contained"
            pending={createProject.isPending}
            disabled={!name.trim() || createProject.isPending}
          >
            Create project
          </SubmitButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
