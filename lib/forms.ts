import { authRequest } from '@/lib/auth/client';
import { audienceGroupsApi } from '@/lib/projects/api';
import { defaultDraft, formDraftSchema, localZone, makeId, utcToWall, wallToUtc, withFieldsBlock, type FormDraft, type FormKind, type FormStatus } from '@/components/dashboard/forms/model';

/** A saved IANA zone if the browser knows it, else the visitor's own. Old forms have none: their times were entered locally. */
const zoneOf = (zone: unknown) => {
  if (typeof zone !== 'string' || !zone) return localZone();
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return zone; } catch { return localZone(); }
};

/** The dashboard API response. The list endpoint omits the editor sections. */
type ApiForm = {
  id: string;
  publicKey: string;
  name: string;
  type: FormKind;
  status: FormStatus;
  templateKey?: string | null;
  content?: Record<string, unknown>;
  design: Record<string, unknown>;
  settings?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  groupIds: string[];
  groups?: Array<{ id: string; name: string }>;
  metrics: { views: number; subscribers: number; conversionRate?: number };
  embed: { scriptUrl?: string; snippet: string | null };
  createdAt: string;
  updatedAt: string;
  adminLockedAt?: string | null;
};

type ApiList = { items: ApiForm[]; total: number; page: number; limit: number; counts: { types: Record<FormKind, number>; statuses: Record<'all' | FormStatus, number> } };
type Group = { id: string; name: string; description: string; count: number };
export type FormsPage = Omit<ApiList, 'items'> & { items: FormDraft[] };
export type FormsSort = 'newest' | 'oldest' | 'name';
export type FormsListParams = { type?: FormKind; status?: FormStatus; search?: string; sort?: FormsSort; page?: number; limit?: number };
const base = '/api/projects';
const path = (projectId: string, suffix = '') => `/${encodeURIComponent(projectId)}/forms${suffix}`;
function safeHttpUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
const listPath = (projectId: string, params: Record<string, string | number | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)));
  return `${path(projectId)}?${query}`;
};

/* The backend's stable, versioned public contract is smaller than the editor model.
   Keep an editorState snapshot alongside its runtime-ready fields so autosave and
   reopening remain lossless while the public runtime evolves. */
/** Trimmed and cut to the server's limit, so an over-long or blank entry never fails the whole save. */
const clip = (value: string | undefined, max: number) => (value ?? '').trim().slice(0, max);

