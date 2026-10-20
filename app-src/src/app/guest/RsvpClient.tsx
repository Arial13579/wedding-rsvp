'use client';

import { useRef, useState } from 'react';
import { submitAnswer } from '@/lib/data';
import { BASE } from '@/lib/config';
import { hebrewDate, longDate, wazeLink } from '@/lib/format';
import { DIET_LABEL, type Diet, type EventSettings, type Status } from '@/lib/types';
import { Countdown } from '@/components/Countdown';
import { Stepper } from '@/components/ui';
import { A11yMenu, useA11y } from './A11yMenu';

export interface PublicGuest { id: string; name: string; status: Status; adults: number; kids: number; diet: Diet; message: string }

type View = 'choose' | 'yes' | 'maybe' | 'no' | 'done';

function burstConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#30b0c7', '#34c759', '#ffcc00', '#ff9500', '#ff2d55', '#af52de', '#5ac8fa'];
  const pieces = Array.from({ length: 150 }, () => ({
    x: window.innerWidth / 2, y: window.innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 16 - 5,
    s: Math.random() * 7 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of pieces) {
      p.vy += 0.4; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.roundRect?.(-p.s / 2, -p.s / 4, p.s, p.s / 2, 2); ctx.fill(); ctx.restore();
    }
    if (++frame < 210) requestAnimationFrame(tick); else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
  tick();
}

const ICON = {
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6.4 11.6 6.7 11.9a1.2 1.2 0 0 0 1.6 0c.3-.3 6.7-6.6 6.7-11.9A7.5 7.5 0 0 0 12 2Zm0 10.3a2.8 2.8 0 1 1 0-5.6 2.8 2.8 0 0 1 0 5.6Z" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>,
  q: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M9 9a3 3 0 1 1 4.2 2.8c-.8.3-1.2 1-1.2 1.8V15" /><circle cx="12" cy="18.6" r=".6" fill="currentColor" /></svg>,
  chev: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 6-6 6 6 6" /></svg>,
};

export function RsvpClient({ guest, settings, image }: { guest: PublicGuest | null; settings: EventSettings; image: string }) {
  const a11y = useA11y();
  const [status, setStatus] = useState<Status>(guest?.status || 'pending');
  const [adults, setAdults] = useState(Math.max(1, guest?.adults || 1));
  const [kids, setKids] = useState(guest?.kids || 0);
  const [diet, setDiet] = useState<Diet>(guest?.diet || '');
  const [message, setMessage] = useState(guest?.message || '');
  const [view, setView] = useState<View>(guest && guest.status !== 'pending' ? 'done' : 'choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(false);
  const confetti = useRef<HTMLCanvasElement>(null);

  const date = settings.eventDate ? new Date(settings.eventDate) : null;
  const firstName = guest?.name.split(' ')[0] || '';
  const remindDays = Math.max(1, settings.reminderDays || 7);
  const remindDate = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(Date.now() + remindDays * 86400000));

  async function submit(next: Status) {
    if (!guest) return;
    setBusy(true);
    setError('');
    try {
      await submitAnswer(guest.id, {
        status: next,
        adults: next === 'yes' ? adults : 0,
        kids: next === 'yes' ? kids : 0,
        diet: next === 'yes' ? diet : '',
        message,
        remindDays,
      });
      setStatus(next);
      setView('done');
      if (next === 'yes' && confetti.current && !a11y.calm) burstConfetti(confetti.current);
    } catch {
      setError('השליחה לא הצליחה. בדקו את החיבור ונסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  const doneText: Record<Status, { title: string; body: string }> = {
    yes: { title: 'אישור ההגעה נשלח בהצלחה', body: `רשמנו ${adults} מבוגרים${kids ? ` ו־${kids} ילדים` : ''}. מחכים לחגוג איתכם!` },
    maybe: { title: 'קיבלנו, תודה!', body: `נזכיר לכם ב${remindDate}. אפשר לעדכן כאן בכל רגע.` },
    no: { title: 'תודה על העדכון', body: 'חבל שלא תוכלו להגיע, נתגעגע! לא נשלח לכם תזכורות נוספות.' },
    pending: { title: '', body: '' },
  };

  const blessing = (
    <label className="g-field">
      <span>ברכה לזוג <em>(לא חובה)</em></span>
      <textarea dir="auto" rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="מזל טוב! …" />
    </label>
  );

  return (
    <div className={`guest ${a11y.className}`}>
      {/* The photo's colors bleed into a frosted background, as in Apple Invites */}
      <div className="g-backdrop" style={{ backgroundImage: `url("${image}")` }} aria-hidden />
      <canvas ref={confetti} className="confetti" aria-hidden />

      <main className="g-main">
        <header className="g-hero">
          {firstName && <div className="g-hello">שלום {firstName},</div>}
          <button className="g-invite" onClick={() => setZoom(true)} aria-label="הגדלת ההזמנה">
            <img src={image} alt={`הזמנה לחתונה של ${settings.coupleNames}`} />
          </button>
          <div className="g-headline">{settings.headline}</div>
          <h1 className="g-names">{settings.coupleNames}</h1>
          {settings.extraText && <p className="g-extra">{settings.extraText}</p>}
        </header>

        <section className="g-glass g-rows g-reveal" aria-label="פרטי האירוע">
          {date && (
            <a className="g-row" href={`${BASE}/wedding.ics`}>
              <span className="g-row-icon" style={{ background: '#ff3b30' }}>{ICON.calendar}</span>
              <span className="g-row-text"><b>{longDate(date)}</b><small>{hebrewDate(date)}</small></span>
              <span className="g-row-action">ליומן</span>
            </a>
          )}
          {(settings.receptionTime || settings.chuppahTime) && (
            <div className="g-row">
              <span className="g-row-icon" style={{ background: '#5856d6' }}>{ICON.clock}</span>
              <span className="g-row-text">
                <b>{[settings.receptionTime && `קבלת פנים ${settings.receptionTime}`, settings.chuppahTime && `חופה ${settings.chuppahTime}`].filter(Boolean).join(' · ')}</b>
              </span>
            </div>
          )}
          <a className="g-row" href={wazeLink(settings)} target="_blank" rel="noreferrer">
            <span className="g-row-icon" style={{ background: '#30b0c7' }}>{ICON.pin}</span>
            <span className="g-row-text"><b>{settings.venueName}</b>{settings.venueAddress && <small>{settings.venueAddress}</small>}</span>
            <span className="g-row-action">Waze</span>
          </a>
        </section>

        {settings.eventDate && date && Date.now() < date.getTime() && (
          <section className="g-glass g-reveal">
            <div className="g-label">עוד</div>
            <Countdown iso={settings.eventDate} />
          </section>
        )}

        {guest ? (
          <section className="g-glass g-rsvp g-reveal" id="rsvp" aria-live="polite">
            {view === 'choose' && (
              <div className="g-step">
                <div className="g-question">תגיעו?</div>
                <div className="g-choices">
                  <button className="g-choice yes" onClick={() => setView('yes')}><i>{ICON.check}</i>מגיעים</button>
                  <button className="g-choice maybe" onClick={() => setView('maybe')}><i>{ICON.q}</i>מתלבטים</button>
                  <button className="g-choice no" onClick={() => setView('no')}><i>{ICON.x}</i>לא מגיעים</button>
                </div>
              </div>
            )}

            {view === 'yes' && (
              <div className="g-step">
                <div className="g-question">איזה כיף! כמה תהיו?</div>
                <div className="g-list">
                  <div className="g-list-row"><span>מבוגרים</span><Stepper value={adults} onChange={(n) => setAdults(Math.max(1, n))} min={1} max={20} /></div>
                  <div className="g-list-row"><span>ילדים</span><Stepper value={kids} onChange={setKids} max={20} /></div>
                </div>
                <div className="g-field">
                  <span>העדפת מנה <em>(לא חובה)</em></span>
                  <div className="g-chips">
                    {(Object.keys(DIET_LABEL) as Exclude<Diet, ''>[]).map((d) => (
                      <button key={d} type="button" aria-pressed={diet === d} className={diet === d ? 'on' : ''} onClick={() => setDiet(diet === d ? '' : d)}>{DIET_LABEL[d]}</button>
                    ))}
                  </div>
                </div>
                {blessing}
                <button className="g-primary yes" disabled={busy} onClick={() => submit('yes')}>{busy ? 'שולח…' : `אישור הגעה · ${adults + kids}`}</button>
                <button className="g-link" onClick={() => setView('choose')}>חזרה</button>
              </div>
            )}

            {view === 'maybe' && (
              <div className="g-step">
                <div className="g-question">אין בעיה, קחו את הזמן</div>
                <p className="g-note">נשלח לכם תזכורת ב{remindDate}. אפשר לחזור לקישור הזה ולעדכן בכל רגע.</p>
                <button className="g-primary maybe" disabled={busy} onClick={() => submit('maybe')}>{busy ? 'שולח…' : 'עדיין מתלבטים'}</button>
                <button className="g-link" onClick={() => setView('choose')}>חזרה</button>
              </div>
            )}

            {view === 'no' && (
              <div className="g-step">
                <div className="g-question">חבל שלא תוכלו להגיע</div>
                {blessing}
                <button className="g-primary no" disabled={busy} onClick={() => submit('no')}>{busy ? 'שולח…' : 'לא נוכל להגיע'}</button>
                <button className="g-link" onClick={() => setView('choose')}>חזרה</button>
              </div>
            )}

            {view === 'done' && status !== 'pending' && (
              <div className={`g-done ${status}`}>
                <svg className="g-done-mark" viewBox="0 0 52 52" aria-hidden>
                  <circle cx="26" cy="26" r="24" />
                  {status === 'no' ? <path d="M18 18l16 16M34 18 18 34" /> : status === 'maybe' ? <path d="M17 26h18" /> : <path d="M15 27l7 7 15-16" />}
                </svg>
                <div className="g-done-title">{doneText[status].title}</div>
                <div className="g-done-body">{doneText[status].body}</div>
                <button className="g-link" onClick={() => setView('choose')}>שינוי תשובה</button>
              </div>
            )}

            {error && <div className="g-error" role="alert">{error}</div>}
          </section>
        ) : (
          <section className="g-glass center"><div className="g-note">הקישור לאישור ההגעה אינו תקין. פנו לבעלי השמחה לקבלת קישור אישי.</div></section>
        )}

        <footer className="g-footer">
          <div>מחכים לראותכם 🤍</div>
          <nav className="g-legal">
            <a href={`${BASE}/privacy.html`}>פרטיות</a> · <a href={`${BASE}/terms.html`}>תקנון</a> · <a href={`${BASE}/accessibility.html`}>הצהרת נגישות</a>
          </nav>
        </footer>
      </main>

      <A11yMenu state={a11y} />

      {zoom && (
        <div className="g-zoom" onClick={() => setZoom(false)} role="dialog" aria-label="ההזמנה בגודל מלא">
          <img src={image} alt="ההזמנה" />
        </div>
      )}
    </div>
  );
}
