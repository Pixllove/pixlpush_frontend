import { describe, expect, it } from 'vitest';
import { IMPORT_PART_MAX_BYTES, parseImport, rowProblem, splitImportRows } from '@/lib/data-sync-import';

const event = (id: number) => ({ sourceRecordId: `r${id}`, externalUserId: 'u1', eventName: 'signup', occurredAt: '2026-01-01T00:00:00Z' });

describe('historical import files', () => {
  it('rejects files that are not a non-empty JSON array', () => {
    expect(() => parseImport('event_history', '{')).toThrow('valid JSON');
    expect(() => parseImport('event_history', '{}')).toThrow('array');
    expect(() => parseImport('event_history', '[]')).toThrow('no records');
  });

  it('reports invalid rows by their position and creates no parts', () => {
    const result = parseImport('event_history', JSON.stringify([event(1), { ...event(2), occurredAt: 'soon' }]));
    expect(result).toMatchObject({ rows: 2, invalidRows: 1, parts: [], issues: [{ row: 2 }] });
  });

  it('checks message channels and optional dates', () => {
    const message = { sourceMessageId: 'm1', externalUserId: 'u1', channel: 'email', status: 'sent' };
    expect(rowProblem('message_history', message)).toBeNull();
    expect(rowProblem('message_history', { ...message, channel: 'sms' })).toContain('channel');
    expect(rowProblem('message_history', { ...message, sentAt: 'never' })).toContain('sentAt');
  });

  it('splits by row count and byte size without losing rows', () => {
    const rows = Array.from({ length: 1001 }, (_, i) => event(i));
    expect(splitImportRows(rows).map((part) => part.length)).toEqual([500, 500, 1]);
    const large = Array.from({ length: 4 }, (_, i) => ({ ...event(i), properties: { note: 'x'.repeat(2000) }, padding: 'y'.repeat(200_000) }));
    const parts = splitImportRows(large);
    expect(parts.flat()).toHaveLength(4);
    for (const part of parts) expect(new TextEncoder().encode(JSON.stringify(part)).length).toBeLessThanOrEqual(IMPORT_PART_MAX_BYTES);
  });
});
