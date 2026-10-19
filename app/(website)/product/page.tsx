import type { Metadata } from 'next';
import Image from 'next/image';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CampaignRounded from '@mui/icons-material/CampaignRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import { SiteShell } from '@/components/website/SiteShell';

export const metadata: Metadata = {
  title: 'PixlPush Product | Customer Engagement Platform',
  description: 'Explore the PixlPush customer engagement platform for behavior-based audiences, email and push campaigns, automated journeys, localization and analytics.',
  alternates: { canonical: '/product' },
  openGraph: {
    title: 'The PixlPush Customer Engagement Platform',
    description: 'Bring customer signals, audiences, messaging journeys and performance insights together in PixlPush.',
    url: '/product',
    type: 'website',
  },
};

const capabilities = [
  { id: 'campaigns', index: '01', title: 'Campaigns that know the context', copy: 'Compose coordinated email and push campaigns around the person, their behavior and the moment—not just a send date.', icon: CampaignRounded, detail: ['Email and push in one workspace', 'Personalized content and delivery', 'Clear campaign-level reporting'], tone: 'violet' },
  { id: 'audiences', index: '02', title: 'Audiences built from real signals', copy: 'Bring profile attributes, product events and engagement into reusable audiences your team can understand and act on.', icon: GroupsRounded, detail: ['Behavior and lifecycle criteria', 'Reusable audience definitions', 'Audience context for each journey'], tone: 'coral' },
  { id: 'journeys', index: '03', title: 'Journeys that adapt as people move', copy: 'Connect triggers, conditions, wait steps and exits to create useful experiences from first session through retention.', icon: RouteRounded, detail: ['Event-based entry points', 'Branching and wait conditions', 'Goals, exits and re-entry rules'], tone: 'blue' },
  { id: 'insights', index: '04', title: 'Insights that close the loop', copy: 'See delivery and engagement signals alongside the journeys that created them, then use what you learn to improve.', icon: InsightsRounded, detail: ['Delivery and engagement metrics', 'Journey and channel comparison', 'A clearer view of what to refine'], tone: 'mint' },
];

const workflow = [
  { step: '01', title: 'Capture the signal', text: 'Understand what a customer did and where they are in the lifecycle.' },
  { step: '02', title: 'Choose the audience', text: 'Use customer attributes and behavior to decide who needs what.' },
  { step: '03', title: 'Coordinate the journey', text: 'Deliver a timely message through email or push.' },
  { step: '04', title: 'Learn and improve', text: 'Review engagement and tune the experience over time.' },
];

function ProductWorkspacePreview() {
  return (
    <Box component="figure" className="prd-window" aria-label="PixlPush Analytics dashboard preview with illustrative sample values">
      <Image src="/assets/product-analytics-dashboard.png" alt="PixlPush Analytics dashboard with navigation, campaign metrics and engagement chart" width={2872} height={1392} priority />
      <Box className="prd-demo-header-copy">6 of your 6 key metrics are trending up in this demo.</Box>
      <Box className="prd-demo-values" aria-label="Illustrative sample metrics">
        <span className="prd-value-1">128,450</span><span className="prd-value-2">82,640</span><span className="prd-value-3">45,810</span>
        <span className="prd-value-4">48.6%</span><span className="prd-value-5">19.4%</span><span className="prd-value-6">2.8M</span>
        <small className="prd-change-1">↑ 12.4% vs previous 30 days</small><small className="prd-change-2">↑ 18.7% vs previous 30 days</small><small className="prd-change-3">↑ 9.2% vs previous 30 days</small>
        <small className="prd-change-4">↑ 6.8 pts vs previous 30 days</small><small className="prd-change-5">↑ 3.4 pts vs previous 30 days</small><small className="prd-change-6">↑ 21.6% vs previous 30 days</small>
      </Box>
      <Box className="prd-demo-chart" aria-hidden="true"><svg viewBox="0 0 900 150" preserveAspectRatio="none"><path d="M0 127 C44 121 61 91 105 101 S161 125 205 89 S266 71 310 84 S376 45 420 62 S477 27 522 46 S588 78 633 49 S691 63 735 35 S795 44 839 17 S875 20 900 9" fill="none" stroke="#7138be" strokeWidth="4" /><path d="M0 139 C48 132 69 115 107 119 S165 100 207 110 S270 91 310 99 S376 72 419 84 S478 58 522 74 S584 94 632 68 S691 81 735 55 S795 64 839 42 S875 45 900 33" fill="none" stroke="#ef9b79" strokeWidth="3" /></svg></Box>
      <Box className="prd-demo-tag">SAMPLE DASHBOARD DATA</Box>
    </Box>
  );
}

