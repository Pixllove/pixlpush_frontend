import { Box, Card, Container, Grid, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { SiteShell } from '@/components/website/SiteShell';

export const metadata = {
  title: 'Legal & Trust Center | PixlPush',
  description: 'PixlPush legal, privacy, security and trust documentation.',
};

const documents = [
  ['Terms of Service', 'The agreement governing use of PixlPush.', '/legal/terms'],
  ['Privacy Policy', 'How PixlPush processes account and service data.', '/privacy'],
  ['Cookie Policy', 'Cookies, analytics and consent settings.', '/legal/cookies'],
  ['Acceptable Use Policy', 'Rules for lawful, responsible platform use.', '/legal/aup'],
  ['Anti-Spam Policy', 'Permission, consent and sending requirements.', '/legal/anti-spam'],
  ['AI Policy', 'How PixlPush AI agents and translations are used.', '/legal/ai-policy'],
  ['Security & Privacy', 'Security controls, operations and trust information.', '/legal/security'],
  ['GDPR & Privacy Compliance', 'Roles, rights, retention and international processing.', '/legal/gdpr-compliance'],
  ['Data Processing Addendum', 'Controller/processor terms and processing details.', '/legal/dpa'],
  ['Software Lifecycle Policy', 'Versioning, maintenance and security updates.', '/legal/software-lifecycle'],
  ['SDK Terms & End-User License Agreement', 'Terms for installing and using the PixlPush SDK.', '/legal/sdk-terms'],
  ['Responsible Disclosure', 'How to report a security vulnerability.', '/legal/responsible-disclosure'],
  ['Subprocessors', 'Current providers, purposes and regions.', '/legal/subprocessors'],
  ['Legal Notice', 'Company and contact information.', '/legal/impressum'],
];

export default function LegalHubPage() {
  return <SiteShell>
    <Box sx={{ bgcolor: '#211331', color: '#fff', py: { xs: 9, md: 13 } }}>
      <Container maxWidth="lg">
        <Typography variant="overline" sx={{ color: '#ffab8e', letterSpacing: '.14em' }}>LEGAL & TRUST</Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: "var(--fs-48)", md: "var(--fs-80)" }, lineHeight: 1, mt: 1 }}>PixlPush Legal Hub</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,.68)', mt: 2, maxWidth: 650, lineHeight: 1.7 }}>Legal, privacy, security and service documentation in one place.</Typography>
      </Container>
    </Box>
    <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
      <Grid container spacing={2.5}>{documents.map(([title, description, href]) => <Grid item key={href} xs={12} sm={6} md={4}><Card component={Link} href={href} sx={{ display: 'block', height: '100%', p: 3, textDecoration: 'none', border: '1px solid #ece8f2', borderRadius: 3, boxShadow: 'none', '&:hover': { borderColor: '#6a42e8', transform: 'translateY(-2px)' }, transition: 'all .2s' }}><Typography variant="h3" component="h2" sx={{ color: '#211331', fontSize: "var(--fs-20)", mb: 1 }}>{title}</Typography><Typography color="text.secondary" lineHeight={1.6}>{description}</Typography><Typography sx={{ color: '#6a42e8', mt: 2, fontSize: "var(--fs-13)", fontWeight: 600 }}>Read document →</Typography></Card></Grid>)}</Grid>
    </Container>
  </SiteShell>;
}