function toApiSections(draft: FormDraft) {
  const blocks: Array<Record<string, unknown>> = [];
  for (const block of draft.blocks) {
    if (block.type === 'heading' || block.type === 'text') {
      // An emptied heading or text has nothing to show; the editor snapshot still keeps it.
      const text = clip(block.text, block.type === 'heading' ? 200 : 2000);
      if (text) blocks.push({ id: block.id, type: block.type, text });
    } else if (block.type === 'image' || block.type === 'imageText') {
      const url = safeHttpUrl(block.src);
      if (!url) continue;
      const text = clip(block.text, 2000);
      blocks.push(block.type === 'imageText' && text ? { id: block.id, type: 'image_text', url, alt: clip(block.alt, 200), text } : { id: block.id, type: 'image', url, alt: clip(block.alt, 200) });
    } else if (block.type === 'button' && block.action !== 'submit' && safeHttpUrl(block.href)) blocks.push({ id: block.id, type: 'button', label: clip(block.label, 60) || 'Learn more', url: safeHttpUrl(block.href) });
    else if (block.type === 'divider') blocks.push({ id: block.id, type: 'divider' });
    else if (block.type === 'countdown' && block.endsAt) blocks.push({ id: block.id, type: 'countdown', endsAt: block.endsAt, label: clip(block.text, 100) });
    else if (block.type === 'social') {
      const network = (platform: string) => platform.toLowerCase() === 'twitter' ? 'x' : platform.toLowerCase();
      const links = (block.links ?? []).flatMap((link) => { const url = safeHttpUrl(link.url); return url ? [{ network: network(link.platform), url }] : []; });
      if (links.length) blocks.push({ id: block.id, type: 'social', links: links.slice(0, 8) });
    } else if (block.type === 'list') blocks.push({ id: block.id, type: 'list', items: (block.items ?? []).map((item) => clip(item, 200)).filter(Boolean).slice(0, 20) });
    else if (block.type === 'video' && safeHttpUrl(block.href)) blocks.push({ id: block.id, type: 'video', url: safeHttpUrl(block.href) });
    else if (block.type === 'code') blocks.push({ id: block.id, type: 'code', html: block.html ?? '' });
  }
  const email = draft.fields.find((field) => field.type === 'email');
  const name = draft.fields.find((field) => field.type === 'text' && /name/i.test(field.label));
  const customFields = draft.fields.filter((field) => field.type !== 'email' && field !== name && field.type !== 'hidden').map((field) => ({
    key: `field_${field.id.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)}`,
    type: field.type as 'text' | 'textarea' | 'phone' | 'number' | 'select' | 'checkbox' | 'date',
    label: clip(field.label, 60) || 'Your answer', placeholder: clip(field.placeholder, 100), required: field.required,
    options: field.type === 'select' ? field.options.map((option) => clip(option, 100)).filter(Boolean).slice(0, 30) : [],
  }));
  const submitLabel = clip(draft.blocks.find((block) => block.type === 'fields')?.label || draft.blocks.find((block) => block.type === 'button' && block.action === 'submit')?.label, 60) || 'Subscribe';
  const settings = {
    privacyPolicy: { enabled: draft.options.privacy.on, text: draft.options.privacy.text, url: safeHttpUrl(draft.options.privacy.url) },
    consent: { enabled: draft.options.consent.on, text: draft.options.consent.text },
    hiddenFields: [
      ...draft.fields.filter((field) => field.type === 'hidden').slice(0, 9).map((field) => ({ key: `field_${field.id.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 32)}`, value: field.value })),
      ...(draft.options.hidden.on && draft.options.hidden.name ? [{ key: draft.options.hidden.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^[^a-z]+/, '').slice(0, 40) || 'source', value: draft.options.hidden.value }] : []),
    ],
    interestGroups: { enabled: false, label: draft.options.interests.label, groupIds: [] },
    successRedirectUrl: draft.success.mode === 'redirect' ? safeHttpUrl(draft.success.redirectUrl) : null,
    allowedDomains: [],
  };
  const placement = draft.design.popupType === 'slidein' ? `bottom_${draft.design.slidePosition}` : draft.design.popupType === 'bar' ? `${draft.design.barPosition}_bar` : 'center';
  const design = {
    layout: draft.design.layout === 'leftSidebar' || draft.design.layout === 'rightSidebar' ? 'split' : 'centered',
    editorLayout: draft.design.layout,
    display: draft.design.display,
    fullScreen: draft.kind === 'popup' && draft.design.popupType === 'fullscreen',
    align: draft.design.align,
    placement,
    width: Math.max(240, Math.min(960, Math.round(draft.design.width))),
    backgroundColor: draft.design.background,
    transparent: draft.design.transparent,
    backgroundImage: safeHttpUrl(draft.design.backgroundImage),
    backgroundFit: draft.design.backgroundFit,
    backgroundX: Math.max(0, Math.min(100, Math.round(draft.design.backgroundX))),
    backgroundY: Math.max(0, Math.min(100, Math.round(draft.design.backgroundY))),
    backgroundZoom: Math.max(100, Math.min(300, Math.round(draft.design.backgroundZoom))),
    textColor: draft.design.textColor,
    headingColor: draft.design.headingColor,
    labelColor: draft.design.labelColor,
    accentColor: draft.design.buttonBg,
    buttonTextColor: draft.design.buttonText,
    buttonRadius: Math.max(0, Math.min(24, Math.round(draft.design.buttonRadius))),
    buttonAlign: draft.design.buttonAlign,
    buttonStyle: draft.design.buttonStyle,
    labelAlign: draft.design.labelAlign,
    sidebarMobile: draft.design.sidebarMobile,
    buttonSize: Math.max(11, Math.min(24, Math.round(draft.design.buttonSize))),
    inputBackgroundColor: draft.design.inputBg,
    inputBorderColor: draft.design.inputBorder,
    inputRadius: Math.max(0, Math.min(24, Math.round(draft.design.inputRadius))),
    font: draft.design.font,
    sidebarColor: draft.design.sidebarColor,
    sidebarImage: safeHttpUrl(draft.design.sidebarImage),
    sidebarFit: draft.design.sidebarFit,
    sidebarX: Math.max(0, Math.min(100, Math.round(draft.design.sidebarX))),
    sidebarY: Math.max(0, Math.min(100, Math.round(draft.design.sidebarY))),
    sidebarWidth: Math.max(20, Math.min(60, Math.round(draft.design.sidebarWidth))),
    sidebarZoom: Math.max(100, Math.min(300, Math.round(draft.design.sidebarZoom))),
    backdropColor: draft.design.backdropColor,
    backdropOpacity: Math.max(0, Math.min(90, Math.round(draft.design.backdropOpacity))),
    showClose: draft.design.showClose,
    closeColor: draft.design.closeColor,
    imageUrl: safeHttpUrl(draft.design.sidebarImage),
    rounded: draft.design.radius > 0,
    shadow: draft.design.shadow,
  };
  const behavior = {
    mode: draft.behaviour.modes[0], modes: draft.behaviour.modes,
    trigger: {
      delaySeconds: draft.behaviour.delayOn ? Math.min(600, Math.max(0, draft.behaviour.delay)) : null,
      scrollPercent: draft.behaviour.scrollOn && [25, 50, 75].includes(draft.behaviour.scroll) ? draft.behaviour.scroll : null,
      exitIntent: draft.behaviour.exitOn,
      clickOn: false,
    },
    frequency: draft.behaviour.repeat === 'always' ? null : { amount: Math.max(1, Math.min(365, draft.behaviour.frequency)), unit: draft.behaviour.frequencyUnit },
    schedule: { startsAt: draft.behaviour.schedule === 'range' && draft.behaviour.startAt ? wallToUtc(draft.behaviour.startAt, draft.behaviour.timezone) : null, endsAt: draft.behaviour.schedule === 'range' && draft.behaviour.endAt ? wallToUtc(draft.behaviour.endAt, draft.behaviour.timezone) : null, timezone: draft.behaviour.timezone },
    pages: { mode: draft.behaviour.pages === 'show' ? 'include' : draft.behaviour.pages === 'hide' ? 'exclude' : 'all', paths: draft.behaviour.urls.split('\n').map((value) => value.trim()).filter(Boolean).map((value) => { try { return value.startsWith('http') ? new URL(value).pathname : value.startsWith('/') ? value : `/${value}`; } catch { return value.startsWith('/') ? value : `/${value}`; } }).slice(0, 50), strict: draft.behaviour.strict },
    devices: { desktop: !draft.behaviour.hideDesktop, tablet: !draft.behaviour.hideTablet, mobile: !draft.behaviour.hideMobile },
  };
  return {
    content: {
      version: 1,
      blocks,
      fields: { email: { label: clip(email?.label, 60) || 'Email address', placeholder: clip(email?.placeholder, 100) || 'you@example.com' }, name: { enabled: Boolean(name), required: name?.required ?? false, label: clip(name?.label, 60) || 'Name', placeholder: clip(name?.placeholder, 100) }, custom: customFields.slice(0, 20) },
      submitLabel,
      success: {
        blocks: [{ id: 'success-heading', type: 'heading', text: clip(draft.success.heading, 200) }, { id: 'success-text', type: 'text', text: clip(draft.success.text, 2000) }].filter((block) => block.text),
        coupon: clip(draft.success.coupon, 40),
        button: { label: clip(draft.success.buttonLabel, 60), url: safeHttpUrl(draft.success.buttonUrl) },
        design: {
          width: draft.success.width,
          showClose: draft.success.showClose,
          showImage: draft.success.showImage,
          background: draft.success.background,
          headingColor: draft.success.headingColor,
          textColor: draft.success.textColor,
          buttonColor: draft.success.buttonColor,
          buttonText: draft.success.buttonText,
        },
      },
      editorState: draft,
    },
    design,
    settings,
    behavior,
  };
}

