import { z } from 'zod';

/*
 * The form draft is the single source of truth for the forms module: the wizard, editor, renderer,
 * list and HTML export all read it. The zod schema doubles as the contract for the Forms API.
 */

export const formKinds = ['popup'] as const;
export const formStatuses = ['draft', 'active', 'paused'] as const;
export const blockTypes = ['heading', 'text', 'image', 'imageText', 'button', 'divider', 'countdown', 'social', 'list', 'video', 'code', 'fields'] as const;
export const fieldTypes = ['email', 'text', 'textarea', 'phone', 'number', 'select', 'checkbox', 'date', 'hidden'] as const;
export const socialPlatforms = ['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube'] as const;
export const fonts = ['Inter', 'Manrope', 'Arial', 'Georgia', 'Courier New'] as const;

export type FormKind = (typeof formKinds)[number];
export type FormStatus = (typeof formStatuses)[number];
export type BlockType = (typeof blockTypes)[number];
export type FieldType = (typeof fieldTypes)[number];
export type SocialPlatform = (typeof socialPlatforms)[number];

export const kindLabel: Record<FormKind, string> = { popup: 'Pop-up' };
export const kindPlural: Record<FormKind, string> = { popup: 'pop-ups' };
export const statusLabel: Record<FormStatus, string> = { draft: 'Draft', active: 'Active', paused: 'Paused' };

const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const align = z.enum(['left', 'center', 'right']);

export const blockSchema = z.object({
  id: z.string(),
  type: z.enum(blockTypes),
  text: z.string().optional(),
  align: align.optional(),
  size: z.number().optional(),
  weight: z.number().optional(),
  color: hex.optional(),
  src: z.string().optional(),
  alt: z.string().optional(),
  href: z.string().optional(),
  width: z.number().optional(),
  side: z.enum(['left', 'right']).optional(),
  label: z.string().optional(),
  action: z.enum(['submit', 'url']).optional(),
  bg: hex.optional(),
  textColor: hex.optional(),
  radius: z.number().optional(),
  fullWidth: z.boolean().optional(),
  /** Button: filled or outline. */
  variant: z.enum(['filled', 'outline']).optional(),
  thickness: z.number().optional(),
  spacing: z.number().optional(),
  endsAt: z.string().optional(),
  onExpire: z.enum(['hide', 'text']).optional(),
  expiredText: z.string().optional(),
  links: z.array(z.object({ platform: z.enum(socialPlatforms), url: z.string() })).optional(),
  items: z.array(z.string()).optional(),
  html: z.string().optional(),
});

export const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(fieldTypes),
  label: z.string(),
  placeholder: z.string(),
  required: z.boolean(),
  half: z.boolean(),
  options: z.array(z.string()),
  value: z.string(),
});

export const designSchema = z.object({
  popupType: z.enum(['lightbox', 'slidein', 'bar', 'fullscreen']),
  barPosition: z.enum(['top', 'bottom']),
  slidePosition: z.enum(['left', 'right']),
  layout: z.enum(['plain', 'border', 'topSidebar', 'leftSidebar', 'rightSidebar', 'boxed']),
  display: z.enum(['stacked', 'horizontal']),
  align,
  width: z.number(),
  background: hex,
  transparent: z.boolean(),
  backgroundImage: z.string(),
  /** Background image: how it sits, where it focuses and how far it is zoomed in (100 = no zoom). */
  backgroundFit: z.enum(['cover', 'contain', 'tile']).default('cover'),
  /** Which part of the image stays in view: 0 = left/top, 50 = centre, 100 = right/bottom. */
  backgroundX: z.number().default(50),
  backgroundY: z.number().default(50),
  backgroundZoom: z.number().default(100),
  radius: z.number(),
  shadow: z.boolean(),
  sidebarColor: hex,
  sidebarImage: z.string(),
  sidebarFit: z.enum(['fit', 'fill']),
  /** How a Fill image is aligned when it is cropped (face/subject kept in view). */
  sidebarX: z.number().default(50),
  sidebarY: z.number().default(50),
  /** Side panel width as a percent of the form (side layouts), and image zoom (100 = no zoom). */
  sidebarWidth: z.number().default(38),
  sidebarZoom: z.number().default(100),
  backdropColor: hex,
  backdropOpacity: z.number(),
  font: z.enum(fonts),
  headingColor: hex,
  textColor: hex,
  labelColor: hex,
  inputBg: hex,
  inputBorder: hex,
  inputRadius: z.number(),
  buttonBg: hex,
  buttonText: hex,
  buttonRadius: z.number(),
  /** The signup form's submit button. */
  buttonAlign: z.enum(['left', 'center', 'right', 'full']).default('full'),
  buttonStyle: z.enum(['filled', 'outline']).default('filled'),
  buttonSize: z.number().default(15),
  /** Labels above fields line up left by default, like the inputs. */
  labelAlign: z.enum(['left', 'center', 'right']).default('left'),
  /** Side panel image on phones. Off by default: on a small screen it pushes the form down. */
  sidebarMobile: z.boolean().default(false),
  showClose: z.boolean(),
  closeColor: hex,
});

