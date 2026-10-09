"use client";

import { ArrowForwardRounded, AutoAwesomeRounded, AutoGraphRounded, CampaignRounded, HistoryRounded, InsightsRounded, PeopleAltOutlined, PsychologyRounded, RouteRounded, SettingsRounded, TrendingDownRounded } from "@mui/icons-material";
import { Avatar, Box, Button, ButtonBase, Chip, Dialog, DialogContent, DialogTitle, Menu, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Image from "next/image";
import { useState } from "react";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

const prompts = [
  ["What should I work on today?", AutoAwesomeRounded],
  ["Find users at risk of churning", TrendingDownRounded],
  ["Create a reactivation journey", InsightsRounded],
  ["Improve my onboarding", AutoGraphRounded],
];

const agents = [
  ["Max", "Growth Concierge", "Coordinates the team and turns your goal into a clear next step.", "#7040c9"],
  ["Ben", "Lifecycle & Campaign Data Analyst", "Analyzes retention, churn, campaigns and audience behavior.", "#2f8d70"],
  ["Nova", "Campaign & Journey Optimizer", "Turns Ben’s analysis into campaign and journey recommendations.", "#df7650"],
  ["Anna", "Cross-Sell & Marketing Expert", "Creates and improves email campaigns and content.", "#4f78c9"],
];

function MaxMark() {
  return <Box className="max-orbit"><Box className="max-orbit-ring ring-one" /><Box className="max-orbit-ring ring-two" /><Box className="max-orbit-glow" /><Image className="max-orbit-icon" src="/assets/site-icon.png" alt="PixlPush AI" width={38} height={56} priority /></Box>;
}

export default function HomeCommandCenter() {
  const [teamOpen, setTeamOpen] = useState(false);
  const [contextAnchor, setContextAnchor] = useState<null | HTMLElement>(null);
  const [context, setContext] = useState<"recent" | "insight" | "handoff" | null>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("Max");

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

  const composer = (className = "home-composer") => <TextField fullWidth value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); sendMessage(); } }} placeholder={`Ask ${selectedAgent} about your users, campaigns, or journeys`} className={`max-input ${className}`} InputProps={{ endAdornment: <Button variant="contained" className="max-ask-button" endIcon={<ArrowForwardRounded />} onClick={() => sendMessage()} disabled={!draft.trim() || thinking}>{thinking ? "Thinking…" : `Ask ${selectedAgent}`}</Button> }} />;

  const openContext = (value: "recent" | "insight" | "handoff") => {
    setContext(value);
    setContextAnchor(null);
  };

  return <Box className="home-experience">
    <Stack className="home-experience-toolbar" direction="row" alignItems="center" justifyContent="space-between">
      <Chip className="home-toolbar-kicker" label="PIXLPUSH AI WORKSPACE" />
      <Stack direction="row" gap={1}>
        <Button className="home-toolbar-button" startIcon={<HistoryRounded />} onClick={(event) => setContextAnchor(event.currentTarget)}>Context</Button>
        <Button className="home-toolbar-button home-toolbar-primary" startIcon={<SettingsRounded />} onClick={() => setTeamOpen(true)}>AI team</Button>
      </Stack>
    </Stack>

    {messages.length === 0 ? <Box className="home-hero">
      <MaxMark />
      <Chip className="home-ai-badge" icon={<AutoAwesomeRounded />} label="AI POWERED" />
      <Typography className="home-hero-title">Good afternoon, Haseeb.</Typography>
      <Typography className="home-hero-subtitle">Let’s make your next growth move.</Typography>

      {composer()}

      <Stack direction="row" justifyContent="center" gap={1} flexWrap="wrap" className="home-prompt-row">
        {prompts.map(([label, Icon]) => <Button key={label as string} className="home-prompt" startIcon={<Icon />} onClick={() => sendMessage(label as string)}>{label as string}</Button>)}
      </Stack>

      <Stack direction="row" gap={1.5} className="home-feature-row">
        {[[CampaignRounded, "Smart campaigns", "Create messages that move your audience.", "/dashboard/email"], [RouteRounded, "Journey builder", "Automate the moments that matter.", "/dashboard/journeys"], [PeopleAltOutlined, "Audience insights", "Understand who to reach next.", "/dashboard/users"], [AutoGraphRounded, "Higher engagement", "Turn attention into retention.", "/dashboard/analytics"]].map(([Icon, title, description, href]) => <Button key={title as string} href={href as string} className="home-feature-card"><Box className="home-feature-icon"><Icon /></Box><Box className="home-feature-copy"><Typography>{title as string}</Typography><span>{description as string}</span></Box><ArrowForwardRounded className="home-feature-arrow" /></Button>)}
      </Stack>
    </Box> : <Box className="chat-experience">
      <Stack className="chat-thread" gap={2.5}>
        {messages.map((message) => message.role === "user" ? <Box key={message.id} className="chat-user-message">{message.text}</Box> : <Stack key={message.id} direction="row" gap={1.5} className="chat-assistant-message"><Box className="chat-agent-mark"><Image src="/assets/site-icon.png" alt={selectedAgent} width={22} height={32} /></Box><Box><Typography className="chat-agent-name">{selectedAgent} <span>{agents.find(([name]) => name === selectedAgent)?.[1]}</span></Typography><Typography className="chat-response">{message.text}</Typography></Box></Stack>)}
        {thinking && <Stack direction="row" gap={1.5} alignItems="center" className="chat-thinking"><Box className="chat-agent-mark is-thinking"><Image src="/assets/site-icon.png" alt="Max" width={22} height={32} /></Box><Typography>Thinking<span className="thinking-dots">…</span></Typography></Stack>}
      </Stack>
      <Box className="chat-composer-area">{composer("chat-composer")}<Typography className="chat-disclaimer">{selectedAgent} can make mistakes. Check important growth decisions.</Typography></Box>
    </Box>}

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

    <Dialog open={teamOpen} onClose={() => setTeamOpen(false)} maxWidth="sm" fullWidth><DialogTitle>Choose your AI assistant</DialogTitle><DialogContent><Typography color="text.secondary" fontSize={13} sx={{ mb: 2 }}>Select the specialist you want to work with. Max can always bring the rest of the team into the same conversation.</Typography><Stack divider={<Box component="span" sx={{ borderTop: "1px solid #eeeaf4" }} />}>{agents.map(([name, role, description, color]) => <ButtonBase key={name} className={`agent-setting-row ${selectedAgent === name ? "is-selected" : ""}`} onClick={() => { setSelectedAgent(name); setTeamOpen(false); }}><Avatar sx={{ width: 40, height: 40, bgcolor: `${color}18`, color, fontWeight: 700 }}>{name.slice(0, 1)}</Avatar><Box sx={{ flex: 1, textAlign: "left" }}><Typography fontWeight={650} fontSize={13}>{name}</Typography><Typography fontSize={11} color="text.secondary">{role}</Typography><Typography fontSize={12} sx={{ mt: .4 }}>{description}</Typography></Box><Chip label={selectedAgent === name ? "Selected" : "Select"} size="small" className={selectedAgent === name ? "context-chip selected-agent-chip" : "agent-select-chip"} /></ButtonBase>)}</Stack></DialogContent></Dialog>
  </Box>;
}
