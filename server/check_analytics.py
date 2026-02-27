import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select
from app.models.all_models import Node, NodeAnalytics

async def check_analytics():
    async with AsyncSessionLocal() as session:
        # Check nodes
        result = await session.execute(select(Node))
        nodes = result.scalars().all()
        
        print(f"Found {len(nodes)} nodes:")
        for node in nodes:
            print(f"Node: {node.id} - {node.label} - Status: {node.status}")
            print(f"ThingSpeak Channel: {node.thingspeak_channel_id}")
            
            # Check analytics for this node
            analytics_result = await session.execute(
                select(NodeAnalytics).where(NodeAnalytics.node_id == node.id)
            )
            analytics = analytics_result.scalars().all()
            
            print(f"Analytics records: {len(analytics)}")
            for analytic in analytics[:3]:  # Show first 3
                print(f"  - {analytic.period_start}: Level={analytic.avg_level_percent}%, Flow={analytic.peak_flow}, Consumption={analytic.consumption_liters}L")
            print("-" * 50)

if __name__ == "__main__":
    asyncio.run(check_analytics())
