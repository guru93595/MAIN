from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings
import logging

logger = logging.getLogger("evara_backend")
settings = get_settings()
security = HTTPBearer(auto_error=False)


def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase JWT token. Production: full verification.
    Development: bypass only when ENVIRONMENT=development AND no valid token.
    """
    secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT Secret not configured"
        )
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        logger.warning("JWT verification failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials. Ensure SUPABASE_JWT_SECRET matches Supabase JWT secret.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Extract Bearer token and verify JWT. Production: requires valid token.
    Development: bypass only when ENVIRONMENT=development and no token provided.
    """
    token = credentials.credentials if credentials else None

    if not token:
        if settings.ENVIRONMENT == "development":
            logger.debug("No Bearer token; using dev bypass")
            return {
                "sub": "dev-user-001",
                "aud": "authenticated",
                "email": "dev@evaratech.com",
                "app_metadata": {"provider": "email", "role": "superadmin"},
                "user_metadata": {"email": "dev@evaratech.com", "role": "superadmin", "plan": "enterprise"},
                "role": "authenticated"
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return verify_supabase_token(token)

class RequirePermission:
    def __init__(self, permission: str):
        self.permission = permission

    def __call__(self, user_payload: Dict[str, Any] = Depends(get_current_user_token)):
        # Extract role from metadata (check app_metadata first for custom claims)
        app_metadata = user_payload.get("app_metadata", {})
        user_metadata = user_payload.get("user_metadata", {})
        
        role = app_metadata.get("role") or user_metadata.get("role") or "customer"
        
        # Verify permission
        from app.core.permissions import has_permission
        
        if not has_permission(role, self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {self.permission}"
            )
            
        # Inject effective metadata into payload for downstream use
        user_payload["role"] = role
        user_payload["id"] = user_payload.get("sub")
        # Custom Claims isolation
        user_payload["distributor_id"] = app_metadata.get("distributor_id")
        
        return user_payload
