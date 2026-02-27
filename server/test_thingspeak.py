import asyncio
from app.services.telemetry.thingspeak import ThingSpeakTelemetryService

async def test_thingspeak():
    service = ThingSpeakTelemetryService()
    
    # Test with the public channel
    config = {
        "channel_id": "12397",
        "read_key": "",
        "field_mapping": {
            "field1": "depth",
            "field2": "flow_rate"
        }
    }
    
    print("Testing ThingSpeak data fetch...")
    latest = await service.fetch_latest("test_node", config)
    print(f"Latest data: {latest}")
    
    history = await service.fetch_history("test_node", config, days=1)
    print(f"History (first 3): {history[:3]}")

if __name__ == "__main__":
    asyncio.run(test_thingspeak())
