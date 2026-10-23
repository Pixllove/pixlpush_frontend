import { ArrowForwardRounded, CodeRounded, EventNoteRounded, LibraryBooksRounded, PhoneAndroidRounded } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import DashboardFrame from "@/components/dashboard/DashboardFrame";
import { LinkButton } from "@/components/docs/links";

export const metadata = { title: 'Developer Documentation — PixlPush' };

// The entry point for developers: do the SDK integration first, then the segment guides that use its events.
const steps = [
  {
    step: "Step 1",
    title: "SDK integration",
    description: "Install the React Native SDK, create an SDK key, connect Firebase for push, and send your first verified event.",
    href: "/dashboard/integrations/react-native/quickstart",
    icon: CodeRounded,
  },
  {
    step: "Step 1 · Flutter",
    title: "Flutter SDK integration",
    description: "Install the Flutter package, configure identity and events, connect Firebase, and verify automatic notification-open attribution on Android and iOS.",
    href: "/dashboard/integrations/flutter/quickstart",
    icon: PhoneAndroidRounded,
  },
  {
    step: "Step 2 · optional",
    title: "Engagement lifecycle segment",
    description: "Use the app_opened and app_backgrounded events the SDK records automatically to build a segment for a return-engagement journey.",
    href: "/dashboard/integrations/react-native/engagement-segment",
    icon: EventNoteRounded,
    needsSdk: true,
  },
  {
    step: "Step 2 · optional",
    title: "Paywall drop-off segment",
    description: "Track paywall_viewed and purchases, then find users who saw a paywall but did not buy.",
    href: "/dashboard/integrations/react-native/paywall-segment",
    icon: LibraryBooksRounded,
    needsSdk: true,
  },
];

export default function DeveloperDocsPage() {
  return <DashboardFrame requiresProject active="Developer documentation" title="Developer documentation" description="Set up the SDK and the product events PixlPush needs for segments, campaigns and journeys.">
    <Stack gap={2.5} sx={{ maxWidth: 920 }}>
      <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h3">Build the connection between your product and PixlPush.</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: 1, maxWidth: 720 }}>Start with the SDK integration. The segment guides build on the events it sends, so open them once your app appears in Users.</Typography>
      </CardContent></Card>
      <Stack gap={1.5}>{steps.map(({ step, title, description, href, icon: Icon, needsSdk }) => <Card className="saas-card" key={title}><CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} gap={2}>
          <Box className="integration-icon"><Icon /></Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography fontWeight={600}>{title}</Typography>
              <Chip size="small" label={step} />
              {needsSdk && <Chip size="small" variant="outlined" label="Needs SDK integration" />}
            </Stack>
            <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: .5 }}>{description}</Typography>
          </Box>
          <LinkButton href={href} endIcon={<ArrowForwardRounded />} sx={{ whiteSpace: "nowrap", alignSelf: { xs: "flex-start", sm: "center" } }}>Open guide</LinkButton>
        </Stack>
      </CardContent></Card>)}</Stack>
    </Stack>
  </DashboardFrame>;
}
