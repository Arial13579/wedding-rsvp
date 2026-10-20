'use client';

import { useMemo, useState } from 'react';
import { useAdminData, useRoute } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { ContactImport } from '@/components/ContactImport';
import { GuestEditor } from '@/components/GuestEditor';
import { IconContacts, IconDownload, IconEdit, IconLink, IconPlus, IconSearch, IconTrash, IconWhatsApp } from '@/components/Icons';
import { Chevron, Group, Initials, Sheet, Spinner, StatusBadge, Switch, useToast } from '@/components/ui';
import { deleteGuests, markSent, updateGuest } from '@/lib/data';
import { buildMessage, guestLink, guestsToCsv, whatsappUrl } from '@/lib/invite';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { relativeTime, shortDate } from '@/lib/format';
import { nextReminderAt } from '@/lib/reminders';
import { DIET_LABEL, type Guest, type Status } from '@/lib/types';

type Filter = Status | 'all' | 'unknown';

// Chip order: the three answers (green / gray / red), then the two kinds of "not known yet"
const CHIPS: { key: Filter; label: string; color?: string }[] = [
  { key: 'all', label: 'הכול' },
  { key: 'yes', label: 'מגיעים', color: 'var(--yes)' },
  { key: 'unknown', label: 'לא יודעים', color: 'var(--maybe)' },
  { key: 'no', label: 'לא מגיעים', color: 'var(--no)' },
  { key: 'maybe', label: 'מתלבטים', color: 'var(--maybe)' },
  { key: 'pending', label: 'לא ענו', color: 'var(--pending)' },
];
const matches = (f: Filter, s: Status) => f === 'all' || f === s || (f === 'unknown' && (s === 'maybe' || s === 'pending'));