type Modes = FormDraft['behaviour']['modes'];
const isMode = (value: unknown): value is Modes[number] => value === 'click' || value === 'inline' || value === 'auto';

/** The server's usage modes. Older forms have one `mode`; older still open on click if that was their only trigger. */
function modesOf(behavior: Record<string, unknown> | undefined): Modes {
  const list = Array.isArray(behavior?.modes) ? behavior.modes.filter(isMode) : [];
  if (list.length) return [...new Set(list)];
  if (isMode(behavior?.mode)) return [behavior.mode];
  const trigger = (behavior?.trigger ?? {}) as Record<string, unknown>;
  return [trigger.clickOn && trigger.delaySeconds == null && trigger.scrollPercent == null && !trigger.exitIntent ? 'click' : 'auto'];
}

/** Server form → editor draft, always with its signup fields block. */
function fromApi(form: ApiForm): FormDraft {
  const submitLabel = typeof form.content?.submitLabel === 'string' ? form.content.submitLabel : undefined;
  const draft = withFieldsBlock(readForm(form), submitLabel);
  // Forms open on Redirect unless the owner chose "Show message" themselves.
  const success = draft.success.chosen ? draft.success : { ...draft.success, mode: 'redirect' as const };
  return { ...draft, success, heldByPixlPush: Boolean(form.adminLockedAt) };
}

