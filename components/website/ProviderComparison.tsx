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

export type Provider = 'brevo' | 'mailchimp' | 'mailerlite' | 'onesignal' | 'stack';

const providerInfo: Record<Provider, { name: string; logo?: string; site?: string }> = {
  brevo: { name: 'Brevo', logo: 'https://www.google.com/s2/favicons?domain=brevo.com&sz=128', site: 'brevo.com' },
  mailchimp: { name: 'Mailchimp', logo: 'https://www.google.com/s2/favicons?domain=mailchimp.com&sz=128', site: 'mailchimp.com' },
  mailerlite: { name: 'MailerLite', logo: 'https://www.google.com/s2/favicons?domain=mailerlite.com&sz=128', site: 'mailerlite.com' },
  onesignal: { name: 'OneSignal', logo: 'https://www.google.com/s2/favicons?domain=onesignal.com&sz=128', site: 'onesignal.com' },
  stack: { name: 'Your current stack' },
};

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: value % 1 ? 2 : 0,
}).format(value);
const count = (value: number) => new Intl.NumberFormat('en-US').format(value);

const audienceLimit = (provider: Provider) => provider === 'brevo' ? 100000 : provider === 'mailerlite' || provider === 'onesignal' ? 50000 : 120000;
const automaticEmailVolume = (users: number) => users <= 2000 ? 10000 : users < 25000 ? 20000 : 250000;
const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function pixlEstimate(users: number, emailSends: number) {
  if (users <= 2000) {
    const extra = Math.max(0, emailSends - 10000) / 1000;
    return { plan: extra ? 'Free + usage' : 'Free', total: extra, allowance: 2000, note: extra ? `10,000 emails included · +${money(extra)} usage` : '10,000 emails included · Unlimited push' };
  }
  if (users <= 5000) {
    const extra = Math.max(0, emailSends - 50000) / 1000;
    return { plan: extra ? 'Starter + usage' : 'Starter', total: roundMoney(29 + extra), allowance: 5000, note: extra ? `50,000 emails included · +${money(extra)} usage` : '50,000 emails included · Unlimited push' };
  }
  const extraReach = Math.max(0, users - 25000) * 0.008;
  const extraEmails = Math.max(0, emailSends - 250000) / 1000;
  return {
    plan: extraReach || extraEmails ? 'Pro + usage' : 'Pro',
    total: roundMoney(79 + extraReach + extraEmails),
    allowance: 25000,
    note: extraEmails ? `250,000 emails included · +${money(extraEmails)} usage · Unlimited push` : '250,000 emails included · Unlimited push',
  };
}

function brevoPushCost(subscribers: number) {
  const tiers: [number, number][] = [[20000, 0], [40000, 108], [60000, 162], [100000, 270], [150000, 405], [300000, 810], [400000, 1080], [500000, 1350], [600000, 1620]];
  if (subscribers <= tiers[0][0]) return 0;
  const index = tiers.findIndex(([limit]) => subscribers <= limit);
  if (index < 0) return null;
  const [upperUsers, upperCost] = tiers[index];
  const [lowerUsers, lowerCost] = tiers[index - 1];
  return roundMoney(lowerCost + ((subscribers - lowerUsers) / (upperUsers - lowerUsers)) * (upperCost - lowerCost));
}

