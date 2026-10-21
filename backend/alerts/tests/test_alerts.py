# test_alerts.py
import requests
import json

BASE_URL = "http://localhost:8001"

def test_breach_detection():
    payload = {
        "coords": {"latitude": 1.3521, "longitude": 103.8198},
        "places": [{
            "id": "39ae0a09-3210-4050-bf41-d3be0c55ce0a", 
            "label": "Home",                                  
            "type": "home",                                   
            "address": "",                                   
            "lat": 1.3521,
            "lng": 103.8198,
            "regionId": None,                                 
            "limits": {"psi24": 80, "pm25": 40}              
        }]
    }

    response = requests.post(f"{BASE_URL}/api/alerts/check", json=payload, timeout=5)
    data = response.json()

    assert response.status_code == 200
    
    # ✅ CORRECTED ASSERTIONS
    # Current location uses GLOBAL limits (100/55) → NO breach with mock values (95/45)
    assert data["current"] == [], f"Expected empty current (95<100, 45<55), got {data['current']}"
    
    # Place uses PLACE-SPECIFIC limits (80/40) → BOTH breach
    assert "39ae0a09-3210-4050-bf41-d3be0c55ce0a" in data["places"]
    place_breaches = data["places"]["39ae0a09-3210-4050-bf41-d3be0c55ce0a"]
    assert len(place_breaches) == 2, f"Expected 2 place breaches, got {len(place_breaches)}"
    
    metrics = {b["metric"]: b["value"] for b in place_breaches}
    assert metrics["psi24"] == 95
    assert metrics["pm25"] == 45
    
    print("\n✅ ALL TESTS PASSED")

if __name__ == "__main__":
    test_breach_detection()