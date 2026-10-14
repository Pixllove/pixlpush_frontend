import { authRequest } from "@/lib/auth/client";

const BASE = "/api/projects";

const at = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}/ai${path}`;

export type AiAssistantId = "Max" | "Ben" | "Nova" | "Anna";
export type AiFlowId = "campaigns" | "journey" | "segment" | "audience-group" | "engagement";
export type AiResourceType = "journey" | "segment" | "audience-group" | "campaign";

export interface AiCreatedResource {
  type: AiResourceType;
  id: string;
  name: string;
  channel?: "email" | "push";
  status: "draft";
  href: string;
}

export interface AiAssistant {
  id: AiAssistantId;
  name: string;
  role: string;
  description: string;
  capabilities?: string[];
  instructions?: string;
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
  createdAt: string;
}

export interface AiInsight {
  title: string;
  message: string;
  metric: { key: string; value: number };
  actions: string[];
}

export interface AiProjectSnapshot {
  project: { id: string; name: string };
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
  generatedAt: string;
}

export interface AiProjectContext {
  project: AiProjectSnapshot;
  recentConversations: AiConversationPreview[];
  latestInsight: AiInsight;
  handoffHistory: Array<{ assistant: AiAssistantId; action: string; status: string }>;
  catalog?: AiCatalog;
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
  context: { generatedAt: string };
}

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
  chat: (
    projectId: string,
    input: { assistant: AiAssistantId; prompt: string; conversationId?: string },
    signal?: AbortSignal,
  ) => authRequest<AiChatResponse>(at(projectId, "/chat"), input, BASE, undefined, { signal }),
  createConversation: (
    projectId: string,
    input: { assistant: AiAssistantId; title?: string; flowId?: AiFlowId; opening?: { prompt: string; response?: string } },
    signal?: AbortSignal,
  ) => authRequest<AiConversation>(at(projectId, "/conversations"), input, BASE, undefined, { signal }),
  conversations: (projectId: string, search?: string) => {
    const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    return authRequest<AiConversationListResponse>(at(projectId, `/conversations${query}`), undefined, BASE);
  },
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
    input: { assistant: AiAssistantId; prompt?: string },
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
  conversation: (projectId: string, conversationId: string) =>
    authRequest<AiConversation & { messages: AiConversationMessage[] }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}`),
      undefined,
      BASE,
    ),
};