export function providerEstimate(provider: Provider, users: number, emailSends: number, pushSubscribers: number, emailOn: boolean, pushOn: boolean) {
  const emails = emailOn ? Math.min(3000000, Math.max(0, emailSends)) : 0;
  const pushes = pushOn ? Math.min(600000, Math.max(0, pushSubscribers)) : 0;
  const unavailable = (plan: string, detail: string) => ({ cost: null, plan, detail, comparable: false });
  if (provider === 'stack') return unavailable('Price not yet verified', pushOn ? 'Push not included · additional tool required' : 'Check stack pricing');

  if (provider === 'mailchimp') {
    if (emails > 500000) return unavailable('Standard', 'Mailchimp comparison capped at 500,000 emails/month');
    const tiers: [number, number, number][] = [[500, 20, 6000], [1500, 45, 6000], [2500, 60, 6000], [5000, 100, 6000], [10000, 135, 120000], [15000, 230, 180000], [20000, 285, 240000], [25000, 310, 300000], [30000, 340, 360000], [40000, 410, 480000], [50000, 450, 600000], [75000, 630, 900000], [100000, 800, 1200000], [130000, 1150, 1950000], [150000, 1325, 2250000], [200000, 1600, 3000000]];
    const tierIndex = tiers.findIndex(([limit]) => users <= limit);
    if (tierIndex < 0) return unavailable('Custom · over 200,000 contacts', pushOn ? 'Push not included · additional tool required' : 'Custom plan');
    const [limit, cost, emailLimit] = tiers[tierIndex];
    const lower = tiers[tierIndex - 1]?.[0] + 1 || 0;
    const annual = users > 10000 ? ' · 15% annual offer shown by the calculator' : '';
    const note = emails > emailLimit ? `Up to ${count(emailLimit)} emails/month · Overages extra${annual}` : `Up to ${count(emailLimit)} emails/month${annual}`;
    return { cost, plan: `Standard · ${count(lower)}–${count(limit)} contacts`, detail: pushOn ? 'Push not included · additional tool required' : note, comparable: !pushOn && emails <= emailLimit };
  }

  if (provider === 'mailerlite') {
    if (emails > 250000) return unavailable('Enterprise', 'MailerLite comparison capped at 250,000 emails/month');
    if (users <= 250 && emails <= 2500) return { cost: 0, plan: 'Free', detail: pushOn ? 'Push not included · additional tool required' : 'Email included', comparable: !pushOn };
    const tiers: [number, number, number][] = [[500, 12, 25], [1000, 19, 39], [2500, 33, 49], [5000, 49, 69], [8000, 69, 99], [10000, 89, 129], [15000, 129, 179], [20000, 159, 219], [25000, 179, 239], [30000, 229, 279], [35000, 249, 309], [40000, 269, 329], [50000, 319, 389], [60000, 359, 419], [70000, 379, 439], [80000, 399, 459], [90000, 419, 469], [100000, 439, 489], [150000, 619, 759]];
    const tier = tiers.find(([limit]) => users <= limit);
    if (!tier) return unavailable('Enterprise · over 150,000 subscribers', pushOn ? 'Push not included · additional tool required' : 'Custom plan');
    const [limit, comfort, power] = tier;
    const isPower = emails > limit * 10;
    return { cost: isPower ? power : comfort, plan: `${isPower ? 'Power' : 'Comfort'} · up to ${count(limit)} subscribers`, detail: pushOn ? 'Push not included · additional tool required' : isPower ? 'Unlimited emails' : `Up to ${count(limit * 10)} emails/month`, comparable: !pushOn };
  }

  if (provider === 'onesignal') {
    if (emails > 500000) return unavailable('Growth', 'OneSignal comparison capped at 500,000 emails/month');
    return { cost: roundMoney(19 + (pushOn ? users * 0.012 : 0) + Math.max(0, emails - 20000) * 0.0015), plan: 'Growth', detail: '10 email campaigns included', comparable: true };
  }

  if (emails > 800000) return unavailable('Professional', 'Brevo comparison capped at 800,000 emails/month');
  const standard: [number, number][] = [[5000, 18], [10000, 35], [15000, 49], [20000, 69], [30000, 79], [40000, 89], [50000, 97], [60000, 104], [80000, 119], [100000, 139], [150000, 179], [250000, 249]];
  const professional: [number, number][] = [[150000, 499], [250000, 599], [500000, 699], [1000000, 999], [2000000, 1479]];
  const tier = (pushOn ? professional : standard).find(([limit]) => emails <= limit);
  const pushCost = pushOn ? brevoPushCost(pushes) : 0;
  const detail = pushOn
    ? tier ? `20,000 push subscribers included${pushCost ? ` · +${money(pushCost)} for additional subscribers` : ''} · up to ${count(tier[0])} emails/month` : 'Web + mobile push · Contact sales for pricing'
    : tier ? `10,000 web push subscribers included · up to ${count(tier[0])} emails/month` : 'Contact sales for pricing';
  return { cost: tier && pushCost !== null ? roundMoney(tier[1] + pushCost) : null, plan: pushOn ? 'Professional' : 'Standard', detail, comparable: pushOn ? Boolean(tier) && pushCost !== null : Boolean(tier) };
}

