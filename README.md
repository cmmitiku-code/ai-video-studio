# תנועה · סטודיו וידאו AI

אפליקציית Next.js 15 ליצירת סרטוני AI בסגנון Kling: הרשמה עם Supabase, יצירת וידאו מטקסט או מתמונה דרך fal.ai, גלריה ציבורית בגריד מסונרי, מערכת קרדיטים ותשלום ב-Stripe. כל הממשק בעברית ו-RTL.

## מה יש בפנים

| עמוד | מה הוא עושה |
|---|---|
| `/` | גלריית הקהילה – גריד מסונרי, ניגון ב-hover (ובמובייל כשהסרטון במרכז המסך), חלון פרטים עם "צרו עם הפרומפט הזה", גלילה אינסופית |
| `/login` | הרשמה / התחברות באימייל וסיסמה או Google. 20 קרדיטים מתנה בהרשמה |
| `/create` | טופס יצירה: טקסט←וידאו / תמונה←וידאו, בחירת מודל, משך, יחס, אודיו, פרומפט שלילי, ציבורי/פרטי. מחיר בקרדיטים מחושב בזמן אמת. בצד – היצירות האחרונות שמתעדכנות לבד |
| `/my` | כל הסרטונים שלך: סטטוס חי, הורדה, ציבורי/פרטי, מחיקה, ניסיון חוזר |
| `/pricing` | חבילות קרדיטים ב-Stripe Checkout (בשקלים) + טבלת עלויות לפי מודל |

**איך הקרדיטים עובדים:** הקרדיטים יורדים בטרנזקציה אחת יחד עם יצירת רשומת הסרטון (פונקציית SQL `start_generation`), כך שאי אפשר לרדת מתחת לאפס גם בלחיצות כפולות. אם היצירה נכשלת – `fail_video` מחזירה אותם פעם אחת בלבד. רכישה ב-Stripe מזכה דרך `add_purchase_credits`, שמוגנת מכפילויות לפי מזהה הסשן. כל תנועה נרשמת ב-`credit_transactions`.

**איך מתעדכן סטטוס הסרטון:** הבקשה נשלחת לתור של fal. בפרודקשן (כתובת https) fal קורא ל-`/api/fal/webhook` בסיום. בנוסף, הדפדפן בודק כל 6 שניות את `/api/videos/[id]`, שבודק מול fal ישירות – כך שזה עובד גם ב-localhost בלי webhook.

## התקנה

### 1. Supabase
1. צרו פרויקט ב-[supabase.com](https://supabase.com).
2. **SQL Editor** ← הדביקו את כל התוכן של `supabase/schema.sql` ← Run. זה יוצר טבלאות, RLS, פונקציות קרדיטים ו-bucket בשם `inputs` לתמונות.
3. **Authentication → URL Configuration**: הגדירו Site URL (למשל `http://localhost:3000`) והוסיפו ל-Redirect URLs את `http://localhost:3000/auth/callback` (ואת הדומיין שלכם בפרודקשן).
4. (אופציונלי) **Authentication → Providers → Google** – להתחברות עם Google.
5. העתיקו מ-**Project Settings → API** את ה-URL, ה-anon key וה-service_role key.

### 2. fal.ai
צרו מפתח ב-[fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) והטעינו יתרה בחשבון.

### 3. Stripe
1. **Developers → API keys** – העתיקו את ה-Secret key.
2. **Developers → Webhooks → Add endpoint**: הכתובת `https://your-domain.com/api/stripe/webhook`, אירועים: `checkout.session.completed` ו-`checkout.session.async_payment_succeeded`. העתיקו את ה-Signing secret.
3. לבדיקה מקומית:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   ה-`whsec_...` שהפקודה מדפיסה הוא ה-`STRIPE_WEBHOOK_SECRET` לפיתוח. כרטיס בדיקה: `4242 4242 4242 4242`.

### 4. הרצה
```bash
cp .env.example .env.local   # ומלאו את הערכים
npm install
npm run dev
```
פתחו את http://localhost:3000

### 5. העלאה ל-Vercel
ייבאו את הריפו ב-Vercel, הוסיפו את כל משתני הסביבה מ-`.env.example`, והגדירו `NEXT_PUBLIC_APP_URL` לכתובת ה-https של האתר (זה מה שמפעיל את ה-webhook של fal). עדכנו את ה-Redirect URLs ב-Supabase ואת ה-webhook ב-Stripe לדומיין החדש.

## התאמות נפוצות

- **מודלים ומחירים בקרדיטים** – `lib/models.ts`. אפשר להוסיף כל מודל וידאו מ-fal (Veo, Seedance, MiniMax…) – רק endpoint ושם שדה התמונה.
- **חבילות ומחירים בשקלים** – `lib/credits.ts`.
- **כמות קרדיטים מתנה בהרשמה** – המשתנה `v_free` בפונקציה `handle_new_user` ב-`schema.sql`.
- **צבעים ופונט** – `app/globals.css` (בלוק `@theme`).
- **זיכוי ידני למשתמש** (מה-SQL Editor):
  ```sql
  update profiles set credits = credits + 100 where id = '<user-id>';
  insert into credit_transactions (user_id, amount, reason) values ('<user-id>', 100, 'admin');
  ```

## לפני השקה אמיתית – מומלץ להוסיף

- **שמירת הסרטונים אצלכם** – קבצי fal מאוחסנים אצלם; לשמירה לטווח ארוך העתיקו אותם ל-Supabase Storage ב-`markCompleted` (`lib/sync.ts`).
- **הגבלת קצב** על `/api/generate` (למשל Upstash Ratelimit).
- **סינון תוכן** לפרומפטים ולגלריה הציבורית, וכפתור דיווח.
- **בדיקת עלויות** – ודאו שהמחיר בקרדיטים מכסה את מחיר fal לשנייה + עמלת Stripe.

## מבנה הפרויקט
```
app/
  page.tsx                  גלריה
  create/ my/ pricing/ login/
  auth/callback  auth/signout
  api/generate              חיוב קרדיטים + שליחה ל-fal
  api/videos/[id]           סטטוס / ציבורי-פרטי / מחיקה
  api/feed                  עמודים נוספים לגלריה
  api/fal/webhook           תוצאה מ-fal
  api/stripe/checkout       פתיחת תשלום
  api/stripe/webhook        זיכוי קרדיטים
components/                 Navbar, FeedGrid, VideoCard, VideoModal, CreateForm, MyVideos…
lib/                        models, credits, supabase, fal, stripe, sync
supabase/schema.sql         כל הסכמה
middleware.ts               רענון סשן + הגנה על /create ו-/my
```
