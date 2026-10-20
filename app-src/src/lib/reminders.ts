import type { EventSettings, Guest } from './types';

const DAY = 86400000;

export type DueReason = 'no-answer' | 'maybe';

/**
 * The automatic reminder policy. Round one is sent by hand; after that:
 * - "not coming" and "coming" never get another reminder,
 * - "maybe" is reminded once the date the guest was promised arrives (default: a week),
 * - no answer is reminded a week after the last message,
 * - at most `maxReminders` reminders per guest, and none in the last day before the event.
 */
export function reminderReason(g: Guest, s: EventSettings, now = Date.now()): DueReason | null {
  if (!s.remindersOn || !g.phone || g.sentCount === 0) return null;
  if (g.status === 'yes' || g.status === 'no') return null;
  const event = s.eventDate ? Date.parse(s.eventDate) : NaN;
  if (Number.isFinite(event) && now > event - DAY) return null;
  if (g.sentCount - 1 >= s.maxReminders) return null;
  const wait = Math.max(1, s.reminderDays) * DAY;
  const last = g.lastSentAt || 0;
  if (g.status === 'maybe') {
    const due = g.remindOn ?? Math.max(g.respondedAt || 0, last) + wait;
    return now >= due && now - last >= DAY ? 'maybe' : null;
  }
  return now - last >= wait ? 'no-answer' : null;
}

export function dueReminders(guests: Guest[], s: EventSettings, now = Date.now()) {
  return guests.filter((g) => reminderReason(g, s, now));
}

/** When the next reminder for this guest is planned, or null if none will be sent. */
export function nextReminderAt(g: Guest, s: EventSettings): number | null {
  if (!s.remindersOn || !g.phone || g.sentCount === 0 || g.status === 'yes' || g.status === 'no') return null;
  if (g.sentCount - 1 >= s.maxReminders) return null;
  const wait = Math.max(1, s.reminderDays) * DAY;
  const at = g.status === 'maybe' ? g.remindOn ?? Math.max(g.respondedAt || 0, g.lastSentAt || 0) + wait : (g.lastSentAt || 0) + wait;
  const event = s.eventDate ? Date.parse(s.eventDate) : NaN;
  return Number.isFinite(event) && at > event - DAY ? null : at;
}

/** The day-before message to everyone who confirmed (with Waze). */
export function isEveWindow(s: EventSettings, now = Date.now()) {
  const event = s.eventDate ? Date.parse(s.eventDate) : NaN;
  return Number.isFinite(event) && now < event && event - now <= 2 * DAY;
}
