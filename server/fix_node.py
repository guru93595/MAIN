import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update
from app.models.all_models import Node

async def fix_node():
    async with AsyncSessionLocal() as session:
        # Get the provisioning node
        result = await session.execute(select(Node).where(Node.status == "provisioning"))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No provisioning node found")
            return
            
        print(f"Updating node: {node.id}")
        
        # Update with ThingSpeak details from the image
        await session.execute(
            update(Node)
            .where(Node.id == node.id)
            .values(
                thingspeak_channel_id="2613742",
                thingspeak_read_api_key="UXORK5OUGJ2VK5PX",
                status="Online"
            )
        )
        
        await session.commit()
        print("Node updated successfully!")

if __name__ == "__main__":
    asyncio.run(fix_node())
