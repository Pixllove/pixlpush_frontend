'use client';

import { useRouter } from 'next/navigation';
import { ArrowBackRounded, ArrowForwardRounded, AutoAwesomeRounded, AutoGraphRounded, CardGiftcardRounded, EmailRounded, FavoriteRounded, GroupsRounded, MailRounded, ShoppingBagRounded } from '@mui/icons-material';
import { Box, Button, Card, Grid, Stack, Typography } from '@mui/material';

const templates = [
  ['Welcome new subscribers', 'Greet people when they join and guide them to their first action.', 'Welcome', GroupsRounded, '#1eac5f'],
  ['Win back inactive users', 'Reach subscribers who stopped opening and bring them back gently.', 'Winback', FavoriteRounded, '#e5a43a'],
  ['Premium offer follow-up', 'Send a focused sequence after someone clicks a premium offer.', 'Promotion', CardGiftcardRounded, '#4775de'],
  ['Abandoned checkout', 'Remind shoppers to finish checkout with a short recovery path.', 'E-commerce', ShoppingBagRounded, '#e45d6a'],
] as const;

export default function JourneyCreateWorkspace() {
  const router = useRouter();
  const openBuilder = (template?: string) => router.push(`/dashboard/journeys/builder${template ? `?template=${encodeURIComponent(template)}` : ''}`);
  return <Stack gap={2.5} className="journey-create-page">
    <Stack direction="row" alignItems="center" gap={1}><Button startIcon={<ArrowBackRounded />} onClick={() => router.push('/dashboard/journeys')} sx={{ color: '#64748b', textTransform: 'none' }}>Back to journeys</Button><Typography color="text.secondary" fontSize={12}>/ Create journey</Typography></Stack>
    <Card className="journey-create-hero"><Grid container alignItems="stretch"><Grid item xs={12} lg={6}><Stack justifyContent="center" sx={{ height: '100%', p: { xs: 3, md: 5 } }}><Box className="journey-create-icon"><MailRounded /></Box><Typography color="#4775de" fontSize={12} fontWeight={900} sx={{ mt: 2 }}>NEW JOURNEY</Typography><Typography variant="h1" sx={{ mt: 1 }}>Choose how you want to start</Typography><Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>Start with a blank journey or pick a proven template. You can customize every message, delay, audience and condition after this step.</Typography><Button variant="contained" startIcon={<AutoGraphRounded />} onClick={() => openBuilder()} sx={{ alignSelf: 'flex-start', mt: 3, px: 3 }}>Start from scratch</Button></Stack></Grid><Grid item xs={12} lg={6}><Box className="journey-create-art"><Box className="journey-art-window"><Box className="journey-art-line main" /><Box className="journey-art-line small" /><Box className="journey-art-node one"><EmailRounded /></Box><Box className="journey-art-node two"><GroupsRounded /></Box><Box className="journey-art-node three"><AutoGraphRounded /></Box><Box className="journey-art-node four"><AutoAwesomeRounded /></Box><Box className="journey-art-chart" /></Box></Box></Grid></Grid></Card>
    <Card className="saas-card journey-template-panel"><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}><Box><Typography variant="h3">Templates</Typography><Typography color="text.secondary" fontSize={12}>Pick a simple starting point for common journeys.</Typography></Box><Typography className="journey-easy-badge"><AutoAwesomeRounded fontSize="small" /> Easy to edit later</Typography></Stack><Grid container spacing={1.5} sx={{ mt: 1 }}>{templates.map(([title, description, tag, Icon, color]) => <Grid item xs={12} md={6} key={title}><Button className="journey-template-card" onClick={() => openBuilder(title)}><Box className="journey-template-icon" sx={{ color, bgcolor: `${color}14` }}><Icon /></Box><Box sx={{ flex: 1, textAlign: 'left' }}><Typography className="journey-template-tag">{tag}</Typography><Typography fontWeight={900} sx={{ mt: .7 }}>{title}</Typography><Typography color="text.secondary" fontSize={11} sx={{ mt: .5 }}>{description}</Typography></Box><ArrowForwardRounded className="journey-template-arrow" /></Button></Grid>)}</Grid></Card>
  </Stack>;
}
