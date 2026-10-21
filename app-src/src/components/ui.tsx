'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { STATUS_META, type Status } from '@/lib/types';

// ---------- Toast ----------
const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status" key={msg}>{msg}</div>}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------- Sheet (iOS card sheet: grabber, Cancel/Done header, swipe down to dismiss) ----------
export function Sheet({ open, onClose, title, children, action }: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional trailing header button, e.g. { label: 'שמירה', onClick } */
  action?: { label: string; onClick: () => void; disabled?: boolean };
}) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setClosing(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    setClosing(true);
    setTimeout(onClose, 230);
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if ((sheetRef.current?.scrollTop || 0) > 0) return;
    drag.current = { y: e.touches[0].clientY, dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current || !sheetRef.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    sheetRef.current.style.transition = 'none';
    sheetRef.current.style.transform = `translateY(${dy}px)`;
  };
  const onTouchEnd = () => {
    const el = sheetRef.current;
    if (!drag.current || !el) return;
    el.style.transition = 'transform .35s cubic-bezier(.32,.72,0,1)';
    if (drag.current.dy > 110) { el.style.transform = 'translateY(100%)'; setTimeout(onClose, 250); }
    else el.style.transform = '';
    drag.current = null;
  };

  if (!open) return null;
  // Rendered on <body> so no animated/transformed ancestor can trap it under the navigation bar
  return createPortal(
    <div className={`overlay ${closing ? 'closing' : ''}`} onClick={dismiss}>
      <div
        ref={sheetRef} className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      >
        <div className="sheet-grip" />
        <div className="sheet-head">
          <button type="button" onClick={dismiss}>{action ? 'ביטול' : ''}</button>
          <div className="sheet-title">{title}</div>
          {action
            ? <button type="button" onClick={action.onClick} disabled={action.disabled} style={action.disabled ? { opacity: .4 } : undefined}>{action.label}</button>
            : <button type="button" onClick={dismiss}>סגירה</button>}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Inset grouped list ----------
export function Group({ header, footer, children }: { header?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="group-wrap">
      {header && <div className="group-header">{header}</div>}
      <div className="group">{children}</div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

export function Chevron() {
  return <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 6 6 6-6 6" /></svg>;
}

// ---------- Status badge ----------
export function StatusBadge({ status }: { status: Status }) {
  const m = STATUS_META[status];
  return (
    <span className="badge" style={{ background: `color-mix(in srgb, ${m.color} 14%, transparent)`, color: m.ink }}>
      <i className="dot" style={{ background: m.color }} />
      {m.short}
    </span>
  );
}

export function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const t = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return <div className="li-avatar">{t || '?'}</div>;
}

export function Spinner() {
  return <div className="spinner" aria-label="טוען" />;
}

export function Stepper({ value, onChange, min = 0, max = 30 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="הוספה">+</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="הפחתה">−</button>
    </div>
  );
}
