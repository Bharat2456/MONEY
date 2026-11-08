import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'MONEY — Free payment infrastructure for every developer', template: '%s · MONEY' },
  description: 'MONEY is a free developer payment gateway sandbox. Build, integrate and test complete payment experiences with simulated payments, webhooks and refunds. No real money moves.',
};
export const viewport: Viewport = { themeColor: '#2C0E11', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