const toggle = <T extends z.ZodRawShape>(shape: T) => z.object({ on: z.boolean(), ...shape });

export const optionsSchema = z.object({
  labelsAbove: z.boolean(),
  privacy: toggle({ text: z.string(), url: z.string() }),
  consent: toggle({ text: z.string() }),
  permissions: toggle({ text: z.string(), items: z.array(z.string()) }),
  interests: toggle({ label: z.string(), items: z.array(z.string()) }),
  hidden: toggle({ name: z.string(), value: z.string() }),
  recaptcha: z.boolean(),
  doubleOptIn: z.boolean(),
});

export const successSchema = z.object({
  mode: z.enum(['message', 'redirect']),
  /** Show the form's existing side image alongside the success message. */
  showImage: z.boolean().default(true),
  /** Success page style can differ from the signup form. Missing values inherit the form style. */
  width: z.number().optional(),
  showClose: z.boolean().optional(),
  background: hex.optional(),
  headingColor: hex.optional(),
  textColor: hex.optional(),
  buttonColor: hex.optional(),
  buttonText: hex.optional(),
  heading: z.string(),
  text: z.string(),
  buttonLabel: z.string(),
  buttonUrl: z.string(),
  coupon: z.string(),
  redirectUrl: z.string(),
  /** The owner picked message/redirect themselves; until then forms open on Redirect. */
  chosen: z.boolean().default(false),
});

export const usageModes = ['click', 'auto', 'inline'] as const;
export type UsageMode = (typeof usageModes)[number];

export const behaviourSchema = z.object({
  /** Ways the website uses the form, any mix: opens on click, pops up by itself, sits in a spot on the page. */
  modes: z.array(z.enum(usageModes)).min(1).default(['auto']),
  delayOn: z.boolean(),
  delay: z.number(),
  scrollOn: z.boolean(),
  scroll: z.number(),
  exitOn: z.boolean(),
  /** always: on every visit until they sign up; after: wait `frequency` units after it was closed. */
  repeat: z.enum(['always', 'after']).default('after'),
  frequency: z.number(),
  frequencyUnit: z.enum(['days', 'weeks', 'months']),
  schedule: z.enum(['now', 'range']),
  startAt: z.string(),
  endAt: z.string(),
  /** IANA zone the start/end wall-clock times are in (saved times are UTC instants). */
  timezone: z.string().default(localZone()),
  pages: z.enum(['all', 'hide', 'show']),
  urls: z.string(),
  strict: z.boolean(),
  hideDesktop: z.boolean(),
  hideTablet: z.boolean(),
  hideMobile: z.boolean(),
});

export const formDraftSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(formKinds),
  status: z.enum(formStatuses),
  /** Issued by the Forms API; unavailable until the form exists on the server. */
  publicKey: z.string().optional(),
  /** The forms runtime script URL from the API. */
  scriptUrl: z.string().optional(),
  /** Exact, API-generated install instructions; null until first activation. */
  embedSnippet: z.string().nullable().optional(),
  groups: z.array(z.string()),
  template: z.string(),
  design: designSchema,
  blocks: z.array(blockSchema),
  fields: z.array(fieldSchema),
  options: optionsSchema,
  success: successSchema,
  behaviour: behaviourSchema,
  stats: z.object({ views: z.number(), subscribers: z.number() }),
  /** PixlPush staff put it on hold: it can be edited, but not turned on or duplicated until released. */
  heldByPixlPush: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Block = z.infer<typeof blockSchema>;
