import { authRequest } from '@/lib/auth/client';
import type {
  CreateSendingDomainInput,
  DnsRecordsResponse,
  DomainAnalysis,
  SendingDomain,
} from '@/types/sending-domain';

/** Project-scoped only: /api/projects/:projectId/sending-domains/*, forwarded to Fastify. */
const BASE = '/api/projects';
const at = (projectId: string, path = '') => `/${encodeURIComponent(projectId)}/sending-domains${path}`;
const one = (projectId: string, domainId: string, path = '') => at(projectId, `/${encodeURIComponent(domainId)}${path}`);

export const listSendingDomains = (projectId: string) => authRequest<SendingDomain[]>(at(projectId), undefined, BASE);

export const createSendingDomain = (projectId: string, input: CreateSendingDomainInput) =>
  authRequest<SendingDomain>(at(projectId), input, BASE);

export const getSendingDomain = (projectId: string, domainId: string) =>
  authRequest<SendingDomain>(one(projectId, domainId), undefined, BASE);

export const deleteSendingDomain = (projectId: string, domainId: string) =>
  authRequest<null>(one(projectId, domainId), {}, BASE, 'DELETE');

export const analyzeSendingDomain = (projectId: string, domainId: string) =>
  authRequest<SendingDomain & { analysis: DomainAnalysis }>(one(projectId, domainId, '/analyze'), {}, BASE);

/** Returns the provider's consent URL; nothing secret is kept client-side. */
export const startProviderConnection = (projectId: string, domainId: string, provider: string) =>
  authRequest<{ authorizationUrl: string; domain: SendingDomain }>(
    one(projectId, domainId, `/connect/${encodeURIComponent(provider)}`),
    {},
    BASE,
  );

/** Hands the provider's one-time code/state straight to the backend. */
export const completeProviderConnection = (
  projectId: string,
  domainId: string,
  provider: string,
  params: { code?: string; state?: string; error?: string },
) => {
  const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
  return authRequest<SendingDomain>(
    one(projectId, domainId, `/connect/${encodeURIComponent(provider)}/callback?${query}`),
    undefined,
    BASE,
  );
};

export const startManualConnection = (projectId: string, domainId: string) =>
  authRequest<SendingDomain>(one(projectId, domainId, '/manual'), {}, BASE);

export const getDnsRecords = (projectId: string, domainId: string) =>
  authRequest<DnsRecordsResponse>(one(projectId, domainId, '/dns-records'), undefined, BASE);

export const checkDns = (projectId: string, domainId: string) =>
  authRequest<SendingDomain>(one(projectId, domainId, '/check-dns'), {}, BASE);

export const verifySendingDomain = (projectId: string, domainId: string) =>
  authRequest<SendingDomain>(one(projectId, domainId, '/verify'), {}, BASE);

/** The DKIM selector of the customer's email provider, for keys we cannot find on our own. Null clears it. */
export const updateSendingDomain = (projectId: string, domainId: string, input: { dkimSelector: string | null }) =>
  authRequest<SendingDomain>(one(projectId, domainId), input, BASE, 'PATCH');

/** Sends the Project's email from this verified domain's sender address. */
export const activateSendingDomain = (projectId: string, domainId: string) =>
  authRequest<SendingDomain>(one(projectId, domainId, '/activate'), {}, BASE);
