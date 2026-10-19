import type { Metadata } from 'next';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import BoltRounded from '@mui/icons-material/BoltRounded';
import FavoriteBorderRounded from '@mui/icons-material/FavoriteBorderRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';

export const metadata: Metadata = {
  title: 'Customer Engagement Use Cases | PixlPush',
  description: 'Explore customer engagement use cases for app, SaaS and digital product teams—from onboarding and feature adoption to re-engagement, subscription renewals and win-back journeys.',
  alternates: { canonical: '/use-cases' },
  openGraph: {
    title: 'Customer Engagement Use Cases | PixlPush',
    description: 'Find a practical starting point for onboarding, engagement, conversion and customer retention journeys.',
    url: '/use-cases',
    type: 'website',
  },
};

const challengeGroups = [
  {
    id: 'activation',
    index: '01',
    label: 'ACTIVATION & ADOPTION',
    title: 'Help users find their “aha” moment.',
    intro: 'The first sessions set the tone. Give new users a clearer path to value, and help existing customers discover what they can do next.',
    color: 'lilac',
    icon: BoltRounded,
    cases: [
      { title: 'Onboarding stalls', when: 'A new user signs up but hasn’t completed setup.', action: 'Send a helpful, well-timed nudge that guides them toward the next useful action.', tag: 'New users' },
      { title: 'A feature goes undiscovered', when: 'A user has not tried a capability relevant to them.', action: 'Introduce the feature in context, based on the user’s activity and lifecycle stage.', tag: 'Feature adoption' },
    ],
  },
  {
    id: 'engagement',
    index: '02',
    label: 'ENGAGEMENT & CONVERSION',
    title: 'Reconnect when intent starts to fade.',
    intro: 'Respond to meaningful behavior—not just a calendar reminder. Build targeted journeys around drop-off, inactivity and unfinished intent.',
    color: 'peach',
    icon: TrendingUpRounded,
    cases: [
      { title: 'Activity drops off', when: 'A previously active user becomes quiet.', action: 'Create a re-engagement audience and reach out with a relevant reason to return.', tag: 'Re-engagement' },
      { title: 'An important action is abandoned', when: 'A user starts a key action but does not finish it.', action: 'Use a reminder to bring them back to where they left off.', tag: 'Abandoned action' },
      { title: 'A plan is viewed, but not chosen', when: 'A user shows purchase intent without completing checkout.', action: 'Follow up with clear, contextual information across email or push.', tag: 'Conversion' },
    ],
  },
  {
    id: 'retention',
    index: '03',
    label: 'SUBSCRIPTION & RETENTION',
    title: 'Make the next chapter feel relevant.',
    intro: 'Subscription changes are important customer moments. Use status and timing to shape more considered renewal and win-back communication.',
    color: 'mint',
    icon: FavoriteBorderRounded,
    cases: [
      { title: 'A subscription is cancelled', when: 'A customer changes or ends their subscription.', action: 'Acknowledge the change and tailor follow-up to the customer’s situation.', tag: 'Cancellation' },
      { title: 'A subscription has expired', when: 'A former subscriber may be ready to return.', action: 'Reconnect with a timely invitation that reflects their previous relationship with your product.', tag: 'Win-back' },
    ],
  },
];

