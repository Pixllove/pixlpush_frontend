'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, FormControlLabel, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material';
import { PublicRounded, ScheduleRounded } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLocalPricing } from '@/hooks/use-local-pricing';
import { authApi, authKeys } from '@/lib/auth/api';
import { getDeviceTimezone, offsetLabel, setTimezoneOverride } from '@/lib/timezone';

/** ISO 3166-1 alpha-2 codes; names come from the browser in the viewer's language. */
const COUNTRY_CODES = (
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ ' +
  'OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ ' +
  'UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'
).split(' ');

const flag = (code: string) => String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)));

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

function useZones(): Zone[] {
  return useMemo(() => {
    const now = new Date();
    const ids = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [getDeviceTimezone(), 'UTC'];
    return ids.map((id) => {
      const offset = offsetLabel(now, id);
      const [region, ...rest] = id.split('/');
      return { id, offset, minutes: minutesOf(offset), region: rest.length ? region : 'Other', city: (rest.at(-1) ?? id).replace(/_/g, ' ') };
    }).sort((a, b) => a.region.localeCompare(b.region) || a.minutes - b.minutes || a.city.localeCompare(b.city));
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
 * Like Slack and Google Account, the zone follows the device by default and
 * can be pinned to a fixed zone instead.
 */
export default function RegionSettings() {
  const { account, isLoading } = useCurrentUser();
  const detectedCountry = useLocalPricing().data?.country ?? null;
  const queryClient = useQueryClient();
  const countries = useCountries();
  const zones = useZones();
  const device = getDeviceTimezone();

  const [country, setCountry] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [zone, setZone] = useState<string | null>(null);
  useEffect(() => {
    if (!account) return;
    setCountry(account.country ?? null);
    setAuto(account.timezoneAuto !== false);
    setZone(account.timezone ?? device);
  }, [account, device]);
  // First visit: suggest the country from the visitor's IP; it is saved only when they confirm.
  const suggested = !account?.country && !country && detectedCountry ? detectedCountry : null;
  const shownCountry = country ?? suggested;

  const effectiveZone = auto ? device : zone;
  const clock = useClock(effectiveZone);
  const dirty = Boolean(account) && (
    (shownCountry ?? null) !== (account?.country ?? null)
    || auto !== (account?.timezoneAuto !== false)
    || (!auto && zone !== (account?.timezone ?? null))
  );

  const save = useMutation({
    mutationFn: () => authApi.updatePreferences({ country: shownCountry, timezoneAuto: auto, timezone: auto ? device : zone }),
    onSuccess: ({ account: saved }) => {
      setTimezoneOverride(saved.timezoneAuto ? null : saved.timezone ?? null);
      queryClient.setQueryData(authKeys.currentUser(), (current: unknown) => current && typeof current === 'object' ? { ...current, account: saved } : current);
    },
  });

  const selectedCountry = countries.find((c) => c.code === shownCountry) ?? null;
  const selectedZone = zones.find((z) => z.id === zone) ?? null;
  const deviceZone = zones.find((z) => z.id === device);

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
            onChange={(_, value) => { setCountry(value?.code ?? null); save.reset(); }}
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
            control={<Switch checked={auto} onChange={(event) => { setAuto(event.target.checked); save.reset(); }} />}
            label="Set time zone automatically"
          />
          <Typography color="text.secondary" fontSize="var(--fs-12)" sx={{ ml: 6, mt: -.5 }}>
            {auto ? `Using this device's time zone: ${deviceZone ? zoneLabel(deviceZone) : device}.` : 'Dates always use the time zone below, on every device.'}
          </Typography>
        </Box>

        {isLoading ? <Skeleton variant="rounded" height={56} /> : (
          <Autocomplete
            options={zones}
            value={auto ? deviceZone ?? null : selectedZone}
            onChange={(_, value) => { setZone(value?.id ?? null); save.reset(); }}
            disabled={auto}
            groupBy={(option) => option.region}
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
