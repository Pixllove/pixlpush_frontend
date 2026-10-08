/** Mirrors pixlpush/src/modules/sending-domains. No secrets ever arrive here. */
export type SendingDomainStatus =
  | 'not_configured'
  | 'analyzing'
  | 'provider_selection'
  | 'connection_pending'
  | 'dns_pending'
  | 'partially_verified'
  | 'verified'
  | 'connection_failed'
  | 'dns_check_failed'
  | 'verification_failed';

export type DnsPurpose = 'DKIM' | 'SPF' | 'DOMAIN_VERIFICATION' | 'DMARC' | 'CUSTOM';
export type DnsRecordStatus = 'pending' | 'verified' | 'not_found' | 'mismatch' | 'lookup_failed' | 'propagating';

export interface DnsRecord {
  id: string;
  type: 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: DnsPurpose;
  required: boolean;
  verified: boolean;
  status?: DnsRecordStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface SendingDomain {
  id: string;
  domain: string;
  senderEmail: string | null;
  senderName: string | null;
  replyTo: string | null;
  provider: string | null;
  providerName: string | null;
  /** Link to the DNS settings at the domain's DNS host, when known. */
  dnsSetupUrl?: string | null;
  connectionMethod: 'automatic' | 'manual';
  providerStatus: 'unknown' | 'detected' | 'connection_pending' | 'connected' | 'failed';
  automaticConnectionAvailable: boolean;
  status: SendingDomainStatus;
  dnsRecords: DnsRecord[];
  lastCheckedAt: string | null;
  lastError: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainAnalysis {
  providerDetected: boolean;
  provider: string | null;
  providerName: string | null;
  dnsSetupUrl?: string | null;
  automaticConnectionAvailable: boolean;
  manualConnectionRequired: boolean;
}

export interface CreateSendingDomainInput {
  senderEmail: string;
  senderName?: string;
  replyTo?: string;
}

export interface DnsRecordsResponse {
  domain: string;
  lastCheckedAt: string | null;
  records: DnsRecord[];
}
