import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update
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
        
        # Update the thingspeak_mapping with proper field mapping
        from sqlalchemy import delete
        await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        
        # Add correct mapping with proper field mapping
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id="2613742",
            read_api_key="62F6TBQDV5GCQGDU",  # Using the API key from the node
            write_api_key="",
            field_mapping={
                "field1": "depth",  # Map field1 to depth for water level
                "field2": "flow_rate"  # Map field2 to flow rate
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        print("Field mapping updated successfully!")

if __name__ == "__main__":
    asyncio.run(fix_field_mapping())
