"use client";

import { AddRounded, ArrowForwardRounded, ArrowUpwardRounded, AutoAwesomeRounded, AutoGraphRounded, CampaignRounded, CheckRounded, CloseRounded, ContentCopyRounded, DeleteOutlineRounded, EditOutlined, ExpandMoreRounded, HistoryRounded, InfoOutlined, InsightsRounded, LinkRounded, PeopleAltOutlined, PhoneIphoneRounded, PsychologyRounded, ReplayRounded, RouteRounded, SearchRounded, StopRounded, TrendingDownRounded } from "@mui/icons-material";
import { Alert, Box, Button, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, InputBase, Menu, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import Image from "next/image";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { accountGreetingName } from "@/lib/auth/display-name";
import { aiApi, type AiAssistantId, type AiBusinessContext, type AiBusinessContextUpdate, type AiConversationMessage, type AiConversationPreview, type AiCreatedResource, type AiFlowId, type AiFlowDraftResponse, type AiProjectContext, type AiResourceType } from "@/lib/projects/ai";
import { audienceGroupsApi, emailApi, firebaseApi, journeysApi, lifecycleSegmentsApi, pushApi, sdkKeyApi } from "@/lib/projects/api";
import type { AudienceGroup, LifecycleSegment } from "@/types/project";
import DeleteConfirmDialog from "@/components/dashboard/DeleteConfirmDialog";

/** `flow` marks a guided-flow turn (it is re-run, not edited); `error` an answer that never arrived, so nothing was stored for it. */
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  flow?: boolean;
  error?: boolean;
  suggestedFlow?: Exclude<AiFlowId, "engagement">;
  createdResources?: AiCreatedResource[];
  assistant?: AiAssistantId;
};
type DraftInput = { flowId: AiFlowId; answers: Record<string, string>; conversationId?: string; assistant?: AiAssistantId };
type FlowChoice = { label: string; description: string; disabled?: boolean };
type GuidedFlow = { id: AiFlowId; title: string; subtitle: string; steps: Array<{ question: string; choices: FlowChoice[] }> };
type FlowStep = GuidedFlow["steps"][number];
type AnalysisType = "email" | "push" | "journey";
type AnalysisPhase = "type" | "resource" | "period" | "confirm";

const journeyChoiceExplanations: Record<string, string> = {
  "An event or action": "A single action a user takes in your product, such as closing the app, clicking a button, opening a screen, viewing a paywall, or completing a purchase. Events are tracked through the PixlPush SDK.",
  "Audience group entry": "A target group that can be created without development effort. For example, users who belong to the “Paywall Drop-off” lifecycle segment and also live in Germany. Manually imported user lists can also be created as an Audience Group during import.",
  "Lifecycle segment entry": "The PixlPush SDK tracks product events. These events are used to create a user group, such as users who registered but did not complete onboarding, paying users, or users who dropped off at the paywall.",
};

const analysisPeriods = ["Last 7 days", "Last 30 days", "Last 90 days", "All time"];

const prompts = [
  ["What should I work on today?", AutoAwesomeRounded],
  ["Find users at risk of churning", TrendingDownRounded],
  ["Create a reactivation journey", InsightsRounded],
  ["Improve my onboarding", AutoGraphRounded],
] as const;

const agents = [
  ["Max", "Growth Concierge", "Coordinates the team and turns your goal into a clear next step.", "/assets/agent-avatar-max-v2.png"],
  ["Ben", "Lifecycle & Campaign Data Analyst", "Analyzes retention, churn, campaigns and audience behavior.", "/assets/agent-avatar-ben-v2.png"],
  ["Nova", "Campaign & Journey Creator", "Creates new journeys and improves existing campaigns and journeys.", "/assets/agent-avatar-nova-v2.png"],
  ["Anna", "Cross-Sell & Marketing Expert", "Creates and improves email campaigns and content.", "/assets/agent-avatar-anna-v3.png"],
] as const;

const shortcuts = [
  [CampaignRounded, "Create campaign", "Build a message with the right audience and channel.", "campaigns"],
  [RouteRounded, "Create journey", "Map the trigger and next steps for an automated flow.", "journey"],
  [PeopleAltOutlined, "Create segment", "Define the filters for a focused audience.", "segment"],
  [AutoGraphRounded, "Create audience group", "Organize users around a shared goal or behavior.", "audience-group"],
] as const;

const guidedFlows: GuidedFlow[] = [
  {
    id: "campaigns",
    title: "New campaign",
    subtitle: "I’ll help you define the audience, message and delivery channel before creating a campaign.",
    steps: [
      { question: "What is this campaign for?", choices: [
        { label: "Win back inactive users", description: "Reconnect with people who have gone quiet." },
        { label: "Announce something new", description: "Share a launch, update or important news." },
        { label: "Drive a conversion", description: "Move people toward a purchase or key action." },
        { label: "Something else?", description: "Tell Max what you have in mind." },
      ] },
      { question: "Which channel should we use?", choices: [
        { label: "Push notification", description: "Reach users with a timely mobile message." },
        { label: "Email", description: "Send a richer message to your audience." },
        { label: "Email + push", description: "Coordinate both channels in one campaign." },
        { label: "Something else?", description: "Choose another delivery approach." },
      ] },
      { question: "Who should receive it?", choices: [
        { label: "All reachable users", description: "Include everyone who can receive messages." },
        { label: "A specific audience", description: "Use a saved segment or audience definition." },
        { label: "Users matching a behavior", description: "Target people based on what they did." },
        { label: "Something else?", description: "Describe the audience you want to reach." },
      ] },
    ],
  },
  {
    id: "journey",
    title: "New journey",
    subtitle: "I’ll understand your goal, audience and channels before recommending the journey.",
    steps: [
      { question: "What is the purpose of this journey?", choices: [
        { label: "Engagement", description: "Bring users back and encourage meaningful activity." },
        { label: "Retention", description: "Keep users active and reduce churn." },
        { label: "Paywall drop-off", description: "Help users who viewed or left a paywall." },
        { label: "Upsell", description: "Guide users toward a higher-value plan or feature." },
        { label: "Onboarding", description: "Help new users reach their first success." },
        { label: "Something else?", description: "Describe the outcome you want." },
      ] },
      { question: "What should start this journey?", choices: [
        { label: "An event or action", description: "Start when a user does something important." },
        { label: "Audience group entry", description: "Start when someone joins a saved audience group." },
        { label: "Lifecycle segment entry", description: "Start when someone joins a saved lifecycle segment." },
        { label: "All reachable users", description: "Use with caution. This targets all users reachable by email or push. Choose an audience group or lifecycle segment for more control." },
        { label: "Something else?", description: "Describe the moment that should start it." },
      ] },
      { question: "Which channels should we use?", choices: [
        { label: "Email", description: "Use email for richer, detailed communication." },
        { label: "Push", description: "Use push for timely, direct notifications." },
        { label: "Multichannel", description: "Push first, with email fallback when push cannot reach the user." },
      ] },
      { question: "Who should create the journey content?", choices: [
        { label: "I’ll write the content myself", description: "You write the messages. Nova provides the recommended journey structure only." },
        { label: "Let Nova draft it for my review", description: "Nova uses your saved business context to draft the messages. You review everything before anything is sent." },
      ] },
    ],
  },
  {
    id: "segment",
    title: "New audience segment",
    subtitle: "I’ll use your answers to design the filters and preview the audience size before creating it.",
    steps: [
      { question: "What’s the main goal of this segment?", choices: [
        { label: "Re-engage inactive users", description: "People who haven't opened the app recently" },
        { label: "Target active / high-intent users", description: "Frequent or recently active users" },
        { label: "Geo or language targeting", description: "Specific countries or languages" },
        { label: "Tag-based targeting", description: "Based on custom attributes you've set (e.g. plan, status)" },
        { label: "Something else?", description: "Describe the audience you want to build." },
      ] },
      { question: "Which platforms should it include?", choices: [
        { label: "All platforms", description: "No device restriction" },
        { label: "Mobile (iOS/Android)", description: "App users only" },
        { label: "Web Push", description: "Browser subscribers" },
        { label: "Email / SMS", description: "Messaging channels" },
        { label: "Something else?", description: "Choose another platform mix." },
      ] },
      { question: "Only subscribers who can receive messages?", choices: [
        { label: "Yes, subscribed only", description: "Exclude opted-out users (notification_types > 0)" },
        { label: "No, include everyone", description: "Match regardless of subscription status" },
        { label: "Something else?", description: "Define a different eligibility rule." },
      ] },
      { question: "Which countries or languages should we include?", choices: [
        { label: "All locations", description: "Keep the segment global." },
        { label: "Selected countries", description: "Choose specific countries to target." },
        { label: "A language", description: "Reach users with a shared language preference." },
        { label: "Something else?", description: "Describe the location or language filter." },
      ] },
    ],
  },
  {
    id: "audience-group",
    title: "New audience group",
    subtitle: "I’ll help you organize the right users into a reusable group for campaigns and journeys.",
    steps: [
      { question: "What should this audience group help you do?", choices: [
        { label: "Reach a specific customer type", description: "Group users who share a meaningful profile or plan." },
        { label: "Follow a user behavior", description: "Group people based on what they did in your product." },
        { label: "Support a campaign or journey", description: "Create a reusable audience for an activation flow." },
        { label: "Something else?", description: "Describe the group you want to organize." },
      ] },
      { question: "Which users should belong to it?", choices: [
        { label: "All reachable users", description: "Start with everyone who can receive messages." },
        { label: "Users from an existing segment", description: "Build on a saved audience definition." },
        { label: "Users matching a behavior", description: "Use activity, events or engagement signals." },
        { label: "Something else?", description: "Tell Max who should be included." },
      ] },
      { question: "How should we keep the group updated?", choices: [
        { label: "Update automatically", description: "Users enter and leave as their data changes." },
        { label: "Keep it as a fixed snapshot", description: "Save the current audience for a specific use." },
        { label: "Review before saving", description: "Preview the rules and audience size first." },
        { label: "Something else?", description: "Choose another way to manage this group." },
      ] },
    ],
  },
  {
    id: "engagement",
    title: "Improve engagement",
    subtitle: "I’ll identify the strongest opportunity and help you choose the next growth action.",
    steps: [
      { question: "What do you want to improve?", choices: [
        { label: "Push opens", description: "Help more users open your notifications." },
        { label: "Email opens", description: "Improve subject lines and email timing." },
        { label: "Clicks", description: "Turn more messages into meaningful actions." },
        { label: "Repeat sessions", description: "Bring users back more often." },
        { label: "Something else?", description: "Tell Max about the outcome you want." },
      ] },
      { question: "Which audience should we focus on?", choices: [
        { label: "New users", description: "Help people who have just joined." },
        { label: "Active users", description: "Build on existing interest and intent." },
        { label: "At-risk users", description: "Reach people showing signs of churn." },
        { label: "All reachable users", description: "Look for an opportunity across your audience." },
      ] },
      { question: "How should we act?", choices: [
        { label: "Create a campaign", description: "Draft a focused message to send." },
        { label: "Build a journey", description: "Automate a sequence of touchpoints." },
        { label: "Review the audience", description: "Inspect the users and signals first." },
        { label: "Something else?", description: "Choose another next step." },
      ] },
    ],
  },
];

function relevantJourneyEvents(purpose?: string) {
  if (purpose === "Engagement") return ["app_closed", "session_ended"];
  if (purpose === "Retention") return ["app_opened", "session_started", "user_engagement", "purchase_completed", "subscription_started"];
  if (purpose === "Upsell") return ["purchase_completed", "plan_viewed", "feature_limit_reached", "subscription_started"];
  if (purpose === "Onboarding") return ["account_created", "signup_completed", "onboarding_started", "profile_created"];
  return [];
}

function journeyStepsFor(answers: Record<number, string>, groups: AudienceGroup[], segments: LifecycleSegment[], sdkIntegrated: boolean, paywallEventsReady: boolean, knownEvents: Set<string>, pushReady: boolean): FlowStep[] {
  const base = guidedFlows.find((flow) => flow.id === "journey")!.steps;
  const trigger = answers[1];
  const steps = base.slice();
  const paywallDropOff = answers[0] === "Paywall drop-off";
  const purposeEvents = relevantJourneyEvents(answers[0]);
  const hasRelevantEvents = purposeEvents.length === 0 || purposeEvents.some((event) => knownEvents.has(event));
  if (paywallDropOff) {
    steps[1] = {
      ...steps[1],
      choices: [{
        label: "Lifecycle segment entry",
        description: "Required for detecting paywall drop-off users.",
        disabled: !sdkIntegrated || !paywallEventsReady,
      }],
    };
  } else {
    steps[1] = {
      ...steps[1],
      choices: steps[1].choices.map((choice) => choice.label === "Lifecycle segment entry"
        ? { ...choice, disabled: !sdkIntegrated }
        : choice.label === "An event or action"
          ? { ...choice, disabled: !sdkIntegrated || !hasRelevantEvents }
        : choice),
    };
  }
  if (trigger === "Audience group entry") {
    steps.splice(2, 0, {
      question: "Which audience group should this journey use?",
      choices: [
        { label: "Create a new audience group", description: "Define a new audience for this journey." },
        ...groups.map((group) => ({ label: group.name, description: "Choose this existing audience group." })),
      ],
    });
  } else if (sdkIntegrated && trigger === "Lifecycle segment entry") {
    steps.splice(2, 0, {
      question: "Which lifecycle segment should this journey use?",
      choices: [
        { label: "Create a new lifecycle segment", description: "Define a new lifecycle segment for this journey." },
        ...segments.map((segment) => ({ label: segment.name, description: "Choose this existing lifecycle segment." })),
      ],
    });
  }
  const channelStepIndex = steps.findIndex((step) => step.question === "Which channels should we use?");
  if (channelStepIndex >= 0) {
    steps[channelStepIndex] = {
      ...steps[channelStepIndex],
      choices: steps[channelStepIndex].choices.map((choice) => choice.label === "Push" || choice.label === "Multichannel"
        ? { ...choice, disabled: !pushReady }
        : choice),
    };
  }
  return steps;
}

type CreationFlowId = Exclude<AiFlowId, "engagement">;

const creationFlowMeta: Record<CreationFlowId, { label: string; description: string; action: string }> = {
  campaigns: { label: "campaign", description: "Create a message for a specific audience and channel.", action: "Open campaign drafts" },
  journey: { label: "journey", description: "Map the trigger, audience and next steps for an automated flow.", action: "Open journeys" },
  segment: { label: "segment", description: "Define filters for a focused, reusable audience.", action: "Open segments" },
  "audience-group": { label: "audience group", description: "Organize users around a shared goal or behavior.", action: "Open audience groups" },
};

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1),
      );
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column];
  }
  return previous[right.length];
}

function hasNearToken(tokens: string[], target: string) {
  return tokens.some((token) => token === target || (token.length >= 5 && editDistance(token, target) <= 1));
}

