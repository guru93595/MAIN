import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update
from app.models.all_models import Node

async def update_channel():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Updating node: {node.id}")
        
        # Update with a working public ThingSpeak channel for testing
        await session.execute(
            update(Node)
            .where(Node.id == node.id)
            .values(
                thingspeak_channel_id="12397",  # Public weather station
                thingspeak_read_api_key="",  # Public channel doesn't need API key
                status="Online"
            )
        )
        
        await session.commit()
        print("Node updated with public channel!")

if __name__ == "__main__":
    asyncio.run(update_channel())
