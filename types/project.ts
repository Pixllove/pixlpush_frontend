/** Mirrors the backend's ProjectRole enum. */
export type ProjectRole = 'owner' | 'admin' | 'developer' | 'analyst' | 'read_only' | 'billing';

export type ProjectStatus = 'active' | 'deactivated';

export type ProjectEnvironment = 'development' | 'staging' | 'production';

export type PlanName = 'free' | 'starter' | 'pro' | 'enterprise';

/** A Project as returned by GET /projects and POST /projects. */
export interface Project {
  id: string;
  name: string;
  slug: string;
  status: ProjectStatus;
  role: ProjectRole;
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
  subscription: { plan: PlanName; status: string; currentPeriodStart: string } | null;
  _count?: { endUsers: number; members: number };
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

/** PATCH /projects/:projectId. Omitted keys are left unchanged. */
export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  environment?: ProjectEnvironment;
}

/** GET /projects/:id/firebase. Credentials themselves are never returned. */
export interface FirebaseSettings {
  status: 'not_configured' | 'connected' | 'error';
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
  status: 'active' | 'revoked';
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
  status: 'not_configured' | 'pending_verification' | 'verified' | 'error';
  lastError: string | null;
  lastCheckedAt: string | null;
  productionSendingEnabled: boolean;
}

export type UserImportStatus = 'uploaded' | 'mapped' | 'previewed' | 'committing' | 'completed' | 'failed' | 'expired';

/** One CSV user import. `sampleRows` are keyed by column header. */
export interface UserImport {
  id: string;
  fileName: string;
  status: UserImportStatus;
  headers: string[];
  sampleRows?: Record<string, string>[];
  totalRows: number;
  processedRows: number;
  results: { created: number; updated: number; unchanged: number; conflicts: number; errors: number; skipped: number };
  errorMessage: string | null;
  createdAt: string;
}

export interface CustomPropertyDef {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
}

export interface ImportSuggestions {
  customProperties: CustomPropertyDef[];
  suggestions: {
    sourceColumn: string;
    targetField: string | null;
    normalization?: 'email' | 'phone' | 'lowercase' | 'trim';
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
    overwriteMode?: 'overwrite' | 'fill_empty_only' | 'do_not_overwrite';
    normalization?: 'email' | 'phone' | 'lowercase' | 'trim';
  }[];
  customProperties: CustomPropertyDef[];
  saveMatchRule: boolean;
}

export interface ImportPreview {
  summary: { total: number; newUsers: number; existingUsers: number; unchanged: number; conflicts: number; invalid: number; skipped: number };
}

/** GET /users/stats: header counts for the Users page. */
export interface UserStats {
  total: number;
  reachable: number;
  eventsToday: number;
  eventsYesterday: number;
}
