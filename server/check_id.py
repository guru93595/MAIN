import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'device_thingspeak_mapping' ORDER BY ordinal_position;"
        ))
        cols = [row[0] for row in result.fetchall()]
        print(f"device_thingspeak_mapping columns: {cols}")
        
        if 'id' not in cols:
            print("❌ id column MISSING! Adding it now...")
            await conn.execute(text('ALTER TABLE device_thingspeak_mapping ADD COLUMN id VARCHAR;'))
            print("✅ Added id column")
        else:
            print("✅ id column exists")

if __name__ == '__main__':
    asyncio.run(main())