function readForm(form: ApiForm): FormDraft {
  const snapshot = form.content?.editorState;
  const parsed = formDraftSchema.safeParse(snapshot);
  if (parsed.success) return formDraftSchema.parse({
    ...parsed.data,
    behaviour: form.behavior ? { ...parsed.data.behaviour, modes: modesOf(form.behavior) } : parsed.data.behaviour,
    scriptUrl: form.embed?.scriptUrl,
    options: { ...parsed.data.options, recaptcha: false, doubleOptIn: false, permissions: { ...parsed.data.options.permissions, on: false }, interests: { ...parsed.data.options.interests, on: false } },
    id: form.id, name: form.name, kind: form.type, status: form.status,
    publicKey: form.publicKey, embedSnippet: form.embed?.snippet ?? null,
    groups: form.groupIds ?? [], stats: { views: form.metrics?.views ?? 0, subscribers: form.metrics?.subscribers ?? 0 },
    template: form.templateKey ?? parsed.data.template, createdAt: form.createdAt, updatedAt: form.updatedAt,
  });
  const seed = defaultApiDraft(form);
  const content = form.content ?? {};
  const blocks = Array.isArray(content.blocks) ? content.blocks.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const block = item as Record<string, unknown>;
    const id = typeof block.id === 'string' ? block.id : makeId();
    const type = block.type;
    if (type === 'heading' || type === 'text') return [{ id, type, text: String(block.text ?? '') }];
    if (type === 'image') return [{ id, type, src: String(block.url ?? ''), alt: String(block.alt ?? '') }];
    if (type === 'image_text') return [{ id, type: 'imageText' as const, src: String(block.url ?? ''), alt: String(block.alt ?? ''), text: String(block.text ?? '') }];
    if (type === 'button') return [{ id, type, label: String(block.label ?? ''), action: 'url' as const, href: String(block.url ?? '') }];
    if (type === 'divider') return [{ id, type }];
    if (type === 'countdown') return [{ id, type, endsAt: typeof block.endsAt === 'string' ? block.endsAt : undefined, text: String(block.label ?? '') }];
    if (type === 'social') return [{ id, type, links: Array.isArray(block.links) ? block.links.flatMap((item) => { if (!item || typeof item !== 'object') return []; const link = item as Record<string, unknown>; const platform = String(link.network ?? 'website'); const label = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1); return [{ platform: label, url: String(link.url ?? '') }]; }) : [] }];
    if (type === 'list') return [{ id, type, items: Array.isArray(block.items) ? block.items.map(String) : [] }];
    if (type === 'video') return [{ id, type, href: String(block.url ?? '') }];
    if (type === 'code') return [{ id, type, html: String(block.html ?? '') }];
    return [];
  }) : [];
  const remoteFields = content.fields && typeof content.fields === 'object' ? content.fields as Record<string, unknown> : {};
  const email = remoteFields.email && typeof remoteFields.email === 'object' ? remoteFields.email as Record<string, unknown> : {};
  const name = remoteFields.name && typeof remoteFields.name === 'object' ? remoteFields.name as Record<string, unknown> : {};
  const custom = Array.isArray(remoteFields.custom) ? remoteFields.custom.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const field = item as Record<string, unknown>;
    const type = field.type;
    if (!['text', 'textarea', 'phone', 'number', 'select', 'checkbox', 'date'].includes(String(type))) return [];
    const key = String(field.key ?? 'field_custom');
    return [{ id: key.replace(/^field_/, ''), type: type as 'text' | 'textarea' | 'phone' | 'number' | 'select' | 'checkbox' | 'date', label: String(field.label ?? 'Your answer'), placeholder: String(field.placeholder ?? ''), required: Boolean(field.required), half: false, options: Array.isArray(field.options) ? field.options.map(String) : [], value: '' }];
  }) : [];
  const success = content.success && typeof content.success === 'object' ? content.success as { blocks?: Array<Record<string, unknown>>; coupon?: string; button?: { label?: string; url?: string | null }; design?: Record<string, unknown> } : {};
  const successDesign = success.design ?? {};
  const successBlocks = success.blocks ?? [];
  const successHeading = successBlocks.find((block) => block.type === 'heading')?.text;
  const successText = successBlocks.find((block) => block.type === 'text')?.text;
  const settings = form.settings ?? {};
  const privacy = settings.privacyPolicy && typeof settings.privacyPolicy === 'object' ? settings.privacyPolicy as Record<string, unknown> : {};
  const consent = settings.consent && typeof settings.consent === 'object' ? settings.consent as Record<string, unknown> : {};
  const behavior = form.behavior ?? {};
  const trigger = behavior.trigger && typeof behavior.trigger === 'object' ? behavior.trigger as Record<string, unknown> : {};
  const frequency = behavior.frequency && typeof behavior.frequency === 'object' ? behavior.frequency as Record<string, unknown> : {};
  const schedule = behavior.schedule && typeof behavior.schedule === 'object' ? behavior.schedule as Record<string, unknown> : {};
  const pages = behavior.pages && typeof behavior.pages === 'object' ? behavior.pages as Record<string, unknown> : {};
  const devices = behavior.devices && typeof behavior.devices === 'object' ? behavior.devices as Record<string, unknown> : {};
  const draft = formDraftSchema.parse({
    ...seed,
    blocks: blocks.length ? blocks : seed.blocks,
    fields: [
      { ...seed.fields[0], label: String(email.label ?? 'Email address'), placeholder: String(email.placeholder ?? 'you@example.com') },
      ...(name.enabled ? [{ ...seed.fields[0], id: makeId(), type: 'text', label: String(name.label ?? 'Name'), placeholder: String(name.placeholder ?? 'Your name'), required: Boolean(name.required) }] : []),
      ...custom,
    ],
    success: {
      ...seed.success,
      heading: String(successHeading ?? seed.success.heading), text: String(successText ?? seed.success.text), coupon: String(success.coupon ?? ''), buttonLabel: String(success.button?.label ?? ''), buttonUrl: String(success.button?.url ?? 'https://'), mode: settings.successRedirectUrl ? 'redirect' : 'message', redirectUrl: String(settings.successRedirectUrl ?? ''),
      showImage: typeof successDesign.showImage === 'boolean' ? successDesign.showImage : seed.success.showImage,
      width: typeof successDesign.width === 'number' ? successDesign.width : undefined,
      showClose: typeof successDesign.showClose === 'boolean' ? successDesign.showClose : undefined,
      background: typeof successDesign.background === 'string' ? successDesign.background : undefined,
      headingColor: typeof successDesign.headingColor === 'string' ? successDesign.headingColor : undefined,
      textColor: typeof successDesign.textColor === 'string' ? successDesign.textColor : undefined,
      buttonColor: typeof successDesign.buttonColor === 'string' ? successDesign.buttonColor : undefined,
      buttonText: typeof successDesign.buttonText === 'string' ? successDesign.buttonText : undefined,
    },
    options: { ...seed.options, privacy: { ...seed.options.privacy, on: Boolean(privacy.enabled), text: String(privacy.text ?? seed.options.privacy.text), url: String(privacy.url ?? seed.options.privacy.url) }, consent: { ...seed.options.consent, on: Boolean(consent.enabled), text: String(consent.text ?? seed.options.consent.text) } },
    behaviour: {
      ...seed.behaviour,
      delayOn: trigger.delaySeconds != null, delay: Number(trigger.delaySeconds ?? seed.behaviour.delay),
      scrollOn: trigger.scrollPercent != null, scroll: Number(trigger.scrollPercent ?? seed.behaviour.scroll), exitOn: Boolean(trigger.exitIntent),
      modes: modesOf(behavior),
      repeat: behavior.frequency === null ? 'always' : 'after',
      frequency: Number(frequency.amount ?? seed.behaviour.frequency), frequencyUnit: frequency.unit ?? seed.behaviour.frequencyUnit,
      schedule: schedule.startsAt || schedule.endsAt ? 'range' : 'now', startAt: typeof schedule.startsAt === 'string' ? utcToWall(schedule.startsAt, zoneOf(schedule.timezone)) : '', endAt: typeof schedule.endsAt === 'string' ? utcToWall(schedule.endsAt, zoneOf(schedule.timezone)) : '', timezone: zoneOf(schedule.timezone),
      pages: pages.mode === 'include' ? 'show' : pages.mode === 'exclude' ? 'hide' : 'all', urls: Array.isArray(pages.paths) ? pages.paths.join('\n') : '', strict: Boolean(pages.strict),
      hideDesktop: devices.desktop === false, hideTablet: devices.tablet === false, hideMobile: devices.mobile === false,
    },
    publicKey: form.publicKey, embedSnippet: form.embed?.snippet ?? null, scriptUrl: form.embed?.scriptUrl,
  });
  return draft;
}

