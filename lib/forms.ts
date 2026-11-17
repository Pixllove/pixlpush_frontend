import { formDraftSchema, makeId, type FormDraft } from '@/components/dashboard/forms/model';

/*
 * Forms repository. Until the Forms API exists the drafts live in this browser's localStorage; every
 * function is already async so the API phase only replaces the bodies here (callers use React Query).
 * ponytail: browser storage, per device and not per project; the Forms API replaces it.
 */

const FORMS_KEY = 'pixlpush.forms.v1';
const GROUPS_KEY = 'pixlpush.form-groups.v1';

export type SubscriberGroup = { id: string; name: string; description: string; count: number };

const defaultGroups: SubscriberGroup[] = [
  { id: 'all', name: 'All subscribers', description: 'Everyone who signs up through PixlPush forms', count: 0 },
  { id: 'product', name: 'Product updates', description: 'People interested in product news and releases', count: 0 },
  { id: 'early', name: 'Early access', description: 'High-intent subscribers from launch campaigns', count: 0 },
];

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('This browser could not save the form. Free up storage (large images use the most) and try again.');
  }
}

/** Stored drafts that no longer match the schema are skipped rather than crashing the list. */
const readForms = (): FormDraft[] =>
  read<unknown[]>(FORMS_KEY, []).flatMap((item) => {
    const parsed = formDraftSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });

export async function listForms(): Promise<FormDraft[]> {
  return readForms().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getForm(id: string): Promise<FormDraft> {
  const form = readForms().find((item) => item.id === id);
  if (!form) throw new Error('This form does not exist or was deleted.');
  return form;
}

export async function saveForm(draft: FormDraft): Promise<FormDraft> {
  const saved = { ...draft, name: draft.name.trim(), updatedAt: new Date().toISOString() };
  const forms = readForms();
  const at = forms.findIndex((item) => item.id === draft.id);
  if (at === -1) forms.push(saved);
  else forms[at] = saved;
  write(FORMS_KEY, forms);
  return saved;
}

export async function deleteForm(id: string): Promise<void> {
  write(FORMS_KEY, readForms().filter((item) => item.id !== id));
}

export async function duplicateForm(id: string): Promise<FormDraft> {
  const source = await getForm(id);
  const now = new Date().toISOString();
  return saveForm({ ...structuredClone(source), id: makeId(), name: `${source.name} (copy)`, status: 'draft', stats: { views: 0, subscribers: 0 }, createdAt: now, updatedAt: now });
}

export async function listGroups(): Promise<SubscriberGroup[]> {
  return read(GROUPS_KEY, defaultGroups);
}

export async function createGroup(name: string, description = ''): Promise<SubscriberGroup> {
  const groups = await listGroups();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Enter a group name.');
  if (groups.some((group) => group.name.toLowerCase() === trimmed.toLowerCase())) throw new Error('A group with this name already exists.');
  const group = { id: makeId(), name: trimmed, description: description.trim(), count: 0 };
  write(GROUPS_KEY, [...groups, group]);
  return group;
}

export const formsKeys = { all: ['forms'] as const, one: (id: string) => ['forms', id] as const, groups: ['form-groups'] as const };
