import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';
import { blogArticles } from '@/lib/blog-articles';

export const metadata: Metadata = {
  title: 'Customer Engagement & Lifecycle Marketing Blog | PixlPush',
  description: 'Practical guides to customer engagement, AI audience segmentation, lifecycle marketing, journey automation, push notifications and retention.',
  keywords: ['customer engagement', 'lifecycle marketing', 'customer journey automation', 'AI audience segmentation', 'push notification best practices', 'customer retention'],
};

const articleImages: Record<string, { src: string; alt: string; tone: string }> = {
  'customer-engagement-strategy': { src: '/assets/pixlpush-journey-hero.png', alt: 'A customer journey built around relevant product moments', tone: '#ffb347' },
  'ai-audience-segmentation': { src: '/assets/product-analytics-dashboard.png', alt: 'Product analytics dashboard for understanding user behavior', tone: '#b891ff' },
  'email-customer-journey': { src: '/assets/translation-email.png', alt: 'Email campaign content adapted for different audiences', tone: '#ff8a67' },
  'customer-journey-automation': { src: '/assets/pixlpush-journey-hero.png', alt: 'Automated customer lifecycle journey', tone: '#ffc85a' },
  'push-notification-best-practices': { src: '/assets/translation-push.png', alt: 'Personalized push notification experience', tone: '#ff9b5e' },
  'customer-lifecycle-management': { src: '/assets/product-analytics-dashboard.png', alt: 'Analytics used to improve customer lifecycle outcomes', tone: '#c19bff' },
};

