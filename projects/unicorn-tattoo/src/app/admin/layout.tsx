import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import '../globals.css';

// Own root layout: the admin lives outside the [locale] tree, ships none of
// the public site's providers (smooth scroll, cursor, motion) and is noindex.
const sans = Manrope({
  subsets: ['greek', 'latin'],
  display: 'swap',
  variable: '--font-sans'
});

export const metadata: Metadata = {
  title: 'Διαχείριση · Unicorn Tattoo',
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a'
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el" className={sans.variable}>
      <body className="min-h-screen bg-ink font-sans text-bone antialiased">
        {children}
      </body>
    </html>
  );
}
