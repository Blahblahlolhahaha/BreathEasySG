import json
import fastapi
from mangum import Mangum
import requests
import math
from pydantic import BaseModel

class Coords(BaseModel):
    latitude: float
    longitude: float

app = fastapi.FastAPI()

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

    for i in range(1, len(regions)):
        region_coords = Coords.model_validate(regions[i]["labelLocation"])
        print(region_coords)
        test = calculate_distance(user_coords, region_coords)
        if test < min_region_dist:
            min_region_dist = test
            min_region_ind = i

    return regions[min_region_ind]


@app.post("/api")
async def get_psi(coords: Coords): 
    try:
        res = requests.get("https://api-open.data.gov.sg/v2/real-time/api/psi")
        if res.status_code != 200:
            return {
                "body": "An error occured"
            }
        psi_data = res.json()["data"]
        regions = psi_data["regionMetadata"]

        region = nearest_region(coords, regions)

        return {
                "region": region,
                "coords": coords
            }
    except requests.RequestException as e:
        raise fastapi.HTTPException(
                status_code=fastapi.status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )
