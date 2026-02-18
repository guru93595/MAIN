from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.schemas import schemas
from app.db.repository import NodeRepository
from app.services.analytics import NodeAnalyticsService
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.NodeResponse])
async def read_nodes(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve nodes.
    """
    repo = NodeRepository(db)
    nodes = await repo.get_all(skip=skip, limit=limit)
    return nodes

@router.get("/{node_id}", response_model=schemas.NodeResponse)
async def read_node_by_id(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user),
) -> Any:
    repo = NodeRepository(db)
    node = await repo.get(node_id)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    return node

@router.get("/{node_id}/analytics", response_model=schemas.NodeAnalyticsResponse)
async def get_node_analytics(
    node_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(deps.get_current_user),
) -> Any:
    """
    Returns calculated analytics (ML predictions) for a node.
    """
    repo = NodeRepository(db)
    analytics_service = NodeAnalyticsService(repo)
    
    # In a real scenario, we'd fetch readings here
    # readings = await repo.get_readings(node_id) 
    
    # Mock result demonstrating the service usage
    days = analytics_service.predict_days_to_empty([], 1000) # Passing empty for now
    avg = analytics_service.calculate_rolling_average([])
    
    return schemas.NodeAnalyticsResponse(
        node_id=node_id,
        days_to_empty=days,
        rolling_avg_flow=avg
    )
