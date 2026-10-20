// Unit tests for the reminder policy: node --experimental-strip-types tests/reminders.test.mjs
import { reminderReason } from '../src/lib/reminders.ts';

const DAY = 86400000;
const now = Date.parse('2026-11-20T10:00:00Z');
const s = { remindersOn: true, reminderDays: 7, maxReminders: 3, eventDate: '2026-12-22T20:00:00+02:00' };
const g = (o) => ({ phone: '972501234567', sentCount: 1, status: 'pending', lastSentAt: now - 8 * DAY, respondedAt: null, remindOn: null, ...o });
let failed = 0;
const t = (label, guest, expected, settings = s, at = now) => {
  const got = reminderReason(guest, settings, at);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${label}: ${got}`);
};
t('no answer, 8 days after first round', g(), 'no-answer');
t('no answer, only 3 days', g({ lastSentAt: now - 3 * DAY }), null);
t('not coming is never reminded', g({ status: 'no' }), null);
t('coming is never reminded', g({ status: 'yes' }), null);
t('round one not sent yet is manual', g({ sentCount: 0 }), null);
t('maybe, promised date reached', g({ status: 'maybe', respondedAt: now - 8 * DAY, remindOn: now - DAY, lastSentAt: now - 10 * DAY }), 'maybe');
t('maybe, promised date not yet', g({ status: 'maybe', respondedAt: now - 2 * DAY, remindOn: now + 5 * DAY }), null);
t('max reminders reached', g({ sentCount: 4 }), null);
t('reminders switched off', g(), null, { ...s, remindersOn: false });
t('no reminders on the last day', g(), null, s, Date.parse('2026-12-22T08:00:00+02:00'));
t('guest without phone', g({ phone: '' }), null);
console.log(failed ? `\n${failed} FAILED` : '\nAll reminder tests passed');
process.exit(failed ? 1 : 0);
