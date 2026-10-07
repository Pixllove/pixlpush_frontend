'use client';

import { useState } from 'react';
import { ContentCopyRounded } from '@mui/icons-material';
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
    <Box>
      <Typography color="text.secondary" fontSize={11} fontWeight={500}>{label}</Typography>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography component="code" fontSize={13} sx={{ wordBreak: 'break-all', fontFamily: 'var(--pp-mono)', flex: 1 }}>{value}</Typography>
        <Tooltip title={copied ? 'Copied' : `Copy ${label.toLowerCase()}`}>
          <IconButton size="small" aria-label={`Copy ${label.toLowerCase()}`} onClick={copy}><ContentCopyRounded fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>
      {copied && <Typography role="status" fontSize={11} color="success.main">Copied</Typography>}
    </Box>
  );
}

/** One DNS record the customer has to publish, with its last check result. */
export default function DnsRecordCard({ record }: { record: DnsRecord }) {
  const status = RECORD_STATUS[record.status ?? (record.verified ? 'verified' : 'pending')];
  return (
    <Card variant="outlined" sx={{ p: 2 }} data-testid={`dns-record-${record.id}`}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
        <Stack direction="row" gap={1} alignItems="center">
          <Chip size="small" label={record.type} />
          <Typography fontWeight={600}>{PURPOSE[record.purpose] ?? record.purpose}</Typography>
          {!record.required && <Typography color="text.secondary" fontSize={12}>Optional</Typography>}
        </Stack>
        <Chip size="small" label={status.label} color={status.tone} variant={status.tone === 'default' ? 'outlined' : 'filled'} />
      </Stack>
      <Stack gap={1.2}>
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
