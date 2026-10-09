import { Chip } from '@mui/material';
import type { SendingDomainStatus } from '@/types/sending-domain';
import { isConnectionCode } from '@/lib/sending-domains/errors';
import { DOMAIN_STATUS } from './labels';

/**
 * `lastError` separates "DNS is wrong" from "DNS is fine but the sending connection is not": the backend
 * reports both as verification_failed, and only the first is an authentication failure.
 */
export default function DomainStatusBadge({ status, lastError }: { status: SendingDomainStatus; lastError?: string | null }) {
  const { label, tone } = status === 'verification_failed' && isConnectionCode(lastError)
    ? { label: 'Provider connection incomplete', tone: 'warning' as const }
    : DOMAIN_STATUS[status] ?? DOMAIN_STATUS.not_configured;
  return <Chip size="small" label={label} color={tone} variant={tone === 'default' ? 'outlined' : 'filled'} />;
}
