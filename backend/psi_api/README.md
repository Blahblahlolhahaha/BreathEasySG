# PSI HTTP API

Returns cached air-quality readings for the PSI region nearest to a supplied latitude and longitude. The implementation is in [psi/main.py](psi/main.py); [template.yaml](template.yaml) connects API Gateway to the FastAPI application through Lambda and Mangum.

## Endpoint

```text
POST /api/psi
Content-Type: application/json
```

For the deployed API, include the API Gateway stage:

```text
https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/Prod/api/psi
```

Retrieve the base URL from the existing API stack:

```bash
aws cloudformation describe-stacks \
  --stack-name data-ingestion \
  --profile nus \
  --region ap-southeast-1 \
  --query "Stacks[0].Outputs[?OutputKey=='PSIApi'].OutputValue | [0]" \
  --output text
```

The `PSIApi` output already ends in `/Prod/api/`. Append `psi`, not `/api/psi`.

The current template does not configure an authorizer or API-key requirement. It uses SAM's `Api` event (API Gateway REST API), rather than the separate API Gateway HTTP API resource type.

## Request body

```json
{
  "latitude": 1.3521,
  "longitude": 103.8198
}
```

| Field | Type | Required | Meaning |
|---|---|---|---|
| `latitude` | Number | Yes | Latitude in decimal degrees |
| `longitude` | Number | Yes | Longitude in decimal degrees |

Send coordinates in the JSON body, not query parameters. The request model declares both fields as floats, but currently does not enforce latitude/longitude bounds or restrict coordinates to Singapore. Postal codes, addresses, user IDs, and location IDs are not accepted as substitutes for coordinates.

### curl example

Replace `<api-id>` with the ID from your deployed endpoint:

```bash
curl --request POST \
  'https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/Prod/api/psi' \
  --header 'Content-Type: application/json' \
  --data '{"latitude":1.3521,"longitude":103.8198}'
```

### JavaScript example

```javascript
async function getPsi(apiBaseUrl, latitude, longitude) {
  // apiBaseUrl is the PSIApi output, ending in /Prod/api/.
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/psi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ latitude, longitude }),
  });

  if (!response.ok) {
    throw new Error(`PSI API returned ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
```

Cross-origin browser access needs CORS configuration, which is currently absent from both the FastAPI application and the SAM template. The example can be used from a server-side JavaScript environment; a browser on another origin may fail its preflight request.

## Successful response

HTTP `200`, with a JSON object:

```json
{
  "region_info": "central",
  "psi_24": 105,
  "pm25_1": 73
}
```

These readings are an example, not live measurements or notification thresholds.

| Field | Type | Meaning |
|---|---|---|
| `region_info` | String | Name of the nearest region from the cached PSI region metadata, normally `north`, `south`, `east`, `west`, or `central` |
| `psi_24` | Number | Cached 24-hour PSI reading for that region |
| `pm25_1` | Number | Cached 1-hour PM2.5 concentration for that region |

The API calculates Haversine distances from the supplied coordinates to each region's `labelLocation` and selects the nearest. This is a nearest-point calculation, not an administrative-boundary lookup. It does not calculate notification decisions or apply user/place limits.

## Error responses

| Status | Situation | Response |
|---|---|---|
| `422` | Invalid request body, such as missing coordinates or values that cannot be parsed as floats | FastAPI validation response containing a `detail` array |
| `405` | Unsupported method for `/api/psi`, such as `GET`, when routed to FastAPI | Method-not-allowed response |
| `404` | Unknown application route under the `/api/` proxy | Not-found response |
| `500` | Cache item missing, or a required readings collection is empty | The explicit application error shown below |

```json
{
  "detail": "An error occured"
}
```

The spelling above matches the current implementation. DynamoDB errors and malformed cache records are not converted into this JSON error by the handler, so callers should not assume every failure has the same body. Infrastructure failures can also produce gateway errors.

## Data source and freshness

The API reads the DynamoDB item with numeric key `id = 0` using a strongly consistent read. The table name comes from `PSI_TABLE_NAME`, populated by the SAM parameter `PsiDataTableName` (default: `psi_data`). The code currently selects the AWS region `ap-southeast-1` explicitly.

The sibling [refresher application](../refresher/template.yaml) owns that table and writes snapshots from the data.gov.sg PSI and PM2.5 APIs. Its schedule runs every fifteen minutes at minutes 2, 17, 32, and 47 of each hour. Deploying the API alone does not populate the cache; the refresher must have completed a successful run.

The API makes no OneMap or data.gov.sg request per HTTP call. It calculates the cached PSI timestamp's age but currently does not reject stale readings or refresh them. The response does not include a timestamp, so clients cannot determine freshness from this response alone.

## Relationship to saved locations

A location-creation flow can temporarily use geocoded coordinates to call this API, then store `region_info` as the location's `region`. Coordinates do not need to be persisted in the locations table. Reusing an existing postal-code-to-region mapping is the caller's responsibility; this API does not query `LocationsTable` or its postal-code index.

The current HTTP endpoint still requires coordinates on every call. It has no route for fetching readings directly by region or `locId`.

## Local development

From this directory, with Python 3.14+, `uv`, AWS credentials, and a populated DynamoDB cache available:

```bash
cd psi
AWS_PROFILE=nus PSI_TABLE_NAME=psi_data uv run uvicorn main:app --reload
```

Call the local endpoint at `http://127.0.0.1:8000/api/psi`. This still reads the configured AWS DynamoDB table; it does not create a local database.

FastAPI's documentation is available locally at `/docs` and its schema at `/openapi.json`. The deployed SAM route only forwards `/api/{proxy+}`, so those root-level documentation routes are not exposed by the current template.

The checked-in `events/event.json` still describes the sample `/hello` request; it is not a valid example of a successful PSI request.
