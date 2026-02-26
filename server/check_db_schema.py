import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def check_db_schema():
    """Check the actual database schema"""
    
    async with engine.begin() as conn:
        # Get table schema
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'nodes' 
            ORDER BY ordinal_position
        """))
        columns = result.fetchall()
        
        print("🔍 Nodes Table Schema:")
        for col in columns:
            print(f"  📋 {col.column_name}: {col.data_type}")
        
        # Check sample data
        result2 = await conn.execute(text("""
            SELECT id, node_key, category, analytics_type, status, 
                   lat, lng, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            LIMIT 3
        """))
        nodes = result2.fetchall()
        
        print(f"\n📊 Sample Data (first 3 nodes):")
        for node in nodes:
            print(f"  {dict(node)}")

if __name__ == "__main__":
    asyncio.run(check_db_schema())
