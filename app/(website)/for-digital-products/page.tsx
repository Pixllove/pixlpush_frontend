import type { Metadata } from 'next';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import ArrowDownwardRounded from '@mui/icons-material/ArrowDownwardRounded';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import AppsRounded from '@mui/icons-material/AppsRounded';
import AutoGraphRounded from '@mui/icons-material/AutoGraphRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DevicesRounded from '@mui/icons-material/DevicesRounded';
import EmailRounded from '@mui/icons-material/EmailRounded';
import LanguageRounded from '@mui/icons-material/LanguageRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import { SiteShell } from '@/components/website/SiteShell';
import DigitalProductPlayground from '@/components/website/DigitalProductPlayground';

export const metadata: Metadata = {
  title: 'Customer Engagement for Apps, Websites & SaaS | PixlPush',
  description: 'Connect mobile apps, websites and SaaS products to behavior-based email, push notification and in-app journeys with PixlPush.',
  alternates: { canonical: '/for-digital-products' },
  openGraph: {
    title: 'PixlPush for Digital Products',
    description: 'Bring app, web and SaaS customer journeys together with relevant email, push and in-product communication.',
    url: '/for-digital-products',
    type: 'website',
  },
};

const productTypes = [
  { title: 'Mobile apps', type: '01 / APP', body: 'Welcome new users, nudge the next useful action and bring people back with timely push and email.', icon: AppsRounded, tone: 'lilac' },
  { title: 'Websites & web apps', type: '02 / WEB', body: 'Turn browsing and product activity into relevant follow-ups, browser messaging and in-product prompts.', icon: LanguageRounded, tone: 'coral' },
  { title: 'SaaS platforms', type: '03 / SAAS', body: 'Support onboarding, feature discovery and account health across the customer lifecycle.', icon: DevicesRounded, tone: 'mint' },
  { title: 'Subscription businesses', type: '04 / LIFECYCLE', body: 'Coordinate trial, renewal and win-back communication around real customer context.', icon: AutoGraphRounded, tone: 'gold' },
];

const moments = [
  { num: '01', title: 'A promising first session', body: 'Welcome someone while the product is still fresh in their mind.', icon: AppsRounded },
  { num: '02', title: 'A journey left unfinished', body: 'Offer a helpful next step when setup or checkout stalls.', icon: AutoGraphRounded },
  { num: '03', title: 'A feature worth discovering', body: 'Introduce capabilities that fit what a customer already does.', icon: DevicesRounded },
  { num: '04', title: 'A customer going quiet', body: 'Reconnect with context rather than another generic reminder.', icon: EmailRounded },
];