export default function ProductPage() {
  return (
    <SiteShell>
      <Box component="header" className="prd-hero">
        <Container maxWidth="lg" className="prd-hero-inner">
          <Box className="prd-hero-copy"><Typography className="prd-eyebrow"><span /> THE PIXLPUSH PLATFORM</Typography><Typography variant="h1">Customer engagement, <em>connected.</em></Typography><Typography className="prd-hero-description">One product workspace to turn customer signals into relevant campaigns, adaptive journeys and measurable learning.</Typography><Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2} className="prd-hero-actions"><Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />}>Explore PixlPush</Button><Button href="#platform-capabilities" className="prd-hero-link">See what’s inside <span>↓</span></Button></Stack><Box className="prd-hero-assurance"><span /> EMAIL <i /> PUSH <i /> JOURNEYS <i /> ANALYTICS</Box></Box>
          <ProductWorkspacePreview />
          <Box className="prd-hero-underlay"><span>ONE OPERATING SPACE</span><i /> CUSTOMER SIGNALS → MEANINGFUL EXPERIENCES</Box>
        </Container>
      </Box>

      <Box component="section" className="prd-capabilities" id="platform-capabilities" aria-labelledby="prd-capabilities-title">
        <Container maxWidth="lg"><Box className="prd-section-intro"><Typography className="prd-eyebrow">THE PRODUCT, AT WORK</Typography><Typography id="prd-capabilities-title" variant="h2">Everything your team needs to move from signal to relationship.</Typography><Typography>Bring the essential parts of customer engagement together, without losing sight of the person behind each event.</Typography></Box>
          <Box className="prd-capability-list">{capabilities.map(({ id, index, title, copy, icon: Icon, detail, tone }) => <Box component="article" className={`prd-capability prd-${tone}`} id={id} key={id}><Box className="prd-cap-number">{index}</Box><Box className="prd-cap-main"><Box className="prd-cap-title"><Box><Icon /></Box><Typography component="h3">{title}</Typography></Box><Typography className="prd-cap-copy">{copy}</Typography></Box><Box className="prd-cap-detail">{detail.map((point) => <span key={point}><i>✓</i>{point}</span>)}</Box></Box>)}</Box>
        </Container>
      </Box>

      <Box component="section" className="prd-workflow" aria-labelledby="prd-workflow-title"><Container maxWidth="lg"><Box className="prd-workflow-head"><Box><Typography className="prd-eyebrow">A CONNECTED OPERATING MODEL</Typography><Typography id="prd-workflow-title" variant="h2">One continuous customer loop.</Typography></Box><Typography>Less handoff between tools. More continuity between what customers do and what your team does next.</Typography></Box><Box className="prd-workflow-track">{workflow.map(({ step, title, text }, index) => <Box className="prd-workflow-step" key={step}><Box className="prd-step-marker"><span>{step}</span>{index < workflow.length - 1 && <i />}</Box><Typography component="h3">{title}</Typography><Typography>{text}</Typography></Box>)}</Box></Container></Box>

      <Box component="section" className="prd-intelligence"><Container maxWidth="lg"><Grid container spacing={{ xs: 4, md: 8 }} alignItems="center"><Grid item xs={12} md={6}><Box className="prd-intelligence-mark"><AutoAwesomeRounded /></Box><Typography className="prd-eyebrow">INTELLIGENCE THAT SUPPORTS THE TEAM</Typography><Typography variant="h2">Make better moves with clearer context.</Typography><Typography className="prd-intelligence-copy">PixlPush helps teams understand engagement and act on it—from adapting journeys to localizing messages and reviewing what’s working.</Typography><Button href="/how-it-works" endIcon={<ArrowOutwardRounded />}>See how the platform works</Button></Grid><Grid item xs={12} md={6}><Box className="prd-intel-panel"><Box className="prd-intel-panel-head"><span>PIXLPUSH ASSIST</span><i>● READY</i></Box><Typography>Ideas grounded in your engagement context.</Typography><Box className="prd-intel-suggestion"><span>01</span><Box><b>Find a journey opportunity</b><small>Review where users pause during onboarding.</small></Box><ArrowOutwardRounded /></Box><Box className="prd-intel-suggestion"><span>02</span><Box><b>Adapt for every audience</b><small>Prepare relevant copy for each language and segment.</small></Box><ArrowOutwardRounded /></Box><Box className="prd-intel-suggestion"><span>03</span><Box><b>Learn from campaign results</b><small>Compare delivery and engagement across channels.</small></Box><ArrowOutwardRounded /></Box><small className="prd-intel-disclaimer">Suggestions are designed to support—not replace—team decisions.</small></Box></Grid></Grid></Container></Box>

      <Box component="section" className="prd-cta"><Container maxWidth="lg" className="prd-cta-inner"><Box><Typography>YOUR CUSTOMER ENGAGEMENT STACK, IN ONE PLACE</Typography><Typography variant="h2">Build the next chapter of your customer lifecycle.</Typography><span>Bring your team’s signals, messaging and measurement into PixlPush.</span></Box><Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />}>Get started with PixlPush</Button><Box className="prd-cta-orbit" /></Container></Box>
    </SiteShell>
  );
}
