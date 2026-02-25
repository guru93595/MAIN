import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import text

async def check_data():
    async with AsyncSessionLocal() as session:
        print("🔍 CHECKING DATABASE DATA")
        print("=" * 40)
        
        # Check nodes with correct column names
        print("\n=== NODES ===")
        result = await session.execute(text('SELECT COUNT(*) FROM nodes'))
        nodes_count = result.scalar()
        print(f"Total nodes: {nodes_count}")
        
        result = await session.execute(text('''
            SELECT id, hardware_id, device_label, device_type, analytics_type, 
                   location_name, capacity, status, lat, long, created_at
            FROM nodes LIMIT 3
        '''))
        nodes = result.fetchall()
        for node in nodes:
            print(f"  {node}")
        
        # Check users
        print("\n=== USERS ===")
        result = await session.execute(text('SELECT COUNT(*) FROM users_profiles'))
        users_count = result.scalar()
        print(f"Total users: {users_count}")
        
        result = await session.execute(text('SELECT id, email, role FROM users_profiles'))
        users = result.fetchall()
        for user in users:
            print(f"  {user}")
        
        # Check assignments
        print("\n=== ASSIGNMENTS ===")
        result = await session.execute(text('SELECT COUNT(*) FROM node_assignments'))
        assignments_count = result.scalar()
        print(f"Total assignments: {assignments_count}")
        
        if assignments_count > 0:
            result = await session.execute(text('SELECT * FROM node_assignments LIMIT 2'))
            assignments = result.fetchall()
            for assignment in assignments:
                print(f"  {assignment}")
        
        # Check pipelines
        print("\n=== PIPELINES ===")
        result = await session.execute(text('SELECT COUNT(*) FROM pipelines'))
        pipelines_count = result.scalar()
        print(f"Total pipelines: {pipelines_count}")
        
        if pipelines_count > 0:
            result = await session.execute(text('SELECT * FROM pipelines LIMIT 2'))
            pipelines = result.fetchall()
            for pipeline in pipelines:
                print(f"  {pipeline}")
        
        # Check analytics
        print("\n=== ANALYTICS ===")
        result = await session.execute(text('SELECT COUNT(*) FROM node_analytics'))
        analytics_count = result.scalar()
        print(f"Total analytics: {analytics_count}")
        
        if analytics_count > 0:
            result = await session.execute(text('SELECT * FROM node_analytics LIMIT 2'))
            analytics = result.fetchall()
            for analytic in analytics:
                print(f"  {analytic}")

if __name__ == "__main__":
    asyncio.run(check_data())
