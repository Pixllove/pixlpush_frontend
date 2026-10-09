'use client';

import type { ReactNode } from 'react';
import { CheckCircleOutlineRounded, ErrorOutlineRounded, WarningAmberRounded } from '@mui/icons-material';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import type { Finding } from '@/lib/deliverability';

export type SenderState = {
  loading: boolean;
  /** The backend's own answer to "may this project send": domain authenticated, sending connection verified, feedback webhook set. */
  ready: boolean;
  /** What the backend says is still missing. */
  blockers?: { code: string; message: string }[];
};

const Row = ({ tone, children }: { tone: 'pass' | 'warn' | 'block'; children: ReactNode }) => (
  <Stack direction="row" gap={1} alignItems="flex-start" component="li" data-tone={tone}>
    {tone === 'pass' ? <CheckCircleOutlineRounded color="success" sx={{ fontSize: 18 }} /> : tone === 'warn' ? <WarningAmberRounded color="warning" sx={{ fontSize: 18 }} /> : <ErrorOutlineRounded color="error" sx={{ fontSize: 18 }} />}
    <Box>{typeof children === 'string' ? <Typography variant="body2">{children}</Typography> : children}</Box>
  </Stack>
);

const FindingRow = ({ finding }: { finding: Finding }) => (
  <Row tone={finding.level === 'block' ? 'block' : 'warn'}>
    <Typography variant="body2" fontWeight={600}>
      {finding.title}{finding.level === 'strong' && ' (high risk)'}
    </Typography>
    <Typography variant="body2" color="text.secondary">{finding.reason} {finding.recommendation}</Typography>
    {finding.detail?.length ? <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>{finding.detail.join(', ')}</Typography> : null}
  </Row>
);

/**
 * The last check before a campaign goes out. Technical requirements block sending; content findings are
 * recommendations and never do.
 */
export default function DeliverabilityCheck({ findings, sender }: { findings: Finding[]; sender: SenderState }) {
  const blocks = findings.filter((f) => f.level === 'block');
  const risks = findings.filter((f) => f.level !== 'block');
  const has = (...codes: string[]) => findings.some((f) => codes.includes(f.code));
  const blocked = !sender.loading && (!sender.ready || blocks.length > 0);

  return (
    <Paper className="campaign-review-card" component="section" aria-label="Deliverability check">
      <Typography variant="h3">Deliverability check</Typography>
      <Typography color="text.secondary" fontSize={12}>What we checked before this campaign goes out.</Typography>

      {blocked && (
        <Alert severity="error" action={sender.ready ? undefined : <Button color="inherit" size="small" href="/dashboard/settings">Open settings</Button>}>
          This campaign cannot be sent yet. {sender.ready ? 'Fix the items marked below.' : 'The email sending setup for this project is incomplete.'}
        </Alert>
      )}
      {!sender.loading && !blocked && risks.length > 0 && (
        <Alert severity="warning">This email can be sent, but we found possible deliverability risks.</Alert>
      )}

      <Stack component="ul" gap={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {sender.loading ? <Skeleton width={280} /> : sender.ready
          ? <Row tone="pass">Domain authenticated and sending connection ready</Row>
          : sender.blockers?.length
            ? sender.blockers.map((b) => <Row key={b.code} tone="block">{b.message}</Row>)
            : <Row tone="block">Provider connection incomplete. Finish the email sending setup before sending.</Row>}
        {sender.ready && <Row tone="pass">Bounce and complaint handling is active</Row>}
        <Row tone="pass">Only recipients with confirmed email consent receive this campaign</Row>
        <Row tone="pass">Unsubscribed, bounced and complained recipients are excluded automatically</Row>
        {!has('NO_SYSTEM_UNSUBSCRIBE') && <Row tone="pass">Unsubscribe link and one-click unsubscribe headers are added automatically</Row>}
        {!has('NO_READABLE_TEXT', 'PLAIN_TEXT_SHORT') && <Row tone="pass">A plain-text version is generated automatically</Row>}
        {blocks.map((f) => <FindingRow key={f.code} finding={f} />)}
      </Stack>

      {risks.length > 0 && (
        <>
          <Typography fontWeight={600} fontSize={13}>Deliverability recommendations</Typography>
          <Stack component="ul" gap={1} sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {risks.map((f) => <FindingRow key={f.code} finding={f} />)}
          </Stack>
        </>
      )}

      <Typography color="text.secondary" fontSize={12}>
        These recommendations may improve delivery. They cannot guarantee which folder the recipient’s email provider will use.
      </Typography>
    </Paper>
  );
}