function ChallengeCard({ item, index }: { item: (typeof challengeGroups)[number]['cases'][number]; index: number }) {
  return (
    <Box component="article" className="uc-challenge-card" sx={{ animationDelay: `${index * 100}ms` }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography className="uc-challenge-tag">{item.tag}</Typography>
        <ArrowOutwardRounded className="uc-challenge-arrow" />
      </Stack>
      <Typography component="h3" className="uc-challenge-title">{item.title}</Typography>
      <Box className="uc-challenge-detail">
        <Typography component="span">THE MOMENT</Typography>
        <Typography>{item.when}</Typography>
      </Box>
      <Box className="uc-challenge-detail uc-response">
        <Typography component="span">A THOUGHTFUL RESPONSE</Typography>
        <Typography>{item.action}</Typography>
      </Box>
    </Box>
  );
}

export default function UseCasesPage() {
  return (
    <SiteShell>
      <Box component="header" className="uc-intro-hero">
        <div className="uc-hero-wash" />
        <Container maxWidth="lg" className="uc-intro-inner">
          <Typography className="uc-intro-kicker">USE CASES · CUSTOMER LIFECYCLE</Typography>
          <Typography variant="h1" className="uc-intro-title">Every growth challenge starts with a <span>moment.</span></Typography>
          <Typography className="uc-intro-copy">A user gets stuck. An active customer goes quiet. A renewal is coming up. Find the moments that matter to your business—and explore ways to respond with more relevance.</Typography>
          <Stack direction="row" justifyContent="center" gap={1.2} flexWrap="wrap" className="uc-shortcuts">
            <Button href="#activation" startIcon={<BoltRounded />}>Get users started</Button>
            <Button href="#engagement" startIcon={<ShoppingBagOutlined />}>Recover intent</Button>
            <Button href="#retention" startIcon={<ReplayRounded />}>Retain customers</Button>
          </Stack>
          <a className="uc-scroll-cue" href="#playbooks">EXPLORE THE PLAYBOOKS <ArrowDownwardRounded /></a>
        </Container>
        <Box className="uc-marquee" aria-hidden="true"><div>ONBOARDING <i /> FEATURE ADOPTION <i /> RE-ENGAGEMENT <i /> CONVERSION <i /> WIN-BACK <i /> ONBOARDING <i /> FEATURE ADOPTION <i /> RE-ENGAGEMENT <i /> CONVERSION <i /> WIN-BACK <i /></div></Box>
      </Box>

      <Box component="section" id="playbooks" className="uc-playbook-library" aria-labelledby="uc-library-title">
        <Container maxWidth="lg">
          <Box className="uc-library-heading">
            <Box><Typography className="uc-library-eyebrow">THE PLAYBOOK LIBRARY</Typography><Typography id="uc-library-title" variant="h2" className="uc-library-title">Find your starting point.</Typography></Box>
            <Typography className="uc-library-copy">Use these common scenarios as a starting point. Your audience, timing and journey rules stay in your team’s hands.</Typography>
          </Box>
          {challengeGroups.map(({ id, index, label, title, intro, color, icon: Icon, cases }) => (
            <Box component="section" id={id} key={id} className={`uc-challenge-group uc-group-${color}`} aria-labelledby={`${id}-title`}>
              <Box className="uc-group-heading">
                <Box className="uc-group-index">{index}</Box>
                <Box className="uc-group-heading-copy"><Typography className="uc-group-label">{label}</Typography><Typography id={`${id}-title`} component="h3" className="uc-group-title">{title}</Typography><Typography className="uc-group-intro">{intro}</Typography></Box>
                <Box className="uc-group-icon"><Icon /></Box>
              </Box>
              <Grid container spacing={1.5}>
                {cases.map((item, itemIndex) => <Grid item xs={12} md={cases.length === 2 ? 6 : 4} key={item.title}><ChallengeCard item={item} index={itemIndex} /></Grid>)}
              </Grid>
            </Box>
          ))}
          <Box className="uc-library-footnote"><AutoAwesomeRounded /><Typography>One audience. One timely message. One better-informed next step.</Typography></Box>
        </Container>
      </Box>

      <Box component="section" className="uc-usecase-cta" aria-label="Getting started with customer journeys">
        <Container maxWidth="lg"><Grid container alignItems="center" spacing={3}><Grid item xs={12} md={8}><Typography className="uc-usecase-cta-kicker">START WITH WHAT MATTERS NOW</Typography><Typography className="uc-usecase-cta-title">You don’t need to fix everything at once.</Typography><Typography className="uc-usecase-cta-copy">Choose one customer moment, build a journey around it, and learn what to improve next.</Typography></Grid><Grid item xs={12} md={4}><Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />} className="uc-usecase-cta-button">Start with PixlPush</Button></Grid></Grid></Container>
      </Box>
      <CTA title="Make the next customer moment count." description="Bring your product signals and customer journeys together in one workspace built for digital teams." />
    </SiteShell>
  );
}
