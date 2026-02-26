import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def create_test_user():
    async with engine.begin() as conn:
        # Create a simple test user with known password
        # In Supabase, passwords are hashed, but for testing we'll create a user profile
        try:
            await conn.execute(text("""
                INSERT INTO users_profiles (id, email, display_name, role, plan, created_at)
                VALUES ('test-user-123', 'test@example.com', 'Test User', 'superadmin', 'enterprise', NOW())
                ON CONFLICT (id) DO UPDATE SET
                    email = EXCLUDED.email,
                    display_name = EXCLUDED.display_name,
                    role = EXCLUDED.role,
                    plan = EXCLUDED.plan
            """))
            print("Test user created/updated: test@example.com")
            
            # Get the user to confirm
            result = await conn.execute(text("SELECT * FROM users_profiles WHERE email = 'test@example.com'"))
            user = result.fetchone()
            print("User details:", dict(user._mapping) if user else "Not found")
            
        except Exception as e:
            print(f"Error creating user: {e}")

if __name__ == "__main__":
    asyncio.run(create_test_user())
