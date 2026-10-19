import { Box, Container, Divider, Grid, Stack, Typography } from '@mui/material';
import { SiteShell, PageHero, SectionIntro } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';

const stories = [
  { brand: 'Pixllove', type: 'Dating app', metric: '24%', result: 'less paywall drop-off', quote: 'Nova and Ben helped our dating app reduce paywall drop-off by 24% through journey analysis and optimization.', image: '/assets/case-pixllove.png', imageFit: 'contain', imageBackground: '#10070e', href: 'https://pixllove.com/' },
  { brand: 'All in 1 - Media', type: 'Creative studio', metric: '+32%', result: 'revenue over six months', quote: 'We use PixlPush to manage our email campaigns. Over the past six months, we increased revenue by 32% while tracking and optimizing campaign performance.', image: '/assets/case-auramagi.avif', imageFit: 'cover', href: 'https://ai1-media.de/en' },
  { brand: 'Auramagie', type: 'Manifestation app', metric: '3% → 27%', result: 'D7 retention', quote: 'We struggled with D7 retention, which was just 3%. With targeted content and behavior-based campaigns, we increased it to 27%.', image: '/assets/case-ai1-media.webp', imageFit: 'cover', href: 'https://auramagie.de/' },
];

export default function CaseStudiesPage() {
  return <SiteShell>
    <PageHero dark eyebrow="CUSTOMER CASE STUDIES" title="From user behavior to measurable results." description="See how PixlPush helps digital teams improve retention and grow revenue with behavior-based campaigns." />
    <Container maxWidth="lg" sx={{ py: { xs: 9, md: 14 } }}>
      <SectionIntro eyebrow="CUSTOMER STORIES" title="Results shaped by real user behavior." />
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {stories.map((story) => <Grid item xs={12} md={4} key={story.brand}>
          <Box sx={{ height: '100%', overflow: 'hidden', borderRadius: 4, bgcolor: '#fff', border: '1px solid #eee7f1', boxShadow: '0 8px 28px rgba(40,20,54,.06)' }}>
            <Box sx={{ height: { xs: 210, md: 190 }, display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: story.imageBackground ?? '#f6f3f7' }}>
              <Box component="img" src={story.image} alt={`${story.brand} customer story`} sx={{ display: 'block', width: '100%', height: '100%', objectFit: story.imageFit === 'contain' ? 'contain' : 'cover', objectPosition: 'center' }} />
            </Box>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Box><Typography fontWeight={700}>{story.brand}</Typography><Box component="a" href={story.href} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-block', mt: .35, color: '#5b18bc', fontSize: "var(--fs-12)", fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>Visit website ↗</Box></Box>
                <Typography color="text.secondary" fontSize="var(--fs-12)">{story.type}</Typography>
              </Stack>
              <Box sx={{ mt: 2, display: 'inline-flex', px: 1.2, py: .4, borderRadius: 1, bgcolor: '#e6ffd8', color: '#263b25', fontSize: "var(--fs-12)", fontWeight: 700, letterSpacing: '.04em' }}>CUSTOMER RESULT</Box>
              <Typography sx={{ mt: 1.5, fontSize: { xs: "var(--fs-40)", md: "var(--fs-40)" }, color: '#5b18bc', fontWeight: 700, letterSpacing: '-.06em', lineHeight: 1 }}>{story.metric}</Typography>
              <Typography fontSize="var(--fs-16)" fontWeight={600} sx={{ mt: .5 }}>{story.result}</Typography>
              <Divider sx={{ my: 2 }} />
              <Typography component="blockquote" sx={{ m: 0, color: 'text.secondary', fontSize: "var(--fs-13)", lineHeight: 1.65 }}>&ldquo;{story.quote}&rdquo;</Typography>
            </Box>
          </Box>
        </Grid>)}
      </Grid>
    </Container>
    <Box sx={{ bgcolor: '#f3eafa', py: 10 }}><Container maxWidth="md"><Typography variant="h3" textAlign="center">Your next retention win could be the one your team talks about.</Typography></Container></Box>
    <CTA />
  </SiteShell>;
}
