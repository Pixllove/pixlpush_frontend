import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

// The one interface typeface (DESIGN.md), shared with the MUI theme and the stylesheet as a variable.
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PixlPush — Make more of the users you already have',
  description: 'AI-powered journey automation for apps, SaaS and digital products.',
  icons: {
    icon: '/assets/favicon.png',
    shortcut: '/assets/favicon.png',
    apple: '/assets/favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The email page may mark <html> before hydration (an editor being restored); that is not a mismatch.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
