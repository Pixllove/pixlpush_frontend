'use client';

import { useState } from 'react';
import { CheckBoxRounded, ContentCopyRounded, KeyRounded, PersonRounded } from '@mui/icons-material';
import { Box, Link, Stack, Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material';
import type { IntegrationProvider } from '@/types/project';

/**
 * Manual-connection guides for every integration. Each step shows a real
 * screenshot when one exists at public/integrations/<provider>/step-<n>.png
 * (n = step number, 1-based), otherwise a schematic of the screen. To add or
 * update a screenshot, drop the PNG there: no code change.
 *   hubspot/step-1..3.png and pipedrive/step-1.png: from the vendors' docs (credited under each);
 *   salesforce/step-1.png: from Vonage's public Salesforce setup guide (credited); step-2..4 not added yet
 *   (Salesforce's own docs can't be fetched), so schematics show.
 * Crop to the relevant part of the screen (about 920px wide) and hide personal data.
 */

type GuideStep = { title: string; text: React.ReactNode; mock?: React.ReactNode; source?: Source };
/** Where the screenshots come from, credited under each one. */
type Source = { label: string; href: string };

/** A small schematic of the CRM's screen; not a real screenshot. */
function Mock({ host, bar, children }: { host: string; bar: string; children: React.ReactNode }) {
  return (
    <Box aria-hidden sx={{ mt: 1, border: '1px solid #e7e2ef', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff', maxWidth: 460 }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1.25, py: 0.75, bgcolor: bar }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
        <Typography sx={{ ml: 1, color: '#e6ecf2', fontSize: 11 }}>{host}</Typography>
      </Stack>
      <Box sx={{ p: 1.5, fontSize: 12 }}>{children}</Box>
    </Box>
  );
}

/**
 * The real screenshot once it has loaded; the schematic until then, or when there is none.
 * Not loading="lazy": browsers never fetch a lazy image while it is hidden (display: none).
 */
function Screen({ src, alt, fallback, source }: { src: string; alt: string; fallback: React.ReactNode; source: Source }) {
  const [state, setState] = useState<'loading' | 'ok' | 'none'>('loading');
  return (
    <>
      {state !== 'ok' && fallback}
      {state !== 'none' && (
        <Box
          component="img"
          src={src}
          alt={alt}
          onLoad={() => setState('ok')}
          onError={() => setState('none')}
          sx={{ display: state === 'ok' ? 'block' : 'none', mt: 1, width: '100%', maxWidth: 560, border: '1px solid #e7e2ef', borderRadius: 2 }}
        />
      )}
      {state === 'ok' && (
        <Typography color="text.secondary" fontSize="var(--fs-11)" sx={{ mt: 0.5 }}>
          Screenshot: <Link href={source.href} target="_blank" rel="noopener noreferrer" color="inherit">{source.label}</Link>
        </Typography>
      )}
    </>
  );
}

/** Numbered steps with screenshots; the last step is the paste form itself. */
function Guide({ provider, steps, host, bar, source, pasteTitle, pasteStep }: { provider: IntegrationProvider; steps: GuideStep[]; host: string; bar: string; source: Source; pasteTitle: string; pasteStep: React.ReactNode }) {
  return (
    <Stepper orientation="vertical" activeStep={-1} sx={{ '& .MuiStepContent-root, & .MuiStepConnector-line': { borderColor: '#e7e2ef' } }}>
      {steps.map(({ title, text, mock, source: stepSource }, i) => (
        <Step key={title} expanded active>
          <StepLabel><Typography fontWeight={700} fontSize="var(--fs-13)">{title}</Typography></StepLabel>
          <StepContent>
            <Typography color="text.secondary" fontSize="var(--fs-12)">{text}</Typography>
            <Screen src={`/integrations/${provider}/step-${i + 1}.png`} alt={title} fallback={mock && <Mock host={host} bar={bar}>{mock}</Mock>} source={stepSource ?? source} />
          </StepContent>
        </Step>
      ))}
      <Step expanded active>
        <StepLabel><Typography fontWeight={700} fontSize="var(--fs-13)">{pasteTitle}</Typography></StepLabel>
        <StepContent>{pasteStep}</StepContent>
      </Step>
    </Stepper>
  );
}

const hs = { outline: '2px solid #ff7a59', outlineOffset: 2, borderRadius: 1 };

const hubspotSteps: GuideStep[] = [
  {
    title: 'Open Service keys in HubSpot',
    text: <>In HubSpot, go to <strong>Development → Keys → Service keys</strong> and click <strong>Create service key</strong>. In some accounts it is under <strong>Settings → Integrations</strong>. You may need a HubSpot admin for this.</>,
    mock: (
      <Stack direction="row" gap={1.5}>
        <Stack gap={0.5} sx={{ width: 130, color: '#516f90' }}>
          <Typography fontSize={12} fontWeight={700} color="#33475b">Development</Typography>
          <Typography fontSize={12} sx={{ pl: 1 }}>Projects</Typography>
          <Typography fontSize={12} sx={{ pl: 1 }}>Keys</Typography>
          <Typography fontSize={12} sx={{ pl: 2, color: '#ff7a59', fontWeight: 700 }}>Service keys</Typography>
        </Stack>
        <Stack gap={1} sx={{ flex: 1 }}>
          <Typography fontSize={13} fontWeight={700} color="#33475b">Service keys</Typography>
          <Box sx={{ ...hs, alignSelf: 'flex-start', px: 1.25, py: 0.5, bgcolor: '#ff7a59', color: '#fff', fontWeight: 700, fontSize: 12 }}>Create service key</Box>
        </Stack>
      </Stack>
    ),
  },
  {
    title: 'Name it and allow contacts',
    text: <>Name the key <strong>PixlPush</strong>, then add the scopes <strong>crm.objects.contacts.read</strong> and <strong>crm.objects.contacts.write</strong>. Read brings contacts in; write adds your PixlPush users to HubSpot.</>,
    mock: (
      <Stack gap={1}>
        <Box sx={{ border: '1px solid #cbd6e2', borderRadius: 1, px: 1, py: 0.5, color: '#33475b' }}>Name: PixlPush</Box>
        <Stack gap={0.5} sx={{ ...hs, p: 0.75 }}>
          {['crm.objects.contacts.read', 'crm.objects.contacts.write'].map((s) => (
            <Stack key={s} direction="row" alignItems="center" gap={0.75}><CheckBoxRounded sx={{ fontSize: 16, color: '#ff7a59' }} /><Typography fontSize={12} fontFamily="monospace">{s}</Typography></Stack>
          ))}
        </Stack>
      </Stack>
    ),
  },
  {
    title: 'Create the key and copy it',
    text: <>Click <strong>Create</strong>. Open the new key, click <strong>Show</strong> to reveal it, then <strong>Copy</strong>. It starts with <strong>pat-</strong>. Keep it private.</>,
    mock: (
      <Stack direction="row" alignItems="center" gap={1}>
        <KeyRounded sx={{ fontSize: 18, color: '#516f90' }} />
        <Box sx={{ flex: 1, border: '1px solid #cbd6e2', borderRadius: 1, px: 1, py: 0.5, fontFamily: 'monospace', color: '#33475b' }}>pat-na1-••••••••••••</Box>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ ...hs, px: 1, py: 0.5, border: '1px solid #ff7a59', color: '#ff7a59', fontWeight: 700 }}><ContentCopyRounded sx={{ fontSize: 14 }} />Copy</Stack>
      </Stack>
    ),
  },
];

/** HubSpot Service Key, step by step. */
export function HubspotServiceKeyGuide({ pasteStep }: { pasteStep: React.ReactNode }) {
  return <Guide provider="hubspot" steps={hubspotSteps} host="app.hubspot.com" bar="#2d3e50" source={{ label: 'HubSpot developer docs', href: 'https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys' }} pasteTitle="Paste it here" pasteStep={pasteStep} />;
}

const sf = { outline: '2px solid #0176d3', outlineOffset: 2, borderRadius: 1 };
const field = { border: '1px solid #c9c9c9', borderRadius: 1, px: 1, py: 0.5, color: '#181818' };

const salesforceSteps: GuideStep[] = [
  {
    title: 'Create an External Client App',
    source: { label: 'Vonage AI Studio docs', href: 'https://studio.docs.ai.vonage.com/http/nodes/integrations/legacy-salesforce-authentication-node/salesforce-authentication/how-to-create-a-salesforce-external-client-app' },
    text: <>In Salesforce, open <strong>Setup → Apps → App Manager</strong> (or <strong>External Client Apps → External Client App Manager</strong>) and click <strong>New External Client App</strong>. Name it <strong>PixlPush</strong>, enter your email and keep <strong>Distribution State: Local</strong>. You need a Salesforce admin for this.</>,
    mock: (
      <Stack gap={1}>
        <Typography fontSize={13} fontWeight={700} color="#181818">External Client App Manager</Typography>
        <Box sx={{ ...sf, alignSelf: 'flex-start', px: 1.25, py: 0.5, bgcolor: '#0176d3', color: '#fff', fontWeight: 700, fontSize: 12 }}>New External Client App</Box>
        <Box sx={field}>External Client App Name: PixlPush</Box>
      </Stack>
    ),
  },
  {
    title: 'Turn on OAuth with the Client Credentials Flow',
    text: <>Under <strong>API (Enable OAuth Settings)</strong>, tick <strong>Enable OAuth</strong>. For Callback URL enter <strong>https://login.salesforce.com/services/oauth2/success</strong> (it is not used). Add the scope <strong>Manage user data via APIs (api)</strong>, tick <strong>Enable Client Credentials Flow</strong>, then click <strong>Create</strong>.</>,
    mock: (
      <Stack gap={0.75}>
        {['Enable OAuth', 'Scope: Manage user data via APIs (api)', 'Enable Client Credentials Flow'].map((s, i) => (
          <Stack key={s} direction="row" alignItems="center" gap={0.75} sx={i === 2 ? { ...sf, p: 0.5 } : undefined}>
            <CheckBoxRounded sx={{ fontSize: 16, color: '#0176d3' }} /><Typography fontSize={12}>{s}</Typography>
          </Stack>
        ))}
      </Stack>
    ),
  },
  {
    title: 'Choose who PixlPush acts as',
    text: <>Open the app&apos;s <strong>Policies</strong> tab, click <strong>Edit</strong>, tick <strong>Enable Client Credentials Flow</strong> under OAuth Policies and pick a <strong>Run As</strong> user (called <strong>Integration User</strong> in some orgs). That user needs the <strong>API Enabled</strong> permission and access to Contacts and Leads; a dedicated integration user is best. Save.</>,
    mock: (
      <Stack gap={1}>
        <Typography fontSize={12} fontWeight={700} color="#181818">OAuth Policies</Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ ...sf, p: 0.75 }}>
          <PersonRounded sx={{ fontSize: 16, color: '#0176d3' }} />
          <Typography fontSize={12}>Run As: integration@yourcompany.com</Typography>
        </Stack>
      </Stack>
    ),
  },
  {
    title: 'Copy the Consumer Key and Secret',
    text: <>On the <strong>Settings</strong> tab, open <strong>OAuth Settings</strong> and click <strong>Consumer Key and Secret</strong> (or <strong>Manage Consumer Details</strong>). Salesforce sends you a code to confirm it is you. Copy both. Your <strong>My Domain URL</strong> is under <strong>Setup → My Domain</strong>.</>,
    mock: (
      <Stack gap={0.75}>
        {['Consumer Key', 'Consumer Secret'].map((label) => (
          <Stack key={label} direction="row" alignItems="center" gap={1}>
            <KeyRounded sx={{ fontSize: 16, color: '#706e6b' }} />
            <Typography fontSize={12} sx={{ width: 110 }}>{label}</Typography>
            <Box sx={{ ...field, flex: 1, fontFamily: 'monospace' }}>••••••••••••</Box>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ ...sf, px: 0.75, color: '#0176d3', fontWeight: 700 }}><ContentCopyRounded sx={{ fontSize: 13 }} />Copy</Stack>
          </Stack>
        ))}
      </Stack>
    ),
  },
];