/** Recognises ordinary phrasing and common typos before the request reaches the general chat route. */
export function detectCreationFlow(value: string): CreationFlowId | null {
  const normalized = value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return null;
  const tokens = normalized.split(/\s+/);
  const hasCreationIntent = /\b(create|make|build|start|setup|set up|draft|prepare|launch|add|new)\b/.test(normalized)
    || /\b(i need|id like|i want|help me with|can you)\b/.test(normalized);
  if (!hasCreationIntent) return null;

  const hasAudienceGroup = (hasNearToken(tokens, "audience") && hasNearToken(tokens, "group"))
    || /audience\s*group/.test(normalized)
    || /targeting\s+group/.test(normalized);
  if (hasAudienceGroup) return "audience-group";
  if (hasNearToken(tokens, "campaign") || hasNearToken(tokens, "compaign")) return "campaigns";
  if (hasNearToken(tokens, "journey") || hasNearToken(tokens, "automation")) return "journey";
  if (hasNearToken(tokens, "segment") || /lifecycle\s+audience/.test(normalized)) return "segment";
  return null;
}

function flowForResource(resourceType: AiResourceType): CreationFlowId {
  return resourceType === "campaign" ? "campaigns" : resourceType;
}

function resourceHref(resource: AiCreatedResource) {
  const params = new URLSearchParams({ highlight: resource.id });
  if (resource.type === "journey") return `/dashboard/journeys/builder?id=${encodeURIComponent(resource.id)}`;
  if (resource.type === "segment") return `/dashboard/users?tab=segments&${params}`;
  if (resource.type === "audience-group") return `/dashboard/users?tab=groups&${params}`;
  return `/dashboard/${resource.channel === "push" ? "push" : "email"}?tab=drafts&${params}`;
}

function flowHref(flow: CreationFlowId) {
  if (flow === "journey") return "/dashboard/journeys";
  if (flow === "segment") return "/dashboard/users?tab=segments";
  if (flow === "audience-group") return "/dashboard/users?tab=groups";
  return "/dashboard/email?tab=drafts";
}

function CreationOptions({ flow, onStart, onOpen }: { flow: CreationFlowId; onStart: () => void; onOpen: () => void }) {
  const meta = creationFlowMeta[flow];
  return <Box className="chat-creation-options">
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
      <Box>
        <Typography className="chat-creation-options-title">I can help you create a {meta.label}.</Typography>
        <Typography className="chat-creation-options-copy">{meta.description}</Typography>
      </Box>
      <AutoAwesomeRounded className="chat-creation-options-icon" aria-hidden />
    </Stack>
    <Stack direction={{ xs: "column", sm: "row" }} gap={1} className="chat-creation-options-actions">
      <Button variant="contained" onClick={onStart}>Use guided setup</Button>
      <Button variant="outlined" onClick={onOpen}>{meta.action}</Button>
    </Stack>
  </Box>;
}

function CreatedResourceActions({ resources }: { resources: AiCreatedResource[] }) {
  return <Box className="chat-created-resources" role="status" aria-live="polite">
    <Stack direction="row" alignItems="center" gap={1}>
      <CheckRounded className="chat-created-check" />
      <Typography className="chat-created-title">Draft created</Typography>
    </Stack>
    <Typography className="chat-created-copy">Open the new draft in its workspace to review and finish it.</Typography>
    <Stack gap={.75} className="chat-created-list">
      {resources.map((resource) => <Stack key={`${resource.type}-${resource.id}`} direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={1} className="chat-created-row">
        <Box sx={{ minWidth: 0 }}><Typography className="chat-created-name" noWrap>{resource.name}</Typography><Typography className="chat-created-type">{resource.type === "audience-group" ? "Audience group" : resource.type === "segment" ? "Lifecycle segment" : resource.type === "journey" ? "Journey" : `${resource.channel === "both" ? "Multichannel" : resource.channel === "push" ? "Push" : "Email"} campaign`}</Typography></Box>
        <Button size="small" variant="outlined" href={resourceHref(resource)} endIcon={<ArrowForwardRounded />}>Open</Button>
      </Stack>)}
    </Stack>
  </Box>;
}

type BusinessContextPhase = "website" | "analysis" | "description" | "app-choice" | "app-link" | "review";

const emptyBusinessContext: AiBusinessContext = {
  businessDescription: null,
  websiteUrl: null,
  websiteTitle: null,
  websiteSummary: null,
  websiteAnalyzedAt: null,
  hasMobileApp: null,
  appStoreUrl: null,
  googlePlayUrl: null,
  appName: null,
  appSummary: null,
  appAnalyzedAt: null,
  businessAnalysis: null,
  businessAnalysisConfirmedAt: null,
  updatedAt: null,
};

function firstBusinessContextPhase(context: AiBusinessContext): BusinessContextPhase {
  if (!context.websiteUrl?.trim()) return "website";
  if (context.businessAnalysis && !context.businessAnalysisConfirmedAt) return "analysis";
  if (!context.businessDescription?.trim()) return "description";
  return "review";
}

function BusinessAnalysisSummary({ analysis, onConfirm, onSave, onRevise, onBack, saving }: { analysis: NonNullable<AiBusinessContext["businessAnalysis"]>; onConfirm: () => void; onSave: (analysis: NonNullable<AiBusinessContext["businessAnalysis"]>) => void; onRevise: () => void; onBack: () => void; saving: boolean }) {
  const [editing, setEditing] = useState(false);
  const [edited, setEdited] = useState(analysis);
  useEffect(() => setEdited(analysis), [analysis]);
  const businessStage = analysis.businessStage ?? { classification: "Unknown", reasoning: "The product stage has not been confirmed." };
  const list = (values: unknown) => {
    const normalized = Array.isArray(values) ? values : typeof values === "string" && values.trim() ? [values] : [];
    return normalized.length ? <ul>{normalized.map((value, index) => <li key={`${String(value)}-${index}`}>{typeof value === "string" ? value : JSON.stringify(value)}</li>)}</ul> : <Typography className="business-context-muted">Unknown</Typography>;
  };
  const lines = (values: string[]) => values.join("\n");
  const updateList = (key: "customerGoals" | "valueProposition" | "objectionsAndBarriers", value: string) => setEdited((current) => ({ ...current, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) }));
  const updatePainPoints = (key: "confirmed" | "likely" | "unknown", value: string) => setEdited((current) => ({ ...current, icpPainPoints: { ...current.icpPainPoints, [key]: value.split("\n").map((item) => item.trim()).filter(Boolean) } }));
  const updateIcp = (key: string, value: string) => setEdited((current) => ({ ...current, idealCustomerProfile: { ...current.idealCustomerProfile, [key]: value } }));
  if (editing) return <Box className="business-context-analysis">
    <Typography className="guided-flow-question">Edit your business profile</Typography>
    <Typography className="business-context-analysis-intro">Update the existing analysis below. Use one item per line for lists. Your changes will be saved to this profile.</Typography>
    <Stack gap={1.25}>
      <TextField fullWidth multiline minRows={3} label="30-second elevator pitch" value={edited.elevatorPitch} onChange={(event) => setEdited((current) => ({ ...current, elevatorPitch: event.target.value }))} />
      <TextField fullWidth label="Business/product stage" value={edited.businessStage?.classification ?? "Unknown"} onChange={(event) => setEdited((current) => ({ ...current, businessStage: { ...current.businessStage, classification: event.target.value } }))} />
      <TextField fullWidth multiline minRows={2} label="Stage reasoning" value={edited.businessStage?.reasoning ?? ""} onChange={(event) => setEdited((current) => ({ ...current, businessStage: { ...current.businessStage, reasoning: event.target.value } }))} />
      <TextField fullWidth multiline minRows={2} label="Core product or service" value={edited.coreProductOrService} onChange={(event) => setEdited((current) => ({ ...current, coreProductOrService: event.target.value }))} />
      {[["primary", "Primary customer"], ["secondary", "Secondary customer"], ["buyer", "Buyer"], ["userVsBuyer", "User vs. buyer"], ["companyOrUserType", "Company or user type"], ["industryOrUseCase", "Industry or use case"]].map(([key, label]) => <TextField key={key} fullWidth label={label} value={edited.idealCustomerProfile[key] ?? ""} onChange={(event) => updateIcp(key, event.target.value)} />)}
      <TextField fullWidth multiline minRows={3} label="Confirmed ICP pain points" value={lines(edited.icpPainPoints.confirmed)} onChange={(event) => updatePainPoints("confirmed", event.target.value)} helperText="One item per line" />
      <TextField fullWidth multiline minRows={3} label="Likely ICP pain points" value={lines(edited.icpPainPoints.likely)} onChange={(event) => updatePainPoints("likely", event.target.value)} helperText="One item per line" />
      <TextField fullWidth multiline minRows={3} label="Unknown pain points or questions" value={lines(edited.icpPainPoints.unknown)} onChange={(event) => updatePainPoints("unknown", event.target.value)} helperText="One item per line" />
      <TextField fullWidth multiline minRows={3} label="Customer goals" value={lines(edited.customerGoals)} onChange={(event) => updateList("customerGoals", event.target.value)} helperText="One item per line" />
      <TextField fullWidth multiline minRows={3} label="Value proposition" value={lines(edited.valueProposition)} onChange={(event) => updateList("valueProposition", event.target.value)} helperText="One item per line" />
      <TextField fullWidth multiline minRows={3} label="Objections and barriers" value={lines(edited.objectionsAndBarriers)} onChange={(event) => updateList("objectionsAndBarriers", event.target.value)} helperText="One item per line" />
    </Stack>
    <Stack direction="row" justifyContent="space-between" gap={.75} sx={{ mt: 2 }}><Button className="guided-flow-secondary" onClick={onBack} disabled={saving}>Back</Button><Stack direction="row" gap={.75}><Button className="guided-flow-secondary" onClick={() => { setEdited(analysis); setEditing(false); }} disabled={saving}>Cancel</Button><Button className="guided-flow-next" variant="contained" onClick={() => { onSave(edited); setEditing(false); }} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></Stack></Stack>
  </Box>;
  return <Box className="business-context-analysis">
    <Typography className="guided-flow-question">Here’s my current understanding of your business</Typography>
    <Typography className="business-context-analysis-intro">I analyzed your website and business information. Please review this profile before I use it to recommend campaigns and journeys.</Typography>
    <Stack gap={1.25}>
      <Box><Typography className="business-context-label">30-second elevator pitch</Typography><Typography>{analysis.elevatorPitch}</Typography></Box>
      <Box><Typography className="business-context-label">Business model</Typography><Typography><strong>{analysis.businessModel.classification}</strong> — {analysis.businessModel.reasoning}</Typography></Box>
      <Box><Typography className="business-context-label">Business/product stage</Typography><Typography><strong>{businessStage.classification}</strong> — {businessStage.reasoning}</Typography></Box>
      <Box><Typography className="business-context-label">Core product or service</Typography><Typography>{analysis.coreProductOrService}</Typography></Box>
      <Box><Typography className="business-context-label">Ideal customer profile</Typography>{Object.entries(analysis.idealCustomerProfile).filter(([key]) => key !== "maturity").map(([key, value]) => <Typography key={key}><strong>{key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}:</strong> {value}</Typography>)}</Box>
      <Box><Typography className="business-context-label">ICP pain points</Typography><Typography className="business-context-sub-label">Confirmed</Typography>{list(analysis.icpPainPoints.confirmed)}<Typography className="business-context-sub-label">Likely</Typography>{list(analysis.icpPainPoints.likely)}<Typography className="business-context-sub-label">Unknown</Typography>{list(analysis.icpPainPoints.unknown)}</Box>
      <Box><Typography className="business-context-label">Customer goals</Typography>{list(analysis.customerGoals)}</Box>
      <Box><Typography className="business-context-label">Buying and engagement triggers</Typography>{analysis.buyingAndEngagementTriggers.length ? analysis.buyingAndEngagementTriggers.map((item, index) => typeof item === "string" ? <Typography key={`${item}-${index}`}>{item}</Typography> : <Typography key={`${item.trigger}-${index}`}><strong>{item.trigger}</strong> — {item.status}. {item.evidence}</Typography>) : <Typography className="business-context-muted">Unknown</Typography>}</Box>
      <Box><Typography className="business-context-label">Value proposition</Typography>{list(analysis.valueProposition)}</Box>
      <Box><Typography className="business-context-label">Objections and barriers</Typography>{list(analysis.objectionsAndBarriers)}</Box>
      <Box><Typography className="business-context-label">Messaging recommendations</Typography>{Object.entries(analysis.messagingRecommendations).map(([key, values]) => <Box key={key}><Typography className="business-context-sub-label">{key}</Typography>{list(values)}</Box>)}</Box>
    </Stack>
    <Stack direction="row" justifyContent="space-between" gap={.75} sx={{ mt: 2 }}><Button className="guided-flow-secondary" onClick={onBack} disabled={saving}>Back</Button><Stack direction={{ xs: "column", sm: "row" }} gap={.75}><Button className="guided-flow-secondary" onClick={() => void onRevise()} disabled={saving}>Add information</Button><Button className="guided-flow-secondary" onClick={() => setEditing(true)} disabled={saving}>Edit analysis</Button><Button className="guided-flow-next" variant="contained" onClick={onConfirm} disabled={saving}>{saving ? "Saving…" : "Confirm and continue"}</Button></Stack></Stack>
  </Box>;
}

