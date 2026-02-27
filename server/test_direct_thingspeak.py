import asyncio
import httpx

async def test_direct_thingspeak():
    """Test direct ThingSpeak API calls with different approaches"""
    
    channel_id = "2613742"
    api_key = "UXORK5OUGJ2VK5PX"
    base_url = "https://api.thingspeak.com"
    
    async with httpx.AsyncClient() as client:
        print("=== Testing Direct ThingSpeak Access ===")
        
        # Test 1: Try without API key (public channel)
        print("\n1. Testing without API key:")
        try:
            url = f"{base_url}/channels/{channel_id}/feeds.json"
            params = {"results": 1}
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:300]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 2: Try with API key in URL (alternative format)
        print("\n2. Testing with API key in URL:")
        try:
            url = f"{base_url}/channels/{channel_id}/feeds.json?api_key={api_key}&results=1"
            response = await client.get(url, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:300]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 3: Try channel info first
        print("\n3. Testing channel info:")
        try:
            url = f"{base_url}/channels/{channel_id}.json"
            params = {}
            if api_key:
                params["api_key"] = api_key
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:300]}...")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Test 4: Try different API endpoint format
        print("\n4. Testing field endpoint:")
        try:
            url = f"{base_url}/channels/{channel_id}/field/1.json"
            params = {"results": 1}
            if api_key:
                params["api_key"] = api_key
            response = await client.get(url, params=params, timeout=10)
            print(f"   Status: {response.status_code}")
            print(f"   Body: {response.text[:300]}...")
        except Exception as e:
            print(f"   Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_direct_thingspeak())
