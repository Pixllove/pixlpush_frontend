'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowOutwardRounded from '@mui/icons-material/ArrowOutwardRounded';

const productViews = [
  {
    label: 'Push notifications',
    image: '/assets/translation-push.png',
    alt: 'PixlPush push notification editor with language tabs, automatic translation, and live preview',
  },
  {
    label: 'Choose languages',
    image: '/assets/translation-languages.png',
    alt: 'PixlPush dialog for selecting the languages to translate a campaign into',
  },
  {
    label: 'Email campaigns',
    image: '/assets/translation-email.png',
    alt: 'PixlPush email editor with AI translation controls, language selection, and live email preview',
  },
];

const benefits = [
  ['Translate in one click', 'Create language versions for your email and push campaigns with AI.'],
  ['Reach users in the right language', 'Use each user’s localization to deliver the matching version automatically.'],
  ['Keep campaigns together', 'Manage one campaign across languages instead of duplicating work and creating more campaign chaos.'],
];

export default function TranslationAISection() {
  const [activeView, setActiveView] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollRemainder = useRef(0);
  const selectedView = productViews[activeView];

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const updateActiveView = () => {
      const track = trackRef.current;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      lastScrollY.current = currentY;
      if (!track) return;

      const trackTop = track.getBoundingClientRect().top + currentY;
      const trackEnd = trackTop + track.offsetHeight - window.innerHeight;
      const insideTrack = currentY >= trackTop && currentY < trackEnd;
      if (!insideTrack) {
        scrollRemainder.current = 0;
        return;
      }

      scrollRemainder.current += delta;
      const switchDistance = Math.max(window.innerHeight * 0.48, 1);
      if (Math.abs(scrollRemainder.current) < switchDistance) return;

      const direction = Math.sign(scrollRemainder.current);
      scrollRemainder.current = 0;
      setActiveView((current) => Math.max(0, Math.min(productViews.length - 1, current + direction)));
    };
    const resetScrollState = () => {
      scrollRemainder.current = 0;
      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', updateActiveView, { passive: true });
    window.addEventListener('resize', resetScrollState);
    return () => {
      window.removeEventListener('scroll', updateActiveView);
      window.removeEventListener('resize', resetScrollState);
    };
  }, []);

  return (
    <Box ref={trackRef} className="translation-ai-scroll-track">
      <Box component="section" className="translation-ai-section" aria-labelledby="translation-ai-title">
        <Container maxWidth="lg" className="translation-ai-container">
          <Box className="translation-ai-copy">
            <Typography className="translation-ai-eyebrow">AI-POWERED CAMPAIGN TRANSLATION</Typography>
            <Typography component="h2" id="translation-ai-title" className="translation-ai-title">
              One campaign. Every user’s language.
            </Typography>
            <Stack className="translation-ai-benefits" gap={2.1}>
              {benefits.map(([title, description]) => (
                <Stack key={title} direction="row" gap={1.5} alignItems="flex-start" className="translation-ai-benefit">
                  <Box className="translation-ai-check">✓</Box>
                  <Box>
                    <Typography className="translation-ai-benefit-title">{title}</Typography>
                    <Typography className="translation-ai-benefit-description">{description}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
            <Button href="/product" variant="contained" className="translation-ai-cta" endIcon={<ArrowOutwardRounded />}>
              Explore AI translation
            </Button>
          </Box>

          <Box className="translation-ai-showcase">
            <Stack direction="row" className="translation-ai-tabs" role="tablist" aria-label="Translation product screenshots">
              {productViews.map((view, index) => (
                <Box
                  key={view.label}
                  component="button"
                  type="button"
                  role="tab"
                  aria-selected={activeView === index}
                  className={`translation-ai-tab${activeView === index ? ' is-active' : ''}`}
                  onClick={() => setActiveView(index)}
                >
                  {view.label}
                </Box>
              ))}
            </Stack>
            <Box className="translation-ai-screenshot" role="tabpanel" aria-label={selectedView.label}>
              <Box key={selectedView.image} component="img" src={selectedView.image} alt={selectedView.alt} />
            </Box>
            <Typography className="translation-ai-caption">A look inside PixlPush</Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