function defaultApiDraft(form: ApiForm): FormDraft {
  const seed = defaultDraft({ name: form.name, kind: form.type, groups: form.groupIds ?? [] });
  const design = form.design ?? {};
  const placement = design.placement;
  const popupType = placement === 'top_bar' || placement === 'bottom_bar' ? 'bar' : placement === 'bottom_left' || placement === 'bottom_right' ? 'slidein' : 'lightbox';
  return {
    ...seed,
    id: form.id, status: form.status, template: form.templateKey ?? seed.template,
    design: { ...seed.design, popupType, barPosition: placement === 'bottom_bar' ? 'bottom' : 'top', slidePosition: placement === 'bottom_left' ? 'left' : 'right', layout: String(design.editorLayout ?? (design.layout === 'split' ? 'leftSidebar' : 'plain')) as FormDraft['design']['layout'], display: String(design.display ?? seed.design.display) as FormDraft['design']['display'], align: String(design.align ?? seed.design.align) as FormDraft['design']['align'], width: Number(design.width ?? seed.design.width), background: String(design.backgroundColor ?? seed.design.background), transparent: Boolean(design.transparent ?? seed.design.transparent), backgroundImage: String(design.backgroundImage ?? ''), backgroundFit: String(design.backgroundFit ?? seed.design.backgroundFit) as FormDraft['design']['backgroundFit'], backgroundX: Number(design.backgroundX ?? seed.design.backgroundX), backgroundY: Number(design.backgroundY ?? seed.design.backgroundY), backgroundZoom: Number(design.backgroundZoom ?? seed.design.backgroundZoom), textColor: String(design.textColor ?? seed.design.textColor), headingColor: String(design.headingColor ?? seed.design.headingColor), labelColor: String(design.labelColor ?? seed.design.labelColor), buttonBg: String(design.accentColor ?? seed.design.buttonBg), buttonText: String(design.buttonTextColor ?? seed.design.buttonText), buttonRadius: Number(design.buttonRadius ?? seed.design.buttonRadius), buttonAlign: (['left', 'center', 'right', 'full'].includes(String(design.buttonAlign)) ? design.buttonAlign : 'full') as FormDraft['design']['buttonAlign'], buttonStyle: design.buttonStyle === 'outline' ? 'outline' : 'filled', buttonSize: Number(design.buttonSize ?? 15), sidebarMobile: design.sidebarMobile === true, labelAlign: (design.labelAlign === 'center' || design.labelAlign === 'right' ? design.labelAlign : 'left') as FormDraft['design']['labelAlign'], inputBg: String(design.inputBackgroundColor ?? seed.design.inputBg), inputBorder: String(design.inputBorderColor ?? seed.design.inputBorder), inputRadius: Number(design.inputRadius ?? seed.design.inputRadius), font: String(design.font ?? seed.design.font) as FormDraft['design']['font'], sidebarColor: String(design.sidebarColor ?? seed.design.sidebarColor), sidebarImage: String(design.sidebarImage ?? design.imageUrl ?? ''), sidebarFit: String(design.sidebarFit ?? seed.design.sidebarFit) as FormDraft['design']['sidebarFit'], sidebarX: Number(design.sidebarX ?? seed.design.sidebarX), sidebarY: Number(design.sidebarY ?? seed.design.sidebarY), sidebarWidth: Number(design.sidebarWidth ?? seed.design.sidebarWidth), sidebarZoom: Number(design.sidebarZoom ?? seed.design.sidebarZoom), backdropColor: String(design.backdropColor ?? seed.design.backdropColor), backdropOpacity: Number(design.backdropOpacity ?? seed.design.backdropOpacity), showClose: Boolean(design.showClose ?? seed.design.showClose), closeColor: String(design.closeColor ?? seed.design.closeColor), radius: design.rounded === false ? 0 : seed.design.radius, shadow: design.shadow !== false },
    stats: { views: form.metrics?.views ?? 0, subscribers: form.metrics?.subscribers ?? 0 },
    createdAt: form.createdAt || seed.createdAt, updatedAt: form.updatedAt || seed.updatedAt,
  };
}

