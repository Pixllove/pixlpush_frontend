import type { Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'PixlPush — Make more of the users you already have',
  description: 'AI-powered journey automation for apps, SaaS and digital products.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
