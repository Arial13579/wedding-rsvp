'use client';

import { useEffect, useState } from 'react';
import { addGuests, updateGuest } from '@/lib/data';
import { formatPhone, normalizePhone } from '@/lib/phone';
import { STATUS_META, STATUS_ORDER, type Guest, type Status } from '@/lib/types';
import { useAuth } from './AuthGate';
import { Group, Sheet, Stepper, useToast } from './ui';

export function GuestEditor({ open, onClose, guest, tags }: { open: boolean; onClose: () => void; guest: Guest | null; tags: string[] }) {
  const { viewer } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [tag, setTag] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<Status>('pending');
  const [adults, setAdults] = useState(0);
  const [kids, setKids] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(guest?.name || '');
    setPhone(guest ? formatPhone(guest.phone) : '');
    setTag(guest?.tag || '');
    setNote(guest?.note || '');
    setStatus(guest?.status || 'pending');
    setAdults(guest?.adults || 0);
    setKids(guest?.kids || 0);
    setError('');
  }, [open, guest]);

  async function save(addAnother = false) {
    const p = normalizePhone(phone);
    if (!name.trim()) return setError('נא להזין שם');
    if (phone && !p) return setError('מספר הטלפון לא תקין');
    setBusy(true);
    try {
      if (guest) {
        const patch: Partial<Guest> = { name: name.trim(), phone: p, tag: tag.trim(), note: note.trim() };
        if (status !== guest.status || adults !== guest.adults || kids !== guest.kids) {
          Object.assign(patch, { status, adults: status === 'yes' ? adults : 0, kids: status === 'yes' ? kids : 0 });
        }
        await updateGuest(guest.id, patch);
        toast('נשמר');
        onClose();
      } else {
        await addGuests(viewer, [{ name, phone: p, tag, note }]);
        toast(`${name.trim()} נוסף/ה`);
        if (addAnother) { setName(''); setPhone(''); setNote(''); } else onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={guest ? 'עריכת מוזמן' : 'מוזמן חדש'} action={{ label: busy ? 'שומר…' : 'שמירה', onClick: () => save(), disabled: busy || !name.trim() }}>
      <form className="stack" style={{ gap: 22 }} onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Group>
          <label className="cell"><input className="input" style={{ textAlign: 'start' }} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="שם מלא" aria-label="שם מלא" /></label>
          <label className="cell"><input className="input" style={{ textAlign: 'start' }} type="tel" dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="טלפון" aria-label="טלפון" /></label>
        </Group>
        <Group footer="קבוצה עוזרת לסנן ולשלוח בנפרד, למשל משפחה, חברים או עבודה.">
          <label className="cell"><span className="grow">קבוצה</span>
            <input className="input" style={{ maxWidth: 180 }} list="tag-list-editor" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="ללא" />
            <datalist id="tag-list-editor">{tags.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <label className="cell"><span className="grow">הערה</span><input className="input" style={{ maxWidth: 180 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ללא" /></label>
        </Group>

        {guest && (
          <Group header="תשובה" footer="לעדכון ידני, למשל אם האורח ענה בטלפון.">
            <div className="cell">
              <div className="segmented grow">
                {STATUS_ORDER.map((s) => (
                  <button key={s} type="button" className={status === s ? 'on' : ''} onClick={() => setStatus(s)} style={status === s ? { color: STATUS_META[s].ink } : undefined}>
                    {STATUS_META[s].short}
                  </button>
                ))}
              </div>
            </div>
            {status === 'yes' && <div className="cell"><span className="grow">מבוגרים</span><Stepper value={adults} onChange={setAdults} /></div>}
            {status === 'yes' && <div className="cell"><span className="grow">ילדים</span><Stepper value={kids} onChange={setKids} /></div>}
          </Group>
        )}

        {error && <div style={{ color: 'var(--no-ink)', fontSize: 15, textAlign: 'center' }}>{error}</div>}
        {!guest && <button type="button" className="btn btn-tinted btn-block" disabled={busy || !name.trim()} onClick={() => save(true)}>שמירה והוספת עוד</button>}
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
