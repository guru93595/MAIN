from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.schemas import schemas
from app.models import all_models as models
from app.db.session import get_db
from app.core import security_supabase
from app.core.permissions import Permission
from datetime import datetime
import uuid
from sqlalchemy import select
from app.core.security_supabase import RequirePermission
from app.core.ratelimit import RateLimiter
from app.services.telemetry.thingspeak import ThingSpeakTelemetryService
from app.db.repository import NodeRepository
import time
import logging

logger = logging.getLogger("evara_backend")

# simple TTL cache: { "device_id": (timestamp, data) }
live_telemetry_cache = {}
history_cache = {}  # Cache for historical data
CACHE_TTL = 30 # seconds
HISTORY_CACHE_TTL = 60 # 60 seconds for history cache

router = APIRouter()

@router.get("/registry", response_model=List[schemas.NodeResponse])
async def list_device_registry(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(RequirePermission(Permission.DEVICE_READ))
) -> Any:
    """
    Admin View of Device Registry.
    Shows all devices with firmware/calibration metadata.
    """
    # Verify Super Admin or Region Admin for full registry access
    # Logic similar to nodes.py RLS but aimed at inventory management
    # For now, returning all accessible nodes
    result = await db.execute(select(models.Node))
    nodes = result.scalars().all()
    # In real app, filter by organization permissions
    return nodes

class DeviceMetadataUpdate(BaseModel):
    """Schema for device firmware/calibration updates."""
    firmware_version: Optional[str] = None
    calibration_factor: Optional[float] = None