function BusinessAnalysisPulse() {
  const ringSx = (delay: string) => ({
    position: "absolute" as const,
    inset: 0,
    border: "4px solid",
    borderColor: "#8b5cf6",
    borderRadius: "50%",
    boxShadow: "0 0 14px rgba(139, 92, 246, .4)",
    animation: "businessAnalysisPulse 2.4s ease-out infinite",
    animationDelay: delay,
    "@keyframes businessAnalysisPulse": {
      "0%": { transform: "scale(.25)", opacity: .95 },
      "70%": { opacity: .32 },
      "100%": { transform: "scale(1)", opacity: 0 },
    },
  });
  return <Stack alignItems="center" justifyContent="center" sx={{ position: "relative", width: 138, height: 138, my: 1.5 }} aria-hidden="true">
    <Box sx={ringSx("0s")} /><Box sx={ringSx(".45s")} /><Box sx={ringSx(".9s")} />
    <Box sx={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#faf7ff", border: "3px solid #8b5cf6", color: "#7132d3", boxShadow: "0 0 14px rgba(139, 92, 246, .35)", zIndex: 1 }}><AutoAwesomeRounded fontSize="small" /></Box>
  </Stack>;
}

function BusinessContextCard({
  context,
  loading,
  saving,
  onUpdate,
  onAnalyze,
  onDetectLinks,
  onComplete,
  onCancel,
}: {
  context: AiBusinessContext;
  loading: boolean;
  saving: boolean;
  onUpdate: (input: AiBusinessContextUpdate) => Promise<AiBusinessContext>;
  onAnalyze: (kind: "website" | "app", url: string, appLinks?: { appStoreUrl?: string | null; googlePlayUrl?: string | null }) => Promise<AiBusinessContext>;
  onDetectLinks: (url: string) => Promise<{ websiteUrl: string; appStoreUrl: string | null; googlePlayUrl: string | null }>;
  onComplete: (context: AiBusinessContext) => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<BusinessContextPhase>("description");
  const [draft, setDraft] = useState<AiBusinessContext>(context);
  const [description, setDescription] = useState(context.businessDescription ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(context.websiteUrl ?? "");
  const [appStoreUrl, setAppStoreUrl] = useState(context.appStoreUrl ?? "");
  const [googlePlayUrl, setGooglePlayUrl] = useState(context.googlePlayUrl ?? "");
  const [appListingUrl, setAppListingUrl] = useState(context.appStoreUrl ?? context.googlePlayUrl ?? "");
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [linkCheckMessage, setLinkCheckMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (loading || initialized.current) return;
    const initial = { ...emptyBusinessContext, ...context };
    initialized.current = true;
    setDraft(initial);
    setDescription(initial.businessDescription ?? "");
    setWebsiteUrl(initial.websiteUrl ?? "");
    setAppStoreUrl(initial.appStoreUrl ?? "");
    setGooglePlayUrl(initial.googlePlayUrl ?? "");
    setAppListingUrl(initial.appStoreUrl ?? initial.googlePlayUrl ?? "");
    setPhase(firstBusinessContextPhase(initial));
  }, [context, loading]);

  const applyUpdate = async (input: AiBusinessContextUpdate) => {
    setError(null);
    const updated = await onUpdate(input);
    setDraft(updated);
    return updated;
  };

  const goToPhase = (next: BusinessContextPhase) => {
    setError(null);
    setPhase(next);
  };

  const saveDescriptionAndContinue = async () => {
    try {
      await applyUpdate({ businessDescription: description.trim() || null });
      setPhase("review");
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t save that business description. Please try again."));
    }
  };

  const analyzeWebsiteAndContinue = async () => {
    if (!websiteUrl.trim()) return goToPhase("description");
    try {
      const updated = await onAnalyze("website", websiteUrl.trim(), { appStoreUrl: appStoreUrl.trim() || null, googlePlayUrl: googlePlayUrl.trim() || null });
      setDraft(updated);
      setWebsiteUrl(updated.websiteUrl ?? websiteUrl.trim());
      setPhase(updated.businessAnalysis ? "analysis" : firstBusinessContextPhase(updated));
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t analyze that website. Check the URL or skip this question."));
    }
  };

  const checkWebsiteLinks = async () => {
    if (!websiteUrl.trim()) return;
    setError(null);
    setLinkCheckMessage(null);
    setCheckingLinks(true);
    try {
      const detected = await onDetectLinks(websiteUrl.trim());
      setWebsiteUrl(detected.websiteUrl || websiteUrl.trim());
      setAppStoreUrl(detected.appStoreUrl ?? "");
      setGooglePlayUrl(detected.googlePlayUrl ?? "");
      setLinkCheckMessage(detected.appStoreUrl || detected.googlePlayUrl ? "App links found and added." : "No App Store or Google Play links were found. You can add them manually.");
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t check the website links. You can add the app links manually."));
    } finally {
      setCheckingLinks(false);
    }
  };

  const confirmAnalysisAndContinue = async () => {
    try {
      const updated = await applyUpdate({ businessAnalysisConfirmed: true });
      setDraft(updated);
      setPhase("description");
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t save the confirmed business profile. Please try again."));
    }
  };

  const saveAnalysis = async (analysis: NonNullable<AiBusinessContext["businessAnalysis"]>) => {
    try {
      const updated = await applyUpdate({ businessAnalysis: analysis });
      setDraft(updated);
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t save the edited business profile. Please try again."));
    }
  };

  const saveAnalysisAndAddInformation = async () => {
    if (!draft.businessAnalysis) return setPhase("description");
    try {
      await applyUpdate({ businessAnalysis: draft.businessAnalysis });
      setPhase("description");
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t save the business analysis. Please try again."));
    }
  };

  const saveAppChoiceAndContinue = async (hasMobileApp: boolean) => {
    try {
      const updated = await applyUpdate({
        hasMobileApp,
        ...(hasMobileApp ? {} : { appStoreUrl: null, googlePlayUrl: null, appName: null, appSummary: null }),
      });
      setPhase(hasMobileApp ? "app-link" : "review");
      setDraft(updated);
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t save that app preference. Please try again."));
    }
  };

  const analyzeAppAndContinue = async () => {
    const url = appListingUrl.trim();
    if (!url) return setPhase("review");
    try {
      const updated = await onAnalyze("app", url);
      setDraft(updated);
      setAppListingUrl(updated.appStoreUrl ?? updated.googlePlayUrl ?? appListingUrl.trim());
      setPhase("review");
    } catch (cause) {
      setError(apiMessage(cause, "I couldn’t analyze that app listing. Check the link or skip this question."));
    }
  };

  const reviewValue = (value: string | null, fallback = "Skipped") => value?.trim() || fallback;
  const editPhase = (next: BusinessContextPhase) => { setError(null); setPhase(next); };

  if (loading || !initialized.current) {
    return <Box className="guided-flow-card business-context-card"><Typography className="guided-flow-title">Tell me about your business</Typography><Typography className="guided-flow-subtitle">I’m checking what your project already knows before I ask anything.</Typography><Typography className="business-context-loading">Loading business context…</Typography></Box>;
  }

  return <Box className="guided-flow-card business-context-card">
    <Stack direction="row" alignItems="flex-start" gap={1.5}>
      <Box className="business-context-icon"><AutoAwesomeRounded /></Box>
      <Box>
        <Typography component="h2" className="guided-flow-title">{phase === "analysis" ? "Business summary" : "Tell me about your business"}</Typography>
        <Typography className="guided-flow-subtitle">{phase === "analysis" ? "Review and confirm what I learned about your business before we define the journey." : "I’ll use this context to make the journey recommendations more relevant. You can skip or edit anything."}</Typography>
      </Box>
    </Stack>

    {error && <Alert severity="error" sx={{ mt: 2, fontSize: 12 }}>{error}</Alert>}

    {phase === "description" && <Box>
      <Typography className="guided-flow-question">Would you like to add anything about your business?</Typography>
      <TextField fullWidth multiline minRows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add missing details, correct anything in the analysis, or share information about your audience, goals, or product." label="Additional business information" inputProps={{ maxLength: 2_000 }} />
      <Stack direction="row" justifyContent="space-between" gap={.75} sx={{ mt: 1.5 }}><Button className="guided-flow-secondary" onClick={() => goToPhase(draft.businessAnalysis ? "analysis" : "website")} disabled={saving}>Back</Button><Stack direction="row" gap={.75}><Button className="guided-flow-secondary" onClick={() => goToPhase("review")} disabled={saving}>Skip</Button><Button className="guided-flow-next" variant="contained" onClick={() => void saveDescriptionAndContinue()} disabled={saving}>{saving ? "Saving…" : "Continue"}</Button></Stack></Stack>
    </Box>}

    {phase === "website" && (saving || checkingLinks) && <Stack alignItems="center" sx={{ py: 1.5 }} role="status" aria-live="polite"><BusinessAnalysisPulse /><Typography fontSize={22} fontWeight={600}>{checkingLinks ? "Checking your website for app links…" : "Analyzing your business…"}</Typography><Typography fontSize={16} fontWeight={500}>{websiteUrl}</Typography><Typography color="text.secondary" fontSize={13}>{checkingLinks ? "Looking for App Store and Google Play links." : "I’m using your website and app information to build your profile."}</Typography></Stack>}

    {phase === "website" && !saving && !checkingLinks && <Box>
      <Typography className="guided-flow-question"><LinkRounded fontSize="small" sx={{ mr: .5, verticalAlign: "middle" }} />What is your website?</Typography>
      <TextField fullWidth value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" label="Website URL" type="url" helperText="I’ll read the public page and save only the relevant business context." />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}><Typography className="business-context-optional-label">Optional app links</Typography><Button className="guided-flow-secondary" onClick={() => void checkWebsiteLinks()} disabled={checkingLinks || saving || !websiteUrl.trim()} sx={{ minHeight: 30, px: 1.25, fontSize: 12 }}>Check website for links</Button></Stack>
      <Stack gap={1}>
        <TextField fullWidth value={appStoreUrl} onChange={(event) => setAppStoreUrl(event.target.value)} placeholder="https://apps.apple.com/..." label="App Store link" type="url" />
        <TextField fullWidth value={googlePlayUrl} onChange={(event) => setGooglePlayUrl(event.target.value)} placeholder="https://play.google.com/..." label="Google Play link" type="url" />
      </Stack>
      {linkCheckMessage && <Typography className="business-context-link-message">{linkCheckMessage}</Typography>}
      <Stack direction="row" justifyContent="space-between" gap={.75} sx={{ mt: 1.5 }}><Button className="guided-flow-secondary" onClick={onCancel} disabled={saving}>Back</Button><Stack direction="row" gap={.75}><Button className="guided-flow-secondary" onClick={() => goToPhase("description")} disabled={saving}>Skip</Button><Button className="guided-flow-next" variant="contained" onClick={() => void analyzeWebsiteAndContinue()} disabled={saving || !websiteUrl.trim()}>{saving ? "Analyzing…" : "Analyze & continue"}</Button></Stack></Stack>
    </Box>}

    {phase === "analysis" && draft.businessAnalysis && <BusinessAnalysisSummary analysis={draft.businessAnalysis} onConfirm={() => void confirmAnalysisAndContinue()} onSave={(analysis) => void saveAnalysis(analysis)} onRevise={saveAnalysisAndAddInformation} onBack={() => goToPhase("website")} saving={saving} />}

    {phase === "app-choice" && <Box>
      <Typography className="guided-flow-question"><PhoneIphoneRounded fontSize="small" sx={{ mr: .5, verticalAlign: "middle" }} />Do you have an iOS or Android app?</Typography>
      <Stack gap={1}>
        {[{ label: "Yes, we have an app", value: true, description: "I’ll use its public App Store or Google Play listing." }, { label: "No app yet", value: false, description: "Continue with website and product context only." }].map((choice) => <ButtonBase key={choice.label} className="guided-flow-choice" onClick={() => void saveAppChoiceAndContinue(choice.value)} disabled={saving}><span className="guided-choice-check">{draft.hasMobileApp === choice.value && <CheckRounded />}</span><Box className="guided-choice-copy"><Typography>{choice.label}</Typography><span>{choice.description}</span></Box></ButtonBase>)}
      </Stack>
      <Stack direction="row" justifyContent="flex-end" gap={.75} sx={{ mt: 1.5 }}><Button className="guided-flow-secondary" onClick={() => goToPhase("review")} disabled={saving}>Skip</Button></Stack>
    </Box>}

    {phase === "app-link" && <Box>
      <Typography className="guided-flow-question">Share the App Store or Google Play link</Typography>
      <TextField fullWidth value={appListingUrl} onChange={(event) => setAppListingUrl(event.target.value)} placeholder="https://apps.apple.com/... or https://play.google.com/..." label="App Store or Google Play link" type="url" helperText="Share one public listing link; I’ll detect which store it belongs to." />
      <Stack direction="row" justifyContent="flex-end" gap={.75} sx={{ mt: 1.5 }}><Button className="guided-flow-secondary" onClick={() => goToPhase("review")} disabled={saving}>Skip</Button><Button className="guided-flow-next" variant="contained" onClick={() => void analyzeAppAndContinue()} disabled={saving || !appListingUrl.trim()}>{saving ? "Analyzing…" : "Analyze & continue"}</Button></Stack>
    </Box>}

    {phase === "review" && <Box>
      <Typography className="guided-flow-question">Review your business context</Typography>
      <Stack gap={1} className="business-context-review">
        <Box><Typography className="business-context-label">Business or product</Typography><Typography>{reviewValue(draft.businessDescription)}</Typography><Button size="small" startIcon={<EditOutlined />} onClick={() => editPhase("description")}>Edit</Button></Box>
        <Box><Typography className="business-context-label">Website</Typography><Typography>{reviewValue(draft.websiteTitle || draft.websiteUrl)}</Typography>{draft.websiteSummary && <Typography className="business-context-summary">{draft.websiteSummary}</Typography>}<Button size="small" startIcon={<EditOutlined />} onClick={() => editPhase("website")}>Edit</Button></Box>
        <Box><Typography className="business-context-label">Mobile app</Typography><Typography>{draft.hasMobileApp === true ? reviewValue(draft.appName || draft.appStoreUrl || draft.googlePlayUrl) : draft.hasMobileApp === false ? "No app" : "Skipped"}</Typography>{draft.appSummary && <Typography className="business-context-summary">{draft.appSummary}</Typography>}<Button size="small" startIcon={<EditOutlined />} onClick={() => editPhase(draft.hasMobileApp ? "app-link" : "app-choice")}>Edit</Button></Box>
      </Stack>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}><Button className="guided-flow-secondary" onClick={() => goToPhase("description")}>Back</Button><Button className="guided-flow-next" variant="contained" onClick={() => onComplete(draft)}>Continue to journey</Button></Stack>
    </Box>}
  </Box>;
}

function GuidedFlowCard({ flow, steps, step, answers, onSelect, onNext, onBack, onSkip, onCancel, onContinueWithoutAudience, sdkIntegrated, paywallEventsReady, eventActionReady, pushReady, pushUnavailableReason, purposeRecommendation }: {
  flow: GuidedFlow; steps: FlowStep[]; step: number; answers: Record<number, string>; onSelect: (value: string) => void;
  onNext: () => void; onBack: () => void; onSkip: () => void; onCancel: () => void; onContinueWithoutAudience: () => void; sdkIntegrated?: boolean; paywallEventsReady?: boolean; eventActionReady?: boolean; pushReady?: boolean; pushUnavailableReason?: string; purposeRecommendation?: string;
}) {
  const current = steps[step];
  const selected = answers[step];
  const selectedPurposeAnswer = answers[0];
  const [unavailableChoice, setUnavailableChoice] = useState<string | null>(null);
  const paywallNeedsSetup = flow.id === "journey" && step === 1 && answers[0] === "Paywall drop-off" && (!sdkIntegrated || !paywallEventsReady);
  const lifecycleUnavailable = flow.id === "journey" && step === 1 && answers[0] !== "Paywall drop-off" && !sdkIntegrated;
  const eventActionUnavailable = flow.id === "journey" && step === 1 && answers[0] !== "Paywall drop-off" && (!sdkIntegrated || !eventActionReady);
  const showLifecycleUnavailable = lifecycleUnavailable && unavailableChoice === "Lifecycle segment entry";
  const showEventActionUnavailable = eventActionUnavailable && unavailableChoice === "An event or action";
  const showPushUnavailable = flow.id === "journey" && step === steps.length - 1 && unavailableChoice !== null && (unavailableChoice === "Push" || unavailableChoice === "Multichannel") && !pushReady;
  const journeySubtitle = flow.id === "journey"
    ? current.question === "What is the purpose of this journey?"
      ? "Let’s start with the business outcome you want this journey to achieve."
      : current.question === "What should start this journey?"
        ? selectedPurposeAnswer
          ? `Now choose what should bring users into this ${selectedPurposeAnswer.toLowerCase()} journey.`
          : "Choose the event, audience or lifecycle moment that should start the journey."
        : current.question === "Which channels should we use?"
          ? "Choose how you want to reach users at the right moment in this journey."
          : current.question === "How should I handle the journey content?" || current.question === "Who should create the journey content?"
            ? "Finally, decide whether you want to add the messages yourself or have Nova prepare them for your review."
            : "Let’s define the next detail for this journey."
    : flow.subtitle;
  useEffect(() => setUnavailableChoice(null), [step, selectedPurposeAnswer]);
  return <Box className="guided-flow-card">
    <Typography component="h2" className="guided-flow-title">{flow.title}</Typography>
    <Typography className="guided-flow-subtitle">{journeySubtitle}</Typography>
    <Typography className="guided-flow-question">{current.question}</Typography>
    {step === 1 && purposeRecommendation && <Alert severity="info" sx={{ mb: 1.25, fontSize: 12 }}>
      <strong>Recommended:</strong> {purposeRecommendation}{' '}
      <a className="paywall-doc-link" href="/dashboard/developer-docs/engagement" target="_blank" rel="noreferrer">View developer documentation</a>
    </Alert>}
    <Stack gap={1}>
      {current.choices.map((choice) => <Box key={choice.label}>
        <ButtonBase aria-disabled={choice.disabled || undefined} className={`guided-flow-choice ${selected === choice.label ? "is-selected" : ""}${choice.disabled ? " is-disabled" : ""}`} onClick={() => choice.disabled ? setUnavailableChoice(choice.label) : (setUnavailableChoice(null), onSelect(choice.label))}>
          <span className="guided-choice-check">{selected === choice.label && <CheckRounded />}</span>
          <Box className="guided-choice-copy"><Stack direction="row" alignItems="center" gap={.35}><Typography>{choice.label}</Typography>{journeyChoiceExplanations[choice.label] && <Tooltip title={journeyChoiceExplanations[choice.label]} arrow><IconButton aria-label={`More information about ${choice.label}`} size="small" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} sx={{ p: 0, color: "#6f5a82" }}><InfoOutlined sx={{ fontSize: 16 }} /></IconButton></Tooltip>}</Stack><span>{choice.description}</span></Box>
        </ButtonBase>
        {choice.label === "Lifecycle segment entry" && showLifecycleUnavailable && <Typography component="div" className="sdk-unavailable-message" fontSize={11.5} sx={{ mt: .75, px: 1 }}>
          Lifecycle segment entry is unavailable until the SDK is integrated.{' '}
          <a className="paywall-doc-link" href="/dashboard/developer-docs/engagement" target="_blank" rel="noreferrer">View developer documentation</a>
        </Typography>}
        {choice.label === "An event or action" && showEventActionUnavailable && <Typography component="div" className="sdk-unavailable-message" fontSize={11.5} sx={{ mt: .75, px: 1 }}>
          {!sdkIntegrated ? "Event or action is unavailable until the SDK is integrated." : "The SDK is integrated, but no relevant events have been received yet. Ask your developer to add and verify the required events."}{' '}
          <a className="paywall-doc-link" href="/dashboard/developer-docs/engagement" target="_blank" rel="noreferrer">View developer documentation</a>
        </Typography>}
        {(choice.label === "Push" || choice.label === "Multichannel") && showPushUnavailable && <Typography component="div" className="sdk-unavailable-message" fontSize={11.5} sx={{ mt: .75, px: 1 }}>
          {pushUnavailableReason} <a className="paywall-doc-link" href="/dashboard/settings/firebase">Open Firebase / FCM settings</a>
        </Typography>}
      </Box>)}
    </Stack>
    {paywallNeedsSetup && <Alert severity="warning" sx={{ mt: 1.5, fontSize: 12 }}>
      {!sdkIntegrated
        ? <>Your SDK isn’t integrated yet, so paywall drop-off events aren’t available. Ask your developer to integrate the SDK before using this trigger.</>
        : <>We haven’t received the events needed to detect paywall drop-off yet. Ask your developer to add them before using this trigger.</>}
      <Box component="div" sx={{ mt: .5 }}><a className="paywall-doc-link" href="/dashboard/developer-docs/paywall-drop-off" target="_blank" rel="noreferrer">View developer documentation</a></Box>
      <Typography component="div" fontSize={12} sx={{ mt: .9 }}>You can continue without an audience for now and add the lifecycle segment later.</Typography>
      <Button className="paywall-continue-button" size="small" variant="outlined" onClick={onContinueWithoutAudience}>Continue without an audience for now</Button>
    </Alert>}
    <Stack direction="row" alignItems="center" gap={1.5} className="guided-flow-footer">
      <Button className="guided-flow-cancel" onClick={onCancel}>Cancel</Button>
      <Box className="guided-flow-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((_, index) => <span key={index} className={index === step ? "is-current" : index < step ? "is-done" : ""} />)}
      </Box>
      <Stack direction="row" gap={.75}>
        {step > 0 && <Button className="guided-flow-secondary" onClick={onBack}>Back</Button>}
        <Button className="guided-flow-secondary" onClick={onSkip}>Skip</Button>
        <Button className="guided-flow-next" variant="contained" disabled={!selected} onClick={onNext}>{step === steps.length - 1 ? "Review" : "Next"}</Button>
      </Stack>
    </Stack>
  </Box>;
}

