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

## הערות

- **הדפסת קיוסק מהשרת** לא זמינה בענן (Linux). ברירת מחדל: הדפסה בדפדפן.  
- **תוכנית חינמית:** השירות «נרדם» אחרי חוסר פעילות — טעינה ראשונה איטית.  
- **JWT_SECRET** נוצר אוטומטית ב-Blueprint.

## פיתוח מקומי

```bash
npm run setup
npm run dev
```