export type FormField = z.infer<typeof fieldSchema>;
export type FormDesign = z.infer<typeof designSchema>;
export type FormOptions = z.infer<typeof optionsSchema>;
export type FormSuccess = z.infer<typeof successSchema>;
export type FormBehaviour = z.infer<typeof behaviourSchema>;
export type FormDraft = z.infer<typeof formDraftSchema>;

export const makeId = () => Math.random().toString(36).slice(2, 10);

/* ---------- defaults ---------- */

export function defaultDesign(kind: FormKind): FormDesign {
  return {
    popupType: 'lightbox', barPosition: 'top', slidePosition: 'right',
    layout: 'plain', display: 'stacked', align: 'center',
    width: 440,
    background: '#ffffff', transparent: false, backgroundImage: '', backgroundFit: 'cover', backgroundX: 50, backgroundY: 50, backgroundZoom: 100, radius: 12, shadow: true,
    sidebarColor: '#f3eefc', sidebarImage: '', sidebarFit: 'fill', sidebarX: 50, sidebarY: 50, sidebarWidth: 38, sidebarZoom: 100,
    backdropColor: '#1b1025', backdropOpacity: 40,
    font: 'Inter', headingColor: '#1e1429', textColor: '#5b5266', labelColor: '#1e1429',
    inputBg: '#ffffff', inputBorder: '#d9d3e1', inputRadius: 6,
    buttonBg: '#5517b8', buttonText: '#ffffff', buttonRadius: 6, buttonAlign: 'full', buttonStyle: 'filled', buttonSize: 15, labelAlign: 'left', sidebarMobile: false,
    showClose: true, closeColor: '#5b5266',
  };
}

export const blockDefaults: Record<BlockType, Omit<Block, 'id' | 'type'>> = {
  heading: { text: 'Your headline goes here', align: 'left', size: 24, weight: 700 },
  text: { text: 'Add supporting text that explains your offer or newsletter.', align: 'left', size: 15 },
  image: { src: '', alt: '', href: '', width: 100, align: 'center' },
  imageText: { src: '', alt: '', text: 'Tell your story with a visual and a short message.', side: 'left' },
  button: { label: 'Learn more', action: 'url', href: 'https://', fullWidth: true },
  divider: { color: '#eae6ef', thickness: 1, spacing: 8 },
  countdown: { endsAt: '', text: 'Offer ends in', onExpire: 'text', expiredText: 'This offer has ended.', align: 'center' },
  social: { links: [{ platform: 'Facebook', url: 'https://facebook.com/' }, { platform: 'Instagram', url: 'https://instagram.com/' }, { platform: 'LinkedIn', url: 'https://linkedin.com/' }], size: 32, align: 'center' },
  list: { items: ['Weekly product tips', 'Early access to new features', 'No spam, unsubscribe any time'], size: 15 },
  video: { href: '' },
  code: { html: '<div style="padding:12px;border:1px dashed #d9d3e1;border-radius:6px;text-align:center">Your custom HTML</div>' },
  fields: { label: 'Subscribe' },
};

export const blockLabel: Record<BlockType, string> = {
  heading: 'Heading', text: 'Text', image: 'Image', imageText: 'Image & text', button: 'Button', divider: 'Divider',
  countdown: 'Countdown', social: 'Social links', list: 'List', video: 'Video', code: 'Custom code', fields: 'Signup fields',
};

export const makeBlock = (type: BlockType, props: Partial<Block> = {}): Block => ({ id: makeId(), type, ...structuredClone(blockDefaults[type]), ...props });

export const fieldTypeLabel: Record<FieldType, string> = {
  email: 'Email', text: 'Text', textarea: 'Long text', phone: 'Phone', number: 'Number', select: 'Dropdown', checkbox: 'Checkbox', date: 'Date', hidden: 'Hidden',
};

export const makeField = (type: FieldType, props: Partial<FormField> = {}): FormField => ({
  id: makeId(), type, label: type === 'email' ? 'Email' : fieldTypeLabel[type], placeholder: type === 'email' ? 'Email address' : '',
  required: type === 'email', half: false, options: type === 'select' ? ['Option 1', 'Option 2'] : [], value: '', ...props,
});

