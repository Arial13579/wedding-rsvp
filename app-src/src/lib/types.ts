export type Status = 'pending' | 'yes' | 'maybe' | 'no';
export type Diet = '' | 'veg' | 'vegan' | 'gf' | 'other';

export const DIET_LABEL: Record<Exclude<Diet, ''>, string> = {
  veg: 'צמחוני',
  vegan: 'טבעוני',
  gf: 'ללא גלוטן',
  other: 'אחר',
};

export interface Guest {
  id: string;
  name: string;
  phone: string;
  tag: string;
  note: string;
  status: Status;
  adults: number;
  kids: number;
  addedByUid: string;
  addedByName: string;
  sentCount: number;
  createdAt: number | null;
  lastSentAt: number | null;
  respondedAt: number | null;
  /** Date the guest asked to be reminded (set when answering "maybe") */
  remindOn: number | null;
  diet: Diet;
  /** Blessing the guest left for the couple */
  message: string;
  table: string;
  gift: number;
  /** The guest actually arrived (event-day check-in) */
  arrived: boolean;
}

export interface EventSettings {
  coupleNames: string;
  headline: string;
  eventDate: string; // ISO string
  receptionTime: string;
  chuppahTime: string;
  venueName: string;
  venueAddress: string;
  wazeUrl: string;
  extraText: string;
  inviteTemplate: string;
  reminderTemplate: string;
  thanksTemplate: string;
  eveTemplate: string;
  invitationVersion: number;
  /** Automatic reminder policy */
  remindersOn: boolean;
  reminderDays: number;
  maxReminders: number;
}

export const DEFAULT_SETTINGS: EventSettings = {
  coupleNames: 'אריאל & מירב',
  headline: 'מתחתנים!',
  eventDate: '2026-12-22T20:00:00+02:00',
  receptionTime: '20:00',
  chuppahTime: '',
  venueName: 'אולמי אלגריה',
  venueAddress: 'המלך חסן השני 12, קרית עקרון',
  wazeUrl: '',
  extraText: 'נשמח לראותכם שותפים לשמחתנו',
  inviteTemplate:
    'היי {name} 💛\nשמחים להזמין אותך לחתונה של {couple} ב־{date} ב{venue}.\nלצפייה בהזמנה ולאישור הגעה:\n{link}',
  reminderTemplate:
    'היי {name}, תזכורת קטנה 🙏\nנשמח לדעת אם תגיעו לחתונה של {couple} ב־{date}.\nלאישור הגעה בלחיצה:\n{link}',
  thanksTemplate:
    'תודה רבה {name} שהגעתם לחגוג איתנו את החתונה של {couple} 🤍\nהיה לנו כל כך משמעותי שהייתם שם איתנו.',
  eveTemplate:
    'היי {name} 🥂\nמחכים לראותך מחר בחתונה של {couple} ב{venue}!\nניווט: {waze}',
  invitationVersion: 0,
  remindersOn: true,
  reminderDays: 7,
  maxReminders: 3,
};

export const STATUS_META: Record<Status, { label: string; short: string; color: string; ink: string }> = {
  yes: { label: 'מגיעים', short: 'מגיע/ה', color: 'var(--yes)', ink: 'var(--yes-ink)' },
  maybe: { label: 'מתלבטים', short: 'מתלבט/ת', color: 'var(--maybe)', ink: 'var(--maybe-ink)' },
  no: { label: 'לא מגיעים', short: 'לא מגיע/ה', color: 'var(--no)', ink: 'var(--no-ink)' },
  pending: { label: 'טרם ענו', short: 'טרם ענה', color: 'var(--pending)', ink: 'var(--pending-ink)' },
};

export const STATUS_ORDER: Status[] = ['yes', 'maybe', 'no', 'pending'];
