"""Fix field mapping for ALL TANKS to correctly map ThingSpeak fields.

CRITICAL FIELD MAPPING:
- field1 = Temperature (NEVER USE FOR TANK LEVEL)
- field2 = Distance (ALWAYS USE FOR TANK LEVEL)

The field_mapping MUST be:
- field2 -> distance

Run this script to fix the mapping in the database for ALL tank devices.
"""
import asyncio
import sys
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def fix_tank_field_mapping():
    """Fix field mapping for the tank to correctly read distance data."""
    async with AsyncSessionLocal() as session:
        # Find the BAKUL TANK node by node_key or label
        result = await session.execute(
            select(Node).where(
                (Node.node_key == "EV TANK 01") | 
                (Node.label.contains("BAKUL")) |
                (Node.label.contains("Bakul"))
            )
        )
        node = result.scalar_one_or_none()
        
        if not node:
            # Try to find any EvaraTank node
            result = await session.execute(
                select(Node).where(Node.analytics_type == "EvaraTank")
            )
            nodes = result.scalars().all()
            if nodes:
                print(f"Found {len(nodes)} EvaraTank node(s):")
                for n in nodes:
                    print(f"  - ID: {n.id}, Key: {n.node_key}, Label: {n.label}")
                node = nodes[0]
            else:
                print("❌ No EvaraTank nodes found in database")
                return
        
        print(f"✓ Found node: {node.id}")
        print(f"  Label: {node.label}")
        print(f"  Node Key: {node.node_key}")
        
        # Delete existing mappings
        result = await session.execute(
            delete(DeviceThingSpeakMapping).where(DeviceThingSpeakMapping.device_id == node.id)
        )
        deleted_count = result.rowcount
        print(f"✓ Deleted {deleted_count} existing mapping(s)")
        
        # Get ThingSpeak credentials from node or use provided values
        channel_id = node.thingspeak_channel_id or "2613746"
        read_api_key = node.thingspeak_read_api_key or "HFNHKPM6Z9X3M2F5"
        
        print(f"\n📡 ThingSpeak Configuration:")
        print(f"  Channel ID: {channel_id}")
        print(f"  Read API Key: {'*' * (len(read_api_key) - 4)}{read_api_key[-4:]}")
        
        # Create new mapping with CORRECT field mapping
        # CRITICAL: field2 contains distance (cm from sensor to water surface)
        # field1 contains temperature - DO NOT USE FOR TANK LEVEL
        import uuid
        new_mapping = DeviceThingSpeakMapping(
            id=str(uuid.uuid4()),
            device_id=node.id,
            channel_id=channel_id,
            read_api_key=read_api_key,
            write_api_key="",
            field_mapping={
                "field2": "distance"  # Map field2 to distance (NEVER use field1!)
            }
        )
        
        session.add(new_mapping)
        await session.commit()
        
        print(f"\n✅ Field mapping updated successfully!")
        print(f"   field2 -> distance (Temperature in field1 is IGNORED)")
        print(f"\n📊 Calculation Logic:")
        print(f"   Water Height = Tank Height - Sensor Distance")
        print(f"   Percentage = (Water Height / Tank Height) * 100")
        print(f"\nExample with your data:")
        print(f"   Tank Height: 163 cm (1.63m)")
        print(f"   Sensor Distance: 46 cm")
        print(f"   Water Height: 163 - 46 = 117 cm")
        print(f"   Percentage: 117/163 * 100 = 71.8%")

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing ThingSpeak Field Mapping for Tank")
    print("=" * 60)
    asyncio.run(fix_tank_field_mapping())
