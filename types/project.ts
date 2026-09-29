/** Mirrors the backend's ProjectRole enum. */
export type ProjectRole =
  "owner" | "admin" | "developer" | "analyst" | "read_only" | "billing";

export type ProjectStatus = "active" | "deactivated";

export type ProjectEnvironment = "development" | "staging" | "production";

export type PlanName = "free" | "starter" | "pro" | "enterprise";

/** A Project as returned by GET /projects and POST /projects. */
export interface Project {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  role: ProjectRole;
  /** Same as role; present on list responses. */
  myRole?: ProjectRole;
  isOwner?: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
  recoveryUntil: string | null;
  subscription?: { plan: PlanName; status: string } | null;
}

/** GET /projects/:projectId adds the settings fields, plan period and counts. */
export interface ProjectDetail extends Project {
  description: string | null;
  environment: ProjectEnvironment;
  subscription: {
    plan: PlanName;
    status: string;
    currentPeriodStart: string;
  } | null;
  _count?: { endUsers: number; members: number };
}

export interface BillingContact {
  email: string;
  name?: string | null;
  company?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  vatId?: string | null;
}

export interface BillingSubscription {
  subscription: Record<string, unknown> | null;
  billingContact: BillingContact | null;
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt?: string;
  state?: string;
  account: { id: string; email: string; name: string | null };
  invitedBy?: { id: string; email: string; name: string | null } | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface ProjectInvitation {
  id: string;
  email: string;
  role: ProjectRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  invitedBy?: { id: string; email: string; name: string | null } | null;
}

/** POST /invitations: an existing account is added at once, a new one is invited. */
export type InviteResult =
  | { type: 'member'; emailSent: boolean; member: { id: string; role: ProjectRole; account: { id: string; email: string; name: string | null } } }
  | ({ type: 'invitation'; emailSent: boolean } & ProjectInvitation);

export type AuditCategory = 'auth' | 'project' | 'team' | 'settings' | 'integration' | 'workspace';

export interface AuditLogEntry {
  id: string;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  project: { id: string; name: string } | null;
  actor: { id: string; name: string | null; email: string } | null;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

export interface AuditLogFilters {
  projects: { id: string; name: string }[];
  actors: { id: string; name: string | null; email: string }[];
  categories: AuditCategory[];
  actions: string[];
}

export interface AuditLogQuery {
  projectId?: string;
  actorAccountId?: string;
  category?: string;
  from?: string;
  to?: string;
  q?: string;
  cursor?: string | null;
  limit?: number;
}

export interface EndUser {
  id: string;
  externalUserId: string | null;
  email: string | null;
  name: string | null;
  country: string | null;
  preferredLanguage: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  lifecycleSegment: { id: string; name: string } | null;
}

export interface UserProfile extends EndUser {
  emailConsent?: boolean | null;
  accountStatus?: string | null;
  userType?: string | null;
  region?: string | null;
  timezone?: string | null;
  platform?: string | null;
  emailVerified?: boolean | null;
  deletedAt?: string | null;
  device?: Record<string, unknown> | null;
  push?: Record<string, unknown> | null;
  audienceGroups?: Array<{ id: string; name: string }>;
  properties?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface UserActivity {
  id: string;
  type?: string;
  category?: string;
  title?: string;
  description?: string | null;
  details?: Record<string, unknown> | null;
  occurredAt?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface UserEvent {
  id: string;
  eventId?: string;
  name: string;
  userId: string;
  externalUserId?: string | null;
  sessionId?: string | null;
  environment?: string | null;
  platform?: string | null;
  properties?: Record<string, unknown>;
  occurredAt: string;
  receivedAt?: string;
}

export interface UsersPage {
  users: EndUser[];
  nextCursor: string | null;
}

/** GET /projects/:projectId/lifecycle-segments returns an array in `data`. */
export interface LifecycleSegment {
  id: string;
  name: string;
  description: string | null;
  rules: Record<string, unknown>;
  userCount?: number;
  usersCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LifecycleSegmentMember {
  id: string;
  externalUserId: string | null;
  email: string | null;
  name: string | null;
  country?: string | null;
  accountStatus?: string | null;
  createdAt: string;
  lastActiveAt?: string | null;
}

export interface LifecycleSegmentSchemaEvent {
  name: string;
  tracked?: boolean;
  eventCount: number;
  lastSeenAt: string | null;
  assignedSegment: { id: string; name: string } | null;
}

export interface LifecycleSegmentRecommendedEvent {
  name: string;
  suggestedSegment?: string;
  tracked: boolean;
  assignedSegment: { id: string; name: string } | null;
}

export interface LifecycleSegmentSchema {
  logicalOperators: Array<"AND" | "OR">;
  condition: {
    key: string;
    label: string;
    value: { type: string; required?: boolean };
  };
  limits: { maxConditions: number };
  allowCustomEvent: boolean;
  events: LifecycleSegmentSchemaEvent[];
  recommendedEvents?: LifecycleSegmentRecommendedEvent[];
}

export interface AudienceGroup {
  id: string;
  name: string;
  description: string | null;
  rules: Record<string, unknown> | null;
  memberCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceGroupMember {
  id: string;
  externalUserId: string | null;
  email: string | null;
  name: string | null;
  lastActiveAt: string | null;
  enteredAt: string;
}

export interface AudienceGroupSchemaOption {
  key: string;
  label: string;
}
export interface AudienceGroupSchemaCondition {
  key: string;
  label: string;
  value: {
    type: string;
    required?: boolean;
    multiple?: boolean;
    freeText?: boolean;
    min?: number;
    unit?: string;
    options?: AudienceGroupSchemaOption[];
  };
}
export interface AudienceGroupSchemaField {
  key: string;
  label: string;
  category?: string;
  operators: string[];
  conditions: AudienceGroupSchemaCondition[];
}
export interface AudienceGroupSchema {
  levels: Array<Record<string, unknown>>;
  fields: AudienceGroupSchemaField[];
  fieldKeys: string[];
  logicalOperators: Array<"AND" | "OR">;
  limits: { maxConditions: number; maxDepth: number };
}

/** PATCH /projects/:projectId. Omitted keys are left unchanged. */
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  environment?: ProjectEnvironment;
}

/** GET /projects/:id/firebase. Credentials themselves are never returned. */
export interface FirebaseSettings {
  status: "not_configured" | "connected" | "error";
  firebaseProjectId: string | null;
  clientEmail: string | null;
  lastError?: string | null;
  validatedAt?: string | null;
  /** Active device push tokens registered by the SDK for this Project. */
  activeTokens?: number;
}

export interface SdkKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: "active" | "revoked";
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** POST /sdk-keys returns the raw key exactly once. */
export interface CreatedSdkKey extends SdkKey {
  key: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  purpose: string;
  verified: boolean;
}

export interface EmailSettings {
  sendingDomain: string | null;
  senderEmail: string | null;
  senderName: string | null;
  dnsRecords: DnsRecord[];
  status: "not_configured" | "pending_verification" | "verified" | "error";
  lastError: string | null;
  lastCheckedAt: string | null;
  productionSendingEnabled: boolean;
}

export type UserImportStatus =
  | "uploaded"
  | "mapped"
  | "previewed"
  | "committing"
  | "completed"
  | "failed"
  | "expired"
  | "deleted";

/** One CSV user import. `sampleRows` are keyed by column header. */
export interface UserImport {
  id: string;
  fileName: string;
  status: UserImportStatus;
  headers: string[];
  sampleRows?: Record<string, string>[];
  totalRows: number;
  processedRows: number;
  results: {
    created: number;
    updated: number;
    unchanged: number;
    conflicts: number;
    errors: number;
    skipped: number;
  };
  errorMessage: string | null;
  createdAt: string;
}

export interface CustomPropertyDef {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
}

export interface ImportSuggestions {
  customProperties: CustomPropertyDef[];
  suggestions: {
    sourceColumn: string;
    targetField: string | null;
    normalization?: "email" | "phone" | "lowercase" | "trim";
    newCustomProperty?: CustomPropertyDef;
    isMatchKey: boolean;
  }[];
}

export interface ImportMappingInput {
  sourceLanguage: string;
  mappings: {
    sourceColumn: string;
    targetField: string | null;
    isMatchKey?: boolean;
    overwriteMode?: "overwrite" | "fill_empty_only" | "do_not_overwrite";
    normalization?: "email" | "phone" | "lowercase" | "trim";
  }[];
  customProperties: CustomPropertyDef[];
  saveMatchRule: boolean;
}

export interface ImportPreview {
  summary: {
    total: number;
    newUsers: number;
    existingUsers: number;
    unchanged: number;
    conflicts: number;
    invalid: number;
    skipped: number;
  };
}

/** GET /users/stats: header counts for the Users page. */
export interface UserStats {
  total: number;
  reachable: number;
  eventsToday: number;
  eventsYesterday: number;
}
