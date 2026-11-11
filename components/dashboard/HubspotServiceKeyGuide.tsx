'use client';

import { CheckBoxRounded, ContentCopyRounded, KeyRounded } from '@mui/icons-material';
import { Box, Stack, Step, StepContent, StepLabel, Stepper, Typography } from '@mui/material';

/** A small schematic of a HubSpot screen; not a real screenshot. */
function Mock({ children }: { children: React.ReactNode }) {
  return (
    <Box aria-hidden sx={{ mt: 1, border: '1px solid #e7e2ef', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff', maxWidth: 460 }}>
      <Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1.25, py: 0.75, bgcolor: '#2d3e50' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => <Box key={c} sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: c }} />)}
        <Typography sx={{ ml: 1, color: '#cbd6e2', fontSize: 11 }}>app.hubspot.com</Typography>
      </Stack>
      <Box sx={{ p: 1.5, fontSize: 12 }}>{children}</Box>
    </Box>
  );
}

const highlight = { outline: '2px solid #ff7a59', outlineOffset: 2, borderRadius: 1 };

const steps: Array<{ title: string; text: React.ReactNode; mock: React.ReactNode }> = [
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
          <Box sx={{ ...highlight, alignSelf: 'flex-start', px: 1.25, py: 0.5, bgcolor: '#ff7a59', color: '#fff', fontWeight: 700, fontSize: 12 }}>Create service key</Box>
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
        <Stack gap={0.5} sx={{ ...highlight, p: 0.75 }}>
          {['crm.objects.contacts.read', 'crm.objects.contacts.write'].map((s) => (
            <Stack key={s} direction="row" alignItems="center" gap={0.75}><CheckBoxRounded sx={{ fontSize: 16, color: '#ff7a59' }} /><Typography fontSize={12} fontFamily="monospace">{s}</Typography></Stack>
          ))}
        </Stack>
      </Stack>
    ),
  },
  {
    title: 'Create the key and copy it',
    text: <>Click <strong>Create</strong>, then <strong>Copy</strong>. The key starts with <strong>pat-</strong>. Keep it private.</>,
    mock: (
      <Stack direction="row" alignItems="center" gap={1}>
        <KeyRounded sx={{ fontSize: 18, color: '#516f90' }} />
        <Box sx={{ flex: 1, border: '1px solid #cbd6e2', borderRadius: 1, px: 1, py: 0.5, fontFamily: 'monospace', color: '#33475b' }}>pat-na1-••••••••••••</Box>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ ...highlight, px: 1, py: 0.5, border: '1px solid #ff7a59', color: '#ff7a59', fontWeight: 700 }}><ContentCopyRounded sx={{ fontSize: 14 }} />Copy</Stack>
      </Stack>
    ),
  },
];

/** How to make a HubSpot Service Key, step by step with illustrations. The last step is the paste field itself. */
export default function HubspotServiceKeyGuide({ pasteStep }: { pasteStep: React.ReactNode }) {
  return (
    <Stepper orientation="vertical" activeStep={-1} sx={{ '& .MuiStepContent-root, & .MuiStepConnector-line': { borderColor: '#e7e2ef' } }}>
      {steps.map(({ title, text, mock }) => (
        <Step key={title} expanded active>
          <StepLabel><Typography fontWeight={700} fontSize="var(--fs-13)">{title}</Typography></StepLabel>
          <StepContent>
            <Typography color="text.secondary" fontSize="var(--fs-12)">{text}</Typography>
            <Mock>{mock}</Mock>
          </StepContent>
        </Step>
      ))}
      <Step expanded active>
        <StepLabel><Typography fontWeight={700} fontSize="var(--fs-13)">Paste it here</Typography></StepLabel>
        <StepContent>{pasteStep}</StepContent>
      </Step>
    </Stepper>
  );
}
