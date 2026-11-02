'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, FormControlLabel, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { PublicRounded, ScheduleRounded } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLocalPricing } from '@/hooks/use-local-pricing';
import { authApi, authKeys } from '@/lib/auth/api';
import { canonicalZone, countryTimezones, getDeviceTimezone, modernZone, offsetLabel, primaryTimezone, setTimezoneOverride, zoneInCountry } from '@/lib/timezone';

/** ISO 3166-1 alpha-2 codes; names come from the browser in the viewer's language. */
const COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ ' +
  'OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

const flag = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/// Browsers still report some zones by their old names; people know the new ones.
const MODERN_CITY: Record<string, string> = { Calcutta: 'Kolkata', Kiev: 'Kyiv', Godthab: 'Nuuk', Ponape: 'Pohnpei', Truk: 'Chuuk', Saigon: 'Ho Chi Minh', Katmandu: 'Kathmandu', Rangoon: 'Yangon', 'Buenos Aires': 'Buenos Aires', Asmera: 'Asmara' };

interface Country { code: string; name: string }
interface Zone { id: string; city: string; region: string; offset: string; minutes: number }

function useCountries(): Country[] {
  return useMemo(() => {
    const names = new Intl.DisplayNames(undefined, { type: 'region' });
    return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

const minutesOf = (offset: string) => {
  const m = offset.match(/UTC([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

const toZone = (id: string, now: Date): Zone => {
  const offset = offsetLabel(now, id);
  const [region, ...rest] = id.split('/');
  const city = (rest.at(-1) ?? id).replace(/_/g, ' ');
  return { id, offset, minutes: minutesOf(offset), region: rest.length ? region : 'Other', city: MODERN_CITY[city] ?? city };
};

/** Every zone the browser knows, one entry per canonical zone. */
function useZones(): Zone[] {
  return useMemo(() => {
    const now = new Date();
    const ids = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [getDeviceTimezone(), 'UTC'];
    const unique = Array.from(new Set(ids.map(canonicalZone)));
    return unique.map((id) => toZone(id, now)).sort((a, b) => a.region.localeCompare(b.region) || a.minutes - b.minutes || a.city.localeCompare(b.city));
  }, []);
}

const zoneLabel = (zone: Zone) => `(${zone.offset}) ${zone.city}`;

/** Live clock in a zone, refreshed every 30 seconds. */
function useClock(timeZone: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(id); }, []);
  if (!timeZone) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone, weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(now);
  } catch { return null; }
}

/**
 * Profile section: country/region and the time zone dates are shown in.
 * As in Slack and Google: the zone follows the device by default; picking a
 * country whose time differs from the device switches to that country's zone
 * (and says so), and a mismatch is never left silent.
 */
export default function RegionSettings() {
  const { account, isLoading } = useCurrentUser();
  const detectedCountry = useLocalPricing().data?.country ?? null;
  const queryClient = useQueryClient();
  const countries = useCountries();
  const zones = useZones();
  const device = canonicalZone(getDeviceTimezone());

  const [country, setCountry] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [zone, setZone] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!account) return;
    setCountry(account.country ?? null);
    setAuto(account.timezoneAuto !== false);
    setZone(account.timezone ? canonicalZone(account.timezone) : device);
    setNotice(null);
  }, [account, device]);
  // First visit: suggest the country from the visitor's IP; it is saved only when they confirm.
  const suggested = !account?.country && !country && detectedCountry ? detectedCountry : null;
  const shownCountry = country ?? suggested;
  const countryName = (code: string | null) => countries.find((c) => c.code === code)?.name ?? code ?? '';
  const inCountry = useMemo(() => new Set(countryTimezones(shownCountry)), [shownCountry]);

  const effectiveZone = auto ? device : zone;
  const clock = useClock(effectiveZone);
  const zoneOf = (id: string | null) => (id ? zones.find((z) => z.id === canonicalZone(id)) ?? toZone(id, new Date()) : null);
  // Automatic zone, but the device is outside the chosen country: say so and offer the country's time.
  const mismatch = auto && shownCountry && !zoneInCountry(device, shownCountry) ? primaryTimezone(shownCountry) : null;

  /** Picking a country moves the zone to that country's, unless the device is already there. */
  const chooseCountry = (code: string | null) => {
    setCountry(code); save.reset(); setNotice(null);
    if (!code) return;
    const current = auto ? device : zone ?? device;
    if (zoneInCountry(current, code)) return;
    const main = primaryTimezone(code);
    if (!main) return;
    setAuto(false); setZone(main);
    const many = countryTimezones(code).length > 1;
    setNotice(`Time zone set to ${countryName(code)} (${zoneLabel(zoneOf(main)!)}).${many ? ` ${countryName(code)} has several time zones: pick yours below.` : ''} Turn on “Set time zone automatically” to follow this device instead.`);
  };

  const useCountryTime = () => {
    if (!mismatch) return;
    setAuto(false); setZone(mismatch); save.reset();
    setNotice(null);
  };

  const dirty = Boolean(account) && (
    (shownCountry ?? null) !== (account?.country ?? null)
    || auto !== (account?.timezoneAuto !== false)
    || (!auto && zone !== (account?.timezone ? canonicalZone(account.timezone) : null))
  );

  const save = useMutation({
    mutationFn: () => authApi.updatePreferences({ country: shownCountry, timezoneAuto: auto, timezone: modernZone((auto ? device : zone) ?? device) }),
    onSuccess: ({ account: saved }) => {
      setTimezoneOverride(saved.timezoneAuto ? null : saved.timezone ?? null);
      queryClient.setQueryData(authKeys.currentUser(), (current: unknown) => current && typeof current === 'object' ? { ...current, account: saved } : current);
    },
  });

  const selectedCountry = countries.find((c) => c.code === shownCountry) ?? null;
  const deviceZone = zoneOf(device);
  // The chosen country's zones come first, under the country's name.
  const groupOf = (option: Zone) => (inCountry.has(option.id) ? `Time zones in ${countryName(shownCountry)}` : option.region);
  const zoneOptions = useMemo(() => [...zones.filter((z) => inCountry.has(z.id)), ...zones.filter((z) => !inCountry.has(z.id))], [zones, inCountry]);

  return (
    <section className="pp-profile-section" aria-labelledby="region-settings-title">
      <div>
        <Typography variant="h3" id="region-settings-title">Country & time zone</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>
          Used to show dates, schedules and reports in your local time across PixlPush.
        </Typography>
      </div>
      <Stack gap={2.5} sx={{ minWidth: 0 }}>
        {isLoading ? <Skeleton variant="rounded" height={56} /> : (
          <Autocomplete
            options={countries}
            value={selectedCountry}
            onChange={(_, value) => chooseCountry(value?.code ?? null)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            autoHighlight
            renderOption={({ key, ...props }, option) => (
              <Box component="li" key={key} {...props} sx={{ gap: 1.25 }}>
                <span aria-hidden>{flag(option.code)}</span>{option.name}
                <Typography component="span" color="text.secondary" fontSize="var(--fs-12)" sx={{ ml: 'auto' }}>{option.code}</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Country or region"
                helperText={suggested ? 'Detected from your location. Save to confirm.' : undefined}
                InputProps={{ ...params.InputProps, startAdornment: selectedCountry ? <Box component="span" aria-hidden sx={{ pl: .5, pr: .25 }}>{flag(selectedCountry.code)}</Box> : <PublicRounded fontSize="small" sx={{ ml: .5, color: 'text.secondary' }} /> }}
              />
            )}
          />
        )}

        <Box>
          <FormControlLabel
            control={<Switch checked={auto} onChange={(event) => { setAuto(event.target.checked); setNotice(null); save.reset(); }} />}
            label="Set time zone automatically"
          />
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ ml: 6, mt: -.5 }}>
            {auto ? `Follows this device, also when you travel. Now: ${deviceZone ? zoneLabel(deviceZone) : device}.` : 'Dates always use the time zone below, on every device.'}
          </Typography>
        </Box>

        {mismatch && (
          <Alert severity="warning" data-testid="zone-mismatch" action={<Button color="inherit" size="small" onClick={useCountryTime} sx={{ whiteSpace: 'nowrap' }}>Use {countryName(shownCountry)} time</Button>}>
            This device is in {deviceZone?.city ?? device} ({deviceZone?.offset}), which is not in {countryName(shownCountry)}.
          </Alert>
        )}
        {notice && <Alert severity="info" onClose={() => setNotice(null)} data-testid="zone-notice">{notice}</Alert>}

        {isLoading ? <Skeleton variant="rounded" height={56} /> : (
          <Autocomplete
            options={zoneOptions}
            value={auto ? deviceZone : zoneOf(zone)}
            onChange={(_, value) => { setZone(value?.id ?? null); setNotice(null); save.reset(); }}
            disabled={auto}
            groupBy={groupOf}
            getOptionLabel={zoneLabel}
            filterOptions={(options, state) => {
              const q = state.inputValue.trim().toLowerCase();
              return q ? options.filter((o) => `${o.id} ${o.city} ${o.offset}`.toLowerCase().includes(q)) : options;
            }}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            autoHighlight
            renderOption={({ key, ...props }, option) => (
              <Box component="li" key={key} {...props} sx={{ justifyContent: 'space-between', gap: 1 }}>
                <span>{option.city}</span>
                <Typography component="span" color="text.secondary" fontSize="var(--fs-12)">{option.offset}</Typography>
              </Box>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Time zone" placeholder="Search a city or UTC offset"
                InputProps={{ ...params.InputProps, startAdornment: <ScheduleRounded fontSize="small" sx={{ ml: .5, color: 'text.secondary' }} /> }} />
            )}
          />
        )}

        {clock && <Typography color="text.secondary" fontSize="var(--fs-13)" data-testid="local-time">Your local time: <b>{clock}</b></Typography>}
        {save.isSuccess && <Alert severity="success">Country and time zone saved.</Alert>}
        {save.isError && <Alert severity="error">{(save.error as { message?: string }).message ?? 'Could not save. Please try again.'}</Alert>}
        <Button variant="contained" onClick={() => save.mutate()} disabled={!dirty || save.isPending || (!auto && !zone)} sx={{ alignSelf: 'flex-start' }}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </Stack>
    </section>
  );
}