export async function listForms(projectId: string, params: FormsListParams = {}): Promise<FormsPage> {
  const result = await authRequest<ApiList>(listPath(projectId, {
    page: params.page ?? 1, limit: params.limit ?? 10, type: params.type,
    status: params.status, search: params.search?.trim() || undefined, sort: params.sort,
  }), undefined, base);
  return { ...result, items: result.items.map(fromApi) };
}

export async function getForm(id: string, projectId: string): Promise<FormDraft> {
  return fromApi(await authRequest<ApiForm>(path(projectId, `/${encodeURIComponent(id)}`), undefined, base));
}

export async function createForm(draft: FormDraft, projectId: string): Promise<FormDraft> {
  const sections = toApiSections(draft);
  const created = await authRequest<ApiForm>(path(projectId), { name: draft.name.trim(), type: draft.kind, templateKey: draft.template || null, groupIds: draft.groups, ...sections }, base);
  return fromApi(created);
}

export async function saveForm(draft: FormDraft, projectId: string): Promise<FormDraft> {
  const sections = toApiSections(draft);
  const saved = await authRequest<ApiForm>(path(projectId, `/${encodeURIComponent(draft.id)}`), { name: draft.name.trim(), type: draft.kind, templateKey: draft.template || null, groupIds: draft.groups, ...sections }, base, 'PATCH');
  return fromApi(saved);
}

