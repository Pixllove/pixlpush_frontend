import { describe, expect, it } from 'vitest';
import { describeViewerTimezone, formatUserDateTime, formatUserLocalDateTime, formatUserTime } from '@/lib/timezone';

describe('viewer timezone formatting', () => {
  it('shows each viewer the same instant with their local offset', () => {
    const instant = '2026-10-28T12:00:00.000Z';
    expect(formatUserDateTime(instant, 'Asia/Karachi')).not.toBe('—');
    expect(formatUserDateTime(instant, 'Asia/Karachi')).toContain('2026');
    expect(formatUserLocalDateTime(instant, 'Asia/Karachi')).toContain('UTC+05:00');
    expect(formatUserLocalDateTime(instant, 'Asia/Karachi')).toMatch(/\b(PM|AM)\b/);
    expect(describeViewerTimezone(instant, 'Asia/Karachi')).toBe('Asia/Karachi (UTC+05:00)');
    expect(formatUserTime(instant, 'UTC')).toContain('UTC+00:00');
    expect(formatUserTime(instant, 'Asia/Karachi')).toContain('UTC+05:00');
    expect(formatUserTime(instant, 'Asia/Dubai')).toContain('UTC+04:00');
    expect(formatUserTime(instant, 'America/New_York')).toContain('UTC-04:00');
  });

  it('uses the offset in effect at the event instant across daylight saving changes', () => {
    expect(formatUserTime('2026-01-15T12:00:00Z', 'America/New_York')).toContain('UTC-05:00');
    expect(formatUserTime('2026-07-15T12:00:00Z', 'America/New_York')).toContain('UTC-04:00');
    expect(formatUserTime('2026-01-15T12:00:00Z', 'Europe/London')).toContain('UTC+00:00');
    expect(formatUserTime('2026-07-15T12:00:00Z', 'Europe/London')).toContain('UTC+01:00');
  });

  it('handles missing, malformed, and unsupported values safely', () => {
    expect(formatUserDateTime(null, 'UTC')).toBe('—');
    expect(formatUserDateTime('not a timestamp', 'UTC')).toBe('—');
    expect(formatUserDateTime('2026-10-28T12:00:00Z', 'UTC+05:00')).toBe('—');
  });
});