@router.put("/{node_id}/metadata", response_model=schemas.NodeResponse)
async def update_device_metadata(
    node_id: str,
    metadata_in: DeviceMetadataUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(RequirePermission(Permission.DEVICE_CONTROL))
) -> Any:
    """
    Update Device Metadata (Firmware, Calibration).
    """
    node = await db.get(models.Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Device not found")
        
    # Update allowed fields (only if provided)
    if metadata_in.firmware_version is not None:
        node.firmware_version = metadata_in.firmware_version
    if metadata_in.calibration_factor is not None:
        node.calibration_factor = metadata_in.calibration_factor
        
    await db.commit()
    await db.refresh(node)
    return node

@router.post("/provision-token", response_model=dict)
async def generate_provisioning_token(
    community_id: str,
    expiration_minutes: int = 60,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(RequirePermission(Permission.DEVICE_PROVISION))
) -> Any:
    """
    Generate a one-time provisioning token for a specific community.
    """
    import secrets
    from datetime import datetime, timedelta
    
    # Verify user has access to this community (if not superadmin)
    # Simple check for now: relies on Permission Dependency
    
    token_str = secrets.token_urlsafe(16)
    expires = datetime.utcnow() + timedelta(minutes=expiration_minutes)
    
    token_obj = models.ProvisioningToken(
        id=str(uuid.uuid4()),
        token=token_str,
        created_by_user_id=user_payload.get("sub"),
        community_id=community_id,
        expires_at=expires
    )
    
    db.add(token_obj)
    await db.commit()
    return {"token": token_str, "expires_at": expires}

@router.post("/claim")
async def claim_device(
    payload: dict, # { "token": "...", "hardware_id": "...", "type": "..." }
    db: AsyncSession = Depends(get_db),
    limiter: bool = Depends(RateLimiter(requests_per_minute=5)) 
) -> Any:
    """
    Public Endpoint for Devices/Installers to claim ownership.
    No Auth Required (Token acts as Auth).
    Rate Limit: 5 per minute per IP.
    """
    token_str = payload.get("token")
    hardware_id = payload.get("hardware_id")
    device_type = payload.get("type", "EvaraTank")
    
    if not token_str or not hardware_id:
        raise HTTPException(status_code=400, detail="Missing token or hardware_id")
        
    # Verify Token
    result = await db.execute(select(models.ProvisioningToken).where(models.ProvisioningToken.token == token_str))
    token_obj = result.scalars().first()
    
    if not token_obj:
        raise HTTPException(status_code=403, detail="Invalid token")
    if token_obj.is_used:
         raise HTTPException(status_code=403, detail="Token already used")
    if token_obj.expires_at < datetime.utcnow():
         raise HTTPException(status_code=403, detail="Token expired")
         
    # Check if device exists (re-provisioning) or create new
    result_node = await db.execute(select(models.Node).where(models.Node.node_key == hardware_id))
    existing_node = result_node.scalars().first()
    
    if existing_node:
        # Re-assign
        existing_node.community_id = token_obj.community_id
        existing_node.status = "Provisioned"
        node = existing_node
    else:
        # Create New
        node = models.Node(
            id=str(uuid.uuid4()),
            node_key=hardware_id,
            label=f"New {device_type}",
            category="Hardware",
            analytics_type=device_type,
            status="Provisioned",
            community_id=token_obj.community_id,
            # Inherit Org from Community (needs extra query or logic)
            # For simplicity, fetching Community to get Org ID
        )
        # Fetch Community to get Org ID
        comm_result = await db.execute(select(models.Community).where(models.Community.id == token_obj.community_id))
        community = comm_result.scalars().first()
        if community:
            node.organization_id = getattr(community, "organization_id", None) or community.distributor_id
            
        db.add(node)
        
    # Mark token used
    token_obj.is_used = True
    
    await db.commit()
    return {"status": "success", "device_id": node.id, "community_id": node.community_id}

@router.patch("/{node_id}/shadow", response_model=dict)
async def update_device_shadow(
    node_id: str,
    shadow_update: dict, # { "desired": { "pump_status": "ON" } }
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(RequirePermission(Permission.DEVICE_CONTROL))
) -> Any:
    """
    Update Device Shadow (Desired State).
    App uses this to control device.
    """
    node = await db.get(models.Node, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Device not found")
        
    current_shadow = node.shadow_state or {}
    
    # Merge Desired State
    if "desired" in shadow_update:
        current_desired = current_shadow.get("desired", {})
        new_desired = shadow_update["desired"]
        current_desired.update(new_desired)
        current_shadow["desired"] = current_desired
        
        # Calculate Delta (Desired - Reported)
        # Simplified: Just setting delta flag or full diff?
        # For MVP, we presume device asks for 'desired' state.
        
    node.shadow_state = current_shadow
    # Force SQLAlchemy to detect change in JSON mutable
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(node, "shadow_state")
    
    await db.commit()
    return node.shadow_state

@router.get("/map", response_model=List[dict])
async def list_devices_for_map(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(RequirePermission(Permission.DEVICE_READ))
):
    """
    Lightweight Geo-metadata for Map plotting.
    """
    result = await db.execute(select(models.Node))
    nodes = result.scalars().all()
    
    return [
        {
            "id": n.id,
            "label": n.label,
            "category": n.category,
            "lat": n.lat,
            "lng": n.lng,
            "status": n.status
        }
        for n in nodes if n.lat and n.lng
    ]

@router.get("/{node_id}/live-data", response_model=dict)
async def get_device_live_data(
    node_id: str,
    db: AsyncSession = Depends(get_db)
    # user: dict = Depends(RequirePermission(Permission.DEVICE_READ)) - REMOVED for public analytics
):
    """
    Fetch live telemetry using stored ThingSpeak credentials.
    Returns merged telemetry + specialized device config.
    """
    now = time.time()
    if node_id in live_telemetry_cache:
        ts, data = live_telemetry_cache[node_id]
        if now - ts < CACHE_TTL:
            return data

    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Device not found")
        
    if not node.thingspeak_mappings:
         raise HTTPException(status_code=400, detail="Device has no telemetry mapping")

    ts_service = ThingSpeakTelemetryService()
    
    # Prepare list of channel configs
    channel_configs = [
        {
            "channel_id": m.channel_id,
            "read_key": m.read_api_key,
            "field_mapping": m.field_mapping
        }
        for m in node.thingspeak_mappings
    ]
    
    # Extract specialized config based on node type (do this first)
    specialized_config = {}
    if node.analytics_type == "EvaraTank" and node.config_tank:
        specialized_config = {
            "tank_shape": node.config_tank.tank_shape,
            "dimension_unit": node.config_tank.dimension_unit,
            "radius": node.config_tank.radius,
            "height": node.config_tank.height,
            "length": node.config_tank.length,
            "breadth": node.config_tank.breadth
        }
    elif node.analytics_type == "EvaraDeep" and node.config_deep:
        specialized_config = {"static_depth": node.config_deep.static_depth, "dynamic_depth": node.config_deep.dynamic_depth}
    elif node.analytics_type == "EvaraFlow" and node.config_flow:
        specialized_config = {"pipe_diameter": node.config_flow.pipe_diameter, "max_flow_rate": node.config_flow.max_flow_rate}

    data = await ts_service.fetch_latest(node_id, channel_configs)
    
    logger.debug("ThingSpeak returned data for %s: %s", node_id, data)
    
    # If no real data available, show clear status
    if not data:
        logger.info("No ThingSpeak data for node %s - showing disconnected status", node_id)
        return {
            "device_id": node_id,
            "timestamp": None,
            "status": "disconnected",
            "message": "ThingSpeak channel not accessible",
            "channel_id": channel_configs[0].get("channel_id") if channel_configs else "unknown",
            "metrics": {},
            "config": specialized_config
        }
    
    # Add raw field data for debugging if no mapped distance found
    # CRITICAL: field2 = Distance, field1 = Temperature (NEVER use field1 for tank level)
    if "distance" not in data and "field2" in data:
        logger.warning(
            "No 'distance' field mapped for node %s. Raw field2: %s. "
            "Update field_mapping to {'field2': 'distance'}",
            node_id, data.get("field2")
        )

    response = {
        "device_id": node_id,
        "timestamp": data.get("timestamp"),
        "metrics": {k: v for k, v in data.items() if k not in ["timestamp", "entry_id"]},
        "config": specialized_config
    }
    
    live_telemetry_cache[node_id] = (now, response)
    return response


@router.get("/{node_id}/history", response_model=dict)
async def get_device_history(
    node_id: str,
    count: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch the last N telemetry readings for a device.
    Returns readings in chronological order (oldest first) for chart display.
    
    CRITICAL: For tanks, field2 = Distance (NEVER use field1 for tank level)
    """
    cache_key = f"{node_id}_{count}"
    now = time.time()
    
    # Check cache first
    if cache_key in history_cache:
        ts, data = history_cache[cache_key]
        if now - ts < HISTORY_CACHE_TTL:
            return data
    
    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Device not found")
    
    if not node.thingspeak_mappings:
        raise HTTPException(status_code=400, detail="Device has no telemetry mapping")
    
    ts_service = ThingSpeakTelemetryService()
    
    # Use first mapping config
    mapping = node.thingspeak_mappings[0]
    config = {
        "channel_id": mapping.channel_id,
        "read_key": mapping.read_api_key,
        "field_mapping": mapping.field_mapping
    }
    
    # Extract specialized config for calculations
    specialized_config = {}
    if node.analytics_type == "EvaraTank" and node.config_tank:
        specialized_config = {
            "tank_shape": node.config_tank.tank_shape,
            "dimension_unit": node.config_tank.dimension_unit,
            "radius": node.config_tank.radius,
            "height": node.config_tank.height,
            "length": node.config_tank.length,
            "breadth": node.config_tank.breadth
        }
    
    # Fetch last N readings
    feeds = await ts_service.fetch_last_n(node_id, config, count)
    
    if not feeds:
        return {
            "device_id": node_id,
            "count": 0,
            "feeds": [],
            "config": specialized_config
        }
    
    response = {
        "device_id": node_id,
        "count": len(feeds),
        "feeds": feeds,  # Already sorted chronologically (oldest first)
        "config": specialized_config
    }
    
    history_cache[cache_key] = (now, response)
    return response
