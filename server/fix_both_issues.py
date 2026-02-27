import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def fix_field_mapping():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Fixing field mapping for node: {node.id}")
        
        # Delete existing mapping
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add correct mapping with proper field mapping
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="2613742",
            read_api_key="UXORK5OUGJ2VK5PX",  # Use the node's API key
            write_api_key="",
            field_mapping={
                "field1": "depth",      # field1 is depth
                "field2": "distance"    # field2 is distance
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("Field mapping fixed successfully!")

if __name__ == "__main__":
    asyncio.run(fix_field_mapping())
