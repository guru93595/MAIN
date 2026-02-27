"""
Fix field mapping for ALL EvaraTank devices in the database.

CRITICAL FIELD MAPPING:
======================
- field1 = Temperature (NEVER USE FOR TANK LEVEL)
- field2 = Distance (ALWAYS USE FOR TANK LEVEL)

This script will:
1. Find all EvaraTank devices
2. Update their field_mapping to: {"field2": "distance"}
3. Remove any incorrect field1 mappings

Run this script to fix ALL tank devices at once.
"""
import asyncio
import uuid
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, delete
from app.models.all_models import Node, DeviceThingSpeakMapping

async def fix_all_tank_mappings():
    """Fix field mapping for ALL EvaraTank devices."""
    async with AsyncSessionLocal() as session:
        # Find ALL EvaraTank nodes
        result = await session.execute(
            select(Node).where(Node.analytics_type == "EvaraTank")
        )
        tanks = result.scalars().all()
        
        if not tanks:
            print("❌ No EvaraTank nodes found in database")
            return
        
        print(f"✅ Found {len(tanks)} EvaraTank node(s)")
        print("=" * 60)
        
        updated_count = 0
        for node in tanks:
            print(f"\n📦 Processing: {node.label} (ID: {node.id})")
            print(f"   Node Key: {node.node_key}")
            
            # Get existing mapping
            mapping_result = await session.execute(
                select(DeviceThingSpeakMapping).where(
                    DeviceThingSpeakMapping.device_id == node.id
                )
            )
            existing_mappings = mapping_result.scalars().all()
            
            if not existing_mappings:
                # Check for root-level ThingSpeak config
                if node.thingspeak_channel_id:
                    print(f"   📡 Using root ThingSpeak config:")
                    print(f"      Channel: {node.thingspeak_channel_id}")
                    
                    # Create new mapping from root config
                    new_mapping = DeviceThingSpeakMapping(
                        id=str(uuid.uuid4()),
                        device_id=node.id,
                        channel_id=node.thingspeak_channel_id,
                        read_api_key=node.thingspeak_read_api_key or "",
                        write_api_key=node.thingspeak_write_api_key or "",
                        field_mapping={
                            "field2": "distance"  # ONLY field2 -> distance
                        }
                    )
                    session.add(new_mapping)
                    updated_count += 1
                    print(f"   ✅ Created new mapping: field2 -> distance")
                else:
                    print(f"   ⚠️ No ThingSpeak config found - skipping")
                continue
            
            # Update existing mappings
            for mapping in existing_mappings:
                old_mapping = mapping.field_mapping or {}
                print(f"   📊 Current mapping: {old_mapping}")
                
                # CRITICAL: Set ONLY field2 -> distance
                new_field_mapping = {
                    "field2": "distance"  # ONLY field2 -> distance, NEVER field1
                }
                
                mapping.field_mapping = new_field_mapping
                updated_count += 1
                print(f"   ✅ Updated to: {new_field_mapping}")
        
        await session.commit()
        
        print("\n" + "=" * 60)
        print(f"✅ COMPLETE: Updated {updated_count} mapping(s)")
        print("\n📊 FIELD MAPPING LOCKED:")
        print("   field1 = Temperature (IGNORED)")
        print("   field2 = Distance (USED) -> 'distance'")
        print("\n📐 CALCULATION:")
        print("   Water Height = Tank Height - Sensor Distance (field2)")
        print("   Percentage = (Water Height / Tank Height) * 100")

async def verify_mappings():
    """Verify all tank mappings are correct."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Node).where(Node.analytics_type == "EvaraTank")
        )
        tanks = result.scalars().all()
        
        print("\n📋 VERIFICATION:")
        print("=" * 60)
        
        for node in tanks:
            mapping_result = await session.execute(
                select(DeviceThingSpeakMapping).where(
                    DeviceThingSpeakMapping.device_id == node.id
                )
            )
            mappings = mapping_result.scalars().all()
            
            print(f"\n🔍 {node.label}")
            for m in mappings:
                fm = m.field_mapping or {}
                has_field2 = "field2" in fm and fm["field2"] == "distance"
                has_field1 = "field1" in fm
                
                if has_field2 and not has_field1:
                    print(f"   ✅ CORRECT: {fm}")
                elif has_field1:
                    print(f"   ❌ ERROR: Contains field1 mapping! {fm}")
                else:
                    print(f"   ⚠️ WARNING: Missing field2 -> distance: {fm}")

if __name__ == "__main__":
    print("=" * 60)
    print("FIXING ALL EVARATANK FIELD MAPPINGS")
    print("=" * 60)
    print("\nCRITICAL: field1=Temperature (IGNORED), field2=Distance (USED)")
    
    asyncio.run(fix_all_tank_mappings())
    asyncio.run(verify_mappings())
