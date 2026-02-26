import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def check_existing_nodes():
    """Check what nodes actually exist"""
    
    async with engine.begin() as conn:
        # Check all nodes
        result = await conn.execute(text("""
            SELECT node_key, device_label, device_type, analytics_type, status, 
                   lat, long, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            ORDER BY node_key
            LIMIT 10
        """))
        nodes = result.fetchall()
        
        print("🔍 Existing Nodes (first 10):")
        if not nodes:
            print("  ❌ No nodes found!")
        else:
            for i, node in enumerate(nodes, 1):
                print(f"  {i}. {node.node_key}: {node.device_label} ({node.device_type})")
                print(f"     Status: {node.status}")
                print(f"     Location: {node.location_name}")
                print(f"     Lat/Lng: {node.lat}, {node.long}")
                print(f"     Channel: {node.thingspeak_channel_id}")
                print()

if __name__ == "__main__":
    asyncio.run(check_existing_nodes())