export default function DigitalProductsPage() {
  return (
    <SiteShell>
      <Box component="header" className="dpx-hero">
        <div className="dpx-hero-orb dpx-orb-one" /><div className="dpx-hero-orb dpx-orb-two" />
        <Container maxWidth="lg" className="dpx-hero-inner">
          <Box className="dpx-hero-copy">
            <Typography className="dpx-kicker"><span /> CUSTOMER ENGAGEMENT FOR DIGITAL PRODUCTS</Typography>
            <Typography variant="h1" className="dpx-title">The next best message starts with <em>what users do.</em></Typography>
            <Typography className="dpx-lede">PixlPush helps app, web and SaaS teams turn product behavior into thoughtful customer journeys—across push notifications, email and in-product messages.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} className="dpx-actions">
              <Button href="#live-demo" variant="contained" endIcon={<ArrowDownwardRounded />}>Try the live demo</Button>
              <Button href="/get-started" className="dpx-secondary">Explore PixlPush <ArrowOutwardRounded /></Button>
            </Stack>
            <Box className="dpx-proof"><CheckRounded /> Built for mobile apps <i /> <CheckRounded /> Web products <i /> <CheckRounded /> Subscription journeys</Box>
          </Box>

          <Box className="dpx-orbit" aria-label="Product signals connect to PixlPush email and push journeys">
            <Box className="dpx-orbit-ring dpx-ring-a" /><Box className="dpx-orbit-ring dpx-ring-b" />
            <Box className="dpx-orbit-core"><Box component="img" src="/assets/favicon.webp" alt="" className="dpx-core-mark" /><b>PixlPush</b><small>customer journeys</small></Box>
            <Box className="dpx-orbit-node dpx-node-app"><AppsRounded /><span>APP</span><b>Product activity</b></Box>
            <Box className="dpx-orbit-node dpx-node-web"><LanguageRounded /><span>WEB</span><b>Site behavior</b></Box>
            <Box className="dpx-orbit-node dpx-node-saas"><DevicesRounded /><span>SAAS</span><b>Lifecycle signals</b></Box>
            <Box className="dpx-orbit-delivery dpx-delivery-push"><NotificationsActiveRounded /><span><small>DELIVER THROUGH</small><b>Push notification</b></span><i>↗</i></Box>
            <Box className="dpx-orbit-delivery dpx-delivery-email"><EmailRounded /><span><small>OR FOLLOW UP WITH</small><b>Personalized email</b></span><i>↗</i></Box>
            <Box className="dpx-orbit-caption"><span /> One customer. Connected moments.</Box>
          </Box>
        </Container>
        <Box className="dpx-hero-ribbon"><span>PRODUCT SIGNALS</span><i /> <span>USEFUL AUDIENCES</span><i /> <span>RELEVANT MESSAGES</span><i /> <span>MEASURABLE LEARNING</span></Box>
      </Box>

      <Box component="section" className="dp-demo-section" aria-labelledby="dp-demo-heading">
        <Container maxWidth="lg"><DigitalProductPlayground /></Container>
      </Box>

      <Box component="section" className="dpx-products" aria-labelledby="dpx-products-title">
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 8 }} alignItems="end" className="dpx-products-heading">
            <Grid item xs={12} md={7}><Typography className="dpx-section-eyebrow">ONE ENGAGEMENT LAYER · MANY PRODUCT SURFACES</Typography><Typography id="dpx-products-title" variant="h2">Fits the way your product grows.</Typography></Grid>
            <Grid item xs={12} md={5}><Typography className="dpx-section-intro">Keep the experience coherent as customers move between app sessions, browser visits, accounts and inboxes.</Typography></Grid>
          </Grid>
          <Grid container spacing={1.5} className="dpx-product-grid">{productTypes.map(({ title, type, body, icon: Icon, tone }, index) => (
            <Grid item xs={12} sm={6} key={title}>
              <Box component="article" className={`dpx-product-card dpx-product-${tone}`}>
                <Box className="dpx-card-top"><Typography>{type}</Typography><span>0{index + 1}</span></Box>
                <Box className="dpx-product-icon"><Icon /></Box>
                <Typography component="h3">{title}</Typography><Typography className="dpx-product-body">{body}</Typography>
                <Box className="dpx-product-link">Built around your customer <ArrowOutwardRounded /></Box>
              </Box>
            </Grid>
          ))}</Grid>
        </Container>
      </Box>

      <Box component="section" className="dpx-moments" aria-labelledby="dpx-moments-title">
        <Container maxWidth="lg">
          <Box className="dpx-moments-heading"><Typography className="dpx-section-eyebrow">GOOD TIMING FEELS PERSONAL</Typography><Typography id="dpx-moments-title" variant="h2">Reach out when there’s a reason.</Typography><Typography>Bring the right context to the moments that shape activation, engagement and retention.</Typography></Box>
          <Box className="dpx-moment-rail">{moments.map(({ num, title, body, icon: Icon }) => <Box component="article" className="dpx-moment" key={num}><Box className="dpx-moment-top"><span>{num}</span><Icon /></Box><Typography component="h3">{title}</Typography><Typography>{body}</Typography></Box>)}</Box>
          <Box className="dpx-moment-foot"><span className="dpx-pulse" /> The customer context stays connected from signal to follow-up.</Box>
        </Container>
      </Box>

      <Box component="section" className="dpx-last" aria-labelledby="dpx-last-title">
        <Container maxWidth="lg" className="dpx-last-inner">
          <Box><Typography className="dpx-section-eyebrow">LESS FRAGMENTATION. MORE CONTEXT.</Typography><Typography id="dpx-last-title" variant="h2">Make every product moment more useful.</Typography><Typography>Bring signals, audiences and customer communication together with PixlPush.</Typography></Box>
          <Box className="dpx-last-panel">
            <Typography className="dpx-panel-label">FROM SIGNAL TO EXPERIENCE</Typography>
            <Box className="dpx-last-steps"><span><i>01</i><b>Understand behavior</b></span><span><i>02</i><b>Reach with relevance</b></span><span><i>03</i><b>Learn what works</b></span></Box>
            <Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />}>Create your free account</Button>
            <Typography className="dpx-last-note">One connected workspace for your customer lifecycle.</Typography>
          </Box>
        </Container>
      </Box>
    </SiteShell>
  );
}
