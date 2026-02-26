from typing import Dict, Any, Optional
from fastapi import HTTPException

class NodeConfigService:
    @staticmethod
    def validate_tank_config(config: Dict[str, Any]):
        """Validates Tank configuration with shape and dimensions."""
        tank_shape = config.get("tank_shape")
        if tank_shape and tank_shape not in ("cylinder", "rectangular"):
            raise HTTPException(status_code=400, detail="Tank shape must be 'cylinder' or 'rectangular'")
        
        dimension_unit = config.get("dimension_unit", "m")
        if dimension_unit not in ("m", "cm", "feet", "inches"):
            raise HTTPException(status_code=400, detail="Dimension unit must be 'm', 'cm', 'feet', or 'inches'")
        
        # Validate dimensions are positive if provided
        for field in ["radius", "height", "length", "breadth"]:
            val = config.get(field)
            if val is not None and val <= 0:
                raise HTTPException(status_code=400, detail=f"Tank {field} must be greater than 0")

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
