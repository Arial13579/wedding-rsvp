import type { Metadata } from 'next';
import { Frank_Ruhl_Libre } from 'next/font/google';
import { SITE_URL } from '@/lib/config';
import { DEFAULT_SETTINGS as S } from '@/lib/types';
import { GuestLoader } from './GuestLoader';
import './guest.css';

const serif = Frank_Ruhl_Libre({ subsets: ['hebrew', 'latin'], weight: ['400', '500', '700'], variable: '--font-serif', display: 'swap' });

// WhatsApp reads these tags (it does not run JavaScript), so the preview card is static.
const description = `${S.coupleNames} · יום שלישי, 22.12.2026 · ${S.venueName}, קרית עקרון`;
export const metadata: Metadata = {
  title: `הזמנה לחתונה · ${S.coupleNames}`,
  description,
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    title: 'להזמנה ולאישור הגעה',
    description,
    url: `${SITE_URL}/guest.html`,
    locale: 'he_IL',
    images: [{ url: `${SITE_URL}/og-card.jpg`, width: 1200, height: 630, alt: `הזמנה לחתונה של ${S.coupleNames}` }],
  },
  twitter: { card: 'summary_large_image', images: [`${SITE_URL}/og-card.jpg`] },
};

export default function GuestPage() {
  return (
    <div className={serif.variable}>
      <GuestLoader />
    </div>
  );
}
