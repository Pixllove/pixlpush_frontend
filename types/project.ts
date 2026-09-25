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
