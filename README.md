# DriveAlert

מערכת ווב לניטור ערנות נהגים בזמן אמת. הממשק נבנה עם React ו-Vite, השרת נבנה עם FastAPI ומסד הנתונים הוא MongoDB.

## תכונות

- הרשמה והתחברות באמצעות JWT.
- ספריית מסלולי נהיגה עם סינון, יצירה ומחיקה.
- ניטור פרופיל ערנות באמצעות MediaPipe ובחינת עצימת עיניים.
- רמזים חזותיים וקוליים בעת ירידה בערנות או אי זיהוי פנים.
- מעקב GPS: מהירות, מרחק וזמן נסיעה.
- שמירת דגימות הטלמטריה והצגת היסטוריה ודוחות נסיעה.
- פרופילי ערנות שונים: רגוע, סטנדרטי ובדיקת קשב.

> הערכת הערנות מבוססת PERCLOS ובעצימת עיניים בלבד. היא אינה מדידה ישירה של ריכוז, אינה מאומתת מבחינה קלינית ואינה תחליף למערכות בטיחות מוסמכות.

## ארכיטקטורה

```text
frontend/  React 18 + Vite + MediaPipe + ONNX Runtime
backend/   FastAPI + Motor + Pydantic
MongoDB    משתמשים, מסלולים וסשנים
```

## דרישות מוקדמות

- Docker ו-Docker Compose
- לחלופין לפיתוח מקומי: Node.js 18+, Python 3.11+ ו-MongoDB
- דפדפן מודרני, משלוח HTTPS או localhost, והרשאות מצלמה ומיקום

## הרצה עם Docker Compose

1. צרו קובץ `.env` לפי `.env.example` והגדירו מפתח JWT:

```powershell
Copy-Item .env.example .env
```

ערכו את `JWT_SECRET_KEY` בקובץ `.env`.

2. הפעילו את כל השירותים:

```powershell
docker compose up -d
```

3. פתחו את האפליקציה בכתובת:

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

עצירת השירותים:

```powershell
docker compose down
```

## הרצה לפיתוח מקומי

### MongoDB

```powershell
docker run --name drivealert-mongo -p 27017:27017 -d mongo:latest
```

### Backend

צרו קובץ `backend/.env`:

```dotenv
MONGO_URI=mongodb://localhost:27017/drivealert
DATABASE_NAME=drivealert
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

התקנה והרצה:

```powershell
cd backend
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```powershell
cd frontend
npm install
```

עבור שרת backend מקומי צרו `frontend/.env`:

```dotenv
VITE_BACKEND_URL=http://localhost:8000/api
```

הפעלת Vite:

```powershell
npm run dev
```

האפליקציה תהיה זמינה בדרך כלל בכתובת http://localhost:5173.

## בדיקה ו-build

```powershell
cd frontend
npm run build
```

בדיקת health של השרת:

```powershell
curl http://localhost:8000/health
```

## API

ה-Router הראשי נמצא בכתובת `/api` ומספק, בין היתר:

- `/api/auth/register` ו-`/api/auth/login` - משתמשים ואימות
- `/api/users` - פרופיל וסטטיסטיקות
- `/api/content` - מסלולי נהיגה
- `/api/sessions` - פתיחה, עדכון והיסטוריה של נסיעות
- `/api/sessions/{session_id}/readings` - דגימות טלמטריה בזמן אמת
- `/docs` - תיעוד OpenAPI אינטראקטיבי

## מידע על ניטור הנהג

המערכת משתמשת ב-MediaPipe Face Landmarker ומוציאה פרופילי blendshape לזיהוי עצימת עיניים. הציון מחושב ממספרית PERCLOS גלילה של 30 שניות ואינו נשמר כתמונה או סרטון בשרת. החיבור למצלמה מבקש הסכמה מהמשתמש, וה-GPS והמידע מדגימות מועברים ל-MongoDB יחד עם מזהה הסשן.
