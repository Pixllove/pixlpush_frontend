"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  AddRounded,
  MenuRounded,
  RocketLaunchRounded,
  SearchRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
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
    <Box className="dashboard-app">
      <DashboardSidebar
        active={active}
        setActive={() => setMobileOpen(false)}
        mobileOpen={mobileOpen}
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
          <TextField
            placeholder="Search users, events, campaigns..."
            size="small"
            className="dashboard-search"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Stack
            direction="row"
            alignItems="center"
            gap={1.5}
            sx={{ ml: "auto" }}
          >
            <Button
              component="a"
              href="/dashboard/billing"
              startIcon={<WorkspacePremiumRounded fontSize="small" />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                minHeight: 36,
                px: 1.5,
                borderRadius: 2,
                textTransform: "none",
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.1,
                color: "#fff",
                background:
                  "linear-gradient(135deg, #7132d3 0%, #9b3dd2 55%, #ee653d 100%)",
                boxShadow: "0 6px 16px rgba(113, 50, 211, 0.22)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #5f20c2 0%, #8730bf 55%, #df5731 100%)",
                  boxShadow: "0 8px 20px rgba(113, 50, 211, 0.3)",
                },
              }}
            >
              Upgrade to Pro
            </Button>
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
            <Box
              role="status"
              sx={{
                position: "relative",
                overflow: "hidden",
                display: "grid",
                justifyItems: "center",
                textAlign: "center",
                px: { xs: 2.5, sm: 6 },
                py: { xs: 6, sm: 9 },
                borderRadius: "20px",
                border: "1px solid #ece6f5",
                bgcolor: "#fff",
                backgroundImage:
                  "radial-gradient(520px 220px at 50% 0%, rgba(113,50,211,.10), transparent 70%), radial-gradient(360px 180px at 85% 100%, rgba(238,101,61,.08), transparent 70%)",
                boxShadow: "0 18px 50px rgba(44,16,58,.06)",
              }}
            >
              <Box
                sx={{
                  width: 72,
                  height: 72,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "22px",
                  color: "#fff",
                  background: "linear-gradient(135deg, #7132d3 0%, #9b3dd2 55%, #ee653d 100%)",
                  boxShadow: "0 14px 30px rgba(113,50,211,.28)",
                }}
              >
                <RocketLaunchRounded sx={{ fontSize: 34 }} />
              </Box>
              <Typography sx={{ mt: 3, fontSize: { xs: 22, sm: 28 }, fontWeight: 800, color: "#1d1230", letterSpacing: "-.01em" }}>
                Create a project to use {active}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 520, fontSize: 15, lineHeight: 1.7 }}>
                Users, emails, push notifications and journeys all live inside a project. Create your first one
                and this page is ready to use.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddRounded />}
                onClick={() => setCreateOpen(true)}
                sx={{ mt: 3.5, minHeight: 46, px: 3, borderRadius: "999px", textTransform: "none", fontSize: 15, fontWeight: 800 }}
              >
                Create project
              </Button>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                gap={{ xs: 1, sm: 3 }}
                sx={{ mt: 4, color: "#6b5f80", fontSize: 13, fontWeight: 600 }}
              >
                {["Name your project", "Connect your app", "Start engaging users"].map((step, index) => (
                  <Stack key={step} direction="row" alignItems="center" gap={1}>
                    <Box sx={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: "50%", fontSize: 11, fontWeight: 800, color: "#7132d3", bgcolor: "#f0e8ff" }}>
                      {index + 1}
                    </Box>
                    {step}
                  </Stack>
                ))}
              </Stack>
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
