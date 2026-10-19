import { Box } from "@mui/material";
import DocsLayout from "@/components/docs/DocsLayout";
import { SiteFooter, SiteHeader } from "@/components/website/SiteShell";

export default function DocsSiteLayout({ children }: { children: React.ReactNode }) {
  return <Box className="website-shell">
    <SiteHeader />
    <DocsLayout base="/docs" variant="site">{children}</DocsLayout>
    <SiteFooter />
  </Box>;
}
