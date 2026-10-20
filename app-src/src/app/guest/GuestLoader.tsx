'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useInvitationImage } from '@/lib/data';
import { invitationSrc } from '@/lib/invite';
import { DEFAULT_SETTINGS, type EventSettings, type Status } from '@/lib/types';
import { Spinner } from '@/components/ui';
import { RsvpClient, type PublicGuest } from './RsvpClient';

function Loader() {
  const id = (useSearchParams().get('id') || '').trim();
  const [data, setData] = useState<{ guest: PublicGuest | null; settings: EventSettings } | null>(null);
  const uploaded = useInvitationImage(data?.settings.invitationVersion || 0);

  useEffect(() => {
    const valid = /^[A-Za-z0-9_-]{4,40}$/.test(id);
    Promise.all([
      valid ? getDoc(doc(db(), 'guests', id)).catch(() => null) : Promise.resolve(null),
      getDoc(doc(db(), 'meta', 'event')).catch(() => null),
    ]).then(([g, s]) => {
      const d = g?.exists() ? g.data() : null;
      setData({
        guest: d ? {
          id,
          name: String(d.name || ''),
          status: (['yes', 'maybe', 'no'].includes(d.status) ? d.status : 'pending') as Status,
          adults: Number(d.adults) || 0,
          kids: Number(d.children ?? d.kids) || 0,
        } : null,
        settings: { ...DEFAULT_SETTINGS, ...(s?.data() || {}) } as EventSettings,
      });
    });
  }, [id]);

  if (!data || uploaded === undefined) return <div className="fullscreen-center guest"><Spinner /></div>;
  return <RsvpClient guest={data.guest} settings={data.settings} image={invitationSrc(uploaded)} />;
}

export function GuestLoader() {
  return <Suspense fallback={<div className="fullscreen-center guest"><Spinner /></div>}><Loader /></Suspense>;
}
