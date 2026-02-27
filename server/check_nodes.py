import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.all_models import Node

async def check_nodes():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Node))
        nodes = result.scalars().all()
        
        if not nodes:
            print("No nodes found in database")
            return
            
        print(f"Found {len(nodes)} nodes:")
        for node in nodes:
            print(f"ID: {node.id}")
            print(f"Label: {node.label}")
            print(f"Status: {node.status}")
            print(f"ThingSpeak Channel ID: {node.thingspeak_channel_id}")
            print(f"ThingSpeak Read API Key: {node.thingspeak_read_api_key}")
            print("-" * 40)

if __name__ == "__main__":
    asyncio.run(check_nodes())
