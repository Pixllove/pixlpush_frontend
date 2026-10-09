'use client';

import { useState } from 'react';
import { CancelRounded, ContentCopyRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { Box, Card, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import type { DnsRecord } from '@/types/sending-domain';
import { PURPOSE, RECORD_STATUS } from './labels';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard blocked: the value stays selectable. */
    }
  };
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography color="text.secondary" fontSize={11} fontWeight={500} sx={{ mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" alignItems="center" gap={1} sx={{ bgcolor: '#303033', color: '#fff', borderRadius: 0.5, minHeight: 44, px: 1.25 }}>
        <Typography component="code" fontSize={13} sx={{ wordBreak: 'break-all', fontFamily: 'var(--pp-mono)', flex: 1 }}>{value}</Typography>
        <Tooltip title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}>
          <IconButton size="small" sx={{ color: '#fff' }} aria-label={`Copy ${label.toLowerCase()}`} onClick={copy}><ContentCopyRounded fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>
      {copied && <Typography role="status" fontSize={11} color="success.main">Copied</Typography>}
    </Box>
  );
}

function problemMessage(record: DnsRecord) {
  if (record.purpose === 'DKIM') return 'DomainKeys/DKIM records were not found. Make sure you have added them.';
  if (record.purpose === 'SPF') return record.status === 'mismatch' ? 'SenderID/SPF records do not match.' : 'SenderID/SPF records were not found. Make sure you have added them.';
  if (record.purpose === 'DOMAIN_VERIFICATION') return 'Domain verification TXT records were not found. Make sure you have added them.';
  if (record.purpose === 'DMARC') return 'DMARC records were not found. Make sure you have added them.';
  return 'This DNS record is missing or does not match.';
}

/** One DNS record the customer has to publish, with its last check result. */
export default function DnsRecordCard({ record }: { record: DnsRecord }) {
  const isVerified = record.status === 'verified' || record.verified;
  const status = RECORD_STATUS[record.status ?? (isVerified ? 'verified' : 'pending')];
  return (
    <Card variant="outlined" sx={{ p: 2 }} data-testid={`dns-record-${record.id}`}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <Stack direction="row" gap={1} alignItems="center">
          {!isVerified && <CancelRounded sx={{ color: 'error.main', fontSize: 20 }} aria-label="Record needs attention" />}
          <Chip size="small" label={record.type} />
          <Typography fontWeight={600}>{PURPOSE[record.purpose] ?? record.purpose}</Typography>
          {!record.required && <Typography color="text.secondary" fontSize={12}>Optional</Typography>}
        </Stack>
        {!isVerified && <Chip size="small" label={status.label} color={status.tone} variant={status.tone === 'default' ? 'outlined' : 'filled'} />}
      </Stack>
      {record.required && !isVerified && (
        <Box sx={{ mb: 1.5, px: 1.25, py: 0.75, borderRadius: 0.5, bgcolor: '#fff1f1', border: '1px solid #ffd5d5', color: '#b42318' }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <ErrorOutlineRounded sx={{ fontSize: 15 }} />
            <Typography fontSize={12}>{record.status === 'propagating' ? 'DNS changes can take a little time to appear.' : problemMessage(record)}</Typography>
          </Stack>
        </Box>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.2}>
        <CopyField label="Name" value={record.name} />
        <CopyField label="Value" value={record.value} />
      </Stack>
      {record.errorMessage && !record.verified && (
        <Typography color={record.status === 'propagating' ? 'warning.main' : 'error.main'} fontSize={12} sx={{ mt: 1 }}>
          {record.errorMessage}
        </Typography>
      )}
    </Card>
  );
}
