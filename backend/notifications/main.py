# Notifications API: registers browser push subscriptions.

import os

import fastapi
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel

# cr8 backend API application
app = fastapi.FastAPI(title="BreatheEasySG notifications API")


# configure CORS
origins = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    endpoint: str
    expirationTime: int | None = None
    keys: PushKeys


class MemoryStore:
    """Stores subscriptions in memory for local development."""

    def __init__(self):
        self.items = {}

    def put(self, user_id, subscription):
        # different device, different endpoint. 
        endpoint = subscription["endpoint"]  
        
        self.items[(user_id, endpoint)] = subscription


class DynamoStore:
    """Stores subscriptions in DynamoDB."""

    def __init__(self, table_name):
        import boto3

        self.table = boto3.resource("dynamodb").Table(table_name)

    def put(self, user_id, subscription):
        item = {
            "userID": user_id,
            "endpoint": subscription["endpoint"],
            "p256dh": subscription["keys"]["p256dh"],
            "auth": subscription["keys"]["auth"],
        }

        self.table.put_item(Item=item)


TABLE_NAME = os.environ.get("TABLE_NAME")
store = DynamoStore(TABLE_NAME) if TABLE_NAME else MemoryStore()

# Authentication 
def current_user(request: fastapi.Request) -> dict:
    event = request.scope.get("aws.event") or {}

    claims = (
        ((event.get("requestContext") or {}).get("authorizer") or {})
        .get("claims")
    )

    if claims and claims.get("sub"):
        return claims

    raise fastapi.HTTPException(
        status_code=401,
        detail="Not logged in"
    )


@app.post("/api/push/subscribe")
def save_push_subscription(
    subscription: PushSubscription,
    request: fastapi.Request
):
    user = current_user(request)

    store.put(
        user["sub"],
        subscription.model_dump()  # endpoint, expierationtime, p256dh, auth etc.. 
    )

    return {
        "message": "Push subscription saved"
    }

# lets fastAPI app runs inside aws lambda.
handler = Mangum(app)