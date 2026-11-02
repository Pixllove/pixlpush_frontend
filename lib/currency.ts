/** ISO 3166 country -> ISO 4217 currency (same table as the backend). Unknown countries fall back to USD. */
const COUNTRY_CURRENCY: Record<string, string> = Object.fromEntries(
  (
    'AE:aed AF:afn AL:all AM:amd AO:aoa AR:ars AU:aud AZ:azn BA:bam BD:bdt BG:bgn BH:bhd BN:bnd BO:bob BR:brl ' +
    'BW:bwp BY:byn BZ:bzd CA:cad CH:chf CL:clp CN:cny CO:cop CR:crc CZ:czk DK:dkk DO:dop DZ:dzd EG:egp ET:etb ' +
    'GB:gbp GE:gel GH:ghs GT:gtq HK:hkd HN:hnl HU:huf ID:idr IL:ils IN:inr IQ:iqd IR:irr IS:isk JM:jmd JO:jod ' +
    'JP:jpy KE:kes KG:kgs KH:khr KR:krw KW:kwd KZ:kzt LA:lak LB:lbp LK:lkr MA:mad MD:mdl MK:mkd MM:mmk MN:mnt ' +
    'MO:mop MU:mur MV:mvr MW:mwk MX:mxn MY:myr MZ:mzn NA:nad NG:ngn NI:nio NO:nok NP:npr NZ:nzd OM:omr PA:usd ' +
    'PE:pen PH:php PK:pkr PL:pln PY:pyg QA:qar RO:ron RS:rsd RU:rub RW:rwf SA:sar SE:sek SG:sgd TH:thb TJ:tjs ' +
    'TN:tnd TR:try TT:ttd TW:twd TZ:tzs UA:uah UG:ugx US:usd UY:uyu UZ:uzs VN:vnd XK:eur ZA:zar ZM:zmw ' +
    'AT:eur BE:eur CY:eur DE:eur EE:eur ES:eur FI:eur FR:eur GR:eur HR:eur IE:eur IT:eur LT:eur LU:eur LV:eur ' +
    'MT:eur NL:eur PT:eur SI:eur SK:eur EC:usd SV:usd'
  ).split(' ').map((pair) => pair.split(':') as [string, string]),
);

export const currencyForCountry = (country?: string | null) => (country && COUNTRY_CURRENCY[country.toUpperCase()]) || 'usd';
