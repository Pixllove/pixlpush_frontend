'use client';

import { ReactNode, useEffect, useState } from 'react';
import { MenuRounded, SearchRounded } from '@mui/icons-material';
import { Box, IconButton, InputAdornment, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setSelectedProject } from '@/lib/uiSlice';
import { useActiveProject, planLabel } from '@/hooks/projects/use-active-project';
import CreateProjectDialog from './CreateProjectDialog';
import DashboardSidebar from './DashboardSidebar';
import AccountMenu from '@/components/auth/AccountMenu';
import NotificationMenu from '@/components/dashboard/NotificationMenu';

export default function DashboardFrame({ active, title, description, action, hideHeader = false, children }: { active: string; title: string; description: string; action?: ReactNode; hideHeader?: boolean; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const { projects, active: activeProject, isEmpty, isPending } = useActiveProject();

  const [createOpen, setCreateOpen] = useState(false);
  const changeProject = (value: string) => { value === 'create' ? setCreateOpen(true) : dispatch(setSelectedProject(value)); };

  // Nothing invented: the heading names the real Project, or says there is none.
  const projectName = activeProject?.name ?? (isEmpty ? 'No project' : '');
  return <Box className="dashboard-app"><DashboardSidebar active={active} setActive={() => setMobileOpen(false)} mobileOpen={mobileOpen} />{mobileOpen && <Box className="dashboard-backdrop" onClick={() => setMobileOpen(false)} />}<Box className="dashboard-main"><Box className="dashboard-topbar"><IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuRounded /></IconButton><Select className="project-select" value={activeProject?.id ?? ''} size="small" onChange={(event) => changeProject(event.target.value)} aria-label="Select project" displayEmpty renderValue={() => activeProject ? <>{activeProject.name} <Typography component="span" color="text.secondary" fontSize={11} sx={{ ml: 1 }}>{planLabel(activeProject)}</Typography></> : <Typography component="span" color="text.secondary" fontSize={13}>{isPending ? 'Loading projects…' : 'No project'}</Typography>}>{projects.map((option) => <MenuItem value={option.id} key={option.id}>{option.name} <Typography component="span" color="text.secondary" fontSize={11} sx={{ ml: 1 }}>{planLabel(option)}</Typography></MenuItem>)}<MenuItem value="create">＋ Create project</MenuItem></Select><TextField placeholder="Search users, events, campaigns..." size="small" className="dashboard-search" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} /><Stack direction="row" alignItems="center" gap={1.5} sx={{ ml: 'auto' }}><NotificationMenu /><AccountMenu /></Stack></Box><Box component="main" className="dashboard-content">{!hideHeader && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}><Box><Typography variant="h1" className="dashboard-title">{title}</Typography><Typography color="text.secondary">{description.replace('PixlTrace', projectName)}</Typography></Box>{action}</Stack>}{children}</Box></Box><CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} /></Box>;
}
