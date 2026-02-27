import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.models.all_models import Node, User, AuditLog, DeviceConfigTank, DeviceConfigDeep, DeviceConfigFlow, DeviceThingSpeakMapping, AlertRule, AlertHistory

async def clear_data():
    async with AsyncSessionLocal() as session:
        # Delete related tables first
        await session.execute(text("DELETE FROM alert_history;"))
        await session.execute(text("DELETE FROM alert_rules;"))
        await session.execute(text("DELETE FROM device_thingspeak_mapping;"))
        await session.execute(text("DELETE FROM device_config_tank;"))
        await session.execute(text("DELETE FROM device_config_deep;"))
        await session.execute(text("DELETE FROM device_config_flow;"))
        await session.execute(text("DELETE FROM node_analytics;"))
        await session.execute(text("DELETE FROM node_assignments;"))
        # Delete nodes
        await session.execute(text("DELETE FROM nodes;"))
        await session.commit()
        print("Data cleared!")

if __name__ == "__main__":
    asyncio.run(clear_data())
