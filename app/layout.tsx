import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'PixlPush — Make more of the users you already have',
  description: 'AI-powered journey automation for apps, SaaS and digital products.',
  icons: {
    icon: '/assets/site-icon.png',
    shortcut: '/assets/site-icon.png',
    apple: '/assets/site-icon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The email page may mark <html> before hydration (an editor being restored); that is not a mismatch.
    <html lang="en" suppressHydrationWarning>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
