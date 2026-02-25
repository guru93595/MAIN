# Temporary fix: Use SQLite instead of Supabase for testing
import os
from dotenv import load_dotenv

load_dotenv()

# Backup current DATABASE_URL
current_url = os.getenv('DATABASE_URL')
print(f"Current DATABASE_URL: {current_url[:50]}...")

# Set to SQLite temporarily
sqlite_url = "sqlite+aiosqlite:///./evara.db"
os.environ['DATABASE_URL'] = sqlite_url

# Update .env file
with open('.env', 'r') as f:
    content = f.read()

content = content.replace(
    'DATABASE_URL="postgresql+asyncpg://postgres:kR5KBJAja6xeeFbZ@lkbesdmtazmgzujjoixf.supabase.co:5432/postgres"',
    'DATABASE_URL="sqlite+aiosqlite:///./evara.db"'
)

with open('.env', 'w') as f:
    f.write(content)

print("✅ Temporarily switched to SQLite")
print("📋 Now run: python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
print("\n🔄 To switch back to Supabase later:")
print("1. DATABASE_URL='postgresql+asyncpg://postgres:kR5KBJAja6xeeFbZ@lkbesdmtazmgzujjoixf.supabase.co:5432/postgres'")
