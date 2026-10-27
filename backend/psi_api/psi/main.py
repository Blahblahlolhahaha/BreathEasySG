import json
import requests
import math
import boto3
import os
from re import X
from fastapi import Cookie, FastAPI, HTTPException, status
from mangum import Mangum
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

table = boto3.resource("dynamodb", region_name="ap-southeast-1").Table(os.environ["PSI_TABLE_NAME"])

class Coords(BaseModel):
    latitude: float
    longitude: float


app = FastAPI()
handler = Mangum(app)

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

def retrieve_cache():
    response = table.get_item(Key={"id": 0}, ConsistentRead=True)
    cached_res = response.get("Item")
    if cached_res:
        res = cached_res["res"]
        res_pm25 = cached_res["res_pm25"]
        psi_data = res["data"]
        psi_readings = res["data"]["items"][0]["readings"]["psi_twenty_four_hourly"]
        pm25_data = res_pm25["data"]["items"][0]["readings"]["pm25_one_hourly"]
        time = datetime.fromisoformat(psi_data["items"][0]["updatedTimestamp"])
        tz_plus_8 = timezone(timedelta(hours=8))
        now = datetime.now(tz=tz_plus_8)
        timediff = now - time
        minutes = timediff.total_seconds() / 60
        return psi_data, psi_readings, pm25_data
    else:
        return None, None, None

@app.post("/api/psi")
def get_psi(coords: Coords): 
    try:
        psi_data, psi_readings, pm25_data = retrieve_cache() 
        if psi_data and psi_readings and pm25_data:
            regions = psi_data["regionMetadata"]
            region = nearest_region(coords, regions)
            return {
                    "region_info": region["name"],
                    "psi_24": psi_readings[region["name"]],
                    "pm25_1": pm25_data[region["name"]]
                }
        
        raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )
    except requests.RequestException as e:
        raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )

