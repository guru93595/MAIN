from typing import Any, Dict
from fastapi import APIRouter, Depends 
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.db.session import get_db
import httpx
import asyncio

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
async def health_check(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Detailed System Health Check.
    Verifies Database and External Connectivity.
    """
    status = {
        "status": "ok",
        "service": "EvaraTech Backend",
        "database": "unreachable",
        "services": {
            "database": "unknown",
            "thingspeak": "unknown"
        }
    }
    
    # 1. DB Check with timeout
    try:
        await asyncio.wait_for(
            db.execute(text("SELECT 1")),
            timeout=5.0
        )
        status["services"]["database"] = "ok"
        status["database"] = "ok"
        print("✅ Database health check passed")
    except asyncio.TimeoutError:
        status["services"]["database"] = "timeout"
        status["database"] = "timeout"
        status["status"] = "degraded"
        print("⚠️ Database health check timeout")
    except Exception as e:
        status["services"]["database"] = f"error: {str(e)}"
        status["database"] = "error"
        status["status"] = "degraded"
        print(f"❌ Database health check failed: {e}")

    # 2. ThingSpeak Check (Ping URL)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.thingspeak.com/channels/public.json", timeout=2.0)
            if resp.status_code == 200:
                status["services"]["thingspeak"] = "ok"
            else:
                 status["services"]["thingspeak"] = f"unreachable ({resp.status_code})"
    except Exception as e:
        status["services"]["thingspeak"] = f"error: {str(e)}"
        # ThingSpeak down might not be critical for app UP, but is for telemetry
        if status["status"] == "ok":
            status["status"] = "degraded"

    return status
