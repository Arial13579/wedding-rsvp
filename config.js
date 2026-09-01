/* ═══════════════════════════════════════════════════════════════════════
 *  הגדרות האירוע — הקובץ היחיד שצריך לערוך
 *  ───────────────────────────────────────────────────────────────────────
 *  שני האתרים (admin.html + guest.html) קוראים מכאן.
 *  בטוח להעלות את הקובץ הזה ל-GitHub — אין כאן סודות.
 * ═══════════════════════════════════════════════════════════════════════ */

window.APP_CONFIG = {

  /* ---- טקסטים של האירוע ---- */
  couple:       'אריאל & מירב',
  dateText:     '22.12.2026',
  dateISO:      '2026-12-22T19:30:00+02:00',   // לספירה לאחור (תאריך + שעה)
  venueName:    'אולמי אלגריה',
  venueAddress: 'המלך חסן השני 12, קרית עקרון',

  /* ---- תמונת ההזמנה ----
   * קובץ בתיקיית assets/ (מומלץ), או קישור מלא לתמונה.
   */
  invitationImage: 'invitation.jpg',

  /* ---- ניווט ל-Waze ----
   * חיפוש חופשי — Waze מוצא לפי שם + כתובת.
   */
  wazeQuery: 'אולמי אלגריה, המלך חסן השני 12, קרית עקרון',

  /* ---- כתובת האתר אחרי פרסום ב-GitHub Pages (בלי / בסוף) ----
   * דוגמה: 'https://tehila.github.io/wedding-rsvp'
   * נחוץ לבניית הקישורים האישיים שנשלחים בוואטסאפ.
   */
  siteUrl: 'https://arial13579.github.io/wedding-rsvp',

  /* ---- אימייל הגוגל שמורשה להיכנס לדשבורד הניהול ---- */
  adminEmail: 'arielkahalani1@gmail.com',

  /* ---- מספר ימים עד תזכורת חוזרת למי שסימן "אולי" ---- */
  reminderDays: 7,

  /* ═══ Firebase ═══
   * מדביקים כאן את האובייקט מ-Firebase Console:
   * Project settings ▸ Your apps ▸ SDK setup and configuration ▸ Config
   * (לא סוד — מותר בגיט. האבטחה דרך firestore.rules + כניסת גוגל.)
   */
  firebase: {
    apiKey:            'AIzaSyCuC0SP-l3WSrZ57LdMbiEI15DwK8d1aQ4',
    authDomain:        'wedding-rsvp-e2e0f.firebaseapp.com',
    projectId:         'wedding-rsvp-e2e0f',
    storageBucket:     'wedding-rsvp-e2e0f.firebasestorage.app',
    messagingSenderId: '169119650995',
    appId:             '1:169119650995:web:4260a21d1e5a3312054cc6'
  }
};
