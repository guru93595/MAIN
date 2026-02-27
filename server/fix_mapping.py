import asyncio
from app.db.session import engine
from sqlalchemy import text

async def fix_field_mapping():
    async with engine.begin() as conn:
        # Update field mapping to map field2 to distance
        result = await conn.execute(text("UPDATE device_thingspeak_mapping SET field_mapping = '{\"field2\": \"distance\"}' WHERE device_id = 'be7fb2a5-fa37-4570-b20d-e5ab13582ef5'"))
        print(f'Updated {result.rowcount} rows')
        
        # Verify the update
        result = await conn.execute(text("SELECT field_mapping FROM device_thingspeak_mapping WHERE device_id = 'be7fb2a5-fa37-4570-b20d-e5ab13582ef5'"))
        mapping = result.fetchone()
        print(f'Updated field mapping: {mapping[0] if mapping else "None"}')

if __name__ == "__main__":
    asyncio.run(fix_field_mapping())
