'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/components/AdminShell';
import { useAuth } from '@/components/AuthGate';
import { IconImage, IconTeam } from '@/components/Icons';
import { Chevron, Group, Sheet, Spinner, Stepper, Switch, useToast } from '@/components/ui';
import { removeInvitationImage, resetEvent, saveInvitationImage, saveSettings } from '@/lib/data';
import { compressInvitation } from '@/lib/image';
import { guestsToCsv } from '@/lib/invite';
import { DEFAULT_SETTINGS, type EventSettings } from '@/lib/types';

/** ISO → value for <input type="datetime-local"> in local time */
function toLocalInput(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type TemplateKey = 'inviteTemplate' | 'reminderTemplate' | 'eveTemplate' | 'thanksTemplate';
const TEMPLATES: { key: TemplateKey; label: string; hint: string }[] = [
  { key: 'inviteTemplate', label: 'הזמנה', hint: 'נשלחת בסבב הראשון' },
  { key: 'reminderTemplate', label: 'תזכורת', hint: 'למי שלא ענה או מתלבט' },
  { key: 'eveTemplate', label: 'יום לפני האירוע', hint: 'למי שאישר, עם ניווט' },
  { key: 'thanksTemplate', label: 'תודה', hint: 'אחרי החתונה' },
];

export default function SettingsPage() {
  const { settings, invitation, hasUploadedInvitation, guests } = useAdminData();
  const { viewer, user, logout } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<EventSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<TemplateKey | null>(null);
  const [draft, setDraft] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState('');

  useEffect(() => { if (settings && !form) setForm(settings); }, [settings, form]);

  if (!form || !settings) return <div className="fullscreen-center" style={{ minHeight: '50vh' }}><Spinner /></div>;

  const account = (
    <Group header="חשבון">
      <div className="cell"><span className="grow">מחובר/ת</span><span className="cell-value" dir="ltr">{user.email}</span></div>
      <button className="cell" style={{ justifyContent: 'center', color: 'var(--no-ink)' }} onClick={logout}>התנתקות</button>
    </Group>
  );

  if (!viewer.isOwner) {
    return (
      <div className="stack" style={{ gap: 22 }}>
        <div className="page-head"><div className="page-title">הגדרות</div></div>
        <Group footer="פרטי האירוע ותמונת ההזמנה מנוהלים על ידי בעל האירוע. את/ה יכול/ה להוסיף מוזמנים ולשלוח להם הזמנות.">
          <div className="cell"><span className="grow">הרשאה</span><span className="cell-value">שותף/ה</span></div>
        </Group>
        {account}
      </div>
    );
  }

  // Settings save immediately, like the iOS Settings app
  async function commit(patch: Partial<EventSettings>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
    try { await saveSettings(patch); } catch (e) { toast((e as Error).message); }
  }
  const text = (k: keyof EventSettings, placeholder: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      className="input" style={{ maxWidth: '62%' }} placeholder={placeholder} defaultValue={String(form[k] ?? '')} key={k + String(settings[k])}
      onBlur={(e) => { if (e.target.value !== String(settings[k] ?? '')) commit({ [k]: e.target.value } as Partial<EventSettings>); }}
      {...extra}
    />
  );

  async function upload(file: File) {
    setUploading(true);
    try {
      await saveInvitationImage(await compressInvitation(file));
      toast('ההזמנה עודכנה');
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function backup() {
    const blob = new Blob([guestsToCsv(guests || [])], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'גיבוי-מוזמנים.csv';
    a.click();
  }

  async function doReset() {
    setResetting('מוחק…');
    try {
      const n = await resetEvent((done, total) => setResetting(`מוחק… ${done}/${total}`));
      setResetOpen(false);
      setConfirmText('');
      setForm(null);
      toast(`נמחקו ${n} רשומות. אירוע חדש מוכן`);
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setResetting('');
    }
  }

  return (
    <div className="stack" style={{ gap: 26 }}>
      <div className="page-head" style={{ marginBottom: 0 }}><div className="page-title">הגדרות</div></div>

      {/* Header card, like the Apple Account row */}
      <button className="card row" style={{ gap: 14, padding: 12 }} onClick={() => fileRef.current?.click()}>
        <img src={invitation} alt="" style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 10 }} />
        <span className="grow">
          <span style={{ display: 'block', fontSize: 20, fontWeight: 600 }}>{form.coupleNames}</span>
          <span className="cell-sub">{uploading ? 'מעלה…' : 'לחצו להחלפת תמונת ההזמנה'}</span>
        </span>
        <Chevron />
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      {hasUploadedInvitation && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'center', marginTop: -16 }} onClick={async () => { if (confirm('לחזור לתמונה המקורית של האתר?')) await removeInvitationImage(); }}><IconImage width={16} height={16} /> חזרה לתמונה המקורית</button>}

      <Group header="האירוע">
        <label className="cell"><span className="grow">שמות</span>{text('coupleNames', 'אריאל & מירב')}</label>
        <label className="cell"><span className="grow">כותרת</span>{text('headline', 'מתחתנים!')}</label>
        <label className="cell"><span className="grow">תאריך ושעה</span>
          <input className="input" style={{ maxWidth: '62%' }} type="datetime-local" defaultValue={toLocalInput(form.eventDate)} key={settings.eventDate}
            onBlur={(e) => { const v = e.target.value ? new Date(e.target.value).toISOString() : ''; if (v !== settings.eventDate) commit({ eventDate: v }); }} />
        </label>
        <label className="cell"><span className="grow">קבלת פנים</span>{text('receptionTime', '19:30', { type: 'time' })}</label>
        <label className="cell"><span className="grow">חופה</span>{text('chuppahTime', '20:30', { type: 'time' })}</label>
      </Group>

      <Group header="מקום" footer="קישור Waze לא חובה. בלי קישור, הניווט ייעשה לפי שם האולם והכתובת.">
        <label className="cell"><span className="grow">אולם</span>{text('venueName', 'אולמי אלגריה')}</label>
        <label className="cell"><span className="grow">כתובת</span>{text('venueAddress', 'רחוב, עיר')}</label>
        <label className="cell"><span className="grow">Waze</span>{text('wazeUrl', 'https://waze.com/ul/…', { dir: 'ltr' })}</label>
      </Group>

      <Group header="תזכורות אוטומטיות" footer={form.remindersOn
        ? `אחרי הסבב הראשון: מי שלא ענה או סימן "מתלבט" ייכנס לתזכורות אחרי ${form.reminderDays} ימים, עד ${form.maxReminders} פעמים. מי שסימן שלא מגיע לא יקבל יותר הודעות. התזכורות המוכנות מופיעות בסיכום ובלשונית השליחה.`
        : 'התזכורות כבויות. אפשר עדיין לשלוח ידנית לפי קבוצות.'}>
        <div className="cell"><span className="grow">תזכורות</span><Switch label="תזכורות אוטומטיות" checked={form.remindersOn} onChange={(v) => commit({ remindersOn: v })} /></div>
        {form.remindersOn && <div className="cell"><span className="grow">תזכורת אחרי</span><span className="cell-value num">{form.reminderDays} ימים</span><Stepper value={form.reminderDays} min={1} max={30} onChange={(n) => commit({ reminderDays: n })} /></div>}
        {form.remindersOn && <div className="cell"><span className="grow">עד</span><span className="cell-value num">{form.maxReminders} תזכורות</span><Stepper value={form.maxReminders} min={1} max={6} onChange={(n) => commit({ maxReminders: n })} /></div>}
      </Group>

      <Group header="נוסחי הודעות">
        {TEMPLATES.map((t) => (
          <button key={t.key} className="cell" onClick={() => { setEditing(t.key); setDraft(form[t.key]); }}>
            <span className="grow"><span className="cell-title" style={{ display: 'block' }}>{t.label}</span><span className="cell-sub">{t.hint}</span></span>
            <Chevron />
          </button>
        ))}
        <label className="cell"><span className="grow">טקסט בדף האורח</span>{text('extraText', 'נשמח לראותכם')}</label>
      </Group>

      <Group>
        <a href="#team" className="cell indent-icon">
          <span className="cell-icon" style={{ background: '#007aff' }}><IconTeam /></span>
          <span className="grow">שותפים והרשאות</span><Chevron />
        </a>
      </Group>

      {account}

      <Group footer="מוחק את כל המוזמנים, התשובות, השותפים וההגדרות. פעולה שאי אפשר לבטל.">
        <button className="cell" style={{ justifyContent: 'center', color: 'var(--no-ink)' }} onClick={() => setResetOpen(true)}>התחלת אירוע חדש</button>
      </Group>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={TEMPLATES.find((t) => t.key === editing)?.label}
        action={{ label: 'שמירה', onClick: () => { if (editing) commit({ [editing]: draft } as Partial<EventSettings>); setEditing(null); toast('נשמר'); } }}>
        <div className="stack" style={{ gap: 14 }}>
          <Group footer={<>משתנים: {'{name}'} שם · {'{couple}'} הזוג · {'{date}'} תאריך · {'{venue}'} מקום · {'{link}'} קישור אישי · {'{waze}'} ניווט</>}>
            <textarea className="textarea" style={{ borderRadius: 0, minHeight: 180 }} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="נוסח ההודעה" />
          </Group>
          {editing && <button className="btn btn-ghost" onClick={() => setDraft(DEFAULT_SETTINGS[editing])}>שחזור הנוסח המקורי</button>}
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => { setResetOpen(false); setConfirmText(''); }} title="אירוע חדש">
        <div className="stack" style={{ gap: 18 }}>
          <div className="center" style={{ fontSize: 44 }}>🗑️</div>
          <p className="center" style={{ lineHeight: 1.5 }}>יימחקו <b>{guests?.length || 0} מוזמנים</b> עם כל התשובות, הברכות וההושבה, וגם השותפים וההגדרות. האתר יחזור להיות כמו חדש.</p>
          <button className="btn btn-tinted btn-block" onClick={backup}>הורדת גיבוי לאקסל לפני המחיקה</button>
          <Group header='כדי לאשר, כתבו "מחיקה"'>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="מחיקה" aria-label="אישור מחיקה" />
          </Group>
          <button className="btn btn-lg btn-block" style={{ background: 'var(--no)', color: '#fff' }} disabled={confirmText.trim() !== 'מחיקה' || !!resetting} onClick={doReset}>
            {resetting || 'מחיקת כל הנתונים'}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
