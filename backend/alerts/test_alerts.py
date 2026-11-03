import os

# These must be set before importing main.py
os.environ.setdefault("USERS_TABLE_NAME", "users")
os.environ.setdefault("LOCATIONS_TABLE_NAME", "locations")
os.environ.setdefault("DYNAMODB_ENDPOINT", "http://localhost:8000")
os.environ.setdefault("DEV_USER_ID", "demo-user-one-place")
os.environ.setdefault("AWS_DEFAULT_REGION", "ap-southeast-1")

from fastapi.testclient import TestClient

from . import main
from .main import (
    AlertResponse,
    MetricBreach,
    app,
    check_breaches,
    diff_state,
)


def test_breach_detection():
    psi_data = {
        "psi_24": 120,
        "pm25_1": 30,
    }

    breaches = check_breaches(
        psi_data,
        {
            "psi24": 100,
            "pm25": 55,
        },
    )

    assert len(breaches) == 1
    assert breaches[0].metric == "psi24"
    assert breaches[0].value == 120
    assert breaches[0].limit == 100


def test_no_breach_when_value_is_at_limit():
    breaches = check_breaches(
        {
            "psi_24": 100,
            "pm25_1": 55,
        },
        {
            "psi24": 100,
            "pm25": 55,
        },
    )

    assert breaches == []


def test_alert_when_value_crosses_threshold():
    response = AlertResponse()
    state = {}

    breaches = [
        MetricBreach(
            metric="psi24",
            value=120,
            limit=100,
        )
    ]

    diff_state(
        place_id="current",
        label="Current location",
        breaches=breaches,
        psi_data={
            "psi_24": 120,
            "pm25_1": 30,
        },
        state=state,
        response=response,
    )

    assert len(response.new_alerts) == 1
    assert response.new_alerts[0].metric == "psi24"
    assert response.new_alerts[0].value == 120
    assert response.new_alerts[0].limit == 100
    assert response.recovered == []
    assert state["current:psi24"] is True


def test_no_duplicate_alert():
    response = AlertResponse()
    state = {
        "current:psi24": True,
    }

    breaches = [
        MetricBreach(
            metric="psi24",
            value=130,
            limit=100,
        )
    ]

    diff_state(
        place_id="current",
        label="Current location",
        breaches=breaches,
        psi_data={
            "psi_24": 130,
            "pm25_1": 30,
        },
        state=state,
        response=response,
    )

    assert response.new_alerts == []
    assert response.recovered == []
    assert state["current:psi24"] is True


def test_recovery_alert():
    response = AlertResponse()
    state = {
        "current:psi24": True,
    }

    diff_state(
        place_id="current",
        label="Current location",
        breaches=[],
        psi_data={
            "psi_24": 80,
            "pm25_1": 30,
        },
        state=state,
        response=response,
    )

    assert response.new_alerts == []
    assert len(response.recovered) == 1
    assert response.recovered[0].metric == "psi24"
    assert response.recovered[0].value == 80
    assert state["current:psi24"] is False


def test_alert_endpoint(monkeypatch):
    class FakeUsersTable:
        def __init__(self):
            self.profile = {
                "userId": "demo-user-one-place",
                "limits": {
                    "psi24": 100,
                    "pm25": 55,
                },
                "places": [],
                "channels": {
                    "email": True,
                    "push": False,
                },
                "alertState": {},
            }
            self.saved_state = None

        def get_item(self, **kwargs):
            return {
                "Item": self.profile,
            }

        def update_item(self, **kwargs):
            self.saved_state = kwargs[
                "ExpressionAttributeValues"
            ][":s"]

    fake_users = FakeUsersTable()

    monkeypatch.setattr(main, "_users", fake_users)

    monkeypatch.setattr(
        main,
        "fetch_psi_for_coords",
        lambda coords: {
            "psi_24": 120,
            "pm25_1": 30,
        },
    )

    client = TestClient(app)

    response = client.post(
        "/api/alerts/check",
        json={
            "coords": {
                "latitude": 1.35072,
                "longitude": 103.84883,
            }
        },
    )

    assert response.status_code == 200

    body = response.json()

    assert len(body["current"]) == 1
    assert body["current"][0]["metric"] == "psi24"

    assert len(body["new_alerts"]) == 1
    assert body["new_alerts"][0]["metric"] == "psi24"

    assert fake_users.saved_state["current:psi24"] is True