import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import EmailRounded from '@mui/icons-material/EmailRounded';
import InsightsRounded from '@mui/icons-material/InsightsRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

export type IndustryKey = 'gaming' | 'media' | 'ecommerce' | 'mobile' | 'financial';

const industryContent = {
  gaming: {
    name: 'Gaming', tag: 'FOR GAME DEVELOPERS & PUBLISHERS',
    title: <>Turn player signals into <em>the next great session.</em></>,
    intro: 'Welcome new players, build habits around the moments they enjoy and bring lapsed players back with timely, behavior-based messaging.',
    image: '/assets/retention-journey-cartoon.webp', imageAlt: 'A connected player journey with lifecycle touchpoints',
    imageLabel: 'PLAYER JOURNEY', imageTitle: 'From first launch to next session', metric: '01', metricLabel: 'PLAYER ONBOARDING',
    proof: ['Player lifecycle journeys', 'Event-based audience groups', 'Push and email in one flow'],
    sections: [
      ['Help players reach their first win.', 'Guide new players through tutorials, account setup and the first moments that make a game click.', 'Onboarding'],
      ['Bring the right players back.', 'Use activity and lifecycle signals to reconnect with players after a quiet spell or an unfinished session.', 'Re-engagement'],
      ['Make live moments count.', 'Coordinate event announcements, new content and relevant offers for the players most likely to care.', 'Live operations'],
    ],
  },
  media: {
    name: 'News & Media', tag: 'FOR PUBLISHERS & MEDIA BRANDS',
    title: <>Make every update worth <em>coming back for.</em></>,
    intro: 'Build direct relationships with readers and viewers through timely alerts, relevant editorial updates and journeys shaped by their interests.',
    image: '/assets/case-ai1-media.webp', imageAlt: 'Media team creating content for its audience',
    imageLabel: 'READER ENGAGEMENT', imageTitle: 'The stories your audience cares about', metric: 'LIVE', metricLabel: 'CONTENT MOMENTS',
    proof: ['Breaking news and new releases', 'Interest-based audiences', 'Email and web push journeys'],
    sections: [
      ['Reach readers while the story is fresh.', 'Deliver breaking news, new episodes and important updates with timing that respects each reader.', 'Timely updates'],
      ['Turn casual visits into a habit.', 'Use reading and viewing signals to bring people back to the subjects and formats they follow.', 'Audience growth'],
      ['Support subscriptions with relevance.', 'Reconnect with readers around meaningful content and lifecycle moments, from trial to renewal.', 'Reader retention'],
    ],
  },
  ecommerce: {
    name: 'eCommerce', tag: 'FOR ECOMMERCE & RETAIL TEAMS',
    title: <>Turn shopping signals into <em>lasting customers.</em></>,
    intro: 'Connect browsing, cart and purchase behavior to helpful messages that recover intent, encourage a second order and grow customer value.',
    image: '/assets/case-auramagi.avif', imageAlt: 'Digital commerce brand and its customer experience',
    imageLabel: 'SHOPPER JOURNEY', imageTitle: 'Relevant messages, from browse to repeat order', metric: '24/7', metricLabel: 'CONNECTED JOURNEYS',
    proof: ['Browse and cart follow-ups', 'Purchase-based segments', 'Email and push campaigns'],
    sections: [
      ['Bring shoppers back to what they viewed.', 'Follow up on product interest with useful reminders and recommendations based on what people explored.', 'Browse recovery'],
      ['Recover interrupted checkouts.', 'Create a timely follow-up when a shopper leaves a cart behind, with audience rules that fit your store.', 'Cart recovery'],
      ['Give customers a reason to return.', 'Build post-purchase and replenishment journeys that help turn a first order into an ongoing relationship.', 'Repeat purchase'],
    ],
  },
  mobile: {
    name: 'Mobile Apps', tag: 'FOR MOBILE APP TEAMS',
    title: <>Make every app session <em>lead somewhere.</em></>,
    intro: 'Turn app activity into connected mobile push and email journeys that help people get started, discover more and keep using your product.',
    image: '/assets/case-pixllove.webp', imageAlt: 'A mobile-first digital product experience',
    imageLabel: 'APP LIFECYCLE', imageTitle: 'A connected path through your product', metric: 'APP', metricLabel: 'BEHAVIOR-BASED',
    proof: ['Mobile push notifications', 'In-app behavior signals', 'Cross-channel journeys'],
    sections: [
      ['Help new users find their first value.', 'Welcome people with a clear next step based on their onboarding progress and early product activity.', 'Activation'],
      ['Make useful features easier to discover.', 'Introduce relevant product capabilities when user behavior suggests they could help.', 'Engagement'],
      ['Reconnect before interest fades.', 'Create thoughtful journeys for users who have slowed down, with messages matched to their experience.', 'Retention'],
    ],
  },
  financial: {
    name: 'Financial Services', tag: 'FOR FINTECH & FINANCIAL PRODUCTS',
    title: <>Make every <em>financial interaction</em> feel effortless.</>,
    intro: 'Support the customer lifecycle with clear onboarding, relevant product education and timely service messages across push and email.',
    image: '/assets/product-analytics-dashboard.webp', imageAlt: 'A financial product analytics dashboard',
    imageLabel: 'CUSTOMER LIFECYCLE', imageTitle: 'Clear communication at every stage', metric: '360°', metricLabel: 'CUSTOMER CONTEXT',
    proof: ['Onboarding and verification journeys', 'Behavior-based audiences', 'Timely service communication'],
    sections: [
      ['Make getting started feel straightforward.', 'Guide customers through account setup and verification with helpful steps and clear status updates.', 'Onboarding'],
      ['Make product education more relevant.', 'Share useful features and guidance based on customer stage and the actions they have taken.', 'Product adoption'],
      ['Keep important communication in context.', 'Coordinate service updates and lifecycle messages through the channels your customers use.', 'Customer communication'],
    ],
  },
} satisfies Record<IndustryKey, {
  name: string; tag: string; title: ReactNode; intro: string; image: string; imageAlt: string;
  imageLabel: string; imageTitle: string; metric: string; metricLabel: string; proof: string[];
  sections: [string, string, string][];
}>;

