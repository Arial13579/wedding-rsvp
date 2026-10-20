'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { BASE, isConfigured, OWNER_EMAIL } from '@/lib/config';
import { getCollaborator, type Viewer } from '@/lib/data';
import { IconGoogle } from './Icons';
import { Spinner } from './ui';

interface AuthState {
  user: User;
  viewer: Viewer;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthGate');
  return v;
}

export async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth(), provider);
  } catch (e: unknown) {
    const code = (e as { code?: string }).code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth(), provider);
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      throw e;
    }
  }
}

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => (isConfigured ? onAuthStateChanged(auth(), setUser) : undefined), []);
  return user;
}

export function BrandHeader({ sub }: { sub?: string }) {
  return (
    <div className="stack center" style={{ alignItems: 'center', gap: 10 }}>
      <img src={`${BASE}/icon-512.png`} alt="" width={84} height={84} style={{ borderRadius: 19, boxShadow: '0 12px 30px rgba(48,176,199,.35)' }} />
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>אישורי הגעה</div>
      {sub && <div className="muted" style={{ fontSize: 17 }}>{sub}</div>}
    </div>
  );
}

export function SetupNeeded() {
  return (
    <div className="fullscreen-center">
      <div className="card stack" style={{ maxWidth: 440 }}>
        <BrandHeader sub="נדרשת הגדרה ראשונית" />
        <p className="muted" style={{ lineHeight: 1.7 }}>
          חסרים פרטי החיבור ל־Firebase. יש להגדיר את משתני הסביבה <code>NEXT_PUBLIC_FIREBASE_*</code> לפי הקובץ
          <code> .env.example</code> ולפרוס מחדש. ההוראות המלאות נמצאות בקובץ README.
        </p>
      </div>
    </div>
  );
}

export function LoginScreen({ title, sub, error }: { title?: string; sub?: string; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(error || '');
  return (
    <div className="fullscreen-center soft-bg">
      <div className="stack" style={{ width: '100%', maxWidth: 400, gap: 26 }}>
        <BrandHeader sub={sub || title || 'החתונה שלנו'} />
        <div className="stack" style={{ gap: 12 }}>
          <button
            className="btn btn-block btn-lg"
            style={{ background: '#fff', color: '#000', boxShadow: '0 0 0 0.5px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.06)' }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try { await googleSignIn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
            }}
          >
            <IconGoogle /> המשך עם Google
          </button>
          <p className="hint center">הכניסה מוגבלת לבעלי האירוע ולשותפים שהוזמנו.</p>
          {err && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{err}</div>}
        </div>
      </div>
    </div>
  );
}

function NoAccess({ user }: { user: User }) {
  return (
    <div className="fullscreen-center">
      <div className="card stack center" style={{ maxWidth: 420, alignItems: 'center' }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>אין הרשאת גישה</div>
        <p className="muted" style={{ lineHeight: 1.6 }}>
          החשבון <b dir="ltr">{user.email}</b> אינו מורשה. כדי לקבל גישה בקשו קישור הרשאה מבעל האירוע.
        </p>
        <button className="btn btn-ghost" onClick={() => signOut(auth())}>התחברות עם חשבון אחר</button>
      </div>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const user = useFirebaseUser();
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);

  useEffect(() => {
    if (!user) { setViewer(user === null ? null : undefined); return; }
    const email = (user.email || '').toLowerCase();
    const name = user.displayName || email.split('@')[0];
    if (email === OWNER_EMAIL && user.emailVerified) {
      setViewer({ uid: user.uid, name, isOwner: true });
      return;
    }
    setViewer(undefined);
    getCollaborator(user.uid)
      .then((c) => setViewer(c && c.active ? { uid: user.uid, name: c.name || name, isOwner: false } : null))
      .catch(() => setViewer(null));
  }, [user]);

  const value = useMemo(
    () => (user && viewer ? { user, viewer, logout: () => signOut(auth()) } : null),
    [user, viewer],
  );

  if (!isConfigured) return <SetupNeeded />;
  if (user === undefined || (user && viewer === undefined)) return <div className="fullscreen-center"><Spinner /></div>;
  if (!user) return <LoginScreen />;
  if (!value) return <NoAccess user={user} />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
