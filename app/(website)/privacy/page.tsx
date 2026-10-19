import { Box, Container, Stack, Typography } from '@mui/material';
import { SiteShell } from '@/components/website/SiteShell';
import { LEGAL_DOCUMENTS } from '@/lib/legal-content';
import LegalBody from '@/components/website/LegalBody';

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
          <Typography variant="h1" sx={{ fontSize: { xs: "var(--fs-48)", md: "var(--fs-80)" }, lineHeight: 1, mt: 1 }}>Privacy Policy</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.68)', mt: 2 }}>Version {document.version} · Last updated: {document.effectiveDate}</Typography>
        </Container>
      </Box>
      <Container maxWidth="md" sx={{ py: { xs: 7, md: 11 } }}>
        <Stack gap={4}>
          {document.sections.map((section) => (
            <Box key={section.heading}>
              <Typography variant="h2" sx={{ fontSize: "var(--fs-32)", mb: 1.5 }}>{section.heading}</Typography>
              <LegalBody body={section.body} />
            </Box>
          ))}
        </Stack>
      </Container>
    </SiteShell>
  );
}
