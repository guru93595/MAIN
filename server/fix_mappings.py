import asyncio
import json
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, update
from app.models.all_models import Node

async def fix_mappings():
    async with AsyncSessionLocal() as session:
        # Get the node
        result = await session.execute(select(Node))
        node = result.scalar_one_or_none()
        
        if not node:
            print("No node found")
            return
            
        print(f"Fixing mappings for node: {node.id}")
        
        # Update the thingspeak_mappings to use the working channel
        new_mappings = [
            {
                "channel_id": "12397",  # Working public channel
                "read_api_key": "",  # Public channel doesn't need API key
                "write_api_key": "",
                "field_mapping": {
                    "field1": "depth",  # Map field1 to depth for water level
                    "field2": "flow_rate"  # Map field2 to flow rate
                }
            }
        ]
        
        await session.execute(
            update(Node)
            .where(Node.id == node.id)
            .values(
                thingspeak_mappings=json.dumps(new_mappings)
            )
        )
        
        await session.commit()
        print("ThingSpeak mappings updated!")

if __name__ == "__main__":
    asyncio.run(fix_mappings())