export async function setFormStatus(id: string, status: FormStatus, projectId: string): Promise<FormDraft> {
  if (status === 'draft') throw new Error('A published form cannot return to draft. Duplicate it to create another draft.');
  const action = status === 'active' ? 'activate' : 'pause';
  const updated = await authRequest<ApiForm>(path(projectId, `/${encodeURIComponent(id)}/${action}`), {}, base);
  return fromApi(updated);
}

export async function getFormAnalytics(id: string, projectId: string, range: { from?: string; to?: string } = {}) {
  const query = new URLSearchParams();
  if (range.from) query.set('from', range.from);
  if (range.to) query.set('to', range.to);
  const suffix = query.size ? `?${query}` : '';
  return authRequest<FormAnalytics>(path(projectId, `/${encodeURIComponent(id)}/analytics${suffix}`), undefined, base);
}

export type FormAnalytics = {
  formId: string; status: FormStatus; live: boolean;
  range: { from: string; to: string; timezone: 'UTC'; days: number };
  totals: { views: number; uniqueVisitors: number; subscribers: number; conversionRate: number };
  allTime: { views: number; subscribers: number; conversionRate: number };
  series: Array<{ date: string; views: number; subscribers: number; conversionRate: number }>;
};

export async function deleteForm(id: string, projectId: string): Promise<void> {
  await authRequest<void>(path(projectId, `/${encodeURIComponent(id)}`), {}, base, 'DELETE');
}