export function defaultDraft(input: { name: string; kind: FormKind; groups?: string[] }): FormDraft {
  const now = new Date().toISOString();
  return {
    // No template until the person picks one ("" = not chosen yet).
    id: makeId(), name: input.name.trim(), kind: input.kind, status: 'draft', groups: input.groups ?? [], template: '',
    design: defaultDesign(input.kind),
    blocks: [
      makeBlock('heading', { text: 'Join our newsletter' }),
      makeBlock('text', { text: 'Get product updates, helpful resources and fresh ideas in your inbox.' }),
      makeBlock('fields'),
    ],
    fields: [makeField('email')],
    options: {
      labelsAbove: false,
      privacy: { on: false, text: 'We respect your privacy. Read our', url: 'https://' },
      consent: { on: false, text: 'I agree to receive emails and accept the privacy policy.' },
      permissions: { on: false, text: 'Choose how you would like to hear from us:', items: ['Email', 'Product news'] },
      interests: { on: false, label: 'I am interested in', items: ['Product updates', 'Offers'] },
      hidden: { on: false, name: 'source', value: '' },
      recaptcha: false,
      doubleOptIn: false,
    },
    success: { mode: 'redirect', showImage: true, heading: 'Thank you!', text: 'You have successfully joined our subscriber list.', buttonLabel: '', buttonUrl: 'https://', coupon: '', redirectUrl: 'https://', chosen: false },
    behaviour: {
      modes: ['auto'], delayOn: true, delay: 5, scrollOn: false, scroll: 50, exitOn: false,
      repeat: 'after', frequency: 1, frequencyUnit: 'months', schedule: 'now', startAt: '', endAt: '', timezone: localZone(),
      pages: 'all', urls: '', strict: false, hideDesktop: false, hideTablet: false, hideMobile: false,
    },
    stats: { views: 0, subscribers: 0 }, heldByPixlPush: false,
    createdAt: now, updatedAt: now,
  };
}

/* ---------- templates ---------- */

export type Template = { id: string; name: string; category: string; kinds: FormKind[]; apply: (draft: FormDraft) => FormDraft };

const inDays = (days: number) => {
  const date = new Date(Date.now() + days * 864e5);
  date.setSeconds(0, 0);
  return toLocalInput(date);
};

/** `YYYY-MM-DDTHH:mm` in local time, the value a datetime-local input uses. */
export const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

/* ---------- schedule time zones ---------- */

export function localZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

export const allZones = (): string[] => {
  const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  return list.includes('UTC') ? list : ['UTC', ...list];
};

