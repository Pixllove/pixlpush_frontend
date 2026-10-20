'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import Image from 'next/image';

const steps = [
  {
    eyebrow: 'UNDERSTAND YOUR CUSTOMERS',
    title: 'Know what moves your users.',
    body: 'Max analyzes your website and, where available, your app links to understand your product, ideal customer profile, user pain points and buying motivations. He turns these insights into a business analysis that guides relevant email and push content.',
    action: 'Explore business analysis',
  },
  {
    eyebrow: 'PERSONALIZED EMAIL & PUSH JOURNEYS',
    title: 'Turn every signal into the right next step.',
    body: 'Your AI team turns real user behavior into timely journeys across email and push—so every message has a reason to arrive.',
    action: 'See how journeys work',
  },
  {
    eyebrow: 'RETENTION THAT IMPROVES OVER TIME',
    title: 'Automate the work. Focus on results.',
    body: 'See which journeys bring users back, where people drop off and what to improve next. Your team spends less time coordinating campaigns and more time growing retention.',
    action: 'Explore analytics',
  },
];

function AnalysisVisual() {
  return (
    <Box className="retention-scene retention-scene-analysis" aria-hidden="true">
      <Box className="retention-window analysis-window">
        <Box className="retention-window-bar"><i /><i /><i /><span>BUSINESS SNAPSHOT</span></Box>
        <Box className="analysis-window-body">
          <Box className="analysis-profile"><Box component="img" src="/assets/agent-avatar-max-v2.png" alt="" /><Box><b>Business context</b><small>Product &amp; audience understood</small></Box><strong>READY</strong></Box>
          <Box className="analysis-metrics"><Box><small>ACTIVE USERS</small><b>18.4k</b><em>↑ 12.8%</em></Box><Box><small>AT-RISK USERS</small><b>2.3k</b><em className="metric-warn">Need a nudge</em></Box><Box><small>TOP SIGNAL</small><b>Trial started</b><em>High intent</em></Box></Box>
          <Box className="analysis-insight"><span>✦</span><Box><b>Growth opportunity found</b><small>Users who finish setup are more likely to return in week one.</small></Box></Box>
        </Box>
      </Box>
      <Box className="retention-float-card analysis-float"><span className="retention-float-icon">✦</span><Box><b>Max</b><small>Business analysis complete</small></Box><span className="retention-status-dot" /></Box>
      <Box className="retention-orbit orbit-analysis" />
    </Box>
  );
}

function JourneyVisual() {
  return (
    <Box className="retention-scene retention-scene-journey" aria-hidden="true">
      <Box className="retention-journey-art">
        <Image src="/assets/retention-journey-cartoon.png" alt="" fill sizes="(max-width: 650px) 100vw, (max-width: 1200px) 50vw, 600px" style={{ objectFit: 'contain' }} />
      </Box>
    </Box>
  );
}

function ResultsVisual() {
  return (
    <Box className="retention-scene retention-scene-results" aria-hidden="true">
      <Box className="results-window">
        <Box className="retention-window-bar"><i /><i /><i /><span>RETENTION PERFORMANCE</span></Box>
        <Box className="results-header"><Box><small>DAY 7 RETENTION</small><b>+27%</b></Box><Box className="results-range">Last 30 days⌄</Box></Box>
        <svg className="results-chart" viewBox="0 0 520 210" role="img" aria-label="Retention performance trending upward"><defs><linearGradient id="retention-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#9a5be9" stopOpacity=".32"/><stop offset="1" stopColor="#9a5be9" stopOpacity="0"/></linearGradient></defs><path d="M12 174 C65 150 78 157 116 133 S178 147 219 105 S280 123 318 86 S390 105 422 56 S475 72 508 30 L508 198 L12 198Z" fill="url(#retention-fill)"/><path d="M12 174 C65 150 78 157 116 133 S178 147 219 105 S280 123 318 86 S390 105 422 56 S475 72 508 30" fill="none" stroke="#7432cc" strokeWidth="5" strokeLinecap="round"/><circle cx="508" cy="30" r="7" fill="#f36b3f"/></svg>
        <Box className="results-legend"><span><i />Activated users</span><strong>↑ Retention is improving</strong></Box>
      </Box>
      <Box className="retention-float-card results-float"><span className="results-check">✓</span><Box><b>Journey optimized</b><small>More users reached first value</small></Box></Box>
      <Box className="retention-orbit orbit-results" />
    </Box>
  );
}

const visuals = [AnalysisVisual, JourneyVisual, ResultsVisual];

function VisualForStep({ index }: { index: number }) {
  const Visual = visuals[index];
  return <Visual />;
}

export default function RetentionScrollStory() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-retention-step]'));
    if (!elements.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.retentionStep);
      if (Number.isFinite(index)) setActive(index);
    }, { rootMargin: '-35% 0px -35% 0px', threshold: [0, 0.2, 0.45, 0.7] });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <Box component="section" className="retention-story" aria-label="How PixlPush improves retention">
      <Container maxWidth="lg" className="retention-story-container">
        <Box className="retention-story-visual">
          <Box className="retention-story-sticky">
            <Box className="retention-scenes">
              {visuals.map((Visual, index) => <Box key={index} className={`retention-scene-layer${active === index ? ' is-active' : ''}`}><Visual /></Box>)}
            </Box>
            <Stack direction="row" className="retention-story-progress" aria-hidden="true">
              {steps.map((step, index) => <Box key={step.eyebrow} className={`retention-story-progress-item${active === index ? ' is-active' : ''}`} />)}
            </Stack>
          </Box>
        </Box>
        <Box className="retention-story-copy">
          {steps.map((step, index) => (
            <Box key={step.eyebrow} component="article" data-retention-step={index} className={`retention-story-step${active === index ? ' is-active' : ''}`}>
              <Box className="retention-story-mobile-visual"><VisualForStep index={index} /></Box>
              <Typography className="retention-step-eyebrow">{step.eyebrow}</Typography>
              <Typography component="h2" className="retention-step-title">{step.title}</Typography>
              <Typography className="retention-step-body">{step.body}</Typography>
              <Button href={index === 0 ? '/product' : index === 1 ? '/how-it-works' : '/product'} className="retention-step-link" endIcon={<ArrowForwardRounded />}>{step.action}</Button>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
