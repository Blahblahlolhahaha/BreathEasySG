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
    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")

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
            "mailto:breatheasy.corp@gmail.com"
        )
        },
    )
    
def send_email(to_email, title, body, html_body=None):
    """Sends an alert email using Amazon SES."""

    sender_email = os.environ.get("SES_SENDER_EMAIL")

    if not sender_email:
        raise RuntimeError("SES_SENDER_EMAIL is not set")

    import boto3
    ses = boto3.client("ses")

    email_body = {
        "Text": {
            "Data": body,
            "Charset": "UTF-8"
        }
    }

    if html_body:
        email_body["Html"] = {
            "Data": html_body,
            "Charset": "UTF-8"
        }

    ses.send_email(
        Source=f"BreatheEasy SG <{sender_email}>",
        Destination={
            "ToAddresses": [to_email]
        },
        Message={
            "Subject": {
                "Data": title,
                "Charset": "UTF-8"
            },
            "Body": email_body
        }
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

    print("Push subscription saved for user:", user["sub"])
    
    return {
        "message": "Push subscription saved"
    }


class AlertEvent(BaseModel):
    userID: str
    eventType: str
    metric: str
    value: float | None = None
    limit: float | None = None
    locationName: str
    
def format_alert_message(alert: AlertEvent):
    metric_names = {
        "pm25": "PM2.5",
        "psi24": "PSI",
    }

    metric = metric_names.get(
        alert.metric,
        alert.metric.upper()
    )

    if alert.eventType == "THRESHOLD_BREACH":
        return {
            "title": "🚨 Air Quality Alert",
            "body": (
                f"{metric} at {alert.locationName} is {alert.value}, "
                f"above your threshold of {alert.limit}."
            )
        }

    if alert.eventType == "BACK_TO_NORMAL":
        return {
            "title": "✅ Air Quality Back to Normal",
            "body": (
                f"{metric} at {alert.locationName} is back to normal. "
                f"Current level: {alert.value}."
            )
        }

    raise ValueError(
        f"Unknown event type: {alert.eventType}"
    )
    
def format_email_message(alert: AlertEvent):
    """Formats a richer HTML message specifically for email."""

    import html

    metric_names = {
        "pm25": "PM2.5",
        "psi24": "PSI",
    }

    metric = metric_names.get(
        alert.metric,
        alert.metric.upper()
    )

    # Escape user-controlled/location text before inserting into HTML
    location = html.escape(alert.locationName)
    metric_html = html.escape(metric)

    if alert.eventType == "THRESHOLD_BREACH":
        title = "Air Quality Alert"

        text = (
            f"{metric} at {alert.locationName} is {alert.value}, "
            f"above your threshold of {alert.limit}."
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="
            margin: 0;
            padding: 0;
            background-color: #f5f7f6;
            font-family: Arial, sans-serif;
            color: #1f2937;
        ">

            <div style="
                max-width: 560px;
                margin: 30px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            ">

                <!-- Header -->
                <div style="
                    padding: 24px 30px;
                    background-color: #e8f5ee;
                ">
                    <div style="
                        font-size: 22px;
                        font-weight: bold;
                        color: #176b4d;
                    ">
                        🌿 BreatheEasy SG
                    </div>

                    <div style="
                        margin-top: 4px;
                        font-size: 14px;
                        color: #4b5563;
                    ">
                        Personalised air quality monitoring
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">

                    <div style="
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: #fff1f0;
                        color: #b42318;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: bold;
                    ">
                        AIR QUALITY ALERT
                    </div>

                    <h2 style="
                        margin: 20px 0 8px;
                        font-size: 22px;
                    ">
                        Your air quality threshold has been exceeded
                    </h2>

                    <p style="
                        margin: 0;
                        color: #6b7280;
                        line-height: 1.6;
                    ">
                        📍 We detected elevated {metric_html} levels at
                        <strong>{location}</strong>.
                    </p>

                    <!-- Reading Card -->
                    <div style="
                        margin: 26px 0;
                        padding: 22px;
                        background-color: #f8faf9;
                        border-radius: 10px;
                        border: 1px solid #e5e7eb;
                    ">

                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            margin-bottom: 6px;
                        ">
                            CURRENT {metric_html}
                        </div>

                        <div style="
                            font-size: 32px;
                            font-weight: bold;
                            color: #b42318;
                        ">
                            {alert.value}
                        </div>

                        <div style="
                            margin-top: 16px;
                            font-size: 14px;
                            color: #4b5563;
                        ">
                            Your threshold:
                            <strong>{alert.limit}</strong>
                        </div>

                    </div>

                    <p style="
                        line-height: 1.6;
                        color: #4b5563;
                    ">
                        You may wish to reduce prolonged or strenuous
                        outdoor activities until air quality improves.
                    </p>

                </div>

                <!-- Footer -->
                <div style="
                    padding: 20px 30px;
                    background-color: #f8faf9;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.5;
                ">
                    You're receiving this email because email notifications
                    are enabled for your BreatheEasy SG account.
                </div>

            </div>

        </body>
        </html>
        """

        return {
            "title": title,
            "body": text,
            "html": html_body,
        }

    if alert.eventType == "BACK_TO_NORMAL":
        title = "Air Quality Back to Normal"

        text = (
            f"{metric} at {alert.locationName} is back to normal. "
            f"Current level: {alert.value}."
        )

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="
            margin: 0;
            padding: 0;
            background-color: #f5f7f6;
            font-family: Arial, sans-serif;
            color: #1f2937;
        ">

            <div style="
                max-width: 560px;
                margin: 30px auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                border: 1px solid #e5e7eb;
            ">

                <!-- Header -->
                <div style="
                    padding: 24px 30px;
                    background-color: #e8f5ee;
                ">
                    <div style="
                        font-size: 22px;
                        font-weight: bold;
                        color: #176b4d;
                    ">
                        🌿 BreatheEasy SG
                    </div>

                    <div style="
                        margin-top: 4px;
                        font-size: 14px;
                        color: #4b5563;
                    ">
                        Personalised air quality monitoring
                    </div>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">

                    <div style="
                        display: inline-block;
                        padding: 6px 12px;
                        background-color: #e8f5ee;
                        color: #176b4d;
                        border-radius: 20px;
                        font-size: 13px;
                        font-weight: bold;
                    ">
                        BACK TO NORMAL
                    </div>

                    <h2 style="
                        margin: 20px 0 8px;
                        font-size: 22px;
                    ">
                        Air quality has improved
                    </h2>

                    <p style="
                        margin: 0;
                        color: #6b7280;
                        line-height: 1.6;
                    ">
                        Good news! {metric_html} at
                        <strong>{location}</strong> is back within
                        your preferred limit.
                    </p>

                    <!-- Reading Card -->
                    <div style="
                        margin: 26px 0;
                        padding: 22px;
                        background-color: #f8faf9;
                        border-radius: 10px;
                        border: 1px solid #e5e7eb;
                    ">

                        <div style="
                            font-size: 13px;
                            color: #6b7280;
                            margin-bottom: 6px;
                        ">
                            CURRENT {metric_html}
                        </div>

                        <div style="
                            font-size: 32px;
                            font-weight: bold;
                            color: #176b4d;
                        ">
                            {alert.value}
                        </div>

                    </div>

                    <p style="
                        line-height: 1.6;
                        color: #4b5563;
                    ">
                        We'll continue monitoring the air quality and
                        notify you if your threshold is exceeded again.
                    </p>

                </div>

                <!-- Footer -->
                <div style="
                    padding: 20px 30px;
                    background-color: #f8faf9;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.5;
                ">
                    You're receiving this email because email notifications
                    are enabled for your BreatheEasy SG account.
                </div>

            </div>

        </body>
        </html>
        """

        return {
            "title": title,
            "body": text,
            "html": html_body,
        }

    raise ValueError(
        f"Unknown event type: {alert.eventType}"
    )

def get_user_profile(user_id):
    import boto3

    table_name = os.environ.get("PROFILE_TABLE_NAME")

    if not table_name:
        raise RuntimeError("PROFILE_TABLE_NAME is not set")

    table = boto3.resource("dynamodb").Table(table_name)

    response = table.get_item(
        Key={"userId": user_id}
    )

    return response.get("Item")

   
def sqs_handler(event, context):
    for record in event.get("Records", []):
        alert_data = json.loads(record["body"])
        alert = AlertEvent(**alert_data)

        message = format_alert_message(alert)

        profile = get_user_profile(alert.userID)

        if not profile:
            continue

        channels = profile.get(
            "channels",
            {"push": True, "email": True}
        )

        # Push notification
        if channels.get("push", True):
            subscriptions = store.get_by_user(
                alert.userID
            )

            for subscription in subscriptions:
                send_push(
                    subscription,
                    message["title"],
                    message["body"]
                )

        # Email notification
        if channels.get("email", True):
            email = profile.get("email")

            if email:
                email_message = format_email_message(alert)

                send_email(
                    email,
                    email_message["title"],
                    email_message["body"],
                    email_message["html"]
                )
    return {
        "processed": len(event.get("Records", []))
    }

# AWS Lambda entry point
handler = Mangum(app)