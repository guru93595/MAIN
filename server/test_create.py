import asyncio
import traceback
from app.db.session import AsyncSessionLocal
from app.db.repository import NodeRepository

async def main():
    async with AsyncSessionLocal() as db:
        try:
            repo = NodeRepository(db)
            node_data = {
                "node_key": "test_node_dd",
                "label": "Test Node DD",
                "category": "tank",
                "analytics_type": "EvaraTank",
                "id": "test-uuid-dd",
                "created_by": "me",
                "status": "provisioning"
            }
            await repo.create(node_data)
            print("SUCCESS: Node created!")
        except Exception as e:
            err_msg = traceback.format_exc()
            with open("error_output.txt", "w") as f:
                f.write(err_msg)
            print("ERROR written to error_output.txt")
            print(str(e)[:500])

if __name__ == '__main__':
    asyncio.run(main())
