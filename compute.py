import requests
import json

# Read complaints from computed.json
with open('computed.json', 'r') as f:
    complaints = json.load(f)

for i, complaint in enumerate(complaints):
    if complaint.get("coordinates") is None:
        response = requests.get(f"https://api.mapbox.com/search/geocode/v6/forward?q={complaint['location']} San Francisco&access_token=pk.eyJ1IjoicmFqYW5hZ2Fyd2FsIiwiYSI6ImNsZ3U5aDlpaDB1aWUzanA1dzduZWg5b3QifQ.XJMZyFbKT4MjvxsUR8P93g")
        result = response.json()
        coords = result["features"][0]["geometry"]["coordinates"]
        latitude = coords[1]
        longitude = coords[0]
        complaints[i]["coordinates"] = [latitude, longitude]

# Write updated complaints back to computed.json
with open('computed.json', 'w') as f:
    json.dump(complaints, f, indent=2)