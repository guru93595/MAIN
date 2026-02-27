import asyncio
from app.db.session import engine
from sqlalchemy import text

async def check_node_data():
    async with engine.begin() as conn:
        # Check the specific node that's showing issues
        result = await conn.execute(text("SELECT id, node_key, label, status, thingspeak_channel_id FROM nodes WHERE node_key LIKE '%KRB%' OR label LIKE '%KRB%'"))
        nodes = result.fetchall()
        print('KRB Nodes found:')
        for node in nodes:
            print(f'  {dict(node._mapping)}')
        
        # Check ThingSpeak mappings for these nodes
        for node in nodes:
            if node[0]:  # node_id
                mapping_result = await conn.execute(text("SELECT channel_id, read_api_key, field_mapping FROM device_thingspeak_mapping WHERE device_id = :device_id"), {"device_id": node[0]})
                mappings = mapping_result.fetchall()
                print(f'  ThingSpeak mappings for {node[0]}:')
                for mapping in mappings:
                    print(f'    {dict(mapping._mapping)}')

if __name__ == "__main__":
    asyncio.run(check_node_data())
