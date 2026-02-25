import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check_db_structure():
    async with AsyncSessionLocal() as session:
        # Get all tables
        result = await session.execute(text('SELECT name FROM sqlite_master WHERE type="table"'))
        tables = result.fetchall()
        print('=== TABLES IN DATABASE ===')
        for table in tables:
            print(f'  {table[0]}')
        
        print('\n=== NODES TABLE STRUCTURE ===')
        result = await session.execute(text('PRAGMA table_info(nodes)'))
        columns = result.fetchall()
        for col in columns:
            print(f'  {col[1]} ({col[2]})')
        
        print('\n=== USERS PROFILES TABLE STRUCTURE ===')
        result = await session.execute(text('PRAGMA table_info(users_profiles)'))
        columns = result.fetchall()
        for col in columns:
            print(f'  {col[1]} ({col[2]})')

        print('\n=== SAMPLE NODES DATA ===')
        result = await session.execute(text('SELECT id, node_key, label, category, analytics_type, location_name, lat, lng, capacity, status, thingspeak_channel_id FROM nodes LIMIT 5'))
        nodes = result.fetchall()
        for node in nodes:
            print(f'  {node}')

        print('\n=== CHECK FOR MISSING TABLES ===')
        expected_tables = ['users_profiles', 'nodes', 'node_assignments', 'pipelines', 'node_analytics', 'audit_logs', 'distributors', 'communities', 'customers', 'plans']
        for table in expected_tables:
            result = await session.execute(text(f'SELECT name FROM sqlite_master WHERE type=\"table\" AND name=\"{table}\"'))
            exists = result.fetchone()
            if exists:
                print(f'  ✅ {table}')
            else:
                print(f'  ❌ {table} - MISSING!')

if __name__ == "__main__":
    asyncio.run(check_db_structure())
