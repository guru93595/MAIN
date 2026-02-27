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
    print("🧹 Data Cleanup Service Started.")
    
    while True:
        try:
            # Skip database operations for now
            print("🧹 Cleanup skipped - database not available")
                
        except Exception as e:
            print(f"❌ Error in Cleanup Loop: {e}")
            
        # Wait 24 hours (approx)
        await asyncio.sleep(86400)

async def poll_thingspeak_loop():
    """
    Periodic task to fetch data from all ThingSpeak-enabled nodes.
    """
    import httpx
    import uuid
    import asyncio
    from datetime import datetime
    from sqlalchemy import select
    from app.db.session import AsyncSessionLocal
    from app.models.all_models import Node, NodeAnalytics
    
    print("🚀 Telemetry Polling Service Started.")
    
    # Wait a few seconds for the app to start up before initial poll
    await asyncio.sleep(5)
    
    while True:
        try:
            async with AsyncSessionLocal() as session:
                # Get all nodes that have a thingspeak channel configured
                result = await session.execute(
                    select(Node).where(Node.thingspeak_channel_id.isnot(None))
                )
                nodes = result.scalars().all()
                
                if not nodes:
                    print("🚀 Polling: No nodes with thingspeak_channel_id found.")
                
                async with httpx.AsyncClient() as client:
                    for node in nodes:
                        if not node.thingspeak_channel_id:
                            continue
                            
                        url = f"https://api.thingspeak.com/channels/{node.thingspeak_channel_id}/feeds.json"
                        params = {"results": 1}
                        if node.thingspeak_read_api_key:
                            params["api_key"] = node.thingspeak_read_api_key
                            
                        try:
                            response = await client.get(url, params=params, timeout=10.0)
                            if response.status_code == 200:
                                data = response.json()
                                feeds = data.get("feeds", [])
                                if not feeds:
                                    continue
                                    
                                feed = feeds[0]
                                
                                # CRITICAL FIELD MAPPING:
                                # - EvaraTank: Use field2 for distance (NEVER field1!)
                                # - EvaraFlow: Use field1 for flow rate
                                # - EvaraDeep: Use field2 for depth
                                try:
                                    if node.analytics_type == "EvaraTank":
                                        # TANK: field2 = Distance (field1 = Temperature, IGNORED)
                                        val = float(feed.get("field2", 0) or 0)
                                    elif node.analytics_type == "EvaraDeep":
                                        # DEEP: field2 = Depth
                                        val = float(feed.get("field2", 0) or 0)
                                    else:
                                        # FLOW: field1 = Flow rate
                                        val = float(feed.get("field1", 0) or 0)
                                except (ValueError, TypeError):
                                    val = 0.0
                                    
                                peak_flow = val if node.analytics_type == "EvaraFlow" else 0.0
                                avg_level = val if node.analytics_type in ["EvaraTank", "EvaraDeep"] else 0.0
                                consumption = avg_level * 10 # Mock consumption calculation
                                
                                now = datetime.utcnow()
                                period_start = now.replace(minute=0, second=0, microsecond=0) # Hourly
                                
                                # In MVP, we can insert an hourly analytical reading.
                                # To avoid spamming, we could check if one already exists for this hour, 
                                # but for demonstration of charts we'll just insert a fresh one or daily one.
                                
                                analytics_entry = NodeAnalytics(
                                    id=str(uuid.uuid4()),
                                    node_id=node.id,
                                    period_type="daily", # Dashboard uses daily by default
                                    period_start=now.replace(hour=0, minute=0, second=0, microsecond=0),
                                    consumption_liters=consumption,
                                    avg_level_percent=avg_level,
                                    peak_flow=peak_flow,
                                    analytics_metadata={"raw_feed": feed}
                                )
                                session.add(analytics_entry)
                                print(f"✅ Ingested ThingSpeak data for node {node.id}")
                            else:
                                print(f"⚠️ ThingSpeak returned {response.status_code} for node {node.id}")
                        except Exception as req_e:
                            print(f"❌ Error requesting ThingSpeak for {node.id}: {req_e}")
                            
                await session.commit()
                        
        except Exception as e:
            print(f"❌ Error in Polling Loop: {e}")
            
        # Wait 60 seconds before next poll
        await asyncio.sleep(60)
