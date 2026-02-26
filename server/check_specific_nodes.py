import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def check_specific_nodes():
    """Check the specific nodes mentioned by user"""
    
    async with engine.begin() as conn:
        # Check POLLLLLL and LOOPPPPP nodes
        result = await conn.execute(text("""
            SELECT id, node_key, label, category, analytics_type, status, 
                   lat, lng, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            WHERE node_key IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY node_key
        """))
        nodes = result.fetchall()
        
        print("🔍 Specific Nodes Check:")
        for node in nodes:
            print(f"  📋 {node.node_key}:")
            print(f"    ID: {node.id}")
            print(f"    Label: {node.label}")
            print(f"    Category: {node.category}")
            print(f"    Analytics: {node.analytics_type}")
            print(f"    Status: {node.status}")
            print(f"    Location: {node.location_name}")
            print(f"    Lat/Lng: {node.lat}, {node.lng}")
            print(f"    Channel ID: {node.thingspeak_channel_id}")
            print(f"    API Key: {'✅ Set' if node.thingspeak_read_api_key else '❌ Missing'}")
            print()
        
        # Check if they have location data but might be filtered out
        result2 = await conn.execute(text("""
            SELECT COUNT(*) as total_nodes,
                   COUNT(CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN 1 END) as nodes_with_location
            FROM nodes
        """))
        stats = result.fetchone()
        print(f"\n📊 Location Statistics:")
        print(f"  Total nodes: {stats.total_nodes}")
        print(f"  Nodes with location: {stats.nodes_with_location}")
        print(f"  Nodes without location: {stats.total_nodes - stats.nodes_with_location}")

if __name__ == "__main__":
    asyncio.run(check_specific_nodes())
