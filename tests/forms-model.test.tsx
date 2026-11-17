import { describe, expect, it, vi } from 'vitest';
import { renderFormHtml } from '@/components/dashboard/forms/exportHtml';
import { countdownParts } from '@/components/dashboard/forms/FormRenderer';
import {
  applyTemplate, behaviourErrors, installSnippets, contrastRatio, defaultDraft, duplicateBlock, editorReducer, formDraftSchema, insertBlock, makeBlock, makeField, moveBlock,
  publishProblems, removeBlock, withFieldsBlock, removeField, successErrors, uploadsIn, type FormDraft,
} from '@/components/dashboard/forms/model';
import { createForm, createGroup, deleteForm, duplicateForm, getForm, getFormAnalytics, listForms, listGroups, saveForm, setFormStatus } from '@/lib/forms';

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
    expect(draft().template).toBe(''); // no template until one is chosen
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
    // "Every visit" needs no wait; click and inline forms have no triggers to check.
    expect(behaviourErrors({ ...b, repeat: 'always', frequency: Number.NaN })).toEqual({});
    expect(behaviourErrors({ ...b, mode: 'click', delayOn: false })).toEqual({});
    expect(behaviourErrors({ ...b, mode: 'inline', delayOn: false, pages: 'show', urls: '' })).toEqual({});
  });

  it('checks success links and blocks publishing until problems are fixed', () => {
    const d = draft();
    expect(successErrors({ ...d.success, mode: 'redirect', redirectUrl: 'example' })).toHaveProperty('redirectUrl');
    expect(successErrors({ ...d.success, mode: 'redirect', redirectUrl: 'https://example.com/thanks' })).toEqual({});
    expect(publishProblems(d)).toEqual([]);
    expect(publishProblems({ ...d, groups: [] })).toContain('Choose at least one subscriber group.');
    expect(publishProblems(insertBlock(d, makeBlock('countdown'), null))[0]).toMatch(/Countdown/);
    expect(publishProblems({ ...d, options: { ...d.options, privacy: { ...d.options.privacy, on: true, url: 'https://' } } })).toContain('Add a complete privacy policy web address.');
  });

  it('loads forms saved before the image adjustment settings, filling in defaults', () => {
    const d = draft();
    const { sidebarX, sidebarY, sidebarZoom, sidebarWidth, backgroundX, backgroundY, backgroundZoom, backgroundFit, ...olderDesign } = d.design;
    const parsed = formDraftSchema.safeParse({ ...d, design: olderDesign });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.design).toMatchObject({ sidebarX: 50, sidebarY: 50, sidebarZoom: 100, sidebarWidth: 38, backgroundFit: 'cover', backgroundX: 50, backgroundY: 50, backgroundZoom: 100 });
    void [sidebarX, sidebarY, sidebarZoom, sidebarWidth, backgroundX, backgroundY, backgroundZoom, backgroundFit];
  });

  it('puts the signup fields back on a form that arrives without them', () => {
    const d = draft();
    const stripped = { ...d, blocks: d.blocks.filter((block) => block.type !== 'fields') };
    const fixed = withFieldsBlock(stripped, 'Join now');
    expect(types(fixed).filter((type) => type === 'fields')).toHaveLength(1);
    expect(fixed.blocks.at(-1)).toMatchObject({ type: 'fields', label: 'Join now' });
    expect(withFieldsBlock(d)).toBe(d); // already there: unchanged, never doubled
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

  it('gives install code that matches how the form is used', () => {
    const d = { ...draft(), publicKey: 'pf_abcdefghijkl', scriptUrl: 'https://api.example.com/forms/v1/embed.js' };
    expect(installSnippets(draft())).toBeNull();
    const auto = installSnippets(d)!;
    expect(auto).toHaveLength(1);
    expect(auto[0].code).toBe('<script src="https://api.example.com/forms/v1/embed.js" data-pixlpush-form="pf_abcdefghijkl" async></script>');
    const click = installSnippets({ ...d, behaviour: { ...d.behaviour, mode: 'click' } })!.map((s) => s.code);
    expect(click[0]).not.toContain('data-pixlpush-form');
    expect(click[1]).toBe('<button type="button" data-pixlpush-open="pf_abcdefghijkl">Subscribe</button>');
    const inline = installSnippets({ ...d, behaviour: { ...d.behaviour, mode: 'inline' } })!.map((s) => s.code);
    expect(inline[0]).toBe('<div data-pixlpush-form="pf_abcdefghijkl"></div>');
    expect(inline[1]).toContain('embed.js');
  });
});

