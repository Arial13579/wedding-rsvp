# app-src — קוד המקור של אתר אישורי ההגעה

Next.js (ייצוא סטטי) + Firebase. האתר עצמו נבנה לשורש הריפו ומוגש ב־GitHub Pages.

```bash
npm install
npm run publish        # בונה ומעתיק את האתר לשורש הריפו, ואז commit + push
```

פיתוח ובדיקות מול האמולטור המקומי:

```bash
npm run emulators      # טרמינל נפרד
npm run test:rules     # בדיקות כללי האבטחה
NEXT_PUBLIC_USE_EMULATOR=1 NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-wedding npm run dev
```

- `src/lib/config.ts` — אימייל המנהל, כתובת האתר והגדרות Firebase.
- `src/lib/types.ts` — פרטי ברירת המחדל של האירוע ונוסחי ההודעות (ניתנים לעריכה גם במסך ההגדרות).
- `firestore.rules` — כללי האבטחה. אחרי שינוי מדביקים אותם ב־Firebase Console ← Firestore ← Rules.
- `public/` — תמונת ההזמנה, כרטיס התצוגה המקדימה בוואטסאפ (`og-card.jpg`), קובץ היומן ודפי המידע.
