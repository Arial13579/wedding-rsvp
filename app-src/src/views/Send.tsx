'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminData, useRoute } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { IconCheck, IconChevron, IconShare, IconSms, IconWhatsApp } from '@/components/Icons';
import { Chevron, Group, Initials, Spinner, StatusBadge, useToast } from '@/components/ui';
import { markSent } from '@/lib/data';
import { buildMessage, shareInvitation, smsUrl, whatsappUrl } from '@/lib/invite';
import { formatPhone } from '@/lib/phone';
import { isEveWindow, reminderReason } from '@/lib/reminders';
import type { EventSettings, Guest } from '@/lib/types';

type GroupKey = 'round1' | 'reminders' | 'eve' | 'pending' | 'maybe' | 'notYes' | 'yes' | 'thanks' | 'all';
type Channel = 'whatsapp' | 'sms' | 'share';
type TemplateKey = 'inviteTemplate' | 'reminderTemplate' | 'thanksTemplate' | 'eveTemplate';

interface GroupDef {
  key: GroupKey;
  title: string;
  desc: string;
  icon: string;
  color: string;
  template: TemplateKey;
  /** Shown only when this returns true */
  visible?: (s: EventSettings) => boolean;
  test: (g: Guest, s: EventSettings) => boolean;
}

// "Not coming" is never messaged again; every group below excludes it.
const GROUPS: GroupDef[] = [
  { key: 'round1', title: 'סבב ראשון', desc: 'כל מי שעוד לא קיבל הזמנה', icon: '✉️', color: '#34c759', template: 'inviteTemplate', test: (g) => g.sentCount === 0 },
  { key: 'reminders', title: 'תזכורות אוטומטיות', desc: 'לא ענו או מתלבטים, לפי הכללים', icon: '⏰', color: '#ff9500', template: 'reminderTemplate', test: (g, s) => !!reminderReason(g, s) },
  { key: 'eve', title: 'תזכורת ליום האירוע', desc: 'למי שאישר, עם קישור לניווט', icon: '🚗', color: '#30b0c7', template: 'eveTemplate', visible: isEveWindow, test: (g) => g.status === 'yes' },
  { key: 'thanks', title: 'תודה שהגעתם', desc: 'אחרי החתונה, למי שאישר', icon: '🤍', color: '#af52de', template: 'thanksTemplate', visible: (s) => !!s.eventDate && Date.now() > Date.parse(s.eventDate), test: (g) => g.status === 'yes' },
  { key: 'pending', title: 'עוד לא ענו', desc: 'קיבלו הזמנה ולא השיבו', icon: '⏳', color: '#8e8e93', template: 'reminderTemplate', test: (g) => g.status === 'pending' && g.sentCount > 0 },
  { key: 'maybe', title: 'מתלבטים', desc: 'סימנו שעדיין מתלבטים', icon: '🤔', color: '#ff9500', template: 'reminderTemplate', test: (g) => g.status === 'maybe' },
  { key: 'notYes', title: 'לא אישרו הגעה', desc: 'לא ענו ומתלבטים יחד', icon: '📣', color: '#5856d6', template: 'reminderTemplate', test: (g) => g.status === 'pending' || g.status === 'maybe' },
  { key: 'yes', title: 'אישרו הגעה', desc: 'עדכון למי שמגיע', icon: '🎉', color: '#34c759', template: 'reminderTemplate', test: (g) => g.status === 'yes' },
  { key: 'all', title: 'כל המוזמנים', desc: 'חוץ ממי שסימן שלא מגיע', icon: '👥', color: '#007aff', template: 'inviteTemplate', test: (g) => g.status !== 'no' },
];

