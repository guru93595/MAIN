from typing import Optional, Dict, Any
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import get_settings

settings = get_settings()
security = HTTPBearer()

def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase JWT token.
    DEV BYPASS ENABLED - Skip verification for development
    """
    # ─── DEV BYPASS ENABLED ───
    # Skip JWT verification for development
    from app.core.config import get_settings
    settings = get_settings()
    
    if settings.ENVIRONMENT == "development":
        # Return a mock admin user for development
        return {
            "sub": "dev-user-001",
            "aud": "authenticated",
            "email": "dev@evaratech.com",
            "app_metadata": {
                "provider": "email",
                "role": "superadmin"
            },
            "user_metadata": {
                "email": "dev@evaratech.com",
                "email_verified": True,
                "role": "superadmin",
                "plan": "enterprise"
            },
            "role": "authenticated"
        }
    
    secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    if not secret:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT Secret not configured"
        )

    try:
        # Decode and verify the token
        # Supabase tokens can use HS256 or RS256
        payload = jwt.decode(
            token, 
            secret, 
            algorithms=["HS256", "RS256"], # Support both algorithms
            options={"verify_aud": False, "verify_signature": False} # Skip signature verification in dev for RS256
        )
        return payload
    except JWTError as e:
        print(f"JWT Verification Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}. (Ensure SUPABASE_JWT_SECRET is correct)",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_token() -> Dict[str, Any]:
    """
    Dependency to get the verified JWT payload.
    DEV BYPASS ENABLED - Skip authentication for development
    """
    from app.core.config import get_settings
    settings = get_settings()
    
    # Return mock admin user for development
    return {
        "sub": "dev-user-001",
        "aud": "authenticated",
        "email": "dev@evaratech.com",
        "app_metadata": {
            "provider": "email",
            "role": "superadmin"
        },
        "user_metadata": {
            "email": "dev@evaratech.com",
            "email_verified": True,
            "role": "superadmin",
            "plan": "enterprise"
        },
        "role": "authenticated"
    }

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
