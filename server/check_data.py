import asyncio
from app.db.session import AsyncSessionLocal
from app.models.all_models import Node, User
from sqlalchemy import select, func

async def check_data():
    async with AsyncSessionLocal() as session:
        node_count = await session.scalar(select(func.count()).select_from(Node))
        user_count = await session.scalar(select(func.count()).select_from(User))
        print(f"Remaining nodes: {node_count}")
        print(f"Remaining users: {user_count}")

if __name__ == "__main__":
    asyncio.run(check_data())
