"use client";

import { useEffect, useState } from "react";
import {
  AutoAwesomeRounded,
  BugReportRounded,
  CheckRounded,
  ContentCopyRounded,
  DataObjectRounded,
  EmailRounded,
  GroupsRounded,
  LockRounded,
  NotificationsActiveRounded,
  OpenInNewRounded,
  SecurityRounded,
  SpeedRounded,
  TerminalRounded,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { useActiveProject } from "@/hooks/projects/use-active-project";

const sdkInstall = `npm install @pixlpush/react`;
const sdkSetup = `import { PixlPush } from "@pixlpush/react";

PixlPush.initialize({
  projectId: "YOUR_PROJECT_ID",
  publicKey: "YOUR_PUBLIC_SDK_KEY",
  environment: "production",
});

PixlPush.identify({
  userId: "customer_123",
  email: "customer@example.com",
  name: "Alex Morgan",
  plan: "pro",
});`;
const eventSetup = `PixlPush.track("purchase_completed", {
  orderId: "order_123",
  value: 149.00,
  currency: "USD",
  plan: "pro",
});`;
const consentSetup = `PixlPush.updateConsent({
  email: true,
  push: true,
});

PixlPush.reset(); // call on logout`;
const aiPrompt = `You are integrating PixlPush into a production React application. Build a complete, maintainable integration for behavioral analytics, lifecycle segmentation, audience management, email marketing, and push notifications.

PRODUCT CONTEXT
PixlPush turns product behavior into retention. It receives identified users and product events, then uses those signals to power lifecycle segments, audience groups, email campaigns, and push notification journeys.

PROJECT CONFIGURATION
Project ID: YOUR_PROJECT_ID
Public SDK key: YOUR_PUBLIC_SDK_KEY
Environment: production

IMPLEMENTATION REQUIREMENTS
1. Install and initialize the React SDK once at the application entry point. Do not initialize it on every render.
2. Read the Project ID and public key from environment variables or the app configuration layer. Never hard-code private credentials.
3. After a successful login or signup, identify the user with a stable customer ID. Include email, name, company, plan, locale, timezone, and consent fields when available.
4. Reset the identity on logout so events from different users cannot be merged.
5. Track meaningful events only once per user action. Add a small event helper with consistent names and typed payloads.
6. Start with these events: sign_up, login, onboarding_started, onboarding_completed, profile_completed, feature_used, search_performed, content_viewed, checkout_started, purchase_completed, subscription_started, subscription_canceled, payment_failed, notification_opened, email_opened, and push_opened.
7. Include useful properties such as plan, source, feature, orderId, value, currency, campaignId, notificationId, and occurredAt. Do not send passwords, access tokens, payment card data, or sensitive personal data.
8. Respect email consent, push permission, regional privacy requirements, and user deletion requests before using a channel for marketing.
9. Add loading, retry, and failure handling around SDK calls. Log actionable errors in development without exposing user data.
10. Make the integration resilient to React Strict Mode, route changes, duplicate browser tabs, and offline recovery.

REFERENCE SETUP
import { PixlPush } from "@pixlpush/react";

PixlPush.initialize({
  projectId: process.env.REACT_APP_PIXLPUSH_PROJECT_ID,
  publicKey: process.env.REACT_APP_PIXLPUSH_PUBLIC_KEY,
  environment: "production",
});

PixlPush.identify({
  userId: user.id,
  email: user.email,
  name: user.name,
  company: user.company,
  plan: user.plan,
  locale: user.locale,
  timezone: user.timezone,
  emailConsent: user.emailConsent,
});

PixlPush.track("onboarding_completed", {
  plan: user.plan,
  source: "product_signup",
});

CHANNEL AND CAMPAIGN BEHAVIOR
Keep analytics and messaging concerns separate. Analytics events should describe what the customer did. Email and push campaigns should be configured in PixlPush using lifecycle segments and audience groups, for example: new users who have not completed onboarding, active trial users, paid customers, or users who abandoned checkout. Include unsubscribe and notification-permission handling in the product UI.

DELIVERABLES
- Add the SDK dependency and environment variable documentation.
- Add one initialization module and one typed tracking helper.
- Add identify and reset calls to authentication boundaries.
- Add event calls to the key product flows listed above.
- Add tests proving initialization happens once and duplicate events are prevented.
- Add a short README table documenting every event, when it fires, and its payload properties.
- Explain how to verify events in the PixlPush dashboard and how to rotate a public SDK key safely.

Before finishing, show the files changed, list the event names implemented, and call out any backend or server-side work that is still required.`;

function CodeBlock({
  code,
  label,
  onCopy,
}: {
  code: string;
  label: string;
  onCopy: () => void;
}) {
  return (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: 1.5,
        bgcolor: "#211331",
        border: "1px solid rgba(255,210,112,.22)",
        boxShadow: "0 12px 24px rgba(30,15,44,.12)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 1.7,
          py: 0.9,
          bgcolor: "rgba(255,206,99,.08)",
          borderBottom: "1px solid rgba(255,210,112,.14)",
        }}
      >
        <Typography
          fontSize={11}
          fontWeight={900}
          letterSpacing={1.2}
          color="#ffd36a"
        >
          {label}
        </Typography>
        <Button
          size="small"
          onClick={onCopy}
          startIcon={<ContentCopyRounded fontSize="small" />}
          sx={{
            minWidth: 0,
            color: "#ffd36a",
            textTransform: "none",
            fontWeight: 800,
          }}
        >
          Copy
        </Button>
      </Stack>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.6,
          overflow: "auto",
          color: "#ffe3a0",
          fontFamily: "monospace",
          fontSize: 12,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {code}
      </Box>
    </Box>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  icon: Icon,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon: typeof DataObjectRounded;
  dark?: boolean;
}) {
  return (
    <Stack direction="row" gap={1.4} alignItems="flex-start">
      <Box
        sx={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          borderRadius: 1,
          bgcolor: dark ? "rgba(255,211,106,.14)" : "#efe5ff",
          color: dark ? "#ffd36a" : "#7132d3",
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box>
        {eyebrow && (
          <Typography
            color={dark ? "#ffd36a" : "#7132d3"}
            fontSize={10}
            fontWeight={900}
            letterSpacing={1.4}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          variant="h3"
          sx={{
            mt: eyebrow ? 0.2 : 0,
            color: dark ? "#fff" : undefined,
            fontSize: { xs: 21, md: 25 },
            lineHeight: 1.2,
            fontWeight: 850,
          }}
        >
          {title}
        </Typography>
        <Typography
          color={dark ? "rgba(255,255,255,.68)" : "text.secondary"}
          fontSize={13}
          sx={{ mt: 0.6, lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function IntegrationDocumentation() {
  const { active } = useActiveProject();
  const [copied, setCopied] = useState<string>();
  const [activeStep, setActiveStep] = useState("install");
  const projectId = active?.id ?? "YOUR_PROJECT_ID";
  useEffect(() => {
    const sections = ["install", "measure", "activate", "brief"]
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const updateActiveStep = () => {
      const marker = window.scrollY + window.innerHeight * 0.3;
      let current = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top + window.scrollY <= marker) {
          current = section;
        }
      });
      setActiveStep((previous) => previous === current.id ? previous : current.id);
    };

    updateActiveStep();
    window.addEventListener("scroll", updateActiveStep, { passive: true });
    window.addEventListener("resize", updateActiveStep);
    return () => {
      window.removeEventListener("scroll", updateActiveStep);
      window.removeEventListener("resize", updateActiveStep);
    };
  }, []);
  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(
      value.replaceAll("YOUR_PROJECT_ID", projectId),
    );
    setCopied(label);
    window.setTimeout(() => setCopied(undefined), 1800);
  };
  const eventRows = [
    ["sign_up", "Account created", "New user"],
    ["onboarding_completed", "Setup finished", "Activated"],
    ["feature_used", "Core feature used", "Engaged"],
    ["checkout_started", "Checkout opened", "Purchase intent"],
    ["purchase_completed", "Payment completed", "Paid customer"],
    ["subscription_canceled", "Subscription ended", "At risk"],
  ];
  return (
    <Stack
      gap={{ xs: 2.5, md: 3 }}
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "238px minmax(0, 1fr)" },
        alignItems: "start",
        columnGap: { xs: 0, lg: 3 },
        rowGap: { xs: 2.5, lg: 3 },
        "& > .integration-rail": {
          gridColumn: "1",
          gridRow: { xs: "auto", lg: "1 / -1" },
          position: { xs: "static", lg: "sticky" },
          top: { lg: 24 },
        },
        "& > *:not(.integration-rail)": {
          gridColumn: "2",
          "@media (max-width: 1199px)": { gridColumn: "1" },
        },
        "& .MuiCard-root": {
          borderRadius: "16px !important",
          borderColor: "#e4d9ef",
          boxShadow: "0 12px 30px rgba(44,24,69,.055)",
        },
        "& .integration-code-block": { borderRadius: "12px !important" },
        "& .integration-main .MuiTypography-body1": { fontSize: "14px" },
      }}
    >
      <Card
        className="integration-rail"
        sx={{
          p: 2,
          border: "1px solid #dfd2ed",
          background: "linear-gradient(180deg,#211331 0%,#35205a 100%) !important",
          color: "#fff",
          boxShadow: "0 16px 34px rgba(38,19,60,.16) !important",
        }}
      >
        <Typography fontSize={10} fontWeight={900} letterSpacing={1.4} color="#c9a8ff">
          INTEGRATION WORKSPACE
        </Typography>
        <Typography fontSize={21} fontWeight={900} sx={{ mt: 0.7, letterSpacing: "-.03em" }}>
          Get connected
        </Typography>
        <Typography fontSize={12} lineHeight={1.55} sx={{ mt: 0.7, color: "rgba(255,255,255,.68)" }}>
          A guided path for installing the SDK, sending reliable events, and activating campaigns.
        </Typography>
        <Divider sx={{ my: 2, borderColor: "rgba(255,255,255,.14)" }} />
        <Stack gap={0.7}>
          {[
            ["01", "Install SDK", "Connect your project", "#install"],
            ["02", "Track events", "Measure behavior", "#measure"],
            ["03", "Activate", "Build audiences", "#activate"],
            ["04", "Ship safely", "Review the brief", "#brief"],
          ].map(([number, label, detail, href]) => {
            const isActiveStep = activeStep === href.slice(1);
            return (
              <Button
                key={number}
                href={href}
                onClick={() => setActiveStep(href.slice(1))}
                sx={{
                  p: 1,
                  minHeight: 56,
                  gap: 1,
                  justifyContent: "flex-start",
                  alignItems: "center",
                  borderRadius: 1.5,
                  color: "#fff",
                  textTransform: "none",
                  textAlign: "left",
                  backgroundColor: isActiveStep ? "rgba(255,255,255,.16)" : "transparent",
                  boxShadow: isActiveStep ? "inset 0 0 0 1px rgba(255,255,255,.12)" : "none",
                  "&:hover": { backgroundColor: "rgba(255,255,255,.1)" },
                }}
              >
                <Box
                  sx={{
                    width: 29,
                    height: 29,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    color: isActiveStep ? "#fff" : "#dcc8ff",
                    backgroundColor: isActiveStep ? "#7132d3" : "rgba(255,255,255,.1)",
                    fontSize: 10,
                    fontWeight: 900,
                  }}
                >
                  {number}
                </Box>
                <Box>
                  <Typography fontSize={12} fontWeight={900}>{label}</Typography>
                  <Typography fontSize={10} sx={{ mt: 0.15, color: "rgba(255,255,255,.58)" }}>{detail}</Typography>
                </Box>
              </Button>
            );
          })}
        </Stack>
        <Box sx={{ mt: 2, p: 1.25, borderRadius: 1.5, backgroundColor: "rgba(255,255,255,.08)" }}>
          <Stack direction="row" alignItems="center" gap={0.8}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#7ee49b", boxShadow: "0 0 0 4px rgba(126,228,155,.12)" }} />
            <Typography fontSize={11} fontWeight={800}>Guide ready</Typography>
          </Stack>
          <Typography fontSize={10} sx={{ mt: 0.7, color: "rgba(255,255,255,.58)" }}>
            Public SDK key only · safe for client apps
          </Typography>
        </Box>
      </Card>
      <Stack className="integration-main" gap={{ xs: 2.5, md: 3 }}>
      {copied && (
        <Alert
          severity="success"
          icon={<CheckRounded />}
          onClose={() => setCopied(undefined)}
        >
          {copied} copied to clipboard.
        </Alert>
      )}
      <Card
        sx={{
          p: { xs: 2.75, md: 4.5 },
          minHeight: { md: 320 },
          border: "0 !important",
          color: "#fff",
          background: "radial-gradient(circle at 86% 12%,rgba(190,108,255,.32),transparent 28%), linear-gradient(118deg,#20112f 0%,#422071 55%,#7028c8 100%) !important",
          boxShadow: "0 22px 46px rgba(52,24,86,.2) !important",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          justifyContent="space-between"
          gap={4}
        >
          <Box sx={{ maxWidth: 720 }}>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
              <Chip
                label="PIXLPUSH INTEGRATION GUIDE"
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,.14)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              />
              <Chip
                label="React + React Native"
                size="small"
                variant="outlined"
                sx={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,.82)", borderColor: "rgba(255,255,255,.35)" }}
              />
            </Stack>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 31, md: 44 },
                lineHeight: 1.08,
                fontWeight: 850,
                maxWidth: 690,
              }}
            >
              From first event to loyal customer.
            </Typography>
            <Typography
              color="rgba(255,255,255,.78)"
              fontSize={14}
              sx={{ mt: 1.35, maxWidth: 650, lineHeight: 1.7 }}
            >
              A practical implementation guide for product analytics, lifecycle
              segments, audience groups, email marketing, and push notification
              journeys. Connect your app once, then turn real customer behavior
              into timely retention campaigns.
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                href="#install"
                startIcon={<TerminalRounded />}
                sx={{ textTransform: "none", fontWeight: 900, color: "#32134f", backgroundColor: "#fff", "&:hover": { backgroundColor: "#f4ebff" } }}
              >
                Start integration
              </Button>
              <Button
                variant="outlined"
                href="/docs"
                endIcon={<OpenInNewRounded />}
                sx={{ textTransform: "none", fontWeight: 800, color: "#fff", borderColor: "rgba(255,255,255,.45)", "&:hover": { borderColor: "#fff", backgroundColor: "rgba(255,255,255,.1)" } }}
              >
                View public docs
              </Button>
            </Stack>
          </Box>
          <Box
            sx={{
              minWidth: { lg: 310 },
              alignSelf: "center",
              p: 2,
              borderRadius: 1.2,
              bgcolor: "rgba(20,10,31,.48)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.16)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Typography
              color="#ffd36a"
              fontSize={11}
              fontWeight={900}
              letterSpacing={1.3}
            >
              ACTIVE PROJECT
            </Typography>
            <Typography fontWeight={900} sx={{ mt: 0.8 }}>
              {active?.name ?? "Your project"}
            </Typography>
            <Typography
              color="rgba(255,255,255,.62)"
              fontSize={12}
              sx={{ mt: 0.4, wordBreak: "break-all" }}
            >
              {projectId}
            </Typography>
            <Divider sx={{ my: 1.8, borderColor: "rgba(255,255,255,.14)" }} />
            <Stack gap={1}>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontSize={12} color="rgba(255,255,255,.62)">
                  SDK status
                </Typography>
                <Typography fontSize={12} color="#9bf2bd" fontWeight={800}>
                  Ready to connect
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography fontSize={12} color="rgba(255,255,255,.62)">
                  Data destination
                </Typography>
                <Typography fontSize={12} fontWeight={800}>
                  PixlPush Cloud
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Card>
      <Box>
        <Typography variant="h3" sx={{ fontSize: { xs: 21, md: 25 }, fontWeight: 850 }}>
          What you’ll connect
        </Typography>
        <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.5 }}>
          One SDK foundation, four outcomes your product and marketing teams can use immediately.
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {[
          [
            DataObjectRounded,
            "Behavioral data",
            "Identify people and capture the events that describe activation, engagement, conversion, and retention.",
            "Core SDK",
          ],
          [
            GroupsRounded,
            "Lifecycle audiences",
            "Use events and user properties to create dynamic segments such as new users, trial users, and paid customers.",
            "Segmentation",
          ],
          [
            EmailRounded,
            "Email marketing",
            "Send relevant onboarding, lifecycle, and product education campaigns with consent-aware audience targeting.",
            "Messaging",
          ],
          [
            NotificationsActiveRounded,
            "Push notifications",
            "Connect notification permission and delivery events to create timely, measurable push journeys.",
            "Delivery",
          ],
        ].map(([Icon, title, description, label]) => (
          <Grid item xs={12} sm={6} lg={3} key={title as string}>
            <Card sx={{ height: "100%", p: 2.2, border: "1px solid #eee7f3" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 1.5,
                    bgcolor: "#f4ecff",
                    color: "#7132d3",
                  }}
                >
                  <Icon />
                </Box>
                <Chip label={label as string} size="small" sx={{ height: 24, color: "#7132d3", bgcolor: "#f5edff", fontSize: 10, fontWeight: 850 }} />
              </Stack>
              <Typography fontWeight={900} fontSize={15} sx={{ mt: 1.7 }}>
                {title as string}
              </Typography>
              <Typography
                color="text.secondary"
                fontSize={13}
                lineHeight={1.6}
                sx={{ mt: 0.6 }}
              >
                {description as string}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card
        id="install"
        sx={{
          p: { xs: 2.5, md: 3.5 },
          border: "1px solid #e8ddf2",
          scrollMarginTop: 90,
        }}
      >
        <SectionHeading
          eyebrow="01 · INSTALL AND CONFIGURE"
          title="Add the SDK to your app"
          description="Use a public SDK key in the client. Private credentials belong in your backend and should never ship to a browser or mobile build."
          icon={TerminalRounded}
        />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={5}>
            <Stack gap={1.8}>
              <Box>
                <Typography fontWeight={900}>What you need</Typography>
                <Typography
                  color="text.secondary"
                  fontSize={13}
                  sx={{ mt: 0.5 }}
                >
                  Create or select a Project, then open Settings → SDK keys to
                  create a public key for this environment.
                </Typography>
              </Box>
              {[
                ["Project ID", projectId],
                ["Public SDK key", "YOUR_PUBLIC_SDK_KEY"],
                ["Environment", "production"],
              ].map(([label, value]) => (
                <Box
                  key={label}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.7,
                    bgcolor: "#faf8fd",
                    border: "1px solid #eee7f3",
                  }}
                >
                  <Typography color="text.secondary" fontSize={12}>
                    {label}
                  </Typography>
                  <Typography
                    fontSize={13}
                    fontWeight={900}
                    sx={{ mt: 0.4, wordBreak: "break-all" }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md={7}>
            <CodeBlock
              code={sdkInstall}
              label="Terminal"
              onCopy={() => copy(sdkInstall, "Install command")}
            />
            <Box sx={{ mt: 1.5 }}>
              <CodeBlock
                code={sdkSetup}
                label="JavaScript · app entry point"
                onCopy={() => copy(sdkSetup, "SDK setup")}
              />
            </Box>
          </Grid>
        </Grid>
      </Card>
      <Card id="measure" sx={{ p: { xs: 2.5, md: 3.5 }, border: "1px solid #e8ddf2", scrollMarginTop: 90 }}>
        <SectionHeading
          eyebrow="02 · MEASURE THE JOURNEY"
          title="Track the signals PixlPush needs"
          description="Keep event names stable, action-oriented, and easy for your marketing team to understand. Every event can become a segment condition."
          icon={SpeedRounded}
        />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={7}>
            <CodeBlock
              code={eventSetup}
              label="JavaScript · event helper"
              onCopy={() => copy(eventSetup, "Event snippet")}
            />
            <Box sx={{ mt: 1.5 }}>
              <CodeBlock
                code={consentSetup}
                label="JavaScript · consent and logout"
                onCopy={() => copy(consentSetup, "Consent snippet")}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            <Typography fontWeight={900} sx={{ mb: 1 }}>
              Recommended event taxonomy
            </Typography>
            <Stack gap={0.7}>
              {eventRows.map(([event, meaning, use]) => (
                <Stack
                  key={event}
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{ p: 1, borderRadius: 1.3, bgcolor: "#faf8fd" }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      bgcolor: "#7132d3",
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize={12} fontWeight={900}>
                      {event}
                    </Typography>
                    <Typography fontSize={11} color="text.secondary">
                      {meaning}
                    </Typography>
                  </Box>
                  <Chip
                    label={use}
                    size="small"
                    sx={{ height: 22, fontSize: 9, fontWeight: 800 }}
                  />
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Card>
      <Card id="activate" sx={{ p: { xs: 2.5, md: 3.5 }, border: "1px solid #e8ddf2", scrollMarginTop: 90 }}>
        <SectionHeading
          eyebrow="03 · ACTIVATE CUSTOMERS"
          title="Turn data into campaigns"
          description="A good integration is more than tracking. Use the same clean events to build relevant lifecycle experiences across email and push."
          icon={AutoAwesomeRounded}
        />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[
            [
              "Onboarding recovery",
              "Audience: users who signed up but have not completed onboarding within 7 days.",
              "Email + push",
              "Help new users reach their first value moment with a short checklist and a deep link back into the product.",
            ],
            [
              "Trial conversion",
              "Audience: users with trial_started and no purchase_completed event.",
              "Email",
              "Share product education, proof points, and a clear upgrade path before the trial ends.",
            ],
            [
              "Checkout recovery",
              "Audience: users with checkout_started and no purchase_completed event within 24 hours.",
              "Push + email",
              "Remind customers about the unfinished purchase while respecting consent and frequency limits.",
            ],
            [
              "Win-back",
              "Audience: paid customers with no feature_used event in the last 30 days.",
              "Email + push",
              "Bring customers back with new features, helpful content, or a personal success message.",
            ],
          ].map(([title, audience, channel, description]) => (
            <Grid item xs={12} sm={6} key={title}>
              <Box
                sx={{
                  height: "100%",
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#faf8fd",
                  border: "1px solid #eee7f3",
                }}
              >
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Typography fontWeight={900}>{title}</Typography>
                  <Chip
                    label={channel}
                    size="small"
                    sx={{
                      color: "#7132d3",
                      bgcolor: "#eee2ff",
                      fontWeight: 800,
                      fontSize: 9,
                    }}
                  />
                </Stack>
                <Typography fontSize={12} fontWeight={800} sx={{ mt: 1 }}>
                  {audience}
                </Typography>
                <Typography
                  color="text.secondary"
                  fontSize={12}
                  lineHeight={1.55}
                  sx={{ mt: 0.5 }}
                >
                  {description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Card>
      <Card id="brief" sx={{ p: { xs: 2.5, md: 3.5 }, border: "1px solid #e8ddf2", scrollMarginTop: 90 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          gap={2}
        >
          <SectionHeading
            eyebrow="04 · AI IMPLEMENTATION BRIEF"
            title="Give your coding assistant the full context"
            description="This prompt asks an AI coding assistant to build the integration safely, document the event contract, and identify missing server-side work."
            icon={AutoAwesomeRounded}
          />
          <Button
            variant="contained"
            startIcon={<ContentCopyRounded />}
            onClick={() => copy(aiPrompt, "AI integration prompt")}
            sx={{
              alignSelf: { xs: "stretch", sm: "flex-start" },
              textTransform: "none",
              fontWeight: 900,
              whiteSpace: "nowrap",
            }}
          >
            Copy full prompt
          </Button>
        </Stack>
        <Divider sx={{ my: 2.5 }} />
        <CodeBlock
          code={aiPrompt}
          label="Detailed AI integration prompt"
          onCopy={() => copy(aiPrompt, "AI integration prompt")}
        />
      </Card>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%", p: 2.7, border: "1px solid #e8ddf2" }}>
            <SectionHeading
              title="Production checklist"
              description="Complete these checks before you send campaigns to real customers."
              icon={SecurityRounded}
            />
            <Stack gap={1.2} sx={{ mt: 2 }}>
              {[
                "Confirm every production app uses the correct Project ID and environment.",
                "Verify the public SDK key is active and private credentials are server-side only.",
                "Test identify, reset, and event calls with a real test user.",
                "Check email consent, push permissions, unsubscribe, and frequency limits.",
                "Create one lifecycle segment and one audience group from real events.",
                "Review payloads for secrets, payment data, and unnecessary personal information.",
              ].map((item) => (
                <Stack
                  direction="row"
                  gap={1}
                  alignItems="flex-start"
                  key={item}
                >
                  <CheckRounded
                    sx={{ color: "#23a26d", fontSize: 18, mt: 0.1 }}
                  />
                  <Typography fontSize={13}>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card
            sx={{ height: "100%", p: 2.7, color: "#fff", bgcolor: "#211331" }}
          >
            <SectionHeading
              title="When something fails"
              description="Use this quick path to diagnose missing events."
              icon={BugReportRounded}
              dark
            />
            <Stack gap={1.4} sx={{ mt: 2 }}>
              {[
                [
                  "No events",
                  "Check initialization, Project ID, public key, and network requests.",
                ],
                [
                  "Wrong user",
                  "Call identify after login and reset on logout.",
                ],
                [
                  "No campaign audience",
                  "Confirm event names and consent values match the segment rules.",
                ],
                [
                  "Push not delivered",
                  "Check device permission, FCM setup, and token sync in Settings.",
                ],
              ].map(([title, description]) => (
                <Box key={title}>
                  <Typography fontSize={13} fontWeight={900} color="#ffd36a">
                    {title}
                  </Typography>
                  <Typography
                    fontSize={12}
                    color="rgba(255,255,255,.68)"
                    sx={{ mt: 0.3 }}
                  >
                    {description}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>
      </Grid>
      <Card sx={{ p: 2.5, bgcolor: "#fffaf0", border: "1px solid #f4dfaa" }}>
        <Stack direction="row" gap={1.4} alignItems="flex-start">
          <LockRounded sx={{ color: "#bd7b00", mt: 0.2 }} />
          <Box>
            <Typography fontWeight={900}>Security boundary</Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 0.4 }}>
              Public SDK keys identify the Project and are safe for client apps.
              Firebase service accounts, private API keys, campaign secrets, and
              backend credentials must stay in environment secrets or your
              server.
            </Typography>
            <Typography fontSize={13} sx={{ mt: 1, color: "#725000" }}>
              Active Project ID: <b>{projectId}</b>
            </Typography>
          </Box>
        </Stack>
      </Card>
      </Stack>
    </Stack>
  );
}