/** Milliseconds `zone` is ahead of UTC at instant `ms`. */
function zoneOffset(ms: number, zone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

/** `YYYY-MM-DDTHH:mm` as a wall clock in `zone` → UTC ISO string. Handles DST by re-checking the offset once. */
export function wallToUtc(wall: string, zone: string) {
  const guess = Date.parse(`${wall}:00Z`);
  if (Number.isNaN(guess)) return null;
  const first = guess - zoneOffset(guess, zone);
  return new Date(guess - zoneOffset(first, zone)).toISOString();
}

/** UTC instant → `YYYY-MM-DDTHH:mm` wall clock in `zone`. */
export function utcToWall(iso: string, zone: string) {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? '' : new Date(ms + zoneOffset(ms, zone)).toISOString().slice(0, 16);
}

/** "+04:00" style offset of `zone` right now. */
export function zoneLabel(zone: string, at = Date.now()) {
  const minutes = Math.round(zoneOffset(at, zone) / 6e4);
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export const templates: Template[] = [
  { id: 'blank', name: 'Start from scratch', category: 'Blank', kinds: [...formKinds], apply: (d) => ({ ...d, blocks: [makeBlock('heading', { text: 'Untitled form' }), makeBlock('fields')] }) },
  { id: 'newsletter', name: 'Clean newsletter', category: 'Lead generation', kinds: [...formKinds], apply: (d) => d },
  {
    id: 'slidein', name: 'Corner newsletter', category: 'Lead generation', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      design: { ...d.design, popupType: 'slidein', width: 360 },
      blocks: [makeBlock('heading', { text: 'Get the weekly digest', size: 20 }), makeBlock('text', { text: 'One short email every Friday. Unsubscribe any time.' }), makeBlock('fields', { label: 'Subscribe' })],
    }),
  },
  {
    id: 'bar', name: 'Announcement bar', category: 'Offers', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      design: { ...d.design, popupType: 'bar', barPosition: 'top', display: 'horizontal', background: '#1b1025', headingColor: '#ffffff', textColor: '#e9e3f2', closeColor: '#ffffff' },
      blocks: [makeBlock('heading', { text: 'Free shipping on your first order', size: 17 }), makeBlock('fields', { label: 'Get the code' })],
    }),
  },
  {
    id: 'waitlist', name: 'Product waitlist', category: 'Lead generation', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      design: { ...d.design, layout: 'leftSidebar', sidebarColor: '#1b1025', width: Math.max(d.design.width, 600) },
      blocks: [makeBlock('heading', { text: 'Be first in line' }), makeBlock('text', { text: 'Join the waitlist and we will let you know the moment we launch.' }), makeBlock('fields', { label: 'Join the waitlist' })],
      fields: [makeField('text', { label: 'First name', placeholder: 'First name' }), makeField('email')],
    }),
  },
  {
    id: 'discount', name: 'First order discount', category: 'Offers', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      design: { ...d.design, layout: 'topSidebar', sidebarColor: '#f97316' },
      blocks: [makeBlock('heading', { text: 'Get 15% off your first order', align: 'center' }), makeBlock('text', { text: 'Sign up and we will send your code straight away.', align: 'center' }), makeBlock('fields', { label: 'Get my code' })],
      success: { ...d.success, heading: 'Here is your code', text: 'Use it at checkout within 7 days.', coupon: 'WELCOME15' },
    }),
  },
  {
    id: 'countdown', name: 'Event countdown', category: 'Event sign-up', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      blocks: [makeBlock('heading', { text: 'Live workshop: ship faster', align: 'center' }), makeBlock('countdown', { endsAt: inDays(7), text: 'Starts in' }), makeBlock('fields', { label: 'Save my seat' })],
      fields: [makeField('text', { label: 'Name', placeholder: 'Your name' }), makeField('email')],
    }),
  },
  {
    id: 'guide', name: 'Free guide download', category: 'Resource sharing', kinds: ['popup'],
    apply: (d) => ({
      ...d,
      blocks: [makeBlock('heading', { text: 'Download the free guide' }), makeBlock('list', { items: ['20 proven onboarding emails', 'Subject lines that get opened', 'A 30-day sending plan'] }), makeBlock('fields', { label: 'Send me the guide' })],
      success: { ...d.success, heading: 'Check your inbox', text: 'The guide is on its way.', buttonLabel: 'Download now', buttonUrl: 'https://' },
    }),
  },
];

export const templatesFor = (kind: FormKind) => templates.filter((template) => template.kinds.includes(kind));

export function applyTemplate(draft: FormDraft, templateId: string): FormDraft {
  const template = templates.find((item) => item.id === templateId) ?? templates[0];
  const base = defaultDraft({ name: draft.name, kind: draft.kind, groups: draft.groups });
  return { ...template.apply({ ...base, id: draft.id, status: draft.status, behaviour: draft.behaviour, createdAt: draft.createdAt, stats: draft.stats }), template: template.id };
}

/* ---------- pure edits ---------- */

const indexOf = (blocks: Block[], id?: string | null) => blocks.findIndex((block) => block.id === id);

export function insertBlock(draft: FormDraft, block: Block, afterId?: string | null): FormDraft {
  // After the selected block; with nothing selected, just above the signup fields.
  const after = indexOf(draft.blocks, afterId);
  const fieldsAt = draft.blocks.findIndex((item) => item.type === 'fields');
  const at = after !== -1 ? after + 1 : fieldsAt !== -1 ? fieldsAt : draft.blocks.length;
  const blocks = [...draft.blocks];
  blocks.splice(at, 0, block);
  return { ...draft, blocks };
}

export function moveBlock(draft: FormDraft, id: string, to: number): FormDraft {
  const from = indexOf(draft.blocks, id);
  if (from === -1) return draft;
  const blocks = [...draft.blocks];
  const [block] = blocks.splice(from, 1);
  blocks.splice(Math.max(0, Math.min(to, blocks.length)), 0, block);
  return { ...draft, blocks };
}

export function duplicateBlock(draft: FormDraft, id: string): { draft: FormDraft; id?: string } {
  const block = draft.blocks.find((item) => item.id === id);
  if (!block || block.type === 'fields') return { draft };
  const copy = { ...structuredClone(block), id: makeId() };
  return { draft: insertBlock(draft, copy, id), id: copy.id };
}

