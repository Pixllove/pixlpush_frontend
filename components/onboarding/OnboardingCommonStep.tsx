'use client';

import { AutoAwesomeRounded, CheckCircleRounded, CheckRounded, LanguageRounded, PhoneIphoneRounded, SearchRounded, WarningAmberRounded } from '@mui/icons-material';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { ProjectPlatform } from '@/types/project';
import type { OnboardingUrlField } from '@/lib/onboarding';
import { channelOptions, platformOptions } from './onboardingStepConfig';

export type CommonOnboardingStepKind = 'basics' | 'products' | 'channels' | 'domain';
export type CommonOnboardingLinkCheckState = 'idle' | 'checking' | 'found' | 'not-found' | 'error';
export type DetectedOnboardingLinks = { androidAppUrl: string | null; iosAppUrl: string | null };

type Props = {
  kind: CommonOnboardingStepKind;
  projectName?: string;
  platforms?: ProjectPlatform[];
  websiteUrl?: string;
  androidAppUrl?: string;
  iosAppUrl?: string;
  channels?: string[];
  senderEmail?: string;
  urlErrors?: Partial<Record<OnboardingUrlField, string>>;
  productsError?: string;
  linkCheckState?: CommonOnboardingLinkCheckState;
  linkCheckError?: string;
  detectedLinks?: DetectedOnboardingLinks;
  domainVerificationBusy?: boolean;
  domainVerificationError?: string;
  disabled?: boolean;
  onProjectNameChange?: (value: string) => void;
  onPlatformToggle?: (platform: ProjectPlatform) => void;
  onChannelToggle?: (channel: string) => void;
  onUrlChange?: (field: OnboardingUrlField, value: string) => void;
  onUrlBlur?: (field: OnboardingUrlField) => void;
  onCheckLinks?: () => void;
  onApplyDetectedLink?: (field: 'androidAppUrl' | 'iosAppUrl') => void;
  onSenderEmailChange?: (value: string) => void;
  onVerifyDomain?: () => void;
};

