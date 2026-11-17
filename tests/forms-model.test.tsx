import { beforeEach, describe, expect, it } from 'vitest';
import { renderFormHtml, installSnippet } from '@/components/dashboard/forms/exportHtml';
import { countdownParts } from '@/components/dashboard/forms/FormRenderer';
import {
  applyTemplate, behaviourErrors, contrastRatio, defaultDraft, duplicateBlock, editorReducer, formDraftSchema, insertBlock, makeBlock, moveBlock,
  publishProblems, removeBlock, removeField, successErrors, type FormDraft,
} from '@/components/dashboard/forms/model';
import { createGroup, deleteForm, duplicateForm, getForm, listForms, listGroups, saveForm } from '@/lib/forms';

const draft = (): FormDraft => defaultDraft({ name: '  Spring launch ', kind: 'popup', groups: ['all'] });
const types = (d: FormDraft) => d.blocks.map((block) => block.type);

describe('form model', () => {
  it('creates a valid draft with a trimmed name and a required email field', () => {
    const d = draft();
    expect(formDraftSchema.safeParse(d).success).toBe(true);
    expect(d.name).toBe('Spring launch');
    expect(d.fields).toEqual([expect.objectContaining({ type: 'email', required: true })]);
    expect(types(d)).toEqual(['heading', 'text', 'fields']);
  });

  it('inserts after the selection, or above the fields when nothing is selected', () => {
    const d = draft();
    expect(types(insertBlock(d, makeBlock('image'), null))).toEqual(['heading', 'text', 'image', 'fields']);
    expect(types(insertBlock(d, makeBlock('image'), d.blocks[0].id))).toEqual(['heading', 'image', 'text', 'fields']);
  });

  it('moves, duplicates and removes blocks but never removes the fields block or email field', () => {
    const d = draft();
    const [heading, , fields] = d.blocks;
    expect(types(moveBlock(d, heading.id, 2))).toEqual(['text', 'fields', 'heading']);
    const copy = duplicateBlock(d, heading.id);
    expect(types(copy.draft)).toEqual(['heading', 'heading', 'text', 'fields']);
    expect(copy.id).not.toBe(heading.id);
    expect(removeBlock(d, fields.id).blocks).toHaveLength(3);
    expect(removeField(d, d.fields[0].id).fields).toHaveLength(1);
  });

  it('undoes and redoes, merging keystrokes that share a key', () => {
    let state = editorReducer({ draft: draft(), past: [], future: [] }, { type: 'update', fn: (d) => ({ ...d, name: 'A' }), key: 'name' });
    state = editorReducer(state, { type: 'update', fn: (d) => ({ ...d, name: 'AB' }), key: 'name' });
    state = editorReducer(state, { type: 'update', fn: (d) => ({ ...d, status: 'paused' }) });
    expect(state.past).toHaveLength(2);
    state = editorReducer(state, { type: 'undo' });
    expect(state.draft.status).toBe('draft');
    state = editorReducer(state, { type: 'undo' });
    expect(state.draft.name).toBe('Spring launch');
    state = editorReducer(state, { type: 'redo' });
    expect(state.draft.name).toBe('AB');
  });

  it('applies templates per type and keeps groups and identity', () => {
    const d = draft();
    const applied = applyTemplate(d, 'countdown');
    expect(applied.id).toBe(d.id);
    expect(applied.groups).toEqual(['all']);
    expect(types(applied)).toContain('countdown');
    expect(applied.template).toBe('countdown');
  });
});

describe('validation', () => {
  it('checks behaviour inputs', () => {
    const b = draft().behaviour;
    expect(behaviourErrors(b)).toEqual({});
    expect(behaviourErrors({ ...b, delayOn: false })).toHaveProperty('trigger');
    expect(behaviourErrors({ ...b, frequency: Number.NaN })).toHaveProperty('frequency');
    expect(behaviourErrors({ ...b, schedule: 'range', startAt: '2026-12-02T10:00', endAt: '2026-12-01T10:00' })).toHaveProperty('endAt');
    expect(behaviourErrors({ ...b, pages: 'show', urls: '  \n ' })).toHaveProperty('urls');
    expect(behaviourErrors({ ...b, hideDesktop: true, hideTablet: true, hideMobile: true })).toHaveProperty('hideMobile');
  });

  it('checks success links and blocks publishing until problems are fixed', () => {
    const d = draft();
    expect(successErrors({ ...d.success, mode: 'redirect', redirectUrl: 'example' })).toHaveProperty('redirectUrl');
    expect(successErrors({ ...d.success, mode: 'redirect', redirectUrl: 'https://example.com/thanks' })).toEqual({});
    expect(publishProblems(d)).toEqual([]);
    expect(publishProblems({ ...d, groups: [] })).toContain('Choose at least one subscriber group.');
    expect(publishProblems(insertBlock(d, makeBlock('countdown'), null))[0]).toMatch(/Countdown/);
  });

  it('measures contrast', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#1e1429', '#1b1025')).toBeLessThan(4.5);
  });

  it('splits countdown time', () => {
    expect(countdownParts('2026-01-02T00:00:00Z', Date.parse('2026-01-01T00:00:00Z') + 1000)).toMatchObject({ done: false, days: 0, hours: 23, minutes: 59, seconds: 59 });
    expect(countdownParts('2020-01-01T00:00:00Z', Date.now()).done).toBe(true);
  });
});

describe('export', () => {
  it('renders escaped static HTML with the form id', () => {
    const d = { ...draft(), blocks: [makeBlock('heading', { text: '<img src=x onerror=alert(1)>' }), makeBlock('fields', { label: 'Join' })] };
    const html = renderFormHtml(d);
    expect(html).toContain(`data-pixlpush-form="${d.id}"`);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('type="email"');
    expect(html).toContain('>Join</button>');
  });

  it('gives embedded forms a placement div and pop-ups a head script only', () => {
    expect(installSnippet({ ...draft(), kind: 'embedded' })).toMatch(/<div data-pixlpush-form=/);
    expect(installSnippet(draft())).not.toMatch(/<div/);
  });
});

describe('forms repository', () => {
  beforeEach(() => localStorage.clear());

  it('saves, lists, duplicates and deletes', async () => {
    const saved = await saveForm(draft());
    expect(await getForm(saved.id)).toMatchObject({ name: 'Spring launch' });
    const copy = await duplicateForm(saved.id);
    expect(copy).toMatchObject({ name: 'Spring launch (copy)', status: 'draft' });
    expect(await listForms()).toHaveLength(2);
    await deleteForm(saved.id);
    await expect(getForm(saved.id)).rejects.toThrow();
  });

  it('skips corrupted entries instead of failing', async () => {
    localStorage.setItem('pixlpush.forms.v1', JSON.stringify([{ nope: true }, await saveForm(draft()).then(() => JSON.parse(localStorage.getItem('pixlpush.forms.v1')!)[0])]));
    expect(await listForms()).toHaveLength(1);
  });

  it('creates unique groups', async () => {
    await createGroup('VIP');
    await expect(createGroup(' vip ')).rejects.toThrow(/already exists/);
    expect((await listGroups()).map((group) => group.name)).toContain('VIP');
  });
});
