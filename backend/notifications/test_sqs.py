import json

from main import sqs_handler


USER_ID = "99ead53c-d0b1-70db-68c5-dad3f6b6b546"

alert = {
    "userID": USER_ID,
    "eventType": "THRESHOLD_BREACH",
    "metric": "pm25",
    "value": 45,
    "limit": 40,
    "locationName": "Home"
}

event = {
    "Records": [
        {
            "body": json.dumps(alert)
        }
    ]
}

result = sqs_handler(event, None)

print(result)