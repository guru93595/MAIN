import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text
import hashlib

async def create_demo_users():
    """Create demo users for testing the analytics functionality"""
    
    demo_users = [
        {
            'id': 'demo-user-001',
            'email': 'demo@evaratech.com',
            'display_name': 'Demo User',
            'role': 'superadmin',
            'plan': 'enterprise'
        },
        {
            'id': 'demo-user-002', 
            'email': 'test@evaratech.com',
            'display_name': 'Test User',
            'role': 'customer',
            'plan': 'basic'
        }
    ]
    
    async with engine.begin() as conn:
        for user in demo_users:
            try:
                await conn.execute(text("""
                    INSERT INTO users_profiles (id, email, display_name, role, plan, created_at)
                    VALUES (:id, :email, :display_name, :role, :plan, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        email = EXCLUDED.email,
                        display_name = EXCLUDED.display_name,
                        role = EXCLUDED.role,
                        plan = EXCLUDED.plan,
                        updated_at = NOW()
                """), user)
                print(f"✅ Created/updated user: {user['email']} ({user['role']})")
            except Exception as e:
                print(f"❌ Error creating user {user['email']}: {e}")
        
        # Show all users
        result = await conn.execute(text("SELECT id, email, display_name, role, plan FROM users_profiles ORDER BY created_at DESC"))
        users = result.fetchall()
        print("\n📋 All users in database:")
        for user in users:
            print(f"  • {user.email} - {user.display_name} ({user.role} - {user.plan})")

if __name__ == "__main__":
    asyncio.run(create_demo_users())
