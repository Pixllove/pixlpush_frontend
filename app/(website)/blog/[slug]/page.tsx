import type { Metadata } from 'next';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Box, Breadcrumbs, Button, Container, Divider, Link, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';
import { blogArticles, getBlogArticle } from '@/lib/blog-articles';

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) return {};
  return {
    title: article.seoTitle,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: article.seoTitle, description: article.description, url: `/blog/${slug}`, type: 'article' },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getBlogArticle(slug);
  if (!article) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    mainEntityOfPage: `/blog/${article.slug}`,
    author: { '@type': 'Organization', name: 'PixlPush' },
    publisher: { '@type': 'Organization', name: 'PixlPush' },
    keywords: article.keywords.join(', '),
  };

  return <SiteShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <Box sx={{ py: { xs: 6, md: 8 }, borderBottom: '1px solid rgba(255,255,255,.1)', background: 'radial-gradient(ellipse at 75% 0%, rgba(255,145,65,.13), transparent 38%), linear-gradient(135deg,#1b1024,#241632)' }}>
      <Container maxWidth="md">
        <Breadcrumbs sx={{ mb: 4, color: 'rgba(255,255,255,.56)', '& a': { color: 'inherit', textDecoration: 'none' } }}>
          <Link component={NextLink} href="/blog">Blog</Link>
          <Typography color="inherit">{article.category}</Typography>
        </Breadcrumbs>
        <Typography variant="overline" sx={{ color: '#ffc85a', letterSpacing: '.14em', fontWeight: 700 }}>{article.category} · {article.readTime}</Typography>
        <Typography component="h1" sx={{ mt: 1.5, color: '#fff', fontSize: { xs: 'var(--fs-40)', md: 'var(--fs-56)' }, lineHeight: 1.08, fontWeight: 750, letterSpacing: '-.035em' }}>{article.title}</Typography>
        <Typography sx={{ mt: 2.5, color: 'rgba(255,255,255,.72)', fontSize: 'var(--fs-18)', lineHeight: 1.7 }}>{article.intro}</Typography>
      </Container>
    </Box>
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 9 } }}>
      <Stack gap={5}>
        <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, border: '1px solid rgba(255,179,71,.28)', background: 'linear-gradient(130deg,rgba(255,193,87,.1),rgba(255,125,70,.06))' }}>
          <Typography component="h2" sx={{ color: '#fff', fontSize: 'var(--fs-22)', fontWeight: 700, mb: 2 }}>Key takeaways</Typography>
          <Stack gap={1.4}>{article.takeaways.map((point) => <Stack direction="row" gap={1.5} key={point}>
            <Box aria-hidden="true" sx={{ mt: '9px', width: 7, height: 7, flex: '0 0 7px', borderRadius: '50%', background: 'linear-gradient(135deg,#ffe27a,#ff8148)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,.78)', lineHeight: 1.65 }}>{point}</Typography>
          </Stack>)}</Stack>
        </Box>
        {article.sections.map((section) => <Box component="section" key={section.heading}>
          <Typography component="h2" sx={{ color: '#fff', fontSize: { xs: 'var(--fs-26)', md: 'var(--fs-32)' }, lineHeight: 1.2, fontWeight: 700, mb: 2 }}>{section.heading}</Typography>
          <Stack gap={2}>{section.paragraphs.map((paragraph) => <Typography key={paragraph} sx={{ color: 'rgba(255,255,255,.72)', lineHeight: 1.8 }}>{paragraph}</Typography>)}</Stack>
          {section.bullets && <Box component="ul" sx={{ pl: 3, mt: 2, color: 'rgba(255,255,255,.72)', '& li': { mb: 1, lineHeight: 1.7 } }}>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</Box>}
        </Box>)}
        <Divider sx={{ borderColor: 'rgba(255,255,255,.12)' }} />
        <Button component={NextLink} href="/blog" startIcon={<ArrowBackRounded />} sx={{ alignSelf: 'flex-start', color: '#ffc85a', fontWeight: 700 }}>All blog guides</Button>
      </Stack>
    </Container>
    <CTA title="Make every customer journey more relevant." description="Connect customer insights to coordinated campaigns and lifecycle automation with PixlPush." />
  </SiteShell>;
}
