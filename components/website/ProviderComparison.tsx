'use client';

import { useMemo, useState } from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BusinessRounded from '@mui/icons-material/BusinessRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import {
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

type Provider = 'brevo' | 'mailchimp' | 'mailerlite' | 'onesignal' | 'stack';

const providerInfo: Record<Provider, { name: string; logo?: string; site?: string }> = {
  brevo: { name: 'Brevo', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Brevo-Logo.png', site: 'brevo.com' },
  mailchimp: { name: 'Mailchimp', logo: 'https://www.google.com/s2/favicons?domain=mailchimp.com&sz=128', site: 'mailchimp.com' },
  mailerlite: { name: 'MailerLite', logo: 'https://www.google.com/s2/favicons?domain=mailerlite.com&sz=128', site: 'mailerlite.com' },
  onesignal: { name: 'OneSignal', logo: 'https://www.google.com/s2/favicons?domain=onesignal.com&sz=128', site: 'onesignal.com' },
  stack: { name: 'Your current stack' },
};

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0,
}).format(value);
const count = (value: number) => new Intl.NumberFormat('en-US').format(value);

function pixlEstimate(users: number, emailSends: number) {
  if (users <= 2000 && emailSends <= 10000) {
    return { plan: 'Free', total: 0, allowance: 2000, note: '10,000 emails included · Unlimited push' };
  }
  if (users <= 5000) {
    const emailOverage = Math.ceil(Math.max(0, emailSends - 50000) / 1000);
    return {
      plan: emailOverage ? 'Starter + usage' : 'Starter',
      total: 29 + emailOverage,
      allowance: 5000,
      note: '50,000 emails included · Unlimited push',
    };
  }
  const emailOverage = Math.ceil(Math.max(0, emailSends - 250000) / 1000);
  return {
    plan: emailOverage ? 'Pro + usage' : 'Pro',
    total: 79 + Math.max(0, users - 25000) * 0.008 + emailOverage,
    allowance: 25000,
    note: '250,000 emails included · Unlimited push',
  };
}

function providerEstimate(provider: Provider, users: number, emails: number, pushUsers: number, emailOn: boolean, pushOn: boolean) {
  const emailVolume = emailOn ? emails : 0;
  const pushAudience = pushOn ? pushUsers : 0;
  if (provider === 'stack') return { cost: null, plan: 'Add your current tools', detail: 'Enter a verified monthly total to compare your stack.', comparable: false };

  if (provider === 'onesignal') {
    const cost = 19 + (pushOn ? pushAudience * 0.012 : 0) + Math.max(0, emailVolume - 20000) * 0.0015;
    return { cost, plan: 'Growth estimate', detail: 'Includes 20,000 email sends; push usage is estimated.', comparable: true };
  }

  if (provider === 'brevo') {
    const emailTiers: [number, number][] = pushOn
      ? [[150000, 499], [250000, 599], [500000, 699], [1000000, 999], [2000000, 1479]]
      : [[5000, 18], [10000, 35], [15000, 49], [20000, 69], [30000, 79], [40000, 89], [50000, 97], [60000, 104], [80000, 119], [100000, 139], [150000, 179], [250000, 249]];
    const tier = emailTiers.find(([limit]) => emailVolume <= limit);
    if (!tier) return { cost: null, plan: 'Custom volume', detail: 'Contact Brevo for pricing at this volume.', comparable: false };
    const pushCost = pushOn ? Math.max(0, pushAudience - 20000) * 0.0027 : 0;
    return { cost: tier[1] + pushCost, plan: pushOn ? 'Professional estimate' : 'Standard estimate', detail: pushOn ? 'Plan tier plus estimated push usage.' : 'Email plan estimate; push is not selected.', comparable: true };
  }

  if (provider === 'mailerlite') {
    const tiers: [number, number, number][] = [[500, 12, 25], [1000, 19, 39], [2500, 33, 49], [5000, 49, 69], [8000, 69, 99], [10000, 89, 129], [15000, 129, 179], [20000, 159, 219], [25000, 179, 239], [30000, 229, 279], [35000, 249, 309], [40000, 269, 329], [50000, 319, 389], [60000, 359, 419], [70000, 379, 439], [80000, 399, 459], [90000, 419, 469], [100000, 439, 489], [150000, 619, 759]];
    const tier = tiers.find(([limit]) => users <= limit);
    if (pushOn) return { cost: tier?.[1] ?? null, plan: tier ? 'Subscriber tier estimate' : 'Custom volume', detail: 'Email plan estimate only; push notifications require a separate provider.', comparable: false };
    if (users <= 250 && emailVolume <= 2500) return { cost: 0, plan: 'Free', detail: 'Email-only allowance estimate.', comparable: true };
    if (!tier) return { cost: null, plan: 'Custom volume', detail: 'Contact MailerLite for pricing at this subscriber volume.', comparable: false };
    return { cost: emailVolume > tier[0] * 10 ? tier[2] : tier[1], plan: 'Subscriber tier estimate', detail: 'Estimated from subscriber tier and email volume.', comparable: true };
  }

  const tiers: [number, number, number][] = [[500, 20, 6000], [1500, 45, 6000], [2500, 60, 6000], [5000, 100, 6000], [10000, 135, 120000], [15000, 230, 180000], [20000, 285, 240000], [25000, 310, 300000], [30000, 340, 360000], [40000, 410, 480000], [50000, 450, 600000], [75000, 630, 900000], [100000, 800, 1200000], [130000, 1150, 1950000], [150000, 1325, 2250000], [200000, 1600, 3000000]];
  const tier = tiers.find(([limit]) => users <= limit);
  if (!tier) return { cost: null, plan: 'Custom volume', detail: 'Contact Mailchimp for pricing at this contact volume.', comparable: false };
  return { cost: tier[1], plan: 'Standard estimate', detail: pushOn ? 'Email estimate only; push notifications require a separate provider.' : 'Estimate based on contact tier.', comparable: !pushOn && emailVolume <= tier[2] };
}

