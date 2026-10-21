from pathlib import Path
import json

# Load demo data ONCE at startup
DEMO_DATA_PATH = Path(__name__).parent.parent.parent / "users" / "demo-data.json"
with open(DEMO_DATA_PATH) as f:
    _demo_data = json.load(f)

# Build a lookup dict keyed by userId (matching your store.get() interface)
DEMO_STORE = {user["userId"]: user for user in _demo_data["users"]}