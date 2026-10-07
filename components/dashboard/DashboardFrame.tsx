"use client";

import { ReactNode, useState } from "react";
import {
  AddRounded,
  MenuRounded,
  RocketLaunchRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { useDispatch } from "react-redux";
import { setSelectedProject } from "@/lib/uiSlice";
import {
  useActiveProject,
  planLabel,
} from "@/hooks/projects/use-active-project";
import CreateProjectDialog from "./CreateProjectDialog";
import DashboardSidebar from "./DashboardSidebar";
import AccountMenu from "@/components/auth/AccountMenu";
import NotificationMenu from "@/components/dashboard/NotificationMenu";
import SearchField from "./SearchField";

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
  const dispatch = useDispatch();
  const {
    projects,
    active: activeProject,
    isEmpty,
    isPending,
  } = useActiveProject();

  const [createOpen, setCreateOpen] = useState(false);
  const changeProject = (value: string) => {
    value === "create"
      ? setCreateOpen(true)
      : dispatch(setSelectedProject(value));
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
          <Select
            className="project-select"
            value={activeProject?.id ?? ""}
            size="small"
            onChange={(event) => changeProject(event.target.value)}
            aria-label="Select project"
            displayEmpty
            renderValue={() =>
              activeProject ? (
                <>
                  {activeProject.name}{" "}
                  <Typography
                    component="span"
                    color="text.secondary"
                    fontSize={11}
                    sx={{ ml: 1 }}
                  >
                    {planLabel(activeProject)}
                  </Typography>
                </>
              ) : (
                <Typography
                  component="span"
                  color="text.secondary"
                  fontSize={13}
                >
                  {isPending ? "Loading projects…" : "No project"}
                </Typography>
              )
            }
          >
            {projects.map((option) => (
              <MenuItem value={option.id} key={option.id}>
                {option.name}{" "}
                <Typography
                  component="span"
                  color="text.secondary"
                  fontSize={11}
                  sx={{ ml: 1 }}
                >
                  {planLabel(option)}
                </Typography>
              </MenuItem>
            ))}
            <MenuItem value="create">＋ Create project</MenuItem>
          </Select>
          <SearchField placeholder="Search users, events, campaigns" sx={{ width: { xs: "42vw", sm: "min(330px, 42vw)" } }} />
          <Stack
            direction="row"
            alignItems="center"
            gap={1.5}
            sx={{ ml: "auto" }}
          >
            {/* Nothing to upgrade to once the Project is on Pro or Enterprise. */}
            {activeProject && !['pro', 'enterprise'].includes(activeProject.subscription?.plan ?? '') && <Button
              component="a"
              href="/pricing"
              startIcon={<WorkspacePremiumRounded fontSize="small" />}
              variant="outlined"
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
