import json
import fastapi
from mangum import Mangum
import requests
from pydantic import BaseModel

class UserCoords(BaseModel):
    latitude: float
    longitude: float

app = fastapi.FastAPI()

handler = Mangum(app)

@app.post("/api")
async def get_psi(coords: UserCoords): 
    try:
        res = requests.get("https://api-open.data.gov.sg/v2/real-time/api/psi")
        if res.status_code != 200:
            return {
                "body": "An error occured"
            }
        psi_data = res.json()
        return {
                "psi_data": psi_data,
                "coords": coords
            }
    except requests.RequestException as e:
        raise fastapi.HTTPException(
                status_code=fastapi.status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occured"
                )
