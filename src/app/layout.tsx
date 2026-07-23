import type { Metadata } from 'next';
import { Geist_Mono, Inter, Orbitron, Rajdhani } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { getAppUrl } from '@/lib/app-url';
import './globals.css';

// Body font
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
// Display / heading fonts (Move-Tick brand)
const orbitron = Orbitron({ variable: '--font-orbitron', subsets: ['latin'], weight: ['500', '700', '800', '900'] });
const rajdhani = Rajdhani({ variable: '--font-rajdhani', subsets: ['latin'], weight: ['500', '600', '700'] });

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: 'Move-Tick — Discover. Connect. Experience.',
  description: 'Move-Tick by Move Beyond — the modern event platform. Discover events, buy tickets in seconds, and run world-class check-in.',
  icons: {
    icon: [{ url: '/brand/Icon-512.png', type: 'image/png' }],
    shortcut: '/brand/Icon-512.png',
    apple: '/brand/Icon-512.png',
  },
  openGraph: {
    title: 'Move-Tick — Discover. Connect. Experience.',
    description: 'Discover events, get your ticket in seconds, and arrive ready.',
    images: [{ url: '/og.png', width: 1672, height: 941, alt: 'Move-Tick event platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Move-Tick — Discover. Connect. Experience.',
    description: 'Discover events, get your ticket in seconds, and arrive ready.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${orbitron.variable} ${rajdhani.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
