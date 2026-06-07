# פריסת MedQueue על Render

## מה קורה בהתקנה אוטומטית

1. `npm install` — שורש + server + web  
2. `npm run build` — בניית React ל-`web/dist`  
3. `npm start` — שרת Node מגיש API + ממשק מאותו פורט  

**דיסק קבוע** (`/var/data`): מסד SQLite, גיבויים, העלאות (לוגו, שקופיות).

## פריסה מהירה

1. דחיפה ל-GitHub: https://github.com/stech-il/MedQueue  
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**  
3. חבר את הריפו — Render קורא את `render.yaml`  
4. אחרי Deploy: `https://<שם-השירות>.onrender.com`

| מסך | נתיב |
|-----|------|
| בית | `/` |
| ניהול | `/manage` |
| קיוסק | `/kiosk` |
| תצוגה | `/display` |

**התחברות ראשונה:** `admin` / `admin123` — החלף סיסמה מיד.

## הדפסה אוטומטית (מדפסת ברירת מחדל)

במחשב הקיוסק (**Windows**), אחרי פריסה ל-Render:

1. הגדירו במערכת → הגדרות → קיוסק: **אוטומטי (מומלץ)**  
2. הריצו (פעם אחת, אפשר קיצור דרך בהפעלה):

```bat
scripts\start-kiosk-render.bat https://YOUR-APP.onrender.com
```

זה פותח **סוכן הדפסה** (PDF ישירות למדפסת ברירת מחדל, ללא חלון) + **Chrome קיוסק** (גיבוי).

או רק סוכן:

```bat
set MEDQUEUE_URL=https://YOUR-APP.onrender.com
npm run kiosk:agent
```

## וואטסאפ + התראות Gmail

ניהול → הגדרות → **וואטסאפ**: סריקת QR (סשן נשמר ב־`/var/data/whatsapp-auth`), הודעות אוטומטיות בקיוסק ובקריאה לחדר.  
התראת מייל כשהחיבור נופל — הגדר Gmail + **סיסמת אפליקציה** (לא סיסמה רגילה).

- דורש **דיסק קבוע** (כבר מוגדר ב־`render.yaml`)
- מומלץ **Starter** ומעלה (Chrome + וואטסאפ צורכים זיכרון)
- ב-Linux (Render) משתמש ב־`@sparticuz/chromium`; ב-build רץ `install:chrome` לגיבוי
- אחרי deploy או «שינה» של השירות — ייתכן שיידרש לסרוק QR שוב

## הערות

- **תוכנית חינמית:** השירות «נרדם» אחרי חוסר פעילות — טעינה ראשונה איטית.  
- **JWT_SECRET** נוצר אוטומטית ב-Blueprint.

## פיתוח מקומי

```bash
npm run setup
npm run dev
```
