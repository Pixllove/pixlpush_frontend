export type ImportKind = 'event_history' | 'message_history' | 'segment_history';

export const IMPORT_FILE_MAX_BYTES = 100 * 1024 * 1024;
export const IMPORT_PART_MAX_ROWS = 500;
export const IMPORT_PART_MAX_BYTES = 512 * 1024;
const MESSAGE_CHANNELS = ['email', 'push', 'mobile_push', 'web_push', 'in_app'];

export const IMPORT_FIELDS: Record<ImportKind, { required: string[]; optional: string[] }> = {
  event_history: { required: ['sourceRecordId', 'externalUserId', 'eventName', 'occurredAt'], optional: ['properties'] },
  message_history: { required: ['sourceMessageId', 'externalUserId', 'channel', 'status'], optional: ['sentAt', 'payload'] },
  segment_history: { required: ['sourceRecordId', 'externalUserId', 'sourceSegment', 'transition', 'occurredAt'], optional: ['namespace', 'reason'] },
};

export type ImportRowIssue = { row: number; message: string };
export type ParsedImport = { rows: number; parts: unknown[][]; issues: ImportRowIssue[]; invalidRows: number; repeatedIds: number };

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
const validDate = (value: unknown) => (typeof value === 'string' || typeof value === 'number') && !Number.isNaN(new Date(value).getTime());
const scalarRecord = (value: unknown) => {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).every((item) => item === null || ['number', 'boolean'].includes(typeof item) || (typeof item === 'string' && item.length <= 2000));
};

/** Mirrors the import worker, so a bad file is caught before anything is uploaded. */
export function rowProblem(kind: ImportKind, raw: unknown): string | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'must be an object';
  const row = raw as Record<string, unknown>;
  if (!text(row.externalUserId, 255)) return 'needs externalUserId';
  if (kind === 'event_history') {
    if (!text(row.sourceRecordId, 200)) return 'needs sourceRecordId';
    if (!text(row.eventName, 200)) return 'needs eventName';
    if (!validDate(row.occurredAt)) return 'needs a valid occurredAt date';
    return scalarRecord(row.properties) ? null : 'properties must be an object of simple values';
  }
  if (kind === 'segment_history') {
    if (!text(row.sourceRecordId, 200)) return 'needs sourceRecordId';
    if (!text(row.sourceSegment, 200)) return 'needs sourceSegment';
    if (row.transition !== 'enter' && row.transition !== 'exit') return 'transition must be enter or exit';
    if (!validDate(row.occurredAt)) return 'needs a valid occurredAt date';
    if (new Date(row.occurredAt as string).getTime() > Date.now() + 60_000) return 'occurredAt cannot be in the future';
    return row.namespace === undefined || text(row.namespace, 40) ? null : 'namespace is not valid';
  }
  if (!text(row.sourceMessageId, 200)) return 'needs sourceMessageId';
  if (!MESSAGE_CHANNELS.includes(row.channel as string)) return `channel must be ${MESSAGE_CHANNELS.join(', ')}`;
  if (!text(row.status, 60)) return 'needs status';
  if (row.sentAt !== undefined && row.sentAt !== null && !validDate(row.sentAt)) return 'sentAt is not a valid date';
  return scalarRecord(row.payload) ? null : 'payload must be an object of simple values';
}

export function splitImportRows(rows: unknown[]): unknown[][] {
  const encoder = new TextEncoder();
  const parts: unknown[][] = [];
  let current: unknown[] = [];
  let bytes = 2; // The enclosing [ ].
  for (const row of rows) {
    const size = encoder.encode(JSON.stringify(row)).length + 1;
    if (size + 2 > IMPORT_PART_MAX_BYTES) throw new Error('One row is larger than the 512 KB limit.');
    if (current.length === IMPORT_PART_MAX_ROWS || bytes + size > IMPORT_PART_MAX_BYTES) {
      parts.push(current);
      current = [];
      bytes = 2;
    }
    current.push(row);
    bytes += size;
  }
  if (current.length) parts.push(current);
  return parts;
}

export function parseImport(kind: ImportKind, contents: string): ParsedImport {
  let decoded: unknown;
  try {
    decoded = JSON.parse(contents);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (!Array.isArray(decoded)) throw new Error('The file must contain a JSON array of records.');
  if (decoded.length === 0) throw new Error('The file has no records.');

  const issues: ImportRowIssue[] = [];
  let invalidRows = 0;
  decoded.forEach((row, index) => {
    const message = rowProblem(kind, row);
    if (!message) return;
    invalidRows += 1;
    if (issues.length < 5) issues.push({ row: index + 1, message });
  });
  const ids = decoded.map((row) => (row as { sourceRecordId?: string; sourceMessageId?: string } | null)?.[kind === 'message_history' ? 'sourceMessageId' : 'sourceRecordId']).filter(Boolean);
  return { rows: decoded.length, parts: invalidRows ? [] : splitImportRows(decoded), issues, invalidRows, repeatedIds: ids.length - new Set(ids).size };
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
