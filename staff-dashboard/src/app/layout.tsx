import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Staff Dashboard — Buddha Village',
  description:
    'Operations hub for Buddha Village resort staff. Manage orders, service tickets, and real-time guest requests.',
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
