from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.core import security_supabase
from app.schemas import schemas
from app.db.repository import NodeRepository, UserRepository
from app.models.all_models import User
from app.services.analytics import NodeAnalyticsService
from app.db.session import get_db
from app.services.seeder import INITIAL_NODES
from app.core.config import get_settings
from app.services.security import EncryptionService
import asyncio
import traceback
from datetime import datetime

# Import telemetry service
try:
    from app.services.telemetry import ThingSpeakTelemetryService
except ImportError:
    print("⚠️ ThingSpeakTelemetryService not found, using fallback")
    ThingSpeakTelemetryService = None

router = APIRouter()

@router.post("/", response_model=schemas.NodeResponse)
async def create_node(
    *,
    db: AsyncSession = Depends(get_db),
    node_in: schemas.NodeCreate,
    user_payload: dict = Depends(security_supabase.get_current_user_token),
) -> Any:
    """
    Create a new node with location support.
    """
    repo = NodeRepository(db)
    
    # Check if node_key already exists
    existing = await repo.get_by_key(node_in.node_key)
    if existing:
        raise HTTPException(status_code=400, detail="Node with this key already exists")
        
    import uuid

    node_data = node_in.dict(exclude={"thingspeak_mappings", "config_tank", "config_deep", "config_flow"})
    node_data["id"] = str(uuid.uuid4())
    node_data["created_by"] = user_payload.get("sub")
    
    # Ensure location data is properly saved
    if node_in.lat is not None:
        node_data["lat"] = node_in.lat
    if node_in.lng is not None:
        node_data["long"] = node_in.lng  # Note: database uses 'long' column
    
    try:
        node = await repo.create(node_data)
        
        # Handle ThingSpeak mappings if provided
        if node_in.thingspeak_mappings:
            from app.models.all_models import DeviceThingSpeakMapping
            for mapping_data in node_in.thingspeak_mappings:
                mapping = DeviceThingSpeakMapping(
                    id=str(uuid.uuid4()),
                    device_id=node.id,
                    channel_id=mapping_data.get("channel_id"),
                    read_api_key=mapping_data.get("read_api_key"),
                    write_api_key=mapping_data.get("write_api_key"),
                    field_mapping=mapping_data.get("field_mapping", {})
                )
                db.add(mapping)
            
            await db.commit()
        
        # Handle specialized configs if provided
        if node_in.config_tank:
            from app.models.all_models import DeviceConfigTank
            config = DeviceConfigTank(
                device_id=node.id,
                tank_shape=node_in.config_tank.get("tank_shape"),
                dimension_unit=node_in.config_tank.get("dimension_unit", "m"),
                radius=node_in.config_tank.get("radius"),
                height=node_in.config_tank.get("height"),
                length=node_in.config_tank.get("length"),
                breadth=node_in.config_tank.get("breadth")
            )
            db.add(config)
            
        if node_in.config_deep:
            from app.models.all_models import DeviceConfigDeep
            config = DeviceConfigDeep(
                device_id=node.id,
                static_depth=node_in.config_deep.get("static_depth"),
                dynamic_depth=node_in.config_deep.get("dynamic_depth"),
                recharge_threshold=node_in.config_deep.get("recharge_threshold")
            )
            db.add(config)
            
        if node_in.config_flow:
            from app.models.all_models import DeviceConfigFlow
            config = DeviceConfigFlow(
                device_id=node.id,
                max_flow_rate=node_in.config_flow.get("max_flow_rate"),
                pipe_diameter=node_in.config_flow.get("pipe_diameter"),
                abnormal_threshold=node_in.config_flow.get("abnormal_threshold")
            )
            db.add(config)
            
        await db.commit()
        
        # Refresh the node to get all relationships
        await db.refresh(node)
        return node
        
    except Exception as e:
        print(f"ERROR creating node: {e}")
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[schemas.SimpleNodeResponse])
async def read_nodes(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve nodes with location data — lightweight summary list.
    """
    repo = NodeRepository(db)
    try:
        nodes = await repo.get_all_summary(skip=skip, limit=limit)
        return [
            {
                "id": node.id,
                "node_key": getattr(node, 'hardware_id', node.node_key),  # hardware_id is the actual node_key
                "label": getattr(node, 'device_label', node.label),  # device_label is the actual label
                "category": getattr(node, 'device_type', node.category),  # device_type is the actual category
                "analytics_type": node.analytics_type,
                "status": node.status,
                "lat": node.lat,
                "lng": getattr(node, 'long', node.lng),  # long is the actual lng column
                "created_at": node.created_at or datetime.utcnow(),
                "location_name": getattr(node, "location_name", None),
                "capacity": getattr(node, "capacity", None),
                "thingspeak_channel_id": getattr(node, "thingspeak_channel_id", None),
                "thingspeak_read_api_key": None,  # Never expose keys in list view
                "created_by": getattr(node, "created_by", None),
            }
            for node in nodes
        ]
    except Exception as e:
        print(f"❌ Node list fetch error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Failed to fetch nodes: {str(e)}")


@router.put("/{node_id}", response_model=schemas.NodeResponse)
async def update_node(
    *,
    db: AsyncSession = Depends(get_db),
    node_id: str,
    node_in: schemas.NodeCreate, # Using NodeCreate for simplicity or a NodeUpdate schema
    user_payload: dict = Depends(security_supabase.get_current_user_token),
) -> Any:
    """
    Update a node with location support.
    """
    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
        
    update_data = node_in.dict(exclude_unset=True, exclude={"thingspeak_mappings", "config_tank", "config_deep", "config_flow"})
    
    # Handle location field mapping (lng -> long)
    if "lng" in update_data:
        update_data["long"] = update_data.pop("lng")
    
    try:
        updated_node = await repo.update(node_id, update_data)
        
        # Handle ThingSpeak mappings if provided
        if node_in.thingspeak_mappings:
            # Delete existing mappings
            from app.models.all_models import DeviceThingSpeakMapping
            await db.execute(
                select(DeviceThingSpeakMapping).filter(DeviceThingSpeakMapping.device_id == node_id)
            )
            await db.commit()
            
            # Add new mappings
            for mapping_data in node_in.thingspeak_mappings:
                mapping = DeviceThingSpeakMapping(
                    id=str(uuid.uuid4()),
                    device_id=node_id,
                    channel_id=mapping_data.get("channel_id"),
                    read_api_key=mapping_data.get("read_api_key"),
                    write_api_key=mapping_data.get("write_api_key"),
                    field_mapping=mapping_data.get("field_mapping", {})
                )
                db.add(mapping)
            
            await db.commit()
        
        # Handle specialized configs if provided
        if node_in.config_tank:
            from app.models.all_models import DeviceConfigTank
            # Delete existing config
            await db.execute(
                select(DeviceConfigTank).filter(DeviceConfigTank.device_id == node_id)
            )
            # Add new config
            config = DeviceConfigTank(
                device_id=node_id,
                tank_shape=node_in.config_tank.get("tank_shape"),
                dimension_unit=node_in.config_tank.get("dimension_unit", "m"),
                radius=node_in.config_tank.get("radius"),
                height=node_in.config_tank.get("height"),
                length=node_in.config_tank.get("length"),
                breadth=node_in.config_tank.get("breadth")
            )
            db.add(config)
            
        if node_in.config_deep:
            from app.models.all_models import DeviceConfigDeep
            # Delete existing config
            await db.execute(
                select(DeviceConfigDeep).filter(DeviceConfigDeep.device_id == node_id)
            )
            # Add new config
            config = DeviceConfigDeep(
                device_id=node_id,
                static_depth=node_in.config_deep.get("static_depth"),
                dynamic_depth=node_in.config_deep.get("dynamic_depth"),
                recharge_threshold=node_in.config_deep.get("recharge_threshold")
            )
            db.add(config)
            
        if node_in.config_flow:
            from app.models.all_models import DeviceConfigFlow
            # Delete existing config
            await db.execute(
                select(DeviceConfigFlow).filter(DeviceConfigFlow.device_id == node_id)
            )
            # Add new config
            config = DeviceConfigFlow(
                device_id=node_id,
                max_flow_rate=node_in.config_flow.get("max_flow_rate"),
                pipe_diameter=node_in.config_flow.get("pipe_diameter"),
                abnormal_threshold=node_in.config_flow.get("abnormal_threshold")
            )
            db.add(config)
            
        await db.commit()
        await db.refresh(updated_node)
        return updated_node
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{node_id}")
async def delete_node(
    *,
    db: AsyncSession = Depends(get_db),
    node_id: str,
    user_payload: dict = Depends(security_supabase.get_current_user_token),
) -> Any:
    """
    Delete a node.
    """
    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    await repo.delete(node_id)
    return {"status": "success", "message": f"Node {node_id} deleted"}

@router.get("/{node_id}", response_model=schemas.NodeResponse, response_model_by_alias=False)
async def read_node_by_id(
    node_id: str,
    db: AsyncSession = Depends(get_db)
    # Removed: user_payload: dict = Depends(security_supabase.get_current_user_token)
) -> Any:
    repo = NodeRepository(db)
    # Try by UUID first
    try:
        node = await repo.get(node_id)
    except Exception:
        node = None
        
    # If not found, try by hardware_id (node_key)
    if not node:
        # Query by hardware_id since that's the actual node_key field
        result = await db.execute(
            select(repo.model)
            .options(
                selectinload(repo.model.config_tank),
                selectinload(repo.model.config_deep),
                selectinload(repo.model.config_flow),
                selectinload(repo.model.thingspeak_mappings)
            )
            .filter(repo.model.hardware_id == node_id)
        )
        node = result.scalars().first()
        
    # If still not found, try by node_key (if it exists)
    if not node:
        try:
            node = await repo.get_by_key(node_id)
        except Exception:
            node = None
        
    if node and node.thingspeak_mappings:
        for mapping in node.thingspeak_mappings:
            if mapping.read_api_key:
                mapping.read_api_key = EncryptionService.decrypt(mapping.read_api_key)
        
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.get("/health", response_model=dict)
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """
    Database and API health check endpoint.
    """
    try:
        # Test database connection
        await db.execute("SELECT 1")
        
        # Test node repository
        from app.models.all_models import Node
        result = await db.execute(select(Node))
        node_count = len(result.scalars().all())
        
        return {
            "status": "healthy",
            "database": "connected",
            "node_count": node_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/{node_id}/analytics", response_model=schemas.NodeAnalyticsResponse)
async def get_node_analytics(
    node_id: str,
    db: AsyncSession = Depends(get_db)
    # Removed: user_payload: dict = Depends(security_supabase.get_current_user_token)
) -> Any:
    """
    Returns calculated analytics using REAL ThingSpeak Data.
    """
    # 1. Fetch Node
    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
         raise HTTPException(status_code=404, detail="Node not found")
    
    # Check permissions (reuse logic if needed, but RLS handled by repo access ideally)
    # For now assuming user access is valid if they know the ID (or add check)
    
    # 2. Fetch Telemetry
    from app.services.telemetry.thingspeak import ThingSpeakTelemetryService
    ts_service = ThingSpeakTelemetryService()
    
    config = {
        "channel_id": node.thingspeak_channel_id,
        "read_key": node.thingspeak_read_api_key
    }
    
    readings = await ts_service.fetch_history(node_id, config, days=7)
    
    # 3. Compute Analytics
    analytics_service = NodeAnalyticsService(repo)
    
    # Extract flow data (assuming field1 is flow for now)
    flow_series = [
        float(r["field1"]) for r in readings 
        if r.get("field1") and r["field1"] is not None and r["field1"].replace('.', '', 1).isdigit()
    ]
    
    days = analytics_service.predict_days_to_empty(flow_series, 2000) # Mock capacity
    avg = analytics_service.calculate_rolling_average(flow_series)
    
    return schemas.NodeAnalyticsResponse(
        node_id=node_id,
        days_to_empty=days,
        rolling_avg_flow=avg
    )
