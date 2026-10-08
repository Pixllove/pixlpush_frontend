'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import BusinessRounded from '@mui/icons-material/BusinessRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import {
  Box,
  Button,
  Card,
  Chip,
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

// Counts to the new amount in 200ms; jumps straight there when the user prefers reduced motion.
function Amount({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const origin = current.current;
    if (origin === value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min(1, (now - start) / 200);
      current.current = origin + (value - origin) * (1 - (1 - progress) ** 3);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{money(shown === value ? value : Math.round(shown))}</>;
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
  const percentLess = saving !== null && saving > 0 && competitor.cost ? Math.round((saving / competitor.cost) * 100) : 0;

  const updateNumber = (setter: (value: number) => void, value: string, minimum = 0, maximum = 3000000) => {
    setter(Math.min(maximum, Math.max(minimum, Number(value) || 0)));
  };

  return (
    <Box component="section" className="pp-compare" aria-labelledby="provider-comparison-title" sx={{ mt: 5 }}>
      <Stack gap={{ xs: 3, md: 5 }}>
        <Box sx={{ maxWidth: 850, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="overline" color="primary">MAKE MORE OF YOUR USERS</Typography>
          <Typography id="provider-comparison-title" variant="h1" className="pp-compare-title" sx={{ mt: 1 }}>
            What does your<br /><span>communication cost?</span>
          </Typography>
          <Typography color="text.secondary" className="pp-compare-lede" sx={{ mt: 2, mx: 'auto', maxWidth: 640 }}>
            Compare the cost of the same communication setup across providers — with email, push, or both.
          </Typography>
        </Box>

        <Card sx={{ p: { xs: 2, md: 5 } }}>
          <Stack gap={{ xs: 3, md: 4 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} gap={2}>
              <Box>
                <Typography variant="overline" color="primary">Your scenario</Typography>
                <Typography variant="h1" component="h3" sx={{ mt: .5 }}>How many users do you want to reach each month?</Typography>
                <Typography color="text.secondary" sx={{ mt: .5 }}>We compare the same reach and send volume for every provider.</Typography>
              </Box>
              <TextField label="Users / subscribers" type="number" inputProps={{ min: 250, max: 200000, step: 250 }} value={users} onChange={(event) => updateNumber(setUsers, event.target.value, 250, 200000)} sx={{ width: { xs: '100%', sm: 205 }, flexShrink: 0 }} />
            </Stack>

            <Box sx={{ px: 1.5 }}>
              <Slider aria-label="Reachable users per month" min={250} max={200000} step={250} value={users} onChange={(_, value) => setUsers(value as number)} />
              <Stack direction="row" justifyContent="space-between" sx={{ mx: -1.5 }}>
                {[250, 50000, 100000, 150000, 200000].map((value) => <Typography key={value} variant="caption" className="pp-compare-tick">{value === 200000 ? '200,000+' : count(value)}</Typography>)}
              </Stack>
            </Box>

            <Box className="pp-compare-rules" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, py: { xs: 3, md: 4 } }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Which channels do you use?</Typography>
                <Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  <Button aria-pressed={emailOn} variant="outlined" size="large" className={emailOn ? 'pp-compare-channel is-on' : 'pp-compare-channel'} startIcon={<MailOutlineRounded />} endIcon={emailOn ? <CheckRounded /> : undefined} onClick={() => setEmailOn((selected) => !selected)}>Email</Button>
                  <Button aria-pressed={pushOn} variant="outlined" size="large" className={pushOn ? 'pp-compare-channel is-on' : 'pp-compare-channel'} startIcon={<NotificationsActiveOutlined />} endIcon={pushOn ? <CheckRounded /> : undefined} onClick={() => setPushOn((selected) => !selected)}>Push notifications</Button>
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Your usage</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, mt: 2 }}>
                  <TextField label="Email sends / month" type="number" inputProps={{ 'aria-label': 'Email sends per month' }} disabled={!emailOn} value={emailSends} onChange={(event) => updateNumber(setEmailSends, event.target.value)} />
                  <TextField label="Push subscribers" type="number" disabled={!pushOn} value={pushUsers} onChange={(event) => updateNumber(setPushUsers, event.target.value, 0, 600000)} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.08fr' }, gap: 2 }}>
              <div className="pp-compare-tile">
                <Brand name={providerInfo[provider].name} logo={providerInfo[provider].logo} site={providerInfo[provider].site} />
                <div className="pp-compare-price">{competitor.cost === null ? 'Custom' : <><Amount value={competitor.cost} /><small> / month</small></>}</div>
                <Typography variant="body2" color="text.secondary">{competitor.plan} · {competitor.detail}</Typography>
              </div>
              <div className="pp-compare-tile is-own">
                <Brand name="PixlPush" />
                <div className="pp-compare-price"><Amount value={pixl.total} /><small> / month</small></div>
                <Typography variant="body2" color="text.secondary">
                  {pixl.plan} · {count(pixl.allowance)} Reachable Users included<br />
                  {emailOn ? pixl.note : 'Unlimited push within the Reachable User allowance'}
                </Typography>
              </div>
              <div className="pp-compare-tile is-saving" aria-live="polite">
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="overline">{saving !== null && saving < 0 ? 'Additional cost' : 'Direct savings'}</Typography>
                  {percentLess > 0 && <Chip size="small" color="success" label={`${percentLess}% less`} />}
                </Stack>
                <div className={saving === null ? 'pp-compare-price is-text' : 'pp-compare-price'}>
                  {saving === null ? 'Not comparable' : <><Amount value={Math.abs(saving)} /><small> / month</small></>}
                </div>
                <Typography variant="body2">{saving === null ? 'Choose a like-for-like channel setup to estimate savings.' : `${saving < 0 ? 'Estimated additional cost' : 'Estimated annual difference'} · ${money(Math.abs(saving) * 12)} / year`}</Typography>
              </div>
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
                        : <BusinessRounded sx={{ fontSize: 20 }} />}
                      {providerInfo[value as Provider].name}
                    </Stack>
                  )}
                >
                  {(Object.keys(providerInfo) as Provider[]).map((key) => <MenuItem key={key} value={key}>
                    <Stack direction="row" alignItems="center" gap={1.2}>
                      {providerInfo[key].logo
                        ? <Box component="img" src={providerInfo[key].logo} alt="" sx={{ width: 28, height: 28, objectFit: 'contain' }} />
                        : <BusinessRounded sx={{ fontSize: 20 }} />}
                      <Typography variant="body2">{providerInfo[key].name}</Typography>
                    </Stack>
                  </MenuItem>)}
                </Select>
              </FormControl>
              <Button href="/get-started?plan=free" variant="contained" size="large" endIcon={<ArrowForwardRounded />}>Try PixlPush for free</Button>
            </Stack>

            <Typography variant="caption" className="pp-compare-note">
              Provider totals are estimates based on the selected plan and usage assumptions, not a quote. Email-only plans do not include push; actual prices vary by region, plan, and provider updates. Brevo logo: <a href="https://commons.wikimedia.org/wiki/File:Brevo-Logo.png" target="_blank" rel="noreferrer">Brevo, via Wikimedia Commons</a> under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
}
