import type { MetadataRoute } from 'next';
import { BASE } from '@/lib/config';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'אישורי הגעה · אריאל & מירב',
    short_name: 'אישורי הגעה',
    start_url: `${BASE}/admin.html`,
    scope: `${BASE}/`,
    display: 'standalone',
    background_color: '#f4f9f9',
    theme_color: '#f4f9f9',
    dir: 'rtl',
    lang: 'he',
    icons: [
      { src: `${BASE}/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${BASE}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' },
    ],
  };
}
