import math
import threading
import time
from typing import List, Dict, Any, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor

# Pseudocode placeholders for moondream usage
import moondream as md
from PIL import Image

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the great-circle distance between two points on Earth (in kilometers).
    """
    R = 6371.0  # Earth radius in km
    lat_rad1, lon_rad1 = math.radians(lat1), math.radians(lon1)
    lat_rad2, lon_rad2 = math.radians(lat2), math.radians(lon2)

    delta_lat = lat_rad2 - lat_rad1
    delta_lon = lon_rad2 - lon_rad1
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat_rad1) * math.cos(lat_rad2) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def simple_text_similarity(a: str, b: str) -> float:
    """
    A naive text similarity measure; replace with more advanced
    (e.g., embeddings from the moondream model) for better merging.
    """
    set_a = set(a.lower().split())
    set_b = set(b.lower().split())
    return len(set_a.intersection(set_b)) / (max(len(set_a), len(set_b)) + 1e-9)

class Observation:
    """
    Holds a single environment observation.
    """
    def __init__(self, environment: str, urgency: int, sources: List[Dict[str, Any]]):
        self.environment = environment
        self.urgency = urgency
        # For transparency: store all references that reported this observation
        self.sources = sources  # e.g. [{"time":..., "lat":..., "lon":..., "frame_id":...}, ...]

class GeoBin:
    """
    Stores Observations in a particular geospatial bin. 
    Allows merging of similar observations.
    """
    def __init__(self):
        # list of Observation objects
        self.observations: List[Observation] = []
        # Protect writes with a lock
        self.lock = threading.Lock()

    def merge_or_add_observation(self, new_obs: Observation, sim_threshold: float = 0.6):
        """
        Merge new_obs into existing if similarity >= sim_threshold; else add new entry.
        """
        with self.lock:
            for existing in self.observations:
                sim = simple_text_similarity(existing.environment, new_obs.environment)
                if sim >= sim_threshold:
                    # Merge logic: combine sources, possibly average or max urgency
                    existing.sources.extend(new_obs.sources)
                    existing.urgency = max(existing.urgency, new_obs.urgency)
                    return
            # If not merged, store as a new distinct observation
            self.observations.append(new_obs)

class HierarchicalGeoStore:
    """
    Maintains multiple radii bins for each location.
    Example radii: 0.1 km, 1 km, 10 km, ...
    """
    def __init__(self, radius_levels: List[float] = [0.1, 1.0, 10.0]):
        self.radius_levels = radius_levels  # in km
        # Dictionary: key=(center_lat, center_lon, radius), value=GeoBin
        self.bins: Dict[Tuple[float, float, float], GeoBin] = {}
        self.lock = threading.Lock()

    def _get_bin_keys(self, lat: float, lon: float) -> List[Tuple[float, float, float]]:
        """
        For a given lat, lon, produce a list of bin-keys that point to 
        hierarchical radius coverage. For simplicity, we store each new lat/lon
        as "center" for each radius in radius_levels. Alternatively, you can
        store discrete cell centers (like geohashes).
        """
        # Here we just do (lat, lon) as center with each radius. This is one approach.
        # Another approach is to do round lat/lon to specific increments to avoid explosion.
        keys = []
        for r in self.radius_levels:
            keys.append((round(lat, 3), round(lon, 3), r))  # e.g. rounding to reduce collisions
        return keys

    def add_observation(self, lat: float, lon: float, obs: Observation):
        """
        Place the observation into each relevant bin for lat/lon across radius_levels.
        In a more advanced system, you might find "nearby bin centers" 
        rather than creating new ones each time.
        """
        with self.lock:
            bin_keys = self._get_bin_keys(lat, lon)
            for bk in bin_keys:
                if bk not in self.bins:
                    self.bins[bk] = GeoBin()
                self.bins[bk].merge_or_add_observation(obs)

    def query_bins(self) -> Dict[Tuple[float, float, float], List[Observation]]:
        """
        Return a snapshot of all bin data. 
        """
        with self.lock:
            result = {}
            for k, geo_bin in self.bins.items():
                # copy observations to avoid external modifications
                with geo_bin.lock:
                    result[k] = list(geo_bin.observations)
            return result


class VideoAnalyzer:
    """
    Coordinates the ingestion of a video stream, calling moondream on each frame,
    extracting environment info, and updating the HierarchicalGeoStore.
    """
    def __init__(self, model_path: str = "moondream-0_5b-int8.mf"):
        self.model = md.vl(model=model_path)
        self.geo_store = HierarchicalGeoStore()

    def process_frame(self, frame_id: int, image_path: str, lat: float, lon: float, timestamp: float):
        """
        Process a single frame: 
        1) Use MoonDream to get environment data 
        2) Create an Observation 
        3) Insert into geo_store
        """
        # Load image
        image = Image.open(image_path)
        encoded_image = self.model.encode_image(image)

        # Example query for environment-only analysis
        # You can adapt the prompt as needed to exclude personal data
        prompt = """Describe what you see in JSON { "answer": <response> }. keep concise."""

        response = self.model.query(encoded_image, "Concisely describe what is in this image?")
        print("ANSWER: ", response)
        ans = response["answer"]  # e.g. a JSON string or direct dict

        # Suppose you parse the JSON
        # e.g. ans = '{"environment": "Flooded street", "urgency": 4}'
        # Use a simple approach to parse the JSON. (Pseudo-code, adapt as needed)
        import json
        parsed = json.loads(ans)

        print("PARSED: ", parsed)

        # Build the Observation
        new_observation = Observation(
            environment=parsed,
            urgency=3,
            sources=[{"time": timestamp, "lat": lat, "lon": lon, "frame_id": frame_id}]
        )

        print("NEW OBSERVATION: ", new_observation)

        # Store it
        self.geo_store.add_observation(lat, lon, new_observation)

    def process_video(self, frames: List[Dict[str, Any]], max_workers: int = 4):
        """
        frames: list of dict like {"frame_id": int, "path": str, "lat": float, "lon": float, "time": float}
        Process them in parallel for maximum throughput.
        """
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for f in frames:
                executor.submit(
                    self.process_frame,
                    f["frame_id"], f["path"], f["lat"], f["lon"], f["time"]
                )

    def get_geo_snapshot(self) -> Dict[Tuple[float, float, float], List[Observation]]:
        """
        Get a snapshot of the entire hierarchical store.
        Keys are (lat, lon, radius), and each value is a list of Observations.
        """
        return self.geo_store.query_bins()

# -----------------------------------------------------------------------
# EXAMPLE USAGE
# -----------------------------------------------------------------------
if __name__ == "__main__":
    analyzer = VideoAnalyzer("moondream-0_5b-int8.mf")

    # Simulate a set of frames from a video, each with a coordinate + timestamp
    frames = [
        {"frame_id": 1, "path": "man.webp", "lat": 37.7749, "lon": -122.4194, "time": time.time()},
        {"frame_id": 2, "path": "man.webp", "lat": 37.76, "lon": -122.4194, "time": time.time()},
        {"frame_id": 3, "path": "man.webp", "lat": 37.7800, "lon": -122.4200, "time": time.time()},
    ]

    # Process frames in parallel
    analyzer.process_video(frames, max_workers=4)

    # After everything is processed, retrieve snapshot
    aggregated_data = analyzer.get_geo_snapshot()

    # Example: print out the stored observations
    for key, observations in aggregated_data.items():
        print(f"Bin center/radius: {key}")
        for obs in observations:
            print(f"  Environment: {obs.environment}, Urgency: {obs.urgency}, #Sources: {len(obs.sources)}")
            # Each source is a record of where & when we saw it
            for s in obs.sources:
                print(f"    -> {s}")
