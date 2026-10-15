# PLACEHOLDER — Location & Alerts: checks whether the user's location or saved places are over their limits. Not built yet.
import fastapi

app = fastapi.FastAPI()


# PLACEHOLDER — Location & Alerts: GET /api/alerts/status?regionId=...&placeIds=... (login required). Path is a suggestion.
@app.get("/api/alerts/status")
async def get_alert_status():
    raise fastapi.HTTPException(status_code=501, detail="Not built yet")
