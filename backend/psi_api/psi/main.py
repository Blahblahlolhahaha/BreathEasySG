import json
import requests
import math
from re import X
from fastapi import Cookie, FastAPI, HTTPException, status
from mangum import Mangum
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

class Coords(BaseModel):
    latitude: float
    longitude: float


app = FastAPI()
handler = Mangum(app)

cached_res = None


def calculate_distance(coord1, coord2):
    radius = 6371
    diff_lat = math.radians(coord1.latitude - coord2.latitude)
    diff_long = math.radians(coord1.longitude - coord2.longitude)

    a = math.pow(math.sin(diff_lat/2), 2) + math.cos(math.radians(coord1.latitude)) * math.cos(math.radians(coord2.latitude)) * math.pow(math.sin(diff_long/2), 2)
    return 2 * radius * math.asin(math.sqrt(a))


def nearest_region(user_coords, regions):
    min_region_ind = -1
    min_region_dist = float("inf")

    for i in range(0, len(regions)):
        region_coords = Coords.model_validate(regions[i]["labelLocation"])
        test = calculate_distance(user_coords, region_coords)
        if test < min_region_dist:
            min_region_dist = test
            min_region_ind = i

    return regions[min_region_ind]

def retrieve_cache_or_get_request():
    global cached_res
    if not cached_res is None:
        res = cached_res["res"]
        res_pm25 = cached_res["res_pm25"]
        psi_data = res.json()["data"]
        psi_readings = res.json()["data"]["items"][0]["readings"]["psi_twenty_four_hourly"]
        pm25_data = res_pm25.json()["data"]["items"][0]["readings"]["pm25_one_hourly"]
        time = datetime.fromisoformat(psi_data["items"][0]["updatedTimestamp"])
        tz_plus_8 = timezone(timedelta(hours=8))
        now = datetime.now(tz=tz_plus_8)
        timediff = now - time
        minutes = timediff.total_seconds() / 60
        if minutes < 15:
            return psi_data, psi_readings, pm25_data

    res = requests.get("https://api-open.data.gov.sg/v2/real-time/api/psi")
    res_pm25 = requests.get("https://api-open.data.gov.sg/v2/real-time/api/pm25")
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occured"
        )
    psi_data = res.json()["data"]
    psi_readings = res.json()["data"]["items"][0]["readings"]["psi_twenty_four_hourly"]
    pm25_data = res_pm25.json()["data"]["items"][0]["readings"]["pm25_one_hourly"]
    cached_res = {
            "res": res,
            "res_pm25": res_pm25
    }
    return psi_data, psi_readings, pm25_data

@app.post("/api/psi")
def get_psi(coords: Coords): 
    try:
        psi_data, psi_readings, pm25_data = retrieve_cache_or_get_request() 
        regions = psi_data["regionMetadata"]
        region = nearest_region(coords, regions)
        return {
                "region_info": region["name"],
                "psi_24": psi_readings[region["name"]],
                "pm25_1": pm25_data[region["name"]]
            }
    except requests.RequestException as e:
        raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )

