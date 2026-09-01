# מערכת אישורי הגעה לחתונה · אריאל & מירב

שתי מערכות, אתר אחד ב-GitHub Pages, **הכל חינם**:

| קובץ | מה זה | מי נכנס |
|---|---|---|
| `guest.html` | ממשק האורח — תמונת הזמנה, 3 כפתורי אישור הגעה, כפתור Waze | כל אורח (קישור אישי) |
| `admin.html` | דשבורד ניהול — ייבוא אקסל, גרפים, שליחת הזמנות בוואטסאפ | רק את (כניסת Google) |

הנתונים נשמרים ב-**Firebase Firestore** (מסד נתונים חינמי של גוגל).

---

## מבנה הקבצים

```
wedding-rsvp/
├── guest.html          ← ממשק האורח
├── admin.html          ← דשבורד הניהול
├── config.js           ← ⚙️ הקובץ היחיד שצריך לערוך
├── firestore.rules     ← כללי אבטחה (מדביקים ב-Firebase)
├── assets/
│   └── invitation.jpg  ← ⬅️ שימי כאן את תמונת ההזמנה
├── .gitignore
├── README.md
└── legacy/             ← הגרסה הישנה (Google Apps Script) — גיבוי, לא בשימוש
```

---

## שלב 1 — הקמת Firebase (חד-פעמי, ~10 דקות, בלי כרטיס אשראי)

1. כניסה ל-<https://console.firebase.google.com> עם חשבון Google.
2. **Add project** → שם: `wedding-rsvp` → אפשר לכבות Google Analytics → **Create project**.
3. בתפריט צד: **Build → Firestore Database → Create database** →
   בחרי **Start in production mode** → אזור `eur3 (europe-west)` → **Enable**.
4. **Build → Authentication → Get started → Sign-in method → Google → Enable** →
   בחרי אימייל תמיכה → **Save**.
5. **הגדרת האפליקציה:** גלגל שיניים (⚙️) למעלה → **Project settings** →
   גוללים ל-**Your apps** → לוחצים על אייקון **</>** (Web) →
   כינוי: `wedding` → **Register app**.
   מופיע בלוק קוד עם `const firebaseConfig = { ... }` — **את הערכים מתוכו מעתיקים ל-`config.js`** (שלב 3).
6. **כללי אבטחה:** **Firestore Database → Rules** → מוחקים את מה שיש →
   מדביקים את כל התוכן של `firestore.rules` מהריפו → **Publish**.
7. **הרשאת דומיין:** **Authentication → Settings → Authorized domains → Add domain** →
   מוסיפים את הדומיין של GitHub Pages, למשל `TEHILA.github.io`
   (את השם המדויק תדעי אחרי שלב 2 של הפרסום).

---

## שלב 2 — התאמת `config.js`

פותחים את `config.js` וממלאים:

| שדה | מה למלא |
|---|---|
| `invitationImage` | להשאיר `assets/invitation.jpg` אם שמרת את התמונה שם |
| `siteUrl` | כתובת האתר אחרי הפרסום, למשל `https://tehila.github.io/wedding-rsvp` — **בלי / בסוף** |
| `adminEmail` | האימייל של Google שאיתו את נכנסת לדשבורד (רק הוא יורשה) |
| `firebase: { ... }` | הערכים מבלוק `firebaseConfig` משלב 1.5 |
| `couple` / `dateText` / `dateISO` / `venueName` / `venueAddress` / `wazeQuery` | לעדכן אם צריך |

**עדכון תגי התמונה בוואטסאפ:** בקובץ `guest.html`, בראש הקובץ, יש 4 שורות `<meta property="og:...">`.
מחליפים בהן את `https://REPLACE-WITH-YOUR-SITE.github.io/wedding-rsvp` בכתובת האתר האמיתית שלך.
(זה מה שגורם לקישור להיפתח בוואטסאפ ככרטיס עם תמונת ההזמנה.)

---

## שלב 3 — העלאה ל-GitHub והפעלת Pages

