# PLACEHOLDER — Notifications: saves a browser's push sign-up and sends push and email alerts. Not built yet.
import fastapi

app = fastapi.FastAPI()


# PLACEHOLDER — Notifications: POST /api/push/subscribe (login required). Path is a suggestion.
@app.post("/api/push/subscribe")
async def save_push_subscription():
    raise fastapi.HTTPException(status_code=501, detail="Not built yet")