/** Uploads a form image into the Project's forms folder; returns its public URL. */
export async function uploadFormImage(file: File, projectId: string): Promise<{ url: string }> {
  const body = new FormData();
  body.append('file', file);
  // No Content-Type header: the browser adds the multipart boundary itself.
  const response = await fetch(`${base}${path(projectId, '/assets')}`, { method: 'POST', body, credentials: 'same-origin' }).catch(() => {
    throw { status: 0, message: 'Cannot reach the server. Check your connection.' };
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) throw { status: response.status, message: payload?.error?.message ?? (response.status === 413 ? 'The image is too large. Use one under 5 MB.' : 'The image could not be uploaded.') };
  return payload.data;
}

/** Removes a form image no saved form uses any more; one still in use is kept. */
export async function deleteFormImage(url: string, projectId: string): Promise<void> {
  await authRequest<unknown>(path(projectId, '/assets'), { url }, base, 'DELETE');
}

export async function duplicateForm(id: string, projectId: string): Promise<FormDraft> {
  return fromApi(await authRequest<ApiForm>(path(projectId, `/${encodeURIComponent(id)}/duplicate`), {}, base));
}

export async function listGroups(projectId: string): Promise<Group[]> {
  const groups = await audienceGroupsApi.list(projectId);
  return groups.map((group) => ({ id: group.id, name: group.name, description: group.description ?? '', count: group.memberCount ?? 0 }));
}

export async function createGroup(name: string, description: string, projectId: string): Promise<Group> {
  const group = await audienceGroupsApi.create(projectId, { name: name.trim(), description: description.trim(), rules: null });
  return { id: group.id, name: group.name, description: group.description ?? '', count: group.memberCount ?? 0 };
}

export const formsKeys = {
  all: ['forms'] as const,
  list: (projectId: string, params: FormsListParams) => ['forms', projectId, params] as const,
  one: (projectId: string, id: string) => ['forms', projectId, id] as const,
  analytics: (projectId: string, id: string, range: { from?: string; to?: string }) => ['forms', projectId, id, 'analytics', range] as const,
  groupsFor: (projectId: string) => ['form-groups', projectId] as const,
};
