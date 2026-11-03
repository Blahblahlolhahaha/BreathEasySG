# mock_psi_server.py
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Coords(BaseModel):
    latitude: float
    longitude: float

@app.post("/api/psi")
def get_mock_psi(coords: Coords):
    """
    Returns fake PSI data that GUARANTEES an alert breach 
    for demo-user-one-place limits (psi24: 80, pm25: 40)
    """
    return {
        "region_info": "central",
        "psi_24": 200,   
        "pm25_1": 60   
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)