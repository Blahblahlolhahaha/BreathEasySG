import os
import json
import boto3

sqs = boto3.client("sqs")

def send_alert_event(
    user_id,
    event_type,
    metric,
    value,
    limit,
    location_name
):
    """Send an alert event to the Notifications SQS queue."""

    queue_url = os.environ.get("ALERT_QUEUE_URL")

    if not queue_url:
        raise RuntimeError("ALERT_QUEUE_URL is not set")

    message = {
        "userID": user_id,
        "eventType": event_type,
        "metric": metric,
        "value": value,
        "limit": limit,
        "locationName": location_name,
    }

    sqs.send_message(
        QueueUrl=queue_url,
        MessageBody=json.dumps(message)
    )
    
# PSEUDO-CODE
# if state_changed_to_breach:
#     send_alert_event(
#         user_id=user["sub"],
#         event_type="THRESHOLD_BREACH",
#         metric=breach.metric,
#         value=breach.value,
#         limit=breach.limit,
#         location_name=place.name,
#     )
    
# if state_changed_to_normal:
#     send_alert_event(
#         user_id=user["sub"],
#         event_type="BACK_TO_NORMAL",
#         metric=metric,
#         value=current_value,
#         limit=limit,
#         location_name=place.name,
#     )