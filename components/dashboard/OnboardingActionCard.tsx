"use client";

import { ArrowForwardRounded, CheckRounded, CloseRounded, InfoOutlined } from "@mui/icons-material";
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, LinearProgress, Stack, Typography } from "@mui/material";
import { useState } from "react";
import type { AiNextAction, AiOnboardingStatus } from "@/lib/projects/ai";

type OnboardingActionCardProps = {
  onboarding: AiOnboardingStatus;
  nextActions?: string[];
  catalogActions?: AiNextAction[];
};

const statusLabel: Record<AiOnboardingStatus["status"], string> = {
  complete: "Complete",
  skipped: "Skipped",
  in_progress: "In progress",
  not_started: "Not started",
};

/**
 * A safe in-chat onboarding entry point. Step completion still happens in the
 * existing onboarding/settings screens, so this card never fakes a completed
 * setup step or exposes integration credentials in the conversation.
 */
export default function OnboardingActionCard({ onboarding, nextActions = [], catalogActions = [] }: OnboardingActionCardProps) {
  const [open, setOpen] = useState(false);
  const actionById = new Map(catalogActions.map((action) => [action.id, action]));
  const actions = nextActions.map((id) => actionById.get(id)).filter((action): action is AiNextAction => Boolean(action));
  const missing = onboarding.missingSteps ?? [];

  return <>
    <Box sx={{ mt: 1.25, p: 1.5, border: "1px solid rgba(89, 57, 111, .14)", borderRadius: 2.5, bgcolor: "rgba(250, 247, 252, .82)" }} data-testid="onboarding-action-card">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography fontSize="var(--fs-14)" fontWeight={700}>Onboarding progress</Typography>
          <Typography fontSize="var(--fs-12)" color="text.secondary" sx={{ mt: .35 }}>
            {onboarding.completedCount} of {onboarding.totalSteps} steps complete · {statusLabel[onboarding.status]}
          </Typography>
        </Box>
        <Typography fontSize="var(--fs-13)" fontWeight={700}>{onboarding.completionPercentage}%</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={onboarding.completionPercentage} sx={{ mt: 1, height: 6, borderRadius: 3 }} />

      {onboarding.nextStep ? <Stack direction="row" gap={.75} alignItems="flex-start" sx={{ mt: 1.25 }}>
        <InfoOutlined fontSize="small" color="action" />
        <Box>
          <Typography fontSize="var(--fs-12)" fontWeight={700}>Next: {onboarding.nextStep.title}</Typography>
          <Typography fontSize="var(--fs-11)" color="text.secondary">{onboarding.nextStep.reason || onboarding.nextStep.action}</Typography>
        </Box>
      </Stack> : null}

      {missing.length ? <Stack gap={.55} sx={{ mt: 1.25 }}>
        <Typography fontSize="var(--fs-12)" fontWeight={700}>Steps to complete</Typography>
        {missing.slice(0, 4).map((step) => <Stack direction="row" alignItems="center" gap={.75} key={`${step.number}-${step.kind}`}>
          <InfoOutlined sx={{ fontSize: 16 }} color="warning" />
          <Typography fontSize="var(--fs-12)">{step.title}</Typography>
        </Stack>)}
        {missing.length > 4 ? <Typography fontSize="var(--fs-11)" color="text.secondary">+{missing.length - 4} more steps</Typography> : null}
      </Stack> : <Stack direction="row" gap={.75} alignItems="center" sx={{ mt: 1.25 }}><CheckRounded color="success" fontSize="small" /><Typography fontSize="var(--fs-12)">Your onboarding steps are complete.</Typography></Stack>}

      <Stack direction={{ xs: "column", sm: "row" }} gap={.8} sx={{ mt: 1.35 }}>
        <Button variant="contained" size="small" onClick={() => setOpen(true)}>{missing.length ? "Review onboarding" : "View onboarding"}</Button>
        {onboarding.nextStep?.href ? <Button variant="outlined" size="small" href={onboarding.nextStep.href} endIcon={<ArrowForwardRounded />}>Continue next step</Button> : null}
      </Stack>
    </Box>

    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box><Typography fontWeight={700}>Complete onboarding</Typography><Typography fontSize="var(--fs-12)" color="text.secondary">Choose a step to continue in the existing PixlPush setup flow.</Typography></Box>
        <Button aria-label="Close onboarding details" onClick={() => setOpen(false)} sx={{ minWidth: 0, p: .5 }}><CloseRounded /></Button>
      </DialogTitle>
      <DialogContent>
        <Stack gap={1.1}>
      {missing.length ? missing.map((step) => <Box key={`${step.number}-${step.kind}`} sx={{ p: 1.1, border: "1px solid rgba(89, 57, 111, .12)", borderRadius: 1.7 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box><Typography fontSize="var(--fs-13)" fontWeight={700}>{step.number}. {step.title}</Typography><Typography fontSize="var(--fs-11)" color="text.secondary" sx={{ mt: .35 }}>{step.reason || step.action}</Typography></Box>
              <Button size="small" variant="outlined" href={step.href} onClick={() => setOpen(false)}>Complete step</Button>
            </Stack>
          </Box>) : <Typography color="text.secondary">No missing onboarding steps.</Typography>}
          {actions.length ? <><Divider sx={{ my: .35 }} /><Typography fontSize="var(--fs-12)" fontWeight={700}>Recommended next actions</Typography>{actions.map((action) => <Button key={action.id} href={action.href} onClick={() => setOpen(false)} size="small" variant="text" sx={{ justifyContent: "flex-start" }}>{action.label}</Button>)}</> : null}
        </Stack>
      </DialogContent>
    </Dialog>
  </>;
}