export function getIndustry(key: string) {
  return industryContent[key as IndustryKey];
}

export default function IndustryLandingPage({ industry }: { industry: IndustryKey }) {
  const content = industryContent[industry];
  const SectionIcons = [AutoAwesomeRounded, NotificationsActiveRounded, InsightsRounded];

  return <>
    <Box component="header" className="industry-hero">
      <Container maxWidth="lg" className="industry-hero-inner">
        <Box className="industry-hero-copy">
          <Typography className="industry-eyebrow"><span />{content.tag}</Typography>
          <Typography variant="h1" className="industry-title">{content.title}</Typography>
          <Typography className="industry-intro">{content.intro}</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} className="industry-actions">
            <Button href="/get-started" variant="contained" endIcon={<ArrowOutwardRounded />}>Start for free</Button>
            <Button href="/pricing" className="industry-secondary">Explore the platform <ArrowOutwardRounded /></Button>
          </Stack>
          <Box className="industry-proof">{content.proof.map((item) => <span key={item}><CheckCircleRounded />{item}</span>)}</Box>
        </Box>
        <Box className={`industry-visual ${industry === 'gaming' ? 'industry-visual-game' : ''} ${industry === 'media' ? 'industry-visual-news' : ''} ${industry === 'ecommerce' ? 'industry-visual-shop' : ''} ${industry === 'financial' ? 'industry-visual-finance' : ''}`} aria-label={content.imageTitle}>
          {industry === 'gaming' ? <>
            <Box className="game-sky"><span className="game-moon" /><i className="game-star game-star-one" /><i className="game-star game-star-two" /><i className="game-star game-star-three" /><i className="game-star game-star-four" /></Box>
            <Box className="game-mountain game-mountain-back" /><Box className="game-mountain game-mountain-front" />
            <Box className="game-platform game-platform-one" /><Box className="game-platform game-platform-two" /><Box className="game-ground" />
            <Box className="game-coin game-coin-one">✦</Box><Box className="game-coin game-coin-two">✦</Box><Box className="game-coin game-coin-three">✦</Box>
            <Box className="game-player"><i /><b /><span /><em /></Box>
            <Box className="game-event"><span>LIVE EVENT</span><b>NEON RUN</b><small>New challenge unlocked</small><i><span /></i></Box>
            <Box className="game-level"><span>LVL</span><b>12</b><i><span /></i></Box>
            <Box className="game-push"><NotificationsActiveRounded /><span><b>Your squad is back online</b><small>2 friends started a new run</small></span></Box>
            <Box className="industry-visual-caption"><span /> A game world that keeps moving</Box>
          </> : industry === 'ecommerce' ? <>
            <Box className="shop-announcement">A LITTLE GLOW GOES A LONG WAY <i /> FREE SHIPPING OVER $50</Box>
            <Box className="shop-masthead"><Box className="shop-brand"><i />SOL & SKIN</Box><Box className="shop-search"><span>⌕</span>Search skincare...</Box><Box className="shop-menu"><span>BESTSELLERS</span><span>SKINCARE</span><span>OUR STORY</span></Box><Box className="shop-bag">BAG <b>2</b></Box></Box>
            <Box className="shop-hero-copy"><span>YOUR DAILY RITUAL <i /></span><b>Skincare that<br />feels like you.</b><small>Thoughtful essentials for a softer, brighter everyday glow.</small><Box className="shop-cta">SHOP BESTSELLERS <b>↗</b></Box></Box>
            <Box className="shop-products">
              <Box className="shop-product shop-product-vase"><Box className="shop-serum"><i /></Box><b>Daily Glow Serum</b><small>$38 <del>$46</del></small><i className="shop-product-favorite">♡</i><span className="shop-product-tag">BESTSELLER</span></Box>
              <Box className="shop-product shop-product-bag"><Box className="shop-cream"><i /></Box><b>Cloud Cream</b><small>$32 <del>$39</del></small><i className="shop-product-favorite">♡</i></Box>
              <Box className="shop-product shop-product-candle"><Box className="shop-cleanser"><i /></Box><b>Soft Reset Cleanser</b><small>$26 <del>$31</del></small><i className="shop-product-favorite">♡</i></Box>
            </Box>
            <Box className="shop-cart-note"><Box className="shop-cart-icon"><ShoppingBagRounded /></Box><span><small>YOUR ROUTINE IS WAITING</small><b>Keep your glow going</b><i>Daily Glow Serum · Cloud Cream</i></span><Box className="shop-cart-arrow">↗</Box></Box>
            <Box className="industry-visual-caption"><span /> A thoughtful nudge, right when it helps</Box>
          </> : industry === 'financial' ? <>
            <Box className="finance-app">
              <Box className="finance-topbar"><Box className="finance-bank-brand"><i /> MONO BANK</Box><Box className="finance-user">JD</Box></Box>
              <Box className="finance-greeting"><small>GOOD MORNING, JAMIE</small><b>Your money,<br />in a good place.</b></Box>
              <Box className="finance-account"><span>TOTAL BALANCE <i>•••</i></span><b>$12,840<small>.50</small></b><Box className="finance-chart"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></Box><small>↑ 8.4% <em>this month</em></small></Box>
              <Box className="finance-actions"><span><i>↗</i>Send</span><span><i>＋</i>Add</span><span><i>⇄</i>Transfer</span><span><i>•••</i>More</span></Box>
              <Box className="finance-transactions"><b>Recent activity <small>See all</small></b><span><i className="finance-merchant finance-merchant-one">N</i><span><b>Northstar Market</b><small>Today · Groceries</small></span><em>−$48.20</em></span><span><i className="finance-merchant finance-merchant-two">☕</i><span><b>Sunday Coffee</b><small>Today · Dining</small></span><em>−$6.80</em></span></Box>
            </Box>
            <Box className="finance-alert"><Box><NotificationsActiveRounded /></Box><span><small>SMART MONEY TIP</small><b>Your savings goal is almost there</b><i>You’re just $120 away this month</i></span><em>↗</em></Box>
            <Box className="industry-visual-caption"><span /> Helpful banking, at the right moment</Box>
          </> : industry === 'media' ? <>
            <Box className="news-masthead"><Box className="news-brand"><i />THE DAILY SIGNAL</Box><Box className="news-nav"><span>WORLD</span><span>BUSINESS</span><span>CULTURE</span><b>● LIVE</b></Box></Box>
            <Box className="news-feature">
              <Box className="news-feature-image"><span className="news-city-sun" /><i className="news-city-block news-city-one" /><i className="news-city-block news-city-two" /><i className="news-city-block news-city-three" /><i className="news-city-block news-city-four" /><i className="news-city-block news-city-five" /><i className="news-city-block news-city-six" /><Box className="news-breaking">BREAKING</Box></Box>
              <Box className="news-feature-copy"><span>TOP STORY <i /> 4 MIN READ</span><b>What readers need to know today</b><small>Clear, timely updates from the stories shaping the moment.</small></Box>
            </Box>
            <Box className="news-headlines"><span><i>01</i><b>Morning briefing</b><small>What matters today</small></span><span><i>02</i><b>Market update</b><small>Latest developments</small></span><span><i>03</i><b>Culture & ideas</b><small>Stories to explore</small></span></Box>
            <Box className="news-push"><NotificationsActiveRounded /><span><b>Breaking: your news alert</b><small>A story you follow is developing now.</small></span><i /></Box>
            <Box className="industry-visual-caption"><span /> Timely stories for the right audience</Box>
          </> : <>
            <Box component="img" src={content.image} alt={content.imageAlt} className="industry-image" />
            <Box className="industry-image-shade" />
            <Box className="industry-visual-label"><span className="industry-live-dot" />{content.imageLabel}</Box>
            <Box className="industry-visual-title">{content.imageTitle}</Box>
            <Box className="industry-notification industry-notification-one"><NotificationsActiveRounded /><span><b>{content.metric}</b><small>{content.metricLabel}</small></span><i /></Box>
            <Box className="industry-notification industry-notification-two"><EmailRounded /><span><b>Journey ready</b><small>Push + email, connected</small></span><i /></Box>
            <Box className="industry-visual-caption"><span /> Built around real customer behavior</Box>
          </>}
        </Box>
      </Container>
      <Box className="industry-ribbon"><span>UNDERSTAND THE SIGNAL</span><i /><span>REACH THE RIGHT AUDIENCE</span><i /><span>KEEP LEARNING</span></Box>
    </Box>

    <Box component="section" className="industry-section" aria-labelledby="industry-section-heading">
      <Container maxWidth="lg">
        <Box className="industry-section-heading">
          <Typography className="industry-section-eyebrow">BUILT FOR {content.name.toUpperCase()}</Typography>
          <Typography id="industry-section-heading" variant="h2">The moments that move your industry.</Typography>
          <Typography>Bring audience context and customer communication together in one connected lifecycle.</Typography>
        </Box>
        <Box className="industry-feature-list">
          {content.sections.map(([title, body, label], index) => {
            const Icon = SectionIcons[index];
            return <Box component="article" className={`industry-feature-row ${index % 2 ? 'industry-feature-reverse' : ''}`} key={title}>
              <Box className="industry-feature-art">
                <Box className="industry-art-window">
                  <Box className="industry-art-window-head"><span /><span /><span /><b>{content.name.toUpperCase()} · {label.toUpperCase()}</b></Box>
                  <Box className="industry-art-message"><Box className="industry-art-icon"><Icon /></Box><span><b>{title}</b><small>{content.name} audience · journey step {index + 1}</small></span><i /></Box>
                  <Box className="industry-art-flow"><span className="industry-art-node"><InsightsRounded /></span><i /><span className="industry-art-node"><NotificationsActiveRounded /></span><i /><span className="industry-art-node"><EmailRounded /></span></Box>
                  <Box className="industry-art-footer"><span><b>Audience</b><small>Behavior-based group</small></span><span><b>Channels</b><small>Push + email</small></span></Box>
                </Box>
                <Box className="industry-art-glow" />
              </Box>
              <Box className="industry-feature-copy">
                <Typography className="industry-card-label">0{index + 1} · {label}</Typography>
                <Typography component="h3">{title}</Typography>
                <Typography className="industry-card-body">{body}</Typography>
                <Box className="industry-card-link">Explore the journey <ArrowOutwardRounded /></Box>
              </Box>
            </Box>;
          })}
        </Box>
      </Container>
    </Box>

    <Box component="section" className="industry-platform">
      <Container maxWidth="lg" className="industry-platform-inner">
        <Box className="industry-platform-copy">
          <Typography className="industry-section-eyebrow">ONE CONNECTED WORKSPACE</Typography>
          <Typography variant="h2">From audience insight to messages that matter.</Typography>
          <Typography>Use product signals and audience groups to coordinate email, push notifications and automated journeys—with performance insights to guide what comes next.</Typography>
          <Button href="/product" endIcon={<ArrowOutwardRounded />}>See the PixlPush platform</Button>
        </Box>
        <Box className="industry-platform-panel">
          <Box className="industry-panel-top"><span /><span /><span /><b>PIXLPUSH · JOURNEY OVERVIEW</b></Box>
          <Box className="industry-panel-user"><Box className="industry-panel-avatar"><InsightsRounded /></Box><span><b>Audience insight</b><small>Behavior and lifecycle signals connected</small></span><i>READY</i></Box>
          <Box className="industry-panel-stats"><Box><small>CHANNELS</small><b>Push + email</b><span><NotificationsActiveRounded /> <EmailRounded /></span></Box><Box><small>JOURNEY STATUS</small><b>Active</b><span className="industry-status">● Learning</span></Box></Box>
          <Box className="industry-panel-opportunity"><AutoAwesomeRounded /><span><b>A more relevant next step</b><small>Build a journey around the audience goal.</small></span><ArrowOutwardRounded /></Box>
        </Box>
      </Container>
    </Box>
  </>;
}
