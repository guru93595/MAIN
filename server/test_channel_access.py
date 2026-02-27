import asyncio
import httpx

async def test_channel_access():
    """Test different ways to access the ThingSpeak channel"""
    
    base_url = "https://api.thingspeak.com"
    channel_id = "2613742"
    api_key = "UXORK5OUGJ2VK5PX"
    
    async with httpx.AsyncClient() as client:
        print("=== Testing ThingSpeak Channel Access ===")
        
        # Test 1: Channel info (no API key needed for public channels)
        print("\n1. Testing channel info (public):")
        try:
            url = f"{base_url}/channels/{channel_id}.json"
            response = await client.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 2: Channel info with API key
        print("\n2. Testing channel info (with API key):")
        try:
            url = f"{base_url}/channels/{channel_id}.json"
            params = {"api_key": api_key}
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 3: Feeds without API key
        print("\n3. Testing feeds (no API key):")
        try:
            url = f"{base_url}/channels/{channel_id}/feeds.json"
            params = {"results": 1}
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 4: Feeds with API key
        print("\n4. Testing feeds (with API key):")
        try:
            url = f"{base_url}/channels/{channel_id}/feeds.json"
            params = {"api_key": api_key, "results": 1}
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:200]}...")
        except Exception as e:
            print(f"   Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_channel_access())
