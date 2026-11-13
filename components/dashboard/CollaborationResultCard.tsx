"use client";

import { CheckCircleOutlineRounded, ErrorOutlineRounded, InfoOutlined, ReplayRounded, StopCircleOutlined, VerifiedOutlined } from "@mui/icons-material";
import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import Image from "next/image";
import type { AiAgentId, AiAgentResult, AiCollaboration } from "@/lib/projects/ai";

export type CollaborationAgentProfile = {
  id: AiAgentId;
  role: string;
  avatar: string;
};

type CollaborationResultCardProps = {
  result: AiAgentResult;
  task?: AiCollaboration["tasks"][number];
  profile: CollaborationAgentProfile;
  onRetry?: () => void;
  retrying?: boolean;
  approvalStatus?: AiCollaboration["approvalStatus"];
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onCancel?: () => void;
  approvalBusy?: boolean;
};

function confidenceLabel(value: AiAgentResult["confidence"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/^./, (value) => value.toUpperCase());
}

export default function CollaborationResultCard({ result, task, profile, onRetry, retrying, approvalStatus, onApprove, onReject, onViewDetails, onCancel, approvalBusy }: CollaborationResultCardProps) {
  const failed = result.status === "failed" || task?.status === "failed";
  const incomplete = result.status === "needs_data" || result.status === "blocked";
  const pendingApproval = approvalStatus === "pending" && result.approvalRequired;

  return <Box sx={{ mt: 1.25, p: 1.5, border: "1px solid rgba(89, 57, 111, .14)", borderRadius: 2.5, bgcolor: "rgba(250, 247, 252, .82)" }} data-testid={`collaboration-result-${result.agentId}`}>
    <Stack direction="row" alignItems="center" gap={1}>
      <Image src={profile.avatar} alt={`${profile.id} avatar`} width={34} height={34} style={{ borderRadius: "50%" }} />
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography fontSize="var(--fs-13)" fontWeight={700}>{profile.id}</Typography>
        <Typography fontSize="var(--fs-11)" color="text.secondary">{profile.role}</Typography>
      </Box>
      <Chip size="small" icon={failed ? <ErrorOutlineRounded /> : incomplete ? <InfoOutlined /> : <CheckCircleOutlineRounded />} label={statusLabel(result.status)} color={failed ? "error" : incomplete ? "warning" : "success"} variant="outlined" />
    </Stack>

    <Typography sx={{ mt: 1.25, fontSize: "var(--fs-13)", lineHeight: 1.6 }}>{result.summary}</Typography>

    {result.findings?.length ? <Section title="Findings" items={result.findings} /> : null}
    {result.evidence.length ? <Box sx={{ mt: 1.25 }}>
      <Typography fontSize="var(--fs-12)" fontWeight={700}>Evidence</Typography>
      <Stack gap={.65} sx={{ mt: .65 }}>
        {result.evidence.map((item, index) => <Box key={`${item.label}-${index}`} sx={{ p: .85, borderRadius: 1.5, bgcolor: "rgba(91, 58, 112, .06)" }}>
          <Typography fontSize="var(--fs-11)" fontWeight={700}>{item.label}</Typography>
          <Typography fontSize="var(--fs-12)" color="text.secondary">{item.value}</Typography>
          {item.source ? <Typography fontSize="var(--fs-10)" color="text.secondary">Source: {item.source}</Typography> : null}
        </Box>)}
      </Stack>
    </Box> : null}
    {result.recommendations.length ? <Section title="Recommendations" items={result.recommendations} /> : null}
    {result.missingData.length ? <Box sx={{ mt: 1.25, p: 1, borderRadius: 1.5, bgcolor: "rgba(236, 172, 54, .10)" }}>
      <Typography fontSize="var(--fs-12)" fontWeight={700}>Missing data</Typography>
      <Stack component="ul" gap={.25} sx={{ mt: .5, mb: 0, pl: 2.2 }}>{result.missingData.map((item) => <Typography component="li" key={item} fontSize="var(--fs-12)" color="text.secondary">{item}</Typography>)}</Stack>
    </Box> : null}

    <Stack direction="row" alignItems="center" flexWrap="wrap" gap={.8} sx={{ mt: 1.25 }}>
      <Typography fontSize="var(--fs-11)" color="text.secondary">Confidence: {confidenceLabel(result.confidence)}</Typography>
      {task ? <Typography fontSize="var(--fs-11)" color="text.secondary">Attempt {task.attempt}/{task.maxAttempts}</Typography> : null}
      {result.approvalRequired && approvalStatus && approvalStatus !== "not_required" ? <Chip size="small" icon={<VerifiedOutlined />} label={approvalStatus === "pending" ? "Approval required" : `Approval ${approvalStatus}`} variant="outlined" /> : null}
    </Stack>

    {failed && onRetry ? <Button size="small" sx={{ mt: 1 }} startIcon={<ReplayRounded />} onClick={onRetry} disabled={retrying}>{retrying ? "Retrying…" : "Retry specialist"}</Button> : null}
    {pendingApproval ? <Stack direction={{ xs: "column", sm: "row" }} gap={.8} sx={{ mt: 1.25 }}>
      {onViewDetails ? <Button size="small" variant="text" onClick={onViewDetails}>Review recommendation</Button> : null}
      <Button size="small" variant="contained" onClick={onApprove} disabled={approvalBusy}>Approve draft</Button>
      {onReject ? <Button size="small" variant="outlined" color="error" onClick={onReject} disabled={approvalBusy}>Reject recommendation</Button> : null}
      {onViewDetails ? <Button size="small" variant="text" onClick={onViewDetails}>View collaboration details</Button> : null}
      <Typography fontSize="var(--fs-10)" color="text.secondary" sx={{ alignSelf: "center" }}>Approval does not send, schedule, or activate anything.</Typography>
    </Stack> : null}
    {approvalStatus === "approved" ? <Typography fontSize="var(--fs-11)" color="success.main" sx={{ mt: 1.1 }}>Approved for review. Sending, scheduling, or activation remains a separate action.</Typography> : null}
    {approvalStatus === "rejected" ? <Typography fontSize="var(--fs-11)" color="error.main" sx={{ mt: 1.1 }}>Recommendation rejected. Nothing was sent or activated.</Typography> : null}
    {approvalStatus === "cancelled" ? <Typography fontSize="var(--fs-11)" color="text.secondary" sx={{ mt: 1.1 }}>This collaboration was cancelled.</Typography> : null}
    {approvalStatus === "needs_data" ? <Typography fontSize="var(--fs-11)" color="warning.main" sx={{ mt: 1.1 }}>More project data is required before this collaboration can continue.</Typography> : null}
    {approvalStatus === "blocked" ? <Typography fontSize="var(--fs-11)" color="error.main" sx={{ mt: 1.1 }}>This collaboration is blocked and needs attention.</Typography> : null}
    {onCancel && !["approved", "rejected", "cancelled", "needs_data", "blocked"].includes(approvalStatus ?? "not_required") ? <Button size="small" color="inherit" sx={{ mt: 1 }} startIcon={<StopCircleOutlined />} onClick={onCancel}>Cancel collaboration</Button> : null}
  </Box>;
}

