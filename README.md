# ImpactLink MVP

ImpactLink is a real-time coordination platform that connects verified community needs with nearby volunteers.

## Architecture

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: Firebase Firestore (real-time)
- Auth: Firebase Authentication (email and phone OTP)
- Maps: Google Maps JavaScript API + Geocoding API
- Notifications: Firebase Cloud Messaging (FCM)
- OCR: Google Cloud Vision API
- NLP: Google Cloud Natural Language API

## Folder Structure

```
/backend
  /src
    /routes
    /controllers
    /services
    /utils
/frontend
  /src
    /components
    /pages
    /services
    /hooks
```

## 1) Backend Setup (Start Here)

1. Open terminal in `backend`.
2. Install dependencies:
   `npm install`
3. Copy `.env.example` to `.env` and fill values.
4. Run backend:
   `npm run dev`
5. Health check:
   `http://localhost:8080/health`

### Backend Environment

See `backend/.env.example`.

Important variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `GOOGLE_MAPS_API_KEY`
- `ASSIGNMENT_TIMEOUT_MINUTES`

## 2) Frontend Setup

1. Open terminal in `frontend`.
2. Install dependencies:
   `npm install`
3. Copy `.env.example` to `.env` and fill values.
4. Run frontend:
   `npm run dev`
5. Open `http://localhost:5173`

### Frontend Environment

See `frontend/.env.example`.

Important variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_VAPID_KEY`
- `VITE_BACKEND_URL`
- `VITE_GOOGLE_MAPS_API_KEY`

## Firebase Setup Instructions

1. Create a Firebase project.
2. Enable Authentication providers:
   - Email/Password
   - Phone
3. Create Firestore database in production mode.
4. Create collections used by the app:
   - `users`
   - `volunteers`
   - `needs`
5. Generate Web App credentials for frontend `.env`.
6. Generate Service Account key for backend.
7. Enable Cloud Messaging and generate Web Push certificate key (VAPID).

## Google Cloud Setup Instructions

1. In the same GCP project, enable APIs:
   - Cloud Vision API
   - Cloud Natural Language API
   - Geocoding API
   - Maps JavaScript API
2. Ensure backend service account has required roles:
   - Vision AI User
   - Cloud Natural Language API User
3. Restrict maps keys by HTTP referrer (frontend) and IP/backend restrictions where possible.

## Key API Endpoints

- `POST /api/auth/profile`
- `GET /api/auth/me`
- `POST /api/needs`
- `GET /api/needs`
- `POST /api/needs/:needId/accept`
- `POST /api/needs/:needId/complete`
- `POST /api/needs/jobs/reassign-expired`
- `GET /api/needs/metrics/summary`
- `POST /api/volunteers/status`

## Matching Algorithm

Implemented in `backend/src/services/matchingService.js`:

$$
\text{score} =
0.4 \cdot \text{urgencyWeight} +
0.3 \cdot \text{inverseDistance} +
0.2 \cdot \text{skillMatch} +
0.1 \cdot \text{availabilityScore}
$$

Additional ranking:
- Reliability score boost
- Faster response time tie-breaker

## Edge Cases Covered

- Offline-first submit queue for needs (frontend local queue + online flush)
- OCR-assisted extraction with editable form fields
- Assignment timeout and reassignment endpoint
- Duplicate need detection via text similarity + geospatial proximity
- Basic privacy-by-design: minimal profile fields, no unnecessary sensitive data exposure

## Production Notes

- Put `POST /api/needs/jobs/reassign-expired` behind a scheduler (Cloud Scheduler/Cron).
- Add Firestore indexes if prompted by console for composite queries.
- Add stronger role-based authorization checks in middleware for strict multi-tenant use.
- Add rate limiting and audit logging before production rollout.
