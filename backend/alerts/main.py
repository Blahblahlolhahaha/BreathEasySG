import fastapi
import requests
from pydantic import BaseModel
import os
from profile.main import Place, current_user, store, DEFAULT_LIMITS
from psi_api.psi.main import Coords
from .tests.load_demo_data import DEMO_STORE

app = fastapi.FastAPI()

class AlertCheck(BaseModel):
    """Request body for checking alerts"""
    coords: Coords | None = None  
    places: list[Place] | None = []  
class MetricBreach(BaseModel):
    metric: str
    value: float | int
    limit: int

class AlertResponse(BaseModel):
    current: list[MetricBreach] = []
    places: dict[str, list[MetricBreach]] = {}

def fetch_psi_for_coords(coords: Coords) -> dict | None:
    """Fetch PSI data from the PSI service for given coordinates"""
    try:
        psi_service_url = os.environ.get("PSI_SERVICE_URL", "http://localhost:8000/api/psi")
        response = requests.post(
            psi_service_url,
            json={"latitude": coords.latitude, "longitude": coords.longitude},
            timeout=5
        )
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"Error fetching PSI data: {e}")
        return None

def check_breaches(psi_data: dict, limits) -> list[MetricBreach]:
    """Check if PSI/PM2.5 values exceed the given limits"""
    breaches = []
    
    if not psi_data or not limits:
        return breaches

    if hasattr(limits, "model_dump"):
        limits_dict = limits.model_dump()
    elif isinstance(limits, dict):
        limits_dict = limits
    else:
        return breaches
    
    psi_24 = psi_data.get("psi_24")
    pm25_1 = psi_data.get("pm25_1")
    
    psi_limit = limits_dict.get("psi24", 100)
    pm25_limit = limits_dict.get("pm25", 55)
    
    if psi_24 is not None and psi_24 > psi_limit:
        breaches.append(MetricBreach(metric="psi24", value=psi_24, limit=psi_limit))
    
    if pm25_1 is not None and pm25_1 > pm25_limit:
        breaches.append(MetricBreach(metric="pm25", value=pm25_1, limit=pm25_limit))
    
    return breaches

@app.post("/api/alerts/check")
async def check_alerts(alert_check: AlertCheck, request: fastapi.Request):
    """
    Check if current location or saved places exceed user's PSI/PM2.5 thresholds.
    Returns only locations where breaches occurred.
    """
    #FOR TESTING demo-data.json ONLY
    # user_id = "demo-user-one-place"  
    # user = {"sub": user_id}
    
    # saved_profile = DEMO_STORE.get(user_id)
    # if not saved_profile:
    #     raise fastapi.HTTPException(status_code=404, detail="Demo user not found")
    
    # global_limits = saved_profile.get("limits", DEFAULT_LIMITS)

    user = current_user(request)
    saved_profile = store.get(user["sub"])
    
    if not saved_profile:
        raise fastapi.HTTPException(status_code=404, detail="Profile not found")

    global_limits = saved_profile.get("limits", DEFAULT_LIMITS)
    
    response = AlertResponse()
    
    # 1. Check current GPS location
    if alert_check.coords:
        psi_data = fetch_psi_for_coords(alert_check.coords)
        if psi_data:
            response.current = check_breaches(psi_data, global_limits)
    
    # 2. Check each saved place
    places_to_check = alert_check.places or []
    for place in places_to_check:
        place_coords = Coords(latitude=place.lat, longitude=place.lng)
        psi_data = fetch_psi_for_coords(place_coords)
        
        if psi_data:
            place_limits = place.limits if place.limits else global_limits
            breaches = check_breaches(psi_data, place_limits)
            
            if breaches: 
                response.places[place.id] = breaches
    
    return response