export default function OnboardingCommonStep({
  kind,
  projectName = '',
  platforms = [],
  websiteUrl = '',
  androidAppUrl = '',
  iosAppUrl = '',
  channels = [],
  senderEmail = '',
  urlErrors = {},
  productsError = '',
  linkCheckState = 'idle',
  linkCheckError = '',
  detectedLinks = { androidAppUrl: null, iosAppUrl: null },
  domainVerificationBusy = false,
  domainVerificationError = '',
  disabled = false,
  onProjectNameChange,
  onPlatformToggle,
  onChannelToggle,
  onUrlChange,
  onUrlBlur,
  onCheckLinks,
  onApplyDetectedLink,
  onSenderEmailChange,
  onVerifyDomain,
}: Props) {
  if (kind === 'basics') return <TextField autoFocus fullWidth label="Project name" placeholder="e.g. Northstar Mobile" value={projectName} disabled={disabled} onChange={(event) => onProjectNameChange?.(event.target.value)} helperText="You can change this any time." />;

  if (kind === 'channels') return <div className="onboarding-channel-grid">{channelOptions.filter((option) => !option.platform || platforms.includes(option.platform)).map(({ id, title, detail, icon: Icon }) => <button key={id} type="button" className={`onboarding-channel${channels.includes(id) ? ' selected' : ''}`} onClick={() => onChannelToggle?.(id)} disabled={disabled} aria-pressed={channels.includes(id)}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{channels.includes(id) && <CheckRounded className="onboarding-channel-check" />}</button>)}</div>;

  if (kind === 'domain') return <Stack gap={2} className="onboarding-domain-step">
    <Typography className="onboarding-domain-question">Which email address would you like to send from?</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
      <TextField fullWidth type="email" label="Sender email" placeholder="info@yourproduct.com" value={senderEmail} disabled={disabled} onChange={(event) => onSenderEmailChange?.(event.target.value)} helperText={senderEmail.includes('@') ? `Sending domain: ${senderEmail.split('@').pop()?.trim().toLowerCase() || '—'}` : undefined} />
      <Button type="button" variant="contained" sx={{ flexShrink: 0, px: 3, whiteSpace: 'nowrap' }} onClick={onVerifyDomain} disabled={disabled || domainVerificationBusy || !senderEmail.trim()}>
        {domainVerificationBusy ? 'Opening verification…' : 'Verify ownership'}
      </Button>
    </Stack>
    {domainVerificationError && <Alert severity="error">{domainVerificationError}</Alert>}
  </Stack>;

  const hasMobile = platforms.includes('mobile');
  const appLinkHelper = (error: string | undefined, fallback: string) => error || fallback;
  return <div className="onboarding-product-links">
    <div className="onboarding-product-section-heading"><span className="onboarding-product-section-icon"><AutoAwesomeRounded /></span><span><strong>What types of products do you have?</strong><small>Select Website, Mobile App, or both. You can update this anytime in Project Settings.</small></span></div>
    <div className="onboarding-product-options">{platformOptions.map(({ id, title, detail, icon: Icon }) => <button key={id} type="button" role="checkbox" aria-checked={platforms.includes(id)} className={`onboarding-channel${platforms.includes(id) ? ' selected' : ''}`} onClick={() => onPlatformToggle?.(id)} disabled={disabled}><span className="onboarding-channel-icon"><Icon /></span><span><strong>{title}</strong><small>{detail}</small></span>{platforms.includes(id) && <CheckRounded className="onboarding-channel-check" />}</button>)}</div>
    {platforms.length > 0 && <>
      <div className="onboarding-product-section-heading"><span className="onboarding-product-section-icon"><LanguageRounded /></span><span><strong>Website</strong><small>Add the link to your existing website.</small></span></div>
      <TextField fullWidth label="Website URL" placeholder="https://yourproduct.com" value={websiteUrl} disabled={disabled} error={Boolean(urlErrors.websiteUrl)} helperText={appLinkHelper(urlErrors.websiteUrl, 'You can enter example.com, www.example.com, or a full http(s) URL.')} onChange={(event) => onUrlChange?.('websiteUrl', event.target.value)} onBlur={() => onUrlBlur?.('websiteUrl')} />
    </>}
    {hasMobile && onCheckLinks && <Button type="button" className="onboarding-scan-button" variant="outlined" disabled={disabled || !websiteUrl.trim() || linkCheckState === 'checking'} onClick={onCheckLinks} startIcon={linkCheckState === 'checking' ? <AutoAwesomeRounded className="onboarding-scan-icon" /> : <SearchRounded />}>
      {linkCheckState === 'checking' ? 'Checking links…' : 'Check links'}
    </Button>}
    {hasMobile && linkCheckState !== 'idle' && <div className={`onboarding-link-scan ${linkCheckState}`} role="status">
      {linkCheckState === 'found' ? <CheckCircleRounded /> : <WarningAmberRounded />}
      <span><strong>{linkCheckState === 'checking' ? 'Looking for app-store links' : linkCheckState === 'found' ? 'App links found' : linkCheckState === 'error' ? 'Couldn’t check this website' : 'No app links found'}</strong><small>{linkCheckState === 'checking' ? 'Reading your website for Google Play and App Store links.' : linkCheckState === 'found' ? 'Review the detected links below and choose which ones to apply.' : linkCheckState === 'error' ? `${linkCheckError} You can add the links manually below.` : 'Your website doesn’t link to Google Play or the App Store. Add the links manually below.'}</small></span>
    </div>}
    {hasMobile && linkCheckState === 'found' && <Stack gap={1} className="onboarding-detected-links">
      {detectedLinks.androidAppUrl && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1}><Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">Google Play</Typography><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{detectedLinks.androidAppUrl}</Typography></Box><Button type="button" size="small" variant="outlined" onClick={() => onApplyDetectedLink?.('androidAppUrl')}>{androidAppUrl.trim() ? 'Replace Android link' : 'Use Android link'}</Button></Stack>}
      {detectedLinks.iosAppUrl && <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={1}><Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">Apple App Store</Typography><Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{detectedLinks.iosAppUrl}</Typography></Box><Button type="button" size="small" variant="outlined" onClick={() => onApplyDetectedLink?.('iosAppUrl')}>{iosAppUrl.trim() ? 'Replace iOS link' : 'Use iOS link'}</Button></Stack>}
    </Stack>}
    {hasMobile && <>
      <div className="onboarding-product-section-heading app-links-heading"><span className="onboarding-product-section-icon"><PhoneIphoneRounded /></span><span><strong>Mobile App</strong><small>Add your existing app store links.</small></span></div>
      <div className="onboarding-app-link-grid"><TextField fullWidth label="Android App URL" placeholder="Google Play Store URL" value={androidAppUrl} disabled={disabled} error={Boolean(urlErrors.androidAppUrl)} helperText={appLinkHelper(urlErrors.androidAppUrl, 'Paste a store URL or a Markdown link.')} onChange={(event) => onUrlChange?.('androidAppUrl', event.target.value)} onBlur={() => onUrlBlur?.('androidAppUrl')} /><TextField fullWidth label="iOS App URL" placeholder="Apple App Store URL" value={iosAppUrl} disabled={disabled} error={Boolean(urlErrors.iosAppUrl)} helperText={appLinkHelper(urlErrors.iosAppUrl, 'Paste a store URL or a Markdown link.')} onChange={(event) => onUrlChange?.('iosAppUrl', event.target.value)} onBlur={() => onUrlBlur?.('iosAppUrl')} /></div>
    </>}
    {productsError && <Alert severity="warning" sx={{ mt: 1 }}>{productsError}</Alert>}
    {platforms.length > 0 && <Typography variant="body2" color="text.secondary">We’ll use these links to personalize your setup and guide you through the relevant next steps.</Typography>}
  </div>;
}
