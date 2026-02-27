import asyncio
import traceback
from app.db.session import engine
from app.models.all_models import Node
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

async def test_health():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        try:
            await db.execute(text("SELECT 1"))
            print("DB connection OK")
            
            result = await db.execute(select(Node))
            node_count = len(result.scalars().all())
            print(f"Node count: {node_count}")
        except Exception as e:
            print("Error occurred:")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_health())
