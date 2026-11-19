'use client';

import { ArrowForwardRounded, AutoAwesomeRounded, CloseRounded, ContentCopyRounded, LanguageRounded, MailOutlineRounded, OpenInNewRounded } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { mobileSdkOptions, sdkPromptFor, type SdkId, websitePromptFor, websiteSdkOption } from './onboardingStepConfig';
import { supportApi } from '@/lib/support/api';

export type DeveloperInstructionsInput = { developerEmail: string; sdk: string; prompt: string; guideUrl?: string };

type Props = {
  kind: 'mobile-push' | 'app-sdk' | 'web-sdk';
  projectName?: string;
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
  const selectedSdkOption = isWebsite ? websiteSdkOption : (mobileSdkOptions.find((option) => option.id === selectedSdk) ?? mobileSdkOptions[0]);
  const sdkPrompt = isWebsite ? websitePromptFor(projectName) : sdkPromptFor(selectedSdkOption.id, projectName);

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
      setDeveloperEmailMessage(cause instanceof Error ? cause.message : 'Could not send the instructions. Please try again.');
    } finally {
      setDeveloperEmailBusy(false);
    }
  };

  if (kind === 'mobile-push') return <Stack gap={2} data-testid="onboarding-mobile-push-experience">
    <Paper elevation={0} className="onboarding-guidance"><strong>Firebase Cloud Messaging (mobile apps)</strong><span>Upload the Firebase service-account JSON used by this Project. PixlPush validates it with Google before encrypting and storing it.</span><small>Never paste credentials into chat or your app. The file is sent only to the authenticated backend.</small></Paper>
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
        <Typography className="onboarding-sdk-selector-title">What technology is your app built with?</Typography>
        <Typography color="text.secondary" variant="body2">Select your framework to get the right integration instructions.</Typography>
        <div className="onboarding-sdk-options">
          {mobileSdkOptions.map((option) => <button key={option.id} type="button" className={`onboarding-sdk-option${selectedSdk === option.id ? ' selected' : ''}`} onClick={() => { setSelectedSdk(option.id); if (option.id === 'other') onRequestSdk?.(); }} disabled={disabled}>
            <span className="onboarding-sdk-radio" aria-hidden="true">{selectedSdk === option.id && <span />}</span>
            <span><strong>{option.title}</strong><small>{option.detail}</small></span>
          </button>)}
        </div>
      </div>
      <div className="onboarding-sdk-request-card"><div><strong>Need another SDK?</strong><small>Request an SDK for your framework. We’ll route it to Help & Support.</small></div><Button variant="outlined" onClick={onRequestSdk} disabled={disabled} endIcon={<ArrowForwardRounded />}>Request SDK</Button></div>
    </>}
    <Paper elevation={0} className="onboarding-sdk-prompt-panel">
      <div className="onboarding-sdk-prompt-head"><div><strong>{isWebsite ? 'PIXLPUSH WEB SDK & WEB PUSH' : `PIXLPUSH ${selectedSdkOption.title.toUpperCase()} SDK`}</strong><small>{isWebsite ? 'AI-ready setup · Complete integration in one prompt' : 'AI-ready setup'}</small></div><Button size="small" onClick={() => void copySdkPrompt()} startIcon={<ContentCopyRounded />} disabled={disabled}>{copied ? 'Copied' : 'Copy'}</Button></div>
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
