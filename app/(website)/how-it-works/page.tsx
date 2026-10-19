import type { Metadata } from 'next';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import HubRounded from '@mui/icons-material/HubRounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import { SiteShell } from '@/components/website/SiteShell';
import { CTA } from '@/components/website/PageBlocks';

export const metadata: Metadata = {
  title: 'How PixlPush Works | Turn Product Behavior Into User Journeys',
  description: 'See how PixlPush connects product data, audience segments, automated email and push journeys, and analytics to help digital teams improve engagement and retention.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How PixlPush Works | Product Engagement & Retention',
    description: 'A practical workflow for turning real product behavior into timely, measurable customer communication.',
    url: '/how-it-works',
    type: 'website',
  },
};

const steps = [
  { number: '01', title: 'Connect your product data', body: 'Bring app, website or SaaS events and user attributes into one workspace, so every campaign can respond to what people actually do.', note: 'Events + user attributes', icon: HubRounded, tone: 'peach' },
  { number: '02', title: 'Build meaningful audiences', body: 'Combine lifecycle stage, behavior, profile details and engagement into reusable audience groups for relevant communication.', note: 'Segments that stay useful', icon: '◎', tone: 'lilac' },
  { number: '03', title: 'Create a journey around the moment', body: 'Set triggers, conditions, waits, exits and re-entry rules to coordinate communication across email and push notifications.', note: 'Rules your team controls', icon: '↗', tone: 'mint' },
  { number: '04', title: 'Deliver a more personal message', body: 'Use user context and campaign content to reach the right audience at the right point in their lifecycle.', note: 'Email + push', icon: '✳', tone: 'lilac' },
  { number: '05', title: 'Learn and improve', body: 'Review delivery, engagement and journey performance in analytics, then refine audiences and messages over time.', note: 'Measure → improve', icon: InsightsRounded, tone: 'peach' },
];

const loop = [
  ['Signal', 'A user action or lifecycle event'],
  ['Decision', 'Audience and journey rules'],
  ['Message', 'Email or push communication'],
  ['Learning', 'Performance insights'],
];

function WorkflowPreview() {
  return (
    <Box className="how-workflow" aria-label="Example PixlPush customer journey">
      <Stack direction="row" justifyContent="space-between" alignItems="center" className="how-workflow-top">
        <Stack direction="row" alignItems="center" gap={1.2}>
          <Box className="how-workflow-mark"><AutoAwesomeRounded /></Box>
          <Box><Typography className="how-mini-label">JOURNEY BUILDER</Typography><Typography className="how-workflow-title">Welcome journey</Typography></Box>
        </Stack>
        <Box className="how-live"><span /> Active</Box>
      </Stack>
      <Box className="how-flow-line" aria-hidden="true" />
      <Stack className="how-flow-nodes">
        {[
          ['TRIGGER', 'User signs up', 'peach'],
          ['CONDITION', 'Has not completed setup', 'lilac'],
          ['WAIT', '2 days', 'mint'],
          ['SEND', 'Helpful onboarding email', 'peach'],
        ].map(([label, title, color], index) => (
          <Box key={label} className={`how-flow-node how-${color}`} sx={{ animationDelay: `${index * 180}ms` }}>
            <Box className="how-flow-dot">{index + 1}</Box>
            <Box><Typography className="how-mini-label">{label}</Typography><Typography className="how-node-title">{title}</Typography></Box>
          </Box>
        ))}
      </Stack>
      <Box className="how-workflow-foot"><span className="how-foot-pulse" />Built from your product signals <span className="how-foot-separator">·</span> Adjusted by your team</Box>
    </Box>
  );
}

export default function HowItWorksPage() {
  return (
    <SiteShell>
      <Box component="header" className="how-hero">
        <div className="how-hero-orb how-orb-one" /><div className="how-hero-orb how-orb-two" />
        <Container maxWidth="lg" className="how-hero-inner">
          <Grid container spacing={{ xs: 6, md: 7 }} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography className="how-eyebrow"><span /> THE PIXLPUSH WORKFLOW</Typography>
              <Typography variant="h1" className="how-hero-title">Make every user signal <span>count.</span></Typography>
              <Typography className="how-hero-copy">PixlPush helps digital teams turn product behavior into relevant customer journeys—across audiences, email, push and analytics.</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} sx={{ mt: 4 }}>
                <Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />} className="how-primary-cta">Build your first journey</Button>
                <Button href="/product" className="how-secondary-cta">Explore the platform</Button>
              </Stack>
              <Stack direction="row" gap={2.5} flexWrap="wrap" sx={{ mt: 4 }}>
                {['Behavior-based audiences', 'Email and push journeys', 'Built-in analytics'].map((label) => <Typography key={label} className="how-proof-point"><span>✓</span>{label}</Typography>)}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}><WorkflowPreview /></Grid>
          </Grid>
        </Container>
        <Box className="how-hero-bottom"><Container maxWidth="lg"><Stack direction="row" gap={1} alignItems="center"><span className="how-bottom-rule" /> FROM PRODUCT SIGNAL TO CONTINUOUS LEARNING</Stack></Container></Box>
      </Box>

      <Box component="section" className="how-steps-section" aria-labelledby="how-steps-title">
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 3, md: 7 }} alignItems="end" className="how-section-heading">
            <Grid item xs={12} md={7}><Typography className="how-section-eyebrow">A CLEAR, CONNECTED PROCESS</Typography><Typography id="how-steps-title" variant="h2" className="how-section-title">From first event to a better next step.</Typography></Grid>
            <Grid item xs={12} md={5}><Typography className="how-section-intro">A repeatable way to understand users, coordinate communication and learn from every interaction—without losing sight of the customer.</Typography></Grid>
          </Grid>
          <Box className="how-step-list">
            {steps.map(({ number, title, body, note, icon: Icon, tone }) => (
              <Box key={number} className="how-step-row">
                <Typography className="how-step-number">{number}</Typography>
                <Box className={`how-step-icon how-${tone}`}>{typeof Icon === 'string' ? <span>{Icon}</span> : <Icon />}</Box>
                <Box className="how-step-copy"><Typography variant="h3" className="how-step-title">{title}</Typography><Typography className="how-step-body">{body}</Typography></Box>
                <Typography className="how-step-note">{note}<ArrowOutwardRounded /></Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box component="section" className="how-loop-section" aria-labelledby="how-loop-title">
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
            <Grid item xs={12} md={5}>
              <Typography className="how-loop-eyebrow">THE RETENTION LOOP</Typography>
              <Typography id="how-loop-title" variant="h2" className="how-loop-title">A system that gets smarter with every cycle.</Typography>
              <Typography className="how-loop-copy">PixlPush connects the moments before and after a message. Use what you learn from engagement and journey performance to shape what happens next.</Typography>
              <Stack direction="row" gap={1.2} alignItems="center" className="how-loop-caption"><InsightsRounded /> One connected workspace for engagement and retention</Stack>
            </Grid>
            <Grid item xs={12} md={7}>
              <Box className="how-loop-grid">
                {loop.map(([title, detail], index) => <Box key={title} className="how-loop-card" sx={{ animationDelay: `${index * 140}ms` }}><Typography className="how-loop-index">0{index + 1}</Typography><Typography className="how-loop-card-title">{title}</Typography><Typography className="how-loop-card-detail">{detail}</Typography></Box>)}
                <Box className="how-loop-center"><AutoAwesomeRounded /><span>PIXLPUSH</span></Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <CTA title="Put your product signals to work." description="Start with the user moments that matter most, then build and improve journeys around them." />
    </SiteShell>
  );
}
