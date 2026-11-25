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
  BillingInterval,
  BillingInvoice,
  Journey,
  JourneyDisplayStatus,
  JourneyInput,
  JourneyListItem,
  BillingPaymentMethod,
  SavedCard,
  CheckoutInput,
  EnterpriseOffer,
  CheckoutTotals,
  BillingPrice,
  BillingSubscription,
  BillingUsage,
  AiCreditBalance,
  AiCreditPackageName,
  AiCreditPurchase,
  BillingCurrency,
  PaidPlan,
  PlanLimits,
  PlanName,
  CreatedSdkKey,
  EmailSettings,
  ApnsSettings,
  ApnsUpload,
  FirebaseSettings,
  IntegrationCredentials,
  ConnectionProvider,
  IntegrationSettings,
  ImportMappingInput,
  ImportPreview,
  ImportSuggestions,
  LifecycleSegment,
  LifecycleSegmentMember,
  LifecycleSegmentSchema,
  Project,
  ProjectDetail,
  ProjectEventCatalogEntry,
  ProjectMember,
  SdkKey,
  UpdateProjectInput,
  UserActivity,
  UserEvent,
  UserImport,
  UserProfile,
  UserFilterKey,
  UserStats,
  UsersPage,
} from "@/types/project";
import type { OnboardingState } from "@/lib/onboarding";

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

  uploadLogo: async (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return authRequest<{ id: string; logoUrl: string | null; updatedAt: string }>(
      `/${encodeURIComponent(projectId)}/logo`,
      form,
      BASE,
      "PUT",
    );
  },

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

