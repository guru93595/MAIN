import httpx
from typing import Optional

class TelemetryService:
    @staticmethod
    async def verify_thingspeak_channel(channel_id: str, read_api_key: Optional[str] = None) -> bool:
        """
        Verifies if a ThingSpeak channel exists and is accessible.
        """
        # ThingSpeak JSON API endpoint for channel feed
        url = f"https://api.thingspeak.com/channels/{channel_id}/feeds.json"
        
        params = {}
        if read_api_key:
            params["api_key"] = read_api_key
        
        # We only need the latest 1 result to verify access
        params["results"] = 1

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params)
                # Success if status is 200
                return response.status_code == 200
            except Exception as e:
                print(f"ThingSpeak Handshake Error: {str(e)}")
                return False

    @staticmethod
    def validate_coordinates(lat: float, lng: float) -> bool:
        """
        Basic GeoJSON compatible coordinate validation.
        """
        if lat < -90 or lat > 90:
            return False
        if lng < -180 or lng > 180:
            return False
        return True