function AnalysisRequestCard({ phase, selectedType, selectedResourceId, selectedResourceName, selectedPeriod, emailItems, pushItems, journeyItems, onType, onResource, onPeriod, onConfirm, onBack, onCancel }: {
  phase: AnalysisPhase;
  selectedType: AnalysisType | null;
  selectedResourceId: string | null;
  selectedResourceName: string | null;
  selectedPeriod: string | null;
  emailItems: Array<{ id: string; name: string }>;
  pushItems: Array<{ id: string; name: string }>;
  journeyItems: Array<{ id: string; name: string }>;
  onType: (type: AnalysisType) => void;
  onResource: (id: string, name: string) => void;
  onPeriod: (period: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  const items = selectedType === "email" ? emailItems : selectedType === "push" ? pushItems : journeyItems;
  const typeLabel = selectedType === "email" ? "email campaign" : selectedType === "push" ? "push campaign" : "journey";
  return <Box className="guided-flow-card analysis-request-card">
    <Typography component="h2" className="guided-flow-title">Ben’s analysis</Typography>
    <Typography className="guided-flow-subtitle">Ben only uses AI analysis after you confirm exactly what should be reviewed.</Typography>
    {phase === "type" && <>
      <Typography className="guided-flow-question">What would you like me to analyze?</Typography>
      <Stack gap={1}>{[
        ["email", "Email campaign", "Delivery, opens, clicks and conversions"],
        ["push", "Push campaign", "Delivery, opens, clicks and conversions"],
        ["journey", "Journey", "Entries, step performance, exits and conversions"],
      ].map(([value, label, description]) => <ButtonBase key={value} className="guided-flow-choice" onClick={() => onType(value as AnalysisType)}><span className="guided-choice-check" /><Box className="guided-choice-copy"><Typography>{label}</Typography><span>{description}</span></Box></ButtonBase>)}</Stack>
    </>}
    {phase === "resource" && <>
      <Typography className="guided-flow-question">Which concrete {typeLabel} should I analyze?</Typography>
      <Stack gap={1}>{items.length ? items.map((item) => <ButtonBase key={item.id} className={`guided-flow-choice ${selectedResourceId === item.id ? "is-selected" : ""}`} onClick={() => onResource(item.id, item.name)}><span className="guided-choice-check">{selectedResourceId === item.id && <CheckRounded />}</span><Box className="guided-choice-copy"><Typography>{item.name}</Typography><span>Select this {typeLabel} for analysis.</span></Box></ButtonBase>) : <Typography color="text.secondary" fontSize={13}>No {typeLabel}s are available yet.</Typography>}</Stack>
    </>}
    {phase === "period" && <>
      <Typography className="guided-flow-question">Which time period?</Typography>
      <Stack gap={1}>{analysisPeriods.map((period) => <ButtonBase key={period} className={`guided-flow-choice ${selectedPeriod === period ? "is-selected" : ""}`} onClick={() => onPeriod(period)}><span className="guided-choice-check">{selectedPeriod === period && <CheckRounded />}</span><Box className="guided-choice-copy"><Typography>{period}</Typography><span>Use this period for the performance analysis.</span></Box></ButtonBase>)}</Stack>
    </>}
    {phase === "confirm" && <>
      <Typography className="guided-flow-question">Ready to start Ben’s analysis?</Typography>
      <Stack gap={1} sx={{ mt: 1.5 }}><Box className="analysis-confirm-row"><Typography color="text.secondary">Type</Typography><Typography fontWeight={600}>{typeLabel}</Typography></Box><Box className="analysis-confirm-row"><Typography color="text.secondary">Item</Typography><Typography fontWeight={600}>{selectedResourceName}</Typography></Box><Box className="analysis-confirm-row"><Typography color="text.secondary">Period</Typography><Typography fontWeight={600}>{selectedPeriod}</Typography></Box></Stack>
      <Typography color="text.secondary" fontSize={12} sx={{ mt: 2 }}>This starts one AI analysis using Ben’s selected scope. Nothing will be changed automatically.</Typography>
    </>}
    <Stack direction="row" justifyContent="space-between" alignItems="center" className="guided-flow-footer">
      <Button className="guided-flow-cancel" onClick={onCancel}>Cancel</Button>
      <Stack direction="row" gap={.75}>{phase !== "type" && <Button className="guided-flow-secondary" onClick={onBack}>Back</Button>}{phase === "confirm" ? <Button className="guided-flow-next" variant="contained" onClick={onConfirm}>Start analysis</Button> : null}</Stack>
    </Stack>
  </Box>;
}

function JourneySummaryCard({ steps, answers, onApprove, onBack, onCancel, generating }: { steps: FlowStep[]; answers: Record<number, string>; onApprove: () => void; onBack: () => void; onCancel: () => void; generating?: boolean }) {
  if (generating) return <Box className="guided-flow-card" role="status" aria-live="polite">
    <Typography component="h2" className="guided-flow-title">Generating your journey</Typography>
    <Typography className="guided-flow-subtitle">Nova is creating the journey structure, timing, messages and templates using your business context.</Typography>
    <Stack alignItems="center" gap={1.25} sx={{ py: 4 }}>
      <Box className="chat-agent-mark is-thinking"><Image src="/assets/agent-avatar-nova-v2.png" alt="Nova avatar" width={42} height={42} /></Box>
      <Typography color="text.secondary" fontSize={13}>Preparing your editable journey draft<span className="thinking-dots">…</span></Typography>
      <Box className="thinking-bars" aria-hidden><span /><span /><span /></Box>
    </Stack>
  </Box>;
  return <Box className="guided-flow-card">
    <Typography component="h2" className="guided-flow-title">Review your journey</Typography>
    <Typography className="guided-flow-subtitle">Here’s what I’ll use to recommend and create your editable journey draft.</Typography>
    <Stack gap={1.1} sx={{ mt: 2 }}>
      {steps.map((step, index) => answers[index] ? <Box key={step.question} sx={{ borderBottom: "1px solid rgba(92, 61, 120, .12)", pb: 1 }}><Typography fontSize={12} color="text.secondary">{step.question}</Typography><Typography fontSize={14} fontWeight={600}>{answers[index]}</Typography></Box> : null)}
    </Stack>
    <Typography fontSize={12} color="text.secondary" sx={{ mt: 2 }}>You can continue the conversation afterward to adjust any step or change the journey goal.</Typography>
    <Stack direction="row" justifyContent="flex-end" gap={.75} sx={{ mt: 2 }}>
      <Button className="guided-flow-cancel" onClick={onCancel}>Cancel</Button>
      <Button className="guided-flow-secondary" onClick={onBack}>Edit</Button>
      <Button className="guided-flow-next" variant="contained" onClick={onApprove}>Generate recommendation</Button>
    </Stack>
  </Box>;
}

function JourneyRecommendationCard({ draft, onCreate, onEdit, onRegenerate, creating, regenerating }: { draft: Record<string, unknown>; onCreate: () => void; onEdit: () => void; onRegenerate: () => void; creating?: boolean; regenerating?: boolean }) {
  const steps = Array.isArray(draft.steps) ? draft.steps : [];
  const stepLabel = (step: Record<string, unknown>) => step.kind === "delay" ? `Wait ${String(step.amount ?? 1)} ${String(step.unit ?? "days")}` : `${String(step.channel ?? "Message").toUpperCase()} message`;
  if (creating) return <Box className="guided-flow-card" role="status" aria-live="polite">
    <Typography component="h2" className="guided-flow-title">Creating your journey draft</Typography>
    <Typography className="guided-flow-subtitle">Nova is creating the journey steps and saving the email and push templates.</Typography>
    <Stack alignItems="center" gap={1.25} sx={{ py: 4 }}><Box className="chat-agent-mark is-thinking"><Image src="/assets/agent-avatar-nova-v2.png" alt="Nova avatar" width={42} height={42} /></Box><Typography color="text.secondary" fontSize={13}>Saving your editable draft<span className="thinking-dots">…</span></Typography><Box className="thinking-bars" aria-hidden><span /><span /><span /></Box></Stack>
  </Box>;
  return <Box className="guided-flow-card">
    <Typography component="h2" className="guided-flow-title">Nova’s recommended journey</Typography>
    <Typography className="guided-flow-subtitle">Review the proposed steps before Nova creates the journey and its message templates.</Typography>
    {draft.recommendations && typeof draft.recommendations === "object" && !Array.isArray(draft.recommendations) ? (() => { const recommendations = draft.recommendations as Record<string, unknown>; return <Box sx={{ mt: 1.5, mb: .5, p: 1.25, borderRadius: 1.5, bgcolor: "rgba(92, 61, 120, .045)" }}><Typography fontSize={12} fontWeight={700}>Why Nova recommends this</Typography><Typography fontSize={12} color="text.secondary" sx={{ mt: .35 }}>{String(recommendations.strategy ?? "The sequence is based on the selected goal and saved business context.")}</Typography><Stack gap={.25} sx={{ mt: .75 }}><Typography fontSize={11} color="text.secondary">Timing: {String(recommendations.delays ?? "Behavior-based timing")}</Typography><Typography fontSize={11} color="text.secondary">Frequency: {String(recommendations.frequencyCap ?? "Protected against over-messaging")}</Typography><Typography fontSize={11} color="text.secondary">Stops after: {Array.isArray(recommendations.exitCriteria) ? recommendations.exitCriteria.join(", ") : String(recommendations.exitCriteria ?? "the intended action")}</Typography></Stack></Box>; })() : null}
    <Stack gap={1} sx={{ mt: 2 }}>{steps.map((raw, index) => { const step = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {}; const copy = step.copy && typeof step.copy === "object" && !Array.isArray(step.copy) ? step.copy as Record<string, unknown> : {}; const isPush = step.channel === "push"; const body = String(copy.text ?? copy.html ?? copy.body ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>/gi, "\n\n").replace(/<li\s*>/gi, "• ").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim(); return <Box key={`${stepLabel(step)}-${index}`} sx={{ border: "1px solid rgba(92, 61, 120, .14)", borderRadius: 1.5, px: 1.5, py: 1.25 }}><Typography fontSize={12} color="primary" fontWeight={700}>Step {index + 1}</Typography>{step.kind === "delay" ? <><Typography fontSize={14} fontWeight={600}>{stepLabel(step)}</Typography><Typography fontSize={12} color="text.secondary">Pause before the next touchpoint.</Typography></> : <Stack gap={.75} sx={{ mt: .5 }}><Typography fontSize={14} fontWeight={600}>{isPush ? "Push notification" : "Email"}</Typography><Box><Typography fontSize={10} color="text.secondary" textTransform="uppercase" letterSpacing=".08em">Template name</Typography><Typography fontSize={12}>{String(step.templateName ?? `Journey step ${index + 1}`)}</Typography></Box>{isPush ? <><Box><Typography fontSize={10} color="text.secondary" textTransform="uppercase" letterSpacing=".08em">Title</Typography><Typography fontSize={12}>{String(copy.title ?? "—")}</Typography></Box><Box sx={{ mt: .25 }}><Typography fontSize={10} color="text.secondary" textTransform="uppercase" letterSpacing=".08em">Body</Typography><Box sx={{ mt: .5, p: 1.25, border: "1px solid rgba(92, 61, 120, .1)", borderRadius: 1, bgcolor: "#fff" }}><Typography fontSize={12} color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.55 }}>{String(copy.body ?? "—")}</Typography></Box></Box></> : <><Box><Typography fontSize={10} color="text.secondary" textTransform="uppercase" letterSpacing=".08em">Subject</Typography><Box sx={{ mt: .35, px: 1.1, py: .8, border: "1px solid rgba(92, 61, 120, .1)", borderRadius: 1, bgcolor: "#fff" }}><Typography fontSize={12} fontWeight={600}>{String(copy.subject ?? "—")}</Typography></Box></Box><Box sx={{ mt: .25 }}><Typography fontSize={10} color="text.secondary" textTransform="uppercase" letterSpacing=".08em">Body</Typography><Box sx={{ mt: .5, p: 1.25, border: "1px solid rgba(92, 61, 120, .1)", borderRadius: 1, bgcolor: "#fff" }}><Typography fontSize={12} color="text.secondary" sx={{ whiteSpace: "pre-line", lineHeight: 1.65 }}>{body || "—"}</Typography></Box></Box></>}</Stack>}</Box>; })}</Stack>
    <Typography fontSize={12} color="text.secondary" sx={{ mt: 2 }}>These are recommendations based on the selected goal and saved business context. You can edit the journey after it is created.</Typography>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={.75} sx={{ mt: 2 }}><Button className="guided-flow-secondary" startIcon={<ReplayRounded />} onClick={onRegenerate} disabled={regenerating || creating}>{regenerating ? "Regenerating…" : "Regenerate recommendation"}</Button><Button className="guided-flow-secondary" onClick={onEdit} disabled={regenerating || creating}>Edit answers</Button><Button className="guided-flow-next" variant="contained" onClick={onCreate} disabled={regenerating}>Create journey draft</Button></Stack>
  </Box>;
}

