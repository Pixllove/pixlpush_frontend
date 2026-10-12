import { Chip } from '@mui/material';
import type { SendingDomainStatus } from '@/types/sending-domain';
import { isConnectionCode } from '@/lib/sending-domains/errors';
import { DOMAIN_STATUS } from './labels';

/**
 * `lastError` separates DNS errors from a temporary PixlPush delivery-system
 * blocker; neither is exposed as a project/provider connection to the user.
 */
export default function DomainStatusBadge({ status, lastError }: { status: SendingDomainStatus; lastError?: string | null }) {
  const { label, tone } = status === 'verification_failed' && isConnectionCode(lastError)
    ? { label: 'Email delivery not ready', tone: 'warning' as const }
    : DOMAIN_STATUS[status] ?? DOMAIN_STATUS.not_configured;
  return <Chip size="small" label={label} color={tone} variant={tone === 'default' ? 'outlined' : 'filled'} />;
}