export default function GuestsPage() {
  const { guests, settings, error } = useAdminData();
  const { viewer } = useAuth();
  const toast = useToast();
  const { params } = useRoute();
  const [view, setView] = useState<'list' | 'tables'>(params.get('view') === 'tables' ? 'tables' : 'list');
  const [filter, setFilter] = useState<Filter>((params.get('status') as Filter) || 'all');
  const [tagFilter, setTagFilter] = useState('');
  const [q, setQ] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; guest: Guest | null }>({ open: false, guest: null });
  const [actionsId, setActionsId] = useState<string | null>(null);

  const tags = useMemo(() => [...new Set((guests || []).map((g) => g.tag).filter(Boolean))].sort(), [guests]);
  const phones = useMemo(() => new Set((guests || []).map((g) => normalizePhone(g.phone)).filter(Boolean)), [guests]);
  const actions = (guests || []).find((g) => g.id === actionsId) || null;

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, yes: 0, maybe: 0, no: 0, pending: 0, unknown: 0 };
    (guests || []).forEach((g) => { if (!tagFilter || g.tag === tagFilter) { c.all++; c[g.status]++; if (g.status === 'maybe' || g.status === 'pending') c.unknown++; } });
    return c;
  }, [guests, tagFilter]);

  const list = useMemo(() => {
    const s = q.trim();
    const digits = s.replace(/\D/g, '');
    return (guests || []).filter((g) =>
      matches(filter, g.status) &&
      (!tagFilter || g.tag === tagFilter) &&
      (!s || g.name.includes(s) || (digits.length > 2 && normalizePhone(g.phone).includes(normalizePhone(digits) || digits))),
    );
  }, [guests, filter, tagFilter, q]);

  const tables = useMemo(() => {
    const map = new Map<string, Guest[]>();
    const unseated: Guest[] = [];
    for (const g of guests || []) {
      if (g.status !== 'yes') continue;
      if (!g.table) { unseated.push(g); continue; }
      if (!map.has(g.table)) map.set(g.table, []);
      map.get(g.table)!.push(g);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'he', { numeric: true }));
    return { sorted, unseated };
  }, [guests]);

  if (!guests || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  function exportCsv() {
    const blob = new Blob([guestsToCsv(view === 'tables' ? guests!.filter((g) => g.status === 'yes') : list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = view === 'tables' ? 'הושבה.csv' : 'מוזמנים.csv';
    a.click();
  }

  const people = (gs: Guest[]) => gs.reduce((s, g) => s + Math.max(1, g.adults + g.kids), 0);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="page-head row" style={{ marginBottom: 0, alignItems: 'flex-end' }}>
        <div className="grow">
          <div className="page-title">מוזמנים</div>
          <div className="page-desc">{guests.length} הזמנות{!viewer.isOwner && ' שהוספת'}</div>
        </div>
        <button className="icon-btn" onClick={exportCsv} aria-label="ייצוא לאקסל"><IconDownload width={17} height={17} /></button>
        <button className="icon-btn" onClick={() => setEditor({ open: true, guest: null })} aria-label="הוספה ידנית"><IconPlus width={19} height={19} /></button>
      </div>

      <div className="segmented">
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>רשימה</button>
        <button className={view === 'tables' ? 'on' : ''} onClick={() => setView('tables')}>שולחנות</button>
      </div>

      {view === 'list' ? (
        <>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => setImportOpen(true)}><IconContacts width={20} height={20} /> הוספה מאנשי הקשר</button>

          <div className="search">
            <IconSearch />
            <input className="input" type="search" placeholder="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} aria-label="חיפוש לפי שם או טלפון" />
          </div>

          <div className="chip-row">
            {CHIPS.map((c) => (
              <button key={c.key} className={`chip ${filter === c.key ? 'on' : ''}`} onClick={() => setFilter(c.key)}>
                {c.color && <i className="dot" style={{ background: c.color, boxShadow: filter === c.key ? '0 0 0 1.5px #fff' : undefined }} />}
                {c.label}
                <span className="count">{counts[c.key]}</span>
              </button>
            ))}
            {tags.map((t) => <button key={t} className={`chip ${tagFilter === t ? 'on' : ''}`} onClick={() => setTagFilter(tagFilter === t ? '' : t)}>#{t}</button>)}
          </div>

          {error && <div className="card" style={{ color: 'var(--no-ink)' }}>{error}</div>}

          {list.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              {guests.length === 0 ? 'עדיין אין מוזמנים. מוסיפים מאנשי הקשר או ידנית.' : 'לא נמצאו מוזמנים'}
            </div>
          ) : (
            <div className="group">
              {list.map((g) => (
                <button key={g.id} className="cell" onClick={() => setActionsId(g.id)}>
                  <Initials name={g.name} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="li-title" style={{ display: 'block' }}>{g.name}</span>
                    <span className="li-sub">
                      {g.status === 'yes'
                        ? <span>{g.adults + g.kids} אורחים{g.table && ` · שולחן ${g.table}`}</span>
                        : <span>{g.sentCount ? `נשלח ${relativeTime(g.lastSentAt)}` : 'לא נשלח'}</span>}
                      {g.tag && <span>· {g.tag}</span>}
                    </span>
                  </span>
                  <StatusBadge status={g.status} />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {tables.unseated.length > 0 && (
            <Group header={`ממתינים להושבה · ${people(tables.unseated)} אורחים`} footer="לחצו על אורח כדי לשבץ אותו לשולחן.">
              {tables.unseated.map((g) => (
                <button key={g.id} className="cell" onClick={() => setActionsId(g.id)}>
                  <span className="grow">{g.name}</span>
                  <span className="cell-value num">{g.adults + g.kids}</span>
                  <Chevron />
                </button>
              ))}
            </Group>
          )}
          {tables.sorted.length === 0 && tables.unseated.length === 0 && (
            <div className="empty"><div className="empty-icon">🍽️</div>ההושבה תופיע כאן אחרי שאורחים יאשרו הגעה.</div>
          )}
          {tables.sorted.map(([table, gs]) => (
            <Group key={table} header={<span style={{ display: 'flex', justifyContent: 'space-between' }}><span>שולחן {table}</span><span className="num">{people(gs)} אורחים</span></span>}>
              {gs.map((g) => (
                <button key={g.id} className="cell" onClick={() => setActionsId(g.id)}>
                  <span className="grow">{g.name}{g.diet && <span className="faint"> · {DIET_LABEL[g.diet as keyof typeof DIET_LABEL]}</span>}</span>
                  <span className="cell-value num">{g.adults + g.kids}</span>
                </button>
              ))}
            </Group>
          ))}
        </>
      )}

      <ContactImport open={importOpen} onClose={() => setImportOpen(false)} existingPhones={phones} tags={tags} />
      <GuestEditor open={editor.open} guest={editor.guest} tags={tags} onClose={() => setEditor({ open: false, guest: null })} />

      <Sheet open={!!actions} onClose={() => setActionsId(null)} title={actions?.name}>
        {actions && (() => {
          const next = nextReminderAt(actions, settings);
          return (
            <div className="stack" style={{ gap: 18 }}>
              <div className="center stack" style={{ alignItems: 'center', gap: 6 }}>
                <StatusBadge status={actions.status} />
                <div className="muted" style={{ fontSize: 15 }} dir="ltr">{formatPhone(actions.phone)}</div>
              </div>

              <Group>
                {actions.status === 'yes' && <div className="cell"><span className="grow">אורחים</span><span className="cell-value">{actions.adults} מבוגרים{actions.kids ? ` · ${actions.kids} ילדים` : ''}</span></div>}
                {actions.diet && <div className="cell"><span className="grow">מנה</span><span className="cell-value">{DIET_LABEL[actions.diet as keyof typeof DIET_LABEL]}</span></div>}
                <div className="cell"><span className="grow">הודעות שנשלחו</span><span className="cell-value num">{actions.sentCount}</span></div>
                {actions.respondedAt && <div className="cell"><span className="grow">ענה</span><span className="cell-value">{relativeTime(actions.respondedAt)}</span></div>}
                <div className="cell">
                  <span className="grow">תזכורת הבאה</span>
                  <span className="cell-value">{actions.status === 'no' ? 'לא תישלח (לא מגיע)' : actions.status === 'yes' ? 'אין צורך' : next ? (next <= Date.now() ? 'מוכנה לשליחה' : shortDate(new Date(next))) : actions.sentCount ? 'אין' : 'אחרי הסבב הראשון'}</span>
                </div>
                {actions.message && <div className="cell" style={{ alignItems: 'flex-start' }}><span className="grow" dir="auto" style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>💌 {actions.message}</span></div>}
              </Group>

              {actions.status === 'yes' && (
                <Group header="יום האירוע">
                  <label className="cell"><span className="grow">שולחן</span>
                    <input className="input" style={{ maxWidth: 120 }} inputMode="numeric" defaultValue={actions.table} placeholder="מספר" key={actions.id + 'table'}
                      onBlur={(e) => { if (e.target.value !== actions.table) updateGuest(actions.id, { table: e.target.value.trim() }).then(() => toast('נשמר')); }} />
                  </label>
                  <div className="cell"><span className="grow">הגיעו</span><Switch label="הגיעו לאירוע" checked={actions.arrived} onChange={(v) => updateGuest(actions.id, { arrived: v })} /></div>
                  <label className="cell"><span className="grow">מתנה (₪)</span>
                    <input className="input" style={{ maxWidth: 120 }} inputMode="numeric" defaultValue={actions.gift || ''} placeholder="0" key={actions.id + 'gift'}
                      onBlur={(e) => { const n = Number(e.target.value.replace(/\D/g, '')) || 0; if (n !== actions.gift) updateGuest(actions.id, { gift: n }).then(() => toast('נשמר')); }} />
                  </label>
                </Group>
              )}

              <Group>
                <a className="cell indent-icon" href={whatsappUrl(actions.phone, buildMessage(actions.sentCount ? settings.reminderTemplate : settings.inviteTemplate, settings, actions))} target="_blank" rel="noreferrer"
                  onClick={() => { markSent(actions.id).catch(() => {}); }}>
                  <span className="cell-icon" style={{ background: '#25d366' }}><IconWhatsApp /></span><span className="grow">שליחה בוואטסאפ</span><Chevron />
                </a>
                <button className="cell indent-icon" onClick={async () => { await navigator.clipboard.writeText(guestLink(actions.id)); toast('הקישור הועתק'); }}>
                  <span className="cell-icon" style={{ background: '#30b0c7' }}><IconLink /></span><span className="grow">העתקת הקישור האישי</span>
                </button>
                <a className="cell indent-icon" href={guestLink(actions.id)} target="_blank" rel="noreferrer">
                  <span className="cell-icon" style={{ background: '#5856d6' }}>👁</span><span className="grow">הדף שהאורח רואה</span><Chevron />
                </a>
                <button className="cell indent-icon" onClick={() => { setEditor({ open: true, guest: actions }); setActionsId(null); }}>
                  <span className="cell-icon" style={{ background: '#8e8e93' }}><IconEdit /></span><span className="grow">עריכה ועדכון תשובה</span><Chevron />
                </button>
              </Group>

              <Group>
                <button className="cell" style={{ justifyContent: 'center', color: 'var(--no-ink)' }} onClick={async () => {
                  if (!confirm(`למחוק את ${actions.name}?`)) return;
                  await deleteGuests([actions.id]); setActionsId(null); toast('נמחק');
                }}>
                  <IconTrash width={18} height={18} /> מחיקת מוזמן
                </button>
              </Group>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
}
