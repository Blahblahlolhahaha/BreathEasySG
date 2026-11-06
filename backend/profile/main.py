# Profile API: GET /api/me reads the signed-in user's settings, PUT /api/me saves them.
# Runs on AWS Lambda behind API Gateway (via Mangum) and locally with uvicorn.
import base64
import json
import os
from datetime import datetime, timezone
from decimal import Decimal

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
    """Keeps profiles in a Python dictionary. Used for local testing; everything is lost on restart."""

    def __init__(self):
        self.items = {}

    def get(self, user_id):
        return self.items.get(user_id)

    def create(self, user_id, item):
        """Saves a new row, unless the user already has one."""
        self.items.setdefault(user_id, item)

    def update(self, user_id, changes):
        """Changes only the given fields (a row is created if there is none) and returns the whole row."""
        row = {**self.items.get(user_id, {}), **changes}
        self.items[user_id] = row
        return row


def to_dynamo(value):
    """DynamoDB does not accept Python floats (like latitude 1.35), so turn them into Decimals."""
    return json.loads(json.dumps(value), parse_float=Decimal)


def to_plain(value):
    """The other way round: Decimals from DynamoDB back into normal ints and floats."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {k: to_plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_plain(v) for v in value]
    return value


class DynamoStore:
    """Keeps profiles in a DynamoDB table with one row per user (userId = the Cognito sub).
    The alerts service also writes to this row (alertState), so we never overwrite the whole row."""

    def __init__(self, table_name):
        import boto3

        self.table = boto3.resource("dynamodb").Table(table_name)

    def get(self, user_id):
        item = self.table.get_item(Key={"userId": user_id}).get("Item")
        return to_plain(item) if item else None

    def create(self, user_id, item):
        row = {**item, "userId": user_id, "updatedAt": datetime.now(timezone.utc).isoformat()}
        try:
            self.table.put_item(Item=to_dynamo(row), ConditionExpression="attribute_not_exists(userId)")
        except self.table.meta.client.exceptions.ConditionalCheckFailedException:
            pass  # the row was created a moment ago by another request: keep it

    def update(self, user_id, changes):
        changes = {**changes, "updatedAt": datetime.now(timezone.utc).isoformat()}
        names = {f"#f{i}": key for i, key in enumerate(changes)}
        values = {f":v{i}": to_dynamo(value) for i, value in enumerate(changes.values())}
        sets = ", ".join(f"#f{i} = :v{i}" for i in range(len(changes)))
        result = self.table.update_item(
            Key={"userId": user_id},
            UpdateExpression=f"SET {sets}",
            ExpressionAttributeNames=names,
            ExpressionAttributeValues=values,
            ReturnValues="ALL_NEW",
        )
        return to_plain(result["Attributes"])


# On AWS the template sets TABLE_NAME, so profiles go to DynamoDB. On your computer it is empty, so they stay in memory.
TABLE_NAME = os.environ.get("TABLE_NAME")
store = DynamoStore(TABLE_NAME) if TABLE_NAME else MemoryStore()


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
    email = user.get("email", "")
    saved = store.get(user["sub"])

    if saved is None:
        # First visit: create the user's row now, so the alerts and notifications code can always find it.
        saved = {
            "name": user.get("name", ""),
            "email": email,
            "setupComplete": False,
            "limits": DEFAULT_LIMITS,
            "channels": DEFAULT_CHANNELS,
            "places": [],
        }
        store.create(user["sub"], saved)
    elif email and saved.get("email") != email:
        # A row made without an email (for example demo data): add it, because notifications needs it.
        saved = store.update(user["sub"], {"email": email})

    return build_profile(user, saved)


@app.put("/api/me")
async def update_me(update: ProfileUpdate, request: fastapi.Request):
    user = current_user(request)
    changes = update.model_dump(exclude_none=True)

    ids = [p["id"] for p in changes.get("places", [])]
    if len(ids) != len(set(ids)):
        raise fastapi.HTTPException(status_code=422, detail="Each place needs a different id")

    # Only the fields that were sent are changed. The email is saved too, so notifications can email the user.
    saved = store.update(user["sub"], {**changes, "email": user.get("email", "")})
    return build_profile(user, saved)


handler = Mangum(app)  # AWS Lambda entry point