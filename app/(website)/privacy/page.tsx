import { Box, Container, Stack, Typography } from '@mui/material';
import { SiteShell } from '@/components/website/SiteShell';
import { LEGAL_DOCUMENTS } from '@/lib/legal-content';

export const metadata = {
  title: 'Privacy Policy | PixlPush',
  description: 'Privacy Policy for PixlPush.',
};

export default function PrivacyPolicyPage() {
  const document = LEGAL_DOCUMENTS.privacy;

  return (
    <SiteShell>
      <Box sx={{ bgcolor: '#211331', color: '#fff', py: { xs: 9, md: 13 } }}>
        <Container maxWidth="lg">
          <Typography variant="overline" sx={{ color: '#ffab8e', letterSpacing: '.14em' }}>LEGAL</Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: 48, md: 72 }, lineHeight: 1, mt: 1 }}>Privacy Policy</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.68)', mt: 2 }}>Last updated: 13 October 2026</Typography>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: { xs: 7, md: 11 } }}>
        <Stack gap={4}>
          <Typography color="warning.main" sx={{ fontWeight: 600 }}>
            Production draft — final publication requires confirmation of the live configuration and legal review.
          </Typography>
          {document.sections.map((section) => (
            <Box key={section.heading}>
              <Typography variant="h2" sx={{ fontSize: 32, mb: 1.5 }}>{section.heading}</Typography>
              <Typography color="text.secondary" lineHeight={1.8}>{section.body}</Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </SiteShell>
  );
}
