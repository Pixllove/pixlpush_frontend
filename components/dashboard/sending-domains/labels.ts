import type { DnsPurpose, DnsRecordStatus, SendingDomainStatus } from '@/types/sending-domain';

type Tone = 'default' | 'info' | 'warning' | 'error' | 'success';

/** The badges users see; backend statuses fold into them. `verified` means every check passed, not DNS alone. */
export const DOMAIN_STATUS: Record<SendingDomainStatus, { label: string; tone: Tone }> = {
  not_configured: { label: 'Not configured', tone: 'default' },
  analyzing: { label: 'Analyzing', tone: 'info' },
  provider_selection: { label: 'Authentication pending', tone: 'warning' },
  connection_pending: { label: 'Authentication pending', tone: 'warning' },
  dns_pending: { label: 'Authentication pending', tone: 'warning' },
  partially_verified: { label: 'Partially verified', tone: 'warning' },
  verified: { label: 'Ready to send', tone: 'success' },
  connection_failed: { label: 'Authentication failed', tone: 'error' },
  dns_check_failed: { label: 'Authentication failed', tone: 'error' },
  verification_failed: { label: 'Authentication failed', tone: 'error' },
};

export const RECORD_STATUS: Record<DnsRecordStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Not checked yet', tone: 'default' },
  not_found: { label: 'Not found', tone: 'error' },
  mismatch: { label: 'Value mismatch', tone: 'error' },
  lookup_failed: { label: 'DNS lookup failed', tone: 'error' },
  propagating: { label: 'Waiting for propagation', tone: 'warning' },
  verified: { label: 'Verified', tone: 'success' },
};

export const PURPOSE: Record<DnsPurpose, string> = {
  DKIM: 'DKIM',
  SPF: 'SPF/SenderID',
  DOMAIN_VERIFICATION: 'Domain verification',
  DMARC: 'DMARC',
  CUSTOM: 'Custom',
};
