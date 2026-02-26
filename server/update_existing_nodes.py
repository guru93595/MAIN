import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def update_existing_nodes():
    """Update POLLLLLL and LOOPPPPP nodes with ThingSpeak data"""
    
    async with engine.begin() as conn:
        # Check current state of POLLLLLL and LOOPPPPP
        result = await conn.execute(text("""
            SELECT id, hardware_id, device_label, device_type, analytics_type, status, 
                   lat, long, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            WHERE hardware_id IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY hardware_id
        """))
        nodes = result.fetchall()
        
        print("🔍 Current state of POLLLLLL and LOOPPPPP:")
        for node in nodes:
            print(f"  📋 {node.hardware_id}:")
            print(f"    ID: {node.id}")
            print(f"    Label: {node.device_label}")
            print(f"    Type: {node.device_type}")
            print(f"    Analytics: {node.analytics_type}")
            print(f"    Status: {node.status}")
            print(f"    Location: {node.location_name}")
            print(f"    Lat/Lng: {node.lat}, {node.long}")
            print(f"    Channel ID: {node.thingspeak_channel_id}")
            print(f"    API Key: {'✅ Set' if node.thingspeak_read_api_key else '❌ Missing'}")
            print()
        
        # Update POLLLLLL with ThingSpeak data
        await conn.execute(text("""
            UPDATE nodes 
            SET device_label = 'MAIN TANK',
                device_type = 'OverheadTank',
                analytics_type = 'EvaraTank',
                status = 'Online',
                lat = 17.44,
                long = 78.34,
                location_name = 'Main Water Tank - POLLLLLL',
                capacity = '5000L',
                thingspeak_channel_id = '1234567',
                thingspeak_read_api_key = 'ABCDEFGHIJK1234567890'
            WHERE hardware_id = 'POLLLLLL'
        """))
        
        # Update LOOPPPPP with ThingSpeak data
        await conn.execute(text("""
            UPDATE nodes 
            SET device_label = 'KRB TANK',
                device_type = 'OverheadTank',
                analytics_type = 'EvaraTank',
                status = 'Online',
                lat = 17.44,
                long = 78.34,
                location_name = 'KRB Water Tank - LOOPPPPP',
                capacity = '3000L',
                thingspeak_channel_id = '2345678',
                thingspeak_read_api_key = 'LMNOPQRSTUVWXYZ123456789'
            WHERE hardware_id = 'LOOPPPPP'
        """))
        
        print("✅ Updated POLLLLLL and LOOPPPPP nodes:")
        print("  📋 POLLLLLL: Main Water Tank (Channel: 1234567)")
        print("  📋 LOOPPPPP: KRB Water Tank (Channel: 2345678)")
        
        # Verify the updates
        result2 = await conn.execute(text("""
            SELECT hardware_id, device_label, thingspeak_channel_id, lat, long
            FROM nodes 
            WHERE hardware_id IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY hardware_id
        """))
        updated_nodes = result2.fetchall()
        
        print("\n🔍 Verification:")
        for node in updated_nodes:
            print(f"  ✅ {node.hardware_id}: {node.device_label}")
            print(f"     Channel: {node.thingspeak_channel_id}")
            print(f"     Location: {node.lat}, {node.long}")

if __name__ == "__main__":
    asyncio.run(update_existing_nodes())
