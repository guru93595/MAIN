from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import uuid

from app.db.session import get_db
from app.api.api_v1.endpoints.nodes import NodeRepository
from app.models.all_models import NodeAssignment
from app.schemas.schemas import NodeAssignmentCreate, NodeAssignmentResponse
from app.core.security_supabase import get_current_user_token

router = APIRouter()

class AssignmentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_all(self, user_id: str = None) -> List[dict]:
        from sqlalchemy import text
        sql = """
            SELECT id, node_id, user_id, assigned_by, assigned_at, created_at
            FROM node_assignments
        """
        params = {}
        if user_id:
            sql += " WHERE user_id = :user_id"
            params["user_id"] = user_id
        
        result = await self.session.execute(text(sql), params)
        return [dict(row._mapping) for row in result.fetchall()]
    
    async def create(self, assignment_data: dict) -> dict:
        from sqlalchemy import text
        sql = """
            INSERT INTO node_assignments (id, node_id, user_id, assigned_by, assigned_at, created_at)
            VALUES (:id, :node_id, :user_id, :assigned_by, :assigned_at, :created_at)
            RETURNING id, node_id, user_id, assigned_by, assigned_at, created_at
        """
        result = await self.session.execute(text(sql), assignment_data)
        await self.session.commit()
        return dict(result.fetchone()._mapping)

@router.get("/")
async def get_assignments(
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Get node assignments for the current user"""
    user_id = user_payload.get("sub")
    repo = AssignmentRepository(db)
    
    # If superadmin, return all assignments, otherwise filter by user
    if user_payload.get("user_metadata", {}).get("role") == "superadmin":
        assignments = await repo.get_all()
    else:
        assignments = await repo.get_all(user_id=user_id)
    
    return assignments

@router.post("/")
async def create_assignment(
    assignment: NodeAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Create a new node assignment"""
    user_id = user_payload.get("sub")
    
    # Check if user has permission
    if user_payload.get("user_metadata", {}).get("role") not in ["superadmin", "distributor"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    assignment_data = assignment.dict()
    assignment_data["assigned_by"] = user_id
    assignment_data["id"] = f"assign_{uuid.uuid4().hex[:8]}"
    assignment_data["assigned_at"] = datetime.utcnow()
    assignment_data["created_at"] = datetime.utcnow()
    
    repo = AssignmentRepository(db)
    return await repo.create(assignment_data)

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(get_current_user_token)
) -> Any:
    """Delete an assignment"""
    from sqlalchemy import text
    if user_payload.get("user_metadata", {}).get("role") not in ["superadmin", "distributor"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    await db.execute(text("DELETE FROM node_assignments WHERE id = :id"), {"id": assignment_id})
    await db.commit()
    return {"message": "Assignment deleted"}
