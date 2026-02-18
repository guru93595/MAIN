from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "EvaraTech Backend"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:8080", "http://localhost:5173", "https://evara-dashboard.onrender.com"]

    # Database
    # Default to sqlite for local dev if SUPABASE is not set, but we aim for Supabase
    DATABASE_URL: str = "sqlite+aiosqlite:///./test.db" 
    
    # Supabase (Optional for now if using direct DB connection)
    SUPABASE_URL: str | None = None
    SUPABASE_KEY: str | None = None
    
    # Security
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_HERE_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache
def get_settings():
    return Settings()
