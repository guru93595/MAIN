import asyncio
from app.services.telemetry.thingspeak import ThingSpeakTelemetryService

async def test_original_channel():
    service = ThingSpeakTelemetryService()
    
    # Test with the original channel
    config = {
        "channel_id": "2613742",
        "read_key": "UXORK5OUGJ2VK5PX",
        "field_mapping": {
            "field1": "depth",
            "field2": "flow_rate"
        }
    }
    
    print("Testing original ThingSpeak channel 2613742...")
    try:
        latest = await service.fetch_latest("test_node", config)
        print(f"Latest data: {latest}")
        
        if not latest:
            print("No data received - trying without API key...")
            config_no_key = {
                "channel_id": "2613742",
                "read_key": "",
                "field_mapping": {
                    "field1": "depth",
                    "field2": "flow_rate"
                }
            }
            latest_no_key = await service.fetch_latest("test_node", config_no_key)
            print(f"Latest data without API key: {latest_no_key}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_original_channel())
