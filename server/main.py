from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.api.api_v1.api import api_router
from app.core.logging import setup_logging
from app.db.session import create_tables
from app.core.background import start_background_tasks
from app.services.seeder import seed_db
from app.core.security_supabase import get_current_user_token

from app.core.config import get_settings
from collections import defaultdict
import time
import asyncio

settings = get_settings()
app = FastAPI(title="EvaraTech Backend", version="1.0.0")

# Configure CORS — restrict to known origins in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
# app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"]) # Removed to avoid potential 400s with some requests

# ─── RATE LIMITING MIDDLEWARE ───
class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.history = defaultdict(list)

    async def is_allowed(self, identity: str) -> bool:
        now = time.time()
        # Clean old records
        self.history[identity] = [t for t in self.history[identity] if now - t < 60]
        if len(self.history[identity]) >= self.requests_per_minute:
            return False
        self.history[identity].append(now)
        return True

admin_limiter = RateLimiter(requests_per_minute=30) # Strict for admin

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    from fastapi import Response
    
    # Only limit admin and auth endpoints
    if request.url.path.startswith("/api/v1/admin") or request.url.path.startswith("/api/v1/auth"):
        client_ip = request.client.host
        if not await admin_limiter.is_allowed(client_ip):
            return Response(content="Rate limit exceeded. Please try again in a minute.", status_code=429)
            
    return await call_next(request)

@app.middleware("http")
async def log_requests(request, call_next):
    from fastapi import Request
    import time
    start_time = time.time()
    
    path = request.url.path
    method = request.method
    auth = request.headers.get("Authorization", "No Auth")
    
    logger.info("INCOMING %s %s | Client IP: %s", method, path, request.client.host)
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    logger.info("REQUEST %s %s | Auth: %s... | Status: %d | Time: %.2fms",
        method, path, auth[:20] if auth else "none", response.status_code, process_time)
    
    return response

app.include_router(api_router, prefix="/api/v1")

# Setup logging
logger = setup_logging()

@app.on_event("startup")
async def startup_event():
    logger.info("Starting EvaraTech Backend...")
    # Initialize database tables
    await create_tables()
    # Auto-seed if database is new/empty
    # await seed_db()
    await start_background_tasks()
    logger.info("Background tasks started.")
    logger.info("Application startup complete.")

@app.get("/health")
async def health_check():
    from sqlalchemy import text
    from app.db.session import engine
    import asyncio
    db_status = "unreachable"
    try:
        # 5s timeout for health check ping with proper async connection
        async with asyncio.timeout(5):
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))
                db_status = "ok"
    except asyncio.TimeoutError:
        db_status = "timeout"
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"
        
    return {
        "status": "ok", 
        "service": "EvaraTech Backend",
        "database": db_status
    }

@app.get("/")
async def root():
    return {"message": "Welcome to EvaraTech Backend API. Docs at /docs"}
