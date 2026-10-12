"use client";

import { AddRounded, ArrowForwardRounded, ArrowUpwardRounded, AutoAwesomeRounded, AutoGraphRounded, CampaignRounded, CheckRounded, ExpandMoreRounded, HistoryRounded, InsightsRounded, PeopleAltOutlined, PsychologyRounded, RouteRounded, TrendingDownRounded } from "@mui/icons-material";
import { Box, Button, ButtonBase, Dialog, DialogContent, DialogTitle, IconButton, InputBase, Menu, MenuItem, Stack, Typography } from "@mui/material";
import Image from "next/image";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/auth/use-current-user";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const prompts = [
  ["What should I work on today?", AutoAwesomeRounded],
  ["Find users at risk of churning", TrendingDownRounded],
  ["Create a reactivation journey", InsightsRounded],
  ["Improve my onboarding", AutoGraphRounded],
] as const;

const agents = [
  ["Max", "Growth Concierge", "Coordinates the team and turns your goal into a clear next step.", "#7040c9"],
  ["Ben", "Lifecycle & Campaign Data Analyst", "Analyzes retention, churn, campaigns and audience behavior.", "#2f8d70"],
  ["Nova", "Campaign & Journey Optimizer", "Turns Ben’s analysis into campaign and journey recommendations.", "#df7650"],
  ["Anna", "Cross-Sell & Marketing Expert", "Creates and improves email campaigns and content.", "#4f78c9"],
] as const;

const shortcuts = [
  [CampaignRounded, "Smart campaigns", "Create messages that move your audience.", "/dashboard/email"],
  [RouteRounded, "Journey builder", "Automate the moments that matter.", "/dashboard/journeys"],
  [PeopleAltOutlined, "Audience insights", "Understand who to reach next.", "/dashboard/users"],
  [AutoGraphRounded, "Higher engagement", "Turn attention into retention.", "/dashboard/analytics"],
] as const;

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
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

