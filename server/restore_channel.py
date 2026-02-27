import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def restore_channel():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Restoring ThingSpeak channel 2613742 for node: {node.id}")
        
        # Update main node record
        from sqlalchemy import update
        await session.execute(
            update(Node)
            .where(Node.id == node.id)
            .values(
                thingspeak_channel_id="2613742",
                thingspeak_read_api_key="UXORK5OUGJ2VK5PX"
            )
        )
        
        # Delete existing mappings
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add correct mapping with original channel
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="2613742",  # Original channel
            read_api_key="UXORK5OUGJ2VK5PX",  # Original API key
            write_api_key="",
            field_mapping={
                "field1": "depth",
                "field2": "flow_rate"
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("Original ThingSpeak channel restored!")

if __name__ == "__main__":
    asyncio.run(restore_channel())