export default function BlogPage() {
  const featured = blogArticles[0];
  if (!featured) return null;
  const articles = blogArticles.slice(1);
  const featuredImage = articleImages[featured.slug];

  return <SiteShell>
    <Box sx={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', borderBottom: '1px solid rgba(255,255,255,.16)', background: 'radial-gradient(ellipse at 76% 25%, rgba(255,164,91,.28), transparent 34%), radial-gradient(ellipse at 15% 100%, rgba(144,87,190,.28), transparent 45%), linear-gradient(135deg,#281933 0%,#35213f 55%,#291a36 100%)', '&::before': { content: '""', position: 'absolute', zIndex: -1, width: 370, height: 370, right: '7%', top: -250, borderRadius: '50%', border: '1px solid rgba(255,195,91,.28)', boxShadow: '0 0 100px rgba(255,150,69,.16)' } }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 7, md: 10 } }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ color: '#ffd36d', fontWeight: 700, letterSpacing: '.16em', fontSize: 'var(--fs-12)', textTransform: 'uppercase' }}><AutoAwesomeRounded sx={{ fontSize: 17 }} /> PixlPush journal</Stack>
        <Typography component="h1" sx={{ maxWidth: 900, mt: 2.5, color: '#fff', fontSize: { xs: 'var(--fs-44)', md: 'var(--fs-72)' }, lineHeight: .99, letterSpacing: '-.045em', fontWeight: 750 }}>Make every customer moment <Box component="span" sx={{ background: 'linear-gradient(90deg,#ffe27a 0%,#ffb347 48%,#ff8154 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>count.</Box></Typography>
        <Typography sx={{ maxWidth: 660, mt: 2.5, color: 'rgba(255,255,255,.7)', fontSize: { xs: 'var(--fs-16)', md: 'var(--fs-18)' }, lineHeight: 1.75 }}>Fresh thinking on customer engagement, lifecycle marketing and the journeys that turn product value into lasting growth.</Typography>

        <Card component={NextLink} href={`/blog/${featured.slug}`} prefetch sx={{ mt: { xs: 5, md: 7 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.03fr .97fr' }, overflow: 'hidden', textDecoration: 'none', border: '1px solid rgba(255,205,120,.4)', background: 'linear-gradient(120deg,rgba(255,255,255,.13),rgba(255,255,255,.065))', boxShadow: '0 28px 80px rgba(0,0,0,.18)', transition: 'transform .25s ease, border-color .25s ease', '&:hover': { transform: 'translateY(-4px)', borderColor: 'rgba(255,193,87,.8)' } }}>
          <Box sx={{ p: { xs: 3, md: 5 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Stack direction="row" gap={1} alignItems="center"><Chip label="EDITOR’S PICK" size="small" sx={{ bgcolor: 'rgba(255,190,83,.14)', border: '1px solid rgba(255,190,83,.3)', color: '#ffd36d', fontWeight: 700, letterSpacing: '.06em' }} /><Typography sx={{ color: 'rgba(255,255,255,.48)', fontSize: 'var(--fs-12)' }}>{featured.readTime}</Typography></Stack>
            <Typography sx={{ mt: 3, color: '#fff', fontSize: { xs: 'var(--fs-30)', md: 'var(--fs-42)' }, lineHeight: 1.08, fontWeight: 720, letterSpacing: '-.03em' }}>{featured.title}</Typography>
            <Typography sx={{ mt: 2, color: 'rgba(255,255,255,.78)', lineHeight: 1.7 }}>{featured.description}</Typography>
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 'auto', pt: 3, color: '#ffc45f', fontWeight: 700 }}>Explore the guide <ArrowOutwardRounded sx={{ fontSize: 18 }} /></Stack>
          </Box>
          <Box sx={{ position: 'relative', minHeight: { xs: 230, md: 360 }, overflow: 'hidden', background: `radial-gradient(ellipse at 72% 35%, ${featuredImage.tone}88, transparent 48%), linear-gradient(135deg,#493452,#2b1d37)` }}>
            <Box component="img" src={featuredImage.src} alt={featuredImage.alt} sx={{ position: 'absolute', width: '100%', height: '100%', inset: 0, objectFit: 'cover', opacity: .94, mixBlendMode: 'screen' }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(49,32,58,.12),transparent 38%), linear-gradient(0deg,rgba(36,24,44,.12),transparent 50%)' }} />
            <Box sx={{ position: 'absolute', right: 22, bottom: 22, px: 1.5, py: .8, border: '1px solid rgba(255,255,255,.22)', borderRadius: 99, color: '#fff', fontSize: 'var(--fs-12)', backdropFilter: 'blur(10px)', bgcolor: 'rgba(28,17,38,.38)' }}>Customer engagement, made practical</Box>
          </Box>
        </Card>
      </Container>
    </Box>

    <Box sx={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 80% 10%, rgba(151,99,185,.15), transparent 38%), linear-gradient(180deg,#2b1c36 0%,#30203a 48%,#281a33 100%)', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
    <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} justifyContent="space-between" gap={2} sx={{ mb: 3.5 }}>
        <Box><Typography sx={{ color: '#ffc45f', fontSize: 'var(--fs-12)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 700 }}>Ideas to put into action</Typography><Typography component="h2" sx={{ color: '#fff', mt: 1, fontSize: { xs: 'var(--fs-30)', md: 'var(--fs-40)' }, fontWeight: 700, letterSpacing: '-.03em' }}>Explore the latest guides</Typography></Box>
        <Typography sx={{ color: 'rgba(255,255,255,.54)', maxWidth: 360, lineHeight: 1.6 }}>Clear advice for smarter campaigns, stronger retention and more relevant customer experiences.</Typography>
      </Stack>
      <Grid container spacing={2.5}>
        {articles.map((post, index) => {
          const image = articleImages[post.slug];
          return <Grid item xs={12} sm={6} lg={4} key={post.slug}>
            <Card component={NextLink} href={`/blog/${post.slug}`} prefetch sx={{ display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none', border: '1px solid rgba(255,255,255,.15)', background: 'linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.045))', transition: 'transform .22s ease, border-color .22s ease, box-shadow .22s ease', '&:hover': { transform: 'translateY(-5px)', borderColor: `${image.tone}aa`, boxShadow: `0 18px 45px ${image.tone}24` } }}>
              <Box sx={{ position: 'relative', height: 185, overflow: 'hidden', background: `radial-gradient(ellipse at 65% 45%, ${image.tone}88, transparent 55%), linear-gradient(135deg,#493553,#2d1e39)` }}>
                <Box component="img" src={image.src} alt={image.alt} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: .9, mixBlendMode: 'screen', transition: 'transform .4s ease', '.MuiCard-root:hover &': { transform: 'scale(1.045)' } }} />
                <Typography sx={{ position: 'absolute', top: 14, left: 14, color: '#fff', fontSize: 'var(--fs-11)', letterSpacing: '.14em', fontWeight: 700, textShadow: '0 1px 12px rgba(0,0,0,.55)' }}>{String(index + 2).padStart(2, '0')} / 06</Typography>
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
