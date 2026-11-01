# Notifications API: registers browser push subscriptions.

import os
import base64
import json
import fastapi
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from boto3.dynamodb.conditions import Key
from pywebpush import webpush
from dotenv import load_dotenv

load_dotenv()

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
        endpoint = subscription["endpoint"]
        self.items[(user_id, endpoint)] = subscription

    def get_by_user(self, user_id):
        return [
            subscription
            for (stored_user_id, _), subscription in self.items.items()
            if stored_user_id == user_id
        ]


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

    def get_by_user(self, user_id):
        response = self.table.query(
            KeyConditionExpression=Key("userID").eq(user_id)
        )

        return [
            {
                "endpoint": item["endpoint"],
                "keys": {
                    "p256dh": item["p256dh"],
                    "auth": item["auth"],
                },
            }
            for item in response.get("Items", [])
        ]

TABLE_NAME = os.environ.get("TABLE_NAME")
store = DynamoStore(TABLE_NAME) if TABLE_NAME else MemoryStore()

def send_push(subscription, title, body):
    vapid_private_key = os.environ.get("VITE_VAPID_PRIVATE_KEY")

    if not vapid_private_key:
        raise RuntimeError("VAPID_PRIVATE_KEY is not set")

    payload = json.dumps({
        "title": title,
        "body": body,
    })

    webpush(
        subscription_info=subscription,
        data=payload,
        vapid_private_key=vapid_private_key,
        vapid_claims={
        "sub": os.environ.get(
            "VAPID_SUBJECT",
            "mailto:breatheasysg@example.com"
        )
        },
    )

# Authentication 
def current_user(request: fastapi.Request) -> dict:
    """Returns the logged-in user's Cognito claims."""

    # On AWS, API Gateway validates the Cognito token
    # and passes the verified claims to us.
    event = request.scope.get("aws.event") or {}

    claims = (
        ((event.get("requestContext") or {}).get("authorizer") or {})
        .get("claims")
    )

    if claims and claims.get("sub"):
        return claims

    # Local testing only.
    # Decode the Cognito token sent by the frontend.
    if os.environ.get("LOCAL_DEV") == "1":
        header = request.headers.get("authorization", "")

        if header.lower().startswith("bearer "):
            try:
                payload = header.split(" ", 1)[1].split(".")[1]
                payload += "=" * (-len(payload) % 4)

                claims = json.loads(
                    base64.urlsafe_b64decode(payload)
                )

                if claims.get("sub"):
                    return claims

            except (IndexError, ValueError):
                pass

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

    # either memorystore for local or dynamostore once deployed.
    store.put(
        user["sub"],
        subscription.model_dump()  # endpoint, expierationtime, p256dh, auth etc.. 
    )

    return {
        "message": "Push subscription saved"
    }

class PushMessage(BaseModel):
    title: str
    body: str


@app.post("/api/push/test")   # temporary only.. for test push. 
def test_push(
    message: PushMessage,
    request: fastapi.Request
):
    user = current_user(request)

    subscriptions = store.get_by_user(user["sub"])

    if not subscriptions:
        raise fastapi.HTTPException(
            status_code=404,
            detail="No push subscriptions found"
        )

    for subscription in subscriptions:
        send_push(
            subscription,
            message.title,
            message.body
        )

    return {
        "message": "Push sent",
        "subscriptions": len(subscriptions)
    }

# AWS Lambda entry point
handler = Mangum(app)