function Brand({ name, logo, site }: { name: string; logo?: string; site?: string }) {
  if (name === 'PixlPush') {
    return (
      <Stack direction="row" alignItems="center" gap={1.2}>
        <Box component="img" src="/assets/site-icon.png" alt="" sx={{ display: 'block', width: 38, height: 38, flex: '0 0 38px', borderRadius: '8px', objectFit: 'contain' }} />
        <Typography fontSize={14} fontWeight={600}>PixlPush</Typography>
      </Stack>
    );
  }
  return (
    <Stack direction="row" alignItems="center" gap={1.2}>
      {logo && <Box component="img" src={logo} alt={`${name} logo`} loading="lazy" sx={{ width: 38, height: 38, borderRadius: '8px', objectFit: 'contain', objectPosition: 'center', backgroundColor: '#fff' }} />}
      {!logo && <Box sx={{ display: 'grid', width: 38, height: 38, flex: '0 0 38px', placeItems: 'center', borderRadius: '8px', color: 'var(--pp-text-2)', backgroundColor: 'var(--pp-border)' }}><BusinessRounded fontSize="small" /></Box>}
      <Box>
        <Typography fontSize={14} fontWeight={600}>{name}</Typography>
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
  const [users, setUsers] = useState(2000);
  const [emailSends, setEmailSends] = useState(10000);
  const [pushUsers, setPushUsers] = useState(2000);
  const [emailOn, setEmailOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [provider, setProvider] = useState<Provider>('brevo');
  const [emailVolumeAuto, setEmailVolumeAuto] = useState(true);
  const [audienceIsCapped, setAudienceIsCapped] = useState(false);
  const pixl = useMemo(() => pixlEstimate(users, emailOn ? emailSends : 0), [users, emailSends, emailOn]);
  const competitor = useMemo(() => providerEstimate(provider, users, emailSends, pushUsers, emailOn, pushOn), [provider, users, emailSends, pushUsers, emailOn, pushOn]);
  const competitorEmailIsCapped = emailOn && ((provider === 'brevo' && emailSends > 800000) || (provider === 'mailchimp' && emailSends > 500000) || (provider === 'mailerlite' && emailSends > 250000) || (provider === 'onesignal' && emailSends > 500000));
  const comparisonIsCapped = audienceIsCapped || competitorEmailIsCapped;
  const saving = !comparisonIsCapped && competitor.cost !== null ? competitor.cost - pixl.total : null;
  const percentLess = saving !== null && saving > 0 && competitor.cost ? Math.round((saving / competitor.cost) * 100) : 0;

  const syncAudienceValue = (rawValue: string | number, nextProvider = provider) => {
    const requested = Number(rawValue) || 250;
    const limit = audienceLimit(nextProvider);
    const value = Math.round(Math.min(limit, Math.max(250, requested)) / 250) * 250;
    setUsers(value);
    setPushUsers(value);
    setAudienceIsCapped(['brevo', 'mailerlite', 'onesignal'].includes(nextProvider) && requested > limit);
    if (emailVolumeAuto) setEmailSends(automaticEmailVolume(value));
  };
  const updateEmailSends = (rawValue: string) => {
    setEmailVolumeAuto(false);
    setEmailSends(Math.min(3000000, Math.max(0, Number(rawValue) || 0)));
  };
  const maxUsers = audienceLimit(provider);
  const ticks = [250, .25, .5, .75, 1].map((value, index) => index === 0 ? 250 : Math.round((maxUsers * (value as number)) / 250) * 250);
  const capMessage = audienceIsCapped
    ? `${providerInfo[provider].name} comparison is capped at ${count(maxUsers)} users. Please contact sales.`
    : competitorEmailIsCapped ? competitor.detail : '';

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
              <TextField label="Users / subscribers" type="number" error={audienceIsCapped} helperText={audienceIsCapped ? capMessage : undefined} inputProps={{ min: 250, max: maxUsers, step: 250 }} value={users} onChange={(event) => syncAudienceValue(event.target.value)} sx={{ width: { xs: '100%', sm: 205 }, flexShrink: 0 }} />
            </Stack>

            <Box sx={{ px: 1.5 }}>
              <Slider aria-label="Reachable users per month" min={250} max={maxUsers} step={250} value={users} onChange={(_, value) => syncAudienceValue(value as number)} />
              <Stack direction="row" justifyContent="space-between" sx={{ mx: -1.5 }}>
                {ticks.map((value, index) => <Typography key={`${index}-${value}`} variant="caption" className="pp-compare-tick">{index === 4 ? `${count(value)}+` : count(value)}</Typography>)}
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
                  <TextField label="Email sends / month" type="number" inputProps={{ 'aria-label': 'Email sends per month', min: 0, max: 3000000, step: 1000 }} value={emailSends} onChange={(event) => updateEmailSends(event.target.value)} />
                  <TextField label="Push subscribers" type="number" error={pushOn && audienceIsCapped} helperText={pushOn && audienceIsCapped ? capMessage : undefined} inputProps={{ min: 0, max: maxUsers, step: 250 }} disabled={!pushOn} value={pushUsers} onChange={(event) => syncAudienceValue(event.target.value)} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.08fr' }, gap: 2 }}>
              <div className="pp-compare-tile">
                <Brand name={providerInfo[provider].name} logo={providerInfo[provider].logo} site={providerInfo[provider].site} />
                <div className="pp-compare-price">{comparisonIsCapped || competitor.cost === null ? '—' : <><Amount value={competitor.cost} /><small> / month</small></>}</div>
                <Typography variant="body2" sx={{ color: comparisonIsCapped ? '#b42318' : 'text.secondary', fontWeight: comparisonIsCapped ? 600 : undefined }}>{comparisonIsCapped ? 'Not available · ' : `${competitor.plan} · `}{comparisonIsCapped ? capMessage : competitor.detail}</Typography>
              </div>
              <div className="pp-compare-tile is-own">
                <Brand name="PixlPush" />
                <div className="pp-compare-price">{comparisonIsCapped ? '—' : <><Amount value={pixl.total} /><small> / month</small></>}</div>
                <Typography variant="body2" sx={{ color: comparisonIsCapped ? '#b42318' : 'text.secondary', fontWeight: comparisonIsCapped ? 600 : undefined }}>
                  {comparisonIsCapped ? capMessage : <>{pixl.plan} · {count(pixl.allowance)} Reachable Users included<br />{emailOn ? pixl.note : 'Unlimited push within the Reachable User allowance'}</>}
                </Typography>
              </div>
              <div className="pp-compare-tile is-saving" aria-live="polite">
                <Stack direction="row" alignItems="center" gap={1}>
                  <Typography variant="overline">{saving === null ? 'Price comparison' : saving < 0 ? 'Additional cost' : 'Direct savings'}</Typography>
                  {percentLess > 0 && <Chip size="small" color="success" label={`${percentLess}% less`} />}
                </Stack>
                <div className={saving === null ? 'pp-compare-price is-text' : 'pp-compare-price'}>
                  {saving === null ? '—' : <><Amount value={Math.abs(saving)} /><small> / month</small></>}
                </div>
                <Typography variant="body2" sx={{ color: comparisonIsCapped ? '#b42318' : undefined, fontWeight: comparisonIsCapped ? 600 : undefined }}>{saving === null ? (comparisonIsCapped ? capMessage : 'Price not yet verified') : `${saving < 0 ? 'Estimated additional cost' : 'Estimated annual difference'} · ${money(roundMoney(Math.abs(saving) * 12))} / year`}</Typography>
              </div>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
              <FormControl sx={{ width: { xs: '100%', sm: 260 } }}>
                <InputLabel id="comparison-provider-label">Compare with</InputLabel>
                <Select
                  labelId="comparison-provider-label"
                  label="Compare with"
                  value={provider}
                  onChange={(event) => {
                    const next = event.target.value as Provider;
                    setProvider(next);
                    syncAudienceValue(users, next);
                  }}
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
