from fastapi.testclient import TestClient
from unittest.mock import patch

from psi.main import app

client = TestClient(app)

def test_get_psi_success():
    mock_psi_data = {
        "regionMetadata": [
            {
                "name": "central",
                "labelLocation": {
                    "latitude": 1.3521,
                    "longitude": 103.8198
                }
            }
        ]
    }

    mock_psi_readings = {"central": 25}
    mock_pm25_readings = {"central": 10}

    with patch("psi.main.retrieve_cache") as mock_cache:
        mock_cache.return_value = (
            mock_psi_data,
            mock_psi_readings,
            mock_pm25_readings
        )

        response = client.post(
            "/api/psi",
            json={
                "latitude": 1.3521,
                "longitude": 103.8198
            }
        )

    assert response.status_code == 200
    assert response.json() == {
        "region_info": "central",
        "psi_24": 25,
        "pm25_1": 10
    }

def test_get_psi_cache_unavailable():
    with patch("psi.main.retrieve_cache") as mock_cache:
        mock_cache.return_value = (None, None, None)

        response = client.post(
            "/api/psi",
            json={
                "latitude": 1.3521,
                "longitude": 103.8198
            }
        )

    assert response.status_code == 500
    assert response.json() == {
        "detail": "An error occured"
    }

def test_get_readings_success():
    mock_item = {
        "updatedTimestamp": "2026-11-07T09:00:00+08:00",
        "res": {
            "data": {
                "items": [
                    {
                        "readings": {
                            "psi_twenty_four_hourly": {
                                "central": 25
                            }
                        }
                    }
                ]
            }
        },
        "res_pm25": {
            "data": {
                "items": [
                    {
                        "readings": {
                            "pm25_one_hourly": {
                                "central": 10
                            }
                        }
                    }
                ]
            }
        }
    }

    with patch("psi.main.dynamodb.batch_get_item") as mock_batch_get:
        mock_batch_get.return_value = {
            "Responses": {
                "psi_data": [mock_item]
            },
            "UnprocessedKeys": {}
        }

        response = client.get("/api/readings")

    assert response.status_code == 200
    assert response.json()["psi_24"] == [{"central": 25}]
    assert response.json()["pm25_1"] == [{"central": 10}]
    assert response.json()["timestamps"] == [
        "2026-11-07T09:00:00+08:00"
    ]

def test_get_readings_retries_unprocessed_keys():
    mock_item = {
        "updatedTimestamp": "2026-11-07T09:00:00+08:00",
        "res": {
            "data": {
                "items": [
                    {
                        "readings": {
                            "psi_twenty_four_hourly": {"central": 25}
                        }
                    }
                ]
            }
        },
        "res_pm25": {
            "data": {
                "items": [
                    {
                        "readings": {
                            "pm25_one_hourly": {"central": 10}
                        }
                    }
                ]
            }
        }
    }

    unprocessed = {
        "psi_data": {
            "Keys": [{"id": 9}],
            "ConsistentRead": True
        }
    }

    with patch("psi.main.dynamodb.batch_get_item") as mock_batch_get, \
         patch("psi.main.time.sleep") as mock_sleep:

        mock_batch_get.side_effect = [
            {
                "Responses": {},
                "UnprocessedKeys": unprocessed
            },
            {
                "Responses": {
                    "psi_data": [mock_item]
                },
                "UnprocessedKeys": {}
            }
        ]

        response = client.get("/api/readings")

    assert response.status_code == 200
    assert response.json()["psi_24"] == [{"central": 25}]
    assert mock_batch_get.call_count == 2
    mock_sleep.assert_called_once_with(0.1)


# import json

# import pytest

# from hello_world import app


# @pytest.fixture()
# def apigw_event():
#     """ Generates API GW Event"""

#     return {
#         "body": '{ "test": "body"}',
#         "resource": "/{proxy+}",
#         "requestContext": {
#             "resourceId": "123456",
#             "apiId": "1234567890",
#             "resourcePath": "/{proxy+}",
#             "httpMethod": "POST",
#             "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
#             "accountId": "123456789012",
#             "identity": {
#                 "apiKey": "",
#                 "userArn": "",
#                 "cognitoAuthenticationType": "",
#                 "caller": "",
#                 "userAgent": "Custom User Agent String",
#                 "user": "",
#                 "cognitoIdentityPoolId": "",
#                 "cognitoIdentityId": "",
#                 "cognitoAuthenticationProvider": "",
#                 "sourceIp": "127.0.0.1",
#                 "accountId": "",
#             },
#             "stage": "prod",
#         },
#         "queryStringParameters": {"foo": "bar"},
#         "headers": {
#             "Via": "1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)",
#             "Accept-Language": "en-US,en;q=0.8",
#             "CloudFront-Is-Desktop-Viewer": "true",
#             "CloudFront-Is-SmartTV-Viewer": "false",
#             "CloudFront-Is-Mobile-Viewer": "false",
#             "X-Forwarded-For": "127.0.0.1, 127.0.0.2",
#             "CloudFront-Viewer-Country": "US",
#             "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
#             "Upgrade-Insecure-Requests": "1",
#             "X-Forwarded-Port": "443",
#             "Host": "1234567890.execute-api.us-east-1.amazonaws.com",
#             "X-Forwarded-Proto": "https",
#             "X-Amz-Cf-Id": "aaaaaaaaaae3VYQb9jd-nvCd-de396Uhbp027Y2JvkCPNLmGJHqlaA==",
#             "CloudFront-Is-Tablet-Viewer": "false",
#             "Cache-Control": "max-age=0",
#             "User-Agent": "Custom User Agent String",
#             "CloudFront-Forwarded-Proto": "https",
#             "Accept-Encoding": "gzip, deflate, sdch",
#         },
#         "pathParameters": {"proxy": "/examplepath"},
#         "httpMethod": "POST",
#         "stageVariables": {"baz": "qux"},
#         "path": "/examplepath",
#     }


# def test_lambda_handler(apigw_event):

#     ret = app.lambda_handler(apigw_event, "")
#     data = json.loads(ret["body"])

#     assert ret["statusCode"] == 200
#     assert "message" in ret["body"]
#     assert data["message"] == "hello world"
