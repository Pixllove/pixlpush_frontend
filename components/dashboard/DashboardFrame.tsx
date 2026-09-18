'use client';

import { ReactNode, useEffect, useState } from 'react';
import { KeyboardArrowDownRounded, MenuRounded, NotificationsNoneRounded, SearchRounded } from '@mui/icons-material';
import { Avatar, Box, IconButton, InputAdornment, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { projects, ProjectId } from '@/lib/projects';
import { setSelectedProject } from '@/lib/uiSlice';
import DashboardSidebar from './DashboardSidebar';

const ChevronDownRounded = KeyboardArrowDownRounded;

export default function DashboardFrame({ active, title, description, action, children }: { active: string; title: string; description: string; action?: ReactNode; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const selectedProject = useSelector((state: RootState) => state.ui.selectedProject);
  const project = projects[selectedProject];
  useEffect(() => { const saved = window.localStorage.getItem('pixlpush:selectedProject'); if (saved && saved in projects) dispatch(setSelectedProject(saved as ProjectId)); }, [dispatch]);
  useEffect(() => { window.localStorage.setItem('pixlpush:selectedProject', selectedProject); }, [selectedProject]);
  const changeProject = (value: string) => { if (value in projects) dispatch(setSelectedProject(value as ProjectId)); };
  return <Box className="dashboard-app"><DashboardSidebar active={active} setActive={() => setMobileOpen(false)} mobileOpen={mobileOpen} />{mobileOpen && <Box className="dashboard-backdrop" onClick={() => setMobileOpen(false)} />}<Box className="dashboard-main"><Box className="dashboard-topbar"><IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuRounded /></IconButton><Select className="project-select" value={selectedProject} size="small" onChange={(event) => changeProject(event.target.value)} aria-label="Select project"><MenuItem value="PixlTrace">PixlTrace <Typography component="span" color="text.secondary" fontSize={11} sx={{ ml: 1 }}>Pro project</Typography></MenuItem><MenuItem value="PixlLove">PixlLove <Typography component="span" color="text.secondary" fontSize={11} sx={{ ml: 1 }}>Internal</Typography></MenuItem><MenuItem value="create" disabled>＋ Create project</MenuItem></Select><TextField placeholder="Search users, events, campaigns..." size="small" className="dashboard-search" InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} /><Stack direction="row" alignItems="center" gap={1.5} sx={{ ml: 'auto' }}><IconButton><NotificationsNoneRounded /></IconButton><Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#ff5d6c,#7928ef)' }}>H</Avatar><IconButton size="small"><ChevronDownRounded /></IconButton></Stack></Box><Box component="main" className="dashboard-content"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}><Box><Typography variant="h1" className="dashboard-title">{title}</Typography><Typography color="text.secondary">{description.replace('PixlTrace', project.name)}</Typography></Box>{action}</Stack>{children}</Box></Box></Box>;
}
