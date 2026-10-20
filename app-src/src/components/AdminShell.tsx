'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthGate';
import { IconChart, IconLogout, IconSend, IconSettings, IconUsers } from './Icons';
import { ToastProvider } from './ui';
import { useGuests, useInvitationImage, useSettings } from '@/lib/data';
import { invitationSrc } from '@/lib/invite';
import { BASE } from '@/lib/config';
import { dueReminders } from '@/lib/reminders';
import type { EventSettings, Guest } from '@/lib/types';
import Dashboard from '@/views/Dashboard';
import Guests from '@/views/Guests';
import Send from '@/views/Send';
import Settings from '@/views/Settings';
import Team from '@/views/Team';

interface AdminData {
  guests: Guest[] | null;
  settings: EventSettings | null;
  error: string;
  /** Uploaded invitation (data URL) or the site's default image */
  invitation: string;
  hasUploadedInvitation: boolean;
}

const DataCtx = createContext<AdminData>({ guests: null, settings: null, error: '', invitation: '', hasUploadedInvitation: false });
export const useAdminData = () => useContext(DataCtx);

// ---------- Hash router: #guests?status=yes ----------
type Tab = 'dashboard' | 'guests' | 'send' | 'settings' | 'team';
interface Route { tab: Tab; params: URLSearchParams }

function parseHash(): Route {
  const raw = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  const [name, query = ''] = raw.split('?');
  const tab = (['guests', 'send', 'settings', 'team'].includes(name) ? name : 'dashboard') as Tab;
  return { tab, params: new URLSearchParams(query) };
}

const RouteCtx = createContext<Route>({ tab: 'dashboard', params: new URLSearchParams() });
export const useRoute = () => useContext(RouteCtx);

const TITLES: Record<Tab, string> = { dashboard: 'סיכום', guests: 'מוזמנים', send: 'שליחה', settings: 'הגדרות', team: 'שותפים' };

const TABS: { tab: Tab; href: string; label: string; Icon: typeof IconChart }[] = [
  { tab: 'dashboard', href: '#', label: 'סיכום', Icon: IconChart },
  { tab: 'guests', href: '#guests', label: 'מוזמנים', Icon: IconUsers },
  { tab: 'send', href: '#send', label: 'שליחה', Icon: IconSend },
  { tab: 'settings', href: '#settings', label: 'הגדרות', Icon: IconSettings },
];

const VIEWS: Record<Tab, () => React.ReactNode> = { dashboard: Dashboard, guests: Guests, send: Send, settings: Settings, team: Team };

export function AdminShell() {
  const { user, viewer, logout } = useAuth();
  const { guests, error } = useGuests(viewer);
  const settings = useSettings();
  const uploaded = useInvitationImage(settings?.invitationVersion || 0);
  const [route, setRoute] = useState<Route>(parseHash);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const due = guests && settings ? dueReminders(guests, settings).length : 0;

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const View = VIEWS[route.tab];
  const activeTab = route.tab === 'team' ? 'settings' : route.tab;
  const data: AdminData = { guests, settings, error, invitation: invitationSrc(uploaded), hasUploadedInvitation: !!uploaded };

  return (
    <DataCtx.Provider value={data}>
      <RouteCtx.Provider value={route}>
        <ToastProvider>
          <div className="shell">
            <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
              <div className="brand-mark" aria-hidden><img src={`${BASE}/apple-touch-icon.png`} alt="" /></div>
              <div className="topbar-title">{TITLES[route.tab]}</div>
              {!viewer.isOwner && <span className="badge" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>שותף</span>}
              {user.photoURL
                ? <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
                : <div className="avatar">{viewer.name[0]}</div>}
              <button className="icon-btn" onClick={logout} aria-label="התנתקות"><IconLogout width={17} height={17} /></button>
            </header>
            <main className="page" key={route.tab}><View /></main>
            <nav className="tabbar" style={{ ['--tabs' as string]: TABS.length }}>
              {TABS.map(({ tab, href, label, Icon }) => (
                <a key={tab} href={href} className={`tab ${activeTab === tab ? 'active' : ''}`} aria-current={activeTab === tab ? 'page' : undefined}>
                  <Icon />
                  {label}
                  {tab === 'send' && due > 0 && <span className="tab-badge" aria-label={`${due} תזכורות ממתינות`}>{due}</span>}
                </a>
              ))}
            </nav>
          </div>
        </ToastProvider>
      </RouteCtx.Provider>
    </DataCtx.Provider>
  );
}
