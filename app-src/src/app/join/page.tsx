'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { BASE, OWNER_EMAIL } from '@/lib/config';
import { getCollaborator, joinWithLink } from '@/lib/data';
import { BrandHeader, LoginScreen, useFirebaseUser } from '@/components/AuthGate';
import { Spinner } from '@/components/ui';

function Join() {
  const token = useSearchParams().get('t') || '';
  const user = useFirebaseUser();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const go = () => window.location.replace(`${BASE}/admin.html`);
    (async () => {
      try {
        if ((user.email || '').toLowerCase() === OWNER_EMAIL) return go();
        const existing = await getCollaborator(user.uid);
        if (existing?.active) return go();
        if (existing && !existing.active) return setError('הגישה שלך בוטלה.');
        if (!token) return setError('הקישור חסר. בקשו קישור חדש.');
        await joinWithLink(user.uid, user.email || '', user.displayName || (user.email || '').split('@')[0], token);
        go();
      } catch {
        setError('קישור ההרשאה אינו תקף או שבוטל. בקשו קישור חדש.');
      }
    })();
  }, [user, token]);

  if (user === undefined) return <div className="fullscreen-center"><Spinner /></div>;
  if (!user) return <LoginScreen title="הוזמנת לעזור באישורי ההגעה" sub="התחברו כדי להוסיף את אנשי הקשר שלכם" />;
  if (error) {
    return (
      <div className="fullscreen-center soft-bg">
        <div className="card stack center" style={{ maxWidth: 420, alignItems: 'center' }}>
          <BrandHeader />
          <p className="muted">{error}</p>
          <button className="btn btn-ghost" onClick={() => signOut(auth())}>התחברות עם חשבון אחר</button>
        </div>
      </div>
    );
  }
  return <div className="fullscreen-center"><div className="stack center" style={{ alignItems: 'center' }}><Spinner /><span className="muted">מצרפים אותך…</span></div></div>;
}

export default function JoinPage() {
  return <Suspense fallback={<div className="fullscreen-center"><Spinner /></div>}><Join /></Suspense>;
}
