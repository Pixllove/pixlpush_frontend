import { authRequest } from "@/lib/auth/client";
import type {
  AudienceGroup,
  AuditLogFilters,
  AuditLogPage,
  AuditLogQuery,
  InviteResult,
  ProjectInvitation,
  AudienceGroupMember,
  AudienceGroupSchema,
  BillingContact,
  BillingSubscription,
  CreatedSdkKey,
  EmailSettings,
  FirebaseSettings,
  ImportMappingInput,
  ImportPreview,
  ImportSuggestions,
  LifecycleSegment,
  LifecycleSegmentMember,
  LifecycleSegmentSchema,
  Project,
  ProjectDetail,
  ProjectMember,
  SdkKey,
  UpdateProjectInput,
  UserActivity,
  UserEvent,
  UserImport,
  UserProfile,
  UserStats,
  UsersPage,
} from "@/types/project";

/** Route handlers under app/api/projects, which forward to Fastify. */
const BASE = "/api/projects";

const at = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}${path}`;

export const projectApi = {
  /** Only Projects the Account is a member of; each carries the caller's role. */
  list: () => authRequest<Project[]>("", undefined, BASE),

  /** The caller becomes owner. Slug is generated when not supplied. */
  create: (input: { name: string; slug?: string }) =>
    authRequest<Project>("", input, BASE),

  /** Full context for the active Project: plan, counts and role. */
  get: (projectId: string) =>
    authRequest<ProjectDetail>(
      `/${encodeURIComponent(projectId)}`,
      undefined,
      BASE,
    ),

  /** Partial update; omitted keys are left as they are. */
  update: (projectId: string, input: UpdateProjectInput) =>
    authRequest<ProjectDetail>(
      `/${encodeURIComponent(projectId)}`,
      input,
      BASE,
      "PATCH",
    ),

  /** Owner only. Starts the recovery window; does not cancel billing. */
  deactivate: (projectId: string) =>
    authRequest<Project>(
      `/${encodeURIComponent(projectId)}/deactivate`,
      {},
      BASE,
    ),

  /** Owner only, and only while the recovery window is open. */
  restore: (projectId: string) =>
    authRequest<Project>(`/${encodeURIComponent(projectId)}/restore`, {}, BASE),
};

/** Firebase / FCM for one Project. Each Project has its own connection. */
export const firebaseApi = {
  get: (projectId: string) =>
    authRequest<FirebaseSettings>(at(projectId, "/firebase"), undefined, BASE),
  /** Validated live against Google before anything is stored. */
  upload: (
    projectId: string,
    input: { serviceAccount: string; confirmFirebaseProjectId?: string },
  ) =>
    authRequest<FirebaseSettings>(
      at(projectId, "/firebase"),
      input,
      BASE,
      "PUT",
    ),
  verify: (projectId: string) =>
    authRequest<FirebaseSettings>(at(projectId, "/firebase/verify"), {}, BASE),
  disconnect: (projectId: string) =>
    authRequest<FirebaseSettings>(
      at(projectId, "/firebase"),
      {},
      BASE,
      "DELETE",
    ),
};

export const sdkKeyApi = {
  list: (projectId: string) =>
    authRequest<SdkKey[]>(at(projectId, "/sdk-keys"), undefined, BASE),
  create: (projectId: string, name: string) =>
    authRequest<CreatedSdkKey>(at(projectId, "/sdk-keys"), { name }, BASE),
  revoke: (projectId: string, keyId: string) =>
    authRequest<SdkKey>(
      at(projectId, `/sdk-keys/${encodeURIComponent(keyId)}/revoke`),
      {},
      BASE,
    ),
};

export interface EmailTemplate {
  id: string;
  projectId: string;
  name: string;
  subject: string;
  previewText?: string | null;
  html?: string | null;
  text?: string | null;
  editor?: string | null;
  category?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  sends?: number;
  opens?: number;
}

export interface EmailCampaignStats {
  total?: number;
  sent?: number;
  opened?: number;
  openRate?: number;
  clicked?: number;
  clickRate?: number;
}

export interface EmailCampaign {
  id: string;
  projectId: string;
  name: string;
  category?: string;
  templateId?: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    previewText?: string | null;
  };
  audience?: PushAudience;
  status: string;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: EmailCampaignStats;
}

export interface EmailLanguageOption {
  code: string;
  name: string;
}

export interface EmailLanguages {
  defaultLanguageEnabled: boolean;
  defaultLanguage: string | null;
  languages: EmailLanguageOption[];
}

export interface EmailSuggestion {
  language: string;
  subject: string;
  content: string;
  html: string;
}

export const emailApi = {
  get: (projectId: string) =>
    authRequest<EmailSettings>(
      at(projectId, "/email-settings"),
      undefined,
      BASE,
    ),
  configure: (
    projectId: string,
    input: { sendingDomain: string; senderEmail: string; senderName: string },
  ) =>
    authRequest<EmailSettings>(
      at(projectId, "/email-settings"),
      input,
      BASE,
      "PUT",
    ),
  verify: (projectId: string) =>
    authRequest<EmailSettings>(
      at(projectId, "/email-settings/verify"),
      {},
      BASE,
    ),
  languages: {
    get: (projectId: string) =>
      authRequest<EmailLanguages>(
        at(projectId, "/email-templates/languages"),
        undefined,
        BASE,
      ),
    setDefault: (
      projectId: string,
      input: { enabled: boolean; language?: string },
    ) =>
      authRequest<{ enabled: boolean; defaultLanguage: string | null }>(
        at(projectId, "/email-templates/default-language"),
        input,
        BASE,
        "PATCH",
      ),
  },
  suggest: (
    projectId: string,
    input: {
      prompt: string;
      subject?: string | null;
      content?: string | null;
      language?: string;
    },
  ) =>
    authRequest<EmailSuggestion>(
      at(projectId, "/email-templates/suggest"),
      input,
      BASE,
    ),
  templates: {
    list: (
      projectId: string,
      params: { search?: string; category?: "template" | "email" | "all"; page?: number; limit?: number } = {},
    ) => {
      const query = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 25),
      });
      if (params.search) query.set("search", params.search);
      if (params.category) query.set("category", params.category);
      return pushList<EmailTemplate>(
        projectId,
        `/email-templates?${query.toString()}`,
      );
    },
    get: (projectId: string, templateId: string) =>
      authRequest<EmailTemplate>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}`),
        undefined,
        BASE,
      ),
    update: (
      projectId: string,
      templateId: string,
      input: Partial<Pick<EmailTemplate, "name" | "subject" | "previewText" | "html" | "text" | "editor">>,
    ) =>
      authRequest<EmailTemplate>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}`),
        input,
        BASE,
        "PATCH",
      ),
    duplicate: (projectId: string, templateId: string) =>
      authRequest<EmailTemplate>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}/duplicate`),
        {},
        BASE,
      ),
    delete: (projectId: string, templateId: string) =>
      authRequest<void>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}`),
        {},
        BASE,
        "DELETE",
      ),
  },
  campaigns: {
    list: (
      projectId: string,
      params: {
        tab?: "sent" | "draft";
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {},
    ) => {
      const query = new URLSearchParams({
        tab: params.tab ?? "sent",
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 25),
      });
      if (params.status) query.set("status", params.status);
      if (params.search) query.set("search", params.search);
      return pushList<EmailCampaign>(
        projectId,
        `/email-campaigns?${query.toString()}`,
      );
    },
    get: (projectId: string, campaignId: string) =>
      authRequest<EmailCampaign>(
        at(projectId, `/email-campaigns/${encodeURIComponent(campaignId)}`),
        undefined,
        BASE,
      ),
    update: (
      projectId: string,
      campaignId: string,
      input: {
        name?: string;
        templateId?: string;
        audience?: PushAudience;
        content?: Record<string, unknown>;
      },
    ) =>
      authRequest<EmailCampaign>(
        at(projectId, `/email-campaigns/${encodeURIComponent(campaignId)}`),
        input,
        BASE,
        "PATCH",
      ),
    delete: (projectId: string, campaignId: string) =>
      authRequest<void>(
        at(projectId, `/email-campaigns/${encodeURIComponent(campaignId)}`),
        {},
        BASE,
        "DELETE",
      ),
  },
};

export const billingApi = {
  subscription: (projectId: string) =>
    authRequest<BillingSubscription>(
      at(projectId, "/billing/subscription"),
      undefined,
      BASE,
    ),
  updateContact: (projectId: string, input: BillingContact) =>
    authRequest<BillingContact>(
      at(projectId, "/billing/contact"),
      input,
      BASE,
      "PUT",
    ),
};

export const teamApi = {
  members: (projectId: string) =>
    authRequest<ProjectMember[]>(at(projectId, "/members"), undefined, BASE),
  removeMember: (projectId: string, memberId: string) =>
    authRequest<null>(
      at(projectId, `/members/${encodeURIComponent(memberId)}`),
      {},
      BASE,
      "DELETE",
    ),
  invitations: (projectId: string) =>
    authRequest<ProjectInvitation[]>(
      at(projectId, "/invitations"),
      undefined,
      BASE,
    ),
  invite: (
    projectId: string,
    input: { email: string; role: ProjectMember["role"] },
  ) => authRequest<InviteResult>(at(projectId, "/invitations"), input, BASE),
  resendInvitation: (projectId: string, invitationId: string) =>
    authRequest<ProjectInvitation & { emailSent: boolean }>(
      at(projectId, `/invitations/${encodeURIComponent(invitationId)}/resend`),
      {},
      BASE,
    ),
  revokeInvitation: (projectId: string, invitationId: string) =>
    authRequest<null>(
      at(projectId, `/invitations/${encodeURIComponent(invitationId)}`),
      {},
      BASE,
      "DELETE",
    ),
  updateRole: (
    projectId: string,
    memberId: string,
    role: ProjectMember["role"],
  ) =>
    authRequest<{ id: string; role: ProjectMember["role"]; updatedAt: string }>(
      at(projectId, `/members/${encodeURIComponent(memberId)}`),
      { role },
      BASE,
      "PATCH",
    ),
};

const auditQuery = (q: AuditLogQuery) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  return params.toString();
};

/** Account-wide feed (projects you own/administer + your own account activity). */
export const auditApi = {
  list: (q: AuditLogQuery = {}) =>
    authRequest<AuditLogPage>(
      `?${auditQuery(q)}`,
      undefined,
      "/api/audit-logs",
    ),
  filters: () =>
    authRequest<AuditLogFilters>("/filters", undefined, "/api/audit-logs"),
  project: (projectId: string, q: AuditLogQuery = {}) =>
    authRequest<AuditLogPage>(
      at(projectId, `/audit-logs?${auditQuery(q)}`),
      undefined,
      BASE,
    ),
};

export const usersApi = {
  list: (
    projectId: string,
    params?: { search?: string; limit?: number; cursor?: string | null },
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    query.set("limit", String(params?.limit ?? 100));
    if (params?.cursor) query.set("cursor", params.cursor);
    return authRequest<UsersPage>(
      at(projectId, `/users?${query.toString()}`),
      undefined,
      BASE,
    );
  },
  get: (projectId: string, userId: string) =>
    authRequest<UserProfile>(
      at(projectId, `/users/${encodeURIComponent(userId)}`),
      undefined,
      BASE,
    ),
  activity: (
    projectId: string,
    userId: string,
    params: { limit?: number; cursor?: string | null } = {},
  ) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.cursor) query.set("cursor", params.cursor);
    return authRequest<{ activity: UserActivity[]; nextCursor: string | null }>(
      at(
        projectId,
        `/users/${encodeURIComponent(userId)}/activity?${query.toString()}`,
      ),
      undefined,
      BASE,
    );
  },
};

export const eventsApi = {
  listForUser: (
    projectId: string,
    userId: string,
    params: { limit?: number; cursor?: string | null } = {},
  ) => {
    const query = new URLSearchParams({
      userId,
      limit: String(params.limit ?? 100),
    });
    if (params.cursor) query.set("cursor", params.cursor);
    return authRequest<{ events: UserEvent[]; nextCursor: string | null }>(
      at(projectId, `/events?${query.toString()}`),
      undefined,
      BASE,
    );
  },
};

export const userStatsApi = {
  get: (projectId: string) =>
    authRequest<UserStats>(at(projectId, "/users/stats"), undefined, BASE),
};

export const lifecycleSegmentsApi = {
  list: (projectId: string) =>
    authRequest<LifecycleSegment[]>(
      at(projectId, "/lifecycle-segments"),
      undefined,
      BASE,
    ),
  get: (projectId: string, segmentId: string) =>
    authRequest<LifecycleSegment>(
      at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`),
      undefined,
      BASE,
    ),
  create: (
    projectId: string,
    input: {
      name: string;
      description?: string;
      rules: { operator?: "AND" | "OR"; conditions: Array<{ event: string }> };
    },
  ) =>
    authRequest<LifecycleSegment>(
      at(projectId, "/lifecycle-segments"),
      input,
      BASE,
    ),
  update: (
    projectId: string,
    segmentId: string,
    input: {
      name?: string;
      description?: string;
      rules?: { operator: "AND" | "OR"; conditions: Array<{ event: string }> };
    },
  ) =>
    authRequest<LifecycleSegment>(
      at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`),
      input,
      BASE,
      "PATCH",
    ),
  delete: (projectId: string, segmentId: string) =>
    authRequest<void>(
      at(projectId, `/lifecycle-segments/${encodeURIComponent(segmentId)}`),
      {},
      BASE,
      "DELETE",
    ),
  members: (
    projectId: string,
    segmentId: string,
    params: { limit?: number; cursor?: string | null } = {},
  ) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.cursor) query.set("cursor", params.cursor);
    return authRequest<{
      members: LifecycleSegmentMember[];
      nextCursor: string | null;
    }>(
      at(
        projectId,
        `/lifecycle-segments/${encodeURIComponent(segmentId)}/members?${query.toString()}`,
      ),
      undefined,
      BASE,
    );
  },
  schema: (projectId: string) =>
    authRequest<LifecycleSegmentSchema>(
      at(projectId, "/lifecycle-segments/schema"),
      undefined,
      BASE,
    ),
  reevaluate: (projectId: string) =>
    authRequest<{ reclassifiedUsers: number }>(
      at(projectId, "/lifecycle-segments/reevaluate"),
      {},
      BASE,
    ),
};

/** CSV user import: upload -> suggestions -> mapping -> preview -> commit (worker applies it). */
export const userImportApi = {
  list: (projectId: string) =>
    authRequest<{ items: UserImport[] }>(
      at(projectId, "/user-imports?limit=20"),
      undefined,
      BASE,
    ),
  get: (projectId: string, importId: string) =>
    authRequest<UserImport>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}`),
      undefined,
      BASE,
    ),
  /** The file content is the request body (sent as text/csv). */
  upload: (projectId: string, fileName: string, csv: string) =>
    authRequest<UserImport>(
      at(projectId, `/user-imports?fileName=${encodeURIComponent(fileName)}`),
      csv,
      BASE,
    ),
  suggestions: (projectId: string, importId: string, language: string) =>
    authRequest<ImportSuggestions>(
      at(
        projectId,
        `/user-imports/${encodeURIComponent(importId)}/suggestions?language=${language}`,
      ),
      undefined,
      BASE,
    ),
  map: (projectId: string, importId: string, input: ImportMappingInput) =>
    authRequest<UserImport>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/mapping`),
      input,
      BASE,
      "PUT",
    ),
  preview: (projectId: string, importId: string) =>
    authRequest<ImportPreview>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/preview`),
      {},
      BASE,
    ),
  /** `audienceGroupName` creates an Audience Group holding exactly this import's users. */
  commit: (projectId: string, importId: string, audienceGroupName?: string) =>
    authRequest<
      UserImport & { audienceGroup?: { id: string; name: string } | null }
    >(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/commit`),
      audienceGroupName ? { audienceGroupName } : {},
      BASE,
    ),
  /** Permanently deletes the users this import created (not the ones it only updated). */
  deleteUsers: (projectId: string, importId: string) =>
    authRequest<{ deletedUsers: number }>(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/users`),
      {},
      BASE,
      "DELETE",
    ),
};

