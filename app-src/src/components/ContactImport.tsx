'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { pickFromDevice, type ContactCandidate } from '@/lib/vcard';
import { detectDevice, parseContactsFile, type Device } from '@/lib/contacts';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { addGuests } from '@/lib/data';
import { useAuth } from './AuthGate';
import { IconCheck, IconContacts, IconFile, IconSearch } from './Icons';
import { Group, Sheet, useToast } from './ui';

const LETTER = /[A-Za-zא-ת]/;
function letterOf(name: string) {
  const ch = [...name].find((c) => LETTER.test(c)) || '#';
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch.replace(/[ךםןףץ]/, (f) => ({ ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' })[f] || f);
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((it, i) => (
        <li key={i} className="row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 15, lineHeight: 1.5 }}>
          <span className="num" style={{ flex: 'none', width: 24, height: 24, borderRadius: 12, background: 'var(--accent)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
          <span>{it}</span>
        </li>
      ))}
    </ol>
  );
}

export function ContactImport({ open, onClose, existingPhones, tags, initial }: {
  open: boolean;
  onClose: () => void;
  existingPhones: Set<string>;
  tags: string[];
  /** Contacts already picked with the system picker (skips the first screen) */
  initial?: ContactCandidate[] | null;
}) {
  const { viewer } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<ContactCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [hideExisting, setHideExisting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [device, setDevice] = useState<Device>({ ios: false, android: false, iosSafari: false, picker: false });

  useEffect(() => { setDevice(detectDevice()); }, []);
  useEffect(() => { if (open && initial?.length) load(initial); }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  function load(list: ContactCandidate[], append = false) {
    const all = append && candidates ? [...candidates, ...list] : list;
    const seen = new Set<string>();
    const unique = all.filter((c) => (seen.has(c.phone) ? false : (seen.add(c.phone), true)));
    unique.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (!unique.length) { setError('לא נמצאו אנשי קשר עם מספר טלפון'); return; }
    setCandidates(unique);
    // Pre-select only contacts that aren't invited yet
    setSelected(new Set(unique.filter((c) => !existingPhones.has(c.phone)).map((c) => c.key)));
    setError('');
  }

  async function fromDevice() {
    setError('');
    try {
      const picked = await pickFromDevice();
      if (picked.length) load(picked, !!candidates);
    } catch (e) {
      setError((e as Error).message || 'לא הצלחנו לפתוח את אנשי הקשר');
    }
  }

  async function fromFiles(files: FileList) {
    setReading(true);
    setError('');
    try {
      const lists = await Promise.all([...files].map((f, i) => parseContactsFile(f, i)));
      load(lists.flat(), !!candidates);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

  const visible = useMemo(() => {
    if (!candidates) return [];
    const s = q.trim();
    const digits = s.replace(/\D/g, '');
    return candidates.filter((c) =>
      (!hideExisting || !existingPhones.has(c.phone)) &&
      (!s || c.name.toLowerCase().includes(s.toLowerCase()) || (digits.length > 2 && c.phones.some((p) => p.includes(normalizePhone(digits) || digits)))),
    );
  }, [candidates, q, hideExisting, existingPhones]);

  const sections = useMemo(() => {
    const map = new Map<string, ContactCandidate[]>();
    for (const c of visible) {
      const l = letterOf(c.name);
      if (!map.has(l)) map.set(l, []);
      map.get(l)!.push(c);
    }
    return [...map.entries()];
  }, [visible]);

  const existingCount = candidates ? candidates.filter((c) => existingPhones.has(c.phone)).length : 0;
  const allVisibleOn = visible.length > 0 && visible.every((c) => selected.has(c.key));
  const chosenCount = candidates ? candidates.filter((c) => selected.has(c.key)).length : 0;

  function toggleAll() {
    const next = new Set(selected);
    visible.forEach((c) => (allVisibleOn ? next.delete(c.key) : next.add(c.key)));
    setSelected(next);
  }

  async function save() {
    if (!candidates) return;
    const list = candidates.filter((c) => selected.has(c.key));
    setBusy(true);
    try {
      await addGuests(viewer, list.map((c) => ({ name: c.name, phone: c.phone, tag })));
      toast(`נוספו ${list.length} מוזמנים 🎉`);
      reset();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCandidates(null); setSelected(new Set()); setQ(''); setTag(''); setError(''); setHideExisting(true);
  }

  const fileButton = (label: string) => (
    <button className="btn btn-primary btn-lg btn-block" disabled={reading} onClick={() => fileRef.current?.click()}>
      <IconFile width={20} height={20} /> {reading ? 'קורא את הקובץ…' : label}
    </button>
  );

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="אנשי קשר"
      action={candidates ? { label: busy ? 'מוסיף…' : `הוספה (${chosenCount})`, onClick: save, disabled: busy || chosenCount === 0 } : undefined}>
      <input ref={fileRef} type="file" multiple hidden
        accept=".vcf,.vcard,.csv,.xlsx,.xls,text/vcard,text/x-vcard,text/csv,text/comma-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={(e) => { if (e.target.files?.length) fromFiles(e.target.files); e.target.value = ''; }} />

      {!candidates ? (
        <div className="stack" style={{ gap: 22 }}>
          {!device.picker && fileButton('בחירת קובץ אנשי קשר')}
          {device.picker && (
            <>
              <button className="btn btn-primary btn-lg btn-block" onClick={fromDevice}><IconContacts width={20} height={20} /> בחירה מאנשי הקשר</button>
              <p className="hint center" style={{ marginTop: -12 }}>נפתחת רשימת אנשי הקשר של הטלפון. מסמנים אחד או כמה ולוחצים "בחירה".</p>
            </>
          )}

          <Group header={device.picker ? 'או: כל אנשי הקשר בבת אחת' : 'כל אנשי הקשר מקובץ, בכל דפדפן'}
            footer="אחרי בחירת הקובץ תופיע רשימה עם חיפוש. בוחרים את כולם בלחיצה, או אחד אחד.">
            <div className="cell" style={{ display: 'block', padding: 16 }}>
              {device.ios ? (
                <Steps items={[
                  <>אפליקציית <b>אנשי קשר</b> ← <b>רשימות</b> (למעלה)</>,
                  <>לחיצה ארוכה על <b>כל אנשי הקשר</b> ← <b>ייצוא</b> ← <b>שמירה בקבצים</b></>,
                  <>חוזרים לכאן ובוחרים את הקובץ</>,
                ]} />
              ) : device.android ? (
                <Steps items={[
                  <>אפליקציית <b>אנשי קשר</b> ← <b>ניהול אנשי קשר</b> (או ⋮) ← <b>ייצוא</b> לקובץ</>,
                  <>או מהמחשב: <b>contacts.google.com</b> ← ייצוא ← Google CSV</>,
                  <>חוזרים לכאן ובוחרים את הקובץ</>,
                ]} />
              ) : (
                <Steps items={[
                  <><b>contacts.google.com</b> ← ייצוא (Google CSV), או <b>icloud.com</b> ← אנשי קשר ← ייצוא vCard</>,
                  <>אפשר גם קובץ אקסל: עמודה A שם, עמודה B טלפון</>,
                  <>בוחרים כאן את הקובץ</>,
                ]} />
              )}
            </div>
          </Group>
          {device.picker && fileButton('בחירת קובץ אנשי קשר')}
          {!device.picker && device.ios && (
            <Group header="או: בחירה ישירה מאנשי הקשר (הפעלה חד־פעמית)" footer={device.iosSafari
              ? 'אפל מאפשרת לאתרים לפתוח את אנשי הקשר רק אחרי ההפעלה הזו. היא חד־פעמית ולא משפיעה על שום דבר אחר.'
              : 'באייפון, אפל מאפשרת לאתרים לגשת לאנשי הקשר רק דרך Safari. פתחו את האתר ב־Safari והפעילו פעם אחת, או השתמשו בקובץ למטה שעובד בכל דפדפן.'}>
              <div className="cell" style={{ display: 'block', padding: 16 }}>
                <Steps items={[
                  ...(device.iosSafari ? [] : [<>פותחים את האתר ב־<b>Safari</b> <button className="btn btn-sm btn-tinted" style={{ marginInlineStart: 6 }} onClick={async () => { await navigator.clipboard.writeText(location.href); toast('הקישור הועתק. הדביקו אותו ב־Safari'); }}>העתקת קישור</button></>]),
                  <>בטלפון: <b>הגדרות</b> ← <b>אפליקציות</b> ← <b>Safari</b> ← <b>מתקדם</b> ← <b>Feature Flags</b></>,
                  <>מפעילים את <b>Contact Picker API</b></>,
                  <>חוזרים לכאן ומרעננים. מעכשיו הכפתור פותח ישר את אנשי הקשר</>,
                ]} />
              </div>
            </Group>
          )}

          {error && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{error}</div>}
        </div>
      ) : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="search">
            <IconSearch />
            <input className="input" type="search" placeholder={`חיפוש ב־${candidates.length} אנשי קשר`} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-sm btn-tinted" onClick={toggleAll} disabled={!visible.length}>{allVisibleOn ? 'ניקוי הבחירה' : q ? 'בחירת התוצאות' : 'בחירת הכול'}</button>
            {existingCount > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={() => setHideExisting(!hideExisting)}>{hideExisting ? `הצגת ${existingCount} שכבר ברשימה` : 'הסתרת מי שכבר ברשימה'}</button>
            )}
            <span className="grow" />
            <span className="muted num" style={{ fontSize: 15 }}>{chosenCount} נבחרו</span>
          </div>

          <div className="group" style={{ maxHeight: '52dvh', overflowY: 'auto' }}>
            {sections.length === 0 && <div className="cell"><span className="grow muted center">אין תוצאות</span></div>}
            {sections.map(([letter, list]) => (
              <div key={letter}>
                <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-2)', padding: '3px 16px', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{letter}</div>
                {list.map((c) => {
                  const on = selected.has(c.key);
                  const exists = existingPhones.has(c.phone);
                  return (
                    <button key={c.key} className="cell" aria-pressed={on} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }} onClick={() => {
                      const next = new Set(selected); if (on) next.delete(c.key); else next.add(c.key); setSelected(next);
                    }}>
                      <span className={`check ${on ? 'on' : ''}`}>{on && <IconCheck width={14} height={14} />}</span>
                      <span className="grow">
                        <span className="li-title" style={{ display: 'block' }}>{c.name}</span>
                        <span className="li-sub"><span dir="ltr">{formatPhone(c.phone)}</span>{exists && <span style={{ color: 'var(--warn-ink)' }}>· כבר ברשימה</span>}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <Group>
            <label className="cell"><span className="grow">קבוצה</span>
              <input className="input" style={{ maxWidth: 200 }} list="tag-list" placeholder="ללא" value={tag} onChange={(e) => setTag(e.target.value)} />
              <datalist id="tag-list">{tags.map((t) => <option key={t} value={t} />)}</datalist>
            </label>
          </Group>
          {error && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || chosenCount === 0} onClick={save}>{busy ? 'מוסיף…' : `הוספת ${chosenCount} מוזמנים`}</button>
          <div className="row" style={{ justifyContent: 'center' }}>
            {device.picker && <button className="btn btn-ghost btn-sm" onClick={fromDevice}>+ עוד מאנשי הקשר</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>+ עוד מקובץ</button>
            <button className="btn btn-ghost btn-sm" onClick={reset}>התחלה מחדש</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
