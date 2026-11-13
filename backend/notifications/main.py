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

    import html

    metric_names = {
        "pm25": "PM2.5",
        "psi24": "PSI",
    }

    metric = metric_names.get(
        alert.metric,
        alert.metric.upper()
    )

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
            padding: 40px 20px;
            background-color: #f4f6f5;
            font-family: Arial, Helvetica, sans-serif;
            color: #17201c;
        ">

        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #dfe5e1;
        ">

            <!-- Header -->
            <div style="
                padding: 28px 32px 24px;
                border-bottom: 3px solid #176b4d;
            ">
                <div style="
                    font-size: 23px;
                    font-weight: 700;
                    color: #176b4d;
                    letter-spacing: -0.4px;
                ">
                    🌿 BreatheEasy SG
                </div>

                <div style="
                    margin-top: 6px;
                    font-size: 11px;
                    color: #77817c;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                ">
                    Personalised Air Quality Monitoring
                </div>
            </div>

            <!-- Main -->
            <div style="padding: 36px 32px 32px;">

                <div style="
                    font-size: 12px;
                    font-weight: 700;
                    color: #b42318;
                    letter-spacing: 1px;
                    margin-bottom: 14px;
                ">
                    🚨 AIR QUALITY ALERT
                </div>

                <div style="
                    font-size: 26px;
                    line-height: 1.25;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                ">
                    {metric_html} threshold exceeded
                </div>

                <div style="
                    margin-top: 12px;
                    font-size: 20px;
                    color: #65706a;
                ">
                    📍 {location}
                </div>

                <!-- Metrics -->
                <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                        margin-top: 10px;
                        border-top: 1px solid #dfe5e1;
                        border-bottom: 1px solid #dfe5e1;
                    "
                >
                    <tr>

                        <td style="
                            width: 50%;
                            padding: 24px 0;
                            vertical-align: top;
                            border-right: 1px solid #dfe5e1;
                        ">
                            <div style="
                                font-size: 11px;
                                color: #77817c;
                                font-weight: 700;
                                letter-spacing: 0.8px;
                            ">
                                CURRENT {metric_html}
                            </div>

                            <div style="
                                margin-top: 8px;
                                font-size: 36px;
                                font-weight: 700;
                                color: #b42318;
                            ">
                                {alert.value}
                            </div>
                        </td>

                        <td style="
                            width: 50%;
                            padding: 24px 0 24px 28px;
                            vertical-align: top;
                        ">
                            <div style="
                                font-size: 11px;
                                color: #77817c;
                                font-weight: 700;
                                letter-spacing: 0.8px;
                            ">
                                YOUR THRESHOLD
                            </div>

                            <div style="
                                margin-top: 8px;
                                font-size: 36px;
                                font-weight: 700;
                                color: #17201c;
                            ">
                                {alert.limit}
                            </div>
                        </td>

                    </tr>
                </table>

                <!-- Explanation -->
                <div style="
                    margin-top: 28px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #4e5953;
                ">
                    The {metric_html} level at <strong>{location}</strong> has exceeded
                    your preferred threshold.
                    <br><br>
                    You may wish to <strong>reduce</strong> prolonged or strenuous
                    outdoor activities until air quality improves.
                </div>

            </div>

            <!-- Footer -->
            <div style="
                padding: 20px 32px;
                background-color: #f7f9f8;
                border-top: 1px solid #dfe5e1;
                font-size: 11px;
                line-height: 1.6;
                color: #7a847f;
            ">
                BreatheEasy SG · Air quality monitoring
                <br>
                You're receiving this because email notifications are enabled
                for your account.
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
            padding: 40px 20px;
            background-color: #f4f6f5;
            font-family: Arial, Helvetica, sans-serif;
            color: #17201c;
        ">

        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border: 1px solid #dfe5e1;
        ">

            <!-- Header -->
            <div style="
                padding: 28px 32px 24px;
                border-bottom: 3px solid #176b4d;
            ">
                <div style="
                    font-size: 23px;
                    font-weight: 700;
                    color: #176b4d;
                    letter-spacing: -0.4px;
                ">
                    🌿 BreatheEasy SG
                </div>

                <div style="
                    margin-top: 6px;
                    font-size: 11px;
                    color: #77817c;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                ">
                    Personalised Air Quality Monitoring
                </div>
            </div>

            <!-- Main -->
            <div style="padding: 36px 32px 32px;">

                <div style="
                    font-size: 12px;
                    font-weight: 700;
                    color: #176b4d;
                    letter-spacing: 1px;
                    margin-bottom: 14px;
                ">
                    ✅ BACK TO NORMAL
                </div>

                <div style="
                    font-size: 26px;
                    line-height: 1.25;
                    font-weight: 700;
                    letter-spacing: -0.5px;
                ">
                    {metric_html} level is back to normal
                </div>

                <div style="
                    margin-top: 12px;
                    font-size: 20px;
                    color: #65706a;
                ">
                    📍 {location}
                </div>

                <!-- Metric -->
                <div style="
                    margin-top: 10px;
                    padding: 24px 0;
                    border-top: 1px solid #dfe5e1;
                    border-bottom: 1px solid #dfe5e1;
                ">
                    <div style="
                        font-size: 11px;
                        color: #77817c;
                        font-weight: 700;
                        letter-spacing: 0.8px;
                    ">
                        CURRENT {metric_html}
                    </div>

                    <div style="
                        margin-top: 8px;
                        font-size: 36px;
                        font-weight: 700;
                        color: #176b4d;
                    ">
                        {alert.value}
                    </div>
                </div>

                <!-- Explanation -->
                <div style="
                    margin-top: 28px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #4e5953;
                ">
                    Good news! The {metric_html} level at
                    <strong>{location}</strong> is back within your
                    preferred limit.
                    <br><br>
                    We'll continue <strong>monitoring</strong> the air quality
                    and notify you if your threshold is exceeded again.
                </div>

            </div>

            <!-- Footer -->
            <div style="
                padding: 20px 32px;
                background-color: #f7f9f8;
                border-top: 1px solid #dfe5e1;
                font-size: 11px;
                line-height: 1.6;
                color: #7a847f;
            ">
                BreatheEasy SG · Air quality monitoring
                <br>
                You're receiving this because email notifications are enabled
                for your account.
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