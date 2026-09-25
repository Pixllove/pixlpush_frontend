import { authRequest } from '@/lib/auth/client';
import type {
  CreatedSdkKey, EmailSettings, FirebaseSettings, Project, ProjectDetail, SdkKey, UpdateProjectInput,
} from '@/types/project';

/** Route handlers under app/api/projects, which forward to Fastify. */
const BASE = '/api/projects';

const at = (projectId: string, path = '') => `/${encodeURIComponent(projectId)}${path}`;

export const projectApi = {
  /** Only Projects the Account is a member of; each carries the caller's role. */
  list: () => authRequest<Project[]>('', undefined, BASE),

  /** The caller becomes owner. Slug is generated when not supplied. */
  create: (input: { name: string; slug?: string }) => authRequest<Project>('', input, BASE),

  /** Full context for the active Project: plan, counts and role. */
  get: (projectId: string) =>
    authRequest<ProjectDetail>(`/${encodeURIComponent(projectId)}`, undefined, BASE),

  /** Partial update; omitted keys are left as they are. */
  update: (projectId: string, input: UpdateProjectInput) =>
    authRequest<ProjectDetail>(`/${encodeURIComponent(projectId)}`, input, BASE, 'PATCH'),

  /** Owner only. Starts the recovery window; does not cancel billing. */
  deactivate: (projectId: string) =>
    authRequest<Project>(`/${encodeURIComponent(projectId)}/deactivate`, {}, BASE),

  /** Owner only, and only while the recovery window is open. */
  restore: (projectId: string) =>
    authRequest<Project>(`/${encodeURIComponent(projectId)}/restore`, {}, BASE),
};

/** Firebase / FCM for one Project. Each Project has its own connection. */
export const firebaseApi = {
  get: (projectId: string) => authRequest<FirebaseSettings>(at(projectId, '/firebase'), undefined, BASE),
  /** Validated live against Google before anything is stored. */
  upload: (projectId: string, input: { serviceAccount: string; confirmFirebaseProjectId?: string }) =>
    authRequest<FirebaseSettings>(at(projectId, '/firebase'), input, BASE, 'PUT'),
  verify: (projectId: string) => authRequest<FirebaseSettings>(at(projectId, '/firebase/verify'), {}, BASE),
  disconnect: (projectId: string) => authRequest<FirebaseSettings>(at(projectId, '/firebase'), {}, BASE, 'DELETE'),
};

export const sdkKeyApi = {
  list: (projectId: string) => authRequest<SdkKey[]>(at(projectId, '/sdk-keys'), undefined, BASE),
  create: (projectId: string, name: string) => authRequest<CreatedSdkKey>(at(projectId, '/sdk-keys'), { name }, BASE),
  revoke: (projectId: string, keyId: string) =>
    authRequest<SdkKey>(at(projectId, `/sdk-keys/${encodeURIComponent(keyId)}/revoke`), {}, BASE),
};

export const emailApi = {
  get: (projectId: string) => authRequest<EmailSettings>(at(projectId, '/email-settings'), undefined, BASE),
  configure: (projectId: string, input: { sendingDomain: string; senderEmail: string; senderName: string }) =>
    authRequest<EmailSettings>(at(projectId, '/email-settings'), input, BASE, 'PUT'),
  verify: (projectId: string) => authRequest<EmailSettings>(at(projectId, '/email-settings/verify'), {}, BASE),
};

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  /** Per-Project settings areas, e.g. setting(id, 'firebase'). */
  setting: (id: string, area: 'firebase' | 'sdk-keys' | 'email') => [...projectKeys.all, area, id] as const,
};
