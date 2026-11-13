# Alerts Service

Backend service for checking PSI/PM2.5 threshold breaches against user profiles and saved places.

## Architecture

- **Runtime:** FastAPI + AWS Lambda (via Mangum/SAM)
- **Dependencies:** `profile` (user store/auth), `psi_api` (PSI data provider)
- **Key Logic:** Two-tier breach detection (global limits vs. place-specific overrides)

## Local Development

### Prerequisites

- Python 3.14+ & `uv`
- Mock PSI server running on port 8000

### Run Locally

```powershell
# From backend/ root
$env:PSI_SERVICE_URL="http://localhost:8000/api/psi"; $env:PSI_TABLE_NAME="psi_data"
uv run uvicorn alerts.main:app --reload --port 8001
```
