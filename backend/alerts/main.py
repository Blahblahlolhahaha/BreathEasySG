import os
from decimal import Decimal
from fastapi.middleware.cors import CORSMiddleware
import json
import boto3
import fastapi
import requests
from mangum import Mangum
from pydantic import BaseModel

app = fastapi.FastAPI()

# configure CORS
origins = [
    origin.strip()
    for origin in os.environ["ALLOWED_ORIGINS"].split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

DEFAULT_LIMITS = {"psi24": 100, "pm25": 55}
METRIC_FIELD = {"psi24": "psi_24", "pm25": "pm25_1"}

class Coords(BaseModel):
    latitude: float
    longitude: float


# ---------- DynamoDB ----------
_ddb = boto3.resource(
    "dynamodb",
    endpoint_url=os.environ.get("DYNAMODB_ENDPOINT") or None,  # empty on real AWS
    region_name=os.environ.get("AWS_REGION", "ap-southeast-1"),
)
_users = _ddb.Table(os.environ["USERS_TABLE_NAME"])

_sqs = boto3.client("sqs")
ALERT_QUEUE_URL = os.environ.get("ALERT_QUEUE_URL")


# ---------- models ----------
class AlertCheck(BaseModel):
    """Request body for checking alerts. Places are read from the DB, not the request."""
    coords: Coords | None = None


class MetricBreach(BaseModel):
    metric: str
    value: float | int
    limit: int


class AlertEvent(BaseModel):
    place_id: str 
    label: str | None = None 
    metric: str
    value: float | int | None = None
    limit: int | None = None


class AlertResponse(BaseModel):
    current: list[MetricBreach] = []
    places: dict[str, list[MetricBreach]] = {}  
    new_alerts: list[AlertEvent] = [] 
    recovered: list[AlertEvent] = []  
    channels: dict[str, bool] = {}  


# ---------- auth ----------
def current_user(request: fastapi.Request) -> dict:
    """Read the signed-in user from the Cognito claims that API Gateway passes in."""
    event = request.scope.get("aws.event", {})
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    user_id = claims.get("sub") or os.environ.get("DEV_USER_ID") 
    if not user_id:
        raise fastapi.HTTPException(status_code=401, detail="Not signed in")
    return {"sub": user_id}


# ---------- helpers ----------
def clean(x):
    """DynamoDB returns numbers as Decimal."""
    if isinstance(x, Decimal):
        return int(x) if x == x.to_integral_value() else float(x)
    return x



def load_alert_state(profile: dict) -> dict[str, bool]:
    return dict(profile.get("alertState") or {})


def save_alert_state(user_id: str, state: dict[str, bool]) -> None:
    _users.update_item(
        Key={"userId": user_id},
        UpdateExpression="SET alertState = :s",
        ConditionExpression="attribute_exists(userId)",
        ExpressionAttributeValues={":s": state},
    )

def fetch_psi_for_coords(coords: Coords) -> dict | None:
    try:
        psi_api = os.environ["PSI_API"]

        response = requests.post(
            psi_api,
            json={
                "latitude": coords.latitude,
                "longitude": coords.longitude,
            },
            timeout=5,
        )

        response.raise_for_status()

        data = response.json()

        if "psi_24" not in data or "pm25_1" not in data:
            print(f"Unexpected PSI response: {data}")
            return None

        return data

    except requests.RequestException as error:
        print(f"Error fetching PSI API: {error}")
        return None

    except ValueError as error:
        print(f"Invalid PSI JSON response: {error}")
        return None


def check_breaches(psi_data: dict, limits) -> list[MetricBreach]:
    """Check if PSI/PM2.5 values exceed the given limits"""
    breaches = []

    if not psi_data or not limits:
        return breaches

    if hasattr(limits, "model_dump"):
        limits_dict = limits.model_dump()
    elif isinstance(limits, dict):
        limits_dict = limits
    else:
        return breaches

    psi_24 = psi_data.get("psi_24")
    pm25_1 = psi_data.get("pm25_1")

    psi_limit = limits_dict.get("psi24", 100)
    pm25_limit = limits_dict.get("pm25", 55)

    if psi_24 is not None and psi_24 > psi_limit:
        breaches.append(MetricBreach(metric="psi24", value=psi_24, limit=psi_limit))

    if pm25_1 is not None and pm25_1 > pm25_limit:
        breaches.append(MetricBreach(metric="pm25", value=pm25_1, limit=pm25_limit))

    return breaches


def diff_state(place_id, label, breaches, psi_data, state, response) -> None:
    """Compare was_over (saved) vs is_over (now) per metric, record events, update state."""
    over_now = {b.metric: b for b in breaches}

    for metric, field in METRIC_FIELD.items():
        key = f"{place_id}:{metric}"
        was_over = state.get(key, False)
        is_over = metric in over_now

        if is_over and not was_over:
            b = over_now[metric]
            response.new_alerts.append(
                AlertEvent(place_id=place_id, label=label, metric=metric,
                           value=b.value, limit=b.limit)
            )
        elif was_over and not is_over:
            response.recovered.append(
                AlertEvent(place_id=place_id, label=label, metric=metric,
                           value=psi_data.get(field))
            )

        state[key] = is_over
        
        
def send_notification_event(
    user_id: str,
    event_type: str,
    alert: AlertEvent,
) -> None:
    """Send an alert state change to the Notifications SQS queue."""

    if not ALERT_QUEUE_URL:
        raise RuntimeError("ALERT_QUEUE_URL is not set")

    message = {
        "userID": user_id,
        "eventType": event_type,
        "metric": alert.metric,
        "value": alert.value,
        "limit": alert.limit,
        "locationName": alert.label or alert.place_id,
    }

    print(f"Sending notification to SQS: {message}")

    result = _sqs.send_message(
        QueueUrl=ALERT_QUEUE_URL,
        MessageBody=json.dumps(message),
    )

    print(f"SQS message sent. MessageId: {result.get('MessageId')}")


# ---------- endpoint ----------
@app.post("/api/alerts/check")
async def check_alerts(alert_check: AlertCheck, request: fastapi.Request):
    """
    Check the user's current location and saved places against their PSI/PM2.5 thresholds.
    Returns what is over the limit now, plus only the changes (new_alerts / recovered).
    """
    user = current_user(request)
    profile = _users.get_item(Key={"userId": user["sub"]}).get("Item")
    if not profile:
        raise fastapi.HTTPException(status_code=404, detail="Profile not found")

    global_limits = {k: clean(v) for k, v in
                     (profile.get("limits") or DEFAULT_LIMITS).items()}
    places = profile.get("places", [])

    state = load_alert_state(profile)
    response = AlertResponse(channels=dict(profile.get("channels", {})))

    # 1. Check current GPS location
    if alert_check.coords:
        psi_data = fetch_psi_for_coords(alert_check.coords)
        if psi_data:  # if fetch failed, leave state untouched
            breaches = check_breaches(psi_data, global_limits)
            response.current = breaches
            diff_state("current", "Current location", breaches, psi_data, state, response)

    # 2. Check each saved place
    psi_by_region: dict[str, dict | None] = {}

    for place in places:
        place_id = place.get("id")
        latitude = place.get("lat")
        longitude = place.get("lng")
        region_id = place.get("regionId")

        if not place_id or latitude is None or longitude is None:
            continue

        cache_key = region_id or f"{latitude},{longitude}"

        if cache_key not in psi_by_region:
            psi_by_region[cache_key] = fetch_psi_for_coords(
                Coords(
                    latitude=float(latitude),
                    longitude=float(longitude),
                )
            )

        psi_data = psi_by_region[cache_key]

        if not psi_data:
            continue

        limits = {
            **global_limits,
            **{
                key: clean(value)
                for key, value in (place.get("limits") or {}).items()
            },
        }

        breaches = check_breaches(psi_data, limits)

        if breaches:
            response.places[place_id] = breaches

        diff_state(
            place_id=place_id,
            label=place.get("label") or place.get("address"),
            breaches=breaches,
            psi_data=psi_data,
            state=state,
            response=response,
        )

    valid = {f"{p['id']}:{m}" for p in places for m in METRIC_FIELD} \
            | {f"current:{m}" for m in METRIC_FIELD}
    state = {k: v for k, v in state.items() if k in valid}
    save_alert_state(user["sub"], state)

    # # Send newly triggered alerts to Notifications
    for alert in response.new_alerts:
        send_notification_event(
            user_id=user["sub"],
            event_type="THRESHOLD_BREACH",
            alert=alert,
        )

    # # Send recovery alerts to Notifications
    for alert in response.recovered:
        send_notification_event(
            user_id=user["sub"],
            event_type="BACK_TO_NORMAL",
            alert=alert,
        )

    return response


# AWS Lambda entry point (template.yaml: Handler: main.handler)
handler = Mangum(app)