/** Every integration of one Project (HubSpot, Salesforce, Pipedrive, ...), one API. Syncs run in the backend worker. */
export const integrationsApi = {
  /** Every integration with its status, in one request. */
  list: (projectId: string) => authRequest<IntegrationSettings[]>(at(projectId, "/integrations"), undefined, BASE),
  get: (projectId: string, provider: ConnectionProvider) => authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}`), undefined, BASE),
  /** Checked live with the integration before anything is stored. */
  connect: (projectId: string, provider: ConnectionProvider, credentials: IntegrationCredentials) =>
    authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}`), credentials, BASE, "PUT"),
  setSyncEnabled: (projectId: string, provider: ConnectionProvider, syncEnabled: boolean) =>
    authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}`), { syncEnabled }, BASE, "PATCH"),
  syncNow: (projectId: string, provider: ConnectionProvider) => authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}/sync`), {}, BASE),
  disconnect: (projectId: string, provider: ConnectionProvider) => authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}`), {}, BASE, "DELETE"),
  /** "Connect with <CRM>": the consent page to send the browser to. */
  oauthStart: (projectId: string, provider: ConnectionProvider) => authRequest<{ url: string }>(at(projectId, `/integrations/${provider}/oauth/start`), {}, BASE),
  /** The CRM sent the browser back with ?code (and ?state when started here). */
  oauthCallback: (projectId: string, provider: ConnectionProvider, input: { code: string; state?: string }) =>
    authRequest<IntegrationSettings>(at(projectId, `/integrations/${provider}/oauth/callback`), input, BASE),
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

/** Direct Apple Push (APNs) for iOS apps without Firebase. Validated live with Apple before anything is stored. */
export const apnsApi = {
  get: (projectId: string) => authRequest<ApnsSettings>(at(projectId, "/apns"), undefined, BASE),
  upload: (projectId: string, input: ApnsUpload) => authRequest<ApnsSettings>(at(projectId, "/apns"), input, BASE, "PUT"),
  verify: (projectId: string) => authRequest<ApnsSettings>(at(projectId, "/apns/verify"), {}, BASE),
  disconnect: (projectId: string) => authRequest<ApnsSettings>(at(projectId, "/apns"), {}, BASE, "DELETE"),
};

/** Durable setup progress for the active Project's onboarding guide. */
export const onboardingApi = {
  get: (projectId: string) =>
    authRequest<OnboardingState>(at(projectId, "/onboarding"), undefined, BASE),
  update: (projectId: string, input: Partial<Omit<OnboardingState, "projectName">>) =>
    authRequest<OnboardingState>(at(projectId, "/onboarding"), input, BASE, "PATCH"),
  /** Reads the website on the server and returns the store links it links to (null when absent). */
  appLinks: (projectId: string, websiteUrl: string) =>
    authRequest<{ androidAppUrl: string | null; iosAppUrl: string | null }>(at(projectId, "/onboarding/app-links"), { websiteUrl }, BASE),
  sendSdkInstructions: (projectId: string, input: { developerEmail: string; sdk: string; prompt: string; guideUrl?: string }) =>
    authRequest<{ sent: boolean }>(at(projectId, "/onboarding/sdk-instructions"), input, BASE),
  sendWebhookInstructions: (projectId: string, developerEmail: string) =>
    authRequest<{ sent: boolean }>(at(projectId, "/onboarding/webhook-instructions"), { developerEmail }, BASE),
};

export type RoadmapStage = 'under_consideration' | 'future' | 'planned' | 'in_progress' | 'done' | 'unlikely_to_build';
export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  area: string;
  tags: string[];
  requestCount: number;
  ownerName: string | null;
  target: string | null;
  stage: RoadmapStage;
  status: 'approved' | 'pending_approval' | 'rejected';
  source: 'admin' | 'customer';
  account?: { id: string; name: string | null; email: string } | null;
  project?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};
export type RoadmapPage = { items: RoadmapItem[]; nextCursor: string | null; pagination: { limit: number; hasNextPage: boolean; nextCursor: string | null } };

/** The customer dashboard sees only approved cards for its active Project. */
export const roadmapApi = {
  list: (projectId: string, params: { search?: string; cursor?: string; limit?: number } = {}) => {
    const query = new URLSearchParams({ limit: String(params.limit ?? 100) });
    if (params.search) query.set('search', params.search);
    if (params.cursor) query.set('cursor', params.cursor);
    return authRequest<RoadmapPage>(at(projectId, `/roadmap?${query.toString()}`), undefined, BASE);
  },
  suggest: (projectId: string, input: { title: string; description: string; area?: string; tags?: string[] }) =>
    authRequest<RoadmapItem>(at(projectId, '/roadmap/suggestions'), input, BASE),
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
  /** Full key of an active key; every reveal is written to the audit log. */
  reveal: (projectId: string, keyId: string) =>
    authRequest<{ id: string; name: string; key: string }>(
      at(projectId, `/sdk-keys/${encodeURIComponent(keyId)}/reveal`),
      {},
      BASE,
    ),
  /** Only revoked keys can be deleted. */
  remove: (projectId: string, keyId: string) =>
    authRequest<void>(at(projectId, `/sdk-keys/${encodeURIComponent(keyId)}`), {}, BASE, "DELETE"),
};

export type SyncEnvironment = "development" | "staging" | "production";
export type SyncSource = {
  id: string; projectId: string; name: string; environment: SyncEnvironment;
  status: "active" | "paused"; activeMappingVersion?: number | null;
  records?: Record<string, number>; createdAt: string; updatedAt: string;
};
export type SyncMapping = {
  version: number; status: "draft" | "active" | "superseded"; config: unknown;
  validation: { valid: boolean; errors: { code: string; path: string; message: string }[]; warnings: { code: string; path: string; message: string }[] };
  publishedAt: string | null; createdAt: string;
};
export type SyncExternalSegment = { id: string; sourceId: string; namespace: string; key: string; displayName: string; status: "active" | "disabled" | "retired"; memberCount: number };
export type SyncOverduePolicy = "catch_up" | "skip" | "exit";
export type SyncSourceComparison = {
  matched: boolean; participantsMigrated: boolean; missingJourneyIds: string[];
  differences: { journeyId: string; field: string; source: number; pixlpush: number }[];
};
export type SyncMigrationRun = {
  id: string; projectId: string; name: string; sourceName: string;
  status: "draft" | "draining" | "cutover" | "rolled_back"; journeyIds: string[];
  stagedDefinitions: unknown; validationReport: unknown; drainConfirmedAt: string | null;
  cutoverAt: string | null; rolledBackAt: string | null; createdAt: string; updatedAt: string;
  sourceHoldAt: string | null; sourceWatermark: string | null; comparedAt: string | null; comparisonReport: unknown;
  cutoverRequestedAt: string | null; cutoverRequestedById: string | null; cutoverApprovedById: string | null;
  overduePolicy: SyncOverduePolicy; overdueMaxHours: number; catchUpMinutes: number;
  ownerships?: { journeyId: string; owner: "source" | "pixlpush"; fencingToken: number }[];
};
const syncAt = (projectId: string, path = "") => at(projectId, `/data-sync${path}`);

export type MatchStatus = "matched" | "suggested" | "needs_mapping";
/** One page of the Webhook feed with suggested matches. Suggestions only; nothing is saved. */
export type WebhookSample = {
  sampled: number; fields: string[]; events: string[]; products: string[];
  /** Distinct `segment` values seen in the sample. */
  segmentNames?: string[];
  /** Observed user_type values and subscription events, for 3.1 membership rules. */
  userTypes?: string[];
  billingEvents?: string[];
  /** Rules proposed from the sample; shown as suggestions and saved only once accepted. */
  membershipSuggestions?: MembershipSuggestion[];
  fieldMatches: { source: string; target: string | null; status: MatchStatus; reason: string; samples: string[] }[];
  eventMatches: { source: string; target: string | null; status: MatchStatus; reason: string; candidates: { name: string; score: number; reason: string }[]; sampleProperties: string[] }[];
  knownEvents: { name: string; standard: boolean; description: string | null }[];
  campaignMatches: (TargetMatch & { channel: "email" | "push"; source: string; name: string | null; records: number; statuses: string[]; unsupported: string[] })[];
  journeyMatches: (TargetMatch & { source: string; name: string | null; records: number; steps: (TargetMatch & { source: string; name: string | null })[] })[];
  unknownChannel: number;
  targets: { email: NamedItem[]; push: NamedItem[]; journeys: (NamedItem & { steps: NamedItem[] })[] };
};
type NamedItem = { id: string; name: string };
type TargetMatch = { status: MatchStatus; target: string | null; reason: string; candidates: { id: string; name: string; score: number }[] };

/** History from the customer's previous tool. Never counted as PixlPush sends. */
export type ImportedMessage = {
  id: string; channel: "email" | "push"; status: string; sourceCampaignId: string | null; campaignName: string | null; campaignId: string | null;
  sentAt: string | null; deliveredAt: string | null; openedAt: string | null; clickedAt: string | null; bouncedAt: string | null; failedAt: string | null;
  externalUserId: string; userId: string | null;
};
export type ImportedJourneyStep = { id: string; sourceJourneyId: string; journeyName: string | null; sourceStepId: string; stepName: string | null; journeyId: string | null; stepId: string | null; enteredAt: string; externalUserId?: string };

export const dataSyncApi = {
  importedForUser: (projectId: string, userId: string) => authRequest<{ messages: ImportedMessage[]; journeySteps: ImportedJourneyStep[] }>(syncAt(projectId, `/imported-history/users/${encodeURIComponent(userId)}`), undefined, BASE),
  importedForCampaign: (projectId: string, channel: "email" | "push", campaignId: string) => authRequest<{ stats: { total: number; delivered: number; opened: number; clicked: number | null; bounced: number; failed: number }; recipients: ImportedMessage[] }>(syncAt(projectId, `/imported-history/campaigns/${channel}/${encodeURIComponent(campaignId)}`), undefined, BASE),
  importedForJourney: (projectId: string, journeyId: string) => authRequest<{ steps: { stepId: string | null; users: number }[]; recent: ImportedJourneyStep[] }>(syncAt(projectId, `/imported-history/journeys/${encodeURIComponent(journeyId)}`), undefined, BASE),
  sources: (projectId: string) => authRequest<SyncSource[]>(syncAt(projectId, "/sources"), undefined, BASE),
  segments: (projectId: string) => authRequest<SyncExternalSegment[]>(syncAt(projectId, "/segments"), undefined, BASE),
  /** Names seen in one page of the connected Webhook feed (no values). */
  serverSample: (projectId: string) => authRequest<WebhookSample>(syncAt(projectId, "/server-sync/sample"), undefined, BASE),
  mappings: (projectId: string, sourceId: string) => authRequest<SyncMapping[]>(syncAt(projectId, `/sources/${encodeURIComponent(sourceId)}/mappings`), undefined, BASE),
  createMapping: (projectId: string, sourceId: string, config: unknown) => authRequest<SyncMapping>(syncAt(projectId, `/sources/${encodeURIComponent(sourceId)}/mappings`), { config }, BASE),
  publishMapping: (projectId: string, sourceId: string, version: number) => authRequest<SyncMapping>(syncAt(projectId, `/sources/${encodeURIComponent(sourceId)}/mappings/${version}/publish`), {}, BASE),
  migrations: (projectId: string) => authRequest<SyncMigrationRun[]>(syncAt(projectId, "/migrations"), undefined, BASE),
  createMigration: (projectId: string, input: { name: string; sourceName?: string; journeyIds: string[] }) => authRequest<SyncMigrationRun>(syncAt(projectId, "/migrations"), input, BASE),
  validateMigration: (projectId: string, runId: string) => authRequest<unknown>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/validate`), {}, BASE),
  stageMigration: (projectId: string, runId: string, definitions: unknown) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/staged`), { definitions }, BASE, "PUT"),
  importMigrationParticipants: (projectId: string, runId: string, participants: Array<{ journeyId: string; externalUserId: string; externalKey?: string; resumeAtStepKey?: string; enteredAt?: string; nextRunAt?: string; entryNumber?: number; completedSteps?: Array<{ stepKey: string; status: "sent" | "delivered" | "opened" | "clicked"; sentAt?: string; openedAt?: string; clickedAt?: string; sourceMessageId?: string }> }>) => authRequest<{ staged: number; messages: number; unknownUsers: number; duplicates: number; rejectedCount: number; rejected: { index: number; code: string; message: string }[] }>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/participants`), { participants }, BASE),
  drainMigration: (projectId: string, runId: string) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/drain`), {}, BASE),
  confirmMigrationDrain: (projectId: string, runId: string) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/confirm-drain`), {}, BASE),
  confirmSourceHold: (projectId: string, runId: string, watermark: string) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/source-hold`), { watermark, confirmed: true }, BASE),
  compareMigration: (projectId: string, runId: string, input: { participantsMigrated: boolean; journeys: Record<string, { steps: number; active: number; stepCounts: Record<string, number>; sentMessages?: number }> }) => authRequest<SyncSourceComparison>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/compare`), input, BASE),
  requestCutover: (projectId: string, runId: string, input: { overduePolicy: SyncOverduePolicy; overdueMaxHours: number; catchUpMinutes: number }) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/cutover/request`), input, BASE),
  cutoverMigration: (projectId: string, runId: string, confirmSelfApproval = false) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/cutover`), { confirmSelfApproval }, BASE),
  rollbackMigration: (projectId: string, runId: string) => authRequest<SyncMigrationRun>(syncAt(projectId, `/migrations/${encodeURIComponent(runId)}/rollback`), {}, BASE),
};

