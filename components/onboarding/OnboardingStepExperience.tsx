'use client';

import { ArrowForwardRounded, AutoAwesomeRounded, CheckRounded, CloseRounded, ContentCopyRounded, KeyRounded, LanguageRounded, MailOutlineRounded, OpenInNewRounded } from '@mui/icons-material';
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { mobileSdkOptions, sdkPromptFor, type SdkId, websitePromptFor, websiteSdkOption } from './onboardingStepConfig';
import { supportApi } from '@/lib/support/api';
import { sdkKeyApi } from '@/lib/projects/api';
import type { ApiError } from '@/types/auth';
import type { CreatedSdkKey, SdkKey } from '@/types/project';

export type DeveloperInstructionsInput = { developerEmail: string; sdk: string; prompt: string; guideUrl?: string };

type Props = {
  kind: 'mobile-push' | 'app-sdk' | 'web-sdk';
  projectName?: string;
  projectId?: string;
  projectSlug?: string;
  canCreateSdkKey?: boolean;
  /** The active project SDK key, shared by the mobile and web onboarding steps. */
  sdkKey?: SdkKey | CreatedSdkKey;
  /** Raw key value is kept in the parent so mobile and web steps share it. */
  sdkKeyValue?: string;
  onSdkKeyCreated?: (key: CreatedSdkKey) => void;
  onRevealSdkKey?: () => Promise<string>;
  sdkKeyRevealBusy?: boolean;
  firebaseConnected?: boolean;
  apnsConnected?: boolean;
  onFirebase?: () => void;
  onApns?: () => void;
  onRequestSdk?: () => void;
  onSendDeveloperInstructions?: (input: DeveloperInstructionsInput) => Promise<{ sent: boolean }>;
  disabled?: boolean;
};

