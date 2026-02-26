import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def check_pol_loop_nodes():
    """Check POLLLLLL and LOOPPPPP nodes specifically"""
    
    async with engine.begin() as conn:
        # Check the specific nodes
        result = await conn.execute(text("""
            SELECT id, node_key, device_label, device_type, analytics_type, status, 
                   lat, long, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            WHERE node_key IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY node_key
        """))
        nodes = result.fetchall()
        
        print("🔍 POLLLLLL & LOOPPPPP Analysis:")
        for node in nodes:
            print(f"  📋 {node.node_key}:")
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
        
        # Check all nodes with location data
        result2 = await conn.execute(text("""
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN lat IS NOT NULL AND long IS NOT NULL THEN 1 END) as with_location,
                   COUNT(CASE WHEN thingspeak_channel_id IS NOT NULL THEN 1 END) as with_thingspeak
            FROM nodes
        """))
        stats = result.fetchone()
        print(f"\n📊 Database Statistics:")
        print(f"  Total nodes: {stats[0] if stats else 0}")
        print(f"  With location: {stats[1] if len(stats) > 1 else 0}")
        print(f"  With ThingSpeak: {stats[2] if len(stats) > 2 else 0}")

if __name__ == "__main__":
    asyncio.run(check_pol_loop_nodes())
