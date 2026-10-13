"use client";

import { AddRounded, ArrowForwardRounded, ArrowUpwardRounded, AutoAwesomeRounded, AutoGraphRounded, CampaignRounded, CheckRounded, ContentCopyRounded, EditOutlined, ExpandMoreRounded, HistoryRounded, InsightsRounded, PeopleAltOutlined, PsychologyRounded, ReplayRounded, RouteRounded, TrendingDownRounded } from "@mui/icons-material";
import { Box, Button, ButtonBase, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, InputBase, Menu, MenuItem, Stack, Tooltip, Typography } from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/auth/use-current-user";
import { useActiveProject } from "@/hooks/projects/use-active-project";
import { accountGreetingName } from "@/lib/auth/display-name";
import { aiApi, type AiAssistantId, type AiFlowId, type AiFlowDraftResponse } from "@/lib/projects/ai";

/** `flow` marks a guided-flow turn (it is re-run, not edited); `error` an answer that never arrived, so nothing was stored for it. */
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; flow?: boolean; error?: boolean };
type DraftInput = { flowId: AiFlowId; answers: Record<string, string>; conversationId?: string };
type FlowChoice = { label: string; description: string };
type GuidedFlow = { id: AiFlowId; title: string; subtitle: string; steps: Array<{ question: string; choices: FlowChoice[] }> };

const prompts = [
  ["What should I work on today?", AutoAwesomeRounded],
  ["Find users at risk of churning", TrendingDownRounded],
  ["Create a reactivation journey", InsightsRounded],
  ["Improve my onboarding", AutoGraphRounded],
] as const;

