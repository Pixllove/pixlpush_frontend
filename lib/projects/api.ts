import { authRequest } from '@/lib/auth/client';
import type {
  AudienceGroup, AudienceGroupMember, AudienceGroupSchema, BillingContact, BillingSubscription, CreatedSdkKey, EmailSettings, FirebaseSettings, ImportMappingInput, ImportPreview,
  ImportSuggestions, LifecycleSegment, LifecycleSegmentMember, LifecycleSegmentSchema, Project, ProjectDetail, ProjectMember, SdkKey, UpdateProjectInput, UserImport, UserStats, UsersPage,
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

export const billingApi = {
  subscription: (projectId: string) =>
    authRequest<BillingSubscription>(at(projectId, '/billing/subscription'), undefined, BASE),
  updateContact: (projectId: string, input: BillingContact) =>
    authRequest<BillingContact>(at(projectId, '/billing/contact'), input, BASE, 'PUT'),
};

export const teamApi = {
  members: (projectId: string) => authRequest<ProjectMember[]>(at(projectId, '/members'), undefined, BASE),
  updateRole: (projectId: string, memberId: string, role: ProjectMember['role']) =>
    authRequest<{ id: string; role: ProjectMember['role']; updatedAt: string }>(at(projectId, `/members/${encodeURIComponent(memberId)}`), { role }, BASE, 'PATCH'),
};

export const usersApi = {
  list: (projectId: string, params?: { search?: string; limit?: number; cursor?: string | null }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    query.set('limit', String(params?.limit ?? 100));
    if (params?.cursor) query.set('cursor', params.cursor);
    return authRequest<UsersPage>(
      at(projectId, `/users?${query.toString()}`),
      undefined,
      BASE,
    );
  },
};

export const userStatsApi = {
  get: (projectId: string) => authRequest<UserStats>(at(projectId, '/users/stats'), undefined, BASE),
};

export const lifecycleSegmentsApi = {
  list: (projectId: string) =>
    authRequest<LifecycleSegment[]>(at(projectId, '/lifecycle-segments'), undefined, BASE),
  get: (projectId: string, segmentId: string) =>
    authRequest<LifecycleSegment>(at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`), undefined, BASE),
  create: (projectId: string, input: { name: string; description?: string; rules: { operator?: 'AND' | 'OR'; conditions: Array<{ event: string }> } }) =>
    authRequest<LifecycleSegment>(at(projectId, '/lifecycle-segments'), input, BASE),
  update: (projectId: string, segmentId: string, input: { name?: string; description?: string; rules?: { operator: 'AND' | 'OR'; conditions: Array<{ event: string }> } }) =>
    authRequest<LifecycleSegment>(at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`), input, BASE, 'PATCH'),
  delete: (projectId: string, segmentId: string) =>
    authRequest<void>(at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`), {}, BASE, 'DELETE'),
  members: (projectId: string, segmentId: string, params: { limit?: number; cursor?: string | null } = {}) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.cursor) query.set('cursor', params.cursor);
    return authRequest<{ members: LifecycleSegmentMember[]; nextCursor: string | null }>(
      at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}/members?${query.toString()}`),
      undefined,
      BASE,
    );
  },
  schema: (projectId: string) =>
    authRequest<LifecycleSegmentSchema>(at(projectId, '/lifecycle-segments/schema'), undefined, BASE),
  reevaluate: (projectId: string) =>
    authRequest<{ reclassifiedUsers: number }>(at(projectId, '/lifecycle-segments/reevaluate'), {}, BASE),
};

/** CSV user import: upload -> suggestions -> mapping -> preview -> commit (worker applies it). */
export const userImportApi = {
  list: (projectId: string) =>
    authRequest<{ items: UserImport[] }>(at(projectId, '/user-imports?limit=20'), undefined, BASE),
  get: (projectId: string, importId: string) =>
    authRequest<UserImport>(at(projectId, `/user-imports/${encodeURIComponent(importId)}`), undefined, BASE),
  /** The file content is the request body (sent as text/csv). */
  upload: (projectId: string, fileName: string, csv: string) =>
    authRequest<UserImport>(at(projectId, `/user-imports?fileName=${encodeURIComponent(fileName)}`), csv, BASE),
  suggestions: (projectId: string, importId: string, language: string) =>
    authRequest<ImportSuggestions>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/suggestions?language=${language}`),
      undefined,
      BASE,
    ),
  map: (projectId: string, importId: string, input: ImportMappingInput) =>
    authRequest<UserImport>(at(projectId, `/user-imports/${encodeURIComponent(importId)}/mapping`), input, BASE, 'PUT'),
  preview: (projectId: string, importId: string) =>
    authRequest<ImportPreview>(at(projectId, `/user-imports/${encodeURIComponent(importId)}/preview`), {}, BASE),
  /** `audienceGroupName` creates an Audience Group holding exactly this import's users. */
  commit: (projectId: string, importId: string, audienceGroupName?: string) =>
    authRequest<UserImport & { audienceGroup?: { id: string; name: string } | null }>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/commit`),
      audienceGroupName ? { audienceGroupName } : {},
      BASE,
    ),
  /** Permanently deletes the users this import created (not the ones it only updated). */
  deleteUsers: (projectId: string, importId: string) =>
    authRequest<{ deletedUsers: number }>(at(projectId, `/user-imports/${encodeURIComponent(importId)}/users`), {}, BASE, 'DELETE'),
};

export const audienceGroupsApi = {
  list: (projectId: string) =>
    authRequest<AudienceGroup[]>(at(projectId, '/audience-groups'), undefined, BASE),
  create: (projectId: string, input: { name: string; description?: string; rules?: Record<string, unknown> | null }) =>
    authRequest<AudienceGroup>(at(projectId, '/audience-groups'), input, BASE),
  get: (projectId: string, groupId: string) =>
    authRequest<AudienceGroup>(at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`), undefined, BASE),
  update: (projectId: string, groupId: string, input: { name?: string; description?: string; rules: Record<string, unknown> | null }) =>
    authRequest<AudienceGroup>(at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`), input, BASE, 'PATCH'),
  delete: (projectId: string, groupId: string) =>
    authRequest<void>(at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`), {}, BASE, 'DELETE'),
  members: (projectId: string, groupId: string, params: { limit?: number; cursor?: string | null } = {}) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.cursor) query.set('cursor', params.cursor);
    return authRequest<{ members: AudienceGroupMember[]; nextCursor: string | null }>(
      at(projectId, `/audience-groups/${encodeURIComponent(groupId)}/members?${query.toString()}`),
      undefined,
      BASE,
    );
  },
  schema: (projectId: string) =>
    authRequest<AudienceGroupSchema>(at(projectId, '/audience-groups/schema'), undefined, BASE),
};

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  /** Per-Project settings areas, e.g. setting(id, 'firebase'). */
  setting: (id: string, area: 'firebase' | 'sdk-keys' | 'email') => [...projectKeys.all, area, id] as const,
};