function JourneyGenerationOverlay({ phase }: { phase: "recommendation" | "creation" }) {
  const creation = phase === "creation";
  return <Box className="guided-flow-card journey-generation-card" role="status" aria-live="polite">
    <Typography component="h2" className="guided-flow-title">{creation ? "Creating your journey draft" : "Preparing Nova’s recommendation"}</Typography>
    <Typography className="guided-flow-subtitle">{creation ? "Nova is creating the journey, writing the message templates and saving everything as an editable draft." : "Nova is turning your answers and saved business context into a best-practice journey recommendation."}</Typography>
    <Stack alignItems="center" gap={1.25} sx={{ py: 4 }}>
      <Box className="chat-agent-mark is-thinking"><Image src="/assets/agent-avatar-nova-v2.png" alt="Nova avatar" width={52} height={52} /></Box>
      <Typography color="text.secondary" fontSize={13}>{creation ? "Saving your journey and templates" : "Building your recommendation"}<span className="thinking-dots">…</span></Typography>
      <Box className="thinking-bars" aria-hidden><span /><span /><span /></Box>
      {creation && <Stack gap={.5} sx={{ mt: 1, width: "min(100%, 360px)" }}>
        {["Planning the journey steps", "Creating the email and push templates", "Saving the editable draft"].map((label) => <Typography key={label} fontSize={12} color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: .75 }}><CheckRounded sx={{ fontSize: 15, color: "primary.main" }} />{label}</Typography>)}
      </Stack>}
      <Typography fontSize={12} color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>Please don’t close this page or click anything while Nova finishes.</Typography>
    </Stack>
  </Box>;
}

export function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

export type HomeInsightStats = { total: number; reachable: number; eventsToday: number; eventsYesterday: number };

/** Pure insight formatting kept exportable for the Home summary tests. */
export function buildInsights(stats: HomeInsightStats | undefined, runningJourneys: number) {
  if (!stats) return [] as Array<{ title: string; tone: "warning" | "info" | "success" }>;
  if (stats.total === 0) return [{ title: "No users in this project yet", tone: "info" as const }];
  const insights: Array<{ title: string; tone: "warning" | "info" | "success" }> = [];
  const unreachable = Math.round(((stats.total - stats.reachable) / stats.total) * 100);
  if (unreachable >= 30) insights.push({ title: `${unreachable}% of users cannot be reached`, tone: "warning" });
  if (stats.eventsToday === 0 && stats.eventsYesterday === 0) insights.push({ title: "No events in the last two days", tone: "warning" });
  if (runningJourneys === 0) insights.push({ title: "No journey is running", tone: "warning" });
  if (stats.eventsToday > stats.eventsYesterday) return [{ title: "Activity is up today", tone: "success" }];
  return insights;
}

function MaxMark() {
  return <Box className="max-orb" aria-hidden>
    <span className="max-orb-aura" />
    <span className="max-orb-ring" />
    <span className="max-orb-path is-one" />
    <span className="max-orb-path is-two" />
    <span className="max-orb-pulse" />
    <span className="max-orb-orbit is-one"><i><b /></i></span>
    <span className="max-orb-orbit is-two"><i><b /></i></span>
    <span className="max-orb-core"><Image className="max-orb-icon" src="/assets/site-icon.png" alt="" width={38} height={56} priority /></span>
  </Box>;
}

function apiMessage(error: unknown, fallback: string) {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  return message || fallback;
}

function isAnalysisRequest(value: string) {
  return /\b(?:analy[sz]e|analyse|performance|results?|metrics?)\b/i.test(value)
    && /\b(?:campaign|journey|email|push|retention|churn|audience|users?)\b/i.test(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseJsonObject(value: string) {
  try {
    return objectValue(JSON.parse(value));
  } catch {
    return {};
  }
}

function isFlowId(value: unknown): value is AiFlowId {
  return guidedFlows.some((flow) => flow.id === value);
}

function humanizeFlowKey(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (character) => character.toUpperCase());
}

function flowAnswersMessage(flowId: AiFlowId, answers: Record<string, string>) {
  const flow = guidedFlows.find((item) => item.id === flowId);
  const label = flowId === "campaigns" ? "Campaign" : flowId === "journey" ? "Journey" : flowId === "segment" ? "Segment" : flowId === "audience-group" ? "Audience group" : "Engagement";
  const rows = Object.entries(answers)
    .filter(([key, value]) => /^\d+$/.test(key) && value.trim())
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([key, value]) => `${flow?.steps[Number(key)]?.question ?? `Step ${Number(key) + 1}`}: ${value.trim()}`);
  return `${label} details${rows.length ? `\n\n${rows.join("\n")}` : ""}`;
}

function fallbackFlowSummary(flowId: AiFlowId, draft: Record<string, unknown>) {
  const label = flowId === "campaigns" ? "Campaign" : flowId === "journey" ? "Journey" : flowId === "segment" ? "Segment" : flowId === "audience-group" ? "Audience group" : "Engagement";
  const audience = typeof draft.audience === "string" ? draft.audience : typeof draft.targetAudience === "string" ? draft.targetAudience : "the selected audience";
  return `${label} draft prepared for ${audience}.`;
}

function flowDraftMessageFromValues(flowId: AiFlowId, draft: Record<string, unknown>, summary?: string, warnings: string[] = []) {
  const values = Object.entries(draft)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => `${humanizeFlowKey(key)}: ${String(value)}`);
  const warningText = warnings.length ? `\n\n${warnings.join(" ")}` : "";
  return `${summary?.trim() || fallbackFlowSummary(flowId, draft)}${values.length ? `\n\n${values.join("\n")}` : ""}${warningText}`;
}

function storedCreatedResources(value: unknown): AiCreatedResource[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const resources = value.flatMap((item) => {
    const resource = objectValue(item);
    const type = resource.type;
    if (!(["journey", "segment", "audience-group", "campaign"] as string[]).includes(String(type)) || typeof resource.id !== "string" || typeof resource.name !== "string") return [];
    return [{
      type: type as AiResourceType,
      id: resource.id,
      name: resource.name,
      channel: resource.channel === "push" || resource.channel === "email" ? resource.channel : undefined,
      status: "draft",
      href: typeof resource.href === "string" ? resource.href : "",
    } satisfies AiCreatedResource];
  });
  return resources.length ? resources : undefined;
}

/**
 * Converts persisted guided-flow JSON from older conversations into the same
 * readable messages and resource card used by a live Home AI response.
 */
export function persistedMessageToChatMessage(message: AiConversationMessage): ChatMessage {
  const metadata = objectValue(message.metadata);
  const kind = typeof metadata.kind === "string" ? metadata.kind : "";
  const flowId = isFlowId(metadata.flowId) ? metadata.flowId : null;
  if (flowId && (kind === "flow_answers" || kind === "flow_create")) {
    const parsed = parseJsonObject(message.content);
    const answers = objectValue(metadata.answers);
    const storedAnswers = Object.keys(answers).length ? answers : objectValue(parsed.answers);
    return {
      id: message.id,
      role: message.role === "assistant" ? "assistant" : "user",
      text: flowAnswersMessage(flowId, Object.fromEntries(Object.entries(storedAnswers).filter(([, value]) => typeof value === "string")) as Record<string, string>),
      flow: true,
    };
  }
  if (flowId && (kind === "flow_draft" || kind === "flow_created")) {
    const parsed = parseJsonObject(message.content);
    const storedDraft = objectValue(metadata.draft);
    const draft = Object.keys(storedDraft).length ? storedDraft : parsed;
    const warnings = Array.isArray(metadata.warnings) ? metadata.warnings.filter((value): value is string => typeof value === "string") : [];
    const summary = typeof metadata.summary === "string" ? metadata.summary : undefined;
    return {
      id: message.id,
      role: "assistant",
      text: flowDraftMessageFromValues(flowId, draft, summary, warnings),
      flow: true,
      createdResources: storedCreatedResources(metadata.createdResources),
    };
  }
  return { id: message.id, role: message.role === "assistant" ? "assistant" : "user", text: message.content };
}

function draftMessage(result: AiFlowDraftResponse) {
  return flowDraftMessageFromValues(result.flowId, result.draft, result.summary, result.warnings);
}

function conversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function conversationGroup(value: string) {
  const relative = conversationTime(value);
  return relative === "Today" || relative === "Yesterday" ? relative : "Older";
}

function conversationTitle(prompt: string, fallback: string) {
  const compact = prompt.trim().replace(/\s+/g, " ");
  return (compact || fallback).slice(0, 160);
}

