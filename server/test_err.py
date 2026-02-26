import asyncio
import httpx
import traceback

async def run():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://localhost:8000/api/v1/nodes/02761a1e-7443-4fb1-b1e4-bc738bcfa6aa")
            print(resp.status_code)
            print(resp.text)
        except Exception as e:
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
