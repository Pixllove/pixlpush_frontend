"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { Alert, AlertTitle, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { CreditCardRounded, LockRounded, WarningAmberRounded } from "@mui/icons-material";
import { canManageBilling } from "@/lib/billing";
import { supportApi } from "@/lib/support/api";
import type { Project } from "@/types/project";

export const PAYMENT_METHODS_HREF = "/dashboard/billing?tab=methods";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const daysText = (days: number) => (days <= 0 ? "today" : days === 1 ? "in 1 day" : `in ${days} days`);

/** Pinned at the top of every dashboard page while a payment is failing or overdue. Not dismissible. */
export function BillingAlarm({ project }: { project?: Project | null }) {
  const billing = project?.billing;
  if (!project || !billing || billing.state === "ok") return null;
  const locked = billing.state === "locked";
  const canPay = canManageBilling(project.role);
  return (
    <Alert
      severity={locked ? "error" : "warning"}
      icon={locked ? <LockRounded /> : <WarningAmberRounded />}
      role="alert"
      data-testid="billing-alarm"
      action={canPay ? (
        <Button component={Link} href={PAYMENT_METHODS_HREF} color="inherit" variant="outlined" size="small" startIcon={<CreditCardRounded />} sx={{ whiteSpace: "nowrap", textTransform: "none", fontWeight: 600 }}>
          Update payment method
        </Button>
      ) : undefined}
      sx={{ mb: 2, borderRadius: 2, alignItems: "center", "& .MuiAlert-action": { pt: 0 } }}
    >
      <AlertTitle sx={{ fontWeight: 700, mb: 0.25 }}>
        {locked ? `Access paused: payment overdue for ${project.name}` : `Payment failed for ${project.name}`}
      </AlertTitle>
      {locked
        ? "We could not collect your payment, so this workspace is paused and sending has stopped. Access returns as soon as the payment goes through."
        : `You'll lose access to this workspace ${daysText(billing.daysLeft ?? 0)} (${formatDate(billing.graceEndsAt!)}) unless the payment goes through. Please check your payment method.`}
      {!canPay && " Ask a project owner or billing member to update the payment method."}
    </Alert>
  );
}

/**
 * Wraps a locked project's workspace: any click on a button, link or field
 * opens a dialog pointing to Billing, or lets the user report a mistake.
 */
export function BillingLockGate({ project, children }: { project?: Project | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  if (!project || project.billing?.state !== "locked") return <>{children}</>;

  const intercept = (event: MouseEvent) => {
    if (!(event.target as HTMLElement).closest("button, a, input, select, textarea, [role=button], [role=tab], [role=checkbox], [role=switch]")) return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  const reportMistake = async () => {
    setSending(true); setError("");
    try {
      const result = await supportApi.create({
        topic: "billing",
        subject: "Workspace paused for payment: possible mistake",
        projectId: project.id,
        source: "dashboard",
        message: `My project “${project.name}” is paused for an overdue payment, but I believe this is a mistake. Please review the billing status.`,
      });
      setReference(result.ticket.reference);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not open a ticket. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <>
      <Box onClickCapture={intercept} data-testid="billing-lock-gate">{children}</Box>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth aria-labelledby="billing-lock-title">
        <DialogTitle id="billing-lock-title" sx={{ fontWeight: 700 }}>Workspace paused</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Access to <b>{project.name}</b> is paused because a payment is overdue. Update your payment method in Billing to restore it right away.
          </Typography>
          {reference && <Alert severity="success" sx={{ mt: 2 }}>Ticket {reference} opened. Our team will review it and reply by email.</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} gap={1} sx={{ width: "100%" }} justifyContent="flex-end">
            <Button onClick={reportMistake} disabled={sending || Boolean(reference)} sx={{ textTransform: "none" }}>
              {sending ? "Opening ticket…" : reference ? "Ticket opened" : "This is a mistake: open a ticket"}
            </Button>
            <Button component={Link} href={PAYMENT_METHODS_HREF} variant="contained" sx={{ textTransform: "none" }}>Go to billing</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </>
  );
}
