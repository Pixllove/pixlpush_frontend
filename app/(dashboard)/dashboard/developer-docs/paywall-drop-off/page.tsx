import { Alert, Box, Card, CardContent, Chip, Container, Divider, Stack, Typography } from "@mui/material";
import DashboardFrame from "@/components/dashboard/DashboardFrame";

const viewedEvent = `PixlPush.track("paywall_viewed", {
  paywallId: "pro-monthly",
  plan: "pro",
  source: "settings",
});`;

const completedEvent = `PixlPush.track("purchase_completed", {
  plan: "pro",
  value: 9.99,
  currency: "USD",
});`;

const segmentExample = `Include users who performed:
  paywall_viewed

Exclude users who performed:
  purchase_completed
  or subscription_started`;

function CodeBlock({ children }: { children: string }) {
  return <Box component="pre" sx={{ m: 0, p: 2, overflowX: "auto", borderRadius: 2, bgcolor: "#211331", color: "#ffd1c3", fontSize: 12, lineHeight: 1.7 }}>{children}</Box>;
}

export default function PaywallDropOffDocsPage() {
  return <DashboardFrame requiresProject active="Integrations" title="Developer documentation" description="Set up the events PixlPush needs to identify users who viewed a paywall but did not convert.">
    <Container maxWidth="md" disableGutters>
      <Stack gap={2.5}>
        <Card className="saas-card">
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="h3">Create a Paywall drop-off segment</Typography>
              <Chip label="SDK events" size="small" color="secondary" />
            </Stack>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 1 }}>Track the paywall view and the successful conversion. PixlPush can then target users who showed purchase intent but did not complete it.</Typography>
            <Alert severity="info" sx={{ mt: 2, fontSize: 13 }}>Your SDK must be initialized and sending events before this segment can populate.</Alert>
          </CardContent>
        </Card>

        <Card className="saas-card">
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h3">1. Send the required events</Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 1, mb: 2 }}>Send <b>paywall_viewed</b> when a user sees a paywall.</Typography>
            <CodeBlock>{viewedEvent}</CodeBlock>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 2, mb: 2 }}>Send <b>purchase_completed</b> after a successful purchase, or <b>subscription_started</b> after a subscription begins.</Typography>
            <CodeBlock>{completedEvent}</CodeBlock>
          </CardContent>
        </Card>

        <Card className="saas-card">
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h3">2. Build the segment</Typography>
            <Typography color="text.secondary" fontSize={13} sx={{ mt: 1, mb: 2 }}>In Lifecycle Segments, create a segment using the viewed event and keep only users who have not converted.</Typography>
            <CodeBlock>{segmentExample}</CodeBlock>
            <Typography color="text.secondary" fontSize={12} sx={{ mt: 2 }}>Use the same event names everywhere. Event names are case-sensitive and should represent one product action.</Typography>
          </CardContent>
        </Card>

        <Card className="saas-card">
          <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
            <Typography variant="h3">3. Verify the integration</Typography>
            <Stack gap={1.2} sx={{ mt: 2 }}>
              {[
                "Open the paywall in a test account.",
                "Confirm paywall_viewed appears in the project event catalog.",
                "Complete a test purchase and confirm purchase_completed or subscription_started appears.",
                "Create the lifecycle segment and check its member count.",
              ].map((item, index) => <Stack direction="row" gap={1.2} key={item}><Typography color="secondary" fontWeight={700}>{index + 1}.</Typography><Typography fontSize={13}>{item}</Typography></Stack>)}
            </Stack>
            <Divider sx={{ my: 2.5 }} />
            <Typography fontSize={13}>Need the SDK setup first? <a href="/dashboard/integrations#measure">Open the integration guide</a>.</Typography>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  </DashboardFrame>;
}