### מה להעלות ל-GitHub — כל הקבצים והתיקיות **חוץ מ:**
- ❌ **קובץ האקסל של רשימת האורחים** — לא מעלים! (מכיל טלפונים; ה-`.gitignore` כבר חוסם `*.xlsx/*.xls/*.csv`)
- ❌ `_p.txt` — גיבוי ישן, ה-`.gitignore` חוסם אותו
- ⚠️ תיקיית `legacy/` — אפשר להעלות (גיבוי) או להשאיר במחשב בלבד, לבחירתך

### כלומר מעלים:
```
guest.html
admin.html
config.js
firestore.rules
README.md
.gitignore
assets/  (כולל invitation.jpg ו-README.md)
legacy/  (אופציונלי)
```

> **על `config.js`:** מותר להעלות אותו לגיט למרות שיש בו מפתחות Firebase.
> מפתח Firebase של אתר **אינו סוד** — הוא מזהה פרויקט, לא סיסמה.
> האבטחה נאכפת דרך `firestore.rules` + כניסת Google. (מקור: התיעוד הרשמי של Firebase.)

### צעדים
1. GitHub → **New repository** → שם: `wedding-rsvp` → **Public** → **Create**.
2. **Add file → Upload files** → גוררים את כל הקבצים והתיקיות מהרשימה למעלה → **Commit**.
3. **Settings → Pages** → תחת *Build and deployment*:
   *Source* = **Deploy from a branch**, *Branch* = `main` / `(root)` → **Save**.
4. אחרי דקה-שתיים מופיעה למעלה הכתובת:
   `https://<שם-המשתמש>.github.io/wedding-rsvp/`
5. חוזרים ל-`config.js` + לתגי ה-og ב-`guest.html`, מוודאים ש-`siteUrl` והכתובות נכונים,
   ומעלים שוב (Upload files → Commit) אם שיניתם.
6. חוזרים ל-Firebase → Authentication → Authorized domains → מוסיפים את
   `<שם-המשתמש>.github.io`.

---

## שימוש

### דשבורד — `https://<user>.github.io/wedding-rsvp/admin.html`
1. נכנסים עם Google (החשבון שהוגדר ב-`adminEmail`).
2. **ייבוא אקסל:** גוררים קובץ עם עמודה A = שם, עמודה B = טלפון.
   טלפון בכל פורמט (`050-1234567`, `0501234567`, `+972...`). אורח קיים (לפי טלפון) לא משוכפל.
3. **שליחת הזמנות:**
   - **שלח לכולם** — כל האורחים עם טלפון
   - **שלח לנבחרים** — מסמנים שורות בטבלה
   - **שלח ל"אולי"** — רק מי שסימנו "אולי מגיע"
   - כל שליחה פותחת חלונות WhatsApp עם הודעה מוכנה; לוחצים "שלח" בכל אחד. השורות מסומנות "נשלח".
4. הגרפים והמספרים מתעדכנים **בזמן אמת** ככל שאורחים עונים.

### האורח — `https://<user>.github.io/wedding-rsvp/guest.html?id=XXXX`
- הקישור האישי נוצר אוטומטית והוא חלק מההודעה בוואטסאפ.
- 3 כפתורים: **מגיע** (ירוק) · **אולי מגיע** (חצי-חצי) · **לא מגיע** (אדום) + כפתור **Waze**.
- ב"מגיע" בוחרים כמות מבוגרים וילדים.
- אפשר לחזור לאותו קישור ולעדכן תשובה בכל רגע.

---

## עלויות
| שירות | תוכנית | עלות |
|---|---|---|
| GitHub Pages | ציבורי | 0 ₪ |
| Firebase Firestore | Spark (חינם) | 0 ₪ — עד 50K קריאות / 20K כתיבות ביום. חתונה = כמה מאות. |
| Firebase Auth (Google) | חינם | 0 ₪ |
| Chart.js / SheetJS / פונטים | CDN ציבורי | 0 ₪ |

---

## הגרסה הישנה (`legacy/`)
המערכת הקודמת רצה על Google Apps Script + Google Sheet. הקבצים הועברו ל-`legacy/`
כגיבוי בלבד ואינם בשימוש. **שום דבר לא נמחק.** אם תרצי לחזור אליה — הכל שם.
