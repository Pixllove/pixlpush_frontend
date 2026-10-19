import { ArrowForwardRounded, CodeRounded, EventNoteRounded, LibraryBooksRounded } from "@mui/icons-material";
import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import DashboardFrame from "@/components/dashboard/DashboardFrame";

const docs = [
  { title: "SDK integration", description: "Initialize the SDK, create project keys and start sending product data.", href: "/dashboard/integrations", icon: CodeRounded },
  { title: "Engagement lifecycle segment", description: "Send app_closed or session_ended events and create a return-engagement segment.", href: "/dashboard/developer-docs/engagement", icon: EventNoteRounded },
  { title: "Paywall drop-off segment", description: "Send the events needed to identify users who viewed a paywall but did not convert.", href: "/dashboard/developer-docs/paywall-drop-off", icon: LibraryBooksRounded },
];

export default function DeveloperDocsPage() {
  return <DashboardFrame requiresProject active="Developer documentation" title="Developer documentation" description="Set up the SDK and the product events PixlPush needs for segments, campaigns and journeys.">
    <Stack gap={2.5} sx={{ maxWidth: 920 }}>
      <Card className="saas-card"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Typography variant="h3">Build the connection between your product and PixlPush.</Typography>
        <Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: 1, maxWidth: 720 }}>Choose the guide your developer needs. Each guide explains what to send, where it is used, and how to verify that PixlPush receives it.</Typography>
      </CardContent></Card>
      <Stack gap={1.5}>{docs.map(({ title, description, href, icon: Icon }) => <Card className="saas-card" key={title}><CardContent sx={{ p: { xs: 2.5, md: 3 } }}><Stack direction="row" alignItems="center" gap={2}><Box className="integration-icon"><Icon /></Box><Box sx={{ flex: 1 }}><Typography fontWeight={600}>{title}</Typography><Typography color="text.secondary" fontSize="var(--fs-13)" sx={{ mt: .5 }}>{description}</Typography></Box><Button href={href} endIcon={<ArrowForwardRounded />} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>Open guide</Button></Stack></CardContent></Card>)}</Stack>
    </Stack>
  </DashboardFrame>;
}
