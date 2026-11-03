import boto3
from pathlib import Path
import json
from decimal import Decimal

def convert_floats_to_decimals(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    return obj

# Connect to local DynamoDB
ddb = boto3.resource('dynamodb', endpoint_url='http://localhost:8000', region_name='ap-southeast-1')

users_table = ddb.Table('users')
locations_table = ddb.Table('locations-local')

# Load your demo data
with open("demo-data.json", 'r') as f:
    data = json.load(f)

# Insert Locations
for loc in data['locations']:
    clean_loc = convert_floats_to_decimals(loc)
    locations_table.put_item(Item=clean_loc)

# Insert Users (Initialize alertState as empty dict if missing)
for user in data['users']:
    if 'alertState' not in user:
        user['alertState'] = {}
    users_table.put_item(Item=user)

print("Local tables seeded successfully.")