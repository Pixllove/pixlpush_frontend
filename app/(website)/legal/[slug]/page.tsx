import NextLink from 'next/link';
import { Box, Container, Stack, Typography } from '@mui/material';
import { notFound } from 'next/navigation';
import { SiteShell } from '@/components/website/SiteShell';
import { LEGAL_DOCUMENTS } from '@/lib/legal-content';
import LegalBody from '@/components/website/LegalBody';

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL_DOCUMENTS[slug];
  return page ? { title: `${page.title} | PixlPush`, description: page.description } : {};
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL_DOCUMENTS[slug];
  if (!page) notFound();

  return <SiteShell>
    <Box sx={{ bgcolor: '#211331', color: '#fff', py: { xs: 9, md: 13 } }}><Container maxWidth="lg"><Typography variant="overline" sx={{ color: '#ffab8e', letterSpacing: '.14em' }}>LEGAL & TRUST</Typography><Typography variant="h1" sx={{ fontSize: { xs: 48, md: 72 }, lineHeight: 1, mt: 1 }}>{page.title}</Typography><Typography sx={{ color: 'rgba(255,255,255,.68)', mt: 2, maxWidth: 720, lineHeight: 1.7 }}>{page.description}</Typography><Typography sx={{ color: 'rgba(255,255,255,.48)', mt: 2, fontSize: 13 }}>Version {page.version} · Last updated: {page.effectiveDate}</Typography></Container></Box>
    <Container maxWidth="md" sx={{ py: { xs: 7, md: 11 } }}><Stack gap={4}>{page.sections.map((section) => <Box key={section.heading}><Typography variant="h2" sx={{ fontSize: 28, mb: 1.2 }}>{section.heading}</Typography><LegalBody body={section.body} /></Box>)}<Typography component={NextLink} href="/legal" sx={{ color: '#6a42e8', fontWeight: 600, textDecoration: 'none' }}>← Back to Legal Hub</Typography></Stack></Container>
  </SiteShell>;
}
