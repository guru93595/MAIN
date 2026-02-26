import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def verify_pol_loop_nodes():
    """Verify POLLLLLL and LOOPPPPP nodes are properly configured"""
    
    async with engine.begin() as conn:
        # Check POLLLLLL and LOOPPPPP nodes
        result = await conn.execute(text("""
            SELECT id, hardware_id, device_label, device_type, analytics_type, status, 
                   lat, long, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key
            FROM nodes 
            WHERE hardware_id IN ('POLLLLLL', 'LOOPPPPP')
            ORDER BY hardware_id
        """))
        nodes = result.fetchall()
        
        print("🔍 POLLLLLL & LOOPPPPP Final Verification:")
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
            print(f"    ✅ Has Location: {node.lat is not None and node.long is not None}")
            print(f"    ✅ Has ThingSpeak: {node.thingspeak_channel_id is not None}")
            print()
        
        # Test the API response format
        print("📊 API Response Format Test:")
        for node in nodes:
            api_response = {
                "id": node.id,
                "node_key": node.hardware_id,  # hardware_id is the actual node_key
                "label": node.device_label,  # device_label is the actual label
                "category": node.device_type,  # device_type is the actual category
                "analytics_type": node.analytics_type,
                "status": node.status,
                "lat": node.lat,
                "lng": node.long,  # long is the actual lng column
                "created_at": None,  # Handle missing created_at
                "location_name": node.location_name,
                "capacity": node.capacity,
                "thingspeak_channel_id": node.thingspeak_channel_id,
                "thingspeak_read_api_key": None,
            }
            print(f"  📋 {node.hardware_id} API Response:")
            print(f"    node_key: {api_response['node_key']}")
            print(f"    label: {api_response['label']}")
            print(f"    category: {api_response['category']}")
            print(f"    lat/lng: {api_response['lat']}, {api_response['lng']}")
            print(f"    location_name: {api_response['location_name']}")
            print(f"    thingspeak_channel_id: {api_response['thingspeak_channel_id']}")
            print()

if __name__ == "__main__":
    asyncio.run(verify_pol_loop_nodes())
