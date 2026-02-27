from typing import List, Dict, Any
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import datetime, timedelta
from app.models.all_models import Node
from app.db.repository import NodeRepository
from functools import lru_cache

# In-Memory Inverted Index for fast lookup by location (O(1))
# Map: LocationName -> List[NodeID]
_LOCATION_INDEX: Dict[str, List[str]] = {}

class NodeAnalyticsService:
    def __init__(self, node_repo: NodeRepository):
        self.node_repo = node_repo

    async def build_index(self):
        """Builds an inverted index for fast searching by location."""
        global _LOCATION_INDEX
        nodes = await self.node_repo.get_all(limit=1000)
        _LOCATION_INDEX = {}
        for node in nodes:
            if node.location_name:
                loc = node.location_name.lower()
                if loc not in _LOCATION_INDEX:
                    _LOCATION_INDEX[loc] = []
                _LOCATION_INDEX[loc].append(node.id)
        print(f"Index built with {len(_LOCATION_INDEX)} locations.")

    def search_nodes_by_location(self, query: str) -> List[str]:
        """O(1) lookup using the inverted index."""
        return _LOCATION_INDEX.get(query.lower(), [])

    def calculate_rolling_average(self, readings: List[Dict[str, Any]], window: int = 7) -> float:
        """Calculates 7-day rolling average using Pandas."""
        if not readings:
            return 0.0
        
        df = pd.DataFrame(readings)
        if 'value' not in df.columns:
            return 0.0
            
        return df['value'].rolling(window=window).mean().iloc[-1]

    def predict_days_to_empty(self, readings: List[Dict[str, Any]], capacity: float) -> int:
        """Uses Linear Regression to predict when tank will be empty."""
        if len(readings) < 10:
            return -1 # Not enough data
            
        # Convert timestamps to numeric values
        def parse_timestamp(ts):
            if isinstance(ts, str):
                try:
                    # Parse ISO format timestamp
                    from datetime import datetime
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    return dt.timestamp()
                except:
                    return datetime.utcnow().timestamp()
            return float(ts) if ts else datetime.utcnow().timestamp()
        
        df = pd.DataFrame([
            {"timestamp": parse_timestamp(r.get('timestamp')), "value": r.get('level', 0)} 
            for r in readings
        ])
        
        X = df[['timestamp']]
        y = df['value']
        
        model = LinearRegression()
        model.fit(X, y)
        
        # Predict when y (level) will reach 0
        # y = mx + c  =>  0 = mx + c  =>  x = -c / m
        slope = model.coef_[0]
        intercept = model.intercept_
        
        if slope >= 0:
            return 999 # Tank is filling up or steady
            
        empty_timestamp = -intercept / slope
        current_timestamp = datetime.utcnow().timestamp()
        
        days_left = (empty_timestamp - current_timestamp) / (24 * 3600)
        return max(0, int(days_left))
