import type { Metadata } from 'next';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Box, Breadcrumbs, Button, Card, CardContent, Container, Divider, Grid, Link, Stack, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';
import { blogArticles, getBlogArticle } from '@/lib/blog-articles';
import { blogDepth } from '@/lib/blog-depth';
import { blogEnhancements } from '@/lib/blog-enhancements';
import { blogImageMap } from '@/lib/blog-image-map';

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
  const articleImage = blogImageMap[article.slug];
  const enhancement = blogEnhancements[article.slug];
  const detailedSections = [...article.sections, ...blogDepth[article.slug]];
  const supportingImages = enhancement.inlineImages.map((item) => ({ ...item, image: blogImageMap[item.slug] }));
  const relatedArticles = blogArticles.filter((candidate) => candidate.slug !== article.slug).slice(0, 3);
  const articleImages = [articleImage.src, ...supportingImages.map((item) => item.image.src)];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        image: articleImages,
        articleSection: article.category,
        mainEntityOfPage: `/blog/${article.slug}`,
        author: { '@type': 'Organization', name: 'PixlPush' },
        publisher: { '@type': 'Organization', name: 'PixlPush' },
        keywords: article.keywords.join(', '),
      },
      {
        '@type': 'FAQPage',
        mainEntity: enhancement.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
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
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 9 } }}>
      <Box sx={{ maxWidth: 780, mx: 'auto' }}>
      <Stack gap={5}>
        <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, border: '1px solid rgba(255,179,71,.28)', background: 'linear-gradient(130deg,rgba(255,193,87,.1),rgba(255,125,70,.06))' }}>
          <Typography component="h2" sx={{ color: '#fff', fontSize: 'var(--fs-24)', fontWeight: 700, mb: 2 }}>Key takeaways</Typography>
          <Stack gap={1.4}>{article.takeaways.map((point) => <Stack direction="row" gap={1.5} key={point}>
            <Box aria-hidden="true" sx={{ mt: '9px', width: 7, height: 7, flex: '0 0 7px', borderRadius: '50%', background: 'linear-gradient(135deg,#ffe27a,#ff8148)' }} />
            <Typography sx={{ color: 'rgba(255,255,255,.8)', fontSize: 'var(--fs-16)', lineHeight: 1.7 }}>{point}</Typography>
          </Stack>)}</Stack>
        </Box>
        {detailedSections.map((section, index) => <Box component="section" key={section.heading}>
          <Typography component="h2" sx={{ color: '#fff', fontSize: { xs: 'var(--fs-28)', md: 'var(--fs-34)' }, lineHeight: 1.2, fontWeight: 700, mb: 2 }}>{section.heading}</Typography>
          <Stack gap={2}>{section.paragraphs.map((paragraph) => <Typography key={paragraph} sx={{ color: 'rgba(255,255,255,.76)', fontSize: { xs: 'var(--fs-16)', md: 'var(--fs-17)' }, lineHeight: 1.85 }}>{paragraph}</Typography>)}</Stack>
          {section.bullets && <Box component="ul" sx={{ pl: 3, mt: 2, color: 'rgba(255,255,255,.76)', fontSize: 'var(--fs-16)', '& li': { mb: 1.2, lineHeight: 1.75 } }}>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</Box>}
          {index < supportingImages.length && <Box component="figure" sx={{ m: 0, mt: 4.5, mb: 1 }}>
            <Box component="img" src={supportingImages[index].image.src} alt={supportingImages[index].image.alt} loading="lazy" sx={{ display: 'block', width: '100%', height: { xs: 220, md: 330 }, objectFit: 'cover', borderRadius: 3, border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 20px 55px rgba(0,0,0,.2)' }} />
            <Typography component="figcaption" sx={{ mt: 1.3, color: 'rgba(255,255,255,.5)', fontSize: 'var(--fs-13)', lineHeight: 1.6 }}>{supportingImages[index].caption}</Typography>
          </Box>}
        </Box>)}
        <Box sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, background: 'linear-gradient(135deg,rgba(117,80,173,.18),rgba(255,149,81,.08))', border: '1px solid rgba(196,167,255,.22)' }}>
          <Typography component="h2" sx={{ color: '#fff', fontSize: { xs: 'var(--fs-26)', md: 'var(--fs-32)' }, lineHeight: 1.2, fontWeight: 700, mb: 1 }}>A practical checklist for {article.keyword}</Typography>
          <Typography sx={{ color: 'rgba(255,255,255,.62)', fontSize: 'var(--fs-15)', lineHeight: 1.7, mb: 2.2 }}>Use these steps to turn the ideas in this guide into a repeatable workflow for your marketing and product teams.</Typography>
          <Stack gap={1.4}>{enhancement.checklist.map((item) => <Stack direction="row" gap={1.5} key={item}>
            <Box aria-hidden="true" sx={{ mt: '8px', width: 8, height: 8, flex: '0 0 8px', borderRadius: 1, background: '#ffc85a' }} />
            <Typography sx={{ color: 'rgba(255,255,255,.8)', fontSize: 'var(--fs-16)', lineHeight: 1.7 }}>{item}</Typography>
          </Stack>)}</Stack>
        </Box>
        <Box component="section">
          <Typography component="h2" sx={{ color: '#fff', fontSize: { xs: 'var(--fs-28)', md: 'var(--fs-34)' }, lineHeight: 1.2, fontWeight: 700, mb: 2.5 }}>Frequently asked questions</Typography>
          <Stack gap={3}>{enhancement.faqs.map((faq) => <Box key={faq.question}>
            <Typography component="h3" sx={{ color: '#fff', fontSize: 'var(--fs-20)', lineHeight: 1.35, fontWeight: 700, mb: .8 }}>{faq.question}</Typography>
            <Typography sx={{ color: 'rgba(255,255,255,.74)', fontSize: { xs: 'var(--fs-16)', md: 'var(--fs-17)' }, lineHeight: 1.8 }}>{faq.answer}</Typography>
          </Box>)}</Stack>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,.12)' }} />
        <Button component={NextLink} href="/blog" startIcon={<ArrowBackRounded />} sx={{ alignSelf: 'flex-start', color: '#ffc85a', fontWeight: 700 }}>All blog guides</Button>
      </Stack>
      </Box>
      <Box sx={{ mt: { xs: 8, md: 11 } }}>
        <Typography sx={{ color: '#ffc85a', fontSize: 'var(--fs-12)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700 }}>Keep learning</Typography>
        <Typography component="h2" sx={{ color: '#fff', mt: 1, fontSize: { xs: 'var(--fs-28)', md: 'var(--fs-40)' }, letterSpacing: '-.03em', fontWeight: 700 }}>Related PixlPush guides</Typography>
        <Grid container spacing={2.5} sx={{ mt: 1 }}>
          {relatedArticles.map((related) => {
            const relatedImage = blogImageMap[related.slug];
            return <Grid item xs={12} md={4} key={related.slug}>
              <Card component={NextLink} href={`/blog/${related.slug}`} sx={{ height: '100%', display: 'flex', flexDirection: 'column', textDecoration: 'none', background: 'linear-gradient(145deg,rgba(255,255,255,.1),rgba(255,255,255,.045))', border: '1px solid rgba(255,255,255,.14)', borderRadius: 3, transition: 'transform .2s ease, border-color .2s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: `${relatedImage.tone}aa` } }}>
                <Box component="img" src={relatedImage.src} alt={relatedImage.alt} loading="lazy" sx={{ width: '100%', height: 150, objectFit: 'cover' }} />
                <CardContent sx={{ p: 2.5 }}><Typography sx={{ color: relatedImage.tone, fontSize: 'var(--fs-12)', fontWeight: 700 }}>{related.category}</Typography><Typography component="h3" sx={{ color: '#fff', mt: 1, fontSize: 'var(--fs-18)', lineHeight: 1.3, fontWeight: 700 }}>{related.title}</Typography><Typography sx={{ color: '#ffc85a', mt: 2, fontSize: 'var(--fs-13)', fontWeight: 700 }}>Read guide <ArrowOutwardRounded sx={{ fontSize: 15, verticalAlign: 'middle' }} /></Typography></CardContent>
              </Card>
            </Grid>;
          })}
        </Grid>
      </Box>
    </Container>
    <CTA title="Make every customer journey more relevant." description="Connect customer insights to coordinated campaigns and lifecycle automation with PixlPush." />
  </SiteShell>;
}