export interface EmailTemplate {
  id: string;
  projectId: string;
  name: string;
  subject: string;
  previewText?: string | null;
  html?: string | null;
  text?: string | null;
  translations?: Record<string, { subject: string; html: string }> | null;
  /** Sent when a recipient's language has no version. Null = the original copy. */
  fallbackLanguage?: string | null;
  editor?: string | null;
  /** Drag & drop builder state; the editor reopens from this, not from the HTML. */
  design?: Record<string, unknown> | null;
  category?: string;
  status?: "active" | "deleted";
  deletedAt?: string | null;
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
    html?: string | null;
    text?: string | null;
    editor?: string | null;
    design?: Record<string, unknown> | null;
    translations?: Record<string, { subject: string; html: string }> | null;
    fallbackLanguage?: string | null;
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

export interface EmailTranslation {
  subject: string;
  previewText: string | null;
  html: string;
  text: string | null;
}

export const emailApi = {
  get: (projectId: string) =>
    authRequest<EmailSettings>(
      at(projectId, "/email-settings"),
      undefined,
      BASE,
    ),
  sendTest: (projectId: string, to: string) =>
    authRequest<{ sent: boolean; to: string }>(
      at(projectId, "/email-settings/test"),
      { to },
      BASE,
    ),
  /** Advisory content review. Nothing it returns blocks sending. */
  deliverabilityCheck: (
    projectId: string,
    input: { subject: string; html: string },
  ) =>
    authRequest<{ warnings: { code: string; message: string; detail?: string[] }[] }>(
      at(projectId, "/email-templates/deliverability-check"),
      input,
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
  translate: (
    projectId: string,
    input: {
      subject: string;
      html: string;
      previewText?: string | null;
      text?: string | null;
      sourceLanguage?: string;
      languages: string[];
    },
  ) =>
    authRequest<{
      sourceLanguage: string;
      translations: Record<string, EmailTranslation>;
      failed: string[];
    }>(at(projectId, "/email-templates/translate"), input, BASE),
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
    get: (projectId: string, templateId: string, includeDeleted = false) =>
      authRequest<EmailTemplate>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}${includeDeleted ? "?includeDeleted=true" : ""}`),
        undefined,
        BASE,
      ),
    create: (
      projectId: string,
      input: {
        name: string;
        subject: string;
        previewText?: string | null;
        html: string;
        text?: string | null;
        editor?: "simple" | "drag_drop";
        design?: Record<string, unknown> | null;
        translations?: Record<string, { subject: string; html: string }>;
        fallbackLanguage?: string | null;
      },
    ) => authRequest<EmailTemplate>(at(projectId, "/email-templates"), input, BASE),
    /**
     * Uploads a block image or logo as multipart/form-data (field "file"). Returns its public URL.
     * With a `key` the file is stored under that name and replaces any earlier upload with the same key.
     */
    uploadAsset: async (projectId: string, file: File, kind: "image" | "logo", key?: string) => {
      const form = new FormData();
      form.append("file", file);
      let response: Response;
      try {
        // No Content-Type header: the browser adds the multipart boundary itself.
        response = await fetch(`${BASE}${at(projectId, `/email-templates/assets?kind=${kind}${key ? `&key=${key}` : ""}`)}`, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
      } catch {
        throw { status: 0, code: "NETWORK_ERROR", message: "Cannot reach the server. Check your connection." };
      }
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) {
        throw {
          status: response.status,
          code: payload?.error?.code ?? "UPLOAD_FAILED",
          message: payload?.error?.message ?? (response.status === 413 ? "The image is too large. Use one under 5 MB." : "The image could not be uploaded."),
        };
      }
      return payload.data as { url: string; path: string; contentType: string; size: number };
    },
    /** Sends the editor's current content as a test, saved or not. */
    sendTest: (projectId: string, input: { to: string; subject: string; html: string }) =>
      authRequest<{ sent: boolean; to: string; via: "project" | "platform" }>(
        at(projectId, "/email-templates/test"),
        input,
        BASE,
      ),
    /** Removes an uploaded image no saved email uses any more; one still in use is kept (`deleted: false`). */
    deleteAsset: (projectId: string, url: string) =>
      authRequest<{ deleted: boolean; inUse: boolean }>(
        at(projectId, "/email-templates/assets"),
        { url },
        BASE,
        "DELETE",
      ),
    update: (
      projectId: string,
      templateId: string,
      input: Partial<Pick<EmailTemplate, "name" | "subject" | "previewText" | "html" | "text" | "editor" | "design" | "translations" | "fallbackLanguage">>,
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
    test: (projectId: string, templateId: string, to: string) =>
      authRequest<{ delivered: boolean; failed: boolean; error?: string }>(
        at(projectId, `/email-templates/${encodeURIComponent(templateId)}/test`),
        { to },
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
    create: (projectId: string, input: {
      name: string;
      content?: { subject: string; html: string; editor?: "simple" | "drag_drop"; design?: Record<string, unknown> | null; translations?: Record<string, { subject: string; html: string }>; fallbackLanguage?: string | null };
      templateId?: string;
    }) =>
      authRequest<EmailCampaign>(at(projectId, "/email-campaigns"), input, BASE),
    update: (
      projectId: string,
      campaignId: string,
      input: {
        name?: string;
        templateId?: string;
        audience?: PushAudience;
        content?: { subject: string; html: string; editor?: "simple" | "drag_drop"; design?: Record<string, unknown> | null; translations?: Record<string, { subject: string; html: string }>; fallbackLanguage?: string | null };
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

const journeyPath = (journeyId: string, action = "") => `/journeys/${encodeURIComponent(journeyId)}${action}`;

/** Journey Automations. Writes need owner, admin, developer or analyst. */
export const journeysApi = {
  list: (projectId: string, params: { status?: JourneyDisplayStatus; search?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 25) });
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    return authRequest<PushPaginated<JourneyListItem>>(at(projectId, `/journeys?${query.toString()}`), undefined, BASE);
  },
  /** With per-step `stats` for the builder's block counters. */
  get: (projectId: string, journeyId: string) =>
    authRequest<Journey>(at(projectId, journeyPath(journeyId)), undefined, BASE),
  create: (projectId: string, input: JourneyInput) =>
    authRequest<Journey>(at(projectId, "/journeys"), input, BASE, "POST"),
  /** A running journey accepts name changes only (409 JOURNEY_ACTIVE for trigger, audience or steps). */
  update: (projectId: string, journeyId: string, input: Partial<JourneyInput>) =>
    authRequest<Journey>(at(projectId, journeyPath(journeyId)), input, BASE, "PATCH"),
  /** Soft-deletes any journey; active journeys are stopped before hiding. */
  remove: (projectId: string, journeyId: string) =>
    authRequest<void>(at(projectId, journeyPath(journeyId)), {}, BASE, "DELETE"),
  /** activate (draft → live), pause, resume, archive (stops for good), duplicate (new draft copy). */
  action: (projectId: string, journeyId: string, action: "activate" | "pause" | "resume" | "archive" | "duplicate", options?: { cancelQueued?: boolean }) =>
    authRequest<Journey>(at(projectId, journeyPath(journeyId, `/${action}`)), options ?? {}, BASE, "POST"),
  /** Keep one variant of an A/B test step; the test and its other variants are removed (works while running). */
  applyAbWinner: (projectId: string, journeyId: string, testKey: string, variantKey: string) =>
    authRequest<Journey>(at(projectId, journeyPath(journeyId, `/ab-tests/${encodeURIComponent(testKey)}/apply`)), { variantKey }, BASE, "POST"),
  /** The users behind one builder counter. `step` is the step key; Entrance metrics take none. */
  users: (projectId: string, journeyId: string, params: { metric: JourneyUsersMetric; step?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams({ metric: params.metric, page: String(params.page ?? 1), limit: String(params.limit ?? 25) });
    if (params.step) query.set("step", params.step);
    if (params.search) query.set("search", params.search);
    return authRequest<PushPaginated<JourneyMetricUser>>(at(projectId, journeyPath(journeyId, `/users?${query.toString()}`)), undefined, BASE);
  },
};

export type JourneyUsersMetric =
  | "entered" | "unreachable" | "waiting" | "completed" | "exitedEarly"
  | "sent" | "opened" | "clicked" | "paused" | "deleted";
export interface JourneyMetricUser {
  user: {
    id: string;
    externalUserId: string | null;
    email: string | null;
    name: string | null;
    country: string | null;
    region: string | null;
    lastActiveAt: string | null;
    deletedAt: string | null;
  };
  /** Participant metrics: where the user stands in this journey. */
  journey?: {
    status: "active" | "completed" | "exited" | "failed";
    enteredAt: string;
    completedAt: string | null;
    exitedAt: string | null;
    exitReason: string | null;
  };
  /** Message metrics: what happened to the message this user was sent. */
  message?: {
    status: "queued" | "processing" | "sent" | "failed" | "skipped" | "canceled";
    sentAt: string | null;
    openedAt: string | null;
    deliveredCount?: number;
    openCount?: number;
    deliveredAt?: string | null;
    clickedAt?: string | null;
    bouncedAt?: string | null;
  };
}

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
    ),  usage: (projectId: string) =>
    authRequest<BillingUsage>(at(projectId, "/billing/usage"), undefined, BASE),
  /** Plan limits, by plan name. */
  plans: (projectId: string) =>
    authRequest<Record<PlanName, PlanLimits>>(at(projectId, "/billing/plans"), undefined, BASE),
  /** What can be bought, read from Stripe by the backend. Empty where Stripe is not configured. */
  prices: (projectId: string) =>
    authRequest<BillingPrice[]>(at(projectId, "/billing/prices"), undefined, BASE),
  invoices: (projectId: string) =>
    authRequest<BillingInvoice[]>(at(projectId, "/billing/invoices"), undefined, BASE),
  /** This project's Enterprise offer from PixlPush, or null. */
  enterpriseOffer: (projectId: string) =>
    authRequest<EnterpriseOffer | null>(at(projectId, "/billing/enterprise"), undefined, BASE),
  enterpriseCheckout: (projectId: string, input: { interval: BillingInterval; currency?: string }) =>
    authRequest<{ url: string }>(at(projectId, "/billing/enterprise/checkout-session"), input, BASE, "POST"),
  aiCredits: (projectId: string) =>
    authRequest<AiCreditBalance>(at(projectId, "/billing/credits"), undefined, BASE),
  aiCreditPurchases: (projectId: string) =>
    authRequest<AiCreditPurchase[]>(at(projectId, "/billing/credits/purchases"), undefined, BASE),
  createAiCreditCheckout: (projectId: string, input: { package: AiCreditPackageName; currency: BillingCurrency }) =>
    authRequest<{ url: string }>(at(projectId, "/billing/credits/checkout-session"), input, BASE, "POST"),
  /** Subtotal, tax and total Stripe calculates for a plan at this billing address. */
  previewCheckout: (projectId: string, input: CheckoutInput) =>
    authRequest<CheckoutTotals>(at(projectId, "/billing/checkout/preview"), input, BASE, "POST"),
  /**
   * First purchase on PixlPush's own checkout page: the backend creates the (still unpaid) subscription
   * at the approved price and returns the client secret its first payment is confirmed with by Stripe.js.
   */
  createCheckoutSubscription: (projectId: string, input: CheckoutInput) =>
    authRequest<CheckoutTotals & { subscriptionId: string; clientSecret: string }>(at(projectId, "/billing/checkout/subscription"), input, BASE, "POST"),
  /** Brand, last four and expiry of the method the subscription is charged to; null when there is none. */
  paymentMethod: (projectId: string) =>
    authRequest<BillingPaymentMethod | null>(at(projectId, "/billing/payment-method"), undefined, BASE),
  /** A SetupIntent secret for saving a new card with Stripe's Payment Element. */
  setupPaymentMethod: (projectId: string) =>
    authRequest<{ clientSecret: string }>(at(projectId, "/billing/payment-method/setup"), {}, BASE, "POST"),
  /** Makes the saved card the default; the backend checks it belongs to this project and retries an unpaid invoice. */
  savePaymentMethod: (projectId: string, paymentMethodId: string) =>
    authRequest<{ retriedInvoice: "paid" | "failed" | null; paymentMethod: BillingPaymentMethod | null }>(at(projectId, "/billing/payment-method"), { paymentMethodId }, BASE, "PUT"),
  /** Every saved card of the project's Stripe customer, the default first. */
  paymentMethods: (projectId: string) =>
    authRequest<SavedCard[]>(at(projectId, "/billing/payment-methods"), undefined, BASE),
  /** Expiry and holder name of a saved card; the number can only be replaced by adding a new card. */
  updatePaymentMethod: (projectId: string, paymentMethodId: string, input: { expMonth: number; expYear: number; name?: string }) =>
    authRequest<SavedCard>(at(projectId, `/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`), input, BASE, "PATCH"),
  removePaymentMethod: (projectId: string, paymentMethodId: string) =>
    authRequest<{ removed: true }>(at(projectId, `/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`), {}, BASE, "DELETE"),
  /** The secret of a payment the bank wants authenticated (3D Secure); finished with stripe.handleNextAction. */
  confirmOpenPayment: (projectId: string) =>
    authRequest<{ clientSecret: string }>(at(projectId, "/billing/payment/confirm"), {}, BASE, "POST"),
  changeSubscription: (projectId: string, input: { plan: PaidPlan; interval: BillingInterval }) =>
    authRequest<{ plan: PlanName; pendingPlan: PlanName | null }>(at(projectId, "/billing/subscription"), input, BASE, "POST"),
  cancelSubscription: (projectId: string) =>
    authRequest<{ status: string; currentPeriodEnd: string | null }>(at(projectId, "/billing/subscription/cancel"), {}, BASE, "POST"),
  resumeSubscription: (projectId: string) =>
    authRequest<{ status: string; currentPeriodEnd: string | null }>(at(projectId, "/billing/subscription/resume"), {}, BASE, "POST"),
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
    authRequest<{ id: string; status: "revoked"; emailSent: boolean }>(
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

/** all = every person, deleted accounts included; anonymous = visitors nobody logged in on. */
export type UserListStatus = "all" | "active" | "logged_out" | "deleted" | "anonymous";
/** The Users page filter. */
export type UserListFilter = UserFilterKey;

export const usersApi = {
  list: (
    projectId: string,
    params?: { search?: string; limit?: number; cursor?: string | null; status?: UserListStatus; filter?: UserListFilter },
  ) => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.filter && params.filter !== "all") query.set("filter", params.filter);
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
    params: {
      page?: number;
      limit?: number;
      order?: "desc" | "asc";
      category?: string | null;
    } = {},
  ) => {
    const query = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
      order: params.order ?? "desc",
    });
    if (params.category) query.set("category", params.category);
    return authRequest<{
      activity: UserActivity[];
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      categories: string[];
    }>(
      at(
        projectId,
        `/users/${encodeURIComponent(userId)}/activity?${query.toString()}`,
      ),
      undefined,
      BASE,
    );
  },
};

/** Event rules (SDK), or server rules: Webhook events add and remove users. */
export type SegmentRulesInput =
  | { operator?: "AND" | "OR"; conditions: Array<{ event: string }> }
  | { source: "server"; enter: string[]; exit: string[] }
  | { source: "product"; products: string[]; signals: string[]; userTypes: string[]; externalSegment?: string };

export const eventsApi = {
  /** A described custom event, so mappings and AI features know what it means. */
  createCustom: (projectId: string, input: { name: string; description: string }) =>
    authRequest<{ name: string; description: string }>(at(projectId, "/event-catalog"), input, BASE),
  listCatalog: (
    projectId: string,
    platform: "web" | "mobile" | "server",
    params: { search?: string; limit?: number } = {},
  ) => {
    const query = new URLSearchParams({
      platform,
      limit: String(params.limit ?? 200),
    });
    if (params.search) query.set("search", params.search);
    return authRequest<{ events: ProjectEventCatalogEntry[] }>(
      at(projectId, `/event-catalog?${query.toString()}`),
      undefined,
      BASE,
    );
  },
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

export type MembershipSuggestion = {
  segment: string;
  products: string[];
  signals: string[];
  userTypes: string[];
  note: string;
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
      rules: SegmentRulesInput;
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
      rules?: SegmentRulesInput;
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
  /**
   * `audienceGroupName` creates an Audience Group holding exactly this import's users.
   * `emailConsentConfirmed` records that the customer vouched for every contact's email consent.
   */
  commit: (projectId: string, importId: string, audienceGroupName?: string, emailConsentConfirmed = false) =>
    authRequest<
      UserImport & { audienceGroup?: { id: string; name: string } | null }
    >(
      at(projectId, `/user-imports/${encodeURIComponent(importId)}/commit`),
      { ...(audienceGroupName ? { audienceGroupName } : {}), ...(emailConsentConfirmed ? { emailConsentConfirmed } : {}) },
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
  schema: (projectId: string, params: { surface?: 'users-audience-groups' } = {}) =>
    authRequest<AudienceGroupSchema>(
      at(projectId, `/audience-groups/schema${params.surface ? `?surface=${encodeURIComponent(params.surface)}` : ''}`),
      undefined,
      BASE,
    ),
};

export interface PushTranslation {
  title: string;
  body: string;
}

export type PushDeliveryChannel = "mobile" | "web";

export interface PushChannelDeliveryResult {
  delivered: number;
  failed: number;
  deliveredProviders?: string[];
  attemptedProviders?: string[];
  retryable?: boolean;
  lastError?: string | null;
}

export interface PushTemplateTestResult {
  delivered: number;
  failed: number;
  error?: string | null;
  channels?: PushDeliveryChannel[] | null;
  channelResults?: Partial<Record<PushDeliveryChannel, PushChannelDeliveryResult>>;
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
  /** Sent when a recipient's language has no version. Null = the original copy. */
  fallbackLanguage?: string | null;
  category: "template" | "push_notification";
  campaignOnly?: boolean;
  status: "active" | "deleted";
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
  /** New campaigns may target one or both delivery channels. */
  channels?: PushDeliveryChannel[];
  /** Legacy single-channel value retained for older campaigns. */
  channel?: PushDeliveryChannel | null;
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

/** Normalizes current and legacy campaign responses for UI consumers. */
export function effectivePushCampaignChannels(
  campaign: Pick<PushCampaign, "channels" | "channel">,
): PushDeliveryChannel[] | null {
  if (campaign.channels?.length) return campaign.channels;
  return campaign.channel ? [campaign.channel] : null;
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
    get: (projectId: string, templateId: string, includeDeleted = false) =>
      authRequest<PushTemplate>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}${includeDeleted ? "?includeDeleted=true" : ""}`),
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
    test: (projectId: string, templateId: string, userId: string, channels?: PushDeliveryChannel[]) =>
      authRequest<PushTemplateTestResult>(
        at(projectId, `/push-templates/${encodeURIComponent(templateId)}/test`),
        { userId, ...(channels?.length ? { channels } : {}) },
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
    audiencePreview: (projectId: string, audience: PushAudience, channels?: PushDeliveryChannel[]) =>
      authRequest<{ matching: number; reachable: number }>(
        at(projectId, "/push-campaigns/audience-preview"),
        { audience, ...(channels?.length ? { channels } : {}) },
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
          fallbackLanguage?: string | null;
        };
        category?: "template" | "push_notification";
        channel?: PushDeliveryChannel;
        channels?: PushDeliveryChannel[];
        audience?: PushAudience;
        sendNow?: boolean;
        scheduledAt?: string;
      },
    ) =>
      authRequest<PushCampaign>(at(projectId, "/push-campaigns"), input, BASE),
    update: (
      projectId: string,
      campaignId: string,
      input: {
        name?: string;
        templateId?: string;
        content?: {
          title: string;
          body: string;
          imageUrl?: string | null;
          deepLink?: string | null;
          data?: Record<string, string>;
          translations?: Record<string, PushTranslation> | null;
          fallbackLanguage?: string | null;
        };
        channel?: PushDeliveryChannel;
        channels?: PushDeliveryChannel[];
        audience?: PushAudience;
      },
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
  /** All integrations of a Project; one provider is a key below it, so writes refresh both. */
  integrations: (id: string) => [...projectKeys.all, "integrations", id] as const,
};
