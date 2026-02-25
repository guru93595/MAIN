from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.api import deps
from app.core import security_supabase
from app.db.session import get_db
from app.schemas import schemas
from app.db.repository import UserRepository

router = APIRouter()

@router.get("/", response_model=List[schemas.UserResponse])
async def get_users(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    user_payload: dict = Depends(security_supabase.get_current_user_token)
) -> Any:
    """
    Get users list (SuperAdmin only)
    """
    # Check if user is superadmin
    if user_payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    repo = UserRepository(db)
    users = await repo.get_multi(skip=skip, limit=limit)
    return users

@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    db: AsyncSession = Depends(get_db),
    user_payload: dict = Depends(security_supabase.get_current_user_token)
) -> Any:
    """
    Update user role (SuperAdmin only)
    """
    # Check if user is superadmin
    if user_payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    repo = UserRepository(db)
    user = await repo.get(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role
    update_data = {"role": role}
    updated_user = await repo.update(user_id, update_data)
    
    return updated_user
