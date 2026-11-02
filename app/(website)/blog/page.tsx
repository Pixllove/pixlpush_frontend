import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';
import { blogArticles } from '@/lib/blog-articles';
import { blogImageMap } from '@/lib/blog-image-map';

export const metadata: Metadata = {
  title: 'Customer Engagement & Lifecycle Marketing Blog | PixlPush',
  description: 'Practical SEO guides for AI marketing, email marketing automation, push notification strategy, customer journey automation, SaaS retention and customer engagement.',
  keywords: ['AI marketing', 'email marketing automation', 'push notification strategy', 'customer engagement strategy', 'SaaS retention', 'lifecycle marketing', 'customer journey automation', 'AI audience segmentation'],
};

export default function BlogPage() {
  const featured = blogArticles[0];
  if (!featured) return null;
  const articles = blogArticles.slice(1);
  const featuredImage = blogImageMap[featured.slug];

  return <SiteShell>
    <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', borderBottom: '1px solid rgba(255,255,255,.12)', background: 'radial-gradient(ellipse at 94% 18%, rgba(255,122,87,.2), transparent 30%), radial-gradient(ellipse at 4% 92%, rgba(120,62,204,.27), transparent 38%), linear-gradient(155deg,#180d27 0%,#241232 58%,#1b0e29 100%)', '&::before': { content: '""', position: 'absolute', zIndex: -1, width: 660, height: 660, right: '-220px', top: -410, borderRadius: '50%', border: '1px solid rgba(255,195,91,.22)', boxShadow: '0 0 140px rgba(255,122,87,.16)' }, '&::after': { content: '""', position: 'absolute', zIndex: -1, width: 240, height: 240, left: '-130px', bottom: 90, borderRadius: '50%', background: 'rgba(132,77,220,.12)', filter: 'blur(18px)' } }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 6.5, md: 8.5 }, pb: { xs: 6.5, md: 8 } }}>
        <Box sx={{ maxWidth: 980 }}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1.2} sx={{ color: '#ffd36d', fontWeight: 800, letterSpacing: '.18em', fontSize: { xs: 'var(--fs-20)', md: 'var(--fs-24)' }, textTransform: 'uppercase' }}><AutoAwesomeRounded sx={{ fontSize: { xs: 22, md: 27 } }} /> PixlPush journal</Stack>
            <Typography component="h1" sx={{ maxWidth: 1040, mt: 2.3, color: '#fff', fontSize: { xs: 'var(--fs-56)', md: 'var(--fs-80)' }, lineHeight: .96, letterSpacing: '-.065em', fontWeight: 800 }}>Practical growth ideas for <Box component="span" sx={{ background: 'linear-gradient(90deg,#ffe27a 0%,#ffb347 48%,#ff8154 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>better customer journeys.</Box></Typography>
          </Box>
        </Box>

        <Card component={NextLink} href={`/blog/${featured.slug}`} prefetch sx={{ mt: { xs: 4.5, md: 5.5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '.9fr 1.1fr' }, overflow: 'hidden', textDecoration: 'none', borderRadius: '24px', border: '1px solid rgba(255,190,94,.52)', background: 'linear-gradient(145deg,#2d1941 0%,#1b1028 100%)', boxShadow: '0 30px 90px rgba(0,0,0,.3)', transition: 'transform .25s ease, border-color .25s ease, box-shadow .25s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,193,87,.9)', boxShadow: '0 34px 100px rgba(0,0,0,.42)' } }}>
          <Box sx={{ p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
            <Stack direction="row" gap={1.2} alignItems="center"><Chip label="EDITOR’S PICK" size="small" sx={{ height: 28, bgcolor: 'rgba(255,190,83,.14)', border: '1px solid rgba(255,190,83,.34)', color: '#ffd36d', fontWeight: 700, letterSpacing: '.06em' }} /><Typography sx={{ color: 'rgba(255,255,255,.48)', fontSize: 'var(--fs-12)' }}>{featured.readTime}</Typography></Stack>
            <Typography sx={{ mt: 1.8, color: '#ffd36d', fontSize: 'var(--fs-12)', letterSpacing: '.13em', textTransform: 'uppercase', fontWeight: 700 }}>{featured.category}</Typography>
            <Typography sx={{ mt: 1.2, color: '#fff', fontSize: { xs: 'var(--fs-26)', md: 'var(--fs-32)' }, lineHeight: 1.12, fontWeight: 780, letterSpacing: '-.04em' }}>{featured.title}</Typography>
            <Typography sx={{ mt: 1.7, color: 'rgba(255,255,255,.74)', lineHeight: 1.7 }}>{featured.description}</Typography>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 3, color: '#ffc45f', fontWeight: 700 }}>Explore the guide <ArrowOutwardRounded sx={{ fontSize: 18 }} /></Stack>
          </Box>
          <Box sx={{ position: 'relative', minHeight: { xs: 255, md: 380 }, overflow: 'hidden', background: `radial-gradient(ellipse at 72% 35%, ${featuredImage.tone}66, transparent 48%), #160c23` }}>
            <Box component="img" src={featuredImage.src} alt={featuredImage.alt} sx={{ position: 'absolute', width: '100%', height: '100%', inset: 0, objectFit: 'cover', opacity: 1, filter: 'saturate(1.08) contrast(1.02) brightness(.98)', transition: 'transform .5s ease', '.MuiCard-root:hover &': { transform: 'scale(1.035)' } }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(21,10,34,.16),transparent 42%), linear-gradient(0deg,rgba(16,7,25,.15),rgba(16,7,25,0) 64%)' }} />
            <Typography sx={{ position: 'absolute', top: 18, right: 20, color: 'rgba(255,255,255,.9)', fontSize: 'var(--fs-12)', letterSpacing: '.14em', fontWeight: 800, textShadow: '0 1px 10px rgba(0,0,0,.35)' }}>01 / {String(blogArticles.length).padStart(2, '0')}</Typography>
            <Box sx={{ position: 'absolute', right: { xs: 14, md: 22 }, bottom: { xs: 14, md: 22 }, px: 1.5, py: .8, border: '1px solid rgba(255,255,255,.24)', borderRadius: 99, color: '#fff', fontSize: 'var(--fs-12)', backdropFilter: 'blur(10px)', bgcolor: 'rgba(28,17,38,.38)' }}>Customer engagement, made practical</Box>
          </Box>
        </Card>
      </Container>
    </Box>

    <Box sx={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 80% 10%, rgba(151,99,185,.11), transparent 38%), linear-gradient(180deg,#20102f 0%,#241434 48%,#1b1028 100%)', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
    <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="space-between" gap={2} sx={{ mb: 3.5 }}>
        <Box><Typography sx={{ color: '#ffc45f', fontSize: 'var(--fs-12)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700 }}>Ideas to put into action</Typography><Typography component="h2" sx={{ color: '#fff', mt: 1, fontSize: { xs: 'var(--fs-30)', md: 'var(--fs-40)' }, fontWeight: 700, letterSpacing: '-.03em' }}>Explore the latest guides</Typography></Box>
        <Typography sx={{ color: 'rgba(255,255,255,.54)', maxWidth: 360, lineHeight: 1.6 }}>Clear advice for smarter campaigns, stronger retention and more relevant customer experiences.</Typography>
      </Stack>
      <Grid container spacing={2.5}>
        {articles.map((post, index) => {
          const image = blogImageMap[post.slug];
          return <Grid item xs={12} sm={6} lg={4} key={post.slug}>
            <Card component={NextLink} href={`/blog/${post.slug}`} prefetch sx={{ display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none', border: '1px solid rgba(255,255,255,.15)', background: 'linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.045))', transition: 'transform .22s ease, border-color .22s ease, box-shadow .22s ease', '&:hover': { transform: 'translateY(-5px)', borderColor: `${image.tone}aa`, boxShadow: `0 18px 45px ${image.tone}24` } }}>
              <Box sx={{ position: 'relative', height: 185, overflow: 'hidden', background: `radial-gradient(ellipse at 65% 45%, ${image.tone}88, transparent 55%), linear-gradient(135deg,#493553,#2d1e39)` }}>
                <Box component="img" src={image.src} alt={image.alt} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 1, filter: 'saturate(1.08) contrast(1.02) brightness(1)', transition: 'transform .4s ease, filter .4s ease', '.MuiCard-root:hover &': { transform: 'scale(1.045)', filter: 'saturate(1.12) contrast(1.04) brightness(1.02)' } }} />
                <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,rgba(18,8,29,.12),transparent 68%)', pointerEvents: 'none' }} />
                <Typography sx={{ position: 'absolute', top: 14, left: 14, color: '#fff', fontSize: 'var(--fs-11)', letterSpacing: '.14em', fontWeight: 700, textShadow: '0 1px 12px rgba(0,0,0,.55)' }}>{String(index + 2).padStart(2, '0')} / {String(blogArticles.length).padStart(2, '0')}</Typography>
              </Box>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', flex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}><Typography sx={{ color: image.tone, fontSize: 'var(--fs-12)', fontWeight: 700 }}>{post.category}</Typography><Typography sx={{ color: 'rgba(255,255,255,.44)', fontSize: 'var(--fs-12)' }}>{post.readTime}</Typography></Stack>
                <Typography component="h3" sx={{ mt: 2, color: '#fff', fontSize: 'var(--fs-22)', lineHeight: 1.22, fontWeight: 700 }}>{post.title}</Typography>
                <Typography sx={{ mt: 1.3, color: 'rgba(255,255,255,.76)', lineHeight: 1.65 }}>{post.description}</Typography>
                <Button disableRipple endIcon={<ArrowOutwardRounded />} sx={{ alignSelf: 'flex-start', mt: 'auto', pt: 2.5, color: '#ffc45f', fontWeight: 700, '&:hover': { bgcolor: 'transparent' } }}>Read the guide</Button>
              </CardContent>
            </Card>
          </Grid>;
        })}
      </Grid>
    </Container>
    </Box>
    <CTA title="Turn useful insights into better journeys." description="Bring campaigns, audiences and lifecycle automation together with PixlPush." />
  </SiteShell>;
}
