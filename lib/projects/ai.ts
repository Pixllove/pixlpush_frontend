import { authRequest } from "@/lib/auth/client";

const BASE = "/api/projects";

const at = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}/ai${path}`;

/** Agents come from the backend registry; known ids keep autocomplete. */
export type AiAgentId = "Max" | "Ben" | "Nova" | "Anna" | (string & {});
/** Kept as an alias for the original Home AI contract. */
export type AiAssistantId = AiAgentId;
export type AiInteractionMode = "direct" | "handoff" | "consultation";
export type AiCollaborationApprovalStatus =
  | "not_required"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "needs_data"
  | "blocked";
export type AiAgentTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "needs_data"
  | "blocked"
  | "cancelled"
  | (string & {});

export type AiAgentResult = {
  taskKey: string;
  agentId: AiAgentId;
  status: "completed" | "failed" | "needs_data" | "blocked";
  summary: string;
  findings: string[];
  evidence: Array<{ label: string; value: string; source?: string }>;
  recommendations: string[];
  missingData: string[];
  confidence: "high" | "medium" | "low";
  approvalRequired: boolean;
  createdAt?: string;
};

export type AiCollaboration = {
  id: string;
  mode: AiInteractionMode;
  leadAgent: AiAgentId;
  activeAgent?: AiAgentId;
  currentAgent?: AiAgentId | null;
  nextAgent?: AiAgentId | null;
  participants: Array<{
    id?: string;
    agentId: AiAgentId;
    role: string;
    status: string;
    invitedAt?: string;
    joinedAt?: string | null;
    completedAt?: string | null;
  }>;
  tasks: Array<{
    id: string;
    taskKey: string;
    agentId: AiAgentId;
    type: string;
    status: AiAgentTaskStatus;
    attempt: number;
    maxAttempts: number;
    dependsOnTaskKey?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  }>;
  results: AiAgentResult[];
  events?: AiCollaborationEvent[];
  approvalRequired: boolean;
  approvalStatus: AiCollaborationApprovalStatus;
  maxSpecialistCalls: number;
  status?: string;
};

/** Normalized collaboration events returned by the backend. */
export type AiCollaborationEvent = {
  id: string;
  collaborationId: string;
  projectId?: string;
  conversationId?: string;
  type: string;
  actorAgent?: AiAgentId | null;
  targetAgent?: AiAgentId | null;
  payload: unknown;
  createdAt: string;
};

/** Normalized DTO returned by GET /conversations/:conversationId/collaborations. */
export type AiCollaborationHistory = AiCollaboration & {
  projectId?: string;
  accountId?: string;
  conversationId?: string;
  createdAt: string;
  updatedAt: string;
  events: AiCollaborationEvent[];
};

/** Compatibility alias for code that imported the old persisted-result name. */
export type AiStoredAgentResult = AiAgentResult & { id?: string; collaborationId?: string; createdAt?: string };
export interface AiHandoff { assistant: AiAssistantId; name: string; role: string; reason?: string }
export type AiFlowId = "campaigns" | "journey" | "segment" | "audience-group" | "engagement";
export type AiResourceType = "journey" | "segment" | "audience-group" | "campaign";

export interface AiCreatedResource {
  type: AiResourceType;
  id: string;
  name: string;
  channel?: "email" | "push" | "both";
  status: "draft";
  href: string;
}

export interface AiAssistant {
  id: AiAssistantId;
  name: string;
  role: string;
  description: string;
  avatar?: string;
  capabilities?: string[];
  canCreate?: AiResourceType[];
  coordinator?: boolean;
  instructions?: string;
  knowledge?: string[];
  boundaries?: string[];
}

export interface AiFlowDefinition {
  id: AiFlowId;
  title: string;
  subtitle: string;
  steps: Array<{ question: string; choices: string[] }>;
}

export interface AiNextAction {
  id: string;
  label: string;
  href: string;
}

export interface AiCatalog {
  assistants: AiAssistant[];
  prompts: string[];
  flows: AiFlowId[];
  flowDefinitions: AiFlowDefinition[];
  nextActions: AiNextAction[];
}

export interface AiConversationPreview {
  id: string;
  assistant: AiAssistantId;
  title: string | null;
  flowId: AiFlowId | null;
  pinnedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
  lastMessage: { role: "user" | "assistant" | "system"; content: string; createdAt: string } | null;
}

export interface AiConversation {
  id: string;
  projectId: string;
  accountId: string;
  assistant: AiAssistantId;
  title: string | null;
  flowId: AiFlowId | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  interaction?: AiInteraction | null;
  createdAt: string;
}

export type AiInteractionType =
  | "onboarding"
  | "business_analysis"
  | "goal_selection"
  | "journey_creation"
  | "push_creation"
  | "email_creation"
  | "improvement"
  | "analysis"
  | "preview"
  | "approval";

export type AiInteractionStatus =
  | "active"
  | "awaiting_input"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "failed"
  | "expired";

export type AiInteractionFieldOption = string | { label: string; value: string; description?: string };

export interface AiInteractionField {
  key: string;
  type: "text" | "url" | "choice" | "date" | "time" | "timezone" | "number" | "secure_upload" | "json" | (string & {});
  label: string;
  required?: boolean;
  options?: string[];
  sensitive?: boolean;
}

export type AiInteractionAction =
  | "next"
  | "submit"
  | "preview"
  | "approve"
  | "edit"
  | "analyze"
  | "save_draft"
  | "cancel"
  | "retry"
  | (string & {});

/** Structured popup contract returned by the backend. */
export interface AiInteraction {
  interactionId: string;
  type: AiInteractionType;
  flowId: string;
  status: AiInteractionStatus;
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  fields: AiInteractionField[];
  data: Record<string, unknown>;
  actions: AiInteractionAction[];
  requestKey: string;
}

export interface AiInteractionRequest {
  interactionId: string;
  requestKey: string;
  step: number;
  values?: Record<string, unknown>;
  action?: AiInteractionAction;
}

export interface AiInteractionResponse {
  conversationId?: string;
  assistant?: AiAgentId;
  message?: string;
  interaction?: AiInteraction | null;
  recommendation?: Record<string, unknown> | null;
  analysis?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  createdResources?: AiCreatedResource[];
  resourceMetadata?: Array<Record<string, unknown>>;
  savedAsDraft?: boolean;
  activationRequired?: boolean;
  nextActions?: string[];
  context?: { generatedAt: string };
}

function normalizeInteractionResponse(response: AiInteractionResponse | AiInteraction): AiInteractionResponse {
  return "interactionId" in response ? { interaction: response } : response;
}

export interface AiInsight {
  title: string;
  message: string;
  metric: { key: string; value: number };
  actions: string[];
}

export interface AiProjectSnapshot {
  project: { id: string; name: string; description: string | null };
  audience: {
    totalUsers: number;
    reachableByEmail: number;
    reachableByPush: number;
    reachableByBoth: number;
    reachableByEither: number;
    reachableByNeither: number;
    inactive14Days: number;
    active30Days: number;
  };
  activity: { knownEvents: Array<{ name: string; count: number; lastSeenAt: string }> };
  lifecycle: Array<{ id: string; name: string; users: number }>;
  campaigns: { email: number; push: number; total: number };
  journeys: { total: number };
  activitySummary: { total: number; last30Days: number };
  /** Setup state the Home prompts and Max use; absent on an older API. */
  setup?: { onboardingComplete: boolean; platforms: Array<"web" | "mobile">; firebaseConnected: boolean; pushReady: boolean; emailReady: boolean; sdkConnected: boolean };
  generatedAt: string;
}

export type AiOnboardingStepStatus = "complete" | "missing";

/** Normalized onboarding status returned by the AI context endpoint. */
export interface AiOnboardingStep {
  number: number;
  kind: string;
  title: string;
  status: AiOnboardingStepStatus;
  reason: string;
  action: string;
  href: string;
}

export interface AiOnboardingStatus {
  status: "skipped" | "complete" | "not_started" | "in_progress";
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  completionPercentage: number;
  platforms: string[];
  channels: string[];
  steps: AiOnboardingStep[];
  completedSteps: AiOnboardingStep[];
  missingSteps: AiOnboardingStep[];
  nextStep: AiOnboardingStep | null;
  firebaseConnected: boolean;
  pushReady: boolean;
  sdkReady: { mobile: boolean; web: boolean };
  emailReady: boolean;
  emailBlockers: unknown[];
}

/** A Home suggestion: ask Max, start a guided flow, or open the page where the user acts. */
export type AiSuggestedPrompt =
  | { label: string; action: "chat" }
  | { label: string; action: "flow"; flow: "campaigns" | "journey" | "segment"; prompt: string }
  | { label: string; action: "link"; href: string };

export interface AiBusinessContext {
  businessDescription: string | null;
  websiteUrl: string | null;
  websiteTitle: string | null;
  websiteSummary: string | null;
  websiteAnalyzedAt: string | null;
  hasMobileApp: boolean | null;
  appStoreUrl: string | null;
  googlePlayUrl: string | null;
  appName: string | null;
  appSummary: string | null;
  appAnalyzedAt: string | null;
  businessAnalysis: AiBusinessAnalysis | null;
  businessAnalysisConfirmedAt: string | null;
  updatedAt: string | null;
}

export interface AiBusinessAnalysis {
  elevatorPitch: string;
  businessModel: { classification: string; reasoning: string };
  businessStage: { classification: string; reasoning: string };
  coreProductOrService: string;
  idealCustomerProfile: Record<string, string>;
  icpPainPoints: { confirmed: string[]; likely: string[]; unknown: string[] };
  customerGoals: string[];
  buyingAndEngagementTriggers: Array<{ trigger: string; evidence: string; status: string } | string>;
  valueProposition: string[];
  objectionsAndBarriers: string[];
  messagingRecommendations: Record<string, string[]>;
}

export type AiBusinessContextUpdate = Partial<Omit<AiBusinessContext, "updatedAt" | "websiteAnalyzedAt" | "appAnalyzedAt">> & { businessAnalysisConfirmed?: boolean };

export interface AiProjectContext {
  project: AiProjectSnapshot;
  businessContext: AiBusinessContext;
  recentConversations: AiConversationPreview[];
  latestInsight: AiInsight;
  handoffHistory: Array<{ assistant: AiAssistantId; action: string; status: string }>;
  catalog?: AiCatalog;
  /** Four prompts for the customer's current stage (1 onboarding → 4 improve & grow). */
  suggestions?: { stage: 1 | 2 | 3 | 4; prompts: AiSuggestedPrompt[] };
  onboarding?: AiOnboardingStatus;
}

export interface AiConversationListResponse {
  items: AiConversationPreview[];
  hasMore: boolean;
  search: string | null;
}

export interface AiChatResponse {
  conversationId: string;
  assistant: AiAssistantId;
  provider: "rules" | "gemini";
  degraded?: boolean;
  cancelled?: boolean;
  message: string;
  nextActions: string[];
  evidence: Array<{ label: string; value: string }>;
  creationIntent?: {
    resourceType: AiResourceType;
    name: string;
    channel?: "email" | "push" | "both";
  };
  createdResources?: AiCreatedResource[];
  /** Set when another agent owns the request; the UI offers a switch. */
  handoff?: AiHandoff | null;
  mode?: AiInteractionMode;
  collaboration?: AiCollaboration | null;
  agentResult?: AiAgentResult;
  interaction?: AiInteraction | null;
  context: { generatedAt: string };
}

export type AiChatRequest = {
  assistant: AiAgentId;
  prompt: string;
  conversationId?: string;
  mode?: AiInteractionMode;
  requestedAgent?: AiAgentId;
  requestKey?: string;
  resourceType?: "campaign" | "journey";
  resourceId?: string;
  from?: string;
  to?: string;
};

export interface AiFlowDraftResponse {
  conversationId: string;
  flowId: AiFlowId;
  assistant: AiAssistantId;
  provider: "rules" | "gemini";
  degraded?: boolean;
  cancelled?: boolean;
  draft: Record<string, unknown>;
  summary: string;
  warnings: string[];
  createdResources?: AiChatResponse["createdResources"];
  context: {
    generatedAt: string;
    audience: AiProjectContext["project"]["audience"];
  };
}

export const aiApi = {
  catalog: (projectId: string) =>
    authRequest<AiCatalog>(at(projectId, "/assistants"), undefined, BASE),
  context: (projectId: string) =>
    authRequest<AiProjectContext>(at(projectId, "/context"), undefined, BASE),
  businessContext: (projectId: string) =>
    authRequest<AiBusinessContext>(at(projectId, "/business-context"), undefined, BASE),
  updateBusinessContext: (
    projectId: string,
    input: AiBusinessContextUpdate,
  ) => authRequest<AiBusinessContext>(at(projectId, "/business-context"), input, BASE, "PATCH"),
  analyzeBusinessContext: (
    projectId: string,
    input: { kind: "website" | "app"; url: string; appStoreUrl?: string | null; googlePlayUrl?: string | null },
  ) => authRequest<AiBusinessContext>(at(projectId, "/business-context/analyze"), input, BASE, "POST"),
  detectBusinessContextLinks: (projectId: string, input: { url: string }) =>
    authRequest<{ websiteUrl: string; appStoreUrl: string | null; googlePlayUrl: string | null }>(at(projectId, "/business-context/detect-links"), input, BASE, "POST"),
  chat: (
    projectId: string,
    input: AiChatRequest,
    signal?: AbortSignal,
  ) => authRequest<AiChatResponse>(at(projectId, "/chat"), input, BASE, undefined, { signal }),
  collaborations: (projectId: string, conversationId: string) =>
    authRequest<AiCollaborationHistory[]>(at(projectId, `/conversations/${encodeURIComponent(conversationId)}/collaborations`), undefined, BASE),
  approveCollaboration: (projectId: string, collaborationId: string) =>
    authRequest<{ collaborationId: string; approvalStatus: "approved"; activationRequired: true; message: string }>(
      at(projectId, `/collaborations/${encodeURIComponent(collaborationId)}/approve`),
      undefined,
      BASE,
      "POST",
    ),
  /** Available for deployments that expose the optional rejection endpoint. */
  rejectCollaboration: (projectId: string, collaborationId: string) =>
    authRequest<{ collaborationId: string; approvalStatus: "rejected"; message: string }>(
      at(projectId, `/collaborations/${encodeURIComponent(collaborationId)}/reject`),
      undefined,
      BASE,
      "POST",
    ),
  cancelCollaboration: (projectId: string, collaborationId: string) =>
    authRequest<{ collaborationId: string; status: "cancelled" }>(
      at(projectId, `/collaborations/${encodeURIComponent(collaborationId)}/cancel`),
      undefined,
      BASE,
      "POST",
    ),
  createConversation: (
    projectId: string,
    input: { assistant: AiAssistantId; title?: string; flowId?: AiFlowId; opening?: { prompt: string; response?: string } },
    signal?: AbortSignal,
  ) => authRequest<AiConversation>(at(projectId, "/conversations"), input, BASE, undefined, { signal }),
  conversations: (projectId: string, search?: string) => {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return authRequest<AiConversationListResponse>(at(projectId, `/conversations${query}`), undefined, BASE);
  },
  pinConversation: (projectId: string, conversationId: string, pinned: boolean) =>
    authRequest<{ conversationId: string; pinnedAt: string | null }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}`),
      { pinned },
      BASE,
      "PATCH",
    ),
  deleteConversation: (projectId: string, conversationId: string) =>
    authRequest<{ conversationId: string; deleted: true }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}`),
      undefined,
      BASE,
      "DELETE",
    ),
  cancelConversation: (projectId: string, conversationId: string, reason = "user_stopped") =>
    authRequest<{ conversationId: string; status: "cancelled"; recordedAt: string }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}/cancel`),
      { reason },
      BASE,
      "POST",
    ),
  /** Retry or edit: answers the thread's latest message again (or `prompt` in its place) and replaces that turn. */
  regenerate: (
    projectId: string,
    conversationId: string,
    input: Pick<AiChatRequest, "assistant" | "prompt" | "mode" | "requestedAgent" | "requestKey" | "resourceType" | "resourceId" | "from" | "to">,
    signal?: AbortSignal,
  ) => authRequest<AiChatResponse>(at(projectId, `/conversations/${encodeURIComponent(conversationId)}/regenerate`), input, BASE, undefined, { signal }),
  flowDraft: (
    projectId: string,
    flowId: AiFlowId,
    input: { assistant: AiAssistantId; answers: Record<string, string>; conversationId?: string },
    signal?: AbortSignal,
  ) => authRequest<AiFlowDraftResponse>(at(projectId, `/flows/${encodeURIComponent(flowId)}/draft`), input, BASE, undefined, { signal }),
  flowCreate: (
    projectId: string,
    flowId: AiFlowId,
    input: { assistant: AiAssistantId; answers: Record<string, string>; conversationId?: string },
    signal?: AbortSignal,
  ) => authRequest<AiFlowDraftResponse & { createdResources: NonNullable<AiChatResponse["createdResources"]> }>(at(projectId, `/flows/${encodeURIComponent(flowId)}/create`), input, BASE, undefined, { signal }),
  submitInteraction: (projectId: string, input: AiInteractionRequest, signal?: AbortSignal) =>
    authRequest<AiInteractionResponse | AiInteraction>(at(projectId, `/interactions/${encodeURIComponent(input.interactionId)}/submit`), input, BASE, "POST", { signal }).then(normalizeInteractionResponse),
  cancelInteraction: (projectId: string, input: Pick<AiInteractionRequest, "interactionId" | "requestKey">, signal?: AbortSignal) =>
    authRequest<AiInteractionResponse | AiInteraction>(at(projectId, `/interactions/` + encodeURIComponent(input.interactionId) + `/cancel`), { requestKey: input.requestKey }, BASE, "POST", { signal }).then(normalizeInteractionResponse),
  retryInteraction: (projectId: string, input: Pick<AiInteractionRequest, "interactionId" | "requestKey">, signal?: AbortSignal) =>
    authRequest<AiInteractionResponse | AiInteraction>(at(projectId, `/interactions/` + encodeURIComponent(input.interactionId) + `/retry`), { requestKey: input.requestKey }, BASE, "POST", { signal }).then(normalizeInteractionResponse),
  reloadInteraction: (projectId: string, input: Pick<AiInteractionRequest, "interactionId" | "requestKey">, signal?: AbortSignal) => {
    const requestKey = input.requestKey ? "?requestKey=" + encodeURIComponent(input.requestKey) : "";
    return authRequest<AiInteraction>(at(projectId, `/interactions/` + encodeURIComponent(input.interactionId) + requestKey), undefined, BASE, undefined, { signal }).then(normalizeInteractionResponse);
  },
  conversation: (projectId: string, conversationId: string) =>
    authRequest<AiConversation & { messages: AiConversationMessage[] }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}`),
      undefined,
      BASE,
    ),
};
