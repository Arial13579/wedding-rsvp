'use client';

import { useEffect } from 'react';
import { BASE } from '@/lib/config';
import { Spinner } from '@/components/ui';

/** The site root sends the couple to the management screen. Guests always arrive with a personal guest.html link. */
export default function Home() {
  useEffect(() => { window.location.replace(`${BASE}/admin.html${window.location.hash}`); }, []);
  return <div className="fullscreen-center"><Spinner /></div>;
}
