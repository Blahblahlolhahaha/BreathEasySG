# PLACEHOLDER — Data Ingestion: returns the latest air readings for every region, plus the last 24 hours. Not built yet (the existing code is in data-ingestion/ on the dev-data-ingestion branch).
import fastapi

app = fastapi.FastAPI()


# PLACEHOLDER — Data Ingestion: GET /api/readings (public, no login).
@app.get("/api/readings")
async def get_readings():
    raise fastapi.HTTPException(status_code=501, detail="Not built yet")
