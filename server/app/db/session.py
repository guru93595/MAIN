from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import get_settings

settings = get_settings()

# For PostgreSQL (Supabase), ensure the URL starts with postgresql+asyncpg://
# If settings.DATABASE_URL is just postgres://, replace it
db_url = settings.DATABASE_URL
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False, # Set to False in production
    future=True,
    pool_pre_ping=True,
    pool_size=getattr(settings, 'DATABASE_POOL_SIZE', 5),
    max_overflow=getattr(settings, 'DATABASE_MAX_OVERFLOW', 10),
    pool_timeout=getattr(settings, 'DATABASE_POOL_TIMEOUT', 30),
    connect_args={
        "timeout": 30,
        "command_timeout": 60,
        "server_settings": {
            "application_name": "evara_backend",
            "statement_timeout": "60000"
        },
        "statement_cache_size": 0,  # Fix for pgbouncer duplicate statement error
        "prepared_statement_cache_size": 0  # Additional fix
    } if "postgresql" in db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def create_tables():
    from app.models.all_models import Base as ModelsBase
    import asyncio
    
    # 🔗 Attempting to connect to database...
    print("🔗 Attempting to connect to database (STRICT MODE)...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(ModelsBase.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        if "DuplicateObjectError" in str(e) or "duplicate key value violates unique constraint" in str(e):
            print("✅ Database tables and types already exist (Skipped recreation)")
        else:
            raise e
