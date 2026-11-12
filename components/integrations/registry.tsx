'use client';

import { Box } from '@mui/material';
import { HubspotServiceKeyGuide, PipedriveTokenGuide, SalesforceAppGuide } from '@/components/dashboard/IntegrationGuides';
import type { IntegrationProvider, IntegrationSettings } from '@/types/project';
import { CATALOG } from './catalog';

export type IntegrationStatus = { label: string; tone: 'success' | 'warning' | 'neutral' } | null;

/** One field of the manual connect form; its key is the backend's PUT body field. */
type CredentialField = { key: string; label: string; placeholder?: string; secret?: boolean; minLength: number };

/**
 * Everything the dashboard shows for one integration. The page, status, sync
 * controls and connect flow are shared (IntegrationPanel); only this differs.
 */
export type Integration = {
  id: IntegrationProvider;
  name: string;
  category: string;
  summary: string;
  href: string;
  Logo: (props: { size?: number }) => JSX.Element;
  /** "HubSpot account 4242", "Salesforce org 00D…". */
  account: (label: string) => string;
  /** How it was connected, per auth type. */
  authLabel: Partial<Record<'oauth' | 'token' | 'client_credentials', string>>;
  /** What the CRM calls people, e.g. "contacts". */
  people: string;
  intro: string;
  /** Count tiles: imported, sent (label + help). */
  counts: { imported: string; sent: string; sentHelp: string };
  inText: string;
  outText: string;
  notes: string[];
  security: string;
  /** "Connect with <CRM>" tab: what happens, and the one-time setup in the CRM when there is one. */
  signIn: { text: string; setup?: string };
  /** Manual connection (tab name, intro, fields and the illustrated guide wrapping the form). */
  manual: {
    tab: string;
    intro: string;
    fields: CredentialField[];
    Guide: (props: { pasteStep: React.ReactNode }) => JSX.Element;
    help?: { label: string; href: string };
  };
};

/**
 * The integration's real logo (public/integrations/logos/<id>.svg) on a white tile.
 * Sources: Salesforce from svgl.app; HubSpot and Pipedrive from theSVG (MIT), via Iconify.
 */
function BrandLogo({ src, name, size = 40, bleed = false, pad = 0.14 }: { src: string; name: string; size?: number; bleed?: boolean; pad?: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: `${Math.round(size * 0.22)}px`,
        border: bleed ? 'none' : '1px solid #eeeaf3',
        bgcolor: '#fff',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        p: bleed ? 0 : `${Math.round(size * pad)}px`,
      }}
    >
      <Box component="img" src={src} alt={name} sx={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </Box>
  );
}

export const HubspotLogo = ({ size }: { size?: number }) => <BrandLogo src="/integrations/logos/hubspot.svg" name="HubSpot" size={size} />;
/** The cloud is wide, so it gets less padding to stay legible. */
export const SalesforceLogo = ({ size }: { size?: number }) => <BrandLogo src="/integrations/logos/salesforce.svg" name="Salesforce" size={size} pad={0.04} />;
/** Pipedrive's mark is already a rounded square tile. */
export const PipedriveLogo = ({ size }: { size?: number }) => <BrandLogo src="/integrations/logos/pipedrive.svg" name="Pipedrive" size={size} bleed />;

/** Status chip for a card or page header; null = not connected. */
export function integrationStatus(settings: IntegrationSettings | undefined): IntegrationStatus {
  if (!settings?.connected) return null;
  if (settings.status === 'error') return { label: 'Needs attention', tone: 'warning' };
  if (!settings.syncEnabled) return { label: 'Paused', tone: 'neutral' };
  return { label: 'Connected', tone: 'success' };
}

const base = (id: IntegrationProvider) => ({ id, ...CATALOG[id], href: `/dashboard/integrations/${id}` });

/** Every integration the dashboard offers, in display order. */
export const INTEGRATIONS: Integration[] = [
  {
    ...base('hubspot'),
    summary: 'Two-way contact sync: HubSpot contacts become PixlPush users, and new PixlPush users are added to HubSpot.',
    Logo: HubspotLogo,
    account: (label) => `HubSpot account ${label}`,
    authLabel: { oauth: 'Signed in with HubSpot', token: 'Connected with a Service Key' },
    people: 'contacts',
    intro: 'Keep HubSpot and PixlPush in step. HubSpot contacts become PixlPush users you can reach with push, email and journeys, and new PixlPush users are added to HubSpot as contacts.',
    counts: { imported: 'Contacts imported', sent: 'Users sent to HubSpot', sentHelp: 'PixlPush users added as contacts' },
    inText: 'New and changed contacts come in within about 2 minutes. Only empty profile details are filled in.',
    outText: 'Users added in the app, imported or tracked by the SDK are added as contacts with their name and country. Existing contacts are linked, never changed.',
    notes: [
      'Users are matched by HubSpot ID, then email, so no duplicates are made. Contacts without an email are skipped.',
      'Unsubscribed in HubSpot means not opted in to email in PixlPush. Sync never opts someone in.',
    ],
    security: 'HubSpot access is encrypted and never shown again. Disconnecting removes PixlPush\'s access from HubSpot.',
    signIn: { text: 'Recommended. Sign in to HubSpot, pick your HubSpot account and approve access. Nothing to copy or paste. Syncing starts within a minute.' },
    manual: {
      tab: 'Service Key (manual)',
      intro: 'Create a Service Key in HubSpot and paste it here. Follow these steps:',
      fields: [{ key: 'accessToken', label: 'HubSpot Service Key', placeholder: 'Starts with pat-…', secret: true, minLength: 20 }],
      Guide: HubspotServiceKeyGuide,
      help: { label: 'HubSpot\'s guide', href: 'https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys' },
    },
  },
  {
    ...base('salesforce'),
    summary: 'Two-way sync: Salesforce Contacts and Leads become PixlPush users, and new PixlPush users are added to Salesforce as Leads.',
    Logo: SalesforceLogo,
    account: (label) => `Salesforce org ${label}`,
    authLabel: { client_credentials: 'Connected with your own Salesforce app', oauth: 'Signed in with Salesforce' },
    people: 'Contacts and Leads',
    intro: 'Keep Salesforce and PixlPush in step. Salesforce Contacts and Leads become PixlPush users you can reach with push, email and journeys, and new PixlPush users are added to Salesforce as Leads.',
    counts: { imported: 'Contacts and Leads imported', sent: 'Users sent to Salesforce', sentHelp: 'Added as Leads' },
    inText: 'New and changed Contacts and Leads come in within about 2 minutes. Converted Leads are left out; their Contact comes in instead. Only empty profile details are filled in.',
    outText: 'Users added in the app, imported or tracked by the SDK are added as Leads with their name (Company is set to "[not provided]", as Salesforce requires one). Existing Contacts and Leads are linked, never changed.',
    notes: [
      'Users are matched by Salesforce ID, then email, so no duplicates are made. If a Contact and a Lead share an email, the Contact is used.',
      'Email Opt Out in Salesforce means not opted in to email in PixlPush. Sync never opts someone in.',
      'API access needs Enterprise, Unlimited, Developer or Performance Edition (or the API add-on). Each pass uses only a few of your org\'s daily API calls.',
    ],
    security: 'Salesforce access is encrypted and never shown again. Disconnecting removes PixlPush\'s access; you can also revoke it in Salesforce at any time.',
    signIn: {
      text: 'Recommended. Sign in to Salesforce as an admin and approve access. Nothing to copy or paste. Syncing starts within a minute.',
      setup: 'First, once per org: install the PixlPush app in Salesforce (an admin installs it for all users). Then come back and connect.',
    },
    manual: {
      tab: 'Your own app (manual)',
      intro: 'Create a small app in your Salesforce org that lets PixlPush read and add Contacts and Leads, then paste its details here. It takes about 5 minutes:',
      fields: [
        { key: 'myDomainUrl', label: 'My Domain URL', placeholder: 'https://yourcompany.my.salesforce.com', minLength: 10 },
        { key: 'clientId', label: 'Consumer Key', minLength: 20 },
        { key: 'clientSecret', label: 'Consumer Secret', secret: true, minLength: 10 },
      ],
      Guide: SalesforceAppGuide,
    },
  },
  {
    ...base('pipedrive'),
    summary: 'Two-way sync: Pipedrive people become PixlPush users, and new PixlPush users are added to Pipedrive.',
    Logo: PipedriveLogo,
    account: (label) => `Pipedrive company ${label}`,
    authLabel: { oauth: 'Signed in with Pipedrive', token: 'Connected with an API token' },
    people: 'people',
    intro: 'Keep Pipedrive and PixlPush in step. Pipedrive people become PixlPush users you can reach with push, email and journeys, and new PixlPush users are added to Pipedrive as people.',
    counts: { imported: 'People imported', sent: 'Users sent to Pipedrive', sentHelp: 'Added as people' },
    inText: 'New and changed people come in within about 2 minutes, using their primary email. Only empty profile details are filled in.',
    outText: 'Users added in the app, imported or tracked by the SDK are added as people with their name and email. Existing people are linked, never changed.',
    notes: [
      'Users are matched by Pipedrive ID, then email, so no duplicates are made. People without an email are skipped.',
      'With Pipedrive Campaigns, unsubscribed people are not opted in to email in PixlPush. Sync never opts someone in.',
      'Calls count toward your Pipedrive company\'s daily API budget; when it runs out, the sync waits and continues automatically.',
    ],
    security: 'Pipedrive access is encrypted and never shown again. Disconnecting removes PixlPush\'s access from Pipedrive.',
    signIn: { text: 'Recommended. Sign in to Pipedrive, pick your company and click Allow and install. Nothing to copy or paste. Syncing starts within a minute.' },
    manual: {
      tab: 'API token (manual)',
      intro: 'Copy your personal API token from Pipedrive and paste it here:',
      fields: [{ key: 'apiToken', label: 'Pipedrive API token', secret: true, minLength: 20 }],
      Guide: PipedriveTokenGuide,
    },
  },
];

export const integrationById = (id: IntegrationProvider) => INTEGRATIONS.find((i) => i.id === id)!;
