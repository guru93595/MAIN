import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def fix_distance_mapping():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Updating field mapping for distance: {node.id}")
        
        # Delete existing mapping
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add updated mapping with field2 as distance
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="2613742",
            read_api_key="62F6TBQDV5GCQGDU",
            write_api_key="",
            field_mapping={
                "field1": "depth",      # field1 is water level/depth
                "field2": "distance"    # field2 is distance (as requested)
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("Field mapping updated: field2 -> distance")

if __name__ == "__main__":
    asyncio.run(fix_distance_mapping())
