import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import Script from 'next/script';
import { AppProviders } from '@/components/AppProviders';
import './globals.css';

// The one typeface for every page (website and dashboard), shared with the MUI theme and the stylesheet as a variable.
const manrope = Manrope({ subsets: ['latin'], display: 'swap', variable: '--font-manrope', weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'PixlPush — Make more of the users you already have',
  description: 'AI-powered journey automation for apps, SaaS and digital products.',
  icons: {
    icon: '/assets/favicon.webp',
    shortcut: '/assets/favicon.webp',
    apple: '/assets/favicon.webp',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The email page may mark <html> before hydration (an editor being restored); that is not a mismatch.
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body>
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/26d76afcda9769bedc96bd25244de17d/script.js"
          strategy="afterInteractive"
        />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