describe('forms repository', () => {
  it('uses the project API for listing, creating, and publishing forms', async () => {
    const originalFetch = globalThis.fetch;
    const initial = draft();
    const apiForm = {
      id: initial.id, publicKey: 'pk_123', name: initial.name, type: initial.kind, status: 'draft', templateKey: initial.template,
      content: { editorState: initial }, design: {}, settings: {}, behavior: {}, groupIds: initial.groups,
      metrics: { views: 5, subscribers: 1 }, embed: { snippet: '<script src="https://app.test/forms/v1/embed.js" data-form="pk_123"></script>' },
      createdAt: initial.createdAt, updatedAt: initial.updatedAt,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const response = url.includes('?') ? { data: { items: [apiForm], total: 1, page: 1, limit: 10, counts: { types: { popup: 1 }, statuses: { all: 1, active: 0, draft: 1, paused: 0 } } } } : { data: { ...apiForm, status: init?.method === 'POST' ? 'active' : apiForm.status } };
      return { ok: true, status: 200, json: async () => response } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const page = await listForms('project_1', { type: 'popup', page: 1, limit: 10 });
      expect(page.total).toBe(1);
      expect(page.items[0]).toMatchObject({ id: initial.id, publicKey: 'pk_123' });
      const created = await createForm(initial, 'project_1');
      expect(created.id).toBe(initial.id);
      expect(String(fetchMock.mock.calls[0][0])).toContain('/project_1/forms?');
      const createdBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
      expect(createdBody).toHaveProperty('content.editorState');
      expect(createdBody.settings.privacyPolicy.url).toBeNull();
      expect(createdBody.content.success.button.url).toBeNull();
      await saveForm({ ...initial, name: 'Spring update', fields: [...initial.fields, makeField('select', { id: 'city', label: 'City', options: ['Lahore', 'Karachi'] })] }, 'project_1');
      expect(fetchMock.mock.calls[2][1]?.method).toBe('PATCH');
      const savedBody = JSON.parse(String(fetchMock.mock.calls[2][1]?.body));
      expect(savedBody.name).toBe('Spring update');
      expect(savedBody.content.fields.custom[0]).toMatchObject({ key: 'field_city', type: 'select', options: ['Lahore', 'Karachi'] });
      const active = await setFormStatus(initial.id, 'active', 'project_1');
      expect(active.status).toBe('active');
      expect(String(fetchMock.mock.calls[3][0])).toContain('/project_1/forms/');
      expect(String(fetchMock.mock.calls[3][0])).toContain('/activate');
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('sends a burst of concurrent saves through the account API without browser storage', async () => {
    const originalFetch = globalThis.fetch;
    const initial = draft();
    const apiForm = {
      id: initial.id, publicKey: 'pk_123', name: initial.name, type: initial.kind, status: 'draft', templateKey: initial.template,
      content: { editorState: initial }, design: {}, settings: {}, behavior: {}, groupIds: initial.groups,
      metrics: { views: 0, subscribers: 0 }, embed: { snippet: null }, createdAt: initial.createdAt, updatedAt: initial.updatedAt,
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ data: apiForm }) } as Response));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const results = await Promise.all(Array.from({ length: 100 }, (_, index) => saveForm({ ...initial, name: `Concurrent form ${index}` }, 'project_1')));
      expect(results).toHaveLength(100);
      expect(fetchMock).toHaveBeenCalledTimes(100);
      expect(fetchMock.mock.calls.every(([, init]) => init?.method === 'PATCH')).toBe(true);
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('sends the server only values it accepts: blank text skipped, long text cut, empty labels filled', async () => {
    const originalFetch = globalThis.fetch;
    const initial = draft();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ data: { id: initial.id, name: initial.name, type: 'popup', status: 'draft', content: { editorState: initial }, design: {}, settings: {}, behavior: {}, groupIds: [], embed: { snippet: null }, createdAt: initial.createdAt, updatedAt: initial.updatedAt } }) } as Response));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const blocks = [
        makeBlock('heading', { text: '   ' }),
        makeBlock('text', { text: 'x'.repeat(2500) }),
        makeBlock('button', { label: '', action: 'url', href: 'https://example.com' }),
        makeBlock('imageText', { src: 'https://cdn.example.com/a.png', text: '' }),
        makeBlock('fields', { label: '' }),
      ];
      await saveForm({ ...initial, blocks, success: { ...initial.success, heading: '' } }, 'project_1');
      const { content } = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
      expect(content.blocks.map((block: { type: string }) => block.type)).toEqual(['text', 'button', 'image']);
      expect(content.blocks[0].text).toHaveLength(2000);
      expect(content.blocks[1].label).toBe('Learn more');
      expect(content.submitLabel).toBe('Subscribe');
      expect(content.success.blocks.map((block: { id: string }) => block.id)).toEqual(['success-text']);
      expect(content.editorState.blocks).toHaveLength(5);
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });

  it('finds every uploaded image a draft uses, and nothing else', () => {
    const upload = (name: string) => `https://storage.example.com/uploads/projects/p_1/forms/images/${name}.webp`;
    const d = { ...draft(), design: { ...draft().design, sidebarImage: upload('side'), backgroundImage: 'https://other.example.com/bg.png' }, blocks: [makeBlock('image', { src: upload('block') })] };
    expect([...uploadsIn(d)].sort()).toEqual([upload('block'), upload('side')]);
  });

  it('covers form details, duplication, deletion, analytics, and project groups', async () => {
    const originalFetch = globalThis.fetch;
    const initial = draft();
    const apiForm = {
      id: initial.id, publicKey: 'pk_123', name: initial.name, type: initial.kind, status: 'draft', templateKey: initial.template,
      content: { editorState: initial }, design: {}, settings: {}, behavior: {}, groupIds: initial.groups,
      metrics: { views: 0, subscribers: 0 }, embed: { snippet: null }, createdAt: initial.createdAt, updatedAt: initial.updatedAt,
    };
    const analytics = {
      formId: initial.id, status: 'draft', live: false, range: { from: '2026-10-18', to: '2026-11-17', timezone: 'UTC', days: 30 },
      totals: { views: 3, uniqueVisitors: 2, subscribers: 1, conversionRate: 33.33 }, allTime: { views: 3, subscribers: 1, conversionRate: 33.33 }, series: [],
    };
    const group = { id: 'group_1', name: 'Newsletter', description: 'Updates', memberCount: 4, rules: null };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      let data: unknown = apiForm;
      if (url.includes('/analytics')) data = analytics;
      else if (url.includes('/audience-groups') && init?.method === 'POST') data = group;
      else if (url.includes('/audience-groups')) data = [group, { ...group, id: 'group_2', name: 'Smart group', rules: {} }];
      return { ok: true, status: init?.method === 'DELETE' ? 204 : 200, json: async () => init?.method === 'DELETE' ? undefined : { data } } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect((await getForm(initial.id, 'project_1')).publicKey).toBe('pk_123');
      expect((await duplicateForm(initial.id, 'project_1')).status).toBe('draft');
      await deleteForm(initial.id, 'project_1');
      expect((await getFormAnalytics(initial.id, 'project_1')).allTime.views).toBe(3);
      // Forms share the project's audience groups, rule-based ones included.
      expect((await listGroups('project_1')).map((g) => g.id)).toEqual(['group_1', 'group_2']);
      expect(await createGroup(' VIP ', ' Launch ', 'project_1')).toMatchObject({ name: 'Newsletter' });
      expect(fetchMock.mock.calls.map(([, init]) => init?.method ?? 'GET')).toEqual(['GET', 'POST', 'DELETE', 'GET', 'GET', 'POST']);
      expect(JSON.parse(String(fetchMock.mock.calls[5][1]?.body))).toMatchObject({ name: 'VIP', description: 'Launch', rules: null });
    } finally {
      vi.stubGlobal('fetch', originalFetch);
    }
  });
});
