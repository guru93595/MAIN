import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def check_users():
    async with engine.begin() as conn:
        # Check if users_profiles table exists
        result = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'users_profiles'
        """))
        tables = result.fetchall()
        print("Tables found:", tables)
        
        if tables:
            # Check existing users
            result = await conn.execute(text("SELECT id, email, role FROM users_profiles LIMIT 5"))
            users = result.fetchall()
            print("Existing users:", users)
        
        # Check nodes
        result = await conn.execute(text("SELECT COUNT(*) FROM nodes"))
        node_count = result.scalar()
        print(f"Total nodes: {node_count}")

if __name__ == "__main__":
    asyncio.run(check_users())