const agents = [
  ["Max", "Growth Concierge", "Coordinates the team and turns your goal into a clear next step.", "/assets/agent-avatar-max-v2.png"],
  ["Ben", "Lifecycle & Campaign Data Analyst", "Analyzes retention, churn, campaigns and audience behavior.", "/assets/agent-avatar-ben-v2.png"],
  ["Nova", "Campaign & Journey Optimizer", "Turns Ben’s analysis into campaign and journey recommendations.", "/assets/agent-avatar-nova-v2.png"],
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
    subtitle: "I’ll help you map the audience, trigger and next steps for this journey.",
    steps: [
      { question: "What should start this journey?", choices: [
        { label: "An event or action", description: "Start when a user does something important." },
        { label: "Audience entry", description: "Start when someone joins a saved segment." },
        { label: "A schedule", description: "Begin on a date or recurring schedule." },
        { label: "Something else?", description: "Describe the moment that should start it." },
      ] },
      { question: "Who should enter it?", choices: [
        { label: "All reachable users", description: "Make the journey available to your full audience." },
        { label: "A saved segment", description: "Use an audience you have already defined." },
        { label: "Users matching a behavior", description: "Bring in users based on their activity." },
        { label: "Something else?", description: "Tell Max who this journey is for." },
      ] },
      { question: "What should happen first?", choices: [
        { label: "Send a push", description: "Deliver a timely notification." },
        { label: "Send an email", description: "Start with a detailed email message." },
        { label: "Wait or branch", description: "Create a delay, split or decision point." },
        { label: "Something else?", description: "Describe the first step you need." },
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

function GuidedFlowCard({ flow, step, answers, onSelect, onNext, onBack, onSkip, onCancel }: {
  flow: GuidedFlow; step: number; answers: Record<number, string>; onSelect: (value: string) => void;
  onNext: () => void; onBack: () => void; onSkip: () => void; onCancel: () => void;
}) {
  const current = flow.steps[step];
  const selected = answers[step];
  return <Box className="guided-flow-card">
    <Typography component="h2" className="guided-flow-title">{flow.title}</Typography>
    <Typography className="guided-flow-subtitle">{flow.subtitle}</Typography>
    <Typography className="guided-flow-question">{current.question}</Typography>
    <Stack gap={1}>
      {current.choices.map((choice) => <ButtonBase key={choice.label} className={`guided-flow-choice ${selected === choice.label ? "is-selected" : ""}`} onClick={() => onSelect(choice.label)}>
        <span className="guided-choice-check">{selected === choice.label && <CheckRounded />}</span>
        <Box className="guided-choice-copy"><Typography>{choice.label}</Typography><span>{choice.description}</span></Box>
      </ButtonBase>)}
    </Stack>
    <Stack direction="row" alignItems="center" gap={1.5} className="guided-flow-footer">
      <Button className="guided-flow-cancel" onClick={onCancel}>Cancel</Button>
      <Box className="guided-flow-progress" aria-label={`Step ${step + 1} of ${flow.steps.length}`}>
        {flow.steps.map((_, index) => <span key={index} className={index === step ? "is-current" : index < step ? "is-done" : ""} />)}
      </Box>
      <Stack direction="row" gap={.75}>
        {step > 0 && <Button className="guided-flow-secondary" onClick={onBack}>Back</Button>}
        <Button className="guided-flow-secondary" onClick={onSkip}>Skip</Button>
        <Button className="guided-flow-next" variant="contained" disabled={!selected} onClick={onNext}>{step === flow.steps.length - 1 ? "Finish" : "Next"}</Button>
      </Stack>
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

function draftMessage(result: AiFlowDraftResponse) {
  const values = Object.entries(result.draft)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${String(value)}`);
  const warnings = result.warnings.length ? `\n\n${result.warnings.join(" ")}` : "";
  return `${result.summary}${values.length ? `\n\n${values.join("\n")}` : ""}${warnings}`;
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
  const [selectedAgent, setSelectedAgent] = useState<string>("Max");
  const [, agentRole, , agentAvatar] = agents.find(([name]) => name === selectedAgent) ?? agents[0];

  const catalogQuery = useQuery({
    queryKey: ["projects", projectId, "ai", "catalog"],
    queryFn: () => aiApi.catalog(projectId!),
    enabled: Boolean(projectId),
    staleTime: 5 * 60_000,
  });
  const contextQuery = useQuery({
    queryKey: ["projects", projectId, "ai", "context"],
    queryFn: () => aiApi.context(projectId!),
    enabled: Boolean(projectId),
    staleTime: 30_000,
  });

  const chatMutation = useMutation({
    mutationFn: async (input: { prompt: string; conversationId?: string; replace?: boolean }) => {
      if (!projectId) throw new Error("Select a project before using the AI assistant.");
      const assistant = selectedAgent as AiAssistantId;
      if (input.replace && input.conversationId) {
        try {
          return await aiApi.regenerate(projectId, input.conversationId, { assistant, prompt: input.prompt });
        } catch (error) {
          // ponytail: a backend deployed before /regenerate existed answers ROUTE_NOT_FOUND; fall back to a plain
          // turn (that thread then keeps both answers). Delete this catch once the endpoint is live everywhere.
          if ((error as { code?: string } | null)?.code !== "ROUTE_NOT_FOUND") throw error;
        }
      }
      return aiApi.chat(projectId, { assistant, prompt: input.prompt, conversationId: input.conversationId });
    },
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: response.message }]);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
    },
    onError: (error) => {
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", text: apiMessage(error, "The AI assistant could not respond. Please try again."), error: true }]);
    },
  });

  const draftMutation = useMutation({
    mutationFn: (input: DraftInput) => {
      if (!projectId) throw new Error("Select a project before using the AI assistant.");
      return aiApi.flowDraft(projectId, input.flowId, { assistant: selectedAgent as AiAssistantId, answers: input.answers, conversationId: input.conversationId });
    },
    onSuccess: (response) => {
      setConversationId(response.conversationId);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: draftMessage(response), flow: true }]);
      void queryClient.invalidateQueries({ queryKey: ["projects", projectId, "ai", "context"] });
    },
    onError: (error) => {
      setMessages((current) => [...current, { id: `assistant-error-${Date.now()}`, role: "assistant", text: apiMessage(error, "The draft could not be prepared. Please try again."), flow: true, error: true }]);
    },
  });

  const thinking = openingFlow || chatMutation.isPending || draftMutation.isPending;
  const aiContext = contextQuery.data;

  useEffect(() => {
    setMessages([]);
    setConversationId(undefined);
    setActiveFlow(null);
    setFlowReady(false);
    setFlowAnswers({});
    setFlowStep(0);
    setEditing(null);
    setLastDraft(null);
  }, [projectId]);

  const selectAgent = (name: string) => {
    setSelectedAgent(name);
  };

  const sendMessage = (value = draft) => {
    const text = value.trim();
    if (!text || thinking) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setDraft("");
    setEditing(null);
    chatMutation.mutate({ prompt: text, conversationId });
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

  const startFlow = (flowId: string) => {
    const flow = guidedFlows.find((item) => item.id === flowId);
    if (!flow || thinking || (catalogQuery.data && !catalogQuery.data.flows.includes(flowId as AiFlowId))) return;
    setMessages([{ id: `user-${Date.now()}`, role: "user", flow: true, text: flowId === "segment" ? "I want to create a new audience segment. Help me define the right filters and walk me through setting it up." : `Help me with ${flow.title.toLowerCase()}. Ask me what you need, one step at a time.` }]);
    setActiveFlow(flow);
    setFlowStep(0);
    setFlowAnswers({});
    setFlowReady(false);
    setOpeningFlow(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: flow.subtitle, flow: true }]);
      setOpeningFlow(false);
      setFlowReady(true);
    }, 1100);
  };

  const advanceFlow = (skip = false) => {
    if (!activeFlow) return;
    void skip;
    const nextStep = flowStep + 1;
    if (nextStep < activeFlow.steps.length) {
      setFlowStep(nextStep);
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

  const cancelFlow = () => {
    setActiveFlow(null);
    setFlowReady(false);
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
      {/* The button says what state the composer is in: quiet when empty, lit when there is something to send,
          a spinner while the assistant works. The span lets the tooltip show on a disabled button. */}
      <Tooltip title={thinking ? `${selectedAgent} is thinking…` : draft.trim() ? "Send · Enter" : "Type a message to send"} placement="top">
        <span className="ai-send-wrap">
          <IconButton className={`ai-send${thinking ? " is-busy" : ""}`} aria-label={`Ask ${selectedAgent}`} onClick={() => sendMessage()} disabled={!draft.trim() || thinking}>
            {thinking ? <CircularProgress size={16} thickness={5} color="inherit" /> : <ArrowUpwardRounded />}
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  </Box>;

  const openContext = (value: "recent" | "insight" | "handoff") => {
    setContext(value);
    setContextOpen(true);
    setContextAnchor(null);
  };

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

      <Button className="home-recent-link" startIcon={<HistoryRounded />} onClick={(event) => setContextAnchor(event.currentTarget)}>Recent conversations &amp; context</Button>

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
        <Button className="home-recent-link" startIcon={<AddRounded />} disabled={thinking} onClick={() => { setMessages([]); setConversationId(undefined); setEditing(null); setLastDraft(null); setActiveFlow(null); setFlowReady(false); setFlowAnswers({}); setFlowStep(0); }}>New chat</Button>
        <Button className="home-recent-link" startIcon={<HistoryRounded />} onClick={(event) => setContextAnchor(event.currentTarget)}>Context</Button>
      </Stack>
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
          return <Stack key={message.id} direction="row" gap={1.5} className={`chat-assistant-message${message.error ? " is-error" : ""}`}>
            <Box className="chat-agent-mark"><Image src={agentAvatar} alt={`${selectedAgent} avatar`} width={38} height={38} /></Box>
            <Box>
              <Typography className="chat-agent-name">{selectedAgent} <span>{agentRole}</span></Typography>
              <Typography className="chat-response" role={message.error ? "alert" : undefined}>{message.text}</Typography>
              <Stack direction="row" alignItems="center" className={`chat-actions${isLast ? " is-pinned" : ""}`}>
                {message.error
                  ? retry && <Button size="small" variant="outlined" startIcon={<ReplayRounded />} onClick={retry}>Try again</Button>
                  : <>{copyButton}{retry && <Tooltip title="Retry"><IconButton size="small" aria-label="Retry answer" onClick={retry}><ReplayRounded /></IconButton></Tooltip>}</>}
              </Stack>
            </Box>
          </Stack>;
        })}
        {thinking && <Stack direction="row" gap={1.5} alignItems="center" className="chat-thinking"><Box className="chat-agent-mark is-thinking"><Image src={agentAvatar} alt={`${selectedAgent} avatar`} width={38} height={38} /></Box><Typography>Thinking<span className="thinking-dots">…</span></Typography></Stack>}
        {activeFlow && flowReady && <GuidedFlowCard flow={activeFlow} step={flowStep} answers={flowAnswers} onSelect={(value) => setFlowAnswers((current) => ({ ...current, [flowStep]: value }))} onNext={() => advanceFlow()} onBack={() => setFlowStep((current) => Math.max(0, current - 1))} onSkip={() => advanceFlow(true)} onCancel={cancelFlow} />}
      </Stack>
      <Box className="chat-composer-area">{composer("chat-composer")}<Typography className="chat-disclaimer">{selectedAgent} can make mistakes. Check important growth decisions.</Typography></Box>
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

    <Dialog open={contextOpen} onClose={() => setContextOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{context === "recent" ? "Recent conversations" : context === "insight" ? "Ben’s latest insight" : "Handoff history"}</DialogTitle>
      <DialogContent>
        {context === "recent" && <Stack className="context-dialog-list">{aiContext?.recentConversations?.length ? aiContext.recentConversations.map((item) => <Stack direction="row" alignItems="center" gap={1.5} className="context-dialog-row" key={item.id}><Box className="conversation-icon"><PsychologyRounded /></Box><Box sx={{ flex: 1 }}><Typography fontSize={13} fontWeight={600}>{item.title || item.lastMessage?.content || "AI conversation"}</Typography><Typography fontSize={11} color="text.secondary">{item.assistant}</Typography></Box><Typography fontSize={11} color="text.secondary">{conversationTime(item.updatedAt)}</Typography></Stack>) : <Typography color="text.secondary">No conversations yet.</Typography>}</Stack>}
        {context === "insight" && <Box className="insight-callout"><Typography fontSize={14} fontWeight={650}>{aiContext?.latestInsight.title ?? "No insight yet"}</Typography><Typography fontSize={13} color="text.secondary" sx={{ mt: .7 }}>{aiContext?.latestInsight.message ?? "The latest project insight will appear here."}</Typography><Stack direction="row" gap={1} sx={{ mt: 2 }}><Button variant="contained" size="small" href="/dashboard/journeys/create">Send insights to Nova</Button><Button size="small" href="/dashboard/users">Review audience</Button></Stack></Box>}
        {context === "handoff" && <Stack className="context-dialog-list">{aiContext?.handoffHistory?.length ? aiContext.handoffHistory.map((item) => <Stack direction="row" gap={1.5} className="context-dialog-row" key={`${item.assistant}-${item.action}`}><Box className="handoff-dot" /><Box><Typography fontSize={13} fontWeight={600}>{item.assistant} <span className="handoff-action">{item.action}</span></Typography><Typography fontSize={11} color="text.secondary">{item.status}</Typography></Box></Stack>) : <Typography color="text.secondary">No handoff history yet.</Typography>}</Stack>}
      </DialogContent>
    </Dialog>
  </Box>;
}
