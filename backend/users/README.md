# Users table

Here is an example user acc on DynamoDB structured in JSON:

```JSON
{
  "userId": "demo-user-one-place",
  "name": "Demo One Place",
  "setupComplete": true,
  "limits": {
    "psi24": 100,
    "pm25": 55
  },
  "channels": {
    "push": true,
    "email": false
  },
  "places": [
    {
      "locId": 1,
      "label": "Home",
      "type": "home",
      "limits": {
        "psi24": 80,
        "pm25": 40
      }
    }
  ]
}
```

Here are the fields:
* userId: UserID supplied from Cognito
* name: Username
* setupComplete: Whether user has completed setup.
* limits: Limits for user threshold
    * psi24
    * pm25
* channels: what kind of notifications user want to receive, should be boolean for both category
    * push: Push notifications on phone
    * email: email notifications
* places: list of places user has labelled. For each place, should hvae the following details
    * locId: Corresponding location ID in the location tables
    * label: Label given by user,
    * type: Place type, prototype list of location types:
        * Home
        * School
        * Office
        * Exercise
        * Others
    * limits: Limits for specific place
        * psi24
        * pm25

For limits here is what it means:
* psi24: 24hr psi reading
* pm25: 1hr PM2.5 reading

# Location Table

Here is an example of a location in the location table:

```JSON
{
  "locId": "39ae0a09-3210-4050-bf41-d3be0c55ce0a",
  "name": "Junction 8",
  "postalCode": "579837",
  "region": "central"
}
```

Here are the fields:
* locId: locationId, generate uuid when new location is added
* name: Name of place, should be provided by OneMap API as the user searches for the location
* postalCode: postal code of the location, provided by OneMap API, string is used to capture leading zeroes
* region: Region of the location, find closes region by invoking the psi api, which returns the region too!


