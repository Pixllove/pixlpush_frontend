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
  state?: string | null;
  country?: string | null;
  vatId?: string | null;
  /** After a save: whether the VAT id could be put on Stripe invoices (false for a country Stripe has no type for here). */
  taxIdSent?: boolean;
}

export type PaidPlan = "starter" | "pro";
export type BillingInterval = "month" | "year";
/** The billing state the backend keeps in step with Stripe (by webhook). */
export type BillingStatus =
  | "active" | "trialing" | "cancel_at_period_end" | "billing_attention"
  | "past_due" | "incomplete" | "paused" | "unpaid";
export type BillingProblem =
  | "payment_failed" | "payment_action_required" | "tax_location_missing"
  | "invoice_finalization_failed" | "dispute";

export interface SubscriptionState {
  plan: PlanName;
  status: BillingStatus;
  stripeStatus: string | null;
  billingInterval: BillingInterval | null;
  currency: string | null;
  /** Smallest currency unit, for one interval, before tax. */
  unitAmount: number | null;
  taxExclusive: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  pendingPlan: PlanName | null;
  pendingInterval: BillingInterval | null;
  billingProblem: BillingProblem | null;
}

export interface BillingSubscription {
  /** null for a Project that never had a subscription: treat as Free. */
  subscription: SubscriptionState | null;
  billingContact: BillingContact | null;
}

/** One price that can be bought. Amounts are in the smallest currency unit, before tax. */
export interface BillingPrice {
  plan: PaidPlan;
  interval: BillingInterval;
  unitAmount: number;
  currency: string;
  taxExclusive: boolean;
}

export interface PlanLimits {
  reachableUsers: number | null;
  emailSendsPerMonth: number | null;
  pushSendsPerMonth: number | null;
  activeJourneys: number | null;
  aiCreditsPerMonth: number | null;
  eventsPerMonth: number | null;
}

export interface BillingUsage {
  plan: PlanName;
  periodStart: string;
  usage: { reachable_users: number; email_sends: number; push_sends: number; event_ingestion: number; active_journeys: number; ai_credits: number };
  limits: PlanLimits;
  overLimit: { reachableUsers: boolean; emailSends: boolean; pushSends: boolean; activeJourneys: boolean };
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  status: "draft" | "open" | "paid" | "uncollectible" | "void";
  currency: string;
  subtotalExcludingTax: number;
  tax: number;
  total: number;
  amountPaid: number;
  createdAt: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
}

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt?: string;
  state?: string;
  account: { id: string; email: string; name: string | null; avatarUrl?: string | null };
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

/** What the in-app checkout sends: a plan, an interval and the billing address. Never a price or amount. */
export interface CheckoutInput {
  plan: PaidPlan;
  interval: BillingInterval;
  address: { name: string; line1: string; line2?: string; city?: string; state?: string; postalCode?: string; country: string };
}

/** The first invoice as Stripe calculates it, in the smallest currency unit. `tax` is null until Stripe can place the address. */
export interface CheckoutTotals {
  currency: string;
  subtotal: number;
  tax: number | null;
  discount: number;
  total: number;
}

export interface BillingPaymentMethod {
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export interface SavedCard extends BillingPaymentMethod {
  id: string;
  name: string | null;
  isDefault: boolean;
}

/** Journey Automations: mirrors the backend's /journeys contract (see backend.md). */
export type JourneyDisplayStatus = "running" | "scheduled" | "draft" | "paused" | "archived";

/** One step as the API stores it. `meta` is the builder's own settings, returned unchanged. */
export interface JourneyStep {
  id?: string;
  key: string;
  type: "push" | "email" | "delay" | "condition" | "repeat" | "exit";
  templateId?: string;
  /** Email steps: replace the template's subject / sender name. */
  subject?: string;
  fromName?: string;
  /** Delay: "HH:MM" on a clock `utcOffset` minutes east of UTC. */
  time?: string;
  utcOffset?: number;
  /** Repeat: how many extra runs. */
  count?: number;
  amount?: number;
  unit?: "minutes" | "hours" | "days";
  until?: string;
  condition?: Record<string, unknown>;
  next?: string | null;
  onTrue?: string | null;
  onFalse?: string | null;
  meta?: Record<string, unknown>;
  stats?: { waiting?: number; completed?: number; exitedEarly?: number; sent?: number; opened?: number; clicked?: number; paused?: number; deleted?: number };
  /** Message steps: what the chosen template says. */
  template?: { name: string; title?: string; body?: string; subject?: string } | null;
}

export interface JourneyInput {
  name: string;
  trigger: "audience" | "event";
  entryEvent?: string | null;
  audience: { allUsers?: boolean; lifecycleSegmentIds?: string[]; audienceGroupIds?: string[] };
  exitOnAudienceLeave?: boolean;
  exitRules?: string[];
  steps: JourneyStep[];
}

export interface Journey extends JourneyInput {
  id: string;
  status: "draft" | "active" | "paused" | "archived";
  displayStatus: JourneyDisplayStatus;
  messageType: "push" | "email" | "mixed" | null;
  createdAt: string;
  activatedAt: string | null;
  participants?: Record<string, number>;
  entrance?: { entered: number; unreachable: number };
}

/** A row of GET /journeys. */
export interface JourneyListItem extends Omit<Journey, "steps"> {
  started: number;
  active: number;
  completed: number;
  exited: number;
}
