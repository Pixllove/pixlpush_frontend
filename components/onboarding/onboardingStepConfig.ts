import { LanguageRounded, MailOutlineRounded, NotificationsActiveRounded, PhoneIphoneRounded } from '@mui/icons-material';
import type { ProjectPlatform } from '@/types/project';
import { aiPrompt as reactNativeAiPrompt } from '@/components/docs/react-native/content';
import { aiPrompt as webAiPrompt } from '@/components/docs/web/content';

export const platformOptions: Array<{ id: ProjectPlatform; title: string; detail: string; icon: typeof LanguageRounded }> = [
  { id: 'web', title: 'Website', detail: 'For websites and web-based products.', icon: LanguageRounded },
  { id: 'mobile', title: 'Mobile App', detail: 'For apps available on iOS or Android.', icon: PhoneIphoneRounded },
];

export const channelOptions: Array<{ id: string; title: string; detail: string; icon: typeof LanguageRounded; platform?: ProjectPlatform }> = [
  { id: 'web-push', title: 'Web push', detail: 'Reach opted-in visitors in their browser.', icon: NotificationsActiveRounded, platform: 'web' },
  { id: 'mobile-push', title: 'Mobile push', detail: 'Reach opted-in users on iOS and Android.', icon: NotificationsActiveRounded, platform: 'mobile' },
  { id: 'email', title: 'Email', detail: 'Send lifecycle and product updates.', icon: MailOutlineRounded },
  { id: 'in-app', title: 'In-app messages', detail: 'Show timely messages inside your mobile app.', icon: PhoneIphoneRounded, platform: 'mobile' },
];

export type SdkId = 'react-native' | 'flutter' | 'web' | 'wordpress' | 'php' | 'other';
export const sdkOptions: Array<{ id: SdkId; title: string; detail: string; guide?: string }> = [
  { id: 'react-native', title: 'React Native / Expo', detail: 'Mobile apps with React Native or Expo.', guide: '/dashboard/integrations/react-native/quickstart' },
  { id: 'flutter', title: 'Flutter', detail: 'Cross-platform mobile apps built with Flutter.', guide: '/dashboard/integrations/flutter/quickstart' },
  { id: 'web', title: 'Web / JavaScript', detail: 'Websites and JavaScript applications.', guide: '/dashboard/integrations/web/quickstart' },
  { id: 'wordpress', title: 'WordPress', detail: 'WordPress sites and WooCommerce stores.', guide: '/dashboard/integrations/wordpress/quickstart' },
  { id: 'php', title: 'PHP', detail: 'PHP applications and server-rendered products.', guide: '/dashboard/integrations/php/quickstart' },
  { id: 'other', title: 'Other framework', detail: 'Request guidance for another framework.' },
];

export const mobileSdkOptions = sdkOptions.filter((option) => ['react-native', 'flutter', 'other'].includes(option.id));
export const websiteSdkOption = sdkOptions.find((option) => option.id === 'web') ?? sdkOptions[0];

export const sdkPromptFor = (sdk: SdkId, projectName: string) => {
  const framework = sdkOptions.find((option) => option.id === sdk)?.title ?? 'your framework';
  if (sdk === 'react-native') return `${reactNativeAiPrompt}\n\nPixlPush project name: ${projectName || 'the current project'}.`;
  return `You are a senior ${framework} engineer. Integrate PixlPush into the existing ${projectName || 'app'} for analytics, user identity, and push notifications.\n\nIMPORTANT — READ BEFORE CODING\n1. Inspect the repository to identify its framework, versions, package manager, app entry point, authentication flow, and existing Firebase or push setup.\n2. Use the official PixlPush SDK for ${framework} and follow the manual integration guide.\n3. Initialize it safely, register push permissions only when enabled, and track one first test event.\n4. Keep credentials and private keys out of source control, logs, and client-visible code.\n5. Explain the files changed and the verification steps when the integration is complete.`;
};

export const websitePromptFor = (projectName: string) => `${webAiPrompt}\n\nPixlPush project name: ${projectName || 'the current project'}.`;

export const onboardingHeadingByKind = {
  basics: 'What should we call your project?',
  products: 'Tell us about your products',
  channels: 'Which channels do you want to use?',
  domain: 'Let’s get your domain ready.',
  'mobile-push': 'Set up push for your app.',
  'app-sdk': 'Add the PixlPush SDK to your app.',
  'web-sdk': 'Add PixlPush to your website.',
} as const;

export const onboardingPromptByKind = {
  basics: 'I’m Max, your onboarding guide. Let’s start with a name for the product or workspace you’re setting up.',
  products: 'Select the types of products you already have and add their links. We’ll tailor the next setup steps to your product portfolio.',
  domain: 'Enter the email address you want to use for sending emails (e.g., info@yourbrand.com). This is the address your recipients will see when they receive your emails.',
  'mobile-push': 'Mobile apps send push through Firebase Cloud Messaging, or Apple Push (APNs) for iOS apps without Firebase. Upload the key and I’ll validate it securely.',
  'app-sdk': 'Install the SDK in your app when you’re ready to send product events and register devices. Here’s a starter prompt you can share with your coding assistant.',
  'web-sdk': 'Now add PixlPush to your website so it can track visitors and send Web Push. Here’s a starter prompt you can share with your coding assistant.',
} as const;
