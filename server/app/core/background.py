import asyncio

# Global async queue for buffering writes
write_queue = asyncio.Queue()

async def process_write_queue():
    """
    Background task to process buffered writes to the database.
    This prevents the DB from being overwhelmed by high-frequency sensor data.
    """
    while True:
        # Get a "work item" out of the queue.
        item = await write_queue.get()
        
        try:
            # Emulate processing (e.g., bulk insert logic would go here)
            # await item.save()
            pass
        except Exception as e:
            print(f"Error processing write queue: {e}")
        finally:
            # Notify the queue that the "work item" has been processed.
            write_queue.task_done()

async def start_background_tasks():
    asyncio.create_task(process_write_queue())
    asyncio.create_task(poll_thingspeak_loop())
    asyncio.create_task(cleanup_loop())

async def cleanup_loop():
    """
    Periodic task to clean up old data (Retention Policy).
    Run every 24 hours.
    """
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import delete
    from app.models import all_models as models
    from datetime import datetime, timedelta
    
    print("🧹 Data Cleanup Service Started.")
    
    while True:
        try:
            # Retention: 30 Days
            cutoff = datetime.utcnow() - timedelta(days=30)
            
            async with AsyncSessionLocal() as db:
                # Delete old readings
                await db.execute(
                    delete(models.NodeReading).where(models.NodeReading.timestamp < cutoff)
                )
                await db.commit()
                # print(f"🧹 Cleaned up readings older than {cutoff}")
                
        except Exception as e:
            print(f"❌ Error in Cleanup Loop: {e}")
            
        # Wait 24 hours (approx)
        await asyncio.sleep(86400)

async def poll_thingspeak_loop():
    """
    Periodic task to fetch data from all Online nodes.
    """
    from app.db.session import AsyncSessionLocal
    from app.services.telemetry.thingspeak import ThingSpeakTelemetryService
    from app.services.telemetry_processor import TelemetryProcessor
    from app.models import all_models as models
    from sqlalchemy import select
    from sqlalchemy.orm import joinedload
    from app.services.websockets import manager
    import json
    
    ts_service = ThingSpeakTelemetryService()
    
    print("🚀 Telemetry Polling Service Started.")
    
    while True:
        try:
            async with AsyncSessionLocal() as db:
                # 1. Get Online Nodes with Config
                # Filtering by status="Online" OR "Offline" (to check if they come back)
                result = await db.execute(
                    select(models.Node)
                    .options(joinedload(models.Node.thingspeak_mapping))
                    .where(
                        models.Node.status.in_(["Online", "Offline", "Alert"])
                    )
                )
                nodes = result.scalars().all()
                
                processor = TelemetryProcessor(db)
                
                # 2. Process each node (can be parallelized)
                for node in nodes:
                    if not node.thingspeak_mapping or not node.thingspeak_mapping.channel_id:
                        continue
                        
                    config = {
                        "channel_id": node.thingspeak_mapping.channel_id,
                        "read_key": node.thingspeak_mapping.read_api_key
                    }
                    
                    try:
                        reading = await ts_service.fetch_latest(node.id, config)
                        
                        if reading:
                            await processor.process_readings(node.id, [reading])
                            if node.status != "Online":
                                node.status = "Online"
                                await db.commit()
                                await manager.broadcast(json.dumps({"event": "STATUS_UPDATE", "node_id": node.id, "status": "Online"}))
                        else:
                            # No reading returned, might be offline
                            if node.status == "Online":
                                node.status = "Offline"
                                await db.commit()
                                await manager.broadcast(json.dumps({"event": "STATUS_UPDATE", "node_id": node.id, "status": "Offline"}))
                    except Exception as node_e:
                        print(f"Node {node.id} check failed: {node_e}")
                        if node.status == "Online":
                            node.status = "Offline"
                            await db.commit()
                            await manager.broadcast(json.dumps({"event": "STATUS_UPDATE", "node_id": node.id, "status": "Offline"}))
                        
        except Exception as e:
            print(f"❌ Error in Polling Loop: {e}")
            
        # Wait 60 seconds
        await asyncio.sleep(60)