function Brand({ name, logo, site }: { name: string; logo?: string; site?: string }) {
  if (name === 'PixlPush') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', width: 'fit-content', p: .5, borderRadius: '6px', backgroundColor: 'var(--pp-plum)' }}>
        <Box component="img" src="/assets/logo.png" alt="PixlPush" sx={{ display: 'block', width: 120, height: 40, objectFit: 'contain', objectPosition: 'center' }} />
      </Box>
    );
  }
  return (
    <Stack direction="row" alignItems="center" gap={1.2}>
      {logo && <Box component="img" src={logo} alt={`${name} logo`} loading="lazy" sx={{ width: name === 'Brevo' ? 116 : 36, height: name === 'Brevo' ? 36 : 36, objectFit: 'contain', objectPosition: 'left center' }} />}
      <Box>
        {name !== 'Brevo' && <Typography fontSize={14} fontWeight={600}>{name}</Typography>}
        {site && <Typography color="text.secondary" fontSize={11}>{site}</Typography>}
      </Box>
    </Stack>
  );
}

export function ProviderComparison() {
  const [users, setUsers] = useState(10000);
  const [emailSends, setEmailSends] = useState(10000);
  const [pushUsers, setPushUsers] = useState(20000);
  const [emailOn, setEmailOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [provider, setProvider] = useState<Provider>('brevo');
  const pixl = useMemo(() => pixlEstimate(users, emailOn ? emailSends : 0), [users, emailSends, emailOn]);
  const competitor = useMemo(() => providerEstimate(provider, users, emailSends, pushUsers, emailOn, pushOn), [provider, users, emailSends, pushUsers, emailOn, pushOn]);
  const saving = competitor.comparable && competitor.cost !== null ? competitor.cost - pixl.total : null;

  const updateNumber = (setter: (value: number) => void, value: string, minimum = 0, maximum = 3000000) => {
    setter(Math.min(maximum, Math.max(minimum, Number(value) || 0)));
  };

  const cardSx = {
    minWidth: 0,
    p: 2,
    border: '1px solid var(--pp-border)',
    borderRadius: 'var(--pp-radius-card, 8px)',
    backgroundColor: 'var(--pp-surface)',
  };

  return (
    <Box component="section" aria-labelledby="provider-comparison-title" sx={{ mt: 5 }}>
      <Stack gap={{ xs: 3, md: 4 }}>
        <Box sx={{ maxWidth: 850, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="overline" sx={{ color: 'var(--pp-accent)', letterSpacing: '.14em' }}>MAKE MORE OF YOUR USERS</Typography>
          <Typography id="provider-comparison-title" variant="h1" sx={{ mt: 1, fontSize: { xs: 38, md: 60 }, lineHeight: 1.04, letterSpacing: '-.045em' }}>
            What does your<br /><Box component="span" sx={{ color: 'var(--pp-accent)' }}>communication cost?</Box>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, mx: 'auto', maxWidth: 640, fontSize: { xs: 14, md: 16 }, lineHeight: 1.6 }}>
            Compare the cost of the same communication setup across providers — with email, push, or both.
          </Typography>
        </Box>

        <Card variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderColor: 'var(--pp-border)', borderRadius: '10px', boxShadow: 'none', backgroundColor: 'var(--pp-surface)' }}>
          <Stack gap={{ xs: 2.5, md: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2}>
              <Box>
                <Typography variant="overline" sx={{ color: 'var(--pp-accent)' }}>Your scenario</Typography>
                <Typography variant="h3" sx={{ mt: .5, fontSize: { xs: 18, md: 24 }, lineHeight: 1.25 }}>How many users do you want to reach each month?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>We compare the same reach and send volume for every provider.</Typography>
              </Box>
              <TextField label="Users / subscribers" type="number" inputProps={{ min: 250, max: 200000, step: 250 }} value={users} onChange={(event) => updateNumber(setUsers, event.target.value, 250, 200000)} sx={{ width: { xs: '100%', sm: 205 }, flexShrink: 0 }} />
            </Stack>

            <Box sx={{ px: 1, pt: .5 }}>
              <Slider aria-label="Reachable users per month" min={250} max={200000} step={250} value={users} onChange={(_, value) => setUsers(value as number)} sx={{ color: 'var(--pp-accent)' }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: -.4 }}>
                {[250, 50000, 100000, 150000, 200000].map((value) => <Typography key={value} variant="caption" color="text.secondary">{value === 200000 ? '200,000+' : count(value)}</Typography>)}
              </Stack>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, py: 2.2, borderTop: '1px solid var(--pp-border)', borderBottom: '1px solid var(--pp-border)' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Which channels do you use?</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: .8 }}>
                  <Button
                    aria-pressed={emailOn}
                    variant="outlined"
                    startIcon={<MailOutlineRounded />}
                    endIcon={emailOn ? <CheckRounded /> : undefined}
                    onClick={() => setEmailOn((selected) => !selected)}
                    sx={{
                      minHeight: 48,
                      px: 2,
                      borderRadius: '8px',
                      borderColor: emailOn ? 'var(--pp-accent-line)' : 'var(--pp-border-strong)',
                      color: emailOn ? 'var(--pp-text)' : 'var(--pp-text-2)',
                      backgroundColor: emailOn ? 'var(--pp-accent-soft)' : 'var(--pp-surface)',
                      textTransform: 'none',
                      '& .MuiButton-startIcon, & .MuiButton-endIcon': { color: emailOn ? 'var(--pp-accent)' : 'var(--pp-text-2)' },
                      '&:hover': {
                        borderColor: emailOn ? 'var(--pp-accent-line)' : 'var(--pp-border-strong)',
                        color: emailOn ? 'var(--pp-text)' : 'var(--pp-accent)',
                        backgroundColor: emailOn ? 'var(--pp-accent-soft)' : 'var(--pp-subtle)',
                      },
                    }}
                  >Email</Button>
                  <Button
                    aria-pressed={pushOn}
                    variant="outlined"
                    startIcon={<NotificationsActiveOutlined />}
                    endIcon={pushOn ? <CheckRounded /> : undefined}
                    onClick={() => setPushOn((selected) => !selected)}
                    sx={{
                      minHeight: 48,
                      px: 2,
                      borderRadius: '8px',
                      borderColor: pushOn ? 'var(--pp-accent-line)' : 'var(--pp-border-strong)',
                      color: pushOn ? 'var(--pp-text)' : 'var(--pp-text-2)',
                      backgroundColor: pushOn ? 'var(--pp-accent-soft)' : 'var(--pp-surface)',
                      textTransform: 'none',
                      '& .MuiButton-startIcon, & .MuiButton-endIcon': { color: pushOn ? 'var(--pp-accent)' : 'var(--pp-text-2)' },
                      '&:hover': {
                        borderColor: pushOn ? 'var(--pp-accent-line)' : 'var(--pp-border-strong)',
                        color: pushOn ? 'var(--pp-text)' : 'var(--pp-accent)',
                        backgroundColor: pushOn ? 'var(--pp-accent-soft)' : 'var(--pp-subtle)',
                      },
                    }}
                  >Push notifications</Button>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Your usage</Typography>
                <Stack gap={1} sx={{ mt: .8 }}>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <TextField aria-label="Email sends per month" type="number" disabled={!emailOn} value={emailSends} onChange={(event) => updateNumber(setEmailSends, event.target.value)} />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Email sends / month</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" gap={1}>
                    <TextField aria-label="Push subscribers" type="number" disabled={!pushOn} value={pushUsers} onChange={(event) => updateNumber(setPushUsers, event.target.value, 0, 600000)} />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>Push subscribers</Typography>
                  </Stack>
                </Stack>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.08fr' }, gap: 1.5 }}>
              <Card variant="outlined" sx={cardSx}>
                <Brand name={providerInfo[provider].name} logo={providerInfo[provider].logo} site={providerInfo[provider].site} />
                <Typography variant="h2" sx={{ mt: 2.2, fontVariantNumeric: 'tabular-nums' }}>{competitor.cost === null ? 'Custom' : money(competitor.cost)}<Typography component="span" color="text.secondary" variant="caption"> / month</Typography></Typography>
                <Typography variant="caption" color="text.secondary">{competitor.plan} · {competitor.detail}</Typography>
              </Card>
              <Card variant="outlined" sx={{ ...cardSx, borderColor: 'var(--pp-accent-line)', backgroundColor: 'var(--pp-accent-soft)' }}>
                <Brand name="PixlPush" />
                <Typography variant="h2" sx={{ mt: 2.2, fontVariantNumeric: 'tabular-nums' }}>{money(pixl.total)}<Typography component="span" color="text.secondary" variant="caption"> / month</Typography></Typography>
                <Typography variant="caption" color="text.secondary">{pixl.plan} · {count(pixl.allowance)} Reachable Users included</Typography>
                <Typography variant="caption" display="block" sx={{ mt: .5, color: 'var(--pp-text-2)' }}>{emailOn ? pixl.note : 'Unlimited push within the Reachable User allowance'}</Typography>
              </Card>
              <Card variant="outlined" sx={{ ...cardSx, display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'var(--pp-success-soft)', borderColor: 'var(--pp-success-soft)' }}>
                <Typography variant="body2" fontWeight={600}>Direct savings</Typography>
                <Typography variant="h2" sx={{ mt: .5, color: 'var(--pp-success)', fontVariantNumeric: 'tabular-nums' }}>{saving === null ? 'Not comparable' : `${saving < 0 ? '−' : ''}${money(Math.abs(saving))}`}<Typography component="span" color="text.secondary" variant="caption">{saving === null ? '' : ' / month'}</Typography></Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: .5 }}>{saving === null ? 'Choose a like-for-like channel setup to estimate savings.' : `${saving < 0 ? 'Estimated additional cost' : 'Estimated annual difference'} · ${money(Math.abs(saving) * 12)} / year`}</Typography>
              </Card>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
              <FormControl sx={{ width: { xs: '100%', sm: 260 } }}>
                <InputLabel id="comparison-provider-label">Compare with</InputLabel>
                <Select
                  labelId="comparison-provider-label"
                  label="Compare with"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value as Provider)}
                  renderValue={(value) => (
                    <Stack direction="row" alignItems="center" gap={1}>
                      {providerInfo[value as Provider].logo
                        ? <Box component="img" src={providerInfo[value as Provider].logo} alt="" sx={{ width: 24, height: 24, objectFit: 'contain' }} />
                        : <BusinessRounded sx={{ color: 'var(--pp-text-2)' }} />}
                      {providerInfo[value as Provider].name}
                    </Stack>
                  )}
                >
                  {(Object.keys(providerInfo) as Provider[]).map((key) => <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" gap={1.2}>
                      {providerInfo[key].logo
                        ? <Box component="img" src={providerInfo[key].logo} alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
                        : <BusinessRounded sx={{ color: 'var(--pp-text-2)' }} />}
                      <Typography variant="body2">{providerInfo[key].name}</Typography>
                    </Stack>
                  </MenuItem>)}
                </Select>
              </FormControl>
              <Box component="a" href="/get-started?plan=free" sx={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 1, minHeight: 40, px: 2, borderRadius: '6px', color: 'var(--pp-surface)', backgroundColor: 'var(--pp-plum)', textDecoration: 'none', fontSize: 14, fontWeight: 600, '&:hover': { backgroundColor: 'var(--pp-accent-hover)' } }}>
                Try PixlPush for free <ArrowForwardRounded fontSize="small" />
              </Box>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Provider totals are estimates based on the selected plan and usage assumptions, not a quote. Email-only plans do not include push; actual prices vary by region, plan, and provider updates. Brevo logo: <Box component="a" href="https://commons.wikimedia.org/wiki/File:Brevo-Logo.png" target="_blank" rel="noreferrer" sx={{ color: 'inherit' }}>Brevo, via Wikimedia Commons</Box> under <Box component="a" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer" sx={{ color: 'inherit' }}>CC BY-SA 4.0</Box>.
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
