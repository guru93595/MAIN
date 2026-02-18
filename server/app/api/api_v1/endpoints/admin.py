from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.api_v1.deps import get_db
from app.models import all_models as models
from app.schemas import schemas
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/communities", response_model=schemas.CommunityResponse)
def create_community(
    community: schemas.CommunityCreate,
    db: Session = Depends(get_db)
):
    # Check if exists
    existing = db.query(models.Community).filter(models.Community.name == community.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Community with this name already exists")
    
    db_obj = models.Community(
        id=str(uuid.uuid4()),
        name=community.name,
        region=community.region
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.post("/customers", response_model=schemas.UserResponse)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(models.User).filter(models.User.email == customer.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_obj = models.User(
        id=str(uuid.uuid4()),
        email=customer.email,
        display_name=customer.name,
        role="customer",
        community_id=customer.community_id
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.post("/devices", response_model=schemas.NodeResponse)
def create_device(
    device: schemas.DeviceCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(models.Node).filter(models.Node.node_key == device.hardware_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already provisioned")
        
    # Determine class based on type
    # For simplicity, we just create generic Node or specific if implementing polymorphic properly
    # Using generic Node with analytics_type set
    db_obj = models.Node(
        id=str(uuid.uuid4()),
        node_key=device.hardware_id,
        label=f"New {device.type}",
        category="Hardware",
        analytics_type=device.type,
        status="Provisioned"
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

@router.put("/system/config", response_model=schemas.SystemConfigResponse)
def update_config(
    config: schemas.SystemConfigUpdate,
    db: Session = Depends(get_db)
):
    # Upsert global config
    db_obj = db.query(models.SystemConfig).filter(models.SystemConfig.key == "global_config").first()
    if not db_obj:
        db_obj = models.SystemConfig(key="global_config")
        db.add(db_obj)
    
    db_obj.data_rate = config.rate
    db_obj.firmware_version = config.firmware
    db_obj.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_obj)
    return db_obj
