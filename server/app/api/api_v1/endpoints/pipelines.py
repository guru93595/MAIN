from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime

from app.db.session import get_db
from app.models.all_models import Pipeline
from app.schemas.schemas import PipelineCreate, PipelineResponse
from app.core.security_supabase import get_current_user_token
from sqlalchemy import select

router = APIRouter()

class PipelineRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.model = Pipeline
    
    async def get_all(self) -> List[Pipeline]:
        result = await self.session.execute(select(self.model))
        return result.scalars().all()
    
    async def create(self, pipeline_data: dict) -> Pipeline:
        pipeline = self.model(**pipeline_data)
        self.session.add(pipeline)
        await self.session.commit()
        await self.session.refresh(pipeline)
        return pipeline

@router.get("/", response_model=List[PipelineResponse])
async def get_pipelines(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Get all pipelines"""
    repo = PipelineRepository(db)
    pipelines = await repo.get_all()
    return pipelines

@router.post("/", response_model=PipelineResponse)
async def create_pipeline(
    pipeline: PipelineCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Create a new pipeline"""
    user_id = user_payload.get("sub")
    
    # Check if user has permission
    if user_payload.get("user_metadata", {}).get("role") not in ["superadmin", "distributor"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    pipeline_data = pipeline.dict()
    pipeline_data["id"] = f"pipe_{uuid.uuid4().hex[:8]}"
    pipeline_data["created_by"] = user_id
    pipeline_data["created_at"] = datetime.utcnow()
    pipeline_data["updated_at"] = datetime.utcnow()
    
    repo = PipelineRepository(db)
    return await repo.create(pipeline_data)

@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Delete a pipeline"""
    from sqlalchemy import text
    if user_payload.get("user_metadata", {}).get("role") not in ["superadmin", "distributor"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.execute(text("DELETE FROM pipelines WHERE id = :id"), {"id": pipeline_id})
    await db.commit()
    return {"message": "Pipeline deleted"}
