import json
import requests
import math
import boto3
import os
import time
from re import X
from fastapi import Cookie, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta

dynamodb = boto3.resource("dynamodb", region_name="ap-southeast-1")
table = dynamodb.Table(os.environ["PSI_TABLE_NAME"])

class Coords(BaseModel):
    latitude: float
    longitude: float

app = FastAPI()

origins = [
    origin.strip()
    for origin in os.environ["ALLOWED_ORIGINS"].split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, #requests from frontend
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type","Accept"],
)
handler = Mangum(app)
tz_plus_8 = timezone(timedelta(hours=8))

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

def retrieve_cache(now, count=0):
    if count >= 2:
        return None, None, None
    response = table.get_item(Key={"id": now.hour}, ConsistentRead=True)
    cached_res = response.get("Item")
    current_hour = now.replace(minute=0, second=0, microsecond=0)
    prev_hour = current_hour - timedelta(hours=1)
    if cached_res:
        res = cached_res["res"]
        res_pm25 = cached_res["res_pm25"]
        psi_data = res["data"]
        psi_readings = res["data"]["items"][0]["readings"]["psi_twenty_four_hourly"]
        pm25_data = res_pm25["data"]["items"][0]["readings"]["pm25_one_hourly"]
        time = datetime.fromisoformat(psi_data["items"][0]["timestamp"]).astimezone(tz=tz_plus_8)
        current_time = time.replace(minute=0, second=0, microsecond=0)
        if current_time != current_hour:
            return retrieve_cache(prev_hour, count+1)
        return psi_data, psi_readings, pm25_data
    else:
        return retrieve_cache(prev_hour, count+1)

@app.post("/api/psi")
def get_psi(coords: Coords): 
    try:
        now = datetime.now(tz=tz_plus_8)
        psi_data, psi_readings, pm25_data = retrieve_cache(now) 
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

@app.get("/api/readings")
def get_readings():
    pending = {
        table.name: {
            "Keys": [{"id": x} for x in range(24)], 
            "ConsistentRead": True
        }
    }
    items = []

    for attempt in range(4):
        response = dynamodb.batch_get_item(
            RequestItems = pending
        )
        items.extend(response.get("Responses", {}).get(table.name, []))
        pending = response.get("UnprocessedKeys", {})

        if not pending:
            break
        
        if attempt < 3:
            time.sleep(0.1 * (2 ** attempt))


    if pending:
        raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )
    
    items.sort(
        key=lambda item: datetime.fromisoformat(item["updatedTimestamp"]) 
    )

    now = datetime.now(tz=tz_plus_8)
    current_hour = now.replace(minute=0, second=0, microsecond=0)
    yesterday = current_hour - timedelta(hours=24)
    send = []
    for item in items:
        reading_time = datetime.fromisoformat(item["updatedTimestamp"])

        if reading_time > yesterday:
            send.append(item)
        

    res = {
        "psi_24": [item["res"]["data"]["items"][0]["readings"]["psi_twenty_four_hourly"] for item in send],
        "pm25_1": [item["res_pm25"]["data"]["items"][0]["readings"]["pm25_one_hourly"] for item in send],
        "timestamps": [item["updatedTimestamp"] for item in send]
    }
    return res