/** Customer's own Salesforce app (Client Credentials), step by step. */
export function SalesforceAppGuide({ pasteStep }: { pasteStep: React.ReactNode }) {
  return <Guide provider="salesforce" steps={salesforceSteps} host="yourcompany.my.salesforce.com" bar="#032d60" source={{ label: 'Salesforce Help', href: 'https://help.salesforce.com/s/articleView?id=xcloud.create_a_local_external_client_app.htm&type=5' }} pasteTitle="Paste them here" pasteStep={pasteStep} />;
}

const pipedriveSteps: GuideStep[] = [
  {
    title: 'Open your API token in Pipedrive',
    text: <>In Pipedrive, click your profile picture, then <strong>Personal preferences → API</strong>. Use an account that can see all contacts, ideally an admin: PixlPush sees what this user sees.</>,
    mock: (
      <Stack direction="row" gap={1.5}>
        <Stack gap={0.5} sx={{ width: 140, color: '#55595f' }}>
          <Typography fontSize={12} fontWeight={700} color="#1a1a1a">Personal preferences</Typography>
          <Typography fontSize={12} sx={{ pl: 1 }}>Notifications</Typography>
          <Typography fontSize={12} sx={{ pl: 1, color: '#08a742', fontWeight: 700 }}>API</Typography>
        </Stack>
        <Stack gap={1} sx={{ flex: 1 }}>
          <Typography fontSize={12} color="#1a1a1a">Your personal API token</Typography>
          <Stack direction="row" alignItems="center" gap={1}>
            <Box sx={{ ...field, flex: 1, fontFamily: 'monospace' }}>••••••••••••</Box>
            <Stack direction="row" alignItems="center" gap={0.5} sx={{ outline: '2px solid #08a742', outlineOffset: 2, borderRadius: 1, px: 0.75, color: '#08a742', fontWeight: 700 }}><ContentCopyRounded sx={{ fontSize: 13 }} />Copy</Stack>
          </Stack>
        </Stack>
      </Stack>
    ),
  },
];

/** Pipedrive personal API token, step by step. */
export function PipedriveTokenGuide({ pasteStep }: { pasteStep: React.ReactNode }) {
  return <Guide provider="pipedrive" steps={pipedriveSteps} host="yourcompany.pipedrive.com" bar="#1a1a1a" source={{ label: 'Pipedrive Knowledge Base', href: 'https://support.pipedrive.com/en/article/how-can-i-find-my-personal-api-key' }} pasteTitle="Paste it here" pasteStep={pasteStep} />;
}