function conversationMatches(conversation: AiConversationPreview, search: string) {
  const tokens = search.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [conversation.title, conversation.lastMessage?.content, conversation.assistant, conversation.flowId]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export default function HomeCommandCenter() {
  const { account } = useCurrentUser();
  const { active } = useActiveProject();
  const projectId = active?.id;
  const queryClient = useQueryClient();
  const firstName = accountGreetingName(account);
  const [agentAnchor, setAgentAnchor] = useState<null | HTMLElement>(null);
  const [contextAnchor, setContextAnchor] = useState<null | HTMLElement>(null);
  // Which view the dialog shows is kept apart from whether it is open, so the content stays put while it
  // fades out instead of flipping to another view for the length of the closing animation.
  const [context, setContext] = useState<"recent" | "insight" | "handoff">("recent");
  const [contextOpen, setContextOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [openingConversationId, setOpeningConversationId] = useState<string | null>(null);
  const [deletedConversationIds, setDeletedConversationIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AiConversationPreview | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [lastDraft, setLastDraft] = useState<DraftInput | null>(null);
  const [openingFlow, setOpeningFlow] = useState(false);
  const [activeFlow, setActiveFlow] = useState<GuidedFlow | null>(null);
  const [flowReady, setFlowReady] = useState(false);
  const [flowStep, setFlowStep] = useState(0);
  const [flowAnswers, setFlowAnswers] = useState<Record<number, string>>({});
  const [flowConfirming, setFlowConfirming] = useState(false);
  const [journeyRecommendation, setJourneyRecommendation] = useState<Record<string, unknown> | null>(null);
  const [businessContext, setBusinessContext] = useState<AiBusinessContext>(emptyBusinessContext);
  const [businessContextSaving, setBusinessContextSaving] = useState(false);
  const [businessContextComplete, setBusinessContextComplete] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<AnalysisPhase | null>(null);
  const [analysisType, setAnalysisType] = useState<AnalysisType | null>(null);
  const [analysisResource, setAnalysisResource] = useState<{ id: string; name: string } | null>(null);
  const [analysisPeriod, setAnalysisPeriod] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("Max");
  const activeRequestRef = useRef<AbortController | null>(null);
  const openingRequestRef = useRef(0);
  const [, agentRole, , agentAvatar] = agents.find(([name]) => name === selectedAgent) ?? agents[0];

  const contextQuery = useQuery({
    queryKey: ["projects", projectId, "ai", "context"],
    queryFn: () => aiApi.context(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });
  const businessContextQuery = useQuery({
    queryKey: ["projects", projectId, "ai", "business-context"],
    queryFn: () => aiApi.businessContext(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  const audienceGroupsQuery = useQuery({
    queryKey: ["projects", projectId, "audience-groups"],
    queryFn: () => audienceGroupsApi.list(projectId!),
    enabled: Boolean(projectId) && activeFlow?.id === "journey",
    staleTime: 30_000,
  });
  const lifecycleSegmentsQuery = useQuery({
    queryKey: ["projects", projectId, "lifecycle-segments"],
    queryFn: () => lifecycleSegmentsApi.list(projectId!),
    enabled: Boolean(projectId) && activeFlow?.id === "journey",
    staleTime: 30_000,
  });
  const emailCampaignsQuery = useQuery({
    queryKey: ["projects", projectId, "email-campaigns", "analysis-picker"],
    queryFn: () => emailApi.campaigns.list(projectId!, { tab: "sent", limit: 50 }),
    enabled: Boolean(projectId) && analysisPhase !== null && analysisType === "email",
    staleTime: 30_000,
  });
  const pushCampaignsQuery = useQuery({
    queryKey: ["projects", projectId, "push-campaigns", "analysis-picker"],
    queryFn: () => pushApi.campaigns.list(projectId!, { tab: "sent", limit: 50 }),
    enabled: Boolean(projectId) && analysisPhase !== null && analysisType === "push",
    staleTime: 30_000,
  });
  const journeysQuery = useQuery({
    queryKey: ["projects", projectId, "journeys", "analysis-picker"],
    queryFn: () => journeysApi.list(projectId!, { limit: 50 }),
    enabled: Boolean(projectId) && analysisPhase !== null && analysisType === "journey",
    staleTime: 30_000,
  });
  const sdkKeysQuery = useQuery({
    queryKey: ["projects", projectId, "sdk-keys"],
    queryFn: () => sdkKeyApi.list(projectId!),
    enabled: Boolean(projectId) && activeFlow?.id === "journey",
    staleTime: 30_000,
  });

  const deferredConversationSearch = useDeferredValue(conversationSearch.trim());
  const conversationSearchQuery = useQuery({
    queryKey: ["projects", projectId, "ai", "conversations", deferredConversationSearch],
    queryFn: () => aiApi.conversations(projectId!, deferredConversationSearch),
    enabled: Boolean(projectId) && historyOpen && Boolean(deferredConversationSearch),
    staleTime: 10_000,
  });

  const chatMutation = useMutation({
    mutationFn: async (input: { prompt: string; conversationId?: string; replace?: boolean; assistant?: AiAssistantId }) => {
      if (!projectId) throw new Error("Select a project before using the AI assistant.");
      const assistant = input.assistant ?? selectedAgent as AiAssistantId;
      const controller = new AbortController();
      activeRequestRef.current = controller;
      try {
        let threadId = input.conversationId;
        if (!threadId) {
          // Create the thread before the model request so an immediate Stop still leaves
          // the user's prompt in Recent conversations.
          const conversation = await aiApi.createConversation(projectId, {
            assistant,
            title: input.prompt.slice(0, 160),
            opening: { prompt: input.prompt },
          });
          threadId = conversation.id;
          setConversationId(threadId);
          if (controller.signal.aborted) {
            await aiApi.cancelConversation(projectId, threadId);
            throw { status: 0, code: "ABORTED", message: "Request stopped." };
          }
        }
        if (input.replace && input.conversationId) {
          try {
            return await aiApi.regenerate(projectId, threadId, { assistant, prompt: input.prompt }, controller.signal);
          } catch (error) {
            // Keep compatibility with an older edge deployment while the route rolls out.
            if ((error as { code?: string } | null)?.code !== "ROUTE_NOT_FOUND") throw error;
          }
        }
        return await aiApi.chat(projectId, { assistant, prompt: input.prompt, conversationId: threadId }, controller.signal);
      } finally {
        if (activeRequestRef.current === controller) activeRequestRef.current = null;
      }
    },
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      const createdResources = response.createdResources ?? [];
      const suggestedFlow = response.creationIntent && !createdResources.length
        ? flowForResource(response.creationIntent.resourceType)
        : undefined;
      setMessages((current) => response.cancelled
        ? current.some((message) => message.text === "Generation stopped.") ? current : [...current, { id: `assistant-stopped-${Date.now()}`, role: "assistant", text: response.message }]
        : [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: response.message, suggestedFlow, createdResources }]);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
      if (response.createdResources?.length) {
        // The AI endpoint creates only editable drafts. Refresh the resource
        // lists so the new draft is visible immediately when the user opens
        // the corresponding workspace, without changing the Home layout.
        for (const resource of response.createdResources) {
          const key = resource.type === "journey"
            ? "journeys"
            : resource.type === "campaign"
              ? resource.channel === "push" ? "push-campaigns" : "email-campaigns"
              : resource.type === "segment" ? "lifecycle-segments" : "audience-groups";
          void queryClient.invalidateQueries({ queryKey: ["projects", projectId, key] });
        }
      }
    },
    onError: (error) => {
      if ((error as { code?: string } | null)?.code === "ABORTED") return;
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", text: apiMessage(error, "The AI assistant could not respond. Please try again."), error: true }]);
    },
  });

  const recommendationMutation = useMutation({
    mutationFn: async (input: DraftInput) => {
      if (!projectId) throw new Error("Select a project before using the AI assistant.");
      const controller = new AbortController();
      activeRequestRef.current = controller;
      try {
        return await aiApi.flowDraft(projectId, input.flowId, { assistant: input.assistant ?? "Nova", answers: input.answers, conversationId: input.conversationId }, controller.signal);
      } finally {
        if (activeRequestRef.current === controller) activeRequestRef.current = null;
      }
    },
    onSuccess: (response) => {
      if (response.cancelled) return;
      setConversationId(response.conversationId);
      setJourneyRecommendation(response.draft);
    },
    onError: (error) => {
      if ((error as { code?: string } | null)?.code === "ABORTED") return;
      setMessages((current) => [...current, { id: `assistant-recommendation-error-${Date.now()}`, role: "assistant", assistant: "Nova", text: apiMessage(error, "Nova could not prepare the journey recommendation. Please try again."), error: true }]);
    },
  });

  const draftMutation = useMutation({
    mutationFn: async (input: DraftInput) => {
      if (!projectId) throw new Error("Select a project before using the AI assistant.");
      const controller = new AbortController();
      activeRequestRef.current = controller;
      try {
        return await aiApi.flowCreate(projectId, input.flowId, { assistant: input.assistant ?? selectedAgent as AiAssistantId, answers: input.answers, conversationId: input.conversationId }, controller.signal);
      } finally {
        if (activeRequestRef.current === controller) activeRequestRef.current = null;
      }
    },
    onSuccess: (response) => {
      if (response.cancelled) return;
      setConversationId(response.conversationId);
      setActiveFlow(null);
      setFlowConfirming(false);
      const createdResources = response.createdResources ?? [];
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: draftMessage(response), flow: true, createdResources }]);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
      for (const resource of createdResources) {
        const key = resource.type === "journey"
          ? "journeys"
          : resource.type === "campaign"
            ? resource.channel === "push" ? "push-campaigns" : "email-campaigns"
            : resource.type === "segment" ? "lifecycle-segments" : "audience-groups";
        void queryClient.invalidateQueries({ queryKey: ["projects", projectId, key] });
      }
    },
    onError: (error) => {
      if ((error as { code?: string } | null)?.code === "ABORTED") return;
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", text: apiMessage(error, "The draft could not be prepared. Please try again."), flow: true, error: true }]);
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) throw new Error("Select a project before deleting a conversation.");
      return aiApi.deleteConversation(projectId, id);
    },
    onSuccess: (_response, deletedId) => {
      setDeleteTarget(null);
      setDeletedConversationIds((current) => new Set(current).add(deletedId));
      if (conversationId === deletedId) {
        setMessages([]);
        setConversationId(undefined);
        setEditing(null);
        setLastDraft(null);
        setActiveFlow(null);
        setFlowReady(false);
        setFlowAnswers({});
        setFlowStep(0);
        setFlowConfirming(false);
        setBusinessContext(emptyBusinessContext);
        setBusinessContextComplete(false);
        setHistoryOpen(false);
        setConversationSearch("");
      }
      setContextError(null);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "conversations"] });
    },
    onError: (error) => {
      setDeleteTarget(null);
      setContextError(apiMessage(error, "That conversation could not be deleted. Please try again."));
    },
  });

  const thinking = openingFlow || chatMutation.isPending || recommendationMutation.isPending || draftMutation.isPending;
  const journeyBusy = activeFlow?.id === "journey" && (recommendationMutation.isPending || draftMutation.isPending);
  const emailAnalysisItems = (emailCampaignsQuery.data?.items ?? []).map((item) => ({ id: item.id, name: item.name }));
  const pushAnalysisItems = (pushCampaignsQuery.data?.items ?? []).map((item) => ({ id: item.id, name: item.name }));
  const journeyAnalysisItems = (journeysQuery.data?.items ?? []).map((item) => ({ id: item.id, name: item.name }));
  const isBusinessContextStep = activeFlow?.id === "journey" && flowReady && !flowConfirming && !businessContextComplete;
  const isGuidedFlowStep = Boolean(activeFlow && flowReady && !flowConfirming);
  const aiContext = contextQuery.data;
  const contextBusinessData = aiContext?.businessContext;
  const directBusinessData = businessContextQuery.data;
  const businessContextLoading = contextQuery.isLoading || businessContextQuery.isLoading;
  const hasBusinessData = (value?: AiBusinessContext | null) => Boolean(value && (
    value.businessAnalysisConfirmedAt
    || value.businessAnalysis
    || value.businessDescription?.trim()
    || value.websiteUrl?.trim()
  ));
  const savedBusinessContext = hasBusinessData(directBusinessData) ? directBusinessData : contextBusinessData;
  const hasSavedBusinessContext = Boolean(savedBusinessContext && (
    savedBusinessContext.businessAnalysisConfirmedAt
    || savedBusinessContext.businessAnalysis
    || savedBusinessContext.businessDescription?.trim()
    || savedBusinessContext.websiteUrl?.trim()
  ));

  useEffect(() => {
    if (activeFlow?.id !== "journey" || !flowReady || flowConfirming || businessContextLoading) return;
    if (hasSavedBusinessContext && !businessContextComplete && savedBusinessContext) {
      setBusinessContext(savedBusinessContext);
      setBusinessContextComplete(true);
    }
  }, [activeFlow?.id, flowReady, flowConfirming, businessContextLoading, hasSavedBusinessContext, businessContextComplete, savedBusinessContext]);
  const knownEventNames = new Set(aiContext?.project?.activity?.knownEvents?.map((event) => event.name) ?? []);
  const paywallEventsReady = knownEventNames.has("paywall_viewed") && (knownEventNames.has("purchase_completed") || knownEventNames.has("subscription_started"));
  const sdkIntegrated = Boolean(sdkKeysQuery.data?.some((key) => key.status === "active"));
  const firebaseSettingsQuery = useQuery({
    queryKey: ["projects", projectId, "firebase"],
    queryFn: () => firebaseApi.get(projectId!),
    enabled: Boolean(projectId) && activeFlow?.id === "journey",
    staleTime: 30_000,
  });
  const pushReady = sdkIntegrated && firebaseSettingsQuery.data?.status === "connected";
  const pushUnavailableReason = !sdkIntegrated
    ? "Push is unavailable until the SDK is integrated."
    : "Push is unavailable until Firebase / FCM is connected in Settings.";
  const relevantEvents = relevantJourneyEvents(flowAnswers[0]);
  const eventActionReady = relevantEvents.length === 0 || relevantEvents.some((event) => knownEventNames.has(event));
  const engagementEvent = ["app_closed", "session_ended"].find((name) => knownEventNames.has(name));
  const purpose = flowAnswers[0];
  const purposeRecommendation = purpose === "Engagement"
    ? engagementEvent
      ? `Start with an event or action such as ${engagementEvent}, wait 1 day, then send a push notification to bring the user back.`
      : "Start with an event or action such as app_closed or session_ended, wait 1 day, then send a push notification to bring the user back once your SDK tracks that event."
    : purpose === "Retention"
      ? sdkIntegrated
        ? "Start with lifecycle segment entry. Use an at-risk or inactive lifecycle segment, then send a message before the user churns."
        : "Start with lifecycle segment entry after the SDK is integrated. Use an at-risk or inactive lifecycle segment to identify users before they churn."
      : purpose === "Paywall drop-off"
        ? undefined
        : purpose === "Upsell"
          ? sdkIntegrated
            ? "Start with lifecycle segment entry. Use a lifecycle segment for existing buyers who are eligible for an upgrade or add-on, then send a message explaining the additional value."
            : "Start with lifecycle segment entry after the SDK is integrated. Use a lifecycle segment for existing buyers who are eligible for an upgrade or add-on."
          : purpose === "Onboarding"
            ? "Start with an event or action when a user signs up or creates an account, then guide them toward their first key action."
            : undefined;
  const visibleFlowSteps = activeFlow?.id === "journey"
    ? journeyStepsFor(flowAnswers, audienceGroupsQuery.data ?? [], lifecycleSegmentsQuery.data ?? [], sdkIntegrated, paywallEventsReady, knownEventNames, pushReady)
    : activeFlow?.steps ?? [];

  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
    setActiveFlow(null);
    setFlowReady(false);
    setFlowAnswers({});
    setFlowStep(0);
    setFlowConfirming(false);
    setBusinessContext(emptyBusinessContext);
    setBusinessContextComplete(false);
    setAnalysisPhase(null);
    setAnalysisType(null);
    setAnalysisResource(null);
    setAnalysisPeriod(null);
    setEditing(null);
    setLastDraft(null);
    setDeletedConversationIds(new Set());
    setDeleteTarget(null);
  }, [projectId]);

  useEffect(() => {
    if (savedBusinessContext) setBusinessContext(savedBusinessContext);
  }, [savedBusinessContext]);

  const selectAgent = (name: string) => {
    setSelectedAgent(name);
  };

  const sendMessage = (value = draft) => {
    const text = value.trim();
    if (!text || thinking) return;
    if (isAnalysisRequest(text)) {
      setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
      setDraft("");
      setEditing(null);
      startAnalysisRequest();
      return;
    }
    const creationFlow = detectCreationFlow(text);
    if (creationFlow) {
      // Creation commands are routed into the same guided setup as the four home cards.
      // This prevents the general chat route from creating an empty draft before the user has supplied details.
      setDraft("");
      setEditing(null);
      startFlow(creationFlow, text);
      return;
    }
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setDraft("");
    setEditing(null);
    chatMutation.mutate({ prompt: text, conversationId });
  };

  const stopGeneration = () => {
    const stoppedConversationId = conversationId;
    activeRequestRef.current?.abort();
    openingRequestRef.current += 1;
    if (projectId && stoppedConversationId) void aiApi.cancelConversation(projectId, stoppedConversationId);
    if (openingFlow) {
      setOpeningFlow(false);
      setActiveFlow(null);
      setFlowReady(false);
      setBusinessContextComplete(false);
    }
    setMessages((current) => current.some((message) => message.text === "Generation stopped.")
      ? current
      : [...current, { id: `assistant-stopped-${Date.now()}`, role: "assistant", text: "Generation stopped." }]);
  };

  const lastUserIndex = messages.map((message) => message.role).lastIndexOf("user");
  const lastTurnIsChat = lastUserIndex >= 0 && !messages[lastUserIndex].flow;

  /** Retry (same text) or edit (new text) of the latest message: everything after it is dropped and it is answered again. */
  const resend = (value: string) => {
    const prompt = value.trim();
    if (!prompt || thinking || !lastTurnIsChat) return;
    // An answer that arrived was stored, so the server replaces that turn; one that failed left nothing to replace.
    const stored = messages.slice(lastUserIndex + 1).some((message) => message.role === "assistant" && !message.error);
    setMessages((current) => [...current.slice(0, lastUserIndex), { ...current[lastUserIndex], text: prompt }]);
    setEditing(null);
    chatMutation.mutate({ prompt, conversationId, replace: stored });
  };

  const retryDraft = () => {
    if (!lastDraft || thinking) return;
    setMessages((current) => current.slice(0, -1));
    draftMutation.mutate(lastDraft);
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      window.setTimeout(() => setCopied((current) => (current === message.id ? null : current)), 1600);
    } catch { /* clipboard blocked by the browser: nothing was copied, so nothing is confirmed */ }
  };

  const startNewChat = () => {
    if (thinking) return;
    setHistoryOpen(false);
    setConversationSearch("");
    setMessages([]);
    setConversationId(undefined);
    setEditing(null);
    setLastDraft(null);
    setActiveFlow(null);
    setFlowReady(false);
    setFlowAnswers({});
    setFlowStep(0);
    setFlowConfirming(false);
    setBusinessContext(emptyBusinessContext);
    setBusinessContextComplete(false);
    setAnalysisPhase(null);
    setAnalysisType(null);
    setAnalysisResource(null);
    setAnalysisPeriod(null);
  };

  const startAnalysisRequest = () => {
    setMessages((current) => [...current,
      { id: `assistant-max-handoff-${Date.now()}`, role: "assistant", assistant: "Max", text: "Alles klar. Ich leite die Analyse an Ben weiter. Er wird zuerst den Analysebereich, die konkrete Kampagne oder Journey und den Zeitraum mit dir festlegen." },
      { id: `assistant-ben-entry-${Date.now() + 1}`, role: "assistant", assistant: "Ben", text: "Hallo, ich bin Ben. Ich kann deine Kampagnen und Journeys anhand von Zustellungen, Öffnungen, Klicks, Conversions und Abbrüchen analysieren. Was möchtest du analysieren?" },
    ]);
    setAnalysisType(null);
    setAnalysisResource(null);
    setAnalysisPeriod(null);
    setAnalysisPhase("type");
  };

  const startBenAnalysis = () => {
    if (!analysisType || !analysisResource || !analysisPeriod) return;
    const typeLabel = analysisType === "email" ? "email campaign" : analysisType === "push" ? "push campaign" : "journey";
    const prompt = `Analyze this ${typeLabel}: ${analysisResource.name}. Analyze the period: ${analysisPeriod}. Use the available delivery, open, click, conversion, entry, step, and exit data. Explain the evidence, limits of the data, and practical next steps. Do not change, activate, or optimize anything automatically.`;
    setMessages((current) => [...current, { id: `user-analysis-confirm-${Date.now()}`, role: "user", text: `Start analysis: ${typeLabel} “${analysisResource.name}”, ${analysisPeriod}.` }]);
    setAnalysisPhase(null);
    chatMutation.mutate({ prompt, conversationId, assistant: "Ben" });
  };

  const openConversation = async (id: string) => {
    if (!projectId || thinking || openingConversationId) return;
    setOpeningConversationId(id);
    setContextError(null);
    try {
      const conversation = await aiApi.conversation(projectId, id);
      const loadedMessages = conversation.messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map(persistedMessageToChatMessage);
      setMessages(loadedMessages);
      setConversationId(conversation.id);
      if (agents.some(([name]) => name === conversation.assistant)) setSelectedAgent(conversation.assistant);
      setEditing(null);
      setLastDraft(null);
      setActiveFlow(null);
      setFlowReady(false);
      setFlowAnswers({});
      setFlowStep(0);
      setFlowConfirming(false);
      setBusinessContext(emptyBusinessContext);
      setBusinessContextComplete(false);
      setContextOpen(false);
      setHistoryOpen(false);
      setConversationSearch("");
    } catch (error) {
      setContextError(apiMessage(error, "That conversation could not be opened. Please try again."));
    } finally {
      setOpeningConversationId(null);
    }
  };

  const deleteConversation = (conversation: AiConversationPreview) => {
    if (deleteConversationMutation.isPending || thinking) return;
    setContextError(null);
    setDeleteTarget(conversation);
  };

  const startFlow = (flowId: string, prompt?: string) => {
    const flow = guidedFlows.find((item) => item.id === flowId);
    if (!flow || !projectId || thinking) return;
    const isJourney = flowId === "journey";
    const flowAssistant: AiAssistantId = isJourney ? "Nova" : selectedAgent as AiAssistantId;
    const openingPrompt = flowId === "segment"
      ? prompt || "I want to create a new audience segment. Help me define the right filters and walk me through setting it up."
      : prompt || `Help me with ${flow.title.toLowerCase()}. Ask me what you need, one step at a time.`;
    const openingResponse = isJourney
      ? hasSavedBusinessContext
        ? prompt
          ? "Hi, I’m Nova. Max shared your request with me, and I already have your saved business context. Let’s continue with the journey questions."
          : "Hi, I’m Nova. I already have your saved business context, so let’s continue with the journey questions."
        : prompt
          ? "Hi, I’m Nova. Max shared your request with me. I’ll first review your business context, then ask the right questions to create the journey."
          : "Hi, I’m Nova. I’ll first review your business context, then ask the right questions to create the journey."
      : flow.subtitle;
    setSelectedAgent(flowAssistant);
    setMessages([
      { id: `user-${Date.now()}`, role: "user", flow: true, text: openingPrompt },
      ...(isJourney && prompt ? [{ id: `assistant-handoff-${Date.now()}`, role: "assistant" as const, assistant: "Max" as const, flow: true, text: "I understand. I’m handing this over to Nova, who specializes in creating journeys." }] : []),
    ]);
    setActiveFlow(flow);
    setFlowStep(0);
    setFlowAnswers({});
    setFlowConfirming(false);
    setJourneyRecommendation(null);
    setBusinessContext(aiContext?.businessContext ?? emptyBusinessContext);
    setBusinessContextComplete(flowId !== "journey" || hasSavedBusinessContext);
    setFlowReady(false);
    setOpeningFlow(true);
    const openingRequest = ++openingRequestRef.current;
    void aiApi.createConversation(projectId!, {
      assistant: flowAssistant,
      title: conversationTitle(openingPrompt, flow.title),
      flowId: flow.id,
      opening: { prompt: openingPrompt, response: openingResponse },
    }).then((conversation) => {
      if (openingRequest !== openingRequestRef.current) {
        setConversationId(conversation.id);
        void aiApi.cancelConversation(projectId!, conversation.id);
        return;
      }
      setConversationId(conversation.id);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: openingResponse, flow: true }]);
      setOpeningFlow(false);
      setFlowReady(true);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
    }).catch((error) => {
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", text: apiMessage(error, "The guided setup could not be started. Please try again."), flow: true, error: true }]);
      setActiveFlow(null);
      setOpeningFlow(false);
    });
  };

  const updateBusinessContext = async (input: AiBusinessContextUpdate) => {
    if (!projectId) throw new Error("Select a project before saving business context.");
    setBusinessContextSaving(true);
    try {
      const updated = await aiApi.updateBusinessContext(projectId, input);
      setBusinessContext(updated);
      queryClient.setQueryData<AiProjectContext>(["projects", projectId, "ai", "context"], (current) => current ? { ...current, businessContext: updated } : current);
      return updated;
    } finally {
      setBusinessContextSaving(false);
    }
  };

  const analyzeBusinessContext = async (kind: "website" | "app", url: string, appLinks?: { appStoreUrl?: string | null; googlePlayUrl?: string | null }) => {
    if (!projectId) throw new Error("Select a project before analyzing business context.");
    setBusinessContextSaving(true);
    try {
      const updated = await aiApi.analyzeBusinessContext(projectId, { kind, url, ...appLinks });
      setBusinessContext(updated);
      queryClient.setQueryData<AiProjectContext>(["projects", projectId, "ai", "context"], (current) => current ? { ...current, businessContext: updated } : current);
      return updated;
    } finally {
      setBusinessContextSaving(false);
    }
  };

  const detectBusinessContextLinks = async (url: string) => {
    if (!projectId) throw new Error("Select a project before checking website links.");
    return aiApi.detectBusinessContextLinks(projectId, { url });
  };

  const completeBusinessContext = (updated: AiBusinessContext) => {
    setBusinessContext(updated);
    setBusinessContextComplete(true);
    setSelectedAgent("Nova");
    setFlowStep(0);
    setMessages((current) => [...current, {
      id: `assistant-business-context-${Date.now()}`,
      role: "assistant",
      assistant: "Nova",
      text: "Thanks — I now understand your business, product and audience context. Max is handing this over to Nova, who will recommend and create the editable journey draft with the right purpose, trigger, audience, channels and content.",
      flow: true,
    }]);
  };

  const advanceFlow = (skip = false) => {
    if (!activeFlow) return;
    void skip;
    const nextStep = flowStep + 1;
    if (nextStep < visibleFlowSteps.length) {
      setFlowStep(nextStep);
      return;
    }
    if (activeFlow.id === "journey") {
      setFlowReady(false);
      setFlowConfirming(true);
      return;
    }
    const flow = activeFlow;
    setActiveFlow(null);
    setFlowReady(false);
    if (!flow || !projectId) return;
    const answers = Object.fromEntries(Object.entries(flowAnswers).map(([step, value]) => [step, value]));
    const input = { flowId: flow.id, answers, conversationId };
    setLastDraft(input);
    draftMutation.mutate(input);
  };

  const continueJourneyWithoutAudience = () => {
    if (!activeFlow || activeFlow.id !== "journey") return;
    const isPaywallTriggerStep = flowStep === 1 && flowAnswers[0] === "Paywall drop-off";
    setFlowAnswers((current) => ({
      ...current,
      ...(isPaywallTriggerStep ? { [flowStep]: "Lifecycle segment entry", 2: "Continue without an audience — set up later" } : { [flowStep]: "Continue without an audience — set up later" }),
    }));
    const nextStep = isPaywallTriggerStep ? flowStep + 2 : flowStep + 1;
    if (nextStep < visibleFlowSteps.length) {
      setFlowStep(nextStep);
      return;
    }
    setFlowReady(false);
    setFlowConfirming(true);
  };

  const generateJourneyRecommendation = () => {
    if (!activeFlow || activeFlow.id !== "journey" || !projectId) return;
    const answers = Object.fromEntries(Object.entries(flowAnswers).map(([step, value]) => [step, value]));
    const input = { flowId: activeFlow.id, answers, conversationId, assistant: "Nova" as AiAssistantId };
    setLastDraft(input);
    recommendationMutation.mutate(input);
  };

  const approveJourney = () => {
    if (!activeFlow || activeFlow.id !== "journey" || !projectId) return;
    const answers = Object.fromEntries(Object.entries(flowAnswers).map(([step, value]) => [step, value]));
    const input = { flowId: activeFlow.id, answers, conversationId, assistant: "Nova" as AiAssistantId };
    setLastDraft(input);
    setFlowReady(false);
    setJourneyRecommendation(null);
    draftMutation.mutate(input);
  };

  const regenerateJourney = () => {
    if (!lastDraft || lastDraft.flowId !== "journey") return;
    recommendationMutation.mutate({ ...lastDraft, conversationId });
  };

  const cancelFlow = () => {
    setActiveFlow(null);
    setFlowReady(false);
    setFlowConfirming(false);
    setJourneyRecommendation(null);
    setBusinessContextComplete(false);
    setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: "No problem — I paused that setup. You can start it again whenever you’re ready.", flow: true }]);
  };

  const composer = (className = "home-composer") => <Box className={`ai-composer ${className}`}>
    <InputBase
      fullWidth
      multiline
      minRows={className === "home-composer" ? 2 : 1}
      maxRows={6}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }}
      placeholder={`Ask ${selectedAgent} about your users, campaigns, or journeys…`}
      className="ai-composer-input"
      inputProps={{ "aria-label": `Message ${selectedAgent}` }}
    />
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} className="ai-composer-bar">
      <ButtonBase className="ai-agent-pill" aria-haspopup="menu" aria-label={`Assistant: ${selectedAgent}. Change assistant`} onClick={(event) => setAgentAnchor(event.currentTarget)}>
        <Image className="ai-agent-dot" src={agentAvatar} alt={`${selectedAgent} avatar`} width={30} height={30} />
        <b>{selectedAgent}</b>
        <span className="ai-agent-role">{agentRole}</span>
        <ExpandMoreRounded />
      </ButtonBase>
      {/* The button is a send action when idle and a direct cancellation action while an AI request is in flight. */}
      <Tooltip title={thinking ? "Stop generation" : draft.trim() ? "Send · Enter" : "Type a message to send"} placement="top">
        <span className="ai-send-wrap">
          <IconButton className={`ai-send${thinking ? " is-busy is-stop" : ""}`} aria-label={thinking ? "Stop generation" : `Ask ${selectedAgent}`} onClick={() => thinking ? stopGeneration() : sendMessage()} disabled={!thinking && !draft.trim()}>
            {thinking ? <StopRounded /> : <ArrowUpwardRounded />}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  </Box>;

  const openContext = (value: "recent" | "insight" | "handoff") => {
    setContext(value);
    setConversationSearch("");
    setContextError(null);
    setContextAnchor(null);
    if (value === "recent") {
      setContextOpen(false);
      setHistoryOpen(true);
      return;
    }
    setHistoryOpen(false);
    setContextOpen(true);
  };

  const contextConversations = (aiContext?.recentConversations ?? []).filter((conversation) => !deletedConversationIds.has(conversation.id));
  const localSearchMatches = deferredConversationSearch
    ? contextConversations.filter((conversation) => conversationMatches(conversation, deferredConversationSearch))
    : [];
  const recentConversations = Array.from(new Map(
    (deferredConversationSearch ? [...(conversationSearchQuery.data?.items ?? []), ...localSearchMatches] : contextConversations)
      .filter((conversation) => !deletedConversationIds.has(conversation.id))
      .map((conversation) => [conversation.id, conversation] as const),
  ).values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const conversationListLoading = contextQuery.isPending || Boolean(deferredConversationSearch && conversationSearchQuery.isPending);
  const conversationSearchError = deferredConversationSearch && conversationSearchQuery.isError
    ? apiMessage(conversationSearchQuery.error, "Search is temporarily unavailable. Showing recent conversations.")
    : null;

  const toggleRecentHistory = () => {
    const nextOpen = !historyOpen;
    setHistoryOpen(nextOpen);
    setContext("recent");
    setContextError(null);
    if (!nextOpen) setConversationSearch("");
  };

  const recentHistoryPanel = historyOpen && <Box className="home-history-panel" role="region" aria-label="Recent conversations">
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2} className="home-history-header">
      <Box>
        <Typography className="home-history-heading">Recent conversations</Typography>
        <Typography className="home-history-subtitle">Search and resume a Home AI thread.</Typography>
      </Box>
      <IconButton size="small" aria-label="Close recent conversations" onClick={toggleRecentHistory}><CloseRounded /></IconButton>
    </Stack>
    <Box className="context-search-box home-history-search">
      <SearchRounded aria-hidden />
      <InputBase
        fullWidth
        value={conversationSearch}
        onChange={(event) => setConversationSearch(event.target.value)}
        placeholder="Search conversations"
        inputProps={{ "aria-label": "Search conversations" }}
      />
      {conversationSearch && <IconButton size="small" aria-label="Clear conversation search" onClick={() => setConversationSearch("")}><CloseRounded /></IconButton>}
    </Box>
    {(contextError || conversationSearchError) && <Typography className="context-dialog-error" role="alert">{contextError || conversationSearchError}</Typography>}
    {conversationListLoading ? <Typography className="context-dialog-empty" color="text.secondary">{deferredConversationSearch ? "Searching conversations…" : "Loading conversations…"}</Typography> : recentConversations.length ? <Stack className="context-dialog-list home-history-list">
      {recentConversations.map((item, index) => {
        const group = conversationGroup(item.updatedAt);
        const previousGroup = index > 0 ? conversationGroup(recentConversations[index - 1].updatedAt) : null;
        return <Box key={item.id}>
          {group !== previousGroup && <Typography className="context-dialog-group">{group}</Typography>}
          <Box className={`context-dialog-row${conversationId === item.id ? " is-active" : ""}`}>
            <ButtonBase
              className="context-dialog-open"
              onClick={() => void openConversation(item.id)}
              disabled={Boolean(openingConversationId) || thinking || deleteConversationMutation.isPending}
              aria-label={`Open conversation ${item.title || item.lastMessage?.content || "AI conversation"}`}
              aria-current={conversationId === item.id ? "true" : undefined}
            >
              <Box className="conversation-icon"><PsychologyRounded /></Box>
              <Box sx={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <Typography fontSize={13} fontWeight={600} noWrap>{item.title || item.lastMessage?.content || "AI conversation"}</Typography>
                <Typography fontSize={11} color="text.secondary">{item.assistant}{item._count.messages > 1 ? ` · ${item._count.messages} messages` : ""}</Typography>
              </Box>
              <Typography className="context-dialog-time" fontSize={11} color="text.secondary">{openingConversationId === item.id ? "Opening…" : conversationTime(item.updatedAt)}</Typography>
            </ButtonBase>
            <Tooltip title="Delete conversation">
              <span>
                <IconButton
                  className="context-dialog-delete"
                  size="small"
                  aria-label={`Delete conversation ${item.title || "AI conversation"}`}
                  onClick={() => deleteConversation(item)}
                  disabled={Boolean(openingConversationId) || thinking || deleteConversationMutation.isPending}
                >
                  <DeleteOutlineRounded />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>;
      })}
    </Stack> : <Typography className="context-dialog-empty" color="text.secondary">{conversationSearchQuery.isError ? "Search is temporarily unavailable." : conversationSearch ? "No matching conversations." : "No conversations yet."}</Typography>}
  </Box>;

  return <Box className="home-experience">
    <Box className="home-backdrop" aria-hidden><span className="home-backdrop-mosaic" /></Box>
    {messages.length === 0 ? <Box className="home-hero">
      <MaxMark />
      <Typography component="h1" className="home-hero-title" suppressHydrationWarning>{greeting()}{firstName && <>, <span>{firstName}</span></>}.</Typography>
      <Typography className="home-hero-subtitle">Let’s make your next growth move.</Typography>

      {composer()}

      <Stack direction="row" justifyContent="center" gap={1} flexWrap="wrap" className="home-prompt-row">
        {prompts.map(([label, Icon]) => <Button key={label} className="home-prompt" startIcon={<Icon />} onClick={() => sendMessage(label)}>{label}</Button>)}
      </Stack>

      <Button className={`home-recent-link${historyOpen ? " is-active" : ""}`} startIcon={<HistoryRounded />} onClick={toggleRecentHistory}>{historyOpen ? "Hide recent conversations" : "Recent conversations"}</Button>

      {recentHistoryPanel}

      <Stack className="home-feature-intro" alignItems="center" gap={.5}>
        <Typography>What would you like Max to create for you?</Typography>
        <span>Choose a starting point and I’ll guide you through the details, then shape it into a ready-to-review draft.</span>
      </Stack>
      <Box className="home-feature-row">
        {shortcuts.map(([Icon, title, description, flowId]) => <Button key={title} className="home-feature-card" onClick={() => startFlow(flowId)}><Box className="home-feature-icon"><Icon /></Box><Box className="home-feature-copy"><Typography>{title}</Typography><span>{description}</span></Box><ArrowForwardRounded className="home-feature-arrow" /></Button>)}
      </Box>

      <Typography className="home-disclaimer">AI can make mistakes. Check important growth decisions.</Typography>
    </Box> : <Box className="chat-experience">
      <Stack direction="row" justifyContent="space-between" className="chat-topbar">
        <Button className="home-recent-link" startIcon={<AddRounded />} disabled={thinking} onClick={startNewChat}>New chat</Button>
        <Button className="home-recent-link" startIcon={<HistoryRounded />} onClick={(event) => setContextAnchor(event.currentTarget)}>Context</Button>
      </Stack>
      {recentHistoryPanel}
      <Stack className="chat-thread" gap={2.5}>
        {messages.map((message, index) => {
          const copyButton = <Tooltip title={copied === message.id ? "Copied" : "Copy"}><IconButton size="small" aria-label="Copy message" onClick={() => void copyMessage(message)}>{copied === message.id ? <CheckRounded /> : <ContentCopyRounded />}</IconButton></Tooltip>;
          const isLast = index === messages.length - 1;
          if (message.role === "user") {
            const editable = index === lastUserIndex && lastTurnIsChat && !thinking;
            if (editable && editing !== null) return <Box key={message.id} className="chat-user-turn is-editing">
              <Box className="chat-edit">
                <InputBase autoFocus fullWidth multiline maxRows={8} value={editing} className="chat-edit-input" inputProps={{ "aria-label": "Edit message" }} onChange={(event) => setEditing(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditing(null); if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); resend(editing); } }} />
                <Stack direction="row" justifyContent="flex-end" gap={1}>
                  <Button size="small" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button size="small" variant="contained" disabled={!editing.trim()} onClick={() => resend(editing)}>Send</Button>
                </Stack>
              </Box>
            </Box>;
            return <Box key={message.id} className="chat-user-turn">
              <Box className="chat-user-message">{message.text}</Box>
              <Stack direction="row" className="chat-actions">
                {editable && <Tooltip title="Edit"><IconButton size="small" aria-label="Edit message" onClick={() => setEditing(message.text)}><EditOutlined /></IconButton></Tooltip>}
                {copyButton}
              </Stack>
            </Box>;
          }
          // Only the latest answer can be asked for again: a chat turn is re-answered, a failed draft is re-run.
          const retry = !isLast || thinking ? undefined : message.flow ? (message.error && lastDraft ? retryDraft : undefined) : lastTurnIsChat ? () => resend(messages[lastUserIndex].text) : undefined;
          const messageAgent = agents.find(([name]) => name === (message.assistant ?? selectedAgent)) ?? agents[0];
          return <Stack key={message.id} direction="row" gap={1.5} className={`chat-assistant-message${message.error ? " is-error" : ""}`}>
            <Box className="chat-agent-mark"><Image src={messageAgent[3]} alt={`${messageAgent[0]} avatar`} width={38} height={38} /></Box>
            <Box>
              <Typography className="chat-agent-name">{messageAgent[0]} <span>{messageAgent[1]}</span></Typography>
              <Typography className="chat-response" role={message.error ? "alert" : undefined}>{message.text}</Typography>
              {!message.error && message.suggestedFlow && <CreationOptions
                flow={message.suggestedFlow}
                onStart={() => startFlow(message.suggestedFlow!, lastUserIndex >= 0 ? messages[lastUserIndex].text : undefined)}
                onOpen={() => { window.location.assign(flowHref(message.suggestedFlow!)); }}
              />}
              {!message.error && message.createdResources?.length ? <CreatedResourceActions resources={message.createdResources} /> : null}
              <Stack direction="row" alignItems="center" className={`chat-actions${isLast ? " is-pinned" : ""}`}>
                {message.error
                  ? retry && <Button size="small" variant="outlined" startIcon={<ReplayRounded />} onClick={retry}>Try again</Button>
                  : <>{copyButton}{retry && <Tooltip title="Retry"><IconButton size="small" aria-label="Retry answer" onClick={retry}><ReplayRounded /></IconButton></Tooltip>}</>}
              </Stack>
            </Box>
          </Stack>;
        })}
        {thinking && !journeyBusy && <Stack direction="row" gap={1.5} alignItems="center" className="chat-thinking" role="status" aria-live="polite"><Box className="chat-agent-mark is-thinking"><Image src={agentAvatar} alt={`${selectedAgent} avatar`} width={38} height={38} /></Box><Box className="chat-thinking-copy"><Typography>Thinking<span className="thinking-dots">…</span></Typography><Box className="thinking-bars" aria-hidden><span /><span /><span /></Box></Box></Stack>}
        {isBusinessContextStep && !businessContextLoading && <BusinessContextCard key={`business-context-${conversationId ?? "new"}`} context={businessContext} loading={businessContextLoading} saving={businessContextSaving} onUpdate={updateBusinessContext} onAnalyze={analyzeBusinessContext} onDetectLinks={detectBusinessContextLinks} onComplete={completeBusinessContext} onCancel={cancelFlow} />}
        {analysisPhase && <AnalysisRequestCard phase={analysisPhase} selectedType={analysisType} selectedResourceId={analysisResource?.id ?? null} selectedResourceName={analysisResource?.name ?? null} selectedPeriod={analysisPeriod} emailItems={emailAnalysisItems} pushItems={pushAnalysisItems} journeyItems={journeyAnalysisItems} onType={(type) => { setAnalysisType(type); setAnalysisResource(null); setAnalysisPeriod(null); setAnalysisPhase("resource"); setMessages((current) => [...current, { id: `assistant-ben-scope-${Date.now()}`, role: "assistant", assistant: "Ben", text: `Which concrete ${type === "email" ? "email campaign" : type === "push" ? "push campaign" : "journey"} should I analyze?` }]); }} onResource={(id, name) => { setAnalysisResource({ id, name }); setAnalysisPhase("period"); setMessages((current) => [...current, { id: `assistant-ben-period-${Date.now()}`, role: "assistant", assistant: "Ben", text: "Which time period should I use?" }]); }} onPeriod={(period) => { setAnalysisPeriod(period); setAnalysisPhase("confirm"); }} onConfirm={startBenAnalysis} onBack={() => setAnalysisPhase(analysisPhase === "confirm" ? "period" : analysisPhase === "period" ? "resource" : "type")} onCancel={() => { setAnalysisPhase(null); setMessages((current) => [...current, { id: `assistant-ben-cancel-${Date.now()}`, role: "assistant", assistant: "Ben", text: "No problem. I won’t run an analysis until you ask again." }]); }} />}
        {activeFlow && flowReady && !flowConfirming && (activeFlow.id !== "journey" || businessContextComplete) && <GuidedFlowCard flow={activeFlow} steps={visibleFlowSteps} step={flowStep} answers={flowAnswers} onSelect={(value) => setFlowAnswers((current) => ({ ...current, [flowStep]: value }))} onNext={() => advanceFlow()} onBack={() => setFlowStep((current) => Math.max(0, current - 1))} onSkip={() => advanceFlow(true)} onCancel={cancelFlow} onContinueWithoutAudience={continueJourneyWithoutAudience} sdkIntegrated={sdkIntegrated} paywallEventsReady={paywallEventsReady} eventActionReady={eventActionReady} pushReady={pushReady} pushUnavailableReason={pushUnavailableReason} purposeRecommendation={purposeRecommendation} />}
        {journeyBusy && <JourneyGenerationOverlay phase={draftMutation.isPending ? "creation" : "recommendation"} />}
        {!journeyBusy && activeFlow?.id === "journey" && flowConfirming && (journeyRecommendation
          ? <JourneyRecommendationCard draft={journeyRecommendation} onCreate={approveJourney} onRegenerate={regenerateJourney} onEdit={() => { setJourneyRecommendation(null); setFlowConfirming(false); setFlowReady(true); }} creating={draftMutation.isPending} regenerating={recommendationMutation.isPending} />
          : <JourneySummaryCard steps={visibleFlowSteps} answers={flowAnswers} onApprove={generateJourneyRecommendation} onBack={() => { setFlowConfirming(false); setFlowReady(true); }} onCancel={cancelFlow} generating={recommendationMutation.isPending} />)}
      </Stack>
      {!isBusinessContextStep && !isGuidedFlowStep && !analysisPhase && !journeyBusy && <Box className="chat-composer-area">{composer("chat-composer")}<Typography className="chat-disclaimer">{selectedAgent} can make mistakes. Check important growth decisions.</Typography></Box>}
    </Box>}

    <Menu anchorEl={agentAnchor} open={Boolean(agentAnchor)} onClose={() => setAgentAnchor(null)} className="agent-menu">
      {agents.map(([name, role, description, avatar]) => <MenuItem key={name} selected={selectedAgent === name} className="agent-menu-item" onClick={() => { selectAgent(name); setAgentAnchor(null); }}>
        <Image className="ai-agent-dot" src={avatar} alt={`${name} avatar`} width={34} height={34} />
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography className="agent-menu-name">{name} <span>{role}</span></Typography><Typography className="agent-menu-description">{description}</Typography></Box>
        {selectedAgent === name && <CheckRounded className="agent-menu-check" />}
      </MenuItem>)}
    </Menu>

    <Menu anchorEl={contextAnchor} open={Boolean(contextAnchor)} onClose={() => setContextAnchor(null)} className="home-context-menu">
      <MenuItem onClick={() => openContext("recent")}><HistoryRounded /> Recent conversations</MenuItem>
      <MenuItem onClick={() => openContext("insight")}><InsightsRounded /> Ben’s latest insight</MenuItem>
      <MenuItem onClick={() => openContext("handoff")}><PsychologyRounded /> Handoff history</MenuItem>
    </Menu>

    <Dialog open={contextOpen && context !== "recent"} onClose={() => setContextOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle className="context-dialog-title">
        {context === "recent" ? <Box><Typography component="span" className="context-dialog-heading">Recent conversations</Typography><Typography className="context-dialog-subtitle">Search and resume a Home AI thread.</Typography></Box> : context === "insight" ? "Ben’s latest insight" : "Handoff history"}
      </DialogTitle>
      <DialogContent>
        {context === "insight" && <Box className="insight-callout"><Typography fontSize={14} fontWeight={650}>{aiContext?.latestInsight.title ?? "No insight yet"}</Typography><Typography fontSize={13} color="text.secondary" sx={{ mt: .7 }}>{aiContext?.latestInsight.message ?? "The latest project insight will appear here."}</Typography><Stack direction="row" gap={1} sx={{ mt: 2 }}><Button variant="contained" size="small" href="/dashboard/journeys/create">Send insights to Nova</Button><Button size="small" href="/dashboard/users">Review audience</Button></Stack></Box>}
        {context === "handoff" && <Stack className="context-dialog-list">{aiContext?.handoffHistory?.length ? aiContext.handoffHistory.map((item) => <Stack direction="row" gap={1.5} className="context-dialog-row" key={`${item.assistant}-${item.action}`}><Box className="handoff-dot" /><Box><Typography fontSize={13} fontWeight={600}>{item.assistant} <span className="handoff-action">{item.action}</span></Typography><Typography fontSize={11} color="text.secondary">{item.status}</Typography></Box></Stack>) : <Typography color="text.secondary">No handoff history yet.</Typography>}</Stack>}
      </DialogContent>
    </Dialog>
    <DeleteConfirmDialog
      open={Boolean(deleteTarget)}
      onClose={() => { if (!deleteConversationMutation.isPending) setDeleteTarget(null); }}
      loading={deleteConversationMutation.isPending}
      onConfirm={() => { if (deleteTarget) deleteConversationMutation.mutate(deleteTarget.id); }}
      title="Are you sure you want to delete this conversation?"
      description="This conversation and all of its messages will be permanently deleted. This action cannot be undone."
    />
  </Box>;
}