/**
 * Every form has exactly one signup fields block. The server keeps the fields separately from the
 * blocks, so a form rebuilt from server data can arrive without it: put it back at the end.
 */
export function withFieldsBlock(draft: FormDraft, label?: string): FormDraft {
  if (draft.blocks.some((block) => block.type === 'fields')) return draft;
  return { ...draft, blocks: [...draft.blocks, makeBlock('fields', label ? { label } : {})] };
}

/** The signup fields block is required: it can move but never be removed. */
export const removeBlock = (draft: FormDraft, id: string): FormDraft =>
  ({ ...draft, blocks: draft.blocks.filter((block) => block.id !== id || block.type === 'fields') });

export const updateBlock = (draft: FormDraft, id: string, patch: Partial<Block>): FormDraft =>
  ({ ...draft, blocks: draft.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });

export const updateField = (draft: FormDraft, id: string, patch: Partial<FormField>): FormDraft =>
  ({ ...draft, fields: draft.fields.map((field) => field.id === id ? { ...field, ...patch } : field) });

/** Email is required on every form: it can move but never be removed or made optional. */
export const removeField = (draft: FormDraft, id: string): FormDraft =>
  ({ ...draft, fields: draft.fields.filter((field) => field.id !== id || field.type === 'email') });

export function moveField(draft: FormDraft, id: string, by: -1 | 1): FormDraft {
  const from = draft.fields.findIndex((field) => field.id === id);
  const to = from + by;
  if (from === -1 || to < 0 || to >= draft.fields.length) return draft;
  const fields = [...draft.fields];
  [fields[from], fields[to]] = [fields[to], fields[from]];
  return { ...draft, fields };
}

/* ---------- editor history ---------- */

export type EditorState = { draft: FormDraft; past: FormDraft[]; future: FormDraft[]; lastKey?: string };
export type EditorAction =
  | { type: 'update'; fn: (draft: FormDraft) => FormDraft; key?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; draft: FormDraft };

const HISTORY = 100;

/** Edits that share a `key` (typing in one field) collapse into a single undo step. */
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'update': {
      const draft = action.fn(state.draft);
      if (draft === state.draft) return state;
      const merge = action.key !== undefined && action.key === state.lastKey;
      return { draft, past: merge ? state.past : [...state.past, state.draft].slice(-HISTORY), future: [], lastKey: action.key };
    }
    case 'undo': {
      const previous = state.past.at(-1);
      return previous ? { draft: previous, past: state.past.slice(0, -1), future: [state.draft, ...state.future] } : state;
    }
    case 'redo': {
      const [next, ...future] = state.future;
      return next ? { draft: next, past: [...state.past, state.draft], future } : state;
    }
    case 'reset':
      return { draft: action.draft, past: [], future: [] };
  }
}

/* ---------- validation ---------- */

export const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
};

export const urlLines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);

/** Only an automatic pop-up has triggers, pages, devices and repeats; click and inline forms just show. */
export function behaviourErrors(b: FormBehaviour): Partial<Record<keyof FormBehaviour | 'trigger', string>> {
  const errors: Partial<Record<keyof FormBehaviour | 'trigger', string>> = {};
  if (!b.modes.includes('auto')) return errors;
  if (!b.delayOn && !b.scrollOn && !b.exitOn) errors.trigger = 'Choose at least one way to show the form.';
  if (b.delayOn && !(Number.isInteger(b.delay) && b.delay >= 0 && b.delay <= 600)) errors.delay = 'Enter 0 to 600 seconds.';
  if (b.repeat === 'after' && !(Number.isInteger(b.frequency) && b.frequency >= 1 && b.frequency <= 365)) errors.frequency = 'Enter a whole number from 1 to 365.';
  if (b.schedule === 'range') {
    if (!b.startAt) errors.startAt = 'Choose a start date.';
    if (!b.endAt) errors.endAt = 'Choose an end date.';
    else if (b.startAt && b.endAt <= b.startAt) errors.endAt = 'End must be after the start.';
    else if ((wallToUtc(b.endAt, b.timezone) ?? '') <= new Date().toISOString()) errors.endAt = 'This time has already passed in the chosen time zone.';
  }
  if (b.pages !== 'all' && urlLines(b.urls).length === 0) errors.urls = 'Add at least one page address.';
  if (b.hideDesktop && b.hideTablet && b.hideMobile) errors.hideMobile = 'The form must show on at least one device.';
  return errors;
}

