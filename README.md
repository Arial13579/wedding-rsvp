# אישורי הגעה · אריאל & מירב

האתר באוויר בכתובת **https://arial13579.github.io/wedding-rsvp/**

| מה | כתובת |
|---|---|
| ניהול (רק `arielkahalani1@gmail.com` ושותפים שהוזמנו) | `/wedding-rsvp/admin.html` |
| דף האורח (קישור אישי לכל מוזמן) | `/wedding-rsvp/guest.html?id=…` |

## צעד חובה אחד: עדכון כללי האבטחה ב־Firebase

1. נכנסים ל־[Firebase Console](https://console.firebase.google.com/project/wedding-rsvp-e2e0f/firestore/rules) ← Firestore Database ← **Rules**.
2. מוחקים את מה שיש ומדביקים את כל התוכן של הקובץ [`firestore.rules`](firestore.rules).
3. לוחצים **Publish**.

עד שזה נעשה, האתר עובד, אבל קישורי השותפים לא יעבדו, וכל חשבון Google שמתחבר יכול לראות את רשימת המוזמנים. הכללים החדשים סוגרים את זה: רק את/ה ושותפים שהוזמנו.

## באייפון

- פותחים את כתובת הניהול ב־Safari ← שיתוף ← **הוספה למסך הבית**.
- בחירת אנשי קשר ישירות מהטלפון: הגדרות ← אפליקציות ← Safari ← מתקדם ← Feature Flags ← **Contact Picker API**. בלי זה אפשר לייבא קובץ של כל אנשי הקשר ולבחור מתוכו.
- באנדרואיד (Chrome) הבחירה מאנשי הקשר עובדת בלי הגדרות.

## עדכון האתר

קוד המקור נמצא ב־[`app-src/`](app-src). אחרי שינוי מריצים בתוכה `npm run publish`, ואז commit ו־push.
