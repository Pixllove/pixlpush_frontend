/** Users export (lib/users-export.ts): every field, re-importable, SDK users included. */
import { describe, expect, it } from 'vitest';
import { usersToCsv } from '@/lib/users-export';
import type { EndUser } from '@/types/project';

/** Minimal RFC 4180 reader for assertions. */
function parse(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const text = csv.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r') continue;
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell); rows.push(row);
  return rows;
}
const asObjects = (csv: string) => {
  const [headers, ...rows] = parse(csv);
  return rows.map((r) => Object.fromEntries(headers!.map((h, i) => [h, r[i]])));
};

const identified: EndUser = {
  id: 'cmw0odiyftr4lxu2uoysba8c1', externalUserId: 'kami', email: 'kami@gmail.com', name: 'kami',
  country: 'PK', region: 'Punjab', timezone: 'Asia/Karachi', preferredLanguage: 'en', emailConsent: true,
  emailStatus: 'subscribed', accountStatus: null, userType: null,
  lastActiveAt: '2026-11-04T11:29:00.000Z', firstSeenAt: '2026-11-03T12:40:00.000Z', createdAt: '2026-11-03T12:40:00.000Z',
  lifecycleSegment: null, status: 'active', pixlpushId: 'pixlpush_cmw0odiyftr4lxu2uoysba8c1',
  properties: { signupSource: 'web', plan: 'pro', tags: ['a', 'b'] },
  installations: [{ platform: 'web', deviceModel: 'Chrome 156', osVersion: 'macOS', pushPermission: 'granted' }],
  pushSubscriptions: [{ provider: 'web_push', permission: 'granted' }],
};
/** An SDK-tracked user who never identified: no app user ID, email or name. */
const sdkUser: EndUser = {
  id: 'cmw1obzubbwr0yekeuspplz0n', externalUserId: null, email: null, name: null, country: 'PK', preferredLanguage: 'en',
  lastActiveAt: '2026-11-04T05:26:00.000Z', createdAt: '2026-11-04T05:26:00.000Z', lifecycleSegment: null, status: 'anonymous',
  installations: [{ platform: 'ios', deviceModel: 'iPhone15,2', osVersion: '18.1', pushPermission: null }],
  pushSubscriptions: [],
};

describe('users export (unit)', () => {
  const [kami, sdk] = asObjects(usersToCsv([identified, sdkUser]));

  it('includes every profile field shown on user details', () => {
    expect(kami).toMatchObject({
      'User ID': 'kami', Email: 'kami@gmail.com', Name: 'kami', Country: 'PK', Region: 'Punjab', Timezone: 'Asia/Karachi',
      'Preferred language': 'en', 'Email consent': 'yes', 'Last active at (UTC)': '2026-11-04 11:29:00',
      'PixlPush ID': 'pixlpush_cmw0odiyftr4lxu2uoysba8c1', 'PixlPush status': 'active', 'PixlPush email status': 'subscribed',
      'PixlPush signup source': 'web', 'PixlPush platform': 'web · Chrome 156 · macOS', 'PixlPush push permission': 'granted',
      'PixlPush push token': 'Available (WEB_PUSH)', 'First seen at (UTC)': '2026-11-03 12:40:00', 'Created at (UTC)': '2026-11-03 12:40:00',
    });
  });
  it('custom fields become columns; signupSource is not duplicated as one', () => {
    expect(kami!.plan).toBe('pro');
    expect(kami!.tags).toBe('["a","b"]');
    expect(kami).not.toHaveProperty('signupSource');
  });
  it('an SDK user without an app user ID exports its PixlPush id, never a blank', () => {
    expect(sdk!['User ID']).toBe('cmw1obzubbwr0yekeuspplz0n');
    expect(sdk!['PixlPush platform']).toBe('ios · iPhone15,2 · 18.1');
    expect(sdk!['PixlPush push token']).toBe('Not available');
    expect(sdk!.plan).toBe('');
  });
  it('escapes quotes, commas and line breaks; starts with a BOM for Excel', () => {
    const csv = usersToCsv([{ ...identified, name: 'Kami "K", Jr.\nLine 2' }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(asObjects(csv)[0]!.Name).toBe('Kami "K", Jr.\nLine 2');
  });
  it('no users still gives a header row', () => {
    expect(parse(usersToCsv([]))[0]![0]).toBe('User ID');
  });
});

describe('users export (stress)', () => {
  it('20k users with custom fields in well under a few seconds', () => {
    const users = Array.from({ length: 20_000 }, (_, i) => ({ ...identified, id: `u${i}`, externalUserId: `user-${i}`, properties: { plan: i % 2 ? 'pro' : 'free', [`k${i % 50}`]: i } }));
    const started = performance.now();
    const rows = parse(usersToCsv(users));
    expect(rows).toHaveLength(20_001);
    expect(new Set(rows.map((r) => r.length)).size).toBe(1);
    expect(performance.now() - started).toBeLessThan(5_000);
  });
});
