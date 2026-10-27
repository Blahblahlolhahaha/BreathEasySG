# Integration notes

The frontend runs on mock data for now. If anything here doesn't fit your design, let me (Charvi) know and I'll adapt my section.

## 1. Potential final directory structure

```
BreathEasySG/
├── amplify.yml
├── frontend/
│   ├── .env.example
│   ├── public/
│   │   └── sw.js
│   └── src/
│       ├── api/
│       │   ├── client.js
│       │   ├── readings.js
│       │   ├── profile.js
│       │   ├── location.js
│       │   ├── alerts.js
│       │   └── places.js
│       ├── auth/
│       │   └── AuthContext.jsx
│       ├── notifications/
│       │   └── push.js
│       ├── pages/
│       │   ├── PublicMapPage.jsx
│       │   ├── DashboardPage.jsx
│       │   ├── MapPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── SetupPage.jsx
│       │   ├── ProfilePage.jsx
│       │   └── AlertsPage.jsx
│       ├── components/
│       ├── data/
│       ├── lib/
│       └── theme/
└── backend/
    ├── template.yaml
    ├── readings/
    ├── profile/
    ├── alerts/
    ├── notifications/
    └── eval/
```

## 2. What I implemented (Dashboard)

- App layout: sidebar on desktop, bottom tabs on phones, light/dark theme
- Public haze map page (`/`), no login needed
- Dashboard (`/dashboard`): air near you, 24-hour PSI and PM2.5 charts with the user's threshold, a rough 3-hour estimate, map preview, My places
- "Best time to go out" card: when the air near the user is likely within their thresholds over the next 6 hours (an estimate from the last 6 hours' trend)
- Map page (`/map`): colour map of Singapore, region values, PSI/PM2.5 switch, full screen
- In-app warning banner and pop-up when a location is over the user's threshold, and a "back to normal" pop-up when it drops back under
- Loading, error and empty states; readings refresh every 5 minutes
- `api/client.js`: shared helper for backend calls (adds `VITE_API_URL` and the login token)
- `api/readings.js`: loads readings from `GET /api/readings`, or mock data while `VITE_API_URL` is empty
- `amplify.yml` and `.env.example`

## 3. Placeholders in my part

These are stub files in the frontend that return sample data. Each starts with a `PLACEHOLDER` comment.

**Data Ingestion**
- `src/api/mock/mockReadings.js` → replaced by a real `GET /api/readings` endpoint. Nothing to edit in the frontend; it switches over once `VITE_API_URL` is set. The dashboard reads:

  ```json
  {
    "updatedAt": "2026-10-15T08:00:00+08:00",
    "regions": [{ "id": "north", "name": "North", "lat": 1.41803, "lng": 103.82, "psi24": 61, "pm25": 18 }],
    "history": [{ "time": "2026-10-14T09:00:00+08:00", "psi24": { "north": 55 }, "pm25": { "north": 15 } }]
  }
  ```
  `regions` covers the 5 regions, and `history` is hourly over the last 24 hours, oldest first.

**Auth & Settings**
- `src/auth/AuthContext.jsx` → replace the fake login with Cognito. `useAuth()` returns `{ isAuthenticated, loading, user, signIn, signOut }`; `getIdToken()` returns the login token.
- `src/api/profile.js` → `getMe()` calls `GET /api/me`, which returns (thresholds are called `limits` in the code):

  ```json
  {
    "name": "Charvi", "email": "charvi@example.com", "setupComplete": true,
    "limits": { "psi24": 100, "pm25": 55 },
    "channels": { "push": true, "email": false },
    "places": [{ "id": "home", "label": "Home", "type": "home", "address": "Bishan", "lat": 1.3508, "lng": 103.8485, "regionId": "central" }]
  }
  ```
- `src/pages/LoginPage.jsx` (`/login`, `/signup`) → real log in / sign up page.
- `src/pages/SetupPage.jsx` (`/setup`) → real 3-step setup: saved places, alert thresholds, push / email choice.
- `src/pages/ProfilePage.jsx` (`/profile`) → real profile page.
- `src/pages/AlertsPage.jsx` (`/alerts`) → page for changing saved places, thresholds and push / email later.

**Location & Alerts**
- `src/api/location.js` → `findRegionForCoords({ lat, lng })` returns the user's region id (e.g. `'north'`). Currently always `'east'`.
- `src/api/alerts.js` → `getLimitBreaches({ regionId, placeIds })` returns which locations are over their thresholds:

  ```json
  { "current": [{ "metric": "psi24", "value": 151, "limit": 100 }], "places": { "home": [], "school": [] } }
  ```

**Notifications**
- `src/notifications/push.js` → `registerPush()` turns on push for the browser and returns `true`/`false`.
- `public/sw.js` → the service worker that shows push alerts.

## 4. Not implemented yet

**Data Ingestion**
- `backend/readings/`: `GET /api/readings`, fetching NEA every 15 minutes and caching it (the stub only returns 501)
- On `dev-data-ingestion`: `nearest_region` skips the first region, NEA failures come back as 200, and there's no CORS

**Auth & Settings**
- Cognito setup
- `backend/profile/`: `GET /api/me` and saving settings (stub only returns 501)
- The four pages above

**Location & Alerts**
- `api/places.js`: OneMap place search, used by the setup and alerts pages
- `backend/alerts/`: GPS → region matching, threshold check, alert rules (stub only returns 501)

**Notifications**
- `backend/notifications/`: saving push sign-ups, and sending push and email alerts (stub only returns 501)

**Infra & Evaluation**
- `backend/template.yaml`: API Gateway, Lambdas, DynamoDB, CORS for the Amplify URL and `http://localhost:5173`
- Amplify app: set `AMPLIFY_MONOREPO_APP_ROOT=frontend` and the `VITE_*` env vars, and add a rewrite to `/index.html` (200) so page refreshes work:
  ```
  </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>
  ```
- `backend/eval/`: load tests and system evaluation
