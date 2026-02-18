from sqlalchemy import Column, String, Integer, Float, ForeignKey, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.base import Base
from datetime import datetime

# ─── USER MODEL ───
class User(Base):
    __tablename__ = "users_profiles"
    
    id: Mapped[str] = mapped_column(String, primary_key=True) # Supabase UUID
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="customer") # superadmin, distributor, customer
    plan: Mapped[str] = mapped_column(String, default="base")
    community_id: Mapped[str] = mapped_column(ForeignKey("communities.id"), nullable=True)
    
    community = relationship("Community", back_populates="users")
    
    # Relationships
    assignments = relationship("NodeAssignment", back_populates="user")


# ─── NODE MODEL (Polymorphic Base) ───
class Node(Base):
    __tablename__ = "nodes"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    node_key: Mapped[str] = mapped_column(String, unique=True, index=True)
    label: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String) # OHT, Sump, Borewell, etc.
    analytics_type: Mapped[str] = mapped_column(String) # EvaraTank, EvaraDeep, EvaraFlow
    
    location_name: Mapped[str] = mapped_column(String, nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lng: Mapped[float] = mapped_column(Float, nullable=True)
    capacity: Mapped[str] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Offline")
    
    # ThingSpeak config
    thingspeak_channel_id: Mapped[str] = mapped_column(String, nullable=True)
    thingspeak_read_api_key: Mapped[str] = mapped_column(String, nullable=True)
    community_id: Mapped[str] = mapped_column(ForeignKey("communities.id"), nullable=True)
    
    community = relationship("Community", back_populates="nodes")
    
    # Relationships
    assignments = relationship("NodeAssignment", back_populates="node")
    readings = relationship("NodeReading", back_populates="node")

    # OOP: Polymorphic Identity
    __mapper_args__ = {
        "polymorphic_identity": "node",
        "polymorphic_on": analytics_type,
    }

# ─── INHERITED NODE TYPES ───
class TankNode(Node):
    __mapper_args__ = {"polymorphic_identity": "EvaraTank"}
    
    def calculate_efficiency(self) -> float:
        # Example domain logic
        return 0.85

class DeepNode(Node):
    __mapper_args__ = {"polymorphic_identity": "EvaraDeep"}
    
    def get_groundwater_level(self) -> float:
        return 120.5

class FlowNode(Node):
    __mapper_args__ = {"polymorphic_identity": "EvaraFlow"}
    
    def get_daily_flow(self) -> float:
        return 50000.0


# ─── PIPELINE MODEL ───
class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    color: Mapped[str] = mapped_column(String)
    positions: Mapped[list] = mapped_column(JSON) # Store [[lat, lng], ...]


# ─── ASSIGNMENTS & READINGS ───
class NodeAssignment(Base):
    __tablename__ = "node_assignments"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users_profiles.id"))
    
    node = relationship("Node", back_populates="assignments")
    user = relationship("User", back_populates="assignments")

class NodeReading(Base):
    __tablename__ = "node_analytics"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    node_id: Mapped[str] = mapped_column(ForeignKey("nodes.id"))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    data: Mapped[dict] = mapped_column(JSON) # Flexible storage for different sensor types
    
    node = relationship("Node", back_populates="readings")

# ─── NEW ADMIN MODELS ───
class Community(Base):
    __tablename__ = "communities"
    
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    region: Mapped[str] = mapped_column(String)
    
    # Relationships
    users = relationship("User", back_populates="community")
    nodes = relationship("Node", back_populates="community")

class SystemConfig(Base):
    __tablename__ = "system_config"
    
    key: Mapped[str] = mapped_column(String, primary_key=True) # e.g. "global_config"
    data_rate: Mapped[int] = mapped_column(Integer, default=60)
    firmware_version: Mapped[str] = mapped_column(String, default="v2.1.0")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
