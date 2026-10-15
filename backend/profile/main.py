# PLACEHOLDER — Auth & Settings: gets and saves the user's profile, limits and saved places. Not built yet.
import fastapi

app = fastapi.FastAPI()


# PLACEHOLDER — Auth & Settings: GET /api/me (login required, Cognito authorizer).
@app.get("/api/me")
async def get_me():
    raise fastapi.HTTPException(status_code=501, detail="Not built yet")


# PLACEHOLDER — Auth & Settings: PUT /api/me to save settings (login required). Path and fields are a suggestion.
@app.put("/api/me")
async def update_me():
    raise fastapi.HTTPException(status_code=501, detail="Not built yet")
