'use client';

import { useMemo, useRef, useState } from 'react';
import { contactPickerSupported, parseVCard, pickFromDevice, type ContactCandidate } from '@/lib/vcard';
import { formatPhone } from '@/lib/phone';
import { addGuests } from '@/lib/data';
import { useAuth } from './AuthGate';
import { IconCheck, IconContacts, IconFile, IconSearch } from './Icons';
import { Chevron, Group, Sheet, useToast } from './ui';

export function ContactImport({ open, onClose, existingPhones, tags }: { open: boolean; onClose: () => void; existingPhones: Set<string>; tags: string[] }) {
  const { viewer } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<ContactCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const supported = typeof window !== 'undefined' && contactPickerSupported();

  function load(list: ContactCandidate[]) {
    const seen = new Set<string>();
    const unique = list.filter((c) => (seen.has(c.phone) ? false : (seen.add(c.phone), true)));
    unique.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    setCandidates(unique);
    // Pre-select only contacts that aren't invited yet
    setSelected(new Set(unique.filter((c) => !existingPhones.has(c.phone)).map((c) => c.key)));
    setError(unique.length ? '' : 'לא נמצאו אנשי קשר עם מספר טלפון');
  }

  async function fromDevice() {
    try { load(await pickFromDevice()); } catch (e) { setError((e as Error).message); }
  }

  async function fromFile(file: File) {
    const text = await file.text();
    load(parseVCard(text));
  }

  const filtered = useMemo(() => {
    if (!candidates) return [];
    const s = q.trim();
    return s ? candidates.filter((c) => c.name.includes(s) || c.phone.includes(s.replace(/\D/g, '') || '~')) : candidates;
  }, [candidates, q]);

  const allFilteredOn = filtered.length > 0 && filtered.every((c) => selected.has(c.key));

  function toggleAll() {
    const next = new Set(selected);
    filtered.forEach((c) => (allFilteredOn ? next.delete(c.key) : next.add(c.key)));
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
    setCandidates(null); setSelected(new Set()); setQ(''); setTag(''); setError('');
  }

  return (
    <Sheet open={open} onClose={() => { reset(); onClose(); }} title="אנשי קשר"
      action={candidates ? { label: busy ? 'מוסיף…' : `הוספה (${selected.size})`, onClick: save, disabled: busy || selected.size === 0 } : undefined}>
      {!candidates ? (
        <div className="stack" style={{ gap: 22 }}>
          <Group footer={supported ? 'בוחרים בדיוק את מי להזמין ישירות מאנשי הקשר.' : 'כדי לבחור ישירות מהטלפון צריך להפעיל פעם אחת אפשרות ב־Safari (הסבר למטה). בינתיים אפשר לייבא קובץ.'}>
            <button className="cell indent-icon" onClick={fromDevice} disabled={!supported} style={supported ? undefined : { opacity: .45 }}>
              <span className="cell-icon" style={{ background: '#30b0c7' }}><IconContacts /></span>
              <span className="grow">בחירה מאנשי הקשר</span><Chevron />
            </button>
            <button className="cell indent-icon" onClick={() => fileRef.current?.click()}>
              <span className="cell-icon" style={{ background: '#8e8e93' }}><IconFile /></span>
              <span className="grow">ייבוא קובץ אנשי קשר (vCard)</span><Chevron />
            </button>
          </Group>
          <input ref={fileRef} type="file" accept=".vcf,text/vcard,text/x-vcard" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); e.target.value = ''; }} />
          {error && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{error}</div>}
          {!supported && (
            <Group header="הפעלת בחירה ישירה באייפון">
              <div className="cell"><span className="grow" style={{ fontSize: 15, lineHeight: 1.6 }}>הגדרות ← אפליקציות ← Safari ← מתקדם ← Feature Flags ← מפעילים את <b>Contact Picker API</b>, ואז מרעננים את הדף.</span></div>
            </Group>
          )}
          <Group header="ייצוא כל אנשי הקשר לקובץ">
            <div className="cell"><span className="grow" style={{ fontSize: 15, lineHeight: 1.6 }}>אנשי קשר ← רשימות ← לחיצה ארוכה על <b>כל אנשי הקשר</b> ← ייצוא ← שמירה בקבצים. אחר כך בוחרים כאן את הקובץ, ומסמנים את מי להזמין.</span></div>
          </Group>
        </div>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          <div className="search">
            <IconSearch />
            <input className="input" type="search" placeholder="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="row">
            <span className="grow muted" style={{ fontSize: 15 }}>נבחרו {selected.size} מתוך {candidates.length}</span>
            <button className="btn btn-sm btn-tinted" onClick={toggleAll}>{allFilteredOn ? 'ביטול הבחירה' : 'בחירת הכול'}</button>
          </div>
          <div className="group" style={{ maxHeight: '46dvh', overflowY: 'auto' }}>
            {filtered.map((c) => {
              const on = selected.has(c.key);
              const exists = existingPhones.has(c.phone);
              return (
                <button key={c.key} className="cell" aria-pressed={on} onClick={() => {
                  const next = new Set(selected); if (on) next.delete(c.key); else next.add(c.key); setSelected(next);
                }}>
                  <span className={`check ${on ? 'on' : ''}`}>{on && <IconCheck width={14} height={14} />}</span>
                  <span className="grow">
                    <span className="li-title" style={{ display: 'block' }}>{c.name}</span>
                    <span className="li-sub"><span dir="ltr">{formatPhone(c.phone)}</span>{exists && <span style={{ color: 'var(--maybe-ink)' }}>· כבר ברשימה</span>}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Group>
            <label className="cell"><span className="grow">קבוצה</span>
              <input className="input" style={{ maxWidth: 200 }} list="tag-list" placeholder="ללא" value={tag} onChange={(e) => setTag(e.target.value)} />
              <datalist id="tag-list">{tags.map((t) => <option key={t} value={t} />)}</datalist>
            </label>
          </Group>
          {error && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy || selected.size === 0} onClick={save}>{busy ? 'מוסיף…' : `הוספת ${selected.size} מוזמנים`}</button>
          <button className="btn btn-ghost" onClick={reset}>חזרה</button>
        </div>
      )}
    </Sheet>
  );
}
