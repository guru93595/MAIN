import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def add_nodes_with_existing_format():
    """Add nodes using existing database format"""
    
    async with engine.begin() as conn:
        # Check existing node format first
        result = await conn.execute(text("""
            SELECT id, node_key, device_label, device_type, analytics_type, status, 
                   lat, long, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key, created_at, created_by
            FROM nodes 
            WHERE node_key = 'ph-01'
            LIMIT 1
        """))
        existing = result.fetchone()
        
        if existing:
            print("🔍 Existing node format found:")
            print(f"  ID: {existing.id}")
            print(f"  Node Key: {existing.node_key}")
            print(f"  Device Label: {existing.device_label}")
            print(f"  Created At: {existing.created_at}")
            print(f"  Created By: {existing.created_by}")
            print()
            return
        
        # Add POLLLLLL using same format as existing nodes
        await conn.execute(text("""
            INSERT INTO nodes (
                id, node_key, device_label, device_type, analytics_type, status, 
                lat, long, location_name, capacity,
                thingspeak_channel_id, thingspeak_read_api_key, created_at, created_by
            ) VALUES (
                'pol-tank-002', 'POLLLLLL', 'MAIN TANK', 'OverheadTank', 'EvaraTank', 'Online',
                17.44, 78.34, 'Main Water Tank - POLLLLLL', '5000L',
                '1234567', 'ABCDEFGHIJK1234567890',
                'demo-user-001', CURRENT_TIMESTAMP
            )
        """))
        
        # Add LOOPPPPP using same format
        await conn.execute(text("""
            INSERT INTO nodes (
                id, node_key, device_label, device_type, analytics_type, status, 
                lat, long, location_name, capacity,
                thingspeak_channel_id, thingspeak_read_api_key, created_at, created_by
            ) VALUES (
                'krb-tank-002', 'LOOPPPPP', 'KRB TANK', 'OverheadTank', 'EvaraTank', 'Online',
                17.44, 78.34, 'KRB Water Tank - LOOPPPPP', '3000L',
                '2345678', 'LMNOPQRSTUVWXYZ123456789',
                'demo-user-001', CURRENT_TIMESTAMP
            )
        """))
        
        print("✅ Added nodes with existing format:")
        print("  📋 POLLLLLL: pol-tank-002")
        print("  📋 LOOPPPPP: krb-tank-002")

if __name__ == "__main__":
    asyncio.run(add_nodes_with_existing_format())
