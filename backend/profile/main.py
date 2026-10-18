# Profile API: GET /api/me reads the signed-in user's settings, PUT /api/me saves them.
# Runs on AWS Lambda behind API Gateway (via Mangum) and locally with uvicorn.
import base64
import json
import os

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel, Field

app = fastapi.FastAPI(title="BreathEasySG profile API")

# The website is allowed to call this API from these addresses (comma-separated in ALLOWED_ORIGINS).
origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

DEFAULT_LIMITS = {"psi24": 100, "pm25": 55}  # same defaults as the frontend (src/lib/aq.js)
DEFAULT_CHANNELS = {"push": True, "email": True}


# ---------- What the website is allowed to send us ----------
class Limits(BaseModel):
    psi24: int = Field(gt=0, le=500)
    pm25: int = Field(gt=0, le=500)


class Channels(BaseModel):
    push: bool
    email: bool


class Place(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=60)
    type: str = Field(max_length=20)  # home, school, office, ...
    address: str = Field(default="", max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    regionId: str | None = None
    limits: Limits | None = None  # optional limits for just this place


class ProfileUpdate(BaseModel):
    """Every field is optional: only the fields you send are changed."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    setupComplete: bool | None = None
    limits: Limits | None = None
    channels: Channels | None = None
    places: list[Place] | None = Field(default=None, max_length=20)


# ---------- Where profiles are kept ----------
class MemoryStore:
    """Keeps profiles in a Python dictionary. Fine for local testing; everything is lost on restart.
    Later we replace this with a DynamoDB version that has the same get/put methods."""

    def __init__(self):
        self.items = {}

    def get(self, user_id):
        return self.items.get(user_id)

    def put(self, user_id, item):
        self.items[user_id] = item


store = MemoryStore()


# ---------- Who is calling? ----------
def current_user(request: fastapi.Request) -> dict:
    """Returns the logged-in user's details (sub = their unique id, email, name)."""
    # On AWS, API Gateway checks the Cognito token first and passes the verified details to us.
    event = request.scope.get("aws.event") or {}
    claims = ((event.get("requestContext") or {}).get("authorizer") or {}).get("claims")
    if claims and claims.get("sub"):
        return claims

    # Local testing only (set LOCAL_DEV=1). We read the token WITHOUT checking its signature, so never use this on AWS.
    if os.environ.get("LOCAL_DEV") == "1":
        header = request.headers.get("authorization", "")
        if not header.lower().startswith("bearer "):
            return {"sub": "local-dev-user", "email": "dev@example.com", "name": "Local Dev"}
        try:
            payload = header.split(" ", 1)[1].split(".")[1]
            payload += "=" * (-len(payload) % 4)
            claims = json.loads(base64.urlsafe_b64decode(payload))
            if claims.get("sub"):
                return claims
        except (IndexError, ValueError):
            pass

    raise fastapi.HTTPException(status_code=401, detail="Not logged in")


def build_profile(user: dict, saved: dict | None) -> dict:
    saved = saved or {}
    return {
        "name": saved.get("name") or user.get("name", ""),
        "email": user.get("email", ""),  # always from the login token
        "setupComplete": saved.get("setupComplete", False),
        "limits": saved.get("limits", DEFAULT_LIMITS),
        "channels": saved.get("channels", DEFAULT_CHANNELS),
        "places": saved.get("places", []),
    }


# ---------- The two endpoints ----------
@app.get("/api/me")
async def get_me(request: fastapi.Request):
    user = current_user(request)
    return build_profile(user, store.get(user["sub"]))


@app.put("/api/me")
async def update_me(update: ProfileUpdate, request: fastapi.Request):
    user = current_user(request)
    changes = update.model_dump(exclude_none=True)

    ids = [p["id"] for p in changes.get("places", [])]
    if len(ids) != len(set(ids)):
        raise fastapi.HTTPException(status_code=422, detail="Each place needs a different id")

    saved = {**(store.get(user["sub"]) or {}), **changes}
    store.put(user["sub"], saved)
    return build_profile(user, saved)


handler = Mangum(app)  # AWS Lambda entry point