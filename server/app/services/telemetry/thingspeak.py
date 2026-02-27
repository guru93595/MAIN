import httpx
import asyncio
from typing import Dict, Any, List, Optional
from app.services.telemetry.base import BaseTelemetryService
from app.core.config import get_settings

settings = get_settings()

class ThingSpeakTelemetryService(BaseTelemetryService):
    """
    ThingSpeak implementation of Telemetry Service.
    """
    BASE_URL = "https://api.thingspeak.com"

    async def fetch_latest(self, node_id: str, config: Any) -> Dict[str, Any]:
        """
        Fetch latest reading from ThingSpeak Channel(s).
        Config can be a single dict or a list of dicts.
        """
        if isinstance(config, dict):
            configs = [config]
        elif isinstance(config, list):
            configs = config
        else:
            return {}
            
        if not configs:
            return {}
        
        async with httpx.AsyncClient() as client:
            try:
                tasks = []
                for cfg in configs:
                    # Build URL properly for ThingSpeak API
                    url = f"{self.BASE_URL}/channels/{cfg.get('channel_id')}/feeds.json"
                    params = {"results": 1}
                    
                    # Only add API key if it exists and is not empty
                    if cfg.get("read_key"):
                        params["api_key"] = cfg.get("read_key")
                    
                    print(f"Fetching ThingSpeak data: URL={url}, params={params}")
                    tasks.append(client.get(url, params=params, timeout=10.0))
                
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                merged_raw = {}
                for resp in responses:
                    if isinstance(resp, Exception):
                        print(f"Exception in response: {resp}")
                        continue
                    
                    print(f"Response status: {resp.status_code}")
                    if resp.status_code != 200:
                        print(f"Response body: {resp.text}")
                        continue
                    
                    data = resp.json()
                    print(f"Response data: {data}")
                    feeds = data.get("feeds", [])
                    if not feeds:
                        print("No feeds in response")
                        continue
                    
                    latest = feeds[0]
                    print(f"Latest feed: {latest}")
                    if not merged_raw:
                        merged_raw = latest.copy()
                    else:
                        for k, v in latest.items():
                            if k.startswith("field") and v is not None:
                                if k not in merged_raw or merged_raw[k] in [None, "0", 0]:
                                    merged_raw[k] = v

                if not merged_raw:
                    print("No merged data available")
                    return {}

                combined_mapping = {}
                for cfg in configs:
                    combined_mapping.update(cfg.get("field_mapping", {}))

                return self._normalize_reading(merged_raw, combined_mapping)
            except Exception as e:
                print(f"Error fetching ThingSpeak data for {node_id}: {e}")
                return {}

    async def fetch_history(self, node_id: str, config: Dict[str, Any], days: int = 1) -> List[Dict[str, Any]]:
        """
        Fetch historical data and apply mapping.
        """
        channel_id = config.get("channel_id")
        read_key = config.get("read_key")
        mapping = config.get("field_mapping", {})
            
        if not channel_id:
            return []
                
        url = f"{self.BASE_URL}/channels/{channel_id}/feeds.json"
        params = {"days": days}
            
        # Only add API key if it exists and is not empty
        if read_key:
            params["api_key"] = read_key
            
        print(f"Fetching ThingSpeak history: URL={url}, params={params}")
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                print(f"History response status: {response.status_code}")
                    
                if response.status_code != 200:
                    print(f"History response body: {response.text}")
                    return []
                        
                data = response.json()
                print(f"History response data keys: {list(data.keys()) if data else 'None'}")
                    
                feeds = data.get("feeds", [])
                print(f"History feeds count: {len(feeds)}")
                    
                return [self._normalize_reading(f, mapping) for f in feeds]
            except Exception as e:
                print(f"Error fetching ThingSpeak history for {node_id}: {e}")
                return []
    
    async def fetch_last_n(self, node_id: str, config: Dict[str, Any], count: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch the last N readings from ThingSpeak.
        Returns readings in chronological order (oldest first).
            
        CRITICAL: For tanks, only field2 contains distance data.
        """
        channel_id = config.get("channel_id")
        read_key = config.get("read_key")
        mapping = config.get("field_mapping", {})
            
        if not channel_id:
            return []
                
        url = f"{self.BASE_URL}/channels/{channel_id}/feeds.json"
        params = {"results": count}
            
        if read_key:
            params["api_key"] = read_key
            
        print(f"Fetching last {count} ThingSpeak readings: URL={url}")
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                    
                if response.status_code != 200:
                    print(f"Error response: {response.text}")
                    return []
                        
                data = response.json()
                feeds = data.get("feeds", [])
                    
                print(f"Got {len(feeds)} feeds for last-{count} request")
                    
                # Normalize each feed and sort chronologically (oldest first for charts)
                normalized = [self._normalize_reading(f, mapping) for f in feeds]
                    
                # Sort by timestamp (oldest first for proper chart display)
                normalized.sort(key=lambda x: x.get("timestamp", ""))
                    
                return normalized
            except Exception as e:
                print(f"Error fetching last {count} readings for {node_id}: {e}")
                return []

    def _normalize_reading(self, raw: Dict[str, Any], mapping: Dict[str, str]) -> Dict[str, Any]:
        """Convert ThingSpeak field1..N to named keys based on field_mapping.
        
        CRITICAL FIELD MAPPING FOR TANKS:
        - field1 = Temperature (NEVER use for tank level)
        - field2 = Distance (ALWAYS use for tank level)
        
        The mapping should be: {"field2": "distance"}
        """
        normalized = {
            "timestamp": raw.get("created_at"),
            "entry_id": raw.get("entry_id")
        }
        
        # Apply Mapping: e.g. {"field2": "distance"} -> normalized["distance"] = raw["field2"]
        for ts_field, alias in mapping.items():
            if ts_field in raw:
                try:
                    val = raw[ts_field]
                    # Try to convert to float/int if numeric
                    if val is not None and isinstance(val, str):
                        if '.' in val: val = float(val)
                        else: val = int(val)
                    normalized[alias] = val
                except ValueError:
                    normalized[alias] = raw[ts_field]
        
        # ALWAYS include raw fields so frontend can access field2 directly as fallback
        # This ensures tank level calculation works even if DB mapping is wrong
        for i in range(1, 9):
            key = f"field{i}"
            if key in raw and raw[key] is not None:
                try:
                    val = raw[key]
                    if isinstance(val, str):
                        if '.' in val: val = float(val)
                        else: val = int(val)
                    normalized[key] = val
                except ValueError:
                    normalized[key] = raw[key]
                    
        return normalized

    async def push_reading(self, device_id: str, data: Dict[str, Any]) -> bool:
        """Push a reading to the downstream storage (DB/TimeScale)."""
        # Typically ThingSpeak is used as a source, not a sink in this architecture.
        # But to satisfy the BaseTelemetryService we implement it.
        return True
