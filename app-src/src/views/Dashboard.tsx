'use client';

import { useMemo } from 'react';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { AreaLine, Rings, StackedBars, type StackRow } from '@/components/Charts';
import { Countdown } from '@/components/Countdown';
import { WhoList } from '@/components/WhoList';
import { Chevron, Group, Initials, Spinner } from '@/components/ui';
import { hebrewDate, longDate, relativeTime } from '@/lib/format';
import { dueReminders, isEveWindow } from '@/lib/reminders';
import { DIET_LABEL, STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';

function emptyCounts(): Record<Status, number> {
  return { yes: 0, maybe: 0, no: 0, pending: 0 };
}

function groupBy(guests: Guest[], key: (g: Guest) => string): StackRow[] {
  const map = new Map<string, Record<Status, number>>();
  for (const g of guests) {
    const k = key(g);
    if (!map.has(k)) map.set(k, emptyCounts());
    map.get(k)![g.status]++;
  }
  return [...map.entries()]
    .map(([label, counts]) => ({ label, counts }))
    .sort((a, b) => STATUS_ORDER.reduce((s, k) => s + b.counts[k], 0) - STATUS_ORDER.reduce((s, k) => s + a.counts[k], 0));
}

/** A tappable "to do" row: icon, title, subtitle, chevron. */
function TodoCell({ href, color, icon, title, sub }: { href: string; color: string; icon: string; title: string; sub: string }) {
  return (
    <a href={href} className="cell indent-icon">
      <span className="cell-icon" style={{ background: color, fontSize: 17 }}>{icon}</span>
      <span className="grow">
        <span className="cell-title" style={{ display: 'block', fontWeight: 600 }}>{title}</span>
        <span className="cell-sub">{sub}</span>
      </span>
      <Chevron />
    </a>
  );
}

export default function Dashboard() {
  const { guests, settings } = useAdminData();
  const { viewer } = useAuth();

  const stats = useMemo(() => {
    if (!guests || !settings) return null;
    const counts = emptyCounts();
    let adults = 0, kids = 0, sent = 0, gifts = 0, giftCount = 0, seated = 0, arrived = 0;
    const diets: Record<string, number> = {};
    for (const g of guests) {
      counts[g.status]++;
      if (g.sentCount > 0) sent++;
      if (g.gift) { gifts += g.gift; giftCount++; }
      if (g.arrived) arrived += Math.max(1, g.adults + g.kids);
      if (g.status === 'yes') {
        adults += g.adults; kids += g.kids;
        if (g.table) seated += g.adults + g.kids;
        if (g.diet) diets[g.diet] = (diets[g.diet] || 0) + Math.max(1, g.adults);
      }
    }
    const total = guests.length;
    const responded = total - counts.pending;

    const days = 21;
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    const daily = new Array(days).fill(0);
    let before = 0;
    for (const g of guests) {
      if (!g.respondedAt || g.status === 'pending') continue;
      const idx = Math.floor((g.respondedAt - start.getTime()) / 86400000);
      if (idx < 0) before++; else if (idx < days) daily[idx]++;
    }
    let acc = before;
    const fmt = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric' });
    const timeline = daily.map((v, i) => {
      acc += v;
      const d = new Date(start); d.setDate(d.getDate() + i);
      return { label: fmt.format(d), value: acc };
    });

    return {
      counts, total, responded, adults, kids, sent, timeline, diets, gifts, giftCount, seated, arrived,
      unsent: total - sent,
      due: dueReminders(guests, settings).length,
      eve: isEveWindow(settings),
      blessings: guests.filter((g) => g.message).sort((a, b) => (b.respondedAt || 0) - (a.respondedAt || 0)),
      byInviter: groupBy(guests, (g) => g.addedByName || 'הרשימה המקורית'),
      byTag: groupBy(guests.filter((g) => g.tag), (g) => g.tag),
    };
  }, [guests, settings]);

  if (!stats || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  const eventDate = settings.eventDate ? new Date(settings.eventDate) : null;
  const eventPassed = !!eventDate && Date.now() > eventDate.getTime();
  const people = stats.adults + stats.kids;
  const pct = (n: number, d: number) => (d ? n / d : 0);

  const head = (
    <div className="page-head">
      <div className="page-title">סיכום</div>
      <div className="page-desc">
        {eventDate ? `${longDate(eventDate)} · ${hebrewDate(eventDate)}` : 'הגדירו תאריך בהגדרות'}
      </div>
    </div>
  );

  if (stats.total === 0) {
    return (
      <div className="stack" style={{ gap: 22 }}>
        {head}
        {settings.eventDate && <div className="card"><Countdown iso={settings.eventDate} variant="compact" /></div>}
        <Group header="מתחילים" footer="אחרי הסבב הראשון המערכת תדאג לתזכורות בעצמה: מי שלא ענה או מתלבט יקבל תזכורת אחרי שבוע, ומי שלא מגיע לא יקבל יותר הודעות.">
          {viewer.isOwner && <TodoCell href="#settings" color="#8e8e93" icon="✎" title="פרטי האירוע וההזמנה" sub="תאריך, אולם, תמונה ונוסחי הודעות" />}
          <TodoCell href="#guests" color="#30b0c7" icon="👥" title="הוספת מוזמנים" sub="מאנשי הקשר בטלפון או ידנית" />
          <TodoCell href="#send?group=round1" color="#34c759" icon="✉️" title="סבב ראשון" sub="שליחת ההזמנה לכל המוזמנים" />
        </Group>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 22 }}>
      {head}

      {(stats.unsent > 0 || stats.due > 0 || stats.eve) && !eventPassed && (
        <Group header="לטיפול עכשיו">
          {stats.unsent > 0 && <TodoCell href="#send?group=round1" color="#34c759" icon="✉️" title={`${stats.unsent} עוד לא קיבלו הזמנה`} sub="סבב ראשון, נשלח על ידך" />}
          {stats.due > 0 && <TodoCell href="#send?group=reminders" color="#ff9500" icon="⏰" title={`${stats.due} תזכורות מוכנות`} sub="מי שלא ענה או מתלבט, לפי הכללים שהגדרת" />}
          {stats.eve && <TodoCell href="#send?group=eve" color="#30b0c7" icon="🚗" title="תזכורת ליום האירוע" sub={`${stats.counts.yes} שאישרו יקבלו הודעה עם ניווט`} />}
        </Group>
      )}

      {/* Rings */}
      <div className="card hero-stat">
        <div className="row" style={{ gap: 18, alignItems: 'center' }}>
          <Rings rings={[
            { label: 'נשלחו', value: pct(stats.sent, stats.total), color: '#30b0c7' },
            { label: 'ענו', value: pct(stats.responded, stats.total), color: '#ff9500' },
            { label: 'אישרו', value: pct(stats.counts.yes, stats.total), color: '#34c759' },
          ]} size={138} />
          <div className="rings-legend grow">
            <div><div className="rl-label" style={{ color: '#1d97ad' }}>נשלחו</div><div className="rl-value">{stats.sent}<span className="rl-sub">/{stats.total}</span></div></div>
            <div><div className="rl-label" style={{ color: 'var(--maybe-ink)' }}>ענו</div><div className="rl-value">{stats.responded}<span className="rl-sub">/{stats.total}</span></div></div>
            <div><div className="rl-label" style={{ color: 'var(--yes-ink)' }}>אישרו</div><div className="rl-value">{stats.counts.yes}<span className="rl-sub">/{stats.total}</span></div></div>
          </div>
        </div>
        <div style={{ height: 0.5, background: 'var(--separator)', margin: '16px 0 12px' }} />
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="grow">
            <div className="kpi-label">צפי אורחים</div>
            <div className="num" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>{people}</div>
          </div>
          <div className="muted" style={{ fontSize: 15, textAlign: 'end' }}>{stats.adults} מבוגרים<br />{stats.kids} ילדים</div>
        </div>
      </div>

      {settings.eventDate && !eventPassed && <div className="card"><Countdown iso={settings.eventDate} variant="compact" /></div>}

      <div className="grid-4">
        {STATUS_ORDER.map((k) => (
          <a key={k} href={`#guests?status=${k}`} className="card kpi">
            <div className="kpi-label" style={{ color: STATUS_META[k].ink }}><i className="dot" style={{ background: STATUS_META[k].color }} />{STATUS_META[k].label}</div>
            <div className="kpi-value">{stats.counts[k]}</div>
            <div className="kpi-foot">{Math.round(pct(stats.counts[k], stats.total) * 100)}% מהמוזמנים</div>
          </a>
        ))}
      </div>

      <WhoList guests={guests!} />

      <Group header="לקייטרינג" footer="מספרים לפי מי שאישר הגעה. העדפות המנה נבחרות על ידי האורחים בדף האישור.">
        <div className="cell"><span className="grow">מנות מבוגרים</span><span className="cell-value num">{stats.adults}</span></div>
        <div className="cell"><span className="grow">מנות ילדים</span><span className="cell-value num">{stats.kids}</span></div>
        {Object.entries(stats.diets).map(([k, v]) => (
          <div key={k} className="cell"><span className="grow">{DIET_LABEL[k as keyof typeof DIET_LABEL]}</span><span className="cell-value num">{v}</span></div>
        ))}
        <a href="#guests?view=tables" className="cell"><span className="grow">הושבו בשולחנות</span><span className="cell-value num">{stats.seated} / {people}</span><Chevron /></a>
      </Group>

      {eventPassed && (
        <Group header="אחרי האירוע">
          <div className="cell"><span className="grow">הגיעו בפועל</span><span className="cell-value num">{stats.arrived}</span></div>
          <div className="cell"><span className="grow">מתנות שנרשמו</span><span className="cell-value num">{stats.giftCount}</span></div>
          <div className="cell"><span className="grow" style={{ fontWeight: 600 }}>סך המתנות</span><span className="cell-value num" style={{ color: 'var(--text)', fontWeight: 600 }}>₪{stats.gifts.toLocaleString('he-IL')}</span></div>
        </Group>
      )}

      {stats.blessings.length > 0 && (
        <Group header={`ברכות מהאורחים · ${stats.blessings.length}`}>
          {stats.blessings.slice(0, 6).map((g) => (
            <div key={g.id} className="cell" style={{ alignItems: 'flex-start' }}>
              <Initials name={g.name} />
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{g.name} <span className="faint" style={{ fontWeight: 400 }}>· {relativeTime(g.respondedAt)}</span></div>
                <div dir="auto" style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{g.message}</div>
              </div>
            </div>
          ))}
        </Group>
      )}

      <div className="card">
        <div className="card-title">קצב תשובות <span className="card-sub">21 ימים</span></div>
        <AreaLine points={stats.timeline} />
      </div>

      {viewer.isOwner && stats.byInviter.length > 1 && (
        <div className="card"><div className="card-title">לפי מזמין</div><StackedBars rows={stats.byInviter} /></div>
      )}
      {stats.byTag.length > 0 && (
        <div className="card"><div className="card-title">לפי קבוצה</div><StackedBars rows={stats.byTag} /></div>
      )}
    </div>
  );
}