export const redirectTyped = (url: string) => url.trim() !== '' && url.trim() !== 'https://';

export function successErrors(s: FormSuccess): Partial<Record<keyof FormSuccess, string>> {
  const errors: Partial<Record<keyof FormSuccess, string>> = {};
  // An empty link is fine: the live form shows the success message until one is added.
  if (s.mode === 'redirect' && redirectTyped(s.redirectUrl) && !isHttpUrl(s.redirectUrl)) errors.redirectUrl = 'Enter a full address, for example https://example.com/thanks.';
  if (s.mode === 'message' && s.buttonLabel.trim() && !isHttpUrl(s.buttonUrl)) errors.buttonUrl = 'Enter a full https:// address for the button.';
  return errors;
}

export function blockErrors(block: Block): string | undefined {
  if (block.type === 'button' && block.action === 'url' && !isHttpUrl(block.href ?? '')) return 'Add a full https:// link for this button.';
  if (block.type === 'countdown' && !block.endsAt) return 'Choose when the countdown ends.';
  if ((block.type === 'image' || block.type === 'imageText') && block.src && !block.alt?.trim()) return 'Describe the image in the alt text.';
  return undefined;
}

/** Problems that stop a form from being activated, in the order a person would fix them. */
export function publishProblems(draft: FormDraft): string[] {
  const problems: string[] = [];
  if (!draft.name.trim()) problems.push('Give the form a name.');
  if (draft.groups.length === 0) problems.push('Choose at least one audience group.');
  if (draft.options.privacy.on && !isHttpUrl(draft.options.privacy.url)) problems.push('Add a complete privacy policy web address.');
  for (const block of draft.blocks) {
    const error = blockErrors(block);
    if (error) problems.push(`${blockLabel[block.type]}: ${error}`);
  }
  problems.push(...Object.values(successErrors(draft.success)));
  problems.push(...Object.values(behaviourErrors(draft.behaviour)));
  return problems;
}

/** Wizard steps that open the full-screen editor: every step but the dashboard pages (unknown steps open the editor). */
export const isEditorStep = (step: string | null | undefined) => !['details', 'audience', 'design', 'setup', 'behaviour'].includes(step ?? '');

/* ---------- install code ---------- */

export type Snippet = { title: string; help: string; code: string };

/**
 * The install code for how the website uses the form (see behaviour.mode). The runtime reads the key from
 * the script tag (auto), from any data-pixlpush-open element (click), or from the box it renders into (inline).
 * Null until the API has issued the key and script address.
 */
export function installSnippets(draft: FormDraft): Snippet[] | null {
  if (!draft.publicKey || !draft.scriptUrl) return null;
  const key = draft.publicKey;
  const modes = draft.behaviour.modes;
  const script = `<script src="${draft.scriptUrl}"${modes.includes('auto') ? ` data-pixlpush-form="${key}"` : ''} async></script>`;
  return [
    { title: 'Add the script', help: 'Paste it once, just before the closing </body> tag on every page where the form is used. Most website builders call this "custom code" or "footer code".', code: script },
    ...(modes.includes('click') ? [{ title: 'Add the button', help: 'Paste it where the button should appear. Or add data-pixlpush-open="' + key + '" to a button or link you already have.', code: `<button type="button" data-pixlpush-open="${key}">Subscribe</button>` }] : []),
    ...(modes.includes('inline') ? [{ title: 'Add the form box', help: 'Paste it where the form should sit on the page, for example in your footer or sidebar.', code: `<div data-pixlpush-form="${key}"></div>` }] : []),
  ];
}

/* ---------- colour ---------- */

const luminance = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio of two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Image URLs this project uploaded, wherever they sit in a draft (blocks, side panel, background). */
const UPLOAD_URL = /[^"\s]*\/projects\/[\w-]+\/forms\/images\/[\w-]+\.(?:png|jpe?g|gif|webp)/g;
export const uploadsIn = (draft: FormDraft) => new Set(JSON.stringify(draft).match(UPLOAD_URL) ?? []);
