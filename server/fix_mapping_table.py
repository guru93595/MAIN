import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def fix_mapping_table():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Fixing ThingSpeak mappings for node: {node.id}")
        
        # Delete existing mappings
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add new mapping with working channel
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="12397",  # Working public channel
            read_api_key="",  # Public channel doesn't need API key
            write_api_key="",
            field_mapping={
                "field1": "depth",  # Map field1 to depth for water level
                "field2": "flow_rate"  # Map field2 to flow rate
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("ThingSpeak mappings updated successfully!")

if __name__ == "__main__":
    asyncio.run(fix_mapping_table())