export const audienceGroupsApi = {
  list: (projectId: string) =>
    authRequest<AudienceGroup[]>(
      at(projectId, "/audience-groups"),
      undefined,
      BASE,
    ),
  create: (
    projectId: string,
    input: {
      name: string;
      description?: string;
      rules?: Record<string, unknown> | null;
    },
  ) =>
    authRequest<AudienceGroup>(at(projectId, "/audience-groups"), input, BASE),
  get: (projectId: string, groupId: string) =>
    authRequest<AudienceGroup>(
      at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`),
      undefined,
      BASE,
    ),
  update: (
    projectId: string,
    groupId: string,
    input: {
      name?: string;
      description?: string;
      rules: Record<string, unknown> | null;
    },
  ) =>
    authRequest<AudienceGroup>(
      at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`),
      input,
      BASE,
      "PATCH",
    ),
  delete: (projectId: string, groupId: string) =>
    authRequest<void>(
      at(projectId, `/audience-groups/${encodeURIComponent(groupId)}`),
      {},
      BASE,
      "DELETE",
    ),
  members: (
    projectId: string,
    groupId: string,
    params: { limit?: number; cursor?: string | null } = {},
  ) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.cursor) query.set("cursor", params.cursor);
    return authRequest<{
      members: AudienceGroupMember[];
      nextCursor: string | null;
    }>(
      at(
        projectId,
        `/audience-groups/${encodeURIComponent(groupId)}/members?${query.toString()}`,
      ),
      undefined,
      BASE,
    );
  },
  schema: (projectId: string) =>
    authRequest<AudienceGroupSchema>(
      at(projectId, "/audience-groups/schema"),
      undefined,
      BASE,
    ),
};

