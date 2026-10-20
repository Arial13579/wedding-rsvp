'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthGate';
import { IconChevron, IconLink, IconShare, IconWhatsApp } from '@/components/Icons';
import { Group, useToast } from '@/components/ui';
import { createShareLink, setCollaboratorActive, setShareLinkActive, useTeam } from '@/lib/data';
import { relativeTime } from '@/lib/format';
import { BASE } from '@/lib/config';

export default function TeamPage() {
  const { viewer } = useAuth();
  const toast = useToast();
  const { links, collabs } = useTeam(viewer.isOwner);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  if (!viewer.isOwner) return <div className="empty">רק בעל האירוע יכול לנהל הרשאות</div>;

  const url = (id: string) => `${window.location.origin}${BASE}/join.html?t=${id}`;
  const message = (id: string) => `הוזמנת לנהל איתי את אישורי ההגעה לחתונה 💍\nנכנסים בקישור, מתחברים עם Google ומוסיפים את אנשי הקשר שלך:\n${url(id)}`;

  async function create() {
    setBusy(true);
    try {
      const id = await createShareLink(label.trim() || 'קישור הרשאה');
      setLabel('');
      if (navigator.share) {
        navigator.share({ text: message(id) }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url(id));
        toast('הקישור נוצר והועתק');
      }
    } catch {
      toast('אין הרשאה. צריך לעדכן את כללי האבטחה ב־Firebase (ראו README)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div>
        <a href="#settings" className="btn btn-ghost" style={{ paddingInline: 0 }}><IconChevron width={20} height={20} style={{ transform: 'scaleX(-1)' }} /> הגדרות</a>
        <div className="page-title">שותפים</div>
        <div className="page-desc">מי שמקבל קישור מתחבר עם Google, מוסיף את אנשי הקשר שלו ושולח להם הזמנות.</div>
      </div>

      <Group header="קישור חדש" footer="שותף רואה ומנהל רק את המוזמנים שהוא הוסיף. את/ה רואה את כולם, ואפשר לבטל גישה בכל רגע.">
        <label className="cell"><input className="input" style={{ textAlign: 'start' }} placeholder="למי הקישור? למשל: מירב, אמא" value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <button className="cell" style={{ justifyContent: 'center', color: 'var(--accent-ink)', fontWeight: 600 }} disabled={busy} onClick={create}><IconShare width={18} height={18} /> יצירה ושליחה</button>
      </Group>

      <Group header={`שותפים · ${collabs.filter((c) => c.active).length} פעילים`}>
        {collabs.length === 0 ? <div className="cell"><span className="grow muted center">עדיין אף אחד לא הצטרף</span></div> : collabs.map((c) => (
          <div key={c.id} className="cell">
            <div className="li-avatar">{c.name[0] || '?'}</div>
            <div className="grow">
              <div className="li-title">{c.name}</div>
              <div className="li-sub"><span dir="ltr">{c.email}</span></div>
            </div>
            <button className={`btn btn-sm ${c.active ? 'btn-danger' : 'btn-tinted'}`} onClick={() => setCollaboratorActive(c.id, !c.active)}>
              {c.active ? 'ביטול גישה' : 'החזרה'}
            </button>
          </div>
        ))}
      </Group>

      {links.length > 0 && (
        <Group header="קישורים שנוצרו">
          {links.map((l) => (
            <div key={l.id} className="cell" style={{ opacity: l.active ? 1 : 0.5 }}>
              <div className="grow">
                <div className="li-title">{l.label}</div>
                <div className="li-sub">{l.active ? 'פעיל' : 'מבוטל'}{l.createdAt && ` · ${relativeTime(l.createdAt)}`}</div>
              </div>
              {l.active && (
                <>
                  <a className="icon-btn" href={`https://wa.me/?text=${encodeURIComponent(message(l.id))}`} target="_blank" rel="noreferrer" aria-label="שליחה בוואטסאפ"><IconWhatsApp width={17} height={17} /></a>
                  <button className="icon-btn" onClick={async () => { await navigator.clipboard.writeText(url(l.id)); toast('הקישור הועתק'); }} aria-label="העתקה"><IconLink width={17} height={17} /></button>
                </>
              )}
              <button className="btn btn-sm btn-ghost" onClick={() => setShareLinkActive(l.id, !l.active)}>{l.active ? 'ביטול' : 'הפעלה'}</button>
            </div>
          ))}
        </Group>
      )}
    </div>
  );
}
