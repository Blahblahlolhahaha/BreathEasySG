# BreatheEasySG

Personal haze alerts for Singapore. BreatheEasySG shows live PSI and PM2.5 readings from NEA and alerts you when the air at the places you care about crosses **your own** threshold, then again when it's back to normal.

Built for NUS CS5224 (Cloud Computing), Group 41.

**Live site:** https://breatheeasysg.d246hw8ikeq45d.amplifyapp.com

## Features

- **Public haze map:** live 24-hour PSI and 1-hour PM2.5 for Singapore's five regions, with a PSI guide. No account needed.
- **Personal thresholds:** set your own PSI and PM2.5 thresholds, or start from a preset (Sensitive, Sports, General).
- **Saved places:** search any address with OneMap and save places like home, school or work, each with optional thresholds of its own.
- **Alerts:** push and email notifications when a place goes over your threshold, and again when it recovers. You're alerted once per change.
- **Dashboard:** air near you, 24-hour trend charts with a 3-hour estimate, and a "best time to go out" card.
- **Map page:** full-screen map with a PSI / PM2.5 switch.
- Works on desktop and phone, in light and dark themes.

## How it works

```
NEA (data.gov.sg) ──► refresher Lambda (every 15 min) ──► DynamoDB
                                                            │
React app (Amplify) ──► API Gateway ──► psi_api · profile · alerts Lambdas
                                                            │
                                     SQS ──► notifications Lambda ──► Web Push / SES email
```

- **Frontend:** React 19 + Vite, Leaflet (OneMap tiles), Recharts. Hosted on AWS Amplify.
- **Backend:** Python FastAPI on AWS Lambda, deployed with AWS SAM.
- **AWS services:** API Gateway, DynamoDB, EventBridge Scheduler, SQS (with a dead-letter queue), SES and Cognito (login).

## Repository layout

```
BreathEasySG/
├── amplify.yml          Amplify build settings
├── frontend/            React app
└── backend/
    ├── refresher/       scheduled job: fetches NEA readings into DynamoDB
    ├── psi_api/         GET /api/readings, POST /api/psi
    ├── users/           users table
    ├── profile/         GET / PUT /api/me (settings and saved places)
    ├── alerts/          POST /api/alerts/check (threshold checks)
    └── notifications/   POST /api/push/subscribe + SQS worker (push and email)
```

## Run the frontend locally

Needs Node.js 20+.

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in the API addresses
npm run dev                  # http://localhost:5173
```

Without `VITE_API_URL` the app runs on built-in sample data, so you can try it without any backend.

Main settings (all listed in `frontend/.env.example`):

| Setting | What it is |
|---|---|
| `VITE_API_URL` | PSI API address (readings) |
| `VITE_PROFILE_API_URL`, `VITE_ALERTS_API_URL`, `VITE_NOTIFICATIONS_API_URL` | Addresses of the other APIs |
| `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REGION` | Cognito login |
| `VITE_VAPID_PUBLIC_KEY` | Public key for push notifications |

Other commands: `npm run build` (production build into `dist/`) and `npm run lint`.

## Deploy the backend

Needs the AWS CLI (region `ap-southeast-1`), AWS SAM CLI and Python 3.12+. Each folder in `backend/` is its own SAM app:

```bash
cd backend/<service>
sam build && sam deploy        # add --guided the first time
```

Deploy in this order: `refresher` and `psi_api` → `users` and `profile` → `alerts` → `notifications`. Set `ALLOWED_ORIGINS` to the frontend's address. For notifications, also verify the SES sender email and set the VAPID keys.

## Deploy the frontend

Connect the repository to AWS Amplify (it picks up `amplify.yml`), add the `VITE_*` settings above as Amplify environment variables, and add a rewrite rule to `/index.html` (200) so page links work on refresh.

