import { authRequest } from "@/lib/auth/client";

const BASE = "/api/projects";

const at = (projectId: string, path = "") =>
  `/${encodeURIComponent(projectId)}/ai${path}`;

export type AiAssistantId = "Max" | "Ben" | "Nova" | "Anna";
export type AiFlowId = "campaigns" | "journey" | "segment" | "audience-group" | "engagement";

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
  lastMessage: { role: "user" | "assistant"; content: string; createdAt: string } | null;
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

export interface AiChatResponse {
  conversationId: string;
  assistant: AiAssistantId;
  provider: "rules" | "gemini";
  degraded?: boolean;
  message: string;
  nextActions: string[];
  evidence: Array<{ label: string; value: string }>;
  creationIntent?: {
    resourceType: "journey" | "segment" | "audience-group" | "campaign";
    name: string;
    channel?: "email" | "push" | "both";
  };
  createdResources?: Array<{
    type: "journey" | "segment" | "audience-group" | "campaign";
    id: string;
    name: string;
    channel?: "email" | "push";
    status: "draft";
    href: string;
  }>;
  context: { generatedAt: string };
}

export interface AiFlowDraftResponse {
  conversationId: string;
  flowId: AiFlowId;
  assistant: AiAssistantId;
  provider: "rules" | "gemini";
  degraded?: boolean;
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
  ) => authRequest<AiChatResponse>(at(projectId, "/chat"), input, BASE),
  createConversation: (
    projectId: string,
    input: { assistant: AiAssistantId; title?: string; flowId?: AiFlowId; opening?: { prompt: string; response: string } },
  ) => authRequest<AiConversation>(at(projectId, "/conversations"), input, BASE),
  /** Retry or edit: answers the thread's latest message again (or `prompt` in its place) and replaces that turn. */
  regenerate: (
    projectId: string,
    conversationId: string,
    input: { assistant: AiAssistantId; prompt?: string },
  ) => authRequest<AiChatResponse>(at(projectId, `/conversations/${encodeURIComponent(conversationId)}/regenerate`), input, BASE),
  flowDraft: (
    projectId: string,
    flowId: AiFlowId,
    input: { assistant: AiAssistantId; answers: Record<string, string>; conversationId?: string },
  ) => authRequest<AiFlowDraftResponse>(at(projectId, `/flows/${encodeURIComponent(flowId)}/draft`), input, BASE),
  flowCreate: (
    projectId: string,
    flowId: AiFlowId,
    input: { assistant: AiAssistantId; answers: Record<string, string>; conversationId?: string },
  ) => authRequest<AiFlowDraftResponse & { createdResources: NonNullable<AiChatResponse["createdResources"]> }>(at(projectId, `/flows/${encodeURIComponent(flowId)}/create`), input, BASE),
  conversation: (projectId: string, conversationId: string) =>
    authRequest<{ id: string; messages: Array<{ id: string; role: "user" | "assistant"; content: string; createdAt: string }> }>(
      at(projectId, `/conversations/${encodeURIComponent(conversationId)}`),
      undefined,
      BASE,
    ),
};