function Section({ title, items }: { title: string; items: string[] }) {
  return <Box sx={{ mt: 1.25 }}>
    <Typography fontSize="var(--fs-12)" fontWeight={700}>{title}</Typography>
    <Stack component="ul" gap={.25} sx={{ mt: .45, mb: 0, pl: 2.2 }}>{items.map((item) => <Typography component="li" key={item} fontSize="var(--fs-12)" color="text.secondary">{item}</Typography>)}</Stack>
  </Box>;
}

export function CollaborationTimeline({ collaboration, profiles, onRetry, retryingTaskKey, onApprove, onReject, onViewDetails, onCancel, approvalBusy, compact = false }: {
  collaboration: AiCollaboration;
  profiles: CollaborationAgentProfile[];
  onRetry?: (taskKey: string) => void;
  retryingTaskKey?: string | null;
  onApprove?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
  onCancel?: () => void;
  approvalBusy?: boolean;
  compact?: boolean;
}) {
  const profileFor = (agentId: AiAgentId) => profiles.find((profile) => profile.id === agentId) ?? { id: agentId, role: "PixlPush specialist", avatar: "/assets/agent-avatar-max-v4.webp" };
  const taskFor = (taskKey: string) => collaboration.tasks.find((task) => task.taskKey === taskKey);
  const failedResultIndex = collaboration.results.findIndex((result) => result.status === "failed");
  const visibleResults = failedResultIndex >= 0 ? collaboration.results.slice(0, failedResultIndex + 1) : collaboration.results;
  const failedAgent = failedResultIndex >= 0 ? collaboration.results[failedResultIndex]?.agentId : null;
  const failedParticipantIndex = failedAgent ? collaboration.participants.findIndex((participant) => participant.agentId === failedAgent) : -1;
  const visibleParticipants = failedParticipantIndex >= 0 ? collaboration.participants.slice(0, failedParticipantIndex + 1) : collaboration.participants;
  const visibleTaskKeys = new Set(visibleResults.map((result) => result.taskKey));

  return <Stack gap={1.25} sx={{ mt: 1.5 }} data-testid="collaboration-timeline">
    {!compact && <>
      <Divider />
      <Typography fontSize="var(--fs-12)" fontWeight={700}>Collaboration timeline</Typography>
      <Stack gap={.65}>
        {visibleParticipants.map((participant) => <Typography key={`${participant.agentId}-${participant.role}`} fontSize="var(--fs-12)" color="text.secondary">
          {participant.agentId === collaboration.leadAgent ? `${participant.agentId} is leading this collaboration.` : `${collaboration.leadAgent} invited ${participant.agentId} to analyze this request.`}
        </Typography>)}
        {collaboration.tasks.filter((task) => !visibleResults.length || visibleTaskKeys.has(task.taskKey)).map((task) => <Typography key={task.taskKey} fontSize="var(--fs-12)" color="text.secondary">
          {task.agentId} {task.status === "completed" ? `completed ${task.type}.` : task.status === "failed" ? `failed to complete ${task.type}.` : task.status === "cancelled" ? `cancelled ${task.type}.` : `is ${task.status} ${task.type}.`} Attempt {task.attempt}/{task.maxAttempts}.
        </Typography>)}
        {collaboration.activeAgent || collaboration.currentAgent ? <Typography fontSize="var(--fs-12)" color="text.secondary">Active agent: {collaboration.activeAgent ?? collaboration.currentAgent}</Typography> : null}
        {collaboration.nextAgent ? <Typography fontSize="var(--fs-12)" color="text.secondary">Next agent: {collaboration.nextAgent}</Typography> : null}
        {collaboration.events?.map((event) => <Typography key={event.id} fontSize="var(--fs-11)" color="text.secondary">{event.type}{event.actorAgent ? ` · ${event.actorAgent}` : ""} · {new Date(event.createdAt).toLocaleString()}</Typography>)}
      </Stack>
    </>}
    {visibleResults.map((result) => <CollaborationResultCard key={`${result.taskKey}-${result.agentId}`} result={result} task={taskFor(result.taskKey)} profile={profileFor(result.agentId)} onRetry={onRetry ? () => onRetry(result.taskKey) : undefined} retrying={retryingTaskKey === result.taskKey} approvalStatus={collaboration.approvalStatus} onApprove={onApprove} onReject={onReject} onViewDetails={onViewDetails} onCancel={onCancel} approvalBusy={approvalBusy} />)}
  </Stack>;
}

export function CollaborationStatus({ collaboration }: { collaboration: AiCollaboration }) {
  const specialist = collaboration.participants.find((participant) => participant.agentId !== collaboration.leadAgent);
  if (!specialist) return null;
  const task = collaboration.tasks.find((item) => item.agentId === specialist.agentId);
  if (task?.status === "failed") return <Typography fontSize="var(--fs-12)" color="error.main" role="status">{specialist.agentId} could not complete the analysis.</Typography>;
  if (task?.status === "completed" || collaboration.results.some((result) => result.agentId === specialist.agentId)) return <Typography fontSize="var(--fs-12)" color="success.main" role="status">{specialist.agentId} completed the analysis.</Typography>;
  if (task?.status === "running") return <Typography fontSize="var(--fs-12)" color="text.secondary" role="status">{specialist.agentId} is analyzing the campaign.</Typography>;
  return <Typography fontSize="var(--fs-12)" color="text.secondary" role="status">{collaboration.leadAgent} invited {specialist.agentId} to analyze this campaign.</Typography>;
}
