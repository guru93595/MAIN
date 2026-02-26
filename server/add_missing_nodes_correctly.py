import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def add_missing_nodes_correctly():
    """Add POLLLLLL and LOOPPPPP nodes with correct field mapping"""
    
    async with engine.begin() as conn:
        # Add POLLLLLL (MAIN TANK) - matching existing format
        await conn.execute(text("""
            INSERT INTO nodes (
                id, node_key, device_label, device_type, analytics_type, status, 
                lat, long, location_name, capacity,
                thingspeak_channel_id, thingspeak_read_api_key, created_at, created_by
            ) VALUES (
                'pol-tank-003', 'POLLLLLL', 'MAIN TANK', 'OverheadTank', 'EvaraTank', 'Online',
                17.44, 78.34, 'Main Water Tank - POLLLLLL', '5000L',
                '1234567', 'ABCDEFGHIJK1234567890',
                'demo-user-001', CURRENT_TIMESTAMP
            )
        """))
        
        # Add LOOPPPPP (KRB TANK) - matching existing format  
        await conn.execute(text("""
            INSERT INTO nodes (
                id, node_key, device_label, device_type, analytics_type, status, 
                lat, long, location_name, capacity,
                thingspeak_channel_id, thingspeak_read_api_key, created_at, created_by
            ) VALUES (
                'krb-tank-003', 'LOOPPPPP', 'KRB TANK', 'OverheadTank', 'EvaraTank', 'Online',
                17.44, 78.34, 'KRB Water Tank - LOOPPPPP', '3000L',
                '2345678', 'LMNOPQRSTUVWXYZ123456789',
                'demo-user-001', CURRENT_TIMESTAMP
            )
        """))
        
        print("✅ Successfully added POLLLLLL and LOOPPPPP nodes:")
        print("  📋 POLLLLLL: pol-tank-003 (Channel: 1234567)")
        print("  📋 LOOPPPPP: krb-tank-003 (Channel: 2345678)")
        
        # Verify the nodes were added
        result = await conn.execute(text("""
            SELECT node_key, device_label, thingspeak_channel_id 
            FROM nodes 
            WHERE node_key IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY node_key
        """))
        nodes = result.fetchall()
        
        print("\n🔍 Verification:")
        for node in nodes:
            print(f"  ✅ {node.node_key}: {node.device_label} (Channel: {node.thingspeak_channel_id})")

if __name__ == "__main__":
    asyncio.run(add_missing_nodes_correctly())
