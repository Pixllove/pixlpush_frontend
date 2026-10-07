'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Card, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useActiveProject } from '@/hooks/projects/use-active-project';
import { useProject, useUpdateProject } from '@/hooks/projects/use-projects';
import SubmitButton from '@/components/auth/SubmitButton';
import type { ApiError } from '@/types/auth';
import type { ProjectEnvironment } from '@/types/project';

/** Identity and environment for the active Project. */
export default function ProjectDetailsPanel() {
  const { active } = useActiveProject();
  const { data: project, isPending } = useProject(active?.id);
  const updateProject = useUpdateProject(active?.id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [environment, setEnvironment] = useState<ProjectEnvironment>('production');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  // Load the server's values once they arrive, and again when the Project
  // changes, so switching Projects never leaves the previous one's text behind.
  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description ?? '');
    setEnvironment(project.environment);
    setSaved(false);
    setError(undefined);
  }, [project]);

  // Only an owner or admin may change these; the backend enforces it too.
  const canEdit = project?.role === 'owner' || project?.role === 'admin';
  // Loading is not a reason to disable: until the Project arrives the fields are placeholders of the same size.
  const disabled = updateProject.isPending || !canEdit;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setSaved(false);

    try {
      await updateProject.mutateAsync({
        name: name.trim(),
        // Empty means "no note", which the backend stores as null.
        description: description.trim() || null,
        environment,
      });
      setSaved(true);
    } catch (cause) {
      setError((cause as ApiError).message ?? 'Could not save. Please try again.');
    }
  };

  return (
    <Stack gap={2.5}>
      <Box>
        <Typography variant="h3">Project details</Typography>
        <Typography color="text.secondary" fontSize={12}>Basic identity and environment settings for the active Project.</Typography>
      </Box>
      <Card className="saas-card">
        <Box component="form" onSubmit={submit}>
          <Stack gap={3}>
            {error && <Alert severity="error">{error}</Alert>}
            {saved && <Alert severity="success">Project updated.</Alert>}
            {project && !canEdit && (
              <Alert severity="info">Your role on this Project does not allow changing these settings.</Alert>
            )}

            {isPending ? (
              <>
                <Skeleton variant="rounded" height={40} />
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                  <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
                  <Skeleton variant="rounded" height={40} sx={{ flex: 1 }} />
                </Stack>
                <Skeleton variant="rounded" height={88} />
                <Skeleton variant="rounded" width={128} height={40} />
              </>
            ) : (
              <>
            <TextField label="Project name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              {/* The slug is assigned at creation and is not editable. */}
              <TextField label="Project ID" value={project?.slug ?? ''} fullWidth disabled />
              <Select value={environment} onChange={(e) => setEnvironment(e.target.value as ProjectEnvironment)} disabled={disabled} fullWidth>
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
                <MenuItem value="development">Development</MenuItem>
              </Select>
            </Stack>
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={disabled} multiline minRows={3} />
            <SubmitButton type="submit" variant="contained" pending={updateProject.isPending} disabled={disabled || !name.trim()} sx={{ alignSelf: 'flex-start' }}>
              Save changes
            </SubmitButton>
              </>
            )}
          </Stack>
        </Box>
      </Card>
    </Stack>
  );
}