export default function SendPage() {
  const { guests, settings, invitation } = useAdminData();
  const { viewer } = useAuth();
  const { params } = useRoute();
  const toast = useToast();
  const [group, setGroup] = useState<GroupKey | null>((params.get('group') as GroupKey) || null);
  const [tag, setTag] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [template, setTemplate] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [queue, setQueue] = useState<Guest[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const def = GROUPS.find((g) => g.key === group);
  const tags = useMemo(() => [...new Set((guests || []).map((g) => g.tag).filter(Boolean))].sort(), [guests]);

  useEffect(() => {
    if (def && settings) setTemplate(settings[def.template]);
    setExcluded(new Set());
    window.scrollTo({ top: 0 });
  }, [group, !!settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupCounts = useMemo(() => {
    const out = {} as Record<GroupKey, number>;
    if (guests && settings) GROUPS.forEach((gr) => { out[gr.key] = guests.filter((g) => g.status !== 'no' && gr.test(g, settings)).length; });
    return out;
  }, [guests, settings]);

  const recipients = useMemo(() => {
    if (!def || !guests || !settings) return [];
    return guests.filter((g) => g.status !== 'no' && def.test(g, settings) && (!tag || g.tag === tag) && (!onlyMine || g.addedByUid === viewer.uid));
  }, [def, guests, settings, tag, onlyMine, viewer.uid]);

  const chosen = recipients.filter((g) => !excluded.has(g.id) && (channel === 'share' || g.phone));

  if (!guests || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  // ---------------- Sending, one guest at a time ----------------
  if (queue) {
    const done = index >= queue.length;
    const g = queue[Math.min(index, queue.length - 1)];
    const text = g ? buildMessage(template, settings, g) : '';
    const next = () => setIndex((i) => i + 1);
    const record = (id: string) => {
      markSent(id).catch(() => {});
      setSentIds((s) => new Set(s).add(id));
      setTimeout(next, 400);
    };

    return (
      <div className="stack" style={{ gap: 16 }}>
        <div className="row">
          <button className="btn btn-ghost" style={{ paddingInline: 0 }} onClick={() => { setQueue(null); setIndex(0); }}><IconChevron width={20} height={20} style={{ transform: 'scaleX(-1)' }} /> {def?.title}</button>
          <span className="grow" />
          <span className="muted num" style={{ fontSize: 15 }}>{Math.min(index + 1, queue.length)}/{queue.length}</span>
        </div>
        <div className="progress"><i style={{ width: `${(Math.min(index, queue.length) / queue.length) * 100}%`, background: 'var(--accent)', borderRadius: 99 }} /></div>

        {done ? (
          <div className="card stack center" style={{ alignItems: 'center', padding: '36px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--yes)', color: '#fff', display: 'grid', placeItems: 'center' }}><IconCheck width={32} height={32} /></div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>נשלח!</div>
            <div className="muted" style={{ maxWidth: '30ch' }}>יצאו {sentIds.size} הודעות. התשובות יופיעו בסיכום בזמן אמת, והתזכורות הבאות יתוזמנו לבד.</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-tinted" onClick={() => { setQueue(null); setIndex(0); setGroup(null); setSentIds(new Set()); }}>קבוצה אחרת</button>
              <a href="#" className="btn btn-primary">לסיכום</a>
            </div>
          </div>
        ) : (
          <>
            <div className="card stack" style={{ gap: 14 }}>
              <div className="row">
                <Initials name={g.name} />
                <div className="grow">
                  <div style={{ fontWeight: 600, fontSize: 20 }}>{g.name}</div>
                  <div className="muted" style={{ fontSize: 15 }} dir="ltr">{formatPhone(g.phone) || 'ללא טלפון'}</div>
                </div>
                <StatusBadge status={g.status} />
              </div>
              {/* Message preview, styled like a sent iMessage bubble */}
              <div style={{ alignSelf: 'flex-end', maxWidth: '88%', background: '#e9e9eb', borderRadius: 18, padding: '9px 14px', whiteSpace: 'pre-wrap', fontSize: 16, lineHeight: 1.45 }} dir="auto">{text}</div>
            </div>
            {channel === 'whatsapp' && (
              <a className="btn btn-wa btn-lg btn-block" href={whatsappUrl(g.phone, text)} target="_blank" rel="noreferrer" onClick={() => record(g.id)}>
                <IconWhatsApp /> שליחה ל{g.name.split(' ')[0]}
              </a>
            )}
            {channel === 'sms' && (
              <a className="btn btn-primary btn-lg btn-block" href={smsUrl(g.phone, text)} onClick={() => record(g.id)}>
                <IconSms /> שליחה ב־SMS
              </a>
            )}
            {channel === 'share' && (
              <button className="btn btn-primary btn-lg btn-block" onClick={async () => {
                const ok = await shareInvitation(text, invitation);
                if (ok) record(g.id); else toast('השיתוף בוטל');
              }}>
                <IconShare /> שיתוף תמונה וקישור
              </button>
            )}
            <div className="grid-2">
              <button className="btn btn-tinted" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>הקודם</button>
              <button className="btn btn-tinted" onClick={next}>דילוג</button>
            </div>
            <p className="hint center">אחרי השליחה חוזרים לכאן, והבא בתור כבר מחכה.</p>
          </>
        )}
      </div>
    );
  }

  // ---------------- Group detail ----------------
  if (def) {
    return (
      <div className="stack" style={{ gap: 22 }}>
        <div>
          <button className="btn btn-ghost" style={{ paddingInline: 0 }} onClick={() => setGroup(null)}><IconChevron width={20} height={20} style={{ transform: 'scaleX(-1)' }} /> שליחה</button>
          <div className="page-title">{def.title}</div>
          <div className="page-desc">{def.desc}</div>
        </div>

        {(tags.length > 0 || viewer.isOwner) && (
          <div className="stack" style={{ gap: 10 }}>
            {viewer.isOwner && (
              <div className="segmented">
                <button className={!onlyMine ? 'on' : ''} onClick={() => setOnlyMine(false)}>כל המוזמנים</button>
                <button className={onlyMine ? 'on' : ''} onClick={() => setOnlyMine(true)}>רק שלי</button>
              </div>
            )}
            {tags.length > 0 && (
              <div className="chip-row">
                <button className={`chip ${!tag ? 'on' : ''}`} onClick={() => setTag('')}>כל הקבוצות</button>
                {tags.map((t) => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>#{t}</button>)}
              </div>
            )}
          </div>
        )}

        <Group header={`נמענים · ${chosen.length} נבחרו`} footer={def.key === 'reminders' ? `לפי הכללים: תזכורת אחרי ${settings.reminderDays} ימים, עד ${settings.maxReminders} תזכורות לאורח. מי שסימן שלא מגיע לא יקבל הודעות.` : undefined}>
          {recipients.length === 0 ? <div className="cell"><span className="grow muted center">אין כרגע אף אחד בקבוצה הזו 🎉</span></div> : (
            <div style={{ maxHeight: 330, overflowY: 'auto' }}>
              {recipients.map((g) => {
                const noPhone = !g.phone && channel !== 'share';
                const on = !excluded.has(g.id) && !noPhone;
                const reason = def.key === 'reminders' ? reminderReason(g, settings) : null;
                return (
                  <button key={g.id} className="cell" aria-pressed={on} style={noPhone ? { opacity: .4 } : undefined} disabled={noPhone} onClick={() => {
                    const s = new Set(excluded); if (s.has(g.id)) s.delete(g.id); else s.add(g.id); setExcluded(s);
                  }}>
                    <span className={`check ${on ? 'on' : ''}`}>{on && <IconCheck width={14} height={14} />}</span>
                    <span className="grow">
                      <span className="li-title" style={{ display: 'block' }}>{g.name}</span>
                      <span className="li-sub">{noPhone ? 'אין מספר טלפון' : reason === 'maybe' ? 'מתלבט/ת, הגיע מועד התזכורת' : reason === 'no-answer' ? `לא ענה · ${g.sentCount} הודעות` : <span dir="ltr">{formatPhone(g.phone)}</span>}</span>
                    </span>
                    <StatusBadge status={g.status} />
                  </button>
                );
              })}
            </div>
          )}
        </Group>

        <Group header="ההודעה" footer={<>משתנים: {'{name}'} שם · {'{couple}'} הזוג · {'{date}'} תאריך · {'{venue}'} מקום · {'{link}'} קישור אישי · {'{waze}'} ניווט</>}>
          <textarea className="textarea" style={{ borderRadius: 0 }} rows={6} value={template} onChange={(e) => setTemplate(e.target.value)} aria-label="נוסח ההודעה" />
        </Group>
        {['inviteTemplate', 'reminderTemplate'].includes(def.template) && !template.includes('{link}') && <div className="hint center" style={{ color: 'var(--maybe-ink)' }}>⚠️ בלי {'{link}'} האורח לא יוכל לאשר הגעה.</div>}

        <div className="stack" style={{ gap: 7 }}>
          <div className="group-header">שליחה דרך</div>
          <div className="segmented">
            <button className={channel === 'whatsapp' ? 'on' : ''} onClick={() => setChannel('whatsapp')}>וואטסאפ</button>
            <button className={channel === 'sms' ? 'on' : ''} onClick={() => setChannel('sms')}>SMS</button>
            <button className={channel === 'share' ? 'on' : ''} onClick={() => setChannel('share')}>תמונה וקישור</button>
          </div>
        </div>

        <button className="btn btn-primary btn-lg btn-block" disabled={chosen.length === 0 || !template.trim()} onClick={() => { setQueue(chosen); setIndex(0); setSentIds(new Set()); }}>
          התחלת שליחה · {chosen.length}
        </button>
      </div>
    );
  }

  // ---------------- Group list (like Mail's mailboxes) ----------------
  const visible = GROUPS.filter((gr) => !gr.visible || gr.visible(settings));
  const cell = (gr: GroupDef) => (
    <button key={gr.key} className="cell indent-icon" onClick={() => setGroup(gr.key)}>
      <span className="cell-icon" style={{ background: gr.color, fontSize: 16 }}>{gr.icon}</span>
      <span className="grow"><span className="cell-title" style={{ display: 'block' }}>{gr.title}</span><span className="cell-sub">{gr.desc}</span></span>
      <span className="cell-value num" style={gr.key === 'reminders' && groupCounts[gr.key] ? { color: 'var(--maybe-ink)', fontWeight: 600 } : undefined}>{groupCounts[gr.key] || 0}</span>
      <Chevron />
    </button>
  );

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div className="page-title">שליחה</div>
        <div className="page-desc">הסבב הראשון שלך, ואחריו המערכת מכינה את התזכורות לבד.</div>
      </div>
      <Group header="עכשיו">{visible.filter((g) => ['round1', 'reminders', 'eve', 'thanks'].includes(g.key)).map(cell)}</Group>
      <Group header="קבוצות" footer="מי שסימן שלא מגיע לא מופיע באף קבוצה ולא יקבל הודעות נוספות.">{visible.filter((g) => !['round1', 'reminders', 'eve', 'thanks'].includes(g.key)).map(cell)}</Group>
    </div>
  );
}
