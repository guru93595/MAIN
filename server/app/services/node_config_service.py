from typing import Dict, Any, Optional
from fastapi import HTTPException

class NodeConfigService:
    @staticmethod
    def validate_tank_config(config: Dict[str, Any]):
        """Validates Tank (Sump/OHT) configuration."""
        capacity = config.get("capacity")
        max_depth = config.get("max_depth")
        
        if capacity is not None and capacity <= 0:
            raise HTTPException(status_code=400, detail="Tank capacity must be greater than 0")
        if max_depth is not None and max_depth <= 0:
            raise HTTPException(status_code=400, detail="Tank depth must be greater than 0")

    @staticmethod
    def validate_deep_config(config: Dict[str, Any]):
        """Validates Deep (Borewell/Groundwater) configuration."""
        static_depth = config.get("static_depth")
        dynamic_depth = config.get("dynamic_depth")
        
        if static_depth is not None and static_depth < 0:
            raise HTTPException(status_code=400, detail="Static depth cannot be negative")
        if dynamic_depth is not None and dynamic_depth < 0:
            raise HTTPException(status_code=400, detail="Dynamic depth cannot be negative")

    @staticmethod
    def validate_flow_config(config: Dict[str, Any]):
        """Validates Flow (Pipeline) configuration."""
        pipe_diameter = config.get("pipe_diameter")
        max_flow_rate = config.get("max_flow_rate")
        
        if pipe_diameter is not None and pipe_diameter <= 0:
            raise HTTPException(status_code=400, detail="Pipe diameter must be greater than 0")
        if max_flow_rate is not None and max_flow_rate <= 0:
            raise HTTPException(status_code=400, detail="Max flow rate must be greater than 0")

    @classmethod
    def validate_config(cls, analytics_type: str, config: Optional[Dict[str, Any]]):
        """Dispatches validation based on analytics type."""
        if not config:
            return
            
        if analytics_type == "EvaraTank":
            cls.validate_tank_config(config)
        elif analytics_type == "EvaraDeep":
            cls.validate_deep_config(config)
        elif analytics_type == "EvaraFlow":
            cls.validate_flow_config(config)
