import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def use_public_channel():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Updating to public channel for node: {node.id}")
        
        # Update node to use public channel
        await session.execute(
            update(Node).where(Node.id == node.id).values(
                thingspeak_channel_id="12397",  # Public working channel
                thingspeak_read_api_key=""  # No API key needed for public channel
            )
        )
        
        # Delete existing mapping
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add new mapping for public channel
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="12397",
            read_api_key="",  # Public channel, no API key
            write_api_key="",
            field_mapping={
                "field1": "depth",      # field1 is depth
                "field2": "distance"    # field2 is distance
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("Updated to public channel successfully!")

if __name__ == "__main__":
    asyncio.run(use_public_channel())
