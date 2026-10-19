"use client";

import { ReactNode, useState } from "react";
import {
  AddRounded,
  MenuRounded,
  RocketLaunchRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import CreateProjectDialog from "./CreateProjectDialog";
import DashboardSidebar from "./DashboardSidebar";
import AccountMenu from "@/components/auth/AccountMenu";
import NotificationMenu from "@/components/dashboard/NotificationMenu";

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
  const { active: activeProject, isEmpty, selectProject } = useActiveProject();

  const [createOpen, setCreateOpen] = useState(false);
  const changeProject = (value: string) => {
    value === "create"
      ? setCreateOpen(true)
      : selectProject(value);
  };

  // Only once the list has loaded and is truly empty; while loading the page renders as usual.
  const needsProject = requiresProject && isEmpty;
  // Nothing invented: the heading names the real Project, or says there is none.
  const projectName = activeProject?.name ?? (isEmpty ? "No project" : "");
  return (
    <Box className={`dashboard-app${sidebarCollapsed ? " sidebar-is-collapsed" : ""}${mobileOpen ? " mobile-navigation-open" : ""}`}>
      <DashboardSidebar
        active={active}
        setActive={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(value => !value)}
        onChangeProject={changeProject}
      />
      {mobileOpen && (
        <Box
          className="dashboard-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}
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
          ) : (
            children
          )}
        </Box>
      </Box>
      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </Box>
  );
}
