"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AddRounded,
  ArrowForwardRounded,
  SearchRounded,
  WebhookRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SettingsStatus from "@/components/dashboard/SettingsStatus";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { useIntegrations } from "@/hooks/projects/use-project-settings";
import {
  INTEGRATIONS,
  integrationStatus,
  type Integration,
  type IntegrationStatus,
} from "./registry";

/** The whole card is one link (like OneSignal or MailerLite): hover, focus and click anywhere. */
function HubCard({
  href,
  name,
  category,
  summary,
  logo,
  status,
}: {
  href: string;
  name: string;
  category: string;
  summary: string;
  logo: React.ReactNode;
  status: IntegrationStatus;
}) {
  return (
    <Card
      component={Link}
      href={href}
      aria-label={`${status ? "Manage" : "Connect"} ${name}`}
      className="integration-card"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        color: "inherit",
        textDecoration: "none",
        cursor: "pointer",
        transition:
          "border-color .15s ease, box-shadow .15s ease, transform .15s ease",
        "&:hover": {
          borderColor: "primary.main",
          boxShadow: "0 6px 20px rgba(85, 23, 184, 0.10)",
          transform: "translateY(-2px)",
        },
        "&:hover .hub-card-cta": { gap: 1 },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
        "@media (prefers-reduced-motion: reduce)": {
          transition: "none",
          "&:hover": { transform: "none" },
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        gap={1}
      >
        {logo}
        {status ? (
          <SettingsStatus tone={status.tone}>{status.label}</SettingsStatus>
        ) : (
          <Chip size="small" variant="outlined" label="Not connected" />
        )}
      </Stack>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography fontWeight={700} fontSize="var(--fs-14)">
            {name}
          </Typography>
          <Chip size="small" label={category} className="neutral-chip" />
        </Stack>
        <Typography
          color="text.secondary"
          fontSize="var(--fs-12)"
          sx={{ mt: 0.75 }}
        >
          {summary}
        </Typography>
      </Box>
      {/* Visual call to action only: the card itself is the link. */}
      <Button
        component="span"
        tabIndex={-1}
        className="hub-card-cta"
        variant={status ? "outlined" : "contained"}
        endIcon={<ArrowForwardRounded />}
        sx={{ alignSelf: "flex-start", pointerEvents: "none" }}
      >
        {status ? "Manage" : "Connect"}
      </Button>
    </Card>
  );
}

function IntegrationCard({
  integration,
  status,
}: {
  integration: Integration;
  status: IntegrationStatus;
}) {
  const { name, category, summary, href, Logo } = integration;
  return (
    <HubCard
      href={href}
      name={name}
      category={category}
      summary={summary}
      logo={<Logo />}
      status={status}
    />
  );
}

const WEBHOOK_SUMMARY =
  "Connect your backend with its URL and token. PixlPush syncs users, subscription statuses, and events every 2 minutes.";

function WebhookCard({ status }: { status: IntegrationStatus }) {
  return (
    <HubCard
      href="/dashboard/integrations/webhook"
      name="Webhook"
      category="Server"
      summary={WEBHOOK_SUMMARY}
      logo={
        <Box className="integration-icon">
          <WebhookRounded />
        </Box>
      }
      status={status}
    />
  );
}

/** Integration directory, grouped by category like OneSignal's and MailerLite's. */
export default function IntegrationsHub() {
  const [search, setSearch] = useState("");
  // Every integration's status in one request.
  const { active } = useActiveProject();
  const settings = useIntegrations(active?.id).data;
  const statusOf = (id: string) =>
    integrationStatus(settings?.find((s) => s.provider === id));
  const q = search.trim().toLowerCase();
  const shown = INTEGRATIONS.filter(
    (i) =>
      !q || `${i.name} ${i.category} ${i.summary}`.toLowerCase().includes(q),
  );
  const categories = [...new Set(shown.map((i) => i.category))];
  const showWebhook =
    !q ||
    `webhook server sync api ${WEBHOOK_SUMMARY}`.toLowerCase().includes(q);

  return (
    <Stack gap={3}>
      <TextField
        size="small"
        placeholder="Search integrations"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 360 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      {categories.map((category) => (
        <Box key={category}>
          <Typography
            fontWeight={700}
            fontSize="var(--fs-13)"
            color="text.secondary"
            sx={{
              mb: 1.5,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {category}
          </Typography>
          <Grid container spacing={2}>
            {shown
              .filter((i) => i.category === category)
              .map((i) => (
                <Grid item xs={12} sm={6} lg={4} key={i.id}>
                  <IntegrationCard integration={i} status={statusOf(i.id)} />
                </Grid>
              ))}
          </Grid>
        </Box>
      ))}
      {showWebhook && (
        <Box>
          <Typography
            fontWeight={700}
            fontSize="var(--fs-13)"
            color="text.secondary"
            sx={{
              mb: 1.5,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Server
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} lg={4}>
              <WebhookCard status={statusOf("webhook")} />
            </Grid>
          </Grid>
        </Box>
      )}
      {!shown.length && !showWebhook && (
        <Typography color="text.secondary" fontSize="var(--fs-13)">
          No integration matches “{search}”.
        </Typography>
      )}
      <Card className="saas-card" sx={{ borderStyle: "dashed" }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          gap={2}
        >
          <Box className="integration-icon">
            <AddRounded />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={700} fontSize="var(--fs-14)">
              Missing an integration?
            </Typography>
            <Typography color="text.secondary" fontSize="var(--fs-12)">
              Tell us which tool you want PixlPush to connect to next.
            </Typography>
          </Box>
          <Button component={Link} href="/dashboard/roadmap" variant="outlined">
            Request an integration
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
