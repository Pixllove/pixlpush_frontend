import { Alert, Box, Card, CardContent, Chip, Container, Divider, Stack, Typography } from "@mui/material";
import DashboardFrame from "@/components/dashboard/DashboardFrame";

const eventExample = `PixlPush.track("app_closed", {
  source: "app",
});

// Or track when a session ends:
PixlPush.track("session_ended", {
  sessionId: "session-id",
});`;

const segmentExample = `Include users who performed:
  app_closed
  or session_ended

Use the segment as the journey audience.`;

function CodeBlock({ children }: { children: string }) {
  return <Box component="pre" sx={{ m: 0, p: 2, overflowX: "auto", borderRadius: 2, bgcolor: "#211331", color: "#ffd1c3", fontSize: 12, lineHeight: 1.7 }}>{children}</Box>;
}

export default function EngagementDocsPage() {
  return <DashboardFrame requiresProject active="Integrations" title="Developer documentation" description="Set up the events PixlPush needs to identify users who have left the app and can be brought back with an engagement journey.">
    <Container maxWidth="md" disableGutters>
      <Stack gap={2.5}>
        <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"><Typography variant="h3">Create an engagement lifecycle segment</Typography><Chip label="SDK events" size="small" color="secondary" /></Stack>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 1 }}>Track when a user closes the app or ends a session. PixlPush can then use the lifecycle segment as the audience for a return-engagement journey.</Typography>
          <Alert severity="info" sx={{ mt: 2, fontSize: 13 }}>Your SDK must be initialized and sending events before this segment can populate.</Alert>
        </CardContent></Card>
        <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography variant="h3">1. Send an engagement event</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 1, mb: 2 }}>Send <b>app_closed</b> when the user leaves the app, or <b>session_ended</b> when their session ends.</Typography>
          <CodeBlock>{eventExample}</CodeBlock>
        </CardContent></Card>
        <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography variant="h3">2. Build the lifecycle segment</Typography>
          <Typography color="text.secondary" fontSize={13} sx={{ mt: 1, mb: 2 }}>In Lifecycle Segments, create a segment using one of the engagement events and use it as the journey audience.</Typography>
          <CodeBlock>{segmentExample}</CodeBlock>
          <Typography color="text.secondary" fontSize={12} sx={{ mt: 2 }}>Use the same event names everywhere. Event names are case-sensitive.</Typography>
        </CardContent></Card>
        <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <Typography variant="h3">3. Verify the integration</Typography>
          <Stack gap={1.2} sx={{ mt: 2 }}>{["Close the app or end a test session.", "Confirm app_closed or session_ended appears in the project event catalog.", "Create the lifecycle segment and check its member count."].map((item, index) => <Stack direction="row" gap={1.2} key={item}><Typography color="secondary" fontWeight={700}>{index + 1}.</Typography><Typography fontSize={13}>{item}</Typography></Stack>)}</Stack>
          <Divider sx={{ my: 2.5 }} />
          <Typography fontSize={13}>Need the SDK setup first? <a href="/dashboard/integrations#measure">Open the integration guide</a>.</Typography>
        </CardContent></Card>
      </Stack>
    </Container>
  </DashboardFrame>;
}
