import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def verify_complete_data():
    async with AsyncSessionLocal() as session:
        print("🔍 VERIFYING COMPLETE DATABASE SETUP")
        print("=" * 50)
        
        # 1. Check nodes data
        print("\n=== NODES DATA ===")
        result = await session.execute(text('SELECT COUNT(*) FROM nodes'))
        nodes_count = result.scalar()
        print(f"Total nodes: {nodes_count}")
        
        result = await session.execute(text('''
            SELECT id, node_key, label, category, analytics_type, 
                   location_name, capacity, status, lat, lng,
                   thingspeak_channel_id, created_by, created_at
            FROM nodes LIMIT 3
        '''))
        nodes = result.fetchall()
        for node in nodes:
            print(f"  {node}")
        
        # 2. Check users data
        print("\n=== USERS DATA ===")
        result = await session.execute(text('SELECT COUNT(*) FROM users_profiles'))
        users_count = result.scalar()
        print(f"Total users: {users_count}")
        
        result = await session.execute(text('''
            SELECT id, email, role, plan, community_id, organization_id
            FROM users_profiles
        '''))
        users = result.fetchall()
        for user in users:
            print(f"  {user}")
        
        # 3. Check assignments data
        print("\n=== ASSIGNMENTS DATA ===")
        result = await session.execute(text('SELECT COUNT(*) FROM node_assignments'))
        assignments_count = result.scalar()
        print(f"Total assignments: {assignments_count}")
        
        if assignments_count > 0:
            result = await session.execute(text('''
                SELECT id, node_id, user_id, assigned_by, assigned_at, created_at
                FROM node_assignments LIMIT 3
            '''))
            assignments = result.fetchall()
            for assignment in assignments:
                print(f"  {assignment}")
        
        # 4. Check pipelines data
        print("\n=== PIPELINES DATA ===")
        result = await session.execute(text('SELECT COUNT(*) FROM pipelines'))
        pipelines_count = result.scalar()
        print(f"Total pipelines: {pipelines_count}")
        
        if pipelines_count > 0:
            result = await session.execute(text('''
                SELECT id, name, color, positions, created_by, created_at, updated_at
                FROM pipelines
            '''))
            pipelines = result.fetchall()
            for pipeline in pipelines:
                print(f"  {pipeline}")
        
        # 5. Check analytics data
        print("\n=== ANALYTICS DATA ===")
        result = await session.execute(text('SELECT COUNT(*) FROM node_analytics'))
        analytics_count = result.scalar()
        print(f"Total analytics records: {analytics_count}")
        
        if analytics_count > 0:
            result = await session.execute(text('''
                SELECT id, node_id, period_type, period_start, 
                       consumption_liters, avg_level_percent, peak_flow
                FROM node_analytics LIMIT 3
            '''))
            analytics = result.fetchall()
            for analytic in analytics:
                print(f"  {analytic}")
        
        # 6. Check other tables
        print("\n=== OTHER TABLES ===")
        tables = ['distributors', 'communities', 'customers', 'plans', 'audit_logs']
        for table in tables:
            try:
                result = await session.execute(text(f'SELECT COUNT(*) FROM {table}'))
                count = result.scalar()
                print(f"  {table}: {count} records")
            except Exception as e:
                print(f"  {table}: ERROR - {e}")
        
        # 7. Test API endpoints data structure
        print("\n=== API ENDPOINTS VERIFICATION ===")
        
        # Test nodes endpoint structure
        result = await session.execute(text('''
            SELECT id, node_key, label, category, analytics_type, status,
                   lat, lng, created_at, location_name, capacity,
                   thingspeak_channel_id, thingspeak_read_api_key, created_by
            FROM nodes LIMIT 1
        '''))
        node = result.fetchone()
        if node:
            print(f"✅ Nodes endpoint data structure: {len(node)} fields")
        
        # Test assignments structure
        if assignments_count > 0:
            result = await session.execute(text('''
                SELECT id, node_id, user_id, assigned_by, assigned_at, created_at
                FROM node_assignments LIMIT 1
            '''))
            assignment = result.fetchone()
            if assignment:
                print(f"✅ Assignments endpoint data structure: {len(assignment)} fields")
        
        # Test pipelines structure
        if pipelines_count > 0:
            result = await session.execute(text('''
                SELECT id, name, color, positions, created_by, created_at, updated_at
                FROM pipelines LIMIT 1
            '''))
            pipeline = result.fetchone()
            if pipeline:
                print(f"✅ Pipelines endpoint data structure: {len(pipeline)} fields")
        
        # Test analytics structure
        if analytics_count > 0:
            result = await session.execute(text('''
                SELECT id, node_id, period_type, period_start, 
                       consumption_liters, avg_level_percent, peak_flow, analytics_metadata, created_at
                FROM node_analytics LIMIT 1
            '''))
            analytic = result.fetchone()
            if analytic:
                print(f"✅ Analytics endpoint data structure: {len(analytic)} fields")
        
        print("\n🎉 VERIFICATION COMPLETE!")

if __name__ == "__main__":
    asyncio.run(verify_complete_data())
