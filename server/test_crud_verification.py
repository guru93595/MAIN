import httpx
import asyncio
import json

BASE_URL = "http://localhost:8000/api/v1"

async def test_crud():
    async with httpx.AsyncClient() as client:
        # Note: In a real scenario, we need a token. 
        # Since I'm running this locally and have control, I'll skip auth if possible 
        # or use a mock token if the backend allows (it probably doesn't).
        # However, I can check the /health endpoint first.
        try:
            health = await client.get(f"{BASE_URL}/health")
            print(f"Health Check: {health.json()}")
        except Exception as e:
            print(f"Backend not reachable: {e}")
            return

        # Try to fetch nodes
        # This will likely fail with 401 if auth is strictly enforced
        nodes = await client.get(f"{BASE_URL}/nodes/")
        print(f"Nodes GET Status: {nodes.status_code}")
        if nodes.status_code == 200:
            print(f"Fetched {len(nodes.json())} nodes.")
        else:
            print(f"Nodes GET Error: {nodes.text}")

if __name__ == "__main__":
    asyncio.run(test_crud())
