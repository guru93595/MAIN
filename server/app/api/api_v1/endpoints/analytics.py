from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.all_models import NodeAnalytics
from app.schemas.schemas import NodeAnalyticsResponse
from app.core.security_supabase import get_current_user_token
from sqlalchemy import select, and_
from datetime import datetime, timedelta

router = APIRouter()

class AnalyticsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_by_node(
        self, 
        node_id: str, 
        period_type: Optional[str] = None,
        limit: int = 100
    ) -> List[dict]:
        from sqlalchemy import text
        sql = """
            SELECT id, node_id, period_type, period_start, 
                   consumption_liters, avg_level_percent, peak_flow, metadata, created_at
            FROM node_analytics 
            WHERE node_id = :node_id
        """
        params = {"node_id": node_id}
        if period_type:
            sql += " AND period_type = :period_type"
            params["period_type"] = period_type
        
        sql += " ORDER BY period_start DESC LIMIT :limit"
        params["limit"] = limit
        
        result = await self.session.execute(text(sql), params)
        return [dict(row._mapping) for row in result.fetchall()]
    
    async def get_recent(
        self, 
        period_type: Optional[str] = None,
        days: int = 7,
        limit: int = 100
    ) -> List[dict]:
        from sqlalchemy import text
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        sql = """
            SELECT id, node_id, period_type, period_start, 
                   consumption_liters, avg_level_percent, peak_flow, metadata, created_at
            FROM node_analytics 
            WHERE period_start >= :cutoff_date
        """
        params = {"cutoff_date": cutoff_date}
        
        if period_type:
            sql += " AND period_type = :period_type"
            params["period_type"] = period_type
        
        sql += " ORDER BY period_start DESC LIMIT :limit"
        params["limit"] = limit
        
        result = await self.session.execute(text(sql), params)
        return [dict(row._mapping) for row in result.fetchall()]

@router.get("/node/{node_id}")
async def get_node_analytics(
    node_id: str,
    period_type: Optional[str] = Query(None, description="Filter by period type: hourly, daily, weekly, monthly"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Get analytics data for a specific node"""
    repo = AnalyticsRepository(db)
    analytics = await repo.get_by_node(node_id, period_type, limit)
    return analytics

@router.get("/recent")
async def get_recent_analytics(
    period_type: Optional[str] = Query(None, description="Filter by period type: hourly, daily, weekly, monthly"),
    days: int = Query(7, ge=1, le=365, description="Number of days to look back"),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Get recent analytics data across all nodes"""
    repo = AnalyticsRepository(db)
    analytics = await repo.get_recent(period_type, days, limit)
    return analytics

@router.get("/summary/{node_id}")
async def get_analytics_summary(
    node_id: str,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Get analytics summary for a node"""
    repo = AnalyticsRepository(db)
    analytics = await repo.get_by_node(node_id, "daily", days)
    
    if not analytics:
        return {"message": "No analytics data found"}
    
    # Calculate summary statistics
    total_consumption = sum(a.consumption_liters or 0 for a in analytics)
    avg_level = sum(a.avg_level_percent or 0 for a in analytics) / len(analytics)
    max_flow = max((a.peak_flow or 0) for a in analytics)
    
    return {
        "node_id": node_id,
        "period_days": days,
        "total_consumption_liters": total_consumption,
        "average_level_percent": avg_level,
        "max_peak_flow": max_flow,
        "data_points": len(analytics)
    }
