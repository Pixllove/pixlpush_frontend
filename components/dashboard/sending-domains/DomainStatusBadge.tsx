import { Chip } from '@mui/material';
import type { SendingDomainStatus } from '@/types/sending-domain';
import { DOMAIN_STATUS } from './labels';

export default function DomainStatusBadge({ status }: { status: SendingDomainStatus }) {
  const { label, tone } = DOMAIN_STATUS[status] ?? DOMAIN_STATUS.not_configured;
  return <Chip size="small" label={label} color={tone} variant={tone === 'default' ? 'outlined' : 'filled'} />;
}
