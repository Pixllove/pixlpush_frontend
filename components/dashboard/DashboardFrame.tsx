"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  AddRounded,
  ArrowForwardRounded,
  MenuRounded,
  RocketLaunchRounded,
  WarningAmberRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import DashboardSidebar from "./DashboardSidebar";
import AccountMenu from "@/components/auth/AccountMenu";
import NotificationMenu from "@/components/dashboard/NotificationMenu";
import SupportChatWidget from "@/components/website/SupportChatWidget";
import CreateProjectDialog from './CreateProjectDialog';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { firebaseApi, onboardingApi } from '@/lib/projects/api';
import { onboardingPercentage } from '@/lib/onboarding';
import { supportApi } from '@/lib/support/api';

export default function DashboardFrame({
  active,
  title,
  description,
  action,
  hideHeader = false,
  requiresProject = false,
  children,
}: {
  /** The page works on a Project's data: with no Project it shows a prompt to create one instead. */
  requiresProject?: boolean;
  active: string;
  title: string;
  description: string;
  action?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportTicketId, setSupportTicketId] = useState<string | null>(null);
  const [supportUnread, setSupportUnread] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [appealDetails, setAppealDetails] = useState('');
  const [appealFormOpen, setAppealFormOpen] = useState(false);
  const [appealSending, setAppealSending] = useState(false);
  const [appealError, setAppealError] = useState('');
  const [appealReference, setAppealReference] = useState('');
  const { projects, active: activeProject, isEmpty, selectProject } = useActiveProject();
  const { data: currentUser, isPending: userPending } = useCurrentUser();
  useEffect(() => {
    setAppealFormOpen(false);
    setAppealDetails(''); setAppealError(''); setAppealReference('');
  }, [active, activeProject?.id, activeProject?.status, requiresProject]);
  useEffect(() => {
    const openSupportChat = (event: Event) => {
      const ticketId = (event as CustomEvent<{ ticketId?: unknown }>).detail?.ticketId;
      if (typeof ticketId !== 'string' || !ticketId) return;
      setSupportTicketId(ticketId);
      setSupportOpen(true);
    };
    window.addEventListener('pixlpush:open-support-chat', openSupportChat);
    return () => window.removeEventListener('pixlpush:open-support-chat', openSupportChat);
  }, []);
  const onboarding = useQuery({
    queryKey: ['projects', activeProject?.id, 'onboarding'],
    queryFn: () => onboardingApi.get(activeProject!.id),
    enabled: Boolean(activeProject?.id) && activeProject?.status === 'active',
    staleTime: 30_000,
  });
  const firebase = useQuery({
    queryKey: ['projects', activeProject?.id, 'firebase'],
    queryFn: () => firebaseApi.get(activeProject!.id),
    enabled: Boolean(activeProject?.id) && activeProject?.status === 'active',
    staleTime: 30_000,
  });

  const router = useRouter();
  useEffect(() => {
    if (active !== 'Home' || !isEmpty || userPending || currentUser?.onboardingSkipped) return;
    router.replace('/onboarding');
  }, [active, currentUser?.onboardingSkipped, isEmpty, router, userPending]);
  const changeProject = (value: string) => {
    value === "create"
      ? setCreateOpen(true)
      : selectProject(value);
  };
  const sendProjectAppeal = async () => {
    if (!activeProject || appealDetails.trim().length < 10 || appealSending || appealReference) return;
    setAppealSending(true); setAppealError('');
    try {
      const result = await supportApi.create({
        topic: 'account_access',
        subject: 'Project suspension appeal',
        projectId: activeProject.id,
        source: 'dashboard',
        message: `I believe the suspension of project “${activeProject.name}” may be a mistake. Please review it.\n\nReason shown: ${activeProject.suspensionReason || 'No reason was provided.'}\n\nMy appeal: ${appealDetails.trim()}`,
      });
      setAppealReference(result.ticket.reference);
    } catch (cause) {
      setAppealError(cause instanceof Error ? cause.message : 'We could not send your appeal. Please try again.');
    } finally { setAppealSending(false); }
  };

  // Only once the list has loaded and is truly empty; while loading the page renders as usual.
  const needsProject = requiresProject && isEmpty;
  const onboardingPercent = activeProject && onboarding.data && !onboarding.isPending && !firebase.isPending
    ? onboardingPercentage(
      { ...onboarding.data, completed: Array.from(new Set([1, ...onboarding.data.completed])) },
      firebase.data?.status === 'connected',
    )
    : null;
  const showOnboardingWarning = activeProject?.status !== 'suspended' && active !== 'Onboarding Guide' && onboardingPercent !== null && onboardingPercent < 100;
  // Nothing invented: the heading names the real Project, or says there is none.
  const projectName = activeProject?.name ?? (isEmpty ? "No project" : "");
  return (
    <>
    <Box className={`dashboard-app${sidebarCollapsed ? " sidebar-is-collapsed" : ""}${mobileOpen ? " mobile-navigation-open" : ""}`}>
      {mobileOpen && (
        <Box
          className="dashboard-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <DashboardSidebar
        active={supportOpen ? 'Contact support' : active}
        setActive={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(value => !value)}
        onChangeProject={changeProject}
        onOpenSupport={() => setSupportOpen(true)}
        onCloseSupport={() => setSupportOpen(false)}
        supportUnread={supportUnread}
      />
      <Box className="dashboard-main">
        <Box className="dashboard-topbar">
          <IconButton
            className="dashboard-mobile-menu"
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuRounded />
          </IconButton>
          {/* <SearchField placeholder="Search users, events, campaigns" sx={{ width: { xs: "42vw", sm: "min(330px, 42vw)" } }} /> */}
          <Stack
            direction="row"
            alignItems="center"
            gap={1.5}
            sx={{ ml: "auto" }}
          >
            {/* Nothing to upgrade to once the Project is on Pro or Enterprise. */}
            {activeProject && !['pro', 'enterprise'].includes(activeProject.subscription?.plan ?? '') && <Button
              href="/pricing"
              className="upgrade-pro-button"
              startIcon={<WorkspacePremiumRounded fontSize="small" />}
              variant="contained"
              size="small"
              sx={{ display: { xs: "none", sm: "inline-flex" }, whiteSpace: "nowrap" }}
            >
              Upgrade to Pro
            </Button>}
            <NotificationMenu />
            <AccountMenu />
          </Stack>
        </Box>
        <Box component="main" className="dashboard-content">
          {activeProject?.status === "deactivated" && (
            <Alert
              severity="warning"
              variant="standard"
              sx={{
                mb: 2.5,
                border: "1px solid",
                borderColor: "warning.light",
                borderRadius: 2,
                alignItems: "center",
                "& .MuiAlert-message": { width: "100%" },
              }}
            >
              <Typography component="span" fontWeight={600}>
                {projectName} is deactivated.
              </Typography>{" "}
              This project is currently read-only. Restore it from Project Settings
              before using project features again.
            </Alert>
          )}
          {showOnboardingWarning && (
            <Alert
              severity="warning"
              variant="standard"
              icon={<WarningAmberRounded />}
              action={
                <Button
                  component={Link}
                  href="/dashboard/onboarding"
                  color="inherit"
                  size="small"
                  endIcon={<ArrowForwardRounded fontSize="small" />}
                  sx={{ whiteSpace: "nowrap", fontWeight: 700 }}
                >
                  Complete setup
                </Button>
              }
              sx={{
                mb: 2.5,
                border: "1px solid",
                borderColor: "warning.light",
                borderRadius: 2,
                alignItems: "center",
                "& .MuiAlert-message": { flex: 1 },
              }}
            >
              <Typography component="span" fontWeight={600}>
                Onboarding is {onboardingPercent}% complete.
              </Typography>{" "}
              Finish your setup to get the most out of PixlPush.
            </Alert>
          )}
          {!hideHeader && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              gap={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography variant="h1" className="dashboard-title">
                  {title}
                </Typography>
                <Typography color="text.secondary">
                  {description.replace("PixlTrace", projectName)}
                </Typography>
              </Box>
              {!needsProject && action}
            </Stack>
          )}
          {needsProject ? (
            <Box role="status" className="project-empty">
              <span className="project-empty-badge">No project yet</span>
              <div className="project-empty-icon">
                <RocketLaunchRounded />
              </div>
              <h2 className="project-empty-title">
                Create a project to start using <span>{active}</span>
              </h2>
              <p className="project-empty-text">
                Users, emails, push notifications and journeys all live inside a project. Create your first one
                and this page is ready to use.
              </p>
              <Button className="project-empty-cta" startIcon={<AddRounded />} onClick={() => setCreateOpen(true)}>
                Create project
              </Button>
              <div className="project-empty-note">Takes less than a minute</div>
              <div className="project-empty-steps">
                {[
                  ["Name your project", "One project per app or brand."],
                  ["Connect your app", "Add the SDK or import your users."],
                  ["Start engaging", "Send emails, push and journeys."],
                ].map(([step, detail], index) => (
                  <div className="project-empty-step" key={step}>
                    <b>{index + 1}</b>
                    <strong>{step}</strong>
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </Box>
          ) : activeProject?.status === 'suspended' && requiresProject ? (
            <Box component="section" aria-labelledby="project-suspended-title" sx={{ width: '100%', maxWidth: 820, mx: 'auto', border: '1px solid #e9e2f1', borderRadius: 4, bgcolor: 'background.paper', overflow: 'hidden', boxShadow: '0 18px 55px rgba(37, 19, 55, .07)' }}>
              <Box sx={{ p: { xs: 2.5, sm: 4 }, background: 'linear-gradient(120deg, #faf7ff 0%, #fffaf3 100%)', borderBottom: '1px solid #eee7f3' }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Box sx={{ width: 54, height: 54, borderRadius: 3, display: 'grid', placeItems: 'center', flexShrink: 0, color: '#a85b12', bgcolor: '#fff0d8', border: '1px solid #f4d7a8' }}>
                    <WarningAmberRounded sx={{ fontSize: 28 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: .75 }}>
                      <Typography component="span" sx={{ color: 'primary.main', fontSize: 12, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }}>Project status</Typography>
                      <Box component="span" sx={{ px: 1, py: .25, borderRadius: 99, color: '#9a5412', bgcolor: '#fff0d8', fontSize: 11, fontWeight: 700 }}>Suspended</Box>
                    </Stack>
                    <Typography id="project-suspended-title" variant="h2" sx={{ fontWeight: 750, fontSize: { xs: 25, sm: 30 }, letterSpacing: '-.025em' }}>This project is suspended</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 650, lineHeight: 1.7 }}>
                      Your PixlPush account is still available, but this project’s workspace is paused. Its campaigns and automated journeys are stopped while the suspension is in place.
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={{ mt: 3, p: { xs: 2, sm: 2.25 }, display: 'flex', gap: 1.5, alignItems: 'flex-start', border: '1px solid #f0d49e', borderRadius: 2.5, bgcolor: '#fff8e9' }}>
                  <WarningAmberRounded sx={{ mt: .1, color: '#ad651b', flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ color: '#81440f', fontSize: 13, fontWeight: 750 }}>Reason for suspension</Typography>
                    <Typography sx={{ mt: .35, color: '#754c27', lineHeight: 1.6 }}>{activeProject.suspensionReason || 'No reason was provided. You can ask our team to review this decision.'}</Typography>
                  </Box>
                </Box>

                <Typography color="text.secondary" sx={{ mt: 2, fontSize: 13, lineHeight: 1.6 }}>
                  Think this may be a mistake? Send a review request and our support team will follow up by email.
                </Typography>
              </Box>

              <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
                {appealReference ? (
                  <Alert severity="success" sx={{ borderRadius: 2.5, '& .MuiAlert-message': { lineHeight: 1.6 } }}>
                    <strong>Review request received.</strong> Our support team will follow up by email. Reference: <strong>{appealReference}</strong>
                  </Alert>
                ) : (
                  <>
                    {appealFormOpen ? (
                      <Box component="form" onSubmit={(event) => { event.preventDefault(); void sendProjectAppeal(); }}>
                        <Typography variant="h3" sx={{ fontWeight: 700, fontSize: 18 }}>Tell us why you think this is a mistake</Typography>
                        <Typography color="text.secondary" sx={{ mt: .5, mb: 2, fontSize: 13, lineHeight: 1.6 }}>
                          Share a few details so our team can review the project and get back to you.
                        </Typography>
                        <TextField
                          id="project-appeal-message"
                          multiline
                          minRows={4}
                          fullWidth
                          label="Your message"
                          placeholder="Explain what happened and why you’re asking us to review the suspension."
                          value={appealDetails}
                          onChange={(event) => { setAppealDetails(event.target.value); setAppealError(''); }}
                          helperText={`${appealDetails.trim().length}/10 characters minimum`}
                          inputProps={{ maxLength: 5000, 'aria-describedby': 'project-appeal-message-helper-text' }}
                        />
                        {appealError && <Alert severity="error" role="alert" sx={{ mt: 2, borderRadius: 2 }}>{appealError}</Alert>}
                        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} justifyContent="flex-end" spacing={1.25} sx={{ mt: 2.5 }}>
                          <Button variant="text" onClick={() => { setAppealFormOpen(false); setAppealDetails(''); setAppealError(''); }} disabled={appealSending}>Cancel</Button>
                          <Button type="submit" variant="contained" disabled={appealSending || appealDetails.trim().length < 10} startIcon={appealSending ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardRounded />} aria-busy={appealSending} sx={{ minHeight: 42, px: 2.25, borderRadius: 2.25, boxShadow: '0 7px 18px rgba(85,23,184,.2)' }}>
                            {appealSending ? 'Sending…' : 'Send review request'}
                          </Button>
                        </Stack>
                      </Box>
                    ) : (
                      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2}>
                        <Box sx={{ maxWidth: 430 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Request a review</Typography>
                          <Typography color="text.secondary" sx={{ mt: .35, fontSize: 13, lineHeight: 1.55 }}>Tell us what happened. We’ll review your request and contact you by email.</Typography>
                        </Box>
                        <Button variant="contained" onClick={() => setAppealFormOpen(true)} endIcon={<ArrowForwardRounded />} sx={{ minHeight: 44, px: 2.25, borderRadius: 2.25, whiteSpace: 'nowrap', boxShadow: '0 7px 18px rgba(85,23,184,.2)' }}>
                          Appeal this suspension
                        </Button>
                      </Stack>
                    )}
                  </>
                )}
              </Box>
            </Box>
          ) : (
            children
          )}
        </Box>
      </Box>
    </Box>
    <CreateProjectDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    <SupportChatWidget
      showLauncher={false}
      isOpen={supportOpen}
      onClose={() => { setSupportOpen(false); setSupportTicketId(null); }}
      openTicketId={supportTicketId}
      onUnreadChange={setSupportUnread}
      projectId={activeProject?.id}
      projects={projects.map((project) => ({ id: project.id, name: project.name }))}
      authenticated={Boolean(currentUser?.account)}
    />
    </>
  );
}
