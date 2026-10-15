# BreatheEasySG — frontend

The web app for BreatheEasySG: live haze readings (PSI and PM2.5) for Singapore's five NEA regions, plus a personal dashboard for logged-in users.

Built with React 19 + Vite 6, plain JavaScript and plain CSS. Charts use Recharts; the map uses Leaflet with OneMap tiles.

> **Teammates:** to plug in your section, read **[INTEGRATION.md](INTEGRATION.md)**.

## Status (15 Oct 2026)

The **Dashboard** section is built and runs on **mock data**. Every other section is a clearly marked placeholder.

| Area | Status |
|---|---|
| Public haze map (`/`) | ✅ Done: map, region table, PSI guide, sign-up prompt |
| Dashboard (`/dashboard`) | ✅ Done: air near you, 24-hour trends with a 3-hour estimate, map preview, My places |
| Map page (`/map`) | ✅ Done: full-screen map, PSI/PM2.5 switch, region table |
| App layout | ✅ Done: sidebar on desktop, bottom tabs on phones, light/dark theme |
| In-app warnings | ✅ Done: banner and pop-up when a location is over the user's limit |
| Loading, error and empty states | ✅ Done |
| Real air-quality data | ⏳ Waiting on **Data Ingestion** (`GET /api/readings`) |
| Login and sign up | ⏳ Placeholder: **Auth & Settings** (Cognito) |
| Setup, profile, settings | ⏳ Placeholder: **Auth & Settings** |
| GPS → region, threshold checks | ⏳ Placeholder: **Location & Alerts** |
| Places & alerts page | ⏳ Placeholder: **Auth & Settings** |
| Push and email alerts | ⏳ Placeholder: **Notifications** |
| Hosting on Amplify | ⏳ `amplify.yml` ready; needs **Infra** to set up the Amplify app |

Mock data is used automatically until `VITE_API_URL` is set. While it is on, a **Clear / Moderate / Haze** switch (sidebar, and under the title on the public map) lets you try different situations.

## Run it

```bash
cd frontend
npm install      # first time only
npm run dev      # opens on http://localhost:5173
```

Other commands: `npm run build` (makes the production site in `dist/`), `npm run lint` (checks the code).

To try the signed-in pages: **Log in → Continue → Finish with sample places** (or **Skip for now** to see the empty state). Login is a placeholder, so no password is needed.

## Settings

Copy `.env.example` to `.env.local` and fill in what you have. All settings are optional; with none set, the app runs on mock data.

| Setting | What it does |
|---|---|
| `VITE_API_URL` | Backend address (API Gateway). Setting it switches off mock data. |
| `VITE_USE_MOCK` | `true` keeps mock data on even when `VITE_API_URL` is set. |
| `VITE_REFRESH_MS` | How often readings refresh (default 5 minutes). |
| `VITE_FEEDBACK_URL` | User-testing questionnaire; adds a "Give feedback" link to the sidebar. |

## Where things are

```
frontend/
├── .env.example        every setting the app reads
├── src/
│   ├── pages/          one file per page (login, setup, profile and alerts are stubs)
│   ├── components/     the building blocks (map, charts, cards, banner, ...)
│   ├── data/           shared state: readings, profile, location, limit status
│   ├── api/            talking to the backend (+ mock data in api/mock/)
│   ├── auth/           login session (stub until Cognito is connected)
│   ├── notifications/  push sign-up (stub)
│   ├── lib/            helpers: NEA bands and advice, the trend estimate, map maths, time format
│   ├── theme/          light/dark theme
│   └── index.css       all styles; every colour is a token at the top
└── public/             favicon, service worker (stub)
```

Every file starts with a one-line comment saying what it is for. Stubs for other sections start with `PLACEHOLDER — <section>:` and say what to replace. They're all listed in INTEGRATION.md.

The repo root also has `amplify.yml` (Amplify build settings) and `backend/` (stub endpoints for each section).