export interface PushTranslation {
  title: string;
  body: string;
}

export interface PushDeepLink {
  id: string;
  projectId: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushTemplate {
  id: string;
  projectId: string;
  name: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  deepLink?: string | null;
  data?: Record<string, string> | null;
  translations?: Record<string, PushTranslation> | null;
  category: "template" | "push_notification";
  campaignOnly?: boolean;
  status: "active";
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sends?: number;
  opens?: number;
}

export interface PushCampaignStats {
  total: number;
  queued: number;
  processing: number;
  sent: number;
  failed: number;
  skipped: number;
  canceled: number;
  opened: number;
  openRate: number;
  clicked?: number;
  clickRate?: number;
}

export type PushAudience = {
  allUsers?: boolean;
  userIds?: string[];
  lifecycleSegmentIds?: string[];
  audienceGroupIds?: string[];
};

export interface PushCampaign {
  id: string;
  projectId: string;
  name: string;
  category?: "template" | "push_notification";
  templateId: string;
  template?: PushTemplate;
  audience: PushAudience;
  status:
    | "draft"
    | "scheduled"
    | "dispatching"
    | "sending"
    | "completed"
    | "canceled"
    | "failed";
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: PushCampaignStats;
}

export interface PushPaginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
  tabCounts?: { send?: number; drafts?: number; templates?: number };
}

const pushList = <T>(projectId: string, path: string) =>
  authRequest<PushPaginated<T>>(at(projectId, path), undefined, BASE);

export const pushApi = {
  deepLinks: {
    list: (projectId: string) =>
      authRequest<PushDeepLink[]>(
        at(projectId, "/push-deeplinks"),
        undefined,
        BASE,
      ),
    create: (projectId: string, url: string) =>
      authRequest<PushDeepLink>(
        at(projectId, "/push-deeplinks"),
        { url },
        BASE,
      ),
    delete: (projectId: string, deepLinkId: string) =>
      authRequest<void>(
        at(projectId, `/push-deeplinks/${encodeURIComponent(deepLinkId)}`),
        {},
        BASE,
        "DELETE",
      ),
  },
  templates: {
    list: (
      projectId: string,
      params: {
        search?: string;
        category?: "template" | "push_notification" | "all";
        page?: number;
        limit?: number;
      } = {},
    ) => {
      const query = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 25),
      });
      if (params.search) query.set("search", params.search);
      if (params.category) query.set("category", params.category);
      return pushList<PushTemplate>(
        projectId,
        `/push-templates?${query.toString()}`,
      );
    },
    get: (projectId: string, templateId: string) =>
      authRequest<PushTemplate>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}`),
        undefined,
        BASE,
      ),
    create: (
      projectId: string,
      input: Omit<
        PushTemplate,
        | "id"
        | "projectId"
        | "createdAt"
        | "updatedAt"
        | "sends"
        | "opens"
        | "category"
        | "status"
        | "deletedAt"
      > & { category?: "template" | "push_notification" },
    ) =>
      authRequest<PushTemplate>(at(projectId, "/push-templates"), input, BASE),
    translate: (
      projectId: string,
      input: { title: string; body: string; languages: string[] },
    ) =>
      authRequest<{ translations: Record<string, PushTranslation> }>(
        at(projectId, "/push-templates/translate"),
        input,
        BASE,
      ),
    update: (
      projectId: string,
      templateId: string,
      input: Partial<
        Omit<PushTemplate, "id" | "projectId" | "createdAt" | "updatedAt">
      >,
    ) =>
      authRequest<PushTemplate>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}`),
        input,
        BASE,
        "PATCH",
      ),
    duplicate: (projectId: string, templateId: string) =>
      authRequest<PushTemplate>(
        at(
          projectId,
          `/push-templates/${encodeURIComponent(templateId)}/duplicate`,
        ),
        {},
        BASE,
      ),
    delete: (projectId: string, templateId: string) =>
      authRequest<void>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}`),
        {},
        BASE,
        "DELETE",
      ),
    test: (projectId: string, templateId: string, userId: string) =>
      authRequest<{ delivered: boolean; failed: boolean; error?: string }>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}/test`),
        { userId },
        BASE,
      ),
  },
  campaigns: {
    list: (
      projectId: string,
      params: {
        tab?: "sent" | "draft";
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
      } = {},
    ) => {
      const query = new URLSearchParams({
        tab: params.tab ?? "sent",
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 25),
      });
      if (params.status) query.set("status", params.status);
      if (params.search) query.set("search", params.search);
      return pushList<PushCampaign>(
        projectId,
        `/push-campaigns?${query.toString()}`,
      );
    },
    get: (projectId: string, campaignId: string) =>
      authRequest<PushCampaign>(
        at(projectId, `/push-campaigns/${encodeURIComponent(campaignId)}`),
        undefined,
        BASE,
      ),
    audiencePreview: (projectId: string, audience: PushAudience) =>
      authRequest<{ matching: number; reachable: number }>(
        at(projectId, "/push-campaigns/audience-preview"),
        { audience },
        BASE,
      ),
    create: (
      projectId: string,
      input: {
        name: string;
        templateId?: string;
        content?: {
          title: string;
          body: string;
          imageUrl?: string | null;
          deepLink?: string | null;
          data?: Record<string, string>;
          translations?: Record<string, PushTranslation> | null;
        };
        category?: "template" | "push_notification";
        audience?: PushAudience;
        sendNow?: boolean;
        scheduledAt?: string;
      },
    ) =>
      authRequest<PushCampaign>(at(projectId, "/push-campaigns"), input, BASE),
    update: (
      projectId: string,
      campaignId: string,
      input: { name?: string; templateId?: string; audience?: PushAudience },
    ) =>
      authRequest<PushCampaign>(
        at(projectId, `/push-campaigns/${encodeURIComponent(campaignId)}`),
        input,
        BASE,
        "PATCH",
      ),
    delete: (projectId: string, campaignId: string) =>
      authRequest<void>(
        at(projectId, `/push-campaigns/${encodeURIComponent(campaignId)}`),
        {},
        BASE,
        "DELETE",
      ),
    schedule: (projectId: string, campaignId: string, scheduledAt: string) =>
      authRequest<PushCampaign>(
        at(
          projectId,
          `/push-campaigns/${encodeURIComponent(campaignId)}/schedule`,
        ),
        { scheduledAt },
        BASE,
      ),
    sendNow: (projectId: string, campaignId: string) =>
      authRequest<PushCampaign>(
        at(
          projectId,
          `/push-campaigns/${encodeURIComponent(campaignId)}/send-now`,
        ),
        {},
        BASE,
      ),
    cancel: (projectId: string, campaignId: string) =>
      authRequest<{ canceled: boolean; canceledJobs: number }>(
        at(
          projectId,
          `/push-campaigns/${encodeURIComponent(campaignId)}/cancel`,
        ),
        {},
        BASE,
      ),
  },
};

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
  /** Per-Project settings areas, e.g. setting(id, 'firebase'). */
  setting: (id: string, area: "firebase" | "sdk-keys" | "email") =>
    [...projectKeys.all, area, id] as const,
};