export default function HomeCommandCenter() {
  const { account } = useCurrentUser();
  const firstName = account?.name?.trim().split(/\s+/)[0];
  const [agentAnchor, setAgentAnchor] = useState<null | HTMLElement>(null);
  const [contextAnchor, setContextAnchor] = useState<null | HTMLElement>(null);
  const [context, setContext] = useState<"recent" | "insight" | "handoff" | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("Max");
  const [, agentRole, , agentColor] = agents.find(([name]) => name === selectedAgent) ?? agents[0];

  const sendMessage = (value = draft) => {
    const text = value.trim();
    if (!text || thinking) return;
    setMessages((current) => [...current, { id: `user-${Date.now()}`, role: "user", text }]);
    setDraft("");
    setThinking(true);
    window.setTimeout(() => {
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: "I’ve reviewed your growth context. A strong next step is reactivation: Ben can identify your highest-intent inactive users, then Nova can shape the journey and Anna can draft the messages.",
      }]);
      setThinking(false);
    }, 5000);
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
        <span className="ai-agent-dot" style={{ background: agentColor }}>{selectedAgent.slice(0, 1)}</span>
        <b>{selectedAgent}</b>
        <span className="ai-agent-role">{agentRole}</span>
        <ExpandMoreRounded />
      </ButtonBase>
      <Stack direction="row" alignItems="center" gap={1.25}>
        <span className="ai-composer-hint">{thinking ? `${selectedAgent} is thinking…` : "Enter to send"}</span>
        <IconButton className="ai-send" aria-label={`Ask ${selectedAgent}`} onClick={() => sendMessage()} disabled={!draft.trim() || thinking}><ArrowUpwardRounded /></IconButton>
      </Stack>
    </Stack>
  </Box>;

  const openContext = (value: "recent" | "insight" | "handoff") => {
    setContext(value);
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

      <Box className="home-feature-row">
        {shortcuts.map(([Icon, title, description, href]) => <Button key={title} href={href} className="home-feature-card"><Box className="home-feature-icon"><Icon /></Box><Box className="home-feature-copy"><Typography>{title}</Typography><span>{description}</span></Box><ArrowForwardRounded className="home-feature-arrow" /></Button>)}
      </Box>

      <Typography className="home-disclaimer">AI can make mistakes. Check important growth decisions.</Typography>
    </Box> : <Box className="chat-experience">
      <Stack direction="row" justifyContent="space-between" className="chat-topbar">
        <Button className="home-recent-link" startIcon={<AddRounded />} disabled={thinking} onClick={() => setMessages([])}>New chat</Button>
        <Button className="home-recent-link" startIcon={<HistoryRounded />} onClick={(event) => setContextAnchor(event.currentTarget)}>Context</Button>
      </Stack>
      <Stack className="chat-thread" gap={2.5}>
        {messages.map((message) => message.role === "user" ? <Box key={message.id} className="chat-user-message">{message.text}</Box> : <Stack key={message.id} direction="row" gap={1.5} className="chat-assistant-message"><Box className="chat-agent-mark"><Image src="/assets/site-icon.png" alt="" width={22} height={32} /></Box><Box><Typography className="chat-agent-name">{selectedAgent} <span>{agentRole}</span></Typography><Typography className="chat-response">{message.text}</Typography></Box></Stack>)}
        {thinking && <Stack direction="row" gap={1.5} alignItems="center" className="chat-thinking"><Box className="chat-agent-mark is-thinking"><Image src="/assets/site-icon.png" alt="" width={22} height={32} /></Box><Typography>Thinking<span className="thinking-dots">…</span></Typography></Stack>}
      </Stack>
      <Box className="chat-composer-area">{composer("chat-composer")}<Typography className="chat-disclaimer">{selectedAgent} can make mistakes. Check important growth decisions.</Typography></Box>
    </Box>}

    <Menu anchorEl={agentAnchor} open={Boolean(agentAnchor)} onClose={() => setAgentAnchor(null)} className="agent-menu">
      {agents.map(([name, role, description, color]) => <MenuItem key={name} selected={selectedAgent === name} className="agent-menu-item" onClick={() => { setSelectedAgent(name); setAgentAnchor(null); }}>
        <span className="ai-agent-dot" style={{ background: color }}>{name.slice(0, 1)}</span>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography className="agent-menu-name">{name} <span>{role}</span></Typography><Typography className="agent-menu-description">{description}</Typography></Box>
        {selectedAgent === name && <CheckRounded className="agent-menu-check" />}
      </MenuItem>)}
    </Menu>

    <Menu anchorEl={contextAnchor} open={Boolean(contextAnchor)} onClose={() => setContextAnchor(null)} className="home-context-menu">
      <MenuItem onClick={() => openContext("recent")}><HistoryRounded /> Recent conversations</MenuItem>
      <MenuItem onClick={() => openContext("insight")}><InsightsRounded /> Ben’s latest insight</MenuItem>
      <MenuItem onClick={() => openContext("handoff")}><PsychologyRounded /> Handoff history</MenuItem>
    </Menu>

    <Dialog open={Boolean(context)} onClose={() => setContext(null)} maxWidth="sm" fullWidth>
      <DialogTitle>{context === "recent" ? "Recent conversations" : context === "insight" ? "Ben’s latest insight" : "Handoff history"}</DialogTitle>
      <DialogContent>
        {context === "recent" && <Stack className="context-dialog-list">{[["Reduce churn in my trial users", "Max · Ben", "Today"], ["Improve the welcome email series", "Max · Anna", "Yesterday"], ["Build a journey for inactive users", "Max · Ben · Nova", "Sep 17"]].map(([title, team, time]) => <Stack direction="row" alignItems="center" gap={1.5} className="context-dialog-row" key={title}><Box className="conversation-icon"><PsychologyRounded /></Box><Box sx={{ flex: 1 }}><Typography fontSize={13} fontWeight={600}>{title}</Typography><Typography fontSize={11} color="text.secondary">{team}</Typography></Box><Typography fontSize={11} color="text.secondary">{time}</Typography></Stack>)}</Stack>}
        {context === "insight" && <Box className="insight-callout"><Typography fontSize={14} fontWeight={650}>Reactivation is your clearest opportunity</Typography><Typography fontSize={13} color="text.secondary" sx={{ mt: .7 }}>Ben found 5,215 users inactive for 14+ days. Reaching them now could lift returning users by an estimated 8–12%.</Typography><Stack direction="row" gap={1} sx={{ mt: 2 }}><Button variant="contained" size="small" href="/dashboard/journeys/create">Send insights to Nova</Button><Button size="small" href="/dashboard/users">Review audience</Button></Stack></Box>}
        {context === "handoff" && <Stack className="context-dialog-list">{[["Max", "understood the goal", "Improve reactivation"], ["Ben", "analyzed inactive-user behavior", "Analysis complete"], ["Nova", "recommended a reactivation journey", "Ready to review"], ["Anna", "created the campaign content", "Draft available"]].map(([agent, action, status]) => <Stack direction="row" gap={1.5} className="context-dialog-row" key={agent}><Box className="handoff-dot" /><Box><Typography fontSize={13} fontWeight={600}>{agent} <span className="handoff-action">{action}</span></Typography><Typography fontSize={11} color="text.secondary">{status}</Typography></Box></Stack>)}</Stack>}
      </DialogContent>
    </Dialog>
  </Box>;
}
