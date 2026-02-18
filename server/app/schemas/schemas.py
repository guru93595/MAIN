from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

# ─── USER SCHEMAS ───
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    role: str = "customer"

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# ─── TOKEN SCHEMAS ───
class Token(BaseModel):
    access_token: str
    token_type: str

# ─── NODE SCHEMAS ───
class NodeBase(BaseModel):
    node_key: str
    label: str
    category: str
    analytics_type: str
    status: str = "Offline"
    lat: Optional[float] = None
    lng: Optional[float] = None
    location_name: Optional[str] = None

class NodeCreate(NodeBase):
    pass

class NodeResponse(NodeBase):
    id: str
    assignments: List[Any] = [] # Simplified for now
    
    class Config:
        from_attributes = True
        
class NodeAnalyticsResponse(BaseModel):
    node_id: str
    days_to_empty: int
    node_id: str
    days_to_empty: int
    rolling_avg_flow: float

# ─── ADMIN / COMMUNITY SCHEMAS ───
class CommunityBase(BaseModel):
    name: str
    region: str

class CommunityCreate(CommunityBase):
    pass

class CommunityResponse(CommunityBase):
    id: str
    
    class Config:
        from_attributes = True

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    community_id: str

class DeviceCreate(BaseModel):
    hardware_id: str
    type: str

class SystemConfigUpdate(BaseModel):
    rate: int
    firmware: str

class SystemConfigResponse(BaseModel):
    key: str
    data_rate: int
    firmware_version: str
    updated_at: datetime
    
    class Config:
        from_attributes = True
