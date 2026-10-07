import { Box, Button, Chip, Link, Typography } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import GroupsRounded from '@mui/icons-material/GroupsRounded';
import NotificationsActiveRounded from '@mui/icons-material/NotificationsActiveRounded';
import ScheduleRounded from '@mui/icons-material/ScheduleRounded';

type Mode = 'login' | 'signup' | 'invite' | 'security';

/** What the brand panel says beside each kind of auth page. Facts only: nothing here is a claim we cannot back. */
const PANEL: Record<Mode, { overline: string; headline: string; copy: string; points: string[] }> = {
  login: {
    overline: 'Welcome back',
    headline: 'Pick up where your team left off.',
    copy: 'Your journeys, campaigns and audiences are exactly as you left them.',
    points: ['Live journeys', 'Email and push', 'Audience segments'],
  },
  signup: {
    overline: 'Start free',
    headline: 'Turn more of your users into long-term customers.',
    copy: 'Build behaviour-aware journeys across email and push. The free plan is yours to explore for as long as you like.',
    points: ['2,000 reachable users', '1 active journey', 'No credit card required'],
  },
  invite: {
    overline: 'Project invitation',
    headline: 'Your team is waiting for you.',
    copy: 'Join the project to work on journeys, campaigns and audiences together.',
    points: ['Access is scoped to this project', 'Your role sets what you can change', 'Your other projects stay as they are'],
  },
  security: {
    overline: 'Account security',
    headline: 'Your account stays in your hands.',
    copy: 'Every link we email works once and then expires, and we never reveal whether an address has an account.',
    points: ['Single-use links', 'Reset links last 30 minutes', 'Verification links last 24 hours'],
  },
};

const STEPS = [
  { icon: <GroupsRounded />, title: 'Entrance trigger', detail: 'Lifecycle segment: New users' },
  { icon: <ScheduleRounded />, title: 'Wait', detail: '1 day' },
  { icon: <NotificationsActiveRounded />, title: 'Push notification', detail: 'Sent to users who have not come back' },
];

/**
 * The one frame for every auth page: the form on a white column, and beside it (from 1024px up) a brand
 * panel on the app's own accent surface with a small glimpse of the product built from real UI.
 */
export default function AuthShell({ children, mode }: { children: React.ReactNode; mode: Mode }) {
  const panel = PANEL[mode];
  return (
    <Box className="auth-shell">
      <Box className="auth-main">
        <Box className="auth-head">
          <Link href="/" className="auth-brand" underline="none" aria-label="PixlPush home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/site-icon.png" alt="" />
            PixlPush
          </Link>
          {/* The way out: quiet, opposite the brand, where people look for it. */}
          <Button href="/" size="small" startIcon={<ArrowBackRounded />} className="auth-back">Back to home</Button>
        </Box>
        <Box className="auth-form-wrap">{children}</Box>
        <Typography className="auth-foot">
          © {new Date().getFullYear()} PixlPush · <Link href="#" color="inherit">Privacy</Link> · <Link href="#" color="inherit">Terms</Link>
        </Typography>
      </Box>

      {/* Decorative: everything a visitor needs is in the form column. */}
      <Box className="auth-panel" aria-hidden>
        <Box className="auth-panel-inner">
          <Typography variant="overline" className="auth-panel-overline">{panel.overline}</Typography>
          <Typography component="h2" className="auth-panel-headline">{panel.headline}</Typography>
          <Typography className="auth-panel-copy">{panel.copy}</Typography>

          <Box className="auth-glimpse">
            <Box className="auth-glimpse-head">
              <Box>
                <Typography variant="h5">Onboarding journey</Typography>
                <Typography variant="caption" color="text.secondary">Automated journey</Typography>
              </Box>
              <Chip label="Running" color="success" size="small" />
            </Box>
            {STEPS.map((step) => (
              <Box className="auth-step" key={step.title}>
                <Box className="auth-step-icon">{step.icon}</Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5">{step.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{step.detail}</Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box className="auth-points">
            {panel.points.map((point) => <span key={point}><CheckRounded />{point}</span>)}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
