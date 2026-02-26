import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def create_simple_user():
    """Create a simple test user with known credentials"""
    
    async with engine.begin() as conn:
        # Create a user with simple credentials
        await conn.execute(text("""
            INSERT INTO users_profiles (id, email, display_name, role, plan, created_at)
            VALUES ('simple-user-001', 'admin@admin.com', 'Admin User', 'superadmin', 'enterprise', CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                display_name = EXCLUDED.display_name,
                role = EXCLUDED.role,
                plan = EXCLUDED.plan,
                updated_at = CURRENT_TIMESTAMP
        """))
        
        print("✅ Created simple user:")
        print("  📧 Email: admin@admin.com")
        print("  🔑 Password: admin123")
        print("  👤 Role: SuperAdmin")
        print()
        print("🔍 Try logging in with:")
        print("  Email: admin@admin.com")
        print("  Password: admin123")

if __name__ == "__main__":
    asyncio.run(create_simple_user())
