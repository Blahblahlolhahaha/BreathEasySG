import json

import requests
import boto3
import os
from decimal import Decimal
from datetime import datetime, timezone, timedelta

table = boto3.resource("dynamodb", region_name="ap-southeast-1").Table(os.environ["PSI_TABLE_NAME"])

def lambda_handler(event, context):
    """Sample pure Lambda function

    Parameters
    ----------
    event: dict, required
        API Gateway Lambda Proxy Input Format

        Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format

    context: object, required
        Lambda Context runtime methods and attributes

        Context doc: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Returns
    ------
    API Gateway Lambda Proxy Output Format: dict

        Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
    """
    try:
        res = requests.get("https://api-open.data.gov.sg/v2/real-time/api/psi")
        res_pm25 = requests.get("https://api-open.data.gov.sg/v2/real-time/api/pm25")
        psi_data = res.json()["data"]
        tz_plus_8 = timezone(timedelta(hours=8))
        time = datetime.fromisoformat(psi_data["items"][0]["updatedTimestamp"]).astimezone(tz_plus_8)
        if res.status_code != 200:
            return {
                "statusCode": 500,
                "body": json.dumps(
                    {"message": "hello world"}
                )
            }
        table.put_item(Item={
               "id": time.hour,
               "res": res.json(parse_float=Decimal),
               "res_pm25": res_pm25.json(parse_float=Decimal),
               "updatedTimestamp": time
        }) 

    except requests.RequestException as e:
        return {
            "statusCode": 500,
            "body": json.dumps(
                {"message": str(e)}
            )
        }


    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "hello world",
            # "location": ip.text.replace("\n", "")
        }),
    }
