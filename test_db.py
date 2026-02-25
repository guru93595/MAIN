import asyncio
from app.db.session import engine
from sqlalchemy import text

async def test():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT COUNT(*) FROM nodes'))
        print('Node count:', result.scalar())
        
        result = await conn.execute(text('SELECT COUNT(*) FROM users'))
        print('User count:', result.scalar())
        
        result = await conn.execute(text('SELECT id, role, community_id FROM users LIMIT 3'))
        users = result.fetchall()
        print('Sample users:', users)

if __name__ == "__main__":
    asyncio.run(test())
