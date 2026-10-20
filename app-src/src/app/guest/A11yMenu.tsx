'use client';

import { useEffect, useState } from 'react';

const KEY = 'a11yPrefs';
interface Prefs { contrast: boolean; text: 0 | 1 | 2 | 3; calm: boolean }
const DEFAULTS: Prefs = { contrast: false, text: 0, calm: false };

/** Accessibility preferences (high contrast, larger text, no motion), remembered on this device. */
export function useA11y() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) setPrefs({ ...DEFAULTS, ...saved });
    } catch { /* storage unavailable */ }
  }, []);
  const update = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  };
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const className = [prefs.contrast && 'a11y-contrast', prefs.text && `a11y-text-${prefs.text}`, prefs.calm && 'a11y-calm'].filter(Boolean).join(' ');
  return { prefs, update, className, calm: prefs.calm || !!reducedMotion };
}

export function A11yMenu({ state }: { state: ReturnType<typeof useA11y> }) {
  const [open, setOpen] = useState(false);
  const { prefs, update } = state;
  return (
    <div className={`a11y ${open ? 'open' : ''}`}>
      {open && (
        <div className="a11y-panel" role="dialog" aria-label="תפריט נגישות">
          <div className="a11y-title">נגישות</div>
          <button aria-pressed={prefs.contrast} onClick={() => update({ contrast: !prefs.contrast })}>◐ ניגודיות גבוהה</button>
          <button aria-pressed={prefs.text > 0} onClick={() => update({ text: ((prefs.text + 1) % 4) as Prefs['text'] })}>
            א+ הגדלת טקסט{prefs.text > 0 && ` (${prefs.text}/3)`}
          </button>
          <button aria-pressed={prefs.calm} onClick={() => update({ calm: !prefs.calm })}>⏸ עצירת אנימציות</button>
          {(prefs.contrast || prefs.text > 0 || prefs.calm) && (
            <button className="a11y-reset" onClick={() => update(DEFAULTS)}>איפוס</button>
          )}
        </div>
      )}
      <button className="a11y-fab" aria-label="תפריט נגישות" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="12" cy="4" r="2" /><path d="M19 9h-5v12h-2v-6h-0v6h-2V9H5V7h14z" /></svg>
      </button>
    </div>
  );
}