export default function OnboardingStepExperience({
  kind,
  projectName = '',
  projectId,
  projectSlug,
  canCreateSdkKey = false,
  sdkKey,
  sdkKeyValue,
  onSdkKeyCreated,
  onRevealSdkKey,
  sdkKeyRevealBusy = false,
  firebaseConnected = false,
  apnsConnected = false,
  onFirebase,
  onApns,
  onRequestSdk,
  onSendDeveloperInstructions,
  disabled = false,
}: Props) {
  const isWebsite = kind === 'web-sdk';
  const [selectedSdk, setSelectedSdk] = useState<SdkId>('react-native');
  const [copied, setCopied] = useState(false);
  const [developerEmail, setDeveloperEmail] = useState('');
  const [developerEmailBusy, setDeveloperEmailBusy] = useState(false);
  const [developerEmailMessage, setDeveloperEmailMessage] = useState('');
  const [sdkKeyName, setSdkKeyName] = useState('PixlPush SDK – Development');
  const [createdSdkKey, setCreatedSdkKey] = useState<CreatedSdkKey>();
  const [sdkKeyBusy, setSdkKeyBusy] = useState(false);
  const [sdkKeyError, setSdkKeyError] = useState('');
  const [includeSdkKeyInPrompt, setIncludeSdkKeyInPrompt] = useState(false);
  const [revealedSdkKey, setRevealedSdkKey] = useState('');
  const [projectIdCopied, setProjectIdCopied] = useState(false);
  const selectedSdkOption = isWebsite ? websiteSdkOption : (mobileSdkOptions.find((option) => option.id === selectedSdk) ?? mobileSdkOptions[0]);
  const projectIdentifier = projectSlug || projectId || 'YOUR_PROJECT_ID';
  const effectiveSdkKey = createdSdkKey ?? sdkKey;
  const effectiveSdkKeyValue = createdSdkKey?.key ?? sdkKeyValue ?? revealedSdkKey;
  const hasExistingSdkKey = effectiveSdkKey?.status === 'active';
  const showCreateSdkKeyCard = !hasExistingSdkKey || Boolean(createdSdkKey);
  const sdkPromptBase = isWebsite ? websitePromptFor(projectName) : sdkPromptFor(selectedSdkOption.id, projectName);
  const sdkPrompt = `${sdkPromptBase}\n\nPixlPush project ID: \`${projectIdentifier}\`\n\nInitialize the SDK with:\n\`\`\`js\n{\n  sdkKey: '${includeSdkKeyInPrompt && effectiveSdkKeyValue ? effectiveSdkKeyValue : '[ADD SDK KEY MANUALLY]'}',\n  projectId: '${projectIdentifier}',\n}\n\`\`\``;

  useEffect(() => {
    if (kind === 'web-sdk') setSelectedSdk('web');
  }, [kind]);

  const copySdkPrompt = async () => {
    try {
      await navigator.clipboard.writeText(sdkPrompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const copyProjectId = async () => {
    if (!projectIdentifier || projectIdentifier === 'YOUR_PROJECT_ID') return;
    try {
      await navigator.clipboard.writeText(projectIdentifier);
      setProjectIdCopied(true);
      window.setTimeout(() => setProjectIdCopied(false), 1800);
    } catch {
      setProjectIdCopied(false);
    }
  };

  const createSdkKey = async () => {
    if (!projectId || !sdkKeyName.trim() || sdkKeyBusy || !canCreateSdkKey) return;
    setSdkKeyBusy(true);
    setSdkKeyError('');
    try {
      const created = await sdkKeyApi.create(projectId, sdkKeyName.trim());
      setCreatedSdkKey(created);
      setRevealedSdkKey(created.key);
      onSdkKeyCreated?.(created);
      setIncludeSdkKeyInPrompt(false);
    } catch (cause) {
      setSdkKeyError((cause as Partial<ApiError>)?.message || 'Could not create the SDK key. Please try again.');
    } finally {
      setSdkKeyBusy(false);
    }
  };

  const handleIncludeSdkKeyChange = async (checked: boolean) => {
    if (!checked) {
      setIncludeSdkKeyInPrompt(false);
      return;
    }
    if (effectiveSdkKeyValue) {
      setIncludeSdkKeyInPrompt(true);
      return;
    }
    if (!onRevealSdkKey || sdkKeyRevealBusy) return;
    setSdkKeyError('');
    try {
      const revealed = await onRevealSdkKey();
      setRevealedSdkKey(revealed);
      setIncludeSdkKeyInPrompt(true);
    } catch (cause) {
      setSdkKeyError((cause as Partial<ApiError>)?.message || 'Could not reveal the existing SDK key. Copy it manually from Project Settings.');
    }
  };

  const sendDeveloperInstructions = async () => {
    if (!onSendDeveloperInstructions || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(developerEmail.trim())) return;
    setDeveloperEmailBusy(true);
    setDeveloperEmailMessage('');
    try {
      const result = await onSendDeveloperInstructions({
        developerEmail: developerEmail.trim(),
        sdk: isWebsite ? 'PixlPush Web SDK & Web Push' : selectedSdkOption.title,
        prompt: sdkPrompt,
        ...(selectedSdkOption.guide ? { guideUrl: `${window.location.origin}${selectedSdkOption.guide}` } : {}),
      });
      setDeveloperEmailMessage(result.sent ? 'Instructions sent to your developer.' : 'We could not send the instructions. Please try again.');
      if (result.sent) setDeveloperEmail('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : (cause as Partial<ApiError> | undefined)?.message;
      setDeveloperEmailMessage(message || 'Could not send the instructions. Please try again.');
    } finally {
      setDeveloperEmailBusy(false);
    }
  };

  if (kind === 'mobile-push') return <Stack gap={2} data-testid="onboarding-mobile-push-experience">
    <Paper elevation={0} className="onboarding-guidance"><strong>Firebase Cloud Messaging (mobile apps)</strong><span>Upload the Firebase service-account JSON used by this Project. PixlPush validates it with Google before encrypting and storing it.</span></Paper>
    {onFirebase ? <Button variant="contained" onClick={onFirebase} disabled={disabled}>{firebaseConnected ? 'Review Firebase' : 'Connect Firebase'}</Button> : null}
    {firebaseConnected && <Alert severity="success">Firebase is connected for this Project.</Alert>}
    <Paper elevation={0} className="onboarding-guidance"><strong>iOS app without Firebase?</strong><span>Send through Apple Push (APNs) directly with the .p8 key from your Apple Developer account. Android apps still need Firebase.</span></Paper>
    {onApns ? <Button variant="outlined" onClick={onApns} disabled={disabled}>{apnsConnected ? 'Review Apple Push (APNs)' : 'Connect Apple Push (APNs)'}</Button> : null}
    {apnsConnected && <Alert severity="success">Apple Push is connected for this Project.</Alert>}
  </Stack>;

  return <Stack gap={2.5} className="onboarding-sdk-step" data-testid={`onboarding-${kind}-experience`}>
    <Typography className="onboarding-sdk-intro">{isWebsite ? 'Now let’s integrate PixlPush into your website. The Web SDK and Web Push are set up together in one guided flow. Copy the AI-ready prompt, follow the guide, or share the instructions with your developer.' : 'Let’s connect your mobile app to PixlPush. Copy the AI-ready prompt into your coding assistant, follow the manual guide, or share the instructions with your developer.'}</Typography>
    {isWebsite ? <>
      <Typography className="onboarding-website-subtitle" color="text.secondary">Set up analytics, user tracking, and Web Push notifications with one guided integration.</Typography>
      <div className="onboarding-website-overview">
        <div className="onboarding-website-overview-label"><LanguageRounded /><strong>One integration.<br />Two steps.</strong></div>
        <div className="onboarding-website-overview-step"><span>1</span><div><strong>Web SDK Integration</strong><small>Install the PixlPush Web SDK, initialize it, identify users and track events.</small></div></div>
        <ArrowForwardRounded className="onboarding-website-overview-arrow" />
        <div className="onboarding-website-overview-step"><span>2</span><div><strong>Web Push Integration</strong><small>Configure the service worker, push subscription and notification permissions, then test a real browser notification.</small></div></div>
      </div>
    </> : <>
      <div className="onboarding-sdk-selector">
        <div className="onboarding-sdk-section-heading"><span>1</span><div><strong>Choose your framework</strong><small>Select your framework to get the right integration instructions and AI prompt.</small></div></div>
        <div className="onboarding-sdk-options">
          {mobileSdkOptions.map((option) => <button key={option.id} type="button" className={`onboarding-sdk-option${selectedSdk === option.id ? ' selected' : ''}`} onClick={() => { setSelectedSdk(option.id); if (option.id === 'other') onRequestSdk?.(); }} disabled={disabled}>
            <span className="onboarding-sdk-radio" aria-hidden="true">{selectedSdk === option.id && <span />}</span>
            <span><strong>{option.title}</strong><small>{option.detail}</small></span>
          </button>)}
        </div>
      </div>
      <div className="onboarding-sdk-request-card"><div><strong>Need another SDK?</strong><small>Request an SDK for your framework. We’ll route it to Help & Support.</small></div><Button variant="outlined" onClick={onRequestSdk} disabled={disabled} endIcon={<ArrowForwardRounded />}>Request SDK</Button></div>
    </>}
    {showCreateSdkKeyCard ? <div className="onboarding-sdk-key-card">
      <div className="onboarding-sdk-section-heading"><span>2</span><div><strong>Create an SDK key</strong><small>Create a project key for this SDK integration.</small></div></div>
      <Alert severity="warning" className="onboarding-sdk-security-note">
        For security, we recommend creating the key here and adding it manually to your project. Only include it in the AI prompt if you understand the risk of sharing the key with your coding assistant.
      </Alert>
      {!projectId ? <Alert severity="info">Select a project before creating an SDK key.</Alert> : !canCreateSdkKey ? <Alert severity="info">Only project owners, admins, and developers can create SDK keys.</Alert> : null}
      <TextField fullWidth size="small" label="Key name" value={sdkKeyName} onChange={(event) => setSdkKeyName(event.target.value)} disabled={disabled || sdkKeyBusy || !canCreateSdkKey} inputProps={{ maxLength: 80 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <TextField fullWidth size="small" label="SDK key" value={createdSdkKey?.key ?? ''} placeholder="Your key will appear here after creation" InputProps={{ readOnly: true }} />
        {createdSdkKey ? (
          <Box aria-label="SDK key created" title="SDK key created" sx={{ minWidth: { sm: 52 }, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'success.main' }}>
            <CheckRounded fontSize="medium" />
          </Box>
        ) : (
          <Button variant="outlined" onClick={() => void createSdkKey()} disabled={disabled || sdkKeyBusy || !projectId || !canCreateSdkKey || !sdkKeyName.trim()} startIcon={sdkKeyBusy ? undefined : <KeyRounded />} sx={{ minWidth: { sm: 142 }, whiteSpace: 'nowrap' }}>
            {sdkKeyBusy ? 'Creating…' : 'Create key'}
          </Button>
        )}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <TextField fullWidth size="small" label="Project ID" value={projectIdentifier} InputProps={{ readOnly: true, endAdornment: projectId && <IconButton size="small" onClick={() => void copyProjectId()} aria-label="Copy project ID">{projectIdCopied ? <CheckRounded color="success" fontSize="small" /> : <ContentCopyRounded fontSize="small" />}</IconButton> }} />
      </Stack>
      <FormControlLabel
        control={<Checkbox size="small" checked={includeSdkKeyInPrompt} onChange={(event) => { void handleIncludeSdkKeyChange(event.target.checked); }} disabled={disabled || !effectiveSdkKeyValue} />}
        label={<span><strong>Include the SDK key in the AI prompt</strong><small className="onboarding-sdk-checkbox-help">Off by default for security. You can copy the key into your app manually.</small></span>}
      />
      {includeSdkKeyInPrompt && effectiveSdkKeyValue ? <Alert severity="warning">The generated key will be included when you copy or send these instructions.</Alert> : null}
      {sdkKeyError ? <Alert severity="error">{sdkKeyError}</Alert> : null}
    </div> : <div className="onboarding-sdk-existing-key-card">
      <FormControlLabel
        control={<Checkbox size="small" checked={includeSdkKeyInPrompt} onChange={(event) => { void handleIncludeSdkKeyChange(event.target.checked); }} disabled={disabled || sdkKeyRevealBusy || !onRevealSdkKey} />}
        label={<span><strong>Include the existing SDK key in the AI prompt</strong><small className="onboarding-sdk-checkbox-help">Off by default for security. You can copy the key into your app manually.</small></span>}
      />
      {sdkKeyRevealBusy ? <Typography variant="body2" color="text.secondary">Preparing the key for this prompt…</Typography> : null}
      {includeSdkKeyInPrompt && effectiveSdkKeyValue ? <Alert severity="warning">The existing project SDK key will be included when you copy or send these instructions.</Alert> : null}
      {sdkKeyError ? <Alert severity="error">{sdkKeyError}</Alert> : null}
    </div>}
    <Paper elevation={0} className="onboarding-sdk-prompt-panel">
      <div className="onboarding-sdk-prompt-head"><div><strong>3 · {isWebsite ? 'PIXLPUSH WEB SDK & WEB PUSH' : `PIXLPUSH ${selectedSdkOption.title.toUpperCase()} SDK`}</strong><small>Copy this prompt into your coding assistant to complete the integration.</small></div><Button size="small" onClick={() => void copySdkPrompt()} startIcon={<ContentCopyRounded />} disabled={disabled}>{copied ? 'Copied' : 'Copy'}</Button></div>
      <code>{sdkPrompt}</code>
    </Paper>
    <Button variant="outlined" className="onboarding-sdk-copy-button" onClick={() => void copySdkPrompt()} startIcon={<ContentCopyRounded />} disabled={disabled}>{copied ? 'Prompt copied' : 'Copy AI Integration Prompt'}</Button>
    <div className="onboarding-sdk-guide-row"><span><strong>Prefer manual setup?</strong><small>Open the {isWebsite ? 'website' : 'SDK'} integration guide.</small></span><Button component="a" href={selectedSdkOption.guide ?? '/dashboard/integrations'} target="_blank" rel="noreferrer" variant="outlined" endIcon={<OpenInNewRounded />} disabled={disabled}>View {isWebsite ? 'Website' : 'SDK'} integration guide</Button></div>
    {onSendDeveloperInstructions ? <div className="onboarding-sdk-developer"><Typography variant="h6">Or send instructions to your developer</Typography><Typography variant="body2" color="text.secondary">Share the setup instructions with the person responsible for your {isWebsite ? 'website' : 'app'}.</Typography><div className="onboarding-sdk-email-row"><TextField fullWidth type="email" placeholder="developer@company.com" value={developerEmail} disabled={disabled || developerEmailBusy} onChange={(event) => { setDeveloperEmail(event.target.value); setDeveloperEmailMessage(''); }} /><Button variant="contained" disabled={disabled || developerEmailBusy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(developerEmail.trim())} onClick={() => void sendDeveloperInstructions()} endIcon={<MailOutlineRounded />}>{developerEmailBusy ? 'Sending…' : 'Send'}</Button></div>{developerEmailMessage && <Alert severity={developerEmailMessage.includes('sent') ? 'success' : 'error'}>{developerEmailMessage}</Alert>}</div> : null}
  </Stack>;
}

export function SdkRequestDialog({ open, onClose, projectId }: { open: boolean; onClose: () => void; projectId?: string }) {
  const [framework, setFramework] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const request = async () => {
    if (!projectId || !framework.trim() || !details.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      await supportApi.create({ projectId, topic: 'technical', source: 'dashboard', subject: `SDK request: ${framework.trim()}`, message: `Please add support for ${framework.trim()}.\n\nRequest details:\n${details.trim()}` });
      setMessage('Request sent. The PixlPush team will follow up in Help & Support.');
      setFramework('');
      setDetails('');
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not send the SDK request. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return <Dialog open={open} onClose={() => { if (!busy) onClose(); }} fullWidth maxWidth="sm" aria-labelledby="sdk-request-title">
    <DialogTitle id="sdk-request-title" className="sdk-request-dialog-title"><div><AutoAwesomeRounded /><span><strong>Request an SDK</strong><small>Tell us which framework you need and PixlPush support will follow up.</small></span></div><IconButton aria-label="Close SDK request" onClick={onClose} disabled={busy}><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers><Stack gap={2}><TextField autoFocus fullWidth required label="Framework or platform" placeholder="e.g. Vue, Angular, Kotlin" value={framework} onChange={(event) => { setFramework(event.target.value); setMessage(''); }} /><TextField fullWidth required multiline minRows={4} label="What should we support?" placeholder="Tell us about your app and the SDK integration you need." value={details} onChange={(event) => { setDetails(event.target.value); setMessage(''); }} />{message && <Alert severity={message.startsWith('Request sent') ? 'success' : 'error'}>{message}</Alert>}</Stack></DialogContent>
    <DialogActions><Button onClick={onClose} disabled={busy}>Cancel</Button><Button variant="contained" disabled={busy || !framework.trim() || !details.trim() || !projectId} onClick={() => void request()}>{busy ? 'Sending…' : 'Send request'}</Button></DialogActions>
  </Dialog>;
}
