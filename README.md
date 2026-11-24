# DriveAlert — Real-Time Driver Attention Monitoring System

> **Live Demo:** [https://drivealert-frontend-43588904687.europe-north1.run.app](https://drivealert-frontend-43588904687.europe-north1.run.app)
>
> **Built by:** Shiri Katz & Rina Kimmel

---

## Overview

DriveAlert is a full-stack web application that monitors driver alertness in real time using computer vision running entirely in the browser. While a driver navigates a route, the system uses the front-facing camera to detect facial landmarks, measure eye closure, and compute a continuous alertness score using the PERCLOS method. When the score drops below a configurable danger threshold — or when the driver's face leaves the frame entirely — the system fires both a visual alert banner and an audio alarm.

All video analysis runs locally on the user's device using WebAssembly. No video frames are ever transmitted to any server.

---

## Key Features

| Feature | Description |
|---|---|
| **Real-time face detection** | MediaPipe FaceLandmarker detects 468 facial landmarks per frame at ~10 inferences/sec |
| **PERCLOS alertness scoring** | Eye-blink blendshapes compute the percentage of time eyes are closed over a rolling 30-second window |
| **Drowsiness detection** | Triggers an alarm on sustained eye closure (≥1.5 s) or low PERCLOS score |
| **GPS telemetry** | Live speed, position, and accumulated distance via the browser Geolocation API (Haversine formula) |
| **Drive session tracking** | Every second of a drive is recorded as a telemetry reading and synced to the backend |
| **Attention profiles** | Three configurable sensitivity levels — relaxed, standard, and high — each with a different alert threshold |
| **Drive history & reports** | Per-session timeline chart showing alertness score over the full duration of the drive |
| **User accounts** | Secure registration and login with JWT authentication and bcrypt password hashing |
| **Route library** | Personal and shared default driving routes with category and difficulty filters |
| **Full containerization** | Docker Compose for local development; CI/CD via Google Cloud Build to Cloud Run |

---

## Computer Vision Pipeline

This is the technical core of the project. The entire pipeline runs in the browser with zero server-side vision processing.

```
Camera Stream (640×480)
        │
        ▼
  MediaPipe FaceLandmarker (WASM)
  ┌─────────────────────────────┐
  │  468 face landmarks          │
  │  52 blendshape coefficients  │
  │  GPU delegate → CPU fallback │
  └─────────────────────────────┘
        │
        ▼
  Eye Closure Measurement
  ┌──────────────────────────────────────────┐
  │  eyeBlinkLeft + eyeBlinkRight blendshapes │
  │  Threshold: closure ≥ 0.5                 │
  └──────────────────────────────────────────┘
        │
        ▼
  PERCLOS Score (rolling 30-second window)
  ┌──────────────────────────────────────────────────┐
  │  score = closed_samples / total_samples           │
  │  1.0 = fully alert  |  0.0 = eyes always closed  │
  └──────────────────────────────────────────────────┘
        │
        ▼
  Alert Logic
  ┌────────────────────────────────────────────────────────┐
  │  score < threshold  →  low alertness alarm              │
  │  sustained closure ≥ 1500 ms  →  drowsiness alarm      │
  │  face missing for ≥ 750 ms  →  face-away alarm          │
  └────────────────────────────────────────────────────────┘
        │
        ▼
  HUD + Alert Banner + Audio Alarm
```

### Why browser-side inference?

Running the model on the client eliminates camera privacy concerns entirely — the raw pixel data never leaves the device. It also removes any inference latency introduced by a network round-trip and allows the system to work in areas with poor connectivity.

### GPU → CPU fallback

The face landmarker is first initialized with the GPU delegate (WebGL). If the hardware or browser does not support it, the system automatically retries with the CPU delegate. Users are never shown a failure — the transition is transparent.

---

## Technology Stack

### Frontend

| Technology | Role |
|---|---|
| **React 18** | Component-based UI |
| **Vite 5** | Build tool and dev server |
| **React Router v6** | Client-side routing |
| **MediaPipe Tasks-Vision 1.2.2** | Face landmark detection (WASM, GPU/CPU) |
| **ONNX Runtime Web 1.17.1** | ONNX model inference in the browser |
| **Lucide React** | Icon library |
| **Axios** | HTTP client for backend API calls |
| **CSS custom properties** | Design tokens for theming |

### Backend

| Technology | Role |
|---|---|
| **FastAPI** | Async REST API framework |
| **Uvicorn** | ASGI server |
| **Motor + PyMongo** | Async MongoDB driver |
| **Pydantic v2** | Request/response validation and settings |
| **python-jose** | JWT token creation and verification |
| **passlib + bcrypt** | Password hashing |
| **Python 3.11** | Runtime |

### Infrastructure

| Technology | Role |
|---|---|
| **MongoDB** | Primary database (sessions, users, routes) |
| **Docker + Docker Compose** | Local containerized development |
| **Google Cloud Build** | CI/CD pipeline (commit-triggered builds) |
| **Google Artifact Registry** | Docker image storage (europe-north1) |
| **Google Cloud Run** | Serverless container deployment |
| **Nginx** | Static file serving and API reverse proxy inside the frontend container |

---

## Architecture

```
┌───────────────────────────────────────────────────┐
│                   Browser (React)                  │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │          Computer Vision Pipeline           │   │
│  │  Camera → MediaPipe FaceLandmarker (WASM)  │   │
│  │       → PERCLOS Score → Alert Logic        │   │
│  └────────────────────────────────────────────┘   │
│                        │                           │
│              REST API (Axios)                      │
└───────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────┐
│          FastAPI Backend (Python)        │
│                                         │
│  /api/auth     → Register / Login / Me  │
│  /api/sessions → Drive session CRUD     │
│  /api/content  → Route library CRUD     │
│  /api/users    → Profile & stats        │
└──────────────────────────┬──────────────┘
                           │
                           ▼
               ┌──────────────────────┐
               │   MongoDB Database    │
               │  users / sessions /  │
               │  content collections │
               └──────────────────────┘
```

---

## Project Structure

```
assignment3/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic settings (env-driven)
│   │   │   ├── deps.py           # Auth dependency injection
│   │   │   └── security.py       # JWT + bcrypt utilities
│   │   ├── db/
│   │   │   └── database.py       # Async MongoDB connection
│   │   ├── models/
│   │   │   ├── user.py           # User Pydantic schemas
│   │   │   ├── drive_session.py  # Session + DriveReading schemas
│   │   │   └── route.py          # Driving route schemas
│   │   ├── routers/
│   │   │   ├── auth.py           # Register, login, logout, /me
│   │   │   ├── sessions.py       # Session lifecycle + telemetry
│   │   │   ├── content.py        # Route library management
│   │   │   └── users.py          # Profile and stats
│   │   └── main.py               # FastAPI app, CORS, lifespan
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── hooks/
│   │   │   ├── useFaceDetection.js    # MediaPipe + PERCLOS core
│   │   │   ├── useDriverMonitor.js    # Camera + alarm orchestration
│   │   │   ├── useAttentionModel.js   # Profile-aware attention wrapper
│   │   │   └── useCamera.js           # Raw camera stream management
│   │   ├── pages/
│   │   │   ├── DriveView.jsx     # Main drive HUD with live telemetry
│   │   │   ├── Dashboard.jsx     # Route library
│   │   │   ├── History.jsx       # Session history + timeline chart
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── components/
│   │   │   ├── GaugeMeter.jsx    # SVG semi-circle alertness gauge
│   │   │   └── AlertBanner.jsx   # Critical warning overlay
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global auth state
│   │   └── services/
│   │       └── api.js            # Typed API service layer
│   ├── Dockerfile                # Multi-stage: Node build → Nginx serve
│   └── nginx.conf                # Reverse proxy to backend
│
├── docker-compose.yml            # Three-service local stack
├── cloudbuild-backend.yaml       # GCP CI/CD pipeline — backend
├── cloudbuild-frontend.yaml      # GCP CI/CD pipeline — frontend
└── .env.example                  # Environment variable template
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### Local Setup with Docker Compose

**1. Clone the repository**

```bash
git clone <repository-url>
cd assignment3
```

**2. Configure environment variables**

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
JWT_SECRET_KEY=your-secret-key-here-minimum-32-characters
MONGO_URI=mongodb://mongo:27017/drivealert
DATABASE_NAME=drivealert
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**3. Pull and start all services**

```bash
docker compose up -d
```

This starts three containers:

| Container | Port | Description |
|---|---|---|
| `drivealert-mongo` | 27017 | MongoDB database |
| `drivealert-backend` | 8000 | FastAPI REST API |
| `drivealert-frontend` | 3000 | React app served by Nginx |

**4. Open the application**

Navigate to [http://localhost:3000](http://localhost:3000) in a browser that has camera access.

The API documentation (Swagger UI) is available at [http://localhost:8000/docs](http://localhost:8000/docs).

**5. Stop the stack**

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

### Local Frontend Development (without Docker)

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on [http://localhost:5173](http://localhost:5173). Set `VITE_BACKEND_URL=http://localhost:8000/api` in a `.env` file inside the `frontend/` directory.

---

### Local Backend Development (without Docker)

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Requires a running MongoDB instance and a `.env` file at the project root.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET_KEY` | Yes | — | Secret used to sign JWT tokens |
| `MONGO_URI` | Yes | — | MongoDB connection string |
| `DATABASE_NAME` | No | `drivealert` | MongoDB database name |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | Token lifetime (24 hours) |
| `CORS_ORIGINS` | No | localhost origins | Comma-separated allowed origins |
| `FRONTEND_PORT` | No | `3000` | Host port for the frontend container |
| `BACKEND_PORT` | No | `8000` | Host port for the backend container |
| `VITE_BACKEND_URL` | No | — | Frontend API base URL (dev only) |

---

## API Reference

All endpoints are prefixed with `/api`. Authentication uses Bearer tokens in the `Authorization` header.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user, returns JWT |
| `POST` | `/api/auth/login` | No | Login with username or email |
| `POST` | `/api/auth/logout` | Yes | Invalidate session (client-side token drop) |
| `GET` | `/api/auth/me` | Yes | Get current user profile |

### Drive Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/sessions` | Yes | Open a new drive session |
| `GET` | `/api/sessions` | Yes | List the user's sessions |
| `GET` | `/api/sessions/{id}` | Yes | Get full session detail with readings |
| `PUT` | `/api/sessions/{id}` | Yes | Update or finalize a session |
| `POST` | `/api/sessions/{id}/readings` | Yes | Append live telemetry readings |

### Content (Driving Routes)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/content` | Yes | List available routes |
| `GET` | `/api/content/{id}` | Yes | Get a single route |
| `POST` | `/api/content` | Yes | Create a custom route |
| `DELETE` | `/api/content/{id}` | Yes | Delete a user-owned route |

---

## CI/CD Pipeline

The project uses Google Cloud Build with two separate pipeline files triggered on commits to the main branch.

```
Git Push
    │
    ├─► cloudbuild-backend.yaml
    │       1. docker build backend/
    │       2. docker push  → Artifact Registry (europe-north1)
    │       3. gcloud run deploy drivealert-backend
    │
    └─► cloudbuild-frontend.yaml
            1. docker build frontend/
            2. docker push  → Artifact Registry (europe-north1)
            3. gcloud run deploy drivealert-frontend
```

Both services are deployed to Cloud Run in `europe-north1` (Finland) as fully managed, auto-scaling containers. Each deployment is tagged with the commit SHA for traceability.

---

## Alertness Profiles

Three sensitivity presets are available, selectable per session before each drive:

| Profile | Alert Threshold | Use Case |
|---|---|---|
| **Relaxed** | 25% | Long-haul drivers, lower false-positive rate |
| **Standard** | 40% | Default — balanced sensitivity |
| **High** | 60% | Maximum sensitivity, urban or night driving |

---

## Security

- Passwords are hashed with bcrypt before storage; plaintext passwords never reach the database.
- JWTs are signed with a configurable secret key and expire after 24 hours by default.
- Every session and content endpoint enforces strict user separation — a user can only access their own data.
- CORS is configured to allow only explicitly listed origins.
- All camera frames are processed locally by WASM; zero pixel data is sent to any server.

---

## Browser Requirements

| Requirement | Reason |
|---|---|
| **HTTPS or localhost** | Required for `getUserMedia` camera access |
| **Camera permission** | Face detection requires the front-facing camera |
| **WebAssembly support** | MediaPipe Tasks-Vision runs as a WASM module |
| **WebGL (optional)** | Enables GPU-accelerated inference; CPU fallback is automatic |
| Modern Chrome / Edge / Firefox / Safari | Full WebAssembly + MediaPipe support |

---

## Limitations and Disclaimers

- The alertness score is a **proxy metric** based on PERCLOS (percentage eye closure). It is not a direct measure of cognitive focus or reaction time.
- The system does not detect all forms of distraction — only those that cause eye closure or face-away events detectable by the front camera.
- DriveAlert is a **research and demonstration project** and is not a certified road safety system. It should not be used as a substitute for professional driver monitoring equipment.
- GPS accuracy depends on the device hardware and browser permission; speed readings may fluctuate or be unavailable on desktop hardware without GPS.

---

*DriveAlert was developed as part of a full-stack development bootcamp assignment.*
